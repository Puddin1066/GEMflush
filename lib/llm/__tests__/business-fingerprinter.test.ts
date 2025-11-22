/**
 * Business Fingerprinter Test Suite
 * Comprehensive tests for the multi-dimensional business fingerprinting system
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BusinessFingerprinter } from '../business-fingerprinter';
import { Business } from '@/lib/db/schema';
import { BusinessContext, LLMResult, DEFAULT_MODELS } from '../types';

// Mock dependencies
vi.mock('../prompt-generator', () => ({
  promptGenerator: {
    generatePrompts: vi.fn().mockReturnValue({
      factual: 'What do you know about Test Business in San Francisco, CA?',
      opinion: 'I\'m considering using Test Business. Are they reputable?',
      recommendation: 'What are the best businesses in San Francisco, CA?'
    })
  }
}));

vi.mock('../parallel-processor', () => ({
  parallelProcessor: {
    processQueries: vi.fn(),
    getProcessingStats: vi.fn().mockReturnValue({
      totalQueries: 9,
      successfulQueries: 9,
      mentionRate: 0.67,
      avgConfidence: 0.85,
      sentimentDistribution: { positive: 4, neutral: 3, negative: 2 },
      modelPerformance: {
        'openai/gpt-4-turbo': { queries: 3, mentions: 2, avgConfidence: 0.9 },
        'anthropic/claude-3-opus': { queries: 3, mentions: 2, avgConfidence: 0.8 },
        'google/gemini-pro': { queries: 3, mentions: 2, avgConfidence: 0.85 }
      }
    })
  }
}));

vi.mock('@/lib/utils/logger', () => ({
  loggers: {
    fingerprint: {
      info: vi.fn(),
      debug: vi.fn(),
      warn: vi.fn(),
      error: vi.fn()
    }
  }
}));

describe('BusinessFingerprinter', () => {
  let fingerprinter: BusinessFingerprinter;
  let mockBusiness: Business;
  let mockContext: BusinessContext;
  let mockLLMResults: LLMResult[];

  beforeEach(() => {
    fingerprinter = new BusinessFingerprinter();
    
    mockBusiness = {
      id: 1,
      teamId: 1,
      name: 'Test Business',
      url: 'https://testbusiness.com',
      category: 'restaurant',
      location: {
        city: 'San Francisco',
        state: 'CA',
        country: 'US'
      },
      wikidataQID: null,
      wikidataPublishedAt: null,
      lastCrawledAt: new Date(),
      crawlData: {
        name: 'Test Business',
        description: 'A great local restaurant',
        services: ['dining', 'takeout'],
        phone: '555-0123',
        email: 'info@testbusiness.com',
        businessDetails: {
          industry: 'Food Service',
          sector: 'Restaurant',
          founded: '2020'
        }
      },
      status: 'crawled',
      createdAt: new Date(),
      updatedAt: new Date()
    } as Business;

    mockContext = {
      name: 'Test Business',
      url: 'https://testbusiness.com',
      category: 'restaurant',
      location: {
        city: 'San Francisco',
        state: 'CA',
        country: 'US'
      },
      crawlData: mockBusiness.crawlData
    };

    mockLLMResults = [
      // GPT-4 results
      {
        model: 'openai/gpt-4-turbo',
        promptType: 'factual',
        mentioned: true,
        sentiment: 'positive',
        confidence: 0.9,
        rankPosition: null,
        competitorMentions: [],
        rawResponse: 'Test Business is a reputable restaurant in San Francisco...',
        tokensUsed: 150,
        prompt: 'What do you know about Test Business?',
        processingTime: 1200
      },
      {
        model: 'openai/gpt-4-turbo',
        promptType: 'opinion',
        mentioned: true,
        sentiment: 'positive',
        confidence: 0.85,
        rankPosition: null,
        competitorMentions: [],
        rawResponse: 'Test Business appears to be a solid choice...',
        tokensUsed: 120,
        prompt: 'Is Test Business reputable?',
        processingTime: 1100
      },
      {
        model: 'openai/gpt-4-turbo',
        promptType: 'recommendation',
        mentioned: true,
        sentiment: 'positive',
        confidence: 0.8,
        rankPosition: 2,
        competitorMentions: ['Best Eats', 'Local Favorite', 'Top Choice'],
        rawResponse: '1. Best Eats\n2. Test Business\n3. Local Favorite...',
        tokensUsed: 180,
        prompt: 'Best restaurants in San Francisco?',
        processingTime: 1300
      },
      // Claude results
      {
        model: 'anthropic/claude-3-opus',
        promptType: 'factual',
        mentioned: false,
        sentiment: 'neutral',
        confidence: 0.7,
        rankPosition: null,
        competitorMentions: [],
        rawResponse: 'I don\'t have specific information about Test Business...',
        tokensUsed: 100,
        prompt: 'What do you know about Test Business?',
        processingTime: 900
      },
      {
        model: 'anthropic/claude-3-opus',
        promptType: 'opinion',
        mentioned: true,
        sentiment: 'neutral',
        confidence: 0.75,
        rankPosition: null,
        competitorMentions: [],
        rawResponse: 'Test Business seems to be a legitimate operation...',
        tokensUsed: 110,
        prompt: 'Is Test Business reputable?',
        processingTime: 950
      },
      {
        model: 'anthropic/claude-3-opus',
        promptType: 'recommendation',
        mentioned: false,
        sentiment: 'neutral',
        confidence: 0.8,
        rankPosition: null,
        competitorMentions: ['Fine Dining Co', 'Gourmet Place'],
        rawResponse: 'Here are top restaurants: Fine Dining Co, Gourmet Place...',
        tokensUsed: 160,
        prompt: 'Best restaurants in San Francisco?',
        processingTime: 1000
      },
      // Gemini results
      {
        model: 'google/gemini-pro',
        promptType: 'factual',
        mentioned: true,
        sentiment: 'positive',
        confidence: 0.95,
        rankPosition: null,
        competitorMentions: [],
        rawResponse: 'Test Business is an excellent restaurant known for...',
        tokensUsed: 140,
        prompt: 'What do you know about Test Business?',
        processingTime: 1050
      },
      {
        model: 'google/gemini-pro',
        promptType: 'opinion',
        mentioned: true,
        sentiment: 'positive',
        confidence: 0.9,
        rankPosition: null,
        competitorMentions: [],
        rawResponse: 'I would definitely recommend Test Business...',
        tokensUsed: 130,
        prompt: 'Is Test Business reputable?',
        processingTime: 1100
      },
      {
        model: 'google/gemini-pro',
        promptType: 'recommendation',
        mentioned: true,
        sentiment: 'positive',
        confidence: 0.85,
        rankPosition: 1,
        competitorMentions: ['Second Choice', 'Third Option'],
        rawResponse: '1. Test Business - Outstanding quality\n2. Second Choice...',
        tokensUsed: 170,
        prompt: 'Best restaurants in San Francisco?',
        processingTime: 1200
      }
    ];
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('fingerprint', () => {
    it('should successfully fingerprint a business', async () => {
      const { parallelProcessor } = await import('../parallel-processor');
      vi.mocked(parallelProcessor.processQueries).mockResolvedValue(mockLLMResults);

      const result = await fingerprinter.fingerprint(mockBusiness);

      expect(result).toBeDefined();
      expect(result.businessName).toBe('Test Business');
      expect(result.llmResults).toHaveLength(9);
      expect(result.visibilityScore).toBeGreaterThan(0);
      expect(result.mentionRate).toBeGreaterThan(0);
      expect(result.competitiveLeaderboard).toBeDefined();
    });

    it('should handle business without crawl data', async () => {
      const businessWithoutCrawlData = { ...mockBusiness, crawlData: null };
      const { parallelProcessor } = await import('../parallel-processor');
      vi.mocked(parallelProcessor.processQueries).mockResolvedValue(mockLLMResults);

      const result = await fingerprinter.fingerprint(businessWithoutCrawlData);

      expect(result).toBeDefined();
      expect(result.businessName).toBe('Test Business');
    });

    it('should handle processing errors gracefully', async () => {
      const { parallelProcessor } = await import('../parallel-processor');
      vi.mocked(parallelProcessor.processQueries).mockRejectedValue(new Error('API Error'));

      const result = await fingerprinter.fingerprint(mockBusiness);

      expect(result).toBeDefined();
      expect(result.visibilityScore).toBe(0);
      expect(result.llmResults).toHaveLength(0);
      expect(result.metrics.successfulQueries).toBe(0);
    });
  });

  describe('fingerprintWithContext', () => {
    it('should fingerprint with business context', async () => {
      const { parallelProcessor } = await import('../parallel-processor');
      vi.mocked(parallelProcessor.processQueries).mockResolvedValue(mockLLMResults);

      const result = await fingerprinter.fingerprintWithContext(mockContext);

      expect(result).toBeDefined();
      expect(result.businessName).toBe('Test Business');
      expect(result.llmResults).toHaveLength(9);
    });

    it('should handle context without location', async () => {
      const contextWithoutLocation = { ...mockContext, location: undefined };
      const { parallelProcessor } = await import('../parallel-processor');
      vi.mocked(parallelProcessor.processQueries).mockResolvedValue(mockLLMResults);

      const result = await fingerprinter.fingerprintWithContext(contextWithoutLocation);

      expect(result).toBeDefined();
      expect(result.businessName).toBe('Test Business');
    });
  });

  describe('visibility metrics calculation', () => {
    it('should calculate correct visibility metrics', async () => {
      const { parallelProcessor } = await import('../parallel-processor');
      vi.mocked(parallelProcessor.processQueries).mockResolvedValue(mockLLMResults);

      const result = await fingerprinter.fingerprint(mockBusiness);

      // 6 out of 9 results mentioned the business
      expect(result.mentionRate).toBeCloseTo(6/9, 2);
      
      // Should have positive sentiment overall
      expect(result.sentimentScore).toBeGreaterThan(0.5);
      
      // Should have good confidence
      expect(result.metrics.confidenceLevel).toBeGreaterThan(0.7);
      
      // Should have visibility score > 0
      expect(result.visibilityScore).toBeGreaterThan(0);
    });

    it('should handle zero mentions correctly', async () => {
      const noMentionResults = mockLLMResults.map(result => ({
        ...result,
        mentioned: false,
        sentiment: 'neutral' as const,
        confidence: 0.5
      }));

      const { parallelProcessor } = await import('../parallel-processor');
      vi.mocked(parallelProcessor.processQueries).mockResolvedValue(noMentionResults);

      const result = await fingerprinter.fingerprint(mockBusiness);

      expect(result.mentionRate).toBe(0);
      expect(result.visibilityScore).toBe(0);
      expect(result.sentimentScore).toBe(0.5); // Neutral when not mentioned
    });
  });

  describe('competitive leaderboard generation', () => {
    it('should generate competitive leaderboard from recommendation results', async () => {
      const { parallelProcessor } = await import('../parallel-processor');
      vi.mocked(parallelProcessor.processQueries).mockResolvedValue(mockLLMResults);

      const result = await fingerprinter.fingerprint(mockBusiness);

      expect(result.competitiveLeaderboard).toBeDefined();
      expect(result.competitiveLeaderboard.targetBusiness.name).toBe('Test Business');
      expect(result.competitiveLeaderboard.targetBusiness.mentionCount).toBe(2); // 2 recommendation mentions
      expect(result.competitiveLeaderboard.competitors.length).toBeGreaterThan(0);
      
      // Should include competitors from the mock results
      const competitorNames = result.competitiveLeaderboard.competitors.map(c => c.name);
      expect(competitorNames).toContain('Best Eats');
      expect(competitorNames).toContain('Second Choice');
    });

    it('should handle no recommendation results', async () => {
      const nonRecommendationResults = mockLLMResults.filter(r => r.promptType !== 'recommendation');
      
      const { parallelProcessor } = await import('../parallel-processor');
      vi.mocked(parallelProcessor.processQueries).mockResolvedValue(nonRecommendationResults);

      const result = await fingerprinter.fingerprint(mockBusiness);

      expect(result.competitiveLeaderboard.targetBusiness.mentionCount).toBe(0);
      expect(result.competitiveLeaderboard.competitors).toHaveLength(0);
      expect(result.competitiveLeaderboard.totalRecommendationQueries).toBe(0);
    });
  });

  describe('query generation', () => {
    it('should generate correct number of queries', async () => {
      const { parallelProcessor } = await import('../parallel-processor');
      const processQueriesSpy = vi.mocked(parallelProcessor.processQueries);
      processQueriesSpy.mockResolvedValue(mockLLMResults);

      await fingerprinter.fingerprint(mockBusiness);

      expect(processQueriesSpy).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            model: expect.stringMatching(/openai|anthropic|google/),
            promptType: expect.stringMatching(/factual|opinion|recommendation/),
            prompt: expect.any(String)
          })
        ]),
        'Test Business'
      );

      const queries = processQueriesSpy.mock.calls[0][0];
      expect(queries).toHaveLength(9); // 3 models × 3 prompt types
      
      // Check that all models are represented
      const models = [...new Set(queries.map(q => q.model))];
      expect(models).toHaveLength(3);
      expect(models).toEqual(expect.arrayContaining(DEFAULT_MODELS));
      
      // Check that all prompt types are represented
      const promptTypes = [...new Set(queries.map(q => q.promptType))];
      expect(promptTypes).toHaveLength(3);
      expect(promptTypes).toEqual(expect.arrayContaining(['factual', 'opinion', 'recommendation']));
    });

    it('should set appropriate temperature for different prompt types', async () => {
      const { parallelProcessor } = await import('../parallel-processor');
      const processQueriesSpy = vi.mocked(parallelProcessor.processQueries);
      processQueriesSpy.mockResolvedValue(mockLLMResults);

      await fingerprinter.fingerprint(mockBusiness);

      const queries = processQueriesSpy.mock.calls[0][0];
      
      // Factual queries should have lower temperature
      const factualQueries = queries.filter(q => q.promptType === 'factual');
      factualQueries.forEach(q => {
        expect(q.temperature).toBe(0.3);
      });
      
      // Opinion queries should have medium temperature
      const opinionQueries = queries.filter(q => q.promptType === 'opinion');
      opinionQueries.forEach(q => {
        expect(q.temperature).toBe(0.5);
      });
      
      // Recommendation queries should have higher temperature
      const recommendationQueries = queries.filter(q => q.promptType === 'recommendation');
      recommendationQueries.forEach(q => {
        expect(q.temperature).toBe(0.7);
      });
    });
  });

  describe('getCapabilities', () => {
    it('should return correct capabilities', () => {
      const capabilities = fingerprinter.getCapabilities();

      expect(capabilities.models).toEqual(DEFAULT_MODELS);
      expect(capabilities.promptTypes).toEqual(['factual', 'opinion', 'recommendation']);
      expect(capabilities.maxConcurrency).toBe(3);
      expect(typeof capabilities.cachingEnabled).toBe('boolean');
    });
  });

  describe('error handling', () => {
    it('should create fallback analysis on complete failure', async () => {
      const { parallelProcessor } = await import('../parallel-processor');
      vi.mocked(parallelProcessor.processQueries).mockRejectedValue(new Error('Complete failure'));

      const result = await fingerprinter.fingerprint(mockBusiness);

      expect(result).toBeDefined();
      expect(result.businessName).toBe('Test Business');
      expect(result.visibilityScore).toBe(0);
      expect(result.mentionRate).toBe(0);
      expect(result.llmResults).toHaveLength(0);
      expect(result.metrics.totalQueries).toBe(9);
      expect(result.metrics.successfulQueries).toBe(0);
    });

    it('should handle partial failures gracefully', async () => {
      const partialResults = mockLLMResults.slice(0, 6); // Only 6 out of 9 results
      
      const { parallelProcessor } = await import('../parallel-processor');
      vi.mocked(parallelProcessor.processQueries).mockResolvedValue(partialResults);

      const result = await fingerprinter.fingerprint(mockBusiness);

      expect(result).toBeDefined();
      expect(result.llmResults).toHaveLength(6);
      expect(result.visibilityScore).toBeGreaterThan(0);
    });
  });

  describe('performance tracking', () => {
    it('should track processing time', async () => {
      const { parallelProcessor } = await import('../parallel-processor');
      vi.mocked(parallelProcessor.processQueries).mockImplementation(async () => {
        // Simulate processing delay
        await new Promise(resolve => setTimeout(resolve, 100));
        return mockLLMResults;
      });

      const result = await fingerprinter.fingerprint(mockBusiness);

      expect(result.processingTime).toBeGreaterThan(90); // Should be at least 100ms
      expect(result.generatedAt).toBeInstanceOf(Date);
    });
  });
});
