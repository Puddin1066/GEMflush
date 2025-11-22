/**
 * Integration tests for Enhanced Crawler API endpoints
 * Tests the complete API flow with enhanced parallel processing
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock dependencies
vi.mock('@/lib/db/queries', () => ({
  getUser: vi.fn(),
  getTeamForUser: vi.fn(),
  getBusinessById: vi.fn(),
  updateBusiness: vi.fn(),
  createCrawlJob: vi.fn(),
  updateCrawlJob: vi.fn(),
  getCrawlJob: vi.fn(),
}));

vi.mock('@/lib/services/business-processing', () => ({
  autoStartProcessing: vi.fn(),
}));

vi.mock('@/lib/services/business-execution', () => ({
  executeCrawlJob: vi.fn(),
}));

vi.mock('@/lib/auth/middleware', () => ({
  verifyBusinessOwnership: vi.fn(),
}));

vi.mock('@/lib/utils/idempotency', () => ({
  getIdempotencyKey: vi.fn(),
  getCachedResponse: vi.fn(),
  cacheResponse: vi.fn(),
  generateIdempotencyKey: vi.fn(),
}));

vi.mock('@/lib/utils/logger', () => ({
  loggers: {
    api: {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
    },
  },
}));

describe('Enhanced Crawler API Endpoints', () => {
  let mockGetUser: any;
  let mockGetTeamForUser: any;
  let mockGetBusinessById: any;
  let mockUpdateBusiness: any;
  let mockCreateCrawlJob: any;
  let mockUpdateCrawlJob: any;
  let mockGetCrawlJob: any;
  let mockAutoStartProcessing: any;
  let mockExecuteCrawlJob: any;
  let mockVerifyBusinessOwnership: any;
  let mockGetIdempotencyKey: any;
  let mockGetCachedResponse: any;
  let mockCacheResponse: any;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Get mocked modules
    const dbQueries = await import('@/lib/db/queries');
    const businessProcessing = await import('@/lib/services/business-processing');
    const businessExecution = await import('@/lib/services/business-execution');
    const authMiddleware = await import('@/lib/auth/middleware');
    const idempotency = await import('@/lib/utils/idempotency');

    mockGetUser = dbQueries.getUser;
    mockGetTeamForUser = dbQueries.getTeamForUser;
    mockGetBusinessById = dbQueries.getBusinessById;
    mockUpdateBusiness = dbQueries.updateBusiness;
    mockCreateCrawlJob = dbQueries.createCrawlJob;
    mockUpdateCrawlJob = dbQueries.updateCrawlJob;
    mockGetCrawlJob = dbQueries.getCrawlJob;
    mockAutoStartProcessing = businessProcessing.autoStartProcessing;
    mockExecuteCrawlJob = businessExecution.executeCrawlJob;
    mockVerifyBusinessOwnership = authMiddleware.verifyBusinessOwnership;
    mockGetIdempotencyKey = idempotency.getIdempotencyKey;
    mockGetCachedResponse = idempotency.getCachedResponse;
    mockCacheResponse = idempotency.cacheResponse;

    // Set up common mocks
    mockGetUser.mockResolvedValue({ id: 1, email: 'test@example.com' });
    mockGetTeamForUser.mockResolvedValue({ id: 1, name: 'Test Team' });
    mockGetIdempotencyKey.mockReturnValue(null);
    mockGetCachedResponse.mockReturnValue(null);
    mockCacheResponse.mockResolvedValue(undefined);
  });

  describe('POST /api/crawl', () => {
    it('should successfully start enhanced crawl job', async () => {
      const mockBusiness = {
        id: 1,
        name: 'Test Business',
        url: 'https://example.com',
        teamId: 1,
        status: 'pending',
      };

      const mockJob = {
        id: 123,
        businessId: 1,
        jobType: 'enhanced_multipage_crawl',
        status: 'queued',
        progress: 0,
      };

      mockGetBusinessById.mockResolvedValue(mockBusiness);
      mockCreateCrawlJob.mockResolvedValue(mockJob);
      mockExecuteCrawlJob.mockResolvedValue({ success: true, businessId: 1 });

      // Import and test the route
      const { POST } = await import('../crawl/route');
      const request = new NextRequest('http://localhost:3000/api/crawl', {
        method: 'POST',
        body: JSON.stringify({ businessId: 1 }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.jobId).toBe(123);
      expect(data.message).toBe('Crawl job started');
      expect(data.status).toBe('queued');

      expect(mockCreateCrawlJob).toHaveBeenCalledWith({
        businessId: 1,
        jobType: 'initial_crawl',
        status: 'queued',
        progress: 0,
      });
    });

    it('should handle business not found', async () => {
      mockGetBusinessById.mockResolvedValue(null);

      const { POST } = await import('../crawl/route');
      const request = new NextRequest('http://localhost:3000/api/crawl', {
        method: 'POST',
        body: JSON.stringify({ businessId: 999 }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Business not found');
    });

    it('should handle unauthorized access', async () => {
      mockGetUser.mockResolvedValue(null);

      const { POST } = await import('../crawl/route');
      const request = new NextRequest('http://localhost:3000/api/crawl', {
        method: 'POST',
        body: JSON.stringify({ businessId: 1 }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should use cached response for duplicate requests', async () => {
      const cachedResponse = {
        jobId: 456,
        message: 'Cached crawl job',
        status: 'completed',
      };

      mockGetCachedResponse.mockReturnValue(cachedResponse);

      const { POST } = await import('../crawl/route');
      const request = new NextRequest('http://localhost:3000/api/crawl', {
        method: 'POST',
        body: JSON.stringify({ businessId: 1 }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(cachedResponse);
      expect(mockCreateCrawlJob).not.toHaveBeenCalled();
    });
  });

  describe('POST /api/business/[id]/process', () => {
    it('should successfully start parallel CFP processing', async () => {
      const mockBusiness = {
        id: 1,
        name: 'Test Business',
        url: 'https://example.com',
        teamId: 1,
        status: 'pending',
      };

      mockGetBusinessById.mockResolvedValue(mockBusiness);
      mockAutoStartProcessing.mockResolvedValue({ success: true, businessId: 1 });

      const { POST } = await import('../business/[id]/process/route');
      const request = new NextRequest('http://localhost:3000/api/business/1/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request, { params: Promise.resolve({ id: '1' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('CFP processing started');
      expect(data.businessId).toBe(1);

      expect(mockAutoStartProcessing).toHaveBeenCalledWith(1);
    });

    it('should handle invalid business ID', async () => {
      const { POST } = await import('../business/[id]/process/route');
      const request = new NextRequest('http://localhost:3000/api/business/invalid/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request, { params: Promise.resolve({ id: 'invalid' }) });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid business ID');
    });

    it('should handle team ownership verification', async () => {
      const mockBusiness = {
        id: 1,
        name: 'Test Business',
        teamId: 2, // Different team
      };

      mockGetBusinessById.mockResolvedValue(mockBusiness);

      const { POST } = await import('../business/[id]/process/route');
      const request = new NextRequest('http://localhost:3000/api/business/1/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request, { params: Promise.resolve({ id: '1' }) });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Unauthorized');
    });
  });

  describe('GET /api/job/[jobId]', () => {
    it('should return enhanced job status with multi-page progress', async () => {
      const mockJob = {
        id: 123,
        businessId: 1,
        jobType: 'enhanced_multipage_crawl',
        status: 'running',
        progress: 75,
        result: null,
        errorMessage: 'Processing pages: 3/4',
        firecrawlJobId: 'fc-job-12345',
        startedAt: new Date(),
        pagesDiscovered: 4,
        pagesProcessed: 3,
        firecrawlMetadata: { totalCredits: 10 },
        createdAt: new Date(),
        completedAt: null,
      };

      mockGetCrawlJob.mockResolvedValue(mockJob);
      mockVerifyBusinessOwnership.mockResolvedValue({
        authorized: true,
        business: { id: 1, name: 'Test Business' },
      });

      const { GET } = await import('../job/[jobId]/route');
      const request = new NextRequest('http://localhost:3000/api/job/123');

      const response = await GET(request, { params: Promise.resolve({ jobId: '123' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.id).toBe(123);
      expect(data.jobType).toBe('enhanced_multipage_crawl');
      expect(data.status).toBe('running');
      expect(data.progress).toBe(75);
      expect(data.firecrawlJobId).toBe('fc-job-12345');
      expect(data.pagesDiscovered).toBe(4);
      expect(data.pagesProcessed).toBe(3);
      expect(data.firecrawlMetadata).toEqual({ totalCredits: 10 });
    });

    it('should handle job not found', async () => {
      mockGetCrawlJob.mockResolvedValue(null);

      const { GET } = await import('../job/[jobId]/route');
      const request = new NextRequest('http://localhost:3000/api/job/999');

      const response = await GET(request, { params: Promise.resolve({ jobId: '999' }) });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Job not found');
    });

    it('should handle unauthorized job access', async () => {
      const mockJob = {
        id: 123,
        businessId: 1,
        jobType: 'enhanced_multipage_crawl',
        status: 'running',
      };

      mockGetCrawlJob.mockResolvedValue(mockJob);
      mockVerifyBusinessOwnership.mockResolvedValue({
        authorized: false,
        business: null,
      });

      const { GET } = await import('../job/[jobId]/route');
      const request = new NextRequest('http://localhost:3000/api/job/123');

      const response = await GET(request, { params: Promise.resolve({ jobId: '123' }) });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Unauthorized');
    });
  });

  describe('GET /api/business/[id]/status', () => {
    it('should return comprehensive business processing status', async () => {
      const mockBusiness = {
        id: 1,
        name: 'Test Business',
        url: 'https://example.com',
        status: 'fingerprinted',
        lastCrawledAt: new Date(),
      };

      const mockCrawlJob = {
        id: 123,
        businessId: 1,
        status: 'completed',
        progress: 100,
        jobType: 'enhanced_multipage_crawl',
        startedAt: new Date(),
        completedAt: new Date(),
        pagesDiscovered: 5,
        pagesProcessed: 5,
        firecrawlJobId: 'fc-job-12345',
      };

      const mockFingerprint = {
        id: 456,
        businessId: 1,
        visibilityScore: 85,
        mentionRate: 0.7,
        sentimentScore: 0.8,
        accuracyScore: 0.9,
        createdAt: new Date(),
      };

      mockVerifyBusinessOwnership.mockResolvedValue({
        authorized: true,
        business: mockBusiness,
      });

      // Mock database queries
      vi.doMock('@/lib/db/drizzle', () => ({
        db: {
          select: vi.fn().mockReturnThis(),
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          orderBy: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue([mockCrawlJob]),
        },
      }));

      const { GET } = await import('../business/[id]/status/route');
      const request = new NextRequest('http://localhost:3000/api/business/1/status');

      const response = await GET(request, { params: Promise.resolve({ id: '1' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.businessId).toBe(1);
      expect(data.businessName).toBe('Test Business');
      expect(data.overallStatus).toBe('fingerprinted');
      expect(data.overallProgress).toBe(100);
      expect(data.crawl).toEqual({
        status: 'completed',
        progress: 100,
        jobType: 'enhanced_multipage_crawl',
        startedAt: mockCrawlJob.startedAt,
        completedAt: mockCrawlJob.completedAt,
        pagesDiscovered: 5,
        pagesProcessed: 5,
        firecrawlJobId: 'fc-job-12345',
        errorMessage: undefined,
      });
      expect(data.hasMultiPageData).toBe(true);
      expect(data.isParallelProcessing).toBe(false);
    });

    it('should show parallel processing in progress', async () => {
      const mockBusiness = {
        id: 2,
        name: 'Processing Business',
        url: 'https://processing.com',
        status: 'processing',
      };

      const mockRunningJob = {
        id: 789,
        businessId: 2,
        status: 'running',
        progress: 60,
        jobType: 'enhanced_multipage_crawl',
        startedAt: new Date(),
        pagesDiscovered: 8,
        pagesProcessed: 5,
        firecrawlJobId: 'fc-job-running',
      };

      mockVerifyBusinessOwnership.mockResolvedValue({
        authorized: true,
        business: mockBusiness,
      });

      vi.doMock('@/lib/db/drizzle', () => ({
        db: {
          select: vi.fn().mockReturnThis(),
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          orderBy: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue([mockRunningJob]),
        },
      }));

      const { GET } = await import('../business/[id]/status/route');
      const request = new NextRequest('http://localhost:3000/api/business/2/status');

      const response = await GET(request, { params: Promise.resolve({ id: '2' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.overallStatus).toBe('processing');
      expect(data.overallProgress).toBe(30); // 60% of crawl = 30% overall
      expect(data.isParallelProcessing).toBe(true);
      expect(data.crawl.pagesDiscovered).toBe(8);
      expect(data.crawl.pagesProcessed).toBe(5);
      expect(data.estimatedCompletion).toBeDefined();
    });

    it('should handle business not found', async () => {
      mockVerifyBusinessOwnership.mockResolvedValue({
        authorized: false,
        business: null,
      });

      const { GET } = await import('../business/[id]/status/route');
      const request = new NextRequest('http://localhost:3000/api/business/999/status');

      const response = await GET(request, { params: Promise.resolve({ id: '999' }) });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Unauthorized');
    });
  });

  describe('Error Handling', () => {
    it('should handle validation errors properly', async () => {
      const { POST } = await import('../crawl/route');
      const request = new NextRequest('http://localhost:3000/api/crawl', {
        method: 'POST',
        body: JSON.stringify({ invalidField: 'invalid' }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Validation error');
      expect(data.details).toBeDefined();
    });

    it('should handle internal server errors gracefully', async () => {
      mockGetUser.mockRejectedValue(new Error('Database connection failed'));

      const { POST } = await import('../crawl/route');
      const request = new NextRequest('http://localhost:3000/api/crawl', {
        method: 'POST',
        body: JSON.stringify({ businessId: 1 }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal server error');
    });
  });
});
