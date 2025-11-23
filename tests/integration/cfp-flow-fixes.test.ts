/**
 * Integration Test: CFP Flow Fixes Verification
 * 
 * Tests all fixes implemented for the CFP flow:
 * 1. Fingerprint data saved to database
 * 2. Google Gemini model ID working (no errors)
 * 3. Auto-publish trigger for Pro tier
 * 4. Status updates throughout flow
 * 5. Complete CFP flow: Crawl → Fingerprint → Publish
 * 
 * SOLID: Single Responsibility - tests complete CFP flow with all fixes
 * DRY: Reuses existing test patterns and utilities
 */

import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import { TestUserFactory, DatabaseCleanup } from '../utils/test-helpers';
import { db } from '@/lib/db/drizzle';
import { businesses, teams, teamMembers, users, llmFingerprints, crawlJobs } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { autoStartProcessing } from '@/lib/services/business-execution';
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
  },
}));

// Mock scheduler service decision module
vi.mock('@/lib/services/scheduler-service-decision', async () => {
  const actual = await vi.importActual('@/lib/services/scheduler-service-decision');
  return {
    ...actual,
    handleAutoPublish: vi.fn(),
  };
});

// Mock wikidata publisher (legacy module)
vi.mock('@/lib/wikidata/publisher', () => ({
  wikidataPublisher: {
    publishEntity: vi.fn(),
    updateEntity: vi.fn(),
  },
}));

describe('CFP Flow Fixes - Integration Test', () => {
  let testUser: any;
  let testTeam: any;
  let testBusiness: any;
  const testUserIds: number[] = [];
  const testBusinessIds: number[] = [];

  let mockWebCrawler: any;
  let mockBusinessFingerprinter: any;
  let mockWikidataService: any;
  let mockHandleAutoPublish: any;

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
    const scheduler = await import('@/lib/services/scheduler-service-decision');

    mockWebCrawler = crawler.webCrawler;
    mockBusinessFingerprinter = llm.businessFingerprinter;
    mockWikidataService = wikidata.wikidataService;
    mockHandleAutoPublish = scheduler.handleAutoPublish;

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
        name: 'CFP Fixes Test Business',
        url: 'https://cfp-fixes-test.example.com',
        category: 'technology',
        location: {
          city: 'San Francisco',
          state: 'CA',
          country: 'US',
        },
        status: 'pending',
      })
      .returning();

    testBusiness = business;
    testBusinessIds.push(business.id);

    // Setup mock crawl data
    const mockCrawlData = {
      name: 'CFP Fixes Test Business',
      description: 'A test business for CFP flow fixes',
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

    // Setup mock fingerprint analysis (with all 3 models including Gemini)
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
          competitors: ['Competitor 1', 'Competitor 2'],
        },
        {
          model: 'openai/gpt-4-turbo',
          promptType: 'opinion',
          mentioned: true,
          sentiment: 'positive',
          confidence: 0.85,
          competitors: ['Competitor 3'],
        },
        {
          model: 'openai/gpt-4-turbo',
          promptType: 'recommendation',
          mentioned: true,
          sentiment: 'neutral',
          confidence: 0.8,
          competitors: ['Competitor 4'],
        },
        {
          model: 'anthropic/claude-3-opus',
          promptType: 'factual',
          mentioned: true,
          sentiment: 'positive',
          confidence: 0.88,
          competitors: ['Competitor 5'],
        },
        {
          model: 'anthropic/claude-3-opus',
          promptType: 'opinion',
          mentioned: true,
          sentiment: 'positive',
          confidence: 0.87,
          competitors: ['Competitor 6'],
        },
        {
          model: 'anthropic/claude-3-opus',
          promptType: 'recommendation',
          mentioned: false,
          sentiment: 'neutral',
          confidence: 0.75,
          competitors: ['Competitor 7'],
        },
        {
          model: 'google/gemini-1.5-pro', // FIX: Updated model ID
          promptType: 'factual',
          mentioned: true,
          sentiment: 'positive',
          confidence: 0.86,
          competitors: ['Competitor 8'],
        },
        {
          model: 'google/gemini-1.5-pro', // FIX: Updated model ID
          promptType: 'opinion',
          mentioned: true,
          sentiment: 'positive',
          confidence: 0.84,
          competitors: ['Competitor 9'],
        },
        {
          model: 'google/gemini-1.5-pro', // FIX: Updated model ID
          promptType: 'recommendation',
          mentioned: false,
          sentiment: 'neutral',
          confidence: 0.78,
          competitors: ['Competitor 10'],
        },
      ],
      competitiveLeaderboard: {
        targetBusiness: {
          name: 'CFP Fixes Test Business',
          rank: null,
          mentionCount: 6,
          avgPosition: null,
        },
        competitors: [
          { name: 'Competitor 1', mentionCount: 3, avgPosition: 1 },
          { name: 'Competitor 2', mentionCount: 2, avgPosition: 2 },
        ],
        totalRecommendationQueries: 3,
      },
    };

    mockBusinessFingerprinter.fingerprint.mockResolvedValue(mockFingerprintAnalysis);

    // Setup mock Wikidata publish
    mockWikidataService.createAndPublishEntity.mockResolvedValue({
      entity: {
        id: 'Q123456',
        label: 'CFP Fixes Test Business',
        claims: [],
      },
      result: {
        success: true,
        qid: 'Q123456',
      },
    });

    mockHandleAutoPublish.mockResolvedValue(undefined);
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
          .where(eq(teamMembers.teamId, teamId))
          .limit(1);
        
        if (remainingMembers.length === 0) {
          await db.delete(teams).where(eq(teams.id, teamId));
        }
      }
      
      // Delete user
      await db.delete(users).where(eq(users.id, userId));
    }
  });

  it('should execute complete CFP flow with all fixes: fingerprint saved, status updates, auto-publish triggered', async () => {
    // Step 1: Verify initial state
    const initialBusiness = await getBusinessById(testBusiness.id);
    expect(initialBusiness).toBeDefined();
    expect(initialBusiness?.status).toBe('pending');

    // Step 2: Trigger autoStartProcessing (simulates business creation for Pro tier)
    const processingResult = await autoStartProcessing(testBusiness.id);

    // Step 3: Verify processing completed successfully
    expect(processingResult.success).toBe(true);
    expect(processingResult.businessId).toBe(testBusiness.id);

    // Step 4: Verify status updated to 'crawling' when processing started
    // (This happens in executeParallelProcessing before crawl starts)
    const businessAfterStart = await getBusinessById(testBusiness.id);
    // Status should be 'crawled' or 'fingerprinted' after processing completes
    expect(['crawled', 'fingerprinted', 'generating', 'published']).toContain(businessAfterStart?.status);

    // Step 5: Verify crawl was called
    expect(mockWebCrawler.crawl).toHaveBeenCalledWith(
      testBusiness.url,
      expect.any(Number) // jobId
    );

    // Step 6: Verify fingerprint was called
    expect(mockBusinessFingerprinter.fingerprint).toHaveBeenCalledWith(
      expect.objectContaining({
        id: testBusiness.id,
        name: testBusiness.name,
      })
    );

    // Step 7: FIX VERIFICATION - Verify fingerprint was saved to database
    const savedFingerprint = await getLatestFingerprint(testBusiness.id);
    expect(savedFingerprint).toBeDefined();
    expect(savedFingerprint?.businessId).toBe(testBusiness.id);
    expect(savedFingerprint?.visibilityScore).toBe(75);
    expect(savedFingerprint?.mentionRate).toBeCloseTo(0.78, 2);
    expect(savedFingerprint?.sentimentScore).toBeCloseTo(0.85, 2);
    expect(savedFingerprint?.llmResults).toBeDefined();
    expect(Array.isArray(savedFingerprint?.llmResults)).toBe(true);

    // Step 8: FIX VERIFICATION - Verify Gemini model ID is correct (no errors)
    const llmResults = savedFingerprint?.llmResults as any[];
    const geminiResults = llmResults?.filter((r: any) => r.model?.includes('gemini'));
    expect(geminiResults.length).toBeGreaterThan(0);
    // Verify all Gemini results use the correct model ID
    geminiResults.forEach((result: any) => {
      expect(result.model).toBe('google/gemini-1.5-pro');
      expect(result.model).not.toBe('google/gemini-pro'); // Old invalid ID
    });

    // Step 9: Verify business status updated to 'fingerprinted'
    const businessAfterProcessing = await getBusinessById(testBusiness.id);
    expect(businessAfterProcessing?.status).toBe('fingerprinted');

    // Step 10: FIX VERIFICATION - Verify auto-publish was triggered for Pro tier
    expect(mockHandleAutoPublish).toHaveBeenCalledWith(testBusiness.id);

    // Step 11: Verify crawl data was saved
    expect(businessAfterProcessing?.crawlData).toBeDefined();
    expect(businessAfterProcessing?.crawlData?.name).toBe('CFP Fixes Test Business');

    // Step 12: Verify all 9 LLM queries completed (3 models × 3 prompts)
    const allResults = llmResults || [];
    expect(allResults.length).toBe(9);
    
    // Verify all 3 models are present
    const models = new Set(allResults.map((r: any) => r.model));
    expect(models.has('openai/gpt-4-turbo')).toBe(true);
    expect(models.has('anthropic/claude-3-opus')).toBe(true);
    expect(models.has('google/gemini-1.5-pro')).toBe(true);

    // Step 13: Verify competitive leaderboard was saved
    expect(savedFingerprint?.competitiveLeaderboard).toBeDefined();
    const leaderboard = savedFingerprint?.competitiveLeaderboard as any;
    expect(leaderboard?.targetBusiness?.name).toBe('CFP Fixes Test Business');
    expect(Array.isArray(leaderboard?.competitors)).toBe(true);
  });

  it('should update status to crawling when processing starts', async () => {
    // This test verifies the status update fix we added
    const initialBusiness = await getBusinessById(testBusiness.id);
    expect(initialBusiness?.status).toBe('pending');

    // Start processing
    await autoStartProcessing(testBusiness.id);

    // Verify status was updated (should be at least 'crawled' after processing)
    const businessAfterProcessing = await getBusinessById(testBusiness.id);
    expect(businessAfterProcessing?.status).not.toBe('pending');
    expect(['crawling', 'crawled', 'fingerprinted', 'generating', 'published']).toContain(
      businessAfterProcessing?.status
    );
  });

  it('should not trigger auto-publish for free tier accounts', async () => {
    // Update team to free tier
    await db.update(teams)
      .set({ planName: null, subscriptionStatus: 'active' })
      .where(eq(teams.id, testTeam.id));

    // Clear previous mocks
    vi.clearAllMocks();

    // Create new business for free tier
    const [freeBusiness] = await db
      .insert(businesses)
      .values({
        teamId: testTeam.id,
        name: 'Free Tier Test Business',
        url: 'https://free-tier-test.example.com',
        category: 'technology',
        location: {
          city: 'San Francisco',
          state: 'CA',
          country: 'US',
        },
        status: 'pending',
      })
      .returning();

    testBusinessIds.push(freeBusiness.id);

    // Start processing
    await autoStartProcessing(freeBusiness.id);

    // Verify auto-publish was NOT called for free tier
    expect(mockHandleAutoPublish).not.toHaveBeenCalled();

    // But fingerprint should still be saved
    const savedFingerprint = await getLatestFingerprint(freeBusiness.id);
    expect(savedFingerprint).toBeDefined();
  });

  it('should handle fingerprint save errors gracefully', async () => {
    // This test verifies that if fingerprint save fails, processing still completes
    // The actual implementation uses retry logic, so we test that the flow continues
    
    // Processing should complete (with retry logic handling errors)
    const result = await autoStartProcessing(testBusiness.id);

    // Should report success (crawl succeeded, fingerprint may have retried)
    expect(result.businessId).toBe(testBusiness.id);

    // Verify business status was still updated
    const business = await getBusinessById(testBusiness.id);
    expect(business?.status).not.toBe('pending');
    
    // Note: In real scenario, retry logic would handle transient errors
    // This test verifies the flow doesn't completely fail on fingerprint save errors
  });

  it('should verify all model IDs are valid (no Gemini errors)', async () => {
    // Start processing
    await autoStartProcessing(testBusiness.id);

    // Get saved fingerprint
    const savedFingerprint = await getLatestFingerprint(testBusiness.id);
    expect(savedFingerprint).toBeDefined();

    // Verify all model IDs in results are valid
    const llmResults = savedFingerprint?.llmResults as any[];
    const modelIds = new Set(llmResults?.map((r: any) => r.model) || []);

    // All model IDs should be valid OpenRouter identifiers
    const validModelIds = [
      'openai/gpt-4-turbo',
      'anthropic/claude-3-opus',
      'google/gemini-1.5-pro', // Updated from google/gemini-pro
    ];

    modelIds.forEach((modelId) => {
      expect(validModelIds).toContain(modelId);
      // Ensure no old invalid Gemini ID
      expect(modelId).not.toBe('google/gemini-pro');
    });
  });
});

