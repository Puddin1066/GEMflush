import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST as webhookPOST } from '@/app/api/stripe/webhook/route';
import { GET as checkoutGET } from '@/app/api/stripe/checkout/route';
import { NextRequest } from 'next/server';
import Stripe from 'stripe';

// Set environment variables before imports
process.env.STRIPE_SECRET_KEY = 'sk_test_mock';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_mock';
process.env.BASE_URL = 'http://localhost:3000';

// Mock Stripe
vi.mock('stripe', () => {
  const methods = {
    checkout: {
      sessions: {
        create: () => Promise.resolve({}),
        retrieve: () => Promise.resolve({}),
      },
    },
    subscriptions: {
      retrieve: () => Promise.resolve({}),
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
  getTeamByStripeCustomerId: vi.fn(),
  updateTeamSubscription: vi.fn(),
  getUser: vi.fn(),
}));

// Mock database
vi.mock('@/lib/db/drizzle', () => ({
  db: {
    select: vi.fn(),
    update: vi.fn(),
  },
}));

// Mock auth session
vi.mock('@/lib/auth/session', () => ({
  setSession: vi.fn(),
}));

// Mock handleSubscriptionChange
vi.mock('@/lib/payments/stripe', async () => {
  const actual = await vi.importActual('@/lib/payments/stripe');
  return {
    ...actual,
    handleSubscriptionChange: vi.fn(),
  };
});

describe('Stripe E2E Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Payment Flow', () => {
    it('should handle webhook subscription update', async () => {
      const { stripe, handleSubscriptionChange } = await import('@/lib/payments/stripe');
      const { getTeamByStripeCustomerId, updateTeamSubscription } = await import('@/lib/db/queries');

      const mockSubscription = {
        id: 'sub_e2e_test_123',
        customer: 'cus_e2e_test_123',
        status: 'active',
        items: {
          data: [
            {
              plan: {
                product: {
                  id: 'prod_test_123',
                  name: 'Pro',
                },
              },
            },
          ],
        },
      } as unknown as Stripe.Subscription;

      const mockEvent = {
        id: 'evt_test123',
        type: 'customer.subscription.updated',
        data: {
          object: mockSubscription,
        },
      } as Stripe.Event;

      const mockTeam = {
        id: 1,
        name: 'Test Team',
        createdAt: new Date(),
        updatedAt: new Date(),
        stripeCustomerId: 'cus_e2e_test_123',
        stripeSubscriptionId: null,
        stripeProductId: null,
        planName: null,
        subscriptionStatus: null,
      };

      vi.spyOn(stripe.webhooks, 'constructEvent').mockReturnValue(mockEvent);
      vi.mocked(getTeamByStripeCustomerId).mockResolvedValue(mockTeam);
      vi.mocked(updateTeamSubscription).mockResolvedValue(undefined);

      const request = new NextRequest('http://localhost:3000/api/stripe/webhook', {
        method: 'POST',
        body: JSON.stringify(mockEvent),
        headers: {
          'stripe-signature': 'test_signature',
        },
      });

      const response = await webhookPOST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({ received: true });
      expect(handleSubscriptionChange).toHaveBeenCalled();
    });

    it('should handle checkout success', async () => {
      const { stripe } = await import('@/lib/payments/stripe');
      const { db } = await import('@/lib/db/drizzle');
      const { setSession } = await import('@/lib/auth/session');

      const mockCustomer = {
        id: 'cus_test123',
        email: 'test@example.com',
      } as Stripe.Customer;

      const mockProduct = {
        id: 'prod_test123',
        name: 'Pro',
      } as Stripe.Product;

      const mockSubscription = {
        id: 'sub_test123',
        status: 'active',
        items: {
          data: [
            {
              price: {
                id: 'price_test123',
                product: mockProduct,
              },
            },
          ],
        },
      } as unknown as Stripe.Subscription;

      const mockSession = {
        id: 'cs_test123',
        customer: mockCustomer,
        subscription: mockSubscription,
        client_reference_id: '1',
      } as Stripe.Checkout.Session;

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

      vi.spyOn(stripe.checkout.sessions, 'retrieve').mockResolvedValue(mockSession as any);
      vi.spyOn(stripe.subscriptions, 'retrieve').mockResolvedValue(mockSubscription as any);

      const mockSelect = vi.fn()
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([mockUser]),
            }),
          }),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([{ teamId: 1 }]),
            }),
          }),
        });

      vi.mocked(db.select).mockReturnValue(mockSelect() as any);

      const mockUpdate = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      });

      vi.mocked(db.update).mockReturnValue(mockUpdate() as any);
      vi.mocked(setSession).mockResolvedValue(undefined);

      const request = new NextRequest(
        'http://localhost:3000/api/stripe/checkout?session_id=cs_test123',
        {
          method: 'GET',
        }
      );

      const response = await checkoutGET(request);

      expect(response.status).toBe(307);
      expect(response.headers.get('location')).toContain('/dashboard');
    });
  });
});
