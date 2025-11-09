import { describe, it, expect } from 'vitest';
import {
  canPublishToWikidata,
  getMaxBusinesses,
  canAccessHistoricalData,
  canUseProgressiveEnrichment,
  canAccessAPI,
  getFingerprintFrequency,
  canAddBusiness,
  getBusinessLimitMessage,
} from '../permissions';
import { Team } from '@/lib/db/schema';

describe('GEMFlush Permissions', () => {
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

  describe('canPublishToWikidata', () => {
    it('should return false for free plan', () => {
      const team = createMockTeam('free');
      expect(canPublishToWikidata(team)).toBe(false);
    });

    it('should return true for pro plan', () => {
      const team = createMockTeam('pro');
      expect(canPublishToWikidata(team)).toBe(true);
    });

    it('should return true for agency plan', () => {
      const team = createMockTeam('agency');
      expect(canPublishToWikidata(team)).toBe(true);
    });
  });

  describe('getMaxBusinesses', () => {
    it('should return 1 for free plan', () => {
      const team = createMockTeam('free');
      expect(getMaxBusinesses(team)).toBe(1);
    });

    it('should return 5 for pro plan', () => {
      const team = createMockTeam('pro');
      expect(getMaxBusinesses(team)).toBe(5);
    });

    it('should return 25 for agency plan', () => {
      const team = createMockTeam('agency');
      expect(getMaxBusinesses(team)).toBe(25);
    });

    it('should return 1 for unknown plan', () => {
      const team = createMockTeam('unknown');
      expect(getMaxBusinesses(team)).toBe(1);
    });
  });

  describe('canAccessHistoricalData', () => {
    it('should return false for free plan', () => {
      const team = createMockTeam('free');
      expect(canAccessHistoricalData(team)).toBe(false);
    });

    it('should return true for pro plan', () => {
      const team = createMockTeam('pro');
      expect(canAccessHistoricalData(team)).toBe(true);
    });

    it('should return true for agency plan', () => {
      const team = createMockTeam('agency');
      expect(canAccessHistoricalData(team)).toBe(true);
    });
  });

  describe('canUseProgressiveEnrichment', () => {
    it('should return false for free plan', () => {
      const team = createMockTeam('free');
      expect(canUseProgressiveEnrichment(team)).toBe(false);
    });

    it('should return true for pro plan', () => {
      const team = createMockTeam('pro');
      expect(canUseProgressiveEnrichment(team)).toBe(true);
    });

    it('should return true for agency plan', () => {
      const team = createMockTeam('agency');
      expect(canUseProgressiveEnrichment(team)).toBe(true);
    });
  });

  describe('canAccessAPI', () => {
    it('should return false for free plan', () => {
      const team = createMockTeam('free');
      expect(canAccessAPI(team)).toBe(false);
    });

    it('should return false for pro plan', () => {
      const team = createMockTeam('pro');
      expect(canAccessAPI(team)).toBe(false);
    });

    it('should return true for agency plan', () => {
      const team = createMockTeam('agency');
      expect(canAccessAPI(team)).toBe(true);
    });
  });

  describe('getFingerprintFrequency', () => {
    it('should return monthly for free plan', () => {
      const team = createMockTeam('free');
      expect(getFingerprintFrequency(team)).toBe('monthly');
    });

    it('should return weekly for pro plan', () => {
      const team = createMockTeam('pro');
      expect(getFingerprintFrequency(team)).toBe('weekly');
    });

    it('should return weekly for agency plan', () => {
      const team = createMockTeam('agency');
      expect(getFingerprintFrequency(team)).toBe('weekly');
    });
  });

  describe('canAddBusiness', () => {
    it('should allow adding business when under limit', async () => {
      const team = createMockTeam('free'); // limit: 1
      const result = await canAddBusiness(0, team);
      expect(result).toBe(true);
    });

    it('should not allow adding business when at limit', async () => {
      const team = createMockTeam('free'); // limit: 1
      const result = await canAddBusiness(1, team);
      expect(result).toBe(false);
    });

    it('should allow adding multiple businesses for pro plan', async () => {
      const team = createMockTeam('pro'); // limit: 5
      const result = await canAddBusiness(3, team);
      expect(result).toBe(true);
    });

    it('should not allow exceeding pro plan limit', async () => {
      const team = createMockTeam('pro'); // limit: 5
      const result = await canAddBusiness(5, team);
      expect(result).toBe(false);
    });
  });

  describe('getBusinessLimitMessage', () => {
    it('should show free plan upgrade message', () => {
      const team = createMockTeam('free');
      const message = getBusinessLimitMessage(team);
      
      expect(message).toContain('Free plan');
      expect(message).toContain('1 business');
      expect(message).toContain('Upgrade to Pro');
    });

    it('should show pro plan upgrade message', () => {
      const team = createMockTeam('pro');
      const message = getBusinessLimitMessage(team);
      
      expect(message).toContain('Pro plan');
      expect(message).toContain('5 businesses');
      expect(message).toContain('Upgrade to Agency');
    });

    it('should show agency plan limit without upgrade message', () => {
      const team = createMockTeam('agency');
      const message = getBusinessLimitMessage(team);
      
      expect(message).toContain('25 businesses');
      expect(message).not.toContain('Upgrade');
    });
  });
});

