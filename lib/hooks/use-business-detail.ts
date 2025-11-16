/**
 * Business Detail Hook
 * DRY: Centralizes fetching of a single business and its related panels
 * SOLID: Single Responsibility - data orchestration for business detail UI
 */

import { useCallback, useEffect, useState } from 'react';
import type { FingerprintDetailDTO, WikidataEntityDetailDTO } from '@/lib/data/types';

export interface BusinessDetail {
  id: number;
  name: string;
  url: string;
  category?: string | null;
  location?: {
    city: string;
    state: string;
    country: string;
  } | null;
  wikidataQID?: string | null;
  status: string;
  createdAt: string;
  lastCrawledAt?: string | null;
}

export interface UseBusinessDetailReturn {
  business: BusinessDetail | null;
  fingerprint: FingerprintDetailDTO | null;
  entity: WikidataEntityDetailDTO | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
  setFingerprint: (f: FingerprintDetailDTO | null) => void;
  setEntity: (e: WikidataEntityDetailDTO | null) => void;
  setError: (e: string | null) => void;
}

export function useBusinessDetail(businessId: number): UseBusinessDetailReturn {
  const [business, setBusiness] = useState<BusinessDetail | null>(null);
  const [fingerprint, setFingerprint] = useState<FingerprintDetailDTO | null>(null);
  const [entity, setEntity] = useState<WikidataEntityDetailDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);

      const response = await fetch(`/api/business/${businessId}`);
      if (!response.ok) {
        if (response.status === 404) {
          setError('Business not found. It may have been deleted or you may not have access.');
        } else {
          console.error('Failed to fetch business:', response.status);
          setError('Failed to load business data');
        }
        setLoading(false);
        return;
      }

      const data = await response.json();
      const businessData = data.business as BusinessDetail | undefined;

      if (!businessData) {
        console.warn(`Business ${businessId} data not returned from API`);
        setError('Business data not found');
        return;
      }

      setBusiness(businessData);
      setError(null);

      // Fingerprint (non-fatal)
      try {
        const fpResponse = await fetch(`/api/fingerprint/business/${businessId}`);
        if (fpResponse.ok) {
          const fpData = await fpResponse.json();
          if (fpData) {
            setFingerprint(fpData);
          }
        }
      } catch (err) {
        console.error('Error loading fingerprint:', err);
      }

      // Entity (non-fatal, only when crawled/published)
      if (businessData.status === 'crawled' || businessData.status === 'published') {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 15000);

          try {
            const entityResponse = await fetch(`/api/wikidata/entity/${businessId}`, {
              signal: controller.signal,
            });
            clearTimeout(timeoutId);

            if (entityResponse.ok) {
              const entityData = await entityResponse.json();
              if (entityData && !entityData.error) {
                setEntity(entityData);
              } else {
                console.warn('Entity API returned error:', entityData?.error || 'Unknown error');
                setEntity(null);
              }
            } else {
              const errorData = await entityResponse.json().catch(() => ({}));
              console.warn(
                `Entity API failed (${entityResponse.status}):`,
                errorData?.error || 'Unknown error'
              );
              setEntity(null);
            }
          } catch (fetchError) {
            clearTimeout(timeoutId);
            if (fetchError instanceof Error && fetchError.name === 'AbortError') {
              console.warn('Entity API request timed out after 15s');
              setEntity(null);
            } else {
              throw fetchError;
            }
          }
        } catch (err) {
          console.error('Error loading entity:', err);
          setEntity(null);
        }
      } else {
        setEntity(null);
      }
    } catch (err) {
      console.error('Error loading business:', err);
      setError('Failed to load business. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [businessId]);

  useEffect(() => {
    void load();
  }, [load]);

  return {
    business,
    fingerprint,
    entity,
    loading,
    error,
    refresh: () => {
      void load();
    },
    setFingerprint,
    setEntity,
    setError,
  };
}


