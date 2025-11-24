/**
 * TDD Test: WikidataService - Wikibase Action API Integration
 * 
 * SPECIFICATION: Wikidata Service with Action API
 * 
 * As a system
 * I want to create and publish entities via WikidataService
 * So that businesses can be published to Wikidata
 * 
 * Acceptance Criteria:
 * 1. Creates entity from business and crawl data
 * 2. Publishes entity using Action API
 * 3. Returns QID after successful publication
 * 4. Handles errors during publication
 * 5. Validates data before publishing
 * 
 * TDD Cycle: RED → GREEN → REFACTOR
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WikidataService } from '../service';
import { BusinessTestFactory } from '@/lib/test-helpers/tdd-helpers';
import type { Business } from '@/lib/db/schema';

// Mock dependencies
const mockPublishEntity = vi.fn();
const mockFindExistingEntity = vi.fn();

vi.mock('../client', () => ({
  WikidataClient: vi.fn().mockImplementation(() => ({
    publishEntity: mockPublishEntity,
    findExistingEntity: mockFindExistingEntity,
  })),
}));

vi.mock('../template', () => ({
  EntityTemplate: {
    generateEntity: vi.fn(),
  },
}));

vi.mock('../processor', () => ({
  CrawlDataProcessor: {
    processCrawlData: vi.fn((business, data) => ({ business, data })),
    enhanceCrawlData: vi.fn((data) => data),
    validateCrawlData: vi.fn(() => ({ isValid: true, errors: [] })),
  },
}));

vi.mock('../property-manager', () => ({
  PropertyManager: {
    selectProperties: vi.fn(() => ({
      pids: [],
      qids: [],
      selection: {},
    })),
    validateSelection: vi.fn(() => ({ isValid: true, errors: [] })),
  },
}));

describe('WikidataService - Wikibase Action API Integration', () => {
  let service: WikidataService;

  beforeEach(async () => {
    vi.clearAllMocks();
    service = new WikidataService();
  });

  /**
   * SPECIFICATION 1: Creates entity from business and crawl data
   */
  it('creates entity from business and crawl data', async () => {
    // Arrange
    const business = BusinessTestFactory.createCrawled({
      id: 123,
      name: 'Test Business',
    });
    const crawlData = {
      name: 'Test Business',
      description: 'A test business',
    };

    const { EntityTemplate } = await import('../template');
    vi.mocked(EntityTemplate.generateEntity).mockResolvedValue({
      labels: { en: { value: 'Test Business' } },
      descriptions: { en: { value: 'A test business' } },
      claims: {},
    });

    mockPublishEntity.mockResolvedValue({
      success: true,
      qid: 'Q123456',
    });

    // Act
    const result = await service.createAndPublishEntity(business, crawlData, {
      target: 'test',
    });

    // Assert: Verify entity created (behavior: entity generated from data)
    expect(EntityTemplate.generateEntity).toHaveBeenCalled();
    expect(result.entity).toBeDefined();
    expect(result.result.qid).toBe('Q123456');
  });

  /**
   * SPECIFICATION 2: Publishes entity using Action API
   */
  it('publishes entity using Action API via client', async () => {
    // Arrange
    const business = BusinessTestFactory.createCrawled({ id: 123 });
    const crawlData = { name: 'Test' };

    const { EntityTemplate } = await import('../template');
    vi.mocked(EntityTemplate.generateEntity).mockResolvedValue({
      labels: { en: { value: 'Test' } },
      claims: {},
    });

    mockPublishEntity.mockResolvedValue({
      success: true,
      qid: 'Q123456',
    });

    // Act
    await service.createAndPublishEntity(business, crawlData, { target: 'test' });

    // Assert: Verify publishEntity called (behavior: Action API used)
    expect(mockPublishEntity).toHaveBeenCalled();
    const callArgs = mockPublishEntity.mock.calls[0];
    expect(callArgs[0]).toHaveProperty('labels');
    expect(callArgs[1]?.target).toBe('test');
  });

  /**
   * SPECIFICATION 3: Returns QID after successful publication
   */
  it('returns QID after successful publication', async () => {
    // Arrange
    const business = BusinessTestFactory.createCrawled({ id: 123 });
    const crawlData = { name: 'Test' };

    const { EntityTemplate } = await import('../template');
    vi.mocked(EntityTemplate.generateEntity).mockResolvedValue({
      labels: { en: { value: 'Test' } },
      claims: {},
    });

    mockPublishEntity.mockResolvedValue({
      success: true,
      qid: 'Q789012',
    });

    // Act
    const result = await service.createAndPublishEntity(business, crawlData, {
      target: 'test',
    });

    // Assert: Verify QID returned (behavior: publication successful)
    expect(result.result.success).toBe(true);
    expect(result.result.qid).toBe('Q789012');
  });

  /**
   * SPECIFICATION 4: Handles errors during publication
   */
  it('handles errors during publication gracefully', async () => {
    // Arrange
    const business = BusinessTestFactory.createCrawled({ id: 123 });
    const crawlData = { name: 'Test' };

    const { EntityTemplate } = await import('../template');
    vi.mocked(EntityTemplate.generateEntity).mockResolvedValue({
      labels: { en: { value: 'Test' } },
      claims: {},
    });

    mockPublishEntity.mockResolvedValue({
      success: false,
      error: 'API error occurred',
    });

    // Act
    const result = await service.createAndPublishEntity(business, crawlData, {
      target: 'test',
    });

    // Assert: Verify error handled (behavior: error returned, not thrown)
    expect(result.result.success).toBe(false);
    expect(result.result.error).toBeDefined();
  });

  /**
   * SPECIFICATION 5: Validates data before publishing
   */
  it('validates crawl data before publishing', async () => {
    // Arrange
    const business = BusinessTestFactory.createCrawled({ id: 123 });
    const crawlData = { name: 'Test' };

    const { CrawlDataProcessor } = await import('../processor');
    vi.mocked(CrawlDataProcessor.validateCrawlData).mockReturnValue({
      isValid: false,
      errors: ['Invalid data'],
    });

    // Act & Assert: Verify validation occurs (behavior: invalid data rejected)
    await expect(
      service.createAndPublishEntity(business, crawlData, { target: 'test' })
    ).rejects.toThrow();
  });
});

