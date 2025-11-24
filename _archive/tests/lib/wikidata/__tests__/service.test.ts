/**
 * Tests for WikidataService
 */

import { WikidataService } from '../service';
import type { Business } from '@/lib/db/schema';
import type { CrawledData } from '@/lib/types/gemflush';

// Mock data for testing
const mockBusiness: Business = {
  id: 'test-business-1',
  name: 'Test Business',
  url: 'https://testbusiness.com',
  location: {
    city: 'Test City',
    state: 'TS',
    country: 'US'
  },
  status: 'active',
  tier: 'free',
  createdAt: new Date(),
  updatedAt: new Date()
};

const mockCrawledData: CrawledData = {
  name: 'Test Business Inc',
  description: 'A comprehensive test business',
  phone: '+1-555-123-4567',
  email: 'contact@testbusiness.com',
  address: '123 Test Street',
  location: {
    city: 'Test City',
    state: 'TS',
    country: 'US',
    lat: 40.7128,
    lng: -74.0060
  },
  businessDetails: {
    industry: 'Technology',
    sector: 'Software',
    founded: '2020',
    employeeCount: 25
  },
  socialLinks: {
    facebook: 'https://facebook.com/testbusiness',
    twitter: 'https://twitter.com/testbusiness'
  }
};

describe('WikidataService', () => {
  let service: WikidataService;

  beforeEach(() => {
    // Set mock mode for testing
    process.env.WIKIDATA_PUBLISH_MODE = 'mock';
    service = new WikidataService();
  });

  afterEach(() => {
    delete process.env.WIKIDATA_PUBLISH_MODE;
  });

  describe('createAndPublishEntity', () => {
    it('should create and publish entity successfully', async () => {
      const result = await service.createAndPublishEntity(
        mockBusiness,
        mockCrawledData,
        { target: 'test', dryRun: true }
      );

      expect(result.result.success).toBe(true);
      expect(result.entity).toBeDefined();
      expect(result.selection).toBeDefined();
      expect(result.metrics.propertyCount).toBeGreaterThan(0);
    });

    it('should handle missing crawl data gracefully', async () => {
      const result = await service.createAndPublishEntity(
        mockBusiness,
        undefined,
        { target: 'test', dryRun: true }
      );

      expect(result.result.success).toBe(true);
      expect(result.entity.claims['P31']).toBeDefined(); // instance of
      expect(result.entity.claims['P856']).toBeDefined(); // official website
    });

    it('should respect property limits', async () => {
      const result = await service.createAndPublishEntity(
        mockBusiness,
        mockCrawledData,
        { 
          target: 'test', 
          dryRun: true,
          maxProperties: 5,
          maxQIDs: 3
        }
      );

      expect(result.metrics.propertyCount).toBeLessThanOrEqual(5);
      expect(result.metrics.qidCount).toBeLessThanOrEqual(3);
    });

    it('should calculate quality metrics', async () => {
      const result = await service.createAndPublishEntity(
        mockBusiness,
        mockCrawledData,
        { target: 'test', dryRun: true }
      );

      expect(result.metrics.dataQuality).toBeGreaterThan(0);
      expect(result.metrics.dataQuality).toBeLessThanOrEqual(1);
      expect(result.metrics.processingTime).toBeGreaterThan(0);
    });
  });

  describe('previewEntity', () => {
    it('should generate entity preview without publishing', async () => {
      const preview = await service.previewEntity(mockBusiness, mockCrawledData);

      expect(preview.entity).toBeDefined();
      expect(preview.selection).toBeDefined();
      expect(preview.validation).toBeDefined();
      expect(preview.metrics).toBeDefined();
    });

    it('should validate entity structure', async () => {
      const preview = await service.previewEntity(mockBusiness, mockCrawledData);

      expect(preview.validation.isValid).toBe(true);
      expect(preview.entity.labels.en.value).toBe('Test Business Inc');
    });

    it('should calculate completeness metrics', async () => {
      const preview = await service.previewEntity(mockBusiness, mockCrawledData);

      expect(preview.metrics.completeness).toBeGreaterThan(0);
      expect(preview.metrics.quality).toBeGreaterThan(0);
      expect(preview.metrics.propertyCount).toBeGreaterThan(0);
    });
  });

  describe('updateEntity', () => {
    it('should update existing entity', async () => {
      const result = await service.updateEntity(
        'Q123456',
        mockBusiness,
        mockCrawledData,
        { target: 'test', dryRun: true }
      );

      expect(result.success).toBe(true);
      expect(result.qid).toBe('Q123456');
    });
  });

  describe('service configuration', () => {
    it('should return service statistics', () => {
      const stats = service.getServiceStats();

      expect(stats.version).toBeDefined();
      expect(stats.maxProperties).toBe(10);
      expect(stats.maxQIDs).toBe(10);
      expect(stats.supportedDataTypes).toContain('string');
      expect(stats.supportedDataTypes).toContain('wikibase-entityid');
      expect(stats.features).toContain('Dynamic JSON templates');
    });

    it('should validate configuration', () => {
      const validation = service.validateConfiguration();

      expect(validation).toBeDefined();
      expect(Array.isArray(validation.errors)).toBe(true);
      expect(Array.isArray(validation.warnings)).toBe(true);
    });
  });
});

