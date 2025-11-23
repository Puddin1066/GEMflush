/**
 * Business Detail Hook
 * DRY: Centralizes fetching of a single business and its related panels
 * SOLID: Single Responsibility - data orchestration for business detail UI
 */

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
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
  automationEnabled?: boolean;
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
  const router = useRouter();

  // Clear state when businessId changes to prevent showing wrong data
  useEffect(() => {
    setBusiness(null);
    setFingerprint(null);
    setEntity(null);
    setError(null);
    setLoading(true);
  }, [businessId]);

  const load = useCallback(async (retryCount = 0) => {
    try {
      setLoading(true);

      const response = await fetch(`/api/business/${businessId}`);
      if (!response.ok) {
        // If 404 and this is the first attempt (retryCount === 0), retry once after a short delay
        // This handles race conditions where business was just created
        if (response.status === 404 && retryCount === 0) {
          console.log(`[BUSINESS-DETAIL] Business ${businessId} not found on first attempt, retrying...`);
          setTimeout(() => {
            void load(1); // Retry once
          }, 1000); // Wait 1 second for database transaction to commit
          return;
        }
        
        // If still 404 after retry, business truly doesn't exist
        // Redirect to businesses list instead of showing error
        if (response.status === 404 && retryCount > 0) {
          console.warn(`[BUSINESS-DETAIL] Business ${businessId} not found after retry, redirecting to businesses list`);
          setLoading(false);
          // Redirect to businesses list
          router.push('/dashboard/businesses');
          return;
        }
        
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

          // Log received data for debugging (only on first load or status change)
          // Removed frequent logging to reduce console noise

      // Ensure createdAt is a string (API might return Date object)
      const normalizedBusiness: BusinessDetail = {
        ...businessData,
        createdAt: typeof businessData.createdAt === 'string' 
          ? businessData.createdAt 
          : (businessData.createdAt as any) instanceof Date 
            ? (businessData.createdAt as Date).toISOString()
            : String(businessData.createdAt),
        lastCrawledAt: businessData.lastCrawledAt 
          ? (typeof businessData.lastCrawledAt === 'string'
              ? businessData.lastCrawledAt
              : (businessData.lastCrawledAt as any) instanceof Date
                ? (businessData.lastCrawledAt as Date).toISOString()
                : null)
          : null,
      };

      // Only update state if data actually changed (prevents unnecessary re-renders)
      setBusiness(prev => {
        if (!prev || 
            prev.status !== normalizedBusiness.status ||
            prev.wikidataQID !== normalizedBusiness.wikidataQID ||
            prev.name !== normalizedBusiness.name) {
          return normalizedBusiness;
        }
        return prev; // No change, return previous to prevent re-render
      });
      setError(null);

      // Fingerprint (non-fatal)
      try {
        const fpResponse = await fetch(`/api/fingerprint/business/${businessId}`);
        if (fpResponse.ok) {
          const fpData = await fpResponse.json();
          // Only set fingerprint if it's a valid DTO (has summary property)
          // Error responses will have error property instead
          if (fpData && !fpData.error && fpData.summary) {
                // Verify the fingerprint matches the requested business
                const debugInfo = (fpData as any)._debug;
                if (debugInfo) {
                  if (debugInfo.businessId !== businessId) {
                    console.error(`[useBusinessDetail] MISMATCH: Received fingerprint for business ${debugInfo.businessId}, but requested ${businessId}`);
                    console.error(`[useBusinessDetail] Fingerprint ID: ${debugInfo.fingerprintId}, Business: "${debugInfo.businessName}"`);
                    setFingerprint(null);
                    return;
                  }
                  // Removed frequent verification logging to reduce console noise
                }
                
                // Remove debug metadata before setting state
                const { _debug, ...cleanFpData } = fpData as any;
                
                // Removed frequent fingerprint loading logs to reduce console noise
            setFingerprint(cleanFpData);
          } else if (fpData?.error) {
            // Only log actual errors, not missing fingerprints (expected during initial load)
            console.warn(`[useBusinessDetail] Fingerprint API returned error for business ${businessId}:`, fpData.error);
            setFingerprint(null);
          } else {
            // Removed: No fingerprint data is expected initially, no need to log
            setFingerprint(null);
          }
        } else {
          // Removed: Non-200 status is expected if fingerprint doesn't exist yet
          setFingerprint(null);
        }
      } catch (err) {
        console.error(`[useBusinessDetail] Error loading fingerprint for business ${businessId}:`, err);
        setFingerprint(null);
      }

      // Entity (non-fatal, fetch when crawled/published/generating/fingerprinted)
      // Include 'fingerprinted' because auto-publish may have occurred
      // Include 'generating' because publish step sets status to 'generating' before 'published'
      // SOLID: Single Responsibility - entity fetching with improved error handling
      // DRY: Centralized timeout and error handling logic
      if (businessData.status === 'crawled' || businessData.status === 'published' || businessData.status === 'generating' || businessData.wikidataQID) {
        try {
          const controller = new AbortController();
          // Increased timeout to 30s for Wikidata API latency (was 15s)
          const timeoutId = setTimeout(() => controller.abort(), 30000);

          try {
            const entityResponse = await fetch(`/api/wikidata/entity/${businessId}`, {
              signal: controller.signal,
            });
            clearTimeout(timeoutId);

                if (entityResponse.ok) {
                  const entityData = await entityResponse.json();
                  if (entityData && !entityData.error) {
                    // Removed frequent entity loading logs to reduce console noise
                    setEntity(entityData);
                  } else {
                    // Only log actual errors, not missing entities
                    if (entityData?.error) {
                      console.warn(`[useBusinessDetail] Entity API returned error for business ${businessId}:`, entityData.error);
                    }
                    setEntity(null);
                  }
                } else {
                  // Don't log 404s or other expected errors for entities that don't exist yet
                  if (entityResponse.status !== 404) {
                    const errorData = await entityResponse.json().catch(() => ({}));
                    console.warn(`[useBusinessDetail] Entity API returned ${entityResponse.status} for business ${businessId}:`, errorData?.error || 'Unknown error');
                  }
                  setEntity(null);
                }
          } catch (fetchError) {
            clearTimeout(timeoutId);
            if (fetchError instanceof Error && fetchError.name === 'AbortError') {
              // Improved error message for timeout
              console.warn(`[useBusinessDetail] Entity API request timed out after 30s for business ${businessId}. This may indicate Wikidata API latency or entity generation in progress.`);
              setEntity(null);
            } else {
              throw fetchError;
            }
          }
        } catch (err) {
          // Improved error handling with context
          console.error(`[useBusinessDetail] Error loading entity for business ${businessId}:`, err);
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

  // Auto-refresh when business is in processing state (crawling, generating)
  // OR when business is crawled with fingerprint but not yet published (publish might be in progress)
  // This ensures the page updates automatically when background jobs complete
  useEffect(() => {
    if (!business) return;
    
    // Determine if we should poll:
    // 1. Business is actively processing (crawling, generating)
    // 2. Business is pending with automation enabled (processing might have started)
    // 3. Business is in error state with automation enabled (processing might be retrying)
    // 4. Business is crawled with fingerprint but not published AND automation is enabled (publish might be running)
    // NOTE: Don't poll indefinitely if publish failed or was skipped - only poll if automation is active
    const isActivelyProcessing = 
      business.status === 'crawling' || 
      business.status === 'generating';
    
    const isWaitingForPublish = 
      business.status === 'crawled' && 
      fingerprint && 
      !business.wikidataQID &&
      business.automationEnabled; // Only poll if automation is enabled (publish might be running)
    
    const isPendingWithAutomation = 
      business.status === 'pending' &&
      business.automationEnabled; // Only poll if automation is enabled
    
    const isErrorWithAutomation = 
      business.status === 'error' &&
      business.automationEnabled; // Poll for error state if automation enabled (retry might be triggered)
    
    const shouldPoll = isActivelyProcessing || isWaitingForPublish || isPendingWithAutomation || isErrorWithAutomation;
    
    if (shouldPoll) {
      let pollCount = 0;
      const maxPolls = 60; // Stop after 60 polls (3 minutes max)
      let lastLoggedPoll = 0;
      
      const interval = setInterval(() => {
        pollCount++;
        
        // Only log every 20th poll (every minute) to reduce console noise
        if (pollCount - lastLoggedPoll >= 20) {
          console.log(`[AUTO-REFRESH] Polling for business ${businessId} (status: ${business.status}, published: ${business.wikidataQID ? 'Yes' : 'No'}, poll: ${pollCount}/${maxPolls})...`);
          lastLoggedPoll = pollCount;
        }
        
        // Stop polling after max attempts
        if (pollCount >= maxPolls) {
          console.log(`[AUTO-REFRESH] Stopped polling for business ${businessId} after ${maxPolls} attempts (3 minutes)`);
          clearInterval(interval);
          return;
        }
        
        // Use a refetch function that doesn't trigger unnecessary re-renders
        // Only update state if data actually changed
        void load().catch(() => {
          // Silently handle errors during polling
        });
      }, 5000); // Poll every 5 seconds (reduced frequency to minimize Fast Refresh)
      
      return () => clearInterval(interval);
    }
  }, [business?.status, business?.wikidataQID, business?.automationEnabled, businessId, fingerprint, load]);

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


