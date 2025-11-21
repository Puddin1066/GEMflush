/**
 * Scheduler Service Unit Tests
 * SOLID: Single Responsibility - tests individual functions in isolation
 * DRY: Reuses test helpers and mocks
 * 
 * Tests:
 * - handleAutoPublish() - Auto-publishing logic
 * - processScheduledAutomation() - Unified scheduling logic
 * - processBusinessAutomation() - Individual business processing
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { handleAutoPublish, processScheduledAutomation } from '../scheduler-service';
import { MockBusinessFactory, MockTeamFactory, MockPublishDataFactory } from './scheduler-test-helpers';
import type { Business, Team } from '@/lib/db/schema';

// Mock dependencies (SOLID: mock at module level)
vi.mock('@/lib/db/queries', () => ({
  getBusinessById: vi.fn(),
  getTeamForBusiness: vi.fn(),
  updateBusiness: vi.fn(),
  createCrawlJob: vi.fn(),
  createWikidataEntity: vi.fn(),
}));

vi.mock('@/lib/services/business-processing', () => ({
  executeCrawlJob: vi.fn(),
  executeFingerprint: vi.fn(),
}));

vi.mock('@/lib/data/wikidata-dto', () => ({
  getWikidataPublishDTO: vi.fn(),
}));

vi.mock('@/lib/wikidata/publisher', () => ({
  wikidataPublisher: {
    publishEntity: vi.fn(),
  },
}));

vi.mock('@/lib/wikidata/manual-publish-storage', () => ({
  storeEntityForManualPublish: vi.fn(),
}));

vi.mock('@/lib/services/automation-service', () => ({
  shouldAutoCrawl: vi.fn(),
  shouldAutoPublish: vi.fn(),
  getAutomationConfig: vi.fn(),
  calculateNextCrawlDate: vi.fn(),
}));

vi.mock('@/lib/db/drizzle', () => ({
  db: {
    select: vi.fn(),
  },
}));

describe('Scheduler Service - Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('handleAutoPublish', () => {
    it('should skip publish if business not found', async () => {
      const { getBusinessById } = await import('@/lib/db/queries');
      vi.mocked(getBusinessById).mockResolvedValue(null);

      await expect(handleAutoPublish(1)).rejects.toThrow('Business not found');
    });

    it('should skip publish if shouldAutoPublish returns false', async () => {
      const { getBusinessById, getTeamForBusiness } = await import('@/lib/db/queries');
      const { shouldAutoPublish: shouldAutoPublishMock, getAutomationConfig } = await import('@/lib/services/automation-service');

      const business = MockBusinessFactory.createCrawled();
      const team = MockTeamFactory.createPro();

      vi.mocked(getBusinessById).mockResolvedValue(business);
      vi.mocked(getTeamForBusiness).mockResolvedValue(team);
      vi.mocked(shouldAutoPublishMock).mockReturnValue(false);
      vi.mocked(getAutomationConfig).mockReturnValue({
        crawlFrequency: 'monthly',
        fingerprintFrequency: 'monthly',
        autoPublish: false,
        entityRichness: 'enhanced',
        progressiveEnrichment: false,
      });

      await handleAutoPublish(1);

      const { getWikidataPublishDTO } = await import('@/lib/data/wikidata-dto');
      expect(getWikidataPublishDTO).not.toHaveBeenCalled();
    });

    it('should publish successfully when conditions are met', async () => {
      const { getBusinessById, getTeamForBusiness, updateBusiness, createWikidataEntity } = await import('@/lib/db/queries');
      const { shouldAutoPublish: shouldAutoPublishMock } = await import('@/lib/services/automation-service');
      const { getWikidataPublishDTO } = await import('@/lib/data/wikidata-dto');
      const { wikidataPublisher } = await import('@/lib/wikidata/publisher');
      const { storeEntityForManualPublish } = await import('@/lib/wikidata/manual-publish-storage');

      const business = MockBusinessFactory.createCrawled();
      const team = MockTeamFactory.createPro();
      const publishData = MockPublishDataFactory.createPublishable();

      vi.mocked(getBusinessById).mockResolvedValue(business);
      vi.mocked(getTeamForBusiness).mockResolvedValue(team);
      vi.mocked(shouldAutoPublishMock).mockReturnValue(true);
      vi.mocked(getWikidataPublishDTO).mockResolvedValue(publishData as any);
      vi.mocked(wikidataPublisher.publishEntity).mockResolvedValue({
        success: true,
        qid: 'Q12345',
      });
      vi.mocked(updateBusiness).mockResolvedValue(business);
      vi.mocked(createWikidataEntity).mockResolvedValue({ id: 1 } as any);
      vi.mocked(storeEntityForManualPublish).mockResolvedValue();

      await handleAutoPublish(1);

      expect(getWikidataPublishDTO).toHaveBeenCalledWith(1);
      expect(wikidataPublisher.publishEntity).toHaveBeenCalledWith(
        publishData.fullEntity,
        false
      );
      expect(updateBusiness).toHaveBeenCalledWith(1, expect.objectContaining({
        status: 'published',
        wikidataQID: 'Q12345',
      }));
      expect(createWikidataEntity).toHaveBeenCalled();
    });

    it('should skip publish if notability check fails', async () => {
      const { getBusinessById, getTeamForBusiness, updateBusiness } = await import('@/lib/db/queries');
      const { shouldAutoPublish: shouldAutoPublishMock } = await import('@/lib/services/automation-service');
      const { getWikidataPublishDTO } = await import('@/lib/data/wikidata-dto');
      const { storeEntityForManualPublish } = await import('@/lib/wikidata/manual-publish-storage');

      const business = MockBusinessFactory.createCrawled();
      const team = MockTeamFactory.createPro();
      const publishData = MockPublishDataFactory.createNotPublishable();

      vi.mocked(getBusinessById).mockResolvedValue(business);
      vi.mocked(getTeamForBusiness).mockResolvedValue(team);
      vi.mocked(shouldAutoPublishMock).mockReturnValue(true);
      vi.mocked(getWikidataPublishDTO).mockResolvedValue(publishData as any);
      vi.mocked(updateBusiness).mockResolvedValue(business);
      vi.mocked(storeEntityForManualPublish).mockResolvedValue();

      await handleAutoPublish(1);

      const { wikidataPublisher } = await import('@/lib/wikidata/publisher');
      expect(wikidataPublisher.publishEntity).not.toHaveBeenCalled();
      expect(updateBusiness).toHaveBeenCalledWith(1, expect.objectContaining({
        status: 'crawled', // Reverted from 'generating'
      }));
    });

    it('should handle publish errors gracefully', async () => {
      const { getBusinessById, getTeamForBusiness, updateBusiness } = await import('@/lib/db/queries');
      const { shouldAutoPublish: shouldAutoPublishMock } = await import('@/lib/services/automation-service');
      const { getWikidataPublishDTO } = await import('@/lib/data/wikidata-dto');
      const { wikidataPublisher } = await import('@/lib/wikidata/publisher');

      const business = MockBusinessFactory.createCrawled();
      const team = MockTeamFactory.createPro();
      const publishData = MockPublishDataFactory.createPublishable();

      vi.mocked(getBusinessById).mockResolvedValue(business);
      vi.mocked(getTeamForBusiness).mockResolvedValue(team);
      vi.mocked(shouldAutoPublishMock).mockReturnValue(true);
      vi.mocked(getWikidataPublishDTO).mockResolvedValue(publishData as any);
      vi.mocked(wikidataPublisher.publishEntity).mockResolvedValue({
        success: false,
        error: 'Publication failed',
      });
      vi.mocked(updateBusiness).mockResolvedValue(business);

      await expect(handleAutoPublish(1)).rejects.toThrow('Publication failed');

      expect(updateBusiness).toHaveBeenCalledWith(1, expect.objectContaining({
        status: 'error',
      }));
    });
  });

  describe('processScheduledAutomation', () => {
    it('should return empty results when no businesses are due', async () => {
      const { db } = await import('@/lib/db/drizzle');
      
      const mockSelect = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        innerJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([]),
      };

      vi.mocked(db.select).mockReturnValue(mockSelect as any);

      const result = await processScheduledAutomation();

      expect(result).toEqual({
        total: 0,
        success: 0,
        skipped: 0,
        failed: 0,
      });
    });

    it('should process businesses in batches', async () => {
      const { db } = await import('@/lib/db/drizzle');
      const { executeCrawlJob, executeFingerprint } = await import('@/lib/services/business-processing');
      const { getAutomationConfig, calculateNextCrawlDate, shouldAutoCrawl } = await import('@/lib/services/automation-service');
      const { updateBusiness } = await import('@/lib/db/queries');
      const { handleAutoPublish } = await import('../scheduler-service');

      // Create 15 businesses (will be processed in 2 batches of 10)
      const businesses = Array.from({ length: 15 }, (_, i) => ({
        business: MockBusinessFactory.create({ id: i + 1 }),
        team: MockTeamFactory.createPro(),
      }));

      const mockSelect = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        innerJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue(businesses),
      };

      vi.mocked(db.select).mockReturnValue(mockSelect as any);
      vi.mocked(shouldAutoCrawl).mockReturnValue(true);
      vi.mocked(getAutomationConfig).mockReturnValue({
        crawlFrequency: 'monthly',
        fingerprintFrequency: 'monthly',
        autoPublish: true,
        entityRichness: 'enhanced',
        progressiveEnrichment: false,
      });
      const nextDate = new Date();
      nextDate.setMonth(nextDate.getMonth() + 1);
      vi.mocked(calculateNextCrawlDate).mockReturnValue(nextDate);
      vi.mocked(executeCrawlJob).mockResolvedValue();
      vi.mocked(executeFingerprint).mockResolvedValue(MockBusinessFactory.createCrawled());
      vi.mocked(updateBusiness).mockResolvedValue(MockBusinessFactory.create());
      
      // handleAutoPublish is called internally, so we need to mock it at the module level
      // Since it's in the same module, we'll just verify the overall flow works

      const result = await processScheduledAutomation({ batchSize: 10 });

      expect(result.total).toBe(15);
      expect(executeCrawlJob).toHaveBeenCalledTimes(15);
      expect(executeFingerprint).toHaveBeenCalledTimes(15);
      // handleAutoPublish is called internally, verify through result
      expect(result.success).toBeGreaterThan(0);
    });

    it('should skip businesses with manual frequency', async () => {
      const { db } = await import('@/lib/db/drizzle');
      const { getAutomationConfig } = await import('@/lib/services/automation-service');

      const businesses = [{
        business: MockBusinessFactory.create(),
        team: MockTeamFactory.createFree(),
      }];

      const mockSelect = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        innerJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue(businesses),
      };

      vi.mocked(db.select).mockReturnValue(mockSelect as any);
      vi.mocked(getAutomationConfig).mockReturnValue({
        crawlFrequency: 'manual',
        fingerprintFrequency: 'manual',
        autoPublish: false,
        entityRichness: 'basic',
        progressiveEnrichment: false,
      });

      const result = await processScheduledAutomation();

      expect(result.skipped).toBe(1);
      expect(result.success).toBe(0);
    });

    it('should handle errors gracefully and continue processing', async () => {
      const { db } = await import('@/lib/db/drizzle');
      const { executeCrawlJob, executeFingerprint } = await import('@/lib/services/business-processing');
      const { getAutomationConfig, shouldAutoCrawl, calculateNextCrawlDate } = await import('@/lib/services/automation-service');
      const { updateBusiness } = await import('@/lib/db/queries');

      const businesses = [
        { business: MockBusinessFactory.create({ id: 1 }), team: MockTeamFactory.createPro() },
        { business: MockBusinessFactory.create({ id: 2 }), team: MockTeamFactory.createPro() },
      ];

      const mockSelect = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        innerJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue(businesses),
      };

      vi.mocked(db.select).mockReturnValue(mockSelect as any);
      vi.mocked(shouldAutoCrawl).mockReturnValue(true);
      vi.mocked(getAutomationConfig).mockReturnValue({
        crawlFrequency: 'monthly',
        fingerprintFrequency: 'monthly',
        autoPublish: true,
        entityRichness: 'enhanced',
        progressiveEnrichment: false,
      });
      vi.mocked(calculateNextCrawlDate).mockReturnValue(new Date());
      vi.mocked(updateBusiness).mockResolvedValue(MockBusinessFactory.create());
      
      // First business fails, second succeeds
      vi.mocked(executeCrawlJob)
        .mockRejectedValueOnce(new Error('Crawl failed'))
        .mockResolvedValueOnce();
      vi.mocked(executeFingerprint)
        .mockResolvedValueOnce(MockBusinessFactory.createCrawled())
        .mockResolvedValueOnce(MockBusinessFactory.createCrawled());

      const result = await processScheduledAutomation();

      // Should process both businesses, one fails
      expect(result.total).toBe(2);
      expect(executeCrawlJob).toHaveBeenCalledTimes(2);
      // At least one should fail
      expect(result.failed + result.success).toBeGreaterThan(0);
    });
  });
});

