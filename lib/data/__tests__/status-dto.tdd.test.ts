/**
 * TDD Test: Status DTO - Tests Drive Implementation
 * 
 * SPECIFICATION: Business Status Data Transformation
 * 
 * As a user
 * I want business status data transformed to DTOs
 * So that I can display processing status in the UI
 * 
 * IMPORTANT: These tests specify DESIRED behavior for status DTO transformation.
 * Tests verify that transformation works correctly for UI display.
 * 
 * TDD Cycle: RED → GREEN → REFACTOR
 * Tests written to specify desired DTO transformation behavior
 */

import { describe, it, expect } from 'vitest';
import { toBusinessStatusDTO } from '../status-dto';
import type { Business, CrawlJob, LLMFingerprint } from '@/lib/db/schema';

describe('🔴 RED: Status DTO - Desired Behavior Specification', () => {
  /**
   * SPECIFICATION 1: toBusinessStatusDTO - MUST Transform Status Data
   * 
   * DESIRED BEHAVIOR: toBusinessStatusDTO() MUST transform business, crawl job,
   * and fingerprint data to BusinessStatusDTO with overall status and progress.
   */
  describe('toBusinessStatusDTO', () => {
    it('MUST transform business status to DTO', () => {
      // Arrange: Business with no crawl or fingerprint
      const business: Business = {
        id: 1,
        name: 'Test Business',
        url: 'https://example.com',
        status: 'pending',
        lastCrawledAt: null,
        teamId: 1,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        deletedAt: null,
        wikidataQID: null,
        automationEnabled: false,
        nextCrawlAt: null,
        crawlData: null,
        location: null,
        category: null,
        description: null,
      };

      // Act: Transform to DTO (TEST SPECIFIES DESIRED BEHAVIOR)
      const dto = toBusinessStatusDTO(business, null, null);

      // Assert: SPECIFICATION - MUST return complete DTO
      expect(dto.businessId).toBe(1);
      expect(dto.businessName).toBe('Test Business');
      expect(dto.businessUrl).toBe('https://example.com');
      expect(dto.overallStatus).toBe('pending');
      expect(dto.overallProgress).toBe(0);
      expect(dto.crawl).toBeNull();
      expect(dto.fingerprint).toBeNull();
    });

    it('MUST include crawl status when crawl job exists', () => {
      // Arrange: Business with crawl job
      const business: Business = {
        id: 1,
        name: 'Test Business',
        url: 'https://example.com',
        status: 'crawling',
        lastCrawledAt: null,
        teamId: 1,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        deletedAt: null,
        wikidataQID: null,
        automationEnabled: false,
        nextCrawlAt: null,
        crawlData: null,
        location: null,
        category: null,
        description: null,
      };

      const crawlJob: CrawlJob = {
        id: 1,
        businessId: 1,
        status: 'running',
        progress: 50,
        jobType: 'full',
        startedAt: new Date('2024-01-01'),
        completedAt: null,
        pagesDiscovered: 10,
        pagesProcessed: 5,
        firecrawlJobId: 'fc-123',
        errorMessage: null,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      };

      // Act: Transform to DTO (TEST SPECIFIES DESIRED BEHAVIOR)
      const dto = toBusinessStatusDTO(business, crawlJob, null);

      // Assert: SPECIFICATION - MUST include crawl status
      expect(dto.crawl).toBeDefined();
      expect(dto.crawl?.status).toBe('running');
      expect(dto.crawl?.progress).toBe(50);
      expect(dto.crawl?.jobType).toBe('full');
      expect(dto.crawl?.pagesDiscovered).toBe(10);
      expect(dto.crawl?.pagesProcessed).toBe(5);
      expect(dto.crawl?.firecrawlJobId).toBe('fc-123');
    });

    it('MUST include fingerprint status when fingerprint exists', () => {
      // Arrange: Business with fingerprint
      const business: Business = {
        id: 1,
        name: 'Test Business',
        url: 'https://example.com',
        status: 'crawled',
        lastCrawledAt: new Date('2024-01-01'),
        teamId: 1,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        deletedAt: null,
        wikidataQID: null,
        automationEnabled: false,
        nextCrawlAt: null,
        crawlData: null,
        location: null,
        category: null,
        description: null,
      };

      const fingerprint: LLMFingerprint = {
        id: 1,
        businessId: 1,
        visibilityScore: 75,
        mentionRate: 60,
        sentimentScore: 0.8,
        accuracyScore: 0.9,
        avgRankPosition: 2.5,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      };

      // Act: Transform to DTO (TEST SPECIFIES DESIRED BEHAVIOR)
      const dto = toBusinessStatusDTO(business, null, fingerprint);

      // Assert: SPECIFICATION - MUST include fingerprint status
      expect(dto.fingerprint).toBeDefined();
      expect(dto.fingerprint?.visibilityScore).toBe(75);
      expect(dto.fingerprint?.mentionRate).toBe(60);
      expect(dto.fingerprint?.sentimentScore).toBe(0.8);
      expect(dto.fingerprint?.accuracyScore).toBe(0.9);
    });

    it('MUST determine overall status as processing when crawl is running', () => {
      // Arrange: Business with running crawl
      const business: Business = {
        id: 1,
        name: 'Test Business',
        url: 'https://example.com',
        status: 'crawling',
        lastCrawledAt: null,
        teamId: 1,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        deletedAt: null,
        wikidataQID: null,
        automationEnabled: false,
        nextCrawlAt: null,
        crawlData: null,
        location: null,
        category: null,
        description: null,
      };

      const crawlJob: CrawlJob = {
        id: 1,
        businessId: 1,
        status: 'running',
        progress: 50,
        jobType: 'full',
        startedAt: new Date('2024-01-01'),
        completedAt: null,
        pagesDiscovered: 10,
        pagesProcessed: 5,
        firecrawlJobId: 'fc-123',
        errorMessage: null,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      };

      // Act: Transform to DTO (TEST SPECIFIES DESIRED BEHAVIOR)
      const dto = toBusinessStatusDTO(business, crawlJob, null);

      // Assert: SPECIFICATION - MUST set overall status to processing
      expect(dto.overallStatus).toBe('processing');
      expect(dto.overallProgress).toBe(25); // 50% of crawl / 2 = 25% overall
    });

    it('MUST determine overall status as crawled when crawl completed without fingerprint', () => {
      // Arrange: Business with completed crawl, no fingerprint
      const business: Business = {
        id: 1,
        name: 'Test Business',
        url: 'https://example.com',
        status: 'crawled',
        lastCrawledAt: new Date('2024-01-01'),
        teamId: 1,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        deletedAt: null,
        wikidataQID: null,
        automationEnabled: false,
        nextCrawlAt: null,
        crawlData: null,
        location: null,
        category: null,
        description: null,
      };

      const crawlJob: CrawlJob = {
        id: 1,
        businessId: 1,
        status: 'completed',
        progress: 100,
        jobType: 'full',
        startedAt: new Date('2024-01-01'),
        completedAt: new Date('2024-01-02'),
        pagesDiscovered: 10,
        pagesProcessed: 10,
        firecrawlJobId: 'fc-123',
        errorMessage: null,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-02'),
      };

      // Act: Transform to DTO (TEST SPECIFIES DESIRED BEHAVIOR)
      const dto = toBusinessStatusDTO(business, crawlJob, null);

      // Assert: SPECIFICATION - MUST set overall status to crawled
      expect(dto.overallStatus).toBe('crawled');
      expect(dto.overallProgress).toBe(50); // Crawl complete = 50% overall
    });

    it('MUST determine overall status as fingerprinted when crawl and fingerprint complete', () => {
      // Arrange: Business with completed crawl and fingerprint
      const business: Business = {
        id: 1,
        name: 'Test Business',
        url: 'https://example.com',
        status: 'crawled',
        lastCrawledAt: new Date('2024-01-01'),
        teamId: 1,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        deletedAt: null,
        wikidataQID: null,
        automationEnabled: false,
        nextCrawlAt: null,
        crawlData: null,
        location: null,
        category: null,
        description: null,
      };

      const crawlJob: CrawlJob = {
        id: 1,
        businessId: 1,
        status: 'completed',
        progress: 100,
        jobType: 'full',
        startedAt: new Date('2024-01-01'),
        completedAt: new Date('2024-01-02'),
        pagesDiscovered: 10,
        pagesProcessed: 10,
        firecrawlJobId: 'fc-123',
        errorMessage: null,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-02'),
      };

      const fingerprint: LLMFingerprint = {
        id: 1,
        businessId: 1,
        visibilityScore: 75,
        mentionRate: 60,
        sentimentScore: 0.8,
        accuracyScore: 0.9,
        avgRankPosition: 2.5,
        createdAt: new Date('2024-01-02'),
        updatedAt: new Date('2024-01-02'),
      };

      // Act: Transform to DTO (TEST SPECIFIES DESIRED BEHAVIOR)
      const dto = toBusinessStatusDTO(business, crawlJob, fingerprint);

      // Assert: SPECIFICATION - MUST set overall status to fingerprinted
      expect(dto.overallStatus).toBe('fingerprinted');
      expect(dto.overallProgress).toBe(100); // Complete
    });

    it('MUST determine overall status as error when crawl failed', () => {
      // Arrange: Business with failed crawl
      const business: Business = {
        id: 1,
        name: 'Test Business',
        url: 'https://example.com',
        status: 'error',
        lastCrawledAt: null,
        teamId: 1,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        deletedAt: null,
        wikidataQID: null,
        automationEnabled: false,
        nextCrawlAt: null,
        crawlData: null,
        location: null,
        category: null,
        description: null,
      };

      const crawlJob: CrawlJob = {
        id: 1,
        businessId: 1,
        status: 'failed',
        progress: 0,
        jobType: 'full',
        startedAt: new Date('2024-01-01'),
        completedAt: new Date('2024-01-01'),
        pagesDiscovered: 0,
        pagesProcessed: 0,
        firecrawlJobId: 'fc-123',
        errorMessage: 'Crawl failed',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      };

      // Act: Transform to DTO (TEST SPECIFIES DESIRED BEHAVIOR)
      const dto = toBusinessStatusDTO(business, crawlJob, null);

      // Assert: SPECIFICATION - MUST set overall status to error
      expect(dto.overallStatus).toBe('error');
      expect(dto.overallProgress).toBe(0);
      expect(dto.crawl?.errorMessage).toBe('Crawl failed');
    });

    it('MUST detect parallel processing when crawl is running', () => {
      // Arrange: Business with running crawl
      const business: Business = {
        id: 1,
        name: 'Test Business',
        url: 'https://example.com',
        status: 'crawling',
        lastCrawledAt: null,
        teamId: 1,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        deletedAt: null,
        wikidataQID: null,
        automationEnabled: false,
        nextCrawlAt: null,
        crawlData: null,
        location: null,
        category: null,
        description: null,
      };

      const crawlJob: CrawlJob = {
        id: 1,
        businessId: 1,
        status: 'running',
        progress: 50,
        jobType: 'full',
        startedAt: new Date('2024-01-01'),
        completedAt: null,
        pagesDiscovered: 10,
        pagesProcessed: 5,
        firecrawlJobId: 'fc-123',
        errorMessage: null,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      };

      // Act: Transform to DTO (TEST SPECIFIES DESIRED BEHAVIOR)
      const dto = toBusinessStatusDTO(business, crawlJob, null);

      // Assert: SPECIFICATION - MUST detect parallel processing
      expect(dto.isParallelProcessing).toBe(true);
    });

    it('MUST detect multi-page data when pages processed > 1', () => {
      // Arrange: Business with multi-page crawl
      const business: Business = {
        id: 1,
        name: 'Test Business',
        url: 'https://example.com',
        status: 'crawled',
        lastCrawledAt: new Date('2024-01-01'),
        teamId: 1,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        deletedAt: null,
        wikidataQID: null,
        automationEnabled: false,
        nextCrawlAt: null,
        crawlData: null,
        location: null,
        category: null,
        description: null,
      };

      const crawlJob: CrawlJob = {
        id: 1,
        businessId: 1,
        status: 'completed',
        progress: 100,
        jobType: 'full',
        startedAt: new Date('2024-01-01'),
        completedAt: new Date('2024-01-02'),
        pagesDiscovered: 10,
        pagesProcessed: 5, // > 1
        firecrawlJobId: 'fc-123',
        errorMessage: null,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-02'),
      };

      // Act: Transform to DTO (TEST SPECIFIES DESIRED BEHAVIOR)
      const dto = toBusinessStatusDTO(business, crawlJob, null);

      // Assert: SPECIFICATION - MUST detect multi-page data
      expect(dto.hasMultiPageData).toBe(true);
    });

    it('MUST calculate estimated completion when crawl is running', () => {
      // Arrange: Business with running crawl
      const business: Business = {
        id: 1,
        name: 'Test Business',
        url: 'https://example.com',
        status: 'crawling',
        lastCrawledAt: null,
        teamId: 1,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        deletedAt: null,
        wikidataQID: null,
        automationEnabled: false,
        nextCrawlAt: null,
        crawlData: null,
        location: null,
        category: null,
        description: null,
      };

      const crawlJob: CrawlJob = {
        id: 1,
        businessId: 1,
        status: 'running',
        progress: 50,
        jobType: 'full',
        startedAt: new Date('2024-01-01'),
        completedAt: null,
        pagesDiscovered: 10,
        pagesProcessed: 5,
        firecrawlJobId: 'fc-123',
        errorMessage: null,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      };

      // Act: Transform to DTO (TEST SPECIFIES DESIRED BEHAVIOR)
      const dto = toBusinessStatusDTO(business, crawlJob, null);

      // Assert: SPECIFICATION - MUST calculate estimated completion
      expect(dto.estimatedCompletion).toBeDefined();
      expect(dto.estimatedCompletion).toBeInstanceOf(Date);
    });
  });
});



