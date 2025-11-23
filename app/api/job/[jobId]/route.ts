// Job status API route

import { NextRequest, NextResponse } from 'next/server';
import { getUser, getTeamForUser } from '@/lib/db/queries';
import { getCrawlJob } from '@/lib/db/queries';
import { verifyBusinessOwnership } from '@/lib/auth/middleware';
import { jobIdParamSchema } from '@/lib/validation/common';
import { toCrawlJobDTO } from '@/lib/data/crawl-dto';

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

    // Transform to DTO (SOLID: uses DTO layer for data transformation)
    const dto = toCrawlJobDTO(job);

    return NextResponse.json(dto);
  } catch (error) {
    console.error('Error fetching job status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

