/**
 * Competitive Leaderboard Service
 * SRP: Single responsibility for generating competitive leaderboards
 * DRY: Extracted from business-fingerprinter.ts
 */

import type { CompetitiveLeaderboard, LLMResult } from '../types';
import { filterValidResults, filterByPromptType } from '../utils/result-filter';
import { estimateCompetitorPosition } from '../position-estimator';

export interface ILeaderboardService {
  generateLeaderboard(
    results: LLMResult[], 
    businessName: string
  ): CompetitiveLeaderboard;
}

export class LeaderboardService implements ILeaderboardService {
  /**
   * Generate competitive leaderboard from results
   */
  generateLeaderboard(
    results: LLMResult[], 
    businessName: string
  ): CompetitiveLeaderboard {
    // DRY: Use shared filtering utility, then filter by prompt type
    const validResults = filterValidResults(results);
    const recommendationResults = filterByPromptType(validResults, 'recommendation');
    
    if (recommendationResults.length === 0) {
      return {
        targetBusiness: {
          name: businessName,
          avgPosition: null,
          mentionCount: 0
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
        
        // Try to extract position for this competitor
        // DRY: Use shared position estimation utility
        const estimatedPosition = estimateCompetitorPosition(result.rawResponse, competitor);
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
    
    // Calculate single avgPosition (removed redundant rank field)
    const targetAvgPosition = targetPositions.length > 0
      ? targetPositions.reduce((sum, pos) => sum + pos, 0) / targetPositions.length
      : null;
    
    return {
      targetBusiness: {
        name: businessName,
        avgPosition: targetAvgPosition,
        mentionCount: targetMentionCount
      },
      competitors,
      totalRecommendationQueries: recommendationResults.length
    };
  }
}


