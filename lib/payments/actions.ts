'use server';

import { redirect } from 'next/navigation';
import { createCheckoutSession, createCustomerPortalSession } from './stripe';
import { withTeam } from '@/lib/auth/middleware';

/**
 * REFACTOR: Extract price ID validation helper
 * DRY: Reusable validation logic (shared with stripe.ts)
 */
function validatePriceIdFromForm(priceId: string | null): void {
  if (!priceId || priceId.trim() === '') {
    redirect('/pricing?error=missing_price');
  }
}

export const checkoutAction = withTeam(async (formData, team) => {
  const priceId = formData.get('priceId') as string;
  
  // REFACTOR: Use validation helper
  validatePriceIdFromForm(priceId);

  await createCheckoutSession({ team: team, priceId });
});

export const customerPortalAction = withTeam(async (_, team) => {
  const portalSession = await createCustomerPortalSession(team);
  redirect(portalSession.url);
});
