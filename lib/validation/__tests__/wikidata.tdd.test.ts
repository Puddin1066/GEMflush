/**
 * TDD Test: Wikidata Validation - Tests Drive Implementation
 * 
 * SPECIFICATION: Wikidata Validation Schemas
 * 
 * As a system
 * I want Wikidata entity data validated before publishing
 * So that invalid entities don't cause API errors
 * 
 * IMPORTANT: These tests specify DESIRED behavior for Wikidata validation.
 * Tests verify that validation works correctly for Wikidata entities.
 * 
 * TDD Cycle: RED → GREEN → REFACTOR
 * Tests written to specify desired validation behavior
 */

import { describe, it, expect } from 'vitest';
import {
  wikidataEntityDataSchema,
  validateWikidataEntity,
  assertWikidataEntity,
  validateStoredEntityMetadata,
  wikidataLabelSchema,
  wikidataDescriptionSchema,
  wikidataClaimSchema,
  wikidataReferenceSchema,
  notabilityAssessmentSchema,
  storedEntityMetadataSchema,
} from '../wikidata';

describe('🔴 RED: Wikidata Validation - Desired Behavior Specification', () => {
  /**
   * SPECIFICATION 1: wikidataLabelSchema - MUST Validate Labels
   * 
   * DESIRED BEHAVIOR: wikidataLabelSchema() MUST validate label structure
   * with language code and value (max 400 chars).
   */
  describe('wikidataLabelSchema', () => {
    it('MUST accept valid label', () => {
      // Arrange: Valid label
      const label = {
        language: 'en',
        value: 'Test Business',
      };

      // Act: Validate (TEST SPECIFIES DESIRED BEHAVIOR)
      const result = wikidataLabelSchema.safeParse(label);

      // Assert: SPECIFICATION - MUST accept valid label
      expect(result.success).toBe(true);
    });

    it('MUST reject label exceeding 400 characters', () => {
      // Arrange: Label too long
      const label = {
        language: 'en',
        value: 'A'.repeat(401), // Exceeds 400 char limit
      };

      // Act: Validate (TEST SPECIFIES DESIRED BEHAVIOR)
      const result = wikidataLabelSchema.safeParse(label);

      // Assert: SPECIFICATION - MUST reject long labels
      expect(result.success).toBe(false);
    });

    it('MUST reject empty label value', () => {
      // Arrange: Empty label
      const label = {
        language: 'en',
        value: '',
      };

      // Act: Validate (TEST SPECIFIES DESIRED BEHAVIOR)
      const result = wikidataLabelSchema.safeParse(label);

      // Assert: SPECIFICATION - MUST reject empty value
      expect(result.success).toBe(false);
    });
  });

  /**
   * SPECIFICATION 2: wikidataDescriptionSchema - MUST Validate Descriptions
   * 
   * DESIRED BEHAVIOR: wikidataDescriptionSchema() MUST validate description
   * structure with language code and value (max 250 chars).
   */
  describe('wikidataDescriptionSchema', () => {
    it('MUST accept valid description', () => {
      // Arrange: Valid description
      const description = {
        language: 'en',
        value: 'A test business',
      };

      // Act: Validate (TEST SPECIFIES DESIRED BEHAVIOR)
      const result = wikidataDescriptionSchema.safeParse(description);

      // Assert: SPECIFICATION - MUST accept valid description
      expect(result.success).toBe(true);
    });

    it('MUST reject description exceeding 250 characters', () => {
      // Arrange: Description too long
      const description = {
        language: 'en',
        value: 'A'.repeat(251), // Exceeds 250 char limit
      };

      // Act: Validate (TEST SPECIFIES DESIRED BEHAVIOR)
      const result = wikidataDescriptionSchema.safeParse(description);

      // Assert: SPECIFICATION - MUST reject long descriptions
      expect(result.success).toBe(false);
    });
  });

  /**
   * SPECIFICATION 3: wikidataClaimSchema - MUST Validate Claims
   * 
   * DESIRED BEHAVIOR: wikidataClaimSchema() MUST validate claim structure
   * with mainsnak, type, and optional references.
   */
  describe('wikidataClaimSchema', () => {
    it('MUST accept valid claim', () => {
      // Arrange: Valid claim
      const claim = {
        mainsnak: {
          snaktype: 'value',
          property: 'P31',
          datavalue: {
            type: 'wikibase-entityid',
            value: { id: 'Q4835513' },
          },
        },
        type: 'statement',
        rank: 'normal',
      };

      // Act: Validate (TEST SPECIFIES DESIRED BEHAVIOR)
      const result = wikidataClaimSchema.safeParse(claim);

      // Assert: SPECIFICATION - MUST accept valid claim
      expect(result.success).toBe(true);
    });

    it('MUST validate property ID format (P####)', () => {
      // Arrange: Invalid property ID
      const claim = {
        mainsnak: {
          snaktype: 'value',
          property: 'INVALID', // Not P#### format
          datavalue: {
            type: 'string',
            value: 'test',
          },
        },
        type: 'statement',
      };

      // Act: Validate (TEST SPECIFIES DESIRED BEHAVIOR)
      const result = wikidataClaimSchema.safeParse(claim);

      // Assert: SPECIFICATION - MUST reject invalid property format
      expect(result.success).toBe(false);
    });

    it('MUST accept claims with references', () => {
      // Arrange: Claim with reference
      // Real Wikidata reference structure uses:
      // - P854: reference URL (string type, not url type)
      // - P813: retrieved date (time type)
      // - P1476: title (monolingualtext type, optional)
      const claim = {
        mainsnak: {
          snaktype: 'value',
          property: 'P856',
          datavalue: {
            type: 'string', // URL is stored as string type in Wikidata
            value: 'https://example.com',
          },
        },
        type: 'statement',
        references: [{
          snaks: {
            'P854': [{ // Reference URL property (real Wikidata PID)
              snaktype: 'value',
              property: 'P854',
              datavalue: {
                type: 'string', // URLs are string type in Wikidata, not 'url'
                value: 'https://reference.com',
              },
            }],
            'P813': [{ // Retrieved date property (real Wikidata PID)
              snaktype: 'value',
              property: 'P813',
              datavalue: {
                type: 'time',
                value: {
                  time: '+2024-01-01T00:00:00Z',
                  precision: 11,
                  timezone: 0,
                  before: 0,
                  after: 0,
                  calendarmodel: 'http://www.wikidata.org/entity/Q1985727',
                },
              },
            }],
          },
        }],
      };

      // Act: Validate (TEST SPECIFIES DESIRED BEHAVIOR)
      const result = wikidataClaimSchema.safeParse(claim);

      // Assert: SPECIFICATION - MUST accept claims with references
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.references).toBeDefined();
        expect(result.data.references?.length).toBe(1);
        expect(result.data.references?.[0].snaks['P854']).toBeDefined();
        expect(result.data.references?.[0].snaks['P813']).toBeDefined();
      }
    });
  });

  /**
   * SPECIFICATION 4: wikidataEntityDataSchema - MUST Validate Complete Entity
   * 
   * DESIRED BEHAVIOR: wikidataEntityDataSchema() MUST validate complete
   * entity structure with labels, descriptions, and claims.
   */
  describe('wikidataEntityDataSchema', () => {
    it('MUST accept valid entity data', () => {
      // Arrange: Valid entity
      const entity = {
        labels: {
          en: { language: 'en', value: 'Test Business' },
        },
        descriptions: {
          en: { language: 'en', value: 'A test business' },
        },
        claims: {
          P31: [{
            mainsnak: {
              snaktype: 'value',
              property: 'P31',
              datavalue: {
                type: 'wikibase-entityid',
                value: { id: 'Q4835513' },
              },
            },
            type: 'statement',
          }],
        },
      };

      // Act: Validate (TEST SPECIFIES DESIRED BEHAVIOR)
      const result = wikidataEntityDataSchema.safeParse(entity);

      // Assert: SPECIFICATION - MUST accept valid entity
      expect(result.success).toBe(true);
    });

    it('MUST reject entity without labels', () => {
      // Arrange: Entity without labels
      const entity = {
        labels: {},
        descriptions: {
          en: { language: 'en', value: 'A test business' },
        },
        claims: {
          P31: [{
            mainsnak: {
              snaktype: 'value',
              property: 'P31',
              datavalue: {
                type: 'wikibase-entityid',
                value: { id: 'Q4835513' },
              },
            },
            type: 'statement',
          }],
        },
      };

      // Act: Validate (TEST SPECIFIES DESIRED BEHAVIOR)
      const result = wikidataEntityDataSchema.safeParse(entity);

      // Assert: SPECIFICATION - MUST reject entity without labels
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors.some(e => e.message.includes('label'))).toBe(true);
      }
    });

    it('MUST reject entity without claims', () => {
      // Arrange: Entity without claims
      const entity = {
        labels: {
          en: { language: 'en', value: 'Test Business' },
        },
        descriptions: {
          en: { language: 'en', value: 'A test business' },
        },
        claims: {},
      };

      // Act: Validate (TEST SPECIFIES DESIRED BEHAVIOR)
      const result = wikidataEntityDataSchema.safeParse(entity);

      // Assert: SPECIFICATION - MUST reject entity without claims
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors.some(e => e.message.includes('claim'))).toBe(true);
      }
    });

    it('MUST validate property IDs in claims keys', () => {
      // Arrange: Entity with invalid property ID in claims
      const entity = {
        labels: {
          en: { language: 'en', value: 'Test Business' },
        },
        descriptions: {
          en: { language: 'en', value: 'A test business' },
        },
        claims: {
          INVALID: [{ // Invalid property ID
            mainsnak: {
              snaktype: 'value',
              property: 'P31',
              datavalue: {
                type: 'wikibase-entityid',
                value: { id: 'Q4835513' },
              },
            },
            type: 'statement',
          }],
        },
      };

      // Act: Validate (TEST SPECIFIES DESIRED BEHAVIOR)
      const result = wikidataEntityDataSchema.safeParse(entity);

      // Assert: SPECIFICATION - MUST reject invalid property IDs
      expect(result.success).toBe(false);
    });

    it('MUST accept entity with llmSuggestions metadata', () => {
      // Arrange: Entity with llmSuggestions
      const entity = {
        labels: {
          en: { language: 'en', value: 'Test Business' },
        },
        descriptions: {
          en: { language: 'en', value: 'A test business' },
        },
        claims: {
          P31: [{
            mainsnak: {
              snaktype: 'value',
              property: 'P31',
              datavalue: {
                type: 'wikibase-entityid',
                value: { id: 'Q4835513' },
              },
            },
            type: 'statement',
          }],
        },
        llmSuggestions: {
          suggestedProperties: ['P856'],
          qualityScore: 0.9,
        },
      };

      // Act: Validate (TEST SPECIFIES DESIRED BEHAVIOR)
      const result = wikidataEntityDataSchema.safeParse(entity);

      // Assert: SPECIFICATION - MUST accept llmSuggestions
      expect(result.success).toBe(true);
    });
  });

  /**
   * SPECIFICATION 5: validateWikidataEntity - MUST Return Validation Result
   * 
   * DESIRED BEHAVIOR: validateWikidataEntity() MUST return success flag and errors.
   */
  describe('validateWikidataEntity', () => {
    it('MUST return success true for valid entity', () => {
      // Arrange: Valid entity
      const entity = {
        labels: {
          en: { language: 'en', value: 'Test Business' },
        },
        descriptions: {
          en: { language: 'en', value: 'A test business' },
        },
        claims: {
          P31: [{
            mainsnak: {
              snaktype: 'value',
              property: 'P31',
              datavalue: {
                type: 'wikibase-entityid',
                value: { id: 'Q4835513' },
              },
            },
            type: 'statement',
          }],
        },
      };

      // Act: Validate (TEST SPECIFIES DESIRED BEHAVIOR)
      const result = validateWikidataEntity(entity);

      // Assert: SPECIFICATION - MUST return success
      expect(result.success).toBe(true);
      expect(result.errors).toBeUndefined();
    });

    it('MUST return success false with errors for invalid entity', () => {
      // Arrange: Invalid entity (no labels)
      const entity = {
        labels: {},
        claims: {},
      };

      // Act: Validate (TEST SPECIFIES DESIRED BEHAVIOR)
      const result = validateWikidataEntity(entity);

      // Assert: SPECIFICATION - MUST return errors
      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
    });
  });

  /**
   * SPECIFICATION 6: assertWikidataEntity - MUST Throw on Invalid Entity
   * 
   * DESIRED BEHAVIOR: assertWikidataEntity() MUST throw ZodError for invalid entities.
   */
  describe('assertWikidataEntity', () => {
    it('MUST not throw for valid entity', () => {
      // Arrange: Valid entity
      const entity = {
        labels: {
          en: { language: 'en', value: 'Test Business' },
        },
        descriptions: {
          en: { language: 'en', value: 'A test business' },
        },
        claims: {
          P31: [{
            mainsnak: {
              snaktype: 'value',
              property: 'P31',
              datavalue: {
                type: 'wikibase-entityid',
                value: { id: 'Q4835513' },
              },
            },
            type: 'statement',
          }],
        },
      };

      // Act & Assert: SPECIFICATION - MUST not throw
      expect(() => assertWikidataEntity(entity)).not.toThrow();
    });

    it('MUST throw ZodError for invalid entity', () => {
      // Arrange: Invalid entity
      const entity = {
        labels: {},
        claims: {},
      };

      // Act & Assert: SPECIFICATION - MUST throw
      expect(() => assertWikidataEntity(entity)).toThrow();
    });
  });

  /**
   * SPECIFICATION 7: notabilityAssessmentSchema - MUST Validate Notability Assessment
   * 
   * DESIRED BEHAVIOR: notabilityAssessmentSchema() MUST validate notability
   * assessment data with confidence score.
   */
  describe('notabilityAssessmentSchema', () => {
    it('MUST accept valid notability assessment', () => {
      // Arrange: Valid assessment
      const assessment = {
        isNotable: true,
        confidence: 0.8,
        recommendation: 'Ready to publish',
      };

      // Act: Validate (TEST SPECIFIES DESIRED BEHAVIOR)
      const result = notabilityAssessmentSchema.safeParse(assessment);

      // Assert: SPECIFICATION - MUST accept valid assessment
      expect(result.success).toBe(true);
    });

    it('MUST validate confidence range (0-1)', () => {
      // Arrange: Invalid confidence values
      const invalidAssessments = [
        { isNotable: true, confidence: -0.1, recommendation: 'test' },
        { isNotable: true, confidence: 1.1, recommendation: 'test' },
      ];

      // Act & Assert: SPECIFICATION - MUST reject out-of-range confidence
      invalidAssessments.forEach(assessment => {
        const result = notabilityAssessmentSchema.safeParse(assessment);
        expect(result.success).toBe(false);
      });
    });
  });

  /**
   * SPECIFICATION 8: storedEntityMetadataSchema - MUST Validate Stored Metadata
   * 
   * DESIRED BEHAVIOR: storedEntityMetadataSchema() MUST validate metadata
   * for stored entities ready for manual publication.
   */
  describe('storedEntityMetadataSchema', () => {
    it('MUST accept valid stored entity metadata', () => {
      // Arrange: Valid metadata
      const metadata = {
        businessId: 1,
        businessName: 'Test Business',
        storedAt: '2024-01-01T00:00:00.000Z',
        entityFileName: 'entity-1-20240101.json',
        metadataFileName: 'entity-1-20240101.metadata.json',
        canPublish: true,
        notability: {
          isNotable: true,
          confidence: 0.8,
          recommendation: 'Ready to publish',
        },
      };

      // Act: Validate (TEST SPECIFIES DESIRED BEHAVIOR)
      const result = storedEntityMetadataSchema.safeParse(metadata);

      // Assert: SPECIFICATION - MUST accept valid metadata
      expect(result.success).toBe(true);
    });

    it('MUST validate file name format', () => {
      // Arrange: Invalid file names
      const invalidMetadata = {
        businessId: 1,
        businessName: 'Test Business',
        storedAt: '2024-01-01T00:00:00.000Z',
        entityFileName: 'invalid.json', // Wrong format
        metadataFileName: 'entity-1-20240101.metadata.json',
        canPublish: true,
      };

      // Act: Validate (TEST SPECIFIES DESIRED BEHAVIOR)
      const result = storedEntityMetadataSchema.safeParse(invalidMetadata);

      // Assert: SPECIFICATION - MUST reject invalid file name format
      expect(result.success).toBe(false);
    });

    it('MUST validate business ID is positive', () => {
      // Arrange: Invalid business ID
      const metadata = {
        businessId: 0, // Not positive
        businessName: 'Test Business',
        storedAt: '2024-01-01T00:00:00.000Z',
        entityFileName: 'entity-1-20240101.json',
        metadataFileName: 'entity-1-20240101.metadata.json',
        canPublish: true,
      };

      // Act: Validate (TEST SPECIFIES DESIRED BEHAVIOR)
      const result = storedEntityMetadataSchema.safeParse(metadata);

      // Assert: SPECIFICATION - MUST reject non-positive business ID
      expect(result.success).toBe(false);
    });
  });

  /**
   * SPECIFICATION 9: validateStoredEntityMetadata - MUST Return Validation Result
   * 
   * DESIRED BEHAVIOR: validateStoredEntityMetadata() MUST return success flag and errors.
   */
  describe('validateStoredEntityMetadata', () => {
    it('MUST return success true for valid metadata', () => {
      // Arrange: Valid metadata
      const metadata = {
        businessId: 1,
        businessName: 'Test Business',
        storedAt: '2024-01-01T00:00:00.000Z',
        entityFileName: 'entity-1-20240101.json',
        metadataFileName: 'entity-1-20240101.metadata.json',
        canPublish: true,
      };

      // Act: Validate (TEST SPECIFIES DESIRED BEHAVIOR)
      const result = validateStoredEntityMetadata(metadata);

      // Assert: SPECIFICATION - MUST return success
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.errors).toBeUndefined();
    });

    it('MUST return success false with errors for invalid metadata', () => {
      // Arrange: Invalid metadata
      const metadata = {
        businessId: 0, // Invalid
        businessName: '',
      };

      // Act: Validate (TEST SPECIFIES DESIRED BEHAVIOR)
      const result = validateStoredEntityMetadata(metadata);

      // Assert: SPECIFICATION - MUST return errors
      expect(result.success).toBe(false);
      expect(result.data).toBeUndefined();
      expect(result.errors).toBeDefined();
    });
  });
});

