import Stripe from 'stripe';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { Team } from '@/lib/db/schema';
import {
  getTeamByStripeCustomerId,
  getUser,
  updateTeamSubscription
} from '@/lib/db/queries';
import { IPaymentService } from '@/lib/types/service-contracts';
import type {
  StripePriceDTO,
  StripeProductDTO,
  CreateCheckoutSessionInput,
  UpdateTeamSubscriptionInput,
} from './types';

// REFACTOR: Extract constants for maintainability
const SUBSCRIPTION_STATUS = {
  ACTIVE: 'active',
  TRIALING: 'trialing',
  CANCELED: 'canceled',
  UNPAID: 'unpaid',
} as const;

const TRIAL_PERIOD_DAYS = 14;

/**
 * REFACTOR: Extract URL resolution helper
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

/**
 * REFACTOR: Extract redirect detection helper
 * DRY: Reusable redirect detection logic
 */
function isNextJsRedirect(error: unknown): boolean {
  return !!error && typeof error === 'object' && (
    'digest' in error || 
    (error instanceof Error && error.message === 'NEXT_REDIRECT')
  );
}

/**
 * REFACTOR: Extract price ID validation helper
 * DRY: Reusable validation logic
 */
function validatePriceId(priceId: string | null | undefined): void {
  if (!priceId || priceId.trim() === '') {
    throw new Error('Price ID is required to create checkout session');
  }
}

// Stripe client initialization
// API version '2025-04-30.basil' is the latest version defined in Stripe TypeScript types
// This ensures type safety and compatibility with latest Stripe features
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-04-30.basil'
});

/**
 * REFACTOR: Extract checkout session configuration builder
 * DRY: Reusable session configuration
 */
async function buildCheckoutSessionConfig(
  priceId: string,
  team: { id: number; stripeCustomerId: string | null },
  userId: number
): Promise<Stripe.Checkout.SessionCreateParams> {
  const baseUrl = await getBaseUrl();
  
  return {
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
    client_reference_id: userId.toString(),
    allow_promotion_codes: true,
    subscription_data: {
      trial_period_days: TRIAL_PERIOD_DAYS
    }
  };
}

export async function createCheckoutSession({
  team,
  priceId
}: CreateCheckoutSessionInput) {
  const user = await getUser();

  // REFACTOR: Use validation helper
  validatePriceId(priceId);

  if (!team || !user) {
    redirect(`/sign-up?redirect=checkout&priceId=${priceId}`);
  }

  try {
    const sessionConfig = await buildCheckoutSessionConfig(priceId, team as { id: number; stripeCustomerId: string | null }, user.id);
    const session = await stripe.checkout.sessions.create(sessionConfig);

    if (!session.url) {
      throw new Error('Stripe checkout session created but no URL returned');
    }

    redirect(session.url);
  } catch (error) {
    // REFACTOR: Use redirect detection helper
    if (isNextJsRedirect(error)) {
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

/**
 * REFACTOR: Extract billing portal configuration builder
 * DRY: Reusable configuration logic
 */
function buildBillingPortalConfiguration(
  productId: string,
  priceIds: string[]
): Stripe.BillingPortal.ConfigurationCreateParams {
  return {
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
            product: productId,
            prices: priceIds
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
  };
}

/**
 * REFACTOR: Extract billing portal configuration retrieval/creation
 * DRY: Reusable configuration logic
 */
async function getOrCreateBillingPortalConfiguration(
  team: Team
): Promise<Stripe.BillingPortal.Configuration> {
  const configurations = await stripe.billingPortal.configurations.list();

  if (configurations.data.length > 0) {
    return configurations.data[0];
  }

  // Create new configuration
  const product = await stripe.products.retrieve(team.stripeProductId!);
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

  const configParams = buildBillingPortalConfiguration(
    product.id,
    prices.data.map((price) => price.id)
  );
  
  return await stripe.billingPortal.configurations.create(configParams);
}

export async function createCustomerPortalSession(team: Team) {
  if (!team.stripeCustomerId || !team.stripeProductId) {
    redirect('/pricing');
  }

  const configuration = await getOrCreateBillingPortalConfiguration(team);
  const baseUrl = await getBaseUrl();
  
  const portalSession = await stripe.billingPortal.sessions.create({
    customer: team.stripeCustomerId,
    return_url: `${baseUrl}/dashboard`,
    configuration: configuration.id
  });
  
  if (!portalSession.url) {
    throw new Error('Stripe portal session created but no URL returned');
  }
  
  redirect(portalSession.url);
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

/**
 * REFACTOR: Extract subscription data extraction helper
 * DRY: Reusable product/plan extraction logic
 */
function extractSubscriptionData(subscription: Stripe.Subscription): {
  productId: string;
  productName: string | null;
  planId: 'free' | 'pro' | 'agency' | null;
} {
  const plan = subscription.items.data[0]?.plan;
  const product = plan?.product as Stripe.Product | string;
  const productName = typeof product === 'object' ? product.name : null;
  const productId = typeof product === 'object' ? product.id : (product as string);
  const planId = normalizeProductNameToPlanId(productName);
  
  return { productId, productName, planId };
}

/**
 * REFACTOR: Extract active subscription update logic
 * DRY: Reusable update logic
 */
async function updateActiveSubscription(
  team: Team,
  subscription: Stripe.Subscription,
  customerId: string
): Promise<void> {
  const { productId, planId } = extractSubscriptionData(subscription);
  
  const status = subscription.status;
  const validStatus = (status === 'active' || status === 'trialing' || status === 'canceled' || status === 'unpaid')
    ? status
    : null;
  
  const updateData: UpdateTeamSubscriptionInput = {
    stripeSubscriptionId: subscription.id,
    stripeProductId: productId,
    planName: planId,
    subscriptionStatus: validStatus
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
  }
}

/**
 * REFACTOR: Extract canceled subscription update logic
 * DRY: Reusable update logic
 */
async function updateCanceledSubscription(
  team: Team,
  status: Stripe.Subscription.Status
): Promise<void> {
  const validStatus = (status === 'active' || status === 'trialing' || status === 'canceled' || status === 'unpaid')
    ? status
    : null;
  
  const updateData: UpdateTeamSubscriptionInput = {
    stripeSubscriptionId: null,
    stripeProductId: null,
    planName: null,
    subscriptionStatus: validStatus
  };
  
  await updateTeamSubscription(team.id, updateData);
}

export async function handleSubscriptionChange(
  subscription: Stripe.Subscription
) {
  const customerId = subscription.customer as string;
  const status = subscription.status;

  const team = await getTeamByStripeCustomerId(customerId);

  if (!team) {
    console.error('Team not found for Stripe customer:', customerId);
    return;
  }

  try {
    if (status === SUBSCRIPTION_STATUS.ACTIVE || status === SUBSCRIPTION_STATUS.TRIALING) {
      await updateActiveSubscription(team, subscription, customerId);
    } else if (status === SUBSCRIPTION_STATUS.CANCELED || status === SUBSCRIPTION_STATUS.UNPAID) {
      await updateCanceledSubscription(team, status);
    }
  } catch (error) {
    console.error('Error updating team subscription:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      teamId: team.id,
      customerId,
      subscriptionStatus: status,
    });
    throw error; // Re-throw to allow webhook retry
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

/**
 * Stripe Payment Service
 * Implements IPaymentService contract
 */
export class StripeService implements IPaymentService {
  async createCheckoutSession(input: CreateCheckoutSessionInput): Promise<void> {
    return createCheckoutSession(input);
  }

  async createCustomerPortalSession(team: { stripeCustomerId: string | null; stripeProductId: string | null }): Promise<{ url: string }> {
    // redirect() throws, so this never returns, but interface requires return type
    return createCustomerPortalSession(team as Team) as never;
  }

  async handleSubscriptionChange(subscription: Stripe.Subscription): Promise<void> {
    return handleSubscriptionChange(subscription);
  }

  async getStripePrices(): Promise<StripePriceDTO[]> {
    return getStripePrices();
  }

  async getStripeProducts(): Promise<StripeProductDTO[]> {
    return getStripeProducts();
  }
}

export const stripeService = new StripeService();
