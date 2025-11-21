import 'server-only';
import { getBusinessesByTeam, getLatestFingerprint } from '@/lib/db/queries';
import type { DashboardDTO, DashboardBusinessDTO } from './types';

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
      
      return transformBusinessToDTO(business, fingerprint);
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
  fingerprint: any
): DashboardBusinessDTO {
  return {
    id: business.id.toString(),
    name: business.name,
    location: formatLocation(business.location),
    visibilityScore: fingerprint?.visibilityScore ?? null,
    trend: calculateTrend(fingerprint),
    trendValue: 0,  // TODO: Calculate actual trend from historical data
    wikidataQid: business.wikidataQID,
    lastFingerprint: formatTimestamp(fingerprint?.createdAt),
    status: business.status as DashboardBusinessDTO['status'],
    automationEnabled: business.automationEnabled ?? false,
  };
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
 * Calculate trend direction
 * TODO: Enhance with historical comparison
 */
function calculateTrend(fingerprint: any): 'up' | 'down' | 'neutral' {
  // Currently: just check if fingerprint exists
  // Future: Compare with previous fingerprint
  return fingerprint ? 'up' : 'neutral';
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

