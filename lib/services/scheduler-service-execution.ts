/**
 * Scheduler-service Execution
 * 
 * Executes business operations and processes
 * 
 * @module scheduler-service/execution
 */

import { updateBusiness, getBusinessesByTeam } from '@/lib/db/queries';
import { getAutomationConfig, calculateNextCrawlDate, shouldAutoCrawl } from './automation-service';
import { shouldRunCFPAutomation, executeCFPAutomation } from './cfp-automation-service';
import type { Business, Team } from '@/lib/db/schema';
import { loggers } from '@/lib/utils/logger';
import { db } from '@/lib/db/drizzle';
import { teams } from '@/lib/db/schema';

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
} = {}): Promise<void> {
  const batchSize = options.batchSize || 10;
  const catchMissed = options.catchMissed !== false; // Default true
  
  log.info('Processing scheduled automation', { batchSize, catchMissed });

  // Get all teams
  const allTeams = await db.select().from(teams);
  
  const now = new Date();
  const dueBusinesses: Array<{ business: Business; team: Team }> = [];

  // Collect businesses due for processing from all teams
  for (const team of allTeams) {
    const businesses = await getBusinessesByTeam(team.id);
    
    for (const business of businesses) {
      // Only process businesses with automation enabled
      if (!business.automationEnabled) {
        continue;
      }

      // Check if business is due for processing
      const isDue = !business.nextCrawlAt || business.nextCrawlAt <= now;
      
      // Check if business missed schedule (for catchMissed option)
      const missedSchedule = business.nextCrawlAt && 
        (now.getTime() - business.nextCrawlAt.getTime()) > (7 * 24 * 60 * 60 * 1000); // 7 days

      if (isDue || (catchMissed && missedSchedule)) {
        dueBusinesses.push({ business, team });
      }
    }
  }

  // Limit to batchSize
  const businessesToProcess = dueBusinesses.slice(0, batchSize);

  log.info(`Found ${dueBusinesses.length} businesses due for processing, processing ${businessesToProcess.length}`);

  // Process each business
  for (const { business, team } of businessesToProcess) {
    try {
      await processBusinessAutomation(business, team);
    } catch (error) {
      log.error('Error processing business in scheduled automation', error, {
        businessId: business.id,
      });
    }
  }
}

/**
 * Process a single business for scheduled automation
 * 
 * Delegates to executeCFPAutomation() - the single source of truth for CFP automation.
 * This function handles scheduling logic and calls the consolidated CFP service.
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
    // Check if should run CFP automation
    if (!shouldRunCFPAutomation(business, team)) {
      log.debug('Skipping business - shouldRunCFPAutomation returned false', {
        businessId: business.id,
        automationEnabled: business.automationEnabled,
        nextCrawlAt: business.nextCrawlAt?.toISOString(),
        planName: team.planName,
      });
      return 'skipped';
    }

    const config = getAutomationConfig(team);
    log.info('Processing business for scheduled automation', {
      businessId: business.id,
      businessName: business.name,
      planName: team.planName,
      crawlFrequency: config.crawlFrequency,
    });

    // Execute CFP automation with scheduling enabled
    // DRY: Use consolidated CFP automation service (single source of truth)
    const result = await executeCFPAutomation(business.id, {
      autoPublish: undefined, // Use team config (default behavior)
      scheduleNext: true, // Scheduled runs schedule next processing
      updateStatus: true,
    });

    if (result.success) {
      log.info('Business automation completed successfully', {
        businessId: business.id,
        crawlSuccess: result.crawlSuccess,
        fingerprintSuccess: result.fingerprintSuccess,
        publishSuccess: result.publishSuccess,
        duration: result.duration,
      });
      return 'success';
    } else {
      log.error('Business automation failed', {
        businessId: business.id,
        error: result.error,
        crawlSuccess: result.crawlSuccess,
        fingerprintSuccess: result.fingerprintSuccess,
      });
      return 'failed';
    }
  } catch (error) {
    log.error('Error processing business for automation', error, { businessId: business.id });
    return 'failed';
  }
}


// Functions are already exported with their declarations above
