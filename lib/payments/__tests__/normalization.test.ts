/**
 * Unit Tests: Product Name Normalization
 * Tests the normalization logic that converts Stripe product names to plan IDs
 * 
 * SOLID: Single Responsibility - tests normalization logic only
 * DRY: Tests are focused and reusable
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleSubscriptionChange } from '../stripe';
import * as queries from '@/lib/db/queries';
import Stripe from 'stripe';

// Mock database queries
vi.mock('@/lib/db/queries', () => ({
  getTeamByStripeCustomerId: vi.fn(),
  updateTeamSubscription: vi.fn(),
}));

// Mock Stripe
vi.mock('stripe', () => {
  const methods = {
    subscriptions: {
      retrieve: vi.fn(),
    },
  };
  return {
    default: function MockStripe() {
      return methods;
    },
  };
});

describe('Product Name Normalization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('handleSubscriptionChange - Product Name Normalization', () => {
    const createMockSubscription = (
      productName: string,
      status: string = 'active'
    ): Stripe.Subscription => ({
      id: 'sub_test123',
      customer: 'cus_test123',
      status: status as any,
      items: {
        data: [
          {
            plan: {
              id: 'price_test123',
              product: {
                id: 'prod_test123',
                name: productName,
              } as Stripe.Product,
            } as Stripe.Price,
          },
        ],
      },
    } as any);

    const createMockTeam = () => ({
      id: 1,
      name: 'Test Team',
      createdAt: new Date(),
      updatedAt: new Date(),
      stripeCustomerId: 'cus_test123',
      stripeSubscriptionId: null,
      stripeProductId: null,
      planName: null,
      subscriptionStatus: null,
    });

    it('normalizes "Pro Plan" to "pro"', async () => {
      const team = createMockTeam();
      const subscription = createMockSubscription('Pro Plan');

      vi.mocked(queries.getTeamByStripeCustomerId).mockResolvedValue(team as any);
      vi.mocked(queries.updateTeamSubscription).mockResolvedValue(undefined);

      await handleSubscriptionChange(subscription);

      expect(queries.updateTeamSubscription).toHaveBeenCalledWith(team.id, {
        stripeSubscriptionId: 'sub_test123',
        stripeProductId: 'prod_test123',
        planName: 'pro', // Normalized from "Pro Plan"
        subscriptionStatus: 'active',
      });
    });

    it('normalizes "Pro" to "pro"', async () => {
      const team = createMockTeam();
      const subscription = createMockSubscription('Pro');

      vi.mocked(queries.getTeamByStripeCustomerId).mockResolvedValue(team as any);
      vi.mocked(queries.updateTeamSubscription).mockResolvedValue(undefined);

      await handleSubscriptionChange(subscription);

      expect(queries.updateTeamSubscription).toHaveBeenCalledWith(
        team.id,
        expect.objectContaining({
          planName: 'pro', // Normalized from "Pro"
        })
      );
    });

    it('normalizes "Agency Plan" to "agency"', async () => {
      const team = createMockTeam();
      const subscription = createMockSubscription('Agency Plan');

      vi.mocked(queries.getTeamByStripeCustomerId).mockResolvedValue(team as any);
      vi.mocked(queries.updateTeamSubscription).mockResolvedValue(undefined);

      await handleSubscriptionChange(subscription);

      expect(queries.updateTeamSubscription).toHaveBeenCalledWith(
        team.id,
        expect.objectContaining({
          planName: 'agency', // Normalized from "Agency Plan"
        })
      );
    });

    it('normalizes "Agency" to "agency"', async () => {
      const team = createMockTeam();
      const subscription = createMockSubscription('Agency');

      vi.mocked(queries.getTeamByStripeCustomerId).mockResolvedValue(team as any);
      vi.mocked(queries.updateTeamSubscription).mockResolvedValue(undefined);

      await handleSubscriptionChange(subscription);

      expect(queries.updateTeamSubscription).toHaveBeenCalledWith(
        team.id,
        expect.objectContaining({
          planName: 'agency',
        })
      );
    });

    it('handles case variations (e.g., "PRO PLAN")', async () => {
      const team = createMockTeam();
      const subscription = createMockSubscription('PRO PLAN');

      vi.mocked(queries.getTeamByStripeCustomerId).mockResolvedValue(team as any);
      vi.mocked(queries.updateTeamSubscription).mockResolvedValue(undefined);

      await handleSubscriptionChange(subscription);

      expect(queries.updateTeamSubscription).toHaveBeenCalledWith(
        team.id,
        expect.objectContaining({
          planName: 'pro', // Normalized from "PRO PLAN"
        })
      );
    });

    it('handles "pro" that is part of "agency" correctly', async () => {
      const team = createMockTeam();
      const subscription = createMockSubscription('Agency Pro Plan');

      vi.mocked(queries.getTeamByStripeCustomerId).mockResolvedValue(team as any);
      vi.mocked(queries.updateTeamSubscription).mockResolvedValue(undefined);

      await handleSubscriptionChange(subscription);

      expect(queries.updateTeamSubscription).toHaveBeenCalledWith(
        team.id,
        expect.objectContaining({
          planName: 'agency', // Should match agency, not pro
        })
      );
    });

    it('handles null product name gracefully', async () => {
      const team = createMockTeam();
      const subscription = {
        ...createMockSubscription(''),
        items: {
          data: [
            {
              plan: {
                id: 'price_test123',
                product: {
                  id: 'prod_test123',
                  name: null,
                } as any,
              } as Stripe.Price,
            },
          ],
        },
      } as any;

      vi.mocked(queries.getTeamByStripeCustomerId).mockResolvedValue(team as any);
      vi.mocked(queries.updateTeamSubscription).mockResolvedValue(undefined);

      await handleSubscriptionChange(subscription);

      expect(queries.updateTeamSubscription).toHaveBeenCalledWith(
        team.id,
        expect.objectContaining({
          planName: null, // Handles null gracefully
        })
      );
    });

    it('handles product as string (not expanded)', async () => {
      const team = createMockTeam();
      const subscription = {
        ...createMockSubscription('Pro'),
        items: {
          data: [
            {
              plan: {
                id: 'price_test123',
                product: 'prod_test123', // Product as string, not object
              } as Stripe.Price,
            },
          ],
        },
      } as any;

      vi.mocked(queries.getTeamByStripeCustomerId).mockResolvedValue(team as any);
      vi.mocked(queries.updateTeamSubscription).mockResolvedValue(undefined);

      await handleSubscriptionChange(subscription);

      // When product is a string, we can't normalize the name
      expect(queries.updateTeamSubscription).toHaveBeenCalledWith(
        team.id,
        expect.objectContaining({
          stripeProductId: 'prod_test123',
          planName: null, // Can't normalize without product name
        })
      );
    });

    it('handles subscription cancellation (removes subscription data)', async () => {
      const team = createMockTeam();
      const subscription = createMockSubscription('Pro Plan', 'canceled');

      vi.mocked(queries.getTeamByStripeCustomerId).mockResolvedValue(team as any);
      vi.mocked(queries.updateTeamSubscription).mockResolvedValue(undefined);

      await handleSubscriptionChange(subscription);

      expect(queries.updateTeamSubscription).toHaveBeenCalledWith(team.id, {
        stripeSubscriptionId: null,
        stripeProductId: null,
        planName: null, // Removed on cancellation
        subscriptionStatus: 'canceled',
      });
    });
  });
});

