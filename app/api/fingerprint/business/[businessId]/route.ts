/**
 * Fingerprint API Route - Get Latest by Business ID
 * Single Responsibility: Retrieve latest fingerprint for a business
 * 
 * GET /api/fingerprint/business/[businessId] - Returns FingerprintDetailDTO or null
 */

import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/db/queries';
import { db } from '@/lib/db/drizzle';
import { llmFingerprints, businesses, type LLMFingerprint } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import { toFingerprintDetailDTO } from '@/lib/data/fingerprint-dto';
import { businessIdParamSchema } from '@/lib/validation/common';
import { loggers } from '@/lib/utils/logger';

const logger = loggers.fingerprint;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ businessId: string }> }
) {
  let businessId: number | undefined;
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
    const paramResult = businessIdParamSchema.safeParse(await params);
    if (!paramResult.success) {
      return NextResponse.json(
        { error: 'Invalid business ID', details: paramResult.error.errors },
        { status: 400 }
      );
    }
    businessId = paramResult.data.businessId;

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
    logger.debug('Querying fingerprints for business', {
      businessId,
      businessIdType: typeof businessId,
    });
    
    const fingerprints = await db
      .select()
      .from(llmFingerprints)
      .where(eq(llmFingerprints.businessId, businessId))
      .orderBy(desc(llmFingerprints.createdAt))
      .limit(2);
    
    logger.debug('Found fingerprints for business', {
      businessId,
      count: fingerprints.length,
      fingerprintIds: fingerprints.map(f => f.id),
    });

    if (fingerprints.length === 0) {
      logger.debug('No fingerprints found for business', { businessId });
      return NextResponse.json(null);
    }

    const currentFingerprint = fingerprints[0];
    const previousFingerprint = fingerprints[1]; // Second most recent, if exists

    // Verify fingerprint belongs to the correct business
    if (currentFingerprint.businessId !== businessId) {
      logger.error('Fingerprint data mismatch', undefined, {
        fingerprintId: currentFingerprint.id,
        fingerprintBusinessId: currentFingerprint.businessId,
        requestedBusinessId: businessId,
      });
      return NextResponse.json(
        { error: 'Fingerprint data mismatch' },
        { status: 500 }
      );
    }

    logger.debug('Found fingerprint for business (verified match)', {
      fingerprintId: currentFingerprint.id,
      businessId,
    });

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
        fingerprintWithCurrentName as LLMFingerprint,
        previousFingerprintWithCurrentName as LLMFingerprint | undefined,
        business // Pass business data to reconstruct prompts
      );

      // Validate DTO has required structure
      if (!dto || !dto.summary) {
        logger.error('DTO transformation failed - missing summary', undefined, {
          businessId,
          fingerprintId: currentFingerprint.id,
          dto: dto ? Object.keys(dto) : null,
        });
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

      logger.debug('Returning DTO for business', {
        businessId,
        fingerprintId: currentFingerprint.id,
        businessName: business.name,
        visibilityScore: dto.visibilityScore,
        trend: dto.trend,
      });
      
      return NextResponse.json(responseWithMetadata);
    } catch (dtoError) {
      logger.error('Error transforming fingerprint to DTO', dtoError, {
        businessId,
        fingerprintId: currentFingerprint.id,
      });
      return NextResponse.json(
        { error: 'Failed to process fingerprint data' },
        { status: 500 }
      );
    }
  } catch (error) {
    logger.error('Error fetching fingerprint by business ID', error, {
      businessId: typeof businessId === 'number' ? businessId : undefined,
    });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

