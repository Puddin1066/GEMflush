#!/usr/bin/env tsx
/**
 * END-TO-END DEMONSTRATION
 * Input: Single URL
 * Output: Rich Wikidata JSON Entity
 */

import { NotabilityChecker } from '../lib/wikidata/notability-checker';
import { entityBuilder } from '../lib/wikidata/entity-builder';
import { webCrawler } from '../lib/crawler';
import { Business } from '../lib/db/schema';
import 'dotenv/config';

const url = process.argv[2] || 'https://motherearthri.com';

console.log('\n═══════════════════════════════════════════════════════════════════════════════');
console.log('🚀 END-TO-END DEMONSTRATION: URL → Wikidata JSON Entity');
console.log('═══════════════════════════════════════════════════════════════════════════════\n');
console.log(`📥 INPUT: ${url}\n`);

async function demo() {
  try {
    // Step 1: Crawl
    console.log('⏳ Crawling website...');
    const crawlResult = await webCrawler.crawl(url);
    if (!crawlResult.success) throw new Error(`Crawl failed: ${crawlResult.error}`);
    const crawledData = crawlResult.data!;
    console.log(`✅ Extracted: ${crawledData.name}\n`);
    
    // Step 2: Build entity
    console.log('⏳ Building Wikidata entity with LLM enhancement and QID resolution...');
    const business: Business = {
      id: 1,
      teamId: 1,
      name: crawledData.name || 'Unknown',
      url: url,
      category: 'unknown',
      location: {
        city: 'Providence',
        state: 'RI',
        country: 'US',
        coordinates: { lat: 41.8240, lng: -71.4128 },
      },
      wikidataQID: null,
      wikidataPublishedAt: null,
      lastCrawledAt: new Date(),
      crawlData: null,
      status: 'crawled',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    const entity = await entityBuilder.buildEntity(business, crawledData);
    console.log(`✅ Generated ${Object.keys(entity.claims).length} properties\n`);
    
    // Step 3: Output
    console.log('═══════════════════════════════════════════════════════════════════════════════');
    console.log('📤 OUTPUT: Wikidata JSON Entity (Ready for wbeditentity API)');
    console.log('═══════════════════════════════════════════════════════════════════════════════\n');
    
    console.log(JSON.stringify(entity, null, 2));
    
    console.log('\n═══════════════════════════════════════════════════════════════════════════════');
    console.log('📊 SUMMARY');
    console.log('═══════════════════════════════════════════════════════════════════════════════\n');
    console.log(`Name: ${entity.labels.en.value}`);
    console.log(`Properties: ${Object.keys(entity.claims).length} PIDs`);
    console.log(`Quality: ${entity.llmSuggestions?.qualityScore || 'N/A'}/100`);
    console.log(`Completeness: ${entity.llmSuggestions?.completeness || 'N/A'}%`);
    
    console.log('\nProperties Generated:');
    Object.keys(entity.claims).forEach(pid => {
      const claim = entity.claims[pid][0];
      const qid = (claim.mainsnak.datavalue?.value as any)?.id;
      const stringVal = typeof claim.mainsnak.datavalue?.value === 'string' 
        ? claim.mainsnak.datavalue.value.substring(0, 40)
        : '';
      const refs = claim.references?.length || 0;
      
      if (qid) {
        console.log(`  • ${pid} → ${qid} (${refs} refs)`);
      } else if (stringVal) {
        console.log(`  • ${pid} = "${stringVal}..." (${refs} refs)`);
      } else {
        console.log(`  • ${pid} (${refs} refs)`);
      }
    });
    
    console.log('\n✅ This JSON is ready to POST to: https://test.wikidata.org/w/api.php');
    console.log('   Action: wbeditentity, Format: json, New: item\n');
    
  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  }
}

demo();

