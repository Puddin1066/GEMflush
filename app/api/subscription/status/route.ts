/**
 * Subscription Status API Route
 * 
 * GET /api/subscription/status
 * 
 * Get current subscription status and plan information for authenticated user's team.
 * Requires authentication.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getUser, getTeamForUser } from '@/lib/db/queries';
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

    // Get user's team
    const team = await getTeamForUser();
    if (!team) {
      return NextResponse.json(
        { error: 'No team found' },
        { status: 404 }
      );
    }

    // Return subscription status
    return NextResponse.json({
      planName: team.planName || 'free',
      subscriptionStatus: team.subscriptionStatus || 'inactive',
      stripeCustomerId: team.stripeCustomerId,
      stripeSubscriptionId: team.stripeSubscriptionId,
      stripeProductId: team.stripeProductId,
    });
  } catch (error) {
    logger.error('Failed to get subscription status', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}


