// Set environment variable before any imports
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_secret';

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import Stripe from 'stripe';

// Mock Stripe - same pattern as unit tests
vi.mock('stripe', () => {
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

// Mock handleSubscriptionChange
vi.mock('@/lib/payments/stripe', async () => {
  const actual = await vi.importActual('@/lib/payments/stripe');
  return {
    ...actual,
    handleSubscriptionChange: vi.fn(),
  };
});

// Import route after mocks
import { POST } from '../webhook/route';

describe('Stripe Webhook API Route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_secret';
  });

  describe('POST /api/stripe/webhook', () => {
    describe('checkout.session.completed event', () => {
      it('should handle checkout.session.completed and normalize product name', async () => {
        const { stripe } = await import('@/lib/payments/stripe');
        const { handleSubscriptionChange } = await import('@/lib/payments/stripe');

        const mockSession = {
          id: 'cs_test123',
          mode: 'subscription',
          subscription: 'sub_test123',
        } as Stripe.Checkout.Session;

        const mockSubscription = {
          id: 'sub_test123',
          customer: 'cus_test123',
          status: 'active',
          items: {
            data: [
              {
                plan: {
                  id: 'price_test123',
                  product: {
                    id: 'prod_test123',
                    name: 'Pro Plan', // Test normalization
                  } as Stripe.Product,
                } as Stripe.Price,
              },
            ],
          },
        } as Stripe.Subscription;

        const mockEvent = {
          type: 'checkout.session.completed',
          data: {
            object: mockSession,
          },
        } as Stripe.Event;

        vi.spyOn(stripe.webhooks, 'constructEvent').mockReturnValue(mockEvent);
        vi.spyOn(stripe.subscriptions, 'retrieve').mockResolvedValue(mockSubscription);
        vi.mocked(handleSubscriptionChange).mockResolvedValue(undefined);

        const request = new NextRequest('http://localhost:3000/api/stripe/webhook', {
          method: 'POST',
          headers: {
            'stripe-signature': 'test_signature',
          },
          body: JSON.stringify(mockSession),
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.received).toBe(true);
        expect(stripe.subscriptions.retrieve).toHaveBeenCalledWith('sub_test123', {
          expand: ['items.data.price.product'],
        });
        expect(handleSubscriptionChange).toHaveBeenCalledWith(mockSubscription);
      });
    });
    it('should handle subscription.updated event', async () => {
      const { stripe, handleSubscriptionChange } = await import('@/lib/payments/stripe');
      
      const mockSubscription = {
        id: 'sub_test123',
        customer: 'cus_test123',
        status: 'active',
        items: {
          data: [
            {
              plan: {
                product: {
                  id: 'prod_test123',
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

      vi.spyOn(stripe.webhooks, 'constructEvent').mockReturnValue(mockEvent);
      vi.mocked(handleSubscriptionChange).mockResolvedValue(undefined);

      const request = new NextRequest('http://localhost:3000/api/stripe/webhook', {
        method: 'POST',
        body: JSON.stringify(mockEvent),
        headers: {
          'stripe-signature': 'test_signature',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      // The webhook secret is read from process.env at module load time
      expect(stripe.webhooks.constructEvent).toHaveBeenCalled();

      expect(handleSubscriptionChange).toHaveBeenCalledWith(mockSubscription);
      expect(data).toEqual({ received: true });
      expect(response.status).toBe(200);
    });

    it('should handle subscription.deleted event', async () => {
      const { stripe, handleSubscriptionChange } = await import('@/lib/payments/stripe');
      
      const mockSubscription = {
        id: 'sub_test123',
        customer: 'cus_test123',
        status: 'canceled',
        items: {
          data: [],
        },
      } as unknown as Stripe.Subscription;

      const mockEvent = {
        id: 'evt_test123',
        type: 'customer.subscription.deleted',
        data: {
          object: mockSubscription,
        },
      } as Stripe.Event;

      vi.spyOn(stripe.webhooks, 'constructEvent').mockReturnValue(mockEvent);
      vi.mocked(handleSubscriptionChange).mockResolvedValue(undefined);

      const request = new NextRequest('http://localhost:3000/api/stripe/webhook', {
        method: 'POST',
        body: JSON.stringify(mockEvent),
        headers: {
          'stripe-signature': 'test_signature',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(handleSubscriptionChange).toHaveBeenCalledWith(mockSubscription);
      expect(data).toEqual({ received: true });
    });

    it('should return 400 if webhook signature verification fails', async () => {
      const { stripe } = await import('@/lib/payments/stripe');
      const mockError = new Error('Invalid signature');
      vi.spyOn(stripe.webhooks, 'constructEvent').mockImplementation(() => {
        throw mockError;
      });

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const request = new NextRequest('http://localhost:3000/api/stripe/webhook', {
        method: 'POST',
        body: JSON.stringify({}),
        headers: {
          'stripe-signature': 'invalid_signature',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({ error: 'Webhook signature verification failed.' });
      expect(consoleSpy).toHaveBeenCalledWith('Webhook signature verification failed.', mockError);

      consoleSpy.mockRestore();
    });

    it('should handle unhandled event types gracefully', async () => {
      const { stripe } = await import('@/lib/payments/stripe');
      const mockEvent = {
        id: 'evt_test123',
        type: 'payment_intent.succeeded',
        data: {
          object: {},
        },
      } as Stripe.Event;

      vi.spyOn(stripe.webhooks, 'constructEvent').mockReturnValue(mockEvent);

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const request = new NextRequest('http://localhost:3000/api/stripe/webhook', {
        method: 'POST',
        body: JSON.stringify(mockEvent),
        headers: {
          'stripe-signature': 'test_signature',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(consoleSpy).toHaveBeenCalledWith('Unhandled event type payment_intent.succeeded');
      expect(data).toEqual({ received: true });

      consoleSpy.mockRestore();
    });
  });
});
