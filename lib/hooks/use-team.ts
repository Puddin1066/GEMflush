/**
 * Team Data Hook
 * DRY: Centralized team data fetching and subscription logic
 * SOLID: Single Responsibility - only handles team data
 */

import useSWR from 'swr';
import type { Team } from '@/lib/db/schema';
import { getPlanById } from '@/lib/gemflush/plans';
import {
  canPublishToWikidata,
  getMaxBusinesses,
  canAccessHistoricalData,
  canUseProgressiveEnrichment,
  canAccessAPI,
} from '@/lib/gemflush/permissions';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export interface UseTeamReturn {
  team: Team | null;
  isLoading: boolean;
  error: Error | undefined;
  // Computed values (DRY: avoid repeating logic)
  planTier: 'free' | 'pro' | 'agency';
  isPro: boolean;
  isAgency: boolean;
  // Permission checks (DRY: centralized)
  canPublish: boolean;
  maxBusinesses: number;
  canAccessHistory: boolean;
  canUseEnrichment: boolean;
  canAccessApi: boolean;
  // Plan info
  planName: string;
  planPrice: number;
}

/**
 * Hook to fetch and compute team/subscription data
 * Follows DRY: All subscription logic in one place
 */
export function useTeam(): UseTeamReturn {
  const { data: team, isLoading, error } = useSWR<Team>('/api/team', fetcher);

  // Compute plan tier (default to free)
  const planTier = (team?.planName || 'free') as 'free' | 'pro' | 'agency';
  const isPro = planTier === 'pro' || planTier === 'agency';
  const isAgency = planTier === 'agency';

  // Get plan details
  const plan = getPlanById(planTier);
  const planName = plan?.name || 'Free';
  const planPrice = plan?.price || 0;

  // Compute permissions (DRY: use existing permission functions)
  const canPublish = team ? canPublishToWikidata(team) : false;
  const maxBusinesses = team ? getMaxBusinesses(team) : 1;
  const canAccessHistory = team ? canAccessHistoricalData(team) : false;
  const canUseEnrichment = team ? canUseProgressiveEnrichment(team) : false;
  const canAccessApi = team ? canAccessAPI(team) : false;

  return {
    team: team || null,
    isLoading,
    error,
    planTier,
    isPro,
    isAgency,
    canPublish,
    maxBusinesses,
    canAccessHistory,
    canUseEnrichment,
    canAccessApi,
    planName,
    planPrice,
  };
}




