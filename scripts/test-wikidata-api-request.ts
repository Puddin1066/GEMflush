#!/usr/bin/env tsx
// Test script to show the exact Wikidata Action API request format

import { entityBuilder } from '../lib/wikidata/entity-builder';
import { Business } from '../lib/db/schema';
import { CrawledData } from '../lib/types/gemflush';

// Mock business data
const mockBusiness: Business = {
  id: 1,
  teamId: 1,
  name: 'Acme Coffee Roasters',
  url: 'https://acmecoffee.com',
  category: 'restaurant',
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
  lastCrawledAt: null,
  crawlData: null,
  status: 'crawled',
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockCrawledData: CrawledData = {
  name: 'Acme Coffee Roasters Inc.',
  description: 'Premium artisanal coffee roaster and cafe serving San Francisco since 2015.',
  phone: '+1-415-555-0123',
  email: 'info@acmecoffee.com',
};

console.log('🌐 GEMFlush - Wikidata Action API Request Format\n');
console.log('=' .repeat(80));

async function runTest() {
  // Build the entity
  const wikidataEntity = await entityBuilder.buildEntity(mockBusiness, mockCrawledData);

  console.log('\n📡 COMPLETE HTTP REQUEST TO WIKIDATA ACTION API:\n');
  console.log('=' .repeat(80));

  const apiEndpoint = 'https://test.wikidata.org/w/api.php';
  const mockToken = 'mock-csrf-token-12345+\\';

  console.log('POST', apiEndpoint);
  console.log('\nHeaders:');
  console.log('  Content-Type: application/x-www-form-urlencoded');
  console.log('  Cookie: [session cookies with authentication]');
  console.log('  User-Agent: GEMflush/1.0');

  console.log('\nForm Data (application/x-www-form-urlencoded):');
  console.log('=' .repeat(80));

  const formData = {
    action: 'wbeditentity',
    new: 'item',
    data: JSON.stringify(wikidataEntity),
    token: mockToken,
    format: 'json',
    bot: '1', // Optional: Mark as bot edit
    summary: 'Created via GEMflush - Automated business entity generation', // Edit summary
  };

  Object.entries(formData).forEach(([key, value]) => {
    if (key === 'data') {
      console.log(`\n${key}:`);
      console.log(JSON.stringify(JSON.parse(value), null, 2));
    } else {
      console.log(`${key}: ${value}`);
    }
  });

  console.log('\n' + '=' .repeat(80));
  console.log('📤 URL-Encoded Request Body:\n');

  // Show URL-encoded version
  const urlEncodedBody = new URLSearchParams({
    action: formData.action,
    new: formData.new,
    data: formData.data,
    token: formData.token,
    format: formData.format,
    bot: formData.bot,
    summary: formData.summary,
  }).toString();

  console.log(urlEncodedBody.substring(0, 200) + '...\n');
  console.log(`(Total length: ${urlEncodedBody.length} characters)`);

  console.log('\n' + '=' .repeat(80));
  console.log('📥 EXPECTED RESPONSE FROM WIKIDATA:\n');

  const mockSuccessResponse = {
  entity: {
    type: 'item',
    id: 'Q1234567',
    labels: {
      en: {
        language: 'en',
        value: 'Acme Coffee Roasters Inc.'
      }
    },
    descriptions: {
      en: {
        language: 'en',
        value: 'Premium artisanal coffee roaster and cafe serving San Francisco since 2015.'
      }
    },
    claims: {
      P31: [
        {
          mainsnak: {
            snaktype: 'value',
            property: 'P31',
            datavalue: {
              value: {
                'entity-type': 'item',
                id: 'Q4830453'
              },
              type: 'wikibase-entityid'
            }
          },
          type: 'statement',
          id: 'Q1234567$UUID-12345',
          rank: 'normal'
        }
      ]
      // ... other claims
    },
    lastrevid: 123456,
    modified: '2025-11-09T12:34:56Z'
  },
  success: 1
  };

  console.log('Success Response:');
  console.log(JSON.stringify(mockSuccessResponse, null, 2));

  console.log('\n' + '=' .repeat(80));
  console.log('❌ POSSIBLE ERROR RESPONSES:\n');

  const errorExamples = [
  {
    name: 'Invalid Token',
    response: {
      error: {
        code: 'badtoken',
        info: 'Invalid CSRF token.',
        '*': 'See https://test.wikidata.org/w/api.php for API usage. Subscribe to the mediawiki-api-announce mailing list at &lt;https://lists.wikimedia.org/mailman/listinfo/mediawiki-api-announce&gt; for notice of API deprecations and breaking changes.'
      },
      servedby: 'mw1234'
    }
  },
  {
    name: 'Missing Required Field',
    response: {
      error: {
        code: 'no-such-entity-type',
        info: 'Invalid entity type provided.'
      }
    }
  },
  {
    name: 'Invalid Property',
    response: {
      error: {
        code: 'modification-failed',
        info: 'Property P99999 does not exist.',
        messages: [
          {
            name: 'wikibase-validator-no-such-property',
            parameters: ['P99999']
          }
        ]
      }
    }
  }
  ];

  errorExamples.forEach(example => {
    console.log(`${example.name}:`);
    console.log(JSON.stringify(example.response, null, 2));
    console.log('');
  });

  console.log('=' .repeat(80));
  console.log('\n🔐 AUTHENTICATION FLOW:\n');

  console.log('1. First, obtain a CSRF token:');
  console.log('   GET https://test.wikidata.org/w/api.php?action=query&meta=tokens&format=json');
  console.log('\n   Response:');
  console.log('   {');
  console.log('     "query": {');
  console.log('       "tokens": {');
  console.log('         "csrftoken": "abc123+\\\\"');
  console.log('       }');
  console.log('     }');
  console.log('   }\n');

  console.log('2. Use the token in the wbeditentity request (shown above)');

  console.log('\n3. For production, authenticate with:');
  console.log('   - OAuth 1.0a (recommended for bots)');
  console.log('   - MediaWiki session cookies');
  console.log('   - Bot password (for development)');

  console.log('\n' + '=' .repeat(80));
  console.log('\n📊 PROPERTY (PID) REFERENCE GUIDE:\n');

  const propertyGuide = [
    { pid: 'P31', name: 'instance of', example: 'Q4830453 (business)', required: true },
    { pid: 'P856', name: 'official website', example: 'https://example.com', required: true },
    { pid: 'P625', name: 'coordinate location', example: '37.7749°N, 122.4194°W', required: false },
    { pid: 'P159', name: 'headquarters location', example: 'Q62 (San Francisco)', required: false },
    { pid: 'P1448', name: 'official name', example: 'Acme Coffee Roasters Inc.', required: true },
    { pid: 'P1329', name: 'phone number', example: '+1-415-555-0123', required: false },
    { pid: 'P6375', name: 'street address', example: '123 Main Street', required: false },
    { pid: 'P571', name: 'inception', example: '2015-01-01', required: false },
    { pid: 'P452', name: 'industry', example: 'Q11862829 (restaurant)', required: false },
  ];

  console.log('PID    | Property Name         | Example                    | Required');
  console.log('-------|-----------------------|----------------------------|----------');
  propertyGuide.forEach(prop => {
    const pidCol = prop.pid.padEnd(6);
    const nameCol = prop.name.padEnd(21);
    const exampleCol = prop.example.padEnd(26);
    const reqCol = prop.required ? 'Yes' : 'No';
    console.log(`${pidCol} | ${nameCol} | ${exampleCol} | ${reqCol}`);
  });

  console.log('\n' + '=' .repeat(80));
  console.log('\n🔗 USEFUL WIKIDATA RESOURCES:\n');

  console.log('API Documentation:');
  console.log('  https://www.wikidata.org/w/api.php?action=help&modules=wbeditentity');
  console.log('\nTest Instance:');
  console.log('  https://test.wikidata.org (for testing before production)');
  console.log('\nProperty Search:');
  console.log('  https://www.wikidata.org/wiki/Special:ListProperties');
  console.log('\nSPARQL Query Service:');
  console.log('  https://query.wikidata.org/');
  console.log('\nNotability Guidelines:');
  console.log('  https://www.wikidata.org/wiki/Wikidata:Notability');

  console.log('\n' + '=' .repeat(80));
  console.log('\n✨ Complete API request format displayed!\n');
}

runTest().catch(error => {
  console.error('❌ Error running test:', error);
  process.exit(1);
});

