import { describe, it, expect, vi, beforeEach } from 'vitest';
import Stripe from 'stripe';
import * as queries from '@/lib/db/queries';
import { redirect } from 'next/navigation';

// Mock Stripe - return a factory function that creates the same instance
vi.mock('stripe', () => {
  // Create methods object that will be shared
  const methods = {
    checkout: {
      sessions: {
        create: () => Promise.resolve({}),
        retrieve: () => Promise.resolve({}),
      },
    },
    billingPortal: {
      configurations: {
        list: () => Promise.resolve({ data: [] }),
        create: () => Promise.resolve({}),
      },
      sessions: {
        create: () => Promise.resolve({ url: '' }),
      },
    },
    products: {
      list: () => Promise.resolve({ data: [] }),
      retrieve: () => Promise.resolve({}),
    },
    prices: {
      list: () => Promise.resolve({ data: [] }),
    },
    webhooks: {
      constructEvent: () => ({}),
    },
  };
  
  return {
    default: function MockStripe() {
      return methods;
    },
  };
});

// Mock database queries
vi.mock('@/lib/db/queries', () => ({
  getUser: vi.fn(),
  getTeamByStripeCustomerId: vi.fn(),
  updateTeamSubscription: vi.fn(),
}));

// Mock next/navigation - redirect throws in Next.js
vi.mock('next/navigation', () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
}));

// Mock environment variables
process.env.STRIPE_SECRET_KEY = 'sk_test_mock_key';
process.env.BASE_URL = 'http://localhost:3000';

// Import after mocks
import {
  createCheckoutSession,
  createCustomerPortalSession,
  handleSubscriptionChange,
  getStripePrices,
  getStripeProducts,
  stripe,
} from '../stripe';

describe('Stripe Payment Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Spy on the stripe methods after import
      vi.spyOn(stripe.checkout.sessions, 'create').mockResolvedValue({
        id: 'cs_test',
        url: 'https://checkout.stripe.com/test',
      } as any);
      vi.spyOn(stripe.checkout.sessions, 'retrieve').mockResolvedValue({} as any);
      vi.spyOn(stripe.billingPortal.configurations, 'list').mockResolvedValue({
        data: [],
        has_more: false,
        url: '',
      } as any);
      vi.spyOn(stripe.billingPortal.configurations, 'create').mockResolvedValue({} as any);
      vi.spyOn(stripe.billingPortal.sessions, 'create').mockResolvedValue({
        url: 'https://billing.stripe.com/test',
      } as any);
      vi.spyOn(stripe.products, 'list').mockResolvedValue({
        data: [],
        has_more: false,
        url: '',
      } as any);
      vi.spyOn(stripe.products, 'retrieve').mockResolvedValue({} as any);
      vi.spyOn(stripe.prices, 'list').mockResolvedValue({
        data: [],
        has_more: false,
        url: '',
      } as any);
      vi.spyOn(stripe.webhooks, 'constructEvent').mockReturnValue({} as Stripe.Event);
  });

  describe('createCheckoutSession', () => {
    const mockUser = {
      id: 1,
      email: 'test@example.com',
      passwordHash: 'hash',
      role: 'owner' as const,
      name: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    };

    const mockTeam = {
      id: 1,
      name: 'Test Team',
      createdAt: new Date(),
      updatedAt: new Date(),
      stripeCustomerId: 'cus_test123',
      stripeSubscriptionId: null,
      stripeProductId: null,
      planName: null,
      subscriptionStatus: null,
    };

    it('should create checkout session with team and user', async () => {
      vi.mocked(queries.getUser).mockResolvedValue(mockUser);
      vi.mocked(stripe.checkout.sessions.create).mockResolvedValue({
        id: 'cs_test_123',
        url: 'https://checkout.stripe.com/test',
      } as any);

      await expect(
        createCheckoutSession({
          team: mockTeam,
          priceId: 'price_test_123',
        })
      ).rejects.toThrow('NEXT_REDIRECT');

      expect(stripe.checkout.sessions.create).toHaveBeenCalledWith({
        payment_method_types: ['card'],
        line_items: [
          {
            price: 'price_test_123',
            quantity: 1,
          },
        ],
        mode: 'subscription',
        success_url: 'http://localhost:3000/api/stripe/checkout?session_id={CHECKOUT_SESSION_ID}',
        cancel_url: 'http://localhost:3000/pricing',
        customer: 'cus_test123',
        client_reference_id: '1',
        allow_promotion_codes: true,
        subscription_data: {
          trial_period_days: 14,
        },
      });

      expect(redirect).toHaveBeenCalledWith('https://checkout.stripe.com/test');
    });

    it('should throw error if priceId is empty', async () => {
      vi.mocked(queries.getUser).mockResolvedValue(mockUser);

      await expect(
        createCheckoutSession({
          team: mockTeam,
          priceId: '',
        })
      ).rejects.toThrow('Price ID is required');

      await expect(
        createCheckoutSession({
          team: mockTeam,
          priceId: '   ',
        })
      ).rejects.toThrow('Price ID is required');
    });

    it('should throw error if priceId is missing', async () => {
      vi.mocked(queries.getUser).mockResolvedValue(mockUser);

      await expect(
        createCheckoutSession({
          team: mockTeam,
          priceId: undefined as any,
        })
      ).rejects.toThrow('Price ID is required');
    });

    it('should handle Stripe API errors gracefully', async () => {
      vi.mocked(queries.getUser).mockResolvedValue(mockUser);
      
      const stripeError = new Error('You passed an empty string for line_items[0][price]');
      (stripeError as any).type = 'StripeInvalidRequestError';
      (stripeError as any).code = 'parameter_invalid_empty';
      (stripeError as any).param = 'line_items[0][price]';
      
      vi.mocked(stripe.checkout.sessions.create).mockRejectedValue(stripeError);

      await expect(
        createCheckoutSession({
          team: mockTeam,
          priceId: 'price_test_123',
        })
      ).rejects.toThrow('Failed to create checkout session');

      expect(stripe.checkout.sessions.create).toHaveBeenCalled();
    });

    it('should redirect to sign-up if no team', async () => {
      vi.mocked(queries.getUser).mockResolvedValue(mockUser);

      await expect(
        createCheckoutSession({
          team: null,
          priceId: 'price_test_123',
        })
      ).rejects.toThrow('NEXT_REDIRECT');

      expect(redirect).toHaveBeenCalledWith('/sign-up?redirect=checkout&priceId=price_test_123');
      expect(stripe.checkout.sessions.create).not.toHaveBeenCalled();
    });

    it('should redirect to sign-up if no user', async () => {
      vi.mocked(queries.getUser).mockResolvedValue(null);

      await expect(
        createCheckoutSession({
          team: mockTeam,
          priceId: 'price_test_123',
        })
      ).rejects.toThrow('NEXT_REDIRECT');

      expect(redirect).toHaveBeenCalledWith('/sign-up?redirect=checkout&priceId=price_test_123');
      expect(stripe.checkout.sessions.create).not.toHaveBeenCalled();
    });
  });

  describe('handleSubscriptionChange', () => {
    const mockTeam = {
      id: 1,
      name: 'Test Team',
      createdAt: new Date(),
      updatedAt: new Date(),
      stripeCustomerId: 'cus_test123',
      stripeSubscriptionId: null,
      stripeProductId: null,
      planName: null,
      subscriptionStatus: null,
    };

    it('should update subscription for active status', async () => {
      const mockProduct = {
        id: 'prod_test123',
        name: 'Pro',
      } as Stripe.Product;

      const mockSubscription = {
        id: 'sub_test123',
        customer: 'cus_test123',
        status: 'active',
        items: {
          data: [
            {
              plan: {
                product: mockProduct,
              },
            },
          ],
        },
      } as unknown as Stripe.Subscription;

      vi.mocked(queries.getTeamByStripeCustomerId).mockResolvedValue(mockTeam);
      vi.mocked(queries.updateTeamSubscription).mockResolvedValue(undefined);

      await handleSubscriptionChange(mockSubscription);

      expect(queries.getTeamByStripeCustomerId).toHaveBeenCalledWith('cus_test123');
      expect(queries.updateTeamSubscription).toHaveBeenCalledWith(1, {
        stripeSubscriptionId: 'sub_test123',
        stripeProductId: mockProduct.id, // Fixed: should be product ID string
        planName: 'pro', // Normalized from "Pro" to "pro"
        subscriptionStatus: 'active',
      });
    });

    it('should clear subscription for canceled status', async () => {
      const mockSubscription = {
        id: 'sub_test123',
        customer: 'cus_test123',
        status: 'canceled',
        items: {
          data: [],
        },
      } as unknown as Stripe.Subscription;

      vi.mocked(queries.getTeamByStripeCustomerId).mockResolvedValue(mockTeam);
      vi.mocked(queries.updateTeamSubscription).mockResolvedValue(undefined);

      await handleSubscriptionChange(mockSubscription);

      expect(queries.updateTeamSubscription).toHaveBeenCalledWith(1, {
        stripeSubscriptionId: null,
        stripeProductId: null,
        planName: null,
        subscriptionStatus: 'canceled',
      });
    });
  });

  describe('getStripePrices', () => {
    it('should return formatted prices', async () => {
      const mockPrice = {
        id: 'price_test123',
        product: {
          id: 'prod_test123',
          name: 'Pro',
        },
        unit_amount: 4900,
        currency: 'usd',
        recurring: {
          interval: 'month',
          trial_period_days: 14,
        },
      } as unknown as Stripe.Price;

      vi.mocked(stripe.prices.list).mockResolvedValue({
        data: [mockPrice],
        has_more: false,
        url: '',
      } as any);

      const result = await getStripePrices();

      expect(stripe.prices.list).toHaveBeenCalledWith({
        expand: ['data.product'],
        active: true,
        type: 'recurring',
      });

      expect(result).toEqual([
        {
          id: 'price_test123',
          productId: 'prod_test123',
          unitAmount: 4900,
          currency: 'usd',
          interval: 'month',
          trialPeriodDays: 14,
        },
      ]);
    });
  });

  describe('getStripeProducts', () => {
    it('should return formatted products', async () => {
      const mockProduct = {
        id: 'prod_test123',
        name: 'Pro',
        description: 'Pro plan',
        default_price: {
          id: 'price_test123',
        },
      } as unknown as Stripe.Product;

      vi.mocked(stripe.products.list).mockResolvedValue({
        data: [mockProduct],
        has_more: false,
        url: '',
      } as any);

      const result = await getStripeProducts();

      expect(stripe.products.list).toHaveBeenCalledWith({
        active: true,
        expand: ['data.default_price'],
      });

      expect(result).toEqual([
        {
          id: 'prod_test123',
          name: 'Pro',
          description: 'Pro plan',
          defaultPriceId: 'price_test123',
        },
      ]);
    });
  });
});
