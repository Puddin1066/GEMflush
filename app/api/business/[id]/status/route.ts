// Business processing status API route
// Provides real-time status for parallel crawl and fingerprint processing

import { NextRequest, NextResponse } from 'next/server';
import { getUser, getTeamForUser, getBusinessById } from '@/lib/db/queries';
import { verifyBusinessOwnership } from '@/lib/auth/middleware';
import { db } from '@/lib/db/drizzle';
import { crawlJobs, llmFingerprints } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import { z } from 'zod';
import { toBusinessStatusDTO } from '@/lib/data/status-dto';

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

    // Transform to DTO (SOLID: uses DTO layer for data transformation)
    const dto = toBusinessStatusDTO(business, latestCrawlJob || null, latestFingerprint || null);

    return NextResponse.json(dto);

  } catch (error) {
    console.error('Error fetching business status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
