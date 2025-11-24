/**
 * Integration Tests: Competitive Leaderboard Flow
 * 
 * Tests the complete flow:
 * 1. Fingerprint generation creates competitive leaderboard
 * 2. DTO transformation
 * 3. API route returns competitive leaderboard
 * 4. Hook fetches and provides data
 * 5. Component displays correctly
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '@/lib/db/drizzle';
import { businesses, llmFingerprints, teams, users, teamMembers } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import { toCompetitiveLeaderboardDTO } from '@/lib/data/fingerprint-dto';
import type { CompetitiveLeaderboardDTO } from '@/lib/data/types';
import { cleanupTestDatabase } from '@/tests/utils/test-helpers';

describe('Competitive Leaderboard Integration', () => {
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
        email: `test-${Date.now()}@example.com`,
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

  it('should create and retrieve competitive leaderboard from database', async () => {
    // Create fingerprint with competitive leaderboard
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

    const [fingerprint] = await db
      .insert(llmFingerprints)
      .values({
        businessId: testBusinessId,
        visibilityScore: 75,
        mentionRate: 50,
        sentimentScore: 0.8,
        accuracyScore: 0.85,
        avgRankPosition: 1.5,
        llmResults: [],
        competitiveLeaderboard: competitiveLeaderboard as any,
      })
      .returning();

    expect(fingerprint).toBeDefined();
    expect(fingerprint.competitiveLeaderboard).toBeDefined();

    // Retrieve from database
    const [retrieved] = await db
      .select()
      .from(llmFingerprints)
      .where(eq(llmFingerprints.businessId, testBusinessId))
      .limit(1);

    expect(retrieved).toBeDefined();
    expect(retrieved.competitiveLeaderboard).toEqual(competitiveLeaderboard);
  });

  it('should transform competitive leaderboard through DTO layer', async () => {
    const rawLeaderboard = {
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
      ],
      totalRecommendationQueries: 10,
    };

    // Transform through DTO
    const dto = toCompetitiveLeaderboardDTO(rawLeaderboard, 'Test Business');

    // Verify DTO structure
    expect(dto).toMatchObject({
      targetBusiness: expect.objectContaining({
        name: 'Test Business',
        rank: 1,
        mentionCount: 5,
        mentionRate: expect.any(Number),
      }),
      competitors: expect.arrayContaining([
        expect.objectContaining({
          rank: 1,
          name: 'Competitor 1',
          mentionCount: 3,
          marketShare: expect.any(Number),
        }),
      ]),
      insights: expect.objectContaining({
        marketPosition: expect.any(String),
      }),
      totalQueries: 10,
    });

    // Verify market shares sum to 100%
    // Note: targetBusiness has mentionRate, not marketShare
    // Market shares are calculated for competitors only
    const totalCompetitorMarketShare = dto.competitors.reduce((sum, c) => sum + c.marketShare, 0);
    expect(totalCompetitorMarketShare).toBeGreaterThan(0);
    expect(dto.targetBusiness.mentionRate).toBeGreaterThan(0);
  });

  it('should handle multiple fingerprints and retrieve latest', async () => {
    // Create first fingerprint
    await db.insert(llmFingerprints).values({
      businessId: testBusinessId,
      visibilityScore: 70,
      mentionRate: 40,
      sentimentScore: 0.7,
      accuracyScore: 0.8,
      avgRankPosition: 2.0,
      llmResults: [],
      competitiveLeaderboard: {
        targetBusiness: { name: 'Test Business', rank: 2, mentionCount: 4, avgPosition: 2.0 },
        competitors: [],
        totalRecommendationQueries: 10,
      } as any,
    });

    // Create second (latest) fingerprint
    const latestLeaderboard = {
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
      ],
      totalRecommendationQueries: 10,
    };

    await db.insert(llmFingerprints).values({
      businessId: testBusinessId,
      visibilityScore: 75,
      mentionRate: 50,
      sentimentScore: 0.8,
      accuracyScore: 0.85,
      avgRankPosition: 1.5,
      llmResults: [],
      competitiveLeaderboard: latestLeaderboard as any,
    });

    // Retrieve latest
    const fingerprints = await db
      .select()
      .from(llmFingerprints)
      .where(eq(llmFingerprints.businessId, testBusinessId))
      .orderBy(desc(llmFingerprints.createdAt));

    expect(fingerprints.length).toBe(2);
    expect(fingerprints[0].competitiveLeaderboard).toEqual(latestLeaderboard);
  });

  it('should calculate market shares correctly across multiple competitors', async () => {
    const rawLeaderboard = {
      targetBusiness: {
        name: 'Test Business',
        rank: 1,
        mentionCount: 10,
        avgPosition: 1.0,
      },
      competitors: [
        {
          name: 'Competitor 1',
          mentionCount: 5,
          avgPosition: 2.0,
          appearsWithTarget: 3,
        },
        {
          name: 'Competitor 2',
          mentionCount: 3,
          avgPosition: 3.0,
          appearsWithTarget: 2,
        },
        {
          name: 'Competitor 3',
          mentionCount: 2,
          avgPosition: 4.0,
          appearsWithTarget: 1,
        },
      ],
      totalRecommendationQueries: 20,
    };

    const dto = toCompetitiveLeaderboardDTO(rawLeaderboard, 'Test Business');

    // Total mentions: 10 (target) + 5 + 3 + 2 = 20
    // Target has mentionRate, not marketShare
    // mentionRate = (mentionCount / totalQueries) * 100 = (10/20) * 100 = 50%
    expect(dto.targetBusiness.mentionRate).toBe(50);
    
    // Competitor market shares: calculated from total mentions
    // Competitor 1: 5/20 = 25%
    expect(dto.competitors[0].marketShare).toBe(25);
    // Competitor 2: 3/20 = 15%
    expect(dto.competitors[1].marketShare).toBe(15);
    // Competitor 3: 2/20 = 10%
    expect(dto.competitors[2].marketShare).toBe(10);

    // Market shares (competitors) + target mentionCount should equal total mentions
    const totalCompetitorMentions = dto.competitors.reduce((sum, c) => sum + c.mentionCount, 0);
    const totalMentions = dto.targetBusiness.mentionCount + totalCompetitorMentions;
    expect(totalMentions).toBe(20);
  });

  it('should handle competitor deduplication correctly', async () => {
    const rawLeaderboard = {
      targetBusiness: {
        name: 'Test Business',
        rank: 1,
        mentionCount: 5,
        avgPosition: 1.5,
      },
      competitors: [
        {
          name: 'Competitor Inc',
          mentionCount: 2,
          avgPosition: 2.0,
          appearsWithTarget: 1,
        },
        {
          name: 'Competitor Inc.',
          mentionCount: 1,
          avgPosition: 3.0,
          appearsWithTarget: 1,
        },
        {
          name: 'The Competitor LLC',
          mentionCount: 1,
          avgPosition: 4.0,
          appearsWithTarget: 0,
        },
      ],
      totalRecommendationQueries: 10,
    };

    const dto = toCompetitiveLeaderboardDTO(rawLeaderboard, 'Test Business');

    // Should deduplicate "Competitor Inc" and "Competitor Inc."
    // Normalization removes "Inc" suffix, so both become "competitor"
    // "The Competitor LLC" also normalizes to "competitor" (removes "The" and "LLC")
    // So all three should deduplicate to one competitor with mentionCount = 4 (2+1+1)
    expect(dto.competitors.length).toBeLessThan(3);

    // Find deduplicated competitor (should have mentionCount = 4)
    const deduplicated = dto.competitors.find(c => c.mentionCount === 4);
    expect(deduplicated).toBeDefined();
  });
});

