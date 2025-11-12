import { describe, it, expect, vi, beforeEach } from 'vitest';
import { checkoutAction, customerPortalAction } from '../actions';
import { createCheckoutSession, createCustomerPortalSession } from '../stripe';
import { redirect } from 'next/navigation';

// Mock dependencies
vi.mock('../stripe', () => ({
  createCheckoutSession: vi.fn(),
  createCustomerPortalSession: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`Redirect to ${url}`);
  }),
}));

vi.mock('@/lib/auth/middleware', () => ({
  withTeam: vi.fn((action) => action),
}));

describe('Payment Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('checkoutAction', () => {
    it('should create checkout session with team and priceId', async () => {
      const mockTeam = { id: 1, name: 'Test Team' } as any;
      const mockFormData = new FormData();
      mockFormData.set('priceId', 'price_test123');

      vi.mocked(createCheckoutSession).mockResolvedValue(undefined);

      await checkoutAction(mockFormData, mockTeam);

      expect(createCheckoutSession).toHaveBeenCalledWith({
        team: mockTeam,
        priceId: 'price_test123',
      });
    });
  });

  describe('customerPortalAction', () => {
    it('should create portal session and redirect', async () => {
      const mockTeam = { id: 1, name: 'Test Team' } as any;
      const mockPortalUrl = 'https://billing.stripe.com/session/test';

      vi.mocked(createCustomerPortalSession).mockResolvedValue({
        url: mockPortalUrl,
      } as any);

      await expect(
        customerPortalAction(new FormData(), mockTeam)
      ).rejects.toThrow(`Redirect to ${mockPortalUrl}`);

      expect(createCustomerPortalSession).toHaveBeenCalledWith(mockTeam);
      expect(redirect).toHaveBeenCalledWith(mockPortalUrl);
    });
  });
});

