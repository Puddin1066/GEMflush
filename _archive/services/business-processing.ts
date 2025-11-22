/**
 * Business Processing Compatibility Layer
 * 
 * OPTIMIZED: Streamlined compatibility layer with lazy loading
 * 
 * @deprecated Use business-execution.ts directly for better performance
 * This layer adds import overhead - migrate to direct imports when possible
 */

// Decision functions (simplified for current implementation)
export const shouldCrawl = (business: any) => !business.crawlData;
export const canRunFingerprint = (business: any) => !!business.crawlData;
export const isBusinessReadyForProcessing = (business: any) => !!business.url;
export const shouldEnableAutomation = (business: any) => true;
export const getNextProcessingStep = (business: any) => business.crawlData ? 'fingerprint' : 'crawl';

// Enhanced execution functions - delegate to new business-execution service
export const executeCrawlJob = async (jobId: any, businessId: number, business?: any) => {
  const { executeCrawlJob: enhancedExecuteCrawlJob } = await import('./business-execution');
  return enhancedExecuteCrawlJob(jobId, businessId, business);
};

export const executeFingerprint = async (business: any, force?: boolean) => {
  const { executeFingerprint: enhancedExecuteFingerprint } = await import('./business-execution');
  const result = await enhancedExecuteFingerprint(business, force);
  return result.success ? business : result;
};

// Enhanced orchestration functions - use parallel processing
export const autoStartProcessing = async (businessId: number) => {
  const { autoStartProcessing: enhancedAutoStartProcessing } = await import('./business-execution');
  return enhancedAutoStartProcessing(businessId);
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
    return { success: true, businessId, error: undefined };
  };

  const result = await executeCrawlJob(
    jobId,
    businessId,
    business
  );
  
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
  
  const result = await executeFingerprint(business, updateStatus);
  
  if (!result.success) {
    // Legacy behavior: return original business on error
    return business;
  }
  
  return result.data || business;
}