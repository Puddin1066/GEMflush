import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { LLMFingerprinter } from '../fingerprinter';
import { Business } from '@/lib/db/schema';
import { openRouterClient } from '../openrouter';

/**
 * Integration Tests for LLMFingerprinter
 * 
 * Tests the full fingerprint flow with mocked OpenRouter client
 * SOLID: Single Responsibility - tests integration behavior
 * DRY: Reusable test fixtures
 */

// Mock OpenRouter client
vi.mock('../openrouter', () => ({
  openRouterClient: {
    query: vi.fn(),
  },
}));

describe('LLMFingerprinter Integration', () => {
  let fingerprinter: LLMFingerprinter;
  const mockQuery = vi.mocked(openRouterClient.query);

  const mockBusiness: Business = {
    id: 1,
    teamId: 1,
    name: 'Test Coffee Shop',
    url: 'https://testcoffee.com',
    category: 'restaurant',
    location: {
      city: 'San Francisco',
      state: 'CA',
      country: 'US',
      coordinates: {
        lat: 37.7749,
        lng: -122.4194,
      },
    },
    wikidataQID: null,
    wikidataPublishedAt: null,
    lastCrawledAt: null,
    crawlData: null,
    status: 'crawled',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    fingerprinter = new LLMFingerprinter();
    vi.clearAllMocks();
    // Suppress console.log during tests
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('fingerprint() - Full Integration Flow', () => {
    it('should complete full fingerprint analysis with parallel execution', async () => {
      // Mock responses for all 3 models × 3 prompts = 9 queries
      const mockResponses = [
        // GPT-4 Turbo responses
        { content: 'Test Coffee Shop is a great restaurant in San Francisco.', tokensUsed: 50, model: 'openai/gpt-4-turbo' },
        { content: 'Test Coffee Shop is reputable and reliable.', tokensUsed: 40, model: 'openai/gpt-4-turbo' },
        { content: '1. Test Coffee Shop\n2. Competitor A\n3. Competitor B', tokensUsed: 60, model: 'openai/gpt-4-turbo' },
        // Claude responses
        { content: 'Test Coffee Shop offers excellent coffee.', tokensUsed: 45, model: 'anthropic/claude-3-opus' },
        { content: 'I recommend Test Coffee Shop for quality service.', tokensUsed: 50, model: 'anthropic/claude-3-opus' },
        { content: '1. Competitor X\n2. Test Coffee Shop\n3. Competitor Y', tokensUsed: 55, model: 'anthropic/claude-3-opus' },
        // Gemini responses
        { content: 'Test Coffee Shop has been serving the community.', tokensUsed: 48, model: 'google/gemini-pro' },
        { content: 'Test Coffee Shop is a trusted business.', tokensUsed: 42, model: 'google/gemini-pro' },
        { content: 'Top restaurants: 1. Test Coffee Shop\n2. Competitor Z', tokensUsed: 58, model: 'google/gemini-pro' },
      ];

      mockQuery.mockResolvedValueOnce(mockResponses[0])
        .mockResolvedValueOnce(mockResponses[1])
        .mockResolvedValueOnce(mockResponses[2])
        .mockResolvedValueOnce(mockResponses[3])
        .mockResolvedValueOnce(mockResponses[4])
        .mockResolvedValueOnce(mockResponses[5])
        .mockResolvedValueOnce(mockResponses[6])
        .mockResolvedValueOnce(mockResponses[7])
        .mockResolvedValueOnce(mockResponses[8]);

      const result = await fingerprinter.fingerprint(mockBusiness, { parallel: true });

      // Verify structure
      expect(result).toHaveProperty('businessId', 1);
      expect(result).toHaveProperty('businessName', 'Test Coffee Shop');
      expect(result).toHaveProperty('visibilityScore');
      expect(result).toHaveProperty('mentionRate');
      expect(result).toHaveProperty('sentimentScore');
      expect(result).toHaveProperty('accuracyScore');
      expect(result).toHaveProperty('llmResults');
      expect(result).toHaveProperty('generatedAt');
      expect(result).toHaveProperty('competitiveLeaderboard');

      // Verify all queries were made (3 models × 3 prompts = 9)
      expect(mockQuery).toHaveBeenCalledTimes(9);

      // Verify LLM results structure
      expect(result.llmResults).toHaveLength(9);
      result.llmResults.forEach((llmResult) => {
        expect(llmResult).toHaveProperty('model');
        expect(llmResult).toHaveProperty('promptType');
        expect(llmResult).toHaveProperty('mentioned');
        expect(llmResult).toHaveProperty('sentiment');
        expect(llmResult).toHaveProperty('accuracy');
        expect(llmResult).toHaveProperty('tokensUsed');
        expect(['factual', 'opinion', 'recommendation']).toContain(llmResult.promptType);
        expect(['openai/gpt-4-turbo', 'anthropic/claude-3-opus', 'google/gemini-pro']).toContain(llmResult.model);
      });

      // Verify visibility score is in valid range
      expect(result.visibilityScore).toBeGreaterThanOrEqual(0);
      expect(result.visibilityScore).toBeLessThanOrEqual(100);

      // Verify mention rate is percentage
      expect(result.mentionRate).toBeGreaterThanOrEqual(0);
      expect(result.mentionRate).toBeLessThanOrEqual(100);
    });

    it('should handle sequential execution mode', async () => {
      const mockResponses = Array(9).fill({
        content: 'Test Coffee Shop is mentioned here.',
        tokensUsed: 50,
        model: 'openai/gpt-4-turbo',
      });

      mockResponses.forEach((response) => {
        mockQuery.mockResolvedValueOnce(response);
      });

      const result = await fingerprinter.fingerprint(mockBusiness, { parallel: false });

      expect(result).toHaveProperty('businessId');
      expect(result.llmResults).toHaveLength(9);
      expect(mockQuery).toHaveBeenCalledTimes(9);
    });

    it('should handle batched parallel execution', async () => {
      const mockResponses = Array(9).fill({
        content: 'Test Coffee Shop is mentioned.',
        tokensUsed: 50,
        model: 'openai/gpt-4-turbo',
      });

      mockResponses.forEach((response) => {
        mockQuery.mockResolvedValueOnce(response);
      });

      const result = await fingerprinter.fingerprint(mockBusiness, { 
        parallel: true, 
        batchSize: 3 // Process 3 at a time
      });

      expect(result).toHaveProperty('businessId');
      expect(result.llmResults).toHaveLength(9);
      expect(mockQuery).toHaveBeenCalledTimes(9);
    });

    it('should handle errors gracefully and continue processing', async () => {
      // Mix of successful and failed queries
      mockQuery
        .mockResolvedValueOnce({ content: 'Success 1', tokensUsed: 50, model: 'openai/gpt-4-turbo' })
        .mockRejectedValueOnce(new Error('API Error'))
        .mockResolvedValueOnce({ content: 'Success 2', tokensUsed: 50, model: 'openai/gpt-4-turbo' })
        .mockResolvedValueOnce({ content: 'Success 3', tokensUsed: 50, model: 'openai/gpt-4-turbo' })
        .mockResolvedValueOnce({ content: 'Success 4', tokensUsed: 50, model: 'openai/gpt-4-turbo' })
        .mockResolvedValueOnce({ content: 'Success 5', tokensUsed: 50, model: 'openai/gpt-4-turbo' })
        .mockResolvedValueOnce({ content: 'Success 6', tokensUsed: 50, model: 'openai/gpt-4-turbo' })
        .mockResolvedValueOnce({ content: 'Success 7', tokensUsed: 50, model: 'openai/gpt-4-turbo' })
        .mockResolvedValueOnce({ content: 'Success 8', tokensUsed: 50, model: 'openai/gpt-4-turbo' });

      const result = await fingerprinter.fingerprint(mockBusiness);

      // Should still return results, with error handled in one result
      expect(result.llmResults).toHaveLength(9);
      
      // Find the error result
      const errorResult = result.llmResults.find(r => r.rawResponse.includes('Error'));
      expect(errorResult).toBeDefined();
      expect(errorResult?.mentioned).toBe(false);
      expect(errorResult?.sentiment).toBe('neutral');
      expect(errorResult?.tokensUsed).toBe(0);
    });

    it('should calculate competitive leaderboard from recommendation prompts', async () => {
      const mockResponses = [
        // Factual prompts (no competitors)
        { content: 'Test Coffee Shop info', tokensUsed: 50, model: 'openai/gpt-4-turbo' },
        { content: 'Test Coffee Shop info', tokensUsed: 50, model: 'anthropic/claude-3-opus' },
        { content: 'Test Coffee Shop info', tokensUsed: 50, model: 'google/gemini-pro' },
        // Opinion prompts (no competitors)
        { content: 'Test Coffee Shop is good', tokensUsed: 50, model: 'openai/gpt-4-turbo' },
        { content: 'Test Coffee Shop is good', tokensUsed: 50, model: 'anthropic/claude-3-opus' },
        { content: 'Test Coffee Shop is good', tokensUsed: 50, model: 'google/gemini-pro' },
        // Recommendation prompts (with competitors)
        { content: '1. Competitor A\n2. Test Coffee Shop\n3. Competitor B', tokensUsed: 60, model: 'openai/gpt-4-turbo' },
        { content: '1. Competitor A\n2. Competitor C\n3. Test Coffee Shop', tokensUsed: 60, model: 'anthropic/claude-3-opus' },
        { content: '1. Test Coffee Shop\n2. Competitor B\n3. Competitor A', tokensUsed: 60, model: 'google/gemini-pro' },
      ];

      mockResponses.forEach((response) => {
        mockQuery.mockResolvedValueOnce(response);
      });

      const result = await fingerprinter.fingerprint(mockBusiness);

      expect(result.competitiveLeaderboard).toBeDefined();
      expect(result.competitiveLeaderboard?.targetBusiness.name).toBe('Test Coffee Shop');
      expect(result.competitiveLeaderboard?.competitors.length).toBeGreaterThan(0);
      expect(result.competitiveLeaderboard?.totalRecommendationQueries).toBe(3);
    });

    it('should handle business without location', async () => {
      const businessWithoutLocation: Business = {
        ...mockBusiness,
        location: null,
      };

      const mockResponses = Array(9).fill({
        content: 'Test Coffee Shop',
        tokensUsed: 50,
        model: 'openai/gpt-4-turbo',
      });

      mockResponses.forEach((response) => {
        mockQuery.mockResolvedValueOnce(response);
      });

      const result = await fingerprinter.fingerprint(businessWithoutLocation);

      expect(result).toHaveProperty('businessId');
      expect(result.llmResults).toHaveLength(9);
    });

    it('should handle business without category', async () => {
      const businessWithoutCategory: Business = {
        ...mockBusiness,
        category: null,
      };

      const mockResponses = Array(9).fill({
        content: 'Test Coffee Shop',
        tokensUsed: 50,
        model: 'openai/gpt-4-turbo',
      });

      mockResponses.forEach((response) => {
        mockQuery.mockResolvedValueOnce(response);
      });

      const result = await fingerprinter.fingerprint(businessWithoutCategory);

      expect(result).toHaveProperty('businessId');
      expect(result.llmResults).toHaveLength(9);
    });
  });

  describe('Execution Modes', () => {
    it('should use parallel execution by default', async () => {
      const mockResponses = Array(9).fill({
        content: 'Test',
        tokensUsed: 50,
        model: 'openai/gpt-4-turbo',
      });

      mockResponses.forEach((response) => {
        mockQuery.mockResolvedValueOnce(response);
      });

      await fingerprinter.fingerprint(mockBusiness);

      // All queries should be made (parallel execution)
      expect(mockQuery).toHaveBeenCalledTimes(9);
    });

    it('should respect batchSize option', async () => {
      const mockResponses = Array(9).fill({
        content: 'Test',
        tokensUsed: 50,
        model: 'openai/gpt-4-turbo',
      });

      mockResponses.forEach((response) => {
        mockQuery.mockResolvedValueOnce(response);
      });

      await fingerprinter.fingerprint(mockBusiness, { batchSize: 2 });

      expect(mockQuery).toHaveBeenCalledTimes(9);
    });
  });

  describe('Metrics Calculation', () => {
    it('should calculate correct mention rate', async () => {
      // 6 out of 9 queries mention the business
      const mockResponses = [
        { content: 'Test Coffee Shop', tokensUsed: 50, model: 'openai/gpt-4-turbo' },
        { content: 'Test Coffee Shop', tokensUsed: 50, model: 'openai/gpt-4-turbo' },
        { content: 'Test Coffee Shop', tokensUsed: 50, model: 'openai/gpt-4-turbo' },
        { content: 'Test Coffee Shop', tokensUsed: 50, model: 'anthropic/claude-3-opus' },
        { content: 'Test Coffee Shop', tokensUsed: 50, model: 'anthropic/claude-3-opus' },
        { content: 'Test Coffee Shop', tokensUsed: 50, model: 'anthropic/claude-3-opus' },
        { content: 'Other business', tokensUsed: 50, model: 'google/gemini-pro' },
        { content: 'Other business', tokensUsed: 50, model: 'google/gemini-pro' },
        { content: 'Other business', tokensUsed: 50, model: 'google/gemini-pro' },
      ];

      mockResponses.forEach((response) => {
        mockQuery.mockResolvedValueOnce(response);
      });

      const result = await fingerprinter.fingerprint(mockBusiness);

      // 6/9 = 66.67% (approximately)
      expect(result.mentionRate).toBeCloseTo(66.67, 1);
    });

    it('should calculate visibility score based on multiple factors', async () => {
      const mockResponses = Array(9).fill({
        content: '1. Test Coffee Shop is excellent and highly recommended.',
        tokensUsed: 50,
        model: 'openai/gpt-4-turbo',
      });

      mockResponses.forEach((response) => {
        mockQuery.mockResolvedValueOnce(response);
      });

      const result = await fingerprinter.fingerprint(mockBusiness);

      expect(result.visibilityScore).toBeGreaterThan(0);
      expect(result.visibilityScore).toBeLessThanOrEqual(100);
      expect(result.sentimentScore).toBeGreaterThan(0);
      expect(result.accuracyScore).toBeGreaterThan(0);
    });

    it('should handle zero mentions correctly', async () => {
      const mockResponses = Array(9).fill({
        content: 'No mention of this business',
        tokensUsed: 50,
        model: 'openai/gpt-4-turbo',
      });

      mockResponses.forEach((response) => {
        mockQuery.mockResolvedValueOnce(response);
      });

      const result = await fingerprinter.fingerprint(mockBusiness);

      expect(result.mentionRate).toBe(0);
      expect(result.visibilityScore).toBeGreaterThanOrEqual(0);
      expect(result.sentimentScore).toBe(0);
      expect(result.accuracyScore).toBe(0);
    });
  });
});

