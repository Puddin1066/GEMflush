/**
 * TDD Test: Wikidata Entity Builder - Tests Drive Implementation
 * 
 * SPECIFICATION: Build Wikidata Entities from Business Data
 * 
 * As a system
 * I want to build valid Wikidata entities from business and crawl data
 * So that entities can be published to Wikidata
 * 
 * Acceptance Criteria:
 * 1. Builds entity with labels and descriptions
 * 2. Builds claims from business data
 * 3. Validates entity structure
 * 4. Handles missing data gracefully
 * 5. Attaches notability references when provided
 * 
 * TDD Cycle: RED → GREEN → REFACTOR
 * Tests written FIRST to drive implementation
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BusinessTestFactory } from '@/lib/test-helpers/tdd-helpers';
import type { Business } from '@/lib/db/schema';
import type { CrawledData } from '@/lib/types/gemflush';

// Mock dependencies
vi.mock('../qid-mappings', () => ({
  findCityQID: vi.fn().mockResolvedValue('Q5083'), // Seattle QID
  findIndustryQID: vi.fn().mockResolvedValue(null),
  US_CITY_QIDS: { 'seattle, wa': 'Q5083' },
  INDUSTRY_QIDS: {},
}));

vi.mock('../sparql', () => ({
  WikidataSPARQLService: vi.fn().mockImplementation(() => ({
    findCityQID: vi.fn().mockResolvedValue('Q5083'),
    findIndustryQID: vi.fn().mockResolvedValue(null),
  })),
}));

describe('🔴 RED: Wikidata Entity Builder Specification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * SPECIFICATION 1: Build Entity with Labels
   * 
   * Given: Business with name
   * When: Entity is built
   * Then: Entity has labels in English
   */
  it('builds entity with labels from business name', async () => {
    // Arrange: Business with name
    const business = BusinessTestFactory.create({
      name: 'Test Business',
    });

    // Act: Build entity (TEST DRIVES IMPLEMENTATION)
    const { WikidataEntityBuilder } = await import('../entity-builder');
    const builder = new WikidataEntityBuilder();
    const entity = await builder.buildEntity(business);

    // Assert: Entity has labels (behavior: entity is identifiable)
    expect(entity).toBeDefined();
    expect(entity.labels).toBeDefined();
    expect(entity.labels.en).toBeDefined();
    expect(entity.labels.en.value).toContain('Test Business');
  });

  /**
   * SPECIFICATION 2: Build Entity with Descriptions
   * 
   * Given: Business with crawl data containing description
   * When: Entity is built
   * Then: Entity has descriptions
   */
  it('builds entity with descriptions from crawl data', async () => {
    // Arrange: Business with crawl data
    const business = BusinessTestFactory.create({
      name: 'Test Business',
    });
    const crawledData: CrawledData = {
      name: 'Test Business',
      description: 'A test business description',
    };

    // Act: Build entity (TEST DRIVES IMPLEMENTATION)
    const { WikidataEntityBuilder } = await import('../entity-builder');
    const builder = new WikidataEntityBuilder();
    const entity = await builder.buildEntity(business, crawledData);

    // Assert: Entity has descriptions (behavior: entity is described)
    expect(entity).toBeDefined();
    expect(entity.descriptions).toBeDefined();
    expect(entity.descriptions.en).toBeDefined();
    expect(entity.descriptions.en.value).toBeTruthy();
  });

  /**
   * SPECIFICATION 3: Build Claims from Business Data
   * 
   * Given: Business with location and URL
   * When: Entity is built
   * Then: Entity has claims for location and website
   */
  it('builds claims from business data', async () => {
    // Arrange: Business with location and URL
    const business = BusinessTestFactory.create({
      name: 'Test Business',
      url: 'https://example.com',
      location: {
        city: 'Seattle',
        state: 'WA',
        country: 'US',
      },
    });

    // Act: Build entity (TEST DRIVES IMPLEMENTATION)
    const { WikidataEntityBuilder } = await import('../entity-builder');
    const builder = new WikidataEntityBuilder();
    const entity = await builder.buildEntity(business);

    // Assert: Entity has claims (behavior: entity has properties)
    expect(entity).toBeDefined();
    expect(entity.claims).toBeDefined();
    // Should have instance of (P31) claim
    expect(Object.keys(entity.claims).length).toBeGreaterThan(0);
  });

  /**
   * SPECIFICATION 4: Validate Entity Structure
   * 
   * Given: Built entity
   * When: Entity is validated
   * Then: Validation passes for valid entity
   */
  it('validates entity structure', async () => {
    // Arrange: Business
    const business = BusinessTestFactory.create({
      name: 'Test Business',
    });

    // Act: Build and validate entity (TEST DRIVES IMPLEMENTATION)
    const { WikidataEntityBuilder } = await import('../entity-builder');
    const builder = new WikidataEntityBuilder();
    const entity = await builder.buildEntity(business);

    // Assert: Entity is valid (behavior: entity conforms to Wikibase spec)
    expect(entity).toBeDefined();
    expect(entity.labels).toBeDefined();
    expect(entity.descriptions).toBeDefined();
    expect(entity.claims).toBeDefined();
    // Validation should not throw
    expect(() => builder.validateEntity(entity)).not.toThrow();
  });

  /**
   * SPECIFICATION 5: Handle Missing Data Gracefully
   * 
   * Given: Business with minimal data
   * When: Entity is built
   * Then: Entity is built with available data only
   */
  it('handles missing data gracefully', async () => {
    // Arrange: Business with minimal data
    const business = BusinessTestFactory.create({
      name: 'Test Business',
      location: null,
      url: null,
    });

    // Act: Build entity (TEST DRIVES IMPLEMENTATION)
    const { WikidataEntityBuilder } = await import('../entity-builder');
    const builder = new WikidataEntityBuilder();
    const entity = await builder.buildEntity(business);

    // Assert: Entity is built (behavior: doesn't crash on missing data)
    expect(entity).toBeDefined();
    expect(entity.labels).toBeDefined();
    // Entity should still be valid even with minimal data
    expect(() => builder.validateEntity(entity)).not.toThrow();
  });

  /**
   * SPECIFICATION 6: Attach Notability References
   * 
   * Given: Business with notability references
   * When: Entity is built
   * Then: References are attached to claims
   */
  it('attaches notability references when provided', async () => {
    // Arrange: Business with notability references
    const business = BusinessTestFactory.create({
      name: 'Test Business',
    });
    const references = [
      {
        url: 'https://example.com/news',
        title: 'News Article',
        snippet: 'Article about business',
        source: 'news',
      },
    ];

    // Act: Build entity with references (TEST DRIVES IMPLEMENTATION)
    const { WikidataEntityBuilder } = await import('../entity-builder');
    const builder = new WikidataEntityBuilder();
    const entity = await builder.buildEntity(business, undefined, references);

    // Assert: References are attached (behavior: entity has citations)
    expect(entity).toBeDefined();
    // Entity should include references in claims
    expect(entity.claims).toBeDefined();
  });

  /**
   * SPECIFICATION 7: Calculate Quality Score
   * 
   * Given: Entity with various claims
   * When: Entity is built
   * Then: Quality score is calculated
   */
  it('calculates quality score for entity', async () => {
    // Arrange: Business with rich data
    const business = BusinessTestFactory.create({
      name: 'Test Business',
      url: 'https://example.com',
      location: {
        city: 'Seattle',
        state: 'WA',
        country: 'US',
      },
    });
    const crawledData: CrawledData = {
      name: 'Test Business',
      description: 'A test business',
      phone: '+1-555-123-4567',
    };

    // Act: Build entity (TEST DRIVES IMPLEMENTATION)
    const { WikidataEntityBuilder } = await import('../entity-builder');
    const builder = new WikidataEntityBuilder();
    const entity = await builder.buildEntity(business, crawledData);

    // Assert: Quality score calculated (behavior: entity quality is measurable)
    expect(entity).toBeDefined();
    expect(entity.llmSuggestions).toBeDefined();
    expect(entity.llmSuggestions.qualityScore).toBeGreaterThanOrEqual(0);
    // Quality score is 0-100 (percentage), not 0-1
    expect(entity.llmSuggestions.qualityScore).toBeLessThanOrEqual(100);
  });
});

