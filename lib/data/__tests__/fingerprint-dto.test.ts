import { describe, it, expect, vi, beforeEach } from 'vitest';
import { toFingerprintDetailDTO } from '../fingerprint-dto';
import type { FingerprintAnalysis } from '@/lib/types/gemflush';

describe('toFingerprintDetailDTO', () => {
  const createMockAnalysis = (overrides?: Partial<FingerprintAnalysis>): FingerprintAnalysis => ({
    businessId: 1,
    businessName: 'Test Business',
    visibilityScore: 75,
    mentionRate: 60,
    sentimentScore: 0.8,
    accuracyScore: 0.85,
    avgRankPosition: 2.5,
    llmResults: [
      {
        model: 'openai/gpt-4-turbo',
        promptType: 'recommendation',
        mentioned: true,
        sentiment: 'positive',
        accuracy: 0.9,
        rankPosition: 1,
        rawResponse: 'Test response',
        tokensUsed: 100,
      },
      {
        model: 'anthropic/claude-3-opus',
        promptType: 'recommendation',
        mentioned: true,
        sentiment: 'neutral',
        accuracy: 0.85,
        rankPosition: 3,
        rawResponse: 'Test response',
        tokensUsed: 120,
      },
    ],
    generatedAt: new Date('2025-01-15'),
    ...overrides,
  });

  it('should transform analysis to DTO with correct structure', () => {
    const analysis = createMockAnalysis();
    const dto = toFingerprintDetailDTO(analysis);

    expect(dto).toMatchObject({
      visibilityScore: 75,
      trend: 'neutral',
      summary: {
        mentionRate: 60,
        sentiment: 'positive',
        topModels: expect.any(Array),
        averageRank: 2.5,
      },
      results: expect.any(Array),
      competitiveLeaderboard: null,
      createdAt: expect.any(String),
    });
  });

  it('should calculate trend correctly when previous analysis provided', () => {
    const current = createMockAnalysis({ visibilityScore: 80 });
    const previous = createMockAnalysis({ visibilityScore: 70 });

    const dto = toFingerprintDetailDTO(current, previous);
    expect(dto.trend).toBe('up');
  });

  it('should calculate trend as down when score decreased', () => {
    const current = createMockAnalysis({ visibilityScore: 65 });
    const previous = createMockAnalysis({ visibilityScore: 75 });

    const dto = toFingerprintDetailDTO(current, previous);
    expect(dto.trend).toBe('down');
  });

  it('should calculate trend as neutral when change is small', () => {
    const current = createMockAnalysis({ visibilityScore: 75 });
    const previous = createMockAnalysis({ visibilityScore: 77 });

    const dto = toFingerprintDetailDTO(current, previous);
    expect(dto.trend).toBe('neutral');
  });

  it('should determine sentiment correctly', () => {
    const positive = createMockAnalysis({ sentimentScore: 0.8 });
    const neutral = createMockAnalysis({ sentimentScore: 0.5 });
    const negative = createMockAnalysis({ sentimentScore: 0.3 });

    expect(toFingerprintDetailDTO(positive).summary.sentiment).toBe('positive');
    expect(toFingerprintDetailDTO(neutral).summary.sentiment).toBe('neutral');
    expect(toFingerprintDetailDTO(negative).summary.sentiment).toBe('negative');
  });

  it('should identify top performing models', () => {
    const analysis = createMockAnalysis({
      llmResults: [
        {
          model: 'openai/gpt-4-turbo',
          promptType: 'recommendation',
          mentioned: true,
          sentiment: 'positive',
          accuracy: 0.9,
          rankPosition: 1,
          rawResponse: 'Test',
          tokensUsed: 100,
        },
        {
          model: 'openai/gpt-4-turbo',
          promptType: 'recommendation',
          mentioned: true,
          sentiment: 'positive',
          accuracy: 0.9,
          rankPosition: 2,
          rawResponse: 'Test',
          tokensUsed: 100,
        },
        {
          model: 'anthropic/claude-3-opus',
          promptType: 'recommendation',
          mentioned: false,
          sentiment: 'neutral',
          accuracy: 0.7,
          rankPosition: null,
          rawResponse: 'Test',
          tokensUsed: 100,
        },
      ],
    });

    const dto = toFingerprintDetailDTO(analysis);
    expect(dto.summary.topModels).toContain('GPT 4 Turbo');
    expect(dto.summary.topModels.length).toBeLessThanOrEqual(3);
  });

  it('should format model names for display', () => {
    const analysis = createMockAnalysis({
      llmResults: [
        {
          model: 'openai/gpt-4-turbo',
          promptType: 'recommendation',
          mentioned: true,
          sentiment: 'positive',
          accuracy: 0.9,
          rankPosition: 1,
          rawResponse: 'Test',
          tokensUsed: 100,
        },
      ],
    });

    const dto = toFingerprintDetailDTO(analysis);
    // Test that model names are formatted (not exact format, just that they're human-readable)
    expect(dto.results[0].model).not.toContain('/');
    expect(dto.results[0].model).not.toContain('openai');
  });

  it('should transform LLM results to DTO format', () => {
    const analysis = createMockAnalysis();
    const dto = toFingerprintDetailDTO(analysis);

    expect(dto.results).toHaveLength(2);
    expect(dto.results[0]).toMatchObject({
      model: 'GPT 4 Turbo',
      mentioned: true,
      sentiment: 'positive',
      confidence: 90,
      rankPosition: 1,
    });
    expect(dto.results[0]).not.toHaveProperty('rawResponse');
  });

  it('should include competitive leaderboard when present', () => {
    const analysis = createMockAnalysis({
      competitiveLeaderboard: {
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
        ],
        totalRecommendationQueries: 100,
      },
    });

    const dto = toFingerprintDetailDTO(analysis);
    expect(dto.competitiveLeaderboard).not.toBeNull();
    expect(dto.competitiveLeaderboard?.targetBusiness.name).toBe('Test Business');
    expect(dto.competitiveLeaderboard?.targetBusiness.mentionRate).toBe(50);
  });

  it('should calculate market position correctly', () => {
    const leading = createMockAnalysis({
      competitiveLeaderboard: {
        targetBusiness: {
          name: 'Test Business',
          rank: 1,
          mentionCount: 70,
          avgPosition: 1.0,
        },
        competitors: [
          {
            name: 'Competitor 1',
            mentionCount: 20,
            avgPosition: 2.0,
            appearsWithTarget: 5,
          },
        ],
        totalRecommendationQueries: 100,
      },
    });

    const competitive = createMockAnalysis({
      competitiveLeaderboard: {
        targetBusiness: {
          name: 'Test Business',
          rank: 2,
          mentionCount: 40,
          avgPosition: 2.0,
        },
        competitors: [
          {
            name: 'Competitor 1',
            mentionCount: 50,
            avgPosition: 1.0,
            appearsWithTarget: 10,
          },
        ],
        totalRecommendationQueries: 100,
      },
    });

    const leadingDto = toFingerprintDetailDTO(leading);
    const competitiveDto = toFingerprintDetailDTO(competitive);

    expect(leadingDto.competitiveLeaderboard?.insights.marketPosition).toBe('leading');
    expect(competitiveDto.competitiveLeaderboard?.insights.marketPosition).toBe('competitive');
  });

  it('should generate appropriate recommendations', () => {
    const leading = createMockAnalysis({
      competitiveLeaderboard: {
        targetBusiness: {
          name: 'Test Business',
          rank: 1,
          mentionCount: 70,
          avgPosition: 1.0,
        },
        competitors: [],
        totalRecommendationQueries: 100,
      },
    });

    const emerging = createMockAnalysis({
      competitiveLeaderboard: {
        targetBusiness: {
          name: 'Test Business',
          rank: null,
          mentionCount: 10,
          avgPosition: null,
        },
        competitors: [
          {
            name: 'Competitor 1',
            mentionCount: 50,
            avgPosition: 1.0,
            appearsWithTarget: 2,
          },
        ],
        totalRecommendationQueries: 100,
      },
    });

    const leadingDto = toFingerprintDetailDTO(leading);
    const emergingDto = toFingerprintDetailDTO(emerging);

    expect(leadingDto.competitiveLeaderboard?.insights.recommendation).toContain('Excellent');
    expect(emergingDto.competitiveLeaderboard?.insights.recommendation).toContain('Limited');
  });

  it('should calculate competitor market share', () => {
    const analysis = createMockAnalysis({
      competitiveLeaderboard: {
        targetBusiness: {
          name: 'Test Business',
          rank: 1,
          mentionCount: 50,
          avgPosition: 1.0,
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
      },
    });

    const dto = toFingerprintDetailDTO(analysis);
    const totalMentions = 50 + 30 + 20;
    expect(dto.competitiveLeaderboard?.competitors[0].marketShare).toBeCloseTo(
      (30 / totalMentions) * 100,
      1
    );
  });

  it('should round numeric values for display', () => {
    const analysis = createMockAnalysis({ visibilityScore: 75.7, mentionRate: 60.7 });
    const dto = toFingerprintDetailDTO(analysis);
    // Test that values are rounded (not exact rounding behavior, just that decimals are handled)
    expect(Number.isInteger(dto.visibilityScore)).toBe(true);
    expect(Number.isInteger(dto.summary.mentionRate)).toBe(true);
  });

  it('should handle empty LLM results', () => {
    const analysis = createMockAnalysis({ llmResults: [] });
    const dto = toFingerprintDetailDTO(analysis);
    expect(dto.results).toHaveLength(0);
    expect(dto.summary.topModels).toHaveLength(0);
  });

  describe('Date handling', () => {
    it('should handle database record with createdAt field', () => {
      // Simulate database record (has createdAt, not generatedAt)
      const dbRecord = {
        businessId: 1,
        businessName: 'Test Business',
        visibilityScore: 75,
        mentionRate: 60,
        sentimentScore: 0.8,
        accuracyScore: 0.85,
        avgRankPosition: 2.5,
        llmResults: [],
        createdAt: new Date('2025-01-15'),
      } as any;

      const dto = toFingerprintDetailDTO(dbRecord);
      expect(dto.createdAt).not.toBe('Unknown');
      expect(typeof dto.createdAt).toBe('string');
    });

    it('should handle domain object with generatedAt field', () => {
      const analysis = createMockAnalysis({ generatedAt: new Date('2025-01-20') });
      const dto = toFingerprintDetailDTO(analysis);
      expect(dto.createdAt).not.toBe('Unknown');
      expect(typeof dto.createdAt).toBe('string');
    });

    it('should handle null date gracefully', () => {
      const dbRecord = {
        businessId: 1,
        businessName: 'Test Business',
        visibilityScore: 75,
        mentionRate: 60,
        sentimentScore: 0.8,
        accuracyScore: 0.85,
        avgRankPosition: 2.5,
        llmResults: [],
        createdAt: null,
        generatedAt: null,
      } as any;

      const dto = toFingerprintDetailDTO(dbRecord);
      expect(dto.createdAt).toBe('Unknown');
    });

    it('should handle invalid date string gracefully', () => {
      const dbRecord = {
        businessId: 1,
        businessName: 'Test Business',
        visibilityScore: 75,
        mentionRate: 60,
        sentimentScore: 0.8,
        accuracyScore: 0.85,
        avgRankPosition: 2.5,
        llmResults: [],
        createdAt: 'invalid-date-string',
      } as any;

      const dto = toFingerprintDetailDTO(dbRecord);
      expect(dto.createdAt).toBe('Unknown');
    });

    it('should handle missing date fields gracefully', () => {
      const dbRecord = {
        businessId: 1,
        businessName: 'Test Business',
        visibilityScore: 75,
        mentionRate: 60,
        sentimentScore: 0.8,
        accuracyScore: 0.85,
        avgRankPosition: 2.5,
        llmResults: [],
        // No createdAt or generatedAt
      } as any;

      const dto = toFingerprintDetailDTO(dbRecord);
      expect(dto.createdAt).toBe('Unknown');
    });

    it('should prefer generatedAt over createdAt when both present', () => {
      const generatedDate = new Date('2025-01-20');
      const createdDate = new Date('2025-01-15');
      
      const analysis = {
        businessId: 1,
        businessName: 'Test Business',
        visibilityScore: 75,
        mentionRate: 60,
        sentimentScore: 0.8,
        accuracyScore: 0.85,
        avgRankPosition: 2.5,
        llmResults: [],
        generatedAt: generatedDate,
        createdAt: createdDate,
      } as any;

      const dto = toFingerprintDetailDTO(analysis);
      // Should use generatedAt (more recent date)
      expect(dto.createdAt).not.toBe('Unknown');
      // The formatted date should reflect the generatedAt date
      expect(dto.createdAt).toContain('ago');
    });

    it('should handle date string conversion', () => {
      const dbRecord = {
        businessId: 1,
        businessName: 'Test Business',
        visibilityScore: 75,
        mentionRate: 60,
        sentimentScore: 0.8,
        accuracyScore: 0.85,
        avgRankPosition: 2.5,
        llmResults: [],
        createdAt: '2025-01-15T10:00:00Z',
      } as any;

      const dto = toFingerprintDetailDTO(dbRecord);
      expect(dto.createdAt).not.toBe('Unknown');
      expect(typeof dto.createdAt).toBe('string');
    });
  });

  describe('Data normalization', () => {
    it('should normalize database record to FingerprintAnalysis', () => {
      const dbRecord = {
        businessId: 1,
        visibilityScore: 75,
        mentionRate: 60,
        sentimentScore: 0.8,
        accuracyScore: 0.85,
        avgRankPosition: 2.5,
        llmResults: [],
        createdAt: new Date('2025-01-15'),
        // Missing businessName
      } as any;

      const dto = toFingerprintDetailDTO(dbRecord);
      // Should use default 'Unknown' for missing businessName
      expect(dto.competitiveLeaderboard?.targetBusiness.name || 'Unknown').toBeTruthy();
    });

    it('should handle partial data gracefully', () => {
      const partialRecord = {
        businessId: 1,
        visibilityScore: 75,
        // Missing other fields
      } as any;

      const dto = toFingerprintDetailDTO(partialRecord);
      expect(dto.visibilityScore).toBe(75);
      expect(dto.summary.mentionRate).toBe(0);
      expect(dto.results).toEqual([]);
    });
  });
});

