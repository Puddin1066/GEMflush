/**
 * Scheduler Execution Module
 * 
 * Handles scheduled automation execution and batch processing.
 * Extracted from scheduler-service.ts for better separation of concerns.
 * 
 * SOLID: Single Responsibility - focused on execution and batch processing
 * DRY: Centralizes scheduling and batch processing logic
 */

import { getBusinessById, updateBusiness, getTeamForBusiness } from '@/lib/db/queries';
import { shouldAutoCrawl, getAutomationConfig, calculateNextCrawlDate } from '../automation-service';
import { executeCrawlJob, executeFingerprint } from '../business-processing';
import { handleAutoPublish } from './scheduler-orchestration';
import { db } from '@/lib/db/drizzle';
import { businesses, teams, type Business, type Team } from '@/lib/db/schema';
import { eq, and, or, lte, sql } from 'drizzle-orm';
import { loggers } from '@/lib/utils/logger';

const log = loggers.scheduler;

/**
 * Process scheduled automation for all businesses (frequency-aware)
 * REFACTORED: Unified function that handles weekly/monthly/daily frequencies
 * Replaces both processWeeklyCrawls() and runMonthlyProcessing()
 * 
 * Flow:
 * 1. Finds businesses due for processing (respects automation config)
 * 2. Runs full CFP pipeline: crawl + fingerprint (parallel) → publish (after crawl)
 * 3. Schedules next processing based on tier frequency
 * 
 * @param options - Processing options
 *   - batchSize: Number of businesses to process concurrently (default: 10)
 *   - catchMissed: Include businesses that missed their schedule (default: true)
 */
export async function processScheduledAutomation(options: {
  batchSize?: number;
  catchMissed?: boolean;
} = {}): Promise<{
  total: number;
  success: number;
  skipped: number;
  failed: number;
}> {
  const { batchSize = 10, catchMissed = true } = options;
  const operationId = log.start('Scheduled Automation Processing');
  
  try {
    const now = new Date();
    
    // Build query conditions
    const baseConditions = [eq(businesses.automationEnabled, true)];
    
    // Build date-based conditions
    let dateConditions;
    if (catchMissed) {
      // Catch businesses that missed their schedule (30+ days overdue) OR next crawl is due
      const thirtyDaysAgo = new Date(now);
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      dateConditions = or(
        lte(businesses.nextCrawlAt, now),
        sql`${businesses.lastCrawledAt} < ${thirtyDaysAgo.toISOString()}`,
        sql`${businesses.lastCrawledAt} IS NULL`
      );
    } else {
      // Only businesses with next crawl due
      dateConditions = lte(businesses.nextCrawlAt, now);
    }
    
    const conditions = and(...baseConditions, dateConditions);
    
    // OPTIMIZATION: Single query with JOIN to get businesses + teams
    // Eliminates N+1 query problem
    const dueBusinessesWithTeams = await db
      .select({
        business: businesses,
        team: teams,
      })
      .from(businesses)
      .innerJoin(teams, eq(businesses.teamId, teams.id))
      .where(conditions);

    log.info(`Found ${dueBusinessesWithTeams.length} businesses due for processing`, {
      count: dueBusinessesWithTeams.length,
      catchMissed,
    });

    if (dueBusinessesWithTeams.length === 0) {
      log.complete(operationId, 'Scheduled Automation Processing', {
        total: 0,
        success: 0,
        skipped: 0,
        failed: 0,
      });
      return { total: 0, success: 0, skipped: 0, failed: 0 };
    }

    // Batch process with concurrency limit
    const results = {
      success: 0,
      failed: 0,
      skipped: 0,
    };

    for (let i = 0; i < dueBusinessesWithTeams.length; i += batchSize) {
      const batch = dueBusinessesWithTeams.slice(i, i + batchSize);
      const batchNum = Math.floor(i / batchSize) + 1;
      const totalBatches = Math.ceil(dueBusinessesWithTeams.length / batchSize);
      
      log.info(`Processing batch ${batchNum}/${totalBatches}`, {
        batchSize: batch.length,
        batchNum,
        totalBatches,
      });

      const batchResults = await Promise.allSettled(
        batch.map(({ business, team }) => processBusinessAutomation(business, team))
      );

      batchResults.forEach((result, idx) => {
        if (result.status === 'fulfilled') {
          if (result.value === 'success') results.success++;
          else if (result.value === 'skipped') results.skipped++;
          else results.failed++;
        } else {
          log.error(`Business ${batch[idx].business.id} failed`, result.reason, {
            businessId: batch[idx].business.id,
          });
          results.failed++;
        }
      });
    }

    log.complete(operationId, 'Scheduled Automation Processing', {
      total: dueBusinessesWithTeams.length,
      ...results,
    });

    return {
      total: dueBusinessesWithTeams.length,
      ...results,
    };
  } catch (error) {
    log.error('Error in scheduled automation processing', error);
    log.complete(operationId, 'Scheduled Automation Processing', { status: 'error' });
    throw error;
  }
}

/**
 * Process a single business for scheduled automation
 * Runs full CFP pipeline: crawl + fingerprint (parallel) → publish
 * 
 * @param business - Business to process
 * @param team - Team for automation config
 * @returns Processing result
 */
export async function processBusinessAutomation(
  business: Business,
  team: Team
): Promise<'success' | 'skipped' | 'failed'> {
  try {
    const config = getAutomationConfig(team);
    
    // Skip if automation not configured
    if (config.crawlFrequency === 'manual') {
      log.debug('Skipping business - manual frequency', {
        businessId: business.id,
        planName: team.planName,
      });
      return 'skipped';
    }

    // Double-check shouldAutoCrawl (respects automation config)
    if (!shouldAutoCrawl(business, team)) {
      log.debug('Skipping business - shouldAutoCrawl returned false', {
        businessId: business.id,
        automationEnabled: business.automationEnabled,
        nextCrawlAt: business.nextCrawlAt?.toISOString(),
      });
      return 'skipped';
    }

    log.info('Processing business for scheduled automation', {
      businessId: business.id,
      businessName: business.name,
      planName: team.planName,
      crawlFrequency: config.crawlFrequency,
    });

    // STEP 1: Run crawl + fingerprint in parallel (they're independent!)
    const [crawlResult, fingerprintResult] = await Promise.allSettled([
      executeCrawlJob(null, business.id, business),
      executeFingerprint(business, true),
    ]);

    // Log results
    if (crawlResult.status === 'fulfilled') {
      log.info('Crawl completed for business', { businessId: business.id });
    } else {
      log.error('Crawl failed for business', crawlResult.reason, { businessId: business.id });
    }

    if (fingerprintResult.status === 'fulfilled') {
      log.info('Fingerprint completed for business', { businessId: business.id });
    } else {
      log.error('Fingerprint failed for business', fingerprintResult.reason, { businessId: business.id });
    }

    // STEP 2: Publish depends on crawl, so run after crawl completes
    if (crawlResult.status === 'fulfilled' && config.autoPublish) {
      try {
        await handleAutoPublish(business.id);
        log.info('Publication completed for business', { businessId: business.id });
      } catch (error) {
        log.error('Publication failed for business', error, { businessId: business.id });
        // Don't fail entire process if publish fails
      }
    }

    // STEP 3: Schedule next processing based on frequency
    const nextDate = calculateNextCrawlDate(config.crawlFrequency);
    await updateBusiness(business.id, {
      nextCrawlAt: nextDate,
    });

    log.info('Business scheduled for next processing', {
      businessId: business.id,
      nextCrawlAt: nextDate.toISOString(),
      frequency: config.crawlFrequency,
    });

    return 'success';
  } catch (error) {
    log.error('Error processing business for automation', error, { businessId: business.id });
    return 'failed';
  }
}
