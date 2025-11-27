/**
 * Analytics DTO - Data Transfer Object for Analytics Display
 * 
 * Aggregates and transforms data for analytics visualization
 * 
 * TDD: This file was created to satisfy tests in analytics-dto.tdd.test.ts
 * Following RED → GREEN → REFACTOR cycle
 */

import 'server-only';
import { getBusinessesByTeam, getFingerprintHistory } from '@/lib/db/queries';

/**
 * Analytics DTO
 */
export interface AnalyticsDTO {
  visibilityTrend: {
    dataPoints: Array<{ date: string; score: number }>;
    trend: 'up' | 'down' | 'neutral';
    change: number;
    changePercent: number;
  };
  trends: {
    improving: number;
    declining: number;
    stable: number;
    total: number;
  };
  byCategory?: Record<string, {
    count: number;
    avgVisibilityScore: number;
    businesses: any[];
  }>;
}

/**
 * Get analytics DTO for team
 * 
 * @param teamId - Team ID
 * @param options - Analytics options
 * @returns Analytics DTO
 */
export async function getAnalyticsDTO(
  teamId: number,
  options?: {
    timeRange?: '7d' | '30d' | '90d' | '1y';
    groupBy?: 'category' | 'location' | null;
  }
): Promise<AnalyticsDTO> {
  const businesses = await getBusinessesByTeam(teamId);
  
  // Get fingerprint history for all businesses
  const fingerprintHistories = await Promise.all(
    businesses.map(business => getFingerprintHistory(business.id, 100))
  );

  // Aggregate visibility scores over time
  const visibilityTrend = aggregateVisibilityTrend(fingerprintHistories, options?.timeRange || '30d');

  // Calculate trend metrics
  const trends = calculateTrendMetrics(businesses, fingerprintHistories);

  // Group by category if requested
  const byCategory = options?.groupBy === 'category'
    ? groupByCategory(businesses, fingerprintHistories)
    : undefined;

  return {
    visibilityTrend,
    trends,
    byCategory,
  };
}

/**
 * Aggregate visibility scores over time
 */
function aggregateVisibilityTrend(
  fingerprintHistories: any[][],
  timeRange: string
): AnalyticsDTO['visibilityTrend'] {
  // Flatten all fingerprints and sort by date
  const allFingerprints = fingerprintHistories
    .flat()
    .filter(fp => fp && fp.visibilityScore !== null && fp.createdAt)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  if (allFingerprints.length === 0) {
    return {
      dataPoints: [],
      trend: 'neutral',
      change: 0,
      changePercent: 0,
    };
  }

  // Group by date and calculate average
  const dateMap = new Map<string, number[]>();
  allFingerprints.forEach(fp => {
    const date = new Date(fp.createdAt).toISOString().split('T')[0];
    if (!dateMap.has(date)) {
      dateMap.set(date, []);
    }
    dateMap.get(date)!.push(fp.visibilityScore);
  });

  const dataPoints = Array.from(dateMap.entries())
    .map(([date, scores]) => ({
      date,
      score: Math.round(scores.reduce((sum, s) => sum + s, 0) / scores.length),
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Calculate trend
  const firstScore = dataPoints[0]?.score || 0;
  const lastScore = dataPoints[dataPoints.length - 1]?.score || 0;
  const change = lastScore - firstScore;
  const changePercent = firstScore > 0 ? (change / firstScore) * 100 : 0;

  return {
    dataPoints,
    trend: change > 0 ? 'up' : change < 0 ? 'down' : 'neutral',
    change,
    changePercent: Math.round(changePercent * 100) / 100,
  };
}

/**
 * Calculate trend metrics (improving, declining, stable)
 */
function calculateTrendMetrics(
  businesses: any[],
  fingerprintHistories: any[][]
): AnalyticsDTO['trends'] {
  let improving = 0;
  let declining = 0;
  let stable = 0;

  businesses.forEach((business, index) => {
    const history = fingerprintHistories[index] || [];
    if (history.length < 2) {
      stable++;
      return;
    }

    const sorted = [...history].sort((a, b) => 
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
    const first = sorted[0]?.visibilityScore;
    const last = sorted[sorted.length - 1]?.visibilityScore;

    if (first === null || last === null) {
      stable++;
      return;
    }

    const change = last - first;
    if (change > 5) improving++;
    else if (change < -5) declining++;
    else stable++;
  });

  return {
    improving,
    declining,
    stable,
    total: businesses.length,
  };
}

/**
 * Group analytics by category
 */
function groupByCategory(
  businesses: any[],
  fingerprintHistories: any[][]
): Record<string, { count: number; avgVisibilityScore: number; businesses: any[] }> {
  const categoryMap = new Map<string, any[]>();

  businesses.forEach((business, index) => {
    const category = business.category || 'uncategorized';
    if (!categoryMap.has(category)) {
      categoryMap.set(category, []);
    }
    categoryMap.get(category)!.push(business);
  });

  const result: Record<string, { count: number; avgVisibilityScore: number; businesses: any[] }> = {};

  categoryMap.forEach((categoryBusinesses, category) => {
    const scores = categoryBusinesses
      .map((business, index) => {
        const history = fingerprintHistories[businesses.indexOf(business)] || [];
        return history[history.length - 1]?.visibilityScore;
      })
      .filter((score): score is number => score !== null && score !== undefined);

    const avgVisibilityScore = scores.length > 0
      ? Math.round(scores.reduce((sum, s) => sum + s, 0) / scores.length)
      : 0;

    result[category] = {
      count: categoryBusinesses.length,
      avgVisibilityScore,
      businesses: categoryBusinesses,
    };
  });

  return result;
}






