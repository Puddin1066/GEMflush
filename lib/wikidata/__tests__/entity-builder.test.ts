import { describe, it, expect } from 'vitest';
import { entityBuilder } from '../entity-builder';
import { Business } from '@/lib/db/schema';
import { CrawledData } from '@/lib/types/gemflush';

describe('WikidataEntityBuilder', () => {
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
    description: 'A test business for unit testing',
    phone: '+1-555-0123',
    email: 'test@testbusiness.com',
    address: '123 Main St',
  };

  describe('buildEntity', () => {
    it('should build a valid Wikidata entity', () => {
      const entity = entityBuilder.buildEntity(mockBusiness, mockCrawledData);

      expect(entity).toHaveProperty('labels');
      expect(entity).toHaveProperty('descriptions');
      expect(entity).toHaveProperty('claims');
    });

    it('should include English label with crawled name', () => {
      const entity = entityBuilder.buildEntity(mockBusiness, mockCrawledData);

      expect(entity.labels.en.value).toBe('Test Business Inc.');
      expect(entity.labels.en.language).toBe('en');
    });

    it('should fallback to business name if no crawled name', () => {
      const entity = entityBuilder.buildEntity(mockBusiness);

      expect(entity.labels.en.value).toBe('Test Business');
    });

    it('should include description from crawled data', () => {
      const entity = entityBuilder.buildEntity(mockBusiness, mockCrawledData);

      expect(entity.descriptions.en.value).toBe('A test business for unit testing');
    });

    it('should truncate description to 250 characters', () => {
      const longDescription = 'a'.repeat(300);
      const crawledData: CrawledData = {
        ...mockCrawledData,
        description: longDescription,
      };

      const entity = entityBuilder.buildEntity(mockBusiness, crawledData);

      expect(entity.descriptions.en.value.length).toBe(250);
    });
  });

  describe('claims (properties)', () => {
    it('should include P31 (instance of) claim', () => {
      const entity = entityBuilder.buildEntity(mockBusiness, mockCrawledData);

      expect(entity.claims.P31).toBeDefined();
      expect(entity.claims.P31[0].mainsnak.property).toBe('P31');
      expect(entity.claims.P31[0].mainsnak.datavalue.value).toEqual({
        'entity-type': 'item',
        id: 'Q4830453',
      });
    });

    it('should include P856 (official website) claim', () => {
      const entity = entityBuilder.buildEntity(mockBusiness, mockCrawledData);

      expect(entity.claims.P856).toBeDefined();
      expect(entity.claims.P856[0].mainsnak.property).toBe('P856');
      expect(entity.claims.P856[0].mainsnak.datavalue.value).toBe('https://testbusiness.com');
    });

    it('should include P625 (coordinates) when location has lat/lng', () => {
      const entity = entityBuilder.buildEntity(mockBusiness, mockCrawledData);

      expect(entity.claims.P625).toBeDefined();
      expect(entity.claims.P625[0].mainsnak.property).toBe('P625');
      expect(entity.claims.P625[0].mainsnak.datavalue.value).toEqual({
        latitude: 37.7749,
        longitude: -122.4194,
        precision: 0.0001,
        globe: 'http://www.wikidata.org/entity/Q2',
      });
    });

    it('should not include P625 when location missing coordinates', () => {
      const businessWithoutCoords: Business = {
        ...mockBusiness,
        location: {
          city: 'San Francisco',
          state: 'CA',
          country: 'US',
        },
      };

      const entity = entityBuilder.buildEntity(businessWithoutCoords, mockCrawledData);

      expect(entity.claims.P625).toBeUndefined();
    });

    it('should include P1448 (official name) claim', () => {
      const entity = entityBuilder.buildEntity(mockBusiness, mockCrawledData);

      expect(entity.claims.P1448).toBeDefined();
      expect(entity.claims.P1448[0].mainsnak.datavalue.value).toBe('Test Business Inc.');
    });

    it('should include P1329 (phone number) when available', () => {
      const entity = entityBuilder.buildEntity(mockBusiness, mockCrawledData);

      expect(entity.claims.P1329).toBeDefined();
      expect(entity.claims.P1329[0].mainsnak.datavalue.value).toBe('+1-555-0123');
    });

    it('should include P6375 (street address) when available', () => {
      const entity = entityBuilder.buildEntity(mockBusiness, mockCrawledData);

      expect(entity.claims.P6375).toBeDefined();
      expect(entity.claims.P6375[0].mainsnak.datavalue.value).toBe('123 Main St');
    });

    it('should include references (P854) for claims', () => {
      const entity = entityBuilder.buildEntity(mockBusiness, mockCrawledData);

      const claimWithReference = entity.claims.P31[0];
      expect(claimWithReference.references).toBeDefined();
      expect(claimWithReference.references![0].snaks.P854).toBeDefined();
      expect(claimWithReference.references![0].snaks.P854[0].datavalue.value).toBe(
        'https://testbusiness.com'
      );
    });
  });

  describe('validateNotability', () => {
    it('should pass validation for valid entity', () => {
      const entity = entityBuilder.buildEntity(mockBusiness, mockCrawledData);
      const result = entityBuilder.validateNotability(entity);

      expect(result.isNotable).toBe(true);
      expect(result.reasons).toHaveLength(0);
    });

    it('should fail if no references provided', () => {
      const entity = entityBuilder.buildEntity(mockBusiness, mockCrawledData);
      // Remove all references
      Object.keys(entity.claims).forEach(pid => {
        entity.claims[pid].forEach(claim => {
          claim.references = [];
        });
      });

      const result = entityBuilder.validateNotability(entity);

      expect(result.isNotable).toBe(false);
      expect(result.reasons).toContain('No references provided');
    });

    it('should fail if less than 3 properties', () => {
      const entity = entityBuilder.buildEntity(mockBusiness, mockCrawledData);
      // Keep only 2 properties
      entity.claims = {
        P31: entity.claims.P31,
        P856: entity.claims.P856,
      };

      const result = entityBuilder.validateNotability(entity);

      expect(result.isNotable).toBe(false);
      expect(result.reasons).toContain('Only 2 properties (minimum 3 required)');
    });

    it('should fail if missing P31 (instance of)', () => {
      const entity = entityBuilder.buildEntity(mockBusiness, mockCrawledData);
      delete entity.claims.P31;

      const result = entityBuilder.validateNotability(entity);

      expect(result.isNotable).toBe(false);
      expect(result.reasons).toContain('Missing "instance of" (P31) property');
    });
  });
});

