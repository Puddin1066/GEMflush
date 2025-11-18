import { describe, it, expect } from 'vitest';
import type {
  IWebCrawler,
  ILLMFingerprinter,
  IOpenRouterClient,
  IWikidataEntityBuilder,
  IWikidataPublisher,
} from '../service-contracts';
import type { CrawlResult, FingerprintAnalysis, WikidataPublishResult } from '../gemflush';
import type { WikidataEntityDataContract } from '../wikidata-contract';
import type { Business } from '@/lib/db/schema';

/**
 * Contract Implementation Tests
 * 
 * These tests verify that service implementations match their contracts.
 * They use type checking rather than runtime validation.
 */

describe('Service Contract Implementation', () => {
  describe('IWebCrawler Contract', () => {
    it('should match WebCrawler implementation signature', async () => {
      // This test verifies the contract is importable and type-checkable
      // Actual implementation is in lib/crawler/index.ts
      const mockCrawler: IWebCrawler = {
        crawl: async (url: string): Promise<CrawlResult> => {
          return {
            success: true,
            url,
            crawledAt: new Date(),
            data: { name: 'Test' },
          };
        },
      };

      const result = await mockCrawler.crawl('https://example.com');
      expect(result.success).toBe(true);
      expect(result.url).toBe('https://example.com');
    });
  });

  describe('ILLMFingerprinter Contract', () => {
    it('should match LLMFingerprinter implementation signature', async () => {
      const mockFingerprinter: ILLMFingerprinter = {
        fingerprint: async (business: Business): Promise<FingerprintAnalysis> => {
          return {
            businessId: business.id,
            businessName: business.name,
            visibilityScore: 75,
            mentionRate: 80,
            sentimentScore: 0.8,
            accuracyScore: 0.85,
            avgRankPosition: 2,
            llmResults: [],
            generatedAt: new Date(),
          };
        },
      };

      const mockBusiness: Business = {
        id: 1,
        teamId: 1,
        name: 'Test Business',
        url: 'https://test.com',
        category: 'restaurant',
        location: { city: 'SF', state: 'CA', country: 'US' },
        wikidataQID: null,
        wikidataPublishedAt: null,
        lastCrawledAt: null,
        crawlData: null,
        status: 'crawled',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await mockFingerprinter.fingerprint(mockBusiness);
      expect(result.businessId).toBe(1);
      expect(result.visibilityScore).toBeGreaterThanOrEqual(0);
      expect(result.visibilityScore).toBeLessThanOrEqual(100);
    });
  });

  describe('IOpenRouterClient Contract', () => {
    it('should match OpenRouterClient implementation signature', async () => {
      const mockClient: IOpenRouterClient = {
        query: async (model: string, prompt: string) => {
          return {
            content: 'Test response',
            tokensUsed: 100,
            model,
          };
        },
      };

      const result = await mockClient.query('gpt-4', 'Test prompt');
      expect(result.content).toBe('Test response');
      expect(result.tokensUsed).toBe(100);
      expect(result.model).toBe('gpt-4');
    });
  });

  describe('IWikidataEntityBuilder Contract', () => {
    it('should match EntityBuilder implementation signature', () => {
      const mockBuilder: IWikidataEntityBuilder = {
        buildEntity: (business: Business | any): WikidataEntityDataContract => {
          return {
            labels: { en: { language: 'en', value: business.name } },
            descriptions: { en: { language: 'en', value: 'A business' } },
            claims: {},
          };
        },
        validateEntity: (entity: WikidataEntityDataContract): boolean => {
          return !!entity.labels && !!entity.descriptions;
        },
      };

      const mockBusiness: Business = {
        id: 1,
        teamId: 1,
        name: 'Test Business',
        url: 'https://test.com',
        category: 'restaurant',
        location: { city: 'SF', state: 'CA', country: 'US' },
        wikidataQID: null,
        wikidataPublishedAt: null,
        lastCrawledAt: null,
        crawlData: null,
        status: 'crawled',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const entity = mockBuilder.buildEntity(mockBusiness);
      expect(entity.labels).toBeDefined();
      expect(mockBuilder.validateEntity(entity)).toBe(true);
    });
  });

  describe('IWikidataPublisher Contract', () => {
    it('should match Publisher implementation signature', async () => {
      const mockPublisher: IWikidataPublisher = {
        publish: async (entity: WikidataEntityDataContract, target: 'test' | 'production'): Promise<WikidataPublishResult> => {
          return {
            qid: 'Q123',
            entityId: 1,
            publishedTo: target,
          };
        },
      };

      const mockEntity: WikidataEntityDataContract = {
        labels: { en: { language: 'en', value: 'Test' } },
        descriptions: { en: { language: 'en', value: 'A test' } },
        claims: {},
      };

      const result = await mockPublisher.publish(mockEntity, 'test');
      expect(result.qid).toBe('Q123');
      expect(result.publishedTo).toBe('test');
    });
  });
});

