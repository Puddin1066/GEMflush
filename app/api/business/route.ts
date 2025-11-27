// Business management API routes

import { NextRequest, NextResponse } from 'next/server';
import { getUser, getTeamForUser } from '@/lib/db/queries';
import {
  getBusinessesByTeam,
  createBusiness,
  getBusinessCountByTeam,
} from '@/lib/db/queries';
import { getDashboardDTO } from '@/lib/data/dashboard-dto';
import { canAddBusiness, getMaxBusinesses } from '@/lib/gemflush/permissions';
import { createBusinessSchema, createBusinessFromUrlSchema } from '@/lib/validation/business';
import { z } from 'zod';
import {
  getIdempotencyKey,
  getCachedResponse,
  cacheResponse,
  generateIdempotencyKey,
} from '@/lib/utils/idempotency';
import { db } from '@/lib/db/drizzle';
import { businesses } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { loggers } from '@/lib/utils/logger';
import { getBusinessNameWithFallback } from '@/lib/utils/business-name-extractor';

const logger = loggers.api;

export async function GET(request: NextRequest) {
  // Rate limiting (basic in-memory)
  const { checkRateLimit, getRateLimitStatus, getClientIdentifier, RATE_LIMITS } = await import('@/lib/api/rate-limit');
  const rateLimitResponse = checkRateLimit(request, RATE_LIMITS.api);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const team = await getTeamForUser();
    if (!team) {
      return NextResponse.json(
        { error: 'No team found' },
        { status: 404 }
      );
    }

    // Use DTO layer (SOLID: uses DTO for data transformation)
    const dashboardDTO = await getDashboardDTO(team.id);

    // Add rate limit headers to successful response (DRY: reuse rate limit status)
    const identifier = getClientIdentifier(request);
    const rateLimitStatus = getRateLimitStatus(identifier, RATE_LIMITS.api);

    return NextResponse.json(
      {
        businesses: dashboardDTO.businesses,
        maxBusinesses: getMaxBusinesses(team),
      },
      {
        headers: {
          'X-RateLimit-Limit': RATE_LIMITS.api.maxRequests.toString(),
          'X-RateLimit-Remaining': rateLimitStatus.remaining.toString(),
          'X-RateLimit-Reset': rateLimitStatus.resetAt.toString(),
        },
      }
    );
  } catch (error) {
    logger.error('Error fetching businesses', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  // Rate limiting (stricter for business creation)
  const { checkRateLimit, getRateLimitStatus, getClientIdentifier, RATE_LIMITS } = await import('@/lib/api/rate-limit');
  const rateLimitResponse = checkRateLimit(request, RATE_LIMITS.businessCreate);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  // Get rate limit status for headers (before processing increments counter)
  const identifier = getClientIdentifier(request);
  const rateLimitStatus = getRateLimitStatus(identifier, RATE_LIMITS.businessCreate);

  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const team = await getTeamForUser();
    if (!team) {
      return NextResponse.json(
        { error: 'No team found' },
        { status: 404 }
      );
    }

    // Check if user can add more businesses
    const currentCount = await getBusinessCountByTeam(team.id);
    const canAdd = canAddBusiness(currentCount, team);

    if (!canAdd) {
      return NextResponse.json(
        { 
          error: 'Business limit reached',
          maxBusinesses: getMaxBusinesses(team),
          currentCount,
        },
        { status: 403 }
      );
    }

    // Validate request body
    const body = await request.json();
    
    // IDEAL: If only URL provided, create business immediately and crawl in background
    // This allows immediate redirect while crawl happens asynchronously
    let validatedData;
    let needsLocationAfterCrawl = false;
    let crawledDataForLocation: { name?: string; category?: string; url?: string } | null = null;
    
    if (body.url && (!body.name || !body.location)) {
      logger.info('URL-only creation detected - creating business immediately, crawling in background', {
        url: body.url,
        teamId: team.id,
      });
      
      // IDEAL: Use URL-only schema which makes location optional
      // Create business with URL only, location will be updated after crawl
      validatedData = createBusinessFromUrlSchema.parse({
        url: body.url,
        name: body.name,
        category: body.category,
        location: body.location, // Optional for URL-only creation
      });
      
      // If location is missing, mark for location form after business creation
      if (!validatedData.location || !validatedData.location.city || !validatedData.location.state) {
        needsLocationAfterCrawl = true;
        crawledDataForLocation = {
          name: validatedData.name,
          category: validatedData.category,
          url: validatedData.url,
        };
      }
    } else {
      // Standard validation for full data (requires location)
      validatedData = createBusinessSchema.parse(body);
    }

    // Idempotency check: Check for idempotency key or duplicate URL
    const idempotencyKey = getIdempotencyKey(request) || 
      generateIdempotencyKey(user.id, 'create-business', {
        teamId: team.id,
        url: validatedData.url,
      });

    // Check cached response for idempotency key
    const cachedResponse = getCachedResponse(idempotencyKey);
    if (cachedResponse) {
      return NextResponse.json(cachedResponse, { status: 201 });
    }

    // Check for duplicate business with same URL for this team
    const [existingBusiness] = await db
      .select()
      .from(businesses)
      .where(
        and(
          eq(businesses.teamId, team.id),
          eq(businesses.url, validatedData.url)
        )
      )
      .limit(1);

    if (existingBusiness) {
      // If existing business is in error or pending state, trigger auto-processing
      // This allows users to retry failed businesses by re-submitting the URL
      const shouldRetryProcessing = existingBusiness.status === 'error' || existingBusiness.status === 'pending';
      
      if (shouldRetryProcessing) {
        logger.info('Duplicate URL found with processable status - triggering auto-processing', {
          businessId: existingBusiness.id,
          status: existingBusiness.status,
          url: validatedData.url,
        });
        
        // Fire and forget - trigger processing in background
        const { autoStartProcessing } = await import('@/lib/services/business-execution');
        autoStartProcessing(existingBusiness.id).catch(error => {
          logger.error('Auto-processing failed for existing business', error, {
            businessId: existingBusiness.id,
          });
        });
      }
      
      const response = {
        business: {
          id: existingBusiness.id,
          name: existingBusiness.name,
          url: existingBusiness.url,
          category: existingBusiness.category,
          status: existingBusiness.status,
          teamId: existingBusiness.teamId,
        },
        message: shouldRetryProcessing 
          ? 'Business already exists. Restarting processing...' 
          : 'Business already exists',
        duplicate: true,
        processingTriggered: shouldRetryProcessing,
      };
      // Cache the response for idempotency
      cacheResponse(idempotencyKey, response);
      
      // Add rate limit headers (DRY: reuse rate limit status)
      const currentRateLimitStatus = getRateLimitStatus(identifier, RATE_LIMITS.businessCreate);
      return NextResponse.json(
        response,
        {
          status: 200,
          headers: {
            'X-RateLimit-Limit': RATE_LIMITS.businessCreate.maxRequests.toString(),
            'X-RateLimit-Remaining': currentRateLimitStatus.remaining.toString(),
            'X-RateLimit-Reset': currentRateLimitStatus.resetAt.toString(),
          },
        }
      );
    }

    // Create business
    // IDEAL: Location can be null/undefined for URL-only creation (will be updated after crawl)
    const business = await createBusiness({
      teamId: team.id,
      name: getBusinessNameWithFallback(validatedData.url, validatedData.name), // Extract name from URL with intelligent fallback
      url: validatedData.url,
      category: validatedData.category,
      location: validatedData.location || null, // Can be null for URL-only creation
      status: 'pending',
    });

    // Verify business was created with ID (SOLID: proper validation)
    if (!business || !business.id) {
      logger.error('Business created but ID missing', undefined, {
        business: business ? { name: business.name, url: business.url } : null,
        teamId: team.id,
      });
      return NextResponse.json(
        { error: 'Business created but ID not returned' },
        { status: 500 }
      );
    }

    // IDEAL: If location is needed after crawl, return 422 with needsLocation flag
    // This allows the UI to show location form immediately
    if (needsLocationAfterCrawl) {
      const response = {
        business: {
          id: business.id,
          name: business.name,
          url: business.url,
          category: business.category,
          status: business.status,
          teamId: business.teamId,
        },
        needsLocation: true,
        crawledData: crawledDataForLocation,
        message: 'Business created. Location required.',
      };
      
      // Cache response for idempotency
      cacheResponse(idempotencyKey, response);
      
      // Start crawl in background to update business data
      const { autoStartProcessing } = await import('@/lib/services/business-execution');
      autoStartProcessing(business.id).catch(error => {
        logger.error('Auto-processing failed for business', error, {
          businessId: business.id,
        });
      });
      
      // Add rate limit headers (DRY: reuse rate limit status)
      const currentRateLimitStatus = getRateLimitStatus(identifier, RATE_LIMITS.businessCreate);
      return NextResponse.json(
        response,
        {
          status: 422,
          headers: {
            'X-RateLimit-Limit': RATE_LIMITS.businessCreate.maxRequests.toString(),
            'X-RateLimit-Remaining': currentRateLimitStatus.remaining.toString(),
            'X-RateLimit-Reset': currentRateLimitStatus.resetAt.toString(),
          },
        }
      );
    }

    // Auto-start crawl and fingerprint in parallel (optimized processing)
    // SOLID: Single Responsibility - auto-processing handled by service
    // DRY: Centralized processing logic
    // Fire and forget - don't block response
    const { autoStartProcessing } = await import('@/lib/services/business-execution');
    logger.debug('Starting autoStartProcessing for business', {
      businessId: business.id,
    });
    autoStartProcessing(business.id).catch(error => {
      logger.error('Auto-processing failed for business', error, {
        businessId: business.id,
      });
      // Don't fail business creation if auto-processing fails
    });

    // Return business with ID (DRY: consistent response format)
    // IDEAL: Return immediately so redirect can happen
    const response = {
      business: {
        id: business.id,
        name: business.name,
        url: business.url,
        category: business.category,
        status: business.status,
        teamId: business.teamId,
      },
      message: 'Business created successfully',
    };

    // Cache response for idempotency
    cacheResponse(idempotencyKey, response);

    // Add rate limit headers (DRY: reuse rate limit status)
    const currentRateLimitStatus = getRateLimitStatus(identifier, RATE_LIMITS.businessCreate);
    return NextResponse.json(
      response,
      {
        status: 201,
        headers: {
          'X-RateLimit-Limit': RATE_LIMITS.businessCreate.maxRequests.toString(),
          'X-RateLimit-Remaining': currentRateLimitStatus.remaining.toString(),
          'X-RateLimit-Reset': currentRateLimitStatus.resetAt.toString(),
        },
      }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.error('Validation error', error, {
        errors: error.errors.map(e => ({
          path: e.path.join('.'),
          message: e.message,
        })),
      });
      return NextResponse.json(
        { 
          error: 'Validation error', 
          details: error.errors.map(e => ({
            path: e.path.join('.'),
            message: e.message,
          })),
        },
        { status: 400 }
      );
    }

    // Note: user and team may not be in scope if error occurred before their declaration
    const errorContext: { userId?: number; teamId?: number } = {};
    try {
      const errorUser = await getUser();
      if (errorUser) errorContext.userId = errorUser.id;
      const errorTeam = await getTeamForUser();
      if (errorTeam) errorContext.teamId = errorTeam.id;
    } catch {
      // Ignore errors when trying to get user/team for logging
    }
    logger.error('Error creating business', error, errorContext);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

