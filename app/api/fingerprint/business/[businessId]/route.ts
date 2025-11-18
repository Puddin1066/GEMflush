/**
 * Fingerprint API Route - Get Latest by Business ID
 * Single Responsibility: Retrieve latest fingerprint for a business
 * 
 * GET /api/fingerprint/business/[businessId] - Returns FingerprintDetailDTO or null
 */

import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/db/queries';
import { db } from '@/lib/db/drizzle';
import { llmFingerprints, businesses } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import { toFingerprintDetailDTO } from '@/lib/data/fingerprint-dto';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ businessId: string }> }
) {
  try {
    // Authentication check
    const user = await getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { businessId: businessIdStr } = await params;
    const businessId = parseInt(businessIdStr);
    if (isNaN(businessId)) {
      return NextResponse.json(
        { error: 'Invalid business ID' },
        { status: 400 }
      );
    }

    // Get business and verify ownership
    const [business] = await db
      .select()
      .from(businesses)
      .where(eq(businesses.id, businessId))
      .limit(1);

    if (!business) {
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      );
    }

    // Verify ownership
    const userTeams = await db.query.teamMembers.findMany({
      where: (teamMembers, { eq }) => eq(teamMembers.userId, user.id),
    });

    const hasAccess = userTeams.some(tm => tm.teamId === business.teamId);

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Not authorized to view this business' },
        { status: 403 }
      );
    }

    // Get latest fingerprint for this business
    const fingerprints = await db
      .select()
      .from(llmFingerprints)
      .where(eq(llmFingerprints.businessId, businessId))
      .orderBy(desc(llmFingerprints.createdAt))
      .limit(2);

    if (fingerprints.length === 0) {
      return NextResponse.json(null);
    }

    const currentFingerprint = fingerprints[0];
    const previousFingerprint = fingerprints[1]; // Second most recent, if exists

    // Transform to DTO with error handling
    try {
      const dto = toFingerprintDetailDTO(
        currentFingerprint as any,
        previousFingerprint as any
      );

      // Validate DTO has required structure
      if (!dto || !dto.summary) {
        console.error('DTO transformation failed - missing summary:', dto);
        return NextResponse.json(
          { error: 'Fingerprint data is incomplete' },
          { status: 500 }
        );
      }

      return NextResponse.json(dto);
    } catch (dtoError) {
      console.error('Error transforming fingerprint to DTO:', dtoError);
      console.error('Raw fingerprint data:', currentFingerprint);
      return NextResponse.json(
        { error: 'Failed to process fingerprint data' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error fetching fingerprint by business ID:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

