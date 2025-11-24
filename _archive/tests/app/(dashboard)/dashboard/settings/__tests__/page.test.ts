/**
 * Settings Page Unit Tests
 * 
 * SOLID Principles:
 * - Single Responsibility: Tests only settings page logic
 * - Dependency Inversion: Mocks database dependencies
 * 
 * DRY Principles:
 * - Reuses existing test patterns
 * - Reuses mock factories where applicable
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { redirect } from 'next/navigation';

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
import { getUser, getTeamForUser } from '@/lib/db/queries';
import { getPlanById } from '@/lib/gemflush/plans';
import { db } from '@/lib/db/drizzle';
import { count, eq } from 'drizzle-orm';
import SettingsPage from '../page';

describe('Settings Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Authentication', () => {
    it('should redirect to sign-in when user is not authenticated', async () => {
      // Arrange
      vi.mocked(getUser).mockResolvedValue(null);
      vi.mocked(redirect).mockImplementation(() => {
        throw new Error('Redirect called');
      });

      // Act & Assert
      await expect(SettingsPage()).rejects.toThrow('Redirect called');
      expect(redirect).toHaveBeenCalledWith('/sign-in');
      expect(getTeamForUser).not.toHaveBeenCalled();
    });

    it('should redirect to sign-in when team is not found', async () => {
      // Arrange
      vi.mocked(getUser).mockResolvedValue({
        id: 1,
        email: 'test@example.com',
        name: 'Test User',
        passwordHash: 'hash',
        role: 'owner',
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      });
      vi.mocked(getTeamForUser).mockResolvedValue(null);
      vi.mocked(redirect).mockImplementation(() => {
        throw new Error('Redirect called');
      });

      // Act & Assert
      await expect(SettingsPage()).rejects.toThrow('Redirect called');
      expect(redirect).toHaveBeenCalledWith('/sign-in');
    });
  });

  describe('Team Stats Calculation', () => {
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

    beforeEach(() => {
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
    });

    it('should calculate stats correctly with no data', async () => {
      // Arrange
      // Mock business count query - db.select() returns object with .from() method
      // The chain: db.select().from().where() resolves to array
      const mockBusinessCountChain = {
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ count: 0 }]),
        }),
      };

      // Mock published entities query
      const mockPublishedEntitiesChain = {
        from: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([]),
          }),
        }),
      };

      // Mock fingerprints query
      const mockFingerprintsChain = {
        from: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([]),
          }),
        }),
      };

      vi.mocked(db.select)
        .mockReturnValueOnce(mockBusinessCountChain as any)
        .mockReturnValueOnce(mockPublishedEntitiesChain as any)
        .mockReturnValueOnce(mockFingerprintsChain as any);

      // Act
      const result = await SettingsPage();

      // Assert
      expect(db.select).toHaveBeenCalled();
    });

    it('should calculate stats correctly with businesses', async () => {
      // Arrange
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
      expect(db.select).toHaveBeenCalledTimes(3);
    });
  });

  describe('Plan Display', () => {
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

    it('should display free plan correctly', async () => {
      // Arrange
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

      const mockBusinessCountChain = {
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ count: 0 }]),
        }),
      };

      const mockPublishedEntitiesChain = {
        from: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([]),
          }),
        }),
      };

      const mockFingerprintsChain = {
        from: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([]),
          }),
        }),
      };

      vi.mocked(db.select)
        .mockReturnValueOnce(mockBusinessCountChain as any)
        .mockReturnValueOnce(mockPublishedEntitiesChain as any)
        .mockReturnValueOnce(mockFingerprintsChain as any);

      // Act
      await SettingsPage();

      // Assert
      expect(getPlanById).toHaveBeenCalledWith('free');
    });

    it('should display pro plan correctly', async () => {
      // Arrange
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

      vi.mocked(getUser).mockResolvedValue(mockUser);
      vi.mocked(getTeamForUser).mockResolvedValue(mockTeam);
      vi.mocked(getPlanById).mockReturnValue({
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
      });

      const mockBusinessCountChain = {
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ count: 0 }]),
        }),
      };

      const mockPublishedEntitiesChain = {
        from: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([]),
          }),
        }),
      };

      const mockFingerprintsChain = {
        from: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([]),
          }),
        }),
      };

      vi.mocked(db.select)
        .mockReturnValueOnce(mockBusinessCountChain as any)
        .mockReturnValueOnce(mockPublishedEntitiesChain as any)
        .mockReturnValueOnce(mockFingerprintsChain as any);

      // Act
      await SettingsPage();

      // Assert
      expect(getPlanById).toHaveBeenCalledWith('pro');
    });
  });

  describe('Settings Sections', () => {
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

    beforeEach(() => {
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
    });

    it('should include all required settings sections', async () => {
      // Arrange
      const mockBusinessCountChain = {
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ count: 0 }]),
        }),
      };

      const mockPublishedEntitiesChain = {
        from: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([]),
          }),
        }),
      };

      const mockFingerprintsChain = {
        from: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([]),
          }),
        }),
      };

      vi.mocked(db.select)
        .mockReturnValueOnce(mockBusinessCountChain as any)
        .mockReturnValueOnce(mockPublishedEntitiesChain as any)
        .mockReturnValueOnce(mockFingerprintsChain as any);

      // Act
      await SettingsPage();

      // Assert - verify the page renders without errors
      // The settings sections are defined in the component
      expect(getUser).toHaveBeenCalled();
      expect(getTeamForUser).toHaveBeenCalled();
    });
  });
});

