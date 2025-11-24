/**
 * CFP Execution Service
 * 
 * PRIMARY VALUE: Executes automated sequential CFP (Crawl → Fingerprint → Publish) flow
 * 
 * This is the SINGLE source of truth for CFP automation EXECUTION/ORCHESTRATION.
 * All other services delegate to this service to eliminate duplication.
 * 
 * SOLID: Single Responsibility - CFP execution/orchestration only (not configuration)
 * DRY: No duplication - one implementation used everywhere
 * 
 * Uses automation-service.ts for configuration/decision logic (pure functions).
 * Uses business-execution.ts for individual operation execution.
 */

import 'server-only';

import { getBusinessById, updateBusiness, getTeamForBusiness } from '@/lib/db/queries';
import { executeCrawlJob, executeFingerprint } from './business-execution';
import { handleAutoPublish } from './scheduler-service-decision';
import { 
  getAutomationConfig, 
  shouldAutoCrawl, 
  calculateNextCrawlDate 
} from './automation-service';
import { Business, Team } from '@/lib/db/schema';
import { loggers } from '@/lib/utils/logger';
import { 
  withRetry, 
  RETRY_CONFIGS, 
  ProcessingError,
  sanitizeErrorForLogging,
  type ErrorContext 
} from '@/lib/utils/error-handling';

const log = loggers.processing;

// ============================================================================
// TYPES
// ============================================================================

export interface CFPExecutionOptions {
  /** Whether to auto-publish after crawl completes (default: based on team config) */
  autoPublish?: boolean;
  /** Whether to update next scheduled processing date (default: false for on-demand) */
  scheduleNext?: boolean;
  /** Whether to update business status during processing (default: true) */
  updateStatus?: boolean;
}

export interface CFPExecutionResult {
  success: boolean;
  businessId: number;
  crawlSuccess: boolean;
  fingerprintSuccess: boolean;
  publishSuccess: boolean;
  error?: string;
  duration: number;
}

// ============================================================================
// PRIMARY CFP AUTOMATION FUNCTION
// ============================================================================

/**
 * Execute complete CFP automation for a business
 * 
 * This is the PRIMARY CFP automation flow:
 * 1. Crawl + Fingerprint (parallel)
 * 2. Auto-publish (if enabled)
 * 3. Schedule next processing (if scheduled)
 * 
 * SINGLE SOURCE OF TRUTH - All CFP automation orchestration happens here.
 * 
 * @param businessId - Business ID to process
 * @param options - Execution options
 */
export async function executeCFPAutomation(
  businessId: number,
  options: CFPExecutionOptions = {}
): Promise<CFPExecutionResult> {
  const startTime = Date.now();
  const context: ErrorContext = {
    operation: 'cfp-automation',
    businessId,
  };

  try {
    log.info('Starting CFP automation', { businessId, options });

    // Get business with retry
    const business = await withRetry(
      () => getBusinessById(businessId),
      { ...context, operation: 'get-business' },
      RETRY_CONFIGS.database
    );

    if (!business) {
      throw new ProcessingError(
        `Business not found: ${businessId}`,
        'BUSINESS_NOT_FOUND',
        false,
        context
      );
    }

    context.url = business.url;

    // Get team for automation config
    const team = await withRetry(
      () => getTeamForBusiness(businessId),
      { ...context, operation: 'get-team' },
      RETRY_CONFIGS.database
    );

    if (!team) {
      throw new ProcessingError(
        `Team not found for business: ${businessId}`,
        'TEAM_NOT_FOUND',
        false,
        context
      );
    }

    // Determine auto-publish (use option or team config)
    const config = getAutomationConfig(team);
    const shouldPublish = options.autoPublish ?? config.autoPublish;

    log.info('CFP automation configuration', {
      businessId,
      businessName: business.name,
      planName: team.planName,
      autoPublish: shouldPublish,
      scheduleNext: options.scheduleNext,
      currentStatus: business.status,
    });

    // Update status to 'crawling' if enabled
    if (options.updateStatus !== false) {
      if (business.status === 'pending' || business.status === 'error') {
        log.info('Updating business status to crawling', { 
          businessId, 
          previousStatus: business.status 
        });
        await withRetry(
          () => updateBusiness(businessId, { status: 'crawling' }),
          { ...context, operation: 'update-status-crawling' },
          RETRY_CONFIGS.database
        );
      }
    }

    // STEP 1: Execute Crawl + Fingerprint in parallel
    log.info('Starting parallel crawl and fingerprint execution', { businessId });
    const [crawlResult, fingerprintResult] = await Promise.allSettled([
      executeCrawlJob(null, businessId, business),
      executeFingerprint(business, false), // Status updated later
    ]);

    // Extract results
    const crawlSuccess = crawlResult.status === 'fulfilled' && crawlResult.value.success;
    const crawlError: Error | null = crawlResult.status === 'rejected'
      ? (crawlResult.reason instanceof Error ? crawlResult.reason : new Error(String(crawlResult.reason)))
      : (crawlResult.status === 'fulfilled' && !crawlResult.value.success
         ? new Error(crawlResult.value.error || 'Crawl failed')
         : null);

    const fingerprintSuccess = fingerprintResult.status === 'fulfilled' && fingerprintResult.value.success;
    const fingerprintError: Error | null = fingerprintResult.status === 'rejected'
      ? (fingerprintResult.reason instanceof Error ? fingerprintResult.reason : new Error(String(fingerprintResult.reason)))
      : (fingerprintResult.status === 'fulfilled' && !fingerprintResult.value.success
         ? new Error(fingerprintResult.value.error || 'Fingerprint failed')
         : null);

    log.info('Parallel execution completed', {
      businessId,
      crawlSuccess,
      fingerprintSuccess,
      crawlError: crawlError?.message,
      fingerprintError: fingerprintError?.message,
    });

    // Retry fingerprint if crawl succeeded but fingerprint failed (fresh crawl data available)
    let finalFingerprintSuccess = fingerprintSuccess;
    if (crawlSuccess && !fingerprintSuccess && fingerprintError) {
      log.info('Retrying fingerprint with fresh crawl data', { businessId });
      
      try {
        const updatedBusiness = await withRetry(
          () => getBusinessById(businessId),
          { ...context, operation: 'get-updated-business' },
          RETRY_CONFIGS.database
        );

        if (updatedBusiness) {
          const retryResult = await executeFingerprint(updatedBusiness, true);
          finalFingerprintSuccess = retryResult.success;
          
          if (finalFingerprintSuccess) {
            log.info('Fingerprint retry succeeded', { businessId });
          } else {
            log.warn('Fingerprint retry failed', { 
              businessId, 
              error: retryResult.error 
            });
          }
        }
      } catch (retryError) {
        log.warn('Fingerprint retry exception', { 
          businessId, 
          error: retryError instanceof Error ? retryError.message : String(retryError)
        });
      }
    }

    // STEP 2: Update final status if enabled
    if (options.updateStatus !== false) {
      try {
        if (crawlSuccess && finalFingerprintSuccess) {
          await withRetry(
            () => updateBusiness(businessId, { status: 'crawled' }),
            { ...context, operation: 'update-final-status-crawled' },
            RETRY_CONFIGS.database
          );
        } else if (!crawlSuccess && !finalFingerprintSuccess) {
          await withRetry(
            () => updateBusiness(businessId, { status: 'error' }),
            { ...context, operation: 'update-final-status-error' },
            RETRY_CONFIGS.database
          );
        }
        // Partial success: keep 'crawling' status for retry
      } catch (statusError) {
        log.warn('Failed to update final business status', { 
          businessId, 
          error: statusError instanceof Error ? statusError.message : String(statusError)
        });
      }
    }

    // STEP 3: Auto-publish if enabled and crawl succeeded
    let publishSuccess = false;
    if (crawlSuccess && shouldPublish) {
      try {
        log.info('Triggering auto-publish', { businessId, planName: team.planName });
        await handleAutoPublish(businessId);
        publishSuccess = true;
        log.info('Auto-publish completed', { businessId });
      } catch (error) {
        log.error('Auto-publish failed', error, { businessId });
        // Don't fail entire CFP if publish fails
      }
    } else {
      log.debug('Auto-publish skipped', { 
        businessId, 
        crawlSuccess, 
        shouldPublish,
        planName: team.planName 
      });
    }

    // STEP 4: Schedule next processing if enabled
    if (options.scheduleNext && crawlSuccess) {
      try {
        const nextDate = calculateNextCrawlDate(config.crawlFrequency);
        await withRetry(
          () => updateBusiness(businessId, { nextCrawlAt: nextDate }),
          { ...context, operation: 'schedule-next-processing' },
          RETRY_CONFIGS.database
        );
        log.info('Next processing scheduled', {
          businessId,
          nextCrawlAt: nextDate.toISOString(),
          frequency: config.crawlFrequency,
        });
      } catch (scheduleError) {
        log.warn('Failed to schedule next processing', { 
          businessId, 
          error: scheduleError instanceof Error ? scheduleError.message : String(scheduleError)
        });
      }
    }

    const duration = Date.now() - startTime;
    const success = crawlSuccess && finalFingerprintSuccess;

    log.info('CFP automation completed', {
      businessId,
      success,
      crawlSuccess,
      fingerprintSuccess: finalFingerprintSuccess,
      publishSuccess,
      duration,
    });

    return {
      success,
      businessId,
      crawlSuccess,
      fingerprintSuccess: finalFingerprintSuccess,
      publishSuccess,
      duration,
    };

  } catch (error) {
    const duration = Date.now() - startTime;
    const sanitizedError = sanitizeErrorForLogging(
      error instanceof Error ? error : new Error(String(error))
    );

    log.error('CFP automation failed', {
      ...context,
      duration,
      error: sanitizedError,
    });

    return {
      success: false,
      businessId,
      crawlSuccess: false,
      fingerprintSuccess: false,
      publishSuccess: false,
      error: error instanceof Error ? error.message : String(error),
      duration,
    };
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Check if business should run CFP automation
 * 
 * DRY: Delegates to shouldAutoCrawl() from automation-config-service.
 * This is a convenience wrapper that uses the same decision logic.
 * 
 * @param business - Business to check
 * @param team - Team for automation config
 */
export function shouldRunCFPAutomation(business: Business, team: Team | null): boolean {
  // DRY: Use the same decision logic from automation-config-service
  return shouldAutoCrawl(business, team);
}

