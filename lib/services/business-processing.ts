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

// Decision functions (simplified for current implementation)
export const shouldCrawl = (business: any) => !business.crawlData;
export const canRunFingerprint = (business: any) => !!business.crawlData;
export const isBusinessReadyForProcessing = (business: any) => !!business.url;
export const shouldEnableAutomation = (business: any) => true;
export const getNextProcessingStep = (business: any) => business.crawlData ? 'fingerprint' : 'crawl';

// Execution functions (simplified for current implementation)
export const executeCrawlJob = async (jobId: any, businessId: number, business?: any) => {
  // This would typically trigger the crawl process
  console.log(`[MOCK] executeCrawlJob called for business ${businessId}`);
  return { success: true, businessId };
};

export const executeFingerprint = async (business: any, force?: boolean) => {
  // This would typically trigger the fingerprint process
  console.log(`[MOCK] executeFingerprint called for business ${business?.id || 'unknown'}`);
  return business;
};

// Orchestration functions (simplified for current implementation)
export const autoStartProcessing = async (businessId: number) => {
  console.log(`[MOCK] autoStartProcessing called for business ${businessId}`);
  return { success: true, businessId };
};

export const executeProcessingPipeline = async (business: any, options?: any) => {
  console.log(`[MOCK] executeProcessingPipeline called for business ${business?.id || 'unknown'}`);
  return { success: true, business };
};

export const executeManualProcessing = async (businessId: number, steps: string[]) => {
  console.log(`[MOCK] executeManualProcessing called for business ${businessId}, steps:`, steps);
  return { success: true, businessId, steps };
};

// Legacy type definitions for backward compatibility
export type CrawlDecisionResult = { shouldCrawl: boolean; reason: string };
export type FingerprintDecisionResult = { canFingerprint: boolean; reason: string };
export type CrawlExecutionResult = { success: boolean; businessId: number; error?: string };
export type FingerprintExecutionResult = { success: boolean; data?: any; error?: string };
export type OrchestrationResult = { success: boolean; business: any };
export type ProcessingContext = { businessId: number; triggeredBy: string; config: any };
export type CrawlContext = ProcessingContext & { jobId?: number };
export type FingerprintContext = ProcessingContext & { force?: boolean };
export type OrchestrationContext = ProcessingContext & { steps: string[] };

/**
 * @deprecated Use executeCrawlJob with context object instead
 */
export async function executeCrawlJobLegacy(
  jobId: number | null,
  businessId: number,
  business?: any
): Promise<void> {
  // Use the local implementation
  const executeCrawlJob = async (jobId: any, businessId: number, business?: any) => {
    console.log(`[LEGACY] executeCrawlJob called for business ${businessId}`);
    return { success: true, businessId };
  };
  
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
  // Use the local implementation
  const executeFingerprint = async (business: any, force?: boolean) => {
    console.log(`[LEGACY] executeFingerprint called for business ${business?.id || 'unknown'}`);
    return business;
  };
  
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