import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { SWRConfig } from 'swr';
import { useUser } from '../use-user';

describe('useUser hook', () => {
  const wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <SWRConfig value={{ provider: () => new Map() }}>{children}</SWRConfig>
  );

  beforeEach(() => {
    vi.clearAllMocks();
    // @ts-expect-error override global
    global.fetch = vi.fn();
  });

  it('returns user data when fetch succeeds', async () => {
    // Mock API response
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 1, email: 'test@example.com' }),
    });

    const { result } = renderHook(() => useUser(), { wrapper });

    await waitFor(() => {
      expect(result.current.user).not.toBeNull();
    });

    expect(result.current.user?.email).toBe('test@example.com');
    expect(result.current.error).toBeUndefined();
  });

  it('handles error response gracefully', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Unauthorized' }),
    });

    const { result } = renderHook(() => useUser(), { wrapper });

    await waitFor(() => {
      // user remains null on error
      expect(result.current.user).toBeNull();
    });
  });
});


