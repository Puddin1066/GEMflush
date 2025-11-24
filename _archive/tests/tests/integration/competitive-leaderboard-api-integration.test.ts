/**
 * Integration Tests: Competitive Leaderboard API Integration
 * 
 * Tests the complete API flow:
 * 1. Create fingerprint with competitive leaderboard in database
 * 2. API route fetches and transforms to DTO
 * 3. API returns competitive leaderboard in response
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GET } from '@/app/api/fingerprint/business/[businessId]/route';
import { NextRequest } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { businesses, llmFingerprints, teams, users, teamMembers } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { cleanupTestDatabase } from '@/tests/utils/test-helpers';

// Mock authentication
vi.mock('@/lib/db/queries', async () => {
  const actual = await vi.importActual('@/lib/db/queries');
  return {
    ...actual,
    getUser: vi.fn(),
  };
});

describe('Competitive Leaderboard API Integration', () => {
  let testUserId: number;
  let testTeamId: number;
  let testBusinessId: number;

  beforeEach(async () => {
    // Clean up test data in correct order (respects foreign key constraints)
    await cleanupTestDatabase();

    // Create test user
    const [user] = await db
      .insert(users)
      .values({
        email: `test-api-${Date.now()}@example.com`,
        passwordHash: 'test-hash',
        role: 'owner',
      })
      .returning();

    testUserId = user.id;

    // Create test team
    const [team] = await db
      .insert(teams)
      .values({
        name: 'Test Team',
        planName: 'pro',
      })
      .returning();

    testTeamId = team.id;

    // Create team member
    await db.insert(teamMembers).values({
      userId: testUserId,
      teamId: testTeamId,
      role: 'owner',
    });

    // Create test business
    const [business] = await db
      .insert(businesses)
      .values({
        name: 'Test Business',
        url: 'https://example.com',
        teamId: testTeamId,
        status: 'crawled',
      })
      .returning();

    testBusinessId = business.id;
  });

  it('should return competitive leaderboard in API response', async () => {
    const competitiveLeaderboard = {
      targetBusiness: {
        name: 'Test Business',
        rank: 1,
        mentionCount: 5,
        avgPosition: 1.5,
      },
      competitors: [
        {
          name: 'Competitor 1',
          mentionCount: 3,
          avgPosition: 2.0,
          appearsWithTarget: 2,
        },
        {
          name: 'Competitor 2',
          mentionCount: 2,
          avgPosition: 3.0,
          appearsWithTarget: 1,
        },
      ],
      totalRecommendationQueries: 10,
    };

    // Create fingerprint with competitive leaderboard
    await db.insert(llmFingerprints).values({
      businessId: testBusinessId,
      visibilityScore: 75,
      mentionRate: 50,
      sentimentScore: 0.8,
      accuracyScore: 0.85,
      avgRankPosition: 1.5,
      llmResults: [],
      competitiveLeaderboard: competitiveLeaderboard as any,
    });

    // Mock getUser to return test user
    const { getUser } = await import('@/lib/db/queries');
    vi.mocked(getUser).mockResolvedValue({
      id: testUserId,
      email: 'test@example.com',
      role: 'owner',
    } as any);

    // Create request
    const request = new NextRequest('http://localhost/api/fingerprint/business/' + testBusinessId);
    const params = Promise.resolve({ businessId: testBusinessId.toString() });

    // Call API
    const response = await GET(request, { params });
    const data = await response.json();

    // Verify response
    expect(response.status).toBe(200);
    expect(data).toMatchObject({
      visibilityScore: 75,
      summary: expect.any(Object),
      competitiveLeaderboard: expect.objectContaining({
        targetBusiness: expect.objectContaining({
          name: 'Test Business',
          rank: 1,
          mentionCount: 5,
          mentionRate: expect.any(Number),
        }),
        competitors: expect.arrayContaining([
          expect.objectContaining({
            name: expect.any(String),
            mentionCount: expect.any(Number),
            marketShare: expect.any(Number),
          }),
        ]),
        insights: expect.objectContaining({
          marketPosition: expect.any(String),
        }),
        totalQueries: 10,
      }),
    });

    // Verify market shares are calculated
    const leaderboard = data.competitiveLeaderboard;
    expect(leaderboard.targetBusiness.mentionRate).toBeGreaterThan(0);
    expect(leaderboard.competitors[0].marketShare).toBeGreaterThan(0);

    // Verify competitor market shares sum correctly
    // (targetBusiness has mentionRate, not marketShare)
    const totalCompetitorMarketShare = leaderboard.competitors.reduce(
      (sum: number, c: any) => sum + c.marketShare,
      0
    );
    expect(totalCompetitorMarketShare).toBeGreaterThan(0);
  });

  it('should return null when no fingerprint exists', async () => {
    // Mock getUser
    const { getUser } = await import('@/lib/db/queries');
    vi.mocked(getUser).mockResolvedValue({
      id: testUserId,
      email: 'test@example.com',
      role: 'owner',
    } as any);

    // Create request
    const request = new NextRequest('http://localhost/api/fingerprint/business/' + testBusinessId);
    const params = Promise.resolve({ businessId: testBusinessId.toString() });

    // Call API
    const response = await GET(request, { params });
    const data = await response.json();

    // Should return null (not error)
    expect(response.status).toBe(200);
    expect(data).toBeNull();
  });

  it('should return fingerprint without competitive leaderboard if not present', async () => {
    // Create fingerprint without competitive leaderboard
    await db.insert(llmFingerprints).values({
      businessId: testBusinessId,
      visibilityScore: 75,
      mentionRate: 50,
      sentimentScore: 0.8,
      accuracyScore: 0.85,
      avgRankPosition: 1.5,
      llmResults: [],
      // No competitiveLeaderboard
    });

    // Mock getUser
    const { getUser } = await import('@/lib/db/queries');
    vi.mocked(getUser).mockResolvedValue({
      id: testUserId,
      email: 'test@example.com',
      role: 'owner',
    } as any);

    // Create request
    const request = new NextRequest('http://localhost/api/fingerprint/business/' + testBusinessId);
    const params = Promise.resolve({ businessId: testBusinessId.toString() });

    // Call API
    const response = await GET(request, { params });
    const data = await response.json();

    // Should return fingerprint but with null competitiveLeaderboard
    expect(response.status).toBe(200);
    expect(data).toMatchObject({
      visibilityScore: 75,
      competitiveLeaderboard: null,
    });
  });
});

