/**
 * Polling Hook
 * Reusable hook for polling data at intervals when certain conditions are met
 * 
 * SOLID: Single Responsibility - only handles polling logic
 * DRY: Reusable across any component that needs polling
 */

import { useEffect, useRef } from 'react';

export interface UsePollingOptions {
  /**
   * Whether polling should be active
   */
  enabled: boolean;
  
  /**
   * Polling interval in milliseconds
   * @default 5000
   */
  interval?: number;
  
  /**
   * Maximum number of polls before stopping
   * @default 60 (5 minutes at 5s interval)
   */
  maxPolls?: number;
  
  /**
   * Callback to execute on each poll
   */
  onPoll: () => void | Promise<void>;
  
  /**
   * Optional callback when polling stops
   */
  onStop?: () => void;
  
  /**
   * Optional callback when max polls reached
   */
  onMaxPollsReached?: () => void;
}

/**
 * Hook for polling data at intervals
 * 
 * @example
 * ```tsx
 * usePolling({
 *   enabled: business.status === 'crawling',
 *   interval: 5000,
 *   onPoll: () => refreshBusiness(),
 *   onStop: () => console.log('Polling stopped'),
 * });
 * ```
 */
export function usePolling({
  enabled,
  interval = 5000,
  maxPolls = 60,
  onPoll,
  onStop,
  onMaxPollsReached,
}: UsePollingOptions): void {
  const pollCountRef = useRef(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!enabled) {
      // Reset poll count when disabled
      pollCountRef.current = 0;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Reset poll count when enabled
    pollCountRef.current = 0;

    const poll = async () => {
      pollCountRef.current += 1;

      // Check if max polls reached
      if (pollCountRef.current >= maxPolls) {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        onMaxPollsReached?.();
        return;
      }

      // Execute poll callback
      try {
        await onPoll();
      } catch (error) {
        // Silently handle errors during polling
        console.error('[usePolling] Error during poll:', error);
      }
    };

    // Execute immediately on first enable
    void poll();

    // Set up interval
    intervalRef.current = setInterval(poll, interval);

    // Cleanup
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      onStop?.();
    };
  }, [enabled, interval, maxPolls, onPoll, onStop, onMaxPollsReached]);
}

