/**
 * TDD Test: EnhancedWebCrawler - FireCrawl API Integration
 * 
 * SPECIFICATION: Web Crawling via FireCrawl
 * 
 * As a system
 * I want to crawl websites using FireCrawl API
 * So that I can extract business data from websites
 * 
 * Acceptance Criteria:
 * 1. Crawls website using FireCrawl API
 * 2. Returns structured crawl data
 * 3. Handles errors gracefully with fallbacks
 * 4. Supports multi-page crawling
 * 5. Updates crawl job progress
 * 
 * TDD Cycle: RED → GREEN → REFACTOR
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { webCrawler } from '../index';

// Mock dependencies
vi.mock('../firecrawl-client', () => ({
  firecrawlClient: {
    crawlWithLLMExtraction: vi.fn(),
    getJobStatus: vi.fn(),
  },
}));

vi.mock('@/lib/db/queries', () => ({
  updateCrawlJob: vi.fn(),
}));

vi.mock('@/lib/utils/firecrawl-mock', () => ({
  generateMockFirecrawlCrawlResponse: vi.fn((url) => ({
    success: true,
    data: [{ url, extract: { name: 'Mock Business' } }],
  })),
}));

describe('EnhancedWebCrawler - FireCrawl API Integration', () => {
  let mockCrawlWithLLMExtraction: any;
  let mockUpdateCrawlJob: any;

  beforeEach(async () => {
    vi.clearAllMocks();

    const firecrawl = await import('../firecrawl-client');
    const dbQueries = await import('@/lib/db/queries');

    mockCrawlWithLLMExtraction = firecrawl.firecrawlClient.crawlWithLLMExtraction;
    mockUpdateCrawlJob = dbQueries.updateCrawlJob;
  });

  /**
   * SPECIFICATION 1: Crawls website using FireCrawl API
   */
  it('crawls website using FireCrawl API', async () => {
    // Arrange
    const url = 'https://example.com';

    mockCrawlWithLLMExtraction.mockResolvedValue({
      success: true,
      data: [{
        url: url,
        extract: {
          name: 'Test Business',
          description: 'A test business',
        },
      }],
    });

    // Act
    const result = await webCrawler.crawl(url);

    // Assert: Verify FireCrawl API used (behavior: crawl executed)
    expect(mockCrawlWithLLMExtraction).toHaveBeenCalledWith(
      url,
      expect.objectContaining({
        maxDepth: expect.any(Number),
        limit: expect.any(Number),
      })
    );
    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
  });

  /**
   * SPECIFICATION 2: Returns structured crawl data
   */
  it('returns structured crawl data from FireCrawl', async () => {
    // Arrange
    const url = 'https://example.com';
    const crawlData = {
      name: 'Test Business',
      description: 'A test business',
      phone: '555-0100',
    };

    mockCrawlWithLLMExtraction.mockResolvedValue({
      success: true,
      data: [{
        url: url,
        extract: crawlData,
      }],
    });

    // Act
    const result = await webCrawler.crawl(url);

    // Assert: Verify structured data returned (behavior: extract data available)
    expect(result.success).toBe(true);
    expect(result.data).toMatchObject(crawlData);
  });

  /**
   * SPECIFICATION 3: Handles errors gracefully with fallbacks
   */
  it('handles FireCrawl API errors gracefully with fallbacks', async () => {
    // Arrange
    const url = 'https://example.com';

    mockCrawlWithLLMExtraction.mockResolvedValue({
      success: false,
      error: 'API error',
    });

    // Act
    const result = await webCrawler.crawl(url);

    // Assert: Verify fallback used (behavior: graceful error handling)
    expect(result.success).toBe(true); // Fallback provides success
    expect(result.data).toBeDefined(); // Mock data provided
  });

  /**
   * SPECIFICATION 4: Supports multi-page crawling
   */
  it('supports multi-page crawling with FireCrawl', async () => {
    // Arrange
    const url = 'https://example.com';

    mockCrawlWithLLMExtraction.mockResolvedValue({
      success: true,
      data: [
        { url: url, extract: { name: 'Page 1' } },
        { url: `${url}/about`, extract: { name: 'Page 2' } },
      ],
    });

    // Act
    const result = await webCrawler.crawl(url);

    // Assert: Verify multi-page crawl (behavior: multiple pages processed)
    expect(result.success).toBe(true);
    expect(mockCrawlWithLLMExtraction).toHaveBeenCalledWith(
      url,
      expect.objectContaining({
        maxDepth: expect.any(Number),
        limit: expect.any(Number),
      })
    );
  });

  /**
   * SPECIFICATION 5: Updates crawl job progress
   */
  it('updates crawl job progress when jobId provided', async () => {
    // Arrange
    const url = 'https://example.com';
    const jobId = 123;

    mockCrawlWithLLMExtraction.mockResolvedValue({
      success: true,
      data: [{ url: url, extract: {} }],
    });

    // Act
    await webCrawler.crawl(url, jobId);

    // Assert: Verify job progress updated (behavior: progress tracked)
    expect(mockUpdateCrawlJob).toHaveBeenCalled();
    const updateCall = mockUpdateCrawlJob.mock.calls.find((call: any[]) => 
      call[0] === jobId
    );
    expect(updateCall).toBeDefined();
  });
});



