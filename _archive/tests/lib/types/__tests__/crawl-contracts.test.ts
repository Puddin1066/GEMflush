// CrawlResult contract tests
// Ensures CrawlResult matches service contract

import { describe, it, expect } from 'vitest';
import type { CrawlResult, CrawledData } from '../gemflush';
import type { IWebCrawler } from '../service-contracts';

describe('CrawlResult Contract', () => {
  describe('IWebCrawler contract compliance', () => {
    it('should match IWebCrawler contract signature', () => {
      const crawler: IWebCrawler = {
        crawl: async (url: string): Promise<CrawlResult> => {
          return {
            success: true,
            data: {},
            url,
            crawledAt: new Date(),
          };
        },
      };

      expect(typeof crawler.crawl).toBe('function');
    });

    it('should return Promise<CrawlResult>', async () => {
      const crawler: IWebCrawler = {
        crawl: async (url: string): Promise<CrawlResult> => {
          return {
            success: true,
            data: {},
            url,
            crawledAt: new Date(),
          };
        },
      };

      const result = await crawler.crawl('https://example.com');
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('url');
      expect(result).toHaveProperty('crawledAt');
    });
  });

  describe('CrawlResult structure', () => {
    it('should return CrawlResult with success=true on success', () => {
      const result: CrawlResult = {
        success: true,
        data: { name: 'Test' },
        url: 'https://example.com',
        crawledAt: new Date(),
      };

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.error).toBeUndefined();
    });

    it('should return CrawlResult with success=false on failure', () => {
      const result: CrawlResult = {
        success: false,
        error: 'Crawl failed',
        url: 'https://example.com',
        crawledAt: new Date(),
      };

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.data).toBeUndefined();
    });

    it('should always include url and crawledAt', () => {
      const successResult: CrawlResult = {
        success: true,
        data: {},
        url: 'https://example.com',
        crawledAt: new Date(),
      };

      const errorResult: CrawlResult = {
        success: false,
        error: 'Error',
        url: 'https://example.com',
        crawledAt: new Date(),
      };

      expect(successResult.url).toBeDefined();
      expect(successResult.crawledAt).toBeInstanceOf(Date);
      expect(errorResult.url).toBeDefined();
      expect(errorResult.crawledAt).toBeInstanceOf(Date);
    });

    it('should have data when success=true', () => {
      const result: CrawlResult = {
        success: true,
        data: { name: 'Test' },
        url: 'https://example.com',
        crawledAt: new Date(),
      };

      expect(result.data).toBeDefined();
      expect(result.data).toHaveProperty('name');
    });

    it('should have error when success=false', () => {
      const result: CrawlResult = {
        success: false,
        error: 'Crawl failed',
        url: 'https://example.com',
        crawledAt: new Date(),
      };

      expect(result.error).toBeDefined();
      expect(typeof result.error).toBe('string');
    });
  });

  describe('CrawledData type compatibility', () => {
    it('should accept CrawledData in CrawlResult.data', () => {
      const crawledData: CrawledData = {
        name: 'Test Business',
        description: 'Test description',
      };

      const result: CrawlResult = {
        success: true,
        data: crawledData,
        url: 'https://example.com',
        crawledAt: new Date(),
      };

      expect(result.data).toEqual(crawledData);
    });

    it('should accept empty CrawledData', () => {
      const crawledData: CrawledData = {};

      const result: CrawlResult = {
        success: true,
        data: crawledData,
        url: 'https://example.com',
        crawledAt: new Date(),
      };

      expect(result.data).toEqual({});
    });

    it('should accept full CrawledData with all fields', () => {
      const crawledData: CrawledData = {
        name: 'Test',
        description: 'Desc',
        phone: '123',
        email: 'test@example.com',
        address: '123 Main',
        socialLinks: {
          facebook: 'https://facebook.com/test',
        },
        businessDetails: {
          industry: 'Tech',
          employeeCount: 50,
        },
        llmEnhanced: {
          extractedEntities: ['Entity1'],
          businessCategory: 'Tech',
          serviceOfferings: ['Service1'],
          targetAudience: 'Enterprise',
          keyDifferentiators: ['Diff1'],
          confidence: 0.9,
          model: 'gpt-4',
          processedAt: new Date(),
        },
      };

      const result: CrawlResult = {
        success: true,
        data: crawledData,
        url: 'https://example.com',
        crawledAt: new Date(),
      };

      expect(result.data).toEqual(crawledData);
    });
  });
});

