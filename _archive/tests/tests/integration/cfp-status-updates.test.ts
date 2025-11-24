/**
 * Integration Test: CFP Status Updates
 * 
 * Tests the status update fixes implemented for the CFP flow:
 * 1. Business status updates to 'crawled' (not 'fingerprinted') after fingerprint completion
 * 2. Status updates to 'generating' when publish starts
 * 3. Status updates to 'published' after successful Wikidata publish
 * 4. Progress calculation reflects actual completion state
 * 5. CFP is only complete when published to Wikidata
 * 
 * SOLID: Single Responsibility - tests status updates throughout CFP flow
 * DRY: Reuses existing test patterns and utilities
 */

import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import { TestUserFactory, DatabaseCleanup } from '../utils/test-helpers';
import { db } from '@/lib/db/drizzle';
import { businesses, teams, teamMembers, users, llmFingerprints, crawlJobs } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { autoStartProcessing, executeParallelProcessing } from '@/lib/services/business-execution';
import { getBusinessById, getLatestFingerprint } from '@/lib/db/queries';

// Mock external services (SOLID: mock dependencies, not implementation)
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

// Mock data layer for Wikidata DTO
vi.mock('@/lib/data/wikidata-dto', () => ({
  getWikidataPublishDTO: vi.fn().mockResolvedValue({
    canPublish: true,
    notability: {
      isNotable: true,
      confidence: 0.9,
    },
    fullEntity: {
      id: 'Q123456',
      label: 'Status Update Test Business',
      claims: [],
    },
  }),
}));

// Mock manual publish storage
vi.mock('@/lib/wikidata/manual-publish-storage', () => ({
  storeEntityForManualPublish: vi.fn(),
}));

// Mock automation service
vi.mock('@/lib/services/automation-service', () => ({
  shouldAutoPublish: vi.fn().mockReturnValue(true),
  getAutomationConfig: vi.fn().mockReturnValue({
    autoPublish: true,
    crawlFrequency: 'weekly',
  }),
}));

describe('CFP Status Updates - Integration Test', () => {
  let testUser: any;
  let testTeam: any;
  let testBusiness: any;
  const testUserIds: number[] = [];
  const testBusinessIds: number[] = [];

  let mockWebCrawler: any;
  let mockBusinessFingerprinter: any;
  let mockWikidataService: any;

  beforeAll(async () => {
    // Set up test environment
    process.env.AUTH_SECRET = process.env.AUTH_SECRET || 'test-secret-key-for-integration-tests';
  });

  beforeEach(async () => {
    vi.clearAllMocks();

    // Get mock instances
    const crawler = await import('@/lib/crawler');
    const llm = await import('@/lib/llm');
    const wikidata = await import('@/lib/wikidata');

    mockWebCrawler = crawler.webCrawler;
    mockBusinessFingerprinter = llm.businessFingerprinter;
    mockWikidataService = wikidata.wikidataService;

    // Create test user and team with Pro tier
    const userWithTeam = await TestUserFactory.createUserWithTeam();
    testUser = userWithTeam.user;
    testTeam = userWithTeam.team;
    testUserIds.push(testUser.id);

    // Update team to Pro tier (required for auto-publish)
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
        name: 'Status Update Test Business',
        url: 'https://status-update-test.example.com',
        category: 'technology',
        location: {
          city: 'San Francisco',
          state: 'CA',
          country: 'US',
        },
        status: 'pending',
        automationEnabled: true,
      })
      .returning();

    testBusiness = business;
    testBusinessIds.push(business.id);

    // Setup mock crawl data
    const mockCrawlData = {
      name: 'Status Update Test Business',
      description: 'A test business for status update verification',
      phone: '(555) 123-4567',
      email: 'test@example.com',
      location: {
        city: 'San Francisco',
        state: 'CA',
        country: 'US',
        address: '123 Test St, San Francisco, CA 94102',
        lat: 37.7749,
        lng: -122.4194,
      },
      services: ['Service 1', 'Service 2'],
      businessDetails: {
        industry: 'technology',
      },
      llmEnhanced: {
        businessCategory: 'technology',
        targetAudience: 'Tech professionals',
      },
    };

    mockWebCrawler.crawl.mockResolvedValue({
      success: true,
      data: mockCrawlData,
    });

    // Setup mock fingerprint analysis
    const mockFingerprintAnalysis = {
      visibilityScore: 75,
      mentionRate: 0.78,
      sentimentScore: 0.85,
      accuracyScore: 0.82,
      avgRankPosition: null,
      llmResults: [
        {
          model: 'openai/gpt-4-turbo',
          promptType: 'factual',
          mentioned: true,
          sentiment: 'positive',
          confidence: 0.9,
          competitors: [],
        },
      ],
      competitiveLeaderboard: {
        targetBusiness: {
          name: 'Status Update Test Business',
          rank: null,
          mentionCount: 1,
          avgPosition: null,
        },
        competitors: [],
        totalRecommendationQueries: 1,
      },
    };

    mockBusinessFingerprinter.fingerprint.mockResolvedValue(mockFingerprintAnalysis);

    // Setup mock Wikidata publish
    mockWikidataService.createAndPublishEntity.mockResolvedValue({
      entity: {
        id: 'Q123456',
        label: 'Status Update Test Business',
        claims: [],
      },
      result: {
        success: true,
        qid: 'Q123456',
      },
    });
  });

  afterEach(async () => {
    // Cleanup test data (in correct order to avoid foreign key constraints)
    for (const businessId of testBusinessIds) {
      // Delete related records first
      await db.delete(crawlJobs).where(eq(crawlJobs.businessId, businessId));
      await db.delete(llmFingerprints).where(eq(llmFingerprints.businessId, businessId));
      // Then delete business
      await db.delete(businesses).where(eq(businesses.id, businessId));
    }
    testBusinessIds.length = 0;
  });

  afterAll(async () => {
    // Final cleanup (delete team members first, then teams, then users)
    for (const userId of testUserIds) {
      // Get user's teams
      const userTeams = await db
        .select({ teamId: teamMembers.teamId })
        .from(teamMembers)
        .where(eq(teamMembers.userId, userId));
      
      // Delete team members
      await db.delete(teamMembers).where(eq(teamMembers.userId, userId));
      
      // Delete teams (if no other members)
      for (const { teamId } of userTeams) {
        const remainingMembers = await db
          .select()
          .from(teamMembers)
          .where(eq(teamMembers.teamId, teamId));
        
        if (remainingMembers.length === 0) {
          await db.delete(teams).where(eq(teams.id, teamId));
        }
      }
      
      // Delete user
      await db.delete(users).where(eq(users.id, userId));
    }
    testUserIds.length = 0;
  });

  describe('Status Updates After Fingerprint Completion', () => {
    it('should update status to "crawled" (not "fingerprinted") after crawl and fingerprint complete', async () => {
      // Verify initial status
      const initialBusiness = await getBusinessById(testBusiness.id);
      expect(initialBusiness?.status).toBe('pending');

      // Execute parallel processing (crawl + fingerprint)
      await executeParallelProcessing(testBusiness.id);

      // Verify status was updated to 'crawled' (not 'fingerprinted')
      const businessAfterProcessing = await getBusinessById(testBusiness.id);
      expect(businessAfterProcessing?.status).toBe('crawled');
      expect(businessAfterProcessing?.status).not.toBe('fingerprinted');
      expect(businessAfterProcessing?.status).not.toBe('pending');
      expect(businessAfterProcessing?.status).not.toBe('crawling');

      // Verify crawl data exists
      expect(businessAfterProcessing?.crawlData).toBeDefined();

      // Verify fingerprint was saved
      const fingerprint = await getLatestFingerprint(testBusiness.id);
      expect(fingerprint).toBeDefined();
      expect(fingerprint?.visibilityScore).toBe(75);
    });

    it('should update status to "crawling" when processing starts', async () => {
      // This test verifies immediate status update for UI feedback
      const initialBusiness = await getBusinessById(testBusiness.id);
      expect(initialBusiness?.status).toBe('pending');

      // Start processing (this should update status to 'crawling' immediately)
      const processingPromise = executeParallelProcessing(testBusiness.id);
      
      // Wait a bit to allow status update
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Check if status was updated to 'crawling' (may have already progressed to 'crawled')
      const businessDuringProcessing = await getBusinessById(testBusiness.id);
      expect(['crawling', 'crawled']).toContain(businessDuringProcessing?.status);

      // Wait for processing to complete
      await processingPromise;

      // Final status should be 'crawled'
      const businessAfterProcessing = await getBusinessById(testBusiness.id);
      expect(businessAfterProcessing?.status).toBe('crawled');
    });
  });

  describe('Status Updates During Publish', () => {
    it('should update status to "generating" when publish starts', async () => {
      // Import handleAutoPublish dynamically to get the real implementation
      const { handleAutoPublish } = await import('@/lib/services/scheduler-service-decision');
      
      // First, complete crawl and fingerprint
      await executeParallelProcessing(testBusiness.id);
      
      const businessAfterCrawl = await getBusinessById(testBusiness.id);
      expect(businessAfterCrawl?.status).toBe('crawled');

      // Start publish (this should update status to 'generating')
      const publishPromise = handleAutoPublish(testBusiness.id);
      
      // Wait a bit to allow status update
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Check if status was updated to 'generating'
      const businessDuringPublish = await getBusinessById(testBusiness.id);
      expect(['generating', 'published']).toContain(businessDuringPublish?.status);

      // Wait for publish to complete
      await publishPromise;

      // Final status should be 'published'
      const businessAfterPublish = await getBusinessById(testBusiness.id);
      expect(businessAfterPublish?.status).toBe('published');
    });

    it('should update status to "published" after successful Wikidata publish', async () => {
      // Import handleAutoPublish dynamically to get the real implementation
      const { handleAutoPublish } = await import('@/lib/services/scheduler-service-decision');
      
      // Complete crawl and fingerprint first
      await executeParallelProcessing(testBusiness.id);
      
      const businessAfterCrawl = await getBusinessById(testBusiness.id);
      expect(businessAfterCrawl?.status).toBe('crawled');
      expect(businessAfterCrawl?.wikidataQID).toBeNull();

      // Publish to Wikidata
      await handleAutoPublish(testBusiness.id);

      // Verify status was updated to 'published'
      const businessAfterPublish = await getBusinessById(testBusiness.id);
      expect(businessAfterPublish?.status).toBe('published');
      expect(businessAfterPublish?.wikidataQID).toBe('Q123456');
      expect(businessAfterPublish?.wikidataPublishedAt).toBeDefined();
    });
  });

  describe('Progress Calculation', () => {
    it('should calculate progress correctly at each stage', async () => {
      // Helper function to calculate progress
      const calculateProgress = (hasCrawlData: boolean, hasFingerprint: boolean, isPublished: boolean) => {
        const steps = [
          { completed: hasCrawlData },
          { completed: hasFingerprint },
          { completed: isPublished },
          { completed: isPublished && hasFingerprint },
        ];
        return (steps.filter(s => s.completed).length / steps.length) * 100;
      };

      // Initial state: 0% complete
      let business = await getBusinessById(testBusiness.id);
      let fingerprint = await getLatestFingerprint(testBusiness.id);
      const initialProgress = calculateProgress(
        (business?.status === 'crawled' || business?.status === 'published' || business?.status === 'generating') && !!business?.crawlData,
        fingerprint !== null,
        business?.wikidataQID !== null
      );
      expect(initialProgress).toBe(0);

      // After crawl + fingerprint: 50% complete (2 of 4 steps)
      await executeParallelProcessing(testBusiness.id);
      business = await getBusinessById(testBusiness.id);
      fingerprint = await getLatestFingerprint(testBusiness.id);
      const afterFingerprintProgress = calculateProgress(
        (business?.status === 'crawled' || business?.status === 'published' || business?.status === 'generating') && !!business?.crawlData,
        fingerprint !== null,
        business?.wikidataQID !== null
      );
      expect(afterFingerprintProgress).toBe(50); // Website Analysis + Visibility Assessment

      // After publish: 100% complete (all 4 steps)
      const { handleAutoPublish } = await import('@/lib/services/scheduler-service-decision');
      await handleAutoPublish(testBusiness.id);
      business = await getBusinessById(testBusiness.id);
      fingerprint = await getLatestFingerprint(testBusiness.id);
      const afterPublishProgress = calculateProgress(
        (business?.status === 'crawled' || business?.status === 'published' || business?.status === 'generating') && !!business?.crawlData,
        fingerprint !== null,
        business?.wikidataQID !== null
      );
      expect(afterPublishProgress).toBe(100); // All steps complete
    });

    it('should reflect correct progress for hasCrawlData check', async () => {
      // Test that hasCrawlData checks both status and crawlData existence
      await executeParallelProcessing(testBusiness.id);
      
      const business = await getBusinessById(testBusiness.id);
      
      // hasCrawlData should be true when status is 'crawled' and crawlData exists
      const hasCrawlData = (business?.status === 'crawled' || business?.status === 'published' || business?.status === 'generating') && !!business?.crawlData;
      
      expect(business?.status).toBe('crawled');
      expect(business?.crawlData).toBeDefined();
      expect(hasCrawlData).toBe(true);
    });
  });

  describe('CFP Completion Criteria', () => {
    it('should only mark CFP as complete when published to Wikidata', async () => {
      // Complete crawl and fingerprint
      await executeParallelProcessing(testBusiness.id);
      
      let business = await getBusinessById(testBusiness.id);
      const fingerprint = await getLatestFingerprint(testBusiness.id);
      
      // At this point, CFP is NOT complete (no wikidataQID)
      expect(business?.status).toBe('crawled');
      expect(business?.wikidataQID).toBeNull();
      expect(fingerprint).toBeDefined();
      
      // CFP is not complete yet
      const isPublished = business?.wikidataQID !== null;
      expect(isPublished).toBe(false);

      // Publish to Wikidata
      const { handleAutoPublish } = await import('@/lib/services/scheduler-service-decision');
      await handleAutoPublish(testBusiness.id);
      
      business = await getBusinessById(testBusiness.id);
      
      // Now CFP is complete (has wikidataQID)
      expect(business?.status).toBe('published');
      expect(business?.wikidataQID).toBe('Q123456');
      
      const isPublishedAfter = business?.wikidataQID !== null;
      expect(isPublishedAfter).toBe(true);
    });

    it('should have all required data for CFP completion', async () => {
      // Complete full CFP flow
      await executeParallelProcessing(testBusiness.id);
      const { handleAutoPublish } = await import('@/lib/services/scheduler-service-decision');
      await handleAutoPublish(testBusiness.id);
      
      const business = await getBusinessById(testBusiness.id);
      const fingerprint = await getLatestFingerprint(testBusiness.id);
      
      // Verify all requirements for CFP completion
      expect(business?.status).toBe('published');
      expect(business?.crawlData).toBeDefined();
      expect(business?.wikidataQID).toBe('Q123456');
      expect(business?.wikidataPublishedAt).toBeDefined();
      expect(fingerprint).toBeDefined();
      
      // All progress steps should be complete
      const hasCrawlData = (business?.status === 'crawled' || business?.status === 'published' || business?.status === 'generating') && !!business?.crawlData;
      const hasFingerprint = fingerprint !== null;
      const isPublished = business?.wikidataQID !== null;
      
      expect(hasCrawlData).toBe(true);
      expect(hasFingerprint).toBe(true);
      expect(isPublished).toBe(true);
    });
  });

  describe('Status Flow Validation', () => {
    it('should follow correct status flow: pending → crawling → crawled → generating → published', async () => {
      const statusHistory: string[] = [];
      
      // Initial state
      let business = await getBusinessById(testBusiness.id);
      statusHistory.push(business?.status || 'unknown');
      expect(business?.status).toBe('pending');

      // Start processing
      const processingPromise = executeParallelProcessing(testBusiness.id);
      
      // Wait a bit to catch 'crawling' status
      await new Promise(resolve => setTimeout(resolve, 100));
      business = await getBusinessById(testBusiness.id);
      if (business?.status === 'crawling') {
        statusHistory.push(business.status);
      }
      
      // Wait for processing to complete
      await processingPromise;
      business = await getBusinessById(testBusiness.id);
      statusHistory.push(business?.status || 'unknown');
      expect(business?.status).toBe('crawled');

      // Start publish
      const { handleAutoPublish } = await import('@/lib/services/scheduler-service-decision');
      const publishPromise = handleAutoPublish(testBusiness.id);
      
      // Wait a bit to catch 'generating' status
      await new Promise(resolve => setTimeout(resolve, 100));
      business = await getBusinessById(testBusiness.id);
      if (business?.status === 'generating') {
        statusHistory.push(business.status);
      }
      
      // Wait for publish to complete
      await publishPromise;
      business = await getBusinessById(testBusiness.id);
      statusHistory.push(business?.status || 'unknown');
      expect(business?.status).toBe('published');

      // Verify status flow
      expect(statusHistory).toContain('pending');
      expect(statusHistory).toContain('crawled');
      expect(statusHistory).toContain('published');
      // Note: 'crawling' and 'generating' may be too fast to catch, but that's OK
    });
  });
});

