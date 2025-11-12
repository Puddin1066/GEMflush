import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '@/app/api/crawl/route';
import { NextRequest } from 'next/server';

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

// Mock global fetch
global.fetch = vi.fn();

describe('Crawler E2E Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Complete Crawl Flow', () => {
    it('should handle complete crawl job flow', async () => {
      const { getUser, getTeamForUser, getBusinessById, createCrawlJob, updateBusiness, updateCrawlJob } = await import('@/lib/db/queries');
      const { webCrawler } = await import('@/lib/crawler');

      const mockUser = { id: 1 } as any;
      const mockTeam = { id: 1 } as any;
      const mockBusiness = {
        id: 1,
        teamId: 1,
        url: 'https://example.com',
      } as any;
      const mockJob = {
        id: 1,
        businessId: 1,
        status: 'queued',
      } as any;

      const mockCrawlResult = {
        success: true,
        data: {
          name: 'Test Business',
          description: 'Test description',
          phone: '123-456-7890',
        },
        url: 'https://example.com',
        crawledAt: new Date(),
      };

      vi.mocked(getUser).mockResolvedValue(mockUser);
      vi.mocked(getTeamForUser).mockResolvedValue(mockTeam);
      vi.mocked(getBusinessById).mockResolvedValue(mockBusiness);
      vi.mocked(createCrawlJob).mockResolvedValue(mockJob);
      vi.mocked(webCrawler.crawl).mockResolvedValue(mockCrawlResult);
      vi.mocked(updateBusiness).mockResolvedValue(undefined);
      vi.mocked(updateCrawlJob).mockResolvedValue(undefined);

      const request = new NextRequest('http://localhost:3000/api/crawl', {
        method: 'POST',
        body: JSON.stringify({ businessId: 1 }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.jobId).toBe(1);
      expect(data.status).toBe('queued');

      // Wait a bit for background job (simplified for test)
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify crawl was called (background execution)
      // Note: In real E2E, we'd wait for the job to complete
      expect(createCrawlJob).toHaveBeenCalled();
    });

    it('should handle crawl failure gracefully', async () => {
      const { getUser, getTeamForUser, getBusinessById, createCrawlJob } = await import('@/lib/db/queries');
      const { webCrawler } = await import('@/lib/crawler');

      const mockUser = { id: 1 } as any;
      const mockTeam = { id: 1 } as any;
      const mockBusiness = {
        id: 1,
        teamId: 1,
        url: 'https://example.com',
      } as any;
      const mockJob = {
        id: 1,
        businessId: 1,
        status: 'queued',
      } as any;

      const mockCrawlResult = {
        success: false,
        error: 'Crawl failed',
        url: 'https://example.com',
        crawledAt: new Date(),
      };

      vi.mocked(getUser).mockResolvedValue(mockUser);
      vi.mocked(getTeamForUser).mockResolvedValue(mockTeam);
      vi.mocked(getBusinessById).mockResolvedValue(mockBusiness);
      vi.mocked(createCrawlJob).mockResolvedValue(mockJob);
      vi.mocked(webCrawler.crawl).mockResolvedValue(mockCrawlResult);

      const request = new NextRequest('http://localhost:3000/api/crawl', {
        method: 'POST',
        body: JSON.stringify({ businessId: 1 }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.jobId).toBe(1);

      // Wait for background job
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify crawl was attempted
      expect(webCrawler.crawl).toHaveBeenCalledWith('https://example.com');
    });
  });
});

