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
  createBusinessWithLocation: (url: string, location: { city: string; state: string; country: string; address?: string }) => Promise<void>;
  loading: boolean;
  error: string | null;
  needsLocation: boolean;
  crawledData: { name?: string; category?: string; url?: string } | null;
}

export function useCreateBusiness(): UseCreateBusinessReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsLocation, setNeedsLocation] = useState(false);
  const [crawledData, setCrawledData] = useState<{ name?: string; category?: string; url?: string } | null>(null);
  const router = useRouter();

  const createBusiness = async (url: string) => {
    setLoading(true);
    setError(null);
    setNeedsLocation(false);
    setCrawledData(null);

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

      const data = await response.json();

      // IDEAL: If location is required but business was created, redirect first
      // Then show location form on the business detail page
      if (response.status === 422 && data.needsLocation && data.business?.id) {
        // Business was created - redirect to it first
        // The location form will be shown on the business detail page
        // Add small delay to ensure database transaction is committed
        mutate('/api/business');
        setTimeout(() => {
          router.push(`/dashboard/businesses/${data.business.id}`);
        }, 100);
        setNeedsLocation(true);
        setCrawledData(data.crawledData || { url: formattedUrl });
        setLoading(false);
        return;
      }
      
      // If location needed but no business ID, show form on current page
      if (response.status === 422 && data.needsLocation) {
        setNeedsLocation(true);
        setCrawledData(data.crawledData || { url: formattedUrl });
        setLoading(false);
        return;
      }

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create business');
      }

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

  const createBusinessWithLocation = async (url: string, location: { city: string; state: string; country: string; address?: string }) => {
    setLoading(true);
    setError(null);
    setNeedsLocation(false);

    try {
      // Ensure URL has protocol
      let formattedUrl = url.trim();
      if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
        formattedUrl = `https://${formattedUrl}`;
      }

      const response = await fetch('/api/business', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          url: formattedUrl,
          location: {
            city: location.city,
            state: location.state,
            country: location.country,
            address: location.address,
          },
        }),
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
      // Add small delay to ensure database transaction is committed
      setTimeout(() => {
        router.push(`/dashboard/businesses/${data.business.id}`);
      }, 100);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create business';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { createBusiness, createBusinessWithLocation, loading, error, needsLocation, crawledData };
}

