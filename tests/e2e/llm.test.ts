import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LLMFingerprinter } from '@/lib/llm/fingerprinter';
import { Business } from '@/lib/db/schema';

// Mock OpenRouter client for fingerprint tests
vi.mock('@/lib/llm/openrouter', async () => {
  const actual = await vi.importActual('@/lib/llm/openrouter');
  return {
    ...actual,
    openRouterClient: {
      query: vi.fn(),
    },
  };
});

describe('LLM E2E Tests', () => {
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
    vi.clearAllMocks();
  });

  describe('Complete Fingerprint Flow', () => {
    it('should complete full fingerprint analysis with parallel execution', async () => {
      const { openRouterClient } = await import('@/lib/llm/openrouter');

      // Mock OpenRouter responses
      vi.mocked(openRouterClient.query).mockResolvedValue({
        content: 'Test Coffee Shop is an excellent restaurant in San Francisco.',
        tokensUsed: 150,
        model: 'openai/gpt-4-turbo',
      });

      const fingerprinter = new LLMFingerprinter();
      const analysis = await fingerprinter.fingerprint(mockBusiness, { parallel: true });

      expect(analysis.businessId).toBe(1);
      expect(analysis.businessName).toBe('Test Coffee Shop');
      expect(analysis.visibilityScore).toBeGreaterThanOrEqual(0);
      expect(analysis.visibilityScore).toBeLessThanOrEqual(100);
      expect(analysis.llmResults.length).toBeGreaterThan(0);
      expect(analysis.competitiveLeaderboard).toBeDefined();
    });

    it('should handle errors gracefully during fingerprint', async () => {
      const { openRouterClient } = await import('@/lib/llm/openrouter');

      // Mock some failures
      vi.mocked(openRouterClient.query)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValue({
          content: 'Test Coffee Shop is mentioned here.',
          tokensUsed: 100,
          model: 'openai/gpt-4-turbo',
        });

      const fingerprinter = new LLMFingerprinter();
      const analysis = await fingerprinter.fingerprint(mockBusiness, { parallel: true });

      // Should still complete with partial results
      expect(analysis.llmResults.length).toBeGreaterThan(0);
      expect(analysis.visibilityScore).toBeDefined();
    });
  });

  // Note: OpenRouter client integration is tested in unit tests
  // E2E tests focus on the complete fingerprint flow
});

