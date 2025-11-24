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
  
  // P0 Fix: Declare actualJobId outside try block so it's available in catch block
  // DRY: Reuse this variable for error handling
  let actualJobId: number | null = jobId;
  
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
    // P0 Fix: Convert null to undefined for webCrawler.crawl (expects number | undefined)
    const crawlResult = await withRetry(
      () => webCrawler.crawl(business!.url, actualJobId ?? undefined),
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

    // P0 Fix: Use actualJobId instead of jobId (actualJobId is created even if jobId is null)
    // DRY: Reuse actualJobId variable that was set earlier
    const jobIdToUpdate = actualJobId || jobId;
    
    // Update job as failed (best effort, don't throw if this fails)
    if (jobIdToUpdate) {
      try {
        await updateCrawlJob(jobIdToUpdate, {
          status: 'failed',
          progress: 0,
          errorMessage: error instanceof Error ? error.message : String(error),
          completedAt: new Date(),
        });
        log.info('Crawl job marked as failed with error message', {
          jobId: jobIdToUpdate,
          errorMessage: error instanceof Error ? error.message : String(error),
        });
      } catch (updateError) {
        log.warn('Failed to update job status to failed', { 
          jobId: jobIdToUpdate, 
          error: updateError 
        });
      }
    } else {
      log.warn('Cannot update crawl job - no job ID available', {
        businessId,
        originalJobId: jobId,
        actualJobId,
      });
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
 * 
 * @deprecated Use executeCFPAutomation() from cfp-automation-service.ts instead
 * This function is kept for backward compatibility and delegates to the consolidated CFP automation service.
 * 
 * All CFP orchestration logic has been moved to cfp-automation-service.ts to eliminate duplication.
 */
export async function executeParallelProcessing(businessId: number): Promise<ParallelExecutionResult> {
  // Delegate to consolidated CFP automation service (DRY: single source of truth)
  const { executeCFPAutomation } = await import('./cfp-automation-service');
  const result = await executeCFPAutomation(businessId, {
    updateStatus: true,
    scheduleNext: false, // Parallel processing doesn't schedule next run
  });

  // Convert to ParallelExecutionResult format for backward compatibility
  return {
    crawlResult: {
      success: result.crawlSuccess,
      businessId: result.businessId,
      duration: result.duration,
      error: result.crawlSuccess ? undefined : (result.error || 'Crawl failed'),
    },
    fingerprintResult: {
      success: result.fingerprintSuccess,
      businessId: result.businessId,
      duration: result.duration,
      error: result.fingerprintSuccess ? undefined : (result.error || 'Fingerprint failed'),
    },
    overallSuccess: result.success,
    totalDuration: result.duration,
  };
}

/**
 * Auto-start processing for new businesses
 * 
 * Delegates to executeCFPAutomation() - the single source of truth for CFP automation.
 * This wrapper maintains backward compatibility while using the consolidated service.
 */
export async function autoStartProcessing(businessId: number): Promise<ExecutionResult> {
  try {
    log.info('Auto-starting CFP automation', { businessId });

    // Use consolidated CFP automation service
    const { executeCFPAutomation } = await import('./cfp-automation-service');
    const result = await executeCFPAutomation(businessId, {
      updateStatus: true,
      scheduleNext: false, // On-demand doesn't schedule next processing
    });
    
    return {
      success: result.success,
      businessId: result.businessId,
      duration: result.duration,
      error: result.success ? undefined : result.error,
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
