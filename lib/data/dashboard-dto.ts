import 'server-only';
import { getBusinessesByTeam, getLatestFingerprint, getFingerprintHistory } from '@/lib/db/queries';
import type { DashboardDTO, DashboardBusinessDTO } from './types';
import type { Business, LLMFingerprint } from '@/lib/db/schema';
import { dtoLogger } from '@/lib/utils/dto-logger';
import { formatLocation, formatRelativeTimestamp, calculateTrend } from './utils';

/**
 * Dashboard Data Access Layer
 * Fetches and shapes data for dashboard overview
 * 
 * Following Next.js pattern: consolidate data access in one place
 * @see https://nextjs.org/docs/app/building-your-application/data-fetching/patterns#data-access-layer
 */

/**
 * Get dashboard overview data
 * 
 * @param teamId - Team ID to fetch businesses for
 * @returns Dashboard data optimized for UI display
 * 
 * @example
 * ```typescript
 * const data = await getDashboardDTO(team.id);
 * // Returns: { totalBusinesses, wikidataEntities, avgVisibilityScore, businesses }
 * ```
 */
export async function getDashboardDTO(teamId: number): Promise<DashboardDTO> {
  // Fetch raw business data from database
  const businesses = await getBusinessesByTeam(teamId);
  
  // Enrich with fingerprint data and transform to DTO
  const enrichedBusinesses = await Promise.all(
    businesses.map(async (business) => {
      const fingerprint = await getLatestFingerprint(business.id);
      // Fetch fingerprint history for trend calculation
      const fingerprintHistory = await getFingerprintHistory(business.id, 10);
      
      return transformBusinessToDTO(business, fingerprint, fingerprintHistory);
    })
  );
  
  // Calculate aggregated stats
  const statusAggregation = aggregateBusinessStatuses(businesses);

  return {
    totalBusinesses: businesses.length,
    wikidataEntities: businesses.filter(b => b.wikidataQID).length,
    avgVisibilityScore: calculateAvgScore(enrichedBusinesses),
    businesses: enrichedBusinesses,
    totalCrawled: statusAggregation.totalCrawled,
    totalPublished: statusAggregation.totalPublished,
  };
}

/**
 * Transform domain Business to DashboardBusinessDTO
 * 
 * This is where domain → DTO transformation happens
 * When domain types change, update this function (not UI)
 */
function transformBusinessToDTO(
  business: Business,
  fingerprint: LLMFingerprint | null,
  fingerprintHistory: LLMFingerprint[] = []
): DashboardBusinessDTO {
  // Calculate trend from fingerprint history
  const { trendValue, trend } = calculateTrendFromHistory(fingerprintHistory, fingerprint);
  
  const dto: DashboardBusinessDTO = {
    id: business.id.toString(),
    name: business.name,
    location: formatLocation(business.location),
    visibilityScore: fingerprint?.visibilityScore ?? null,
    trend,
    trendValue,
    wikidataQid: business.wikidataQID,
    lastFingerprint: formatRelativeTimestamp(fingerprint?.createdAt),
    status: business.status as DashboardBusinessDTO['status'],
    automationEnabled: business.automationEnabled ?? false, // Use database value, default to false
  };

  // Log transformation with bug detection
  dtoLogger.logTransformation('DashboardBusinessDTO', business, dto, {
    businessId: business.id,
    issues: ['automationEnabled'], // Watch for hardcoded values
  });

  return dto;
}

// ============================================================================
// Helper Functions (Private to this DTO)
// ============================================================================

/**
 * Aggregate business statuses into counts
 * DRY: Reusable function for status aggregation
 */
function aggregateBusinessStatuses(businesses: Business[]): {
  totalCrawled: number;
  totalPublished: number;
} {
  // Single pass through businesses for better performance
  return businesses.reduce(
    (acc, business) => {
      if (business.status === 'crawled' || business.status === 'published') {
        acc.totalCrawled++;
      }
      if (business.status === 'published') {
        acc.totalPublished++;
      }
      return acc;
    },
    { totalCrawled: 0, totalPublished: 0 }
  );
}

// formatLocation moved to utils.ts

/**
 * Calculate trend from fingerprint history
 * 
 * Returns: trendValue (difference in score) and trend direction
 */
function calculateTrendFromHistory(
  fingerprintHistory: LLMFingerprint[],
  currentFingerprint: LLMFingerprint | null
): { trendValue: number; trend: 'up' | 'down' | 'neutral' } {
  // If no history or no current fingerprint, return neutral
  if (!fingerprintHistory || fingerprintHistory.length === 0 || !currentFingerprint) {
    return { trendValue: 0, trend: 'neutral' };
  }

  // Sort history by date (oldest first)
  const sorted = [...fingerprintHistory].sort((a, b) => {
    const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return dateA - dateB;
  });

  // Get first (oldest) and last (newest) fingerprints
  const firstFingerprint = sorted[0];
  const lastFingerprint = sorted[sorted.length - 1];

  // Use current fingerprint as the latest if available
  const latestScore = currentFingerprint?.visibilityScore ?? lastFingerprint?.visibilityScore ?? null;
  const firstScore = firstFingerprint?.visibilityScore ?? null;

  // Calculate trend
  if (latestScore === null || firstScore === null) {
    return { trendValue: 0, trend: 'neutral' };
  }

  const trendValue = latestScore - firstScore;
  const trend = calculateTrend(latestScore, firstScore, 0); // Use 0 threshold for exact comparison

  return { trendValue, trend };
}

// formatTimestamp moved to utils.ts as formatRelativeTimestamp

/**
 * Calculate average visibility score
 */
function calculateAvgScore(businesses: DashboardBusinessDTO[]): number {
  if (businesses.length === 0) return 0;
  
  const withScores = businesses.filter(b => b.visibilityScore !== null);
  if (withScores.length === 0) return 0;
  
  const sum = withScores.reduce((acc, b) => acc + (b.visibilityScore || 0), 0);
  return Math.round(sum / withScores.length);
}

