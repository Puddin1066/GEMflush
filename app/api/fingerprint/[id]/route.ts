/**
 * Fingerprint API Route
 * Single Responsibility: Retrieve fingerprint analysis by ID
 * 
 * GET /api/fingerprint/[id] - Returns FingerprintDetailDTO
 */

import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/db/queries';
import { db } from '@/lib/db/drizzle';
import { llmFingerprints, businesses, type LLMFingerprint } from '@/lib/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { toFingerprintDetailDTO } from '@/lib/data/fingerprint-dto';
import { fingerprintIdParamSchema } from '@/lib/validation/common';

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

    // Validate path parameter
    const paramResult = fingerprintIdParamSchema.safeParse(await params);
    if (!paramResult.success) {
      return NextResponse.json(
        { error: 'Invalid fingerprint ID', details: paramResult.error.errors },
        { status: 400 }
      );
    }
    const fingerprintId = paramResult.data.id;

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
    // Convert database types to domain types (jsonb fields are already properly typed)
    const dto = toFingerprintDetailDTO(
      currentFingerprint as LLMFingerprint,
      previousFingerprint as LLMFingerprint | undefined,
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

