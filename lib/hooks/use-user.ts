/**
 * User Data Hook
 * DRY: Centralized user data fetching and cache configuration
 * SOLID: Single Responsibility - only handles current user data
 */

import useSWR, { mutate } from 'swr';
import type { User } from '@/lib/db/schema';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export interface UseUserReturn {
  user: User | null;
  isLoading: boolean;
  error: Error | undefined;
  refresh: () => void;
}

/**
 * Hook to fetch the authenticated user.
 * Uses conservative revalidation to avoid chatty /api/user requests.
 */
export function useUser(): UseUserReturn {
  const { data, error, isLoading } = useSWR<User>('/api/user', fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    dedupingInterval: 30_000,
  });

  return {
    user: data || null,
    isLoading,
    error,
    refresh: () => {
      void mutate('/api/user');
    },
  };
}


