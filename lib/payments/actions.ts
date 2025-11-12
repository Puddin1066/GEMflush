'use server';

import { redirect } from 'next/navigation';
import { createCheckoutSession, createCustomerPortalSession } from './stripe';
import { withTeam } from '@/lib/auth/middleware';

export const checkoutAction = withTeam(async (formData, team) => {
  const priceId = formData.get('priceId') as string;
  
  // Validate priceId before proceeding
  if (!priceId || priceId.trim() === '') {
    console.error('[checkoutAction] Empty priceId received', {
      formData: Object.fromEntries(formData.entries()),
      teamId: team?.id,
    });
    redirect('/pricing?error=missing_price');
  }

  await createCheckoutSession({ team: team, priceId });
});

export const customerPortalAction = withTeam(async (_, team) => {
  const portalSession = await createCustomerPortalSession(team);
  redirect(portalSession.url);
});
