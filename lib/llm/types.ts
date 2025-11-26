/**
 * Streamlined LLM Module Type Definitions
 * Efficient types for multi-dimensional business fingerprinting across 3 OpenRouter models
 */

import { Business } from '@/lib/db/schema';
import { CrawledData } from '@/lib/types/domain/gemflush';

// ============================================================================
// CORE LLM TYPES
// ============================================================================

export interface LLMQuery {
  model: string;
  prompt: string;
  promptType: 'factual' | 'opinion' | 'recommendation';
  temperature?: number;
  maxTokens?: number;
}

export interface LLMResponse {
  content: string;
  tokensUsed: number;
  model: string;
  requestId?: string;
  cached?: boolean;
  processingTime?: number;
}

export interface LLMResult {
  model: string;
  promptType: 'factual' | 'opinion' | 'recommendation';
  mentioned: boolean;
  sentiment: 'positive' | 'neutral' | 'negative';
  confidence: number;
  rankPosition: number | null;
  competitorMentions: string[];
  rawResponse: string;
  tokensUsed: number;
  prompt: string;
  processingTime: number;
  error?: string;
}

// ============================================================================
// BUSINESS FINGERPRINTING TYPES
// ============================================================================

export interface BusinessVisibilityMetrics {
  visibilityScore: number; // 0-100 overall visibility score
  mentionRate: number; // 0-1 percentage of queries where business was mentioned
  sentimentScore: number; // 0-1 average sentiment across all mentions
  confidenceLevel: number; // 0-1 average confidence across all results
  avgRankPosition: number | null; // Average ranking position when mentioned
  totalQueries: number; // Total number of LLM queries executed
  successfulQueries: number; // Number of successful queries
}

export interface CompetitiveLeaderboard {
  targetBusiness: {
    name: string;
    avgPosition: number | null; // REFACTOR: Consolidated rank and avgPosition into single field
    mentionCount: number;
  };
  competitors: Array<{
    name: string;
    mentionCount: number;
    avgPosition: number;
    appearsWithTarget: number;
  }>;
  totalRecommendationQueries: number;
}

export interface FingerprintAnalysis {
  businessId: number;
  businessName: string;
  metrics: BusinessVisibilityMetrics;
  competitiveLeaderboard: CompetitiveLeaderboard;
  llmResults: LLMResult[];
  generatedAt: Date;
  processingTime: number;
  
  // Legacy compatibility for database storage
  visibilityScore: number;
  mentionRate: number;
  sentimentScore: number;
  accuracyScore: number;
  avgRankPosition: number | null;
}

// ============================================================================
// CONTEXT AND PROMPT TYPES
// ============================================================================

export interface BusinessContext {
  businessId?: number; // Optional business ID for analysis
  name: string;
  url: string;
  category?: string;
  location?: {
    city?: string;
    state?: string;
    country?: string;
  };
  crawlData?: CrawledData;
}

export interface PromptTemplate {
  type: 'factual' | 'opinion' | 'recommendation';
  template: string;
  variables: string[];
}

export interface GeneratedPrompts {
  factual: string;
  opinion: string;
  recommendation: string;
}

// ============================================================================
// ANALYSIS TYPES
// ============================================================================

export interface MentionAnalysis {
  mentioned: boolean;
  confidence: number;
  matchType: 'exact' | 'partial' | 'contextual' | 'none';
  variants: string[];
  reasoning?: string;
}

export interface SentimentAnalysis {
  sentiment: 'positive' | 'neutral' | 'negative';
  confidence: number;
  score: number; // -1 to 1 scale
  keywords: string[];
  reasoning?: string;
}

export interface CompetitorAnalysis {
  competitors: string[];
  confidence: number;
  reasoning?: string;
}

// ============================================================================
// CONFIGURATION TYPES
// ============================================================================

export interface LLMConfig {
  models: string[];
  parallelism: {
    enabled: boolean;
    batchSize: number;
    maxConcurrency: number;
  };
  caching: {
    enabled: boolean;
    ttl: number; // seconds
  };
  retries: {
    maxAttempts: number;
    backoffMs: number;
  };
  temperature: number;
  maxTokens: number;
}

// ============================================================================
// ERROR TYPES
// ============================================================================

export interface LLMError extends Error {
  code: string;
  model?: string;
  promptType?: string;
  retryable: boolean;
  context?: Record<string, any>;
}

// ============================================================================
// SERVICE CONTRACTS
// ============================================================================

export interface IOpenRouterClient {
  query(model: string, prompt: string, options?: Partial<LLMQuery>): Promise<LLMResponse>;
  queryParallel(queries: LLMQuery[]): Promise<LLMResponse[]>;
  getDefaultModels(): string[];
}

export interface IBusinessFingerprinter {
  fingerprint(business: Business): Promise<FingerprintAnalysis>;
  fingerprintWithContext(context: BusinessContext): Promise<FingerprintAnalysis>;
}

export interface IPromptGenerator {
  generatePrompts(context: BusinessContext): GeneratedPrompts;
  generateFactualPrompt(context: BusinessContext): string;
  generateOpinionPrompt(context: BusinessContext): string;
  generateRecommendationPrompt(context: BusinessContext): string;
}

export interface IResponseAnalyzer {
  analyzeMention(response: string, businessName: string): MentionAnalysis;
  analyzeSentiment(response: string, businessName: string): SentimentAnalysis;
  analyzeCompetitors(response: string, businessName: string): CompetitorAnalysis;
  analyzeResponse(response: LLMResponse, businessName: string, promptType: string): LLMResult;
}

export interface IParallelProcessor {
  processQueries(queries: LLMQuery[], businessName: string): Promise<LLMResult[]>;
  processWithAnalysis(queries: LLMQuery[], context: BusinessContext): Promise<LLMResult[]>;
}

// ============================================================================
// CONSTANTS
// ============================================================================

export const DEFAULT_MODELS = [
  'openai/gpt-4-turbo',      // Best for factual analysis and accuracy
  'anthropic/claude-3-opus', // Best for nuanced sentiment analysis
  'google/gemini-2.5-flash', // Best for competitive analysis and rankings (updated: valid OpenRouter model ID)
] as const;

export const DEFAULT_CONFIG: LLMConfig = {
  models: [...DEFAULT_MODELS],
  parallelism: {
    enabled: true,
    batchSize: 9, // 3 models × 3 prompts
    maxConcurrency: 3, // Process 3 models in parallel
  },
  caching: {
    enabled: process.env.NODE_ENV !== 'production',
    ttl: 24 * 60 * 60, // 24 hours in seconds
  },
  retries: {
    maxAttempts: 3,
    backoffMs: 1000,
  },
  temperature: 0.7,
  maxTokens: 2000,
};

export type ModelName = typeof DEFAULT_MODELS[number];
export type PromptType = 'factual' | 'opinion' | 'recommendation';