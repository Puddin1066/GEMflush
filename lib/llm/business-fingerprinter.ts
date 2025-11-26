/**
 * Multi-Dimensional Business Fingerprinter
 * Orchestrates the complete business visibility analysis across 3 LLM models
 * 
 * Features:
 * - Comprehensive business visibility analysis
 * - Multi-model parallel processing (GPT-4, Claude, Gemini)
 * - Context-aware prompt generation
 * - Sophisticated response analysis
 * - Competitive positioning insights
 * - Performance monitoring and optimization
 * - Seamless integration with crawler data
 */

import { 
  IBusinessFingerprinter, 
  BusinessContext, 
  FingerprintAnalysis,
  BusinessVisibilityMetrics,
  CompetitiveLeaderboard,
  LLMQuery,
  LLMResult,
  DEFAULT_MODELS,
  DEFAULT_CONFIG,
  IPromptGenerator,
  IParallelProcessor
} from './types';
import { Business } from '@/lib/db/schema';
import { CrawledData } from '@/lib/types/domain/gemflush';
import { promptGenerator as defaultPromptGenerator } from './prompt-generator';
import { parallelProcessor as defaultParallelProcessor } from './parallel-processor';
import { loggers } from '@/lib/utils/logger';
import { filterValidResults } from './result-filter';
import { businessToContext as convertBusinessToContext } from './business-context';
import { VisibilityMetricsService } from './visibility-metrics-service';
import { LeaderboardService } from './leaderboard-service';

const log = loggers.fingerprint;

// ============================================================================
// CONSTANTS
// ============================================================================

const PROMPT_TEMPERATURES = {
  factual: 0.3,        // Lower temperature for factual queries
  opinion: 0.5,        // Medium temperature for opinion queries
  recommendation: 0.7, // Higher temperature for creative recommendations
} as const;

const PROMPT_TYPES: Array<'factual' | 'opinion' | 'recommendation'> = [
  'factual',
  'opinion',
  'recommendation',
];

// ============================================================================
// FINGERPRINTING STRATEGIES
// ============================================================================

interface FingerprintingSession {
  sessionId: string;
  businessContext: BusinessContext;
  startTime: number;
  queries: LLMQuery[];
  results?: LLMResult[];
  analysis?: FingerprintAnalysis;
}

// ============================================================================
// MAIN FINGERPRINTER CLASS
// ============================================================================

export class BusinessFingerprinter implements IBusinessFingerprinter {
  private readonly models = DEFAULT_MODELS;
  private readonly config = DEFAULT_CONFIG;
  private readonly promptGenerator: IPromptGenerator;
  private readonly parallelProcessor: IParallelProcessor;
  private readonly visibilityService: VisibilityMetricsService;
  private readonly leaderboardService: LeaderboardService;
  
  constructor(
    promptGenerator?: IPromptGenerator,
    parallelProcessor?: IParallelProcessor,
    visibilityService?: VisibilityMetricsService,
    leaderboardService?: LeaderboardService
  ) {
    // DIP: Use dependency injection with default fallbacks for backward compatibility
    // Use imported singletons as defaults to avoid initialization order issues
    this.promptGenerator = promptGenerator || defaultPromptGenerator;
    this.parallelProcessor = parallelProcessor || defaultParallelProcessor;
    this.visibilityService = visibilityService || new VisibilityMetricsService(this.models);
    this.leaderboardService = leaderboardService || new LeaderboardService();
  }
  
  /**
   * Generate comprehensive business fingerprint analysis
   */
  async fingerprint(business: Business): Promise<FingerprintAnalysis> {
    const context = this.businessToContext(business);
    return this.fingerprintWithContext(context);
  }
  
  /**
   * Generate fingerprint analysis with full business context
   */
  async fingerprintWithContext(context: BusinessContext): Promise<FingerprintAnalysis> {
    const session = this.createFingerprintingSession(context);
    
    log.info('Starting business fingerprinting', {
      sessionId: session.sessionId,
      businessName: context.name,
      hasLocation: !!context.location,
      hasCrawlData: !!context.crawlData,
      models: this.models,
      queryCount: session.queries.length
    });
    
    try {
      // Execute all LLM queries in parallel
      // DIP: Use injected dependency
      session.results = await this.parallelProcessor.processQueries(session.queries, context.name);
      
      // Generate comprehensive analysis
      session.analysis = this.generateAnalysis(session);
      
      const processingTime = Date.now() - session.startTime;
      
      log.info('Business fingerprinting completed', {
        sessionId: session.sessionId,
        businessName: context.name,
        processingTime,
        visibilityScore: session.analysis.visibilityScore,
        mentionRate: session.analysis.mentionRate,
        sentimentScore: session.analysis.sentimentScore,
        competitorCount: session.analysis.competitiveLeaderboard.competitors.length
      });
      
      return session.analysis;
      
    } catch (error) {
      log.error('Business fingerprinting failed', error, { 
        sessionId: session.sessionId,
        businessName: context.name 
      });
      
      // Return fallback analysis
      return this.createFallbackAnalysis(context, Date.now() - session.startTime);
    }
  }
  
  /**
   * Create a new fingerprinting session
   */
  private createFingerprintingSession(context: BusinessContext): FingerprintingSession {
    const sessionId = this.generateSessionId();
    const startTime = Date.now();
    const prompts = this.promptGenerator.generatePrompts(context);
    const queries = this.createQueriesForAllModels(prompts);
    
    return {
      sessionId,
      businessContext: context,
      startTime,
      queries
    };
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return `fp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Create queries for all model-prompt combinations
   * DRY: Extracted to reduce duplication
   */
  private createQueriesForAllModels(prompts: { factual: string; opinion: string; recommendation: string }): LLMQuery[] {
    const queries: LLMQuery[] = [];
    
    for (const model of this.models) {
      for (const promptType of PROMPT_TYPES) {
        queries.push(this.createQuery(model, promptType, prompts[promptType]));
      }
    }
    
    return queries;
  }

  /**
   * Create a single LLM query
   * DRY: Extracted to reduce duplication
   */
  private createQuery(
    model: string,
    promptType: 'factual' | 'opinion' | 'recommendation',
    prompt: string
  ): LLMQuery {
    return {
      model,
      prompt,
      promptType,
      temperature: PROMPT_TEMPERATURES[promptType],
      maxTokens: this.config.maxTokens
    };
  }
  
  /**
   * Generate comprehensive analysis from LLM results
   */
  private generateAnalysis(session: FingerprintingSession): FingerprintAnalysis {
    const { businessContext, results, startTime } = session;
    
    // GREEN: Only return fallback if results is explicitly null/undefined
    // Empty array means queries were processed but returned no results (different from error case)
    // We should still process empty arrays to calculate metrics (they'll be 0)
    if (!results) {
      return this.createFallbackAnalysis(businessContext, Date.now() - startTime);
    }
    
    // GREEN: Filter out null/undefined results but keep empty arrays for processing
    // DRY: Use shared filtering utility
    const validResults = filterValidResults(results);
    
    
    // SRP: Delegate to specialized services
    // Calculate visibility metrics
    const metrics = this.visibilityService.calculateMetrics(validResults);
    
    // Generate competitive leaderboard
    const competitiveLeaderboard = this.leaderboardService.generateLeaderboard(validResults, businessContext.name);
    
    // Create comprehensive analysis
    const analysis: FingerprintAnalysis = {
      businessId: businessContext.businessId || 0, // Use businessId from context if available
      businessName: businessContext.name,
      metrics,
      competitiveLeaderboard,
      llmResults: results,
      generatedAt: new Date(),
      processingTime: Date.now() - startTime,
      
      // Legacy compatibility fields
      visibilityScore: metrics.visibilityScore,
      mentionRate: metrics.mentionRate,
      sentimentScore: metrics.sentimentScore,
      accuracyScore: metrics.confidenceLevel, // Map confidence to accuracy
      avgRankPosition: metrics.avgRankPosition
    };
    
    // Log detailed analysis results
    this.logAnalysisResults(analysis);
    
    return analysis;
  }
  
  /**
   * Convert Business entity to BusinessContext
   * DRY: Use shared conversion utility
   */
  private businessToContext(business: Business): BusinessContext {
    return convertBusinessToContext(business);
  }
  
  /**
   * Create fallback analysis for error cases
   */
  private createFallbackAnalysis(context: BusinessContext, processingTime: number): FingerprintAnalysis {
    const fallbackMetrics: BusinessVisibilityMetrics = {
      visibilityScore: 0,
      mentionRate: 0,
      sentimentScore: 0.5,
      confidenceLevel: 0,
      avgRankPosition: null,
      totalQueries: this.models.length * 3, // 3 models × 3 prompt types
      successfulQueries: 0
    };
    
    const fallbackLeaderboard: CompetitiveLeaderboard = {
      targetBusiness: {
        name: context.name,
        avgPosition: null,
        mentionCount: 0
      },
      competitors: [],
      totalRecommendationQueries: 0
    };
    
    return {
      businessId: context.businessId || 0,
      businessName: context.name,
      metrics: fallbackMetrics,
      competitiveLeaderboard: fallbackLeaderboard,
      llmResults: [],
      generatedAt: new Date(),
      processingTime,
      
      // Legacy compatibility
      visibilityScore: 0,
      mentionRate: 0,
      sentimentScore: 0.5,
      accuracyScore: 0,
      avgRankPosition: null
    };
  }
  
  /**
   * Log detailed analysis results for monitoring
   */
  private logAnalysisResults(analysis: FingerprintAnalysis): void {
    // Calculate simple stats for logging
    const validResults = filterValidResults(analysis.llmResults);
    const mentionedCount = validResults.filter(r => r.mentioned).length;
    
    log.info('Fingerprint analysis summary', {
      businessName: analysis.businessName,
      visibilityScore: analysis.visibilityScore,
      mentionRate: Math.round(analysis.mentionRate), // mentionRate is already a percentage (0-100)
      sentimentScore: Math.round(analysis.sentimentScore * 100),
      confidenceLevel: Math.round(analysis.metrics.confidenceLevel * 100),
      avgRankPosition: analysis.avgRankPosition,
      competitorCount: analysis.competitiveLeaderboard.competitors.length,
      processingTime: analysis.processingTime,
      queryStats: {
        totalQueries: analysis.llmResults.length,
        successfulQueries: validResults.length,
        mentionRate: validResults.length > 0 ? Math.round((mentionedCount / validResults.length) * 100) : 0
      }
    });
  }
  
  /**
   * Get fingerprinting capabilities and configuration
   */
  getCapabilities(): {
    models: string[];
    promptTypes: string[];
    maxConcurrency: number;
    cachingEnabled: boolean;
  } {
    return {
      models: [...this.models],
      promptTypes: ['factual', 'opinion', 'recommendation'],
      maxConcurrency: this.config.parallelism.maxConcurrency,
      cachingEnabled: this.config.caching.enabled
    };
  }
}

// Export singleton instance
export const businessFingerprinter = new BusinessFingerprinter();