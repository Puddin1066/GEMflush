/**
 * KGaaS Query Functions
 * 
 * Commercial KGaaS query layer for retrieving data efficiently
 * 
 * TDD: This file was created to satisfy tests in kgaas-queries.tdd.test.ts
 * Following RED → GREEN → REFACTOR cycle
 * 
 * SOLID: Single Responsibility - query functions only
 * DRY: Reusable query patterns
 */

import 'server-only';
import { db } from './drizzle';
import {
  users,
  teams,
  teamMembers,
  businesses,
  crawlJobs,
  llmFingerprints,
  wikidataEntities,
  emailLogs,
} from './schema';
import { eq, and, desc, sql, count, sum, avg } from 'drizzle-orm';

/**
 * Get user with team and KGaaS access permissions
 * 
 * @param userId - User ID
 * @returns User with team and permissions
 */
export async function getUserWithKGaaSAccess(userId: number) {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    with: {
      teamMembers: {
        with: {
          team: true,
        },
      },
    },
  });

  if (!user) {
    return null;
  }

  const team = user.teamMembers[0]?.team || null;
  const canAccessKGaaS = team !== null;

  return {
    id: user.id,
    team,
    canAccessKGaaS,
  };
}

/**
 * Get all crawl jobs for a business
 * 
 * @param businessId - Business ID
 * @returns Array of crawl jobs
 */
export async function getCrawlJobsForBusiness(businessId: number) {
  return await db
    .select()
    .from(crawlJobs)
    .where(eq(crawlJobs.businessId, businessId))
    .orderBy(desc(crawlJobs.createdAt));
}

/**
 * Get email logs for a team
 * 
 * @param teamId - Team ID
 * @returns Array of email logs
 */
export async function getEmailLogsForTeam(teamId: number) {
  return await db
    .select()
    .from(emailLogs)
    .where(eq(emailLogs.teamId, teamId))
    .orderBy(desc(emailLogs.createdAt));
}

/**
 * Get all LLM fingerprints for a business
 * 
 * @param businessId - Business ID
 * @returns Array of fingerprints
 */
export async function getLLMFingerprintsForBusiness(businessId: number) {
  return await db
    .select()
    .from(llmFingerprints)
    .where(eq(llmFingerprints.businessId, businessId))
    .orderBy(desc(llmFingerprints.createdAt));
}

/**
 * Get all Wikidata entities for a business
 * 
 * @param businessId - Business ID
 * @returns Array of entities
 */
export async function getWikidataEntitiesForBusiness(businessId: number) {
  return await db
    .select()
    .from(wikidataEntities)
    .where(eq(wikidataEntities.businessId, businessId))
    .orderBy(desc(wikidataEntities.publishedAt));
}

/**
 * Get commercial KGaaS metrics for a team
 * 
 * @param teamId - Team ID
 * @returns Metrics including usage, costs, and performance
 */
export async function getKGaaSMetricsForTeam(teamId: number) {
  // Get email logs with KGaaS operation types
  // Using SQL template for LIKE query
  const kgaaSLogsResult = await db
    .select()
    .from(emailLogs)
    .where(
      and(
        eq(emailLogs.teamId, teamId),
        sql`${emailLogs.type}::text LIKE 'kgaas_%'`
      )
    );

  // Ensure we have an array
  const kgaaSLogs = Array.isArray(kgaaSLogsResult) ? kgaaSLogsResult : [];

  // Calculate metrics
  const totalOperations = kgaaSLogs.length;
  const totalCost = kgaaSLogs.reduce((sum, log) => {
    const metadata = log.metadata as any;
    return sum + (metadata?.cost || 0);
  }, 0);

  const durations = kgaaSLogs
    .map(log => {
      const metadata = log.metadata as any;
      return metadata?.duration || 0;
    })
    .filter(d => d > 0);

  const averageDuration = durations.length > 0
    ? durations.reduce((sum, d) => sum + d, 0) / durations.length
    : 0;

  // Group operations by type
  const operationsByType: Record<string, number> = {};
  kgaaSLogs.forEach(log => {
    const type = log.type.replace('kgaas_', '');
    operationsByType[type] = (operationsByType[type] || 0) + 1;
  });

  return {
    totalOperations,
    totalCost,
    averageDuration: Math.round(averageDuration),
    operationsByType,
  };
}

