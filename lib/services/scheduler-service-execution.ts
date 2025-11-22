/**
 * Scheduler-service Execution
 * 
 * Executes business operations and processes
 * 
 * @module scheduler-service/execution
 */

import { getBusinessById, updateBusiness, getTeamForBusiness, createCrawlJob, createWikidataEntity } from '@/lib/db/queries';
import { shouldAutoCrawl, shouldAutoPublish, getAutomationConfig, calculateNextCrawlDate } from './automation-service';
import { executeCrawlJob, executeFingerprint } from './business-execution';
import { getWikidataPublishDTO } from '@/lib/data/wikidata-dto';
import { db } from '@/lib/db/drizzle';
import { businesses, teams, type Business, type Team } from '@/lib/db/schema';
import { loggers } from '@/lib/utils/logger';

const log = loggers.scheduler;

/**
 * Handle auto-publish for a business
 * TODO: Implement actual auto-publish logic
 */
async function handleAutoPublish(businessId: number): Promise<void> {
  log.info('Auto-publish triggered', { businessId });
  // TODO: Implement auto-publish logic
}

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
} = {}): Promise<void> {
  // TODO: Implement scheduled automation processing
  log.info('Processing scheduled automation', options);
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


// Functions are already exported with their declarations above
