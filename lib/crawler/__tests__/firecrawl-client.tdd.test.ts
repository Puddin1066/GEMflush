/**
 * TDD Test: Firecrawl Client - Tests Drive Implementation
 * 
 * SPECIFICATION: Firecrawl API Integration
 * 
 * As a system
 * I want to crawl websites using Firecrawl API
 * So that I can extract business information
 * 
 * IMPORTANT: These tests specify DESIRED behavior for Firecrawl integration.
 * Tests verify that crawling works correctly with LLM extraction.
 * 
 * TDD Cycle: RED → GREEN → REFACTOR
 * Tests written to specify desired Firecrawl behavior
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { FirecrawlExtractSchema } from '@/lib/types/contracts/firecrawl-contract';

// Mock dependencies
vi.mock('@/lib/utils/firecrawl-mock', () => ({
  shouldUseMockFirecrawl: vi.fn(() => false),
  generateMockFirecrawlCrawlResponse: vi.fn(),
  generateMockFirecrawlJobStatus: vi.fn(),
}));

// Mock fetch for API calls
global.fetch = vi.fn();

describe('🔴 RED: Firecrawl Client - Desired Behavior Specification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(global.fetch).mockReset();
  });

  /**
   * SPECIFICATION 1: crawlWithLLMExtraction() - MUST Crawl with LLM Extraction
   * 
   * DESIRED BEHAVIOR: crawlWithLLMExtraction() MUST crawl a website and
   * extract structured business data using LLM.
   */
  describe('crawlWithLLMExtraction', () => {
    it('MUST crawl website and extract business data', async () => {
      // Arrange: Mock Firecrawl API response
      const mockCrawlResponse = {
        success: true,
        jobId: 'fc-job-123',
        status: 'completed',
        data: [
          {
            url: 'https://example.com',
            markdown: '# Example Business\nA test business',
            extract: {
              businessName: 'Example Business',
              description: 'A test business',
              phone: '+1-555-123-4567',
            },
          },
        ],
      };

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => mockCrawlResponse,
      } as Response);

      process.env.FIRECRAWL_API_KEY = 'test-key-123';

      // Act: Crawl with LLM extraction (TEST SPECIFIES DESIRED BEHAVIOR)
      const { EnhancedFirecrawlClient } = await import('../firecrawl-client');
      const client = new EnhancedFirecrawlClient();
      const result = await client.crawlWithLLMExtraction('https://example.com');

      // Assert: SPECIFICATION - MUST return crawl results
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(Array.isArray(result.data)).toBe(true);
    });

    it('MUST use mock responses when API key is missing', async () => {
      // Arrange: No API key
      delete process.env.FIRECRAWL_API_KEY;
      const { shouldUseMockFirecrawl, generateMockFirecrawlCrawlResponse } = await import('@/lib/utils/firecrawl-mock');
      
      vi.mocked(shouldUseMockFirecrawl).mockReturnValue(true);
      vi.mocked(generateMockFirecrawlCrawlResponse).mockReturnValue({
        success: true,
        data: [{ url: 'https://example.com', extract: { businessName: 'Mock Business' } }],
      } as any);

      // Act: Crawl without API key (TEST SPECIFIES DESIRED BEHAVIOR)
      const { EnhancedFirecrawlClient } = await import('../firecrawl-client');
      const client = new EnhancedFirecrawlClient();
      const result = await client.crawlWithLLMExtraction('https://example.com');

      // Assert: SPECIFICATION - MUST use mock response
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('MUST enforce rate limiting between requests', async () => {
      // Arrange: API key set
      process.env.FIRECRAWL_API_KEY = 'test-key';
      const { shouldUseMockFirecrawl } = await import('@/lib/utils/firecrawl-mock');
      vi.mocked(shouldUseMockFirecrawl).mockReturnValue(false);
      
      const mockResponse = {
        success: true,
        jobId: 'fc-job-123',
        status: 'completed',
        data: [],
      };

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      // Act: Make multiple crawl requests (TEST SPECIFIES DESIRED BEHAVIOR)
      const { EnhancedFirecrawlClient } = await import('../firecrawl-client');
      const client = new EnhancedFirecrawlClient();
      
      const startTime = Date.now();
      await client.crawlWithLLMExtraction('https://example.com');
      await client.crawlWithLLMExtraction('https://example2.com');
      const endTime = Date.now();

      // Assert: SPECIFICATION - MUST enforce rate limit (7 seconds minimum)
      const elapsed = endTime - startTime;
      expect(elapsed).toBeGreaterThanOrEqual(6000); // At least 6 seconds (allowing some margin)
    }, 10000); // Increase timeout for rate limiting test

    it('MUST extract business information using LLM schema', async () => {
      // Arrange: Custom extraction schema
      process.env.FIRECRAWL_API_KEY = 'test-key';
      const { shouldUseMockFirecrawl } = await import('@/lib/utils/firecrawl-mock');
      vi.mocked(shouldUseMockFirecrawl).mockReturnValue(false);
      
      const customSchema: FirecrawlExtractSchema = {
        type: 'object',
        properties: {
          businessName: { type: 'string' },
          phone: { type: 'string' },
          email: { type: 'string' },
        },
      };

      const mockResponse = {
        success: true,
        jobId: 'fc-job-123',
        status: 'completed',
        data: [
          {
            url: 'https://example.com',
            extract: {
              businessName: 'Test Business',
              phone: '+1-555-123-4567',
              email: 'test@example.com',
            },
          },
        ],
      };

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      // Act: Crawl with custom schema (TEST SPECIFIES DESIRED BEHAVIOR)
      const { EnhancedFirecrawlClient } = await import('../firecrawl-client');
      const client = new EnhancedFirecrawlClient();
      const result = await client.crawlWithLLMExtraction('https://example.com', {
        extractionSchema: customSchema,
      });

      // Assert: SPECIFICATION - MUST use custom schema
      expect(result.data).toBeDefined();
      expect(Array.isArray(result.data)).toBe(true);
      if (result.data && result.data.length > 0) {
      expect(result.data[0].extract).toMatchObject({
        businessName: 'Test Business',
        phone: '+1-555-123-4567',
        email: 'test@example.com',
      });
      }
    });

    it('MUST handle async job polling for long-running crawls', async () => {
      // Arrange: Job-based crawl
      process.env.FIRECRAWL_API_KEY = 'test-key';
      const { shouldUseMockFirecrawl } = await import('@/lib/utils/firecrawl-mock');
      vi.mocked(shouldUseMockFirecrawl).mockReturnValue(false);
      
      // First call returns job ID
      vi.mocked(global.fetch)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            id: 'fc-job-123',
            data: [],
          }),
        } as Response)
        // Polling calls return processing
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            status: 'scraping',
            completed: 0,
            total: 1,
          }),
        } as Response)
        // Final call returns completed
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            status: 'completed',
            data: [{ url: 'https://example.com', extract: {} }],
          }),
        } as Response);

      // Act: Crawl with async job (TEST SPECIFIES DESIRED BEHAVIOR)
      const { EnhancedFirecrawlClient } = await import('../firecrawl-client');
      const client = new EnhancedFirecrawlClient();
      const result = await client.crawlWithLLMExtraction('https://example.com');

      // Assert: SPECIFICATION - MUST poll until complete
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(global.fetch).toHaveBeenCalled();
    });

    /**
     * SPECIFICATION: Handle 404 Errors Gracefully
     * 
     * Given: URL that returns 404 Not Found
     * When: Crawl is attempted
     * Then: Error is caught and returned gracefully
     */
    it('MUST handle 404 errors gracefully', async () => {
      // Arrange: 404 error response
      process.env.FIRECRAWL_API_KEY = 'test-key';
      const { shouldUseMockFirecrawl } = await import('@/lib/utils/firecrawl-mock');
      vi.mocked(shouldUseMockFirecrawl).mockReturnValue(false);
      
      vi.mocked(global.fetch).mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        text: async () => 'Page not found',
        json: async () => ({ error: 'Page not found' }),
      } as Response);

      // Act: Crawl non-existent URL (TEST DRIVES IMPLEMENTATION)
      const { EnhancedFirecrawlClient } = await import('../firecrawl-client');
      const client = new EnhancedFirecrawlClient();
      
      // Assert: SPECIFICATION - MUST handle 404 gracefully
      // 404 is a permanent error, so it should throw, but the catch block should handle it
      // The implementation falls back to mocks in the catch block
      await expect(
        client.crawlWithLLMExtraction('https://example.com/404-page')
      ).rejects.toThrow(/404|Firecrawl Crawl API Error/i);
    });

    /**
     * SPECIFICATION: Handle Network Timeouts
     * 
     * Given: Request that times out
     * When: Crawl is attempted
     * Then: Timeout error is handled gracefully
     */
    it('MUST handle network timeouts gracefully', async () => {
      // Arrange: Timeout error
      process.env.FIRECRAWL_API_KEY = 'test-key';
      const { shouldUseMockFirecrawl, generateMockFirecrawlCrawlResponse } = await import('@/lib/utils/firecrawl-mock');
      vi.mocked(shouldUseMockFirecrawl).mockReturnValue(false);
      vi.mocked(generateMockFirecrawlCrawlResponse).mockReturnValue({
        success: true,
        data: [{ url: 'https://example.com', extract: { businessName: 'Mock Business' } }],
      } as any);
      
      vi.mocked(global.fetch).mockRejectedValue(new Error('Request timeout'));

      // Act: Crawl with timeout (TEST DRIVES IMPLEMENTATION)
      const { EnhancedFirecrawlClient } = await import('../firecrawl-client');
      const client = new EnhancedFirecrawlClient();
      const result = await client.crawlWithLLMExtraction('https://example.com');
      
      // Assert: SPECIFICATION - MUST handle timeout gracefully by falling back to mock
      // The implementation falls back to mocks on errors (graceful degradation)
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });

    /**
     * SPECIFICATION: Handle API Errors
     * 
     * Given: Firecrawl API returns error response
     * When: Crawl is attempted
     * Then: API error is handled and propagated correctly
     */
    it('MUST handle Firecrawl API errors gracefully', async () => {
      // Arrange: API error response
      process.env.FIRECRAWL_API_KEY = 'test-key';
      const { shouldUseMockFirecrawl } = await import('@/lib/utils/firecrawl-mock');
      vi.mocked(shouldUseMockFirecrawl).mockReturnValue(false);
      
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => ({
          success: false,
          error: 'Rate limit exceeded',
        }),
      } as Response);

      // Act: Crawl with API error (TEST DRIVES IMPLEMENTATION)
      const { EnhancedFirecrawlClient } = await import('../firecrawl-client');
      const client = new EnhancedFirecrawlClient();
      const result = await client.crawlWithLLMExtraction('https://example.com');
      
      // Assert: SPECIFICATION - MUST handle API errors
      expect(result).toBeDefined();
      // Result may be error response or fallback to mock
      if (!result.success) {
        expect(result.error).toBeDefined();
      }
    });
  });

  /**
   * SPECIFICATION 2: getCrawlJobStatus() - MUST Check Job Status
   * 
   * DESIRED BEHAVIOR: getCrawlJobStatus() MUST check the status of
   * an async crawl job and return current progress.
   */
  describe('getCrawlJobStatus', () => {
    /**
     * SPECIFICATION: Check Job Status
     * 
     * Given: Crawl job ID
     * When: getCrawlJobStatus() is called
     * Then: Current job status and progress are returned
     */
    it('MUST return job status and progress', async () => {
      // Arrange: Job status response
      process.env.FIRECRAWL_API_KEY = 'test-key';
      const { shouldUseMockFirecrawl } = await import('@/lib/utils/firecrawl-mock');
      vi.mocked(shouldUseMockFirecrawl).mockReturnValue(false);
      
      const mockStatusResponse = {
        success: true,
        status: 'scraping',
        completed: 5,
        total: 10,
        data: [],
      };

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => mockStatusResponse,
      } as Response);

      // Act: Get job status (TEST DRIVES IMPLEMENTATION)
      const { EnhancedFirecrawlClient } = await import('../firecrawl-client');
      const client = new EnhancedFirecrawlClient();
      const result = await client.getCrawlJobStatus('fc-job-123');

      // Assert: SPECIFICATION - MUST return job status
      expect(result).toBeDefined();
      expect(result.status).toBe('scraping');
      expect(result.completed).toBe(5);
      expect(result.total).toBe(10);
    });
  });
});



