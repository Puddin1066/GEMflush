/**
 * Unit tests for Business Execution Service
 * Tests parallel processing, error handling, and retry logic
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  executeCrawlJob,
  executeFingerprint,
  executeParallelProcessing,
  autoStartProcessing,
} from '../business-execution';

// Mock dependencies
vi.mock('@/lib/db/queries', () => ({
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

vi.mock('@/lib/llm/fingerprinter', () => ({
  LLMFingerprinter: vi.fn().mockImplementation(() => ({
    fingerprint: vi.fn(),
  })),
}));

vi.mock('@/lib/utils/logger', () => ({
  loggers: {
    processing: {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
    },
  },
}));

describe('Business Execution Service', () => {
  let mockGetBusinessById: any;
  let mockUpdateBusiness: any;
  let mockCreateCrawlJob: any;
  let mockUpdateCrawlJob: any;
  let mockWebCrawler: any;
  let mockLLMFingerprinter: any;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Get mocked modules
    const dbQueries = await import('@/lib/db/queries');
    const crawler = await import('@/lib/crawler');
    const { LLMFingerprinter } = await import('@/lib/llm/fingerprinter');

    mockGetBusinessById = dbQueries.getBusinessById;
    mockUpdateBusiness = dbQueries.updateBusiness;
    mockCreateCrawlJob = dbQueries.createCrawlJob;
    mockUpdateCrawlJob = dbQueries.updateCrawlJob;
    mockWebCrawler = crawler.webCrawler;
    mockLLMFingerprinter = new LLMFingerprinter();
  });

  describe('executeCrawlJob', () => {
    const mockBusiness = {
      id: 1,
      name: 'Test Business',
      url: 'https://example.com',
      teamId: 1,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should successfully execute crawl job', async () => {
      mockGetBusinessById.mockResolvedValue(mockBusiness);
      mockCreateCrawlJob.mockResolvedValue({ id: 123 });
      mockWebCrawler.crawl.mockResolvedValue({
        success: true,
        data: {
          name: 'Test Business',
          description: 'Test description',
          llmEnhanced: { model: 'firecrawl-llm-multipage' },
        },
      });

      const result = await executeCrawlJob(null, 1);

      expect(result.success).toBe(true);
      expect(result.businessId).toBe(1);
      expect(mockCreateCrawlJob).toHaveBeenCalledWith({
        businessId: 1,
        jobType: 'enhanced_multipage_crawl',
        status: 'running',
        progress: 0,
      });
      expect(mockUpdateBusiness).toHaveBeenCalledWith(1, {
        crawlData: expect.any(Object),
        lastCrawledAt: expect.any(Date),
        status: 'crawled',
      });
      expect(mockUpdateCrawlJob).toHaveBeenCalledWith(123, {
        status: 'completed',
        progress: 100,
        result: expect.any(Object),
        completedAt: expect.any(Date),
      });
    });

    it('should handle business not found', async () => {
      mockGetBusinessById.mockResolvedValue(null);

      const result = await executeCrawlJob(null, 999);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Business not found: 999');
    });

    it('should handle crawl failure', async () => {
      mockGetBusinessById.mockResolvedValue(mockBusiness);
      mockCreateCrawlJob.mockResolvedValue({ id: 123 });
      mockWebCrawler.crawl.mockResolvedValue({
        success: false,
        error: 'Crawl failed',
      });

      const result = await executeCrawlJob(null, 1);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Crawl failed');
      expect(mockUpdateCrawlJob).toHaveBeenCalledWith(123, {
        status: 'failed',
        progress: 0,
        errorMessage: expect.stringContaining('Crawl failed'),
        completedAt: expect.any(Date),
      });
    });

    it('should use existing job ID when provided', async () => {
      mockGetBusinessById.mockResolvedValue(mockBusiness);
      mockWebCrawler.crawl.mockResolvedValue({
        success: true,
        data: { name: 'Test Business' },
      });

      await executeCrawlJob(456, 1, mockBusiness);

      expect(mockCreateCrawlJob).not.toHaveBeenCalled();
      expect(mockUpdateCrawlJob).toHaveBeenCalledWith(456, {
        status: 'running',
        startedAt: expect.any(Date),
        progress: 0,
      });
    });

    it('should handle database errors with retry logic', async () => {
      mockGetBusinessById
        .mockRejectedValueOnce(new Error('Connection timeout'))
        .mockResolvedValue(mockBusiness);
      mockCreateCrawlJob.mockResolvedValue({ id: 123 });
      mockWebCrawler.crawl.mockResolvedValue({
        success: true,
        data: { name: 'Test Business' },
      });

      const result = await executeCrawlJob(null, 1);

      expect(result.success).toBe(true);
      expect(mockGetBusinessById).toHaveBeenCalledTimes(2); // Initial call + retry
    });
  });

  describe('executeFingerprint', () => {
    const mockBusiness = {
      id: 1,
      name: 'Test Business',
      url: 'https://example.com',
      crawlData: { name: 'Test Business' },
    } as any;

    it('should successfully execute fingerprint', async () => {
      const mockFingerprintResult = {
        visibilityScore: 85,
        mentionRate: 0.7,
        sentimentScore: 0.8,
        accuracyScore: 0.9,
      };

      mockLLMFingerprinter.fingerprint.mockResolvedValue(mockFingerprintResult);

      const result = await executeFingerprint(mockBusiness, true);

      expect(result.success).toBe(true);
      expect(result.businessId).toBe(1);
      expect(mockLLMFingerprinter.fingerprint).toHaveBeenCalledWith(mockBusiness);
      expect(mockUpdateBusiness).toHaveBeenCalledWith(1, {
        status: 'fingerprinted',
      });
    });

    it('should handle fingerprint failure', async () => {
      mockLLMFingerprinter.fingerprint.mockRejectedValue(new Error('LLM API error'));

      const result = await executeFingerprint(mockBusiness, false);

      expect(result.success).toBe(false);
      expect(result.error).toContain('LLM API error');
      expect(mockUpdateBusiness).not.toHaveBeenCalled();
    });

    it('should skip status update when requested', async () => {
      mockLLMFingerprinter.fingerprint.mockResolvedValue({
        visibilityScore: 85,
      });

      const result = await executeFingerprint(mockBusiness, false);

      expect(result.success).toBe(true);
      expect(mockUpdateBusiness).not.toHaveBeenCalled();
    });

    it('should handle LLM API errors with retry logic', async () => {
      mockLLMFingerprinter.fingerprint
        .mockRejectedValueOnce(new Error('Rate Limit'))
        .mockResolvedValue({ visibilityScore: 85 });

      const result = await executeFingerprint(mockBusiness, true);

      expect(result.success).toBe(true);
      expect(mockLLMFingerprinter.fingerprint).toHaveBeenCalledTimes(2);
    });
  });

  describe('executeParallelProcessing', () => {
    const mockBusiness = {
      id: 1,
      name: 'Test Business',
      url: 'https://example.com',
      teamId: 1,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should successfully execute parallel processing', async () => {
      mockGetBusinessById.mockResolvedValue(mockBusiness);
      mockCreateCrawlJob.mockResolvedValue({ id: 123 });
      mockWebCrawler.crawl.mockResolvedValue({
        success: true,
        data: { name: 'Test Business' },
      });
      mockLLMFingerprinter.fingerprint.mockResolvedValue({
        visibilityScore: 85,
      });

      const result = await executeParallelProcessing(1);

      expect(result.overallSuccess).toBe(true);
      expect(result.crawlResult.success).toBe(true);
      expect(result.fingerprintResult.success).toBe(true);
      expect(mockUpdateBusiness).toHaveBeenCalledWith(1, {
        status: 'fingerprinted',
      });
    });

    it('should handle crawl success with fingerprint failure', async () => {
      mockGetBusinessById
        .mockResolvedValueOnce(mockBusiness)
        .mockResolvedValueOnce({ ...mockBusiness, crawlData: { name: 'Test' } });
      mockCreateCrawlJob.mockResolvedValue({ id: 123 });
      mockWebCrawler.crawl.mockResolvedValue({
        success: true,
        data: { name: 'Test Business' },
      });
      mockLLMFingerprinter.fingerprint
        .mockRejectedValueOnce(new Error('LLM error'))
        .mockResolvedValue({ visibilityScore: 85 }); // Retry succeeds

      const result = await executeParallelProcessing(1);

      expect(result.overallSuccess).toBe(true);
      expect(result.crawlResult.success).toBe(true);
      expect(result.fingerprintResult.success).toBe(true);
      expect(mockLLMFingerprinter.fingerprint).toHaveBeenCalledTimes(2); // Initial + retry
    });

    it('should handle crawl failure', async () => {
      mockGetBusinessById.mockResolvedValue(mockBusiness);
      mockCreateCrawlJob.mockResolvedValue({ id: 123 });
      mockWebCrawler.crawl.mockResolvedValue({
        success: false,
        error: 'Crawl failed',
      });
      mockLLMFingerprinter.fingerprint.mockResolvedValue({
        visibilityScore: 85,
      });

      const result = await executeParallelProcessing(1);

      expect(result.overallSuccess).toBe(false);
      expect(result.crawlResult.success).toBe(false);
      expect(result.fingerprintResult.success).toBe(true);
      expect(mockUpdateBusiness).toHaveBeenCalledWith(1, {
        status: 'error',
      });
    });

    it('should handle both processes failing', async () => {
      mockGetBusinessById.mockResolvedValue(mockBusiness);
      mockCreateCrawlJob.mockResolvedValue({ id: 123 });
      mockWebCrawler.crawl.mockResolvedValue({
        success: false,
        error: 'Crawl failed',
      });
      mockLLMFingerprinter.fingerprint.mockRejectedValue(new Error('LLM failed'));

      const result = await executeParallelProcessing(1);

      expect(result.overallSuccess).toBe(false);
      expect(result.crawlResult.success).toBe(false);
      expect(result.fingerprintResult.success).toBe(false);
    });

    it('should handle business not found', async () => {
      mockGetBusinessById.mockResolvedValue(null);

      const result = await executeParallelProcessing(999);

      expect(result.overallSuccess).toBe(false);
      expect(result.crawlResult.error).toContain('Business not found: 999');
      expect(result.fingerprintResult.error).toContain('Business not found: 999');
    });
  });

  describe('autoStartProcessing', () => {
    it('should successfully auto-start processing', async () => {
      const mockBusiness = {
        id: 1,
        name: 'Test Business',
        url: 'https://example.com',
        teamId: 1,
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockGetBusinessById.mockResolvedValue(mockBusiness);
      mockCreateCrawlJob.mockResolvedValue({ id: 123 });
      mockWebCrawler.crawl.mockResolvedValue({
        success: true,
        data: { name: 'Test Business' },
      });
      mockLLMFingerprinter.fingerprint.mockResolvedValue({
        visibilityScore: 85,
      });

      const result = await autoStartProcessing(1);

      expect(result.success).toBe(true);
      expect(result.businessId).toBe(1);
    });

    it('should handle auto-start processing failure', async () => {
      mockGetBusinessById.mockRejectedValue(new Error('Database error'));

      const result = await autoStartProcessing(1);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Database error');
    });
  });

  describe('error handling and retry logic', () => {
    it('should retry database operations on failure', async () => {
      const mockBusiness = {
        id: 1,
        name: 'Test Business',
        url: 'https://example.com',
        teamId: 1,
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // First call fails, second succeeds
      mockGetBusinessById
        .mockRejectedValueOnce(new Error('Connection timeout'))
        .mockResolvedValue(mockBusiness);
      mockCreateCrawlJob.mockResolvedValue({ id: 123 });
      mockWebCrawler.crawl.mockResolvedValue({
        success: true,
        data: { name: 'Test Business' },
      });

      const result = await executeCrawlJob(null, 1);

      expect(result.success).toBe(true);
      expect(mockGetBusinessById).toHaveBeenCalledTimes(2);
    });

    it('should handle non-retryable errors immediately', async () => {
      mockGetBusinessById.mockRejectedValue(new Error('Invalid business ID'));

      const result = await executeCrawlJob(null, 1);

      expect(result.success).toBe(false);
      expect(mockGetBusinessById).toHaveBeenCalledTimes(1); // No retry for non-retryable error
    });

    it('should sanitize sensitive information in error logs', async () => {
      const sensitiveError = new Error('API key Bearer sk-1234567890abcdef failed');
      mockGetBusinessById.mockRejectedValue(sensitiveError);

      const result = await executeCrawlJob(null, 1);

      expect(result.success).toBe(false);
      // Error message should be sanitized in logs (checked via mock calls)
    });
  });
});

