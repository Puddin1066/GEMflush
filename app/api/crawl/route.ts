// Web crawling API route

import { NextRequest, NextResponse } from 'next/server';
import { getUser, getTeamForUser } from '@/lib/db/queries';
import {
  getBusinessById,
  updateBusiness,
  createCrawlJob,
} from '@/lib/db/queries';
import { crawlRequestSchema } from '@/lib/validation/business';
import { executeCrawlJob } from '@/lib/services/business-processing';
import { z } from 'zod';
import {
  getIdempotencyKey,
  getCachedResponse,
  cacheResponse,
  generateIdempotencyKey,
} from '@/lib/utils/idempotency';
import { db } from '@/lib/db/drizzle';
import { crawlJobs } from '@/lib/db/schema';
import { eq, and, desc } from 'drizzle-orm';

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

    // Validate request
    const body = await request.json();
    const { businessId } = crawlRequestSchema.parse(body);

    // Get business and verify ownership
    const business = await getBusinessById(businessId);
    if (!business) {
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      );
    }

    if (business.teamId !== team.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Idempotency check
    const idempotencyKey = getIdempotencyKey(request) || 
      generateIdempotencyKey(user.id, 'create-crawl', {
        businessId,
      });

    // Check cached response
    const cachedResponse = getCachedResponse(idempotencyKey);
    if (cachedResponse) {
      return NextResponse.json(cachedResponse);
    }

    // Check if crawl is needed (cache logic - DRY: reuse caching logic)
    const { shouldCrawl: needsCrawl } = await import('@/lib/services/business-processing');
    const needsCrawlCheck = await needsCrawl(business);
    
    if (!needsCrawlCheck) {
      // Crawl cache hit - return existing crawl data
      const response = {
        jobId: null,
        message: 'Crawl skipped - cached result valid',
        status: business.status,
        cached: true,
      };
      cacheResponse(idempotencyKey, response);
      return NextResponse.json(response);
    }
    
    // Check for recent crawl job (within last 5 minutes) to prevent duplicate crawls
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const [recentJob] = await db
      .select()
      .from(crawlJobs)
      .where(
        and(
          eq(crawlJobs.businessId, businessId),
          eq(crawlJobs.jobType, 'initial_crawl')
        )
      )
      .orderBy(desc(crawlJobs.createdAt))
      .limit(1);

    if (recentJob && recentJob.createdAt && new Date(recentJob.createdAt) > fiveMinutesAgo) {
      const response = {
        jobId: recentJob.id,
        message: 'Crawl job already exists',
        status: recentJob.status,
        duplicate: true,
      };
      cacheResponse(idempotencyKey, response);
      return NextResponse.json(response);
    }

    // Create crawl job
    const job = await createCrawlJob({
      businessId,
      jobType: 'initial_crawl',
      status: 'queued',
      progress: 0,
    });

    // Execute crawl in background (simplified for now)
    // In production, use a proper job queue like BullMQ
    executeCrawlJob(job.id, businessId).catch(error => {
      console.error('[CRAWL] Background crawl job error:', error);
      // Update business status to error if background job fails to start
      updateBusiness(businessId, {
        status: 'error',
      }).catch(err => {
        console.error('[CRAWL] Failed to update business status to error:', err);
      });
    });

    const response = {
      jobId: job.id,
      message: 'Crawl job started',
      status: 'queued',
    };

    // Cache response for idempotency
    cacheResponse(idempotencyKey, response);

    return NextResponse.json(response);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error starting crawl:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

