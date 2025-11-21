/**
 * Business CFP Processing API Route
 * Triggers full CFP (Crawl, Fingerprint, Publish) process for a business
 * 
 * SOLID: Single Responsibility - handles CFP triggering
 * DRY: Reuses existing processing services
 */

import { NextRequest, NextResponse } from 'next/server';
import { getUser, getTeamForUser, getBusinessById } from '@/lib/db/queries';
import { autoStartProcessing } from '@/lib/services/business-processing';
import { loggers } from '@/lib/utils/logger';

const logger = loggers.api;

export async function POST(
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

    logger.info('Manual CFP processing triggered', {
      businessId,
      businessName: business.name,
      currentStatus: business.status,
      userId: user.id,
    });

    // Trigger CFP processing in background
    // This will run: Crawl → Fingerprint → Publish (if automation enabled)
    autoStartProcessing(business.id).catch(error => {
      logger.error('Manual CFP processing failed', error, {
        businessId,
        businessName: business.name,
      });
    });

    return NextResponse.json({
      success: true,
      message: 'CFP processing started',
      businessId,
      status: business.status,
    });

  } catch (error) {
    logger.error('Error triggering CFP processing', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

