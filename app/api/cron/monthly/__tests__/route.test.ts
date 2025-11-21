/**
 * Monthly Cron Endpoint Tests
 * SOLID: Single Responsibility - tests endpoint behavior
 * DRY: Reuses test patterns from weekly-crawls tests
 * 
 * Note: This endpoint is deprecated but kept for backward compatibility
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock scheduler service (unified processing)
vi.mock('@/lib/services/scheduler-service', () => ({
  processScheduledAutomation: vi.fn().mockResolvedValue({
    total: 3,
    success: 2,
    skipped: 1,
    failed: 0,
  }),
}));

describe('GET /api/cron/monthly', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call unified scheduled automation processing', async () => {
    const { GET } = await import('../route');
    const { processScheduledAutomation } = await import('@/lib/services/scheduler-service');

    const request = new NextRequest('http://localhost:3000/api/cron/monthly', {
      headers: {
        'x-vercel-cron': '1',
      },
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toBe('Monthly processing completed (unified automation)');
    expect(data.results).toEqual({
      total: 3,
      success: 2,
      skipped: 1,
      failed: 0,
    });
    expect(processScheduledAutomation).toHaveBeenCalledTimes(1);
    expect(processScheduledAutomation).toHaveBeenCalledWith({
      batchSize: 10,
      catchMissed: true,
    });
  });

  it('should process with valid CRON_SECRET', async () => {
    process.env.CRON_SECRET = 'test-secret';

    const { GET } = await import('../route');
    const { processScheduledAutomation } = await import('@/lib/services/scheduler-service');

    const request = new NextRequest('http://localhost:3000/api/cron/monthly', {
      headers: {
        authorization: 'Bearer test-secret',
      },
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(processScheduledAutomation).toHaveBeenCalled();
  });

  it('should return unauthorized without proper auth', async () => {
    process.env.CRON_SECRET = 'test-secret';

    const { GET } = await import('../route');

    const request = new NextRequest('http://localhost:3000/api/cron/monthly');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('should handle processing errors gracefully', async () => {
    const { processScheduledAutomation } = await import('@/lib/services/scheduler-service');
    vi.mocked(processScheduledAutomation).mockRejectedValueOnce(new Error('Processing failed'));

    const { GET } = await import('../route');

    const request = new NextRequest('http://localhost:3000/api/cron/monthly', {
      headers: {
        'x-vercel-cron': '1',
      },
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Internal server error');
    expect(data.message).toBe('Processing failed');
  });
});

