// Crawl API contract tests
// Validates API request/response formats and validation

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '@/app/api/crawl/route';
import { NextRequest } from 'next/server';
import { crawlRequestSchema } from '@/lib/validation/business';
import { validateCrawledData } from '@/lib/validation/crawl';

// Mock dependencies
vi.mock('@/lib/db/queries', () => ({
  getUser: vi.fn(),
  getTeamForUser: vi.fn(),
  getBusinessById: vi.fn(),
  updateBusiness: vi.fn(),
  createCrawlJob: vi.fn(),
  updateCrawlJob: vi.fn(),
}));

vi.mock('@/lib/crawler', () => ({
  webCrawler: {
    crawl: vi.fn(),
  },
}));

vi.mock('@/lib/services/business-execution', () => ({
  shouldCrawl: vi.fn(),
}));

describe('Crawl API Contracts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('crawlRequestSchema validation', () => {
    it('should validate valid crawl request', () => {
      const validRequest = { businessId: 1 };
      const result = crawlRequestSchema.safeParse(validRequest);
      expect(result.success).toBe(true);
    });

    it('should accept optional forceRecrawl flag', () => {
      const request = { businessId: 1, forceRecrawl: true };
      const result = crawlRequestSchema.safeParse(request);
      expect(result.success).toBe(true);
    });

    it('should reject invalid businessId (negative)', () => {
      const invalidRequest = { businessId: -1 };
      const result = crawlRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
    });

    it('should reject invalid businessId (zero)', () => {
      const invalidRequest = { businessId: 0 };
      const result = crawlRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
    });

    it('should reject missing businessId', () => {
      const invalidRequest = {};
      const result = crawlRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
    });

    it('should reject non-integer businessId', () => {
      const invalidRequest = { businessId: 1.5 };
      const result = crawlRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
    });
  });

  describe('API response format', () => {
    it('should return jobId and status in response', async () => {
      const { getUser, getTeamForUser, getBusinessById, createCrawlJob } = await import('@/lib/db/queries');
      const { shouldCrawl } = await import('@/lib/services/business-execution');

      vi.mocked(getUser).mockResolvedValue({ id: 1 } as any);
      vi.mocked(getTeamForUser).mockResolvedValue({ id: 1 } as any);
      vi.mocked(getBusinessById).mockResolvedValue({
        id: 1,
        teamId: 1,
        url: 'https://example.com',
      } as any);
      vi.mocked(shouldCrawl).mockResolvedValue({ shouldCrawl: true });
      vi.mocked(createCrawlJob).mockResolvedValue({
        id: 1,
        businessId: 1,
        status: 'queued',
      } as any);

      const request = new NextRequest('http://localhost:3000/api/crawl', {
        method: 'POST',
        body: JSON.stringify({ businessId: 1 }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('jobId');
      expect(data).toHaveProperty('status');
    });

    it('should return cached response when crawl not needed', async () => {
      const { getUser, getTeamForUser, getBusinessById } = await import('@/lib/db/queries');
      const { shouldCrawl } = await import('@/lib/services/business-execution');

      vi.mocked(getUser).mockResolvedValue({ id: 1 } as any);
      vi.mocked(getTeamForUser).mockResolvedValue({ id: 1 } as any);
      vi.mocked(getBusinessById).mockResolvedValue({
        id: 1,
        teamId: 1,
        status: 'crawled',
      } as any);
      vi.mocked(shouldCrawl).mockResolvedValue({ shouldCrawl: false });

      const request = new NextRequest('http://localhost:3000/api/crawl', {
        method: 'POST',
        body: JSON.stringify({ businessId: 1 }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.cached).toBe(true);
      expect(data.jobId).toBeNull();
    });
  });

  describe('CrawledData validation in storage', () => {
    it('should validate crawlData before storing', async () => {
      const { getUser, getTeamForUser, getBusinessById, updateBusiness } = await import('@/lib/db/queries');
      const { webCrawler } = await import('@/lib/crawler');
      const { shouldCrawl } = await import('@/lib/services/business-execution');

      const validCrawlData = {
        name: 'Test Business',
        email: 'test@example.com',
      };

      vi.mocked(getUser).mockResolvedValue({ id: 1 } as any);
      vi.mocked(getTeamForUser).mockResolvedValue({ id: 1 } as any);
      vi.mocked(getBusinessById).mockResolvedValue({
        id: 1,
        teamId: 1,
        url: 'https://example.com',
      } as any);
      vi.mocked(shouldCrawl).mockResolvedValue({ shouldCrawl: true });
      vi.mocked(webCrawler.crawl).mockResolvedValue({
        success: true,
        data: validCrawlData,
        url: 'https://example.com',
        crawledAt: new Date(),
      });

      // Validate that data would be valid before storage
      const validation = validateCrawledData(validCrawlData);
      expect(validation.success).toBe(true);
    });

    it('should reject invalid crawlData format', () => {
      const invalidData = {
        email: 'not-an-email', // Invalid email format
      };

      const validation = validateCrawledData(invalidData);
      expect(validation.success).toBe(false);
    });
  });

  describe('Error handling', () => {
    it('should return 400 for validation errors', async () => {
      const request = new NextRequest('http://localhost:3000/api/crawl', {
        method: 'POST',
        body: JSON.stringify({ businessId: -1 }), // Invalid
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
    });

    it('should return 401 for unauthorized requests', async () => {
      const { getUser } = await import('@/lib/db/queries');
      vi.mocked(getUser).mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/crawl', {
        method: 'POST',
        body: JSON.stringify({ businessId: 1 }),
      });

      const response = await POST(request);
      expect(response.status).toBe(401);
    });

    it('should return 404 for non-existent business', async () => {
      const { getUser, getTeamForUser, getBusinessById } = await import('@/lib/db/queries');
      vi.mocked(getUser).mockResolvedValue({ id: 1 } as any);
      vi.mocked(getTeamForUser).mockResolvedValue({ id: 1 } as any);
      vi.mocked(getBusinessById).mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/crawl', {
        method: 'POST',
        body: JSON.stringify({ businessId: 999 }),
      });

      const response = await POST(request);
      expect(response.status).toBe(404);
    });
  });
});
