/**
 * Integration tests for Enhanced Crawler Module
 * Tests complete parallel processing flow with real-like scenarios
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { executeParallelProcessing } from '@/lib/services/business-execution';
import { EnhancedWebCrawler } from '../index';
import { EnhancedFirecrawlClient } from '../firecrawl-client';

// Mock external dependencies
vi.mock('@/lib/db/queries', () => ({
  getBusinessById: vi.fn(),
  updateBusiness: vi.fn(),
  createCrawlJob: vi.fn(),
  updateCrawlJob: vi.fn(),
}));

vi.mock('@/lib/llm/fingerprinter', () => ({
  LLMFingerprinter: vi.fn().mockImplementation(() => ({
    fingerprint: vi.fn(),
  })),
}));

vi.mock('@/lib/utils/logger', () => ({
  loggers: {
    processing: {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
    },
  },
}));

// Mock fetch for Firecrawl API calls
global.fetch = vi.fn();

describe('Enhanced Crawler Integration Tests', () => {
  let mockGetBusinessById: any;
  let mockUpdateBusiness: any;
  let mockCreateCrawlJob: any;
  let mockUpdateCrawlJob: any;
  let mockLLMFingerprinter: any;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Set up environment
    process.env.FIRECRAWL_API_KEY = 'fc-test-key-12345';
    process.env.OPENROUTER_API_KEY = 'or-test-key-12345';

    // Get mocked modules
    const dbQueries = await import('@/lib/db/queries');
    const { LLMFingerprinter } = await import('@/lib/llm/fingerprinter');

    mockGetBusinessById = dbQueries.getBusinessById;
    mockUpdateBusiness = dbQueries.updateBusiness;
    mockCreateCrawlJob = dbQueries.createCrawlJob;
    mockUpdateCrawlJob = dbQueries.updateCrawlJob;
    mockLLMFingerprinter = new LLMFingerprinter();
  });

  afterEach(() => {
    delete process.env.FIRECRAWL_API_KEY;
    delete process.env.OPENROUTER_API_KEY;
  });

  describe('Complete Parallel Processing Flow', () => {
    it('should successfully execute complete CFP pipeline', async () => {
      // Mock business data
      const mockBusiness = {
        id: 1,
        name: 'Test Restaurant',
        url: 'https://testrestaurant.com',
        teamId: 1,
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Mock Firecrawl multi-page response
      const mockFirecrawlResponse = {
        success: true,
        data: [
          {
            url: 'https://testrestaurant.com',
            markdown: '# Test Restaurant\n\nBest pizza in town',
            llm_extraction: {
              businessName: 'Test Restaurant',
              description: 'Best pizza in town since 1985',
              city: 'New York',
              state: 'NY',
              phone: '555-0123',
              services: ['Dine-in', 'Takeout'],
              industry: 'Restaurant',
            },
          },
          {
            url: 'https://testrestaurant.com/about',
            markdown: '# About Us\n\nFamily owned since 1985',
            llm_extraction: {
              businessName: 'Test Restaurant',
              founded: '1985',
              description: 'Family-owned Italian restaurant serving authentic pizza and pasta',
              teamSize: '15',
            },
          },
          {
            url: 'https://testrestaurant.com/menu',
            markdown: '# Menu\n\nPizza, Pasta, Salads',
            llm_extraction: {
              services: ['Pizza', 'Pasta', 'Salads', 'Beverages'],
            },
          },
        ],
      };

      // Mock fingerprint response
      const mockFingerprintResult = {
        visibilityScore: 78,
        mentionRate: 0.6,
        sentimentScore: 0.85,
        accuracyScore: 0.9,
        avgRankPosition: 2.3,
        llmResults: [],
        competitiveBenchmark: {},
      };

      // Set up mocks
      mockGetBusinessById.mockResolvedValue(mockBusiness);
      mockCreateCrawlJob.mockResolvedValue({ id: 123 });
      mockUpdateCrawlJob.mockResolvedValue(undefined);
      mockUpdateBusiness.mockResolvedValue(undefined);
      mockLLMFingerprinter.fingerprint.mockResolvedValue(mockFingerprintResult);

      // Mock Firecrawl API response
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue(mockFirecrawlResponse),
      } as any);

      // Execute parallel processing
      const result = await executeParallelProcessing(1);

      // Verify overall success
      expect(result.overallSuccess).toBe(true);
      expect(result.crawlResult.success).toBe(true);
      expect(result.fingerprintResult.success).toBe(true);

      // Verify crawl job was created and updated
      expect(mockCreateCrawlJob).toHaveBeenCalledWith({
        businessId: 1,
        jobType: 'enhanced_multipage_crawl',
        status: 'running',
        progress: 0,
      });

      // Verify business was updated with crawl data
      expect(mockUpdateBusiness).toHaveBeenCalledWith(1, {
        crawlData: expect.objectContaining({
          name: 'Test Restaurant',
          description: expect.stringContaining('Family-owned Italian restaurant'),
          location: expect.objectContaining({
            city: 'New York',
            state: 'NY',
          }),
          services: expect.arrayContaining(['Dine-in', 'Takeout', 'Pizza', 'Pasta']),
          businessDetails: expect.objectContaining({
            founded: '1985',
            industry: 'Restaurant',
          }),
          llmEnhanced: expect.objectContaining({
            model: 'firecrawl-llm-multipage',
            confidence: 0.95,
          }),
        }),
        lastCrawledAt: expect.any(Date),
        status: 'crawled',
      });

      // Verify final status update
      expect(mockUpdateBusiness).toHaveBeenCalledWith(1, {
        status: 'fingerprinted',
      });

      // Verify Firecrawl API was called with correct parameters
      expect(fetch).toHaveBeenCalledWith(
        'https://api.firecrawl.dev/v1/crawl',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer fc-test-key-12345',
            'Content-Type': 'application/json',
          }),
          body: expect.stringContaining('https://testrestaurant.com'),
        })
      );

      // Verify fingerprint was executed
      expect(mockLLMFingerprinter.fingerprint).toHaveBeenCalledWith(mockBusiness);
    });

    it('should handle async Firecrawl job with polling', async () => {
      const mockBusiness = {
        id: 2,
        name: 'Async Business',
        url: 'https://asyncbusiness.com',
        teamId: 1,
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Mock initial async response
      const mockInitialResponse = {
        success: true,
        id: 'job-async-12345',
      };

      // Mock job status responses (polling)
      const mockJobStatusResponse = {
        success: true,
        status: 'completed',
        completed: 5,
        total: 5,
        data: [
          {
            url: 'https://asyncbusiness.com',
            llm_extraction: {
              businessName: 'Async Business',
              description: 'Processed asynchronously',
              city: 'San Francisco',
              state: 'CA',
            },
          },
        ],
      };

      // Set up mocks
      mockGetBusinessById.mockResolvedValue(mockBusiness);
      mockCreateCrawlJob.mockResolvedValue({ id: 456 });
      mockLLMFingerprinter.fingerprint.mockResolvedValue({
        visibilityScore: 65,
      });

      // Mock Firecrawl API responses
      vi.mocked(fetch)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: vi.fn().mockResolvedValue(mockInitialResponse),
        } as any)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: vi.fn().mockResolvedValue(mockJobStatusResponse),
        } as any);

      const result = await executeParallelProcessing(2);

      expect(result.overallSuccess).toBe(true);

      // Verify both crawl API calls were made
      expect(fetch).toHaveBeenCalledTimes(2);
      expect(fetch).toHaveBeenNthCalledWith(1, 'https://api.firecrawl.dev/v1/crawl', expect.any(Object));
      expect(fetch).toHaveBeenNthCalledWith(2, 'https://api.firecrawl.dev/v1/crawl/job-async-12345', expect.any(Object));

      // Verify job progress was updated with Firecrawl job ID
      expect(mockUpdateCrawlJob).toHaveBeenCalledWith(456, expect.objectContaining({
        firecrawlJobId: 'job-async-12345',
      }));
    });

    it('should handle crawl success with fingerprint retry', async () => {
      const mockBusiness = {
        id: 3,
        name: 'Retry Business',
        url: 'https://retrybusiness.com',
        teamId: 1,
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockUpdatedBusiness = {
        ...mockBusiness,
        crawlData: { name: 'Retry Business', description: 'Fresh crawl data' },
      };

      // Mock successful crawl
      const mockFirecrawlResponse = {
        success: true,
        data: [
          {
            url: 'https://retrybusiness.com',
            llm_extraction: {
              businessName: 'Retry Business',
              description: 'Fresh crawl data',
            },
          },
        ],
      };

      // Set up mocks
      mockGetBusinessById
        .mockResolvedValueOnce(mockBusiness) // Initial call
        .mockResolvedValueOnce(mockUpdatedBusiness); // Retry call
      mockCreateCrawlJob.mockResolvedValue({ id: 789 });
      
      // Fingerprint fails first, succeeds on retry
      mockLLMFingerprinter.fingerprint
        .mockRejectedValueOnce(new Error('LLM API temporarily unavailable'))
        .mockResolvedValue({ visibilityScore: 72 });

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue(mockFirecrawlResponse),
      } as any);

      const result = await executeParallelProcessing(3);

      expect(result.overallSuccess).toBe(true);
      expect(result.crawlResult.success).toBe(true);
      expect(result.fingerprintResult.success).toBe(true);

      // Verify fingerprint was retried with updated business data
      expect(mockLLMFingerprinter.fingerprint).toHaveBeenCalledTimes(2);
      expect(mockLLMFingerprinter.fingerprint).toHaveBeenNthCalledWith(1, mockBusiness);
      expect(mockLLMFingerprinter.fingerprint).toHaveBeenNthCalledWith(2, mockUpdatedBusiness);
    });

    it('should handle graceful degradation when fingerprint fails', async () => {
      const mockBusiness = {
        id: 4,
        name: 'Degraded Business',
        url: 'https://degradedbusiness.com',
        teamId: 1,
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Mock successful crawl
      const mockFirecrawlResponse = {
        success: true,
        data: [
          {
            url: 'https://degradedbusiness.com',
            llm_extraction: {
              businessName: 'Degraded Business',
              description: 'Crawl succeeded',
            },
          },
        ],
      };

      // Set up mocks
      mockGetBusinessById
        .mockResolvedValueOnce(mockBusiness)
        .mockResolvedValueOnce({ ...mockBusiness, crawlData: { name: 'Degraded Business' } });
      mockCreateCrawlJob.mockResolvedValue({ id: 101 });
      
      // Fingerprint fails both times
      mockLLMFingerprinter.fingerprint
        .mockRejectedValue(new Error('LLM service unavailable'));

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue(mockFirecrawlResponse),
      } as any);

      const result = await executeParallelProcessing(4);

      // Should continue with crawl success despite fingerprint failure
      expect(result.crawlResult.success).toBe(true);
      expect(result.fingerprintResult.success).toBe(false);
      expect(result.overallSuccess).toBe(false);

      // Business should be marked as crawled (not fingerprinted)
      expect(mockUpdateBusiness).toHaveBeenCalledWith(4, {
        status: 'crawled',
      });
    });

    it('should handle complete failure gracefully', async () => {
      const mockBusiness = {
        id: 5,
        name: 'Failed Business',
        url: 'https://failedbusiness.com',
        teamId: 1,
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Set up mocks
      mockGetBusinessById.mockResolvedValue(mockBusiness);
      mockCreateCrawlJob.mockResolvedValue({ id: 202 });
      
      // Both processes fail
      vi.mocked(fetch).mockResolvedValue({
        ok: false,
        status: 429,
        text: vi.fn().mockResolvedValue('Rate limit exceeded'),
      } as any);

      mockLLMFingerprinter.fingerprint.mockRejectedValue(new Error('LLM service down'));

      const result = await executeParallelProcessing(5);

      expect(result.overallSuccess).toBe(false);
      expect(result.crawlResult.success).toBe(false);
      expect(result.fingerprintResult.success).toBe(false);

      // Business should be marked as error
      expect(mockUpdateBusiness).toHaveBeenCalledWith(5, {
        status: 'error',
      });
    });
  });

  describe('Data Aggregation Integration', () => {
    it('should properly aggregate complex multi-page business data', async () => {
      const crawler = new EnhancedWebCrawler();

      // Mock complex multi-page response
      const mockFirecrawlResponse = {
        success: true,
        data: [
          {
            url: 'https://complexbusiness.com',
            llm_extraction: {
              businessName: 'Complex Business Solutions',
              description: 'Brief homepage description',
              city: 'Seattle',
              state: 'WA',
              phone: '206-555-0100',
              services: ['Consulting', 'Development'],
            },
          },
          {
            url: 'https://complexbusiness.com/about',
            llm_extraction: {
              businessName: 'Complex Business Solutions',
              description: 'We are a comprehensive technology consulting firm specializing in enterprise solutions with over 15 years of experience serving Fortune 500 companies.',
              founded: '2008',
              industry: 'Technology Consulting',
              teamSize: '50-100',
            },
          },
          {
            url: 'https://complexbusiness.com/services',
            llm_extraction: {
              services: ['Cloud Migration', 'Data Analytics', 'AI Implementation', 'Cybersecurity'],
            },
          },
          {
            url: 'https://complexbusiness.com/contact',
            llm_extraction: {
              phone: '206-555-0100',
              email: 'info@complexbusiness.com',
              address: '1234 Tech Ave, Suite 500',
              city: 'Seattle',
              state: 'WA',
              postalCode: '98101',
            },
          },
        ],
      };

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue(mockFirecrawlResponse),
      } as any);

      const result = await crawler.crawl('https://complexbusiness.com');

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();

      const data = result.data!;

      // Verify business name from main page
      expect(data.name).toBe('Complex Business Solutions');

      // Verify longer description was selected
      expect(data.description).toContain('comprehensive technology consulting firm');
      expect(data.description).toContain('15 years of experience');

      // Verify contact information aggregation
      expect(data.phone).toBe('206-555-0100');
      expect(data.email).toBe('info@complexbusiness.com');

      // Verify location aggregation
      expect(data.location).toEqual({
        address: '1234 Tech Ave, Suite 500',
        city: 'Seattle',
        state: 'WA',
        country: 'US',
        postalCode: '98101',
      });

      // Verify services aggregation (should deduplicate)
      expect(data.services).toHaveLength(6);
      expect(data.services).toContain('Consulting');
      expect(data.services).toContain('Development');
      expect(data.services).toContain('Cloud Migration');
      expect(data.services).toContain('Data Analytics');
      expect(data.services).toContain('AI Implementation');
      expect(data.services).toContain('Cybersecurity');

      // Verify business details
      expect(data.businessDetails?.founded).toBe('2008');
      expect(data.businessDetails?.industry).toBe('Technology Consulting');

      // Verify LLM enhanced data
      expect(data.llmEnhanced?.model).toBe('firecrawl-llm-multipage');
      expect(data.llmEnhanced?.confidence).toBe(0.95);
      expect(data.llmEnhanced?.businessCategory).toBe('Technology Consulting');
    });
  });

  describe('Error Recovery Integration', () => {
    it('should recover from transient Firecrawl API errors', async () => {
      const mockBusiness = {
        id: 6,
        name: 'Recovery Business',
        url: 'https://recoverybusiness.com',
        teamId: 1,
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockSuccessResponse = {
        success: true,
        data: [
          {
            url: 'https://recoverybusiness.com',
            llm_extraction: {
              businessName: 'Recovery Business',
              description: 'Recovered successfully',
            },
          },
        ],
      };

      // Set up mocks
      mockGetBusinessById.mockResolvedValue(mockBusiness);
      mockCreateCrawlJob.mockResolvedValue({ id: 303 });
      mockLLMFingerprinter.fingerprint.mockResolvedValue({ visibilityScore: 80 });

      // First call fails with rate limit, second succeeds
      vi.mocked(fetch)
        .mockResolvedValueOnce({
          ok: false,
          status: 429,
          text: vi.fn().mockResolvedValue('Rate limit exceeded'),
        } as any)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: vi.fn().mockResolvedValue(mockSuccessResponse),
        } as any);

      const result = await executeParallelProcessing(6);

      expect(result.overallSuccess).toBe(true);
      expect(fetch).toHaveBeenCalledTimes(2); // Initial call + retry
    });
  });
});

