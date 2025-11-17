// Minimal test to identify the type mismatch issue
// Tests publishing a minimal entity to Wikidata

import { wikidataPublisher } from '../lib/wikidata/publisher';
import { WikidataEntityDataContract } from '../lib/types/wikidata-contract';

async function testMinimalEntity() {
  console.log('Testing minimal entity...');
  
  // Create minimal entity with just P31 (instance of)
  const minimalEntity: WikidataEntityDataContract = {
    labels: {
      en: {
        language: 'en',
        value: 'Test Entity',
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
                        time: '+2025-11-17T00:00:00Z',
                        precision: 11,
                        timezone: 0,
                        before: 0,
                        after: 0,
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
    },
  };
  
  try {
    const result = await wikidataPublisher.publishEntity(minimalEntity, false);
    console.log('SUCCESS:', result);
  } catch (error) {
    console.error('ERROR:', error);
    throw error;
  }
}

testMinimalEntity().catch(console.error);

