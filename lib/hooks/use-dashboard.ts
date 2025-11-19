/**
 * Dashboard Hook
 * Fetches dashboard statistics and business list
 * 
 * SOLID: Single Responsibility - only handles dashboard data fetching
 * DRY: Reusable across dashboard pages
 */

import useSWR from 'swr';
import type { DashboardDTO } from '@/lib/data/types';

const fetcher = (url: string) => fetch(url).then((res) => {
  if (!res.ok) {
    throw new Error(`Failed to fetch: ${res.statusText}`);
  }
  return res.json();
});

export interface UseDashboardReturn {
  stats: DashboardDTO;
  loading: boolean;
  error: Error | null;
}

export function useDashboard(): UseDashboardReturn {
  const { data, error, isLoading } = useSWR<DashboardDTO>('/api/dashboard', fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
  });

  return {
    stats: data || {
      totalBusinesses: 0,
      businesses: [],
      wikidataEntities: 0,
      avgVisibilityScore: 0,
    },
    loading: isLoading,
    error: error ? new Error(error.message || 'Failed to load dashboard') : null,
  };
}

