/**
 * TDD Test: Wikidata DTO - Tests Drive Implementation
 * 
 * SPECIFICATION: Wikidata Data Transformation
 * 
 * As a user
 * I want Wikidata data transformed to DTOs
 * So that I can display entity information in the UI
 * 
 * IMPORTANT: These tests specify DESIRED behavior for Wikidata DTO transformation.
 * Tests verify that transformation works correctly for UI display.
 * 
 * TDD Cycle: RED → GREEN → REFACTOR
 * Tests written to specify desired DTO transformation behavior
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getWikidataPublishDTO,
  toWikidataEntityDetailDTO,
} from '../wikidata-dto';
import type { WikidataEntityDataContract } from '@/lib/types/wikidata-contract';

// Mock dependencies
vi.mock('@/lib/db/drizzle', () => ({
  db: {
    query: {
      businesses: {
        findFirst: vi.fn(),
      },
      wikidataEntities: {
        findFirst: vi.fn(),
      },
    },
  },
}));

vi.mock('@/lib/db/queries', () => ({
  getTeamForBusiness: vi.fn(),
}));

vi.mock('@/lib/wikidata/entity-builder', () => ({
  entityBuilder: {
    buildEntity: vi.fn(),
  },
}));

vi.mock('@/lib/wikidata/notability-checker', () => ({
  notabilityChecker: {
    checkNotability: vi.fn(),
  },
}));

describe('🔴 RED: Wikidata DTO - Desired Behavior Specification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * SPECIFICATION 1: getWikidataPublishDTO - MUST Get Publish Data with Notability
   * 
   * DESIRED BEHAVIOR: getWikidataPublishDTO() MUST fetch business, check notability,
   * build entity, and return DTO with publishability assessment.
   */
  describe('getWikidataPublishDTO', () => {
    it('MUST return publish DTO with notability check', async () => {
      // Arrange: Mock business and dependencies
      const mockBusiness = {
        id: 1,
        name: 'Test Business',
        url: 'https://example.com',
        location: { city: 'San Francisco', state: 'CA' },
        wikidataQID: null,
        crawlData: {},
      };

      const mockTeam = {
        id: 1,
        planName: 'pro' as const,
      };

      const mockNotabilityResult = {
        isNotable: true,
        confidence: 0.8,
        reasons: ['Has news coverage'],
        seriousReferenceCount: 3,
        references: [
          { title: 'News Article', url: 'https://news.com/article', source: 'news' },
        ],
        topReferences: [],
        assessment: {
          recommendations: [],
          references: [],
        },
      };

      const mockEntity: WikidataEntityDataContract = {
        labels: { en: { value: 'Test Business' } },
        descriptions: { en: { value: 'A test business' } },
        claims: {
          P31: [{ mainsnak: { datavalue: { type: 'wikibase-entityid', value: { id: 'Q4835513' } } } }],
          P856: [{ mainsnak: { datavalue: { type: 'url', value: 'https://example.com' } } }],
        },
      };

      const { db } = await import('@/lib/db/drizzle');
      const { getTeamForBusiness } = await import('@/lib/db/queries');
      const { entityBuilder } = await import('@/lib/wikidata/entity-builder');
      const { notabilityChecker } = await import('@/lib/wikidata/notability-checker');

      vi.mocked(db.query.businesses.findFirst).mockResolvedValue(mockBusiness as any);
      vi.mocked(getTeamForBusiness).mockResolvedValue(mockTeam as any);
      vi.mocked(notabilityChecker.checkNotability).mockResolvedValue(mockNotabilityResult as any);
      vi.mocked(entityBuilder.buildEntity).mockResolvedValue(mockEntity);
      vi.mocked(db.query.wikidataEntities.findFirst).mockResolvedValue(null);

      // Act: Get publish DTO (TEST SPECIFIES DESIRED BEHAVIOR)
      const dto = await getWikidataPublishDTO(1);

      // Assert: SPECIFICATION - MUST return complete DTO
      expect(dto.businessId).toBe(1);
      expect(dto.businessName).toBe('Test Business');
      expect(dto.notability.isNotable).toBe(true);
      expect(dto.notability.confidence).toBe(0.8);
      expect(dto.entity.label).toBe('Test Business');
      expect(dto.entity.description).toBe('A test business');
      expect(dto.canPublish).toBe(true);
      expect(dto.recommendation).toBeDefined();
      expect(dto.fullEntity).toBeDefined();
    });

    it('MUST determine canPublish based on notability and confidence', async () => {
      // Arrange: Mock notable business
      const mockBusiness = {
        id: 1,
        name: 'Test Business',
        url: 'https://example.com',
        location: { city: 'San Francisco', state: 'CA' },
        wikidataQID: null,
        crawlData: {},
      };

      const mockTeam = {
        id: 1,
        planName: 'pro' as const,
      };

      const mockNotabilityResult = {
        isNotable: true,
        confidence: 0.8,
        reasons: ['Has news coverage'],
        seriousReferenceCount: 3,
        references: [
          { title: 'News Article', url: 'https://news.com/article', source: 'news' },
        ],
        topReferences: [],
        assessment: {
          recommendations: [],
          references: [],
        },
      };

      const mockEntity: WikidataEntityDataContract = {
        labels: { en: { value: 'Test Business' } },
        descriptions: { en: { value: 'A test business' } },
        claims: {},
      };

      const { db } = await import('@/lib/db/drizzle');
      const { getTeamForBusiness } = await import('@/lib/db/queries');
      const { entityBuilder } = await import('@/lib/wikidata/entity-builder');
      const { notabilityChecker } = await import('@/lib/wikidata/notability-checker');

      vi.mocked(db.query.businesses.findFirst).mockResolvedValue(mockBusiness as any);
      vi.mocked(getTeamForBusiness).mockResolvedValue(mockTeam as any);
      vi.mocked(notabilityChecker.checkNotability).mockResolvedValue(mockNotabilityResult as any);
      vi.mocked(entityBuilder.buildEntity).mockResolvedValue(mockEntity);
      vi.mocked(db.query.wikidataEntities.findFirst).mockResolvedValue(null);

      // Act: Get publish DTO (TEST SPECIFIES DESIRED BEHAVIOR)
      const dto = await getWikidataPublishDTO(1);

      // Assert: SPECIFICATION - MUST allow publishing for notable business
      expect(dto.canPublish).toBe(true);
    });

    it('MUST filter entity claims by tier', async () => {
      // Arrange: Mock business with different tiers
      const mockBusiness = {
        id: 1,
        name: 'Test Business',
        url: 'https://example.com',
        location: { city: 'San Francisco', state: 'CA' },
        wikidataQID: null,
        crawlData: {},
      };

      const mockEntity: WikidataEntityDataContract = {
        labels: { en: { value: 'Test Business' } },
        descriptions: { en: { value: 'A test business' } },
        claims: {
          P31: [{ mainsnak: { datavalue: { type: 'wikibase-entityid', value: { id: 'Q4835513' } } } }], // Basic
          P856: [{ mainsnak: { datavalue: { type: 'url', value: 'https://example.com' } } }], // Basic
          P968: [{ mainsnak: { datavalue: { type: 'string', value: 'test@example.com' } } }], // Enhanced
          P131: [{ mainsnak: { datavalue: { type: 'wikibase-entityid', value: { id: 'Q62' } } } }], // Complete
        },
      };

      const mockNotabilityResult = {
        isNotable: true,
        confidence: 0.8,
        reasons: [],
        seriousReferenceCount: 3,
        references: [],
        topReferences: [],
        assessment: {
          recommendations: [],
          references: [],
        },
      };

      const { db } = await import('@/lib/db/drizzle');
      const { getTeamForBusiness } = await import('@/lib/db/queries');
      const { entityBuilder } = await import('@/lib/wikidata/entity-builder');
      const { notabilityChecker } = await import('@/lib/wikidata/notability-checker');

      // Test free tier (basic properties only)
      vi.mocked(db.query.businesses.findFirst).mockResolvedValue(mockBusiness as any);
      vi.mocked(getTeamForBusiness).mockResolvedValue({ id: 1, planName: 'free' } as any);
      vi.mocked(notabilityChecker.checkNotability).mockResolvedValue(mockNotabilityResult as any);
      vi.mocked(entityBuilder.buildEntity).mockResolvedValue(mockEntity);
      vi.mocked(db.query.wikidataEntities.findFirst).mockResolvedValue(null);

      // Act: Get publish DTO for free tier (TEST SPECIFIES DESIRED BEHAVIOR)
      const freeDto = await getWikidataPublishDTO(1);

      // Assert: SPECIFICATION - MUST filter to basic properties only
      expect(Object.keys(freeDto.fullEntity.claims)).toContain('P31'); // Basic
      expect(Object.keys(freeDto.fullEntity.claims)).toContain('P856'); // Basic
      expect(Object.keys(freeDto.fullEntity.claims)).not.toContain('P968'); // Enhanced (not in free)
      expect(Object.keys(freeDto.fullEntity.claims)).not.toContain('P131'); // Complete (not in free)
    });

    it('MUST throw error if business not found', async () => {
      // Arrange: Business not found
      const { db } = await import('@/lib/db/drizzle');
      vi.mocked(db.query.businesses.findFirst).mockResolvedValue(null);

      // Act & Assert: SPECIFICATION - MUST throw error
      await expect(getWikidataPublishDTO(999)).rejects.toThrow('Business not found');
    });
  });

  /**
   * SPECIFICATION 2: toWikidataEntityDetailDTO - MUST Transform Entity to Detail DTO
   * 
   * DESIRED BEHAVIOR: toWikidataEntityDetailDTO() MUST transform WikidataEntityDataContract
   * to WikidataEntityDetailDTO with formatted claims and stats.
   */
  describe('toWikidataEntityDetailDTO', () => {
    it('MUST transform entity data to detail DTO', () => {
      // Arrange: Entity data
      const entityData: WikidataEntityDataContract = {
        labels: { en: { value: 'Test Business' } },
        descriptions: { en: { value: 'A test business' } },
        claims: {
          P31: [{
            mainsnak: {
              datavalue: {
                type: 'wikibase-entityid',
                value: { id: 'Q4835513', label: 'Business' },
              },
            },
            rank: 'normal',
          }],
          P856: [{
            mainsnak: {
              datavalue: {
                type: 'url',
                value: 'https://example.com',
              },
            },
            rank: 'normal',
          }],
        },
      };

      // Act: Transform to DTO (TEST SPECIFIES DESIRED BEHAVIOR)
      const dto = toWikidataEntityDetailDTO(entityData, 'Q123');

      // Assert: SPECIFICATION - MUST return complete DTO
      expect(dto.qid).toBe('Q123');
      expect(dto.label).toBe('Test Business');
      expect(dto.description).toBe('A test business');
      expect(dto.wikidataUrl).toBe('https://www.wikidata.org/wiki/Q123');
      expect(dto.claims).toHaveLength(2);
      expect(dto.stats.totalClaims).toBe(2);
      expect(dto.canEdit).toBe(true);
      expect(dto.editUrl).toBe('https://www.wikidata.org/wiki/Q123');
    });

    it('MUST handle entity without QID', () => {
      // Arrange: Entity data without QID
      const entityData: WikidataEntityDataContract = {
        labels: { en: { value: 'Test Business' } },
        descriptions: { en: { value: 'A test business' } },
        claims: {},
      };

      // Act: Transform to DTO (TEST SPECIFIES DESIRED BEHAVIOR)
      const dto = toWikidataEntityDetailDTO(entityData, null);

      // Assert: SPECIFICATION - MUST handle null QID
      expect(dto.qid).toBeNull();
      expect(dto.wikidataUrl).toBeNull();
      expect(dto.canEdit).toBe(false);
      expect(dto.editUrl).toBeNull();
    });

    it('MUST extract claims with references', () => {
      // Arrange: Entity with claims and references
      const entityData: WikidataEntityDataContract = {
        labels: { en: { value: 'Test Business' } },
        descriptions: { en: { value: 'A test business' } },
        claims: {
          P856: [{
            mainsnak: {
              datavalue: {
                type: 'url',
                value: 'https://example.com',
              },
            },
            references: [{
              url: 'https://news.com/article',
              title: 'News Article',
              retrieved: new Date('2024-01-01'),
            }],
            rank: 'normal',
          }],
        },
      };

      // Act: Transform to DTO (TEST SPECIFIES DESIRED BEHAVIOR)
      const dto = toWikidataEntityDetailDTO(entityData, 'Q123');

      // Assert: SPECIFICATION - MUST extract references
      expect(dto.claims[0].references).toHaveLength(1);
      expect(dto.claims[0].references[0].url).toBe('https://news.com/article');
      expect(dto.claims[0].references[0].title).toBe('News Article');
      expect(dto.stats.claimsWithReferences).toBe(1);
    });

    it('MUST calculate reference quality', () => {
      // Arrange: Entity with high reference coverage
      const entityData: WikidataEntityDataContract = {
        labels: { en: { value: 'Test Business' } },
        descriptions: { en: { value: 'A test business' } },
        claims: {
          P31: [{
            mainsnak: {
              datavalue: {
                type: 'wikibase-entityid',
                value: { id: 'Q4835513' },
              },
            },
            references: [{ url: 'https://ref1.com' }],
            rank: 'normal',
          }],
          P856: [{
            mainsnak: {
              datavalue: {
                type: 'url',
                value: 'https://example.com',
              },
            },
            references: [{ url: 'https://ref2.com' }],
            rank: 'normal',
          }],
        },
      };

      // Act: Transform to DTO (TEST SPECIFIES DESIRED BEHAVIOR)
      const dto = toWikidataEntityDetailDTO(entityData, 'Q123');

      // Assert: SPECIFICATION - MUST calculate reference quality
      // 2 claims with references / 2 total claims = 100% = high quality
      expect(dto.stats.referenceQuality).toBe('high');
    });

    it('MUST handle different label formats', () => {
      // Arrange: Entity with string label
      const entityData = {
        labels: { en: 'Test Business' }, // String format
        descriptions: { en: 'A test business' },
        claims: {},
      };

      // Act: Transform to DTO (TEST SPECIFIES DESIRED BEHAVIOR)
      const dto = toWikidataEntityDetailDTO(entityData, 'Q123');

      // Assert: SPECIFICATION - MUST handle string labels
      expect(dto.label).toBe('Test Business');
    });

    it('MUST limit claims to first 10 for display', () => {
      // Arrange: Entity with many claims
      const claims: any = {};
      for (let i = 0; i < 15; i++) {
        claims[`P${i}`] = [{
          mainsnak: {
            datavalue: {
              type: 'string',
              value: `Value ${i}`,
            },
          },
          rank: 'normal',
        }];
      }

      const entityData: WikidataEntityDataContract = {
        labels: { en: { value: 'Test Business' } },
        descriptions: { en: { value: 'A test business' } },
        claims,
      };

      // Act: Transform to DTO (TEST SPECIFIES DESIRED BEHAVIOR)
      const dto = toWikidataEntityDetailDTO(entityData, 'Q123');

      // Assert: SPECIFICATION - MUST limit to 10 claims
      expect(dto.claims.length).toBe(10);
    });
  });
});

