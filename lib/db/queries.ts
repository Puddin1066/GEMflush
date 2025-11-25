import { desc, and, eq, isNull, count } from 'drizzle-orm';
import { db } from './drizzle';
import {
  activityLogs,
  teamMembers,
  teams,
  users,
  businesses,
  wikidataEntities,
  llmFingerprints,
  crawlJobs,
  competitors,
  type NewBusiness,
  type NewCrawlJob,
  type NewLLMFingerprint,
  type NewWikidataEntity,
} from './schema';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth/session';

export async function getUser() {
  const sessionCookie = (await cookies()).get('session');
  if (!sessionCookie || !sessionCookie.value) {
    return null;
  }

  const sessionData = await verifyToken(sessionCookie.value);
  if (
    !sessionData ||
    !sessionData.user ||
    typeof sessionData.user.id !== 'number'
  ) {
    return null;
  }

  if (new Date(sessionData.expires) < new Date()) {
    return null;
  }

  const user = await db
    .select()
    .from(users)
    .where(and(eq(users.id, sessionData.user.id), isNull(users.deletedAt)))
    .limit(1);

  if (user.length === 0) {
    return null;
  }

  return user[0];
}

export async function getTeamByStripeCustomerId(customerId: string) {
  const result = await db
    .select()
    .from(teams)
    .where(eq(teams.stripeCustomerId, customerId))
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

export async function updateTeamSubscription(
  teamId: number,
  subscriptionData: {
    stripeSubscriptionId: string | null;
    stripeProductId: string | null;
    planName: string | null;
    subscriptionStatus: string | null;
  }
) {
  await db
    .update(teams)
    .set({
      ...subscriptionData,
      updatedAt: new Date()
    })
    .where(eq(teams.id, teamId));
}

export async function getUserWithTeam(userId: number) {
  const result = await db
    .select({
      user: users,
      teamId: teamMembers.teamId
    })
    .from(users)
    .leftJoin(teamMembers, eq(users.id, teamMembers.userId))
    .where(eq(users.id, userId))
    .limit(1);

  return result[0];
}

export async function getActivityLogs() {
  const user = await getUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  return await db
    .select({
      id: activityLogs.id,
      action: activityLogs.action,
      timestamp: activityLogs.timestamp,
      ipAddress: activityLogs.ipAddress,
      userName: users.name
    })
    .from(activityLogs)
    .leftJoin(users, eq(activityLogs.userId, users.id))
    .where(eq(activityLogs.userId, user.id))
    .orderBy(desc(activityLogs.timestamp))
    .limit(10);
}

export async function getTeamForUser() {
  const user = await getUser();
  if (!user) {
    return null;
  }

  const result = await db.query.teamMembers.findFirst({
    where: eq(teamMembers.userId, user.id),
    with: {
      team: {
        with: {
          teamMembers: {
            with: {
              user: {
                columns: {
                  id: true,
                  name: true,
                  email: true
                }
              }
            }
          }
        }
      }
    }
  });

  return result?.team || null;
}

// GEMflush-specific queries

export async function getBusinessesByTeam(teamId: number) {
  return await db
    .select()
    .from(businesses)
    .where(eq(businesses.teamId, teamId))
    .orderBy(desc(businesses.createdAt));
}

export async function getBusinessById(businessId: number) {
  const result = await db
    .select()
    .from(businesses)
    .where(eq(businesses.id, businessId))
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

export async function getTeamForBusiness(businessId: number) {
  const business = await getBusinessById(businessId);
  if (!business) {
    return null;
  }

  const result = await db
    .select()
    .from(teams)
    .where(eq(teams.id, business.teamId))
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

export async function createBusiness(businessData: NewBusiness) {
  const result = await db
    .insert(businesses)
    .values(businessData)
    .returning();

  return result[0];
}

export async function updateBusiness(
  businessId: number,
  updates: Partial<NewBusiness>
) {
  const result = await db
    .update(businesses)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(businesses.id, businessId))
    .returning();

  return result[0];
}

export async function deleteBusiness(businessId: number) {
  const result = await db
    .delete(businesses)
    .where(eq(businesses.id, businessId))
    .returning();

  return result[0] || null;
}

export async function getBusinessCountByTeam(teamId: number): Promise<number> {
  const result = await db
    .select({ count: count() })
    .from(businesses)
    .where(eq(businesses.teamId, teamId));

  return result[0]?.count || 0;
}

export async function getLatestFingerprint(businessId: number) {
  const result = await db
    .select()
    .from(llmFingerprints)
    .where(eq(llmFingerprints.businessId, businessId))
    .orderBy(desc(llmFingerprints.createdAt))
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

export async function createFingerprint(fingerprintData: NewLLMFingerprint) {
  const result = await db
    .insert(llmFingerprints)
    .values(fingerprintData)
    .returning();

  return result[0];
}

export async function getFingerprintHistory(
  businessId: number,
  limit: number = 10
) {
  return await db
    .select()
    .from(llmFingerprints)
    .where(eq(llmFingerprints.businessId, businessId))
    .orderBy(desc(llmFingerprints.createdAt))
    .limit(limit);
}

export async function getWikidataEntity(businessId: number) {
  const result = await db
    .select()
    .from(wikidataEntities)
    .where(eq(wikidataEntities.businessId, businessId))
    .orderBy(desc(wikidataEntities.publishedAt))
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

export async function createWikidataEntity(entityData: NewWikidataEntity) {
  const result = await db
    .insert(wikidataEntities)
    .values(entityData)
    .returning();

  return result[0];
}

export async function createCrawlJob(jobData: NewCrawlJob) {
  const result = await db
    .insert(crawlJobs)
    .values(jobData)
    .returning();

  return result[0];
}

export async function updateCrawlJob(
  jobId: number,
  updates: Partial<NewCrawlJob>
) {
  const result = await db
    .update(crawlJobs)
    .set(updates)
    .where(eq(crawlJobs.id, jobId))
    .returning();

  return result[0];
}

export async function getCrawlJob(jobId: number) {
  const result = await db
    .select()
    .from(crawlJobs)
    .where(eq(crawlJobs.id, jobId))
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

export async function getLatestCrawlJob(businessId: number) {
  const result = await db
    .select()
    .from(crawlJobs)
    .where(eq(crawlJobs.businessId, businessId))
    .orderBy(desc(crawlJobs.createdAt))
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

export async function getActiveCrawlJobs() {
  return await db
    .select()
    .from(crawlJobs)
    .where(eq(crawlJobs.status, 'processing'))
    .orderBy(crawlJobs.createdAt);
}

export async function getCompetitors(businessId: number) {
  return await db
    .select()
    .from(competitors)
    .where(eq(competitors.businessId, businessId))
    .orderBy(desc(competitors.createdAt));
}
