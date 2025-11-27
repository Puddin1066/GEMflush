/**
 * Upgrade Configuration API Route
 * 
 * GET /api/subscription/upgrade-config
 * 
 * Get all upgrade configurations for features.
 * Requires authentication.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/db/queries';
import { UPGRADE_CONFIGS } from '@/lib/subscription/upgrade-config';
import { loggers } from '@/lib/utils/logger';

const logger = loggers.api;

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const user = await getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Return all upgrade configurations
    // DRY: Use centralized config from lib/subscription
    return NextResponse.json({
      configs: UPGRADE_CONFIGS,
      features: Object.keys(UPGRADE_CONFIGS) as Array<keyof typeof UPGRADE_CONFIGS>,
    });
  } catch (error) {
    logger.error('Failed to get upgrade config', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}


