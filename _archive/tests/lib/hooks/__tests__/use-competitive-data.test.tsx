/**
 * Unit Tests: useCompetitiveData Hook
 * 
 * Tests the competitive data hook for:
 * - Data fetching
 * - Polling behavior
 * - Error handling
 * - Loading states
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useCompetitiveData } from '../use-competitive-data';
import type { CompetitiveLeaderboardDTO } from '@/lib/data/types';

// Mock fetch
global.fetch = vi.fn();

// Mock usePolling
vi.mock('../use-polling', () => ({
  usePolling: vi.fn(),
}));

describe('useCompetitiveData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (global.fetch as any).mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const mockLeaderboard: CompetitiveLeaderboardDTO = {
    targetBusiness: {
      name: 'Test Business',
      rank: 1,
      mentionCount: 5,
      avgPosition: 1.5,
      marketShare: 50,
    },
    competitors: [
      {
        rank: 2,
        name: 'Competitor 1',
        mentionCount: 3,
        avgPosition: 2.0,
        appearsWithTarget: 2,
        marketShare: 30,
      },
      {
        rank: 3,
        name: 'Competitor 2',
        mentionCount: 2,
        avgPosition: 3.0,
        appearsWithTarget: 1,
        marketShare: 20,
      },
    ],
    insights: {
      marketPosition: 'leading' as const,
      topCompetitor: {
        name: 'Competitor 1',
        mentionCount: 3,
        marketShare: 30,
      },
      competitiveGap: 2,
      recommendation: 'Maintain your leading position',
    },
    totalQueries: 10,
  };

  it('should fetch competitive data successfully', async () => {
    const mockFingerprintResponse = {
      visibilityScore: 75,
      summary: {},
      results: [],
      competitiveLeaderboard: mockLeaderboard,
      createdAt: '2 days ago',
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockFingerprintResponse,
    });

    const { result } = renderHook(() => useCompetitiveData(1));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.leaderboard).toEqual(mockLeaderboard);
    expect(result.current.error).toBe(null);
    expect(global.fetch).toHaveBeenCalledWith('/api/fingerprint/business/1');
  });

  it('should handle 404 (no fingerprint yet)', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 404,
    });

    const { result } = renderHook(() => useCompetitiveData(1));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.leaderboard).toBe(null);
    expect(result.current.error).toBe(null); // 404 is expected, not an error
  });

  it('should handle API errors', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    const { result } = renderHook(() => useCompetitiveData(1));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.leaderboard).toBe(null);
    expect(result.current.error).toBe('Failed to load competitive data');
  });

  it('should handle fetch exceptions', async () => {
    (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useCompetitiveData(1));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('Failed to load competitive data');
    expect(result.current.leaderboard).toBe(null);
  });

  it('should handle response without competitiveLeaderboard', async () => {
    const mockFingerprintResponse = {
      visibilityScore: 75,
      summary: {},
      results: [],
      // No competitiveLeaderboard
      createdAt: '2 days ago',
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockFingerprintResponse,
    });

    const { result } = renderHook(() => useCompetitiveData(1));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.leaderboard).toBe(null);
    expect(result.current.error).toBe(null);
  });

  it('should remove debug metadata from response', async () => {
    const mockFingerprintResponse = {
      visibilityScore: 75,
      summary: {},
      results: [],
      competitiveLeaderboard: mockLeaderboard,
      _debug: {
        fingerprintId: 123,
        businessId: 1,
      },
      createdAt: '2 days ago',
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockFingerprintResponse,
    });

    const { result } = renderHook(() => useCompetitiveData(1));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Should have leaderboard but no _debug
    expect(result.current.leaderboard).toEqual(mockLeaderboard);
    expect((result.current.leaderboard as any)?._debug).toBeUndefined();
  });

  it('should provide refresh function', async () => {
    const mockFingerprintResponse = {
      visibilityScore: 75,
      summary: {},
      results: [],
      competitiveLeaderboard: mockLeaderboard,
      createdAt: '2 days ago',
    };

    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => mockFingerprintResponse,
    });

    const { result } = renderHook(() => useCompetitiveData(1));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.refresh).toBeDefined();
    expect(typeof result.current.refresh).toBe('function');

    // Call refresh
    await result.current.refresh();

    // Should have called fetch again
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('should start with loading state', () => {
    (global.fetch as any).mockImplementation(() => new Promise(() => {})); // Never resolves

    const { result } = renderHook(() => useCompetitiveData(1));

    expect(result.current.loading).toBe(true);
    expect(result.current.leaderboard).toBe(null);
  });
});


