// Test-only API endpoint for E2E tests
// Sets Stripe customer ID on team (required for webhook processing)
// Only available in test/development environments

import { NextRequest, NextResponse } from 'next/server';
import { getUser, getTeamForUser, updateTeamSubscription } from '@/lib/db/queries';

/**
 * POST /api/test/team/customer-id
 * Sets the Stripe customer ID on the authenticated user's team (test-only)
 * 
 * Body: { customerId: string }
 * 
 * This endpoint is only available when NODE_ENV=test or development
 */
export async function POST(request: NextRequest) {
  // Only allow in test or development environments
  const isTestOrDev = process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'development';
  if (!isTestOrDev) {
    return NextResponse.json(
      { error: 'This endpoint is only available in test or development environment' },
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
        { error: 'Team not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { customerId } = body;

    if (!customerId || typeof customerId !== 'string') {
      return NextResponse.json(
        { error: 'Invalid customerId. Must be a non-empty string' },
        { status: 400 }
      );
    }

    // Update team with customer ID
    await updateTeamSubscription(team.id, {
      planName: team.planName,
      stripeSubscriptionId: team.stripeSubscriptionId,
      stripeProductId: team.stripeProductId,
      subscriptionStatus: team.subscriptionStatus || 'active',
    });

    // Also set customer ID directly (updateTeamSubscription doesn't handle this)
    const { db } = await import('@/lib/db/drizzle');
    const { teams } = await import('@/lib/db/schema');
    const { eq } = await import('drizzle-orm');
    await db.update(teams)
      .set({ stripeCustomerId: customerId })
      .where(eq(teams.id, team.id));

    return NextResponse.json({
      success: true,
      customerId,
    });
  } catch (error) {
    console.error('Error setting test team customer ID:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

