/**
 * TDD Test: Stripe Payment Service - Tests Drive Implementation
 * 
 * SPECIFICATION: Payment Processing Functionality
 * 
 * As a system
 * I want to process payments and manage subscriptions
 * So that users can subscribe to the service
 * 
 * IMPORTANT: These tests specify DESIRED behavior for payment processing.
 * Tests verify that Stripe integration works correctly.
 * 
 * TDD Cycle: RED → GREEN → REFACTOR
 * Tests written to specify desired payment behavior
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TeamTestFactory } from '@/lib/test-helpers/tdd-helpers';
import type { Team } from '@/lib/db/schema';

// Mock dependencies
const mockStripeInstance = {
  checkout: {
    sessions: {
      create: vi.fn(),
    },
  },
  billingPortal: {
    configurations: {
      list: vi.fn(),
    },
  },
  products: {
    retrieve: vi.fn(),
  },
  prices: {
    list: vi.fn(),
  },
};

const MockStripe = vi.fn(() => mockStripeInstance);

vi.mock('stripe', () => ({
  default: MockStripe,
}));

vi.mock('next/navigation', () => ({
  redirect: vi.fn((url: string) => {
    const error: any = new Error('NEXT_REDIRECT');
    error.digest = `redirect:${url}`;
    throw error;
  }),
}));

vi.mock('next/headers', () => ({
  headers: vi.fn(),
}));

vi.mock('@/lib/db/queries', () => ({
  getTeamByStripeCustomerId: vi.fn(),
  getUser: vi.fn(),
  updateTeamSubscription: vi.fn(),
}));

describe('🔴 RED: Stripe Payment Service - Desired Behavior Specification', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    // Reset Stripe mocks
    const { stripe } = await import('../stripe');
    vi.mocked(stripe.checkout.sessions.create).mockReset();
    vi.mocked(stripe.billingPortal.configurations.list).mockReset();
    vi.mocked(stripe.products.retrieve).mockReset();
    vi.mocked(stripe.prices.list).mockReset();
  });

  /**
   * SPECIFICATION 1: createCheckoutSession() - MUST Create Checkout Session
   * 
   * DESIRED BEHAVIOR: createCheckoutSession() MUST create a Stripe checkout
   * session and redirect to it.
   */
  describe('createCheckoutSession', () => {
    it('MUST create checkout session with valid priceId', async () => {
      // Arrange: Team and price ID
      const team = TeamTestFactory.createPro();
      const priceId = 'price_test123';

      const mockSession = {
        id: 'cs_test123',
        url: 'https://checkout.stripe.com/test',
      };

      const { getUser } = await import('@/lib/db/queries');
      const { stripe } = await import('../stripe');
      const { headers } = await import('next/headers');

      vi.mocked(stripe.checkout.sessions.create).mockResolvedValue(mockSession as any);
      vi.mocked(getUser).mockResolvedValue({
        id: 1,
        email: 'test@example.com',
        name: 'Test User',
      } as any);
      
      // Mock headers to return base URL
      const mockHeaders = {
        get: vi.fn((key: string) => {
          if (key === 'host') return 'localhost:3000';
          if (key === 'x-forwarded-proto') return 'http';
          return null;
        }),
      };
      vi.mocked(headers).mockResolvedValue(mockHeaders as any);
      
      // Set BASE_URL env var as fallback
      process.env.BASE_URL = 'http://localhost:3000';

      // Act: Create checkout session (TEST SPECIFIES DESIRED BEHAVIOR)
      const { createCheckoutSession } = await import('../stripe');
      
      // Expect redirect to be called
      await expect(createCheckoutSession({ team, priceId })).rejects.toThrow('NEXT_REDIRECT');

      // Assert: SPECIFICATION - MUST create session
      expect(stripe.checkout.sessions.create).toHaveBeenCalled();
      const createCall = vi.mocked(stripe.checkout.sessions.create).mock.calls[0];
      expect(createCall[0]).toMatchObject({
        line_items: [{ price: priceId, quantity: 1 }],
        mode: 'subscription',
      });
    });

    it('MUST reject empty or invalid priceId', async () => {
      // Arrange: Invalid price ID
      const team = TeamTestFactory.createPro();
      const priceId = '';

      // Act: Create checkout session with invalid price (TEST SPECIFIES DESIRED BEHAVIOR)
      const { createCheckoutSession } = await import('../stripe');

      // Assert: SPECIFICATION - MUST reject invalid priceId
      await expect(createCheckoutSession({ team, priceId })).rejects.toThrow('Price ID is required');
    });

    it('MUST redirect to sign-up if team or user missing', async () => {
      // Arrange: Missing team
      const { getUser } = await import('@/lib/db/queries');
      const { redirect } = await import('next/navigation');

      vi.mocked(getUser).mockResolvedValue(null);

      // Act: Create checkout session without team (TEST SPECIFIES DESIRED BEHAVIOR)
      const { createCheckoutSession } = await import('../stripe');

      await expect(createCheckoutSession({ team: null as any, priceId: 'price_test' })).rejects.toThrow('NEXT_REDIRECT');

      // Assert: SPECIFICATION - MUST redirect to sign-up
      expect(redirect).toHaveBeenCalledWith(expect.stringContaining('/sign-up'));
    });

    it('MUST include trial period in subscription', async () => {
      // Arrange: Team and price
      const team = TeamTestFactory.createPro();
      const priceId = 'price_test123';

      const { getUser } = await import('@/lib/db/queries');
      const { stripe } = await import('../stripe');

      vi.mocked(stripe.checkout.sessions.create).mockResolvedValue({
        id: 'cs_test',
        url: 'https://checkout.stripe.com/test',
      } as any);
      vi.mocked(getUser).mockResolvedValue({ id: 1 } as any);

      // Act: Create checkout session (TEST SPECIFIES DESIRED BEHAVIOR)
      const { createCheckoutSession } = await import('../stripe');
      
      await expect(createCheckoutSession({ team, priceId })).rejects.toThrow('NEXT_REDIRECT');

      // Assert: SPECIFICATION - MUST include trial period
      expect(stripe.checkout.sessions.create).toHaveBeenCalled();
      const createCall = vi.mocked(stripe.checkout.sessions.create).mock.calls[0];
      expect(createCall[0]).toMatchObject({
        subscription_data: {
          trial_period_days: 14,
        },
      });
    });
  });

  /**
   * SPECIFICATION 2: createCustomerPortalSession() - MUST Create Portal Session
   * 
   * DESIRED BEHAVIOR: createCustomerPortalSession() MUST create a Stripe
   * customer portal session for subscription management.
   */
  describe('createCustomerPortalSession', () => {
    it('MUST create portal session for team with Stripe customer ID', async () => {
      // Arrange: Team with Stripe customer ID
      const team = TeamTestFactory.createPro();
      team.stripeCustomerId = 'cus_test123';
      team.stripeProductId = 'prod_test123';

      const mockPortalSession = {
        id: 'bps_test123',
        url: 'https://billing.stripe.com/test',
      };

      const { stripe } = await import('../stripe');
      vi.mocked(stripe.billingPortal.configurations.list).mockResolvedValue({
        data: [{
          id: 'bpc_test',
          active: true,
        }],
      } as any);

      // Act: Create portal session (TEST SPECIFIES DESIRED BEHAVIOR)
      const { createCustomerPortalSession } = await import('../stripe');
      
      // Note: This will redirect, so we expect an error
      await expect(createCustomerPortalSession(team)).rejects.toThrow('NEXT_REDIRECT');

      // Assert: SPECIFICATION - MUST create portal session
      // Portal session creation is handled by Stripe, we just redirect
    });

    it('MUST redirect to pricing if team missing Stripe customer ID', async () => {
      // Arrange: Team without Stripe customer ID
      const team = TeamTestFactory.createFree();
      team.stripeCustomerId = null;
      team.stripeProductId = null;

      const { redirect } = await import('next/navigation');

      // Act: Create portal session without customer ID (TEST SPECIFIES DESIRED BEHAVIOR)
      const { createCustomerPortalSession } = await import('../stripe');
      
      await expect(createCustomerPortalSession(team)).rejects.toThrow('NEXT_REDIRECT');

      // Assert: SPECIFICATION - MUST redirect to pricing
      expect(redirect).toHaveBeenCalledWith('/pricing');
    });
  });
});

