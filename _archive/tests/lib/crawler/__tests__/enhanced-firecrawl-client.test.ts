/**
 * Unit tests for Enhanced Firecrawl Client
 * Tests multi-page crawling with LLM extraction capabilities
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EnhancedFirecrawlClient } from '../firecrawl-client';
import { mockFetchResponse } from './test-helpers';

// Mock fetch globally
global.fetch = vi.fn();

describe('EnhancedFirecrawlClient', () => {
  let client: EnhancedFirecrawlClient;
  let originalApiKey: string | undefined;

  beforeEach(() => {
    vi.clearAllMocks();
    originalApiKey = process.env.FIRECRAWL_API_KEY;
    process.env.FIRECRAWL_API_KEY = 'fc-test-key-12345';
    client = new EnhancedFirecrawlClient();
  });

  afterEach(() => {
    if (originalApiKey) {
      process.env.FIRECRAWL_API_KEY = originalApiKey;
    } else {
      delete process.env.FIRECRAWL_API_KEY;
    }
  });

  describe('constructor', () => {
    it('should throw error if FIRECRAWL_API_KEY is not set', () => {
      delete process.env.FIRECRAWL_API_KEY;
      expect(() => new EnhancedFirecrawlClient()).toThrow('FIRECRAWL_API_KEY is required');
    });

    it('should initialize successfully with API key', () => {
      expect(client).toBeInstanceOf(EnhancedFirecrawlClient);
    });
  });

  describe('crawlWithLLMExtraction', () => {
    it('should successfully crawl with immediate data response', async () => {
      const mockResponse = {
        success: true,
        data: [
          {
            url: 'https://example.com',
            markdown: '# Test Business\n\nGreat services',
            llm_extraction: {
              businessName: 'Test Business',
              description: 'Great services for everyone',
              city: 'San Francisco',
              state: 'CA',
              services: ['Service 1', 'Service 2'],
            },
          },
          {
            url: 'https://example.com/about',
            markdown: '# About Us\n\nWe are awesome',
            llm_extraction: {
              businessName: 'Test Business',
              founded: '2020',
              teamSize: '10-50',
            },
          },
        ],
      };

      vi.mocked(fetch).mockResolvedValue(mockFetchResponse(200, mockResponse));

      const result = await client.crawlWithLLMExtraction('https://example.com');

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.data![0].llm_extraction?.businessName).toBe('Test Business');
      expect(result.data![1].llm_extraction?.founded).toBe('2020');

      // Verify API call
      expect(fetch).toHaveBeenCalledWith(
        'https://api.firecrawl.dev/v1/crawl',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer fc-test-key-12345',
            'Content-Type': 'application/json',
          }),
          body: expect.stringContaining('https://example.com'),
        })
      );
    });

    it('should handle async job with polling', async () => {
      const initialResponse = {
        success: true,
        id: 'job-12345',
      };

      const jobStatusResponse = {
        success: true,
        status: 'completed',
        data: [
          {
            url: 'https://example.com',
            llm_extraction: {
              businessName: 'Async Business',
              description: 'Processed asynchronously',
            },
          },
        ],
      };

      vi.mocked(fetch)
        .mockResolvedValueOnce(mockFetchResponse(200, initialResponse))
        .mockResolvedValueOnce(mockFetchResponse(200, jobStatusResponse));

      const result = await client.crawlWithLLMExtraction('https://example.com');

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data![0].llm_extraction?.businessName).toBe('Async Business');

      // Verify both API calls were made
      expect(fetch).toHaveBeenCalledTimes(2);
    });

    it('should handle API errors gracefully', async () => {
      vi.mocked(fetch).mockResolvedValue(mockFetchResponse(429, { error: 'Rate limit exceeded' }));

      await expect(client.crawlWithLLMExtraction('https://example.com'))
        .rejects.toThrow('Firecrawl Rate Limit Exceeded (429)');
    });

    it('should use custom extraction options', async () => {
      const mockResponse = { success: true, data: [] };
      vi.mocked(fetch).mockResolvedValue(mockFetchResponse(200, mockResponse));

      await client.crawlWithLLMExtraction('https://example.com', {
        maxDepth: 3,
        limit: 20,
        includes: ['**/custom*'],
        excludes: ['**/exclude*'],
        extractionPrompt: 'Custom prompt',
      });

      const callBody = JSON.parse(vi.mocked(fetch).mock.calls[0][1]?.body as string);
      
      expect(callBody.crawlerOptions.maxDepth).toBe(3);
      expect(callBody.crawlerOptions.limit).toBe(20);
      expect(callBody.crawlerOptions.includes).toContain('**/custom*');
      expect(callBody.crawlerOptions.excludes).toContain('**/exclude*');
      expect(callBody.extractorOptions.extractionPrompt).toContain('Custom prompt');
    });
  });

  describe('getCrawlJobStatus', () => {
    it('should successfully get job status', async () => {
      const mockResponse = {
        success: true,
        status: 'completed',
        completed: 5,
        total: 5,
        data: [{ url: 'https://example.com', llm_extraction: { businessName: 'Test' } }],
      };

      vi.mocked(fetch).mockResolvedValue(mockFetchResponse(200, mockResponse));

      const result = await client.getCrawlJobStatus('job-12345');

      expect(result.success).toBe(true);
      expect(result.status).toBe('completed');
      expect(result.completed).toBe(5);
      expect(result.total).toBe(5);

      expect(fetch).toHaveBeenCalledWith(
        'https://api.firecrawl.dev/v1/crawl/job-12345',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Authorization': 'Bearer fc-test-key-12345',
          }),
        })
      );
    });

    it('should handle job status API errors', async () => {
      vi.mocked(fetch).mockResolvedValue(mockFetchResponse(404, { error: 'Job not found' }));

      await expect(client.getCrawlJobStatus('invalid-job'))
        .rejects.toThrow('Firecrawl Job Status API Error 404');
    });
  });

  describe('extractStructuredData', () => {
    it('should successfully extract structured data', async () => {
      const mockResponse = {
        success: true,
        data: {
          businessName: 'Extracted Business',
          description: 'Extracted description',
        },
      };

      vi.mocked(fetch).mockResolvedValue(mockFetchResponse(200, mockResponse));

      const result = await client.extractStructuredData('https://example.com');

      expect(result.success).toBe(true);
      expect(result.data?.businessName).toBe('Extracted Business');

      expect(fetch).toHaveBeenCalledWith(
        'https://api.firecrawl.dev/v2/extract',
        expect.objectContaining({
          method: 'POST',
        })
      );
    });
  });

  describe('scrapeTraditional', () => {
    it('should successfully scrape traditional format', async () => {
      const mockResponse = {
        success: true,
        data: {
          markdown: '# Traditional Scrape\n\nContent here',
          html: '<h1>Traditional Scrape</h1><p>Content here</p>',
          metadata: {
            title: 'Traditional Scrape',
          },
        },
      };

      vi.mocked(fetch).mockResolvedValue(mockFetchResponse(200, mockResponse));

      const result = await client.scrapeTraditional('https://example.com');

      expect(result.success).toBe(true);
      expect(result.data?.markdown).toContain('Traditional Scrape');
      expect(result.data?.html).toContain('<h1>Traditional Scrape</h1>');

      expect(fetch).toHaveBeenCalledWith(
        'https://api.firecrawl.dev/v1/scrape',
        expect.objectContaining({
          method: 'POST',
        })
      );
    });
  });

  describe('rate limiting', () => {
    it('should enforce rate limiting between requests', async () => {
      const mockResponse = { success: true, data: [] };
      vi.mocked(fetch).mockResolvedValue(mockFetchResponse(200, mockResponse));

      const startTime = Date.now();
      
      // Make two requests in quick succession
      await client.crawlWithLLMExtraction('https://example1.com');
      await client.crawlWithLLMExtraction('https://example2.com');
      
      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should have waited at least 7 seconds between requests
      expect(duration).toBeGreaterThanOrEqual(7000);
      expect(fetch).toHaveBeenCalledTimes(2);
    });
  });
});

