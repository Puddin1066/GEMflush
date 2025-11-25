/**
 * Streamlined LLM Module - Main Entry Point
 * 
 * Efficient, focused implementation for business fingerprinting across 3 LLM models
 * Designed for parallel execution with crawler module and clean database integration
 * 
 * Features:
 * - Pure OpenRouter API integration across GPT-4, Claude, and Gemini
 * - Parallel processing with intelligent batching
 * - Multi-dimensional business visibility analysis
 * - Context-aware prompt generation
 * - Sophisticated response analysis
 * - Optimized for speed and cost efficiency
 * - Clean separation of concerns
 * - Comprehensive error handling and fallbacks
 */

// ============================================================================
// CORE EXPORTS
// ============================================================================

// Main services
export { OpenRouterClient, openRouterClient } from './openrouter-client';
export { BusinessFingerprinter, businessFingerprinter } from './business-fingerprinter';
export { PromptGenerator, promptGenerator } from './prompt-generator';
export { ResponseAnalyzer, responseAnalyzer } from './response-analyzer';
export { ParallelProcessor, parallelProcessor } from './parallel-processor';

// Services (extracted for SOLID compliance)
export { VisibilityMetricsService } from './visibility-metrics-service';
export { LeaderboardService } from './leaderboard-service';

// Utilities
export { businessToContext } from './business-context';
export { estimateCompetitorPosition } from './position-estimator';
export { filterValidResults, filterByPromptType, filterMentionedResults, filterRankedResults } from './result-filter';
export { calculateVisibilityScore, SCORE_WEIGHTS } from './score-calculator';
export { MockResponseGenerator } from './mock-response-generator';

// ============================================================================
// TYPE EXPORTS
// ============================================================================

// Core LLM types
export type {
  LLMQuery,
  LLMResponse,
  LLMResult,
  LLMError,
  LLMConfig
} from './types';

// Business fingerprinting types
export type {
  FingerprintAnalysis,
  BusinessVisibilityMetrics,
  CompetitiveLeaderboard,
  BusinessContext
} from './types';

// Analysis types
export type {
  MentionAnalysis,
  SentimentAnalysis,
  CompetitorAnalysis,
  GeneratedPrompts,
  PromptTemplate
} from './types';

// Service interfaces
export type {
  IOpenRouterClient,
  IBusinessFingerprinter,
  IPromptGenerator,
  IResponseAnalyzer,
  IParallelProcessor
} from './types';

// Constants
export {
  DEFAULT_MODELS,
  DEFAULT_CONFIG
} from './types';

// ============================================================================
// CONVENIENCE EXPORTS
// ============================================================================

// Legacy compatibility (deprecated - use businessFingerprinter directly)
export { businessFingerprinter as llmFingerprinter } from './business-fingerprinter';

// Quick access functions (for backward compatibility)
import { businessFingerprinter } from './business-fingerprinter';
export const fingerprint = businessFingerprinter.fingerprint.bind(businessFingerprinter);
export const fingerprintWithContext = businessFingerprinter.fingerprintWithContext.bind(businessFingerprinter);

// ============================================================================
// MODULE UTILITIES (Optional - can be tree-shaken if unused)
// ============================================================================

/**
 * Get module capabilities and configuration
 * @deprecated Use businessFingerprinter.getCapabilities() directly
 */
export function getModuleInfo() {
  return {
    name: 'LLM Business Fingerprinting Module',
    version: '2.0.0',
    models: businessFingerprinter.getCapabilities().models,
    capabilities: businessFingerprinter.getCapabilities(),
    features: [
      'Multi-model parallel processing',
      'Context-aware prompt generation',
      'Sophisticated response analysis',
      'Competitive positioning insights',
      'Development caching',
      'Error handling and fallbacks'
    ]
  };
}