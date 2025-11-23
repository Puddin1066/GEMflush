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
  FingerprintHistoryDTO,
} from './types';
import { formatDistanceToNow } from 'date-fns';

/**
 * Transform FingerprintAnalysis domain object → FingerprintDetailDTO
 * Filters out technical details, adds UI-friendly fields
 */
export function toFingerprintDetailDTO(
  analysis: FingerprintAnalysis | { createdAt?: Date | null; generatedAt?: Date | null; businessName?: string; [key: string]: any },
  previousAnalysis?: FingerprintAnalysis | { createdAt?: Date | null; generatedAt?: Date | null; businessName?: string; [key: string]: any },
  business?: { name: string; location?: { city: string; state: string } | null; category?: string | null }
): FingerprintDetailDTO {
  // Normalize date field (database uses createdAt, domain uses generatedAt)
  const generatedAt = (analysis as any).generatedAt || (analysis as any).createdAt;
  const validDate = generatedAt && (generatedAt instanceof Date || typeof generatedAt === 'string')
    ? new Date(generatedAt)
    : null;
  
  // Validate date before using formatDistanceToNow
  if (!validDate || isNaN(validDate.getTime())) {
    console.warn('Invalid or missing generatedAt/createdAt date in fingerprint analysis:', analysis);
  }
  
  // Normalize analysis object for type safety
  const normalizedAnalysis = normalizeFingerprintAnalysis(analysis);
  const normalizedPrevious = previousAnalysis ? normalizeFingerprintAnalysis(previousAnalysis) : undefined;

  // Calculate trend by comparing to previous analysis
  const trend = normalizedPrevious
    ? calculateTrend(normalizedAnalysis.visibilityScore, normalizedPrevious.visibilityScore)
    : 'neutral';

  // Determine top performing models (highest mention rate)
  // Defensive: ensure llmResults is an array
  const llmResults = Array.isArray(normalizedAnalysis.llmResults) 
    ? normalizedAnalysis.llmResults 
    : [];
  
  const modelPerformance = new Map<string, number>();
  llmResults.forEach((result) => {
    if (result && result.model) {
      const current = modelPerformance.get(result.model) || 0;
      modelPerformance.set(result.model, current + (result.mentioned ? 1 : 0));
    }
  });

  const topModels = Array.from(modelPerformance.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([model]) => formatModelName(model));

  // Determine overall sentiment
  const avgSentiment = normalizedAnalysis.sentimentScore;
  const sentiment: 'positive' | 'neutral' | 'negative' =
    avgSentiment > 0.7 ? 'positive' : avgSentiment < 0.4 ? 'negative' : 'neutral';

  // Ensure results array is safe to map
  const safeLlmResults = Array.isArray(normalizedAnalysis.llmResults) 
    ? normalizedAnalysis.llmResults 
    : [];

  // Ensure competitive leaderboard uses current business name
  // The leaderboard may have stale business name if business was renamed
  let leaderboard = normalizedAnalysis.competitiveLeaderboard;
  if (leaderboard && leaderboard.targetBusiness) {
    leaderboard = {
      ...leaderboard,
      targetBusiness: {
        ...leaderboard.targetBusiness,
        name: normalizedAnalysis.businessName, // Use current business name
      },
    };
  }

  return {
    visibilityScore: Math.round(normalizedAnalysis.visibilityScore),
    trend,
    summary: {
      mentionRate: Math.round(normalizedAnalysis.mentionRate),
      sentiment,
      topModels,
      averageRank: normalizedAnalysis.avgRankPosition,
    },
    results: safeLlmResults.map(result => toFingerprintResultDTO(result, business || { name: normalizedAnalysis.businessName || 'Unknown' })),
    competitiveLeaderboard: leaderboard
      ? toCompetitiveLeaderboardDTO(leaderboard, normalizedAnalysis.businessName)
      : null,
    createdAt: validDate && !isNaN(validDate.getTime())
      ? formatDistanceToNow(validDate, { addSuffix: true })
      : 'Unknown',
  };
}

/**
 * Normalize database record or domain object to FingerprintAnalysis
 * Handles both database schema (createdAt) and domain schema (generatedAt)
 */
function normalizeFingerprintAnalysis(
  analysis: FingerprintAnalysis | { createdAt?: Date | null; generatedAt?: Date | null; [key: string]: any }
): FingerprintAnalysis {
  // Map createdAt to generatedAt if needed
  const generatedAt = (analysis as any).generatedAt || (analysis as any).createdAt;
  const validGeneratedAt = generatedAt 
    ? (generatedAt instanceof Date ? generatedAt : new Date(generatedAt))
    : new Date();

  // Ensure llmResults is always an array (handle null/undefined from database)
  const llmResults = analysis.llmResults || (analysis as any).llmResults;
  const safeLlmResults = Array.isArray(llmResults) ? llmResults : [];

  return {
    businessId: analysis.businessId || (analysis as any).businessId || 0,
    businessName: analysis.businessName || (analysis as any).businessName || 'Unknown',
    visibilityScore: analysis.visibilityScore ?? (analysis as any).visibilityScore ?? 0,
    mentionRate: analysis.mentionRate ?? (analysis as any).mentionRate ?? 0,
    sentimentScore: analysis.sentimentScore ?? (analysis as any).sentimentScore ?? 0,
    accuracyScore: analysis.accuracyScore ?? (analysis as any).accuracyScore ?? 0,
    avgRankPosition: analysis.avgRankPosition ?? (analysis as any).avgRankPosition ?? null,
    llmResults: safeLlmResults,
    generatedAt: validGeneratedAt instanceof Date && !isNaN(validGeneratedAt.getTime()) 
      ? validGeneratedAt 
      : new Date(),
    competitiveBenchmark: analysis.competitiveBenchmark || (analysis as any).competitiveBenchmark,
    competitiveLeaderboard: analysis.competitiveLeaderboard || (analysis as any).competitiveLeaderboard,
    insights: analysis.insights || (analysis as any).insights,
  };
}

/**
 * Transform LLMResult domain object → FingerprintResultDTO
 * Includes rawResponse and prompts for debugging failed API calls
 */
function toFingerprintResultDTO(result: any, business?: { name: string; location?: { city: string; state: string } | null; category?: string | null }): FingerprintResultDTO {
  // Defensive: handle missing or malformed result data
  if (!result || typeof result !== 'object') {
    console.warn('Invalid LLM result data:', result);
    return {
      model: 'Unknown',
      promptType: 'unknown',
      mentioned: false,
      sentiment: 'neutral',
      confidence: 0,
      rankPosition: null,
      hasError: true,
    };
  }

  // Use stored prompt if available, otherwise reconstruct as fallback
  let prompt: string | undefined;
  if (result.prompt) {
    // PREFERRED: Use the actual prompt that was sent to the LLM
    prompt = result.prompt;
  } else if (business && result.promptType) {
    // FALLBACK: Reconstruct prompt if not stored (for backward compatibility)
    const location = business.location 
      ? `${business.location.city}, ${business.location.state}`
      : 'the area';
    
    const promptTemplates: Record<string, string> = {
      factual: `What information do you have about ${business.name} located in ${location}? Please provide factual details about their services, reputation, and any notable characteristics.`,
      opinion: `I'm considering using the services of ${business.name} in ${location}. Based on what you know, would you say they are a reputable and reliable ${business.category || 'business'}? Explain your reasoning.`,
      recommendation: `Can you recommend the top 5 ${business.category || 'businesses'} in ${location}? Please rank them and explain why you're recommending each one.`,
    };
    
    prompt = promptTemplates[result.promptType] || undefined;
  }

  // Check if response is an error
  const rawResponse = result.rawResponse || '';
  const hasError = rawResponse.startsWith('Error:') || rawResponse.includes('error') || !result.mentioned && rawResponse.length < 50;

  return {
    model: formatModelName(result.model || 'Unknown'),
    promptType: result.promptType || 'unknown',
    prompt,
    mentioned: result.mentioned ?? false,
    sentiment: result.sentiment || 'neutral',
    confidence: result.accuracy !== undefined && result.accuracy !== null
      ? Math.round(result.accuracy * 100)
      : 0,
    rankPosition: result.rankPosition ?? null,
    rawResponse: rawResponse || undefined,
    tokensUsed: result.tokensUsed || undefined,
    hasError,
  };
}

/**
 * Transform competitive leaderboard → CompetitiveLeaderboardDTO
 * Adds insights and strategic recommendations
 * Exported for use in competitive intelligence page
 */
export function toCompetitiveLeaderboardDTO(
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

  // Normalize competitor name for deduplication (remove common variations)
  const normalizeCompetitorName = (name: string): string => {
    return name
      .toLowerCase()
      .replace(/^(the|a|an)\s+/i, '')
      .replace(/\s+(llc|inc|corp|ltd|co|limited|company|corporation)\.?$/i, '')
      .replace(/\s+/g, ' ')
      .trim();
  };

  // Deduplicate competitors by normalizing names and merging metrics
  const competitorMap = new Map<string, {
    name: string; // Keep original name (first occurrence)
    mentionCount: number;
    totalPosition: number; // Sum of positions for weighted average
    positionCount: number; // Count of mentions for average calculation
    appearsWithTarget: number;
  }>();

  for (const comp of competitors) {
    const normalized = normalizeCompetitorName(comp.name);
    const existing = competitorMap.get(normalized);
    
    if (existing) {
      // Merge: sum metrics
      existing.mentionCount += comp.mentionCount;
      existing.totalPosition += comp.avgPosition * comp.mentionCount; // Weighted sum
      existing.positionCount += comp.mentionCount;
      existing.appearsWithTarget += comp.appearsWithTarget;
    } else {
      // First occurrence - keep original name
      competitorMap.set(normalized, {
        name: comp.name,
        mentionCount: comp.mentionCount,
        totalPosition: comp.avgPosition * comp.mentionCount,
        positionCount: comp.mentionCount,
        appearsWithTarget: comp.appearsWithTarget,
      });
    }
  }

  // Convert map back to array and sort by mention count (descending)
  const deduplicatedCompetitors = Array.from(competitorMap.values())
    .map(comp => ({
      name: comp.name,
      mentionCount: comp.mentionCount,
      avgPosition: comp.positionCount > 0 ? comp.totalPosition / comp.positionCount : 0,
      appearsWithTarget: comp.appearsWithTarget,
    }))
    .sort((a, b) => b.mentionCount - a.mentionCount);

  // Calculate total mentions for query mention share (using deduplicated data)
  const totalMentions =
    targetBusiness.mentionCount +
    deduplicatedCompetitors.reduce((sum, comp) => sum + comp.mentionCount, 0);

  // Transform competitors with rankings and query mention share
  const competitorDTOs: CompetitorDTO[] = deduplicatedCompetitors.map((comp, idx) => ({
    rank: idx + 1,
    name: comp.name,
    mentionCount: comp.mentionCount,
    avgPosition: Math.round(comp.avgPosition * 10) / 10, // Round to 1 decimal
    appearsWithTarget: comp.appearsWithTarget,
    marketShare: totalMentions > 0 ? (comp.mentionCount / totalMentions) * 100 : 0,
    badge: idx === 0 ? 'top' : undefined, // Top competitor gets badge
  }));

  // Determine market position (use deduplicated competitors)
  const topCompetitor = deduplicatedCompetitors.length > 0 ? deduplicatedCompetitors[0] : null;
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
    topCompetitor?.name || null
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

/**
 * Transform fingerprint history array to DTOs
 */
export function toFingerprintHistoryDTOs(
  fingerprints: Array<{
    id: number;
    visibilityScore: number | null;
    mentionRate: number | null;
    sentimentScore: number | null;
    accuracyScore: number | null;
    avgRankPosition: number | null;
    createdAt: Date | string;
  }>
): FingerprintHistoryDTO[] {
  return fingerprints.map((fp) => ({
    id: fp.id,
    date: fp.createdAt instanceof Date 
      ? fp.createdAt.toISOString() 
      : new Date(fp.createdAt as string).toISOString(),
    visibilityScore: fp.visibilityScore,
    mentionRate: fp.mentionRate ? Math.round(fp.mentionRate) : null,
    sentimentScore: fp.sentimentScore ? Math.round(fp.sentimentScore * 100) : null,
    accuracyScore: fp.accuracyScore ? Math.round(fp.accuracyScore * 100) : null,
    avgRankPosition: fp.avgRankPosition ? Math.round(fp.avgRankPosition * 10) / 10 : null,
  }));
}

