// LLM Fingerprinting service - tests business visibility across multiple LLMs

import { Business } from '@/lib/db/schema';
import { FingerprintAnalysis, LLMResult } from '@/lib/types/gemflush';
import { openRouterClient } from './openrouter';
import { loggers } from '@/lib/utils/logger';

const log = loggers.fingerprint;

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
    const startTime = Date.now();
    const operationId = log.start('Fingerprint Analysis', {
      businessId: business.id,
      businessName: business.name,
      url: business.url,
    });
    
    // Generate prompts
    const prompts = this.generatePrompts(business);
    
    // Log generated prompts for debugging
    Object.entries(prompts).forEach(([type, prompt]) => {
      log.debug(`Generated ${type} prompt`, {
        businessId: business.id,
        promptType: type,
        promptLength: prompt.length,
        promptPreview: prompt.substring(0, 100) + '...',
      });
    });
    
    // Build all query tasks
    const queryTasks = this.models.flatMap(model =>
      Object.entries(prompts).map(([promptType, prompt]) => ({
        model,
        promptType,
        prompt,
      }))
    );
    
    log.info(`Executing ${queryTasks.length} queries`, {
      businessId: business.id,
      models: this.models.length,
      promptTypes: Object.keys(prompts).length,
      mode: parallel ? 'parallel' : 'sequential',
      batchSize,
    });
    
    let llmResults: LLMResult[];
    
    if (parallel) {
      // Parallel execution with optional batching
      llmResults = await this.executeParallel(queryTasks, business.name, batchSize);
    } else {
      // Sequential execution (legacy mode)
      llmResults = await this.executeSequential(queryTasks, business.name);
    }
    
    // Log results summary
    const mentionedCount = llmResults.filter(r => r.mentioned).length;
    const errorCount = llmResults.filter(r => r.rawResponse?.startsWith('Error:')).length;
    log.info('Query execution completed', {
      businessId: business.id,
      totalQueries: llmResults.length,
      mentioned: mentionedCount,
      notMentioned: llmResults.length - mentionedCount,
      errors: errorCount,
      mentionRate: `${Math.round((mentionedCount / llmResults.length) * 100)}%`,
    });
    
    // Calculate overall metrics
    const analysis = this.calculateMetrics(llmResults, business);
    
    const totalDuration = Date.now() - startTime;
    log.performance('Fingerprint Analysis', totalDuration, {
      businessId: business.id,
      visibilityScore: analysis.visibilityScore,
      mentionRate: analysis.mentionRate,
      sentimentScore: analysis.sentimentScore,
      hasCompetitiveData: !!analysis.competitiveLeaderboard,
    });
    
    log.complete(operationId, 'Fingerprint Analysis', {
      businessId: business.id,
      visibilityScore: analysis.visibilityScore,
      mentionRate: analysis.mentionRate,
      resultsCount: llmResults.length,
    });
    
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
      log.info(`Executing all ${tasks.length} queries in parallel`);
      const results = await Promise.allSettled(
        tasks.map(task => this.executeQuery(task, businessName))
      );
      
      const duration = Date.now() - startTime;
      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;
      
      log.performance('Parallel query execution', duration, {
        total: tasks.length,
        successful,
        failed,
      });
      
      return results
        .filter(result => result.status === 'fulfilled')
        .map(result => (result as PromiseFulfilledResult<LLMResult>).value);
    } else {
      // Batched execution
      log.info(`Executing ${tasks.length} queries in batches of ${batchSize}`);
      const results: LLMResult[] = [];
      const totalBatches = Math.ceil(tasks.length / batchSize);
      
      for (let i = 0; i < tasks.length; i += batchSize) {
        const batch = tasks.slice(i, i + batchSize);
        const batchNum = Math.floor(i / batchSize) + 1;
        
        log.debug(`Processing batch ${batchNum}/${totalBatches}`, {
          batchSize: batch.length,
          batchNum,
          totalBatches,
        });
        
        const batchResults = await Promise.allSettled(
          batch.map(task => this.executeQuery(task, businessName))
        );
        
        const batchSuccessful = batchResults.filter(r => r.status === 'fulfilled').length;
        const batchFailed = batchResults.filter(r => r.status === 'rejected').length;
        
        log.debug(`Batch ${batchNum} completed`, {
          successful: batchSuccessful,
          failed: batchFailed,
        });
        
        results.push(
          ...batchResults
            .filter(result => result.status === 'fulfilled')
            .map(result => (result as PromiseFulfilledResult<LLMResult>).value)
        );
      }
      
      const duration = Date.now() - startTime;
      log.performance('Batched query execution', duration, {
        total: tasks.length,
        successful: results.length,
        batches: totalBatches,
      });
      
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
    log.info(`Executing ${tasks.length} queries sequentially`);
    
    const results: LLMResult[] = [];
    
    for (let i = 0; i < tasks.length; i++) {
      const task = tasks[i];
      log.debug(`Query ${i + 1}/${tasks.length}: ${task.model} (${task.promptType})`);
      const result = await this.executeQuery(task, businessName);
      results.push(result);
    }
    
    const duration = Date.now() - startTime;
    log.performance('Sequential query execution', duration, {
      total: tasks.length,
      successful: results.length,
    });
    
    return results;
  }
  
  /**
   * Execute a single query with error handling
   */
  private async executeQuery(
    task: { model: string; promptType: string; prompt: string },
    businessName: string
  ): Promise<LLMResult> {
    const queryStartTime = Date.now();
    
    try {
      log.debug(`Querying ${task.model} (${task.promptType})`, {
        model: task.model,
        promptType: task.promptType,
        promptLength: task.prompt.length,
      });
      
      const response = await openRouterClient.query(task.model, task.prompt);
      
      const queryDuration = Date.now() - queryStartTime;
      
      // Check if response looks like a mock (common mock patterns)
      const isMockResponse = response.content.includes('Based on available information') &&
        response.content.includes('reputable local establishment') &&
        !response.content.toLowerCase().includes(businessName.toLowerCase().split(' ')[0]);
      
      if (isMockResponse) {
        log.warn('Response appears to be mock data', {
          model: task.model,
          promptType: task.promptType,
          responsePreview: response.content.substring(0, 150),
        });
      }
      
      const analysis = this.analyzeResponse(
        response.content,
        businessName,
        task.promptType
      );
      
      log.debug(`Query completed: ${task.model} (${task.promptType})`, {
        model: task.model,
        promptType: task.promptType,
        mentioned: analysis.mentioned,
        sentiment: analysis.sentiment,
        rankPosition: analysis.rankPosition,
        duration: queryDuration,
        tokensUsed: response.tokensUsed,
        responseLength: response.content.length,
        isMock: isMockResponse,
      });
      
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
      const queryDuration = Date.now() - queryStartTime;
      log.error(`Error querying ${task.model} (${task.promptType})`, error, {
        model: task.model,
        promptType: task.promptType,
        duration: queryDuration,
      });
      
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
    // Handle location more gracefully - don't use "Unknown" in prompts
    let location: string;
    if (business.location && business.location.city && business.location.state) {
      const city = business.location.city !== 'Unknown' ? business.location.city : '';
      const state = business.location.state !== 'Unknown' ? business.location.state : '';
      if (city && state) {
        location = `${city}, ${state}`;
      } else if (city) {
        location = city;
      } else if (state) {
        location = state;
      } else if (business.location.country && business.location.country !== 'US') {
        location = business.location.country;
      } else {
        // Fallback: extract domain from URL if available
        try {
          const urlObj = new URL(business.url);
          const domain = urlObj.hostname.replace('www.', '');
          location = `(${domain})`;
        } catch {
          location = '';
        }
      }
    } else {
      // Fallback: extract domain from URL if no location
      try {
        const urlObj = new URL(business.url);
        const domain = urlObj.hostname.replace('www.', '');
        location = `(${domain})`;
      } catch {
        location = '';
      }
    }
    
    // Build prompts with location context (or skip location if not available)
    const locationContext = location ? ` located in ${location}` : '';
    
    return {
      factual: `What information do you have about ${business.name}${locationContext}? Please provide factual details about their services, reputation, and any notable characteristics.`,
      
      opinion: `I'm considering using the services of ${business.name}${locationContext}. Based on what you know, would you say they are a reputable and reliable ${business.category || 'business'}? Explain your reasoning.`,
      
      recommendation: location ? 
        `Can you recommend the top 5 ${business.category || 'businesses'} in ${location}? Please rank them and explain why you're recommending each one.` :
        `Can you recommend the top 5 ${business.category || 'businesses'} similar to ${business.name}? Please rank them and explain why you're recommending each one.`,
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
   * IMPROVED: Better fuzzy matching, handles partial names, common variations
   */
  private detectMention(response: string, businessName: string): boolean {
    const normalized = response.toLowerCase();
    
    // Generate multiple name variants for better matching
    const nameVariants: string[] = [];
    
    // 1. Full name (exact)
    nameVariants.push(businessName.toLowerCase());
    
    // 2. Full name without punctuation
    nameVariants.push(businessName.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()|]/g, '').toLowerCase());
    
    // 3. Full name without common suffixes
    nameVariants.push(
      businessName.replace(/\s+(LLC|Inc|Corp|Ltd|Co|Limited|Company)\.?$/i, '').toLowerCase()
    );
    
    // 4. First word (for businesses like "Joe's Café" -> "joe")
    const firstWord = businessName.split(/\s+/)[0].toLowerCase();
    if (firstWord.length > 2) {
      nameVariants.push(firstWord);
    }
    
    // 5. Words without common prefixes (The, A, An)
    const withoutPrefix = businessName.replace(/^(The|A|An)\s+/i, '').toLowerCase();
    if (withoutPrefix !== businessName.toLowerCase()) {
      nameVariants.push(withoutPrefix);
    }
    
    // 6. Extract key words (remove common words like "Dental", "Care", "Services")
    const keyWords = businessName
      .split(/\s+/)
      .filter(word => {
        const lower = word.toLowerCase();
        return !['dental', 'care', 'services', 'group', 'associates', 'clinic', 'center'].includes(lower);
      })
      .map(w => w.toLowerCase());
    
    if (keyWords.length > 0 && keyWords.length < businessName.split(/\s+/).length) {
      nameVariants.push(keyWords.join(' '));
    }
    
    // Check if any variant appears in response
    const found = nameVariants.some(variant => {
      if (variant.length < 3) return false; // Skip very short variants
      return normalized.includes(variant);
    });
    
    // Log detection attempt for debugging
    if (!found) {
      log.debug('Business name not detected in response', {
        businessName,
        responsePreview: response.substring(0, 200),
        variantsChecked: nameVariants.filter(v => v.length >= 3),
      });
    }
    
    return found;
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
   * IMPROVED: Better extraction, filters out generic/placeholder names
   */
  private extractCompetitorMentions(response: string, businessName: string): string[] {
    const competitors: string[] = [];
    const lines = response.split('\n');
    
    // Common placeholder/generic names to filter out
    const placeholderNames = [
      'local business example',
      'sample business',
      'example business',
      'quality services',
      'premier services',
      'top choice',
      'recommended business',
      'local establishment',
      'area business',
      'nearby business',
    ];
    
    const isPlaceholder = (name: string): boolean => {
      const lower = name.toLowerCase();
      return placeholderNames.some(placeholder => lower.includes(placeholder));
    };
    
    for (const line of lines) {
      // Match numbered list items: "1. Business Name" or "1) Business Name" or "Top 1: Business Name"
      const listMatch = line.match(/^\s*(?:top\s+)?(\d+)[.)\s:]\s*(.+?)(?:\s*-|\s*:|$)/i);
      if (listMatch) {
        const competitor = listMatch[2].trim();
        
        // Skip if it's the target business
        if (this.detectMention(competitor, businessName)) {
          continue;
        }
        
        // Skip if it's a placeholder/generic name
        if (isPlaceholder(competitor)) {
          log.debug('Filtered out placeholder competitor name', {
            competitor,
            line: line.substring(0, 100),
          });
          continue;
        }
        
        // Clean up common prefixes/suffixes
        const cleaned = competitor
          .replace(/^(The|A|An)\s+/i, '')
          .replace(/\s+(LLC|Inc|Corp|Ltd|Co|Limited|Company)\.?$/i, '')
          .trim();
        
        // Must be meaningful (at least 3 chars, not just numbers)
        if (cleaned.length >= 3 && !/^\d+$/.test(cleaned)) {
          competitors.push(cleaned);
        }
      }
    }
    
    if (competitors.length > 0) {
      log.debug('Extracted competitors from recommendation response', {
        count: competitors.length,
        competitors: competitors.slice(0, 5), // Log first 5
      });
    } else {
      log.debug('No competitors extracted from recommendation response', {
        responsePreview: response.substring(0, 300),
      });
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
   * IMPROVED: Better validation, logging, and handling of empty data
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
    
    log.debug('Building competitive leaderboard', {
      businessId: business.id,
      recommendationQueries: recommendationResults.length,
      targetBusinessRank,
    });
    
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
    
    // Log leaderboard summary
    log.info('Competitive leaderboard built', {
      businessId: business.id,
      targetMentions: targetMentionCount,
      totalRecommendationQueries: recommendationResults.length,
      competitorsFound: competitors.length,
      topCompetitors: competitors.slice(0, 3).map(c => c.name),
    });
    
    // Warn if no meaningful data
    if (competitors.length === 0 && recommendationResults.length > 0) {
      log.warn('No competitors extracted from recommendation responses', {
        businessId: business.id,
        recommendationQueries: recommendationResults.length,
        responsesWithCompetitors: recommendationResults.filter(r => r.competitorMentions && r.competitorMentions.length > 0).length,
      });
    }
    
    if (targetMentionCount === 0 && recommendationResults.length > 0) {
      log.warn('Target business not mentioned in any recommendation responses', {
        businessId: business.id,
        businessName: business.name,
        recommendationQueries: recommendationResults.length,
      });
    }
    
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

