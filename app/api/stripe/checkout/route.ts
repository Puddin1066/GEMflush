import { eq } from 'drizzle-orm';
import { db } from '@/lib/db/drizzle';
import { users, teams, teamMembers } from '@/lib/db/schema';
import { setSession } from '@/lib/auth/session';
import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/payments/stripe';
import Stripe from 'stripe';

/**
 * Normalize Stripe product name to plan ID (DRY: centralized normalization)
 * SOLID: Single Responsibility - only handles name normalization
 * 
 * Stripe product names can be "Pro Plan", "Pro", "Agency Plan", etc.
 * But plan IDs must be lowercase: "pro", "agency", "free"
 * 
 * This matches the logic in lib/payments/stripe.ts (DRY: avoid duplication)
 */
function normalizeProductNameToPlanId(productName: string | null | undefined): string {
  if (!productName) return 'free'; // Default to free if no product name
  
  const normalized = productName.toLowerCase().trim();
  
  // Map common Stripe product name variations to plan IDs
  if (normalized.includes('pro') && !normalized.includes('agency')) {
    return 'pro';
  } else if (normalized.includes('agency')) {
    return 'agency';
  } else if (normalized === 'free' || normalized === 'llm fingerprinter') {
    return 'free';
  }
  
  // Fallback: try direct match (case-insensitive)
  const planIds = ['free', 'pro', 'agency'];
  const matched = planIds.find(id => normalized.includes(id));
  return matched || normalized; // Return normalized if no match (pragmatic: might still work)
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const sessionId = searchParams.get('session_id');

  if (!sessionId) {
    return NextResponse.redirect(new URL('/pricing', request.url));
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['customer', 'subscription'],
    });

    if (!session.customer || typeof session.customer === 'string') {
      throw new Error('Invalid customer data from Stripe.');
    }

    const customerId = session.customer.id;
    const subscriptionId =
      typeof session.subscription === 'string'
        ? session.subscription
        : session.subscription?.id;

    if (!subscriptionId) {
      throw new Error('No subscription found for this session.');
    }

    const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
      expand: ['items.data.price.product'],
    });

    const plan = subscription.items.data[0]?.price;

    if (!plan) {
      throw new Error('No plan found for this subscription.');
    }

    const product = plan.product as Stripe.Product;
    const productId = product.id;

    if (!productId) {
      throw new Error('No product ID found for this subscription.');
    }

    // DRY: Normalize product name to plan ID
    // Stripe product names can be "Pro Plan", "Pro", etc., but plan IDs must be "pro", "agency", "free"
    const planId = normalizeProductNameToPlanId(product.name);

    const userId = session.client_reference_id;
    if (!userId) {
      throw new Error("No user ID found in session's client_reference_id.");
    }

    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, Number(userId)))
      .limit(1);

    if (user.length === 0) {
      throw new Error('User not found in database.');
    }

    const userTeam = await db
      .select({
        teamId: teamMembers.teamId,
      })
      .from(teamMembers)
      .where(eq(teamMembers.userId, user[0].id))
      .limit(1);

    if (userTeam.length === 0) {
      throw new Error('User is not associated with any team.');
    }

    // Update team subscription (SOLID: single responsibility)
    await db
      .update(teams)
      .set({
        stripeCustomerId: customerId,
        stripeSubscriptionId: subscriptionId,
        stripeProductId: productId,
        planName: planId, // Use normalized plan ID, not raw product name
        subscriptionStatus: subscription.status,
        updatedAt: new Date(),
      })
      .where(eq(teams.id, userTeam[0].teamId));

    // Verify update succeeded (SOLID: proper validation)
    const [updatedTeam] = await db
      .select()
      .from(teams)
      .where(eq(teams.id, userTeam[0].teamId))
      .limit(1);

    if (!updatedTeam || updatedTeam.planName !== planId) {
      console.error('Failed to update team subscription:', {
        teamId: userTeam[0].teamId,
        expectedPlan: planId,
        actualPlan: updatedTeam?.planName,
      });
      throw new Error('Team subscription update verification failed');
    }

    console.log('Team subscription updated successfully:', {
      teamId: userTeam[0].teamId,
      planName: planId,
      subscriptionStatus: subscription.status,
    });

    await setSession(user[0]);
    return NextResponse.redirect(new URL('/dashboard', request.url));
  } catch (error) {
    console.error('Error handling successful checkout:', error);
    // Log full error details for debugging (DRY: comprehensive error logging)
    if (error instanceof Error) {
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
      });
    }
    return NextResponse.redirect(new URL('/error', request.url));
  }
}
