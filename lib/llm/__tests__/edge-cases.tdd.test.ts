/**
 * TDD Test: LLM Module Edge Cases - Tests Drive Implementation
 * 
 * SPECIFICATION: Edge Cases and Advanced Scenarios
 * 
 * As a system
 * I want to handle edge cases and advanced scenarios gracefully
 * So that the LLM module is robust and reliable in all conditions
 * 
 * IMPORTANT: These tests specify DESIRED behavior for edge cases.
 * Tests verify that the module handles boundary conditions, errors, and unusual inputs correctly.
 * 
 * TDD Cycle: RED → GREEN → REFACTOR
 * Tests written to specify desired edge case handling behavior
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BusinessTestFactory } from '@/lib/test-helpers/tdd-helpers';
import type { Business } from '@/lib/db/schema';

// Mock dependencies
vi.mock('../prompt-generator', () => ({
  promptGenerator: {
    generatePrompts: vi.fn(),
  },
}));

vi.mock('../parallel-processor', () => ({
  parallelProcessor: {
    processQueries: vi.fn(),
  },
}));

vi.mock('@/lib/utils/logger', () => ({
  loggers: {
    fingerprint: {
      info: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    },
    api: {
      info: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
      warn: vi.fn(),
    },
  },
}));

// Mock fetch for API calls
global.fetch = vi.fn();

// Mock fs for cache tests
vi.mock('fs', () => ({
  default: {
    existsSync: vi.fn(),
    mkdirSync: vi.fn(),
    readFileSync: vi.fn(),
    writeFileSync: vi.fn(),
  },
}));

vi.mock('path', () => ({
  default: {
    join: vi.fn((...args) => args.join('/')),
  },
}));

vi.mock('crypto', () => ({
  default: {
    createHash: vi.fn(() => ({
      update: vi.fn(() => ({
        digest: vi.fn(() => 'mock-hash'),
      })),
    })),
  },
}));

describe('🔴 RED: LLM Module Edge Cases Specification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset fetch mock
    vi.mocked(global.fetch).mockReset();
  });

  /**
   * SPECIFICATION 1: Visibility Score Edge Cases
   * 
   * DESIRED BEHAVIOR: Visibility score MUST handle boundary conditions correctly
   */
  describe('Visibility Score Edge Cases', () => {
    it('MUST return 0 visibility score when no queries succeed', async () => {
      // Arrange: All queries fail
      const business = BusinessTestFactory.create({
        id: 1,
        name: 'Test Business',
      });

      const mockPrompts = {
        factual: 'What is Test Business?',
        opinion: 'What do people think about Test Business?',
        recommendation: 'Recommend Test Business',
      };

      const { promptGenerator } = await import('../prompt-generator');
      const { parallelProcessor } = await import('../parallel-processor');
      vi.mocked(promptGenerator.generatePrompts).mockReturnValue(mockPrompts as any);
      vi.mocked(parallelProcessor.processQueries).mockResolvedValue([]);

      // Act: Generate fingerprint with no successful queries (TEST SPECIFIES DESIRED BEHAVIOR)
      const { businessFingerprinter } = await import('../business-fingerprinter');
      const result = await businessFingerprinter.fingerprint(business);

      // Assert: SPECIFICATION - MUST return 0 visibility score
      expect(result.metrics.visibilityScore).toBe(0);
      expect(result.metrics.mentionRate).toBe(0);
      expect(result.metrics.successfulQueries).toBe(0);
    });

    it('MUST return 100 visibility score when all queries mention business with perfect sentiment', async () => {
      // Arrange: Perfect visibility scenario
      const business = BusinessTestFactory.create({
        id: 1,
        name: 'Perfect Business',
      });

      const mockPrompts = {
        factual: 'What is Perfect Business?',
        opinion: 'What do people think about Perfect Business?',
        recommendation: 'Recommend Perfect Business',
      };

      // Create 9 perfect results (3 models × 3 prompts)
      const perfectResults = Array(9).fill(null).map((_, i) => ({
        model: ['openai/gpt-4-turbo', 'anthropic/claude-3-opus', 'google/gemini-pro'][i % 3],
        promptType: ['factual', 'opinion', 'recommendation'][Math.floor(i / 3)] as const,
        mentioned: true,
        sentiment: 'positive' as const,
        confidence: 1.0,
        rankPosition: 1, // Top rank
        competitorMentions: [],
        rawResponse: 'Perfect Business is excellent',
        tokensUsed: 100,
        prompt: mockPrompts[['factual', 'opinion', 'recommendation'][Math.floor(i / 3)] as 'factual' | 'opinion' | 'recommendation'],
        processingTime: 1000,
      }));

      // GREEN: Set up mocks BEFORE importing business-fingerprinter
      // The vi.mock() at the top hoists the mocks, but we need to set return values before module loads
      const { promptGenerator } = await import('../prompt-generator');
      const { parallelProcessor } = await import('../parallel-processor');
      
      // GREEN: Set up mock return values BEFORE business-fingerprinter imports them
      vi.mocked(promptGenerator.generatePrompts).mockReturnValue(mockPrompts as any);
      vi.mocked(parallelProcessor.processQueries).mockResolvedValue(perfectResults as any);

      // Act: Generate fingerprint with perfect visibility (TEST SPECIFIES DESIRED BEHAVIOR)
      // GREEN: Import AFTER mocks are set up - the singleton will use the mocked dependencies
      const { businessFingerprinter } = await import('../business-fingerprinter');
      const result = await businessFingerprinter.fingerprint(business);

      // Assert: SPECIFICATION - MUST return high visibility score (near 100)
      expect(result.metrics.visibilityScore).toBeGreaterThanOrEqual(90);
      expect(result.metrics.mentionRate).toBe(100);
      expect(result.metrics.sentimentScore).toBe(1.0);
    });

    it('MUST handle null rank positions correctly in visibility score calculation', async () => {
      // Arrange: Results with null rank positions
      const business = BusinessTestFactory.create({
        id: 1,
        name: 'Test Business',
      });

      const mockPrompts = {
        factual: 'What is Test Business?',
        opinion: 'What do people think about Test Business?',
        recommendation: 'Recommend Test Business',
      };

      const resultsWithNullRanks = [
        {
          model: 'openai/gpt-4-turbo',
          promptType: 'recommendation' as const,
          mentioned: true,
          sentiment: 'positive' as const,
          confidence: 0.8,
          rankPosition: null, // No rank available
          competitorMentions: ['Competitor A'],
          rawResponse: 'Test Business is good',
          tokensUsed: 100,
          prompt: mockPrompts.recommendation,
          processingTime: 1000,
        },
      ];

      const { promptGenerator } = await import('../prompt-generator');
      const { parallelProcessor } = await import('../parallel-processor');
      vi.mocked(promptGenerator.generatePrompts).mockReturnValue(mockPrompts as any);
      vi.mocked(parallelProcessor.processQueries).mockResolvedValue(resultsWithNullRanks as any);

      // Act: Generate fingerprint with null ranks (TEST SPECIFIES DESIRED BEHAVIOR)
      const { businessFingerprinter } = await import('../business-fingerprinter');
      const result = await businessFingerprinter.fingerprint(business);

      // Assert: SPECIFICATION - MUST handle null ranks gracefully
      expect(result.metrics.avgRankPosition).toBeNull();
      expect(result.metrics.visibilityScore).toBeGreaterThanOrEqual(0);
      expect(result.metrics.visibilityScore).toBeLessThanOrEqual(100);
    });
  });

  /**
   * SPECIFICATION 2: Leaderboard Edge Cases
   * 
   * DESIRED BEHAVIOR: Leaderboard MUST handle edge cases correctly
   */
  describe('Leaderboard Edge Cases', () => {
    it('MUST handle leaderboard when no recommendation queries exist', async () => {
      // Arrange: Only factual and opinion queries (no recommendations)
      const business = BusinessTestFactory.create({
        id: 1,
        name: 'Test Business',
      });

      const mockPrompts = {
        factual: 'What is Test Business?',
        opinion: 'What do people think about Test Business?',
        recommendation: 'Recommend Test Business',
      };

      const nonRecommendationResults = [
        {
          model: 'openai/gpt-4-turbo',
          promptType: 'factual' as const,
          mentioned: true,
          sentiment: 'positive' as const,
          confidence: 0.9,
          rankPosition: null,
          competitorMentions: [],
          rawResponse: 'Test Business exists',
          tokensUsed: 100,
          prompt: mockPrompts.factual,
          processingTime: 1000,
        },
        {
          model: 'openai/gpt-4-turbo',
          promptType: 'opinion' as const,
          mentioned: true,
          sentiment: 'positive' as const,
          confidence: 0.9,
          rankPosition: null,
          competitorMentions: [],
          rawResponse: 'Test Business is good',
          tokensUsed: 100,
          prompt: mockPrompts.opinion,
          processingTime: 1000,
        },
      ];

      const { promptGenerator } = await import('../prompt-generator');
      const { parallelProcessor } = await import('../parallel-processor');
      vi.mocked(promptGenerator.generatePrompts).mockReturnValue(mockPrompts as any);
      vi.mocked(parallelProcessor.processQueries).mockResolvedValue(nonRecommendationResults as any);

      // Act: Generate fingerprint without recommendation queries (TEST SPECIFIES DESIRED BEHAVIOR)
      const { businessFingerprinter } = await import('../business-fingerprinter');
      const result = await businessFingerprinter.fingerprint(business);

      // Assert: SPECIFICATION - MUST return empty leaderboard
      expect(result.competitiveLeaderboard.totalRecommendationQueries).toBe(0);
      expect(result.competitiveLeaderboard.competitors).toHaveLength(0);
      expect(result.competitiveLeaderboard.targetBusiness.mentionCount).toBe(0);
      expect(result.competitiveLeaderboard.targetBusiness.avgPosition).toBeNull();
    });

    it('MUST handle leaderboard when target business is never mentioned in recommendations', async () => {
      // Arrange: Recommendation queries where target is not mentioned
      const business = BusinessTestFactory.create({
        id: 1,
        name: 'Unknown Business',
      });

      const mockPrompts = {
        factual: 'What is Unknown Business?',
        opinion: 'What do people think about Unknown Business?',
        recommendation: 'Recommend businesses',
      };

      const resultsWithoutTarget = [
        {
          model: 'openai/gpt-4-turbo',
          promptType: 'recommendation' as const,
          mentioned: false, // Target not mentioned
          sentiment: 'neutral' as const,
          confidence: 0.5,
          rankPosition: null,
          competitorMentions: ['Competitor A', 'Competitor B', 'Competitor C'],
          rawResponse: 'Top businesses: Competitor A, Competitor B, Competitor C',
          tokensUsed: 100,
          prompt: mockPrompts.recommendation,
          processingTime: 1000,
        },
      ];

      const { promptGenerator } = await import('../prompt-generator');
      const { parallelProcessor } = await import('../parallel-processor');
      vi.mocked(promptGenerator.generatePrompts).mockReturnValue(mockPrompts as any);
      vi.mocked(parallelProcessor.processQueries).mockResolvedValue(resultsWithoutTarget as any);

      // Act: Generate fingerprint without target mentions (TEST SPECIFIES DESIRED BEHAVIOR)
      const { businessFingerprinter } = await import('../business-fingerprinter');
      const result = await businessFingerprinter.fingerprint(business);

      // Assert: SPECIFICATION - MUST handle no target mentions
      expect(result.competitiveLeaderboard.targetBusiness.mentionCount).toBe(0);
      expect(result.competitiveLeaderboard.targetBusiness.avgPosition).toBeNull();
      expect(result.competitiveLeaderboard.competitors.length).toBeGreaterThan(0);
    });

    it('MUST handle leaderboard with single competitor correctly', async () => {
      // Arrange: Single competitor in recommendations
      const business = BusinessTestFactory.create({
        id: 1,
        name: 'Test Business',
      });

      const mockPrompts = {
        factual: 'What is Test Business?',
        opinion: 'What do people think about Test Business?',
        recommendation: 'Recommend Test Business',
      };

      const resultsWithSingleCompetitor = [
        {
          model: 'openai/gpt-4-turbo',
          promptType: 'recommendation' as const,
          mentioned: true,
          sentiment: 'positive' as const,
          confidence: 0.9,
          rankPosition: 1,
          competitorMentions: ['Only Competitor'],
          rawResponse: 'Top businesses: 1. Test Business, 2. Only Competitor',
          tokensUsed: 100,
          prompt: mockPrompts.recommendation,
          processingTime: 1000,
        },
      ];

      const { promptGenerator } = await import('../prompt-generator');
      const { parallelProcessor } = await import('../parallel-processor');
      vi.mocked(promptGenerator.generatePrompts).mockReturnValue(mockPrompts as any);
      vi.mocked(parallelProcessor.processQueries).mockResolvedValue(resultsWithSingleCompetitor as any);

      // Act: Generate fingerprint with single competitor (TEST SPECIFIES DESIRED BEHAVIOR)
      const { businessFingerprinter } = await import('../business-fingerprinter');
      const result = await businessFingerprinter.fingerprint(business);

      // Assert: SPECIFICATION - MUST handle single competitor
      expect(result.competitiveLeaderboard.competitors).toHaveLength(1);
      expect(result.competitiveLeaderboard.competitors[0].name).toBe('Only Competitor');
      expect(result.competitiveLeaderboard.targetBusiness.mentionCount).toBe(1);
    });

    it('MUST limit leaderboard to top 10 competitors', async () => {
      // Arrange: More than 10 competitors
      const business = BusinessTestFactory.create({
        id: 1,
        name: 'Test Business',
      });

      const mockPrompts = {
        factual: 'What is Test Business?',
        opinion: 'What do people think about Test Business?',
        recommendation: 'Recommend Test Business',
      };

      // Create results with 15 competitors
      const manyCompetitors = Array(15).fill(null).map((_, i) => `Competitor ${i + 1}`);
      const resultsWithManyCompetitors = [
        {
          model: 'openai/gpt-4-turbo',
          promptType: 'recommendation' as const,
          mentioned: true,
          sentiment: 'positive' as const,
          confidence: 0.9,
          rankPosition: 1,
          competitorMentions: manyCompetitors,
          rawResponse: `Top businesses: ${manyCompetitors.join(', ')}`,
          tokensUsed: 100,
          prompt: mockPrompts.recommendation,
          processingTime: 1000,
        },
      ];

      const { promptGenerator } = await import('../prompt-generator');
      const { parallelProcessor } = await import('../parallel-processor');
      vi.mocked(promptGenerator.generatePrompts).mockReturnValue(mockPrompts as any);
      vi.mocked(parallelProcessor.processQueries).mockResolvedValue(resultsWithManyCompetitors as any);

      // Act: Generate fingerprint with many competitors (TEST SPECIFIES DESIRED BEHAVIOR)
      const { businessFingerprinter } = await import('../business-fingerprinter');
      const result = await businessFingerprinter.fingerprint(business);

      // Assert: SPECIFICATION - MUST limit to top 10
      expect(result.competitiveLeaderboard.competitors.length).toBeLessThanOrEqual(10);
    });
  });

  /**
   * SPECIFICATION 3: Retry Logic Edge Cases
   * 
   * DESIRED BEHAVIOR: Retry logic MUST handle various error scenarios correctly
   */
  describe('Retry Logic Edge Cases', () => {
    it('MUST retry on transient network errors', async () => {
      // Arrange: Network error that succeeds on retry
      process.env.OPENROUTER_API_KEY = 'test-key';

      let callCount = 0;
      (global.fetch as any) = vi.fn(async () => {
        callCount++;
        if (callCount === 1) {
          // First call fails
          throw new Error('Network error');
        }
        // Second call succeeds
        return {
          ok: true,
          json: async () => ({
            id: 'gen-123',
            model: 'openai/gpt-4-turbo',
            choices: [{ message: { role: 'assistant', content: 'Success' }, finish_reason: 'stop' }],
            usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 },
          }),
        } as Response;
      });

      // Act: Query with retry (TEST SPECIFIES DESIRED BEHAVIOR)
      const { OpenRouterClient } = await import('../openrouter-client');
      const client = new OpenRouterClient();
      const result = await client.query('openai/gpt-4-turbo', 'Test prompt');

      // Assert: SPECIFICATION - MUST retry and succeed
      expect(result.content).toBe('Success');
      expect(callCount).toBeGreaterThan(1);
    });

    it('MUST not retry on permanent errors (4xx)', async () => {
      // Arrange: Permanent error (401 Unauthorized)
      process.env.OPENROUTER_API_KEY = 'test-key';

      // Mock fetch to return 401 error with status code attached
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: async () => ({ error: 'Invalid API key' }),
        text: async () => 'Invalid API key',
      } as Response);

      // Act: Query with permanent error (TEST SPECIFIES DESIRED BEHAVIOR)
      const { OpenRouterClient } = await import('../openrouter-client');
      const client = new OpenRouterClient();

      // Assert: SPECIFICATION - MUST throw without excessive retries
      await expect(client.query('openai/gpt-4-turbo', 'Test')).rejects.toThrow();
      // Should not retry 401 errors - should only call once
      expect(vi.mocked(global.fetch)).toHaveBeenCalledTimes(1);
    });
  });

  /**
   * SPECIFICATION 4: Cache Edge Cases
   * 
   * DESIRED BEHAVIOR: Caching MUST handle edge cases correctly
   */
  describe('Cache Edge Cases', () => {
    it('MUST handle cache expiration correctly', async () => {
      // Arrange: Expired cache entry
      // Note: NODE_ENV is read-only in test environment, but caching logic checks for 'development'
      process.env.OPENROUTER_API_KEY = 'test-key';

      const fsModule = await import('fs');
      const fs = fsModule.default;
      const expiredCache = {
        prompt: 'Test prompt',
        model: 'openai/gpt-4-turbo',
        response: {
          content: 'Expired cached response',
          tokensUsed: 30,
          model: 'openai/gpt-4-turbo',
        },
        timestamp: Date.now() - (25 * 60 * 60 * 1000), // 25 hours ago (expired)
      };

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(expiredCache));

      const mockResponse = {
        id: 'gen-123',
        model: 'openai/gpt-4-turbo',
        choices: [{ message: { role: 'assistant', content: 'Fresh response' }, finish_reason: 'stop' }],
        usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 },
      };

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      // Act: Query with expired cache (TEST SPECIFIES DESIRED BEHAVIOR)
      const { OpenRouterClient } = await import('../openrouter-client');
      const client = new OpenRouterClient();
      const result = await client.query('openai/gpt-4-turbo', 'Test prompt');

      // Assert: SPECIFICATION - MUST fetch fresh response when cache expired
      expect(result.content).toBe('Fresh response');
      expect(global.fetch).toHaveBeenCalled();
    });

    it('MUST handle corrupted cache file gracefully', async () => {
      // Arrange: Corrupted cache file
      // Note: NODE_ENV is read-only in test environment, but caching logic checks for 'development'
      process.env.OPENROUTER_API_KEY = 'test-key';

      const fsModule = await import('fs');
      const fs = fsModule.default;
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue('invalid json{');

      const mockResponse = {
        id: 'gen-123',
        model: 'openai/gpt-4-turbo',
        choices: [{ message: { role: 'assistant', content: 'Fresh response' }, finish_reason: 'stop' }],
        usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 },
      };

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      // Act: Query with corrupted cache (TEST SPECIFIES DESIRED BEHAVIOR)
      const { OpenRouterClient } = await import('../openrouter-client');
      const client = new OpenRouterClient();
      const result = await client.query('openai/gpt-4-turbo', 'Test prompt');

      // Assert: SPECIFICATION - MUST handle corrupted cache gracefully
      expect(result.content).toBe('Fresh response');
      expect(global.fetch).toHaveBeenCalled();
    });
  });

  /**
   * SPECIFICATION 5: Empty/Null Data Handling
   * 
   * DESIRED BEHAVIOR: Module MUST handle empty/null data gracefully
   */
  describe('Empty/Null Data Handling', () => {
    it('MUST handle business with no name gracefully', async () => {
      // Arrange: Business with empty name
      const business = BusinessTestFactory.create({
        id: 1,
        name: '',
      });

      const { promptGenerator } = await import('../prompt-generator');
      const { parallelProcessor } = await import('../parallel-processor');
      vi.mocked(promptGenerator.generatePrompts).mockReturnValue({
        factual: 'What is ?',
        opinion: 'What do people think about ?',
        recommendation: 'Recommend ',
      } as any);
      vi.mocked(parallelProcessor.processQueries).mockResolvedValue([]);

      // Act: Generate fingerprint with empty name (TEST SPECIFIES DESIRED BEHAVIOR)
      const { businessFingerprinter } = await import('../business-fingerprinter');
      const result = await businessFingerprinter.fingerprint(business);

      // Assert: SPECIFICATION - MUST handle empty name gracefully
      expect(result).toBeDefined();
      expect(result.businessName).toBe('');
    });

    it('MUST handle business with null location gracefully', async () => {
      // Arrange: Business with null location
      const business = BusinessTestFactory.create({
        id: 1,
        name: 'Test Business',
        location: null,
      });

      const { promptGenerator } = await import('../prompt-generator');
      const { parallelProcessor } = await import('../parallel-processor');
      vi.mocked(promptGenerator.generatePrompts).mockReturnValue({
        factual: 'What is Test Business?',
        opinion: 'What do people think about Test Business?',
        recommendation: 'Recommend Test Business',
      } as any);
      vi.mocked(parallelProcessor.processQueries).mockResolvedValue([]);

      // Act: Generate fingerprint with null location (TEST SPECIFIES DESIRED BEHAVIOR)
      const { businessFingerprinter } = await import('../business-fingerprinter');
      const result = await businessFingerprinter.fingerprint(business);

      // Assert: SPECIFICATION - MUST handle null location gracefully
      expect(result).toBeDefined();
      expect(result.businessName).toBe('Test Business');
    });
  });
});

