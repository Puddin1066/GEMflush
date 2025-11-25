/**
 * TDD Database Helpers for Real Implementation Testing
 * 
 * Purpose: Utilities for testing with REAL database connections (not mocks)
 * Following TRUE TDD principles - tests should fail if real code doesn't work
 * 
 * SOLID: Single Responsibility - Database test utilities only
 * DRY: Reusable test database setup and teardown
 */

import { db } from '@/lib/db/drizzle';
import {
  users,
  teams,
  teamMembers,
  businesses,
  llmFingerprints,
  wikidataEntities,
  crawlJobs,
  competitors,
  activityLogs,
  invitations,
  type NewUser,
  type NewTeam,
  type NewBusiness,
} from '@/lib/db/schema';
import { hashPassword } from '@/lib/auth/session';
import { eq } from 'drizzle-orm';

/**
 * Clean up all test data
 * Called after each test to ensure isolation
 */
export async function cleanupTestData(): Promise<void> {
  try {
    // Delete in dependency order (child tables first)
    await db.delete(crawlJobs).catch(() => {});
    await db.delete(llmFingerprints).catch(() => {});
    await db.delete(wikidataEntities).catch(() => {});
    await db.delete(competitors).catch(() => {});
    await db.delete(businesses).catch(() => {});
    await db.delete(activityLogs).catch(() => {});
    await db.delete(invitations).catch(() => {});
    await db.delete(teamMembers).catch(() => {});
    await db.delete(teams).catch(() => {});
    await db.delete(users).catch(() => {});
  } catch (error) {
    console.error('[TDD DB Helper] Cleanup error:', error);
    // Don't throw - allow tests to continue
  }
}

/**
 * Create a test user with team
 * Returns real database records (not mocks)
 */
export async function createTestUserWithTeam(options?: {
  email?: string;
  planName?: 'free' | 'pro' | 'agency';
}): Promise<{ user: typeof users.$inferSelect; team: typeof teams.$inferSelect }> {
  const email = options?.email || `test-${Date.now()}@example.com`;
  const passwordHash = await hashPassword('testpassword123');
  
  // Create user
  const [user] = await db
    .insert(users)
    .values({
      email,
      passwordHash,
      role: 'owner',
    })
    .returning();

  // Create team with plan
  const [team] = await db
    .insert(teams)
    .values({
      name: `${email}'s Team`,
      planName: options?.planName || 'free',
      subscriptionStatus: 'active',
    })
    .returning();

  // Create team member relationship
  await db.insert(teamMembers).values({
    userId: user.id,
    teamId: team.id,
    role: 'owner',
  });

  return { user, team };
}

/**
 * Create a test business
 * Returns real database record (not mock)
 */
export async function createTestBusiness(
  teamId: number,
  options?: Partial<NewBusiness>
): Promise<typeof businesses.$inferSelect> {
  const [business] = await db
    .insert(businesses)
    .values({
      teamId,
      name: options?.name || `Test Business ${Date.now()}`,
      url: options?.url || 'https://example.com',
      category: options?.category || 'Restaurant',
      location: options?.location || { city: 'Seattle', state: 'WA', country: 'US' },
      status: options?.status || 'pending',
      ...options,
    })
    .returning();

  return business;
}

/**
 * Get business by ID (real database query)
 */
export async function getTestBusiness(businessId: number): Promise<typeof businesses.$inferSelect | null> {
  const [business] = await db
    .select()
    .from(businesses)
    .where(eq(businesses.id, businessId))
    .limit(1);

  return business || null;
}

/**
 * Update business (real database update)
 */
export async function updateTestBusiness(
  businessId: number,
  data: Partial<NewBusiness>
): Promise<typeof businesses.$inferSelect | null> {
  const [updated] = await db
    .update(businesses)
    .set(data)
    .where(eq(businesses.id, businessId))
    .returning();

  return updated || null;
}

/**
 * Get team by ID (real database query)
 */
export async function getTestTeam(teamId: number): Promise<typeof teams.$inferSelect | null> {
  const [team] = await db
    .select()
    .from(teams)
    .where(eq(teams.id, teamId))
    .limit(1);

  return team || null;
}

/**
 * Update team subscription (real database update)
 */
export async function updateTestTeamSubscription(
  teamId: number,
  planName: 'free' | 'pro' | 'agency'
): Promise<typeof teams.$inferSelect | null> {
  const [updated] = await db
    .update(teams)
    .set({
      planName,
      subscriptionStatus: 'active',
    })
    .where(eq(teams.id, teamId))
    .returning();

  return updated || null;
}

/**
 * Get business count for team (real database query)
 */
export async function getBusinessCountForTeam(teamId: number): Promise<number> {
  const results = await db
    .select({ count: businesses.id })
    .from(businesses)
    .where(eq(businesses.teamId, teamId));

  return results.length;
}

