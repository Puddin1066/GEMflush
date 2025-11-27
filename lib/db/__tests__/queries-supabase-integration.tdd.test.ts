/**
 * TDD Test: Supabase Integration Tests - Tests Drive Implementation
 * 
 * SPECIFICATION: Database Queries Must Work with Real Supabase Database
 * 
 * As a developer
 * I want database queries to work correctly with real Supabase database
 * So that I can verify the integration between Drizzle ORM and Supabase PostgreSQL
 * 
 * Acceptance Criteria:
 * 1. User queries work with real database
 * 2. Team queries work with real database
 * 3. Business queries (CRUD) work with real database
 * 4. Fingerprint queries work with real database
 * 5. Wikidata queries work with real database
 * 6. Crawl job queries work with real database
 * 7. Data is properly cleaned up after tests
 * 
 * TDD Cycle: RED → GREEN → REFACTOR
 * Tests written FIRST to drive implementation
 * 
 * NOTE: These tests require DATABASE_URL or POSTGRES_URL environment variable
 * They connect to the actual Supabase database (use test database in production)
 */

import { describe, it, expect, beforeEach, beforeAll, afterAll } from 'vitest';
import { db } from '../drizzle';
import {
  users,
  teams,
  teamMembers,
  businesses,
  llmFingerprints,
  wikidataEntities,
  crawlJobs,
  competitors,
  emailLogs,
} from '../schema';
import { cleanupTestData, createTestUserWithTeam } from '@/tests/utils/tdd-db-helpers';
import { eq } from 'drizzle-orm';
import {
  getUserByEmail,
  createBusiness,
  getBusinessById,
  updateBusiness,
  deleteBusiness,
  getBusinessesByTeam,
  getBusinessCountByTeam,
  createFingerprint,
  getLatestFingerprint,
  getFingerprintHistory,
  createWikidataEntity,
  getWikidataEntity,
  createCrawlJob,
  getCrawlJob,
  updateCrawlJob,
  getLatestCrawlJob,
  getActiveCrawlJobs,
  getCompetitors,
} from '../queries';

// Skip tests if database URL not available
const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
const shouldSkip = !databaseUrl;

describe.skipIf(shouldSkip)('🔴 RED: Supabase Integration Tests Specification', () => {
  let testTeamId: number;
  let testUserId: number;
  let testUserEmail: string;
  let testBusinessId: number;

  beforeAll(async () => {
    if (shouldSkip) {
      console.warn('Skipping Supabase integration tests: DATABASE_URL not set');
      return;
    }

    // Clean up any existing test data
    await cleanupTestData();
  });

  afterAll(async () => {
    if (shouldSkip) return;
    // Final cleanup after all tests
    await cleanupTestData();
  });

  beforeEach(async () => {
    if (shouldSkip) return;

    // Clean up test data before each test
    await cleanupTestData();

    // Create test user with team using helper (DRY principle)
    const { user, team } = await createTestUserWithTeam({
      email: `test-${Date.now()}@example.com`,
      planName: 'free',
    });
    testUserId = user.id;
    testUserEmail = user.email;
    testTeamId = team.id;
  });

  /**
   * SPECIFICATION 1: User Queries with Real Database
   */
  describe('User Queries - Supabase Integration', () => {
    it('MUST retrieve user by email from Supabase', async () => {
      // Arrange: User already created in beforeEach
      // Use the test user email from beforeEach
      const testEmail = testUserEmail;

      // Act: Query user by email
      const result = await getUserByEmail(testEmail);

      // Assert: SPECIFICATION - MUST return user from Supabase
      expect(result).toBeDefined();
      expect(result?.id).toBe(testUserId);
      expect(result?.email).toBe(testEmail);
    });

    it('MUST return null when user does not exist in Supabase', async () => {
      // Act: Query non-existent user
      const result = await getUserByEmail('nonexistent@example.com');

      // Assert: SPECIFICATION - MUST return null
      expect(result).toBeNull();
    });
  });

  /**
   * SPECIFICATION 2: Business Queries with Real Database
   */
  describe('Business Queries - Supabase Integration', () => {
    it('MUST create business in Supabase', async () => {
      // Arrange: Business data
      const businessData = {
        teamId: testTeamId,
        name: 'Test Business',
        url: 'https://example.com',
        category: 'Restaurant',
        location: {
          city: 'Seattle',
          state: 'WA',
          country: 'US',
        },
        status: 'pending' as const,
      };

      // Act: Create business
      const result = await createBusiness(businessData);

      // Assert: SPECIFICATION - MUST create business in Supabase
      expect(result).toBeDefined();
      expect(result.id).toBeGreaterThan(0);
      expect(result.name).toBe(businessData.name);
      expect(result.teamId).toBe(testTeamId);
      expect(result.url).toBe(businessData.url);
      expect(result.category).toBe(businessData.category);
      expect(result.status).toBe('pending');
      testBusinessId = result.id;
    });

    it('MUST retrieve business by ID from Supabase', async () => {
      // Arrange: Create business first
      const businessData = {
        teamId: testTeamId,
        name: 'Test Business',
        url: 'https://example.com',
        status: 'pending' as const,
      };
      const created = await createBusiness(businessData);

      // Act: Retrieve business
      const result = await getBusinessById(created.id);

      // Assert: SPECIFICATION - MUST retrieve business from Supabase
      expect(result).toBeDefined();
      expect(result?.id).toBe(created.id);
      expect(result?.name).toBe(businessData.name);
    });

    it('MUST update business in Supabase', async () => {
      // Arrange: Create business first
      const businessData = {
        teamId: testTeamId,
        name: 'Test Business',
        url: 'https://example.com',
        status: 'pending' as const,
      };
      const created = await createBusiness(businessData);

      // Act: Update business
      const updates = {
        name: 'Updated Business',
        status: 'crawled' as const,
      };
      const result = await updateBusiness(created.id, updates);

      // Assert: SPECIFICATION - MUST update business in Supabase
      expect(result).toBeDefined();
      expect(result.name).toBe(updates.name);
      expect(result.status).toBe(updates.status);
    });

    it('MUST delete business from Supabase', async () => {
      // Arrange: Create business first
      const businessData = {
        teamId: testTeamId,
        name: 'Test Business',
        url: 'https://example.com',
        status: 'pending' as const,
      };
      const created = await createBusiness(businessData);

      // Act: Delete business
      const result = await deleteBusiness(created.id);

      // Assert: SPECIFICATION - MUST delete business from Supabase
      expect(result).toBeDefined();
      expect(result.id).toBe(created.id);

      // Verify it's actually deleted
      const verify = await getBusinessById(created.id);
      expect(verify).toBeNull();
    });

    it('MUST retrieve businesses by team from Supabase', async () => {
      // Arrange: Create multiple businesses
      const business1 = await createBusiness({
        teamId: testTeamId,
        name: 'Business 1',
        url: 'https://example1.com',
        status: 'pending' as const,
      });
      const business2 = await createBusiness({
        teamId: testTeamId,
        name: 'Business 2',
        url: 'https://example2.com',
        status: 'pending' as const,
      });

      // Act: Retrieve businesses by team
      const result = await getBusinessesByTeam(testTeamId);

      // Assert: SPECIFICATION - MUST retrieve businesses from Supabase
      expect(result.length).toBeGreaterThanOrEqual(2);
      expect(result.some(b => b.id === business1.id)).toBe(true);
      expect(result.some(b => b.id === business2.id)).toBe(true);
    });

    it('MUST count businesses by team from Supabase', async () => {
      // Arrange: Create businesses
      await createBusiness({
        teamId: testTeamId,
        name: 'Business 1',
        url: 'https://example1.com',
        status: 'pending' as const,
      });
      await createBusiness({
        teamId: testTeamId,
        name: 'Business 2',
        url: 'https://example2.com',
        status: 'pending' as const,
      });

      // Act: Count businesses
      const result = await getBusinessCountByTeam(testTeamId);

      // Assert: SPECIFICATION - MUST return count from Supabase
      expect(result).toBeGreaterThanOrEqual(2);
    });
  });

  /**
   * SPECIFICATION 3: Fingerprint Queries with Real Database
   */
  describe('Fingerprint Queries - Supabase Integration', () => {
    it('MUST create fingerprint in Supabase', async () => {
      // Arrange: Create business first
      const business = await createBusiness({
        teamId: testTeamId,
        name: 'Test Business',
        url: 'https://example.com',
        status: 'pending' as const,
      });

      const fingerprintData = {
        businessId: business.id,
        visibilityScore: 75,
        mentionRate: 0.5,
        sentimentScore: 0.8,
        accuracyScore: 0.9,
        avgRankPosition: 2.5,
        llmResults: { test: 'data' },
      };

      // Act: Create fingerprint
      const result = await createFingerprint(fingerprintData);

      // Assert: SPECIFICATION - MUST create fingerprint in Supabase
      expect(result).toBeDefined();
      expect(result.id).toBeGreaterThan(0);
      expect(result.businessId).toBe(business.id);
      expect(result.visibilityScore).toBe(75);
    });

    it('MUST retrieve latest fingerprint from Supabase', async () => {
      // Arrange: Create business and fingerprints
      const business = await createBusiness({
        teamId: testTeamId,
        name: 'Test Business',
        url: 'https://example.com',
        status: 'pending' as const,
      });

      await createFingerprint({
        businessId: business.id,
        visibilityScore: 70,
        mentionRate: 0.4,
        sentimentScore: 0.7,
        accuracyScore: 0.8,
        avgRankPosition: 3.0,
        llmResults: {},
      });

      // Wait a bit to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 10));

      const latest = await createFingerprint({
        businessId: business.id,
        visibilityScore: 80,
        mentionRate: 0.6,
        sentimentScore: 0.9,
        accuracyScore: 0.95,
        avgRankPosition: 2.0,
        llmResults: {},
      });

      // Act: Retrieve latest fingerprint
      const result = await getLatestFingerprint(business.id);

      // Assert: SPECIFICATION - MUST retrieve latest from Supabase
      expect(result).toBeDefined();
      expect(result?.id).toBe(latest.id);
      expect(result?.visibilityScore).toBe(80);
    });

    it('MUST retrieve fingerprint history from Supabase', async () => {
      // Arrange: Create business and multiple fingerprints
      const business = await createBusiness({
        teamId: testTeamId,
        name: 'Test Business',
        url: 'https://example.com',
        status: 'pending' as const,
      });

      await createFingerprint({
        businessId: business.id,
        visibilityScore: 70,
        mentionRate: 0.4,
        sentimentScore: 0.7,
        accuracyScore: 0.8,
        avgRankPosition: 3.0,
        llmResults: {},
      });

      await createFingerprint({
        businessId: business.id,
        visibilityScore: 75,
        mentionRate: 0.5,
        sentimentScore: 0.8,
        accuracyScore: 0.9,
        avgRankPosition: 2.5,
        llmResults: {},
      });

      // Act: Retrieve fingerprint history
      const result = await getFingerprintHistory(business.id, 10);

      // Assert: SPECIFICATION - MUST retrieve history from Supabase
      expect(result.length).toBeGreaterThanOrEqual(2);
      // Should be ordered by creation date descending
      expect(result[0].createdAt.getTime()).toBeGreaterThanOrEqual(
        result[1].createdAt.getTime()
      );
    });
  });

  /**
   * SPECIFICATION 4: Wikidata Queries with Real Database
   */
  describe('Wikidata Queries - Supabase Integration', () => {
    it('MUST create wikidata entity in Supabase', async () => {
      // Arrange: Create business first
      const business = await createBusiness({
        teamId: testTeamId,
        name: 'Test Business',
        url: 'https://example.com',
        status: 'pending' as const,
      });

      const entityData = {
        businessId: business.id,
        qid: `Q${Date.now()}`,
        entityData: { name: 'Test Entity' },
        publishedTo: 'wikidata',
        version: 1,
        enrichmentLevel: 1,
      };

      // Act: Create wikidata entity
      const result = await createWikidataEntity(entityData);

      // Assert: SPECIFICATION - MUST create entity in Supabase
      expect(result).toBeDefined();
      expect(result.id).toBeGreaterThan(0);
      expect(result.businessId).toBe(business.id);
      expect(result.qid).toBe(entityData.qid);
    });

    it('MUST retrieve wikidata entity from Supabase', async () => {
      // Arrange: Create business and entity
      const business = await createBusiness({
        teamId: testTeamId,
        name: 'Test Business',
        url: 'https://example.com',
        status: 'pending' as const,
      });

      const created = await createWikidataEntity({
        businessId: business.id,
        qid: `Q${Date.now()}`,
        entityData: { name: 'Test Entity' },
        publishedTo: 'wikidata',
        version: 1,
        enrichmentLevel: 1,
      });

      // Act: Retrieve entity
      const result = await getWikidataEntity(business.id);

      // Assert: SPECIFICATION - MUST retrieve entity from Supabase
      expect(result).toBeDefined();
      expect(result?.id).toBe(created.id);
      expect(result?.qid).toBe(created.qid);
    });
  });

  /**
   * SPECIFICATION 5: Crawl Job Queries with Real Database
   */
  describe('Crawl Job Queries - Supabase Integration', () => {
    it('MUST create crawl job in Supabase', async () => {
      // Arrange: Create business first
      const business = await createBusiness({
        teamId: testTeamId,
        name: 'Test Business',
        url: 'https://example.com',
        status: 'pending' as const,
      });

      const jobData = {
        businessId: business.id,
        jobType: 'full',
        status: 'pending',
        progress: 0,
      };

      // Act: Create crawl job
      const result = await createCrawlJob(jobData);

      // Assert: SPECIFICATION - MUST create job in Supabase
      expect(result).toBeDefined();
      expect(result.id).toBeGreaterThan(0);
      expect(result.businessId).toBe(business.id);
      expect(result.status).toBe('pending');
    });

    it('MUST update crawl job in Supabase', async () => {
      // Arrange: Create business and job
      const business = await createBusiness({
        teamId: testTeamId,
        name: 'Test Business',
        url: 'https://example.com',
        status: 'pending' as const,
      });

      const created = await createCrawlJob({
        businessId: business.id,
        jobType: 'full',
        status: 'pending',
        progress: 0,
      });

      // Act: Update job
      const updates = {
        status: 'processing',
        progress: 50,
      };
      const result = await updateCrawlJob(created.id, updates);

      // Assert: SPECIFICATION - MUST update job in Supabase
      expect(result).toBeDefined();
      expect(result.status).toBe('processing');
      expect(result.progress).toBe(50);
    });

    it('MUST retrieve active crawl jobs from Supabase', async () => {
      // Arrange: Create business and active jobs
      const business = await createBusiness({
        teamId: testTeamId,
        name: 'Test Business',
        url: 'https://example.com',
        status: 'pending' as const,
      });

      await createCrawlJob({
        businessId: business.id,
        jobType: 'full',
        status: 'processing',
        progress: 50,
      });

      // Act: Retrieve active jobs
      const result = await getActiveCrawlJobs();

      // Assert: SPECIFICATION - MUST retrieve active jobs from Supabase
      expect(result.length).toBeGreaterThanOrEqual(1);
      expect(result.every(job => job.status === 'processing')).toBe(true);
    });
  });

  /**
   * SPECIFICATION 6: Competitor Queries with Real Database
   */
  describe('Competitor Queries - Supabase Integration', () => {
    it('MUST create and retrieve competitors from Supabase', async () => {
      // Arrange: Create business
      const business = await createBusiness({
        teamId: testTeamId,
        name: 'Test Business',
        url: 'https://example.com',
        status: 'pending' as const,
      });

      // Create competitor directly (no query function for create)
      const [competitor] = await db
        .insert(competitors)
        .values({
          businessId: business.id,
          competitorName: 'Competitor A',
          competitorUrl: 'https://competitor-a.com',
          addedBy: 'user',
        })
        .returning();

      // Act: Retrieve competitors
      const result = await getCompetitors(business.id);

      // Assert: SPECIFICATION - MUST retrieve competitors from Supabase
      expect(result.length).toBeGreaterThanOrEqual(1);
      expect(result.some(c => c.id === competitor.id)).toBe(true);
    });
  });
});

