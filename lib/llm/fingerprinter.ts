// LLM Fingerprinting service - tests business visibility across multiple LLMs

import { Business } from '@/lib/db/schema';
import { FingerprintAnalysis, LLMResult } from '@/lib/types/gemflush';
import { openRouterClient } from './openrouter';

export class LLMFingerprinter {
  private models = [
    'openai/gpt-4-turbo',
    'anthropic/claude-3-opus',
    'google/gemini-pro',
    'meta-llama/llama-3-70b-instruct',
    'perplexity/pplx-70b-online',
  ];
  
  /**
   * Run full fingerprint analysis for a business
   */
  async fingerprint(business: Business): Promise<FingerprintAnalysis> {
    console.log(`Starting LLM fingerprint for business: ${business.name}`);
    
    // Generate prompts
    const prompts = this.generatePrompts(business);
    
    // Query all LLMs with all prompt types
    const llmResults: LLMResult[] = [];
    
    for (const model of this.models) {
      for (const [promptType, prompt] of Object.entries(prompts)) {
        try {
          const response = await openRouterClient.query(model, prompt);
          
          const analysis = this.analyzeResponse(
            response.content,
            business.name,
            promptType
          );
          
          llmResults.push({
            model,
            promptType,
            mentioned: analysis.mentioned,
            sentiment: analysis.sentiment,
            accuracy: analysis.accuracy,
            rankPosition: analysis.rankPosition,
            rawResponse: response.content,
            tokensUsed: response.tokensUsed,
          });
        } catch (error) {
          console.error(`Error querying ${model}:`, error);
          // Add failed result
          llmResults.push({
            model,
            promptType,
            mentioned: false,
            sentiment: 'neutral',
            accuracy: 0,
            rankPosition: null,
            rawResponse: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
            tokensUsed: 0,
          });
        }
      }
    }
    
    // Calculate overall metrics
    const analysis = this.calculateMetrics(llmResults, business);
    
    return analysis;
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
  } {
    // Check if business is mentioned
    const mentioned = this.detectMention(response, businessName);
    
    // Analyze sentiment
    const sentiment = this.analyzeSentiment(response);
    
    // Extract ranking position (for recommendation prompts)
    const rankPosition = promptType === 'recommendation'
      ? this.extractRankPosition(response, businessName)
      : null;
    
    // Calculate accuracy (simplified for now)
    const accuracy = mentioned ? 0.7 : 0;
    
    return {
      mentioned,
      sentiment,
      accuracy,
      rankPosition,
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
    
    let positiveCount = 0;
    let negativeCount = 0;
    
    positiveKeywords.forEach(keyword => {
      if (lowerText.includes(keyword)) positiveCount++;
    });
    
    negativeKeywords.forEach(keyword => {
      if (lowerText.includes(keyword)) negativeCount++;
    });
    
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
   * Calculate overall metrics from LLM results
   */
  private calculateMetrics(
    llmResults: LLMResult[],
    business: Business
  ): FingerprintAnalysis {
    const totalResults = llmResults.length;
    
    // Mention rate
    const mentionCount = llmResults.filter(r => r.mentioned).length;
    const mentionRate = mentionCount / totalResults;
    
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
      (mentionRate * 40) +
      (avgSentiment * 30) +
      (avgAccuracy * 20) +
      (avgRankPosition ? Math.max(0, (6 - avgRankPosition) / 5 * 10) : 5)
    );
    
    return {
      visibilityScore,
      mentionRate,
      sentimentScore: avgSentiment,
      accuracyScore: avgAccuracy,
      avgRankPosition,
      llmResults,
    };
  }
}

export const llmFingerprinter = new LLMFingerprinter();

