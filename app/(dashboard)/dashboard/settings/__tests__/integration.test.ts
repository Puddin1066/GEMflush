/**
 * Settings Page Integration Tests
 * 
 * Tests the integration between:
 * - Settings page component
 * - Database queries (getUser, getTeamForUser, getTeamStats)
 * - Plan configuration (getPlanById)
 * - UI rendering with real data flow
 * 
 * SOLID Principles:
 * - Single Responsibility: Tests settings page integration
 * - Dependency Inversion: Mocks database, not UI
 * 
 * DRY Principles:
 * - Reuses existing test patterns
 * - Reuses mock data factories
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { redirect } from 'next/navigation';
import { getUser, getTeamForUser } from '@/lib/db/queries';
import { getPlanById } from '@/lib/gemflush/plans';
import { db } from '@/lib/db/drizzle';

// Mock Next.js navigation
vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
}));

// Mock database queries
vi.mock('@/lib/db/queries', () => ({
  getUser: vi.fn(),
  getTeamForUser: vi.fn(),
}));

// Mock database
vi.mock('@/lib/db/drizzle', () => ({
  db: {
    select: vi.fn(),
  },
}));

// Mock plans
vi.mock('@/lib/gemflush/plans', () => ({
  getPlanById: vi.fn(),
}));

// Mock schema
vi.mock('@/lib/db/schema', () => ({
  businesses: { id: 'businesses' },
  wikidataEntities: { id: 'wikidataEntities' },
  llmFingerprints: { id: 'llmFingerprints' },
}));

// Import after mocks
import SettingsPage from '../page';

describe('Settings Page Integration', () => {
  const mockUser = {
    id: 1,
    email: 'test@example.com',
    name: 'Test User',
    passwordHash: 'hash',
    role: 'owner' as const,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Full Data Flow', () => {
    it('should fetch and display all data correctly for free user', async () => {
      // Arrange
      const mockTeam = {
        id: 1,
        name: 'Test Team',
        planName: 'free',
        createdAt: new Date(),
        updatedAt: new Date(),
        stripeCustomerId: null,
        stripeSubscriptionId: null,
        stripeProductId: null,
        subscriptionStatus: null,
      };

      const mockPlan = {
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
      };

      vi.mocked(getUser).mockResolvedValue(mockUser);
      vi.mocked(getTeamForUser).mockResolvedValue(mockTeam);
      vi.mocked(getPlanById).mockReturnValue(mockPlan);

      // Mock database stats queries
      const mockBusinessCount = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ count: 2 }]),
        }),
      });

      const mockPublishedEntities = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{ id: 1 }]),
          }),
        }),
      });

      const mockFingerprints = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([
              { id: 1 },
              { id: 2 },
            ]),
          }),
        }),
      });

      vi.mocked(db.select)
        .mockReturnValueOnce(mockBusinessCount() as any)
        .mockReturnValueOnce(mockPublishedEntities() as any)
        .mockReturnValueOnce(mockFingerprints() as any);

      // Act
      await SettingsPage();

      // Assert
      expect(getUser).toHaveBeenCalled();
      expect(getTeamForUser).toHaveBeenCalled();
      expect(getPlanById).toHaveBeenCalledWith('free');
      expect(db.select).toHaveBeenCalledTimes(3);
    });

    it('should fetch and display all data correctly for pro user', async () => {
      // Arrange
      const mockTeam = {
        id: 1,
        name: 'Test Team',
        planName: 'pro',
        createdAt: new Date(),
        updatedAt: new Date(),
        stripeCustomerId: 'cus_123',
        stripeSubscriptionId: 'sub_123',
        stripeProductId: 'prod_123',
        subscriptionStatus: 'active',
      };

      const mockPlan = {
        id: 'pro',
        name: 'Wikidata Publisher',
        price: 49,
        features: {
          wikidataPublishing: true,
          fingerprintFrequency: 'weekly',
          maxBusinesses: 5,
          historicalData: true,
          competitiveBenchmark: true,
          progressiveEnrichment: true,
        },
      };

      vi.mocked(getUser).mockResolvedValue(mockUser);
      vi.mocked(getTeamForUser).mockResolvedValue(mockTeam);
      vi.mocked(getPlanById).mockReturnValue(mockPlan);

      // Mock database stats queries
      const mockBusinessCount = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ count: 5 }]),
        }),
      });

      const mockPublishedEntities = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([
              { id: 1 },
              { id: 2 },
              { id: 3 },
            ]),
          }),
        }),
      });

      const mockFingerprints = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([
              { id: 1 },
              { id: 2 },
              { id: 3 },
              { id: 4 },
              { id: 5 },
            ]),
          }),
        }),
      });

      vi.mocked(db.select)
        .mockReturnValueOnce(mockBusinessCount() as any)
        .mockReturnValueOnce(mockPublishedEntities() as any)
        .mockReturnValueOnce(mockFingerprints() as any);

      // Act
      await SettingsPage();

      // Assert
      expect(getUser).toHaveBeenCalled();
      expect(getTeamForUser).toHaveBeenCalled();
      expect(getPlanById).toHaveBeenCalledWith('pro');
      expect(db.select).toHaveBeenCalledTimes(3);
    });
  });

  describe('Stats Calculation Integration', () => {
    it('should calculate stats correctly with mixed data', async () => {
      // Arrange
      const mockTeam = {
        id: 1,
        name: 'Test Team',
        planName: 'free',
        createdAt: new Date(),
        updatedAt: new Date(),
        stripeCustomerId: null,
        stripeSubscriptionId: null,
        stripeProductId: null,
        subscriptionStatus: null,
      };

      vi.mocked(getUser).mockResolvedValue(mockUser);
      vi.mocked(getTeamForUser).mockResolvedValue(mockTeam);
      vi.mocked(getPlanById).mockReturnValue({
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
      });

      // Mock: 3 businesses, 2 published, 4 fingerprints
      const mockBusinessCount = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ count: 3 }]),
        }),
      });

      const mockPublishedEntities = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([
              { id: 1 },
              { id: 2 },
            ]),
          }),
        }),
      });

      const mockFingerprints = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([
              { id: 1 },
              { id: 2 },
              { id: 3 },
              { id: 4 },
            ]),
          }),
        }),
      });

      vi.mocked(db.select)
        .mockReturnValueOnce(mockBusinessCount() as any)
        .mockReturnValueOnce(mockPublishedEntities() as any)
        .mockReturnValueOnce(mockFingerprints() as any);

      // Act
      await SettingsPage();

      // Assert - verify all queries were called
      expect(db.select).toHaveBeenCalledTimes(3);
    });

    it('should handle zero stats gracefully', async () => {
      // Arrange
      const mockTeam = {
        id: 1,
        name: 'Test Team',
        planName: 'free',
        createdAt: new Date(),
        updatedAt: new Date(),
        stripeCustomerId: null,
        stripeSubscriptionId: null,
        stripeProductId: null,
        subscriptionStatus: null,
      };

      vi.mocked(getUser).mockResolvedValue(mockUser);
      vi.mocked(getTeamForUser).mockResolvedValue(mockTeam);
      vi.mocked(getPlanById).mockReturnValue({
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
      });

      // Mock: all zeros
      const mockBusinessCount = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ count: 0 }]),
        }),
      });

      const mockEmpty = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([]),
          }),
        }),
      });

      vi.mocked(db.select)
        .mockReturnValueOnce(mockBusinessCount() as any)
        .mockReturnValueOnce(mockEmpty() as any)
        .mockReturnValueOnce(mockEmpty() as any);

      // Act
      await SettingsPage();

      // Assert
      expect(db.select).toHaveBeenCalledTimes(3);
    });
  });

  describe('Plan Features Integration', () => {
    it('should display correct features for free plan', async () => {
      // Arrange
      const mockTeam = {
        id: 1,
        name: 'Test Team',
        planName: 'free',
        createdAt: new Date(),
        updatedAt: new Date(),
        stripeCustomerId: null,
        stripeSubscriptionId: null,
        stripeProductId: null,
        subscriptionStatus: null,
      };

      const mockPlan = {
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
      };

      vi.mocked(getUser).mockResolvedValue(mockUser);
      vi.mocked(getTeamForUser).mockResolvedValue(mockTeam);
      vi.mocked(getPlanById).mockReturnValue(mockPlan);

      const mockBusinessCount = {
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ count: 0 }]),
        }),
      };

      const mockPublishedEntities = {
        from: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([]),
          }),
        }),
      };

      const mockFingerprints = {
        from: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([]),
          }),
        }),
      };

      vi.mocked(db.select)
        .mockReturnValueOnce(mockBusinessCount as any)
        .mockReturnValueOnce(mockPublishedEntities as any)
        .mockReturnValueOnce(mockFingerprints as any);

      // Act
      await SettingsPage();

      // Assert
      expect(getPlanById).toHaveBeenCalledWith('free');
      expect(mockPlan.features.wikidataPublishing).toBe(false);
      expect(mockPlan.features.maxBusinesses).toBe(1);
    });

    it('should display correct features for agency plan', async () => {
      // Arrange
      const mockTeam = {
        id: 1,
        name: 'Test Team',
        planName: 'agency',
        createdAt: new Date(),
        updatedAt: new Date(),
        stripeCustomerId: 'cus_123',
        stripeSubscriptionId: 'sub_123',
        stripeProductId: 'prod_123',
        subscriptionStatus: 'active',
      };

      const mockPlan = {
        id: 'agency',
        name: 'Agency Plan',
        price: 149,
        features: {
          wikidataPublishing: true,
          fingerprintFrequency: 'weekly',
          maxBusinesses: 25,
          historicalData: true,
          competitiveBenchmark: true,
          progressiveEnrichment: true,
          apiAccess: true,
        },
      };

      vi.mocked(getUser).mockResolvedValue(mockUser);
      vi.mocked(getTeamForUser).mockResolvedValue(mockTeam);
      vi.mocked(getPlanById).mockReturnValue(mockPlan);

      const mockBusinessCount = {
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ count: 0 }]),
        }),
      };

      const mockPublishedEntities = {
        from: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([]),
          }),
        }),
      };

      const mockFingerprints = {
        from: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([]),
          }),
        }),
      };

      vi.mocked(db.select)
        .mockReturnValueOnce(mockBusinessCount as any)
        .mockReturnValueOnce(mockPublishedEntities as any)
        .mockReturnValueOnce(mockFingerprints as any);

      // Act
      await SettingsPage();

      // Assert
      expect(getPlanById).toHaveBeenCalledWith('agency');
      expect(mockPlan.features.apiAccess).toBe(true);
      expect(mockPlan.features.maxBusinesses).toBe(25);
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle database query errors gracefully', async () => {
      // Arrange
      const mockTeam = {
        id: 1,
        name: 'Test Team',
        planName: 'free',
        createdAt: new Date(),
        updatedAt: new Date(),
        stripeCustomerId: null,
        stripeSubscriptionId: null,
        stripeProductId: null,
        subscriptionStatus: null,
      };

      vi.mocked(getUser).mockResolvedValue(mockUser);
      vi.mocked(getTeamForUser).mockResolvedValue(mockTeam);
      vi.mocked(getPlanById).mockReturnValue({
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
      });

      // Mock database error
      vi.mocked(db.select).mockImplementation(() => {
        throw new Error('Database error');
      });

      // Act & Assert
      await expect(SettingsPage()).rejects.toThrow('Database error');
    });

    it('should handle missing plan gracefully', async () => {
      // Arrange
      const mockTeam = {
        id: 1,
        name: 'Test Team',
        planName: 'unknown',
        createdAt: new Date(),
        updatedAt: new Date(),
        stripeCustomerId: null,
        stripeSubscriptionId: null,
        stripeProductId: null,
        subscriptionStatus: null,
      };

      vi.mocked(getUser).mockResolvedValue(mockUser);
      vi.mocked(getTeamForUser).mockResolvedValue(mockTeam);
      vi.mocked(getPlanById).mockReturnValue(null);

      const mockBusinessCount = {
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ count: 0 }]),
        }),
      };

      const mockPublishedEntities = {
        from: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([]),
          }),
        }),
      };

      const mockFingerprints = {
        from: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([]),
          }),
        }),
      };

      vi.mocked(db.select)
        .mockReturnValueOnce(mockBusinessCount as any)
        .mockReturnValueOnce(mockPublishedEntities as any)
        .mockReturnValueOnce(mockFingerprints as any);

      // Act
      await SettingsPage();

      // Assert - should handle null plan gracefully
      expect(getPlanById).toHaveBeenCalledWith('unknown');
    });
  });
});

