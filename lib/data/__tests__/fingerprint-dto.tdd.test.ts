/**
 * TDD Test: Fingerprint DTO - Tests Drive Implementation
 * 
 * SPECIFICATION: Fingerprint Data Transformation
 * 
 * As a user
 * I want fingerprint data transformed to DTOs
 * So that I can display fingerprint analysis in the UI
 * 
 * IMPORTANT: These tests specify DESIRED behavior for fingerprint DTO transformation.
 * Tests verify that transformation works correctly for UI display.
 * 
 * TDD Cycle: RED → GREEN → REFACTOR
 * Tests written to specify desired DTO transformation behavior
 */

import { describe, it, expect } from 'vitest';
import {
  toFingerprintDetailDTO,
  toCompetitiveLeaderboardDTO,
  toFingerprintHistoryDTOs,
} from '../fingerprint-dto';
import type { FingerprintAnalysis } from '@/lib/types/gemflush';

describe('🔴 RED: Fingerprint DTO - Desired Behavior Specification', () => {
  /**
   * SPECIFICATION 1: toFingerprintDetailDTO - MUST Transform Analysis to DTO
   * 
   * DESIRED BEHAVIOR: toFingerprintDetailDTO() MUST transform FingerprintAnalysis
   * to FingerprintDetailDTO with UI-friendly fields.
   */
  describe('toFingerprintDetailDTO', () => {
    it('MUST transform fingerprint analysis to detail DTO', () => {
      // Arrange: Fingerprint analysis
      const analysis: FingerprintAnalysis = {
        businessId: 1,
        businessName: 'Test Business',
        visibilityScore: 75,
        mentionRate: 60,
        sentimentScore: 0.8,
        accuracyScore: 0.9,
        avgRankPosition: 2,
        llmResults: [
          {
            model: 'openai/gpt-4-turbo',
            promptType: 'factual',
            mentioned: true,
            sentiment: 'positive',
            accuracy: 0.9,
            rankPosition: 1,
          },
        ],
        generatedAt: new Date('2024-01-01'),
        competitiveLeaderboard: null,
        competitiveBenchmark: null,
        insights: [],
      };

      // Act: Transform to DTO (TEST SPECIFIES DESIRED BEHAVIOR)
      const dto = toFingerprintDetailDTO(analysis);

      // Assert: SPECIFICATION - MUST return complete DTO
      expect(dto.visibilityScore).toBe(75);
      expect(dto.summary.mentionRate).toBe(60);
      expect(dto.summary.sentiment).toBe('positive');
      expect(dto.results).toHaveLength(1);
      expect(dto.results[0].model).toBeDefined();
    });

    it('MUST calculate trend from previous analysis', () => {
      // Arrange: Current and previous analysis
      const current: FingerprintAnalysis = {
        businessId: 1,
        businessName: 'Test Business',
        visibilityScore: 80,
        mentionRate: 70,
        sentimentScore: 0.8,
        accuracyScore: 0.9,
        avgRankPosition: 1,
        llmResults: [],
        generatedAt: new Date('2024-01-02'),
        competitiveLeaderboard: null,
        competitiveBenchmark: null,
        insights: [],
      };

      const previous: FingerprintAnalysis = {
        ...current,
        visibilityScore: 70, // 10 point increase
        generatedAt: new Date('2024-01-01'),
      };

      // Act: Transform with previous (TEST SPECIFIES DESIRED BEHAVIOR)
      const dto = toFingerprintDetailDTO(current, previous);

      // Assert: SPECIFICATION - MUST calculate trend
      expect(dto.trend).toBe('up'); // 10 point increase > 5 threshold
    });

    it('MUST handle missing previous analysis with neutral trend', () => {
      // Arrange: Analysis without previous
      const analysis: FingerprintAnalysis = {
        businessId: 1,
        businessName: 'Test Business',
        visibilityScore: 75,
        mentionRate: 60,
        sentimentScore: 0.8,
        accuracyScore: 0.9,
        avgRankPosition: 2,
        llmResults: [],
        generatedAt: new Date('2024-01-01'),
        competitiveLeaderboard: null,
        competitiveBenchmark: null,
        insights: [],
      };

      // Act: Transform without previous (TEST SPECIFIES DESIRED BEHAVIOR)
      const dto = toFingerprintDetailDTO(analysis);

      // Assert: SPECIFICATION - MUST default to neutral trend
      expect(dto.trend).toBe('neutral');
    });

    it('MUST format model names for display', () => {
      // Arrange: Analysis with multiple models (both mentioned)
      const analysis: FingerprintAnalysis = {
        businessId: 1,
        businessName: 'Test Business',
        visibilityScore: 75,
        mentionRate: 60,
        sentimentScore: 0.8,
        accuracyScore: 0.9,
        avgRankPosition: 2,
        llmResults: [
          {
            model: 'openai/gpt-4-turbo',
            promptType: 'factual',
            mentioned: true, // Must be mentioned to count
            sentiment: 'positive',
            accuracy: 0.9,
          },
          {
            model: 'anthropic/claude-3-opus',
            promptType: 'opinion',
            mentioned: true, // Must be mentioned to count
            sentiment: 'positive',
            accuracy: 0.85,
          },
        ],
        generatedAt: new Date('2024-01-01'),
        competitiveLeaderboard: null,
        competitiveBenchmark: null,
        insights: [],
      };

      // Act: Transform to DTO (TEST SPECIFIES DESIRED BEHAVIOR)
      const dto = toFingerprintDetailDTO(analysis);

      // Assert: SPECIFICATION - MUST format model names and include in topModels
      // topModels only includes models that mentioned the business
      expect(dto.summary.topModels.length).toBeGreaterThan(0);
      // Check that at least one formatted model name appears
      const allModelNames = dto.results.map(r => r.model);
      expect(allModelNames.some(name => name.includes('GPT') || name.includes('Claude'))).toBe(true);
    });

    it('MUST determine sentiment from sentiment score', () => {
      // Arrange: Analysis with different sentiment scores
      const positiveAnalysis: FingerprintAnalysis = {
        businessId: 1,
        businessName: 'Test Business',
        visibilityScore: 75,
        mentionRate: 60,
        sentimentScore: 0.8, // > 0.7 = positive
        accuracyScore: 0.9,
        avgRankPosition: 2,
        llmResults: [],
        generatedAt: new Date('2024-01-01'),
        competitiveLeaderboard: null,
        competitiveBenchmark: null,
        insights: [],
      };

      const negativeAnalysis: FingerprintAnalysis = {
        ...positiveAnalysis,
        sentimentScore: 0.3, // < 0.4 = negative
      };

      const neutralAnalysis: FingerprintAnalysis = {
        ...positiveAnalysis,
        sentimentScore: 0.5, // 0.4-0.7 = neutral
      };

      // Act: Transform to DTOs (TEST SPECIFIES DESIRED BEHAVIOR)
      const positiveDto = toFingerprintDetailDTO(positiveAnalysis);
      const negativeDto = toFingerprintDetailDTO(negativeAnalysis);
      const neutralDto = toFingerprintDetailDTO(neutralAnalysis);

      // Assert: SPECIFICATION - MUST determine sentiment correctly
      expect(positiveDto.summary.sentiment).toBe('positive');
      expect(negativeDto.summary.sentiment).toBe('negative');
      expect(neutralDto.summary.sentiment).toBe('neutral');
    });

    it('MUST handle database createdAt field', () => {
      // Arrange: Analysis with createdAt (database format)
      const analysis = {
        businessId: 1,
        businessName: 'Test Business',
        visibilityScore: 75,
        mentionRate: 60,
        sentimentScore: 0.8,
        accuracyScore: 0.9,
        avgRankPosition: 2,
        llmResults: [],
        createdAt: new Date('2024-01-01'), // Database field
        competitiveLeaderboard: null,
        competitiveBenchmark: null,
        insights: [],
      };

      // Act: Transform to DTO (TEST SPECIFIES DESIRED BEHAVIOR)
      const dto = toFingerprintDetailDTO(analysis);

      // Assert: SPECIFICATION - MUST handle createdAt
      expect(dto.createdAt).toBeDefined();
      expect(dto.createdAt).not.toBe('Unknown');
    });

    it('MUST handle invalid dates gracefully', () => {
      // Arrange: Analysis with invalid date
      const analysis = {
        businessId: 1,
        businessName: 'Test Business',
        visibilityScore: 75,
        mentionRate: 60,
        sentimentScore: 0.8,
        accuracyScore: 0.9,
        avgRankPosition: 2,
        llmResults: [],
        generatedAt: null, // Invalid date
        competitiveLeaderboard: null,
        competitiveBenchmark: null,
        insights: [],
      };

      // Act: Transform to DTO (TEST SPECIFIES DESIRED BEHAVIOR)
      const dto = toFingerprintDetailDTO(analysis);

      // Assert: SPECIFICATION - MUST handle invalid dates
      expect(dto.createdAt).toBe('Unknown');
    });
  });

  /**
   * SPECIFICATION 2: toCompetitiveLeaderboardDTO - MUST Transform Leaderboard
   * 
   * DESIRED BEHAVIOR: toCompetitiveLeaderboardDTO() MUST transform competitive
   * leaderboard data to DTO with insights and recommendations.
   */
  describe('toCompetitiveLeaderboardDTO', () => {
    it('MUST transform competitive leaderboard to DTO', () => {
      // Arrange: Competitive leaderboard
      const leaderboard = {
        targetBusiness: {
          name: 'Test Business',
          rank: 1,
          mentionCount: 50,
          avgPosition: 1.5,
        },
        competitors: [
          {
            name: 'Competitor 1',
            mentionCount: 30,
            avgPosition: 2.0,
            appearsWithTarget: 10,
          },
          {
            name: 'Competitor 2',
            mentionCount: 20,
            avgPosition: 3.0,
            appearsWithTarget: 5,
          },
        ],
        totalRecommendationQueries: 100,
      };

      // Act: Transform to DTO (TEST SPECIFIES DESIRED BEHAVIOR)
      const dto = toCompetitiveLeaderboardDTO(leaderboard, 'Test Business');

      // Assert: SPECIFICATION - MUST return complete DTO
      expect(dto.targetBusiness.name).toBe('Test Business');
      expect(dto.targetBusiness.mentionRate).toBe(50); // 50/100 * 100
      expect(dto.competitors).toHaveLength(2);
      expect(dto.insights.marketPosition).toBeDefined();
      expect(dto.insights.recommendation).toBeDefined();
    });

    it('MUST determine market position as leading when mention rate >= 60%', () => {
      // Arrange: Leaderboard with high mention rate
      const leaderboard = {
        targetBusiness: {
          name: 'Test Business',
          rank: 1,
          mentionCount: 70, // 70% mention rate
          avgPosition: 1.0,
        },
        competitors: [],
        totalRecommendationQueries: 100,
      };

      // Act: Transform to DTO (TEST SPECIFIES DESIRED BEHAVIOR)
      const dto = toCompetitiveLeaderboardDTO(leaderboard, 'Test Business');

      // Assert: SPECIFICATION - MUST determine leading position
      expect(dto.insights.marketPosition).toBe('leading');
    });

    it('MUST determine market position as competitive when mention rate 30-60% and not leading', () => {
      // Arrange: Leaderboard with medium mention rate but competitor ahead
      // Logic: If targetMentions > topCompetitorMentions, it's leading
      // So for competitive, we need mention rate 30-60% AND competitor has more mentions
      const leaderboard = {
        targetBusiness: {
          name: 'Test Business',
          rank: 2,
          mentionCount: 45, // 45% mention rate (30-60%)
          avgPosition: 2.0,
        },
        competitors: [
          {
            name: 'Competitor 1',
            mentionCount: 50, // More mentions than target
            avgPosition: 1.5,
            appearsWithTarget: 10,
          },
        ],
        totalRecommendationQueries: 100,
      };

      // Act: Transform to DTO (TEST SPECIFIES DESIRED BEHAVIOR)
      const dto = toCompetitiveLeaderboardDTO(leaderboard, 'Test Business');

      // Assert: SPECIFICATION - MUST determine competitive position
      // 45% mention rate (30-60%) and competitor has more mentions = competitive
      expect(dto.insights.marketPosition).toBe('competitive');
    });

    it('MUST determine market position as emerging when mention rate < 30%', () => {
      // Arrange: Leaderboard with low mention rate
      const leaderboard = {
        targetBusiness: {
          name: 'Test Business',
          rank: 3,
          mentionCount: 20, // 20% mention rate
          avgPosition: 3.0,
        },
        competitors: [
          {
            name: 'Competitor 1',
            mentionCount: 50,
            avgPosition: 1.0,
            appearsWithTarget: 5,
          },
        ],
        totalRecommendationQueries: 100,
      };

      // Act: Transform to DTO (TEST SPECIFIES DESIRED BEHAVIOR)
      const dto = toCompetitiveLeaderboardDTO(leaderboard, 'Test Business');

      // Assert: SPECIFICATION - MUST determine emerging position
      expect(dto.insights.marketPosition).toBe('emerging');
    });

    it('MUST deduplicate competitors by normalized name', () => {
      // Arrange: Leaderboard with duplicate competitors
      const leaderboard = {
        targetBusiness: {
          name: 'Test Business',
          rank: 1,
          mentionCount: 50,
          avgPosition: 1.0,
        },
        competitors: [
          {
            name: 'Competitor Inc',
            mentionCount: 20,
            avgPosition: 2.0,
            appearsWithTarget: 5,
          },
          {
            name: 'Competitor LLC',
            mentionCount: 15,
            avgPosition: 2.5,
            appearsWithTarget: 3,
          },
        ],
        totalRecommendationQueries: 100,
      };

      // Act: Transform to DTO (TEST SPECIFIES DESIRED BEHAVIOR)
      const dto = toCompetitiveLeaderboardDTO(leaderboard, 'Test Business');

      // Assert: SPECIFICATION - MUST deduplicate competitors
      // Both "Competitor Inc" and "Competitor LLC" should be normalized to "competitor"
      // and merged into one entry with combined metrics
      expect(dto.competitors.length).toBeLessThanOrEqual(2);
    });

    it('MUST calculate competitive gap when target is not leading', () => {
      // Arrange: Leaderboard with competitor ahead
      const leaderboard = {
        targetBusiness: {
          name: 'Test Business',
          rank: 2,
          mentionCount: 30,
          avgPosition: 2.0,
        },
        competitors: [
          {
            name: 'Top Competitor',
            mentionCount: 50,
            avgPosition: 1.0,
            appearsWithTarget: 10,
          },
        ],
        totalRecommendationQueries: 100,
      };

      // Act: Transform to DTO (TEST SPECIFIES DESIRED BEHAVIOR)
      const dto = toCompetitiveLeaderboardDTO(leaderboard, 'Test Business');

      // Assert: SPECIFICATION - MUST calculate competitive gap
      expect(dto.insights.competitiveGap).toBe(20); // 50 - 30
      expect(dto.insights.topCompetitor).toBe('Top Competitor');
    });
  });

  /**
   * SPECIFICATION 3: toFingerprintHistoryDTOs - MUST Transform History Array
   * 
   * DESIRED BEHAVIOR: toFingerprintHistoryDTOs() MUST transform fingerprint
   * history array to DTOs with formatted dates and scores.
   */
  describe('toFingerprintHistoryDTOs', () => {
    it('MUST transform fingerprint history array to DTOs', () => {
      // Arrange: Fingerprint history
      const fingerprints = [
        {
          id: 1,
          visibilityScore: 75,
          mentionRate: 60,
          sentimentScore: 0.8,
          accuracyScore: 0.9,
          avgRankPosition: 2.5,
          createdAt: new Date('2024-01-01'),
        },
        {
          id: 2,
          visibilityScore: 80,
          mentionRate: 70,
          sentimentScore: 0.85,
          accuracyScore: 0.95,
          avgRankPosition: 1.5,
          createdAt: new Date('2024-01-02'),
        },
      ];

      // Act: Transform to DTOs (TEST SPECIFIES DESIRED BEHAVIOR)
      const dtos = toFingerprintHistoryDTOs(fingerprints);

      // Assert: SPECIFICATION - MUST return array of DTOs
      expect(dtos).toHaveLength(2);
      expect(dtos[0].id).toBe(1);
      expect(dtos[0].visibilityScore).toBe(75);
      expect(dtos[0].mentionRate).toBe(60);
      expect(dtos[0].sentimentScore).toBe(80); // 0.8 * 100
      expect(dtos[0].accuracyScore).toBe(90); // 0.9 * 100
      expect(dtos[0].avgRankPosition).toBe(2.5);
      expect(dtos[0].date).toBe('2024-01-01T00:00:00.000Z');
    });

    it('MUST handle string dates', () => {
      // Arrange: Fingerprint with string date
      const fingerprints = [
        {
          id: 1,
          visibilityScore: 75,
          mentionRate: 60,
          sentimentScore: 0.8,
          accuracyScore: 0.9,
          avgRankPosition: 2.5,
          createdAt: '2024-01-01T00:00:00.000Z',
        },
      ];

      // Act: Transform to DTOs (TEST SPECIFIES DESIRED BEHAVIOR)
      const dtos = toFingerprintHistoryDTOs(fingerprints);

      // Assert: SPECIFICATION - MUST handle string dates
      expect(dtos[0].date).toBe('2024-01-01T00:00:00.000Z');
    });

    it('MUST handle null scores', () => {
      // Arrange: Fingerprint with null scores
      const fingerprints = [
        {
          id: 1,
          visibilityScore: null,
          mentionRate: null,
          sentimentScore: null,
          accuracyScore: null,
          avgRankPosition: null,
          createdAt: new Date('2024-01-01'),
        },
      ];

      // Act: Transform to DTOs (TEST SPECIFIES DESIRED BEHAVIOR)
      const dtos = toFingerprintHistoryDTOs(fingerprints);

      // Assert: SPECIFICATION - MUST handle null scores
      expect(dtos[0].visibilityScore).toBeNull();
      expect(dtos[0].mentionRate).toBeNull();
      expect(dtos[0].sentimentScore).toBeNull();
      expect(dtos[0].accuracyScore).toBeNull();
      expect(dtos[0].avgRankPosition).toBeNull();
    });

    it('MUST round scores appropriately', () => {
      // Arrange: Fingerprint with decimal scores
      const fingerprints = [
        {
          id: 1,
          visibilityScore: 75.7,
          mentionRate: 60.3,
          sentimentScore: 0.856,
          accuracyScore: 0.923,
          avgRankPosition: 2.456,
          createdAt: new Date('2024-01-01'),
        },
      ];

      // Act: Transform to DTOs (TEST SPECIFIES DESIRED BEHAVIOR)
      const dtos = toFingerprintHistoryDTOs(fingerprints);

      // Assert: SPECIFICATION - MUST round scores
      expect(dtos[0].mentionRate).toBe(60); // Rounded
      expect(dtos[0].sentimentScore).toBe(86); // 0.856 * 100 = 85.6, rounded to 86
      expect(dtos[0].accuracyScore).toBe(92); // 0.923 * 100 = 92.3, rounded to 92
      expect(dtos[0].avgRankPosition).toBe(2.5); // 2.456 rounded to 1 decimal = 2.5
    });
  });
});

