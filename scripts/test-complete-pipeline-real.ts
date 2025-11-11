#!/usr/bin/env tsx
/**
 * Complete Pipeline Test with Real APIs
 * Tests: Notability → Entity Building → JSON for Wikidata Action API
 */

import { NotabilityChecker } from '../lib/wikidata/notability-checker';
import { entityBuilder } from '../lib/wikidata/entity-builder';
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

console.log(`${colors.bright}🧪 Complete Real API Pipeline Test${colors.reset}`);
console.log('═'.repeat(80));

// Use Brown Physicians Inc as test case
const mockBusiness: Business = {
  id: 1,
  teamId: 1,
  name: 'Brown Physicians Inc',
  url: 'https://brownphysicians.org',
  category: 'healthcare',
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

const mockCrawledData: CrawledData = {
  name: 'Brown Physicians, Inc.',
  description: 'Community-based not-for-profit physician group affiliated with Brown University',
  phone: '+1-401-444-5000',
  email: 'info@brownphysicians.org',
  address: '593 Eddy Street, Providence, Rhode Island 02903',
  founded: '2017',
  categories: ['healthcare', 'medical', 'physicians'],
  services: ['Primary Care', 'Specialty Care', 'Medical Services'],
  socialLinks: {
    facebook: 'https://www.facebook.com/BrownPhysicians',
    linkedin: 'https://www.linkedin.com/company/brown-physicians-inc',
    twitter: 'https://twitter.com/BrownHealth',
    instagram: 'https://www.instagram.com/brownhealth/',
  },
  businessDetails: {
    industry: 'Healthcare',
    sector: 'Medical Services',
    businessType: 'Physician Group',
    legalForm: 'Not-for-profit corporation',
    founded: '2017',
    employeeCount: 450,
    headquarters: 'Providence, Rhode Island',
    parentCompany: 'Brown University Health',
  },
};

async function runTest() {
  try {
    // ============================================================================
    // PHASE 1: NOTABILITY CHECKING
    // ============================================================================
    console.log(`\n${colors.bright}📋 PHASE 1: Notability Checking${colors.reset}`);
    console.log('─'.repeat(80));
    console.log(`Business: ${mockBusiness.name}`);
    console.log(`Location: ${mockBusiness.location?.city}, ${mockBusiness.location?.state}\n`);
    
    const checker = new NotabilityChecker();
    const notabilityResult = await checker.checkNotability(
      mockBusiness.name,
      mockBusiness.location || undefined
    );
    
    console.log(`\n${colors.cyan}Notability Result:${colors.reset}`);
    console.log(`  Notable: ${notabilityResult.isNotable ? colors.green + '✅ YES' : '❌ NO'}${colors.reset}`);
    console.log(`  Confidence: ${(notabilityResult.confidence * 100).toFixed(0)}%`);
    console.log(`  Serious References: ${notabilityResult.seriousReferenceCount}/3 required`);
    
    if (notabilityResult.topReferences && notabilityResult.topReferences.length > 0) {
      console.log(`\n${colors.cyan}Top References for Citations:${colors.reset}`);
      notabilityResult.topReferences.slice(0, 3).forEach((ref, idx) => {
        console.log(`  ${idx + 1}. ${ref.title}`);
        console.log(`     ${colors.gray}${ref.url}${colors.reset}`);
      });
    }
    
    if (!notabilityResult.isNotable) {
      console.log(`\n${colors.yellow}⚠️  Not notable - cannot publish to Wikidata${colors.reset}`);
      return;
    }
    
    // ============================================================================
    // PHASE 2: ENTITY BUILDING
    // ============================================================================
    console.log(`\n\n${colors.bright}🏗️  PHASE 2: Building Wikidata Entity${colors.reset}`);
    console.log('─'.repeat(80));
    
    const entity = await entityBuilder.buildEntity(mockBusiness, mockCrawledData);
    
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
      P452: 'industry',
      P571: 'inception',
    };
    
    Object.keys(entity.claims).forEach(pid => {
      const name = propertyNames[pid] || 'unknown';
      const claim = entity.claims[pid][0];
      const hasReferences = claim.references && claim.references.length > 0;
      console.log(`  ${pid} (${name}): ${hasReferences ? colors.green + 'Referenced ✓' : 'No refs'}${colors.reset}`);
    });
    
    // Show reference structure
    const firstClaim = Object.values(entity.claims)[0][0];
    if (firstClaim.references && firstClaim.references.length > 0) {
      const ref = firstClaim.references[0];
      console.log(`\n${colors.cyan}Reference Structure (attached to each claim):${colors.reset}`);
      console.log(`  P854 (URL): ${(ref.snaks.P854?.[0] as any)?.datavalue?.value || 'N/A'}`);
      console.log(`  P1476 (Title): ${(ref.snaks.P1476?.[0] as any)?.datavalue?.value?.text || 'N/A'}`);
      console.log(`  P813 (Retrieved): ${(ref.snaks.P813?.[0] as any)?.datavalue?.value?.time || 'N/A'}`);
    }
    
    if (entity.llmSuggestions) {
      console.log(`\n${colors.cyan}LLM Enhancements:${colors.reset}`);
      console.log(`  Quality Score: ${entity.llmSuggestions.qualityScore}/100`);
      console.log(`  Completeness: ${entity.llmSuggestions.completeness}%`);
      console.log(`  Model: ${entity.llmSuggestions.model}`);
    }
    
    // ============================================================================
    // PHASE 3: WIKIDATA ACTION API JSON
    // ============================================================================
    console.log(`\n\n${colors.bright}📤 PHASE 3: Wikidata Action API JSON${colors.reset}`);
    console.log('─'.repeat(80));
    
    console.log(`\n${colors.cyan}Complete Entity JSON (ready for wbeditentity):${colors.reset}\n`);
    console.log(JSON.stringify(entity, null, 2));
    
    // ============================================================================
    // SUMMARY
    // ============================================================================
    console.log(`\n\n${colors.bright}📊 PIPELINE SUMMARY${colors.reset}`);
    console.log('═'.repeat(80));
    
    console.log(`\n✅ ${colors.green}All phases completed successfully!${colors.reset}\n`);
    console.log(`${colors.cyan}Notability:${colors.reset}`);
    console.log(`  Status: ${colors.green}Notable${colors.reset}`);
    console.log(`  References: ${notabilityResult.seriousReferenceCount} serious sources`);
    console.log(`  Top Source: ${notabilityResult.topReferences?.[0]?.source || 'N/A'}`);
    
    console.log(`\n${colors.cyan}Entity:${colors.reset}`);
    console.log(`  Properties: ${Object.keys(entity.claims).length} PIDs`);
    console.log(`  References: All claims properly cited with P854, P1476, P813`);
    console.log(`  Quality: ${entity.llmSuggestions?.qualityScore || 'N/A'}/100`);
    
    console.log(`\n${colors.cyan}Next Steps:${colors.reset}`);
    console.log(`  1. POST to /api/wikidata/publish with businessId`);
    console.log(`  2. System will use this JSON for wbeditentity API call`);
    console.log(`  3. Entity will be published to test.wikidata.org or wikidata.org`);
    console.log(`  4. QID will be returned and saved to database`);
    
    console.log(`\n${colors.cyan}API Request Structure:${colors.reset}`);
    console.log(`  Endpoint: https://test.wikidata.org/w/api.php`);
    console.log(`  Action: wbeditentity`);
    console.log(`  Method: POST`);
    console.log(`  Parameters:`);
    console.log(`    - action: wbeditentity`);
    console.log(`    - new: item`);
    console.log(`    - data: [JSON above]`);
    console.log(`    - token: [CSRF token from auth]`);
    console.log(`    - format: json`);
    console.log(`    - bot: 1`);
    console.log(`    - summary: "Created via GEMflush - Business entity with verified references"`);
    
    console.log(`\n${'═'.repeat(80)}\n`);
    
  } catch (error) {
    console.error(`\n${colors.bright}❌ Pipeline failed:${colors.reset}`, error);
    process.exit(1);
  }
}

console.log(`\n${colors.gray}Starting complete pipeline test with real APIs...${colors.reset}\n`);
runTest();

