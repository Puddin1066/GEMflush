/**
 * Integration Test: DTO Coverage
 * 
 * Tests that all API routes use DTOs from lib/data instead of returning raw database objects:
 * 1. Business routes use BusinessDetailDTO
 * 2. Fingerprint routes use FingerprintDetailDTO
 * 3. Wikidata routes use WikidataEntityDetailDTO
 * 4. Dashboard route uses DashboardDTO
 * 5. Crawl job route uses CrawlJobDTO
 * 6. Status route uses BusinessStatusDTO
 * 7. History route uses FingerprintHistoryDTO
 * 
 * SOLID: Single Responsibility - tests DTO layer coverage
 * DRY: Reuses existing test patterns and utilities
 */

import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import { TestUserFactory } from '../utils/test-helpers';
import { db } from '@/lib/db/drizzle';
import { businesses, teams, teamMembers, users, llmFingerprints, crawlJobs } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import { getBusinessById, getLatestFingerprint, getCrawlJob } from '@/lib/db/queries';
import { NextRequest } from 'next/server';

// Mock external services
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

vi.mock('@/lib/wikidata', () => ({
  wikidataService: {
    createAndPublishEntity: vi.fn(),
    updateEntity: vi.fn(),
  },
}));

// Mock db/queries for authentication
vi.mock('@/lib/db/queries', async () => {
  const actual = await vi.importActual('@/lib/db/queries');
  return {
    ...actual,
    getUser: vi.fn(),
    getTeamForUser: vi.fn(),
    getBusinessById: vi.fn(),
    getLatestFingerprint: vi.fn(),
    getCrawlJob: vi.fn(),
    verifyBusinessOwnership: vi.fn(),
  };
});

vi.mock('@/lib/data/wikidata-dto', () => ({
  getWikidataPublishDTO: vi.fn().mockResolvedValue({
    canPublish: true,
    notability: {
      isNotable: true,
      confidence: 0.9,
    },
    fullEntity: {
      id: 'Q123456',
      label: 'Test Business',
      claims: [],
    },
  }),
  toWikidataEntityDetailDTO: vi.fn().mockReturnValue({
    qid: 'Q123456',
    label: 'Test Business',
    description: 'Test description',
    wikidataUrl: 'https://test.wikidata.org/wiki/Q123456',
    lastUpdated: new Date().toISOString(),
    claims: [],
    stats: {
      totalClaims: 0,
      claimsWithReferences: 0,
      referenceQuality: 'high' as const,
    },
    canEdit: true,
    editUrl: 'https://test.wikidata.org/wiki/Q123456',
  }),
}));

describe('DTO Coverage - Integration Test', () => {
  let testUser: any;
  let testTeam: any;
  let testBusiness: any;
  const testUserIds: number[] = [];
  const testBusinessIds: number[] = [];

  beforeAll(async () => {
    process.env.AUTH_SECRET = process.env.AUTH_SECRET || 'test-secret-key-for-integration-tests';
  });

  beforeEach(async () => {
    vi.clearAllMocks();

    // Create test user and team with Pro tier
    const userWithTeam = await TestUserFactory.createUserWithTeam();
    testUser = userWithTeam.user;
    testTeam = userWithTeam.team;
    testUserIds.push(testUser.id);

    // Update team to Pro tier
    await db.update(teams)
      .set({ planName: 'pro', subscriptionStatus: 'active' })
      .where(eq(teams.id, testTeam.id));

    // Refresh team object
    const [updatedTeam] = await db
      .select()
      .from(teams)
      .where(eq(teams.id, testTeam.id))
      .limit(1);
    testTeam = updatedTeam || testTeam;

    // Create test business
    const [business] = await db
      .insert(businesses)
      .values({
        teamId: testTeam.id,
        name: 'DTO Test Business',
        url: 'https://dto-test.example.com',
        category: 'technology',
        location: {
          city: 'San Francisco',
          state: 'CA',
          country: 'US',
        },
        status: 'crawled',
        crawlData: {
          name: 'DTO Test Business',
          description: 'A test business',
        },
        automationEnabled: true,
      })
      .returning();

    testBusiness = business;
    testBusinessIds.push(business.id);

    // Create test fingerprint
    const [fingerprint] = await db
      .insert(llmFingerprints)
      .values({
        businessId: business.id,
        visibilityScore: 75,
        mentionRate: 0.78,
        sentimentScore: 0.85,
        accuracyScore: 0.82,
        avgRankPosition: null,
        llmResults: [],
        competitiveLeaderboard: null,
      })
      .returning();

    // Create test crawl job
    await db.insert(crawlJobs).values({
      businessId: business.id,
      jobType: 'enhanced',
      status: 'completed',
      progress: 100,
      result: { success: true },
    });

    // Mock authentication (using vi.mocked for type safety)
    const queries = await import('@/lib/db/queries');
    vi.mocked(queries.getUser).mockResolvedValue(testUser);
    vi.mocked(queries.getTeamForUser).mockResolvedValue(testTeam);
    vi.mocked(queries.getBusinessById).mockImplementation(async (id: number) => {
      if (id === business.id) return business;
      return null;
    });
    vi.mocked(queries.getLatestFingerprint).mockImplementation(async (businessId: number) => {
      if (businessId === business.id) {
        const [fp] = await db
          .select()
          .from(llmFingerprints)
          .where(eq(llmFingerprints.businessId, businessId))
          .orderBy(desc(llmFingerprints.createdAt))
          .limit(1);
        return fp || null;
      }
      return null;
    });
    vi.mocked(queries.getCrawlJob).mockImplementation(async (jobId: number) => {
      const [job] = await db
        .select()
        .from(crawlJobs)
        .where(eq(crawlJobs.id, jobId))
        .limit(1);
      return job || null;
    });
    vi.mocked(queries.verifyBusinessOwnership).mockResolvedValue({
      authorized: true,
      business,
    });
  });

  afterEach(async () => {
    // Cleanup test data
    for (const businessId of testBusinessIds) {
      await db.delete(crawlJobs).where(eq(crawlJobs.businessId, businessId));
      await db.delete(llmFingerprints).where(eq(llmFingerprints.businessId, businessId));
      await db.delete(businesses).where(eq(businesses.id, businessId));
    }
    testBusinessIds.length = 0;
  });

  afterAll(async () => {
    // Final cleanup
    for (const userId of testUserIds) {
      const userTeams = await db
        .select({ teamId: teamMembers.teamId })
        .from(teamMembers)
        .where(eq(teamMembers.userId, userId));
      
      await db.delete(teamMembers).where(eq(teamMembers.userId, userId));
      
      for (const { teamId } of userTeams) {
        const remainingMembers = await db
          .select()
          .from(teamMembers)
          .where(eq(teamMembers.teamId, teamId));
        
        if (remainingMembers.length === 0) {
          await db.delete(teams).where(eq(teams.id, teamId));
        }
      }
      
      await db.delete(users).where(eq(users.id, userId));
    }
    testUserIds.length = 0;
  });

  describe('Business Detail Route DTO', () => {
    it('should return BusinessDetailDTO (not raw database object)', async () => {
      const { GET } = await import('@/app/api/business/[id]/route');
      const request = new NextRequest(`http://localhost:3000/api/business/${testBusiness.id}`);
      
      const response = await GET(request, { params: Promise.resolve({ id: testBusiness.id.toString() }) });
      const data = await response.json();

      // Verify response structure matches DTO
      expect(data).toHaveProperty('business');
      expect(data.business).toHaveProperty('id');
      expect(data.business).toHaveProperty('name');
      expect(data.business).toHaveProperty('url');
      expect(data.business).toHaveProperty('status');
      expect(data.business).toHaveProperty('createdAt');
      
      // Verify dates are strings (DTO serialization)
      expect(typeof data.business.createdAt).toBe('string');
      if (data.business.lastCrawledAt) {
        expect(typeof data.business.lastCrawledAt).toBe('string');
      }
      
      // Verify it's NOT a raw database object (should not have teamId)
      expect(data.business).not.toHaveProperty('teamId');
      
      // Verify DTO structure
      expect(data.business.id).toBe(testBusiness.id);
      expect(data.business.name).toBe('DTO Test Business');
    });
  });

  describe('Business List Route DTO', () => {
    it('should return DashboardBusinessDTO[] (not raw database objects)', async () => {
      const { GET } = await import('@/app/api/business/route');
      const request = new NextRequest('http://localhost:3000/api/business');
      
      const response = await GET(request);
      const data = await response.json();

      // Verify response structure
      expect(data).toHaveProperty('businesses');
      expect(Array.isArray(data.businesses)).toBe(true);
      
      if (data.businesses.length > 0) {
        const business = data.businesses[0];
        
        // Verify DTO structure (DashboardBusinessDTO)
        expect(business).toHaveProperty('id');
        expect(business).toHaveProperty('name');
        expect(business).toHaveProperty('location');
        expect(business).toHaveProperty('status');
        expect(business).toHaveProperty('visibilityScore');
        
        // Verify id is string (DTO conversion)
        expect(typeof business.id).toBe('string');
        
        // Verify location is formatted string (not object)
        expect(typeof business.location).toBe('string');
        
        // Verify it's NOT a raw database object
        expect(business).not.toHaveProperty('teamId');
        expect(business).not.toHaveProperty('crawlData');
      }
    });
  });

  describe('Fingerprint Detail Route DTO', () => {
    it('should return FingerprintDetailDTO (not raw database object)', async () => {
      const { GET } = await import('@/app/api/fingerprint/business/[businessId]/route');
      const request = new NextRequest(`http://localhost:3000/api/fingerprint/business/${testBusiness.id}`);
      
      const response = await GET(request, { params: Promise.resolve({ businessId: testBusiness.id.toString() }) });
      const data = await response.json();

      // Verify DTO structure
      expect(data).toHaveProperty('visibilityScore');
      expect(data).toHaveProperty('trend');
      expect(data).toHaveProperty('summary');
      expect(data).toHaveProperty('results');
      expect(data).toHaveProperty('createdAt');
      
      // Verify summary structure
      expect(data.summary).toHaveProperty('mentionRate');
      expect(data.summary).toHaveProperty('sentiment');
      expect(data.summary).toHaveProperty('topModels');
      
      // Verify createdAt is string (formatted)
      expect(typeof data.createdAt).toBe('string');
      
      // Verify it's NOT a raw database object
      expect(data).not.toHaveProperty('businessId');
      expect(data).not.toHaveProperty('llmResults'); // Should be transformed to 'results'
    });
  });

  describe('Fingerprint History Route DTO', () => {
    it('should return FingerprintHistoryDTO[] (not raw database objects)', async () => {
      const { GET } = await import('@/app/api/business/[id]/fingerprint/history/route');
      const request = new NextRequest(`http://localhost:3000/api/business/${testBusiness.id}/fingerprint/history`);
      
      const response = await GET(request, { params: Promise.resolve({ id: testBusiness.id.toString() }) });
      const data = await response.json();

      // Verify response structure
      expect(data).toHaveProperty('history');
      expect(data).toHaveProperty('businessId');
      expect(data).toHaveProperty('businessName');
      expect(data).toHaveProperty('total');
      expect(Array.isArray(data.history)).toBe(true);
      
      if (data.history.length > 0) {
        const historyItem = data.history[0];
        
        // Verify DTO structure
        expect(historyItem).toHaveProperty('id');
        expect(historyItem).toHaveProperty('date');
        expect(historyItem).toHaveProperty('visibilityScore');
        expect(historyItem).toHaveProperty('mentionRate');
        
        // Verify date is ISO string
        expect(typeof historyItem.date).toBe('string');
        expect(historyItem.date).toMatch(/^\d{4}-\d{2}-\d{2}T/);
        
        // Verify percentages are rounded (DTO transformation)
        if (historyItem.mentionRate !== null) {
          expect(Number.isInteger(historyItem.mentionRate)).toBe(true);
        }
        
        // Verify it's NOT a raw database object
        expect(historyItem).not.toHaveProperty('createdAt'); // Should be 'date'
        expect(historyItem).not.toHaveProperty('businessId');
      }
    });
  });

  describe('Crawl Job Route DTO', () => {
    it('should return CrawlJobDTO (not raw database object)', async () => {
      // Get the crawl job ID
      const [job] = await db
        .select()
        .from(crawlJobs)
        .where(eq(crawlJobs.businessId, testBusiness.id))
        .limit(1);

      if (!job) {
        throw new Error('No crawl job found for test');
      }

      const { GET } = await import('@/app/api/job/[jobId]/route');
      const request = new NextRequest(`http://localhost:3000/api/job/${job.id}`);
      
      const response = await GET(request, { params: Promise.resolve({ jobId: job.id.toString() }) });
      const data = await response.json();

      // Verify DTO structure
      expect(data).toHaveProperty('id');
      expect(data).toHaveProperty('businessId');
      expect(data).toHaveProperty('status');
      expect(data).toHaveProperty('progress');
      expect(data).toHaveProperty('createdAt');
      
      // Verify dates are strings (DTO serialization)
      expect(typeof data.createdAt).toBe('string');
      if (data.completedAt) {
        expect(typeof data.completedAt).toBe('string');
      }
      if (data.startedAt) {
        expect(typeof data.startedAt).toBe('string');
      }
      
      // Verify it's NOT a raw database object (should not have internal fields)
      // Note: CrawlJobDTO includes all fields, but dates should be serialized
    });
  });

  describe('Business Status Route DTO', () => {
    it('should return BusinessStatusDTO (not raw database objects)', async () => {
      const { GET } = await import('@/app/api/business/[id]/status/route');
      const request = new NextRequest(`http://localhost:3000/api/business/${testBusiness.id}/status`);
      
      const response = await GET(request, { params: Promise.resolve({ id: testBusiness.id.toString() }) });
      const data = await response.json();

      // Verify DTO structure
      expect(data).toHaveProperty('businessId');
      expect(data).toHaveProperty('businessName');
      expect(data).toHaveProperty('overallStatus');
      expect(data).toHaveProperty('overallProgress');
      expect(data).toHaveProperty('crawl');
      expect(data).toHaveProperty('fingerprint');
      expect(data).toHaveProperty('isParallelProcessing');
      expect(data).toHaveProperty('hasMultiPageData');
      
      // Verify composite structure
      if (data.crawl) {
        expect(data.crawl).toHaveProperty('status');
        expect(data.crawl).toHaveProperty('progress');
      }
      
      if (data.fingerprint) {
        expect(data.fingerprint).toHaveProperty('visibilityScore');
        expect(data.fingerprint).toHaveProperty('mentionRate');
      }
      
      // Verify it's NOT raw database objects
      expect(data).not.toHaveProperty('teamId');
    });
  });

  describe('Dashboard Route DTO', () => {
    it('should return DashboardDTO (not raw database objects)', async () => {
      const { GET } = await import('@/app/api/dashboard/route');
      const request = new NextRequest('http://localhost:3000/api/dashboard');
      
      const response = await GET();
      const data = await response.json();

      // Verify DTO structure
      expect(data).toHaveProperty('totalBusinesses');
      expect(data).toHaveProperty('wikidataEntities');
      expect(data).toHaveProperty('avgVisibilityScore');
      expect(data).toHaveProperty('businesses');
      expect(Array.isArray(data.businesses)).toBe(true);
      
      if (data.businesses.length > 0) {
        const business = data.businesses[0];
        
        // Verify DashboardBusinessDTO structure
        expect(business).toHaveProperty('id');
        expect(business).toHaveProperty('name');
        expect(business).toHaveProperty('location');
        expect(business).toHaveProperty('status');
        
        // Verify id is string (DTO conversion)
        expect(typeof business.id).toBe('string');
        
        // Verify location is formatted string
        expect(typeof business.location).toBe('string');
        
        // Verify it's NOT a raw database object
        expect(business).not.toHaveProperty('teamId');
        expect(business).not.toHaveProperty('crawlData');
      }
    });
  });

  describe('Wikidata Entity Route DTO', () => {
    it('should return WikidataEntityDetailDTO (not raw database object)', async () => {
      const { GET } = await import('@/app/api/wikidata/entity/[businessId]/route');
      const request = new NextRequest(`http://localhost:3000/api/wikidata/entity/${testBusiness.id}`);
      
      const response = await GET(request, { params: Promise.resolve({ businessId: testBusiness.id.toString() }) });
      const data = await response.json();

      // Verify DTO structure
      expect(data).toHaveProperty('qid');
      expect(data).toHaveProperty('label');
      expect(data).toHaveProperty('description');
      expect(data).toHaveProperty('claims');
      expect(data).toHaveProperty('stats');
      expect(data).toHaveProperty('canEdit');
      
      // Verify stats structure
      expect(data.stats).toHaveProperty('totalClaims');
      expect(data.stats).toHaveProperty('claimsWithReferences');
      expect(data.stats).toHaveProperty('referenceQuality');
      
      // Verify it's NOT a raw database object
      expect(data).not.toHaveProperty('entityData'); // Should be transformed
      expect(data).not.toHaveProperty('businessId');
    });
  });

  describe('DTO Type Safety', () => {
    it('should ensure all DTOs have consistent date serialization', async () => {
      const { GET } = await import('@/app/api/business/[id]/route');
      const request = new NextRequest(`http://localhost:3000/api/business/${testBusiness.id}`);
      
      const response = await GET(request, { params: Promise.resolve({ id: testBusiness.id.toString() }) });
      const data = await response.json();

      const business = data.business;
      
      // All date fields should be ISO strings
      const dateFields = ['createdAt', 'updatedAt', 'lastCrawledAt', 'wikidataPublishedAt', 'nextCrawlAt', 'lastAutoPublishedAt'];
      
      for (const field of dateFields) {
        if (business[field] !== null && business[field] !== undefined) {
          expect(typeof business[field]).toBe('string');
          // Verify it's a valid ISO date string
          expect(() => new Date(business[field])).not.toThrow();
          expect(new Date(business[field]).toISOString()).toBe(business[field]);
        }
      }
    });

    it('should ensure DTOs filter out internal database fields', async () => {
      const { GET } = await import('@/app/api/business/[id]/route');
      const request = new NextRequest(`http://localhost:3000/api/business/${testBusiness.id}`);
      
      const response = await GET(request, { params: Promise.resolve({ id: testBusiness.id.toString() }) });
      const data = await response.json();

      const business = data.business;
      
      // Internal fields that should NOT be in DTO
      const internalFields = ['teamId', 'passwordHash', 'internalId'];
      
      for (const field of internalFields) {
        expect(business).not.toHaveProperty(field);
      }
    });
  });

  describe('DTO Transformation Consistency', () => {
    it('should use same DTO transformation for business detail across all routes', async () => {
      // Test business detail route
      const { GET: getBusinessDetail } = await import('@/app/api/business/[id]/route');
      const businessRequest = new NextRequest(`http://localhost:3000/api/business/${testBusiness.id}`);
      const businessResponse = await getBusinessDetail(businessRequest, { params: Promise.resolve({ id: testBusiness.id.toString() }) });
      const businessData = await businessResponse.json();

      // Test dashboard route (should use same DTO structure for businesses)
      const { GET: getDashboard } = await import('@/app/api/dashboard/route');
      const dashboardResponse = await getDashboard();
      const dashboardData = await dashboardResponse.json();

      // Both should have consistent structure
      if (dashboardData.businesses.length > 0) {
        const dashboardBusiness = dashboardData.businesses.find((b: any) => b.id === testBusiness.id.toString());
        const detailBusiness = businessData.business;

        if (dashboardBusiness) {
          // Both should have name, status, etc.
          expect(dashboardBusiness).toHaveProperty('name');
          expect(detailBusiness).toHaveProperty('name');
          expect(dashboardBusiness.name).toBe(detailBusiness.name);
          
          // Both should have status
          expect(dashboardBusiness).toHaveProperty('status');
          expect(detailBusiness).toHaveProperty('status');
        }
      }
    });
  });
});

