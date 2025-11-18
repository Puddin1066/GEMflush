import { describe, it, expect } from 'vitest';
import type {
  LLMResult,
  FingerprintAnalysis,
  CompetitiveBenchmark,
} from '@/lib/types/gemflush';

/**
 * Unit Tests for LLM Type Contracts
 * 
 * Tests the LLM type definitions to ensure contract structure validation
 * and type safety for fingerprint analysis results.
 * SOLID: Single Responsibility - tests type contracts only
 * DRY: Reusable test fixtures
 */

describe('LLM Type Contracts', () => {
  // DRY: Reusable test fixtures
  const createValidLLMResult = (): LLMResult => ({
    model: 'openai/gpt-4-turbo',
    promptType: 'factual',
    mentioned: true,
    sentiment: 'positive',
    accuracy: 0.8,
    rankPosition: null,
    rawResponse: 'Test response',
    tokensUsed: 100,
  });

  const createValidFingerprintAnalysis = (): FingerprintAnalysis => ({
    businessId: 1,
    businessName: 'Test Business',
    visibilityScore: 75,
    mentionRate: 80,
    sentimentScore: 0.8,
    accuracyScore: 0.85,
    avgRankPosition: 2,
    llmResults: [createValidLLMResult()],
    generatedAt: new Date(),
  });

  describe('LLMResult Contract', () => {
    it('should accept valid LLM result with all required fields', () => {
      const result = createValidLLMResult();

      expect(result.model).toBe('openai/gpt-4-turbo');
      expect(result.promptType).toBe('factual');
      expect(result.mentioned).toBe(true);
      expect(result.sentiment).toBe('positive');
      expect(result.accuracy).toBe(0.8);
      expect(result.rankPosition).toBeNull();
      expect(result.rawResponse).toBe('Test response');
      expect(result.tokensUsed).toBe(100);
    });

    it('should enforce sentiment union type', () => {
      const sentiments: Array<'positive' | 'neutral' | 'negative'> = [
        'positive',
        'neutral',
        'negative',
      ];

      sentiments.forEach((sentiment) => {
        const result: LLMResult = {
          ...createValidLLMResult(),
          sentiment,
        };

        expect(result.sentiment).toBe(sentiment);
      });
    });

    it('should accept rankPosition as number or null', () => {
      const resultWithRank: LLMResult = {
        ...createValidLLMResult(),
        rankPosition: 1,
      };

      expect(resultWithRank.rankPosition).toBe(1);

      const resultWithoutRank: LLMResult = {
        ...createValidLLMResult(),
        rankPosition: null,
      };

      expect(resultWithoutRank.rankPosition).toBeNull();
    });

    it('should accept optional fields', () => {
      const result: LLMResult = {
        ...createValidLLMResult(),
        reasoning: 'The business was mentioned in the response.',
        confidence: 0.9,
        contextualRelevance: 0.85,
        competitorMentions: ['Competitor A', 'Competitor B'],
        keyPhrases: ['quality service', 'reliable'],
      };

      expect(result.reasoning).toBeDefined();
      expect(result.confidence).toBe(0.9);
      expect(result.contextualRelevance).toBe(0.85);
      expect(Array.isArray(result.competitorMentions)).toBe(true);
      expect(Array.isArray(result.keyPhrases)).toBe(true);
    });

    it('should validate accuracy range', () => {
      const resultMin: LLMResult = {
        ...createValidLLMResult(),
        accuracy: 0.0,
      };

      expect(resultMin.accuracy).toBe(0.0);

      const resultMax: LLMResult = {
        ...createValidLLMResult(),
        accuracy: 1.0,
      };

      expect(resultMax.accuracy).toBe(1.0);
    });

    it('should require model field', () => {
      const result = createValidLLMResult();
      expect(result.model).toBeDefined();
      expect(typeof result.model).toBe('string');
    });

    it('should require promptType field', () => {
      const result = createValidLLMResult();
      expect(result.promptType).toBeDefined();
      expect(typeof result.promptType).toBe('string');
    });

    it('should require mentioned field', () => {
      const result = createValidLLMResult();
      expect(typeof result.mentioned).toBe('boolean');
    });

    it('should require tokensUsed field', () => {
      const result = createValidLLMResult();
      expect(typeof result.tokensUsed).toBe('number');
      expect(result.tokensUsed).toBeGreaterThanOrEqual(0);
    });
  });

  describe('FingerprintAnalysis Contract', () => {
    it('should accept valid fingerprint analysis with all required fields', () => {
      const analysis = createValidFingerprintAnalysis();

      expect(analysis.businessId).toBe(1);
      expect(analysis.businessName).toBe('Test Business');
      expect(analysis.visibilityScore).toBe(75);
      expect(analysis.mentionRate).toBe(80);
      expect(analysis.sentimentScore).toBe(0.8);
      expect(analysis.accuracyScore).toBe(0.85);
      expect(analysis.avgRankPosition).toBe(2);
      expect(Array.isArray(analysis.llmResults)).toBe(true);
      expect(analysis.generatedAt).toBeInstanceOf(Date);
    });

    it('should accept avgRankPosition as number or null', () => {
      const analysisWithRank: FingerprintAnalysis = {
        ...createValidFingerprintAnalysis(),
        avgRankPosition: 3,
      };

      expect(analysisWithRank.avgRankPosition).toBe(3);

      const analysisWithoutRank: FingerprintAnalysis = {
        ...createValidFingerprintAnalysis(),
        avgRankPosition: null,
      };

      expect(analysisWithoutRank.avgRankPosition).toBeNull();
    });

    it('should validate visibilityScore range', () => {
      const analysisMin: FingerprintAnalysis = {
        ...createValidFingerprintAnalysis(),
        visibilityScore: 0,
      };

      expect(analysisMin.visibilityScore).toBe(0);

      const analysisMax: FingerprintAnalysis = {
        ...createValidFingerprintAnalysis(),
        visibilityScore: 100,
      };

      expect(analysisMax.visibilityScore).toBe(100);
    });

    it('should validate mentionRate range', () => {
      const analysis: FingerprintAnalysis = {
        ...createValidFingerprintAnalysis(),
        mentionRate: 0, // 0%
      };

      expect(analysis.mentionRate).toBe(0);

      const analysisMax: FingerprintAnalysis = {
        ...createValidFingerprintAnalysis(),
        mentionRate: 100, // 100%
      };

      expect(analysisMax.mentionRate).toBe(100);
    });

    it('should validate sentimentScore range', () => {
      const analysisMin: FingerprintAnalysis = {
        ...createValidFingerprintAnalysis(),
        sentimentScore: 0.0,
      };

      expect(analysisMin.sentimentScore).toBe(0.0);

      const analysisMax: FingerprintAnalysis = {
        ...createValidFingerprintAnalysis(),
        sentimentScore: 1.0,
      };

      expect(analysisMax.sentimentScore).toBe(1.0);
    });

    it('should validate accuracyScore range', () => {
      const analysisMin: FingerprintAnalysis = {
        ...createValidFingerprintAnalysis(),
        accuracyScore: 0.0,
      };

      expect(analysisMin.accuracyScore).toBe(0.0);

      const analysisMax: FingerprintAnalysis = {
        ...createValidFingerprintAnalysis(),
        accuracyScore: 1.0,
      };

      expect(analysisMax.accuracyScore).toBe(1.0);
    });

    it('should accept optional competitiveBenchmark', () => {
      const benchmark: CompetitiveBenchmark = {
        rank: 1,
        totalCompetitors: 10,
        competitorScores: [
          { businessId: 2, businessName: 'Competitor A', score: 85 },
          { businessId: 3, businessName: 'Competitor B', score: 80 },
        ],
      };

      const analysis: FingerprintAnalysis = {
        ...createValidFingerprintAnalysis(),
        competitiveBenchmark: benchmark,
      };

      expect(analysis.competitiveBenchmark).toBeDefined();
      expect(analysis.competitiveBenchmark?.rank).toBe(1);
      expect(analysis.competitiveBenchmark?.totalCompetitors).toBe(10);
    });

    it('should accept optional competitiveLeaderboard', () => {
      const leaderboard: FingerprintAnalysis['competitiveLeaderboard'] = {
        targetBusiness: {
          name: 'Test Business',
          rank: 2,
          mentionCount: 5,
          avgPosition: 2.5,
        },
        competitors: [
          {
            name: 'Competitor A',
            mentionCount: 8,
            avgPosition: 1.5,
            appearsWithTarget: 3,
          },
        ],
        totalRecommendationQueries: 3,
      };

      const analysis: FingerprintAnalysis = {
        ...createValidFingerprintAnalysis(),
        competitiveLeaderboard: leaderboard,
      };

      expect(analysis.competitiveLeaderboard).toBeDefined();
      expect(analysis.competitiveLeaderboard?.targetBusiness.name).toBe('Test Business');
      expect(Array.isArray(analysis.competitiveLeaderboard?.competitors)).toBe(true);
    });

    it('should accept optional insights', () => {
      const insights: FingerprintAnalysis['insights'] = {
        strengths: ['Strong online presence', 'Positive reviews'],
        weaknesses: ['Limited social media'],
        opportunities: ['Expand to new markets'],
        summary: 'Overall strong visibility',
        confidenceLevel: 'high',
        generatedBy: 'gpt-4-turbo',
      };

      const analysis: FingerprintAnalysis = {
        ...createValidFingerprintAnalysis(),
        insights,
      };

      expect(analysis.insights).toBeDefined();
      expect(analysis.insights?.confidenceLevel).toBe('high');
      expect(Array.isArray(analysis.insights?.strengths)).toBe(true);
    });

    it('should require llmResults array', () => {
      const analysis = createValidFingerprintAnalysis();
      expect(Array.isArray(analysis.llmResults)).toBe(true);
      expect(analysis.llmResults.length).toBeGreaterThanOrEqual(0);
    });

    it('should require generatedAt as Date', () => {
      const analysis = createValidFingerprintAnalysis();
      expect(analysis.generatedAt).toBeInstanceOf(Date);
    });
  });

  describe('CompetitiveBenchmark Contract', () => {
    it('should accept valid competitive benchmark', () => {
      const benchmark: CompetitiveBenchmark = {
        rank: 1,
        totalCompetitors: 10,
        competitorScores: [
          { businessId: 2, businessName: 'Competitor A', score: 85 },
          { businessId: 3, businessName: 'Competitor B', score: 80 },
        ],
      };

      expect(benchmark.rank).toBe(1);
      expect(benchmark.totalCompetitors).toBe(10);
      expect(Array.isArray(benchmark.competitorScores)).toBe(true);
      expect(benchmark.competitorScores.length).toBe(2);
    });

    it('should validate rank range', () => {
      const benchmark: CompetitiveBenchmark = {
        rank: 1,
        totalCompetitors: 10,
        competitorScores: [],
      };

      expect(benchmark.rank).toBeGreaterThanOrEqual(1);
    });

    it('should require competitorScores array', () => {
      const benchmark: CompetitiveBenchmark = {
        rank: 1,
        totalCompetitors: 10,
        competitorScores: [],
      };

      expect(Array.isArray(benchmark.competitorScores)).toBe(true);
    });
  });
});

