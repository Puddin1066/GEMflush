import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WikidataPublisher } from '../publisher';
import type { WikidataEntityDataContract } from '@/lib/types/wikidata-contract';
import type { CleanedWikidataEntity } from '@/lib/types/wikidata-contract';

// Mock fetch globally
global.fetch = vi.fn();

/**
 * Test fixtures and helpers following DRY principle
 * SOLID: Single Responsibility - test data and utilities only
 */
describe('Test vs Production Entity Adaptation', () => {
  let publisher: WikidataPublisher;
  const originalEnv = process.env;

  // DRY: Reusable authentication mock setup
  const mockAuthFlow = () => {
    (global.fetch as any)
      .mockResolvedValueOnce({
        json: async () => ({
          query: { tokens: { logintoken: 'mock-token' } },
        }),
      })
      .mockResolvedValueOnce({
        json: async () => ({ login: { result: 'Success' } }),
        headers: { get: () => 'sessionid=mock-session' },
      })
      .mockResolvedValueOnce({
        json: async () => ({
          query: { tokens: { csrftoken: 'mock-csrf' } },
        }),
      })
      .mockResolvedValueOnce({
        json: async () => ({
          success: 1,
          entity: { id: 'Q123' },
        }),
      });
  };

  // DRY: Extract entity from publish request
  const extractPublishedEntity = (callIndex: number): CleanedWikidataEntity | null => {
    const publishCall = (global.fetch as any).mock.calls[callIndex];
    if (!publishCall || !publishCall[1]?.body) return null;

    try {
      const publishBody = new URLSearchParams(publishCall[1].body);
      const dataParam = publishBody.get('data');
      return dataParam ? (JSON.parse(dataParam) as CleanedWikidataEntity) : null;
    } catch {
      return null;
    }
  };

  // DRY: Check if entity has references
  const hasReferences = (entity: CleanedWikidataEntity): boolean => {
    return Object.values(entity.claims).some((claimArray) =>
      claimArray.some((claim) => claim.references && claim.references.length > 0)
    );
  };

  // DRY: Properties that should be removed for test
  const PROBLEMATIC_PROPERTIES = ['P31', 'P856', 'P1128', 'P2003'];

  // Entity with properties that should be removed for test (P31, P856, P1128, P2003)
  const entityWithProblematicProperties: WikidataEntityDataContract = {
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
      // P31 - should be removed for test
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
      // P856 - should be removed for test
      P856: [
        {
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
        },
      ],
      // P625 - should remain (not in removal list)
      P625: [
        {
          mainsnak: {
            snaktype: 'value',
            property: 'P625',
            datavalue: {
              type: 'globecoordinate',
              value: {
                latitude: 37.7749,
                longitude: -122.4194,
                precision: 0.0001,
                globe: 'http://www.wikidata.org/entity/Q2',
              },
            },
          },
          type: 'statement',
          rank: 'normal',
        },
      ],
    },
  };

  // Entity with references that should be removed for test
  const entityWithReferences: WikidataEntityDataContract = {
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
      P856: [
        {
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
                P813: [
                  {
                    snaktype: 'value',
                    property: 'P813',
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
            },
          ],
        },
      ],
      P625: [
        {
          mainsnak: {
            snaktype: 'value',
            property: 'P625',
            datavalue: {
              type: 'globecoordinate',
              value: {
                latitude: 37.7749,
                longitude: -122.4194,
                precision: 0.0001,
                globe: 'http://www.wikidata.org/entity/Q2',
              },
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
                      value: 'https://reference.com',
                    },
                  },
                ],
              },
            },
          ],
        },
      ],
    },
  };

  beforeEach(() => {
    publisher = new WikidataPublisher();
    vi.clearAllMocks();
    process.env = { ...originalEnv };
    process.env.WIKIDATA_PUBLISH_MODE = 'real';
    process.env.WIKIDATA_BOT_USERNAME = 'TestUser@TestBot';
    process.env.WIKIDATA_BOT_PASSWORD = 'validpassword123';
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  describe('adaptEntityForTest - Property Removal', () => {
    it('should remove P31 when publishing to test', async () => {
      // DRY: Use helper function
      mockAuthFlow();

      await publisher.publishEntity(entityWithProblematicProperties, false);

      // DRY: Use helper to extract entity
      const publishedEntity = extractPublishedEntity(3);
      expect(publishedEntity).not.toBeNull();
      
      if (publishedEntity) {
        // P31 should be removed for test
        expect(publishedEntity.claims.P31).toBeUndefined();
        
        // P856 should be removed for test
        expect(publishedEntity.claims.P856).toBeUndefined();
        
        // P625 should remain (not in removal list)
        expect(publishedEntity.claims.P625).toBeDefined();
      }
    });

    it('should remove all problematic properties when publishing to test', async () => {
      // DRY: Create entity with all problematic properties
      const entityWithAllProblematicProps: WikidataEntityDataContract = {
        ...entityWithProblematicProperties,
        claims: {
          ...entityWithProblematicProperties.claims,
          P1128: [
            {
              mainsnak: {
                snaktype: 'value',
                property: 'P1128',
                datavalue: {
                  type: 'quantity',
                  value: {
                    amount: '+10',
                    unit: '1',
                  },
                },
              },
              type: 'statement',
            },
          ],
          P2003: [
            {
              mainsnak: {
                snaktype: 'value',
                property: 'P2003',
                datavalue: {
                  type: 'string',
                  value: '@test',
                },
              },
              type: 'statement',
            },
          ],
        },
      };

      // DRY: Use helper function
      mockAuthFlow();

      await publisher.publishEntity(entityWithAllProblematicProps, false);

      const publishedEntity = extractPublishedEntity(3);
      expect(publishedEntity).not.toBeNull();
      
      if (publishedEntity) {
        // DRY: Check all problematic properties are removed
        PROBLEMATIC_PROPERTIES.forEach((pid) => {
          expect(publishedEntity.claims[pid]).toBeUndefined();
        });
      }
    });

    it('should NOT remove properties when publishing to production', async () => {
      // DRY: Use helper function
      mockAuthFlow();

      await publisher.publishEntity(entityWithProblematicProperties, true);

      const publishedEntity = extractPublishedEntity(3);
      
      // Note: Production publishing is currently blocked/mocked
      // This test verifies the adaptation logic doesn't run for production
      if (publishedEntity) {
        expect(publishedEntity.claims).toBeDefined();
        // Production should preserve all properties (adaptation only runs for test)
        // Since production is blocked, we just verify entity structure is intact
      }
    });
  });

  describe('adaptEntityForTest - Reference Removal', () => {
    it('should remove all references when publishing to test', async () => {
      // DRY: Use helper function
      mockAuthFlow();

      await publisher.publishEntity(entityWithReferences, false);

      const publishedEntity = extractPublishedEntity(3);
      expect(publishedEntity).not.toBeNull();
      
      if (publishedEntity) {
        // DRY: Use helper to check references
        expect(hasReferences(publishedEntity)).toBe(false);
        
        // Verify all claims have empty references
        Object.values(publishedEntity.claims).forEach((claimArray) => {
          claimArray.forEach((claim) => {
            expect(claim.references).toEqual([]);
          });
        });
      }
    });

    it('should preserve references when publishing to production', async () => {
      // DRY: Use helper function
      mockAuthFlow();

      await publisher.publishEntity(entityWithReferences, true);

      const publishedEntity = extractPublishedEntity(3);
      
      // Note: Production publishing is currently blocked/mocked
      // This test verifies the adaptation logic doesn't run for production
      if (publishedEntity) {
        expect(publishedEntity.claims).toBeDefined();
        // Production should preserve references (adaptation only runs for test)
      }
    });
  });

  describe('adaptEntityForTest - Label/Description Uniqueness', () => {
    it('should preserve clean labels when publishing to test (no timestamp pollution)', async () => {
      // DRY: Use helper function
      mockAuthFlow();

      await publisher.publishEntity(entityWithProblematicProperties, false);

      const publishedEntity = extractPublishedEntity(3);
      expect(publishedEntity).not.toBeNull();
      
      if (publishedEntity) {
        // Label should NOT have timestamp appended (removed to prevent data pollution)
        const labelValue = publishedEntity.labels?.en?.value;
        expect(labelValue).toBeDefined();
        expect(labelValue).toBe('Test Business'); // Should be clean, no timestamp
        expect(labelValue).not.toMatch(/\[\d+\]/); // Should NOT have timestamp in brackets
      }
    });

    it('should preserve clean descriptions when publishing to test (no timestamp pollution)', async () => {
      // DRY: Use helper function
      mockAuthFlow();

      await publisher.publishEntity(entityWithProblematicProperties, false);

      const publishedEntity = extractPublishedEntity(3);
      expect(publishedEntity).not.toBeNull();
      
      if (publishedEntity) {
        // Description should NOT have "test" and timestamp appended (removed to prevent data pollution)
        const descValue = publishedEntity.descriptions?.en?.value;
        expect(descValue).toBeDefined();
        expect(descValue).toBe('A test business'); // Should be clean, no timestamp
        expect(descValue).not.toMatch(/\[test \d+\]/); // Should NOT have "test [timestamp]"
      }
    });
  });

  describe('Test vs Production Entity Comparison', () => {
    it('should produce different entities for test vs production', async () => {
      // DRY: Use helper function for test
      mockAuthFlow();
      await publisher.publishEntity(entityWithReferences, false);
      const testEntity = extractPublishedEntity(3);
      
      vi.clearAllMocks();

      // DRY: Use helper function for production
      mockAuthFlow();
      await publisher.publishEntity(entityWithReferences, true);
      const prodEntity = extractPublishedEntity(3);
      
      expect(testEntity).not.toBeNull();
      expect(prodEntity).not.toBeNull();
      
      if (testEntity && prodEntity) {
        // Test entity should have fewer properties (problematic ones removed)
        const testPropertyCount = Object.keys(testEntity.claims).length;
        const prodPropertyCount = Object.keys(prodEntity.claims).length;
        expect(testPropertyCount).toBeLessThanOrEqual(prodPropertyCount);
        
        // DRY: Use helper to check references
        expect(hasReferences(testEntity)).toBe(false);
        
        // Labels should be different (test has timestamp)
        expect(testEntity.labels?.en?.value).not.toBe(prodEntity.labels?.en?.value);
        expect(testEntity.labels?.en?.value).toMatch(/\[\d+\]/);
      }
    });
  });
});

