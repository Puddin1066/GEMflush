/**
 * Scheduler-service Execution
 * 
 * Executes business operations and processes
 * 
 * @module scheduler-service/execution
 */

import { updateBusiness } from '@/lib/db/queries';
import { getAutomationConfig, calculateNextCrawlDate, shouldAutoCrawl } from './automation-service';
import { shouldRunCFPAutomation, executeCFPAutomation } from './cfp-automation-service';
import type { Business, Team } from '@/lib/db/schema';
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
} = {}): Promise<void> {
  // TODO: Implement scheduled automation processing
  log.info('Processing scheduled automation', options);
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
