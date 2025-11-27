/**
 * Wikidata Publish Data Hook
 * Fetches Wikidata publish data with notability check
 * 
 * DRY: Centralizes publish data fetching
 * SOLID: Single Responsibility - data fetching only
 */

import useSWR from 'swr';
import type { WikidataPublishDTO } from '@/lib/data/types';

const fetcher = async (url: string): Promise<WikidataPublishDTO> => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Failed to fetch Wikidata publish data');
  }
  return response.json();
};

export function useWikidataPublishData(businessId: number | null) {
  const { data, error, isLoading, mutate } = useSWR<WikidataPublishDTO>(
    businessId ? `/api/wikidata/publish-data/${businessId}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
    }
  );

  return {
    data: data || null,
    error,
    isLoading,
    refresh: mutate,
  };
}


