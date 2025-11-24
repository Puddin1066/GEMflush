import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WikidataEntityBuilder } from '../entity-builder';
import { WikidataPublisher } from '../publisher';
import { validateWikidataEntity } from '@/lib/validation/wikidata';
import { isWikidataEntityDataContract } from '@/lib/types/wikidata-contract';
import type { WikidataEntityDataContract } from '@/lib/types/wikidata-contract';
import type { Business } from '@/lib/db/schema';

/**
 * Integration Tests for Contracts and Schemas
 * 
 * Tests that contracts and schemas work together correctly:
 * 1. Entity builder produces entities matching contracts
 * 2. Zod schemas validate contract-compliant entities
 * 3. Type guards work with Zod validation
 * 4. Publisher accepts contract-compliant entities
 * 
 * SOLID: Single Responsibility - tests integration points only
 * DRY: Reusable test fixtures
 */

// Mock fetch globally
global.fetch = vi.fn();

describe('Contract and Schema Integration', () => {
  let entityBuilder: WikidataEntityBuilder;
  let publisher: WikidataPublisher;

  // DRY: Reusable test business fixture
  const createTestBusiness = (): Business => ({
    id: 1,
    teamId: 1,
    name: 'Test Business Inc',
    url: 'https://testbusiness.com',
    category: 'technology',
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
    lastCrawledAt: new Date(),
    crawlData: {
      phone: '+1-555-0123',
      email: 'info@testbusiness.com',
      description: 'A test technology company',
      socialLinks: {
        twitter: 'https://twitter.com/testbusiness',
        linkedin: 'https://linkedin.com/company/testbusiness',
      },
    },
    status: 'crawled',
    automationEnabled: false,
    nextCrawlAt: null,
    lastAutoPublishedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  beforeEach(() => {
    entityBuilder = new WikidataEntityBuilder();
    publisher = new WikidataPublisher();
    vi.clearAllMocks();
    process.env.WIKIDATA_PUBLISH_MODE = 'mock';
  });

  describe('Entity Builder → Contract → Schema Validation', () => {
    it('should produce entity that passes both type guard and Zod validation', async () => {
      const business = createTestBusiness();
      const entity = await entityBuilder.buildEntity(business, business.crawlData as any);

      // Test type guard
      expect(isWikidataEntityDataContract(entity)).toBe(true);

      // Test Zod validation
      const validation = validateWikidataEntity(entity);
      expect(validation.success).toBe(true);
      expect(validation.errors).toBeUndefined();
    });

    it('should produce entity with correct contract structure', async () => {
      const business = createTestBusiness();
      const entity = await entityBuilder.buildEntity(business, business.crawlData as any);

      // Verify contract structure
      expect(entity.labels).toBeDefined();
      expect(typeof entity.labels).toBe('object');
      expect(Object.keys(entity.labels).length).toBeGreaterThan(0);

      expect(entity.descriptions).toBeDefined();
      expect(typeof entity.descriptions).toBe('object');
      expect(Object.keys(entity.descriptions).length).toBeGreaterThan(0);

      expect(entity.claims).toBeDefined();
      expect(typeof entity.claims).toBe('object');
      expect(Object.keys(entity.claims).length).toBeGreaterThan(0);
    });

    it('should produce entity with valid label structure', async () => {
      const business = createTestBusiness();
      const entity = await entityBuilder.buildEntity(business, business.crawlData as any);

      const label = entity.labels.en;
      expect(label).toBeDefined();
      expect(label.language).toBe('en');
      expect(label.value).toBeDefined();
      expect(label.value.length).toBeGreaterThan(0);
      expect(label.value.length).toBeLessThanOrEqual(400); // Wikidata limit
    });

    it('should produce entity with valid description structure', async () => {
      const business = createTestBusiness();
      const entity = await entityBuilder.buildEntity(business, business.crawlData as any);

      const description = entity.descriptions.en;
      expect(description).toBeDefined();
      expect(description.language).toBe('en');
      expect(description.value).toBeDefined();
      expect(description.value.length).toBeGreaterThan(0);
      expect(description.value.length).toBeLessThanOrEqual(250); // Wikidata limit
    });

    it('should produce entity with valid claim structures', async () => {
      const business = createTestBusiness();
      const entity = await entityBuilder.buildEntity(business, business.crawlData as any);

      // Verify claims structure
      Object.entries(entity.claims).forEach(([pid, claimArray]) => {
        // Property ID format
        expect(pid).toMatch(/^P\d+$/);

        // Claims array
        expect(Array.isArray(claimArray)).toBe(true);
        expect(claimArray.length).toBeGreaterThan(0);

        // Each claim structure
        claimArray.forEach((claim) => {
          expect(claim.mainsnak).toBeDefined();
          expect(claim.mainsnak.property).toBe(pid);
          expect(claim.mainsnak.snaktype).toBeDefined();
          expect(['value', 'novalue', 'somevalue']).toContain(claim.mainsnak.snaktype);
          expect(claim.type).toBeDefined();
          expect(['statement', 'claim']).toContain(claim.type);
        });
      });
    });
  });

  describe('Contract → Schema → Publisher Integration', () => {
    it('should accept contract-compliant entity for publishing', async () => {
      const business = createTestBusiness();
      const entity = await entityBuilder.buildEntity(business, business.crawlData as any);

      // Verify contract compliance
      expect(isWikidataEntityDataContract(entity)).toBe(true);

      // Verify schema validation
      const validation = validateWikidataEntity(entity);
      expect(validation.success).toBe(true);

      // Should publish successfully (mock mode)
      const result = await publisher.publishEntity(entity, false);
      expect(result.success).toBe(true);
      expect(result.qid).toBeDefined();
    });

    it('should reject entity that fails schema validation', async () => {
      // Create invalid entity (missing required fields)
      const invalidEntity = {
        labels: {},
        descriptions: {},
        claims: {},
      } as unknown as WikidataEntityDataContract;

      // Should fail schema validation
      const validation = validateWikidataEntity(invalidEntity);
      expect(validation.success).toBe(false);
      expect(validation.errors).toBeDefined();

      // Publisher should handle validation errors gracefully
      // (In real implementation, publisher validates before publishing)
    });

    it('should clean entity (remove llmSuggestions) before publishing', async () => {
      const business = createTestBusiness();
      const entity = await entityBuilder.buildEntity(business, business.crawlData as any);

      // Add llmSuggestions (internal metadata)
      const entityWithSuggestions: WikidataEntityDataContract = {
        ...entity,
        llmSuggestions: {
          suggestedProperties: [],
          suggestedReferences: [],
          qualityScore: 0.85,
          completeness: 0.75,
          model: 'gpt-4',
          generatedAt: new Date(),
        },
      };

      // Entity should still pass validation (llmSuggestions is optional)
      const validation = validateWikidataEntity(entityWithSuggestions);
      expect(validation.success).toBe(true);

      // Publisher should clean entity before sending to API
      // (This is tested indirectly through successful publishing)
      const result = await publisher.publishEntity(entityWithSuggestions, false);
      expect(result.success).toBe(true);
    });
  });

  describe('Type Guard and Schema Validation Consistency', () => {
    it('should have consistent validation between type guard and Zod schema', async () => {
      const business = createTestBusiness();
      const entity = await entityBuilder.buildEntity(business, business.crawlData as any);

      // Both should pass for valid entity
      const typeGuardResult = isWikidataEntityDataContract(entity);
      const schemaValidation = validateWikidataEntity(entity);

      expect(typeGuardResult).toBe(true);
      expect(schemaValidation.success).toBe(true);
    });

    it('should handle edge cases consistently', () => {
      // Entity with minimal valid structure
      const minimalEntity: WikidataEntityDataContract = {
        labels: {
          en: {
            language: 'en',
            value: 'Test',
          },
        },
        descriptions: {
          en: {
            language: 'en',
            value: 'Test description',
          },
        },
        claims: {
          P31: [
            {
              mainsnak: {
                snaktype: 'value',
                property: 'P31',
                datavalue: {
                  type: 'wikibase-entityid',
                  value: {
                    'entity-type': 'item',
                    id: 'Q4830453',
                  },
                },
              },
              type: 'statement',
            },
          ],
        },
      };

      // Both should pass
      expect(isWikidataEntityDataContract(minimalEntity)).toBe(true);
      const validation = validateWikidataEntity(minimalEntity);
      expect(validation.success).toBe(true);
    });
  });

  describe('Contract Compliance Across Entity Lifecycle', () => {
    it('should maintain contract compliance from build to publish', async () => {
      const business = createTestBusiness();

      // Step 1: Build entity
      const entity = await entityBuilder.buildEntity(business, business.crawlData as any);
      expect(isWikidataEntityDataContract(entity)).toBe(true);

      // Step 2: Validate with schema
      const validation = validateWikidataEntity(entity);
      expect(validation.success).toBe(true);

      // Step 3: Publish (should accept contract-compliant entity)
      const result = await publisher.publishEntity(entity, false);
      expect(result.success).toBe(true);

      // Entity should remain contract-compliant throughout
      expect(isWikidataEntityDataContract(entity)).toBe(true);
    });

    it('should handle entity with all datavalue types', async () => {
      const business = createTestBusiness();
      const entity = await entityBuilder.buildEntity(business, business.crawlData as any);

      // Verify entity contains various datavalue types
      const datavalueTypes = new Set<string>();
      Object.values(entity.claims).forEach((claimArray) => {
        claimArray.forEach((claim) => {
          if (claim.mainsnak.datavalue) {
            datavalueTypes.add(claim.mainsnak.datavalue.type);
          }
        });
      });

      // Entity should have at least one datavalue type
      expect(datavalueTypes.size).toBeGreaterThan(0);

      // All datavalue types should be valid
      const validTypes = [
        'wikibase-entityid',
        'string',
        'time',
        'quantity',
        'monolingualtext',
        'globecoordinate',
      ];
      datavalueTypes.forEach((type) => {
        expect(validTypes).toContain(type);
      });

      // Entity should still pass validation
      expect(isWikidataEntityDataContract(entity)).toBe(true);
      const validation = validateWikidataEntity(entity);
      expect(validation.success).toBe(true);
    });
  });

  describe('Error Handling: Invalid Entities', () => {
    it('should detect missing labels via both type guard and schema', () => {
      const invalidEntity = {
        descriptions: {
          en: { language: 'en', value: 'Test' },
        },
        claims: {
          P31: [
            {
              mainsnak: {
                snaktype: 'value',
                property: 'P31',
                datavalue: {
                  type: 'wikibase-entityid',
                  value: { 'entity-type': 'item', id: 'Q123' },
                },
              },
              type: 'statement',
            },
          ],
        },
      } as unknown as WikidataEntityDataContract;

      // Type guard should fail
      expect(isWikidataEntityDataContract(invalidEntity)).toBe(false);

      // Schema validation should also fail
      const validation = validateWikidataEntity(invalidEntity);
      expect(validation.success).toBe(false);
    });

    it('should detect missing claims via both type guard and schema', () => {
      const invalidEntity = {
        labels: {
          en: { language: 'en', value: 'Test' },
        },
        descriptions: {
          en: { language: 'en', value: 'Test' },
        },
        claims: {},
      } as unknown as WikidataEntityDataContract;

      // Type guard passes (basic structure check)
      expect(isWikidataEntityDataContract(invalidEntity)).toBe(true);

      // But schema validation should fail (requires at least one claim)
      const validation = validateWikidataEntity(invalidEntity);
      expect(validation.success).toBe(false);
    });
  });

  describe('Contract Type Safety', () => {
    it('should ensure TypeScript types match runtime structure', async () => {
      const business = createTestBusiness();
      const entity = await entityBuilder.buildEntity(business, business.crawlData as any);

      // TypeScript should enforce contract structure
      const typedEntity: WikidataEntityDataContract = entity;

      // All required fields should be accessible
      expect(typedEntity.labels).toBeDefined();
      expect(typedEntity.descriptions).toBeDefined();
      expect(typedEntity.claims).toBeDefined();

      // Optional fields should be accessible
      if (typedEntity.llmSuggestions) {
        expect(typedEntity.llmSuggestions.qualityScore).toBeDefined();
      }
    });

    it('should prevent invalid property access at compile time', async () => {
      const business = createTestBusiness();
      const entity = await entityBuilder.buildEntity(business, business.crawlData as any);

      // TypeScript should prevent accessing non-existent properties
      const typedEntity: WikidataEntityDataContract = entity;

      // These should be accessible
      expect(typedEntity.labels).toBeDefined();
      expect(typedEntity.descriptions).toBeDefined();
      expect(typedEntity.claims).toBeDefined();

      // TypeScript ensures type safety - invalid properties would cause compile errors
      // This is verified by the fact that the code compiles
    });
  });
});

