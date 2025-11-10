#!/usr/bin/env tsx
/**
 * Test Mother Earth RI with real APIs
 * URL: motherearthri.com
 */

import { NotabilityChecker } from '../lib/wikidata/notability-checker';
import { entityBuilder } from '../lib/wikidata/entity-builder';
import { webCrawler } from '../lib/crawler';
import { Business } from '../lib/db/schema';
import { CrawledData } from '../lib/types/gemflush';
import 'dotenv/config';

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
};

console.log(`${colors.bright}🧪 Mother Earth RI - Complete Pipeline Test${colors.reset}`);
console.log('═'.repeat(80));

const mockBusiness: Business = {
  id: 1,
  teamId: 1,
  name: 'Mother Earth',
  url: 'https://motherearthri.com',
  category: 'retail',
  location: {
    city: 'Providence',
    state: 'RI',
    country: 'US',
    coordinates: {
      lat: 41.8240,
      lng: -71.4128,
    },
  },
  wikidataQID: null,
  wikidataPublishedAt: null,
  lastCrawledAt: null,
  crawlData: null,
  status: 'pending',
  createdAt: new Date(),
  updatedAt: new Date(),
};

async function runTest() {
  try {
    // ============================================================================
    // PHASE 0: REAL WEB CRAWLING
    // ============================================================================
    console.log(`\n${colors.bright}🕷️  PHASE 0: Real Web Crawling${colors.reset}`);
    console.log('─'.repeat(80));
    console.log(`Crawling: ${mockBusiness.url}\n`);
    
    const crawlResult = await webCrawler.crawl(mockBusiness.url);
    
    if (!crawlResult.success) {
      console.error(`${colors.bright}❌ Crawl failed:${colors.reset}`, crawlResult.error);
      process.exit(1);
    }
    
    const crawledData = crawlResult.data!;
    
    console.log(`${colors.cyan}Crawled Data:${colors.reset}`);
    console.log(`  Name: ${crawledData.name || 'N/A'}`);
    console.log(`  Description: ${crawledData.description?.substring(0, 80) || 'N/A'}...`);
    console.log(`  Phone: ${crawledData.phone || 'N/A'}`);
    console.log(`  Email: ${crawledData.email || 'N/A'}`);
    console.log(`  Address: ${crawledData.address || 'N/A'}`);
    console.log(`  Founded: ${crawledData.founded || 'N/A'}`);
    if (crawledData.socialLinks) {
      const socialCount = Object.keys(crawledData.socialLinks).length;
      console.log(`  Social Media: ${socialCount} platform${socialCount !== 1 ? 's' : ''}`);
    }
    
    // ============================================================================
    // PHASE 1: NOTABILITY CHECKING
    // ============================================================================
    console.log(`\n${colors.bright}📋 PHASE 1: Notability Checking${colors.reset}`);
    console.log('─'.repeat(80));
    console.log(`Business: ${mockBusiness.name}`);
    console.log(`URL: ${mockBusiness.url}`);
    console.log(`Location: ${mockBusiness.location?.city}, ${mockBusiness.location?.state}\n`);
    
    const checker = new NotabilityChecker();
    const notabilityResult = await checker.checkNotability(
      mockBusiness.name,
      mockBusiness.location
    );
    
    console.log(`\n${colors.cyan}Notability Result:${colors.reset}`);
    console.log(`  Notable: ${notabilityResult.isNotable ? colors.green + '✅ YES' : '❌ NO'}${colors.reset}`);
    console.log(`  Confidence: ${(notabilityResult.confidence * 100).toFixed(0)}%`);
    console.log(`  Serious References: ${notabilityResult.seriousReferenceCount}/3 required`);
    
    if (notabilityResult.topReferences && notabilityResult.topReferences.length > 0) {
      console.log(`\n${colors.cyan}Top References for Citations:${colors.reset}`);
      notabilityResult.topReferences.slice(0, 5).forEach((ref, idx) => {
        console.log(`  ${idx + 1}. ${ref.title}`);
        console.log(`     ${colors.gray}${ref.url}${colors.reset}`);
      });
    }
    
    // ============================================================================
    // PHASE 2: ENTITY BUILDING
    // ============================================================================
    console.log(`\n\n${colors.bright}🏗️  PHASE 2: Building Wikidata Entity (FAST MODE)${colors.reset}`);
    console.log('─'.repeat(80));
    console.log(`${colors.yellow}⚡ Fast Mode: Skipping SPARQL for commercial speed${colors.reset}\n`);
    
    const entity = await entityBuilder.buildEntity(mockBusiness, crawledData);
    
    console.log(`\n${colors.cyan}Entity Structure:${colors.reset}`);
    console.log(`  Labels: ${Object.keys(entity.labels).join(', ')}`);
    console.log(`  Descriptions: ${Object.keys(entity.descriptions).join(', ')}`);
    console.log(`  Properties (PIDs): ${Object.keys(entity.claims).length}`);
    
    console.log(`\n${colors.cyan}Properties:${colors.reset}`);
    const propertyNames: Record<string, string> = {
      P31: 'instance of',
      P856: 'official website',
      P625: 'coordinate location',
      P1448: 'official name',
      P1329: 'phone number',
      P6375: 'street address',
      P968: 'email',
      P571: 'inception',
      P2002: 'Twitter',
      P2013: 'Facebook',
      P2003: 'Instagram',
      P4264: 'LinkedIn',
      P1128: 'employees',
      P452: 'industry',
      P1454: 'legal form',
      P159: 'headquarters',
    };
    
    Object.keys(entity.claims).forEach(pid => {
      const name = propertyNames[pid] || 'unknown';
      const claim = entity.claims[pid][0];
      const hasReferences = claim.references && claim.references.length > 0;
      
      // Show the value for interesting properties
      let valueStr = '';
      if (pid === 'P452' || pid === 'P1454' || pid === 'P159') {
        const qid = claim.mainsnak.datavalue?.value?.id;
        valueStr = qid ? ` → ${qid}` : '';
      }
      
      console.log(`  ${pid} (${name})${valueStr}: ${hasReferences ? colors.green + 'Referenced ✓' : 'No refs'}${colors.reset}`);
    });
    
    if (entity.llmSuggestions) {
      console.log(`\n${colors.cyan}LLM Enhancements:${colors.reset}`);
      console.log(`  Quality Score: ${entity.llmSuggestions.qualityScore}/100`);
      console.log(`  Completeness: ${entity.llmSuggestions.completeness}%`);
      console.log(`  Model: ${entity.llmSuggestions.model}`);
      
      if (entity.llmSuggestions.suggestedProperties.length > 0) {
        console.log(`\n${colors.cyan}LLM Suggested Properties:${colors.reset}`);
        entity.llmSuggestions.suggestedProperties.forEach(prop => {
          console.log(`  ${prop.pid}: ${prop.value} (confidence: ${(prop.confidence * 100).toFixed(0)}%)`);
        });
      }
    }
    
    // ============================================================================
    // PHASE 3: WIKIDATA ACTION API JSON
    // ============================================================================
    console.log(`\n\n${colors.bright}📤 PHASE 3: Wikidata Action API JSON${colors.reset}`);
    console.log('═'.repeat(80));
    console.log(`\n${colors.cyan}Complete JSON for wbeditentity API:${colors.reset}\n`);
    console.log(JSON.stringify(entity, null, 2));
    
    // ============================================================================
    // SUMMARY
    // ============================================================================
    console.log(`\n\n${colors.bright}📊 SUMMARY${colors.reset}`);
    console.log('═'.repeat(80));
    
    console.log(`\n${colors.cyan}Notability:${colors.reset}`);
    console.log(`  Status: ${notabilityResult.isNotable ? colors.green + 'Notable ✓' : 'Not Notable ✗'}${colors.reset}`);
    console.log(`  References: ${notabilityResult.seriousReferenceCount} serious sources`);
    console.log(`  Top Source: ${notabilityResult.topReferences?.[0]?.source || 'N/A'}`);
    
    console.log(`\n${colors.cyan}Entity Quality:${colors.reset}`);
    console.log(`  Properties: ${Object.keys(entity.claims).length} PIDs`);
    console.log(`  Quality: ${entity.llmSuggestions?.qualityScore || 'N/A'}/100`);
    console.log(`  Completeness: ${entity.llmSuggestions?.completeness || 'N/A'}%`);
    
    console.log(`\n${colors.cyan}Wikidata Action API Endpoint:${colors.reset}`);
    console.log(`  POST https://test.wikidata.org/w/api.php`);
    console.log(`  Parameters:`);
    console.log(`    action=wbeditentity`);
    console.log(`    new=item`);
    console.log(`    data=[JSON above]`);
    console.log(`    token=[CSRF token]`);
    console.log(`    format=json`);
    console.log(`    bot=1`);
    console.log(`    summary="Created via GEMflush - Cannabis dispensary entity"`);
    
    if (notabilityResult.isNotable) {
      console.log(`\n${colors.green}✅ Ready for Wikidata publishing!${colors.reset}`);
    } else {
      console.log(`\n${colors.yellow}⚠️  Not notable enough for Wikidata${colors.reset}`);
      console.log(`   Reason: ${notabilityResult.reasons[0] || 'Insufficient references'}`);
    }
    
    console.log(`\n${'═'.repeat(80)}\n`);
    
  } catch (error) {
    console.error(`\n${colors.bright}❌ Pipeline failed:${colors.reset}`, error);
    process.exit(1);
  }
}

console.log(`\n${colors.gray}Testing Mother Earth RI with real APIs...${colors.reset}\n`);
runTest();

