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
    
    // Log for debugging routing issues
    console.log(`[FINGERPRINT API] Request received for businessId: "${businessIdStr}" (parsed: ${businessId})`);
    
    if (isNaN(businessId)) {
      console.error(`[FINGERPRINT API] Invalid business ID: "${businessIdStr}"`);
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
    // CRITICAL: Log the query to verify correct businessId is used
    console.log(`[FINGERPRINT API] Querying fingerprints for businessId: ${businessId} (type: ${typeof businessId})`);
    
    const fingerprints = await db
      .select()
      .from(llmFingerprints)
      .where(eq(llmFingerprints.businessId, businessId))
      .orderBy(desc(llmFingerprints.createdAt))
      .limit(2);
    
    console.log(`[FINGERPRINT API] Found ${fingerprints.length} fingerprint(s) for business ${businessId}`);
    if (fingerprints.length > 0) {
      console.log(`[FINGERPRINT API] Fingerprint IDs: ${fingerprints.map(f => f.id).join(', ')}, businessIds: ${fingerprints.map(f => f.businessId).join(', ')}`);
    }

    if (fingerprints.length === 0) {
      console.log(`[FINGERPRINT API] No fingerprints found for business ${businessId}`);
      return NextResponse.json(null);
    }

    const currentFingerprint = fingerprints[0];
    const previousFingerprint = fingerprints[1]; // Second most recent, if exists

    // Verify fingerprint belongs to the correct business
    if (currentFingerprint.businessId !== businessId) {
      console.error(`[FINGERPRINT API] MISMATCH: Fingerprint ${currentFingerprint.id} has businessId ${currentFingerprint.businessId}, but requested businessId is ${businessId}`);
      return NextResponse.json(
        { error: 'Fingerprint data mismatch' },
        { status: 500 }
      );
    }

    console.log(`[FINGERPRINT API] Found fingerprint ${currentFingerprint.id} for business ${businessId} (verified match)`);

    // Transform to DTO with error handling
    // IMPORTANT: Override businessName with current business name to ensure data matches
    // The fingerprint may have been created with a different business name (e.g., if business was renamed)
    try {
      // Ensure fingerprint uses current business name
      const fingerprintWithCurrentName = {
        ...currentFingerprint,
        businessName: business.name, // Use current business name, not stored name
      };
      const previousFingerprintWithCurrentName = previousFingerprint ? {
        ...previousFingerprint,
        businessName: business.name,
      } : undefined;

      const dto = toFingerprintDetailDTO(
        fingerprintWithCurrentName as any,
        previousFingerprintWithCurrentName as any,
        business // Pass business data to reconstruct prompts
      );

      // Validate DTO has required structure
      if (!dto || !dto.summary) {
        console.error('DTO transformation failed - missing summary:', dto);
        return NextResponse.json(
          { error: 'Fingerprint data is incomplete' },
          { status: 500 }
        );
      }

      // Add debug metadata to verify correct business
      const responseWithMetadata = {
        ...dto,
        _debug: {
          fingerprintId: currentFingerprint.id,
          businessId: businessId,
          businessName: business.name,
          requestedBusinessId: businessId,
        },
      };

      console.log(`[FINGERPRINT API] Returning DTO for business ${businessId} (fingerprint ${currentFingerprint.id}, business: "${business.name}")`);
      console.log(`[FINGERPRINT API] DTO summary: visibilityScore=${dto.visibilityScore}, trend=${dto.trend}`);
      
      return NextResponse.json(responseWithMetadata);
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

