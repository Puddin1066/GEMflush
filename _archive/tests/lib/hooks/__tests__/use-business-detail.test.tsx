import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useBusinessDetail } from '../use-business-detail';

describe('useBusinessDetail hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // @ts-expect-error override global
    global.fetch = vi.fn();
  });

  it('fetches business and related data successfully', async () => {
    const businessResponse = {
      ok: true,
      json: async () => ({
        business: {
          id: 123,
          name: 'Test Biz',
          url: 'https://example.com',
          status: 'crawled',
          createdAt: new Date().toISOString(),
        },
      }),
    };

    const fingerprintResponse = {
      ok: true,
      json: async () => ({ id: 1, visibilityScore: 80 }),
    };

    const entityResponse = {
      ok: true,
      json: async () => ({ id: 'Q123', label: 'Test Entity' }),
    };

    (global.fetch as any)
      .mockResolvedValueOnce(businessResponse) // /api/business/[id]
      .mockResolvedValueOnce(fingerprintResponse) // /api/fingerprint/business/[id]
      .mockResolvedValueOnce(entityResponse); // /api/wikidata/entity/[id]

    const { result } = renderHook(() => useBusinessDetail(123));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.business?.name).toBe('Test Biz');
    expect(result.current.fingerprint).not.toBeNull();
    expect(result.current.entity).not.toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('sets error when business is not found', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: async () => ({ error: 'Not found' }),
    });

    const { result } = renderHook(() => useBusinessDetail(999));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.business).toBeNull();
    expect(result.current.error).toBeTruthy();
  });
});


