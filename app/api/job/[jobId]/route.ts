// Job status API route

import { NextRequest, NextResponse } from 'next/server';
import { getUser, getTeamForUser } from '@/lib/db/queries';
import { getCrawlJob } from '@/lib/db/queries';
import { verifyBusinessOwnership } from '@/lib/auth/middleware';
import { jobIdParamSchema } from '@/lib/validation/common';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
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
    const paramResult = jobIdParamSchema.safeParse(await params);
    if (!paramResult.success) {
      return NextResponse.json(
        { error: 'Invalid job ID', details: paramResult.error.errors },
        { status: 400 }
      );
    }
    const jobId = paramResult.data.jobId;

    const job = await getCrawlJob(jobId);
    if (!job) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }

    // Verify ownership (DRY principle)
    const { authorized, business } = await verifyBusinessOwnership(job.businessId, team.id);
    if (!authorized || !business) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      id: job.id,
      businessId: job.businessId,
      jobType: job.jobType,
      status: job.status,
      progress: job.progress,
      result: job.result,
      errorMessage: job.errorMessage,
      // Enhanced fields for multi-page crawling
      firecrawlJobId: job.firecrawlJobId,
      startedAt: job.startedAt,
      pagesDiscovered: job.pagesDiscovered,
      pagesProcessed: job.pagesProcessed,
      firecrawlMetadata: job.firecrawlMetadata,
      createdAt: job.createdAt,
      completedAt: job.completedAt,
    });
  } catch (error) {
    console.error('Error fetching job status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

