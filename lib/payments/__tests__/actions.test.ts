/**
 * Payment Actions Tests
 * Tests server actions for checkout and customer portal
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { redirect } from 'next/navigation';
import { checkoutAction, customerPortalAction } from '../actions';
import { createCheckoutSession, createCustomerPortalSession } from '../stripe';
import { withTeam } from '@/lib/auth/middleware';

// Mock dependencies
vi.mock('next/navigation', () => ({
  redirect: vi.fn(() => {
    throw new Error('NEXT_REDIRECT');
  }),
}));

vi.mock('../stripe', () => ({
  createCheckoutSession: vi.fn(),
  createCustomerPortalSession: vi.fn(),
}));

vi.mock('@/lib/auth/middleware', () => ({
  withTeam: vi.fn((fn) => fn),
}));

describe('checkoutAction', () => {
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

  beforeEach(() => {
    vi.clearAllMocks();
    console.error = vi.fn(); // Mock console.error
  });

  it('should validate priceId and redirect if empty', async () => {
    const formData = new FormData();
    formData.set('priceId', '');

    // Redirect throws NEXT_REDIRECT in tests
    await expect(checkoutAction(formData, mockTeam)).rejects.toThrow('NEXT_REDIRECT');

    expect(console.error).toHaveBeenCalledWith(
      '[checkoutAction] Empty priceId received',
      expect.objectContaining({
        formData: expect.any(Object),
        teamId: 1,
      })
    );
    expect(redirect).toHaveBeenCalledWith('/pricing?error=missing_price');
    expect(createCheckoutSession).not.toHaveBeenCalled();
  });

  it('should validate priceId and redirect if whitespace only', async () => {
    const formData = new FormData();
    formData.set('priceId', '   ');

    await expect(checkoutAction(formData, mockTeam)).rejects.toThrow('NEXT_REDIRECT');

    expect(console.error).toHaveBeenCalled();
    expect(redirect).toHaveBeenCalledWith('/pricing?error=missing_price');
    expect(createCheckoutSession).not.toHaveBeenCalled();
  });

  it('should validate priceId and redirect if missing', async () => {
    const formData = new FormData();
    // No priceId set

    await expect(checkoutAction(formData, mockTeam)).rejects.toThrow('NEXT_REDIRECT');

    expect(console.error).toHaveBeenCalled();
    expect(redirect).toHaveBeenCalledWith('/pricing?error=missing_price');
    expect(createCheckoutSession).not.toHaveBeenCalled();
  });

  it('should proceed with valid priceId', async () => {
    const formData = new FormData();
    formData.set('priceId', 'price_test_123');

    vi.mocked(createCheckoutSession).mockImplementation(async () => {
      redirect('https://checkout.stripe.com/test');
    });

    // createCheckoutSession will redirect, which throws in tests
    await expect(checkoutAction(formData, mockTeam)).rejects.toThrow('NEXT_REDIRECT');

    expect(console.error).not.toHaveBeenCalled();
    expect(createCheckoutSession).toHaveBeenCalledWith({
      team: mockTeam,
      priceId: 'price_test_123',
    });
  });

  it('should handle createCheckoutSession errors', async () => {
    const formData = new FormData();
    formData.set('priceId', 'price_test_123');

    const error = new Error('Stripe API error');
    vi.mocked(createCheckoutSession).mockRejectedValue(error);

    await expect(checkoutAction(formData, mockTeam)).rejects.toThrow('Stripe API error');
  });
});

describe('customerPortalAction', () => {
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

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create portal session and redirect', async () => {
    const mockPortalSession = {
      url: 'https://billing.stripe.com/test',
    };

    vi.mocked(createCustomerPortalSession).mockResolvedValue(mockPortalSession as any);

    // Redirect throws NEXT_REDIRECT in tests
    await expect(customerPortalAction(new FormData(), mockTeam)).rejects.toThrow('NEXT_REDIRECT');

    expect(createCustomerPortalSession).toHaveBeenCalledWith(mockTeam);
    expect(redirect).toHaveBeenCalledWith('https://billing.stripe.com/test');
  });
});
