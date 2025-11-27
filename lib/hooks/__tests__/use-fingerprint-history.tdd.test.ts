/**
 * TDD Test: useFingerprintHistory Hook - Tests Drive Implementation
 * 
 * SPECIFICATION: useFingerprintHistory Hook
 * 
 * As a developer
 * I want a hook to fetch fingerprint history
 * So that components can easily access historical data
 * 
 * Acceptance Criteria:
 * 1. Fetches fingerprint history from API
 * 2. Handles loading and error states
 * 3. Returns empty array when no history
 * 4. Refetches on businessId change
 * 
 * TDD Cycle: RED → GREEN → REFACTOR
 * Tests written FIRST to drive implementation
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import type { FingerprintHistoryDTO } from '@/lib/data/types';

// Mock SWR
const mockSWR = vi.fn();
vi.mock('swr', () => ({
  default: (key: string, fetcher: any) => mockSWR(key, fetcher),
}));

// Mock fetch
global.fetch = vi.fn();

describe('🔴 RED: useFingerprintHistory Hook Specification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * SPECIFICATION 1: Fetches fingerprint history from API
   * 
   * Given: Valid business ID
   * When: Hook is called
   * Then: Should fetch from /api/business/[id]/fingerprint/history
   */
  it('MUST fetch fingerprint history from API', async () => {
    // Arrange: Mock API response
    const mockHistory: FingerprintHistoryDTO[] = [
      {
        id: 1,
        date: new Date().toISOString(),
        visibilityScore: 75,
        mentionRate: 50,
        sentimentScore: 85,
        accuracyScore: 90,
        avgRankPosition: 2.5,
      },
    ];

    mockSWR.mockReturnValue({
      data: mockHistory,
      error: null,
      isLoading: false,
    });

    // Act: Use hook (TEST DRIVES IMPLEMENTATION)
    const { useFingerprintHistory } = await import('../use-fingerprint-history');
    const { result } = renderHook(() => useFingerprintHistory(1));

    // Assert: SPECIFICATION - MUST fetch from API
    await waitFor(() => {
      expect(result.current.data).toEqual(mockHistory);
    });
    expect(mockSWR).toHaveBeenCalledWith(
      '/api/business/1/fingerprint/history',
      expect.any(Function)
    );
  });

  /**
   * SPECIFICATION 2: Handles loading and error states
   * 
   * Given: API call in progress or error
   * When: Hook is called
   * Then: Should return loading/error states
   */
  it('MUST handle loading and error states', async () => {
    // Arrange: Mock loading state
    mockSWR.mockReturnValue({
      data: undefined,
      error: null,
      isLoading: true,
    });

    // Act: Use hook
    const { useFingerprintHistory } = await import('../use-fingerprint-history');
    const { result } = renderHook(() => useFingerprintHistory(1));

    // Assert: SPECIFICATION - MUST return loading state
    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toBeUndefined();

    // Arrange: Mock error state
    mockSWR.mockReturnValue({
      data: undefined,
      error: new Error('Failed to fetch'),
      isLoading: false,
    });

    const { result: errorResult } = renderHook(() => useFingerprintHistory(1));

    // Assert: SPECIFICATION - MUST return error state
    expect(errorResult.current.error).toBeDefined();
    expect(errorResult.current.isLoading).toBe(false);
  });

  /**
   * SPECIFICATION 3: Returns empty array when no history
   * 
   * Given: Business with no fingerprint history
   * When: Hook is called
   * Then: Should return empty array
   */
  it('MUST return empty array when no history', async () => {
    // Arrange: Mock empty response
    mockSWR.mockReturnValue({
      data: { history: [] },
      error: null,
      isLoading: false,
    });

    // Act: Use hook
    const { useFingerprintHistory } = await import('../use-fingerprint-history');
    const { result } = renderHook(() => useFingerprintHistory(1));

    // Assert: SPECIFICATION - MUST return empty array
    await waitFor(() => {
      expect(result.current.data).toEqual([]);
    });
  });
});


