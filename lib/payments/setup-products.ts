/**
 * Auto-setup Stripe Products
 * Can be called from API routes or server components to ensure products exist
 * 
 * DRY: Reuses setup script logic
 */

import { setupStripeProducts } from '../../scripts/setup-stripe-products';
import type { EnsureStripeProductsResult } from './types';

/**
 * Ensure Stripe products exist, create if missing
 * Returns true if products were created, false if they already existed
 */
export async function ensureStripeProducts(): Promise<EnsureStripeProductsResult> {
  try {
    const result = await setupStripeProducts({ skipEnv: true });
    return {
      created: true,
      proPriceId: result.proPrice,
      agencyPriceId: result.agencyPrice,
    };
  } catch (error) {
    console.error('[ensureStripeProducts] Error:', error);
    // Don't throw - let the pricing page handle missing products gracefully
    return { created: false };
  }
}











