/**
 * Unit tests for Enhanced Web Crawler
 * Tests multi-page crawling, data aggregation, and progress tracking
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EnhancedWebCrawler } from '../index';
import { mockFetchResponse } from './test-helpers';

// Mock the firecrawl client
vi.mock('../firecrawl-client', () => ({
  firecrawlClient: {
    crawlWithLLMExtraction: vi.fn(),
    getCrawlJobStatus: vi.fn(),
  },
}));

// Mock database queries
vi.mock('@/lib/db/queries', () => ({
  updateCrawlJob: vi.fn(),
}));

// Mock mock data utilities
vi.mock('@/lib/utils/mock-crawl-data', () => ({
  shouldUseMockCrawlData: vi.fn(),
  generateMockCrawlData: vi.fn(),
}));

describe('EnhancedWebCrawler', () => {
  let crawler: EnhancedWebCrawler;
  let mockFirecrawlClient: any;
  let mockUpdateCrawlJob: any;
  let mockShouldUseMockCrawlData: any;
  let mockGenerateMockCrawlData: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    
    // Get mocked modules
    const { firecrawlClient } = await import('../firecrawl-client');
    const { updateCrawlJob } = await import('@/lib/db/queries');
    const { shouldUseMockCrawlData, generateMockCrawlData } = await import('@/lib/utils/mock-crawl-data');
    
    mockFirecrawlClient = firecrawlClient;
    mockUpdateCrawlJob = updateCrawlJob;
    mockShouldUseMockCrawlData = shouldUseMockCrawlData;
    mockGenerateMockCrawlData = generateMockCrawlData;
    
    crawler = new EnhancedWebCrawler();
    
    // Set up environment
    process.env.FIRECRAWL_API_KEY = 'fc-test-key';
  });

  afterEach(() => {
    delete process.env.FIRECRAWL_API_KEY;
  });

  describe('crawl', () => {
    it('should successfully crawl with multi-page data', async () => {
      const mockCrawlResponse = {
        success: true,
        data: [
          {
            url: 'https://example.com',
            llm_extraction: {
              businessName: 'Example Business',
              description: 'Main page description',
              city: 'San Francisco',
              state: 'CA',
              services: ['Service A', 'Service B'],
            },
          },
          {
            url: 'https://example.com/about',
            llm_extraction: {
              businessName: 'Example Business',
              founded: '2020',
              teamSize: '25',
            },
          },
          {
            url: 'https://example.com/services',
            llm_extraction: {
              services: ['Service C', 'Service D'],
              industry: 'Technology',
            },
          },
        ],
      };

      mockFirecrawlClient.crawlWithLLMExtraction.mockResolvedValue(mockCrawlResponse);

      const result = await crawler.crawl('https://example.com');

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.name).toBe('Example Business');
      expect(result.data!.location?.city).toBe('San Francisco');
      expect(result.data!.location?.state).toBe('CA');
      
      // Should aggregate services from multiple pages
      expect(result.data!.services).toContain('Service A');
      expect(result.data!.services).toContain('Service B');
      expect(result.data!.services).toContain('Service C');
      expect(result.data!.services).toContain('Service D');
      
      // Should include business details from subpages
      expect(result.data!.businessDetails?.founded).toBe('2020');
      expect(result.data!.businessDetails?.industry).toBe('Technology');
      
      // Should mark as processed by Firecrawl LLM
      expect(result.data!.llmEnhanced?.model).toBe('firecrawl-llm-multipage');
      expect(result.data!.llmEnhanced?.confidence).toBe(0.95);
    });

    it('should handle async crawl job with polling', async () => {
      const mockInitialResponse = {
        success: true,
        id: 'job-12345',
      };

      const mockJobStatus = {
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

      mockFirecrawlClient.crawlWithLLMExtraction.mockResolvedValue(mockInitialResponse);
      mockFirecrawlClient.getCrawlJobStatus.mockResolvedValue(mockJobStatus);

      const result = await crawler.crawl('https://example.com', 123);

      expect(result.success).toBe(true);
      expect(result.data!.name).toBe('Async Business');
      
      // Should have updated job progress
      expect(mockUpdateCrawlJob).toHaveBeenCalledWith(
        123,
        expect.objectContaining({
          progress: expect.any(Number),
        })
      );
    });

    it('should fall back to mock data when Firecrawl fails', async () => {
      const mockError = new Error('Firecrawl API error');
      mockFirecrawlClient.crawlWithLLMExtraction.mockRejectedValue(mockError);
      
      mockShouldUseMockCrawlData.mockReturnValue(true);
      mockGenerateMockCrawlData.mockReturnValue({
        name: 'Mock Business',
        description: 'Mock description',
        location: { city: 'Mock City', state: 'MC' },
        services: ['Mock Service'],
        llmEnhanced: { businessCategory: 'Mock Category' },
      });

      const result = await crawler.crawl('https://mock-url.com');

      expect(result.success).toBe(true);
      expect(result.data!.name).toBe('Mock Business');
      expect(result.data!.location?.city).toBe('Mock City');
      expect(mockShouldUseMockCrawlData).toHaveBeenCalledWith('https://mock-url.com');
      expect(mockGenerateMockCrawlData).toHaveBeenCalledWith('https://mock-url.com');
    });

    it('should handle invalid URLs', async () => {
      const result = await crawler.crawl('invalid-url');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Only HTTP and HTTPS URLs are supported');
    });

    it('should handle missing Firecrawl API key', async () => {
      delete process.env.FIRECRAWL_API_KEY;

      const result = await crawler.crawl('https://example.com');

      expect(result.success).toBe(false);
      expect(result.error).toContain('FIRECRAWL_API_KEY is required');
    });

    it('should use cache for repeated requests', async () => {
      const mockCrawlResponse = {
        success: true,
        data: [
          {
            url: 'https://example.com',
            llm_extraction: {
              businessName: 'Cached Business',
            },
          },
        ],
      };

      mockFirecrawlClient.crawlWithLLMExtraction.mockResolvedValue(mockCrawlResponse);

      // First request
      const result1 = await crawler.crawl('https://example.com');
      expect(result1.success).toBe(true);
      expect(mockFirecrawlClient.crawlWithLLMExtraction).toHaveBeenCalledTimes(1);

      // Second request should use cache
      const result2 = await crawler.crawl('https://example.com');
      expect(result2.success).toBe(true);
      expect(result2.data!.name).toBe('Cached Business');
      expect(mockFirecrawlClient.crawlWithLLMExtraction).toHaveBeenCalledTimes(1); // Still only called once
    });
  });

  describe('data aggregation', () => {
    it('should properly aggregate data from multiple pages', async () => {
      const mockCrawlResponse = {
        success: true,
        data: [
          {
            url: 'https://example.com',
            llm_extraction: {
              businessName: 'Main Business',
              description: 'Short description',
              phone: '555-0001',
              city: 'San Francisco',
              state: 'CA',
              services: ['Service 1'],
            },
          },
          {
            url: 'https://example.com/about',
            llm_extraction: {
              businessName: 'Main Business',
              description: 'Much longer and more detailed description about our company',
              founded: '2020',
              industry: 'Technology',
            },
          },
          {
            url: 'https://example.com/contact',
            llm_extraction: {
              phone: '555-0001',
              email: 'contact@example.com',
              address: '123 Main St',
              services: ['Service 2', 'Service 3'],
            },
          },
        ],
      };

      mockFirecrawlClient.crawlWithLLMExtraction.mockResolvedValue(mockCrawlResponse);

      const result = await crawler.crawl('https://example.com');

      expect(result.success).toBe(true);
      
      // Should use business name from main page
      expect(result.data!.name).toBe('Main Business');
      
      // Should use longer description
      expect(result.data!.description).toBe('Much longer and more detailed description about our company');
      
      // Should aggregate contact information
      expect(result.data!.phone).toBe('555-0001');
      expect(result.data!.email).toBe('contact@example.com');
      
      // Should aggregate services from all pages
      expect(result.data!.services).toHaveLength(3);
      expect(result.data!.services).toContain('Service 1');
      expect(result.data!.services).toContain('Service 2');
      expect(result.data!.services).toContain('Service 3');
      
      // Should include business details
      expect(result.data!.businessDetails?.founded).toBe('2020');
      expect(result.data!.businessDetails?.industry).toBe('Technology');
    });

    it('should handle pages with no extraction data', async () => {
      const mockCrawlResponse = {
        success: true,
        data: [
          {
            url: 'https://example.com',
            llm_extraction: {
              businessName: 'Test Business',
              description: 'Test description',
            },
          },
          {
            url: 'https://example.com/empty',
            // No llm_extraction data
          },
          {
            url: 'https://example.com/null',
            llm_extraction: null,
          },
        ],
      };

      mockFirecrawlClient.crawlWithLLMExtraction.mockResolvedValue(mockCrawlResponse);

      const result = await crawler.crawl('https://example.com');

      expect(result.success).toBe(true);
      expect(result.data!.name).toBe('Test Business');
      expect(result.data!.description).toBe('Test description');
    });
  });

  describe('progress tracking', () => {
    it('should update job progress during crawl', async () => {
      const mockCrawlResponse = {
        success: true,
        id: 'job-12345',
      };

      const mockJobStatus = {
        success: true,
        status: 'completed',
        completed: 3,
        total: 3,
        data: [
          {
            url: 'https://example.com',
            llm_extraction: { businessName: 'Test Business' },
          },
        ],
      };

      mockFirecrawlClient.crawlWithLLMExtraction.mockResolvedValue(mockCrawlResponse);
      mockFirecrawlClient.getCrawlJobStatus.mockResolvedValue(mockJobStatus);

      await crawler.crawl('https://example.com', 123);

      // Should have updated progress multiple times
      expect(mockUpdateCrawlJob).toHaveBeenCalledWith(
        123,
        expect.objectContaining({
          progress: 10,
          errorMessage: 'Starting multi-page crawl...',
        })
      );

      expect(mockUpdateCrawlJob).toHaveBeenCalledWith(
        123,
        expect.objectContaining({
          progress: 30,
          errorMessage: 'Crawling pages...',
          firecrawlJobId: 'job-12345',
        })
      );

      expect(mockUpdateCrawlJob).toHaveBeenCalledWith(
        123,
        expect.objectContaining({
          progress: 100,
          errorMessage: 'Crawl completed',
        })
      );
    });
  });
});
