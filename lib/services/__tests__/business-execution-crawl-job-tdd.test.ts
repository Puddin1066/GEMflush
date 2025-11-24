/**
 * TDD Test: Crawl Job Creation (P0 Critical Bug)
 * 
 * SPECIFICATION: Crawl Job Must Be Created Before Processing
 * 
 * As a system administrator
 * I want crawl jobs to be created automatically before any processing begins
 * So that errors can be tracked and debugged even when processing fails
 * 
 * Acceptance Criteria:
 * 1. When executeCrawlJob is called with null jobId, a crawl job MUST be created FIRST
 * 2. The crawl job must be created before any crawl execution begins
 * 3. The crawl job must be created even if crawl will fail
 * 4. The crawl job must be linked to the business via businessId
 * 5. If an error occurs, the error must be stored in the crawl job
 * 
 * TDD Cycle:
 * 🔴 RED: This test will fail initially (expected)
 * 🟢 GREEN: Implement to satisfy this specification
 * 🔵 REFACTOR: Improve code while keeping test green
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  BusinessTestFactory,
  CrawlJobTestFactory,
  MockCrawlerFactory,
  MockDatabaseFactory,
} from '@/lib/test-helpers/tdd-helpers';

// Mock dependencies at module level (TDD best practice)
vi.mock('@/lib/db/queries', () => ({
  getBusinessById: vi.fn(),
  updateBusiness: vi.fn(),
  createCrawlJob: vi.fn(),
  updateCrawlJob: vi.fn(),
  getTeamForBusiness: vi.fn(),
}));

vi.mock('@/lib/crawler', () => ({
  webCrawler: {
    crawl: vi.fn(),
  },
}));

vi.mock('@/lib/utils/logger', () => ({
  loggers: {
    processing: {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
    },
    llm: {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
    },
  },
}));

vi.mock('@/lib/utils/error-handling', () => ({
  withRetry: vi.fn((fn) => fn()),
  RETRY_CONFIGS: {
    database: {},
    firecrawl: {},
  },
  ProcessingError: class extends Error {
    constructor(message: string, public code: string, public retryable: boolean, public context?: any) {
      super(message);
      this.name = 'ProcessingError';
    }
  },
  handleParallelProcessingError: vi.fn(),
  sanitizeErrorForLogging: vi.fn((err) => err.message),
}));

vi.mock('@/lib/llm', () => ({
  businessFingerprinter: {
    fingerprint: vi.fn(),
  },
}));

describe('🔴 RED: Crawl Job Creation Specification', () => {
  let mockGetBusinessById: any;
  let mockCreateCrawlJob: any;
  let mockUpdateCrawlJob: any;
  let mockUpdateBusiness: any;
  let mockWebCrawlerCrawl: any;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Get mocked modules (they're already mocked at module level)
    const dbQueries = await import('@/lib/db/queries');
    const crawler = await import('@/lib/crawler');

    // Assign mock functions
    mockGetBusinessById = dbQueries.getBusinessById;
    mockCreateCrawlJob = dbQueries.createCrawlJob;
    mockUpdateCrawlJob = dbQueries.updateCrawlJob;
    mockUpdateBusiness = dbQueries.updateBusiness;
    mockWebCrawlerCrawl = crawler.webCrawler.crawl;
  });

  /**
   * SPECIFICATION 1: Crawl job must be created when jobId is null
   * 
   * Given: A business that needs crawling
   * And: No existing crawl job (jobId is null)
   * When: executeCrawlJob is called
   * Then: A crawl job should be created FIRST
   * And: The crawl job should have status 'pending' or 'running'
   * And: The crawl job should be linked to the business
   */
  it('creates crawl job when jobId is null', async () => {
    // Arrange: Set up test data
    const business = BusinessTestFactory.create({
      id: 123,
      status: 'pending',
      url: 'https://example.com',
    });
    const crawlJob = CrawlJobTestFactory.create({
      id: 456,
      businessId: business.id,
      status: 'running',
    });

    // Mock database responses
    mockGetBusinessById.mockResolvedValue(business);
    mockCreateCrawlJob.mockResolvedValue(crawlJob);
    mockUpdateCrawlJob.mockResolvedValue(undefined);
    mockUpdateBusiness.mockResolvedValue(undefined);

    // Mock successful crawl
    mockWebCrawlerCrawl.mockResolvedValue({
      success: true,
      data: { url: business.url, content: '<html>Test</html>' },
    });

    // Act: Import and execute (this will fail initially - RED phase)
    const { executeCrawlJob } = await import('@/lib/services/business-execution');
    await executeCrawlJob(null, business.id, business);

    // Assert: Verify crawl job was created
    expect(mockCreateCrawlJob).toHaveBeenCalled();
    expect(mockCreateCrawlJob).toHaveBeenCalledWith(
      expect.objectContaining({
        businessId: business.id,
      })
    );
  });

  /**
   * SPECIFICATION 2: Crawl job must be created BEFORE crawl execution
   * 
   * Given: A business that needs crawling
   * When: executeCrawlJob is called
   * Then: createCrawlJob must be called BEFORE webCrawler.crawl
   */
  it('creates crawl job before crawl execution begins', async () => {
    // Arrange
    const business = BusinessTestFactory.create({
      id: 123,
      status: 'pending',
      url: 'https://example.com',
    });
    const crawlJob = CrawlJobTestFactory.create({
      id: 456,
      businessId: business.id,
    });

    mockGetBusinessById.mockResolvedValue(business);
    mockCreateCrawlJob.mockResolvedValue(crawlJob);
    mockUpdateCrawlJob.mockResolvedValue(undefined);
    mockUpdateBusiness.mockResolvedValue(undefined);

    mockWebCrawlerCrawl.mockResolvedValue({
      success: true,
      data: { url: business.url, content: '<html>Test</html>' },
    });

    // Act
    const { executeCrawlJob } = await import('@/lib/services/business-execution');
    await executeCrawlJob(null, business.id, business);

    // Assert: Verify call order
    const createCrawlJobCallOrder = mockCreateCrawlJob.mock.invocationCallOrder[0];
    const crawlCallOrder = mockWebCrawlerCrawl.mock.invocationCallOrder[0];

    expect(createCrawlJobCallOrder).toBeLessThan(crawlCallOrder);
  });

  /**
   * SPECIFICATION 3: Crawl job must be created even when crawl will fail
   * 
   * Given: A business that needs crawling
   * And: The crawl will fail
   * When: executeCrawlJob is called
   * Then: A crawl job should be created BEFORE the error
   * And: The error should be stored in the crawl job
   */
  it('creates crawl job even when crawl will fail', async () => {
    // Arrange
    const business = BusinessTestFactory.create({
      id: 123,
      status: 'pending',
      url: 'https://example.com',
    });
    const crawlJob = CrawlJobTestFactory.create({
      id: 456,
      businessId: business.id,
      status: 'running',
    });
    const errorMessage = 'Network timeout';

    mockGetBusinessById.mockResolvedValue(business);
    mockCreateCrawlJob.mockResolvedValue(crawlJob);
    mockUpdateCrawlJob.mockResolvedValue(undefined);
    mockUpdateBusiness.mockResolvedValue(undefined);

    // Mock failing crawl
    mockWebCrawlerCrawl.mockRejectedValue(new Error(errorMessage));

    // Act
    const { executeCrawlJob } = await import('@/lib/services/business-execution');
    
    try {
      await executeCrawlJob(null, business.id, business);
    } catch (error) {
      // Expected - error should be thrown
    }

    // Assert: Verify crawl job was created BEFORE error
    expect(mockCreateCrawlJob).toHaveBeenCalled();

    // Assert: Verify error was stored in crawl job
    // Note: Implementation uses 'failed' status, which is acceptable
    expect(mockUpdateCrawlJob).toHaveBeenCalledWith(
      crawlJob.id,
      expect.objectContaining({
        status: expect.stringMatching(/error|failed/),
        errorMessage: expect.stringContaining(errorMessage),
      })
    );
  });

  /**
   * SPECIFICATION 4: Crawl job must be linked to business
   * 
   * Given: A business with ID 123
   * When: executeCrawlJob is called
   * Then: The created crawl job must have businessId = 123
   */
  it('links crawl job to business via businessId', async () => {
    // Arrange
    const business = BusinessTestFactory.create({
      id: 123,
      status: 'pending',
      url: 'https://example.com',
    });
    const crawlJob = CrawlJobTestFactory.create({
      id: 456,
      businessId: business.id,
    });

    mockGetBusinessById.mockResolvedValue(business);
    mockCreateCrawlJob.mockResolvedValue(crawlJob);
    mockUpdateCrawlJob.mockResolvedValue(undefined);
    mockUpdateBusiness.mockResolvedValue(undefined);

    mockWebCrawlerCrawl.mockResolvedValue({
      success: true,
      data: { url: business.url, content: '<html>Test</html>' },
    });

    // Act
    const { executeCrawlJob } = await import('@/lib/services/business-execution');
    await executeCrawlJob(null, business.id, business);

    // Assert: Verify businessId is correct
    expect(mockCreateCrawlJob).toHaveBeenCalledWith(
      expect.objectContaining({
        businessId: business.id,
      })
    );
  });
});

