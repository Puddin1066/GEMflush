import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/job/[jobId]/route';
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

describe('Job E2E Tests', () => {
  const mockUser = { id: 1, email: 'test@example.com' };
  const mockTeam = { id: 1, name: 'Test Team' };
  const mockBusiness = {
    id: 1,
    teamId: 1,
    name: 'Test Business',
    url: 'https://testbusiness.com',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Complete Job Status Polling Workflow', () => {
    it('should poll job status from queued to completed', async () => {
      // Initial state: queued
      const queuedJob = {
        id: 1,
        businessId: 1,
        jobType: 'initial_crawl',
        status: 'queued',
        progress: 0,
        result: null,
        errorMessage: null,
        createdAt: new Date('2024-01-01T10:00:00'),
        completedAt: null,
      };

      vi.mocked(getUser).mockResolvedValue(mockUser as any);
      vi.mocked(getTeamForUser).mockResolvedValue(mockTeam as any);
      vi.mocked(getCrawlJob).mockResolvedValue(queuedJob as any);
      vi.mocked(verifyBusinessOwnership).mockResolvedValue({
        authorized: true,
        business: mockBusiness,
      });

      const request1 = new NextRequest('http://localhost:3000/api/job/1');
      const params1 = Promise.resolve({ jobId: '1' });
      const response1 = await GET(request1, { params: params1 });
      const data1 = await response1.json();

      expect(response1.status).toBe(200);
      expect(data1.status).toBe('queued');
      expect(data1.progress).toBe(0);

      // Progress state: processing
      const processingJob = {
        ...queuedJob,
        status: 'processing',
        progress: 50,
      };

      vi.mocked(getCrawlJob).mockResolvedValue(processingJob as any);
      const request2 = new NextRequest('http://localhost:3000/api/job/1');
      const params2 = Promise.resolve({ jobId: '1' });
      const response2 = await GET(request2, { params: params2 });
      const data2 = await response2.json();

      expect(response2.status).toBe(200);
      expect(data2.status).toBe('processing');
      expect(data2.progress).toBe(50);

      // Final state: completed
      const completedJob = {
        ...queuedJob,
        status: 'completed',
        progress: 100,
        result: { crawledData: { name: 'Test Business' } },
        completedAt: new Date('2024-01-01T10:05:00'),
      };

      vi.mocked(getCrawlJob).mockResolvedValue(completedJob as any);
      const request3 = new NextRequest('http://localhost:3000/api/job/1');
      const params3 = Promise.resolve({ jobId: '1' });
      const response3 = await GET(request3, { params: params3 });
      const data3 = await response3.json();

      expect(response3.status).toBe(200);
      expect(data3.status).toBe('completed');
      expect(data3.progress).toBe(100);
      expect(data3.result).toBeDefined();
      expect(data3.completedAt).toBeDefined();
    });

    it('should handle job failure workflow', async () => {
      const failedJob = {
        id: 1,
        businessId: 1,
        jobType: 'initial_crawl',
        status: 'failed',
        progress: 30,
        result: null,
        errorMessage: 'Network timeout after 30 seconds',
        createdAt: new Date('2024-01-01T10:00:00'),
        completedAt: new Date('2024-01-01T10:00:30'),
      };

      vi.mocked(getUser).mockResolvedValue(mockUser as any);
      vi.mocked(getTeamForUser).mockResolvedValue(mockTeam as any);
      vi.mocked(getCrawlJob).mockResolvedValue(failedJob as any);
      vi.mocked(verifyBusinessOwnership).mockResolvedValue({
        authorized: true,
        business: mockBusiness,
      });

      const request = new NextRequest('http://localhost:3000/api/job/1');
      const params = Promise.resolve({ jobId: '1' });
      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe('failed');
      expect(data.errorMessage).toBe('Network timeout after 30 seconds');
      expect(data.progress).toBe(30);
    });
  });

  describe('Authorization Workflow', () => {
    it('should prevent access to jobs from other teams', async () => {
      const otherTeamBusiness = {
        ...mockBusiness,
        teamId: 999, // Different team
      };

      const job = {
        id: 1,
        businessId: 1,
        jobType: 'initial_crawl',
        status: 'completed',
        progress: 100,
        result: null,
        errorMessage: null,
        createdAt: new Date(),
        completedAt: new Date(),
      };

      vi.mocked(getUser).mockResolvedValue(mockUser as any);
      vi.mocked(getTeamForUser).mockResolvedValue(mockTeam as any);
      vi.mocked(getCrawlJob).mockResolvedValue(job as any);
      vi.mocked(verifyBusinessOwnership).mockResolvedValue({
        authorized: false,
        business: otherTeamBusiness,
      });

      const request = new NextRequest('http://localhost:3000/api/job/1');
      const params = Promise.resolve({ jobId: '1' });
      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Unauthorized');
    });
  });

  describe('Error Handling Workflow', () => {
    it('should handle invalid job IDs gracefully', async () => {
      vi.mocked(getUser).mockResolvedValue(mockUser as any);
      vi.mocked(getTeamForUser).mockResolvedValue(mockTeam as any);

      const request = new NextRequest('http://localhost:3000/api/job/abc');
      const params = Promise.resolve({ jobId: 'abc' });
      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid job ID');
    });

    it('should handle database errors gracefully', async () => {
      vi.mocked(getUser).mockRejectedValue(new Error('Database connection failed'));

      const request = new NextRequest('http://localhost:3000/api/job/1');
      const params = Promise.resolve({ jobId: '1' });
      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal server error');
    });
  });
});

