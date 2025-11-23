/**
 * Enhanced Business Execution Service
 * Implements parallel processing for Crawl and Fingerprint operations
 * SOLID: Single Responsibility - handles business processing execution
 * DRY: Centralized execution logic with reusable patterns
 */

import 'server-only';

import { 
  getBusinessById, 
  updateBusiness, 
  createCrawlJob, 
  updateCrawlJob,
  getTeamForBusiness 
} from '@/lib/db/queries';
// Optimized direct imports - no compatibility layer overhead
import { webCrawler } from '@/lib/crawler';
import { businessFingerprinter } from '@/lib/llm';
import { Business } from '@/lib/db/schema';
import { loggers } from '@/lib/utils/logger';
import { 
  withRetry, 
  RETRY_CONFIGS, 
  ProcessingError,
  handleParallelProcessingError,
  sanitizeErrorForLogging,
  type ErrorContext 
} from '@/lib/utils/error-handling';

const log = loggers.processing;
// Use the singleton instance from the LLM module

export interface ExecutionResult {
  success: boolean;
  businessId: number;
  error?: string;
  duration?: number;
}

export interface ParallelExecutionResult {
  crawlResult: ExecutionResult;
  fingerprintResult: ExecutionResult;
  overallSuccess: boolean;
  totalDuration: number;
}

/**
 * Execute enhanced crawl job with multi-page Firecrawl LLM extraction
 * Enhanced with comprehensive error handling and retry logic
 */
export async function executeCrawlJob(
  jobId: number | null,
  businessId: number,
  business?: Business
): Promise<ExecutionResult> {
  const startTime = Date.now();
  const context: ErrorContext = {
    operation: 'crawl',
    businessId,
    jobId: jobId ?? undefined,
  };
  
  try {
    log.info('Starting enhanced crawl job with error handling', {
      jobId: jobId ?? undefined,
      businessId,
      businessName: business?.name || 'Unknown',
    });

    // Get business if not provided (with retry for database operations)
    if (!business) {
      const fetchedBusiness = await withRetry(
        () => getBusinessById(businessId),
        { ...context, operation: 'get-business' },
        RETRY_CONFIGS.database
      );
      
      if (!fetchedBusiness) {
        throw new ProcessingError(
          `Business not found: ${businessId}`,
          'BUSINESS_NOT_FOUND',
          false,
          context
        );
      }
      
      business = fetchedBusiness;
    }

    context.url = business.url;

    // Create or update crawl job (with retry for database operations)
    let actualJobId = jobId;
    if (!actualJobId) {
      const job = await withRetry(
        () => createCrawlJob({
          businessId,
          jobType: 'enhanced_multipage_crawl',
          status: 'running',
          progress: 0,
        }),
        { ...context, operation: 'create-crawl-job' },
        RETRY_CONFIGS.database
      );
      actualJobId = job.id;
      context.jobId = actualJobId;
    } else {
      await withRetry(
        () => updateCrawlJob(actualJobId!, {
          status: 'running',
          startedAt: new Date(),
          progress: 0,
        }),
        { ...context, operation: 'update-crawl-job' },
        RETRY_CONFIGS.database
      );
    }

    // Execute enhanced multi-page crawl with retry logic
    const crawlResult = await withRetry(
      () => webCrawler.crawl(business!.url, actualJobId),
      { ...context, operation: 'firecrawl-crawl' },
      RETRY_CONFIGS.firecrawl
    );

    if (crawlResult.success && crawlResult.data) {
      // Update business with crawl data (with retry)
      await withRetry(
        () => updateBusiness(businessId, {
          crawlData: crawlResult.data,
          lastCrawledAt: new Date(),
          status: 'crawled',
        }),
        { ...context, operation: 'update-business-crawl-data' },
        RETRY_CONFIGS.database
      );

      // Update job as completed (with retry)
      await withRetry(
        () => updateCrawlJob(actualJobId!, {
          status: 'completed',
          progress: 100,
          result: crawlResult,
          completedAt: new Date(),
        }),
        { ...context, operation: 'complete-crawl-job' },
        RETRY_CONFIGS.database
      );

      const duration = Date.now() - startTime;
      log.info('Enhanced crawl job completed successfully', {
        jobId: actualJobId,
        businessId,
        duration,
        pagesProcessed: crawlResult.data.llmEnhanced?.extractedEntities?.length || 1,
      });

      return {
        success: true,
        businessId,
        duration,
      };
    } else {
      throw new ProcessingError(
        crawlResult.error || 'Crawl failed with unknown error',
        'CRAWL_FAILED',
        true,
        context
      );
    }

  } catch (error) {
    const duration = Date.now() - startTime;
    const sanitizedError = sanitizeErrorForLogging(error instanceof Error ? error : new Error(String(error)));
    
    log.error('Enhanced crawl job failed', {
      ...context,
      duration,
      error: sanitizedError,
    });

    // Update job as failed (best effort, don't throw if this fails)
    if (jobId) {
      try {
        await updateCrawlJob(jobId, {
          status: 'failed',
          progress: 0,
          errorMessage: error instanceof Error ? error.message : String(error),
          completedAt: new Date(),
        });
      } catch (updateError) {
        log.warn('Failed to update job status to failed', { jobId: jobId ?? undefined, error: updateError });
      }
    }

    return {
      success: false,
      businessId,
      error: error instanceof Error ? error.message : String(error),
      duration,
    };
  }
}

/**
 * Execute fingerprint analysis
 * Enhanced with comprehensive error handling and retry logic
 */
export async function executeFingerprint(
  business: Business,
  updateStatus: boolean = true
): Promise<ExecutionResult> {
  const startTime = Date.now();
  const context: ErrorContext = {
    operation: 'fingerprint',
    businessId: business.id,
    url: business.url,
  };
  
  try {
    log.info('Starting fingerprint analysis with error handling', {
      businessId: business.id,
      businessName: business.name,
      hasExistingCrawlData: !!business.crawlData,
    });

    // Execute fingerprint analysis with retry logic
    const fingerprintResult = await withRetry(
      () => businessFingerprinter.fingerprint(business),
      { ...context, operation: 'llm-fingerprint' },
      RETRY_CONFIGS.llm
    );

    // Save fingerprint to database (CRITICAL: ensures fingerprint data is persisted)
    const { createFingerprint } = await import('@/lib/db/queries');
    await withRetry(
      () => createFingerprint({
        businessId: business.id,
        visibilityScore: Math.round(fingerprintResult.visibilityScore),
        mentionRate: fingerprintResult.mentionRate,
        sentimentScore: fingerprintResult.sentimentScore,
        accuracyScore: fingerprintResult.accuracyScore,
        avgRankPosition: fingerprintResult.avgRankPosition,
        llmResults: fingerprintResult.llmResults as any,
        competitiveLeaderboard: fingerprintResult.competitiveLeaderboard as any,
      }),
      { ...context, operation: 'save-fingerprint' },
      RETRY_CONFIGS.database
    );

    if (updateStatus) {
      // Update business status to 'crawled' after fingerprint completes
      // Note: CFP is only complete when published to Wikidata, but 'crawled' indicates
      // that both crawl and fingerprint steps are done
      await withRetry(
        () => updateBusiness(business.id, {
          status: 'crawled',
        }),
        { ...context, operation: 'update-business-fingerprint-status' },
        RETRY_CONFIGS.database
      );
    }

    const duration = Date.now() - startTime;
    log.info('Fingerprint analysis completed successfully', {
      businessId: business.id,
      visibilityScore: fingerprintResult.visibilityScore,
      mentionRate: fingerprintResult.mentionRate,
      duration,
    });

    return {
      success: true,
      businessId: business.id,
      duration,
    };

  } catch (error) {
    const duration = Date.now() - startTime;
    const sanitizedError = sanitizeErrorForLogging(error instanceof Error ? error : new Error(String(error)));
    
    log.error('Fingerprint analysis failed', {
      ...context,
      duration,
      error: sanitizedError,
    });

    return {
      success: false,
      businessId: business.id,
      error: error instanceof Error ? error.message : String(error),
      duration,
    };
  }
}

/**
 * Execute parallel crawl and fingerprint processing
 * Enhanced with comprehensive error handling and graceful degradation
 */
export async function executeParallelProcessing(businessId: number): Promise<ParallelExecutionResult> {
  const startTime = Date.now();
  const context: ErrorContext = {
    operation: 'parallel-processing',
    businessId,
  };
  
  try {
    log.info('Starting parallel crawl and fingerprint processing with error handling', { businessId });

    // Get business data with retry
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

    // Update status to 'crawling' when processing starts (for Pro tier auto-processing)
    // This provides immediate feedback that CFP has started
    // Also reset error status to pending/crawling to allow retry
    if (business.status === 'pending' || business.status === 'error') {
      await withRetry(
        () => updateBusiness(businessId, { status: 'crawling' }),
        { ...context, operation: 'update-status-crawling' },
        RETRY_CONFIGS.database
      );
    }

    // Start both processes in parallel with independent error handling
    const [crawlResult, fingerprintResult] = await Promise.allSettled([
      executeCrawlJob(null, businessId, business),
      executeFingerprint(business, false), // Don't update status yet
    ]);

    // Extract results and errors
    const crawlSuccess = crawlResult.status === 'fulfilled' && crawlResult.value.success;
    const crawlError = crawlResult.status === 'rejected' ? crawlResult.reason : 
                      (crawlResult.status === 'fulfilled' && !crawlResult.value.success ? 
                       new Error(crawlResult.value.error || 'Crawl failed') : null);

    const fingerprintSuccess = fingerprintResult.status === 'fulfilled' && fingerprintResult.value.success;
    const fingerprintError = fingerprintResult.status === 'rejected' ? fingerprintResult.reason :
                            (fingerprintResult.status === 'fulfilled' && !fingerprintResult.value.success ?
                             new Error(fingerprintResult.value.error || 'Fingerprint failed') : null);

    // Handle errors with graceful degradation
    const errorHandling = handleParallelProcessingError(crawlError, fingerprintError, context);

    // If crawl succeeded but fingerprint failed, retry fingerprint with fresh crawl data
    if (crawlSuccess && !fingerprintSuccess && errorHandling.shouldContinue) {
      log.info('Retrying fingerprint with fresh crawl data', { businessId });
      
      try {
        const updatedBusiness = await withRetry(
          () => getBusinessById(businessId),
          { ...context, operation: 'get-updated-business' },
          RETRY_CONFIGS.database
        );
        
        if (updatedBusiness) {
          const retryResult = await executeFingerprint(updatedBusiness, true);
          
          return {
            crawlResult: crawlResult.status === 'fulfilled' ? crawlResult.value : {
              success: false,
              businessId,
              error: crawlError?.message || 'Crawl failed',
            },
            fingerprintResult: retryResult,
            overallSuccess: retryResult.success,
            totalDuration: Date.now() - startTime,
          };
        }
      } catch (retryError) {
        log.warn('Fingerprint retry failed', { businessId, error: retryError });
      }
    }

    // Update final business status with error handling
    // Note: CFP is only complete when published to Wikidata, but 'crawled' indicates
    // that both crawl and fingerprint steps are done
    try {
      if (crawlSuccess && fingerprintSuccess) {
        await withRetry(
          () => updateBusiness(businessId, { status: 'crawled' }),
          { ...context, operation: 'update-final-status-crawled' },
          RETRY_CONFIGS.database
        );
      } else if (crawlSuccess) {
        await withRetry(
          () => updateBusiness(businessId, { status: 'crawled' }),
          { ...context, operation: 'update-final-status-crawled' },
          RETRY_CONFIGS.database
        );
      } else {
        await withRetry(
          () => updateBusiness(businessId, { status: 'error' }),
          { ...context, operation: 'update-final-status-error' },
          RETRY_CONFIGS.database
        );
      }
    } catch (statusUpdateError) {
      log.warn('Failed to update final business status', { businessId, error: statusUpdateError });
    }

    // Trigger auto-publish for Pro tier after crawl completes successfully
    if (crawlSuccess) {
      try {
        const team = await getTeamForBusiness(businessId);
        if (team) {
          const { getAutomationConfig } = await import('@/lib/services/automation-service');
          const config = getAutomationConfig(team);
          
          if (config.autoPublish) {
            log.info('Triggering auto-publish for Pro tier business', { businessId, planName: team.planName });
            const { handleAutoPublish } = await import('@/lib/services/scheduler-service-decision');
            await handleAutoPublish(businessId).catch(error => {
              log.error('Auto-publish failed', error, { businessId });
              // Don't fail entire process if publish fails
            });
          } else {
            log.debug('Auto-publish disabled for team', { businessId, planName: team.planName, autoPublish: config.autoPublish });
          }
        }
      } catch (error) {
        log.warn('Failed to trigger auto-publish', { businessId, error });
        // Don't fail entire process if auto-publish check fails
      }
    }

    const overallSuccess = crawlSuccess && fingerprintSuccess;
    const totalDuration = Date.now() - startTime;

    log.info('Parallel processing completed', {
      businessId,
      crawlSuccess,
      fingerprintSuccess,
      overallSuccess,
      degradedMode: errorHandling.degradedMode,
      totalDuration,
      errors: errorHandling.errors,
    });

    return {
      crawlResult: crawlResult.status === 'fulfilled' ? crawlResult.value : {
        success: false,
        businessId,
        error: crawlError?.message || 'Crawl failed',
      },
      fingerprintResult: fingerprintResult.status === 'fulfilled' ? fingerprintResult.value : {
        success: false,
        businessId,
        error: fingerprintError?.message || 'Fingerprint failed',
      },
      overallSuccess,
      totalDuration,
    };

  } catch (error) {
    const totalDuration = Date.now() - startTime;
    const sanitizedError = sanitizeErrorForLogging(error instanceof Error ? error : new Error(String(error)));
    
    log.error('Parallel processing failed completely', {
      ...context,
      totalDuration,
      error: sanitizedError,
    });

    // Try to update business status to error (best effort)
    try {
      await updateBusiness(businessId, { status: 'error' });
    } catch (statusError) {
      log.warn('Failed to update business status to error', { businessId, error: statusError });
    }

    return {
      crawlResult: {
        success: false,
        businessId,
        error: error instanceof Error ? error.message : String(error),
      },
      fingerprintResult: {
        success: false,
        businessId,
        error: error instanceof Error ? error.message : String(error),
      },
      overallSuccess: false,
      totalDuration,
    };
  }
}

/**
 * Auto-start processing for new businesses
 * Enhanced to use parallel processing
 */
export async function autoStartProcessing(businessId: number): Promise<ExecutionResult> {
  try {
    log.info('Auto-starting enhanced processing', { businessId });

    const result = await executeParallelProcessing(businessId);
    
    return {
      success: result.overallSuccess,
      businessId,
      duration: result.totalDuration,
      error: result.overallSuccess ? undefined : 'One or more processes failed',
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    log.error('Auto-start processing failed', error, { businessId });

    return {
      success: false,
      businessId,
      error: errorMessage,
    };
  }
}

// Export legacy functions for backward compatibility
export const executeCrawlJobLegacy = executeCrawlJob;
export const executeFingerprintLegacy = executeFingerprint;
