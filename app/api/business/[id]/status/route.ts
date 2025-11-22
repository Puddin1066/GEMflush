// Business processing status API route
// Provides real-time status for parallel crawl and fingerprint processing

import { NextRequest, NextResponse } from 'next/server';
import { getUser, getTeamForUser, getBusinessById } from '@/lib/db/queries';
import { verifyBusinessOwnership } from '@/lib/auth/middleware';
import { db } from '@/lib/db/drizzle';
import { crawlJobs, llmFingerprints } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import { z } from 'zod';

const businessIdParamSchema = z.object({
  id: z.string().regex(/^\d+$/).transform(Number),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    // Validate path parameter
    const paramResult = businessIdParamSchema.safeParse(await params);
    if (!paramResult.success) {
      return NextResponse.json(
        { error: 'Invalid business ID', details: paramResult.error.errors },
        { status: 400 }
      );
    }
    const businessId = paramResult.data.id;

    // Verify ownership
    const { authorized, business } = await verifyBusinessOwnership(businessId, team.id);
    if (!authorized || !business) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Get latest crawl job
    const [latestCrawlJob] = await db
      .select()
      .from(crawlJobs)
      .where(eq(crawlJobs.businessId, businessId))
      .orderBy(desc(crawlJobs.createdAt))
      .limit(1);

    // Get latest fingerprint
    const [latestFingerprint] = await db
      .select()
      .from(llmFingerprints)
      .where(eq(llmFingerprints.businessId, businessId))
      .orderBy(desc(llmFingerprints.createdAt))
      .limit(1);

    // Calculate overall processing status
    const crawlStatus = latestCrawlJob ? {
      status: latestCrawlJob.status,
      progress: latestCrawlJob.progress || 0,
      jobType: latestCrawlJob.jobType,
      startedAt: latestCrawlJob.startedAt,
      completedAt: latestCrawlJob.completedAt,
      pagesDiscovered: latestCrawlJob.pagesDiscovered || 0,
      pagesProcessed: latestCrawlJob.pagesProcessed || 0,
      firecrawlJobId: latestCrawlJob.firecrawlJobId,
      errorMessage: latestCrawlJob.errorMessage,
    } : null;

    const fingerprintStatus = latestFingerprint ? {
      visibilityScore: latestFingerprint.visibilityScore,
      mentionRate: latestFingerprint.mentionRate,
      sentimentScore: latestFingerprint.sentimentScore,
      accuracyScore: latestFingerprint.accuracyScore,
      createdAt: latestFingerprint.createdAt,
    } : null;

    // Determine overall status
    let overallStatus = business.status;
    let overallProgress = 0;

    if (crawlStatus) {
      if (crawlStatus.status === 'running') {
        overallStatus = 'processing';
        overallProgress = Math.round(crawlStatus.progress / 2); // Crawl is 50% of total
      } else if (crawlStatus.status === 'completed') {
        if (fingerprintStatus) {
          overallStatus = 'fingerprinted';
          overallProgress = 100;
        } else {
          overallStatus = 'crawled';
          overallProgress = 50;
        }
      } else if (crawlStatus.status === 'failed') {
        overallStatus = 'error';
        overallProgress = 0;
      }
    }

    return NextResponse.json({
      businessId,
      businessName: business.name,
      businessUrl: business.url,
      overallStatus,
      overallProgress,
      lastCrawledAt: business.lastCrawledAt,
      crawl: crawlStatus,
      fingerprint: fingerprintStatus,
      // Enhanced processing info
      isParallelProcessing: crawlStatus?.status === 'running',
      hasMultiPageData: (crawlStatus?.pagesProcessed || 0) > 1,
      processingStartedAt: crawlStatus?.startedAt,
      estimatedCompletion: crawlStatus?.status === 'running' && crawlStatus?.progress 
        ? new Date(Date.now() + ((100 - crawlStatus.progress) * 1000)) // Rough estimate
        : null,
    });

  } catch (error) {
    console.error('Error fetching business status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
