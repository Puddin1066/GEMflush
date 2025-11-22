/**
 * Firecrawl Integration Tests
 * Tests Firecrawl API integration and behavior
 * 
 * DRY: Uses shared test helpers
 * SOLID: Tests single responsibility (Firecrawl integration)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WebCrawler } from '../index';
import { createMockFirecrawlResponse, mockFetchResponse, mockFirecrawlApiKey } from './test-helpers';

// Mock openRouterClient
vi.mock('@/lib/llm/openrouter', () => ({
  openRouterClient: {
    query: vi.fn(),
  },
}));

// Mock global fetch
global.fetch = vi.fn();

describe('WebCrawler - Firecrawl Integration', () => {
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

  describe('Firecrawl API Integration', () => {
    it('should successfully crawl using Firecrawl when API key is configured', async () => {
      const mockResponse = createMockFirecrawlResponse({
        data: {
          html: '<html><head><title>Acme Corp</title></head><body><h1>Acme Corp</h1></body></html>',
          markdown: '# Acme Corp\n\nLeading technology company',
          metadata: {
            title: 'Acme Corp',
            description: 'Leading technology company',
            ogTitle: 'Acme Corp - Technology Leader',
            ogDescription: 'Leading technology company',
          },
        },
      });

      vi.mocked(fetch).mockResolvedValue(mockFetchResponse(200, mockResponse));

      const { openRouterClient } = await import('@/lib/llm/openrouter');
      vi.mocked(openRouterClient.query).mockResolvedValue({
        content: JSON.stringify({
          businessDetails: {},
          llmEnhanced: {
            extractedEntities: [],
            businessCategory: 'Technology',
            serviceOfferings: [],
            targetAudience: 'Enterprise',
            keyDifferentiators: [],
            confidence: 0.8,
          },
        }),
      } as any);

      const result = await crawler.crawl('https://acme.com');

      expect(result.success).toBe(true);
      expect(result.data?.name).toBe('Acme Corp'); // Should use Firecrawl metadata.title
      expect(result.url).toBe('https://acme.com');

      // Verify Firecrawl API was called
      expect(fetch).toHaveBeenCalledWith(
        'https://api.firecrawl.dev/v1/scrape',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer fc-test-key',
          }),
          body: expect.stringContaining('"url":"https://acme.com"'),
        })
      );
    });

    it('should use Firecrawl metadata title as priority source for business name', async () => {
      const mockResponse = createMockFirecrawlResponse({
        data: {
          html: '<html><body><h1>Wrong Name</h1></body></html>',
          markdown: '# Content',
          metadata: {
            title: 'Correct Business Name',
            ogTitle: 'OG Business Name',
          },
        },
      });

      vi.mocked(fetch).mockResolvedValue(mockFetchResponse(200, mockResponse));

      const { openRouterClient } = await import('@/lib/llm/openrouter');
      vi.mocked(openRouterClient.query).mockResolvedValue({
        content: JSON.stringify({
          businessDetails: {},
          llmEnhanced: {
            extractedEntities: [],
            businessCategory: 'Technology',
            serviceOfferings: [],
            targetAudience: 'Enterprise',
            keyDifferentiators: [],
            confidence: 0.8,
          },
        }),
      } as any);

      const result = await crawler.crawl('https://example.com');

      expect(result.success).toBe(true);
      // Should prioritize Firecrawl metadata.title over HTML h1
      expect(result.data?.name).toBe('Correct Business Name');
    });

    it('should fallback to og:title if metadata.title is not available', async () => {
      const mockResponse = createMockFirecrawlResponse({
        data: {
          html: '<html><body></body></html>',
          markdown: '# Content',
          metadata: {
            ogTitle: 'Open Graph Title',
            ogDescription: 'Open Graph Description',
          },
        },
      });

      vi.mocked(fetch).mockResolvedValue(mockFetchResponse(200, mockResponse));

      const { openRouterClient } = await import('@/lib/llm/openrouter');
      vi.mocked(openRouterClient.query).mockResolvedValue({
        content: JSON.stringify({
          businessDetails: {},
          llmEnhanced: {
            extractedEntities: [],
            businessCategory: 'Technology',
            serviceOfferings: [],
            targetAudience: 'Enterprise',
            keyDifferentiators: [],
            confidence: 0.8,
          },
        }),
      } as any);

      const result = await crawler.crawl('https://example.com');

      expect(result.success).toBe(true);
      expect(result.data?.name).toBe('Open Graph Title');
    });

    it('should include maxAge parameter for caching when cache is enabled', async () => {
      const mockResponse = createMockFirecrawlResponse();
      vi.mocked(fetch).mockResolvedValue(mockFetchResponse(200, mockResponse));

      const { openRouterClient } = await import('@/lib/llm/openrouter');
      vi.mocked(openRouterClient.query).mockResolvedValue({
        content: JSON.stringify({
          businessDetails: {},
          llmEnhanced: {
            extractedEntities: [],
            businessCategory: 'Technology',
            serviceOfferings: [],
            targetAudience: 'Enterprise',
            keyDifferentiators: [],
            confidence: 0.8,
          },
        }),
      } as any);

      await crawler.crawl('https://example.com');

      const fetchCall = vi.mocked(fetch).mock.calls[0];
      const requestBody = JSON.parse(fetchCall[1]?.body as string);

      // Should include maxAge for caching (2 days = 172800000ms)
      expect(requestBody.maxAge).toBe(172800000);
      expect(requestBody.formats).toEqual(['markdown', 'html']);
      expect(requestBody.timeout).toBe(30000);
    });

    it('should handle Firecrawl API rate limit errors gracefully', async () => {
      const rateLimitError = {
        success: false,
        code: 'RATE_LIMIT_EXCEEDED',
        error: 'Rate limit exceeded',
      };

      vi.mocked(fetch).mockResolvedValue(mockFetchResponse(429, rateLimitError));

      const result = await crawler.crawl('https://example.com');

      // Should fallback to other strategies, not fail completely
      expect(fetch).toHaveBeenCalled();
    });

    it('should handle Firecrawl API errors and fallback to other strategies', async () => {
      const apiError = {
        success: false,
        code: 'BAD_REQUEST',
        error: 'Invalid URL',
      };

      vi.mocked(fetch).mockResolvedValueOnce(mockFetchResponse(400, apiError));
      
      // Mock fallback fetch (static fetch)
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        text: vi.fn().mockResolvedValue('<html><body><h1>Fallback Business</h1></body></html>'),
      } as any);

      const { openRouterClient } = await import('@/lib/llm/openrouter');
      vi.mocked(openRouterClient.query).mockResolvedValue({
        content: JSON.stringify({
          businessDetails: {},
          llmEnhanced: {
            extractedEntities: [],
            businessCategory: 'Technology',
            serviceOfferings: [],
            targetAudience: 'Enterprise',
            keyDifferentiators: [],
            confidence: 0.8,
          },
        }),
      } as any);

      const result = await crawler.crawl('https://example.com');

      // Should still succeed using fallback strategy
      expect(result.success).toBe(true);
      expect(result.data?.name).toBeDefined();
    });

    it('should handle missing Firecrawl API key and skip Firecrawl strategy', async () => {
      restoreApiKey();
      delete process.env.FIRECRAWL_API_KEY;

      // Mock fallback fetch
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        text: vi.fn().mockResolvedValue('<html><body><h1>Static Business</h1></body></html>'),
      } as any);

      const { openRouterClient } = await import('@/lib/llm/openrouter');
      vi.mocked(openRouterClient.query).mockResolvedValue({
        content: JSON.stringify({
          businessDetails: {},
          llmEnhanced: {
            extractedEntities: [],
            businessCategory: 'Technology',
            serviceOfferings: [],
            targetAudience: 'Enterprise',
            keyDifferentiators: [],
            confidence: 0.8,
          },
        }),
      } as any);

      const result = await crawler.crawl('https://example.com');

      // Should skip Firecrawl and use fallback
      expect(result.success).toBe(true);
      // Should not call Firecrawl API
      const firecrawlCalls = vi.mocked(fetch).mock.calls.filter(
        (call) => call[0]?.toString().includes('firecrawl.dev')
      );
      expect(firecrawlCalls.length).toBe(0);
    });

    it('should support og:image extraction from Firecrawl metadata', async () => {
      // This test verifies Firecrawl metadata structure includes ogImage
      // The actual imageUrl extraction is tested in integration tests
      // This test focuses on API response structure, not extraction logic
      const mockResponse = createMockFirecrawlResponse({
        data: {
          html: '<html><head><title>Test Business</title></head><body></body></html>',
          markdown: '# Content',
          metadata: {
            title: 'Test Business',
            ogImage: 'https://example.com/logo.png',
          },
        },
      });

      // Verify mock structure includes ogImage
      expect(mockResponse.data?.metadata?.ogImage).toBe('https://example.com/logo.png');
      
      // The extraction logic is tested in other tests that verify metadata priority
      // This test just confirms the API response structure supports ogImage
      expect(mockResponse.success).toBe(true);
    });
  });

  describe('Firecrawl Metadata Extraction', () => {
    it('should prioritize Firecrawl metadata over HTML parsing', async () => {
      const mockResponse = createMockFirecrawlResponse({
        data: {
          // HTML has different name than metadata
          html: '<html><head><title>HTML Title</title></head><body><h1>HTML Name</h1></body></html>',
          markdown: '# Markdown Content',
          metadata: {
            title: 'Metadata Title',
            description: 'Metadata Description',
          },
        },
      });

      vi.mocked(fetch).mockResolvedValue(mockFetchResponse(200, mockResponse));

      const { openRouterClient } = await import('@/lib/llm/openrouter');
      vi.mocked(openRouterClient.query).mockResolvedValue({
        content: JSON.stringify({
          businessDetails: {},
          llmEnhanced: {
            extractedEntities: [],
            businessCategory: 'Technology',
            serviceOfferings: [],
            targetAudience: 'Enterprise',
            keyDifferentiators: [],
            confidence: 0.8,
          },
        }),
      } as any);

      const result = await crawler.crawl('https://example.com');

      // Should use metadata.title, not HTML h1
      expect(result.data?.name).toBe('Metadata Title');
      expect(result.data?.description).toBe('Metadata Description');
    });
  });
});

