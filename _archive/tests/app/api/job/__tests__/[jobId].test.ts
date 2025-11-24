import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '../[jobId]/route';
import { getUser, getTeamForUser, getCrawlJob } from '@/lib/db/queries';
import { verifyBusinessOwnership } from '@/lib/auth/middleware';

// Mock dependencies
vi.mock('@/lib/db/queries', () => ({
  getUser: vi.fn(),
  getTeamForUser: vi.fn(),
  getCrawlJob: vi.fn(),
}));

vi.mock('@/lib/auth/middleware', () => ({
  verifyBusinessOwnership: vi.fn(),
}));

describe('GET /api/job/[jobId]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 401 when user is not authenticated', async () => {
    vi.mocked(getUser).mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/job/1');
    const params = Promise.resolve({ jobId: '1' });

    const response = await GET(request, { params });
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('should return 404 when team is not found', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 1 } as any);
    vi.mocked(getTeamForUser).mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/job/1');
    const params = Promise.resolve({ jobId: '1' });

    const response = await GET(request, { params });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('No team found');
  });

  it('should return 400 when jobId is invalid', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 1 } as any);
    vi.mocked(getTeamForUser).mockResolvedValue({ id: 1 } as any);

    const request = new NextRequest('http://localhost:3000/api/job/invalid');
    const params = Promise.resolve({ jobId: 'invalid' });

    const response = await GET(request, { params });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid job ID');
  });

  it('should return 404 when job is not found', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 1 } as any);
    vi.mocked(getTeamForUser).mockResolvedValue({ id: 1 } as any);
    vi.mocked(getCrawlJob).mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/job/999');
    const params = Promise.resolve({ jobId: '999' });

    const response = await GET(request, { params });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Job not found');
  });

  it('should return 403 when business does not belong to team', async () => {
    const mockJob = {
      id: 1,
      businessId: 1,
      jobType: 'initial_crawl',
      status: 'queued',
      progress: 0,
      result: null,
      errorMessage: null,
      createdAt: new Date(),
      completedAt: null,
    };

    vi.mocked(getUser).mockResolvedValue({ id: 1 } as any);
    vi.mocked(getTeamForUser).mockResolvedValue({ id: 1 } as any);
    vi.mocked(getCrawlJob).mockResolvedValue(mockJob as any);
    vi.mocked(verifyBusinessOwnership).mockResolvedValue({
      authorized: false,
      business: { id: 1, teamId: 999 },
    });

    const request = new NextRequest('http://localhost:3000/api/job/1');
    const params = Promise.resolve({ jobId: '1' });

    const response = await GET(request, { params });
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe('Unauthorized');
  });

  it('should return 403 when business is not found', async () => {
    const mockJob = {
      id: 1,
      businessId: 1,
      jobType: 'initial_crawl',
      status: 'queued',
      progress: 0,
      result: null,
      errorMessage: null,
      createdAt: new Date(),
      completedAt: null,
    };

    vi.mocked(getUser).mockResolvedValue({ id: 1 } as any);
    vi.mocked(getTeamForUser).mockResolvedValue({ id: 1 } as any);
    vi.mocked(getCrawlJob).mockResolvedValue(mockJob as any);
    vi.mocked(verifyBusinessOwnership).mockResolvedValue({
      authorized: false,
      business: null,
    });

    const request = new NextRequest('http://localhost:3000/api/job/1');
    const params = Promise.resolve({ jobId: '1' });

    const response = await GET(request, { params });
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe('Unauthorized');
  });

  it('should return job status when authorized', async () => {
    const mockJob = {
      id: 1,
      businessId: 1,
      jobType: 'initial_crawl',
      status: 'completed',
      progress: 100,
      result: { crawledData: { name: 'Test Business' } },
      errorMessage: null,
      createdAt: new Date('2024-01-01'),
      completedAt: new Date('2024-01-01'),
    };

    vi.mocked(getUser).mockResolvedValue({ id: 1 } as any);
    vi.mocked(getTeamForUser).mockResolvedValue({ id: 1 } as any);
    vi.mocked(getCrawlJob).mockResolvedValue(mockJob as any);
    vi.mocked(verifyBusinessOwnership).mockResolvedValue({
      authorized: true,
      business: { id: 1, teamId: 1 },
    });

    const request = new NextRequest('http://localhost:3000/api/job/1');
    const params = Promise.resolve({ jobId: '1' });

    const response = await GET(request, { params });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.id).toBe(1);
    expect(data.businessId).toBe(1);
    expect(data.jobType).toBe('initial_crawl');
    expect(data.status).toBe('completed');
    expect(data.progress).toBe(100);
    expect(data.result).toEqual({ crawledData: { name: 'Test Business' } });
  });

  it('should return job with error message when failed', async () => {
    const mockJob = {
      id: 1,
      businessId: 1,
      jobType: 'initial_crawl',
      status: 'failed',
      progress: 50,
      result: null,
      errorMessage: 'Crawl failed: Network error',
      createdAt: new Date('2024-01-01'),
      completedAt: new Date('2024-01-01'),
    };

    vi.mocked(getUser).mockResolvedValue({ id: 1 } as any);
    vi.mocked(getTeamForUser).mockResolvedValue({ id: 1 } as any);
    vi.mocked(getCrawlJob).mockResolvedValue(mockJob as any);
    vi.mocked(verifyBusinessOwnership).mockResolvedValue({
      authorized: true,
      business: { id: 1, teamId: 1 },
    });

    const request = new NextRequest('http://localhost:3000/api/job/1');
    const params = Promise.resolve({ jobId: '1' });

    const response = await GET(request, { params });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.status).toBe('failed');
    expect(data.errorMessage).toBe('Crawl failed: Network error');
  });

  it('should handle errors gracefully', async () => {
    vi.mocked(getUser).mockRejectedValue(new Error('Database error'));

    const request = new NextRequest('http://localhost:3000/api/job/1');
    const params = Promise.resolve({ jobId: '1' });

    const response = await GET(request, { params });
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Internal server error');
  });
});

