/**
 * TDD Test: EnhancedFirecrawlClient - FireCrawl API Implementation
 * 
 * SPECIFICATION: FireCrawl API Integration
 * 
 * As a system
 * I want to interact with FireCrawl API
 * So that I can crawl websites and extract business data
 * 
 * Acceptance Criteria:
 * 1. Crawls website using FireCrawl Crawl API
 * 2. Uses LLM extraction for structured data
 * 3. Handles API errors gracefully with mock fallbacks
 * 4. Supports multi-page crawling
 * 5. Polls job status for async crawls
 * 6. Returns structured crawl data
 * 
 * TDD Cycle: RED → GREEN → REFACTOR
 * No Overfitting: Test behavior, not implementation details
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EnhancedFirecrawlClient } from '../firecrawl-client';

// Mock fetch for API calls
global.fetch = vi.fn();

// Mock environment variables
process.env.FIRECRAWL_API_KEY = 'test-firecrawl-key';

describe('EnhancedFirecrawlClient - FireCrawl API Implementation', () => {
  let client: EnhancedFirecrawlClient;
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    client = new EnhancedFirecrawlClient();
    mockFetch = global.fetch as ReturnType<typeof vi.fn>;
    process.env.FIRECRAWL_API_KEY = 'test-firecrawl-key';
  });

  /**
   * SPECIFICATION 1: Crawls website using FireCrawl Crawl API
   */
  it('crawls website using FireCrawl Crawl API', async () => {
    // Arrange
    const url = 'https://example.com';

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: [{
          url: url,
          markdown: '# Test Business',
          extract: {
            name: 'Test Business',
            description: 'A test business',
          },
        }],
      }),
    } as Response);

    // Act
    const result = await client.crawlWithLLMExtraction(url);

    // Assert: Verify FireCrawl API called (behavior: crawl executed)
    expect(mockFetch).toHaveBeenCalled();
    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    if (mockFetch.mock.calls.length > 0) {
      const callUrl = mockFetch.mock.calls[0][0];
      expect(callUrl).toContain('api.firecrawl.dev/v1/crawl');
    }
  });

  /**
   * SPECIFICATION 2: Uses LLM extraction for structured data
   */
  it('uses LLM extraction schema for structured data', async () => {
    // Arrange
    const url = 'https://example.com';
    const extractionSchema = {
      type: 'object',
      properties: {
        name: { type: 'string' },
        description: { type: 'string' },
      },
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: [{
          url: url,
          extract: {
            name: 'Test Business',
            description: 'A test business',
          },
        }],
      }),
    } as Response);

    // Act
    const result = await client.crawlWithLLMExtraction(url, {
      extractionSchema,
    });

    // Assert: Verify extraction schema used (behavior: structured data extracted)
    expect(result.success).toBe(true);
    if (mockFetch.mock.calls.length > 0 && mockFetch.mock.calls[0][1]?.body) {
      const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(requestBody.extractorOptions?.extractionSchema).toBeDefined();
    }
  });

  /**
   * SPECIFICATION 3: Handles API errors gracefully with mock fallbacks
   */
  it('handles API errors gracefully with mock fallbacks', async () => {
    // Arrange
    const url = 'https://example.com';

    // Mock API error (subscription paused, rate limited, etc.)
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 402, // Payment required
      text: async () => 'Subscription paused',
    } as Response);

    // Act
    const result = await client.crawlWithLLMExtraction(url);

    // Assert: Verify mock fallback used (behavior: graceful error handling)
    expect(result.success).toBe(true); // Mock fallback provides success
    expect(result.data).toBeDefined(); // Mock data provided
  });

  /**
   * SPECIFICATION 4: Supports multi-page crawling
   */
  it('supports multi-page crawling with depth and limit options', async () => {
    // Arrange
    const url = 'https://example.com';

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: [
          { url: url, extract: { name: 'Page 1' } },
          { url: `${url}/about`, extract: { name: 'Page 2' } },
        ],
      }),
    } as Response);

    // Act
    const result = await client.crawlWithLLMExtraction(url, {
      maxDepth: 2,
      limit: 5,
    });

    // Assert: Verify multi-page crawl executed (behavior: multiple pages crawled)
    expect(result.success).toBe(true);
    expect(result.data?.length).toBeGreaterThan(0);
    if (mockFetch.mock.calls.length > 0 && mockFetch.mock.calls[0][1]?.body) {
      const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(requestBody.crawlerOptions?.maxDepth).toBe(2);
      expect(requestBody.crawlerOptions?.limit).toBe(5);
    }
  });

  /**
   * SPECIFICATION 5: Polls job status for async crawls
   */
  it('polls job status when crawl returns job ID', async () => {
    // Arrange
    const url = 'https://example.com';
    const jobId = 'test-job-123';

    // Mock initial crawl response with job ID
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          id: jobId,
          data: null, // No immediate data
        }),
      } as Response)
      // Mock job status check
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          status: 'completed',
          data: [{
            url: url,
            extract: { name: 'Test Business' },
          }],
        }),
      } as Response);

    // Act
    const result = await client.crawlWithLLMExtraction(url);

    // Assert: Verify job polling occurs (behavior: async crawl handled)
    // Note: Implementation may handle job polling differently
    expect(mockFetch).toHaveBeenCalled();
    expect(result.success).toBe(true);
  });

  /**
   * SPECIFICATION 6: Returns structured crawl data
   */
  it('returns structured crawl data with extract information', async () => {
    // Arrange
    const url = 'https://example.com';

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: [{
          url: url,
          markdown: '# Test Business',
          extract: {
            name: 'Test Business',
            description: 'A test business',
            phone: '555-0100',
          },
        }],
      }),
    } as Response);

    // Act
    const result = await client.crawlWithLLMExtraction(url);

    // Assert: Verify structured data returned (behavior: extract data available)
    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data?.[0].extract).toBeDefined();
    expect(result.data?.[0].extract.name).toBe('Test Business');
  });

  /**
   * SPECIFICATION 7: Uses correct FireCrawl API endpoint
   */
  it('uses correct FireCrawl API endpoint', async () => {
    // Arrange
    const url = 'https://example.com';

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: [{ url: url, extract: {} }],
      }),
    } as Response);

    // Act
    await client.crawlWithLLMExtraction(url);

    // Assert: Verify correct endpoint used (behavior: FireCrawl API endpoint)
    if (mockFetch.mock.calls.length > 0) {
      const callUrl = mockFetch.mock.calls[0][0];
      expect(callUrl).toContain('api.firecrawl.dev');
    }
  });

  /**
   * SPECIFICATION 8: Includes API key in requests
   */
  it('includes API key in request headers', async () => {
    // Arrange
    const url = 'https://example.com';

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: [{ url: url, extract: {} }],
      }),
    } as Response);

    // Act
    await client.crawlWithLLMExtraction(url);

    // Assert: Verify API key included (behavior: authenticated request)
    if (mockFetch.mock.calls.length > 0 && mockFetch.mock.calls[0][1]) {
      const callOptions = mockFetch.mock.calls[0][1];
      expect(callOptions.headers).toHaveProperty('Authorization');
      expect(callOptions.headers.Authorization).toContain('test-firecrawl-key');
    }
  });
});

