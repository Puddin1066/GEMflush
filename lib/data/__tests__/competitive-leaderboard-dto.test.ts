/**
 * Unit Tests: Competitive Leaderboard DTO Transformation
 * 
 * Tests the toCompetitiveLeaderboardDTO function for:
 * - Correct transformation
 * - Market share calculations
 * - Competitor deduplication
 * - Market position determination
 * - Insights generation
 */

import { describe, it, expect } from 'vitest';
import { toCompetitiveLeaderboardDTO } from '../fingerprint-dto';
import type { CompetitiveLeaderboardDTO } from '../types';

describe('toCompetitiveLeaderboardDTO', () => {
  const createMockLeaderboard = (overrides?: any) => ({
    targetBusiness: {
      name: 'Test Business',
      rank: 1,
      mentionCount: 5,
      avgPosition: 1.5,
    },
    competitors: [
      {
        name: 'Competitor 1',
        mentionCount: 3,
        avgPosition: 2.0,
        appearsWithTarget: 2,
      },
      {
        name: 'Competitor 2',
        mentionCount: 2,
        avgPosition: 3.0,
        appearsWithTarget: 1,
      },
    ],
    totalRecommendationQueries: 10,
    ...overrides,
  });

  it('should transform leaderboard to DTO with correct structure', () => {
    const rawLeaderboard = createMockLeaderboard();
    const dto = toCompetitiveLeaderboardDTO(rawLeaderboard, 'Test Business');

    expect(dto).toMatchObject({
      targetBusiness: {
        name: 'Test Business',
        rank: 1,
        mentionCount: 5,
        mentionRate: expect.any(Number),
      },
      competitors: expect.arrayContaining([
        expect.objectContaining({
          name: expect.any(String),
          mentionCount: expect.any(Number),
          marketShare: expect.any(Number),
        }),
      ]),
      insights: expect.objectContaining({
        marketPosition: expect.any(String),
      }),
      totalQueries: 10,
    });
  });

  it('should calculate market share correctly', () => {
    const rawLeaderboard = createMockLeaderboard();
    const dto = toCompetitiveLeaderboardDTO(rawLeaderboard, 'Test Business');

    // Total mentions: 5 (target) + 3 (comp1) + 2 (comp2) = 10
    // Competitor market shares are calculated from total mentions
    // Competitor 1: 3/10 = 30%
    const comp1 = dto.competitors.find(c => c.name === 'Competitor 1');
    expect(comp1?.marketShare).toBe(30);

    // Competitor 2: 2/10 = 20%
    const comp2 = dto.competitors.find(c => c.name === 'Competitor 2');
    expect(comp2?.marketShare).toBe(20);

    // Target business has mentionRate, not marketShare
    // mentionRate = (mentionCount / totalQueries) * 100 = (5/10) * 100 = 50%
    expect(dto.targetBusiness.mentionRate).toBe(50);

    // Market shares (competitors only) should sum with target mentionCount to total
    const totalCompetitorMentions = dto.competitors.reduce((sum, c) => sum + c.mentionCount, 0);
    const totalMentions = dto.targetBusiness.mentionCount + totalCompetitorMentions;
    expect(totalMentions).toBe(10);
  });

  it('should assign ranks correctly', () => {
    const rawLeaderboard = createMockLeaderboard();
    const dto = toCompetitiveLeaderboardDTO(rawLeaderboard, 'Test Business');

    // Competitors should be ranked by mention count (descending)
    expect(dto.competitors[0].rank).toBe(1);
    expect(dto.competitors[1].rank).toBe(2);

    // Top competitor should have badge
    expect(dto.competitors[0].badge).toBe('top');
    expect(dto.competitors[1].badge).toBeUndefined();
  });

  it('should deduplicate competitors with similar names', () => {
    const rawLeaderboard = createMockLeaderboard({
      competitors: [
        {
          name: 'Competitor Inc',
          mentionCount: 2,
          avgPosition: 2.0,
          appearsWithTarget: 1,
        },
        {
          name: 'Competitor Inc.',
          mentionCount: 1,
          avgPosition: 3.0,
          appearsWithTarget: 1,
        },
        {
          name: 'The Competitor',
          mentionCount: 1,
          avgPosition: 4.0,
          appearsWithTarget: 0,
        },
      ],
    });

    const dto = toCompetitiveLeaderboardDTO(rawLeaderboard, 'Test Business');

    // Should deduplicate "Competitor Inc" and "Competitor Inc."
    // Normalization removes "Inc" suffix, so both become "competitor"
    // "The Competitor" also normalizes to "competitor" (removes "The" prefix)
    // So all three should deduplicate to one competitor with mentionCount = 4 (2+1+1)
    expect(dto.competitors.length).toBeLessThan(3);

    // Find deduplicated competitor (should have mentionCount = 4)
    const deduplicated = dto.competitors.find(c => c.mentionCount === 4);
    expect(deduplicated).toBeDefined();
  });

  it('should determine market position correctly', () => {
    // Leading position
    const leadingLeaderboard = createMockLeaderboard({
      targetBusiness: {
        name: 'Test Business',
        rank: 1,
        mentionCount: 8,
        avgPosition: 1.0,
      },
      competitors: [
        {
          name: 'Competitor 1',
          mentionCount: 2,
          avgPosition: 2.0,
          appearsWithTarget: 1,
        },
      ],
      totalRecommendationQueries: 10,
    });

    const leadingDTO = toCompetitiveLeaderboardDTO(leadingLeaderboard, 'Test Business');
    expect(leadingDTO.insights.marketPosition).toBe('leading');

    // Competitive position
    const competitiveLeaderboard = createMockLeaderboard({
      targetBusiness: {
        name: 'Test Business',
        rank: 2,
        mentionCount: 4,
        avgPosition: 2.0,
      },
      competitors: [
        {
          name: 'Competitor 1',
          mentionCount: 5,
          avgPosition: 1.0,
          appearsWithTarget: 3,
        },
      ],
      totalRecommendationQueries: 10,
    });

    const competitiveDTO = toCompetitiveLeaderboardDTO(competitiveLeaderboard, 'Test Business');
    expect(competitiveDTO.insights.marketPosition).toBe('competitive');

    // Emerging position
    const emergingLeaderboard = createMockLeaderboard({
      targetBusiness: {
        name: 'Test Business',
        rank: 3,
        mentionCount: 1,
        avgPosition: 3.0,
      },
      competitors: [
        {
          name: 'Competitor 1',
          mentionCount: 5,
          avgPosition: 1.0,
          appearsWithTarget: 0,
        },
        {
          name: 'Competitor 2',
          mentionCount: 4,
          avgPosition: 2.0,
          appearsWithTarget: 0,
        },
      ],
      totalRecommendationQueries: 10,
    });

    const emergingDTO = toCompetitiveLeaderboardDTO(emergingLeaderboard, 'Test Business');
    expect(emergingDTO.insights.marketPosition).toBe('emerging');
  });

  it('should calculate competitive gap correctly', () => {
    const rawLeaderboard = createMockLeaderboard({
      targetBusiness: {
        name: 'Test Business',
        rank: 2,
        mentionCount: 3,
        avgPosition: 2.0,
      },
      competitors: [
        {
          name: 'Top Competitor',
          mentionCount: 5,
          avgPosition: 1.0,
          appearsWithTarget: 2,
        },
      ],
      totalRecommendationQueries: 10,
    });

    const dto = toCompetitiveLeaderboardDTO(rawLeaderboard, 'Test Business');

    // Gap should be difference in mention count (only if competitor has more)
    // Since target has 3 and competitor has 5, gap = 5 - 3 = 2
    expect(dto.insights.competitiveGap).toBe(2);
    // topCompetitor is the name string, not an object
    expect(dto.insights.topCompetitor).toBe('Top Competitor');
  });

  it('should handle empty competitors array', () => {
    const rawLeaderboard = createMockLeaderboard({
      competitors: [],
    });

    const dto = toCompetitiveLeaderboardDTO(rawLeaderboard, 'Test Business');

    expect(dto.competitors).toEqual([]);
    // Target business has mentionRate, not marketShare
    // mentionRate = (5/10) * 100 = 50%
    expect(dto.targetBusiness.mentionRate).toBe(50);
    expect(dto.insights.marketPosition).toBe('leading');
  });

  it('should handle zero total queries', () => {
    const rawLeaderboard = createMockLeaderboard({
      totalRecommendationQueries: 0,
    });

    const dto = toCompetitiveLeaderboardDTO(rawLeaderboard, 'Test Business');

    // mentionRate should be 0 when totalQueries is 0
    expect(dto.targetBusiness.mentionRate).toBe(0);
    // Market shares calculated from total mentions, not total queries
    // If no mentions, market shares would be 0
    const totalMentions = dto.targetBusiness.mentionCount + 
      dto.competitors.reduce((sum, c) => sum + c.mentionCount, 0);
    if (totalMentions > 0) {
      // Market shares should still be calculated if there are mentions
      expect(dto.competitors[0]?.marketShare).toBeGreaterThanOrEqual(0);
    }
  });

  it('should round avgPosition to 1 decimal place', () => {
    const rawLeaderboard = createMockLeaderboard({
      competitors: [
        {
          name: 'Competitor 1',
          mentionCount: 3,
          avgPosition: 2.333333,
          appearsWithTarget: 2,
        },
      ],
    });

    const dto = toCompetitiveLeaderboardDTO(rawLeaderboard, 'Test Business');

    expect(dto.competitors[0].avgPosition).toBe(2.3);
  });

  it('should use business name from rawLeaderboard (not overridden)', () => {
    const rawLeaderboard = createMockLeaderboard({
      targetBusiness: {
        name: 'Old Name',
        rank: 1,
        mentionCount: 5,
        avgPosition: 1.5,
      },
    });

    const dto = toCompetitiveLeaderboardDTO(rawLeaderboard, 'New Business Name');

    // The function uses the name from rawLeaderboard.targetBusiness.name
    // The second parameter (businessName) is not used to override the name
    // It's used for other purposes (like in toFingerprintDetailDTO)
    expect(dto.targetBusiness.name).toBe('Old Name');
  });
});

