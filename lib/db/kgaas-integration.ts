/**
 * KGaaS Database Integration Layer
 * 
 * Connects @db to @auth, @crawler, @email, @llm, @wikidata modules
 * Stores and retrieves data relevant to commercial KGaaS interests
 * 
 * TDD: This file was created to satisfy tests in kgaas-integration.tdd.test.ts
 * Following RED → GREEN → REFACTOR cycle
 * 
 * SOLID: Single Responsibility - database integration only
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
  type NewCrawlJob,
  type NewLLMFingerprint,
  type NewWikidataEntity,
  type NewEmailLog,
} from './schema';
import { eq, and } from 'drizzle-orm';

/**
 * Get user with team and KGaaS access permissions
 * 
 * @param userId - User ID
 * @returns User with team and access permissions
 */
export async function getUserWithTeamForKGaaS(userId: number) {
  const result = await db.query.users.findFirst({
    where: eq(users.id, userId),
    with: {
      teamMembers: {
        with: {
          team: true,
        },
      },
    },
  });

  if (!result) {
    return null;
  }

  const team = result.teamMembers[0]?.team || null;
  const canAccessKGaaS = team !== null; // All team members can access KGaaS

  return {
    user: result,
    team,
    canAccessKGaaS,
  };
}

/**
 * Store crawler result with business relationship
 * 
 * @param businessId - Business ID
 * @param crawlResult - Crawler result data
 * @returns Created crawl job
 */
export async function storeCrawlerResult(
  businessId: number,
  crawlResult: {
    success: boolean;
    data?: any;
    metadata?: any;
    error?: string;
  }
) {
  const jobData: NewCrawlJob = {
    businessId,
    jobType: 'enhanced_multipage_crawl',
    status: crawlResult.success ? 'completed' : 'failed',
    progress: crawlResult.success ? 100 : 0,
    result: crawlResult.data || null,
    errorMessage: crawlResult.error || null,
    firecrawlMetadata: crawlResult.metadata || null,
    completedAt: crawlResult.success ? new Date() : null,
    startedAt: new Date(),
  };

  const result = await db.insert(crawlJobs).values(jobData).returning();
  return result[0] || null;
}

/**
 * Store email log for notifications and audit
 * 
 * @param emailData - Email data
 * @returns Created email log
 */
export async function storeEmailLog(
  emailData: {
    to: string;
    type: string;
    subject?: string;
    teamId?: number;
    userId?: number;
    businessId?: number;
    status?: 'pending' | 'sent' | 'failed' | 'bounced';
    errorMessage?: string;
    metadata?: any;
  }
): Promise<typeof emailLogs.$inferSelect> {
  const logData: NewEmailLog = {
    to: emailData.to,
    type: emailData.type,
    subject: emailData.subject || null,
    teamId: emailData.teamId || null,
    userId: emailData.userId || null,
    businessId: emailData.businessId || null,
    status: emailData.status || 'pending',
    sentAt: emailData.status === 'sent' ? new Date() : null,
    errorMessage: emailData.errorMessage || null,
    metadata: emailData.metadata || null,
  };

  const result = await db.insert(emailLogs).values(logData).returning();
  return result[0] || null;
}

/**
 * Store LLM fingerprint with business context
 * 
 * @param businessId - Business ID
 * @param fingerprintData - Fingerprint data
 * @returns Created fingerprint
 */
export async function storeLLMFingerprint(
  businessId: number,
  fingerprintData: {
    visibilityScore: number;
    mentionRate?: number;
    sentimentScore?: number;
    accuracyScore?: number;
    avgRankPosition?: number;
    llmResults?: any;
    competitiveBenchmark?: any;
    competitiveLeaderboard?: any;
  }
) {
  const fingerprint: NewLLMFingerprint = {
    businessId,
    visibilityScore: fingerprintData.visibilityScore,
    mentionRate: fingerprintData.mentionRate || null,
    sentimentScore: fingerprintData.sentimentScore || null,
    accuracyScore: fingerprintData.accuracyScore || null,
    avgRankPosition: fingerprintData.avgRankPosition || null,
    llmResults: fingerprintData.llmResults || null,
    competitiveBenchmark: fingerprintData.competitiveBenchmark || null,
    competitiveLeaderboard: fingerprintData.competitiveLeaderboard || null,
  };

  const result = await db.insert(llmFingerprints).values(fingerprint).returning();
  return result[0] || null;
}

/**
 * Store Wikidata entity with versioning and enrichment tracking
 * 
 * @param businessId - Business ID
 * @param entityData - Entity data
 * @returns Created entity
 */
export async function storeWikidataEntity(
  businessId: number,
  entityData: {
    qid: string;
    entityData: any;
    publishedTo: string;
    version?: number;
    enrichmentLevel?: number;
  }
) {
  const entity: NewWikidataEntity = {
    businessId,
    qid: entityData.qid,
    entityData: entityData.entityData,
    publishedTo: entityData.publishedTo,
    version: entityData.version || 1,
    enrichmentLevel: entityData.enrichmentLevel || 1,
    lastEnrichedAt: new Date(),
  };

  const result = await db.insert(wikidataEntities).values(entity).returning();
  return result[0] || null;
}

/**
 * Track commercial KGaaS metrics (usage, performance, costs)
 * 
 * @param teamId - Team ID
 * @param operation - Operation data
 */
export async function trackKGaaSMetrics(
  teamId: number,
  operation: {
    type: string;
    businessId?: number;
    cost?: number;
    duration?: number;
    success?: boolean;
  }
) {
  // Store metrics in metadata field of activity_logs or create separate metrics table
  // For now, we'll use activity_logs to track operations
  await db.insert(emailLogs).values({
    teamId,
    businessId: operation.businessId || null,
    to: 'system@kgaas.com', // Placeholder for system tracking
    type: `kgaas_${operation.type}`,
    subject: `KGaaS Operation: ${operation.type}`,
    status: operation.success !== false ? 'sent' : 'failed',
    metadata: {
      cost: operation.cost || 0,
      duration: operation.duration || 0,
      success: operation.success !== false,
    },
  });
}

/**
 * Get business with all relationships for data integrity
 * 
 * @param businessId - Business ID
 * @returns Business with all related data
 */
export async function getBusinessWithRelations(businessId: number) {
  const business = await db.query.businesses.findFirst({
    where: eq(businesses.id, businessId),
    with: {
      crawlJobs: {
        orderBy: (jobs, { desc }) => [desc(jobs.createdAt)],
        limit: 10,
      },
      llmFingerprints: {
        orderBy: (fingerprints, { desc }) => [desc(fingerprints.createdAt)],
        limit: 10,
      },
      wikidataEntities: {
        orderBy: (entities, { desc }) => [desc(entities.publishedAt)],
        limit: 10,
      },
      team: true,
    },
  });

  return business;
}

