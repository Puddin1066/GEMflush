import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WikidataPublisher } from '../publisher';
import { WikidataEntityData } from '@/lib/types/gemflush';

describe('WikidataPublisher', () => {
  let publisher: WikidataPublisher;

  beforeEach(() => {
    publisher = new WikidataPublisher();
    vi.clearAllMocks();
  });

  describe('publishEntity', () => {
    const mockEntity: WikidataEntityData = {
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
              property: 'P31',
              snaktype: 'value',
              datavalue: {
                value: {
                  'entity-type': 'item',
                  id: 'Q4830453',
                },
                type: 'wikibase-entityid',
              },
            },
            type: 'statement',
            rank: 'normal',
          },
        ],
      },
    };

    it('should publish entity to test Wikidata', async () => {
      const result = await publisher.publishEntity(mockEntity, false);

      expect(result.success).toBe(true);
      expect(result.qid).toMatch(/^Q\d+$/);
      expect(result.error).toBeUndefined();
    });

    it('should publish entity to production Wikidata', async () => {
      const result = await publisher.publishEntity(mockEntity, true);

      expect(result.success).toBe(true);
      expect(result.qid).toMatch(/^Q\d+$/);
    });

    it('should generate unique QIDs', async () => {
      const result1 = await publisher.publishEntity(mockEntity, false);
      const result2 = await publisher.publishEntity(mockEntity, false);

      expect(result1.qid).not.toBe(result2.qid);
    });

    it('should handle errors gracefully', async () => {
      // Mock console.error to avoid noise
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Create a publisher that will throw an error
      const publisherWithError = new WikidataPublisher();
      // Override the method to throw
      vi.spyOn(publisherWithError as any, 'generateMockQID').mockImplementation(() => {
        throw new Error('Test error');
      });

      const result = await publisherWithError.publishEntity(mockEntity, false);

      expect(result.success).toBe(false);
      expect(result.qid).toBe('');
      expect(result.error).toBeDefined();

      consoleErrorSpy.mockRestore();
    });
  });

  describe('updateEntity', () => {
    it('should update entity successfully', async () => {
      const updates: Partial<WikidataEntityData> = {
        labels: {
          en: {
            language: 'en',
            value: 'Updated Business Name',
          },
        },
      };

      const result = await publisher.updateEntity('Q123456', updates, false);

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should update entity in production', async () => {
      const updates: Partial<WikidataEntityData> = {
        descriptions: {
          en: {
            language: 'en',
            value: 'Updated description',
          },
        },
      };

      const result = await publisher.updateEntity('Q123456', updates, true);

      expect(result.success).toBe(true);
    });
  });
});

