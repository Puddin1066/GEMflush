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
  DEFAULT_CONFIG
} from './types';
import { Business } from '@/lib/db/schema';
import { CrawledData } from '@/lib/types/gemflush';
import { promptGenerator } from './prompt-generator';
import { parallelProcessor } from './parallel-processor';
import { loggers } from '@/lib/utils/logger';

const log = loggers.fingerprint;

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
      session.results = await parallelProcessor.processQueries(session.queries, context.name);
      
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
    const sessionId = `fp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();
    
    // Generate prompts for all combinations
    const prompts = promptGenerator.generatePrompts(context);
    
    // Create queries for all model-prompt combinations
    const queries: LLMQuery[] = [];
    
    for (const model of this.models) {
      // Factual query
      queries.push({
        model,
        prompt: prompts.factual,
        promptType: 'factual',
        temperature: 0.3, // Lower temperature for factual queries
        maxTokens: this.config.maxTokens
      });
      
      // Opinion query
      queries.push({
        model,
        prompt: prompts.opinion,
        promptType: 'opinion',
        temperature: 0.5, // Medium temperature for opinion queries
        maxTokens: this.config.maxTokens
      });
      
      // Recommendation query
      queries.push({
        model,
        prompt: prompts.recommendation,
        promptType: 'recommendation',
        temperature: 0.7, // Higher temperature for creative recommendations
        maxTokens: this.config.maxTokens
      });
    }
    
    return {
      sessionId,
      businessContext: context,
      startTime,
      queries
    };
  }
  
  /**
   * Generate comprehensive analysis from LLM results
   */
  private generateAnalysis(session: FingerprintingSession): FingerprintAnalysis {
    const { businessContext, results, startTime } = session;
    
    if (!results || results.length === 0) {
      return this.createFallbackAnalysis(businessContext, Date.now() - startTime);
    }
    
    // Calculate visibility metrics
    const metrics = this.calculateVisibilityMetrics(results);
    
    // Generate competitive leaderboard
    const competitiveLeaderboard = this.generateCompetitiveLeaderboard(results, businessContext.name);
    
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
   * Calculate comprehensive visibility metrics
   */
  private calculateVisibilityMetrics(results: LLMResult[]): BusinessVisibilityMetrics {
    const validResults = results.filter(r => !r.error);
    const totalQueries = results.length;
    const successfulQueries = validResults.length;
    
    if (successfulQueries === 0) {
      return {
        visibilityScore: 0,
        mentionRate: 0,
        sentimentScore: 0,
        confidenceLevel: 0,
        avgRankPosition: null,
        totalQueries,
        successfulQueries
      };
    }
    
    // Calculate mention rate (as percentage 0-100, not decimal 0-1)
    // DRY: Store as percentage to match DTO expectations
    const mentionedResults = validResults.filter(r => r.mentioned);
    const mentionRate = successfulQueries > 0 
      ? (mentionedResults.length / successfulQueries) * 100 
      : 0;
    
    // Calculate sentiment score (0-1 scale)
    const sentimentScores = mentionedResults.map(r => {
      switch (r.sentiment) {
        case 'positive': return 1;
        case 'negative': return 0;
        case 'neutral': return 0.5;
        default: return 0.5;
      }
    });
    
    const avgSentimentScore = sentimentScores.length > 0 
      ? sentimentScores.reduce((sum, score) => sum + score, 0) / sentimentScores.length
      : 0.5;
    
    // Calculate average confidence
    const avgConfidence = validResults.reduce((sum, r) => sum + r.confidence, 0) / successfulQueries;
    
    // Calculate average rank position (only for mentioned results with rankings)
    const rankedResults = mentionedResults.filter(r => r.rankPosition !== null);
    const avgRankPosition = rankedResults.length > 0
      ? rankedResults.reduce((sum, r) => sum + (r.rankPosition || 0), 0) / rankedResults.length
      : null;
    
    // Calculate overall visibility score (0-100)
    // Note: mentionRate is now a percentage (0-100), but calculateVisibilityScore expects decimal (0-1)
    const visibilityScore = this.calculateVisibilityScore({
      mentionRate: mentionRate / 100, // Convert percentage to decimal for score calculation
      sentimentScore: avgSentimentScore,
      confidenceLevel: avgConfidence,
      avgRankPosition,
      successfulQueries,
      totalQueries
    });
    
    return {
      visibilityScore,
      mentionRate,
      sentimentScore: avgSentimentScore,
      confidenceLevel: avgConfidence,
      avgRankPosition,
      totalQueries,
      successfulQueries
    };
  }
  
  /**
   * Calculate overall visibility score using weighted formula
   */
  private calculateVisibilityScore(metrics: {
    mentionRate: number;
    sentimentScore: number;
    confidenceLevel: number;
    avgRankPosition: number | null;
    successfulQueries: number;
    totalQueries: number;
  }): number {
    // Base score from mention rate (0-40 points)
    const mentionScore = metrics.mentionRate * 40;
    
    // Sentiment bonus/penalty (0-25 points)
    const sentimentScore = metrics.sentimentScore * 25;
    
    // Confidence bonus (0-20 points)
    const confidenceScore = metrics.confidenceLevel * 20;
    
    // Ranking bonus (0-15 points, higher for better rankings)
    let rankingScore = 0;
    if (metrics.avgRankPosition !== null) {
      // Better rankings (lower numbers) get higher scores
      rankingScore = Math.max(0, 15 - (metrics.avgRankPosition - 1) * 3);
    }
    
    // Query success penalty (reduce score if many queries failed)
    const successRate = metrics.successfulQueries / metrics.totalQueries;
    const successPenalty = (1 - successRate) * 10;
    
    const rawScore = mentionScore + sentimentScore + confidenceScore + rankingScore - successPenalty;
    
    // Ensure score is between 0 and 100
    return Math.max(0, Math.min(100, Math.round(rawScore)));
  }
  
  /**
   * Generate competitive leaderboard from results
   */
  private generateCompetitiveLeaderboard(results: LLMResult[], businessName: string): CompetitiveLeaderboard {
    // Focus on recommendation queries for competitive analysis
    const recommendationResults = results.filter(r => r.promptType === 'recommendation' && !r.error);
    
    if (recommendationResults.length === 0) {
      return {
        targetBusiness: {
          name: businessName,
          rank: null,
          mentionCount: 0,
          avgPosition: null
        },
        competitors: [],
        totalRecommendationQueries: 0
      };
    }
    
    // Collect all competitor mentions
    const competitorMentions = new Map<string, { count: number; positions: number[]; appearsWithTarget: number }>();
    
    let targetMentionCount = 0;
    let targetPositions: number[] = [];
    
    for (const result of recommendationResults) {
      // Track target business
      if (result.mentioned) {
        targetMentionCount++;
        if (result.rankPosition !== null) {
          targetPositions.push(result.rankPosition);
        }
      }
      
      // Track competitors
      for (const competitor of result.competitorMentions) {
        if (!competitorMentions.has(competitor)) {
          competitorMentions.set(competitor, { count: 0, positions: [], appearsWithTarget: 0 });
        }
        
        const competitorData = competitorMentions.get(competitor)!;
        competitorData.count++;
        
        // If target business was also mentioned, increment co-occurrence
        if (result.mentioned) {
          competitorData.appearsWithTarget++;
        }
        
        // Try to extract position for this competitor (simplified approach)
        // In a more sophisticated implementation, we'd parse the full response structure
        const estimatedPosition = this.estimateCompetitorPosition(result.rawResponse, competitor);
        if (estimatedPosition !== null) {
          competitorData.positions.push(estimatedPosition);
        }
      }
    }
    
    // Build competitor list
    const competitors = Array.from(competitorMentions.entries())
      .map(([name, data]) => ({
        name,
        mentionCount: data.count,
        avgPosition: data.positions.length > 0 
          ? data.positions.reduce((sum, pos) => sum + pos, 0) / data.positions.length
          : 0,
        appearsWithTarget: data.appearsWithTarget
      }))
      .sort((a, b) => b.mentionCount - a.mentionCount) // Sort by mention count
      .slice(0, 10); // Top 10 competitors
    
    // Calculate target business rank
    const targetRank = targetMentionCount > 0 && targetPositions.length > 0
      ? Math.round(targetPositions.reduce((sum, pos) => sum + pos, 0) / targetPositions.length)
      : null;
    
    const targetAvgPosition = targetPositions.length > 0
      ? targetPositions.reduce((sum, pos) => sum + pos, 0) / targetPositions.length
      : null;
    
    return {
      targetBusiness: {
        name: businessName,
        rank: targetRank,
        mentionCount: targetMentionCount,
        avgPosition: targetAvgPosition
      },
      competitors,
      totalRecommendationQueries: recommendationResults.length
    };
  }
  
  /**
   * Estimate competitor position in response (simplified heuristic)
   */
  private estimateCompetitorPosition(response: string, competitorName: string): number | null {
    const lines = response.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.toLowerCase().includes(competitorName.toLowerCase())) {
        // Look for numbered list pattern
        const numberMatch = line.match(/^\s*(\d+)[\.\)]/);
        if (numberMatch) {
          const position = parseInt(numberMatch[1], 10);
          if (position >= 1 && position <= 10) {
            return position;
          }
        }
      }
    }
    
    return null;
  }
  
  /**
   * Convert Business entity to BusinessContext
   */
  private businessToContext(business: Business): BusinessContext {
    return {
      businessId: business.id,
      name: business.name,
      url: business.url,
      category: business.category || undefined,
      location: business.location ? {
        city: business.location.city,
        state: business.location.state,
        country: business.location.country
      } : undefined,
      crawlData: business.crawlData || undefined
    };
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
        rank: null,
        mentionCount: 0,
        avgPosition: null
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
    const stats = parallelProcessor.getProcessingStats(analysis.llmResults);
    
    log.info('Fingerprint analysis summary', {
      businessName: analysis.businessName,
      visibilityScore: analysis.visibilityScore,
      mentionRate: Math.round(analysis.mentionRate), // mentionRate is already a percentage (0-100)
      sentimentScore: Math.round(analysis.sentimentScore * 100),
      confidenceLevel: Math.round(analysis.metrics.confidenceLevel * 100),
      avgRankPosition: analysis.avgRankPosition,
      competitorCount: analysis.competitiveLeaderboard.competitors.length,
      processingTime: analysis.processingTime,
      queryStats: stats
    });
    
    // Log model performance breakdown
    for (const [model, performance] of Object.entries(stats.modelPerformance)) {
      log.debug('Model performance', {
        model,
        queries: performance.queries,
        mentions: performance.mentions,
        mentionRate: Math.round((performance.mentions / performance.queries) * 100),
        avgConfidence: Math.round(performance.avgConfidence * 100)
      });
    }
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