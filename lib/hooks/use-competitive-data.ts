/**
 * Competitive Data Hook
 * Fetches and polls competitive leaderboard data for a business
 * 
 * SOLID: Single Responsibility - competitive data fetching only
 * DRY: Reusable hook for competitive data with polling
 */

import { useState, useEffect, useCallback } from 'react';
import { usePolling } from './use-polling';
import type { CompetitiveLeaderboardDTO } from '@/lib/data/types';

export interface UseCompetitiveDataReturn {
  leaderboard: CompetitiveLeaderboardDTO | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

/**
 * Hook for fetching competitive leaderboard data with automatic polling
 * 
 * @param businessId - Business ID to fetch competitive data for
 * @param businessStatus - Current business status (used to determine if polling should be active)
 * 
 * @example
 * ```tsx
 * const { leaderboard, loading, error, refresh } = useCompetitiveData(
 *   businessId,
 *   business?.status
 * );
 * ```
 */
export function useCompetitiveData(
  businessId: number,
  businessStatus?: string
): UseCompetitiveDataReturn {
  const [leaderboard, setLeaderboard] = useState<CompetitiveLeaderboardDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      
      // Fetch fingerprint data (includes competitive leaderboard)
      const response = await fetch(`/api/fingerprint/business/${businessId}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          // No fingerprint yet - this is expected during CFP
          setLeaderboard(null);
          setError(null);
          setLoading(false);
          return;
        }
        
        setError('Failed to load competitive data');
        setLoading(false);
        return;
      }

      const data = await response.json();
      
      // Remove debug metadata if present
      const { _debug, ...cleanData } = data as any;
      
      if (cleanData && cleanData.competitiveLeaderboard) {
        setLeaderboard(cleanData.competitiveLeaderboard);
        setError(null);
      } else {
        setLeaderboard(null);
        setError(null);
      }
    } catch (err) {
      console.error('Error loading competitive data:', err);
      setError('Failed to load competitive data');
    } finally {
      setLoading(false);
    }
  }, [businessId]);

  useEffect(() => {
    void load();
  }, [load]);

  // Poll for updates when business is processing OR no data yet
  const isProcessing = 
    businessStatus === 'crawling' || 
    businessStatus === 'generating' ||
    businessStatus === 'pending';

  // Poll if processing OR if we don't have leaderboard data yet
  const shouldPoll = isProcessing || !leaderboard;

  usePolling({
    enabled: shouldPoll,
    interval: 5000, // Poll every 5 seconds
    maxPolls: 60, // Stop after 5 minutes (60 * 5s)
    onPoll: () => {
      void load();
    },
  });

  return {
    leaderboard,
    loading,
    error,
    refresh: load,
  };
}


