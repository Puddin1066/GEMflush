/**
 * TDD Example: Business Execution Service
 * 
 * This file demonstrates TDD workflow for fixing critical bugs:
 * 1. Crawl job creation
 * 2. Error message propagation
 * 3. Status transitions
 * 
 * TDD Cycle:
 * 🔴 RED: Write failing test first
 * 🟢 GREEN: Write minimal code to pass
 * 🔵 REFACTOR: Improve code while keeping tests green
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  BusinessTestFactory,
  TeamTestFactory,
  CrawlJobTestFactory,
  MockCrawlerFactory,
  MockDatabaseFactory,
  TDDAssertions,
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

vi.mock('@/lib/llm', () => ({
  businessFingerprinter: {
    fingerprint: vi.fn(),
  },
}));

describe('Business Execution Service - TDD Example', () => {
  // Get mocked functions
  let mockQueries: ReturnType<typeof MockDatabaseFactory.createSuccess>;
  let mockCrawler: ReturnType<typeof MockCrawlerFactory.createSuccess>;

  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks();

    // Set up default mocks
    mockQueries = MockDatabaseFactory.createSuccess();
    mockCrawler = MockCrawlerFactory.createSuccess();

    // Import and assign mocks
    const queries = require('@/lib/db/queries');
    Object.assign(queries, mockQueries);

    const crawler = require('@/lib/crawler');
    crawler.webCrawler.crawl = mockCrawler.crawl;
  });

  describe('🔴 RED: Crawl Job Creation (Critical Bug Fix)', () => {
    /**
     * TDD Step 1: Write failing test for known bug
     * Bug: Crawl job not created when business status goes to "error"
     * Expected: Crawl job should be created before error occurs
     */
    it('creates crawl job when executing crawl for pending business', async () => {
      // Arrange: Set up test data
      const business = BusinessTestFactory.create({ status: 'pending' });
      const team = TeamTestFactory.createPro();
      const expectedJob = CrawlJobTestFactory.create({ businessId: business.id });

      // Mock database responses
      mockQueries.getBusinessById!.mockResolvedValue(business);
      mockQueries.getTeamForBusiness!.mockResolvedValue(team);
      mockQueries.createCrawlJob!.mockResolvedValue(expectedJob);

      // Mock successful crawl
      mockCrawler.crawl.mockResolvedValue({
        success: true,
        data: { url: business.url, content: '<html>Test</html>' },
      });

      // Act: Import and execute (this will fail initially)
      const { executeCrawlJob } = await import('@/lib/services/business-execution');
      await executeCrawlJob(null, business.id, business);

      // Assert: Verify crawl job was created
      expect(mockQueries.createCrawlJob).toHaveBeenCalledWith(
        expect.objectContaining({
          businessId: business.id,
          status: 'pending',
        })
      );
    });

    it('creates crawl job even when crawl fails', async () => {
      // Arrange: Set up test data with failing crawl
      const business = BusinessTestFactory.create({ status: 'pending' });
      const team = TeamTestFactory.createPro();
      const expectedJob = CrawlJobTestFactory.create({ businessId: business.id });

      // Mock database responses
      mockQueries.getBusinessById!.mockResolvedValue(business);
      mockQueries.getTeamForBusiness!.mockResolvedValue(team);
      mockQueries.createCrawlJob!.mockResolvedValue(expectedJob);

      // Mock failing crawl
      mockCrawler.crawl.mockRejectedValue(new Error('Crawl failed'));

      // Act: Import and execute
      const { executeCrawlJob } = await import('@/lib/services/business-execution');
      await executeCrawlJob(null, business.id, business);

      // Assert: Verify crawl job was created BEFORE error
      expect(mockQueries.createCrawlJob).toHaveBeenCalled();
      
      // Assert: Verify error was propagated to job
      expect(mockQueries.updateCrawlJob).toHaveBeenCalledWith(
        expectedJob.id,
        expect.objectContaining({
          status: 'error',
          errorMessage: expect.stringContaining('Crawl failed'),
        })
      );
    });
  });

  describe('🔴 RED: Error Message Propagation (Critical Bug Fix)', () => {
    /**
     * TDD Step 1: Write failing test for error propagation bug
     * Bug: Error messages not propagated to crawl job
     * Expected: Error message should be set on crawl job when error occurs
     */
    it('propagates error message to crawl job when crawl fails', async () => {
      // Arrange: Set up test data
      const business = BusinessTestFactory.create({ status: 'pending' });
      const team = TeamTestFactory.createPro();
      const crawlJob = CrawlJobTestFactory.create({ businessId: business.id });
      const errorMessage = 'Crawl failed: Network timeout';

      // Mock database responses
      mockQueries.getBusinessById!.mockResolvedValue(business);
      mockQueries.getTeamForBusiness!.mockResolvedValue(team);
      mockQueries.createCrawlJob!.mockResolvedValue(crawlJob);

      // Mock failing crawl with specific error
      mockCrawler.crawl.mockRejectedValue(new Error(errorMessage));

      // Act: Import and execute
      const { executeCrawlJob } = await import('@/lib/services/business-execution');
      await executeCrawlJob(null, business.id, business);

      // Assert: Verify error message was set on crawl job
      expect(mockQueries.updateCrawlJob).toHaveBeenCalledWith(
        crawlJob.id,
        expect.objectContaining({
          status: 'error',
          errorMessage: expect.stringContaining(errorMessage),
        })
      );
    });

    it('uses actualJobId for error propagation, not null jobId', async () => {
      // Arrange: Test the P0 fix - actualJobId should be used in catch block
      const business = BusinessTestFactory.create({ status: 'pending' });
      const team = TeamTestFactory.createPro();
      const crawlJob = CrawlJobTestFactory.create({ 
        businessId: business.id,
        id: 123, // Actual job ID created
      });

      // Mock database responses
      mockQueries.getBusinessById!.mockResolvedValue(business);
      mockQueries.getTeamForBusiness!.mockResolvedValue(team);
      mockQueries.createCrawlJob!.mockResolvedValue(crawlJob);

      // Mock failing crawl
      mockCrawler.crawl.mockRejectedValue(new Error('Crawl failed'));

      // Act: Import and execute with null jobId (job will be created)
      const { executeCrawlJob } = await import('@/lib/services/business-execution');
      await executeCrawlJob(null, business.id, business);

      // Assert: Verify updateCrawlJob was called with actualJobId (123), not null
      expect(mockQueries.updateCrawlJob).toHaveBeenCalledWith(
        crawlJob.id, // Should use actualJobId, not null
        expect.any(Object)
      );
    });
  });

  describe('🔴 RED: Status Transitions', () => {
    /**
     * TDD Step 1: Write failing tests for status transitions
     * Expected: Business status should transition correctly through states
     */
    it('transitions business status from pending to crawled on successful crawl', async () => {
      // Arrange
      const business = BusinessTestFactory.create({ status: 'pending' });
      const team = TeamTestFactory.createPro();
      const crawlJob = CrawlJobTestFactory.create({ businessId: business.id });

      // Mock database responses
      mockQueries.getBusinessById!.mockResolvedValue(business);
      mockQueries.getTeamForBusiness!.mockResolvedValue(team);
      mockQueries.createCrawlJob!.mockResolvedValue(crawlJob);

      // Mock successful crawl
      const crawlData = { url: business.url, content: '<html>Test</html>' };
      mockCrawler.crawl.mockResolvedValue({ success: true, data: crawlData });

      // Act
      const { executeCrawlJob } = await import('@/lib/services/business-execution');
      await executeCrawlJob(null, business.id, business);

      // Assert: Verify business status was updated to crawled
      expect(mockQueries.updateBusiness).toHaveBeenCalledWith(
        business.id,
        expect.objectContaining({
          status: 'crawled',
          crawlData: expect.any(Object),
          lastCrawledAt: expect.any(Date),
        })
      );
    });

    it('transitions business status to error when crawl fails', async () => {
      // Arrange
      const business = BusinessTestFactory.create({ status: 'pending' });
      const team = TeamTestFactory.createPro();
      const crawlJob = CrawlJobTestFactory.create({ businessId: business.id });

      // Mock database responses
      mockQueries.getBusinessById!.mockResolvedValue(business);
      mockQueries.getTeamForBusiness!.mockResolvedValue(team);
      mockQueries.createCrawlJob!.mockResolvedValue(crawlJob);

      // Mock failing crawl
      mockCrawler.crawl.mockRejectedValue(new Error('Crawl failed'));

      // Act
      const { executeCrawlJob } = await import('@/lib/services/business-execution');
      await executeCrawlJob(null, business.id, business);

      // Assert: Verify business status was updated to error
      expect(mockQueries.updateBusiness).toHaveBeenCalledWith(
        business.id,
        expect.objectContaining({
          status: 'error',
          errorMessage: expect.stringContaining('Crawl failed'),
        })
      );
    });
  });

  describe('🟢 GREEN: Edge Cases', () => {
    /**
     * TDD Step 2: Write tests for edge cases after main functionality works
     */
    it('handles business not found gracefully', async () => {
      // Arrange
      mockQueries.getBusinessById!.mockResolvedValue(null);

      // Act & Assert
      const { executeCrawlJob } = await import('@/lib/services/business-execution');
      await expect(executeCrawlJob(null, 999, undefined)).rejects.toThrow('Business not found');
    });

    it('handles database errors gracefully', async () => {
      // Arrange
      const business = BusinessTestFactory.create();
      mockQueries.getBusinessById!.mockResolvedValue(business);
      mockQueries.createCrawlJob!.mockRejectedValue(new Error('Database connection failed'));

      // Act & Assert
      const { executeCrawlJob } = await import('@/lib/services/business-execution');
      await expect(executeCrawlJob(null, business.id, business)).rejects.toThrow();
    });
  });
});

/**
 * TDD Workflow Notes:
 * 
 * 1. 🔴 RED Phase:
 *    - Write these tests first
 *    - They will fail initially (that's expected!)
 *    - This documents the desired behavior
 * 
 * 2. 🟢 GREEN Phase:
 *    - Implement minimal code to make tests pass
 *    - Don't worry about code quality yet
 *    - Just make it work
 * 
 * 3. 🔵 REFACTOR Phase:
 *    - Once tests pass, improve the code
 *    - Apply SOLID principles
 *    - Remove duplication (DRY)
 *    - Tests should still pass after refactoring
 * 
 * 4. Repeat:
 *    - Write next failing test
 *    - Make it pass
 *    - Refactor
 */

