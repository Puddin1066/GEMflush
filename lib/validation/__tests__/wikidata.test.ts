import { describe, it, expect } from 'vitest';
import {
  wikidataLabelSchema,
  wikidataDescriptionSchema,
  wikidataDatavalueSchema,
  wikidataSnakSchema,
  wikidataReferenceSnakSchema,
  wikidataReferenceSchema,
  wikidataClaimSchema,
  wikidataEntityDataSchema,
  validateWikidataEntity,
  assertWikidataEntity,
  notabilityAssessmentSchema,
  storedEntityMetadataSchema,
  validateStoredEntityMetadata,
} from '../wikidata';

describe('Wikidata Validation Schemas', () => {
  describe('wikidataLabelSchema', () => {
    it('should validate a valid label', () => {
      const validLabel = {
        language: 'en',
        value: 'Test Business',
      };

      const result = wikidataLabelSchema.safeParse(validLabel);
      expect(result.success).toBe(true);
    });

    it('should reject label with invalid language code (too short)', () => {
      const invalidLabel = {
        language: 'e', // Too short
        value: 'Test Business',
      };

      const result = wikidataLabelSchema.safeParse(invalidLabel);
      expect(result.success).toBe(false);
    });

    it('should reject label with value exceeding 400 characters', () => {
      const invalidLabel = {
        language: 'en',
        value: 'A'.repeat(401), // Exceeds 400 char limit
      };

      const result = wikidataLabelSchema.safeParse(invalidLabel);
      expect(result.success).toBe(false);
    });

    it('should reject label with empty value', () => {
      const invalidLabel = {
        language: 'en',
        value: '',
      };

      const result = wikidataLabelSchema.safeParse(invalidLabel);
      expect(result.success).toBe(false);
    });
  });

  describe('wikidataDescriptionSchema', () => {
    it('should validate a valid description', () => {
      const validDescription = {
        language: 'en',
        value: 'A test business description',
      };

      const result = wikidataDescriptionSchema.safeParse(validDescription);
      expect(result.success).toBe(true);
    });

    it('should reject description exceeding 250 characters', () => {
      const invalidDescription = {
        language: 'en',
        value: 'A'.repeat(251), // Exceeds 250 char limit
      };

      const result = wikidataDescriptionSchema.safeParse(invalidDescription);
      expect(result.success).toBe(false);
    });

    it('should accept description at exactly 250 characters', () => {
      const validDescription = {
        language: 'en',
        value: 'A'.repeat(250), // Exactly at limit
      };

      const result = wikidataDescriptionSchema.safeParse(validDescription);
      expect(result.success).toBe(true);
    });
  });

  describe('wikidataDatavalueSchema', () => {
    it('should validate wikibase-entityid datavalue', () => {
      const validDatavalue = {
        type: 'wikibase-entityid',
        value: {
          'entity-type': 'item',
          id: 'Q123',
        },
      };

      const result = wikidataDatavalueSchema.safeParse(validDatavalue);
      expect(result.success).toBe(true);
    });

    it('should validate string datavalue', () => {
      const validDatavalue = {
        type: 'string',
        value: 'https://example.com',
      };

      const result = wikidataDatavalueSchema.safeParse(validDatavalue);
      expect(result.success).toBe(true);
    });

    it('should validate time datavalue', () => {
      const validDatavalue = {
        type: 'time',
        value: {
          time: '+2025-01-01T00:00:00Z',
          timezone: 0,
          before: 0,
          after: 0,
          precision: 11,
          calendarmodel: 'http://www.wikidata.org/entity/Q1985727',
        },
      };

      const result = wikidataDatavalueSchema.safeParse(validDatavalue);
      expect(result.success).toBe(true);
    });

    it('should reject invalid datavalue type', () => {
      const invalidDatavalue = {
        type: 'invalid-type',
        value: 'test',
      };

      const result = wikidataDatavalueSchema.safeParse(invalidDatavalue);
      expect(result.success).toBe(false);
    });
  });

  describe('wikidataSnakSchema', () => {
    it('should validate a valid snak with value', () => {
      const validSnak = {
        snaktype: 'value',
        property: 'P31',
        datavalue: {
          type: 'wikibase-entityid',
          value: {
            'entity-type': 'item',
            id: 'Q4830453',
          },
        },
      };

      const result = wikidataSnakSchema.safeParse(validSnak);
      expect(result.success).toBe(true);
    });

    it('should validate a snak with novalue', () => {
      const validSnak = {
        snaktype: 'novalue',
        property: 'P31',
      };

      const result = wikidataSnakSchema.safeParse(validSnak);
      expect(result.success).toBe(true);
    });

    it('should reject snak with invalid property format', () => {
      const invalidSnak = {
        snaktype: 'value',
        property: 'invalid', // Must be P#### format
        datavalue: {
          type: 'string',
          value: 'test',
        },
      };

      const result = wikidataSnakSchema.safeParse(invalidSnak);
      expect(result.success).toBe(false);
    });

    it('should reject snak with invalid snaktype', () => {
      const invalidSnak = {
        snaktype: 'invalid',
        property: 'P31',
      };

      const result = wikidataSnakSchema.safeParse(invalidSnak);
      expect(result.success).toBe(false);
    });
  });

  describe('wikidataClaimSchema', () => {
    it('should validate a claim without references', () => {
      const validClaim = {
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
        rank: 'normal',
      };

      const result = wikidataClaimSchema.safeParse(validClaim);
      expect(result.success).toBe(true);
    });

    it('should validate a claim with references', () => {
      const validClaim = {
        mainsnak: {
          snaktype: 'value',
          property: 'P856',
          datavalue: {
            type: 'string',
            value: 'https://example.com',
          },
        },
        type: 'statement',
        rank: 'normal',
        references: [
          {
            snaks: {
              P854: [
                {
                  snaktype: 'value',
                  property: 'P854',
                  datavalue: {
                    type: 'string',
                    value: 'https://example.com',
                  },
                },
              ],
            },
          },
        ],
      };

      const result = wikidataClaimSchema.safeParse(validClaim);
      expect(result.success).toBe(true);
    });

    it('should reject claim with invalid type', () => {
      const invalidClaim = {
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
        type: 'invalid',
        rank: 'normal',
      };

      const result = wikidataClaimSchema.safeParse(invalidClaim);
      expect(result.success).toBe(false);
    });

    it('should reject claim with invalid rank', () => {
      const invalidClaim = {
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
        rank: 'invalid',
      };

      const result = wikidataClaimSchema.safeParse(invalidClaim);
      expect(result.success).toBe(false);
    });
  });

  describe('wikidataEntityDataSchema', () => {
    it('should validate a complete entity', () => {
      const validEntity = {
        labels: {
          en: {
            language: 'en',
            value: 'Test Business',
          },
        },
        descriptions: {
          en: {
            language: 'en',
            value: 'A test business',
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
              rank: 'normal',
            },
          ],
        },
      };

      const result = wikidataEntityDataSchema.safeParse(validEntity);
      expect(result.success).toBe(true);
    });

    it('should validate entity with llmSuggestions', () => {
      const validEntity = {
        labels: {
          en: {
            language: 'en',
            value: 'Test Business',
          },
        },
        descriptions: {
          en: {
            language: 'en',
            value: 'A test business',
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
        llmSuggestions: {
          qualityScore: 0.85,
          completeness: 0.75,
          model: 'gpt-4',
        },
      };

      const result = wikidataEntityDataSchema.safeParse(validEntity);
      expect(result.success).toBe(true);
    });

    it('should reject entity without labels', () => {
      const invalidEntity = {
        descriptions: {
          en: {
            language: 'en',
            value: 'A test business',
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

      const result = wikidataEntityDataSchema.safeParse(invalidEntity);
      expect(result.success).toBe(false);
      if (!result.success) {
        // Check for either the required field error or the refine message
        const hasLabelError = result.error.issues.some(
          issue => 
            issue.message.includes('at least one label') ||
            issue.path.includes('labels') ||
            issue.code === 'invalid_type'
        );
        expect(hasLabelError).toBe(true);
      }
    });

    it('should reject entity without claims', () => {
      const invalidEntity = {
        labels: {
          en: {
            language: 'en',
            value: 'Test Business',
          },
        },
        descriptions: {
          en: {
            language: 'en',
            value: 'A test business',
          },
        },
        claims: {},
      };

      const result = wikidataEntityDataSchema.safeParse(invalidEntity);
      expect(result.success).toBe(false);
      if (!result.success) {
        // Check for the refine message about claims
        const hasClaimError = result.error.issues.some(
          issue => 
            issue.message.includes('at least one claim') ||
            (issue.path.length === 0 && issue.message.includes('claim'))
        );
        expect(hasClaimError).toBe(true);
      }
    });

    it('should reject entity with invalid property ID format', () => {
      const invalidEntity = {
        labels: {
          en: {
            language: 'en',
            value: 'Test Business',
          },
        },
        descriptions: {
          en: {
            language: 'en',
            value: 'A test business',
          },
        },
        claims: {
          'invalid-property': [
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

      const result = wikidataEntityDataSchema.safeParse(invalidEntity);
      expect(result.success).toBe(false);
    });

    it('should reject entity with empty claim array', () => {
      const invalidEntity = {
        labels: {
          en: {
            language: 'en',
            value: 'Test Business',
          },
        },
        descriptions: {
          en: {
            language: 'en',
            value: 'A test business',
          },
        },
        claims: {
          P31: [], // Empty array not allowed
        },
      };

      const result = wikidataEntityDataSchema.safeParse(invalidEntity);
      expect(result.success).toBe(false);
    });
  });

  describe('validateWikidataEntity', () => {
    it('should return success for valid entity', () => {
      const validEntity = {
        labels: {
          en: {
            language: 'en',
            value: 'Test Business',
          },
        },
        descriptions: {
          en: {
            language: 'en',
            value: 'A test business',
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

      const result = validateWikidataEntity(validEntity);
      expect(result.success).toBe(true);
      expect(result.errors).toBeUndefined();
    });

    it('should return errors for invalid entity', () => {
      const invalidEntity = {
        labels: {},
        claims: {},
      };

      const result = validateWikidataEntity(invalidEntity);
      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
    });
  });

  describe('assertWikidataEntity', () => {
    it('should not throw for valid entity', () => {
      const validEntity = {
        labels: {
          en: {
            language: 'en',
            value: 'Test Business',
          },
        },
        descriptions: {
          en: {
            language: 'en',
            value: 'A test business',
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

      expect(() => assertWikidataEntity(validEntity)).not.toThrow();
    });

    it('should throw for invalid entity', () => {
      const invalidEntity = {
        labels: {},
        claims: {},
      };

      expect(() => assertWikidataEntity(invalidEntity)).toThrow();
    });
  });

  describe('notabilityAssessmentSchema', () => {
    it('should validate a valid notability assessment', () => {
      const validAssessment = {
        isNotable: true,
        confidence: 0.85,
        recommendation: 'Entity meets notability criteria',
      };

      const result = notabilityAssessmentSchema.safeParse(validAssessment);
      expect(result.success).toBe(true);
    });

    it('should reject assessment with confidence outside 0-1 range', () => {
      const invalidAssessment = {
        isNotable: true,
        confidence: 1.5, // Exceeds max
        recommendation: 'Test',
      };

      const result = notabilityAssessmentSchema.safeParse(invalidAssessment);
      expect(result.success).toBe(false);
    });

    it('should reject assessment with negative confidence', () => {
      const invalidAssessment = {
        isNotable: true,
        confidence: -0.1, // Negative
        recommendation: 'Test',
      };

      const result = notabilityAssessmentSchema.safeParse(invalidAssessment);
      expect(result.success).toBe(false);
    });

    it('should reject assessment with missing fields', () => {
      const invalidAssessment = {
        isNotable: true,
        // Missing confidence and recommendation
      };

      const result = notabilityAssessmentSchema.safeParse(invalidAssessment);
      expect(result.success).toBe(false);
    });
  });

  describe('storedEntityMetadataSchema', () => {
    it('should validate a valid stored entity metadata', () => {
      const validMetadata = {
        businessId: 123,
        businessName: 'Test Business',
        storedAt: '2024-01-01T00:00:00.000Z',
        entityFileName: 'entity-123-2024-01-01T00-00-00-000Z.json',
        metadataFileName: 'entity-123-2024-01-01T00-00-00-000Z.metadata.json',
        canPublish: true,
        notability: {
          isNotable: true,
          confidence: 0.85,
          recommendation: 'Meets criteria',
        },
      };

      const result = storedEntityMetadataSchema.safeParse(validMetadata);
      expect(result.success).toBe(true);
    });

    it('should validate metadata without notability', () => {
      const validMetadata = {
        businessId: 456,
        businessName: 'Test Business 2',
        storedAt: '2024-01-01T00:00:00.000Z',
        entityFileName: 'entity-456-2024-01-01T00-00-00-000Z.json',
        metadataFileName: 'entity-456-2024-01-01T00-00-00-000Z.metadata.json',
        canPublish: false,
      };

      const result = storedEntityMetadataSchema.safeParse(validMetadata);
      expect(result.success).toBe(true);
    });

    it('should reject metadata with invalid business ID', () => {
      const invalidMetadata = {
        businessId: -1, // Negative
        businessName: 'Test',
        storedAt: '2024-01-01T00:00:00.000Z',
        entityFileName: 'entity-123-2024-01-01T00-00-00-000Z.json',
        metadataFileName: 'entity-123-2024-01-01T00-00-00-000Z.metadata.json',
        canPublish: true,
      };

      const result = storedEntityMetadataSchema.safeParse(invalidMetadata);
      expect(result.success).toBe(false);
    });

    it('should reject metadata with invalid filename format', () => {
      const invalidMetadata = {
        businessId: 123,
        businessName: 'Test',
        storedAt: '2024-01-01T00:00:00.000Z',
        entityFileName: 'invalid-filename.json', // Wrong format
        metadataFileName: 'entity-123-2024-01-01T00-00-00-000Z.metadata.json',
        canPublish: true,
      };

      const result = storedEntityMetadataSchema.safeParse(invalidMetadata);
      expect(result.success).toBe(false);
    });

    it('should reject metadata with invalid timestamp', () => {
      const invalidMetadata = {
        businessId: 123,
        businessName: 'Test',
        storedAt: 'invalid-timestamp', // Not ISO 8601
        entityFileName: 'entity-123-2024-01-01T00-00-00-000Z.json',
        metadataFileName: 'entity-123-2024-01-01T00-00-00-000Z.metadata.json',
        canPublish: true,
      };

      const result = storedEntityMetadataSchema.safeParse(invalidMetadata);
      expect(result.success).toBe(false);
    });
  });

  describe('validateStoredEntityMetadata', () => {
    it('should return success for valid metadata', () => {
      const validMetadata = {
        businessId: 123,
        businessName: 'Test Business',
        storedAt: '2024-01-01T00:00:00.000Z',
        entityFileName: 'entity-123-2024-01-01T00-00-00-000Z.json',
        metadataFileName: 'entity-123-2024-01-01T00-00-00-000Z.metadata.json',
        canPublish: true,
      };

      const result = validateStoredEntityMetadata(validMetadata);
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });

    it('should return errors for invalid metadata', () => {
      const invalidMetadata = {
        businessId: -1,
        businessName: '',
        storedAt: 'invalid',
        entityFileName: 'invalid',
        metadataFileName: 'invalid',
        canPublish: true,
      };

      const result = validateStoredEntityMetadata(invalidMetadata);
      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
    });
  });
});

