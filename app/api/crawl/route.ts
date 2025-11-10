// Web crawling API route

import { NextRequest, NextResponse } from 'next/server';
import { getUser, getTeamForUser } from '@/lib/db/queries';
import {
  getBusinessById,
  updateBusiness,
  createCrawlJob,
  updateCrawlJob,
} from '@/lib/db/queries';
import { webCrawler } from '@/lib/crawler';
import { z } from 'zod';

const crawlRequestSchema = z.object({
  businessId: z.number().int().positive(),
});

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
      console.error('Background crawl error:', error);
    });

    return NextResponse.json({
      jobId: job.id,
      message: 'Crawl job started',
      status: 'queued',
    });
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

// Background crawl execution
async function executeCrawlJob(jobId: number, businessId: number) {
  try {
    // Update job status
    await updateCrawlJob(jobId, {
      status: 'processing',
    });

    // Update business status
    await updateBusiness(businessId, {
      status: 'crawling',
    });

    // Get business details
    const business = await getBusinessById(businessId);
    if (!business) {
      throw new Error('Business not found');
    }

    // Execute crawl
    const result = await webCrawler.crawl(business.url);

    if (result.success && result.data) {
      // Update business with crawled data
      await updateBusiness(businessId, {
        status: 'crawled',
        crawlData: result.data,
        lastCrawledAt: new Date(),
      });

      // Update job as completed
      await updateCrawlJob(jobId, {
        status: 'completed',
        progress: 100,
        result: { crawledData: result.data },
        completedAt: new Date(),
      });
    } else {
      throw new Error(result.error || 'Crawl failed');
    }
  } catch (error) {
    console.error('Crawl job execution error:', error);

    // Update job as failed
    await updateCrawlJob(jobId, {
      status: 'failed',
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      completedAt: new Date(),
    });

    // Update business status
    await updateBusiness(businessId, {
      status: 'error',
    });
  }
}

