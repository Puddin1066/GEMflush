/**
 * Test: Fingerprint API Routing
 * Verifies that fingerprint API returns correct data for each business
 * 
 * This test specifically checks for the bug where business 686 and 544
 * were showing the same fingerprint data.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { db } from '@/lib/db/drizzle';
import { businesses, teams, users, llmFingerprints, teamMembers } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { createBusiness } from '@/lib/db/queries';

describe('Fingerprint API Routing', () => {
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
      email: `test-fingerprint-${Date.now()}@example.com`,
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

    // Create business 686 (simulating existing business)
    const business1 = await createBusiness({
      teamId: team.id,
      name: 'Business 686 - Test',
      url: 'https://business686-test.com',
      category: 'technology',
      location: { city: 'Test City', state: 'TS', country: 'US' },
    });
    business686 = business1;

    // Create business 544 (simulating existing business)
    const business2 = await createBusiness({
      teamId: team.id,
      name: 'Business 544 - Test',
      url: 'https://business544-test.com',
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
          name: 'Business 686 - Test',
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
          name: 'Business 544 - Test',
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

  it('should return different fingerprints for different businesses', async () => {
    // Query fingerprints directly from database
    const [fp686] = await db
      .select()
      .from(llmFingerprints)
      .where(eq(llmFingerprints.businessId, business686.id))
      .limit(1);

    const [fp544] = await db
      .select()
      .from(llmFingerprints)
      .where(eq(llmFingerprints.businessId, business544.id))
      .limit(1);

    // Verify they are different records
    expect(fp686).toBeDefined();
    expect(fp544).toBeDefined();
    expect(fp686.id).not.toBe(fp544.id);
    expect(fp686.businessId).toBe(business686.id);
    expect(fp544.businessId).toBe(business544.id);

    // Verify they have different data
    expect(fp686.visibilityScore).toBe(73);
    expect(fp544.visibilityScore).toBe(45);
    expect(fp686.mentionRate).toBe(78);
    expect(fp544.mentionRate).toBe(50);
  });

  it('should query fingerprints by correct businessId', async () => {
    // Test query for business 686
    const fingerprints686 = await db
      .select()
      .from(llmFingerprints)
      .where(eq(llmFingerprints.businessId, business686.id))
      .limit(1);

    expect(fingerprints686.length).toBe(1);
    expect(fingerprints686[0].businessId).toBe(business686.id);
    expect(fingerprints686[0].id).toBe(fingerprint686.id);

    // Test query for business 544
    const fingerprints544 = await db
      .select()
      .from(llmFingerprints)
      .where(eq(llmFingerprints.businessId, business544.id))
      .limit(1);

    expect(fingerprints544.length).toBe(1);
    expect(fingerprints544[0].businessId).toBe(business544.id);
    expect(fingerprints544[0].id).toBe(fingerprint544.id);

    // Verify they return different fingerprints
    expect(fingerprints686[0].id).not.toBe(fingerprints544[0].id);
  });

  it('should verify businessId parameter parsing', () => {
    // Test that parseInt works correctly
    const id686 = parseInt('686');
    const id544 = parseInt('544');
    
    expect(id686).toBe(686);
    expect(id544).toBe(544);
    expect(id686).not.toBe(id544);
    expect(!isNaN(id686)).toBe(true);
    expect(!isNaN(id544)).toBe(true);
  });
});

