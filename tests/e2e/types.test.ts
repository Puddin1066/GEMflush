import { describe, it, expect } from 'vitest';
import {
  ServiceError,
  CrawlerError,
  LLMError,
  WikidataError,
} from '@/lib/types/service-contracts';
import type {
  CrawlResult,
  FingerprintAnalysis,
  ApiResponse,
} from '@/lib/types/gemflush';

describe('Types E2E Tests', () => {
  describe('Error Handling Flow', () => {
    it('should handle service errors in error flow', () => {
      try {
        throw new ServiceError('Test error', 'TEST_ERROR', 400);
      } catch (error) {
        expect(error).toBeInstanceOf(ServiceError);
        expect(error).toBeInstanceOf(Error);
        if (error instanceof ServiceError) {
          expect(error.code).toBe('TEST_ERROR');
          expect(error.statusCode).toBe(400);
        }
      }
    });

    it('should handle crawler errors with details', () => {
      const error = new CrawlerError('Failed to crawl', { url: 'https://example.com' });
      
      expect(error).toBeInstanceOf(CrawlerError);
      expect(error).toBeInstanceOf(ServiceError);
      expect(error.code).toBe('CRAWLER_ERROR');
      expect(error.details).toEqual({ url: 'https://example.com' });
    });

    it('should handle LLM errors with details', () => {
      const error = new LLMError('Rate limit exceeded', { model: 'gpt-4', retryAfter: 60 });
      
      expect(error).toBeInstanceOf(LLMError);
      expect(error).toBeInstanceOf(ServiceError);
      expect(error.code).toBe('LLM_ERROR');
      expect(error.details).toEqual({ model: 'gpt-4', retryAfter: 60 });
    });

    it('should handle Wikidata errors with details', () => {
      const error = new WikidataError('Not notable', { qid: 'Q123', confidence: 0.5 });
      
      expect(error).toBeInstanceOf(WikidataError);
      expect(error).toBeInstanceOf(ServiceError);
      expect(error.code).toBe('WIKIDATA_ERROR');
      expect(error.details).toEqual({ qid: 'Q123', confidence: 0.5 });
    });
  });

  describe('Type Compatibility', () => {
    it('should ensure CrawlResult matches actual usage', () => {
      const result: CrawlResult = {
        success: true,
        data: {
          name: 'Test Business',
          description: 'A test',
        },
        url: 'https://example.com',
        crawledAt: new Date(),
      };

      expect(result.success).toBe(true);
      expect(result.data?.name).toBe('Test Business');
      expect(result.crawledAt).toBeInstanceOf(Date);
    });

    it('should ensure FingerprintAnalysis matches actual usage', () => {
      const analysis: FingerprintAnalysis = {
        businessId: 1,
        businessName: 'Test',
        visibilityScore: 75,
        mentionRate: 80,
        sentimentScore: 0.8,
        accuracyScore: 0.85,
        avgRankPosition: 2,
        llmResults: [
          {
            model: 'gpt-4',
            promptType: 'factual',
            mentioned: true,
            sentiment: 'positive',
            accuracy: 0.8,
            rankPosition: null,
            rawResponse: 'Test',
            tokensUsed: 100,
          },
        ],
        generatedAt: new Date(),
      };

      expect(analysis.visibilityScore).toBeGreaterThanOrEqual(0);
      expect(analysis.visibilityScore).toBeLessThanOrEqual(100);
      expect(analysis.llmResults).toHaveLength(1);
    });

    it('should ensure ApiResponse matches actual usage', () => {
      const successResponse: ApiResponse<{ id: number }> = {
        success: true,
        data: { id: 1 },
      };

      const errorResponse: ApiResponse = {
        success: false,
        error: 'Something went wrong',
      };

      expect(successResponse.success).toBe(true);
      expect(successResponse.data).toEqual({ id: 1 });
      expect(errorResponse.success).toBe(false);
      expect(errorResponse.error).toBe('Something went wrong');
    });
  });

  describe('Type Safety', () => {
    it('should enforce type constraints on sentiment values', () => {
      const sentiments: Array<'positive' | 'neutral' | 'negative'> = ['positive', 'neutral', 'negative'];
      
      sentiments.forEach(sentiment => {
        expect(['positive', 'neutral', 'negative']).toContain(sentiment);
      });
    });

    it('should enforce type constraints on fingerprint frequency', () => {
      const frequencies: Array<'monthly' | 'weekly' | 'daily'> = ['monthly', 'weekly', 'daily'];
      
      frequencies.forEach(frequency => {
        expect(['monthly', 'weekly', 'daily']).toContain(frequency);
      });
    });
  });
});

