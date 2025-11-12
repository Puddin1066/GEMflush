import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '../route';

// Mock database queries
vi.mock('@/lib/db/queries', () => ({
  getUser: vi.fn(),
  getTeamForUser: vi.fn(),
  getBusinessById: vi.fn(),
  updateBusiness: vi.fn(),
  createCrawlJob: vi.fn(),
  updateCrawlJob: vi.fn(),
}));

// Mock crawler
vi.mock('@/lib/crawler', () => ({
  webCrawler: {
    crawl: vi.fn(),
  },
}));

describe('POST /api/crawl', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    const { getUser } = await import('@/lib/db/queries');
    vi.mocked(getUser).mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/crawl', {
      method: 'POST',
      body: JSON.stringify({ businessId: 1 }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('returns 404 when no team found', async () => {
    const { getUser, getTeamForUser } = await import('@/lib/db/queries');
    vi.mocked(getUser).mockResolvedValue({ id: 1 } as any);
    vi.mocked(getTeamForUser).mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/crawl', {
      method: 'POST',
      body: JSON.stringify({ businessId: 1 }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('No team found');
  });

  it('creates crawl job successfully', async () => {
    const { getUser, getTeamForUser, getBusinessById, createCrawlJob } = await import('@/lib/db/queries');
    const { webCrawler } = await import('@/lib/crawler');

    const mockUser = { id: 1 } as any;
    const mockTeam = { id: 1 } as any;
    const mockBusiness = { id: 1, teamId: 1, url: 'https://example.com' } as any;
    const mockJob = { id: 1, businessId: 1, status: 'queued' } as any;

    vi.mocked(getUser).mockResolvedValue(mockUser);
    vi.mocked(getTeamForUser).mockResolvedValue(mockTeam);
    vi.mocked(getBusinessById).mockResolvedValue(mockBusiness);
    vi.mocked(createCrawlJob).mockResolvedValue(mockJob);
    // Mock crawler to prevent background job execution errors
    vi.mocked(webCrawler.crawl).mockResolvedValue({ success: true, data: {} } as any);

    const request = new NextRequest('http://localhost:3000/api/crawl', {
      method: 'POST',
      body: JSON.stringify({ businessId: 1 }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.jobId).toBe(1);
    expect(data.status).toBe('queued');
    expect(data.message).toBe('Crawl job started');
  });

  it('returns 404 when business not found', async () => {
    const { getUser, getTeamForUser, getBusinessById } = await import('@/lib/db/queries');

    vi.mocked(getUser).mockResolvedValue({ id: 1 } as any);
    vi.mocked(getTeamForUser).mockResolvedValue({ id: 1 } as any);
    vi.mocked(getBusinessById).mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/crawl', {
      method: 'POST',
      body: JSON.stringify({ businessId: 999 }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Business not found');
  });

  it('returns 403 when business belongs to different team', async () => {
    const { getUser, getTeamForUser, getBusinessById } = await import('@/lib/db/queries');

    vi.mocked(getUser).mockResolvedValue({ id: 1 } as any);
    vi.mocked(getTeamForUser).mockResolvedValue({ id: 1 } as any);
    vi.mocked(getBusinessById).mockResolvedValue({ id: 1, teamId: 2 } as any);

    const request = new NextRequest('http://localhost:3000/api/crawl', {
      method: 'POST',
      body: JSON.stringify({ businessId: 1 }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe('Unauthorized');
  });

  it('returns 400 for invalid input', async () => {
    const { getUser, getTeamForUser } = await import('@/lib/db/queries');

    vi.mocked(getUser).mockResolvedValue({ id: 1 } as any);
    vi.mocked(getTeamForUser).mockResolvedValue({ id: 1 } as any);

    const request = new NextRequest('http://localhost:3000/api/crawl', {
      method: 'POST',
      body: JSON.stringify({ businessId: 'invalid' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Validation error');
  });

  it('returns 400 for missing businessId', async () => {
    const { getUser, getTeamForUser } = await import('@/lib/db/queries');

    vi.mocked(getUser).mockResolvedValue({ id: 1 } as any);
    vi.mocked(getTeamForUser).mockResolvedValue({ id: 1 } as any);

    const request = new NextRequest('http://localhost:3000/api/crawl', {
      method: 'POST',
      body: JSON.stringify({}),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Validation error');
  });

  it('returns 500 for unexpected errors', async () => {
    const { getUser } = await import('@/lib/db/queries');

    vi.mocked(getUser).mockRejectedValue(new Error('Database error'));

    const request = new NextRequest('http://localhost:3000/api/crawl', {
      method: 'POST',
      body: JSON.stringify({ businessId: 1 }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Internal server error');
  });
});
