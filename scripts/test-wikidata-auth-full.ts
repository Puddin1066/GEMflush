/**
 * Full Authentication Test using the actual publisher code
 * 
 * Tests authentication using the WikidataPublisher class to ensure
 * the same code path that will be used in production.
 */

import 'dotenv/config';
import { WikidataPublisher } from '../lib/wikidata/publisher';
import { WikidataEntityData } from '../lib/types/gemflush';

async function testFullAuth() {
  console.log('🔐 Full Authentication Test using WikidataPublisher\n');

  // Override env vars for this test
  process.env.WIKIDATA_BOT_USERNAME = 'Puddin1066@kgaasbot';
  process.env.WIKIDATA_BOT_PASSWORD = '0g435bt282nfk3fhq7rql3qvt0astl3h';
  process.env.WIKIDATA_PUBLISH_MODE = 'real';

  console.log('📋 Test Configuration:');
  console.log(`   WIKIDATA_BOT_USERNAME: ${process.env.WIKIDATA_BOT_USERNAME}`);
  console.log(`   WIKIDATA_BOT_PASSWORD: ${process.env.WIKIDATA_BOT_PASSWORD.substring(0, 10)}...`);
  console.log(`   WIKIDATA_PUBLISH_MODE: ${process.env.WIKIDATA_PUBLISH_MODE}\n`);

  const publisher = new WikidataPublisher();

  // Create a minimal test entity
  const testEntity: WikidataEntityData = {
    labels: {
      en: {
        language: 'en',
        value: 'Test Entity',
      },
    },
    descriptions: {
      en: {
        language: 'en',
        value: 'A test entity for authentication',
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

  console.log('Attempting to publish test entity (this will test authentication)...\n');
  
  try {
    const result = await publisher.publishEntity(testEntity, false);
    
    if (result.success) {
      console.log('\n✅ AUTHENTICATION SUCCESSFUL!');
      console.log(`   QID: ${result.qid}`);
      console.log('\n💡 Your .env configuration is correct!');
    } else {
      console.log('\n❌ Authentication or publication failed');
      console.log(`   Error: ${result.error}`);
      console.log('\n💡 Possible issues:');
      console.log('   1. Bot password may have been revoked');
      console.log('   2. Rate limiting (wait a few minutes)');
      console.log('   3. Bot name or password incorrect');
      console.log('   4. Check Special:BotPasswords to verify bot is active');
    }
  } catch (error) {
    console.error('\n❌ Unexpected error:', error);
    if (error instanceof Error) {
      console.error(`   Message: ${error.message}`);
    }
  }
}

testFullAuth();

