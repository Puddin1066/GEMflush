/**
 * Fingerprint API Route
 * Single Responsibility: Retrieve fingerprint analysis by ID
 * 
 * GET /api/fingerprint/[id] - Returns FingerprintDetailDTO
 */

import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/db/queries';
import { db } from '@/lib/db/drizzle';
import { llmFingerprints, businesses } from '@/lib/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { toFingerprintDetailDTO } from '@/lib/data/fingerprint-dto';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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

    const { id } = await params;
    const fingerprintId = parseInt(id);
    if (isNaN(fingerprintId)) {
      return NextResponse.json(
        { error: 'Invalid fingerprint ID' },
        { status: 400 }
      );
    }

    // Get current fingerprint with business
    const [result] = await db
      .select({
        fingerprint: llmFingerprints,
        business: businesses,
      })
      .from(llmFingerprints)
      .innerJoin(businesses, eq(llmFingerprints.businessId, businesses.id))
      .where(eq(llmFingerprints.id, fingerprintId))
      .limit(1);

    if (!result) {
      return NextResponse.json(
        { error: 'Fingerprint not found' },
        { status: 404 }
      );
    }

    const { fingerprint: currentFingerprint, business } = result;

    // Verify ownership - check if user has access to this team's business
    // Note: User type doesn't have teamId, need to get it from teamMembers
    const userTeams = await db.query.teamMembers.findMany({
      where: (teamMembers, { eq }) => eq(teamMembers.userId, user.id),
    });

    const hasAccess = userTeams.some(tm => tm.teamId === business.teamId);

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Not authorized to view this fingerprint' },
        { status: 403 }
      );
    }

    // Get previous fingerprint for trend calculation
    const previousFingerprints = await db
      .select()
      .from(llmFingerprints)
      .where(eq(llmFingerprints.businessId, currentFingerprint.businessId))
      .orderBy(desc(llmFingerprints.createdAt))
      .limit(2);
    
    const previousFingerprint = previousFingerprints[1]; // Second most recent

    // Transform to DTO with business data to reconstruct prompts
    const dto = toFingerprintDetailDTO(
      currentFingerprint as any, // TODO: Proper type mapping
      previousFingerprint as any,
      business // Pass business data to reconstruct prompts
    );

    return NextResponse.json(dto);
  } catch (error) {
    console.error('Error fetching fingerprint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

