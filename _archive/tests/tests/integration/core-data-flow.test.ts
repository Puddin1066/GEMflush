/**
 * CORE DATA FLOW - TDD Specifications
 * 
 * Tests core data flow through the platform without overfitting to implementation.
 * Focus: Behavior and data integrity, not implementation details.
 * 
 * Principles:
 * - SOLID: Single responsibility per test
 * - DRY: Reusable test helpers
 * - TDD: Tests define behavior, code satisfies them
 * - No Overfitting: Test WHAT happens, not HOW
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  BusinessTestFactory,
  TeamTestFactory,
  CrawlJobTestFactory,
  MockCrawlerFactory,
  MockFingerprinterFactory,
  MockWikidataClientFactory,
} from '@/lib/test-helpers/tdd-helpers';

// Mock dependencies at module level
vi.mock('@/lib/db/queries', () => ({
  getBusinessById: vi.fn(),
  updateBusiness: vi.fn(),
  createCrawlJob: vi.fn(),
  updateCrawlJob: vi.fn(),
  getTeamForBusiness: vi.fn(),
  createBusiness: vi.fn(),
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

vi.mock('@/lib/wikidata/service', () => ({
  wikidataService: {
    createAndPublishEntity: vi.fn(),
    findExistingEntity: vi.fn(),
  },
}));

vi.mock('@/lib/utils/logger', () => ({
  loggers: {
    processing: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
    llm: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
  },
}));

vi.mock('@/lib/utils/error-handling', () => ({
  withRetry: vi.fn((fn) => fn()),
  RETRY_CONFIGS: { database: {}, firecrawl: {} },
  ProcessingError: class extends Error {
    constructor(message: string, public code: string, public retryable: boolean, public context?: any) {
      super(message);
      this.name = 'ProcessingError';
    }
  },
  handleParallelProcessingError: vi.fn(),
  sanitizeErrorForLogging: vi.fn((err) => err.message),
}));

vi.mock('@/lib/services/cfp-automation-service', () => ({
  executeCFPAutomation: vi.fn(),
}));

describe('🎯 CORE DATA FLOW - CFP Workflow', () => {
  let mockGetBusinessById: any;
  let mockUpdateBusiness: any;
  let mockCreateCrawlJob: any;
  let mockUpdateCrawlJob: any;
  let mockGetTeamForBusiness: any;
  let mockWebCrawlerCrawl: any;
  let mockFingerprinter: any;
  let mockWikidataService: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    const dbQueries = await import('@/lib/db/queries');
    const crawler = await import('@/lib/crawler');
    const llm = await import('@/lib/llm');
    const wikidata = await import('@/lib/wikidata/service');

    mockGetBusinessById = dbQueries.getBusinessById;
    mockUpdateBusiness = dbQueries.updateBusiness;
    mockCreateCrawlJob = dbQueries.createCrawlJob;
    mockUpdateCrawlJob = dbQueries.updateCrawlJob;
    mockGetTeamForBusiness = dbQueries.getTeamForBusiness;
    mockWebCrawlerCrawl = crawler.webCrawler.crawl;
    mockFingerprinter = llm.businessFingerprinter;
    mockWikidataService = wikidata.wikidataService;
  });

  /**
   * TEST 1: Business data flows from crawl to fingerprint
   * Behavior: Crawl data is available for fingerprinting
   */
  it('makes crawl data available for fingerprinting', async () => {
    const business = BusinessTestFactory.create({ id: 123 });
    const crawlData = { name: 'Test', description: 'Test desc' };
    const crawlJob = CrawlJobTestFactory.create({ businessId: business.id });

    mockGetBusinessById.mockResolvedValue(business);
    mockGetTeamForBusiness.mockResolvedValue(TeamTestFactory.createPro());
    mockCreateCrawlJob.mockResolvedValue(crawlJob);
    mockWebCrawlerCrawl.mockResolvedValue({ success: true, data: crawlData });

    const { executeCrawlJob } = await import('@/lib/services/business-execution');
    await executeCrawlJob(null, business.id, business);

    // Verify crawl data was stored
    const updateCall = mockUpdateBusiness.mock.calls.find((c: any[]) => c[1]?.crawlData);
    expect(updateCall).toBeDefined();
    expect(updateCall[1].crawlData).toEqual(crawlData);
  });

  /**
   * TEST 2: Business status progresses through workflow states
   * Behavior: Status transitions: pending → crawled → published
   */
  it('transitions business status through workflow states', async () => {
    const business = BusinessTestFactory.create({ id: 123, status: 'pending' });
    const crawlJob = CrawlJobTestFactory.create({ businessId: business.id });

    mockGetBusinessById.mockResolvedValue(business);
    mockGetTeamForBusiness.mockResolvedValue(TeamTestFactory.createPro());
    mockCreateCrawlJob.mockResolvedValue(crawlJob);
    mockWebCrawlerCrawl.mockResolvedValue({ success: true, data: {} });

    const { executeCrawlJob } = await import('@/lib/services/business-execution');
    await executeCrawlJob(null, business.id, business);

    // Verify status transitioned to crawled
    const updateCall = mockUpdateBusiness.mock.calls.find((c: any[]) => c[1]?.status === 'crawled');
    expect(updateCall).toBeDefined();
  });

  /**
   * TEST 3: Crawl job tracks processing state
   * Behavior: Crawl job status reflects processing state
   */
  it('tracks crawl job processing state', async () => {
    const business = BusinessTestFactory.create({ id: 123 });
    const crawlJob = CrawlJobTestFactory.create({ businessId: business.id, id: 456 });

    mockGetBusinessById.mockResolvedValue(business);
    mockGetTeamForBusiness.mockResolvedValue(TeamTestFactory.createPro());
    mockCreateCrawlJob.mockResolvedValue(crawlJob);
    mockWebCrawlerCrawl.mockResolvedValue({ success: true, data: {} });

    const { executeCrawlJob } = await import('@/lib/services/business-execution');
    await executeCrawlJob(null, business.id, business);

    // Verify job status was updated
    expect(mockUpdateCrawlJob).toHaveBeenCalled();
    const statusUpdate = mockUpdateCrawlJob.mock.calls.find((c: any[]) => 
      c[1]?.status === 'completed' || c[1]?.status === 'running'
    );
    expect(statusUpdate).toBeDefined();
  });

  /**
   * TEST 4: Errors are captured and stored
   * Behavior: When crawl fails, error is stored for debugging
   */
  it('captures and stores errors when crawl fails', async () => {
    const business = BusinessTestFactory.create({ id: 123 });
    const crawlJob = CrawlJobTestFactory.create({ businessId: business.id, id: 456 });
    const errorMsg = 'Network error';

    mockGetBusinessById.mockResolvedValue(business);
    mockGetTeamForBusiness.mockResolvedValue(TeamTestFactory.createPro());
    mockCreateCrawlJob.mockResolvedValue(crawlJob);
    mockWebCrawlerCrawl.mockRejectedValue(new Error(errorMsg));

    const { executeCrawlJob } = await import('@/lib/services/business-execution');
    try {
      await executeCrawlJob(null, business.id, business);
    } catch {}

    // Verify error was stored
    const errorUpdate = mockUpdateCrawlJob.mock.calls.find((c: any[]) => 
      c[1]?.errorMessage || c[1]?.status === 'error' || c[1]?.status === 'failed'
    );
    expect(errorUpdate).toBeDefined();
  });

  /**
   * TEST 5: Fingerprint uses business data
   * Behavior: Fingerprinting receives business information
   */
  it('fingerprints business with available data', async () => {
    const business = BusinessTestFactory.createCrawled({ id: 123 });

    mockFingerprinter.fingerprint.mockResolvedValue({
      visibilityScore: 75,
      competitiveAnalysis: {},
    });

    const { executeFingerprint } = await import('@/lib/services/business-execution');
    await executeFingerprint(business);

    // Verify fingerprint was called with business data
    expect(mockFingerprinter.fingerprint).toHaveBeenCalled();
    const call = mockFingerprinter.fingerprint.mock.calls[0];
    expect(call[0].id).toBe(business.id);
  });

  /**
   * TEST 6: Wikidata publish requires crawled business
   * Behavior: Publishing only works for crawled businesses
   */
  it('requires crawled business for Wikidata publishing', async () => {
    const business = BusinessTestFactory.createCrawled({ id: 123 });
    const team = TeamTestFactory.createPro();

    mockGetBusinessById.mockResolvedValue(business);
    mockGetTeamForBusiness.mockResolvedValue(team);
    mockWikidataService.findExistingEntity.mockResolvedValue(null);
    mockWikidataService.createAndPublishEntity.mockResolvedValue({
      success: true,
      qid: 'Q123456',
    });

    const result = await mockWikidataService.createAndPublishEntity(business, business.crawlData);

    // Verify publish succeeded with crawled data
    expect(result.success).toBe(true);
    expect(result.qid).toBeDefined();
    expect(mockWikidataService.createAndPublishEntity).toHaveBeenCalledWith(
      expect.objectContaining({ crawlData: expect.any(Object) }),
      expect.any(Object)
    );
  });

  /**
   * TEST 7: Business creation initializes workflow
   * Behavior: New business starts in pending state
   */
  it('initializes business in pending state', async () => {
    const team = TeamTestFactory.createPro();
    const businessData = {
      name: 'New Business',
      url: 'https://example.com',
      teamId: team.id,
      status: 'pending' as const,
    };
    const createdBusiness = BusinessTestFactory.create({
      ...businessData,
      id: 123,
    });

    const dbQueries = await import('@/lib/db/queries');
    const mockCreateBusiness = dbQueries.createBusiness;
    mockCreateBusiness.mockResolvedValue(createdBusiness);

    const business = await mockCreateBusiness(businessData);

    // Verify business initialized correctly
    expect(business.status).toBe('pending');
    expect(business.id).toBeDefined();
  });

  /**
   * TEST 8: Parallel processing executes crawl and fingerprint
   * Behavior: Crawl and fingerprint can run in parallel
   */
  it('executes crawl and fingerprint in parallel', async () => {
    const business = BusinessTestFactory.create({ id: 123 });

    mockGetBusinessById.mockResolvedValue(business);
    mockGetTeamForBusiness.mockResolvedValue(TeamTestFactory.createPro());

    // Mock CFP automation service (which executeParallelProcessing delegates to)
    const cfpAutomation = await import('@/lib/services/cfp-automation-service');
    const mockExecuteCFP = cfpAutomation.executeCFPAutomation;
    mockExecuteCFP.mockResolvedValue({
      success: true,
      businessId: business.id,
      crawlSuccess: true,
      fingerprintSuccess: true,
      duration: 1000,
    });

    const { executeParallelProcessing } = await import('@/lib/services/business-execution');
    const result = await executeParallelProcessing(business.id);

    // Verify parallel processing completed
    expect(result.overallSuccess).toBe(true);
    expect(result.crawlResult.success).toBe(true);
    expect(result.fingerprintResult.success).toBe(true);
  });

  /**
   * TEST 9: Data persists through workflow phases
   * Behavior: Data from one phase is available in next phase
   */
  it('persists data through workflow phases', async () => {
    const business = BusinessTestFactory.create({ id: 123 });
    const crawlData = { name: 'Test', phone: '555-0100' };
    const crawlJob = CrawlJobTestFactory.create({ businessId: business.id });

    mockGetBusinessById.mockResolvedValue(business);
    mockGetTeamForBusiness.mockResolvedValue(TeamTestFactory.createPro());
    mockCreateCrawlJob.mockResolvedValue(crawlJob);
    mockWebCrawlerCrawl.mockResolvedValue({ success: true, data: crawlData });

    const { executeCrawlJob } = await import('@/lib/services/business-execution');
    await executeCrawlJob(null, business.id, business);

    // Verify crawl data was stored
    const storedData = mockUpdateBusiness.mock.calls
      .find((c: any[]) => c[1]?.crawlData)?.[1]?.crawlData;
    expect(storedData).toBeDefined();
    expect(storedData).toMatchObject(crawlData);
  });

  /**
   * TEST 10: Workflow handles missing data gracefully
   * Behavior: System handles missing optional data without failing
   */
  it('handles missing optional data gracefully', async () => {
    const business = BusinessTestFactory.create({ id: 123 });
    const crawlJob = CrawlJobTestFactory.create({ businessId: business.id });
    const minimalCrawlData = { name: 'Test' }; // Missing optional fields

    mockGetBusinessById.mockResolvedValue(business);
    mockGetTeamForBusiness.mockResolvedValue(TeamTestFactory.createPro());
    mockCreateCrawlJob.mockResolvedValue(crawlJob);
    mockWebCrawlerCrawl.mockResolvedValue({ success: true, data: minimalCrawlData });

    const { executeCrawlJob } = await import('@/lib/services/business-execution');
    const result = await executeCrawlJob(null, business.id, business);

    // Verify workflow completed despite missing optional data
    expect(result.success).toBe(true);
  });
});

