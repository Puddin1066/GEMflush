import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LLMFingerprinter } from '../fingerprinter';
import { openRouterClient } from '../openrouter';
import type { Business } from '@/lib/db/schema';

// Mock the OpenRouter client
vi.mock('../openrouter', () => ({
  openRouterClient: {
    query: vi.fn(),
  },
}));

// Mock the logger
vi.mock('@/lib/utils/logger', () => ({
  loggers: {
    fingerprint: {
      start: vi.fn(() => 'test-op'),
      complete: vi.fn(),
      info: vi.fn(),
      debug: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      performance: vi.fn(),
    },
  },
}));

describe('LLM-Assisted Fingerprinter', () => {
  let fingerprinter: LLMFingerprinter;
  const mockClient = vi.mocked(openRouterClient);

  beforeEach(() => {
    fingerprinter = new LLMFingerprinter();
    vi.clearAllMocks();
  });

  describe('Industry Classification', () => {
    it('uses fast path for common industries', async () => {
      const result = await (fingerprinter as any).getIndustryPlural('restaurant', null, null, ['pizza']);
      expect(result).toBe('pizza places');
      expect(mockClient.query).not.toHaveBeenCalled();
    });

    it('uses LLM for unknown industries', async () => {
      mockClient.query.mockResolvedValue({
        content: 'specialty roasters',
        tokensUsed: 30,
        model: 'gpt-4',
      });

      const result = await (fingerprinter as any).getIndustryPlural('artisanal roasting', null, null, []);
      expect(result).toBe('specialty roasters');
      expect(mockClient.query).toHaveBeenCalled();
    });

    it('falls back gracefully on LLM errors', async () => {
      mockClient.query.mockRejectedValue(new Error('API Error'));
      const result = await (fingerprinter as any).getIndustryPlural('unknown', null, null, []);
      expect(result).toBe('businesses');
    });
  });

  describe('Sentiment Analysis', () => {
    it('detects obvious positive sentiment quickly', async () => {
      const result = await (fingerprinter as any).analyzeSentiment('Excellent service!', 'Test Biz');
      expect(result).toBe('positive');
      expect(mockClient.query).not.toHaveBeenCalled();
    });

    it('uses LLM for nuanced sentiment', async () => {
      mockClient.query.mockResolvedValue({
        content: 'negative',
        tokensUsed: 20,
        model: 'gpt-4',
      });

      const result = await (fingerprinter as any).analyzeSentiment('Oh great, another place...', 'Test Biz');
      expect(result).toBe('negative');
      expect(mockClient.query).toHaveBeenCalled();
    });
  });

  describe('Business Mention Detection', () => {
    it('finds obvious mentions quickly', async () => {
      const result = await (fingerprinter as any).detectMention('I love Joe\'s Pizza!', 'Joe\'s Pizza');
      expect(result).toBe(true);
      expect(mockClient.query).not.toHaveBeenCalled();
    });

    it('returns false when no match found', async () => {
      const result = await (fingerprinter as any).detectMention('I love Italian food', 'Joe\'s Pizza');
      expect(result).toBe(false);
      expect(mockClient.query).not.toHaveBeenCalled();
    });
  });

  describe('Full Integration', () => {
    it('completes fingerprinting with LLM assistance', async () => {
      // Mock all LLM calls
      mockClient.query.mockResolvedValue({
        content: 'Test response mentioning the business positively.',
        tokensUsed: 100,
        model: 'gpt-4',
      });

      const business: Business = {
        id: 1,
        name: 'Test Pizza',
        url: 'https://test.com',
        teamId: 1,
        category: 'restaurant',
        location: { city: 'NYC', state: 'NY', country: 'US' },
        crawlData: {
          name: 'Test Pizza',
          description: 'Great pizza place',
          businessDetails: { industry: 'restaurant', services: ['pizza'] },
          services: ['pizza'],
          llmEnhanced: {
            extractedEntities: ['Test Pizza'],
            businessCategory: 'restaurant',
            serviceOfferings: ['pizza'],
            targetAudience: 'locals',
            keyDifferentiators: ['quality'],
            model: 'test',
            processedAt: new Date().toISOString(),
          },
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await fingerprinter.fingerprint(business);

      expect(result.businessName).toBe('Test Pizza');
      expect(result.llmResults).toHaveLength(9); // 3 models × 3 prompts
      expect(result.visibilityScore).toBeGreaterThan(0);
    });
  });
});