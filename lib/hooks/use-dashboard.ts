/**
 * Dashboard Hook
 * Fetches dashboard statistics and business list
 * 
 * SOLID: Single Responsibility - only handles dashboard data fetching
 * DRY: Reusable across dashboard pages
 */

import useSWR from 'swr';
import { usePolling } from './use-polling';
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
  refresh: () => void;
}

export function useDashboard(): UseDashboardReturn {
  const { data, error, isLoading, mutate } = useSWR<DashboardDTO>('/api/dashboard', fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
  });

  const stats = data || {
    totalBusinesses: 0,
    businesses: [],
    wikidataEntities: 0,
    avgVisibilityScore: 0,
  };

  // Check if any businesses are in processing state
  const hasProcessingBusinesses = stats.businesses.some(
    (business) => 
      business.status === 'pending' || 
      business.status === 'crawling' || 
      business.status === 'generating'
  );

  // Poll for updates when businesses are processing
  usePolling({
    enabled: hasProcessingBusinesses,
    interval: 5000, // Poll every 5 seconds
    maxPolls: 60, // Stop after 5 minutes (60 * 5s)
    onPoll: () => {
      // Revalidate dashboard data
      void mutate();
    },
  });

  return {
    stats,
    loading: isLoading,
    error: error ? new Error(error.message || 'Failed to load dashboard') : null,
    refresh: () => {
      void mutate();
    },
  };
}

