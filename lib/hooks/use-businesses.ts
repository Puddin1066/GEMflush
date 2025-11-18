/**
 * Businesses Hook
 * Fetches list of businesses for the current team
 * 
 * SOLID: Single Responsibility - only handles business list fetching
 * DRY: Reusable across pages
 */

import useSWR from 'swr';
import { mutate } from 'swr';

const fetcher = (url: string) => fetch(url).then((res) => {
  if (!res.ok) {
    throw new Error(`Failed to fetch: ${res.statusText}`);
  }
  return res.json();
});

export interface Business {
  id: number;
  name: string;
  url: string;
  status: string;
  category?: string | null;
  location?: {
    city: string;
    state: string;
    country: string;
  } | null;
  wikidataQID?: string | null;
  createdAt: Date | string;
}

export interface UseBusinessesReturn {
  businesses: Business[];
  maxBusinesses: number;
  loading: boolean;
  error: Error | null;
  refresh: () => void;
}

export function useBusinesses(): UseBusinessesReturn {
  const { data, error, isLoading, mutate } = useSWR<{
    businesses: Business[];
    maxBusinesses: number;
  }>('/api/business', fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
  });

  return {
    businesses: data?.businesses || [],
    maxBusinesses: data?.maxBusinesses || 1,
    loading: isLoading,
    error: error ? new Error(error.message || 'Failed to load businesses') : null,
    refresh: () => mutate(),
  };
}

