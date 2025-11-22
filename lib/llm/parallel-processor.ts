/**
 * Parallel LLM Processing Engine
 * Orchestrates parallel execution of LLM queries with intelligent batching and analysis
 * 
 * Features:
 * - Intelligent batching for optimal performance
 * - Parallel execution across 3 models
 * - Integrated response analysis
 * - Error handling and fallback strategies
 * - Performance monitoring and optimization
 * - Rate limiting and cost optimization
 */

import { 
  IParallelProcessor, 
  LLMQuery, 
  LLMResult,
  BusinessContext,
  DEFAULT_MODELS,
  DEFAULT_CONFIG
} from './types';
import { openRouterClient } from './openrouter-client';
import { responseAnalyzer } from './response-analyzer';
import { loggers } from '@/lib/utils/logger';

const log = loggers.processing;

// ============================================================================
// PROCESSING STRATEGIES
// ============================================================================

interface ProcessingBatch {
  queries: LLMQuery[];
  businessName: string;
  batchId: string;
}

interface BatchResult {
  batchId: string;
  results: LLMResult[];
  processingTime: number;
  successCount: number;
  errorCount: number;
}

// ============================================================================
// MAIN PROCESSOR CLASS
// ============================================================================

export class ParallelProcessor implements IParallelProcessor {
  private readonly config = DEFAULT_CONFIG;
  
  /**
   * Process multiple LLM queries in parallel with analysis
   */
  async processQueries(queries: LLMQuery[], businessName: string): Promise<LLMResult[]> {
    const startTime = Date.now();
    
    log.info('Starting parallel LLM processing', {
      queryCount: queries.length,
      businessName,
      models: [...new Set(queries.map(q => q.model))],
      promptTypes: [...new Set(queries.map(q => q.promptType))],
    });
    
    try {
      // Execute queries in parallel
      const responses = await openRouterClient.queryParallel(queries);
      
      // Analyze responses in parallel
      const analysisPromises = responses.map((response, index) => {
        const query = queries[index];
        return this.analyzeResponseSafely(response, query, businessName);
      });
      
      const results = await Promise.all(analysisPromises);
      
      // Add prompts to results
      results.forEach((result, index) => {
        result.prompt = queries[index].prompt;
      });
      
      const processingTime = Date.now() - startTime;
      const successCount = results.filter(r => !r.error).length;
      
      log.info('Parallel LLM processing completed', {
        queryCount: queries.length,
        successCount,
        errorCount: results.length - successCount,
        processingTime,
        avgConfidence: this.calculateAverageConfidence(results),
        mentionRate: this.calculateMentionRate(results),
      });
      
      return results;
      
    } catch (error) {
      log.error('Parallel processing failed', error, { businessName, queryCount: queries.length });
      
      // Return fallback results
      return queries.map((query, index) => this.createFallbackResult(query, businessName, index));
    }
  }
  
  /**
   * Process queries with full business context
   */
  async processWithAnalysis(queries: LLMQuery[], context: BusinessContext): Promise<LLMResult[]> {
    return this.processQueries(queries, context.name);
  }
  
  /**
   * Create optimized query batches for the 3-model fingerprinting workflow
   */
  createOptimizedBatches(queries: LLMQuery[], businessName: string): ProcessingBatch[] {
    const batches: ProcessingBatch[] = [];
    const batchSize = this.config.parallelism.batchSize;
    
    // Group queries by model for better batching
    const modelGroups = this.groupQueriesByModel(queries);
    
    // Create batches that mix models for optimal parallel execution
    let batchIndex = 0;
    const allQueries = Object.values(modelGroups).flat();
    
    for (let i = 0; i < allQueries.length; i += batchSize) {
      const batchQueries = allQueries.slice(i, i + batchSize);
      
      batches.push({
        queries: batchQueries,
        businessName,
        batchId: `batch_${batchIndex++}_${Date.now()}`
      });
    }
    
    return batches;
  }
  
  /**
   * Process batches with intelligent scheduling
   */
  async processBatches(batches: ProcessingBatch[]): Promise<LLMResult[]> {
    const startTime = Date.now();
    const allResults: LLMResult[] = [];
    
    log.info('Processing optimized batches', {
      batchCount: batches.length,
      totalQueries: batches.reduce((sum, batch) => sum + batch.queries.length, 0)
    });
    
    // Process batches with controlled concurrency
    const maxConcurrentBatches = Math.min(this.config.parallelism.maxConcurrency, batches.length);
    
    for (let i = 0; i < batches.length; i += maxConcurrentBatches) {
      const concurrentBatches = batches.slice(i, i + maxConcurrentBatches);
      
      const batchPromises = concurrentBatches.map(batch => 
        this.processSingleBatch(batch)
      );
      
      const batchResults = await Promise.all(batchPromises);
      
      // Collect results from all batches
      for (const batchResult of batchResults) {
        allResults.push(...batchResult.results);
      }
      
      // Add delay between batch groups to be respectful to API
      if (i + maxConcurrentBatches < batches.length) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }
    
    log.info('Batch processing completed', {
      batchCount: batches.length,
      totalResults: allResults.length,
      processingTime: Date.now() - startTime
    });
    
    return allResults;
  }
  
  /**
   * Process a single batch of queries
   */
  private async processSingleBatch(batch: ProcessingBatch): Promise<BatchResult> {
    const startTime = Date.now();
    
    try {
      const results = await this.processQueries(batch.queries, batch.businessName);
      
      return {
        batchId: batch.batchId,
        results,
        processingTime: Date.now() - startTime,
        successCount: results.filter(r => !r.error).length,
        errorCount: results.filter(r => r.error).length
      };
      
    } catch (error) {
      log.error('Batch processing failed', error, { batchId: batch.batchId });
      
      // Return fallback results for the entire batch
      const fallbackResults = batch.queries.map((query, index) => 
        this.createFallbackResult(query, batch.businessName, index)
      );
      
      return {
        batchId: batch.batchId,
        results: fallbackResults,
        processingTime: Date.now() - startTime,
        successCount: 0,
        errorCount: fallbackResults.length
      };
    }
  }
  
  /**
   * Group queries by model for optimal batching
   */
  private groupQueriesByModel(queries: LLMQuery[]): Record<string, LLMQuery[]> {
    const groups: Record<string, LLMQuery[]> = {};
    
    for (const query of queries) {
      if (!groups[query.model]) {
        groups[query.model] = [];
      }
      groups[query.model].push(query);
    }
    
    return groups;
  }
  
  /**
   * Safely analyze a response with error handling
   */
  private async analyzeResponseSafely(
    response: any, 
    query: LLMQuery, 
    businessName: string
  ): Promise<LLMResult> {
    try {
      return responseAnalyzer.analyzeResponse(response, businessName, query.promptType);
    } catch (error) {
      log.error('Response analysis failed', error, { 
        model: query.model, 
        promptType: query.promptType 
      });
      
      // Return fallback result with error
      return {
        model: query.model,
        promptType: query.promptType,
        mentioned: false,
        sentiment: 'neutral',
        confidence: 0,
        rankPosition: null,
        competitorMentions: [],
        rawResponse: response.content || '',
        tokensUsed: response.tokensUsed || 0,
        prompt: query.prompt,
        processingTime: 0,
        error: error instanceof Error ? error.message : 'Analysis failed'
      };
    }
  }
  
  /**
   * Create fallback result for failed queries
   */
  private createFallbackResult(query: LLMQuery, businessName: string, index: number): LLMResult {
    return {
      model: query.model,
      promptType: query.promptType,
      mentioned: false,
      sentiment: 'neutral',
      confidence: 0,
      rankPosition: null,
      competitorMentions: [],
      rawResponse: '',
      tokensUsed: 0,
      prompt: query.prompt,
      processingTime: 0,
      error: 'Query processing failed'
    };
  }
  
  /**
   * Calculate average confidence across results
   */
  private calculateAverageConfidence(results: LLMResult[]): number {
    if (results.length === 0) return 0;
    
    const validResults = results.filter(r => !r.error);
    if (validResults.length === 0) return 0;
    
    const totalConfidence = validResults.reduce((sum, result) => sum + result.confidence, 0);
    return Math.round((totalConfidence / validResults.length) * 100) / 100;
  }
  
  /**
   * Calculate mention rate across results
   */
  private calculateMentionRate(results: LLMResult[]): number {
    if (results.length === 0) return 0;
    
    const validResults = results.filter(r => !r.error);
    if (validResults.length === 0) return 0;
    
    const mentionCount = validResults.filter(r => r.mentioned).length;
    return Math.round((mentionCount / validResults.length) * 100) / 100;
  }
  
  /**
   * Get processing statistics for monitoring
   */
  getProcessingStats(results: LLMResult[]): {
    totalQueries: number;
    successfulQueries: number;
    mentionRate: number;
    avgConfidence: number;
    sentimentDistribution: Record<string, number>;
    modelPerformance: Record<string, { queries: number; mentions: number; avgConfidence: number }>;
  } {
    const validResults = results.filter(r => !r.error);
    
    // Sentiment distribution
    const sentimentCounts = { positive: 0, neutral: 0, negative: 0 };
    validResults.forEach(r => sentimentCounts[r.sentiment]++);
    
    // Model performance
    const modelStats: Record<string, { queries: number; mentions: number; avgConfidence: number }> = {};
    
    for (const result of validResults) {
      if (!modelStats[result.model]) {
        modelStats[result.model] = { queries: 0, mentions: 0, avgConfidence: 0 };
      }
      
      modelStats[result.model].queries++;
      if (result.mentioned) modelStats[result.model].mentions++;
      modelStats[result.model].avgConfidence += result.confidence;
    }
    
    // Calculate averages
    for (const model of Object.keys(modelStats)) {
      modelStats[model].avgConfidence /= modelStats[model].queries;
      modelStats[model].avgConfidence = Math.round(modelStats[model].avgConfidence * 100) / 100;
    }
    
    return {
      totalQueries: results.length,
      successfulQueries: validResults.length,
      mentionRate: this.calculateMentionRate(results),
      avgConfidence: this.calculateAverageConfidence(results),
      sentimentDistribution: sentimentCounts,
      modelPerformance: modelStats
    };
  }
}

// Export singleton instance
export const parallelProcessor = new ParallelProcessor();