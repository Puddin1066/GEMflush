// Business management API routes

import { NextRequest, NextResponse } from 'next/server';
import { getUser, getTeamForUser } from '@/lib/db/queries';
import {
  getBusinessesByTeam,
  createBusiness,
  getBusinessCountByTeam,
} from '@/lib/db/queries';
import { canAddBusiness, getMaxBusinesses } from '@/lib/gemflush/permissions';
import { createBusinessSchema, createBusinessFromUrlSchema } from '@/lib/validation/business';
import { z } from 'zod';
import { webCrawler } from '@/lib/crawler';
import {
  getIdempotencyKey,
  getCachedResponse,
  cacheResponse,
  generateIdempotencyKey,
} from '@/lib/utils/idempotency';
import { db } from '@/lib/db/drizzle';
import { businesses } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

export async function GET(request: NextRequest) {
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

    const businesses = await getBusinessesByTeam(team.id);

    return NextResponse.json({
      businesses,
      maxBusinesses: getMaxBusinesses(team),
    });
  } catch (error) {
    console.error('Error fetching businesses:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
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
    
    // NEW: If only URL provided, crawl first to extract data
    let validatedData;
    
    if (body.url && (!body.name || !body.location)) {
      console.log('[BUSINESS] URL-only creation detected, crawling to extract data...');
      
      // Crawl URL to extract business data
      const crawlResult = await webCrawler.crawl(body.url);
      
      if (!crawlResult.success || !crawlResult.data) {
        return NextResponse.json(
          { error: 'Failed to crawl URL. Please provide business details manually.' },
          { status: 400 }
        );
      }
      
      const crawled = crawlResult.data;
      
      // Helper: Map LLM category to enum
      const mapCategoryToEnum = (llmCategory: string | undefined): string | undefined => {
        if (!llmCategory) return undefined;
        
        const categoryMap: Record<string, string> = {
          'restaurant': 'restaurant',
          'retail': 'retail',
          'healthcare': 'healthcare',
          'professional services': 'professional_services',
          'home services': 'home_services',
          'automotive': 'automotive',
          'beauty': 'beauty',
          'fitness': 'fitness',
          'entertainment': 'entertainment',
          'education': 'education',
          'real estate': 'real_estate',
          'technology': 'technology',
        };
        
        const normalized = llmCategory.toLowerCase();
        return categoryMap[normalized] || 'other';
      };
      
      // Merge crawled data with user-provided data (user data takes precedence)
      const mergedData = {
        url: body.url,
        name: body.name || crawled.name || 'Unknown Business',
        category: body.category || mapCategoryToEnum(crawled.llmEnhanced?.businessCategory),
        location: body.location || (crawled.location ? {
          address: crawled.location.address,
          city: crawled.location.city || 'Unknown',
          state: crawled.location.state || 'Unknown',
          country: crawled.location.country || 'US',
          // Include coordinates if available (for P625 claim)
          coordinates: (crawled.location.lat && crawled.location.lng) ? {
            lat: crawled.location.lat,
            lng: crawled.location.lng,
          } : undefined,
        } : {
          city: 'Unknown',
          state: 'Unknown',
          country: 'US',
        }),
      };
      
      // Validate merged data
      validatedData = createBusinessSchema.parse(mergedData);
    } else {
      // Standard validation for full data
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
      const response = {
        business: {
          id: existingBusiness.id,
          name: existingBusiness.name,
          url: existingBusiness.url,
          category: existingBusiness.category,
          status: existingBusiness.status,
          teamId: existingBusiness.teamId,
        },
        message: 'Business already exists',
        duplicate: true,
      };
      // Cache the response for idempotency
      cacheResponse(idempotencyKey, response);
      return NextResponse.json(response, { status: 200 });
    }

    // Create business
    const business = await createBusiness({
      teamId: team.id,
      name: validatedData.name,
      url: validatedData.url,
      category: validatedData.category,
      location: validatedData.location,
      status: 'pending',
    });

    // Verify business was created with ID (SOLID: proper validation)
    if (!business || !business.id) {
      console.error('Business created but ID missing:', business);
      return NextResponse.json(
        { error: 'Business created but ID not returned' },
        { status: 500 }
      );
    }

    // Auto-start crawl and fingerprint in parallel (optimized processing)
    // SOLID: Single Responsibility - auto-processing handled by service
    // DRY: Centralized processing logic
    // Fire and forget - don't block response
    const { autoStartProcessing } = await import('@/lib/services/business-processing');
    autoStartProcessing(business).catch(error => {
      console.error('Auto-processing failed for business:', business.id, error);
      // Don't fail business creation if auto-processing fails
    });

    // Return business with ID (DRY: consistent response format)
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

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Validation error:', error.errors);
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

    console.error('Error creating business:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

