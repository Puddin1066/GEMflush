/**
 * Fingerprint Data Transfer Object (DTO) Adapters
 * Transforms domain FingerprintAnalysis → FingerprintDetailDTO for UI consumption
 * 
 * Following Next.js Data Access Layer pattern
 * @see https://nextjs.org/docs/app/building-your-application/data-fetching/patterns#data-access-layer
 */

import { FingerprintAnalysis } from '@/lib/types/gemflush';
import {
  FingerprintDetailDTO,
  FingerprintResultDTO,
  CompetitiveLeaderboardDTO,
  CompetitorDTO,
} from './types';
import { formatDistanceToNow } from 'date-fns';

/**
 * Transform FingerprintAnalysis domain object → FingerprintDetailDTO
 * Filters out technical details, adds UI-friendly fields
 */
export function toFingerprintDetailDTO(
  analysis: FingerprintAnalysis,
  previousAnalysis?: FingerprintAnalysis
): FingerprintDetailDTO {
  // Calculate trend by comparing to previous analysis
  const trend = previousAnalysis
    ? calculateTrend(analysis.visibilityScore, previousAnalysis.visibilityScore)
    : 'neutral';

  // Determine top performing models (highest mention rate)
  const modelPerformance = new Map<string, number>();
  analysis.llmResults.forEach((result) => {
    const current = modelPerformance.get(result.model) || 0;
    modelPerformance.set(result.model, current + (result.mentioned ? 1 : 0));
  });

  const topModels = Array.from(modelPerformance.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([model]) => formatModelName(model));

  // Determine overall sentiment
  const avgSentiment = analysis.sentimentScore;
  const sentiment: 'positive' | 'neutral' | 'negative' =
    avgSentiment > 0.7 ? 'positive' : avgSentiment < 0.4 ? 'negative' : 'neutral';

  return {
    visibilityScore: Math.round(analysis.visibilityScore),
    trend,
    summary: {
      mentionRate: Math.round(analysis.mentionRate),
      sentiment,
      topModels,
      averageRank: analysis.avgRankPosition,
    },
    results: analysis.llmResults.map(toFingerprintResultDTO),
    competitiveLeaderboard: analysis.competitiveLeaderboard
      ? toCompetitiveLeaderboardDTO(analysis.competitiveLeaderboard, analysis.businessName)
      : null,
    createdAt: formatDistanceToNow(analysis.generatedAt, { addSuffix: true }),
  };
}

/**
 * Transform LLMResult domain object → FingerprintResultDTO
 * Removes rawResponse and other technical fields
 */
function toFingerprintResultDTO(result: any): FingerprintResultDTO {
  return {
    model: formatModelName(result.model),
    mentioned: result.mentioned,
    sentiment: result.sentiment,
    confidence: Math.round(result.accuracy * 100),
    rankPosition: result.rankPosition,
  };
}

/**
 * Transform competitive leaderboard → CompetitiveLeaderboardDTO
 * Adds insights and strategic recommendations
 */
function toCompetitiveLeaderboardDTO(
  leaderboard: {
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
      appearsWithTarget: number;
    }>;
    totalRecommendationQueries: number;
  },
  businessName: string
): CompetitiveLeaderboardDTO {
  const { targetBusiness, competitors, totalRecommendationQueries } = leaderboard;

  // Calculate mention rate for target
  const mentionRate =
    totalRecommendationQueries > 0
      ? (targetBusiness.mentionCount / totalRecommendationQueries) * 100
      : 0;

  // Calculate total mentions for market share
  const totalMentions =
    targetBusiness.mentionCount +
    competitors.reduce((sum, comp) => sum + comp.mentionCount, 0);

  // Transform competitors with rankings and market share
  const competitorDTOs: CompetitorDTO[] = competitors.map((comp, idx) => ({
    rank: idx + 1,
    name: comp.name,
    mentionCount: comp.mentionCount,
    avgPosition: comp.avgPosition,
    appearsWithTarget: comp.appearsWithTarget,
    marketShare: totalMentions > 0 ? (comp.mentionCount / totalMentions) * 100 : 0,
    badge: idx === 0 ? 'top' : undefined, // Top competitor gets badge
  }));

  // Determine market position
  const topCompetitor = competitors.length > 0 ? competitors[0] : null;
  const marketPosition = determineMarketPosition(
    targetBusiness.mentionCount,
    topCompetitor?.mentionCount,
    totalRecommendationQueries
  );

  // Calculate competitive gap
  const competitiveGap =
    topCompetitor && topCompetitor.mentionCount > targetBusiness.mentionCount
      ? topCompetitor.mentionCount - targetBusiness.mentionCount
      : null;

  // Generate strategic recommendation
  const recommendation = generateRecommendation(
    marketPosition,
    mentionRate,
    competitiveGap,
    topCompetitor?.name
  );

  return {
    targetBusiness: {
      name: targetBusiness.name,
      rank: targetBusiness.rank,
      mentionCount: targetBusiness.mentionCount,
      mentionRate: Math.round(mentionRate),
    },
    competitors: competitorDTOs,
    totalQueries: totalRecommendationQueries,
    insights: {
      marketPosition,
      topCompetitor: topCompetitor?.name || null,
      competitiveGap,
      recommendation,
    },
  };
}

/**
 * Determine market position based on mention counts
 */
function determineMarketPosition(
  targetMentions: number,
  topCompetitorMentions: number | undefined,
  totalQueries: number
): 'leading' | 'competitive' | 'emerging' | 'unknown' {
  if (totalQueries === 0) return 'unknown';

  const mentionRate = (targetMentions / totalQueries) * 100;

  // Leading: mentioned 60%+ of the time or most mentioned
  if (
    mentionRate >= 60 ||
    !topCompetitorMentions ||
    targetMentions > topCompetitorMentions
  ) {
    return 'leading';
  }

  // Competitive: mentioned 30-60% of the time
  if (mentionRate >= 30) {
    return 'competitive';
  }

  // Emerging: mentioned < 30% of the time
  if (mentionRate > 0) {
    return 'emerging';
  }

  return 'unknown';
}

/**
 * Generate strategic recommendation based on competitive position
 */
function generateRecommendation(
  marketPosition: 'leading' | 'competitive' | 'emerging' | 'unknown',
  mentionRate: number,
  competitiveGap: number | null,
  topCompetitorName: string | null
): string {
  switch (marketPosition) {
    case 'leading':
      return 'Excellent! Your business has strong LLM visibility. Focus on maintaining quality and expanding content.';

    case 'competitive':
      if (competitiveGap && topCompetitorName) {
        return `You're competitive with ${topCompetitorName}. Consider publishing to Wikidata to improve visibility by ${competitiveGap} mentions.`;
      }
      return 'You have good visibility. Publishing to Wikidata and creating quality content can boost your ranking.';

    case 'emerging':
      return 'Limited LLM visibility detected. Publishing to Wikidata and building online presence will significantly improve discoverability.';

    case 'unknown':
    default:
      return 'Insufficient data. Run fingerprinting with recommendation prompts to analyze competitive position.';
  }
}

/**
 * Calculate trend from current vs previous score
 */
function calculateTrend(
  current: number,
  previous: number
): 'up' | 'down' | 'neutral' {
  const diff = current - previous;
  const threshold = 5; // 5% change to be significant

  if (diff > threshold) return 'up';
  if (diff < -threshold) return 'down';
  return 'neutral';
}

/**
 * Format model name for UI display
 * openai/gpt-4-turbo → GPT-4 Turbo
 * anthropic/claude-3-opus → Claude 3 Opus
 */
function formatModelName(model: string): string {
  const parts = model.split('/');
  if (parts.length !== 2) return model;

  const [provider, name] = parts;

  // Capitalize and clean up name
  const formatted = name
    .replace(/-/g, ' ')
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  // Special cases for better formatting
  if (formatted.startsWith('Gpt')) {
    return formatted.replace('Gpt', 'GPT');
  }

  return formatted;
}

