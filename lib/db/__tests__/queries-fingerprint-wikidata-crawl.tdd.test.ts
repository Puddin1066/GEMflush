/**
 * TDD Test: Fingerprint, Wikidata, and Crawl Job Query Functions - Tests Drive Implementation
 * 
 * SPECIFICATION: Fingerprint, Wikidata, and Crawl Job Query Functions Must Work Correctly
 * 
 * As a developer
 * I want fingerprint, wikidata, and crawl job query functions to work correctly
 * So that the application can reliably manage fingerprints, wikidata entities, and crawl jobs
 * 
 * Acceptance Criteria:
 * 1. Fingerprint queries (getLatestFingerprint, createFingerprint, getFingerprintHistory) work correctly
 * 2. Wikidata queries (getWikidataEntity, createWikidataEntity) work correctly
 * 3. Crawl job queries (createCrawlJob, updateCrawlJob, getCrawlJob, getLatestCrawlJob, getActiveCrawlJobs) work correctly
 * 4. Error handling works correctly
 * 5. Edge cases are handled properly
 * 
 * TDD Cycle: RED → GREEN → REFACTOR
 * Tests written FIRST to drive implementation
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { db } from '../drizzle';
import {
  llmFingerprints,
  wikidataEntities,
  crawlJobs,
  businesses,
} from '../schema';
import { BusinessTestFactory } from '@/lib/test-helpers/tdd-helpers';
import type { LLMFingerprint, WikidataEntity, CrawlJob } from '../schema';

// Mock drizzle db
vi.mock('../drizzle', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
  },
}));

const mockDb = vi.mocked(db);

describe('🔴 RED: Fingerprint, Wikidata, and Crawl Job Query Functions Specification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * SPECIFICATION 1: Fingerprint Queries
   */
  describe('Fingerprint Queries', () => {
    /**
     * SPECIFICATION 1.1: getLatestFingerprint() - MUST Return Latest Fingerprint or Null
     * 
     * Given: Business ID
     * When: getLatestFingerprint() is called
     * Then: Returns latest fingerprint if exists, null otherwise
     */
    describe('getLatestFingerprint', () => {
      it('MUST return latest fingerprint when exists', async () => {
        // Arrange: Mock fingerprint exists
        const mockFingerprint: LLMFingerprint = {
          id: 1,
          businessId: 1,
          visibilityScore: 75,
          mentionRate: 0.5,
          sentimentScore: 0.8,
          accuracyScore: 0.9,
          avgRankPosition: 2.5,
          createdAt: new Date(),
          llmResults: {},
          competitiveBenchmark: null,
          competitiveLeaderboard: null,
        };

        const mockSelect = {
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          orderBy: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue([mockFingerprint]),
        };

        mockDb.select.mockReturnValue(mockSelect as any);

        // Act: Import and call function
        const { getLatestFingerprint } = await import('../queries');
        const result = await getLatestFingerprint(1);

        // Assert: SPECIFICATION - MUST return latest fingerprint
        expect(result).toEqual(mockFingerprint);
        expect(mockDb.select).toHaveBeenCalled();
        expect(mockSelect.orderBy).toHaveBeenCalled();
      });

      it('MUST return null when no fingerprint exists', async () => {
        // Arrange: Mock no fingerprint
        const mockSelect = {
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          orderBy: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue([]),
        };

        mockDb.select.mockReturnValue(mockSelect as any);

        // Act: Import and call function
        const { getLatestFingerprint } = await import('../queries');
        const result = await getLatestFingerprint(999);

        // Assert: SPECIFICATION - MUST return null
        expect(result).toBeNull();
      });
    });

    /**
     * SPECIFICATION 1.2: createFingerprint() - MUST Create Fingerprint
     * 
     * Given: Fingerprint data
     * When: createFingerprint() is called
     * Then: Creates fingerprint and returns created fingerprint
     */
    describe('createFingerprint', () => {
      it('MUST create and return fingerprint', async () => {
        // Arrange: Mock insert operation
        const newFingerprint = {
          businessId: 1,
          visibilityScore: 75,
          mentionRate: 0.5,
          sentimentScore: 0.8,
          accuracyScore: 0.9,
          avgRankPosition: 2.5,
          llmResults: {},
        };

        const createdFingerprint: LLMFingerprint = {
          id: 1,
          ...newFingerprint,
          createdAt: new Date(),
          competitiveBenchmark: null,
          competitiveLeaderboard: null,
        };

        const mockInsert = {
          values: vi.fn().mockReturnThis(),
          returning: vi.fn().mockResolvedValue([createdFingerprint]),
        };

        mockDb.insert = vi.fn().mockReturnValue(mockInsert as any);

        // Act: Import and call function
        const { createFingerprint } = await import('../queries');
        const result = await createFingerprint(newFingerprint);

        // Assert: SPECIFICATION - MUST create and return fingerprint
        expect(result).toEqual(createdFingerprint);
        expect(mockDb.insert).toHaveBeenCalledWith(llmFingerprints);
        expect(mockInsert.values).toHaveBeenCalledWith(newFingerprint);
      });
    });

    /**
     * SPECIFICATION 1.3: getFingerprintHistory() - MUST Return Fingerprint History
     * 
     * Given: Business ID and limit
     * When: getFingerprintHistory() is called
     * Then: Returns fingerprint history ordered by creation date descending
     */
    describe('getFingerprintHistory', () => {
      it('MUST return fingerprint history ordered by creation date', async () => {
        // Arrange: Mock fingerprints exist
        const mockFingerprints: LLMFingerprint[] = [
          {
            id: 2,
            businessId: 1,
            visibilityScore: 80,
            mentionRate: 0.6,
            sentimentScore: 0.85,
            accuracyScore: 0.95,
            avgRankPosition: 2.0,
            createdAt: new Date('2024-01-02'),
            llmResults: {},
            competitiveBenchmark: null,
            competitiveLeaderboard: null,
          },
          {
            id: 1,
            businessId: 1,
            visibilityScore: 75,
            mentionRate: 0.5,
            sentimentScore: 0.8,
            accuracyScore: 0.9,
            avgRankPosition: 2.5,
            createdAt: new Date('2024-01-01'),
            llmResults: {},
            competitiveBenchmark: null,
            competitiveLeaderboard: null,
          },
        ];

        const mockSelect = {
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          orderBy: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue(mockFingerprints),
        };

        mockDb.select.mockReturnValue(mockSelect as any);

        // Act: Import and call function
        const { getFingerprintHistory } = await import('../queries');
        const result = await getFingerprintHistory(1, 10);

        // Assert: SPECIFICATION - MUST return fingerprint history
        expect(result).toEqual(mockFingerprints);
        expect(mockDb.select).toHaveBeenCalled();
        expect(mockSelect.orderBy).toHaveBeenCalled();
        expect(mockSelect.limit).toHaveBeenCalledWith(10);
      });

      it('MUST return empty array when no fingerprints exist', async () => {
        // Arrange: Mock no fingerprints
        const mockSelect = {
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          orderBy: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue([]),
        };

        mockDb.select.mockReturnValue(mockSelect as any);

        // Act: Import and call function
        const { getFingerprintHistory } = await import('../queries');
        const result = await getFingerprintHistory(999, 10);

        // Assert: SPECIFICATION - MUST return empty array
        expect(result).toEqual([]);
      });

      it('MUST use default limit of 10 when limit not provided', async () => {
        // Arrange: Mock fingerprints
        const mockSelect = {
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          orderBy: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue([]),
        };

        mockDb.select.mockReturnValue(mockSelect as any);

        // Act: Import and call function without limit
        const { getFingerprintHistory } = await import('../queries');
        await getFingerprintHistory(1);

        // Assert: SPECIFICATION - MUST use default limit of 10
        expect(mockSelect.limit).toHaveBeenCalledWith(10);
      });
    });
  });

  /**
   * SPECIFICATION 2: Wikidata Queries
   */
  describe('Wikidata Queries', () => {
    /**
     * SPECIFICATION 2.1: getWikidataEntity() - MUST Return Latest Wikidata Entity or Null
     * 
     * Given: Business ID
     * When: getWikidataEntity() is called
     * Then: Returns latest wikidata entity if exists, null otherwise
     */
    describe('getWikidataEntity', () => {
      it('MUST return latest wikidata entity when exists', async () => {
        // Arrange: Mock wikidata entity exists
        const mockEntity: WikidataEntity = {
          id: 1,
          businessId: 1,
          qid: 'Q123456',
          entityData: { name: 'Test Business' },
          publishedTo: 'wikidata',
          version: 1,
          enrichmentLevel: 1,
          publishedAt: new Date(),
          lastEnrichedAt: null,
        };

        const mockSelect = {
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          orderBy: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue([mockEntity]),
        };

        mockDb.select.mockReturnValue(mockSelect as any);

        // Act: Import and call function
        const { getWikidataEntity } = await import('../queries');
        const result = await getWikidataEntity(1);

        // Assert: SPECIFICATION - MUST return latest wikidata entity
        expect(result).toEqual(mockEntity);
        expect(mockDb.select).toHaveBeenCalled();
        expect(mockSelect.orderBy).toHaveBeenCalled();
      });

      it('MUST return null when no wikidata entity exists', async () => {
        // Arrange: Mock no wikidata entity
        const mockSelect = {
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          orderBy: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue([]),
        };

        mockDb.select.mockReturnValue(mockSelect as any);

        // Act: Import and call function
        const { getWikidataEntity } = await import('../queries');
        const result = await getWikidataEntity(999);

        // Assert: SPECIFICATION - MUST return null
        expect(result).toBeNull();
      });
    });

    /**
     * SPECIFICATION 2.2: createWikidataEntity() - MUST Create or Update Wikidata Entity
     * 
     * Given: Wikidata entity data
     * When: createWikidataEntity() is called
     * Then: Creates new entity or updates existing one (upsert), returns entity
     */
    describe('createWikidataEntity', () => {
      it('MUST create new wikidata entity when does not exist', async () => {
        // Arrange: Mock insert operation (no conflict)
        const newEntity = {
          businessId: 1,
          qid: 'Q123456',
          entityData: { name: 'Test Business' },
          publishedTo: 'wikidata',
          version: 1,
          enrichmentLevel: 1,
        };

        const createdEntity: WikidataEntity = {
          id: 1,
          ...newEntity,
          publishedAt: new Date(),
          lastEnrichedAt: null,
        };

        const mockInsert = {
          values: vi.fn().mockReturnThis(),
          onConflictDoUpdate: vi.fn().mockReturnThis(),
          returning: vi.fn().mockResolvedValue([createdEntity]),
        };

        mockDb.insert = vi.fn().mockReturnValue(mockInsert as any);

        // Act: Import and call function
        const { createWikidataEntity } = await import('../queries');
        const result = await createWikidataEntity(newEntity);

        // Assert: SPECIFICATION - MUST create and return entity
        expect(result).toEqual(createdEntity);
        expect(mockDb.insert).toHaveBeenCalledWith(wikidataEntities);
        expect(mockInsert.values).toHaveBeenCalledWith(newEntity);
      });

      it('MUST update existing wikidata entity when conflict occurs', async () => {
        // Arrange: Mock conflict scenario (unique constraint violation)
        const newEntity = {
          businessId: 1,
          qid: 'Q123456',
          entityData: { name: 'Updated Business' },
          publishedTo: 'wikidata',
          version: 1,
          enrichmentLevel: 1,
        };

        const existingEntity: WikidataEntity = {
          id: 1,
          businessId: 1,
          qid: 'Q123456',
          entityData: { name: 'Original Business' },
          publishedTo: 'wikidata',
          version: 1,
          enrichmentLevel: 1,
          publishedAt: new Date(),
          lastEnrichedAt: null,
        };

        const updatedEntity: WikidataEntity = {
          ...existingEntity,
          entityData: newEntity.entityData,
          version: 2,
        };

        // Mock insert throws conflict error
        const mockInsert = {
          values: vi.fn().mockReturnThis(),
          onConflictDoUpdate: vi.fn().mockReturnThis(),
          returning: vi.fn().mockRejectedValue({
            code: '23505',
            message: 'unique constraint violation',
          }),
        };

        mockDb.insert = vi.fn().mockReturnValue(mockInsert as any);

        // Mock fallback update
        const mockSelect = {
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue([existingEntity]),
        };

        const mockUpdate = {
          set: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          returning: vi.fn().mockResolvedValue([updatedEntity]),
        };

        mockDb.select.mockReturnValue(mockSelect as any);
        mockDb.update = vi.fn().mockReturnValue(mockUpdate as any);

        // Act: Import and call function
        const { createWikidataEntity } = await import('../queries');
        const result = await createWikidataEntity(newEntity);

        // Assert: SPECIFICATION - MUST update and return entity
        expect(result).toEqual(updatedEntity);
        expect(mockDb.select).toHaveBeenCalled(); // Fallback query executed
        expect(mockDb.update).toHaveBeenCalled(); // Fallback update executed
      });
    });
  });

  /**
   * SPECIFICATION 3: Crawl Job Queries
   */
  describe('Crawl Job Queries', () => {
    /**
     * SPECIFICATION 3.1: createCrawlJob() - MUST Create Crawl Job
     * 
     * Given: Crawl job data
     * When: createCrawlJob() is called
     * Then: Creates crawl job and returns created job
     */
    describe('createCrawlJob', () => {
      it('MUST create and return crawl job', async () => {
        // Arrange: Mock insert operation
        const newJob = {
          businessId: 1,
          jobType: 'full',
          status: 'pending',
          progress: 0,
        };

        const createdJob: CrawlJob = {
          id: 1,
          ...newJob,
          result: null,
          errorMessage: null,
          firecrawlJobId: null,
          startedAt: null,
          pagesDiscovered: 0,
          pagesProcessed: 0,
          firecrawlMetadata: null,
          completedAt: null,
          createdAt: new Date(),
        };

        const mockInsert = {
          values: vi.fn().mockReturnThis(),
          returning: vi.fn().mockResolvedValue([createdJob]),
        };

        mockDb.insert = vi.fn().mockReturnValue(mockInsert as any);

        // Act: Import and call function
        const { createCrawlJob } = await import('../queries');
        const result = await createCrawlJob(newJob);

        // Assert: SPECIFICATION - MUST create and return job
        expect(result).toEqual(createdJob);
        expect(mockDb.insert).toHaveBeenCalledWith(crawlJobs);
        expect(mockInsert.values).toHaveBeenCalledWith(newJob);
      });
    });

    /**
     * SPECIFICATION 3.2: updateCrawlJob() - MUST Update Crawl Job
     * 
     * Given: Job ID and updates
     * When: updateCrawlJob() is called
     * Then: Updates crawl job and returns updated job
     */
    describe('updateCrawlJob', () => {
      it('MUST update and return crawl job', async () => {
        // Arrange: Mock update operation
        const updates = {
          status: 'processing',
          progress: 50,
        };

        const updatedJob: CrawlJob = {
          id: 1,
          businessId: 1,
          jobType: 'full',
          status: 'processing',
          progress: 50,
          result: null,
          errorMessage: null,
          firecrawlJobId: null,
          startedAt: new Date(),
          pagesDiscovered: 0,
          pagesProcessed: 0,
          firecrawlMetadata: null,
          completedAt: null,
          createdAt: new Date(),
        };

        const mockUpdate = {
          set: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          returning: vi.fn().mockResolvedValue([updatedJob]),
        };

        mockDb.update = vi.fn().mockReturnValue(mockUpdate as any);

        // Act: Import and call function
        const { updateCrawlJob } = await import('../queries');
        const result = await updateCrawlJob(1, updates);

        // Assert: SPECIFICATION - MUST update and return job
        expect(result).toEqual(updatedJob);
        expect(mockDb.update).toHaveBeenCalledWith(crawlJobs);
        expect(mockUpdate.set).toHaveBeenCalledWith(updates);
      });
    });

    /**
     * SPECIFICATION 3.3: getCrawlJob() - MUST Return Crawl Job or Null
     * 
     * Given: Job ID
     * When: getCrawlJob() is called
     * Then: Returns crawl job if exists, null otherwise
     */
    describe('getCrawlJob', () => {
      it('MUST return crawl job when exists', async () => {
        // Arrange: Mock crawl job exists
        const mockJob: CrawlJob = {
          id: 1,
          businessId: 1,
          jobType: 'full',
          status: 'processing',
          progress: 50,
          result: null,
          errorMessage: null,
          firecrawlJobId: null,
          startedAt: new Date(),
          pagesDiscovered: 0,
          pagesProcessed: 0,
          firecrawlMetadata: null,
          completedAt: null,
          createdAt: new Date(),
        };

        const mockSelect = {
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue([mockJob]),
        };

        mockDb.select.mockReturnValue(mockSelect as any);

        // Act: Import and call function
        const { getCrawlJob } = await import('../queries');
        const result = await getCrawlJob(1);

        // Assert: SPECIFICATION - MUST return crawl job
        expect(result).toEqual(mockJob);
      });

      it('MUST return null when crawl job does not exist', async () => {
        // Arrange: Mock crawl job not found
        const mockSelect = {
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue([]),
        };

        mockDb.select.mockReturnValue(mockSelect as any);

        // Act: Import and call function
        const { getCrawlJob } = await import('../queries');
        const result = await getCrawlJob(999);

        // Assert: SPECIFICATION - MUST return null
        expect(result).toBeNull();
      });
    });

    /**
     * SPECIFICATION 3.4: getLatestCrawlJob() - MUST Return Latest Crawl Job or Null
     * 
     * Given: Business ID
     * When: getLatestCrawlJob() is called
     * Then: Returns latest crawl job if exists, null otherwise
     */
    describe('getLatestCrawlJob', () => {
      it('MUST return latest crawl job when exists', async () => {
        // Arrange: Mock crawl job exists
        const mockJob: CrawlJob = {
          id: 1,
          businessId: 1,
          jobType: 'full',
          status: 'completed',
          progress: 100,
          result: { success: true },
          errorMessage: null,
          firecrawlJobId: null,
          startedAt: new Date(),
          pagesDiscovered: 10,
          pagesProcessed: 10,
          firecrawlMetadata: null,
          completedAt: new Date(),
          createdAt: new Date(),
        };

        const mockSelect = {
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          orderBy: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue([mockJob]),
        };

        mockDb.select.mockReturnValue(mockSelect as any);

        // Act: Import and call function
        const { getLatestCrawlJob } = await import('../queries');
        const result = await getLatestCrawlJob(1);

        // Assert: SPECIFICATION - MUST return latest crawl job
        expect(result).toEqual(mockJob);
        expect(mockSelect.orderBy).toHaveBeenCalled();
      });

      it('MUST return null when no crawl job exists', async () => {
        // Arrange: Mock no crawl job
        const mockSelect = {
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          orderBy: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue([]),
        };

        mockDb.select.mockReturnValue(mockSelect as any);

        // Act: Import and call function
        const { getLatestCrawlJob } = await import('../queries');
        const result = await getLatestCrawlJob(999);

        // Assert: SPECIFICATION - MUST return null
        expect(result).toBeNull();
      });
    });

    /**
     * SPECIFICATION 3.5: getActiveCrawlJobs() - MUST Return Active Crawl Jobs
     * 
     * Given: No parameters
     * When: getActiveCrawlJobs() is called
     * Then: Returns all crawl jobs with status 'processing', ordered by creation date
     */
    describe('getActiveCrawlJobs', () => {
      it('MUST return active crawl jobs ordered by creation date', async () => {
        // Arrange: Mock active crawl jobs
        const mockJobs: CrawlJob[] = [
          {
            id: 1,
            businessId: 1,
            jobType: 'full',
            status: 'processing',
            progress: 50,
            result: null,
            errorMessage: null,
            firecrawlJobId: null,
            startedAt: new Date(),
            pagesDiscovered: 0,
            pagesProcessed: 0,
            firecrawlMetadata: null,
            completedAt: null,
            createdAt: new Date('2024-01-01'),
          },
          {
            id: 2,
            businessId: 2,
            jobType: 'full',
            status: 'processing',
            progress: 75,
            result: null,
            errorMessage: null,
            firecrawlJobId: null,
            startedAt: new Date(),
            pagesDiscovered: 0,
            pagesProcessed: 0,
            firecrawlMetadata: null,
            completedAt: null,
            createdAt: new Date('2024-01-02'),
          },
        ];

        const mockSelect = {
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          orderBy: vi.fn().mockResolvedValue(mockJobs),
        };

        mockDb.select.mockReturnValue(mockSelect as any);

        // Act: Import and call function
        const { getActiveCrawlJobs } = await import('../queries');
        const result = await getActiveCrawlJobs();

        // Assert: SPECIFICATION - MUST return active crawl jobs
        expect(result).toEqual(mockJobs);
        expect(mockDb.select).toHaveBeenCalled();
        expect(mockSelect.where).toHaveBeenCalled();
        expect(mockSelect.orderBy).toHaveBeenCalled();
      });

      it('MUST return empty array when no active crawl jobs exist', async () => {
        // Arrange: Mock no active crawl jobs
        const mockSelect = {
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          orderBy: vi.fn().mockResolvedValue([]),
        };

        mockDb.select.mockReturnValue(mockSelect as any);

        // Act: Import and call function
        const { getActiveCrawlJobs } = await import('../queries');
        const result = await getActiveCrawlJobs();

        // Assert: SPECIFICATION - MUST return empty array
        expect(result).toEqual([]);
      });
    });
  });
});

