import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WikidataPublisher } from '@/lib/wikidata/publisher';
import { WikidataSPARQLService } from '@/lib/wikidata/sparql';
import { NotabilityChecker } from '@/lib/wikidata/notability-checker';
import { entityBuilder } from '@/lib/wikidata/entity-builder';
import { Business } from '@/lib/db/schema';
import { CrawledData } from '@/lib/types/gemflush';

// Mock dependencies
vi.mock('@/lib/llm/openrouter', () => ({
  openRouterClient: {
    query: vi.fn().mockResolvedValue({
      content: '[]',
      tokensUsed: 100,
      model: 'mock-model',
    }),
  },
}));

vi.mock('googleapis', () => ({
  google: {
    customsearch: vi.fn(() => ({
      cse: {
        list: vi.fn().mockResolvedValue({
          data: { items: [] },
        }),
      },
    })),
  },
}));

vi.mock('@/lib/db/drizzle', () => ({
  db: {
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      }),
    }),
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        onConflictDoUpdate: vi.fn().mockResolvedValue({}),
      }),
    }),
  },
}));

global.fetch = vi.fn();

describe('Wikidata E2E Tests', () => {
  const mockBusiness: Business = {
    id: 1,
    teamId: 1,
    name: 'Test Business',
    url: 'https://testbusiness.com',
    category: 'restaurant',
    location: {
      city: 'San Francisco',
      state: 'CA',
      country: 'US',
      coordinates: {
        lat: 37.7749,
        lng: -122.4194,
      },
    },
    wikidataQID: null,
    wikidataPublishedAt: null,
    lastCrawledAt: null,
    crawlData: null,
    status: 'crawled',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockCrawledData: CrawledData = {
    name: 'Test Business Inc.',
    description: 'A test business for e2e testing',
    phone: '+1-555-0123',
    email: 'test@testbusiness.com',
    address: '123 Main St',
  };

  describe('Complete Wikidata Publishing Workflow', () => {
    it('should build entity, check notability, and publish', async () => {
      // Step 1: Build entity
      const entity = await entityBuilder.buildEntity(mockBusiness, mockCrawledData);
      expect(entity).toBeDefined();
      expect(entity.labels.en.value).toBe('Test Business Inc.');

      // Step 2: Check notability
      const checker = new NotabilityChecker();
      const notabilityResult = await checker.checkNotability('Test Business', {
        city: 'San Francisco',
        state: 'CA',
      });
      expect(notabilityResult).toBeDefined();
      expect(notabilityResult.isNotable).toBeDefined();

      // Step 3: Publish entity
      const publisher = new WikidataPublisher();
      const publishResult = await publisher.publishEntity(entity, false);
      expect(publishResult.success).toBe(true);
      expect(publishResult.qid).toMatch(/^Q\d+$/);
    });
  });

  describe('QID Resolution Workflow', () => {
    it('should resolve QIDs for location and industry', async () => {
      const sparqlService = new WikidataSPARQLService();

      // Resolve city QID
      const cityQID = await sparqlService.findCityQID('San Francisco', 'CA', 'Q30', true);
      expect(cityQID).toBe('Q62');

      // Resolve industry QID
      const industryQID = await sparqlService.findIndustryQID('restaurant', true);
      expect(industryQID).toBeDefined();
    });
  });

  describe('Entity Building with QID Resolution', () => {
    it('should build entity with resolved QIDs', async () => {
      const entity = await entityBuilder.buildEntity(mockBusiness, mockCrawledData);

      // Entity should have claims
      expect(entity.claims).toBeDefined();
      expect(Object.keys(entity.claims).length).toBeGreaterThan(0);

      // Should have instance of (P31)
      expect(entity.claims.P31).toBeDefined();
    });
  });

  describe('Error Handling Workflow', () => {
    it('should handle notability check errors gracefully', async () => {
      const checker = new NotabilityChecker();
      
      // Mock API error
      const { google } = await import('googleapis');
      (google.customsearch().cse.list as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('API Error')
      );

      const result = await checker.checkNotability('Test Business');
      expect(result.isNotable).toBe(false);
      expect(result.references).toHaveLength(0);
    });

    it('should handle publish errors gracefully', async () => {
      const publisher = new WikidataPublisher();
      const entity = await entityBuilder.buildEntity(mockBusiness, mockCrawledData);

      // Create publisher that will error
      const publisherWithError = new WikidataPublisher();
      vi.spyOn(publisherWithError as any, 'generateMockQID').mockImplementation(() => {
        throw new Error('Publish error');
      });

      const result = await publisherWithError.publishEntity(entity, false);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});

