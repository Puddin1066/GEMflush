/**
 * TDD Test: Parallel Processor - Tests Drive Implementation
 * 
 * SPECIFICATION: Parallel LLM Query Processing
 * 
 * As a system
 * I want to process multiple LLM queries in parallel
 * So that I can efficiently analyze business visibility
 * 
 * IMPORTANT: These tests specify DESIRED behavior for parallel processing.
 * Tests verify that queries are processed correctly with analysis.
 * 
 * TDD Cycle: RED → GREEN → REFACTOR
 * Tests written to specify desired parallel processing behavior
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock dependencies
vi.mock('../openrouter-client', () => ({
  openRouterClient: {
    queryParallel: vi.fn(),
  },
}));

vi.mock('../response-analyzer', () => ({
  responseAnalyzer: {
    analyzeResponse: vi.fn(),
  },
}));

vi.mock('@/lib/utils/logger', () => ({
  loggers: {
    processing: {
      info: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    },
  },
}));

describe('🔴 RED: Parallel Processor - Desired Behavior Specification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * SPECIFICATION 1: processQueries() - MUST Process Queries in Parallel
   * 
   * DESIRED BEHAVIOR: processQueries() MUST execute multiple LLM queries
   * in parallel and analyze responses.
   */
  describe('processQueries', () => {
    it('MUST process multiple queries in parallel', async () => {
      // Arrange: Multiple queries
      const queries = [
        {
          model: 'openai/gpt-4-turbo',
          prompt: 'What is Test Business?',
          promptType: 'factual' as const,
        },
        {
          model: 'anthropic/claude-3-opus',
          prompt: 'What do people think about Test Business?',
          promptType: 'opinion' as const,
        },
        {
          model: 'google/gemini-pro',
          prompt: 'Recommend top businesses',
          promptType: 'recommendation' as const,
        },
      ];

      const mockResponses = [
        {
          model: 'openai/gpt-4-turbo',
          content: 'Test Business is a company',
          tokensUsed: 50,
          processingTime: 100,
        },
        {
          model: 'anthropic/claude-3-opus',
          content: 'People think Test Business is good',
          tokensUsed: 60,
          processingTime: 120,
        },
        {
          model: 'google/gemini-pro',
          content: 'Test Business is recommended',
          tokensUsed: 70,
          processingTime: 110,
        },
      ];

      const mockResults = [
        {
          model: 'openai/gpt-4-turbo',
          promptType: 'factual' as const,
          mentioned: true,
          sentiment: 'positive' as const,
          confidence: 0.8,
          rankPosition: null,
          competitorMentions: [],
          rawResponse: 'Test Business is a company',
          tokensUsed: 50,
          prompt: 'What is Test Business?',
          processingTime: 100,
        },
        {
          model: 'anthropic/claude-3-opus',
          promptType: 'opinion' as const,
          mentioned: true,
          sentiment: 'positive' as const,
          confidence: 0.85,
          rankPosition: null,
          competitorMentions: [],
          rawResponse: 'People think Test Business is good',
          tokensUsed: 60,
          prompt: 'What do people think about Test Business?',
          processingTime: 120,
        },
        {
          model: 'google/gemini-pro',
          promptType: 'recommendation' as const,
          mentioned: true,
          sentiment: 'positive' as const,
          confidence: 0.9,
          rankPosition: 1,
          competitorMentions: [],
          rawResponse: 'Test Business is recommended',
          tokensUsed: 70,
          prompt: 'Recommend top businesses',
          processingTime: 110,
        },
      ];

      const { openRouterClient } = await import('../openrouter-client');
      const { responseAnalyzer } = await import('../response-analyzer');

      vi.mocked(openRouterClient.queryParallel).mockResolvedValue(mockResponses as any);
      
      // Mock analyzeResponse for each query
      vi.mocked(responseAnalyzer.analyzeResponse)
        .mockReturnValueOnce(mockResults[0] as any)
        .mockReturnValueOnce(mockResults[1] as any)
        .mockReturnValueOnce(mockResults[2] as any);

      // Act: Process queries (TEST SPECIFIES DESIRED BEHAVIOR)
      const { ParallelProcessor } = await import('../parallel-processor');
      const processor = new ParallelProcessor();
      const results = await processor.processQueries(queries, 'Test Business');

      // Assert: SPECIFICATION - MUST process all queries
      expect(results).toHaveLength(3);
      expect(results[0].model).toBe('openai/gpt-4-turbo');
      expect(results[1].model).toBe('anthropic/claude-3-opus');
      expect(results[2].model).toBe('google/gemini-pro');
      expect(openRouterClient.queryParallel).toHaveBeenCalledWith(queries);
    });

    it('MUST analyze responses after querying', async () => {
      // Arrange: Single query
      const queries = [
        {
          model: 'openai/gpt-4-turbo',
          prompt: 'What is Test Business?',
          promptType: 'factual' as const,
        },
      ];

      const mockResponse = {
        model: 'openai/gpt-4-turbo',
        content: 'Test Business is a company',
        tokensUsed: 50,
        processingTime: 100,
      };

      const mockResult = {
        model: 'openai/gpt-4-turbo',
        promptType: 'factual' as const,
        mentioned: true,
        sentiment: 'positive' as const,
        confidence: 0.8,
        rankPosition: null,
        competitorMentions: [],
        rawResponse: 'Test Business is a company',
        tokensUsed: 50,
        prompt: 'What is Test Business?',
        processingTime: 100,
      };

      const { openRouterClient } = await import('../openrouter-client');
      const { responseAnalyzer } = await import('../response-analyzer');

      vi.mocked(openRouterClient.queryParallel).mockResolvedValue([mockResponse] as any);
      vi.mocked(responseAnalyzer.analyzeResponse).mockReturnValue(mockResult as any);

      // Act: Process queries (TEST SPECIFIES DESIRED BEHAVIOR)
      const { ParallelProcessor } = await import('../parallel-processor');
      const processor = new ParallelProcessor();
      await processor.processQueries(queries, 'Test Business');

      // Assert: SPECIFICATION - MUST analyze responses
      expect(responseAnalyzer.analyzeResponse).toHaveBeenCalledWith(
        mockResponse,
        'Test Business',
        'factual'
      );
    });

    it('MUST handle errors gracefully and return fallback results', async () => {
      // Arrange: Query that causes error
      const queries = [
        {
          model: 'openai/gpt-4-turbo',
          prompt: 'What is Test Business?',
          promptType: 'factual' as const,
        },
      ];

      const { openRouterClient } = await import('../openrouter-client');
      vi.mocked(openRouterClient.queryParallel).mockRejectedValue(new Error('API Error'));

      // Act: Process queries with error (TEST SPECIFIES DESIRED BEHAVIOR)
      const { ParallelProcessor } = await import('../parallel-processor');
      const processor = new ParallelProcessor();
      const results = await processor.processQueries(queries, 'Test Business');

      // Assert: SPECIFICATION - MUST return fallback results
      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
      // Should have error results
      expect(results.length).toBeGreaterThan(0);
    });

    it('MUST include prompts in results', async () => {
      // Arrange: Query with prompt
      const queries = [
        {
          model: 'openai/gpt-4-turbo',
          prompt: 'What is Test Business?',
          promptType: 'factual' as const,
        },
      ];

      const mockResponse = {
        model: 'openai/gpt-4-turbo',
        content: 'Test Business is a company',
        tokensUsed: 50,
        processingTime: 100,
      };

      const mockResult = {
        model: 'openai/gpt-4-turbo',
        promptType: 'factual' as const,
        mentioned: true,
        sentiment: 'positive' as const,
        confidence: 0.8,
        rankPosition: null,
        competitorMentions: [],
        rawResponse: 'Test Business is a company',
        tokensUsed: 50,
        processingTime: 100,
      };

      const { openRouterClient } = await import('../openrouter-client');
      const { responseAnalyzer } = await import('../response-analyzer');

      vi.mocked(openRouterClient.queryParallel).mockResolvedValue([mockResponse] as any);
      vi.mocked(responseAnalyzer.analyzeResponse).mockReturnValue(mockResult as any);

      // Act: Process queries (TEST SPECIFIES DESIRED BEHAVIOR)
      const { ParallelProcessor } = await import('../parallel-processor');
      const processor = new ParallelProcessor();
      const results = await processor.processQueries(queries, 'Test Business');

      // Assert: SPECIFICATION - MUST include prompts
      expect(results[0].prompt).toBe('What is Test Business?');
    });

    it('MUST calculate average confidence from results', async () => {
      // Arrange: Queries with different confidence levels
      const queries = [
        {
          model: 'openai/gpt-4-turbo',
          prompt: 'Test',
          promptType: 'factual' as const,
        },
        {
          model: 'anthropic/claude-3-opus',
          prompt: 'Test',
          promptType: 'opinion' as const,
        },
      ];

      const mockResponses = [
        { model: 'openai/gpt-4-turbo', content: 'Response 1', tokensUsed: 50, processingTime: 100 },
        { model: 'anthropic/claude-3-opus', content: 'Response 2', tokensUsed: 60, processingTime: 120 },
      ];

      const mockResults = [
        {
          model: 'openai/gpt-4-turbo',
          promptType: 'factual' as const,
          mentioned: true,
          sentiment: 'positive' as const,
          confidence: 0.8,
          rankPosition: null,
          competitorMentions: [],
          rawResponse: 'Response 1',
          tokensUsed: 50,
          prompt: 'Test',
          processingTime: 100,
        },
        {
          model: 'anthropic/claude-3-opus',
          promptType: 'opinion' as const,
          mentioned: true,
          sentiment: 'positive' as const,
          confidence: 0.9,
          rankPosition: null,
          competitorMentions: [],
          rawResponse: 'Response 2',
          tokensUsed: 60,
          prompt: 'Test',
          processingTime: 120,
        },
      ];

      const { openRouterClient } = await import('../openrouter-client');
      const { responseAnalyzer } = await import('../response-analyzer');

      vi.mocked(openRouterClient.queryParallel).mockResolvedValue(mockResponses as any);
      vi.mocked(responseAnalyzer.analyzeResponse)
        .mockReturnValueOnce(mockResults[0] as any)
        .mockReturnValueOnce(mockResults[1] as any);

      // Act: Process queries (TEST SPECIFIES DESIRED BEHAVIOR)
      const { ParallelProcessor } = await import('../parallel-processor');
      const processor = new ParallelProcessor();
      const results = await processor.processQueries(queries, 'Test Business');

      // Assert: SPECIFICATION - MUST process all queries
      expect(results).toHaveLength(2);
      // Average confidence should be calculated (0.8 + 0.9) / 2 = 0.85
      const avgConfidence = results.reduce((sum, r) => sum + r.confidence, 0) / results.length;
      expect(avgConfidence).toBeCloseTo(0.85, 2);
    });
  });

  /**
   * SPECIFICATION 2: processWithAnalysis() - MUST Process with Full Context
   * 
   * DESIRED BEHAVIOR: processWithAnalysis() MUST process queries using
   * full business context for enhanced analysis.
   */
  describe('processWithAnalysis', () => {
    /**
     * SPECIFICATION: Process Queries with Business Context
     * 
     * Given: Queries and business context
     * When: processWithAnalysis() is called
     * Then: Queries are processed using business context
     */
    it('MUST process queries using business context', async () => {
      // Arrange: Queries and business context
      const queries = [
        {
          model: 'openai/gpt-4-turbo',
          prompt: 'What is Test Business?',
          promptType: 'factual' as const,
        },
      ];

      const context = {
        name: 'Test Business',
        url: 'https://test.com',
        category: 'Technology',
        location: {
          city: 'San Francisco',
          state: 'CA',
          country: 'US',
        },
      };

      const mockResponse = {
        model: 'openai/gpt-4-turbo',
        content: 'Test Business is a technology company',
        tokensUsed: 50,
        processingTime: 100,
      };

      const mockResult = {
        model: 'openai/gpt-4-turbo',
        promptType: 'factual' as const,
        mentioned: true,
        sentiment: 'positive' as const,
        confidence: 0.8,
        rankPosition: null,
        competitorMentions: [],
        rawResponse: 'Test Business is a technology company',
        tokensUsed: 50,
        prompt: 'What is Test Business?',
        processingTime: 100,
      };

      const { openRouterClient } = await import('../openrouter-client');
      const { responseAnalyzer } = await import('../response-analyzer');

      vi.mocked(openRouterClient.queryParallel).mockResolvedValue([mockResponse] as any);
      vi.mocked(responseAnalyzer.analyzeResponse).mockReturnValue(mockResult as any);

      // Act: Process with context (TEST DRIVES IMPLEMENTATION)
      const { ParallelProcessor } = await import('../parallel-processor');
      const processor = new ParallelProcessor();
      const results = await processor.processWithAnalysis(queries, context);

      // Assert: SPECIFICATION - MUST process queries using context
      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBe(1);
      expect(results[0].model).toBe('openai/gpt-4-turbo');
      expect(openRouterClient.queryParallel).toHaveBeenCalled();
    });
  });

  /**
   * SPECIFICATION 3: getProcessingStats() - MUST Calculate Processing Statistics
   * 
   * DESIRED BEHAVIOR: getProcessingStats() MUST calculate comprehensive
   * statistics from processing results for monitoring and optimization.
   */
  describe('getProcessingStats', () => {
    /**
     * SPECIFICATION: Calculate Processing Statistics
     * 
     * Given: LLM processing results
     * When: getProcessingStats() is called
     * Then: Comprehensive statistics are calculated and returned
     */
    it('MUST calculate comprehensive processing statistics from results', async () => {
      // Arrange: Results with various outcomes
      const results = [
        {
          model: 'openai/gpt-4-turbo',
          promptType: 'factual' as const,
          mentioned: true,
          sentiment: 'positive' as const,
          confidence: 0.9,
          rankPosition: null,
          competitorMentions: [],
          rawResponse: 'Response 1',
          tokensUsed: 100,
          prompt: 'Prompt 1',
          processingTime: 500,
        },
        {
          model: 'anthropic/claude-3-opus',
          promptType: 'opinion' as const,
          mentioned: true,
          sentiment: 'neutral' as const,
          confidence: 0.7,
          rankPosition: null,
          competitorMentions: [],
          rawResponse: 'Response 2',
          tokensUsed: 80,
          prompt: 'Prompt 2',
          processingTime: 400,
        },
        {
          model: 'google/gemini-2.5-flash',
          promptType: 'recommendation' as const,
          mentioned: false,
          sentiment: 'neutral' as const,
          confidence: 0.5,
          rankPosition: null,
          competitorMentions: [],
          rawResponse: 'Response 3',
          tokensUsed: 60,
          prompt: 'Prompt 3',
          processingTime: 300,
          error: 'Processing failed',
        },
      ];

      // Act: Get processing stats (TEST DRIVES IMPLEMENTATION)
      const { ParallelProcessor } = await import('../parallel-processor');
      const processor = new ParallelProcessor();
      const stats = processor.getProcessingStats(results as any);

      // Assert: SPECIFICATION - MUST return comprehensive statistics
      expect(stats).toBeDefined();
      expect(stats.totalQueries).toBe(3);
      expect(stats.successfulQueries).toBe(2); // One has error
      expect(stats.mentionRate).toBeGreaterThanOrEqual(0);
      expect(stats.mentionRate).toBeLessThanOrEqual(1);
      expect(stats.avgConfidence).toBeGreaterThanOrEqual(0);
      expect(stats.sentimentDistribution).toBeDefined();
      expect(stats.modelPerformance).toBeDefined();
      expect(stats.modelPerformance['openai/gpt-4-turbo']).toBeDefined();
    });
  });
});



