#!/usr/bin/env tsx
/**
 * Output ONLY the Wikidata JSON for a URL
 */

import { entityBuilder } from '../lib/wikidata/entity-builder';
import { webCrawler } from '../lib/crawler';
import { Business } from '../lib/db/schema';
import 'dotenv/config';

const testUrl = process.argv[2] || 'https://motherearthri.com';

async function main() {
  // Crawl
  const crawlResult = await webCrawler.crawl(testUrl);
  if (!crawlResult.success) {
    console.error('Crawl failed:', crawlResult.error);
    process.exit(1);
  }
  
  const crawledData = crawlResult.data!;
  
  // Build minimal business object
  const business: Business = {
    id: 1,
    teamId: 1,
    name: crawledData.name || 'Unknown',
    url: testUrl,
    category: 'unknown',
    location: {
      city: 'Providence',
      state: 'RI',
      country: 'US',
      coordinates: { lat: 0, lng: 0 },
    },
    wikidataQID: null,
    wikidataPublishedAt: null,
    lastCrawledAt: new Date(),
    crawlData: null,
    status: 'crawled',
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  
  // Build entity
  const entity = await entityBuilder.buildEntity(business, crawledData);
  
  // Output JSON
  console.log(JSON.stringify(entity, null, 2));
}

main();

