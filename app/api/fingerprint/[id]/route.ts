/**
 * Fingerprint API Route
 * Single Responsibility: Retrieve fingerprint analysis by ID
 * 
 * GET /api/fingerprint/[id] - Returns FingerprintDetailDTO
 */

import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/db/queries';
import { db } from '@/lib/db/drizzle';
import { fingerprints, businesses } from '@/lib/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { toFingerprintDetailDTO } from '@/lib/data/fingerprint-dto';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
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

    const fingerprintId = parseInt(params.id);
    if (isNaN(fingerprintId)) {
      return NextResponse.json(
        { error: 'Invalid fingerprint ID' },
        { status: 400 }
      );
    }

    // Get current fingerprint
    const [currentFingerprint] = await db
      .select()
      .from(fingerprints)
      .where(eq(fingerprints.id, fingerprintId))
      .limit(1);

    if (!currentFingerprint) {
      return NextResponse.json(
        { error: 'Fingerprint not found' },
        { status: 404 }
      );
    }

    // Verify ownership through business
    const [business] = await db
      .select()
      .from(businesses)
      .where(
        and(
          eq(businesses.id, currentFingerprint.businessId),
          eq(businesses.teamId, user.teamId)
        )
      )
      .limit(1);

    if (!business) {
      return NextResponse.json(
        { error: 'Not authorized to view this fingerprint' },
        { status: 403 }
      );
    }

    // Get previous fingerprint for trend calculation
    const [previousFingerprint] = await db
      .select()
      .from(fingerprints)
      .where(
        and(
          eq(fingerprints.businessId, currentFingerprint.businessId),
          eq(fingerprints.id, fingerprintId)
        )
      )
      .orderBy(desc(fingerprints.createdAt))
      .limit(2);

    // Transform to DTO
    const dto = toFingerprintDetailDTO(
      currentFingerprint as any, // TODO: Proper type mapping
      previousFingerprint as any
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

