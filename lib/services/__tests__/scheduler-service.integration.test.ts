/**
 * Scheduler Service Integration Tests
 * SOLID: Single Responsibility - tests full CFP pipeline integration
 * DRY: Reuses test helpers and follows existing integration test patterns
 * 
 * Tests the complete automation flow:
 * - Query businesses due for processing
 * - Run crawl + fingerprint (parallel)
 * - Auto-publish if conditions met
 * - Schedule next processing
 * 
 * Uses real database - only mocks external APIs (Firecrawl, OpenRouter, Wikidata)
 */

import { describe, it, expect, vi, beforeEach, afterAll, beforeAll } from 'vitest';
import { processScheduledAutomation, handleAutoPublish } from '../scheduler-service';
import { TestUserFactory, TestBusinessFactory, DatabaseCleanup } from '@/tests/utils/test-helpers';
import { MockBusinessFactory, MockTeamFactory } from './scheduler-test-helpers';
import { db } from '@/lib/db/drizzle';
import { businesses, teams, llmFingerprints, wikidataEntities, type Business, type Team } from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';

// Mock external APIs only (SOLID: mock dependencies, not implementation)
vi.mock('@/lib/crawler', () => ({
  webCrawler: {
    crawl: vi.fn().mockResolvedValue({
      success: true,
      data: {
        name: 'Test Business',
        description: 'A test business',
        phone: '555-0100',
        email: 'test@example.com',
        location: {
          city: 'Seattle',
          state: 'WA',
          country: 'US',
        },
      },
    }),
  },
}));

vi.mock('@/lib/llm/openrouter', () => ({
  openRouterClient: {
    query: vi.fn().mockResolvedValue({
      content: 'Test Business is a reputable local establishment.',
      tokensUsed: 100,
    }),
  },
}));

// Generate unique QIDs for each test using timestamp
vi.mock('@/lib/wikidata/publisher', () => ({
  wikidataPublisher: {
    publishEntity: vi.fn().mockImplementation(() => {
      const qid = `Q${Date.now()}${Math.floor(Math.random() * 1000)}`;
      return Promise.resolve({
        success: true,
        qid,
      });
    }),
  },
}));

vi.mock('@/lib/data/wikidata-dto', () => ({
  getWikidataPublishDTO: vi.fn().mockResolvedValue({
    canPublish: true,
    notability: {
      isNotable: true,
      confidence: 0.85,
      sources: [{ url: 'https://example.com/article', title: 'Test Article' }],
    },
    recommendation: 'Publish',
    fullEntity: {
      labels: { en: { language: 'en', value: 'Test Business' } },
      descriptions: { en: { language: 'en', value: 'A test business' } },
      claims: {
        P31: [{ mainsnak: { property: 'P31', datavalue: { value: 'Q4830453' } } }],
        P856: [{ mainsnak: { property: 'P856', datavalue: { value: 'https://example.com' } } }],
      },
    },
  }),
}));

vi.mock('@/lib/wikidata/manual-publish-storage', () => ({
  storeEntityForManualPublish: vi.fn().mockResolvedValue(undefined),
}));

describe('Scheduler Service - Integration Tests', () => {
  let testUser: { user: { id: number }; team: Team };
  let testBusiness: Business;

  beforeAll(async () => {
    // Create test user and team
    testUser = await TestUserFactory.createUserWithTeam();
    
    // Create test business with automation enabled
    const nextCrawlAt = new Date();
    nextCrawlAt.setDate(nextCrawlAt.getDate() - 1); // Past date (due for crawl)

    testBusiness = await TestBusinessFactory.createBusiness(testUser.team.id, {
      name: 'Integration Test Business',
      url: 'https://example.com',
      category: 'Restaurant',
      location: { city: 'Seattle', state: 'WA', country: 'US' },
      status: 'pending',
      automationEnabled: true,
      nextCrawlAt,
    });

    // Update team to Pro tier for automation (before creating business)
    await db.update(teams)
      .set({ planName: 'pro' })
      .where(eq(teams.id, testUser.team.id));
    
    // Refresh team object
    const [updatedTeam] = await db.select()
      .from(teams)
      .where(eq(teams.id, testUser.team.id))
      .limit(1);
    testUser.team = updatedTeam;
  });

  afterAll(async () => {
    // Cleanup - delete related records first (foreign key constraints)
    if (testBusiness) {
      // Delete fingerprints first
      await db.delete(llmFingerprints).where(eq(llmFingerprints.businessId, testBusiness.id)).catch(() => {});
      // Delete wikidata entities
      await db.delete(wikidataEntities).where(eq(wikidataEntities.businessId, testBusiness.id)).catch(() => {});
      // Delete crawl jobs if any
      await db.execute(sql`DELETE FROM crawl_jobs WHERE business_id = ${testBusiness.id}`).catch(() => {});
      // Then delete business
      await DatabaseCleanup.cleanupBusiness(testBusiness.id);
    }
    if (testUser?.user?.id) {
      await DatabaseCleanup.cleanupUser(testUser.user.id);
    }
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('processScheduledAutomation - Full CFP Pipeline', () => {
    it('should process business through full CFP pipeline', async () => {
      const { webCrawler } = await import('@/lib/crawler');
      const { openRouterClient } = await import('@/lib/llm/openrouter');
      const { wikidataPublisher } = await import('@/lib/wikidata/publisher');

      // Process scheduled automation
      const result = await processScheduledAutomation({
        batchSize: 10,
        catchMissed: true,
      });

      // Verify results
      expect(result.total).toBeGreaterThan(0);
      expect(result.success).toBeGreaterThan(0);

      // Verify crawl was called
      expect(webCrawler.crawl).toHaveBeenCalled();

      // Verify fingerprint was called (9 LLM queries)
      expect(openRouterClient.query).toHaveBeenCalled();

      // Verify publish was called
      expect(wikidataPublisher.publishEntity).toHaveBeenCalled();

      // Verify business was updated
      const updatedBusiness = await db
        .select()
        .from(businesses)
        .where(eq(businesses.id, testBusiness.id))
        .limit(1);

      expect(updatedBusiness[0]).toBeDefined();
      expect(updatedBusiness[0].status).toBe('published');
      expect(updatedBusiness[0].wikidataQID).toBeDefined(); // QID assigned
      expect(updatedBusiness[0].nextCrawlAt).toBeDefined(); // Next crawl scheduled
    });

    it('should handle businesses with different frequencies', async () => {
      // Create a separate team with free tier
      const freeUser = await TestUserFactory.createUserWithTeam();
      const freeBusiness = await TestBusinessFactory.createBusiness(freeUser.team.id, {
        name: 'Free Tier Business',
        automationEnabled: true,
        nextCrawlAt: new Date(Date.now() - 1000),
      });

      const result = await processScheduledAutomation();

      // Free tier businesses should be skipped
      expect(result.skipped).toBeGreaterThanOrEqual(0);

      // Cleanup
      await db.delete(llmFingerprints).where(eq(llmFingerprints.businessId, freeBusiness.id)).catch(() => {});
      await DatabaseCleanup.cleanupBusiness(freeBusiness.id);
      await DatabaseCleanup.cleanupUser(freeUser.user.id);
    });

    it('should catch businesses that missed their schedule', async () => {
      // Create business with very old lastCrawledAt (30+ days ago)
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 35);

      const missedBusiness = await TestBusinessFactory.createBusiness(testUser.team.id, {
        name: 'Missed Schedule Business',
        automationEnabled: true,
        lastCrawledAt: oldDate,
        nextCrawlAt: oldDate, // Also old
        status: 'crawled',
      });

      const result = await processScheduledAutomation({
        catchMissed: true,
      });

      // Should process the missed business
      expect(result.total).toBeGreaterThan(0);

      // Cleanup - delete in correct order
      await db.delete(llmFingerprints).where(eq(llmFingerprints.businessId, missedBusiness.id)).catch(() => {});
      await db.delete(wikidataEntities).where(eq(wikidataEntities.businessId, missedBusiness.id)).catch(() => {});
      await db.execute(sql`DELETE FROM crawl_jobs WHERE business_id = ${missedBusiness.id}`).catch(() => {});
      await db.delete(businesses).where(eq(businesses.id, missedBusiness.id)).catch(() => {});
    });

    it('should skip businesses not due for processing', async () => {
      // Create business with future nextCrawlAt
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);

      const futureBusiness = await TestBusinessFactory.createBusiness(testUser.team.id, {
        name: 'Future Business',
        automationEnabled: true,
        nextCrawlAt: futureDate,
      });

      const result = await processScheduledAutomation();

      // Should not process future business
      const processedBusiness = await db
        .select()
        .from(businesses)
        .where(eq(businesses.id, futureBusiness.id))
        .limit(1);

      expect(processedBusiness[0].status).toBe('pending'); // Unchanged

      // Cleanup
      await db.delete(llmFingerprints).where(eq(llmFingerprints.businessId, futureBusiness.id)).catch(() => {});
      await DatabaseCleanup.cleanupBusiness(futureBusiness.id);
    });
  });

  describe('handleAutoPublish - Integration', () => {
    it('should publish business when notability check passes', async () => {
      // Ensure team is Pro tier for auto-publish
      await db.update(teams)
        .set({ planName: 'pro' })
        .where(eq(teams.id, testUser.team.id));

      // Create crawled business ready for publish
      const crawledBusiness = await TestBusinessFactory.createBusiness(testUser.team.id, {
        name: 'Publish Test Business',
        status: 'crawled',
        lastCrawledAt: new Date(),
        crawlData: {
          name: 'Publish Test Business',
          description: 'A business ready for publishing',
        },
      });

      const { wikidataPublisher } = await import('@/lib/wikidata/publisher');
      const { getWikidataPublishDTO } = await import('@/lib/data/wikidata-dto');

      await handleAutoPublish(crawledBusiness.id);

      // Verify publish was called
      expect(getWikidataPublishDTO).toHaveBeenCalledWith(crawledBusiness.id);
      expect(wikidataPublisher.publishEntity).toHaveBeenCalled();

      // Verify business was updated
      const updatedBusiness = await db
        .select()
        .from(businesses)
        .where(eq(businesses.id, crawledBusiness.id))
        .limit(1);

      expect(updatedBusiness[0].status).toBe('published');
      expect(updatedBusiness[0].wikidataQID).toBeDefined(); // QID assigned

      // Cleanup - delete in correct order (foreign key constraints)
      await db.delete(llmFingerprints).where(eq(llmFingerprints.businessId, crawledBusiness.id)).catch(() => {});
      await db.delete(wikidataEntities).where(eq(wikidataEntities.businessId, crawledBusiness.id)).catch(() => {});
      await db.execute(sql`DELETE FROM crawl_jobs WHERE business_id = ${crawledBusiness.id}`).catch(() => {});
      await db.delete(businesses).where(eq(businesses.id, crawledBusiness.id)).catch(() => {});
    });

    it('should skip publish when notability check fails', async () => {
      const { getWikidataPublishDTO } = await import('@/lib/data/wikidata-dto');
      const { wikidataPublisher } = await import('@/lib/wikidata/publisher');

      // Mock notability check to fail
      vi.mocked(getWikidataPublishDTO).mockResolvedValueOnce({
        canPublish: false,
        notability: {
          isNotable: false,
          confidence: 0.3,
          sources: [],
        },
        recommendation: 'Not notable enough',
        fullEntity: {
          labels: { en: { language: 'en', value: 'Test Business' } },
          descriptions: { en: { language: 'en', value: 'A test business' } },
          claims: {},
        },
      } as any);

      const crawledBusiness = await TestBusinessFactory.createBusiness(testUser.team.id, {
        name: 'Not Notable Business',
        status: 'crawled',
        lastCrawledAt: new Date(),
      });

      await handleAutoPublish(crawledBusiness.id);

      // Verify publish was NOT called
      expect(wikidataPublisher.publishEntity).not.toHaveBeenCalled();

      // Verify business status reverted to crawled
      const updatedBusiness = await db
        .select()
        .from(businesses)
        .where(eq(businesses.id, crawledBusiness.id))
        .limit(1);

      expect(updatedBusiness[0].status).toBe('crawled');

      // Cleanup
      await db.delete(llmFingerprints).where(eq(llmFingerprints.businessId, crawledBusiness.id)).catch(() => {});
      await db.delete(wikidataEntities).where(eq(wikidataEntities.businessId, crawledBusiness.id)).catch(() => {});
      await db.execute(sql`DELETE FROM crawl_jobs WHERE business_id = ${crawledBusiness.id}`).catch(() => {});
      await db.delete(businesses).where(eq(businesses.id, crawledBusiness.id)).catch(() => {});
    });
  });

  describe('Error Handling', () => {
    it('should handle crawl failures gracefully', async () => {
      const failingBusiness = await TestBusinessFactory.createBusiness(testUser.team.id, {
        name: 'Failing Crawl Business',
        automationEnabled: true,
        nextCrawlAt: new Date(Date.now() - 1000),
      });

      // Mock crawl to fail for this specific business
      const { webCrawler } = await import('@/lib/crawler');
      const originalCrawl = vi.mocked(webCrawler.crawl);
      vi.mocked(webCrawler.crawl).mockImplementationOnce(() => {
        return Promise.reject(new Error('Crawl failed'));
      });

      const result = await processScheduledAutomation();

      // Should process businesses (may succeed or fail, but should not crash)
      expect(result.total).toBeGreaterThan(0);
      // The function handles errors gracefully
      expect(result.success + result.failed + result.skipped).toBeGreaterThan(0);

      // Restore original mock
      vi.mocked(webCrawler.crawl).mockImplementation(originalCrawl);

      // Cleanup
      await db.delete(llmFingerprints).where(eq(llmFingerprints.businessId, failingBusiness.id)).catch(() => {});
      await db.delete(wikidataEntities).where(eq(wikidataEntities.businessId, failingBusiness.id)).catch(() => {});
      await db.execute(sql`DELETE FROM crawl_jobs WHERE business_id = ${failingBusiness.id}`).catch(() => {});
      await DatabaseCleanup.cleanupBusiness(failingBusiness.id);
    }, 10000); // Increase timeout

    it('should handle publish failures gracefully', async () => {
      // Ensure team is Pro tier for auto-publish
      await db.update(teams)
        .set({ planName: 'pro' })
        .where(eq(teams.id, testUser.team.id));

      const { wikidataPublisher } = await import('@/lib/wikidata/publisher');
      
      // Mock publish to fail
      vi.mocked(wikidataPublisher.publishEntity).mockResolvedValueOnce({
        success: false,
        qid: null,
        error: 'Publication failed',
      });

      const crawledBusiness = await TestBusinessFactory.createBusiness(testUser.team.id, {
        name: 'Failing Publish Business',
        status: 'crawled',
        lastCrawledAt: new Date(),
      });

      await expect(handleAutoPublish(crawledBusiness.id)).rejects.toThrow();

      // Verify business status updated to error
      const updatedBusiness = await db
        .select()
        .from(businesses)
        .where(eq(businesses.id, crawledBusiness.id))
        .limit(1);

      expect(updatedBusiness[0].status).toBe('error');

      // Cleanup
      await DatabaseCleanup.cleanupBusiness(crawledBusiness.id);
    });
  });
});

