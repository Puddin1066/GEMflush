/**
 * Shared Result Filtering Utilities
 * DRY: Centralized logic for filtering valid LLM results
 */

import type { LLMResult } from '../types';

/**
 * Filter out invalid results (null, undefined, or with errors)
 * DRY: Used across business-fingerprinter and other services
 */
export function filterValidResults(results: (LLMResult | null | undefined)[]): LLMResult[] {
  return results.filter(r => {
    if (!r || typeof r !== 'object') return false;
    if (!('model' in r) || !('promptType' in r)) return false;
    if (r.error) return false;
    return true;
  }) as LLMResult[];
}

/**
 * Filter results by prompt type
 */
export function filterByPromptType(
  results: LLMResult[], 
  promptType: 'factual' | 'opinion' | 'recommendation'
): LLMResult[] {
  return results.filter(r => r.promptType === promptType);
}

/**
 * Filter results that mention the business
 */
export function filterMentionedResults(results: LLMResult[]): LLMResult[] {
  return results.filter(r => r.mentioned);
}

/**
 * Filter results with rankings
 */
export function filterRankedResults(results: LLMResult[]): LLMResult[] {
  return results.filter(r => r.rankPosition !== null);
}


