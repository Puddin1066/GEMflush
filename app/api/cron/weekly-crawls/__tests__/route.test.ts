/**
 * Weekly Crawls Cron Endpoint Tests
 * SOLID: Single Responsibility - tests endpoint behavior
 * DRY: Reuses test patterns from other endpoint tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock scheduler service
vi.mock('@/lib/services/scheduler-service-execution', () => ({
  processScheduledAutomation: vi.fn().mockResolvedValue({
    total: 5,
    success: 4,
    skipped: 1,
    failed: 0,
  }),
}));

describe('GET /api/cron/weekly-crawls', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should process scheduled automation with valid Vercel cron header', async () => {
    const { GET } = await import('../route');
    const { processScheduledAutomation } = await import('@/lib/services/scheduler-service');

    const request = new NextRequest('http://localhost:3000/api/cron/weekly-crawls', {
      headers: {
        'x-vercel-cron': '1',
      },
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toBe('Scheduled automation processed');
    expect(data.results).toEqual({
      total: 5,
      success: 4,
      skipped: 1,
      failed: 0,
    });
    expect(processScheduledAutomation).toHaveBeenCalledWith({
      batchSize: 10,
      catchMissed: true,
    });
  });

  it('should process scheduled automation with valid CRON_SECRET', async () => {
    process.env.CRON_SECRET = 'test-secret';

    const { GET } = await import('../route');
    const { processScheduledAutomation } = await import('@/lib/services/scheduler-service');

    const request = new NextRequest('http://localhost:3000/api/cron/weekly-crawls', {
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

  it('should return 401 without proper authentication', async () => {
    process.env.CRON_SECRET = 'test-secret';

    const { GET } = await import('../route');

    const request = new NextRequest('http://localhost:3000/api/cron/weekly-crawls');

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('should handle processing errors gracefully', async () => {
    const { processScheduledAutomation } = await import('@/lib/services/scheduler-service');
    vi.mocked(processScheduledAutomation).mockRejectedValueOnce(new Error('Processing failed'));

    const { GET } = await import('../route');

    const request = new NextRequest('http://localhost:3000/api/cron/weekly-crawls', {
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


