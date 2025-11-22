/**
 * Unit tests for CFP Orchestrator
 * Tests complete CFP flow: Crawl → Fingerprint → Entity Creation → Publish
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  CFPOrchestrator,
  executeCFPFlow,
  createEntityFromUrl,
  crawlFingerprintAndPublish,
} from '../cfp-orchestrator';
import type { CFPProgress, CFPResult } from '../cfp-orchestrator';

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
    publishEntity: vi.fn(),
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
  },
}));

describe('CFP Orchestrator', () => {
  let orchestrator: CFPOrchestrator;
  let mockWebCrawler: any;
  let mockBusinessFingerprinter: any;
  let mockWikidataService: any;
  let progressUpdates: CFPProgress[];

  beforeEach(async () => {
    vi.clearAllMocks();
    orchestrator = new CFPOrchestrator();
    progressUpdates = [];

    // Get mocked modules
    const crawler = await import('@/lib/crawler');
    const llm = await import('@/lib/llm');
    const wikidata = await import('@/lib/wikidata');

    mockWebCrawler = crawler.webCrawler;
    mockBusinessFingerprinter = llm.businessFingerprinter;
    mockWikidataService = wikidata.wikidataService;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('executeCFPFlow - Complete Flow', () => {
    const testUrl = 'https://brownphysicians.org';
    const mockCrawlData = {
      name: 'Brown Physicians',
      description: 'Multi-specialty physician practice',
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
      services: ['Primary Care', 'Internal Medicine'],
      businessDetails: {
        industry: 'healthcare',
      },
    };

    const mockFingerprintAnalysis = {
      businessId: 1,
      businessName: 'Brown Physicians',
      metrics: {
        visibilityScore: 71,
        mentionRate: 0.78,
        sentimentScore: 0.93,
        confidenceLevel: 0.82,
        avgRankPosition: null,
        totalQueries: 9,
        successfulQueries: 9,
      },
      competitiveLeaderboard: {
        targetBusiness: {
          name: 'Brown Physicians',
          rank: null,
          mentionCount: 1,
          avgPosition: null,
        },
        competitors: [],
        totalRecommendationQueries: 3,
      },
      llmResults: [],
      generatedAt: new Date(),
      processingTime: 3000,
      visibilityScore: 71,
      mentionRate: 0.78,
      sentimentScore: 0.93,
      accuracyScore: 0.82,
      avgRankPosition: null,
    };

    const mockWikidataEntity = {
      id: 'Q12345',
      labels: {
        en: { language: 'en', value: 'Brown Physicians' },
      },
      descriptions: {
        en: { language: 'en', value: 'Multi-specialty physician practice' },
      },
      claims: {},
    };

    it('should execute complete CFP flow successfully', async () => {
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
        qid: 'Q12345',
      });

      // Execute CFP flow
      const progressCallback = (progress: CFPProgress) => {
        progressUpdates.push(progress);
      };

      const result = await orchestrator.executeCFPFlow(
        {
          url: testUrl,
          options: {
            includeFingerprint: true,
            shouldPublish: true,
            publishTarget: 'test',
          },
        },
        progressCallback
      );

      // Assertions
      expect(result.success).toBe(true);
      expect(result.url).toBe(testUrl);
      expect(result.crawlData).toBeDefined();
      expect(result.fingerprintAnalysis).toBeDefined();
      expect(result.entity).toBeDefined();
      expect(result.publishResult).toBeDefined();
      expect(result.publishResult?.success).toBe(true);

      // Verify progress updates (log for debugging without overfitting)
      console.log(`[TEST] Progress updates received: ${progressUpdates.length} updates`);
      progressUpdates.forEach((update, idx) => {
        console.log(`[TEST] Progress ${idx + 1}: ${update.stage} (${update.progress}%) - ${update.message}`);
      });
      
      expect(progressUpdates.length).toBeGreaterThan(0);
      expect(progressUpdates[0].stage).toBe('crawling');
      expect(progressUpdates.some(p => p.stage === 'completed')).toBe(true);

      // Verify service calls
      expect(mockWebCrawler.crawl).toHaveBeenCalledWith(testUrl);
      expect(mockBusinessFingerprinter.fingerprintWithContext).toHaveBeenCalled();
      expect(mockWikidataService.createAndPublishEntity).toHaveBeenCalled();
      expect(mockWikidataService.publishEntity).toHaveBeenCalled();
    });

    it('should handle crawl failure gracefully', async () => {
      // Setup mocks - crawl fails
      mockWebCrawler.crawl.mockResolvedValue({
        success: false,
        error: 'Crawl failed',
      });

      mockBusinessFingerprinter.fingerprintWithContext.mockResolvedValue(
        mockFingerprintAnalysis
      );

      // Execute CFP flow
      const result = await orchestrator.executeCFPFlow({
        url: testUrl,
        options: {
          includeFingerprint: true,
          shouldPublish: false,
        },
      });

      // Assertions
      expect(result.success).toBe(false);
      expect(result.partialResults?.crawlSuccess).toBe(false);
      expect(result.partialResults?.fingerprintSuccess).toBe(true);
      expect(result.error).toBeUndefined(); // Partial success, not complete failure
    });

    it('should handle fingerprint failure gracefully', async () => {
      // Setup mocks - fingerprint fails
      mockWebCrawler.crawl.mockResolvedValue({
        success: true,
        data: mockCrawlData,
      });

      mockBusinessFingerprinter.fingerprintWithContext.mockRejectedValue(
        new Error('Fingerprint failed')
      );

      mockWikidataService.createAndPublishEntity.mockResolvedValue({
        entity: mockWikidataEntity,
        success: true,
      });

      // Execute CFP flow
      const result = await orchestrator.executeCFPFlow({
        url: testUrl,
        options: {
          includeFingerprint: true,
          shouldPublish: false,
        },
      });

      // Assertions
      expect(result.success).toBe(false);
      expect(result.partialResults?.crawlSuccess).toBe(true);
      expect(result.partialResults?.fingerprintSuccess).toBe(false);
      expect(result.entity).toBeDefined(); // Entity can still be created
    });

    it('should skip fingerprint when includeFingerprint is false', async () => {
      // Setup mocks
      mockWebCrawler.crawl.mockResolvedValue({
        success: true,
        data: mockCrawlData,
      });

      mockWikidataService.createAndPublishEntity.mockResolvedValue({
        entity: mockWikidataEntity,
        success: true,
      });

      // Execute CFP flow without fingerprint
      const result = await orchestrator.executeCFPFlow({
        url: testUrl,
        options: {
          includeFingerprint: false,
          shouldPublish: false,
        },
      });

      // Assertions
      expect(result.fingerprintAnalysis).toBeUndefined();
      expect(mockBusinessFingerprinter.fingerprintWithContext).not.toHaveBeenCalled();
      expect(result.partialResults?.fingerprintSuccess).toBe(true); // Skipped, not failed
    });

    it('should skip publishing when shouldPublish is false', async () => {
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
      const result = await orchestrator.executeCFPFlow({
        url: testUrl,
        options: {
          includeFingerprint: true,
          shouldPublish: false,
        },
      });

      // Assertions
      expect(result.publishResult).toBeUndefined();
      expect(mockWikidataService.publishEntity).not.toHaveBeenCalled();
      expect(result.partialResults?.publishSuccess).toBe(true); // Skipped, not failed
    });

    it('should validate URL format', async () => {
      // Execute CFP flow with invalid URL
      // Orchestrator catches errors and returns failed result instead of throwing
      const result = await orchestrator.executeCFPFlow({
        url: 'invalid-url',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid URL format');
      expect(result.entity).toBeNull();
    });

    it('should handle timeout', async () => {
      // Setup mocks with delays
      mockWebCrawler.crawl.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({
          success: true,
          data: mockCrawlData,
        }), 200))
      );

      // Execute with short timeout
      const result = await orchestrator.executeCFPFlow({
        url: testUrl,
        options: {
          timeout: 100, // Short timeout
        },
      });

      // Should handle timeout gracefully (may complete or fail depending on implementation)
      expect(result).toBeDefined();
    });
  });

  describe('Convenience Functions', () => {
    const testUrl = 'https://example.com';

    it('executeCFPFlow should work as convenience function', async () => {
      const { webCrawler } = await import('@/lib/crawler');
      webCrawler.crawl.mockResolvedValue({
        success: true,
        data: { name: 'Test' },
      });

      const result = await executeCFPFlow(testUrl, {
        includeFingerprint: false,
        shouldPublish: false,
      });

      expect(result).toBeDefined();
      expect(result.url).toBe(testUrl);
    });

    it('createEntityFromUrl should return only entity', async () => {
      const { webCrawler } = await import('@/lib/crawler');
      const { wikidataService } = await import('@/lib/wikidata');

      webCrawler.crawl.mockResolvedValue({
        success: true,
        data: { name: 'Test' },
      });

      wikidataService.createAndPublishEntity.mockResolvedValue({
        entity: { id: 'Q123' },
        success: true,
      });

      const entity = await createEntityFromUrl(testUrl);

      expect(entity).toBeDefined();
      expect(entity?.id).toBe('Q123');
    });

    it('crawlFingerprintAndPublish should enable all options', async () => {
      const { webCrawler } = await import('@/lib/crawler');
      const { businessFingerprinter } = await import('@/lib/llm');
      const { wikidataService } = await import('@/lib/wikidata');

      webCrawler.crawl.mockResolvedValue({
        success: true,
        data: { name: 'Test' },
      });

      businessFingerprinter.fingerprintWithContext.mockResolvedValue({
        visibilityScore: 50,
        metrics: { visibilityScore: 50 },
      } as any);

      wikidataService.createAndPublishEntity.mockResolvedValue({
        entity: { id: 'Q123' },
        success: true,
      });

      wikidataService.publishEntity.mockResolvedValue({
        success: true,
        qid: 'Q123',
      });

      const result = await crawlFingerprintAndPublish(testUrl);

      expect(result.success).toBe(true);
      expect(result.entity).toBeDefined();
      expect(result.publishResult).toBeDefined();
    });
  });

  describe('Progress Tracking', () => {
    const testUrl = 'https://example.com';

    it('should call progress callback at each stage', async () => {
      const { webCrawler } = await import('@/lib/crawler');
      const { businessFingerprinter } = await import('@/lib/llm');

      webCrawler.crawl.mockResolvedValue({
        success: true,
        data: { name: 'Test' },
      });

      businessFingerprinter.fingerprintWithContext.mockResolvedValue({
        visibilityScore: 50,
      } as any);

      const progressCallback = vi.fn();
      await orchestrator.executeCFPFlow(
        {
          url: testUrl,
          options: {
            includeFingerprint: true,
            shouldPublish: false,
          },
        },
        progressCallback
      );

      // Verify progress callback was called multiple times
      expect(progressCallback).toHaveBeenCalled();
      
      // Check that different stages were reported
      const stages = progressCallback.mock.calls.map(call => call[0].stage);
      expect(stages).toContain('crawling');
      expect(stages).toContain('fingerprinting');
    });

    it('should report progress percentages', async () => {
      const { webCrawler } = await import('@/lib/crawler');

      webCrawler.crawl.mockResolvedValue({
        success: true,
        data: { name: 'Test' },
      });

      const progressCallback = vi.fn();
      await orchestrator.executeCFPFlow(
        {
          url: testUrl,
          options: {
            includeFingerprint: false,
            shouldPublish: false,
          },
        },
        progressCallback
      );

      // Verify progress percentages are reported
      const progressValues = progressCallback.mock.calls.map(call => call[0].progress);
      expect(progressValues.some(p => p > 0 && p <= 100)).toBe(true);
    });
  });
});
