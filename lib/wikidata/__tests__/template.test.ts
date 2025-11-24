/**
 * Tests for EntityTemplate
 */

import { EntityTemplate } from '../template';
import type { CrawlDataInput } from '../types';

describe('EntityTemplate', () => {
  const mockCrawlData: CrawlDataInput = {
    url: 'https://example.com',
    name: 'Test Business',
    description: 'A test business for unit testing',
    location: {
      address: '123 Test St',
      city: 'Test City',
      state: 'TS',
      country: 'US',
      coordinates: {
        lat: 40.7128,
        lng: -74.0060
      }
    },
    contact: {
      phone: '+1-555-123-4567',
      email: 'test@example.com'
    },
    business: {
      industry: 'Technology',
      founded: '2020',
      employeeCount: 50
    }
  };

  describe('generateEntity', () => {
    it('should generate a valid entity with all available properties', async () => {
      const entity = await EntityTemplate.generateEntity(mockCrawlData);

      expect(entity).toBeDefined();
      expect(entity.labels.en.value).toBe('Test Business');
      expect(entity.descriptions.en.value).toBe('A test business for unit testing');
      expect(entity.claims).toBeDefined();
      expect(Object.keys(entity.claims).length).toBeGreaterThan(0);
    });

    it('should respect maxProperties limit', async () => {
      const entity = await EntityTemplate.generateEntity(mockCrawlData, {
        maxProperties: 5
      });

      expect(Object.keys(entity.claims).length).toBeLessThanOrEqual(5);
    });

    it('should include required properties', async () => {
      const entity = await EntityTemplate.generateEntity(mockCrawlData);

      expect(entity.claims['P31']).toBeDefined(); // instance of
      expect(entity.claims['P856']).toBeDefined(); // official website
      expect(entity.claims['P1448']).toBeDefined(); // official name
    });

    it('should include references when requested', async () => {
      const entity = await EntityTemplate.generateEntity(mockCrawlData, {
        includeReferences: true
      });

      const hasReferences = Object.values(entity.claims)
        .flat()
        .some(claim => claim.references && claim.references.length > 0);

      expect(hasReferences).toBe(true);
    });

    it('should exclude references when not requested', async () => {
      const entity = await EntityTemplate.generateEntity(mockCrawlData, {
        includeReferences: false
      });

      const hasReferences = Object.values(entity.claims)
        .flat()
        .some(claim => claim.references && claim.references.length > 0);

      expect(hasReferences).toBe(false);
    });
  });

  describe('data extraction', () => {
    it('should handle minimal data', async () => {
      const minimalData: CrawlDataInput = {
        url: 'https://minimal.com',
        name: 'Minimal Business'
      };

      const entity = await EntityTemplate.generateEntity(minimalData);

      expect(entity.labels.en.value).toBe('Minimal Business');
      expect(entity.claims['P31']).toBeDefined(); // instance of
      expect(entity.claims['P856']).toBeDefined(); // official website
    });

    it('should clean business names', async () => {
      const dataWithTimestamp: CrawlDataInput = {
        url: 'https://test.com',
        name: 'Test Business 1234567890123'
      };

      const entity = await EntityTemplate.generateEntity(dataWithTimestamp);

      expect(entity.labels.en.value).toBe('Test Business');
    });

    it('should generate descriptions when missing', async () => {
      const dataWithoutDescription: CrawlDataInput = {
        url: 'https://test.com',
        name: 'Test Business',
        business: {
          industry: 'Technology'
        },
        location: {
          city: 'Test City',
          state: 'TS'
        }
      };

      const entity = await EntityTemplate.generateEntity(dataWithoutDescription);

      expect(entity.descriptions.en.value).toContain('Technology');
      expect(entity.descriptions.en.value).toContain('Test City');
    });
  });
});

