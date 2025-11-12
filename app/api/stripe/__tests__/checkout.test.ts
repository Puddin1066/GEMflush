import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '../checkout/route';
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

describe('Stripe Checkout API Route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/stripe/checkout', () => {
    it('should redirect to pricing if no session_id', async () => {
      const request = new NextRequest('http://localhost:3000/api/stripe/checkout', {
        method: 'GET',
      });

      const response = await GET(request);

      expect(response.status).toBe(307);
      expect(response.headers.get('location')).toContain('/pricing');
    });

    it('should process successful checkout and update team', async () => {
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

      const mockTeam = {
        teamId: 1,
      };

      // Mock Stripe API calls
      vi.spyOn(stripe.checkout.sessions, 'retrieve').mockResolvedValue(mockSession);
      vi.spyOn(stripe.subscriptions, 'retrieve').mockResolvedValue(mockSubscription);

      // Mock database queries - users
      const mockUserSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockUser]),
          }),
        }),
      });

      // Mock database queries - team members
      const mockTeamSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockTeam]),
          }),
        }),
      });

      vi.mocked(db.select)
        .mockReturnValueOnce(mockUserSelect() as any)
        .mockReturnValueOnce(mockTeamSelect() as any);

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

      const response = await GET(request);

      expect(stripe.checkout.sessions.retrieve).toHaveBeenCalledWith('cs_test123', {
        expand: ['customer', 'subscription'],
      });

      expect(response.status).toBe(307);
      expect(response.headers.get('location')).toContain('/dashboard');
    });

    it('should redirect to error if customer is string', async () => {
      const { stripe } = await import('@/lib/payments/stripe');
      const mockSession = {
        id: 'cs_test123',
        customer: 'cus_test123',
        subscription: null,
      } as unknown as Stripe.Checkout.Session;

      vi.spyOn(stripe.checkout.sessions, 'retrieve').mockResolvedValue(mockSession);

      const request = new NextRequest(
        'http://localhost:3000/api/stripe/checkout?session_id=cs_test123',
        {
          method: 'GET',
        }
      );

      const response = await GET(request);

      expect(response.status).toBe(307);
      expect(response.headers.get('location')).toContain('/error');
    });
  });
});
