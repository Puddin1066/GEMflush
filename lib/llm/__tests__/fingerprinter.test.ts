import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LLMFingerprinter } from '../fingerprinter';
import { Business } from '@/lib/db/schema';

describe('LLMFingerprinter', () => {
  let fingerprinter: LLMFingerprinter;

  const mockBusiness: Business = {
    id: 1,
    teamId: 1,
    name: 'Test Coffee Shop',
    url: 'https://testcoffee.com',
    category: 'restaurant',
    location: {
      address: '123 Main St',
      city: 'San Francisco',
      state: 'CA',
      country: 'US',
      lat: 37.7749,
      lng: -122.4194,
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
  });

  describe('generatePrompts', () => {
    it('should generate three types of prompts', () => {
      const prompts = (fingerprinter as any).generatePrompts(mockBusiness);

      expect(prompts).toHaveProperty('factual');
      expect(prompts).toHaveProperty('opinion');
      expect(prompts).toHaveProperty('recommendation');
    });

    it('should include business name in factual and opinion prompts', () => {
      const prompts = (fingerprinter as any).generatePrompts(mockBusiness);

      expect(prompts.factual).toContain('Test Coffee Shop');
      expect(prompts.opinion).toContain('Test Coffee Shop');
      // Recommendation prompt asks for category, not specific business
      expect(prompts.recommendation).toContain('restaurant');
    });

    it('should include location in prompts', () => {
      const prompts = (fingerprinter as any).generatePrompts(mockBusiness);

      expect(prompts.factual).toContain('San Francisco, CA');
      expect(prompts.opinion).toContain('San Francisco, CA');
      expect(prompts.recommendation).toContain('San Francisco, CA');
    });

    it('should handle missing location gracefully', () => {
      const businessWithoutLocation: Business = {
        ...mockBusiness,
        location: null,
      };

      const prompts = (fingerprinter as any).generatePrompts(businessWithoutLocation);

      expect(prompts.factual).toContain('the area');
      expect(prompts.opinion).toContain('the area');
    });
  });

  describe('detectMention', () => {
    it('should detect exact business name match', () => {
      const response = 'Test Coffee Shop is a great place to visit.';
      const result = (fingerprinter as any).detectMention(response, 'Test Coffee Shop');

      expect(result).toBe(true);
    });

    it('should detect case-insensitive match', () => {
      const response = 'test coffee shop is excellent';
      const result = (fingerprinter as any).detectMention(response, 'Test Coffee Shop');

      expect(result).toBe(true);
    });

    it('should detect partial name match (first word)', () => {
      const response = 'The Test location serves great coffee.';
      const result = (fingerprinter as any).detectMention(response, 'Test Coffee Shop');

      expect(result).toBe(true);
    });

    it('should return false when name not mentioned', () => {
      const response = 'There are many coffee shops in the area.';
      const result = (fingerprinter as any).detectMention(response, 'Test Coffee Shop');

      expect(result).toBe(false);
    });
  });

  describe('analyzeSentiment', () => {
    it('should detect positive sentiment', () => {
      const text = 'This is an excellent and highly recommended business with great quality.';
      const sentiment = (fingerprinter as any).analyzeSentiment(text);

      expect(sentiment).toBe('positive');
    });

    it('should detect negative sentiment', () => {
      const text = 'Poor service, bad quality, avoid this place. Very disappointed.';
      const sentiment = (fingerprinter as any).analyzeSentiment(text);

      expect(sentiment).toBe('negative');
    });

    it('should detect neutral sentiment', () => {
      const text = 'This is a business that provides services.';
      const sentiment = (fingerprinter as any).analyzeSentiment(text);

      expect(sentiment).toBe('neutral');
    });

    it('should return neutral when sentiment is balanced', () => {
      const text = 'Good service but poor quality.';
      const sentiment = (fingerprinter as any).analyzeSentiment(text);

      expect(sentiment).toBe('neutral');
    });
  });

  describe('extractRankPosition', () => {
    it('should extract rank from numbered list', () => {
      const response = '1. Test Coffee Shop\n2. Other Shop\n3. Another Shop';
      const rank = (fingerprinter as any).extractRankPosition(response, 'Test Coffee Shop');

      expect(rank).toBe(1);
    });

    it('should extract rank from list with periods', () => {
      const response = '1. Other Shop\n2. Test Coffee Shop\n3. Another Shop';
      const rank = (fingerprinter as any).extractRankPosition(response, 'Test Coffee Shop');

      expect(rank).toBe(2);
    });

    it('should extract rank from list with parentheses', () => {
      const response = '1) Test Coffee Shop\n2) Other Shop';
      const rank = (fingerprinter as any).extractRankPosition(response, 'Test Coffee Shop');

      expect(rank).toBe(1);
    });

    it('should return null if not ranked', () => {
      const response = 'Test Coffee Shop is a business but not ranked here.';
      const rank = (fingerprinter as any).extractRankPosition(response, 'Test Coffee Shop');

      expect(rank).toBeNull();
    });

    it('should return null if business not mentioned', () => {
      const response = '1. Other Shop\n2. Another Shop';
      const rank = (fingerprinter as any).extractRankPosition(response, 'Test Coffee Shop');

      expect(rank).toBeNull();
    });
  });

  describe('calculateMetrics', () => {
    it('should calculate visibility score correctly', () => {
      const llmResults = [
        {
          model: 'test-model',
          promptType: 'factual',
          mentioned: true,
          sentiment: 'positive' as const,
          accuracy: 0.8,
          rankPosition: 1,
          rawResponse: 'test',
          tokensUsed: 100,
        },
        {
          model: 'test-model',
          promptType: 'opinion',
          mentioned: true,
          sentiment: 'positive' as const,
          accuracy: 0.9,
          rankPosition: null,
          rawResponse: 'test',
          tokensUsed: 100,
        },
        {
          model: 'test-model',
          promptType: 'recommendation',
          mentioned: false,
          sentiment: 'neutral' as const,
          accuracy: 0,
          rankPosition: null,
          rawResponse: 'test',
          tokensUsed: 100,
        },
      ];

      const analysis = (fingerprinter as any).calculateMetrics(llmResults, mockBusiness);

      expect(analysis.visibilityScore).toBeGreaterThan(0);
      expect(analysis.visibilityScore).toBeLessThanOrEqual(100);
      expect(analysis.mentionRate).toBeCloseTo(2 / 3);
      expect(analysis.sentimentScore).toBeGreaterThan(0.5);
      expect(analysis.accuracyScore).toBeGreaterThan(0);
    });

    it('should handle zero mentions correctly', () => {
      const llmResults = [
        {
          model: 'test-model',
          promptType: 'factual',
          mentioned: false,
          sentiment: 'neutral' as const,
          accuracy: 0,
          rankPosition: null,
          rawResponse: 'test',
          tokensUsed: 100,
        },
      ];

      const analysis = (fingerprinter as any).calculateMetrics(llmResults, mockBusiness);

      expect(analysis.visibilityScore).toBeGreaterThanOrEqual(0);
      expect(analysis.mentionRate).toBe(0);
      expect(analysis.sentimentScore).toBe(0);
    });

    it('should calculate average rank position', () => {
      const llmResults = [
        {
          model: 'test-model',
          promptType: 'recommendation',
          mentioned: true,
          sentiment: 'positive' as const,
          accuracy: 1,
          rankPosition: 1,
          rawResponse: 'test',
          tokensUsed: 100,
        },
        {
          model: 'test-model',
          promptType: 'recommendation',
          mentioned: true,
          sentiment: 'positive' as const,
          accuracy: 1,
          rankPosition: 3,
          rawResponse: 'test',
          tokensUsed: 100,
        },
      ];

      const analysis = (fingerprinter as any).calculateMetrics(llmResults, mockBusiness);

      expect(analysis.avgRankPosition).toBe(2);
    });
  });
});

