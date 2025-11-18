/**
 * Payment DTO Types
 * These define stable interfaces for Stripe payment data
 * Following Next.js Data Access Layer pattern
 * 
 * SOLID: Single Responsibility - defines payment data contracts only
 * DRY: Centralized type definitions for payment module
 * 
 * @see https://nextjs.org/docs/app/building-your-application/data-fetching/patterns#data-access-layer
 */

// ============================================================================
// Stripe Price DTO
// ============================================================================

/**
 * Stripe Price data for UI consumption
 * Returned by: getStripePrices()
 * Used by: Pricing pages, checkout flows
 */
export interface StripePriceDTO {
  id: string;                              // Stripe price ID (e.g., "price_1234")
  productId: string;                        // Stripe product ID (e.g., "prod_1234")
  unitAmount: number | null;                // Price in cents (e.g., 4900 = $49.00)
  currency: string;                         // ISO currency code (e.g., "usd")
  interval: 'day' | 'week' | 'month' | 'year' | null;  // Billing interval
  trialPeriodDays: number | null;           // Trial period in days
}

// ============================================================================
// Stripe Product DTO
// ============================================================================

/**
 * Stripe Product data for UI consumption
 * Returned by: getStripeProducts()
 * Used by: Pricing pages, product selection
 */
export interface StripeProductDTO {
  id: string;                               // Stripe product ID (e.g., "prod_1234")
  name: string;                             // Product name (e.g., "Pro")
  description: string | null;               // Product description
  defaultPriceId: string | null;            // Default price ID for this product
}

// ============================================================================
// GEMflush Product Configuration
// ============================================================================

/**
 * GEMflush product configuration
 * Used by: gemflush-products.ts
 * Defines product features and pricing
 */
export interface GemflushProductConfig {
  name: 'Pro' | 'Agency';                   // Product name (union type for type safety)
  description: string;                      // Product description
  priceId: string | undefined;              // Stripe price ID from env var
  price: number;                            // Price in cents
  interval: 'month' | 'year';               // Billing interval
  features: string[];                       // List of feature strings
}

/**
 * GEMflush Stripe configuration
 * Contains all product configurations
 */
export interface GemflushStripeConfig {
  products: GemflushProductConfig[];
}

// ============================================================================
// Checkout Session Input
// ============================================================================

/**
 * Input parameters for creating a checkout session
 * Used by: createCheckoutSession()
 */
export interface CreateCheckoutSessionInput {
  team: {
    id: number;
    stripeCustomerId: string | null;
  } | null;
  priceId: string;                          // Required: Stripe price ID
}

// ============================================================================
// Subscription Update Input
// ============================================================================

/**
 * Input parameters for updating team subscription
 * Used by: handleSubscriptionChange()
 */
export interface UpdateTeamSubscriptionInput {
  stripeSubscriptionId: string | null;
  stripeProductId: string | null;
  planName: 'free' | 'pro' | 'agency' | null;  // Normalized plan name
  subscriptionStatus: 'active' | 'trialing' | 'canceled' | 'unpaid' | null;
}

// ============================================================================
// Ensure Products Result
// ============================================================================

/**
 * Result from ensureStripeProducts()
 * Used by: setup-products.ts
 */
export interface EnsureStripeProductsResult {
  created: boolean;                         // Whether products were created
  proPriceId?: string;                      // Pro plan price ID (if created)
  agencyPriceId?: string;                   // Agency plan price ID (if created)
}

