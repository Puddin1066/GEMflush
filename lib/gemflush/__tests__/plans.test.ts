import { describe, it, expect } from 'vitest';
import {
  GEMFLUSH_PLANS,
  getPlanById,
  getPlanByStripePriceId,
  getDefaultPlan,
} from '../plans';

describe('GEMflush Plans', () => {
  describe('GEMFLUSH_PLANS', () => {
    it('should have all three plans defined', () => {
      expect(GEMFLUSH_PLANS.free).toBeDefined();
      expect(GEMFLUSH_PLANS.pro).toBeDefined();
      expect(GEMFLUSH_PLANS.agency).toBeDefined();
    });

    it('should have correct free plan structure', () => {
      const freePlan = GEMFLUSH_PLANS.free;
      expect(freePlan.id).toBe('free');
      expect(freePlan.name).toBe('LLM Fingerprinter');
      expect(freePlan.price).toBe(0);
      expect(freePlan.features.maxBusinesses).toBe(1);
      expect(freePlan.features.wikidataPublishing).toBe(false);
      expect(freePlan.features.fingerprintFrequency).toBe('monthly');
    });

    it('should have correct pro plan structure', () => {
      const proPlan = GEMFLUSH_PLANS.pro;
      expect(proPlan.id).toBe('pro');
      expect(proPlan.name).toBe('Wikidata Publisher');
      expect(proPlan.price).toBe(49);
      expect(proPlan.features.maxBusinesses).toBe(5);
      expect(proPlan.features.wikidataPublishing).toBe(true);
      expect(proPlan.features.fingerprintFrequency).toBe('weekly');
      expect(proPlan.features.progressiveEnrichment).toBe(true);
    });

    it('should have correct agency plan structure', () => {
      const agencyPlan = GEMFLUSH_PLANS.agency;
      expect(agencyPlan.id).toBe('agency');
      expect(agencyPlan.name).toBe('Agency Plan');
      expect(agencyPlan.price).toBe(149);
      expect(agencyPlan.features.maxBusinesses).toBe(25);
      expect(agencyPlan.features.wikidataPublishing).toBe(true);
      expect(agencyPlan.features.apiAccess).toBe(true);
    });
  });

  describe('getPlanById', () => {
    it('should return free plan for "free" id', () => {
      const plan = getPlanById('free');
      expect(plan).toMatchObject({
        id: 'free',
        name: 'LLM Fingerprinter',
        price: 0,
      });
    });

    it('should return pro plan for "pro" id', () => {
      const plan = getPlanById('pro');
      expect(plan).toMatchObject({
        id: 'pro',
        name: 'Wikidata Publisher',
        price: 49,
      });
    });

    it('should return agency plan for "agency" id', () => {
      const plan = getPlanById('agency');
      expect(plan).toMatchObject({
        id: 'agency',
        name: 'Agency Plan',
        price: 149,
      });
    });

    it('should return null for unknown plan id', () => {
      const plan = getPlanById('unknown');
      expect(plan).toBeNull();
    });

    it('should return null for empty string', () => {
      const plan = getPlanById('');
      expect(plan).toBeNull();
    });
  });

  describe('getPlanByStripePriceId', () => {
    it('should return plan when Stripe price ID matches', () => {
      // Note: This test verifies the function logic, but actual Stripe price IDs
      // come from environment variables set at module load time
      // In a real scenario, you'd set STRIPE_PRO_PRICE_ID before importing
      const plan = getPlanByStripePriceId(process.env.STRIPE_PRO_PRICE_ID || '');
      
      // If env var is set, it should match; otherwise null
      if (process.env.STRIPE_PRO_PRICE_ID) {
        expect(plan).toMatchObject({
          id: 'pro',
          name: 'Wikidata Publisher',
        });
      } else {
        expect(plan).toBeNull();
      }
    });

    it('should return null when Stripe price ID does not match', () => {
      const plan = getPlanByStripePriceId('price_unknown');
      expect(plan).toBeNull();
    });

    it('should return null for empty string', () => {
      const plan = getPlanByStripePriceId('');
      expect(plan).toBeNull();
    });
  });

  describe('getDefaultPlan', () => {
    it('should return free plan as default', () => {
      const plan = getDefaultPlan();
      expect(plan).toMatchObject({
        id: 'free',
        name: 'LLM Fingerprinter',
        price: 0,
      });
    });

    it('should return the same instance as GEMFLUSH_PLANS.free', () => {
      const defaultPlan = getDefaultPlan();
      expect(defaultPlan).toBe(GEMFLUSH_PLANS.free);
    });
  });

  describe('Plan Features', () => {
    it('should have competitiveBenchmark enabled for all plans', () => {
      expect(GEMFLUSH_PLANS.free.features.competitiveBenchmark).toBe(true);
      expect(GEMFLUSH_PLANS.pro.features.competitiveBenchmark).toBe(true);
      expect(GEMFLUSH_PLANS.agency.features.competitiveBenchmark).toBe(true);
    });

    it('should have progressiveEnrichment only for pro and agency', () => {
      expect(GEMFLUSH_PLANS.free.features.progressiveEnrichment).toBeUndefined();
      expect(GEMFLUSH_PLANS.pro.features.progressiveEnrichment).toBe(true);
      expect(GEMFLUSH_PLANS.agency.features.progressiveEnrichment).toBe(true);
    });

    it('should have apiAccess only for agency', () => {
      expect(GEMFLUSH_PLANS.free.features.apiAccess).toBeUndefined();
      expect(GEMFLUSH_PLANS.pro.features.apiAccess).toBeUndefined();
      expect(GEMFLUSH_PLANS.agency.features.apiAccess).toBe(true);
    });
  });
});

