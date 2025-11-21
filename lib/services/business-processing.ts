/**
 * Business Processing Compatibility Layer
 * 
 * This file provides backward compatibility for existing imports
 * while the codebase migrates to the new modular structure.
 * 
 * @deprecated Use specific modules instead:
 * - business-decisions.ts for decision logic
 * - business-execution.ts for execution logic  
 * - business-orchestration.ts for orchestration logic
 */

// Re-export decision functions
export { 
  shouldCrawl, 
  canRunFingerprint,
  isBusinessReadyForProcessing,
  shouldEnableAutomation,
  getNextProcessingStep
} from './business-decisions';

// Re-export execution functions
export { 
  executeCrawlJob, 
  executeFingerprint 
} from './business-execution';

// Re-export orchestration functions
export { 
  autoStartProcessing,
  executeProcessingPipeline,
  executeManualProcessing
} from './business-orchestration';

// Legacy type exports for backward compatibility
export type {
  CrawlDecisionResult,
  FingerprintDecisionResult,
  CrawlExecutionResult,
  FingerprintExecutionResult,
  OrchestrationResult,
  ProcessingContext,
  CrawlContext,
  FingerprintContext,
  OrchestrationContext
} from './types/processing-types';

/**
 * @deprecated Use executeCrawlJob with context object instead
 */
export async function executeCrawlJobLegacy(
  jobId: number | null,
  businessId: number,
  business?: any
): Promise<void> {
  const { executeCrawlJob } = await import('./business-execution');
  
  const result = await executeCrawlJob({
    businessId,
    business,
    jobId: jobId || undefined,
    triggeredBy: 'api',
    config: {
      maxRetries: 3,
      retryDelayBase: 2000,
      timeoutMs: 30000,
      enableParallelProcessing: false,
      updateStatusDuringProcessing: true
    }
  });
  
  if (!result.success) {
    throw new Error(result.error || 'Crawl job failed');
  }
}

/**
 * @deprecated Use executeFingerprint with context object instead
 */
export async function executeFingerprintLegacy(
  business: any,
  updateStatus: boolean = true
): Promise<any> {
  const { executeFingerprint } = await import('./business-execution');
  
  const result = await executeFingerprint({
    businessId: business.id,
    business,
    triggeredBy: 'api',
    config: {
      maxRetries: 1,
      retryDelayBase: 2000,
      timeoutMs: 30000,
      enableParallelProcessing: false,
      updateStatusDuringProcessing: updateStatus
    }
  });
  
  if (!result.success) {
    // Legacy behavior: return original business on error
    return business;
  }
  
  return result.data || business;
}