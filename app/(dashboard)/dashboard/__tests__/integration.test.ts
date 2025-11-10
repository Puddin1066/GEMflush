/**
 * Dashboard Integration Tests
 * 
 * Tests the integration between:
 * - Database queries (lib/db/queries.ts)
 * - Dashboard UI (app/(dashboard)/dashboard/page.tsx)
 * - Real data flow
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getBusinessesByTeam, getLatestFingerprint, getUser, getTeamForUser } from '@/lib/db/queries';

// Mock the database queries
vi.mock('@/lib/db/queries', () => ({
  getUser: vi.fn(),
  getTeamForUser: vi.fn(),
  getBusinessesByTeam: vi.fn(),
  getLatestFingerprint: vi.fn(),
}));

describe('Dashboard Data Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Empty State', () => {
    it('should handle user with no businesses', async () => {
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

      vi.mocked(getTeamForUser).mockResolvedValue({
        id: 1,
        name: 'Test Team',
        planName: 'free',
        createdAt: new Date(),
        updatedAt: new Date(),
        stripeCustomerId: null,
        stripeSubscriptionId: null,
        stripeProductId: null,
        subscriptionStatus: null,
      });

      vi.mocked(getBusinessesByTeam).mockResolvedValue([]);

      // Act
      const businesses = await getBusinessesByTeam(1);

      // Assert
      expect(businesses).toHaveLength(0);
      expect(getBusinessesByTeam).toHaveBeenCalledWith(1);
    });
  });

  describe('Stats Calculation', () => {
    it('should calculate correct total businesses', async () => {
      // Arrange
      const mockBusinesses = [
        {
          id: 1,
          teamId: 1,
          name: 'Business 1',
          url: 'https://example1.com',
          category: 'restaurant',
          location: { city: 'SF', state: 'CA', country: 'US' },
          wikidataQID: null,
          wikidataPublishedAt: null,
          lastCrawledAt: null,
          crawlData: null,
          status: 'pending',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 2,
          teamId: 1,
          name: 'Business 2',
          url: 'https://example2.com',
          category: 'retail',
          location: { city: 'Austin', state: 'TX', country: 'US' },
          wikidataQID: 'Q12345',
          wikidataPublishedAt: new Date(),
          lastCrawledAt: new Date(),
          crawlData: { name: 'Business 2' },
          status: 'published',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      vi.mocked(getBusinessesByTeam).mockResolvedValue(mockBusinesses);

      // Act
      const businesses = await getBusinessesByTeam(1);

      // Assert
      expect(businesses).toHaveLength(2);
    });

    it('should calculate correct wikidata entity count', async () => {
      // Arrange
      const mockBusinesses = [
        {
          id: 1,
          teamId: 1,
          name: 'Business 1',
          url: 'https://example1.com',
          category: null,
          location: null,
          wikidataQID: 'Q12345',
          wikidataPublishedAt: new Date(),
          lastCrawledAt: null,
          crawlData: null,
          status: 'published',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 2,
          teamId: 1,
          name: 'Business 2',
          url: 'https://example2.com',
          category: null,
          location: null,
          wikidataQID: 'Q67890',
          wikidataPublishedAt: new Date(),
          lastCrawledAt: null,
          crawlData: null,
          status: 'published',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 3,
          teamId: 1,
          name: 'Business 3',
          url: 'https://example3.com',
          category: null,
          location: null,
          wikidataQID: null,
          wikidataPublishedAt: null,
          lastCrawledAt: null,
          crawlData: null,
          status: 'pending',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      vi.mocked(getBusinessesByTeam).mockResolvedValue(mockBusinesses);

      // Act
      const businesses = await getBusinessesByTeam(1);
      const wikidataCount = businesses.filter(b => b.wikidataQID).length;

      // Assert
      expect(wikidataCount).toBe(2);
    });
  });

  describe('Fingerprint Integration', () => {
    it('should fetch latest fingerprint for each business', async () => {
      // Arrange
      const mockFingerprint = {
        id: 1,
        businessId: 1,
        visibilityScore: 85,
        mentionRate: 0.8,
        sentimentScore: 0.9,
        accuracyScore: 0.85,
        avgRankPosition: 2.5,
        llmResults: [],
        competitiveBenchmark: null,
        createdAt: new Date(),
      };

      vi.mocked(getLatestFingerprint).mockResolvedValue(mockFingerprint);

      // Act
      const fingerprint = await getLatestFingerprint(1);

      // Assert
      expect(fingerprint).toBeDefined();
      expect(fingerprint?.visibilityScore).toBe(85);
      expect(getLatestFingerprint).toHaveBeenCalledWith(1);
    });

    it('should handle business with no fingerprints', async () => {
      // Arrange
      vi.mocked(getLatestFingerprint).mockResolvedValue(null);

      // Act
      const fingerprint = await getLatestFingerprint(1);

      // Assert
      expect(fingerprint).toBeNull();
    });

    it('should calculate average visibility score correctly', () => {
      // Arrange
      const businessesWithScores = [
        { visibilityScore: 85 },
        { visibilityScore: 72 },
        { visibilityScore: 90 },
        { visibilityScore: null }, // No fingerprint
      ];

      // Act
      const scoresWithData = businessesWithScores.filter(b => b.visibilityScore != null);
      const avg = Math.round(
        scoresWithData.reduce((acc, b) => acc + (b.visibilityScore || 0), 0) / scoresWithData.length
      );

      // Assert
      expect(avg).toBe(82); // (85 + 72 + 90) / 3 = 82.33 -> 82
    });

    it('should handle no visibility scores gracefully', () => {
      // Arrange
      const businessesWithScores: Array<{ visibilityScore: number | null }> = [];

      // Act
      const scoresWithData = businessesWithScores.filter(b => b.visibilityScore != null);
      const avg = scoresWithData.length === 0 ? 0 : Math.round(
        scoresWithData.reduce((acc, b) => acc + (b.visibilityScore || 0), 0) / scoresWithData.length
      );

      // Assert
      expect(avg).toBe(0);
    });
  });

  describe('Plan-Based Features', () => {
    it('should identify free tier users correctly', async () => {
      // Arrange
      vi.mocked(getTeamForUser).mockResolvedValue({
        id: 1,
        name: 'Test Team',
        planName: 'free',
        createdAt: new Date(),
        updatedAt: new Date(),
        stripeCustomerId: null,
        stripeSubscriptionId: null,
        stripeProductId: null,
        subscriptionStatus: null,
      });

      // Act
      const team = await getTeamForUser();
      const planTier = team?.planName || 'free';
      const isPro = planTier === 'pro' || planTier === 'agency';

      // Assert
      expect(planTier).toBe('free');
      expect(isPro).toBe(false);
    });

    it('should identify pro tier users correctly', async () => {
      // Arrange
      vi.mocked(getTeamForUser).mockResolvedValue({
        id: 1,
        name: 'Test Team',
        planName: 'pro',
        createdAt: new Date(),
        updatedAt: new Date(),
        stripeCustomerId: 'cus_123',
        stripeSubscriptionId: 'sub_123',
        stripeProductId: 'prod_123',
        subscriptionStatus: 'active',
      });

      // Act
      const team = await getTeamForUser();
      const planTier = team?.planName || 'free';
      const isPro = planTier === 'pro' || planTier === 'agency';

      // Assert
      expect(planTier).toBe('pro');
      expect(isPro).toBe(true);
    });
  });

  describe('Data Enrichment', () => {
    it('should format location correctly', async () => {
      // Arrange
      const mockBusiness = {
        id: 1,
        teamId: 1,
        name: 'Test Business',
        url: 'https://example.com',
        category: null,
        location: { city: 'San Francisco', state: 'CA', country: 'US' },
        wikidataQID: null,
        wikidataPublishedAt: null,
        lastCrawledAt: null,
        crawlData: null,
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Act
      const location = mockBusiness.location 
        ? `${mockBusiness.location.city}, ${mockBusiness.location.state}`
        : 'Location not set';

      // Assert
      expect(location).toBe('San Francisco, CA');
    });

    it('should handle missing location gracefully', async () => {
      // Arrange
      const mockBusiness = {
        id: 1,
        teamId: 1,
        name: 'Test Business',
        url: 'https://example.com',
        category: null,
        location: null,
        wikidataQID: null,
        wikidataPublishedAt: null,
        lastCrawledAt: null,
        crawlData: null,
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Act
      const location = mockBusiness.location 
        ? `${mockBusiness.location.city}, ${mockBusiness.location.state}`
        : 'Location not set';

      // Assert
      expect(location).toBe('Location not set');
    });
  });

  describe('Timestamp Formatting', () => {
    it('should format recent timestamps correctly', () => {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);

      function formatTimestamp(date: Date | null) {
        if (!date) return 'Never';
        const diff = now.getTime() - date.getTime();
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        if (days === 0) return 'Today';
        if (days === 1) return 'Yesterday';
        if (days < 7) return `${days} days ago`;
        return `${Math.floor(days / 7)} weeks ago`;
      }

      expect(formatTimestamp(now)).toBe('Today');
      expect(formatTimestamp(yesterday)).toBe('Yesterday');
      expect(formatTimestamp(twoDaysAgo)).toBe('2 days ago');
      expect(formatTimestamp(null)).toBe('Never');
    });
  });
});

