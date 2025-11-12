import Stripe from 'stripe';

/**
 * Stripe test fixtures for unit, integration, and e2e tests
 */

export const mockStripeCustomer: Stripe.Customer = {
  id: 'cus_test_1234567890',
  object: 'customer',
  address: null,
  balance: 0,
  created: 1234567890,
  currency: 'usd',
  default_source: null,
  delinquent: false,
  description: null,
  discount: null,
  email: 'test@example.com',
  invoice_prefix: null,
  invoice_settings: {
    custom_fields: null,
    default_payment_method: null,
    footer: null,
    rendering_options: null,
  },
  livemode: false,
  metadata: {},
  name: null,
  next_invoice_sequence: 1,
  phone: null,
  preferred_locales: [],
  shipping: null,
  tax_exempt: 'none',
  test_clock: null,
} as Stripe.Customer;

export const mockStripeProduct: Stripe.Product = {
  id: 'prod_test_1234567890',
  object: 'product',
  active: true,
  attributes: [],
  created: 1234567890,
  default_price: 'price_test_1234567890',
  description: 'Pro plan',
  features: [],
  images: [],
  livemode: false,
  metadata: {},
  name: 'Pro',
  package_dimensions: null,
  shippable: null,
  statement_descriptor: null,
  tax_code: null,
  unit_label: null,
  updated: 1234567890,
  url: null,
  marketing_features: [],
  type: 'service',
} as unknown as Stripe.Product;

export const mockStripePrice: Stripe.Price = {
  id: 'price_test_1234567890',
  object: 'price',
  active: true,
  billing_scheme: 'per_unit',
  created: 1234567890,
  currency: 'usd',
  custom_unit_amount: null,
  livemode: false,
  lookup_key: null,
  metadata: {},
  nickname: null,
  product: mockStripeProduct,
  recurring: {
    aggregate_usage: null,
    interval: 'month',
    interval_count: 1,
    trial_period_days: 14,
    usage_type: 'licensed',
    meter: null,
  },
  tax_behavior: null,
  tiers_mode: null,
  transform_quantity: null,
  type: 'recurring',
  unit_amount: 4900,
  unit_amount_decimal: '4900',
} as unknown as Stripe.Price;

export const mockStripeSubscription: Stripe.Subscription = {
  id: 'sub_test_1234567890',
  object: 'subscription',
  application: null,
  application_fee_percent: null,
  automatic_tax: {
    enabled: false,
  },
  billing_cycle_anchor: 1234567890,
  billing_thresholds: null,
  cancel_at: null,
  cancel_at_period_end: false,
  canceled_at: null,
  collection_method: 'charge_automatically',
  created: 1234567890,
  currency: 'usd',
  current_period_end: 1234567890 + 2592000, // 30 days
  current_period_start: 1234567890,
  customer: mockStripeCustomer.id,
  days_until_due: null,
  default_payment_method: null,
  default_source: null,
  default_tax_rates: [],
  description: null,
  discount: null,
  ended_at: null,
  items: {
    object: 'list',
    data: [
      {
        id: 'si_test_1234567890',
        object: 'subscription_item',
        billing_thresholds: null,
        created: 1234567890,
        metadata: {},
        plan: {
          id: 'price_test_1234567890',
          object: 'plan',
          active: true,
          aggregate_usage: null,
          amount: 4900,
          amount_decimal: '4900',
          billing_scheme: 'per_unit',
          created: 1234567890,
          currency: 'usd',
          interval: 'month',
          interval_count: 1,
          livemode: false,
          metadata: {},
          nickname: null,
          product: mockStripeProduct.id,
          tiers_mode: null,
          transform_usage: null,
          trial_period_days: 14,
          usage_type: 'licensed',
        },
        price: mockStripePrice,
        quantity: 1,
        subscription: 'sub_test_1234567890',
        tax_rates: [],
      },
    ],
    has_more: false,
    total_count: 1,
    url: '/v1/subscription_items',
  },
  latest_invoice: null,
  livemode: false,
  metadata: {},
  next_pending_invoice_item_invoice: null,
  on_behalf_of: null,
  pause_collection: null,
  payment_settings: {
    payment_method_options: null,
    payment_method_types: null,
  },
  pending_invoice_item_interval: null,
  pending_setup_intent: null,
  pending_update: null,
  schedule: null,
  start_date: 1234567890,
  status: 'active',
  test_clock: null,
  transfer_data: null,
  trial_end: null,
  trial_start: null,
  billing_cycle_anchor_config: null,
  cancellation_details: null,
  discounts: [],
  invoice_settings: {
    custom_fields: null,
    default_payment_method: null,
    footer: null,
    rendering_options: null,
  },
  trial_settings: null,
} as unknown as Stripe.Subscription;

export const mockStripeCheckoutSession: Stripe.Checkout.Session = {
  id: 'cs_test_1234567890',
  object: 'checkout.session',
  after_expiration: null,
  allow_promotion_codes: true,
  amount_subtotal: 4900,
  amount_total: 4900,
  automatic_tax: {
    enabled: false,
    status: null,
  },
  billing_address_collection: null,
  cancel_url: 'http://localhost:3000/pricing',
  client_reference_id: '1',
  client_secret: null,
  consent: null,
  consent_collection: null,
  created: 1234567890,
  currency: 'usd',
  currency_conversion: null,
  custom_fields: [],
  custom_text: {
    after_submit: null,
    shipping_address: null,
    submit: null,
    terms_of_service_acceptance: null,
  },
  customer: mockStripeCustomer,
  customer_creation: 'always',
  customer_details: {
    address: null,
    email: 'test@example.com',
    name: null,
    phone: null,
    tax_exempt: 'none',
    tax_ids: [],
  },
  customer_email: 'test@example.com',
  expires_at: 1234567890 + 3600,
  invoice: null,
  invoice_creation: null,
  livemode: false,
  locale: null,
  metadata: {},
  mode: 'subscription',
  payment_intent: null,
  payment_link: null,
  payment_method_collection: 'always',
  payment_method_options: {},
  payment_method_types: ['card'],
  payment_status: 'paid',
  phone_number_collection: {
    enabled: false,
  },
  recovered_from: null,
  saved_payment_method_options: null,
  setup_intent: null,
  shipping_address_collection: null,
  shipping_cost: null,
  shipping_details: null,
  shipping_options: [],
  status: 'complete',
  submit_type: null,
  subscription: mockStripeSubscription,
  success_url: 'http://localhost:3000/api/stripe/checkout?session_id={CHECKOUT_SESSION_ID}',
  total_details: {
    amount_discount: 0,
    amount_shipping: 0,
    amount_tax: 0,
  },
  ui_mode: 'hosted',
  url: 'https://checkout.stripe.com/test',
} as unknown as Stripe.Checkout.Session;

export const mockStripeEvent: Stripe.Event = {
  id: 'evt_test_1234567890',
  object: 'event',
  api_version: '2025-04-30.basil',
  created: 1234567890,
  data: {
    object: mockStripeSubscription,
    previous_attributes: null,
  },
  livemode: false,
  pending_webhooks: 1,
  request: {
    id: 'req_test_1234567890',
    idempotency_key: null,
  },
  type: 'customer.subscription.updated',
} as unknown as Stripe.Event;

export const mockStripeBillingPortalSession: Stripe.BillingPortal.Session = {
  id: 'bps_test_1234567890',
  object: 'billing_portal.session',
  configuration: 'bpc_test_1234567890',
  created: 1234567890,
  customer: mockStripeCustomer.id,
  livemode: false,
  locale: null,
  on_behalf_of: null,
  return_url: 'http://localhost:3000/dashboard',
  url: 'https://billing.stripe.com/test',
} as Stripe.BillingPortal.Session;

export const mockStripeBillingPortalConfiguration: Stripe.BillingPortal.Configuration = {
  id: 'bpc_test_1234567890',
  object: 'billing_portal.configuration',
  active: true,
  application: null,
  business_profile: {
    headline: 'Manage your subscription',
    privacy_policy_url: null,
    terms_of_service_url: null,
  },
  created: 1234567890,
  default_return_url: null,
  features: {
    customer_update: {
      allowed_updates: ['email', 'address', 'phone', 'tax_id'],
      enabled: true,
    },
    invoice_history: {
      enabled: true,
    },
    payment_method_update: {
      enabled: true,
    },
    subscription_cancel: {
      cancellation_reason: {
        enabled: true,
        options: [
          'too_expensive',
          'missing_features',
          'switched_service',
          'unused',
          'other',
        ],
      },
      enabled: true,
      mode: 'at_period_end',
      proration_behavior: 'none',
    },
    subscription_update: {
      default_allowed_updates: ['price', 'quantity', 'promotion_code'],
      enabled: true,
      proration_behavior: 'create_prorations',
      products: [
        {
          product: mockStripeProduct.id,
          prices: [mockStripePrice.id],
        },
      ],
    },
  },
  is_default: true,
  livemode: false,
  login_page: {
    enabled: true,
    url: null,
  },
  metadata: {},
  updated: 1234567890,
} as Stripe.BillingPortal.Configuration;

/**
 * Helper functions for creating test data
 */
export function createMockSubscription(overrides?: Partial<Stripe.Subscription>): Stripe.Subscription {
  return {
    ...mockStripeSubscription,
    ...overrides,
  } as unknown as Stripe.Subscription;
}

export function createMockCheckoutSession(
  overrides?: Partial<Stripe.Checkout.Session>
): Stripe.Checkout.Session {
  return {
    ...mockStripeCheckoutSession,
    ...overrides,
  } as unknown as Stripe.Checkout.Session;
}

export function createMockEvent(overrides?: Partial<Stripe.Event>): Stripe.Event {
  return {
    ...mockStripeEvent,
    ...overrides,
  } as unknown as Stripe.Event;
}

export function createMockCustomer(overrides?: Partial<Stripe.Customer>): Stripe.Customer {
  return {
    ...mockStripeCustomer,
    ...overrides,
  } as Stripe.Customer;
}

export function createMockProduct(overrides?: Partial<Stripe.Product>): Stripe.Product {
  return {
    ...mockStripeProduct,
    ...overrides,
  } as unknown as Stripe.Product;
}

export function createMockPrice(overrides?: Partial<Stripe.Price>): Stripe.Price {
  return {
    ...mockStripePrice,
    ...overrides,
  } as unknown as Stripe.Price;
}

