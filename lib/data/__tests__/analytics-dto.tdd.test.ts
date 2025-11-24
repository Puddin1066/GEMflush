/**
 * TDD Test: Analytics DTO - Tests Drive Implementation
 * 
 * SPECIFICATION: Analytics Data Aggregation
 * 
 * As a user
 * I want to see analytics about my businesses
 * So that I can understand trends and performance
 * 
 * Acceptance Criteria:
 * 1. Analytics DTO aggregates visibility scores over time
 * 2. Calculates trend metrics (improving, declining, stable)
 * 3. Groups by category/location
 * 4. Provides comparative analytics
 * 5. Includes time-series data
 * 
 * TDD Cycle: RED → GREEN → REFACTOR
 * Tests written FIRST to drive implementation
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BusinessTestFactory } from '@/lib/test-helpers/tdd-helpers';

// Mock database queries
vi.mock('@/lib/db/queries', () => ({
  getBusinessesByTeam: vi.fn(),
  getFingerprintHistory: vi.fn(),
}));

describe('🔴 RED: Analytics DTO Specification', () => {
  /**
   * SPECIFICATION 1: Aggregate Visibility Scores Over Time
   * 
   * Given: Fingerprint history for businesses
   * When: Analytics DTO aggregates data
   * Then: Returns time-series visibility data
   */
  it('aggregates visibility scores over time', async () => {
    // Arrange: Fingerprint history
    const fingerprintHistory = [
      { createdAt: new Date('2025-01-01'), visibilityScore: 60 },
      { createdAt: new Date('2025-01-08'), visibilityScore: 65 },
      { createdAt: new Date('2025-01-15'), visibilityScore: 70 },
    ];

    // Arrange: Mock data
    const teamId = 1;
    const queries = await vi.importMock('@/lib/db/queries');
    queries.getBusinessesByTeam = vi.fn().mockResolvedValue([
      BusinessTestFactory.create({ id: 1 }),
    ]);
    queries.getFingerprintHistory = vi.fn().mockResolvedValue(fingerprintHistory);

    // Act: Aggregate analytics (TEST DRIVES IMPLEMENTATION)
    const { getAnalyticsDTO } = await import('../analytics-dto');
    const analytics = await getAnalyticsDTO(teamId, { timeRange: '30d' });

    // Assert: Verify time-series data (behavior: correct aggregation)
    expect(analytics.visibilityTrend).toMatchObject({
      dataPoints: expect.any(Array),
      trend: 'up',
      change: expect.any(Number),
      changePercent: expect.any(Number),
    });
  });

  /**
   * SPECIFICATION 2: Calculate Trend Metrics
   * 
   * Given: Multiple businesses with visibility scores
   * When: Analytics DTO calculates trends
   * Then: Returns improving, declining, and stable counts
   */
  it('calculates trend metrics correctly', async () => {
    // Arrange: Businesses with different trends
    const businesses = [
      BusinessTestFactory.create({ id: 1, visibilityScore: 75 }), // Improving
      BusinessTestFactory.create({ id: 2, visibilityScore: 50 }), // Declining
      BusinessTestFactory.create({ id: 3, visibilityScore: 65 }), // Stable
    ];

    // Arrange: Mock data
    const teamId = 1;
    const queries = await vi.importMock('@/lib/db/queries');
    queries.getBusinessesByTeam = vi.fn().mockResolvedValue(businesses);
    queries.getFingerprintHistory = vi.fn()
      .mockResolvedValueOnce([{ visibilityScore: 60, createdAt: new Date('2025-01-01') }, { visibilityScore: 75, createdAt: new Date('2025-01-15') }]) // Improving
      .mockResolvedValueOnce([{ visibilityScore: 70, createdAt: new Date('2025-01-01') }, { visibilityScore: 50, createdAt: new Date('2025-01-15') }]) // Declining
      .mockResolvedValueOnce([{ visibilityScore: 65, createdAt: new Date('2025-01-01') }, { visibilityScore: 66, createdAt: new Date('2025-01-15') }]); // Stable

    // Act: Calculate trends (TEST DRIVES IMPLEMENTATION)
    const { getAnalyticsDTO } = await import('../analytics-dto');
    const analytics = await getAnalyticsDTO(teamId);

    // Assert: Verify trend metrics (behavior: correct trend calculation)
    expect(analytics.trends).toMatchObject({
      improving: expect.any(Number),
      declining: expect.any(Number),
      stable: expect.any(Number),
      total: 3,
    });
  });

  /**
   * SPECIFICATION 3: Group Analytics by Category
   * 
   * Given: Businesses in different categories
   * When: Analytics DTO groups data
   * Then: Returns category-based analytics
   */
  it('groups analytics by category', async () => {
    // Arrange: Businesses in different categories
    const businesses = [
      BusinessTestFactory.create({ category: 'restaurant', visibilityScore: 70 }),
      BusinessTestFactory.create({ category: 'restaurant', visibilityScore: 80 }),
      BusinessTestFactory.create({ category: 'retail', visibilityScore: 60 }),
    ];

    // Arrange: Mock data
    const teamId = 1;
    const queries = await vi.importMock('@/lib/db/queries');
    queries.getBusinessesByTeam = vi.fn().mockResolvedValue(businesses);
    queries.getFingerprintHistory = vi.fn()
      .mockResolvedValueOnce([{ visibilityScore: 70, createdAt: new Date() }])
      .mockResolvedValueOnce([{ visibilityScore: 80, createdAt: new Date() }])
      .mockResolvedValueOnce([{ visibilityScore: 60, createdAt: new Date() }]);

    // Act: Group by category (TEST DRIVES IMPLEMENTATION)
    const { getAnalyticsDTO } = await import('../analytics-dto');
    const analytics = await getAnalyticsDTO(teamId, { groupBy: 'category' });

    // Assert: Verify category grouping (behavior: correct grouping)
    expect(analytics.byCategory).toBeDefined();
    if (analytics.byCategory) {
      expect(analytics.byCategory.restaurant).toMatchObject({
        count: 2,
        avgVisibilityScore: expect.any(Number),
      });
      expect(analytics.byCategory.retail).toMatchObject({
        count: 1,
        avgVisibilityScore: expect.any(Number),
      });
    }
  });
});

