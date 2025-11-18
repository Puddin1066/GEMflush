/**
 * Tiered Entity Builder Tests
 * Tests tier-based property filtering
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TieredEntityBuilder } from '../tiered-entity-builder';
import type { Business } from '@/lib/db/schema';
import type { CrawledData } from '@/lib/types/gemflush';
import type { WikidataEntityDataContract } from '@/lib/types/wikidata-contract';

// Mock the entity builder
vi.mock('../entity-builder', () => {
  const mockBuildEntity = vi.fn().mockResolvedValue({
    labels: { en: { language: 'en', value: 'Test Business' } },
    descriptions: { en: { language: 'en', value: 'A test business' } },
    claims: {
      P31: [{ mainsnak: { property: 'P31', datavalue: { value: { id: 'Q4830453' } } } }],
      P856: [{ mainsnak: { property: 'P856', datavalue: { value: 'https://test.com' } } }],
      P1448: [{ mainsnak: { property: 'P1448', datavalue: { value: 'Test Business' } } }],
      P625: [{ mainsnak: { property: 'P625', datavalue: { value: { latitude: 37.7, longitude: -122.4 } } } }],
      P1329: [{ mainsnak: { property: 'P1329', datavalue: { value: '+1-555-0123' } } }],
      P6375: [{ mainsnak: { property: 'P6375', datavalue: { value: '123 Main St' } } }],
      P968: [{ mainsnak: { property: 'P968', datavalue: { value: 'test@test.com' } } }],
      P2002: [{ mainsnak: { property: 'P2002', datavalue: { value: 'testbusiness' } } }],
      P2013: [{ mainsnak: { property: 'P2013', datavalue: { value: 'testbusiness' } } }],
      P131: [{ mainsnak: { property: 'P131', datavalue: { value: { id: 'Q5083' } } } }],
      P452: [{ mainsnak: { property: 'P452', datavalue: { value: { id: 'Q11650' } } } }],
    },
    llmSuggestions: {
      suggestedProperties: [],
      qualityScore: 85,
      completeness: 60,
    },
  });

  return {
    WikidataEntityBuilder: class {
      buildEntity = mockBuildEntity;
    },
  };
});

describe('TieredEntityBuilder', () => {
  const builder = new TieredEntityBuilder();
  const mockBusiness = {
    id: 1,
    name: 'Test Business',
    url: 'https://test.com',
  } as Business;
  
  const mockCrawledData: CrawledData = {
    name: 'Test Business',
    phone: '+1-555-0123',
    email: 'test@test.com',
    address: '123 Main St',
  };

  describe('getPropertiesForTier', () => {
    it('should return basic properties for free tier', () => {
      const properties = builder.getPropertiesForTier('free');
      expect(properties).toContain('P31');
      expect(properties).toContain('P856');
      expect(properties).toContain('P1448');
      expect(properties.length).toBeLessThanOrEqual(5);
    });

    it('should return enhanced properties for pro tier', () => {
      const properties = builder.getPropertiesForTier('pro');
      expect(properties).toContain('P31');
      expect(properties).toContain('P968'); // email
      expect(properties).toContain('P2002'); // Twitter
      expect(properties.length).toBeGreaterThan(5);
    });

    it('should return enhanced properties for agency tier (default level 1-2)', () => {
      const properties = builder.getPropertiesForTier('agency');
      // Agency tier without enrichment level returns enhanced (not complete)
      expect(properties).toContain('P968'); // email
      expect(properties).toContain('P2002'); // Twitter
      expect(properties).not.toContain('P131'); // Complete properties require level 3+
      expect(properties.length).toBeGreaterThan(5);
    });

    it('should return enhanced properties for agency tier level 1-2', () => {
      const properties = builder.getPropertiesForTier('agency', 2);
      expect(properties).not.toContain('P131'); // Complete properties not yet
      expect(properties.length).toBeGreaterThan(5);
    });

    it('should return complete properties for agency tier level 3+', () => {
      const properties = builder.getPropertiesForTier('agency', 3);
      expect(properties).toContain('P131'); // Complete properties
      expect(properties.length).toBeGreaterThan(10);
    });
  });

  describe('buildEntity', () => {
    it('should filter to basic properties for free tier', async () => {
      const entity = await builder.buildEntity(mockBusiness, mockCrawledData, 'free');
      
      expect(entity.claims.P31).toBeDefined();
      expect(entity.claims.P856).toBeDefined();
      expect(entity.claims.P1448).toBeDefined();
      // Enhanced properties should not be included
      expect(entity.claims.P968).toBeUndefined();
      expect(entity.claims.P2002).toBeUndefined();
    });

    it('should include enhanced properties for pro tier', async () => {
      const entity = await builder.buildEntity(mockBusiness, mockCrawledData, 'pro');
      
      expect(entity.claims.P31).toBeDefined();
      expect(entity.claims.P968).toBeDefined(); // email
      expect(entity.claims.P2002).toBeDefined(); // Twitter
      // Complete properties should not be included
      expect(entity.claims.P131).toBeUndefined();
    });

    it('should include complete properties for agency tier level 3+', async () => {
      const entity = await builder.buildEntity(mockBusiness, mockCrawledData, 'agency', 3);
      
      expect(entity.claims.P31).toBeDefined();
      expect(entity.claims.P968).toBeDefined();
      expect(entity.claims.P131).toBeDefined(); // Complete property
      expect(entity.claims.P452).toBeDefined(); // Complete property
    });

    it('should preserve labels and descriptions', async () => {
      const entity = await builder.buildEntity(mockBusiness, mockCrawledData, 'free');
      
      expect(entity.labels.en.value).toBe('Test Business');
      expect(entity.descriptions.en.value).toBe('A test business');
    });
  });

  describe('getExpectedPropertyCount', () => {
    it('should return correct count for free tier', () => {
      const count = builder.getExpectedPropertyCount('free');
      expect(count).toBe(5); // Basic properties
    });

    it('should return correct count for pro tier', () => {
      const count = builder.getExpectedPropertyCount('pro');
      expect(count).toBeGreaterThan(5);
    });

    it('should return correct count for agency tier', () => {
      const count = builder.getExpectedPropertyCount('agency');
      expect(count).toBeGreaterThan(10);
    });
  });
});

