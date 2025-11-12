import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WebCrawler } from '../index';
import type { CrawlResult, CrawledData } from '@/lib/types/gemflush';

// Mock openRouterClient
vi.mock('@/lib/llm/openrouter', () => ({
  openRouterClient: {
    query: vi.fn(),
  },
}));

// Mock global fetch
global.fetch = vi.fn();

describe('WebCrawler', () => {
  let crawler: WebCrawler;

  beforeEach(() => {
    vi.clearAllMocks();
    crawler = new WebCrawler();
  });

  describe('crawl', () => {
    it('should successfully crawl a URL and extract data', async () => {
      const mockHTML = `
        <html>
          <head>
            <title>Test Business</title>
            <meta name="description" content="Test business description">
            <script type="application/ld+json">
              {"@type": "LocalBusiness", "name": "Test Business", "telephone": "123-456-7890"}
            </script>
          </head>
          <body>
            <h1>Test Business</h1>
            <p>This is a test business</p>
          </body>
        </html>
      `;

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        text: vi.fn().mockResolvedValue(mockHTML),
      } as any);

      const { openRouterClient } = await import('@/lib/llm/openrouter');
      vi.mocked(openRouterClient.query).mockResolvedValue({
        content: JSON.stringify({
          businessDetails: {
            industry: 'Technology',
            founded: '2020',
          },
          llmEnhanced: {
            extractedEntities: ['Test Business'],
            businessCategory: 'Technology',
            serviceOfferings: [],
            targetAudience: 'Businesses',
            keyDifferentiators: [],
            confidence: 0.8,
          },
        }),
      } as any);

      const result = await crawler.crawl('https://example.com');

      expect(result.success).toBe(true);
      expect(result.url).toBe('https://example.com');
      expect(result.data).toBeDefined();
      expect(result.data?.name).toBe('Test Business');
      expect(result.data?.description).toBe('Test business description');
      expect(result.data?.phone).toBe('123-456-7890');
    });

    it('should handle invalid URL', async () => {
      const result = await crawler.crawl('not-a-valid-url');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle HTTP errors', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      } as any);

      const result = await crawler.crawl('https://example.com');

      expect(result.success).toBe(false);
      expect(result.error).toContain('HTTP 404');
    });

    it('should handle fetch failures', async () => {
      vi.mocked(fetch).mockRejectedValue(new Error('Network error'));

      const result = await crawler.crawl('https://example.com');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
    });

    it('should extract meta tags', async () => {
      const mockHTML = `
        <html>
          <head>
            <meta name="description" content="Test description">
            <meta property="og:title" content="OG Title">
            <meta name="keywords" content="test, business">
          </head>
          <body></body>
        </html>
      `;

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        text: vi.fn().mockResolvedValue(mockHTML),
      } as any);

      const { openRouterClient } = await import('@/lib/llm/openrouter');
      vi.mocked(openRouterClient.query).mockResolvedValue({
        content: JSON.stringify({
          businessDetails: {},
          llmEnhanced: {
            extractedEntities: [],
            businessCategory: '',
            serviceOfferings: [],
            targetAudience: '',
            keyDifferentiators: [],
            confidence: 0.5,
          },
        }),
      } as any);

      const result = await crawler.crawl('https://example.com');

      expect(result.success).toBe(true);
      expect(result.data?.metaTags).toBeDefined();
      expect(result.data?.metaTags?.['description']).toBe('Test description');
      expect(result.data?.metaTags?.['og:title']).toBe('OG Title');
    });

    it('should extract social links', async () => {
      const mockHTML = `
        <html>
          <body>
            <a href="https://facebook.com/test">Facebook</a>
            <a href="https://instagram.com/test">Instagram</a>
            <a href="https://linkedin.com/test">LinkedIn</a>
            <a href="https://twitter.com/test">Twitter</a>
          </body>
        </html>
      `;

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        text: vi.fn().mockResolvedValue(mockHTML),
      } as any);

      const { openRouterClient } = await import('@/lib/llm/openrouter');
      vi.mocked(openRouterClient.query).mockResolvedValue({
        content: JSON.stringify({
          businessDetails: {},
          llmEnhanced: {
            extractedEntities: [],
            businessCategory: '',
            serviceOfferings: [],
            targetAudience: '',
            keyDifferentiators: [],
            confidence: 0.5,
          },
        }),
      } as any);

      const result = await crawler.crawl('https://example.com');

      expect(result.success).toBe(true);
      expect(result.data?.socialLinks).toBeDefined();
      expect(result.data?.socialLinks?.facebook).toContain('facebook.com');
      expect(result.data?.socialLinks?.instagram).toContain('instagram.com');
      expect(result.data?.socialLinks?.linkedin).toContain('linkedin.com');
      expect(result.data?.socialLinks?.twitter).toContain('twitter.com');
    });

    it('should extract business name from h1 if no structured data', async () => {
      const mockHTML = `
        <html>
          <head>
            <title>Page Title</title>
          </head>
          <body>
            <h1>Business Name</h1>
          </body>
        </html>
      `;

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        text: vi.fn().mockResolvedValue(mockHTML),
      } as any);

      const { openRouterClient } = await import('@/lib/llm/openrouter');
      vi.mocked(openRouterClient.query).mockResolvedValue({
        content: JSON.stringify({
          businessDetails: {},
          llmEnhanced: {
            extractedEntities: [],
            businessCategory: '',
            serviceOfferings: [],
            targetAudience: '',
            keyDifferentiators: [],
            confidence: 0.5,
          },
        }),
      } as any);

      const result = await crawler.crawl('https://example.com');

      expect(result.success).toBe(true);
      expect(result.data?.name).toBe('Business Name');
    });

    it('should handle LLM enhancement errors gracefully', async () => {
      const mockHTML = `
        <html>
          <head>
            <title>Test Business</title>
          </head>
          <body>
            <h1>Test Business</h1>
          </body>
        </html>
      `;

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        text: vi.fn().mockResolvedValue(mockHTML),
      } as any);

      const { openRouterClient } = await import('@/lib/llm/openrouter');
      vi.mocked(openRouterClient.query).mockRejectedValue(new Error('LLM error'));

      const result = await crawler.crawl('https://example.com');

      // Should still succeed with basic data even if LLM fails
      expect(result.success).toBe(true);
      expect(result.data?.name).toBe('Test Business');
    });

    it('should extract categories from page content', async () => {
      const mockHTML = `
        <html>
          <body>
            <p>This is a restaurant serving great food</p>
          </body>
        </html>
      `;

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        text: vi.fn().mockResolvedValue(mockHTML),
      } as any);

      const { openRouterClient } = await import('@/lib/llm/openrouter');
      vi.mocked(openRouterClient.query).mockResolvedValue({
        content: JSON.stringify({
          businessDetails: {},
          llmEnhanced: {
            extractedEntities: [],
            businessCategory: '',
            serviceOfferings: [],
            targetAudience: '',
            keyDifferentiators: [],
            confidence: 0.5,
          },
        }),
      } as any);

      const result = await crawler.crawl('https://example.com');

      expect(result.success).toBe(true);
      expect(result.data?.categories).toContain('restaurant');
    });

    it('should extract services from list items', async () => {
      const mockHTML = `
        <html>
          <body>
            <ul>
              <li>Service 1</li>
              <li>Service 2</li>
              <li>Service 3</li>
            </ul>
          </body>
        </html>
      `;

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        text: vi.fn().mockResolvedValue(mockHTML),
      } as any);

      const { openRouterClient } = await import('@/lib/llm/openrouter');
      vi.mocked(openRouterClient.query).mockResolvedValue({
        content: JSON.stringify({
          businessDetails: {},
          llmEnhanced: {
            extractedEntities: [],
            businessCategory: '',
            serviceOfferings: [],
            targetAudience: '',
            keyDifferentiators: [],
            confidence: 0.5,
          },
        }),
      } as any);

      const result = await crawler.crawl('https://example.com');

      expect(result.success).toBe(true);
      expect(result.data?.services).toBeDefined();
      expect(result.data?.services?.length).toBeGreaterThan(0);
      expect(result.data?.services).toContain('Service 1');
    });

    it('should extract main image from og:image', async () => {
      const mockHTML = `
        <html>
          <head>
            <meta property="og:image" content="https://example.com/image.jpg">
          </head>
          <body></body>
        </html>
      `;

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        text: vi.fn().mockResolvedValue(mockHTML),
      } as any);

      const { openRouterClient } = await import('@/lib/llm/openrouter');
      vi.mocked(openRouterClient.query).mockResolvedValue({
        content: JSON.stringify({
          businessDetails: {},
          llmEnhanced: {
            extractedEntities: [],
            businessCategory: '',
            serviceOfferings: [],
            targetAudience: '',
            keyDifferentiators: [],
            confidence: 0.5,
          },
        }),
      } as any);

      const result = await crawler.crawl('https://example.com');

      expect(result.success).toBe(true);
      expect(result.data?.imageUrl).toBe('https://example.com/image.jpg');
    });

    it('should resolve relative image URLs', async () => {
      const mockHTML = `
        <html>
          <head>
            <meta property="og:image" content="/images/logo.png">
          </head>
          <body></body>
        </html>
      `;

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        text: vi.fn().mockResolvedValue(mockHTML),
      } as any);

      const { openRouterClient } = await import('@/lib/llm/openrouter');
      vi.mocked(openRouterClient.query).mockResolvedValue({
        content: JSON.stringify({
          businessDetails: {},
          llmEnhanced: {
            extractedEntities: [],
            businessCategory: '',
            serviceOfferings: [],
            targetAudience: '',
            keyDifferentiators: [],
            confidence: 0.5,
          },
        }),
      } as any);

      const result = await crawler.crawl('https://example.com');

      expect(result.success).toBe(true);
      expect(result.data?.imageUrl).toBe('https://example.com/images/logo.png');
    });

    it('should validate LLM extraction data', async () => {
      const mockHTML = `
        <html>
          <head>
            <title>Test Business</title>
          </head>
          <body>
            <h1>Test Business</h1>
          </body>
        </html>
      `;

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        text: vi.fn().mockResolvedValue(mockHTML),
      } as any);

      const { openRouterClient } = await import('@/lib/llm/openrouter');
      vi.mocked(openRouterClient.query).mockResolvedValue({
        content: JSON.stringify({
          businessDetails: {
            employeeCount: 'invalid',
            founded: 'invalid-date',
          },
          llmEnhanced: {
            extractedEntities: [],
            businessCategory: 'Technology',
            serviceOfferings: [],
            targetAudience: '',
            keyDifferentiators: [],
            confidence: 1.5, // Invalid confidence
          },
        }),
      } as any);

      const result = await crawler.crawl('https://example.com');

      expect(result.success).toBe(true);
      // Invalid data should be filtered out
      expect(result.data?.businessDetails?.employeeCount).toBeNull();
      expect(result.data?.businessDetails?.founded).toBeNull();
      // Confidence should be normalized
      expect(result.data?.llmEnhanced?.confidence).toBe(0.5);
    });

    it('should handle fetch timeout', async () => {
      vi.mocked(fetch).mockRejectedValue(new Error('Timeout'));

      const result = await crawler.crawl('https://example.com');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Timeout');
    });
  });
});

