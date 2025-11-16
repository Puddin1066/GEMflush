import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock monthly-processing service
vi.mock('@/lib/services/monthly-processing', () => ({
  runMonthlyProcessing: vi.fn(),
}));

describe('GET /api/cron/monthly', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('should not run processing when disabled by config', async () => {
    process.env.RUN_MONTHLY_PROCESSING = 'false';

    const { GET } = await import('../route');
    const request = new NextRequest('http://localhost:3000/api/cron/monthly');
    const response = await GET(request);
    const data = await response.json();

    const { runMonthlyProcessing } = await import('@/lib/services/monthly-processing');

    expect(response.status).toBe(200);
    expect(data.success).toBe(false);
    expect(runMonthlyProcessing).not.toHaveBeenCalled();
  });

  it('should run processing when enabled by config', async () => {
    process.env.RUN_MONTHLY_PROCESSING = 'true';

    const { GET } = await import('../route');
    const request = new NextRequest('http://localhost:3000/api/cron/monthly');
    const response = await GET(request);
    const data = await response.json();

    const { runMonthlyProcessing } = await import('@/lib/services/monthly-processing');

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(runMonthlyProcessing).toHaveBeenCalledTimes(1);
  });
});

