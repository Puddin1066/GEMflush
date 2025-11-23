import 'server-only';
import { getBusinessesByTeam, getLatestFingerprint, getFingerprintHistory } from '@/lib/db/queries';
import type { DashboardDTO, DashboardBusinessDTO } from './types';
import { dtoLogger } from '@/lib/utils/dto-logger';

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
  return {
    totalBusinesses: businesses.length,
    wikidataEntities: businesses.filter(b => b.wikidataQID).length,
    avgVisibilityScore: calculateAvgScore(enrichedBusinesses),
    businesses: enrichedBusinesses,
  };
}

/**
 * Transform domain Business to DashboardBusinessDTO
 * 
 * This is where domain → DTO transformation happens
 * When domain types change, update this function (not UI)
 */
function transformBusinessToDTO(
  business: any,
  fingerprint: any,
  fingerprintHistory: any[] = []
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
    lastFingerprint: formatTimestamp(fingerprint?.createdAt),
    status: business.status as DashboardBusinessDTO['status'],
    automationEnabled: business.automationEnabled ?? true, // Use database value, not hardcoded
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
 * Format location for display
 */
function formatLocation(location: any): string {
  if (!location) return 'Location not set';
  
  return `${location.city}, ${location.state}`;
}

/**
 * Calculate trend from fingerprint history
 * 
 * Returns: trendValue (difference in score) and trend direction
 */
function calculateTrendFromHistory(
  fingerprintHistory: any[],
  currentFingerprint: any
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
  const trend: 'up' | 'down' | 'neutral' = 
    trendValue > 0 ? 'up' : trendValue < 0 ? 'down' : 'neutral';

  return { trendValue, trend };
}

/**
 * Format timestamp for display
 */
function formatTimestamp(date?: Date | null): string {
  if (!date) return 'Never';
  
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
  return `${Math.floor(days / 30)} months ago`;
}

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

