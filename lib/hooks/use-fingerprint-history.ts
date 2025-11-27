/**
 * Fingerprint History Hook
 * Fetches historical fingerprint data for a business
 * 
 * DRY: Centralizes fingerprint history fetching
 * SOLID: Single Responsibility - data fetching only
 */

import useSWR from 'swr';
import type { FingerprintHistoryDTO } from '@/lib/data/types';

interface FingerprintHistoryResponse {
  businessId: number;
  businessName: string;
  history: FingerprintHistoryDTO[];
  total: number;
}

const fetcher = async (url: string): Promise<FingerprintHistoryDTO[]> => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Failed to fetch fingerprint history');
  }
  const data: FingerprintHistoryResponse = await response.json();
  return data.history || [];
};

export function useFingerprintHistory(businessId: number | null) {
  const { data, error, isLoading, mutate } = useSWR<FingerprintHistoryDTO[]>(
    businessId ? `/api/business/${businessId}/fingerprint/history` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
    }
  );

  return {
    data: data || [],
    error,
    isLoading,
    refresh: mutate,
  };
}


