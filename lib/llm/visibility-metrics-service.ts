/**
 * Visibility Metrics Service
 * SRP: Single responsibility for calculating business visibility metrics
 * DRY: Extracted from business-fingerprinter.ts
 */

import type { BusinessVisibilityMetrics, LLMResult } from '../types';
import { filterValidResults, filterMentionedResults, filterRankedResults } from './result-filter';
import { calculateVisibilityScore } from './score-calculator';

export interface IVisibilityMetricsService {
  calculateMetrics(results: LLMResult[]): BusinessVisibilityMetrics;
}

export class VisibilityMetricsService implements IVisibilityMetricsService {
  private readonly models: readonly string[];
  
  constructor(models: readonly string[] = ['openai/gpt-4-turbo', 'anthropic/claude-3-opus', 'google/gemini-2.5-flash']) {
    this.models = models;
  }
  
  /**
   * Calculate comprehensive visibility metrics from LLM results
   */
  calculateMetrics(results: LLMResult[]): BusinessVisibilityMetrics {
    // DRY: Use shared filtering utility
    const validResults = filterValidResults(results);
    const totalQueries = results.length > 0 ? results.length : this.models.length * 3; // Fallback to expected if empty
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
    const mentionedResults = filterMentionedResults(validResults);
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
    const rankedResults = filterRankedResults(mentionedResults);
    const avgRankPosition = rankedResults.length > 0
      ? rankedResults.reduce((sum, r) => sum + (r.rankPosition || 0), 0) / rankedResults.length
      : null;
    
    // Calculate overall visibility score (0-100)
    // DRY: Use shared score calculation utility
    // Note: mentionRate is now a percentage (0-100), but calculateVisibilityScore expects decimal (0-1)
    const visibilityScore = calculateVisibilityScore({
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
}


