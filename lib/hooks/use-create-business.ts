/**
 * Create Business Hook
 * Handles business creation with URL-only or full form
 * 
 * SOLID: Single Responsibility - only handles business creation
 * DRY: Reusable across pages
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { mutate } from 'swr';

export interface UseCreateBusinessReturn {
  createBusiness: (url: string) => Promise<void>;
  loading: boolean;
  error: string | null;
}

export function useCreateBusiness(): UseCreateBusinessReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const createBusiness = async (url: string) => {
    setLoading(true);
    setError(null);

    try {
      // Ensure URL has protocol
      let formattedUrl = url.trim();
      if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
        formattedUrl = `https://${formattedUrl}`;
      }

      const response = await fetch('/api/business', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: formattedUrl }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create business');
      }

      const data = await response.json();

      if (!data?.business?.id) {
        throw new Error('Business created but ID not returned. Please try again.');
      }

      // Invalidate businesses list cache
      mutate('/api/business');

      // Redirect to business detail page
      router.push(`/dashboard/businesses/${data.business.id}`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create business';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { createBusiness, loading, error };
}

