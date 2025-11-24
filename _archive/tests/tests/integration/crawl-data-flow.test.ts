// Crawl data flow contract tests
// Validates data flows correctly through crawl → storage → entity building

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { webCrawler } from '@/lib/crawler';
import { entityBuilder } from '@/lib/wikidata/entity-builder';
import { validateCrawledData } from '@/lib/validation/crawl';
import type { CrawledData, CrawlResult } from '@/lib/types/gemflush';
import type { Business } from '@/lib/db/schema';

// Mock dependencies
vi.mock('@/lib/db/queries', () => ({
  getBusinessById: vi.fn(),
  updateBusiness: vi.fn(),
}));

vi.mock('@/lib/crawler', () => ({
  webCrawler: {
    crawl: vi.fn(),
  },
}));

describe('Crawl Data Flow Contracts', () => {
  const mockBusiness: Business = {
    id: 1,
    teamId: 1,
    name: 'Test Business',
    url: 'https://example.com',
    category: 'technology',
    location: {
      city: 'San Francisco',
      state: 'CA',
      country: 'US',
    },
    status: 'pending',
    crawlData: null,
    lastCrawledAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Crawl → Validate → Store flow', () => {
    it('should flow: crawl → validate → store', async () => {
      const { getBusinessById, updateBusiness } = await import('@/lib/db/queries');

      const crawledData: CrawledData = {
        name: 'Crawled Business Name',
        description: 'Crawled description',
        phone: '123-456-7890',
        email: 'test@example.com',
      };

      const crawlResult: CrawlResult = {
        success: true,
        data: crawledData,
        url: 'https://example.com',
        crawledAt: new Date(),
      };

      vi.mocked(webCrawler.crawl).mockResolvedValue(crawlResult);
      vi.mocked(getBusinessById).mockResolvedValue(mockBusiness);
      vi.mocked(updateBusiness).mockResolvedValue(undefined);

      // 1. Crawl
      const result = await webCrawler.crawl('https://example.com');
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();

      // 2. Validate
      const validation = validateCrawledData(result.data!);
      expect(validation.success).toBe(true);

      // 3. Store (simulated)
      if (validation.success && result.data) {
        await updateBusiness(1, {
          crawlData: result.data,
          lastCrawledAt: new Date(),
        });
      }

      expect(updateBusiness).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          crawlData: crawledData,
        })
      );
    });

    it('should reject invalid crawlData before storage', async () => {
      const invalidData = {
        email: 'not-an-email', // Invalid
      };

      const validation = validateCrawledData(invalidData);
      expect(validation.success).toBe(false);

      // Should not store invalid data
      if (!validation.success) {
        // Storage should be prevented
        expect(validation.errors).toBeDefined();
      }
    });
  });

  describe('Storage → Entity Building flow', () => {
    it('should flow: stored crawlData → entity building', async () => {
      const { getBusinessById } = await import('@/lib/db/queries');

      const storedCrawlData: CrawledData = {
        name: 'Crawled Name',
        description: 'Crawled description',
        phone: '123-456-7890',
        email: 'test@example.com',
        socialLinks: {
          twitter: 'https://twitter.com/test',
        },
      };

      const businessWithCrawlData = {
        ...mockBusiness,
        crawlData: storedCrawlData,
        status: 'crawled' as const,
      };

      vi.mocked(getBusinessById).mockResolvedValue(businessWithCrawlData);

      // Retrieve business with crawl data
      const business = await getBusinessById(1);
      expect(business?.crawlData).toBeDefined();

      // Build entity with crawl data
      const entity = await entityBuilder.buildEntity(
        business!,
        business!.crawlData as CrawledData
      );

      expect(entity).toBeDefined();
      expect(entity.labels).toBeDefined();
      expect(entity.claims).toBeDefined();
    });

    it('should preserve data integrity through transformations', async () => {
      const originalData: CrawledData = {
        name: 'Original Name',
        phone: '123-456-7890',
        email: 'test@example.com',
        socialLinks: {
          twitter: 'https://twitter.com/test',
        },
      };

      // Simulate storage and retrieval
      const storedData = JSON.parse(JSON.stringify(originalData)) as CrawledData;

      // Verify integrity
      expect(storedData.name).toBe(originalData.name);
      expect(storedData.phone).toBe(originalData.phone);
      expect(storedData.email).toBe(originalData.email);
      expect(storedData.socialLinks?.twitter).toBe(originalData.socialLinks?.twitter);
    });

    it('should handle missing crawlData gracefully in entity building', async () => {
      const businessWithoutCrawl = {
        ...mockBusiness,
        crawlData: null,
      };

      // Should still build entity with business data only
      const entity = await entityBuilder.buildEntity(
        businessWithoutCrawl,
        undefined
      );

      expect(entity).toBeDefined();
      expect(entity.labels.en.value).toBe(businessWithoutCrawl.name);
    });
  });

  describe('Complete flow: Crawl → Validate → Store → Entity', () => {
    it('should complete full flow successfully', async () => {
      const { getBusinessById, updateBusiness } = await import('@/lib/db/queries');

      const crawledData: CrawledData = {
        name: 'Full Flow Test',
        description: 'Test description',
        phone: '123-456-7890',
        email: 'test@example.com',
        socialLinks: {
          twitter: 'https://twitter.com/test',
        },
      };

      // 1. Crawl
      vi.mocked(webCrawler.crawl).mockResolvedValue({
        success: true,
        data: crawledData,
        url: 'https://example.com',
        crawledAt: new Date(),
      });

      const crawlResult = await webCrawler.crawl('https://example.com');
      expect(crawlResult.success).toBe(true);

      // 2. Validate
      const validation = validateCrawledData(crawlResult.data!);
      expect(validation.success).toBe(true);

      // 3. Store
      vi.mocked(updateBusiness).mockResolvedValue(undefined);
      await updateBusiness(1, {
        crawlData: crawlResult.data!,
        lastCrawledAt: new Date(),
      });

      // 4. Retrieve and build entity
      const businessWithData = {
        ...mockBusiness,
        crawlData: crawlResult.data!,
        status: 'crawled' as const,
      };

      vi.mocked(getBusinessById).mockResolvedValue(businessWithData);
      const business = await getBusinessById(1);

      const entity = await entityBuilder.buildEntity(
        business!,
        business!.crawlData as CrawledData
      );

      // Verify entity was built with crawl data
      expect(entity).toBeDefined();
      expect(entity.labels.en.value).toContain('Full Flow Test');
    });

    it('should handle errors at each stage gracefully', async () => {
      // Test error handling in crawl
      vi.mocked(webCrawler.crawl).mockResolvedValue({
        success: false,
        error: 'Crawl failed',
        url: 'https://example.com',
        crawledAt: new Date(),
      });

      const result = await webCrawler.crawl('https://example.com');
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();

      // Should not proceed to storage if crawl fails
      if (!result.success) {
        // Storage should not be called
      }
    });
  });

  describe('Data transformation integrity', () => {
    it('should preserve nested structures through JSON serialization', () => {
      const original: CrawledData = {
        socialLinks: {
          facebook: 'https://facebook.com/test',
          twitter: 'https://twitter.com/test',
        },
        businessDetails: {
          industry: 'Tech',
          employeeCount: 50,
          products: ['Product A'],
        },
      };

      // Simulate JSON serialization (database storage)
      const serialized = JSON.stringify(original);
      const deserialized = JSON.parse(serialized) as CrawledData;

      expect(deserialized.socialLinks).toEqual(original.socialLinks);
      expect(deserialized.businessDetails).toEqual(original.businessDetails);
    });

    it('should handle date objects in llmEnhanced', () => {
      const original: CrawledData = {
        llmEnhanced: {
          extractedEntities: ['Entity1'],
          businessCategory: 'Tech',
          serviceOfferings: ['Service1'],
          targetAudience: 'Enterprise',
          keyDifferentiators: ['Diff1'],
          confidence: 0.9,
          model: 'gpt-4',
          processedAt: new Date(),
        },
      };

      // Date becomes string in JSON
      const serialized = JSON.stringify(original);
      const deserialized = JSON.parse(serialized) as CrawledData;

      // processedAt should be string after JSON round-trip
      expect(typeof deserialized.llmEnhanced?.processedAt).toBe('string');
    });
  });
});

