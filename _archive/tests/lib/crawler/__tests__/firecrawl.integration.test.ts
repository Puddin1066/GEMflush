/**
 * Firecrawl Integration Tests - Full Crawler Flow
 * Tests complete crawler behavior with Firecrawl integration
 * 
 * DRY: Reuses test helpers and avoids duplication
 * SOLID: Tests integration between components, not implementation details
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WebCrawler } from '../index';
import { createMockFirecrawlResponse, mockFetchResponse, mockFirecrawlApiKey, createMockLLMResponse } from './test-helpers';

// Mock openRouterClient
vi.mock('@/lib/llm/openrouter', () => ({
  openRouterClient: {
    query: vi.fn(),
  },
}));

// Mock global fetch
global.fetch = vi.fn();

describe('WebCrawler - Firecrawl Integration (Full Flow)', () => {
  let crawler: WebCrawler;
  let restoreApiKey: () => void;

  beforeEach(() => {
    vi.clearAllMocks();
    crawler = new WebCrawler();
    restoreApiKey = mockFirecrawlApiKey();
  });

  afterEach(() => {
    restoreApiKey();
  });

  describe('Complete Crawl Flow with Firecrawl', () => {
    it('should complete full crawl pipeline with Firecrawl successfully', async () => {
      const mockFirecrawlData = createMockFirecrawlResponse({
        data: {
          html: '<html><head><title>Tech Startup Inc</title></head><body><h1>Tech Startup</h1></body></html>',
          markdown: '# Tech Startup Inc\n\nInnovative technology solutions',
          metadata: {
            title: 'Tech Startup Inc',
            description: 'Innovative technology solutions',
            ogTitle: 'Tech Startup Inc - Innovation Leader',
            ogDescription: 'Leading provider of innovative technology solutions',
            ogImage: 'https://example.com/logo.png',
            language: 'en',
          },
        },
      });

      vi.mocked(fetch).mockResolvedValue(mockFetchResponse(200, mockFirecrawlData));

      const { openRouterClient } = await import('@/lib/llm/openrouter');
      const mockLLMResponse = createMockLLMResponse({
        businessCategory: 'Technology',
        serviceOfferings: ['Cloud Solutions', 'AI Consulting'],
        targetAudience: 'Enterprise',
      });
      vi.mocked(openRouterClient.query).mockResolvedValue({
        content: JSON.stringify(mockLLMResponse),
      } as any);

      const result = await crawler.crawl('https://techstartup.com');

      // Verify successful crawl
      expect(result.success).toBe(true);
      expect(result.url).toBe('https://techstartup.com');
      expect(result.data).toBeDefined();

      // Verify Firecrawl metadata extraction
      expect(result.data?.name).toBe('Tech Startup Inc');
      expect(result.data?.description).toBe('Innovative technology solutions');
      // Note: og:image extraction from Firecrawl metadata works, but may require HTML parsing
      // The imageUrl may be extracted from HTML or Firecrawl metadata depending on implementation

      // Verify LLM enhancement
      expect(result.data?.llmEnhanced?.businessCategory).toBe('Technology');
      expect(result.data?.llmEnhanced?.serviceOfferings).toEqual(['Cloud Solutions', 'AI Consulting']);
      expect(result.data?.llmEnhanced?.targetAudience).toBe('Enterprise');
    });

    it('should handle Firecrawl success but LLM enhancement failure gracefully', async () => {
      const mockFirecrawlData = createMockFirecrawlResponse({
        data: {
          html: '<html><body><h1>Business Name</h1></body></html>',
          markdown: '# Business Name',
          metadata: {
            title: 'Business Name',
            description: 'Business description',
          },
        },
      });

      vi.mocked(fetch).mockResolvedValue(mockFetchResponse(200, mockFirecrawlData));

      // LLM fails
      const { openRouterClient } = await import('@/lib/llm/openrouter');
      vi.mocked(openRouterClient.query).mockRejectedValue(new Error('LLM API Error'));

      const result = await crawler.crawl('https://example.com');

      // Should still succeed with basic data even if LLM fails
      expect(result.success).toBe(true);
      expect(result.data?.name).toBe('Business Name');
      // LLM enhancement should be undefined or have null values
      expect(result.data?.llmEnhanced).toBeUndefined();
    });

    it('should use cached result on second crawl of same URL', async () => {
      const mockFirecrawlData = createMockFirecrawlResponse({
        data: {
          html: '<html><body><h1>Cached Business</h1></body></html>',
          markdown: '# Cached Business',
          metadata: {
            title: 'Cached Business',
          },
        },
      });

      vi.mocked(fetch).mockResolvedValue(mockFetchResponse(200, mockFirecrawlData));

      const { openRouterClient } = await import('@/lib/llm/openrouter');
      vi.mocked(openRouterClient.query).mockResolvedValue({
        content: JSON.stringify(createMockLLMResponse()),
      } as any);

      const url = 'https://cached-example.com';

      // First crawl
      const firstResult = await crawler.crawl(url);
      expect(firstResult.success).toBe(true);
      expect(vi.mocked(fetch).mock.calls.length).toBeGreaterThan(0);

      // Clear fetch mock to track second call
      vi.clearAllMocks();

      // Second crawl should use cache
      const secondResult = await crawler.crawl(url);
      expect(secondResult.success).toBe(true);
      expect(secondResult.data?.name).toBe('Cached Business');

      // Should not make another Firecrawl API call (cached)
      // Note: In-memory cache means no API call needed
      const firecrawlCalls = vi.mocked(fetch).mock.calls.filter(
        (call) => call[0]?.toString().includes('firecrawl.dev')
      );
      expect(firecrawlCalls.length).toBe(0);
    });

    it('should handle Firecrawl returning only markdown (no HTML)', async () => {
      const mockFirecrawlData = createMockFirecrawlResponse({
        data: {
          html: '', // No HTML, only markdown
          markdown: '# Markdown Only Business\n\nDescription from markdown',
          metadata: {
            title: 'Markdown Only Business',
            description: 'Description from markdown',
          },
        },
      });

      vi.mocked(fetch).mockResolvedValue(mockFetchResponse(200, mockFirecrawlData));

      const { openRouterClient } = await import('@/lib/llm/openrouter');
      vi.mocked(openRouterClient.query).mockResolvedValue({
        content: JSON.stringify(createMockLLMResponse()),
      } as any);

      const result = await crawler.crawl('https://markdown-example.com');

      expect(result.success).toBe(true);
      expect(result.data?.name).toBe('Markdown Only Business');
      expect(result.data?.description).toBe('Description from markdown');
    });
  });

  describe('Error Handling and Fallback', () => {
    it('should fallback through all strategies if Firecrawl fails', async () => {
      // Firecrawl fails
      vi.mocked(fetch).mockResolvedValueOnce(
        mockFetchResponse(500, { error: 'Firecrawl server error' })
      );

      // Playwright fallback would be next, but in test environment it may not be available
      // So it should fall to static fetch
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        text: vi.fn().mockResolvedValue('<html><body><h1>Fallback Business</h1></body></html>'),
      } as any);

      const { openRouterClient } = await import('@/lib/llm/openrouter');
      vi.mocked(openRouterClient.query).mockResolvedValue({
        content: JSON.stringify(createMockLLMResponse()),
      } as any);

      const result = await crawler.crawl('https://example.com');

      // Should eventually succeed using fallback
      expect(result.success).toBe(true);
      expect(result.data?.name).toBeDefined();
    });

    it('should handle Firecrawl returning empty content gracefully', async () => {
      const mockFirecrawlData = createMockFirecrawlResponse({
        data: {
          html: '',
          markdown: '',
          metadata: {},
        },
      });

      vi.mocked(fetch).mockResolvedValue(mockFetchResponse(200, mockFirecrawlData));

      // Should trigger fallback strategies
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        text: vi.fn().mockResolvedValue('<html><body><h1>Fallback Content</h1></body></html>'),
      } as any);

      const { openRouterClient } = await import('@/lib/llm/openrouter');
      vi.mocked(openRouterClient.query).mockResolvedValue({
        content: JSON.stringify(createMockLLMResponse()),
      } as any);

      const result = await crawler.crawl('https://example.com');

      // Should fallback and succeed
      expect(result.success).toBe(true);
    });
  });
});

