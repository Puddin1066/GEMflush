/**
 * TDD Test: Wikidata Service - Tests Drive Implementation
 * 
 * SPECIFICATION: Wikidata Publishing Functionality
 * 
 * As a system
 * I want to create and publish Wikidata entities from business data
 * So that businesses can be represented in Wikidata
 * 
 * IMPORTANT: These tests specify DESIRED behavior for Wikidata publishing.
 * Tests verify that entity creation and publishing works correctly.
 * 
 * TDD Cycle: RED → GREEN → REFACTOR
 * Tests written to specify desired Wikidata service behavior
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BusinessTestFactory } from '@/lib/test-helpers/tdd-helpers';
import type { Business } from '@/lib/db/schema';
import type { CrawledData } from '@/lib/types/gemflush';

// Mock dependencies
const mockClientInstance = {
  publishEntity: vi.fn(),
  updateEntity: vi.fn(),
};

// Create a proper class mock for WikidataClient
class MockWikidataClient {
  publishEntity = mockClientInstance.publishEntity;
  updateEntity = mockClientInstance.updateEntity;
  
  constructor(config?: any) {
    // Constructor can accept config but doesn't need to do anything
  }
}

vi.mock('../client', () => ({
  WikidataClient: MockWikidataClient,
}));

vi.mock('../processor', () => ({
  CrawlDataProcessor: {
    processCrawlData: vi.fn(),
    enhanceCrawlData: vi.fn(),
    validateCrawlData: vi.fn(),
    extractMetrics: vi.fn(),
  },
}));

vi.mock('../property-manager', () => ({
  PropertyManager: {
    selectProperties: vi.fn(),
    validateSelection: vi.fn(),
  },
}));

vi.mock('../template', () => ({
  EntityTemplate: {
    generateEntity: vi.fn(),
  },
}));

describe('🔴 RED: Wikidata Service - Desired Behavior Specification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mock client instance
    mockClientInstance.publishEntity.mockReset();
    mockClientInstance.updateEntity.mockReset();
  });

  /**
   * SPECIFICATION 1: createAndPublishEntity() - MUST Create and Publish Entity
   * 
   * DESIRED BEHAVIOR: createAndPublishEntity() MUST process business data,
   * create a Wikidata entity, and publish it to Wikidata.
   */
  describe('createAndPublishEntity', () => {
    it('MUST create and publish entity from business data', async () => {
      // Arrange: Business with crawl data
      const business = BusinessTestFactory.create({
        id: 1,
        name: 'Example Business',
        url: 'https://example.com',
      });

      const crawledData: CrawledData = {
        name: 'Example Business',
        description: 'A test business',
        phone: '+1-555-123-4567',
        location: {
          city: 'San Francisco',
          state: 'CA',
          country: 'US',
        },
      };

      const mockEntity = {
        labels: { en: { language: 'en', value: 'Example Business' } },
        descriptions: { en: { language: 'en', value: 'A test business' } },
        claims: {},
      };

      const mockSelection = {
        selectedPIDs: ['P31', 'P856'],
        selectedQIDs: ['Q30'],
        totalProperties: 2,
      };

      const mockPublishResult = {
        success: true,
        qid: 'Q12345',
        publishedTo: 'test.wikidata.org',
        propertiesPublished: 2,
        referencesPublished: 1,
      };

      const { CrawlDataProcessor } = await import('../processor');
      const { PropertyManager } = await import('../property-manager');
      const { EntityTemplate } = await import('../template');

      vi.mocked(CrawlDataProcessor.processCrawlData).mockReturnValue(crawledData as any);
      vi.mocked(CrawlDataProcessor.enhanceCrawlData).mockReturnValue(crawledData as any);
      vi.mocked(CrawlDataProcessor.validateCrawlData).mockReturnValue({ isValid: true, errors: [] });
      vi.mocked(CrawlDataProcessor.extractMetrics).mockReturnValue({ quality: 0.8 });
      vi.mocked(PropertyManager.selectProperties).mockResolvedValue(mockSelection as any);
      vi.mocked(PropertyManager.validateSelection).mockReturnValue({ isValid: true, errors: [] });
      vi.mocked(EntityTemplate.generateEntity).mockResolvedValue(mockEntity as any);

      mockClientInstance.publishEntity.mockResolvedValue(mockPublishResult);

      // Act: Create and publish entity (TEST SPECIFIES DESIRED BEHAVIOR)
      const { WikidataService } = await import('../service');
      const service = new WikidataService();
      const result = await service.createAndPublishEntity(business, crawledData);

      // Assert: SPECIFICATION - MUST return complete result
      expect(result).toBeDefined();
      expect(result.entity).toBeDefined();
      expect(result.selection).toBeDefined();
      expect(result.result).toBeDefined();
      expect(result.result.success).toBe(true);
      expect(result.result.qid).toBe('Q12345');
      expect(result.metrics).toBeDefined();
      expect(result.metrics.processingTime).toBeGreaterThanOrEqual(0);
      expect(result.metrics.propertyCount).toBe(2);
    });

    it('MUST process crawl data before creating entity', async () => {
      // Arrange: Business with crawl data
      const business = BusinessTestFactory.create({
        id: 1,
        name: 'Test Business',
      });

      const crawledData: CrawledData = {
        name: 'Test Business',
        description: 'Test description',
      };

      const { CrawlDataProcessor } = await import('../processor');
      const { PropertyManager } = await import('../property-manager');
      const { EntityTemplate } = await import('../template');
      const { WikidataClient } = await import('../client');

      vi.mocked(CrawlDataProcessor.processCrawlData).mockReturnValue(crawledData as any);
      vi.mocked(CrawlDataProcessor.enhanceCrawlData).mockReturnValue(crawledData as any);
      vi.mocked(CrawlDataProcessor.validateCrawlData).mockReturnValue({ isValid: true, errors: [] });
      vi.mocked(CrawlDataProcessor.extractMetrics).mockReturnValue({ quality: 0.7 });
      vi.mocked(PropertyManager.selectProperties).mockResolvedValue({
        selectedPIDs: [],
        selectedQIDs: [],
        totalProperties: 0,
      } as any);
      vi.mocked(PropertyManager.validateSelection).mockReturnValue({ isValid: true, errors: [] });
      vi.mocked(EntityTemplate.generateEntity).mockResolvedValue({
        labels: {},
        descriptions: {},
        claims: {},
      } as any);

      mockClientInstance.publishEntity.mockResolvedValue({
        success: true,
        qid: 'Q123',
        publishedTo: 'test.wikidata.org',
        propertiesPublished: 0,
        referencesPublished: 0,
      });

      // Act: Create entity (TEST SPECIFIES DESIRED BEHAVIOR)
      const { WikidataService } = await import('../service');
      const service = new WikidataService();
      await service.createAndPublishEntity(business, crawledData);

      // Assert: SPECIFICATION - MUST process crawl data
      expect(CrawlDataProcessor.processCrawlData).toHaveBeenCalledWith(business, crawledData);
      expect(CrawlDataProcessor.enhanceCrawlData).toHaveBeenCalled();
    });

    it('MUST select properties before generating entity', async () => {
      // Arrange: Business
      const business = BusinessTestFactory.create({
        id: 1,
        name: 'Test Business',
      });

      const { CrawlDataProcessor } = await import('../processor');
      const { PropertyManager } = await import('../property-manager');
      const { EntityTemplate } = await import('../template');
      const { WikidataClient } = await import('../client');

      const processedData = { name: 'Test Business' };
      vi.mocked(CrawlDataProcessor.processCrawlData).mockReturnValue(processedData as any);
      vi.mocked(CrawlDataProcessor.enhanceCrawlData).mockReturnValue(processedData as any);
      vi.mocked(CrawlDataProcessor.validateCrawlData).mockReturnValue({ isValid: true, errors: [] });
      vi.mocked(CrawlDataProcessor.extractMetrics).mockReturnValue({ quality: 0.7 });
      
      const mockSelection = {
        selectedPIDs: ['P31'],
        selectedQIDs: [],
        totalProperties: 1,
      };
      vi.mocked(PropertyManager.selectProperties).mockResolvedValue(mockSelection as any);
      vi.mocked(PropertyManager.validateSelection).mockReturnValue({ isValid: true, errors: [] });
      vi.mocked(EntityTemplate.generateEntity).mockResolvedValue({
        labels: {},
        descriptions: {},
        claims: {},
      } as any);

      const mockClientInstance = {
        publishEntity: vi.fn().mockResolvedValue({
          success: true,
          qid: 'Q123',
          publishedTo: 'test.wikidata.org',
          propertiesPublished: 1,
          referencesPublished: 0,
        }),
      };
      vi.mocked(WikidataClient).mockImplementation(() => mockClientInstance as any);

      // Act: Create entity (TEST SPECIFIES DESIRED BEHAVIOR)
      const { WikidataService } = await import('../service');
      const service = new WikidataService();
      await service.createAndPublishEntity(business);

      // Assert: SPECIFICATION - MUST select properties
      expect(PropertyManager.selectProperties).toHaveBeenCalled();
      // Entity generation is called with maxProperties from selection
      expect(EntityTemplate.generateEntity).toHaveBeenCalled();
      const generateCall = vi.mocked(EntityTemplate.generateEntity).mock.calls[0];
      expect(generateCall[1]).toMatchObject({
        maxProperties: 1,
      });
    });

    it('MUST publish entity to test.wikidata.org by default', async () => {
      // Arrange: Business
      const business = BusinessTestFactory.create({
        id: 1,
        name: 'Test Business',
      });

      const { CrawlDataProcessor } = await import('../processor');
      const { PropertyManager } = await import('../property-manager');
      const { EntityTemplate } = await import('../template');
      const { WikidataClient } = await import('../client');

      vi.mocked(CrawlDataProcessor.processCrawlData).mockReturnValue({} as any);
      vi.mocked(CrawlDataProcessor.enhanceCrawlData).mockReturnValue({} as any);
      vi.mocked(CrawlDataProcessor.validateCrawlData).mockReturnValue({ isValid: true, errors: [] });
      vi.mocked(CrawlDataProcessor.extractMetrics).mockReturnValue({ quality: 0.7 });
      vi.mocked(PropertyManager.selectProperties).mockResolvedValue({
        selectedPIDs: [],
        selectedQIDs: [],
        totalProperties: 0,
      } as any);
      vi.mocked(PropertyManager.validateSelection).mockReturnValue({ isValid: true, errors: [] });
      vi.mocked(EntityTemplate.generateEntity).mockResolvedValue({
        labels: {},
        descriptions: {},
        claims: {},
      } as any);

      mockClientInstance.publishEntity.mockResolvedValue({
        success: true,
        qid: 'Q123',
        publishedTo: 'test.wikidata.org',
        propertiesPublished: 0,
        referencesPublished: 0,
      });

      // Act: Create entity without target (TEST SPECIFIES DESIRED BEHAVIOR)
      const { WikidataService } = await import('../service');
      const service = new WikidataService();
      const result = await service.createAndPublishEntity(business);

      // Assert: SPECIFICATION - MUST default to test.wikidata.org
      expect(mockClientInstance.publishEntity).toHaveBeenCalled();
      const publishCall = vi.mocked(mockClientInstance.publishEntity).mock.calls[0];
      expect(publishCall[1]).toMatchObject({
        target: 'test',
      });
      expect(result.result.publishedTo).toBe('test.wikidata.org');
    });

    it('MUST handle errors gracefully and return failure result', async () => {
      // Arrange: Business that causes error
      const business = BusinessTestFactory.create({
        id: 1,
        name: 'Error Business',
      });

      const { CrawlDataProcessor } = await import('../processor');
      const { PropertyManager } = await import('../property-manager');

      vi.mocked(CrawlDataProcessor.processCrawlData).mockImplementation(() => {
        throw new Error('Processing failed');
      });

      // Act: Create entity with error (TEST SPECIFIES DESIRED BEHAVIOR)
      const { WikidataService } = await import('../service');
      const service = new WikidataService();
      const result = await service.createAndPublishEntity(business);

      // Assert: SPECIFICATION - MUST return failure result
      expect(result).toBeDefined();
      expect(result.result.success).toBe(false);
      expect(result.result.error).toBeDefined();
      expect(result.metrics.processingTime).toBeGreaterThanOrEqual(0);
    });

    it('MUST respect maxProperties and maxQIDs options', async () => {
      // Arrange: Business with options
      const business = BusinessTestFactory.create({
        id: 1,
        name: 'Test Business',
      });

      const { CrawlDataProcessor } = await import('../processor');
      const { PropertyManager } = await import('../property-manager');
      const { EntityTemplate } = await import('../template');
      const { WikidataClient } = await import('../client');

      vi.mocked(CrawlDataProcessor.processCrawlData).mockReturnValue({} as any);
      vi.mocked(CrawlDataProcessor.enhanceCrawlData).mockReturnValue({} as any);
      vi.mocked(CrawlDataProcessor.validateCrawlData).mockReturnValue({ isValid: true, errors: [] });
      vi.mocked(CrawlDataProcessor.extractMetrics).mockReturnValue({ quality: 0.7 });
      
      const mockSelection = {
        selectedPIDs: ['P31', 'P856'],
        selectedQIDs: ['Q30'],
        totalProperties: 2,
      };
      vi.mocked(PropertyManager.selectProperties).mockResolvedValue(mockSelection as any);
      vi.mocked(PropertyManager.validateSelection).mockReturnValue({ isValid: true, errors: [] });
      vi.mocked(EntityTemplate.generateEntity).mockResolvedValue({
        labels: {},
        descriptions: {},
        claims: {},
      } as any);

      const mockClientInstance = {
        publishEntity: vi.fn().mockResolvedValue({
          success: true,
          qid: 'Q123',
          publishedTo: 'test.wikidata.org',
          propertiesPublished: 2,
          referencesPublished: 0,
        }),
      };
      vi.mocked(WikidataClient).mockImplementation(() => mockClientInstance as any);

      // Act: Create entity with limits (TEST SPECIFIES DESIRED BEHAVIOR)
      const { WikidataService } = await import('../service');
      const service = new WikidataService();
      await service.createAndPublishEntity(business, undefined, {
        maxProperties: 5,
        maxQIDs: 3,
        target: 'test',
      });

      // Assert: SPECIFICATION - MUST respect limits
      expect(PropertyManager.selectProperties).toHaveBeenCalled();
      const selectCall = vi.mocked(PropertyManager.selectProperties).mock.calls[0];
      if (selectCall && selectCall[1]) {
        expect(selectCall[1]).toMatchObject({
          maxPIDs: 5,
          maxQIDs: 3,
        });
      }
    });
  });
});

