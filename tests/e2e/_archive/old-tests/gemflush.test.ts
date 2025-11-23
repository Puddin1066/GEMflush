import { describe, it, expect } from 'vitest';
import {
  canPublishToWikidata,
  getMaxBusinesses,
  canAddBusiness,
  getBusinessLimitMessage,
} from '@/lib/gemflush/permissions';
import { getPlanById, getDefaultPlan } from '@/lib/gemflush/plans';
import { Team } from '@/lib/db/schema';

describe('GEMflush E2E Tests', () => {
  const createMockTeam = (planName: string): Team => ({
    id: 1,
    name: 'Test Team',
    planName,
    stripeCustomerId: null,
    stripeSubscriptionId: null,
    stripeProductId: null,
    subscriptionStatus: 'active',
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  describe('Complete Permission Flow', () => {
    it('should handle free plan permissions correctly', () => {
      const team = createMockTeam('free');

      // Check all permissions
      expect(canPublishToWikidata(team)).toBe(false);
      expect(getMaxBusinesses(team)).toBe(1);
      expect(canAddBusiness(0, team)).toBe(true);
      expect(canAddBusiness(1, team)).toBe(false);

      const message = getBusinessLimitMessage(team);
      expect(message).toContain('Free plan');
      expect(message).toContain('Upgrade to Pro');
    });

    it('should handle pro plan permissions correctly', () => {
      const team = createMockTeam('pro');

      // Check all permissions
      expect(canPublishToWikidata(team)).toBe(true);
      expect(getMaxBusinesses(team)).toBe(5);
      expect(canAddBusiness(0, team)).toBe(true);
      expect(canAddBusiness(4, team)).toBe(true);
      expect(canAddBusiness(5, team)).toBe(false);

      const message = getBusinessLimitMessage(team);
      expect(message).toContain('Pro plan');
      expect(message).toContain('Upgrade to Agency');
    });

    it('should handle agency plan permissions correctly', () => {
      const team = createMockTeam('agency');

      // Check all permissions
      expect(canPublishToWikidata(team)).toBe(true);
      expect(getMaxBusinesses(team)).toBe(25);
      expect(canAddBusiness(0, team)).toBe(true);
      expect(canAddBusiness(24, team)).toBe(true);
      expect(canAddBusiness(25, team)).toBe(false);

      const message = getBusinessLimitMessage(team);
      expect(message).toContain('25 businesses');
      expect(message).not.toContain('Upgrade');
    });
  });

  describe('Plan and Permission Integration', () => {
    it('should use plan data to determine permissions', () => {
      const freePlan = getPlanById('free');
      const proPlan = getPlanById('pro');
      const agencyPlan = getPlanById('agency');

      expect(freePlan).toBeDefined();
      expect(proPlan).toBeDefined();
      expect(agencyPlan).toBeDefined();

      // Verify plan features match permission functions
      const freeTeam = createMockTeam('free');
      const proTeam = createMockTeam('pro');
      const agencyTeam = createMockTeam('agency');

      expect(canPublishToWikidata(freeTeam)).toBe(freePlan!.features.wikidataPublishing);
      expect(canPublishToWikidata(proTeam)).toBe(proPlan!.features.wikidataPublishing);
      expect(canPublishToWikidata(agencyTeam)).toBe(agencyPlan!.features.wikidataPublishing);

      expect(getMaxBusinesses(freeTeam)).toBe(freePlan!.features.maxBusinesses);
      expect(getMaxBusinesses(proTeam)).toBe(proPlan!.features.maxBusinesses);
      expect(getMaxBusinesses(agencyTeam)).toBe(agencyPlan!.features.maxBusinesses);
    });

    it('should default to free plan when planName is null', () => {
      const team = createMockTeam(null as any);
      const defaultPlan = getDefaultPlan();

      expect(getMaxBusinesses(team)).toBe(defaultPlan.features.maxBusinesses);
      expect(canPublishToWikidata(team)).toBe(defaultPlan.features.wikidataPublishing);
    });
  });
});

