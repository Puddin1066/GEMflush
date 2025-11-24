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
    });

    it('MUST extract business information using LLM schema', async () => {
      // Arrange: Custom extraction schema
      process.env.FIRECRAWL_API_KEY = 'test-key';
      
      const customSchema = {
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
      expect(result.data[0].extract).toMatchObject({
        businessName: 'Test Business',
        phone: '+1-555-123-4567',
        email: 'test@example.com',
      });
    });

    it('MUST handle async job polling for long-running crawls', async () => {
      // Arrange: Job-based crawl
      process.env.FIRECRAWL_API_KEY = 'test-key';
      
      // First call returns job ID
      vi.mocked(global.fetch)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            jobId: 'fc-job-123',
            status: 'processing',
          }),
        } as Response)
        // Polling calls return processing
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            status: 'processing',
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
      expect(result.status).toBe('completed');
      expect(global.fetch).toHaveBeenCalledTimes(3); // Initial + 2 polls
    });
  });
});

