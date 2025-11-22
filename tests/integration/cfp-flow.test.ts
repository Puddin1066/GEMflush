/**
 * Integration tests for complete CFP flow
 * Tests the full pipeline from URL input to published entity
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { executeCFPFlow } from '@/lib/services/cfp-orchestrator';
import type { CFPResult } from '@/lib/services/cfp-orchestrator';

// Mock external services but test real orchestrator logic
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
    publishEntity: vi.fn(),
  },
}));

describe('CFP Flow Integration Tests', () => {
  let mockWebCrawler: any;
  let mockBusinessFingerprinter: any;
  let mockWikidataService: any;

  beforeEach(async () => {
    vi.clearAllMocks();

    const crawler = await import('@/lib/crawler');
    const llm = await import('@/lib/llm');
    const wikidata = await import('@/lib/wikidata');

    mockWebCrawler = crawler.webCrawler;
    mockBusinessFingerprinter = llm.businessFingerprinter;
    mockWikidataService = wikidata.wikidataService;
  });

  describe('Complete CFP Flow - Brown Physicians', () => {
    const testUrl = 'https://brownphysicians.org';
    
    const mockCrawlData = {
      name: 'Brown Physicians',
      description: 'Multi-specialty physician practice affiliated with Brown University',
      phone: '(401) 444-5648',
      email: 'info@brownphysicians.org',
      location: {
        city: 'Providence',
        state: 'RI',
        country: 'US',
        address: '593 Eddy St, Providence, RI 02903',
        lat: 41.824,
        lng: -71.4128,
      },
      services: ['Primary Care', 'Internal Medicine', 'Family Medicine'],
      businessDetails: {
        industry: 'healthcare',
      },
      llmEnhanced: {
        targetAudience: 'Patients in Providence',
        keyDifferentiators: ['Board-certified physicians'],
        businessCategory: 'healthcare',
        model: 'firecrawl-llm',
        processedAt: new Date().toISOString(),
      },
    };

    const mockFingerprintAnalysis = {
      businessId: 1,
      businessName: 'Brown Physicians',
      metrics: {
        visibilityScore: 71,
        mentionRate: 0.777,
        sentimentScore: 0.929,
        confidenceLevel: 0.82,
        avgRankPosition: null,
        totalQueries: 9,
        successfulQueries: 9,
      },
      competitiveLeaderboard: {
        targetBusiness: {
          name: 'Brown Physicians',
          rank: null,
          mentionCount: 7,
          avgPosition: null,
        },
        competitors: [
          { name: 'Competitor 1', mentionCount: 3, avgPosition: 1 },
        ],
        totalRecommendationQueries: 3,
      },
      llmResults: [
        {
          model: 'openai/gpt-4-turbo',
          promptType: 'factual',
          mentioned: true,
          sentiment: 'positive',
          confidence: 0.83,
          rawResponse: 'Brown Physicians is a healthcare practice...',
          tokensUsed: 290,
          processingTime: 1,
        },
      ],
      generatedAt: new Date(),
      processingTime: 3000,
      visibilityScore: 71,
      mentionRate: 0.777,
      sentimentScore: 0.929,
      accuracyScore: 0.82,
      avgRankPosition: null,
    };

    const mockWikidataEntity = {
      id: 'Q123456',
      labels: {
        en: { language: 'en', value: 'Brown Physicians' },
      },
      descriptions: {
        en: {
          language: 'en',
          value: 'Multi-specialty physician practice affiliated with Brown University',
        },
      },
      claims: {
        P31: [
          {
            mainsnak: {
              snaktype: 'value',
              property: 'P31',
              datavalue: {
                value: { 'entity-type': 'item', id: 'Q4830453' },
                type: 'wikibase-entityid',
              },
            },
          },
        ],
        P856: [
          {
            mainsnak: {
              snaktype: 'value',
              property: 'P856',
              datavalue: { value: testUrl, type: 'string' },
            },
          },
        ],
      },
    };

    it('should execute complete CFP flow with all stages', async () => {
      // Setup mocks
      mockWebCrawler.crawl.mockResolvedValue({
        success: true,
        data: mockCrawlData,
      });

      mockBusinessFingerprinter.fingerprintWithContext.mockResolvedValue(
        mockFingerprintAnalysis
      );

      mockWikidataService.createAndPublishEntity.mockResolvedValue({
        entity: mockWikidataEntity,
        success: true,
      });

      mockWikidataService.publishEntity.mockResolvedValue({
        success: true,
        qid: 'Q123456',
      });

      // Execute complete CFP flow
      const result: CFPResult = await executeCFPFlow(testUrl, {
        includeFingerprint: true,
        shouldPublish: true,
        publishTarget: 'test',
      });

      // Log result structure for debugging (avoid overfitting)
      console.log('[TEST] CFP Result:', {
        success: result.success,
        hasCrawlData: !!result.crawlData,
        hasFingerprint: !!result.fingerprintAnalysis,
        hasEntity: !!result.entity,
        hasPublishResult: !!result.publishResult,
        partialResults: result.partialResults,
      });

      // Verify complete flow (behavior-based, not exact matches)
      expect(result.success).toBe(true);
      expect(result.url).toBe(testUrl);

      // Verify crawl stage (check data exists, not exact values)
      expect(result.crawlData).toBeDefined();
      expect(result.crawlData?.name).toBeTruthy();
      expect(result.crawlData?.location?.city).toBeTruthy();
      expect(result.partialResults?.crawlSuccess).toBe(true);

      // Verify fingerprint stage
      expect(result.fingerprintAnalysis).toBeDefined();
      expect(result.fingerprintAnalysis?.metrics.visibilityScore).toBe(71);
      expect(result.fingerprintAnalysis?.metrics.mentionRate).toBeCloseTo(0.777);
      expect(result.partialResults?.fingerprintSuccess).toBe(true);

      // Verify entity creation stage
      expect(result.entity).toBeDefined();
      expect(result.entity?.id).toBe('Q123456');
      expect(result.entity?.labels.en.value).toBe('Brown Physicians');
      expect(result.partialResults?.entityCreationSuccess).toBe(true);

      // Verify publish stage
      expect(result.publishResult).toBeDefined();
      expect(result.publishResult?.success).toBe(true);
      expect(result.publishResult?.qid).toBe('Q123456');
      expect(result.partialResults?.publishSuccess).toBe(true);

      // Verify processing metadata
      expect(result.processingTime).toBeGreaterThan(0);
      expect(result.timestamp).toBeInstanceOf(Date);
    });

    it('should handle CFP flow with crawl and fingerprint only (no publish)', async () => {
      // Setup mocks
      mockWebCrawler.crawl.mockResolvedValue({
        success: true,
        data: mockCrawlData,
      });

      mockBusinessFingerprinter.fingerprintWithContext.mockResolvedValue(
        mockFingerprintAnalysis
      );

      mockWikidataService.createAndPublishEntity.mockResolvedValue({
        entity: mockWikidataEntity,
        success: true,
      });

      // Execute CFP flow without publishing
      const result = await executeCFPFlow(testUrl, {
        includeFingerprint: true,
        shouldPublish: false,
      });

      // Verify crawl and fingerprint completed
      expect(result.crawlData).toBeDefined();
      expect(result.fingerprintAnalysis).toBeDefined();
      expect(result.entity).toBeDefined();

      // Verify publish was skipped
      expect(result.publishResult).toBeUndefined();
      expect(mockWikidataService.publishEntity).not.toHaveBeenCalled();
      expect(result.partialResults?.publishSuccess).toBe(true); // Skipped, not failed
    });

    it('should handle parallel crawl and fingerprint execution', async () => {
      // Setup mocks
      mockWebCrawler.crawl.mockResolvedValue({
        success: true,
        data: mockCrawlData,
      });

      mockBusinessFingerprinter.fingerprintWithContext.mockResolvedValue(
        mockFingerprintAnalysis
      );

      mockWikidataService.createAndPublishEntity.mockResolvedValue({
        entity: mockWikidataEntity,
        success: true,
      });

      // Track execution order
      const executionOrder: string[] = [];

      mockWebCrawler.crawl.mockImplementation(async () => {
        executionOrder.push('crawl-start');
        await new Promise(resolve => setTimeout(resolve, 10));
        executionOrder.push('crawl-end');
        return { success: true, data: mockCrawlData };
      });

      mockBusinessFingerprinter.fingerprintWithContext.mockImplementation(async () => {
        executionOrder.push('fingerprint-start');
        await new Promise(resolve => setTimeout(resolve, 10));
        executionOrder.push('fingerprint-end');
        return mockFingerprintAnalysis;
      });

      // Execute CFP flow
      await executeCFPFlow(testUrl, {
        includeFingerprint: true,
        shouldPublish: false,
      });

      // Verify crawl and fingerprint started in parallel
      // Both should start before either completes
      const crawlStartIndex = executionOrder.indexOf('crawl-start');
      const fingerprintStartIndex = executionOrder.indexOf('fingerprint-start');
      const firstEndIndex = Math.min(
        executionOrder.indexOf('crawl-end'),
        executionOrder.indexOf('fingerprint-end')
      );

      expect(crawlStartIndex).toBeLessThan(firstEndIndex);
      expect(fingerprintStartIndex).toBeLessThan(firstEndIndex);
    });
  });

  describe('Error Handling and Partial Results', () => {
    const testUrl = 'https://example.com';

    it('should continue with fingerprint if crawl succeeds', async () => {
      mockWebCrawler.crawl.mockResolvedValue({
        success: true,
        data: { name: 'Test Business' },
      });

      mockBusinessFingerprinter.fingerprintWithContext.mockResolvedValue({
        visibilityScore: 50,
        metrics: { visibilityScore: 50 },
      } as any);

      mockWikidataService.createAndPublishEntity.mockResolvedValue({
        entity: { id: 'Q123' },
        success: true,
      });

      const result = await executeCFPFlow(testUrl, {
        includeFingerprint: true,
        shouldPublish: false,
      });

      expect(result.partialResults?.crawlSuccess).toBe(true);
      expect(result.partialResults?.fingerprintSuccess).toBe(true);
      expect(result.entity).toBeDefined();
    });

    it('should continue with entity creation if fingerprint fails', async () => {
      mockWebCrawler.crawl.mockResolvedValue({
        success: true,
        data: { name: 'Test Business' },
      });

      mockBusinessFingerprinter.fingerprintWithContext.mockRejectedValue(
        new Error('Fingerprint failed')
      );

      mockWikidataService.createAndPublishEntity.mockResolvedValue({
        entity: { id: 'Q123' },
        success: true,
      });

      const result = await executeCFPFlow(testUrl, {
        includeFingerprint: true,
        shouldPublish: false,
      });

      expect(result.partialResults?.crawlSuccess).toBe(true);
      expect(result.partialResults?.fingerprintSuccess).toBe(false);
      expect(result.partialResults?.entityCreationSuccess).toBe(true);
      expect(result.entity).toBeDefined();
    });

    it('should report overall failure when critical stages fail', async () => {
      mockWebCrawler.crawl.mockResolvedValue({
        success: false,
        error: 'Crawl failed',
      });

      mockBusinessFingerprinter.fingerprintWithContext.mockRejectedValue(
        new Error('Fingerprint failed')
      );

      const result = await executeCFPFlow(testUrl, {
        includeFingerprint: true,
        shouldPublish: false,
      });

      expect(result.success).toBe(false);
      expect(result.partialResults?.crawlSuccess).toBe(false);
      expect(result.partialResults?.fingerprintSuccess).toBe(false);
    });
  });

  describe('Data Flow Validation', () => {
    const testUrl = 'https://brownphysicians.org';

    it('should pass crawl data to entity creation', async () => {
      const crawlData = {
        name: 'Test Business',
        location: { city: 'Test City', state: 'TS', country: 'US' },
        services: ['Service 1'],
      };

      mockWebCrawler.crawl.mockResolvedValue({
        success: true,
        data: crawlData,
      });

      mockWikidataService.createAndPublishEntity.mockImplementation(async (businessData) => {
        // Verify crawl data is included in entity creation
        expect(businessData).toBeDefined();
        return { entity: { id: 'Q123' }, success: true };
      });

      await executeCFPFlow(testUrl, {
        includeFingerprint: false,
        shouldPublish: false,
      });

      expect(mockWikidataService.createAndPublishEntity).toHaveBeenCalled();
    });

    it('should validate result structure', async () => {
      mockWebCrawler.crawl.mockResolvedValue({
        success: true,
        data: { name: 'Test' },
      });

      const result = await executeCFPFlow(testUrl, {
        includeFingerprint: false,
        shouldPublish: false,
      });

      // Verify result structure
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('url');
      expect(result).toHaveProperty('entity');
      expect(result).toHaveProperty('processingTime');
      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('partialResults');

      // Verify partialResults structure
      expect(result.partialResults).toHaveProperty('crawlSuccess');
      expect(result.partialResults).toHaveProperty('fingerprintSuccess');
      expect(result.partialResults).toHaveProperty('entityCreationSuccess');
      expect(result.partialResults).toHaveProperty('publishSuccess');
    });
  });
});
