import { describe, it, expect } from 'vitest';
import {
  isWikidataEntityDataContract,
  type WikidataEntityDataContract,
  type WikibaseEntityIdValue,
  type TimeValue,
  type QuantityValue,
  type MonolingualTextValue,
  type GlobeCoordinateValue,
  type WikidataDatavalue,
  type WikidataSnak,
  type WikidataReference,
  type WikidataClaim,
  type WikidataLabel,
  type WikidataDescription,
  type CleanedWikidataEntity,
} from '../wikidata-contract';

/**
 * Unit Tests for Wikidata Type Contracts
 * 
 * Tests the type guard functions and contract structure validation
 * SOLID: Single Responsibility - tests contract types only
 * DRY: Reusable test fixtures
 */

describe('Wikidata Type Contracts', () => {
  // DRY: Reusable test fixtures
  const createValidEntity = (): WikidataEntityDataContract => ({
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
  });

  describe('isWikidataEntityDataContract', () => {
    it('should return true for valid entity contract', () => {
      const entity = createValidEntity();
      expect(isWikidataEntityDataContract(entity)).toBe(true);
    });

    it('should return false for null', () => {
      expect(isWikidataEntityDataContract(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isWikidataEntityDataContract(undefined)).toBe(false);
    });

    it('should return false for non-object', () => {
      expect(isWikidataEntityDataContract('string')).toBe(false);
      expect(isWikidataEntityDataContract(123)).toBe(false);
      expect(isWikidataEntityDataContract(true)).toBe(false);
      expect(isWikidataEntityDataContract([])).toBe(false);
    });

    it('should return false for object missing labels', () => {
      const entity = {
        descriptions: { en: { language: 'en', value: 'Test' } },
        claims: {},
      };
      expect(isWikidataEntityDataContract(entity)).toBe(false);
    });

    it('should return false for object missing descriptions', () => {
      const entity = {
        labels: { en: { language: 'en', value: 'Test' } },
        claims: {},
      };
      expect(isWikidataEntityDataContract(entity)).toBe(false);
    });

    it('should return false for object missing claims', () => {
      const entity = {
        labels: { en: { language: 'en', value: 'Test' } },
        descriptions: { en: { language: 'en', value: 'Test' } },
      };
      expect(isWikidataEntityDataContract(entity)).toBe(false);
    });

    it('should return false for labels that are not an object', () => {
      const entity = {
        labels: 'not-an-object',
        descriptions: { en: { language: 'en', value: 'Test' } },
        claims: {},
      };
      expect(isWikidataEntityDataContract(entity)).toBe(false);
    });

    it('should return false for descriptions that are not an object', () => {
      const entity = {
        labels: { en: { language: 'en', value: 'Test' } },
        descriptions: 'not-an-object',
        claims: {},
      };
      expect(isWikidataEntityDataContract(entity)).toBe(false);
    });

    it('should return false for claims that are not an object', () => {
      const entity = {
        labels: { en: { language: 'en', value: 'Test' } },
        descriptions: { en: { language: 'en', value: 'Test' } },
        claims: 'not-an-object',
      };
      expect(isWikidataEntityDataContract(entity)).toBe(false);
    });

    it('should return true for entity with llmSuggestions', () => {
      const entity: WikidataEntityDataContract = {
        ...createValidEntity(),
        llmSuggestions: {
          suggestedProperties: [],
          suggestedReferences: [],
          qualityScore: 0.85,
          completeness: 0.75,
          model: 'gpt-4',
          generatedAt: new Date(),
        },
      };
      expect(isWikidataEntityDataContract(entity)).toBe(true);
    });
  });

  describe('WikibaseEntityIdValue', () => {
    it('should accept valid entity ID value', () => {
      const value: WikibaseEntityIdValue = {
        'entity-type': 'item',
        id: 'Q123',
      };
      expect(value.id).toBe('Q123');
      expect(value['entity-type']).toBe('item');
    });

    it('should accept property entity type', () => {
      const value: WikibaseEntityIdValue = {
        'entity-type': 'property',
        id: 'P31',
      };
      expect(value.id).toBe('P31');
      expect(value['entity-type']).toBe('property');
    });

    it('should accept optional numeric-id', () => {
      const value: WikibaseEntityIdValue = {
        'entity-type': 'item',
        id: 'Q123',
        'numeric-id': 123,
      };
      expect(value['numeric-id']).toBe(123);
    });
  });

  describe('TimeValue', () => {
    it('should accept valid time value', () => {
      const value: TimeValue = {
        time: '+2025-01-01T00:00:00Z',
        timezone: 0,
        before: 0,
        after: 0,
        precision: 11,
        calendarmodel: 'http://www.wikidata.org/entity/Q1985727',
      };
      expect(value.time).toContain('+2025-01-01');
      expect(value.precision).toBe(11);
    });
  });

  describe('QuantityValue', () => {
    it('should accept valid quantity value', () => {
      const value: QuantityValue = {
        amount: '+10',
        unit: 'Q11573',
      };
      expect(value.amount).toBe('+10');
      expect(value.unit).toBe('Q11573');
    });

    it('should accept dimensionless unit', () => {
      const value: QuantityValue = {
        amount: '+5',
        unit: '1',
      };
      expect(value.unit).toBe('1');
    });

    it('should accept optional bounds', () => {
      const value: QuantityValue = {
        amount: '+10',
        unit: '1',
        upperBound: '+11',
        lowerBound: '+9',
      };
      expect(value.upperBound).toBe('+11');
      expect(value.lowerBound).toBe('+9');
    });
  });

  describe('MonolingualTextValue', () => {
    it('should accept valid monolingual text', () => {
      const value: MonolingualTextValue = {
        text: 'Test Title',
        language: 'en',
      };
      expect(value.text).toBe('Test Title');
      expect(value.language).toBe('en');
    });
  });

  describe('GlobeCoordinateValue', () => {
    it('should accept valid globe coordinate', () => {
      const value: GlobeCoordinateValue = {
        latitude: 37.7749,
        longitude: -122.4194,
        precision: 0.0001,
        globe: 'http://www.wikidata.org/entity/Q2',
      };
      expect(value.latitude).toBe(37.7749);
      expect(value.longitude).toBe(-122.4194);
    });

    it('should accept optional altitude', () => {
      const value: GlobeCoordinateValue = {
        latitude: 37.7749,
        longitude: -122.4194,
        precision: 0.0001,
        globe: 'http://www.wikidata.org/entity/Q2',
        altitude: 100,
      };
      expect(value.altitude).toBe(100);
    });
  });

  describe('WikidataDatavalue', () => {
    it('should accept wikibase-entityid datavalue', () => {
      const datavalue: WikidataDatavalue = {
        type: 'wikibase-entityid',
        value: {
          'entity-type': 'item',
          id: 'Q123',
        },
      };
      expect(datavalue.type).toBe('wikibase-entityid');
      expect(datavalue.value['entity-type']).toBe('item');
    });

    it('should accept string datavalue', () => {
      const datavalue: WikidataDatavalue = {
        type: 'string',
        value: 'https://example.com',
      };
      expect(datavalue.type).toBe('string');
      expect(datavalue.value).toBe('https://example.com');
    });

    it('should accept time datavalue', () => {
      const datavalue: WikidataDatavalue = {
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
      expect(datavalue.type).toBe('time');
      expect(datavalue.value.precision).toBe(11);
    });

    it('should accept quantity datavalue', () => {
      const datavalue: WikidataDatavalue = {
        type: 'quantity',
        value: {
          amount: '+10',
          unit: '1',
        },
      };
      expect(datavalue.type).toBe('quantity');
      expect(datavalue.value.amount).toBe('+10');
    });

    it('should accept monolingualtext datavalue', () => {
      const datavalue: WikidataDatavalue = {
        type: 'monolingualtext',
        value: {
          text: 'Test',
          language: 'en',
        },
      };
      expect(datavalue.type).toBe('monolingualtext');
      expect(datavalue.value.text).toBe('Test');
    });

    it('should accept globecoordinate datavalue', () => {
      const datavalue: WikidataDatavalue = {
        type: 'globecoordinate',
        value: {
          latitude: 37.7749,
          longitude: -122.4194,
          precision: 0.0001,
          globe: 'http://www.wikidata.org/entity/Q2',
        },
      };
      expect(datavalue.type).toBe('globecoordinate');
      expect(datavalue.value.latitude).toBe(37.7749);
    });
  });

  describe('WikidataSnak', () => {
    it('should accept snak with value', () => {
      const snak: WikidataSnak = {
        snaktype: 'value',
        property: 'P31',
        datavalue: {
          type: 'wikibase-entityid',
          value: {
            'entity-type': 'item',
            id: 'Q123',
          },
        },
      };
      expect(snak.snaktype).toBe('value');
      expect(snak.property).toBe('P31');
    });

    it('should accept snak with novalue', () => {
      const snak: WikidataSnak = {
        snaktype: 'novalue',
        property: 'P31',
      };
      expect(snak.snaktype).toBe('novalue');
      expect(snak.datavalue).toBeUndefined();
    });

    it('should accept snak with somevalue', () => {
      const snak: WikidataSnak = {
        snaktype: 'somevalue',
        property: 'P31',
      };
      expect(snak.snaktype).toBe('somevalue');
    });

    it('should accept optional hash', () => {
      const snak: WikidataSnak = {
        snaktype: 'value',
        property: 'P31',
        datavalue: {
          type: 'string',
          value: 'test',
        },
        hash: 'abc123',
      };
      expect(snak.hash).toBe('abc123');
    });
  });

  describe('WikidataReference', () => {
    it('should accept valid reference', () => {
      const reference: WikidataReference = {
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
      };
      expect(reference.snaks.P854).toBeDefined();
      expect(reference.snaks.P854.length).toBe(1);
    });

    it('should accept optional hash', () => {
      const reference: WikidataReference = {
        hash: 'ref-hash-123',
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
      };
      expect(reference.hash).toBe('ref-hash-123');
    });
  });

  describe('WikidataClaim', () => {
    it('should accept claim without references', () => {
      const claim: WikidataClaim = {
        mainsnak: {
          snaktype: 'value',
          property: 'P31',
          datavalue: {
            type: 'wikibase-entityid',
            value: {
              'entity-type': 'item',
              id: 'Q123',
            },
          },
        },
        type: 'statement',
      };
      expect(claim.type).toBe('statement');
      expect(claim.references).toBeUndefined();
    });

    it('should accept claim with references', () => {
      const claim: WikidataClaim = {
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
      expect(claim.references).toBeDefined();
      expect(claim.references?.length).toBe(1);
    });

    it('should accept claim with qualifiers', () => {
      const claim: WikidataClaim = {
        mainsnak: {
          snaktype: 'value',
          property: 'P31',
          datavalue: {
            type: 'wikibase-entityid',
            value: {
              'entity-type': 'item',
              id: 'Q123',
            },
          },
        },
        type: 'statement',
        qualifiers: {
          P580: [
            {
              snaktype: 'value',
              property: 'P580',
              datavalue: {
                type: 'time',
                value: {
                  time: '+2025-01-01T00:00:00Z',
                  timezone: 0,
                  before: 0,
                  after: 0,
                  precision: 11,
                  calendarmodel: 'http://www.wikidata.org/entity/Q1985727',
                },
              },
            },
          ],
        },
        qualifiersOrder: ['P580'],
      };
      expect(claim.qualifiers).toBeDefined();
      expect(claim.qualifiersOrder).toEqual(['P580']);
    });
  });

  describe('WikidataLabel', () => {
    it('should accept valid label', () => {
      const label: WikidataLabel = {
        language: 'en',
        value: 'Test Business',
      };
      expect(label.language).toBe('en');
      expect(label.value).toBe('Test Business');
    });
  });

  describe('WikidataDescription', () => {
    it('should accept valid description', () => {
      const description: WikidataDescription = {
        language: 'en',
        value: 'A test business',
      };
      expect(description.language).toBe('en');
      expect(description.value).toBe('A test business');
    });
  });

  describe('CleanedWikidataEntity', () => {
    it('should exclude llmSuggestions from cleaned entity', () => {
      const entity: WikidataEntityDataContract = {
        ...createValidEntity(),
        llmSuggestions: {
          suggestedProperties: [],
          suggestedReferences: [],
          qualityScore: 0.85,
          completeness: 0.75,
          model: 'gpt-4',
          generatedAt: new Date(),
        },
      };

      const cleaned: CleanedWikidataEntity = {
        labels: entity.labels,
        descriptions: entity.descriptions,
        claims: entity.claims,
      };

      expect(cleaned.labels).toBeDefined();
      expect(cleaned.descriptions).toBeDefined();
      expect(cleaned.claims).toBeDefined();
      // TypeScript ensures llmSuggestions is not accessible
      // @ts-expect-error - llmSuggestions should not exist on CleanedWikidataEntity
      expect(cleaned.llmSuggestions).toBeUndefined();
    });
  });

  describe('Contract Type Compatibility', () => {
    it('should ensure entity contract matches Wikibase JSON spec structure', () => {
      const entity = createValidEntity();
      
      // Verify structure matches Wikibase JSON spec
      expect(entity.labels).toBeDefined();
      expect(typeof entity.labels).toBe('object');
      expect(entity.descriptions).toBeDefined();
      expect(typeof entity.descriptions).toBe('object');
      expect(entity.claims).toBeDefined();
      expect(typeof entity.claims).toBe('object');
      
      // Verify labels structure
      const label = entity.labels.en;
      expect(label).toBeDefined();
      expect(label.language).toBe('en');
      expect(label.value).toBeDefined();
      
      // Verify claims structure
      const claim = entity.claims.P31?.[0];
      expect(claim).toBeDefined();
      expect(claim?.mainsnak).toBeDefined();
      expect(claim?.type).toBe('statement');
    });
  });
});

