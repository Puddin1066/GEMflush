// GEMflush subscription plans configuration

import { SubscriptionPlan } from '@/lib/types/gemflush';

export const GEMFLUSH_PLANS: Record<string, SubscriptionPlan> = {
  free: {
    id: 'free',
    name: 'LLM Fingerprinter',
    price: 0,
    features: {
      wikidataPublishing: false,
      fingerprintFrequency: 'monthly',
      maxBusinesses: 1,
      historicalData: false,
      competitiveBenchmark: true,
    },
  },
  pro: {
    id: 'pro',
    name: 'Wikidata Publisher',
    price: 49,
    stripePriceId: process.env.STRIPE_PRO_PRICE_ID,
    features: {
      wikidataPublishing: true,
      fingerprintFrequency: 'weekly',
      maxBusinesses: 5,
      historicalData: true,
      competitiveBenchmark: true,
      progressiveEnrichment: true,
    },
  },
  agency: {
    id: 'agency',
    name: 'Agency Plan',
    price: 149,
    stripePriceId: process.env.STRIPE_AGENCY_PRICE_ID,
    features: {
      wikidataPublishing: true,
      fingerprintFrequency: 'weekly',
      maxBusinesses: 25,
      historicalData: true,
      competitiveBenchmark: true,
      progressiveEnrichment: true,
      apiAccess: true,
    },
  },
};

export function getPlanById(planId: string): SubscriptionPlan | null {
  return GEMFLUSH_PLANS[planId] || null;
}

export function getPlanByStripePriceId(priceId: string): SubscriptionPlan | null {
  return Object.values(GEMFLUSH_PLANS).find(plan => plan.stripePriceId === priceId) || null;
}

export function getDefaultPlan(): SubscriptionPlan {
  return GEMFLUSH_PLANS.free;
}

