/**
 * TDD Test: CFP Orchestrator Service - Tests Drive Implementation
 * 
 * SPECIFICATION: CFP Orchestration Service
 * 
 * As a system
 * I want to orchestrate the complete CFP (Crawl → Fingerprint → Publish) flow
 * So that businesses can be automatically processed from URL to Wikidata entity
 * 
 * Acceptance Criteria:
 * 1. Executes complete CFP flow from URL to entity
 * 2. Validates URL format before processing
 * 3. Executes crawl operation with timeout
 * 4. Executes fingerprint with crawl data
 * 5. Creates Wikidata entity from business data
 * 6. Publishes entity when requested
 * 7. Handles errors gracefully at each stage
 * 8. Provides progress callbacks
 * 9. Returns partial results on partial failures
 * 
 * TDD Cycle: RED → GREEN → REFACTOR
 * Tests written FIRST to drive implementation
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock dependencies
vi.mock('@/lib/crawler', () => ({
  webCrawler: {
    crawl: vi.fn(),
  },
}));

vi.mock('@/lib/llm', () => ({
  businessFingerprinter: {
    fingerprintWithContext: vi.fn(),
  },
}));

vi.mock('@/lib/wikidata', () => ({
  wikidataService: {
    createAndPublishEntity: vi.fn(),
  },
  WikidataClient: vi.fn(),
}));

vi.mock('@/lib/utils/logger', () => ({
  loggers: {
    processing: {
      start: vi.fn(() => 'operation-123'),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
      complete: vi.fn(),
    },
  },
}));

describe('🔴 RED: CFP Orchestrator Service Specification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * SPECIFICATION 1: Execute CFP Flow - Complete Flow from URL to Entity
   * 
   * Given: Valid URL
   * When: Execute CFP flow is called
   * Then: Returns complete entity with crawl data and fingerprint
   */
  it('executes complete CFP flow from URL to entity', async () => {
    // Arrange: Mock successful crawl, fingerprint, and entity creation
    const url = 'https://example.com';
    const crawlData = {
      url,
      content: '<html>Test</html>',
      name: 'Example Business',
      location: { city: 'San Francisco', state: 'CA', country: 'US' },
    };
    const fingerprintAnalysis = {
      visibilityScore: 75,
      mentionRate: 0.8,
      sentimentScore: 0.7,
      llmResults: {},
      competitiveLeaderboard: [],
    };
    const entity = {
      id: 'Q123',
      labels: { en: { value: 'Example Business' } },
      claims: {},
    };

    const crawler = await import('@/lib/crawler');
    const fingerprinter = await import('@/lib/llm');
    const wikidata = await import('@/lib/wikidata');

    vi.mocked(crawler.webCrawler.crawl).mockResolvedValue({
      success: true,
      data: crawlData,
    });
    vi.mocked(fingerprinter.businessFingerprinter.fingerprintWithContext).mockResolvedValue(fingerprintAnalysis);
    vi.mocked(wikidata.wikidataService.createAndPublishEntity).mockResolvedValue({
      success: true,
      entity,
      qid: 'Q123',
    });

    // Act: Execute CFP flow (TEST DRIVES IMPLEMENTATION)
    const { executeCFPFlow } = await import('../cfp-orchestrator');
    const result = await executeCFPFlow(url, { shouldPublish: false });

    // Assert: Verify complete flow executed (behavior: entity created with all data)
    expect(result.success).toBe(true);
    expect(result.entity).toBeDefined();
    expect(result.crawlData).toBeDefined();
    expect(result.fingerprintAnalysis).toBeDefined();
    expect(result.processingTime).toBeGreaterThanOrEqual(0);
  });

  /**
   * SPECIFICATION 2: URL Validation - Rejects Invalid URLs
   * 
   * Given: Invalid URL format
   * When: Execute CFP flow is called
   * Then: Returns error for invalid URL
   */
  it('validates URL format and rejects invalid URLs', async () => {
    // Arrange: Invalid URL
    const invalidUrl = 'not-a-valid-url';

    // Act: Execute CFP flow (TEST DRIVES IMPLEMENTATION)
    const { executeCFPFlow } = await import('../cfp-orchestrator');
    const result = await executeCFPFlow(invalidUrl);

    // Assert: Verify URL validation (behavior: clear error message)
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.error).toContain('Invalid URL');
  });

  /**
   * SPECIFICATION 3: Crawl Execution - Handles Crawl Success
   * 
   * Given: Valid URL
   * When: Crawl operation succeeds
   * Then: Crawl data is included in result
   */
  it('includes crawl data when crawl succeeds', async () => {
    // Arrange: Successful crawl
    const url = 'https://example.com';
    const crawlData = {
      url,
      content: '<html>Test</html>',
      name: 'Example Business',
    };

    const crawler = await import('@/lib/crawler');
    const fingerprinter = await import('@/lib/llm');
    const wikidata = await import('@/lib/wikidata');

    vi.mocked(crawler.webCrawler.crawl).mockResolvedValue({
      success: true,
      data: crawlData,
    });
    vi.mocked(fingerprinter.businessFingerprinter.fingerprintWithContext).mockResolvedValue({
      visibilityScore: 75,
      mentionRate: 0.8,
      sentimentScore: 0.7,
      llmResults: {},
      competitiveLeaderboard: [],
    });
    vi.mocked(wikidata.wikidataService.createAndPublishEntity).mockResolvedValue({
      success: true,
      entity: { id: 'Q123', labels: {}, claims: {} },
      qid: 'Q123',
    });

    // Act: Execute CFP flow (TEST DRIVES IMPLEMENTATION)
    const { executeCFPFlow } = await import('../cfp-orchestrator');
    const result = await executeCFPFlow(url, { shouldPublish: false });

    // Assert: Verify crawl data included (behavior: crawl data available for entity creation)
    expect(result.crawlData).toBeDefined();
    expect(result.crawlData?.url).toBe(url);
  });

  /**
   * SPECIFICATION 4: Crawl Execution - Handles Crawl Failure Gracefully
   * 
   * Given: Valid URL
   * When: Crawl operation fails
   * Then: Flow continues with partial results
   */
  it('handles crawl failure gracefully and continues with partial results', async () => {
    // Arrange: Crawl failure
    const url = 'https://example.com';

    const crawler = await import('@/lib/crawler');
    const wikidata = await import('@/lib/wikidata');

    vi.mocked(crawler.webCrawler.crawl).mockResolvedValue({
      success: false,
      error: 'Crawl failed',
    });
    vi.mocked(wikidata.wikidataService.createAndPublishEntity).mockResolvedValue({
      success: true,
      entity: { id: 'Q123', labels: {}, claims: {} },
      qid: 'Q123',
    });

    // Act: Execute CFP flow (TEST DRIVES IMPLEMENTATION)
    const { executeCFPFlow } = await import('../cfp-orchestrator');
    const result = await executeCFPFlow(url, { shouldPublish: false });

    // Assert: Verify partial results (behavior: flow continues despite crawl failure)
    expect(result.partialResults).toBeDefined();
    expect(result.partialResults?.crawlSuccess).toBe(false);
    // Entity creation should still succeed
    expect(result.entity).toBeDefined();
  });

  /**
   * SPECIFICATION 5: Fingerprint Execution - Uses Crawl Data When Available
   * 
   * Given: Successful crawl with location data
   * When: Fingerprint is executed
   * Then: Fingerprint uses crawl data for context
   */
  it('uses crawl data for fingerprint context when available', async () => {
    // Arrange: Successful crawl with location
    const url = 'https://example.com';
    const crawlData = {
      url,
      name: 'Example Business',
      location: { city: 'San Francisco', state: 'CA', country: 'US' },
    };

    const crawler = await import('@/lib/crawler');
    const fingerprinter = await import('@/lib/llm');
    const wikidata = await import('@/lib/wikidata');

    vi.mocked(crawler.webCrawler.crawl).mockResolvedValue({
      success: true,
      data: crawlData,
    });
    vi.mocked(fingerprinter.businessFingerprinter.fingerprintWithContext).mockResolvedValue({
      visibilityScore: 75,
      mentionRate: 0.8,
      sentimentScore: 0.7,
      llmResults: {},
      competitiveLeaderboard: [],
    });
    vi.mocked(wikidata.wikidataService.createAndPublishEntity).mockResolvedValue({
      success: true,
      entity: { id: 'Q123', labels: {}, claims: {} },
      qid: 'Q123',
    });

    // Act: Execute CFP flow (TEST DRIVES IMPLEMENTATION)
    const { executeCFPFlow } = await import('../cfp-orchestrator');
    const result = await executeCFPFlow(url, { shouldPublish: false });

    // Assert: Verify fingerprint used crawl data (behavior: enhanced context for fingerprinting)
    expect(fingerprinter.businessFingerprinter.fingerprintWithContext).toHaveBeenCalledWith(
      expect.objectContaining({
        name: crawlData.name,
        location: expect.objectContaining({
          city: 'San Francisco',
          state: 'CA',
        }),
        crawlData,
      })
    );
    expect(result.fingerprintAnalysis).toBeDefined();
  });

  /**
   * SPECIFICATION 6: Entity Creation - Creates Entity from Business Data
   * 
   * Given: Successful crawl and fingerprint
   * When: Entity creation is requested
   * Then: Entity is created with business data
   */
  it('creates entity from business data', async () => {
    // Arrange: Successful crawl
    const url = 'https://example.com';
    const crawlData = {
      url,
      name: 'Example Business',
    };

    const crawler = await import('@/lib/crawler');
    const fingerprinter = await import('@/lib/llm');
    const wikidata = await import('@/lib/wikidata');

    vi.mocked(crawler.webCrawler.crawl).mockResolvedValue({
      success: true,
      data: crawlData,
    });
    vi.mocked(fingerprinter.businessFingerprinter.fingerprintWithContext).mockResolvedValue({
      visibilityScore: 75,
      mentionRate: 0.8,
      sentimentScore: 0.7,
      llmResults: {},
      competitiveLeaderboard: [],
    });
    vi.mocked(wikidata.wikidataService.createAndPublishEntity).mockResolvedValue({
      success: true,
      entity: { id: 'Q123', labels: { en: { value: 'Example Business' } }, claims: {} },
      qid: 'Q123',
    });

    // Act: Execute CFP flow (TEST DRIVES IMPLEMENTATION)
    const { executeCFPFlow } = await import('../cfp-orchestrator');
    const result = await executeCFPFlow(url, { shouldPublish: false });

    // Assert: Verify entity created (behavior: entity created with business data)
    expect(wikidata.wikidataService.createAndPublishEntity).toHaveBeenCalledWith(
      expect.objectContaining({
        name: crawlData.name,
        url,
      }),
      crawlData,
      expect.objectContaining({
        dryRun: true,
      })
    );
    expect(result.entity).toBeDefined();
  });

  /**
   * SPECIFICATION 7: Publishing - Publishes Entity When Requested
   * 
   * Given: Successful entity creation
   * When: Publishing is requested
   * Then: Entity is published to Wikidata
   */
  it('publishes entity when shouldPublish is true', async () => {
    // Arrange: Successful entity creation
    const url = 'https://example.com';
    const entity = { id: 'Q123', labels: {}, claims: {} };

    const crawler = await import('@/lib/crawler');
    const fingerprinter = await import('@/lib/llm');
    const wikidata = await import('@/lib/wikidata');

    vi.mocked(crawler.webCrawler.crawl).mockResolvedValue({
      success: true,
      data: { url, name: 'Example Business' },
    });
    vi.mocked(fingerprinter.businessFingerprinter.fingerprintWithContext).mockResolvedValue({
      visibilityScore: 75,
      mentionRate: 0.8,
      sentimentScore: 0.7,
      llmResults: {},
      competitiveLeaderboard: [],
    });
    vi.mocked(wikidata.wikidataService.createAndPublishEntity).mockResolvedValue({
      success: true,
      entity,
      qid: 'Q123',
    });

    // Mock WikidataClient for publishing
    const mockPublishEntity = vi.fn().mockResolvedValue({
      success: true,
      qid: 'Q123',
      publishedTo: 'test.wikidata.org',
      propertiesPublished: 5,
      referencesPublished: 3,
    });
    vi.mocked(wikidata.WikidataClient).mockImplementation(function() {
      return {
        publishEntity: mockPublishEntity,
      } as any;
    });

    // Act: Execute CFP flow with publishing (TEST DRIVES IMPLEMENTATION)
    const { executeCFPFlow } = await import('../cfp-orchestrator');
    const result = await executeCFPFlow(url, { shouldPublish: true });

    // Assert: Verify entity published (behavior: entity published to Wikidata)
    expect(result.publishResult).toBeDefined();
    expect(result.publishResult?.success).toBe(true);
  });

  /**
   * SPECIFICATION 8: Progress Callbacks - Provides Progress Updates
   * 
   * Given: CFP flow execution
   * When: Progress callback is provided
   * Then: Progress updates are called at each stage
   */
  it('provides progress updates through callback', async () => {
    // Arrange: Progress callback
    const url = 'https://example.com';
    const progressCallback = vi.fn();

    const crawler = await import('@/lib/crawler');
    const fingerprinter = await import('@/lib/llm');
    const wikidata = await import('@/lib/wikidata');

    vi.mocked(crawler.webCrawler.crawl).mockResolvedValue({
      success: true,
      data: { url, name: 'Example Business' },
    });
    vi.mocked(fingerprinter.businessFingerprinter.fingerprintWithContext).mockResolvedValue({
      visibilityScore: 75,
      mentionRate: 0.8,
      sentimentScore: 0.7,
      llmResults: {},
      competitiveLeaderboard: [],
    });
    vi.mocked(wikidata.wikidataService.createAndPublishEntity).mockResolvedValue({
      success: true,
      entity: { id: 'Q123', labels: {}, claims: {} },
      qid: 'Q123',
    });

    // Act: Execute CFP flow with progress callback (TEST DRIVES IMPLEMENTATION)
    const { executeCFPFlow } = await import('../cfp-orchestrator');
    await executeCFPFlow(url, { shouldPublish: false }, progressCallback);

    // Assert: Verify progress callbacks called (behavior: real-time progress updates)
    expect(progressCallback).toHaveBeenCalled();
    const progressCalls = progressCallback.mock.calls;
    expect(progressCalls.length).toBeGreaterThan(0);
    // Verify progress structure
    expect(progressCalls[0][0]).toMatchObject({
      stage: expect.any(String),
      progress: expect.any(Number),
      message: expect.any(String),
      timestamp: expect.any(Date),
    });
  });

  /**
   * SPECIFICATION 9: Partial Results - Returns Partial Results on Partial Failures
   * 
   * Given: Partial failure in CFP flow
   * When: Some stages succeed and others fail
   * Then: Returns partial results indicating which stages succeeded
   */
  it('returns partial results indicating which stages succeeded', async () => {
    // Arrange: Crawl succeeds, fingerprint fails
    const url = 'https://example.com';
    const crawlData = { url, name: 'Example Business' };

    const crawler = await import('@/lib/crawler');
    const fingerprinter = await import('@/lib/llm');
    const wikidata = await import('@/lib/wikidata');

    vi.mocked(crawler.webCrawler.crawl).mockResolvedValue({
      success: true,
      data: crawlData,
    });
    vi.mocked(fingerprinter.businessFingerprinter.fingerprintWithContext).mockRejectedValue(
      new Error('Fingerprint failed')
    );
    vi.mocked(wikidata.wikidataService.createAndPublishEntity).mockResolvedValue({
      success: true,
      entity: { id: 'Q123', labels: {}, claims: {} },
      qid: 'Q123',
    });

    // Act: Execute CFP flow (TEST DRIVES IMPLEMENTATION)
    const { executeCFPFlow } = await import('../cfp-orchestrator');
    const result = await executeCFPFlow(url, { shouldPublish: false });

    // Assert: Verify partial results (behavior: clear indication of what succeeded/failed)
    expect(result.partialResults).toBeDefined();
    expect(result.partialResults?.crawlSuccess).toBe(true);
    expect(result.partialResults?.fingerprintSuccess).toBe(false);
    expect(result.partialResults?.entityCreationSuccess).toBe(true);
  });

  /**
   * SPECIFICATION 10: Convenience Functions - createEntityFromUrl Returns Entity Only
   * 
   * Given: Valid URL
   * When: createEntityFromUrl is called
   * Then: Returns only the entity, not full result
   */
  it('createEntityFromUrl returns entity only', async () => {
    // Arrange: Successful entity creation
    const url = 'https://example.com';
    const entity = { id: 'Q123', labels: {}, claims: {} };

    const crawler = await import('@/lib/crawler');
    const fingerprinter = await import('@/lib/llm');
    const wikidata = await import('@/lib/wikidata');

    vi.mocked(crawler.webCrawler.crawl).mockResolvedValue({
      success: true,
      data: { url, name: 'Example Business' },
    });
    vi.mocked(fingerprinter.businessFingerprinter.fingerprintWithContext).mockResolvedValue({
      visibilityScore: 75,
      mentionRate: 0.8,
      sentimentScore: 0.7,
      llmResults: {},
      competitiveLeaderboard: [],
    });
    vi.mocked(wikidata.wikidataService.createAndPublishEntity).mockResolvedValue({
      success: true,
      entity,
      qid: 'Q123',
    });

    // Act: Create entity from URL (TEST DRIVES IMPLEMENTATION)
    const { createEntityFromUrl } = await import('../cfp-orchestrator');
    const result = await createEntityFromUrl(url);

    // Assert: Verify only entity returned (behavior: simplified interface)
    expect(result).toBeDefined();
    expect(result).toEqual(entity);
  });
});

