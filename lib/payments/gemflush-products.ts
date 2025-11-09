// GEMflush Stripe product configuration

export const GEMFLUSH_STRIPE_CONFIG = {
  products: [
    {
      name: 'Pro',
      description: 'Wikidata Publisher + Premium Features',
      priceId: process.env.STRIPE_PRO_PRICE_ID,
      price: 4900, // $49.00 in cents
      interval: 'month',
      features: [
        'Up to 5 businesses',
        'Weekly fingerprint reports',
        'Wikidata publishing',
        'Historical trend tracking',
        'Progressive enrichment',
        'Detailed LLM breakdown',
      ],
    },
    {
      name: 'Agency',
      description: 'For marketing agencies and consultants',
      priceId: process.env.STRIPE_AGENCY_PRICE_ID,
      price: 14900, // $149.00 in cents
      interval: 'month',
      features: [
        'Up to 25 businesses',
        'Weekly fingerprint reports',
        'Wikidata publishing',
        'All Pro features',
        'Multi-client management',
        'API access',
        'Priority support',
      ],
    },
  ],
};

export function getGemflushProduct(planName: string) {
  return GEMFLUSH_STRIPE_CONFIG.products.find(
    (p) => p.name.toLowerCase() === planName.toLowerCase()
  );
}

