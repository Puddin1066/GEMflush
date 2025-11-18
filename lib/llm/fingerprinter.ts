// LLM Fingerprinting service - tests business visibility across multiple LLMs

import { Business } from '@/lib/db/schema';
import { FingerprintAnalysis, LLMResult } from '@/lib/types/gemflush';
import { openRouterClient } from './openrouter';

export class LLMFingerprinter {
  // Models confirmed to work with OpenRouter API
  // Note: Model availability depends on your OpenRouter API tier
  // Limited to 3 models (one per provider) to control costs while maintaining diversity
  private models = [
    // OpenAI - ChatGPT
    'openai/gpt-4-turbo',
    // Anthropic - Claude
    'anthropic/claude-3-opus',
    // Google - Gemini
    'google/gemini-pro',
  ];
  
  /**
   * Run full fingerprint analysis for a business
   * 
   * @param business - Business to fingerprint
   * @param options - Execution options
   *   - parallel: Run all queries in parallel (default: true, ~3-5s)
   *   - batchSize: Number of concurrent requests (default: 15, no batching)
   *   - sequential: Run queries one-by-one (legacy mode, ~45-60s)
   */
  async fingerprint(
    business: Business, 
    options: { parallel?: boolean; batchSize?: number } = {}
  ): Promise<FingerprintAnalysis> {
    const { parallel = true, batchSize = 15 } = options;
    
    console.log(`Starting LLM fingerprint for business: ${business.name}`);
    console.log(`Mode: ${parallel ? 'Parallel' : 'Sequential'}, Batch size: ${batchSize}`);
    
    // Generate prompts
    const prompts = this.generatePrompts(business);
    
    // Build all query tasks
    const queryTasks = this.models.flatMap(model =>
      Object.entries(prompts).map(([promptType, prompt]) => ({
        model,
        promptType,
        prompt,
      }))
    );
    
    console.log(`Total queries: ${queryTasks.length} (${this.models.length} models × ${Object.keys(prompts).length} prompts)`);
    
    let llmResults: LLMResult[];
    
    if (parallel) {
      // Parallel execution with optional batching
      llmResults = await this.executeParallel(queryTasks, business.name, batchSize);
    } else {
      // Sequential execution (legacy mode)
      llmResults = await this.executeSequential(queryTasks, business.name);
    }
    
    // Calculate overall metrics
    const analysis = this.calculateMetrics(llmResults, business);
    
    return analysis;
  }
  
  /**
   * Execute queries in parallel with optional batching
   */
  private async executeParallel(
    tasks: Array<{ model: string; promptType: string; prompt: string }>,
    businessName: string,
    batchSize: number
  ): Promise<LLMResult[]> {
    const startTime = Date.now();
    
    if (batchSize >= tasks.length) {
      // No batching - all at once
      console.log(`Executing all ${tasks.length} queries in parallel...`);
      const results = await Promise.allSettled(
        tasks.map(task => this.executeQuery(task, businessName))
      );
      
      const duration = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`✓ Completed in ${duration}s`);
      
      return results
        .filter(result => result.status === 'fulfilled')
        .map(result => (result as PromiseFulfilledResult<LLMResult>).value);
    } else {
      // Batched execution
      console.log(`Executing ${tasks.length} queries in batches of ${batchSize}...`);
      const results: LLMResult[] = [];
      
      for (let i = 0; i < tasks.length; i += batchSize) {
        const batch = tasks.slice(i, i + batchSize);
        console.log(`  Batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(tasks.length / batchSize)}: ${batch.length} queries`);
        
        const batchResults = await Promise.allSettled(
          batch.map(task => this.executeQuery(task, businessName))
        );
        
        results.push(
          ...batchResults
            .filter(result => result.status === 'fulfilled')
            .map(result => (result as PromiseFulfilledResult<LLMResult>).value)
        );
      }
      
      const duration = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`✓ Completed in ${duration}s`);
      
      return results;
    }
  }
  
  /**
   * Execute queries sequentially (legacy mode)
   */
  private async executeSequential(
    tasks: Array<{ model: string; promptType: string; prompt: string }>,
    businessName: string
  ): Promise<LLMResult[]> {
    const startTime = Date.now();
    console.log(`Executing ${tasks.length} queries sequentially...`);
    
    const results: LLMResult[] = [];
    
    for (const task of tasks) {
      const result = await this.executeQuery(task, businessName);
      results.push(result);
    }
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`✓ Completed in ${duration}s`);
    
    return results;
  }
  
  /**
   * Execute a single query with error handling
   */
  private async executeQuery(
    task: { model: string; promptType: string; prompt: string },
    businessName: string
  ): Promise<LLMResult> {
    try {
      const response = await openRouterClient.query(task.model, task.prompt);
      
      const analysis = this.analyzeResponse(
        response.content,
        businessName,
        task.promptType
      );
      
      return {
        model: task.model,
        promptType: task.promptType,
        mentioned: analysis.mentioned,
        sentiment: analysis.sentiment,
        accuracy: analysis.accuracy,
        rankPosition: analysis.rankPosition,
        competitorMentions: analysis.competitorMentions,
        rawResponse: response.content,
        tokensUsed: response.tokensUsed,
      };
    } catch (error) {
      console.error(`Error querying ${task.model} (${task.promptType}):`, error);
      return {
        model: task.model,
        promptType: task.promptType,
        mentioned: false,
        sentiment: 'neutral',
        accuracy: 0,
        rankPosition: null,
        rawResponse: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        tokensUsed: 0,
      };
    }
  }
  
  /**
   * Generate prompts for testing
   */
  private generatePrompts(business: Business): Record<string, string> {
    const location = business.location 
      ? `${business.location.city}, ${business.location.state}`
      : 'the area';
    
    return {
      factual: `What information do you have about ${business.name} located in ${location}? Please provide factual details about their services, reputation, and any notable characteristics.`,
      
      opinion: `I'm considering using the services of ${business.name} in ${location}. Based on what you know, would you say they are a reputable and reliable ${business.category || 'business'}? Explain your reasoning.`,
      
      recommendation: `Can you recommend the top 5 ${business.category || 'businesses'} in ${location}? Please rank them and explain why you're recommending each one.`,
    };
  }
  
  /**
   * Analyze LLM response for mention, sentiment, and accuracy
   */
  private analyzeResponse(
    response: string,
    businessName: string,
    promptType: string
  ): {
    mentioned: boolean;
    sentiment: 'positive' | 'neutral' | 'negative';
    accuracy: number;
    rankPosition: number | null;
    competitorMentions?: string[];
  } {
    // Check if business is mentioned
    const mentioned = this.detectMention(response, businessName);
    
    // Analyze sentiment
    const sentiment = this.analyzeSentiment(response);
    
    // Extract ranking position (for recommendation prompts)
    const rankPosition = promptType === 'recommendation'
      ? this.extractRankPosition(response, businessName)
      : null;
    
    // Extract competitor mentions (for recommendation prompts)
    const competitorMentions = promptType === 'recommendation'
      ? this.extractCompetitorMentions(response, businessName)
      : undefined;
    
    // Calculate accuracy (simplified for now)
    const accuracy = mentioned ? 0.7 : 0;
    
    return {
      mentioned,
      sentiment,
      accuracy,
      rankPosition,
      competitorMentions,
    };
  }
  
  /**
   * Detect if business name is mentioned in response
   */
  private detectMention(response: string, businessName: string): boolean {
    const normalized = response.toLowerCase();
    const nameVariants = [
      businessName.toLowerCase(),
      businessName.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, '').toLowerCase(),
      businessName.split(' ')[0].toLowerCase(), // First word
    ];
    
    return nameVariants.some(variant => normalized.includes(variant));
  }
  
  /**
   * Analyze sentiment of response
   */
  private analyzeSentiment(text: string): 'positive' | 'neutral' | 'negative' {
    const lowerText = text.toLowerCase();
    
    const positiveKeywords = [
      'excellent', 'great', 'best', 'recommend', 'trusted',
      'reliable', 'professional', 'quality', 'reputable',
      'outstanding', 'top', 'highly rated', 'popular',
    ];
    
    const negativeKeywords = [
      'poor', 'bad', 'worst', 'avoid', 'unreliable',
      'unprofessional', 'complaint', 'issue', 'problem',
      'disappointed', 'negative', 'warning',
    ];
    
    // Helper function to count keyword matches (DRY principle)
    const countKeywords = (keywords: string[]): number => {
      return keywords.filter(keyword => lowerText.includes(keyword)).length;
    };
    
    const positiveCount = countKeywords(positiveKeywords);
    const negativeCount = countKeywords(negativeKeywords);
    
    if (positiveCount > negativeCount + 1) return 'positive';
    if (negativeCount > positiveCount + 1) return 'negative';
    return 'neutral';
  }
  
  /**
   * Extract ranking position from recommendation response
   */
  private extractRankPosition(response: string, businessName: string): number | null {
    const lines = response.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      if (this.detectMention(line, businessName)) {
        // Match patterns like "1. Business Name" or "Top 1: Business Name"
        const rankMatch = line.match(/^(\d+)[.)]/);
        if (rankMatch) {
          return parseInt(rankMatch[1]);
        }
      }
    }
    
    return null;
  }
  
  /**
   * Extract competitor business names from recommendation response
   * Returns list of competitors mentioned alongside the target business
   */
  private extractCompetitorMentions(response: string, businessName: string): string[] {
    const competitors: string[] = [];
    const lines = response.split('\n');
    
    for (const line of lines) {
      // Match numbered list items: "1. Business Name" or "1) Business Name"
      const listMatch = line.match(/^\s*(\d+)[.)]\s*(.+?)(?:\s*-|\s*:|$)/);
      if (listMatch) {
        const competitor = listMatch[2].trim();
        
        // Don't include the target business itself
        if (!this.detectMention(competitor, businessName) && competitor.length > 0) {
          // Clean up common prefixes/suffixes
          const cleaned = competitor
            .replace(/^(The|A|An)\s+/i, '')
            .replace(/\s+(LLC|Inc|Corp|Ltd|Co)\.?$/i, '')
            .trim();
          
          if (cleaned.length > 2) {
            competitors.push(cleaned);
          }
        }
      }
    }
    
    return competitors;
  }
  
  /**
   * Calculate overall metrics from LLM results
   */
  private calculateMetrics(
    llmResults: LLMResult[],
    business: Business
  ): FingerprintAnalysis {
    const totalResults = llmResults.length;
    
    // Mention rate
    const mentionCount = llmResults.filter(r => r.mentioned).length;
    const mentionRate = (mentionCount / totalResults) * 100; // Percentage
    
    // Sentiment score
    const sentimentScores = {
      positive: 1,
      neutral: 0.5,
      negative: 0,
    };
    
    const avgSentiment = llmResults
      .filter(r => r.mentioned)
      .reduce((sum, r) => sum + sentimentScores[r.sentiment], 0) / Math.max(mentionCount, 1);
    
    // Accuracy score
    const avgAccuracy = llmResults
      .filter(r => r.mentioned)
      .reduce((sum, r) => sum + r.accuracy, 0) / Math.max(mentionCount, 1);
    
    // Average rank position
    const rankedResults = llmResults.filter(r => r.rankPosition !== null);
    const avgRankPosition = rankedResults.length > 0
      ? rankedResults.reduce((sum, r) => sum + (r.rankPosition || 0), 0) / rankedResults.length
      : null;
    
    // Calculate visibility score (0-100)
    const visibilityScore = Math.round(
      (mentionRate * 0.4) +           // 40% weight on mention rate
      (avgSentiment * 30) +           // 30% weight on sentiment
      (avgAccuracy * 20) +            // 20% weight on accuracy
      (avgRankPosition ? Math.max(0, (6 - avgRankPosition) / 5 * 10) : 5) // 10% on ranking
    );
    
    // Build competitive leaderboard from competitor mentions
    const competitiveLeaderboard = this.buildCompetitiveLeaderboard(
      llmResults,
      business,
      avgRankPosition
    );
    
    return {
      businessId: business.id,
      businessName: business.name,
      visibilityScore,
      mentionRate,
      sentimentScore: avgSentiment,
      accuracyScore: avgAccuracy,
      avgRankPosition,
      llmResults,
      competitiveLeaderboard,
      generatedAt: new Date(),
    };
  }
  
  /**
   * Build competitive leaderboard from competitor mentions
   * Shows which competitors are mentioned most often alongside the target business
   */
  private buildCompetitiveLeaderboard(
    llmResults: LLMResult[],
    business: Business,
    targetBusinessRank: number | null
  ): {
    targetBusiness: {
      name: string;
      rank: number | null;
      mentionCount: number;
      avgPosition: number | null;
    };
    competitors: Array<{
      name: string;
      mentionCount: number;
      avgPosition: number;
      appearsWithTarget: number; // How many times mentioned alongside target
    }>;
    totalRecommendationQueries: number;
  } {
    const recommendationResults = llmResults.filter(r => r.promptType === 'recommendation');
    
    // Count competitor mentions
    const competitorCounts = new Map<string, { count: number; positions: number[] }>();
    
    recommendationResults.forEach((result) => {
      if (result.competitorMentions && result.competitorMentions.length > 0) {
        result.competitorMentions.forEach((competitor, idx) => {
          if (!competitorCounts.has(competitor)) {
            competitorCounts.set(competitor, { count: 0, positions: [] });
          }
          const stats = competitorCounts.get(competitor)!;
          stats.count++;
          // Estimate position based on order in list (1-based)
          stats.positions.push(idx + 1);
        });
      }
    });
    
    // Build sorted leaderboard
    const competitors = Array.from(competitorCounts.entries())
      .map(([name, stats]) => ({
        name,
        mentionCount: stats.count,
        avgPosition: stats.positions.reduce((sum, p) => sum + p, 0) / stats.positions.length,
        appearsWithTarget: stats.count, // All mentions are alongside target
      }))
      .sort((a, b) => {
        // Sort by mention count (descending), then by avg position (ascending)
        if (b.mentionCount !== a.mentionCount) {
          return b.mentionCount - a.mentionCount;
        }
        return a.avgPosition - b.avgPosition;
      });
    
    const targetMentionCount = recommendationResults.filter(r => r.mentioned).length;
    
    return {
      targetBusiness: {
        name: business.name,
        rank: targetBusinessRank,
        mentionCount: targetMentionCount,
        avgPosition: targetBusinessRank,
      },
      competitors,
      totalRecommendationQueries: recommendationResults.length,
    };
  }
}

export const llmFingerprinter = new LLMFingerprinter();

