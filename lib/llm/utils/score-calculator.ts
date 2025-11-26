/**
 * Visibility Score Calculation Utilities
 * DRY: Centralized score calculation formulas and constants
 */

/**
 * Score calculation weights
 */
export const SCORE_WEIGHTS = {
  MENTION: 40,
  SENTIMENT: 25,
  CONFIDENCE: 20,
  RANKING: 15,
  SUCCESS_PENALTY: 10
} as const;

/**
 * Calculate overall visibility score using weighted formula
 * DRY: Extracted from business-fingerprinter.ts
 */
export function calculateVisibilityScore(metrics: {
  mentionRate: number; // 0-1 decimal (will be converted from percentage)
  sentimentScore: number; // 0-1
  confidenceLevel: number; // 0-1
  avgRankPosition: number | null;
  successfulQueries: number;
  totalQueries: number;
}): number {
  // Base score from mention rate (0-40 points)
  const mentionScore = metrics.mentionRate * SCORE_WEIGHTS.MENTION;
  
  // Sentiment bonus/penalty (0-25 points)
  const sentimentScore = metrics.sentimentScore * SCORE_WEIGHTS.SENTIMENT;
  
  // Confidence bonus (0-20 points)
  const confidenceScore = metrics.confidenceLevel * SCORE_WEIGHTS.CONFIDENCE;
  
  // Ranking bonus (0-15 points, higher for better rankings)
  let rankingScore = 0;
  if (metrics.avgRankPosition !== null) {
    // Better rankings (lower numbers) get higher scores
    rankingScore = Math.max(0, SCORE_WEIGHTS.RANKING - (metrics.avgRankPosition - 1) * 3);
  }
  
  // Query success penalty (reduce score if many queries failed)
  const successRate = metrics.successfulQueries / metrics.totalQueries;
  const successPenalty = (1 - successRate) * SCORE_WEIGHTS.SUCCESS_PENALTY;
  
  const rawScore = mentionScore + sentimentScore + confidenceScore + rankingScore - successPenalty;
  
  // Ensure score is between 0 and 100
  return Math.max(0, Math.min(100, Math.round(rawScore)));
}


