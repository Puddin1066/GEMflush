/**
 * Reset Fingerprint Data API Route
 * DEVELOPMENT ONLY: Clears fingerprint data and re-runs CFP
 * 
 * This is useful for development/testing when you want to see changes
 * reflected in metrics without creating a new business.
 * 
 * In production, CFP runs automatically on schedule based on subscription tier.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getUser, getTeamForUser, getBusinessById } from '@/lib/db/queries';
import { db } from '@/lib/db/drizzle';
import { llmFingerprints, competitors } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { autoStartProcessing } from '@/lib/services/business-processing';
import { loggers } from '@/lib/utils/logger';

const logger = loggers.api;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Only allow in development
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'This endpoint is only available in development' },
      { status: 403 }
    );
  }

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

    const { id } = await params;
    const businessId = parseInt(id);

    if (isNaN(businessId)) {
      return NextResponse.json(
        { error: 'Invalid business ID' },
        { status: 400 }
      );
    }

    // Get business and verify ownership
    const business = await getBusinessById(businessId);
    if (!business) {
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      );
    }

    if (business.teamId !== team.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    logger.info('Resetting fingerprint data for development', {
      businessId,
      businessName: business.name,
      userId: user.id,
    });

    // Delete all fingerprints for this business
    const deletedFingerprints = await db
      .delete(llmFingerprints)
      .where(eq(llmFingerprints.businessId, businessId))
      .returning();

    // Delete competitors (they're derived from fingerprints)
    await db
      .delete(competitors)
      .where(eq(competitors.businessId, businessId));

    logger.info('Deleted fingerprint data', {
      businessId,
      fingerprintsDeleted: deletedFingerprints.length,
    });

    // Re-run CFP processing
    autoStartProcessing(business).catch(error => {
      logger.error('CFP processing failed after reset', error, {
        businessId,
        businessName: business.name,
      });
    });

    return NextResponse.json({
      success: true,
      message: 'Fingerprint data reset and CFP re-started',
      businessId,
      fingerprintsDeleted: deletedFingerprints.length,
    });

  } catch (error) {
    logger.error('Error resetting fingerprint data', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

