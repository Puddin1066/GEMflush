/**
 * TDD Test: Business Execution Service - Tests Drive Implementation
 * 
 * SPECIFICATION: Business Processing Execution Service
 * 
 * As a system
 * I want to execute crawl and fingerprint operations reliably
 * So that businesses can be processed through the CFP workflow
 * 
 * IMPORTANT: These tests specify CORRECT behavior, not current behavior.
 * If tests fail, the code is wrong and must be fixed to satisfy the specification.
 * 
 * TDD Cycle: RED → GREEN → REFACTOR
 * 1. Write test (specification) → Test may FAIL (RED) if code is wrong
 * 2. Fix code to satisfy specification → Test passes (GREEN)
 * 3. Refactor while keeping tests green
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  BusinessTestFactory,
  CrawlJobTestFactory,
} from '@/lib/test-helpers/tdd-helpers';

// Mock dependencies
vi.mock('@/lib/db/queries', () => ({
  getBusinessById: vi.fn(),
  updateBusiness: vi.fn(),
  createCrawlJob: vi.fn(),
  updateCrawlJob: vi.fn(),
  getTeamForBusiness: vi.fn(),
  createFingerprint: vi.fn(),
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

vi.mock('@/lib/utils/error-handling', () => ({
  withRetry: vi.fn((fn) => fn()),
  RETRY_CONFIGS: {
    database: { maxRetries: 3 },
    firecrawl: { maxRetries: 3 },
    llm: { maxRetries: 3 },
  },
  ProcessingError: class ProcessingError extends Error {
    constructor(message: string, public code: string, public retryable: boolean, public context?: any) {
      super(message);
      this.name = 'ProcessingError';
    }
  },
  handleParallelProcessingError: vi.fn(),
  sanitizeErrorForLogging: vi.fn((error) => error),
}));

vi.mock('@/lib/utils/logger', () => ({
  loggers: {
    processing: {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
    },
  },
}));

describe('🔴 RED: Business Execution Service - Correct Behavior Specification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * SPECIFICATION 1: Execute Crawl Job - MUST Create Job Before Execution
   * 
   * CORRECT BEHAVIOR: When jobId is null, a crawl job MUST be created
   * before any crawl execution begins. This ensures error tracking.
   * 
   * If this test fails, the code is wrong and must be fixed.
   */
  it('MUST create crawl job when jobId is null before execution', async () => {
    // Arrange: Business with no crawl job
    const business = BusinessTestFactory.create({ id: 1, status: 'pending' });
    const crawlJob = CrawlJobTestFactory.create({ id: 123, businessId: 1 });

    const queries = await import('@/lib/db/queries');
    const crawler = await import('@/lib/crawler');
    
    vi.mocked(queries.getBusinessById).mockResolvedValue(business);
    vi.mocked(queries.createCrawlJob).mockResolvedValue(crawlJob);
    vi.mocked(crawler.webCrawler.crawl).mockResolvedValue({
      success: true,
      data: { url: business.url, content: '<html>Test</html>' },
    });
    vi.mocked(queries.updateBusiness).mockResolvedValue(business);
    vi.mocked(queries.updateCrawlJob).mockResolvedValue(crawlJob);

    // Act: Execute crawl job with null jobId
    const { executeCrawlJob } = await import('../business-execution');
    const result = await executeCrawlJob(null, business.id);

    // Assert: SPECIFICATION - Job MUST be created BEFORE crawl execution
    // If this fails, code is wrong - fix it!
    expect(queries.createCrawlJob).toHaveBeenCalled();
    const createCallOrder = vi.mocked(queries.createCrawlJob).mock.invocationCallOrder[0];
    const crawlCallOrder = vi.mocked(crawler.webCrawler.crawl).mock.invocationCallOrder[0];
    expect(createCallOrder).toBeLessThan(crawlCallOrder); // Job created BEFORE crawl
    expect(result.success).toBe(true);
  });

  /**
   * SPECIFICATION 2: Execute Crawl Job - MUST Update Business Status to 'crawled'
   * 
   * CORRECT BEHAVIOR: When crawl succeeds, business status MUST be updated to 'crawled'
   * to reflect that crawl data is available.
   * 
   * If this test fails, the code is wrong and must be fixed.
   */
  it('MUST update business status to crawled on successful crawl', async () => {
    // Arrange: Successful crawl
    const business = BusinessTestFactory.create({ id: 1, status: 'pending' });
    const crawlJob = CrawlJobTestFactory.create({ id: 123, businessId: 1 });
    const crawlData = {
      url: business.url,
      content: '<html>Test</html>',
      title: 'Test Business',
    };

    const queries = await import('@/lib/db/queries');
    const crawler = await import('@/lib/crawler');
    
    vi.mocked(queries.getBusinessById).mockResolvedValue(business);
    vi.mocked(queries.createCrawlJob).mockResolvedValue(crawlJob);
    vi.mocked(crawler.webCrawler.crawl).mockResolvedValue({
      success: true,
      data: crawlData,
    });
    vi.mocked(queries.updateBusiness).mockResolvedValue(business);
    vi.mocked(queries.updateCrawlJob).mockResolvedValue(crawlJob);

    // Act: Execute crawl job
    const { executeCrawlJob } = await import('../business-execution');
    await executeCrawlJob(null, business.id);

    // Assert: SPECIFICATION - Business status MUST be 'crawled' after successful crawl
    // If this fails, code is wrong - fix it!
    expect(queries.updateBusiness).toHaveBeenCalledWith(
      business.id,
      expect.objectContaining({
        status: 'crawled', // CORRECT: Status must be 'crawled' after crawl
        crawlData,
        lastCrawledAt: expect.any(Date),
      })
    );
  });

  /**
   * SPECIFICATION 3: Execute Crawl Job - MUST Set Error Message on Failure
   * 
   * CORRECT BEHAVIOR: When crawl fails, the crawl job MUST be updated with
   * the error message so users can see what went wrong.
   * 
   * If this test fails, the code is wrong and must be fixed.
   */
  it('MUST set error message on crawl job when crawl fails', async () => {
    // Arrange: Crawl failure
    const business = BusinessTestFactory.create({ id: 1 });
    const crawlJob = CrawlJobTestFactory.create({ id: 123, businessId: 1 });
    const errorMessage = 'Crawl failed: Network timeout';

    const queries = await import('@/lib/db/queries');
    const crawler = await import('@/lib/crawler');
    
    vi.mocked(queries.getBusinessById).mockResolvedValue(business);
    vi.mocked(queries.createCrawlJob).mockResolvedValue(crawlJob);
    vi.mocked(crawler.webCrawler.crawl).mockRejectedValue(new Error(errorMessage));
    vi.mocked(queries.updateCrawlJob).mockResolvedValue(crawlJob);

    // Act: Execute crawl job
    const { executeCrawlJob } = await import('../business-execution');
    const result = await executeCrawlJob(null, business.id);

    // Assert: SPECIFICATION - Error message MUST be set on crawl job
    // If this fails, code is wrong - fix it!
    expect(queries.updateCrawlJob).toHaveBeenCalledWith(
      crawlJob.id,
      expect.objectContaining({
        status: 'failed',
        errorMessage: expect.stringContaining(errorMessage), // CORRECT: Error must be visible
      })
    );
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  /**
   * SPECIFICATION 4: Execute Fingerprint - MUST Save Fingerprint to Database
   * 
   * CORRECT BEHAVIOR: Fingerprint results MUST be persisted to database
   * so they are available for later analysis and display.
   * 
   * If this test fails, the code is wrong and must be fixed.
   */
  it('MUST save fingerprint to database on successful fingerprint', async () => {
    // Arrange: Business with crawl data
    const business = BusinessTestFactory.createCrawled({ id: 1 });
    const fingerprintResult = {
      visibilityScore: 75.5,
      mentionRate: 0.8,
      sentimentScore: 0.7,
      accuracyScore: 0.9,
      avgRankPosition: 3.5,
      llmResults: { analysis: 'test' },
      competitiveLeaderboard: [{ name: 'Competitor', score: 80 }],
    };

    const queries = await import('@/lib/db/queries');
    const fingerprinter = await import('@/lib/llm');
    
    vi.mocked(fingerprinter.businessFingerprinter.fingerprint).mockResolvedValue(fingerprintResult);
    vi.mocked(queries.createFingerprint).mockResolvedValue({ id: 1 });
    vi.mocked(queries.updateBusiness).mockResolvedValue(business);

    // Act: Execute fingerprint
    const { executeFingerprint } = await import('../business-execution');
    const result = await executeFingerprint(business);

    // Assert: SPECIFICATION - Fingerprint MUST be saved with correct data
    // If this fails, code is wrong - fix it!
    expect(queries.createFingerprint).toHaveBeenCalledWith(
      expect.objectContaining({
        businessId: business.id,
        visibilityScore: 76, // CORRECT: Must round to integer
        mentionRate: 0.8,
        sentimentScore: 0.7,
        accuracyScore: 0.9,
        avgRankPosition: 3.5,
        llmResults: fingerprintResult.llmResults,
        competitiveLeaderboard: fingerprintResult.competitiveLeaderboard,
      })
    );
    expect(result.success).toBe(true);
  });

  /**
   * SPECIFICATION 5: Execute Fingerprint - MUST Update Business Status When Requested
   * 
   * CORRECT BEHAVIOR: When updateStatus is true, business status MUST be updated
   * to 'crawled' after fingerprint completes (both crawl and fingerprint done).
   * 
   * If this test fails, the code is wrong and must be fixed.
   */
  it('MUST update business status when updateStatus is true', async () => {
    // Arrange: Business with crawl data
    const business = BusinessTestFactory.createCrawled({ id: 1 });
    const fingerprintResult = {
      visibilityScore: 75,
      mentionRate: 0.8,
      sentimentScore: 0.7,
      accuracyScore: 0.9,
      avgRankPosition: 3.5,
      llmResults: {},
      competitiveLeaderboard: [],
    };

    const queries = await import('@/lib/db/queries');
    const fingerprinter = await import('@/lib/llm');
    
    vi.mocked(fingerprinter.businessFingerprinter.fingerprint).mockResolvedValue(fingerprintResult);
    vi.mocked(queries.createFingerprint).mockResolvedValue({ id: 1 });
    vi.mocked(queries.updateBusiness).mockResolvedValue(business);

    // Act: Execute fingerprint with updateStatus=true
    const { executeFingerprint } = await import('../business-execution');
    const result = await executeFingerprint(business, true);

    // Assert: SPECIFICATION - Status MUST be updated when requested
    // If this fails, code is wrong - fix it!
    expect(queries.updateBusiness).toHaveBeenCalledWith(
      business.id,
      expect.objectContaining({
        status: 'crawled', // CORRECT: Status must reflect both crawl and fingerprint complete
      })
    );
    expect(result.success).toBe(true);
  });

  /**
   * SPECIFICATION 6: Execute Fingerprint - MUST NOT Update Status When updateStatus is false
   * 
   * CORRECT BEHAVIOR: When updateStatus is false, business status MUST NOT be updated.
   * This allows fingerprinting without changing business state.
   * 
   * If this test fails, the code is wrong and must be fixed.
   */
  it('MUST NOT update business status when updateStatus is false', async () => {
    // Arrange: Business with crawl data
    const business = BusinessTestFactory.createCrawled({ id: 1 });
    const fingerprintResult = {
      visibilityScore: 75,
      mentionRate: 0.8,
      sentimentScore: 0.7,
      accuracyScore: 0.9,
      avgRankPosition: 3.5,
      llmResults: {},
      competitiveLeaderboard: [],
    };

    const queries = await import('@/lib/db/queries');
    const fingerprinter = await import('@/lib/llm');
    
    vi.mocked(fingerprinter.businessFingerprinter.fingerprint).mockResolvedValue(fingerprintResult);
    vi.mocked(queries.createFingerprint).mockResolvedValue({ id: 1 });

    // Act: Execute fingerprint with updateStatus=false
    const { executeFingerprint } = await import('../business-execution');
    const result = await executeFingerprint(business, false);

    // Assert: SPECIFICATION - Status MUST NOT be updated when updateStatus=false
    // If this fails, code is wrong - fix it!
    const updateCalls = vi.mocked(queries.updateBusiness).mock.calls;
    const statusUpdateCall = updateCalls.find(call => 
      call[1] && typeof call[1] === 'object' && 'status' in call[1]
    );
    expect(statusUpdateCall).toBeUndefined(); // CORRECT: No status update when false
    expect(result.success).toBe(true);
  });

  /**
   * SPECIFICATION 7: Execute Crawl Job - MUST Use Existing Job When Provided
   * 
   * CORRECT BEHAVIOR: When jobId is provided, existing job MUST be updated,
   * not created. This allows resuming failed jobs.
   * 
   * If this test fails, the code is wrong and must be fixed.
   */
  it('MUST use existing crawl job when jobId is provided', async () => {
    // Arrange: Existing crawl job
    const business = BusinessTestFactory.create({ id: 1 });
    const existingJobId = 123;

    const queries = await import('@/lib/db/queries');
    const crawler = await import('@/lib/crawler');
    
    vi.mocked(queries.getBusinessById).mockResolvedValue(business);
    vi.mocked(queries.updateCrawlJob).mockResolvedValue({ id: existingJobId });
    vi.mocked(crawler.webCrawler.crawl).mockResolvedValue({
      success: true,
      data: { url: business.url, content: '<html>Test</html>' },
    });
    vi.mocked(queries.updateBusiness).mockResolvedValue(business);

    // Act: Execute crawl job with existing jobId
    const { executeCrawlJob } = await import('../business-execution');
    const result = await executeCrawlJob(existingJobId, business.id);

    // Assert: SPECIFICATION - Existing job MUST be used, not created
    // If this fails, code is wrong - fix it!
    expect(queries.createCrawlJob).not.toHaveBeenCalled(); // CORRECT: Don't create new job
    expect(queries.updateCrawlJob).toHaveBeenCalledWith(
      existingJobId,
      expect.objectContaining({
        status: 'running',
      })
    );
    expect(result.success).toBe(true);
  });

  /**
   * SPECIFICATION 8: Execute Crawl Job - MUST Return Duration
   * 
   * CORRECT BEHAVIOR: Result MUST include execution duration for performance tracking.
   * 
   * If this test fails, the code is wrong and must be fixed.
   */
  it('MUST return execution duration in result', async () => {
    // Arrange: Successful crawl
    const business = BusinessTestFactory.create({ id: 1 });
    const crawlJob = CrawlJobTestFactory.create({ id: 123, businessId: 1 });

    const queries = await import('@/lib/db/queries');
    const crawler = await import('@/lib/crawler');
    
    vi.mocked(queries.getBusinessById).mockResolvedValue(business);
    vi.mocked(queries.createCrawlJob).mockResolvedValue(crawlJob);
    vi.mocked(crawler.webCrawler.crawl).mockResolvedValue({
      success: true,
      data: { url: business.url, content: '<html>Test</html>' },
    });
    vi.mocked(queries.updateBusiness).mockResolvedValue(business);
    vi.mocked(queries.updateCrawlJob).mockResolvedValue(crawlJob);

    // Act: Execute crawl job
    const { executeCrawlJob } = await import('../business-execution');
    const result = await executeCrawlJob(null, business.id);

    // Assert: SPECIFICATION - Duration MUST be included
    // If this fails, code is wrong - fix it!
    expect(result.duration).toBeDefined();
    expect(typeof result.duration).toBe('number');
    expect(result.duration).toBeGreaterThanOrEqual(0);
  });

  /**
   * SPECIFICATION 9: Execute Crawl Job - MUST Handle Business Not Found
   * 
   * CORRECT BEHAVIOR: When business doesn't exist, MUST return clear error
   * without crashing.
   * 
   * If this test fails, the code is wrong and must be fixed.
   */
  it('MUST handle business not found error gracefully', async () => {
    // Arrange: Business not found
    const queries = await import('@/lib/db/queries');
    vi.mocked(queries.getBusinessById).mockResolvedValue(null);

    // Act: Execute crawl job
    const { executeCrawlJob } = await import('../business-execution');
    const result = await executeCrawlJob(null, 999);

    // Assert: SPECIFICATION - MUST return clear error, not crash
    // If this fails, code is wrong - fix it!
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.error).toContain('Business not found'); // CORRECT: Clear error message
  });

  /**
   * SPECIFICATION 10: Execute Fingerprint - MUST Handle Errors Without Crashing
   * 
   * CORRECT BEHAVIOR: When fingerprint fails, MUST return error in result
   * without throwing exception.
   * 
   * If this test fails, the code is wrong and must be fixed.
   */
  it('MUST handle fingerprint errors gracefully without crashing', async () => {
    // Arrange: Fingerprint failure
    const business = BusinessTestFactory.createCrawled({ id: 1 });
    const errorMessage = 'Fingerprint failed: LLM API error';

    const fingerprinter = await import('@/lib/llm');
    vi.mocked(fingerprinter.businessFingerprinter.fingerprint).mockRejectedValue(new Error(errorMessage));

    // Act: Execute fingerprint
    const { executeFingerprint } = await import('../business-execution');
    const result = await executeFingerprint(business);

    // Assert: SPECIFICATION - MUST return error, not throw
    // If this fails, code is wrong - fix it!
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.error).toContain(errorMessage); // CORRECT: Error must be visible
  });
});
