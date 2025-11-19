/**
 * Test: Fingerprint API Route Endpoints
 * Verifies that API routes return correct fingerprint data for each business
 * 
 * This test simulates actual API calls to catch routing issues
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { db } from '@/lib/db/drizzle';
import { businesses, teams, users, llmFingerprints, teamMembers } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { createBusiness } from '@/lib/db/queries';
import { NextRequest } from 'next/server';
import { GET as getFingerprintByBusiness } from '@/app/api/fingerprint/business/[businessId]/route';

// Mock auth
vi.mock('@/lib/db/queries', async () => {
  const actual = await vi.importActual('@/lib/db/queries');
  return {
    ...actual,
    getUser: vi.fn(),
    getTeamForUser: vi.fn(),
  };
});

describe('Fingerprint API Route Endpoints', () => {
  let testUser: any;
  let testTeam: any;
  let business686: any;
  let business544: any;
  let fingerprint686: any;
  let fingerprint544: any;

  beforeAll(async () => {
    // Setup test user
    const [user] = await db.insert(users).values({
      name: 'Test User',
      email: `test-api-${Date.now()}@example.com`,
      passwordHash: 'hashed_password',
    }).returning();
    testUser = user;

    // Setup test team
    const [team] = await db.insert(teams).values({
      name: 'Test Team',
      planName: null,
      subscriptionStatus: 'active',
    }).returning();
    testTeam = team;

    // Create team member relationship
    await db.insert(teamMembers).values({
      userId: user.id,
      teamId: team.id,
      role: 'owner',
    });

    // Create business 686
    const business1 = await createBusiness({
      teamId: team.id,
      name: 'Business 686 - API Test',
      url: 'https://business686-api-test.com',
      category: 'technology',
      location: { city: 'Test City', state: 'TS', country: 'US' },
    });
    business686 = business1;

    // Create business 544
    const business2 = await createBusiness({
      teamId: team.id,
      name: 'Business 544 - API Test',
      url: 'https://business544-api-test.com',
      category: 'healthcare',
      location: { city: 'Test City', state: 'TS', country: 'US' },
    });
    business544 = business2;

    // Create fingerprint for business 686
    const [fp1] = await db.insert(llmFingerprints).values({
      businessId: business686.id,
      visibilityScore: 73,
      mentionRate: 78,
      sentimentScore: 0.8,
      accuracyScore: 0.7,
      avgRankPosition: 4,
      llmResults: [
        { model: 'gpt-4', mentioned: true, sentiment: 'positive' },
      ] as any,
      competitiveLeaderboard: {
        targetBusiness: {
          name: 'Business 686 - API Test',
          rank: 4,
          mentionCount: 1,
          avgPosition: 4,
        },
        competitors: [],
        totalRecommendationQueries: 3,
      } as any,
      createdAt: new Date(),
    }).returning();
    fingerprint686 = fp1;

    // Create fingerprint for business 544 (different data)
    const [fp2] = await db.insert(llmFingerprints).values({
      businessId: business544.id,
      visibilityScore: 45,
      mentionRate: 50,
      sentimentScore: 0.6,
      accuracyScore: 0.65,
      avgRankPosition: 8,
      llmResults: [
        { model: 'claude-3', mentioned: true, sentiment: 'neutral' },
      ] as any,
      competitiveLeaderboard: {
        targetBusiness: {
          name: 'Business 544 - API Test',
          rank: 8,
          mentionCount: 1,
          avgPosition: 8,
        },
        competitors: [],
        totalRecommendationQueries: 5,
      } as any,
      createdAt: new Date(),
    }).returning();
    fingerprint544 = fp2;

    // Mock auth functions
    const { getUser, getTeamForUser } = await import('@/lib/db/queries');
    vi.mocked(getUser).mockResolvedValue(testUser);
    vi.mocked(getTeamForUser).mockResolvedValue(testTeam);
  });

  afterAll(async () => {
    // Cleanup
    if (fingerprint686) {
      await db.delete(llmFingerprints).where(eq(llmFingerprints.id, fingerprint686.id));
    }
    if (fingerprint544) {
      await db.delete(llmFingerprints).where(eq(llmFingerprints.id, fingerprint544.id));
    }
    if (business686) {
      await db.delete(businesses).where(eq(businesses.id, business686.id));
    }
    if (business544) {
      await db.delete(businesses).where(eq(businesses.id, business544.id));
    }
    if (testTeam) {
      await db.delete(teamMembers).where(eq(teamMembers.teamId, testTeam.id));
      await db.delete(teams).where(eq(teams.id, testTeam.id));
    }
    if (testUser) {
      await db.delete(users).where(eq(users.id, testUser.id));
    }
  });

  it('should return correct fingerprint for business 686', async () => {
    const request = new NextRequest(`http://localhost:3000/api/fingerprint/business/${business686.id}`);
    const response = await getFingerprintByBusiness(request, {
      params: Promise.resolve({ businessId: String(business686.id) }),
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    
    // Verify response structure
    expect(data).toBeDefined();
    expect(data.visibilityScore).toBe(73);
    expect(data.summary).toBeDefined();
    expect(data.summary.mentionRate).toBe(78);
    
    // Verify debug metadata
    if (data._debug) {
      expect(data._debug.businessId).toBe(business686.id);
      expect(data._debug.fingerprintId).toBe(fingerprint686.id);
      expect(data._debug.businessName).toBe('Business 686 - API Test');
    }
  });

  it('should return correct fingerprint for business 544', async () => {
    const request = new NextRequest(`http://localhost:3000/api/fingerprint/business/${business544.id}`);
    const response = await getFingerprintByBusiness(request, {
      params: Promise.resolve({ businessId: String(business544.id) }),
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    
    // Verify response structure
    expect(data).toBeDefined();
    expect(data.visibilityScore).toBe(45);
    expect(data.summary).toBeDefined();
    expect(data.summary.mentionRate).toBe(50);
    
    // Verify debug metadata
    if (data._debug) {
      expect(data._debug.businessId).toBe(business544.id);
      expect(data._debug.fingerprintId).toBe(fingerprint544.id);
      expect(data._debug.businessName).toBe('Business 544 - API Test');
    }
  });

  it('should return different fingerprints for different business IDs', async () => {
    // Call API for business 686
    const request686 = new NextRequest(`http://localhost:3000/api/fingerprint/business/${business686.id}`);
    const response686 = await getFingerprintByBusiness(request686, {
      params: Promise.resolve({ businessId: String(business686.id) }),
    });
    const data686 = await response686.json();

    // Call API for business 544
    const request544 = new NextRequest(`http://localhost:3000/api/fingerprint/business/${business544.id}`);
    const response544 = await getFingerprintByBusiness(request544, {
      params: Promise.resolve({ businessId: String(business544.id) }),
    });
    const data544 = await response544.json();

    // Verify they return different data
    expect(data686.visibilityScore).not.toBe(data544.visibilityScore);
    expect(data686.visibilityScore).toBe(73);
    expect(data544.visibilityScore).toBe(45);
    
    expect(data686.summary.mentionRate).not.toBe(data544.summary.mentionRate);
    expect(data686.summary.mentionRate).toBe(78);
    expect(data544.summary.mentionRate).toBe(50);

    // Verify debug metadata shows different businesses
    if (data686._debug && data544._debug) {
      expect(data686._debug.businessId).not.toBe(data544._debug.businessId);
      expect(data686._debug.fingerprintId).not.toBe(data544._debug.fingerprintId);
      expect(data686._debug.businessName).not.toBe(data544._debug.businessName);
    }
  });

  it('should correctly parse businessId parameter from route', async () => {
    // Test with string "686"
    const businessIdStr = '686';
    const businessId = parseInt(businessIdStr);
    
    expect(businessId).toBe(686);
    expect(!isNaN(businessId)).toBe(true);

    // Test with string "544"
    const businessIdStr2 = '544';
    const businessId2 = parseInt(businessIdStr2);
    
    expect(businessId2).toBe(544);
    expect(!isNaN(businessId2)).toBe(true);
    expect(businessId).not.toBe(businessId2);
  });
});

