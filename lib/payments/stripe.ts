import Stripe from 'stripe';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { Team } from '@/lib/db/schema';
import {
  getTeamByStripeCustomerId,
  getUser,
  updateTeamSubscription
} from '@/lib/db/queries';
import type {
  StripePriceDTO,
  StripeProductDTO,
  CreateCheckoutSessionInput,
  UpdateTeamSubscriptionInput,
} from './types';

/**
 * Get the base URL from request headers or environment variable
 * SOLID: Single Responsibility - handles URL resolution
 * DRY: Centralized URL resolution logic
 */
async function getBaseUrl(): Promise<string> {
  // Try to get from request headers first (for server actions/API routes)
  try {
    const headersList = await headers();
    const host = headersList.get('host');
    const protocol = headersList.get('x-forwarded-proto') || 
                     (process.env.NODE_ENV === 'production' ? 'https' : 'http');
    
    if (host) {
      return `${protocol}://${host}`;
    }
  } catch (error) {
    // Headers not available in this context, fall back to env var
  }
  
  // Fallback to environment variable
  return process.env.BASE_URL || process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-04-30.basil'
});

export async function createCheckoutSession({
  team,
  priceId
}: CreateCheckoutSessionInput) {
  const user = await getUser();

  // Defensive: Validate priceId before making Stripe API call
  if (!priceId || priceId.trim() === '') {
    console.error('[createCheckoutSession] Invalid priceId', {
      priceId,
      teamId: team?.id,
      userId: user?.id,
    });
    throw new Error('Price ID is required to create checkout session');
  }

  if (!team || !user) {
    redirect(`/sign-up?redirect=checkout&priceId=${priceId}`);
  }

  try {
    // Get base URL dynamically from request (SOLID: use request context)
    const baseUrl = await getBaseUrl();
    
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1
        }
      ],
      mode: 'subscription',
      success_url: `${baseUrl}/api/stripe/checkout?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/pricing`,
      customer: team.stripeCustomerId || undefined,
      client_reference_id: user.id.toString(),
      allow_promotion_codes: true,
      subscription_data: {
        trial_period_days: 14
      }
    });

    if (!session.url) {
      throw new Error('Stripe checkout session created but no URL returned');
    }

    redirect(session.url);
  } catch (error) {
    // Next.js redirect() throws NEXT_REDIRECT error - this is expected behavior, not an error
    // Check if this is a redirect first (digest will be present for Next.js redirects)
    // Also check for the error message pattern
    const isRedirect = error && typeof error === 'object' && (
      'digest' in error || 
      (error instanceof Error && error.message === 'NEXT_REDIRECT')
    );
    
    if (isRedirect) {
      // This is a Next.js redirect, re-throw it as-is (don't log as error)
      throw error;
    }
    
    // Enhanced error logging for debugging (only for actual errors)
    console.error('[createCheckoutSession] Stripe API error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      priceId,
      teamId: team.id,
      userId: user.id,
      stripeError: error instanceof Error && 'type' in error ? {
        type: (error as any).type,
        code: (error as any).code,
        param: (error as any).param,
      } : null,
    });
    
    // Re-throw with user-friendly message
    if (error instanceof Error) {
      throw new Error(`Failed to create checkout session: ${error.message}`);
    }
    throw error;
  }
}

export async function createCustomerPortalSession(team: Team) {
  if (!team.stripeCustomerId || !team.stripeProductId) {
    redirect('/pricing');
  }

  let configuration: Stripe.BillingPortal.Configuration;
  const configurations = await stripe.billingPortal.configurations.list();

  if (configurations.data.length > 0) {
    configuration = configurations.data[0];
  } else {
    const product = await stripe.products.retrieve(team.stripeProductId);
    if (!product.active) {
      throw new Error("Team's product is not active in Stripe");
    }

    const prices = await stripe.prices.list({
      product: product.id,
      active: true
    });
    if (prices.data.length === 0) {
      throw new Error("No active prices found for the team's product");
    }

    configuration = await stripe.billingPortal.configurations.create({
      business_profile: {
        headline: 'Manage your subscription'
      },
      features: {
        subscription_update: {
          enabled: true,
          default_allowed_updates: ['price', 'quantity', 'promotion_code'],
          proration_behavior: 'create_prorations',
          products: [
            {
              product: product.id,
              prices: prices.data.map((price) => price.id)
            }
          ]
        },
        subscription_cancel: {
          enabled: true,
          mode: 'at_period_end',
          cancellation_reason: {
            enabled: true,
            options: [
              'too_expensive',
              'missing_features',
              'switched_service',
              'unused',
              'other'
            ]
          }
        },
        payment_method_update: {
          enabled: true
        }
      }
    });
  }

  const baseUrl = await getBaseUrl();
  return stripe.billingPortal.sessions.create({
    customer: team.stripeCustomerId,
    return_url: `${baseUrl}/dashboard`,
    configuration: configuration.id
  });
}

/**
 * Normalize Stripe product name to plan ID (DRY: centralized normalization)
 * SOLID: Single Responsibility - only handles name normalization
 * 
 * Stripe product names can be "Pro Plan", "Pro", "Agency Plan", etc.
 * But plan IDs must be lowercase: "pro", "agency", "free"
 */
function normalizeProductNameToPlanId(productName: string | null | undefined): 'free' | 'pro' | 'agency' | null {
  if (!productName) return null;
  
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
  const planIds: ('free' | 'pro' | 'agency')[] = ['free', 'pro', 'agency'];
  const matched = planIds.find(id => normalized.includes(id));
  return matched || null; // Return null if no match (type-safe)
}

export async function handleSubscriptionChange(
  subscription: Stripe.Subscription
) {
  const customerId = subscription.customer as string;
  const subscriptionId = subscription.id;
  const status = subscription.status;

  const team = await getTeamByStripeCustomerId(customerId);

  if (!team) {
    console.error('Team not found for Stripe customer:', customerId);
    return;
  }

  if (status === 'active' || status === 'trialing') {
    const plan = subscription.items.data[0]?.plan;
    const product = plan?.product as Stripe.Product | string;
    const productName = typeof product === 'object' ? product.name : null;
    
    // DRY: Normalize product name to plan ID
    const planId = normalizeProductNameToPlanId(productName);
    
    try {
      const updateData: UpdateTeamSubscriptionInput = {
        stripeSubscriptionId: subscriptionId,
        stripeProductId: typeof product === 'object' ? product.id : (product as string),
        planName: planId, // Use normalized plan ID, not raw product name
        subscriptionStatus: status
      };
      await updateTeamSubscription(team.id, updateData);
      
      // Verify update succeeded (SOLID: proper validation)
      const updatedTeam = await getTeamByStripeCustomerId(customerId);
      if (!updatedTeam || updatedTeam.planName !== planId) {
        console.error('Failed to verify team subscription update:', {
          teamId: team.id,
          customerId,
          expectedPlan: planId,
          actualPlan: updatedTeam?.planName,
        });
      } else {
        console.log('Team subscription updated successfully:', {
          teamId: team.id,
          customerId,
          planName: planId,
          subscriptionStatus: status,
        });
      }
    } catch (error) {
      console.error('Error updating team subscription:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        teamId: team.id,
        customerId,
        planId,
        subscriptionStatus: status,
      });
      throw error; // Re-throw to allow webhook retry
    }
  } else if (status === 'canceled' || status === 'unpaid') {
    try {
      const updateData: UpdateTeamSubscriptionInput = {
        stripeSubscriptionId: null,
        stripeProductId: null,
        planName: null,
        subscriptionStatus: status
      };
      await updateTeamSubscription(team.id, updateData);
      console.log('Team subscription cancelled:', {
        teamId: team.id,
        customerId,
        subscriptionStatus: status,
      });
    } catch (error) {
      console.error('Error cancelling team subscription:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        teamId: team.id,
        customerId,
        subscriptionStatus: status,
      });
      throw error; // Re-throw to allow webhook retry
    }
  }
}

export async function getStripePrices(): Promise<StripePriceDTO[]> {
  const prices = await stripe.prices.list({
    expand: ['data.product'],
    active: true,
    type: 'recurring'
  });

  return prices.data.map((price): StripePriceDTO => ({
    id: price.id,
    productId:
      typeof price.product === 'string' ? price.product : price.product.id,
    unitAmount: price.unit_amount,
    currency: price.currency,
    interval: price.recurring?.interval || null,
    trialPeriodDays: price.recurring?.trial_period_days || null
  }));
}

export async function getStripeProducts(): Promise<StripeProductDTO[]> {
  const products = await stripe.products.list({
    active: true,
    expand: ['data.default_price']
  });

  return products.data.map((product): StripeProductDTO => ({
    id: product.id,
    name: product.name,
    description: product.description,
    defaultPriceId:
      typeof product.default_price === 'string'
        ? product.default_price
        : product.default_price?.id || null
  }));
}
