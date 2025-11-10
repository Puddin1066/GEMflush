#!/usr/bin/env tsx
/**
 * Real Data Flow Test
 * Tests the complete GEMflush pipeline with real APIs
 * 
 * Required Environment Variables:
 * - OPENROUTER_API_KEY: For LLM queries
 * - GOOGLE_SEARCH_API_KEY: For notability checking
 * - GOOGLE_SEARCH_ENGINE_ID: For Google Custom Search
 */

import { webCrawler } from '../lib/crawler';
import { entityBuilder } from '../lib/wikidata/entity-builder';
import { llmFingerprinter } from '../lib/llm/fingerprinter';
import { NotabilityChecker } from '../lib/wikidata/notability-checker';
import { Business } from '../lib/db/schema';
import 'dotenv/config';

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
};

// Check API configuration
const hasOpenRouter = !!process.env.OPENROUTER_API_KEY;
const hasGoogleSearch = !!(process.env.GOOGLE_SEARCH_API_KEY && process.env.GOOGLE_SEARCH_ENGINE_ID);

console.log(`${colors.bright}🧪 GEMflush - Real Data Flow Test${colors.reset}\n`);
console.log('═'.repeat(80));
console.log('\n📋 Configuration Check:\n');

console.log(`  ${hasOpenRouter ? '✅' : '⚠️ '} OpenRouter API: ${hasOpenRouter ? colors.green + 'Configured' : colors.yellow + 'Missing (will use mocks)'}`);
console.log(`  ${hasGoogleSearch ? '✅' : '⚠️ '} Google Search API: ${hasGoogleSearch ? colors.green + 'Configured' : colors.yellow + 'Missing (will skip notability)'}`);
console.log(colors.reset);

if (!hasOpenRouter && !hasGoogleSearch) {
  console.log(`\n${colors.yellow}⚠️  No API keys configured. Add to .env:${colors.reset}`);
  console.log(`${colors.gray}   OPENROUTER_API_KEY=your_key_here`);
  console.log(`   GOOGLE_SEARCH_API_KEY=your_key_here`);
  console.log(`   GOOGLE_SEARCH_ENGINE_ID=your_cx_id_here${colors.reset}\n`);
}

console.log('═'.repeat(80));

// Test business - use a real, well-known business for best results
const testUrl = process.argv[2] || 'https://www.openai.com';

console.log(`\n${colors.bright}🎯 Target Business:${colors.reset} ${colors.cyan}${testUrl}${colors.reset}\n`);

const mockBusiness: Business = {
  id: 999,
  teamId: 1,
  name: 'Test Business',
  url: testUrl,
  category: 'technology',
  location: null,
  wikidataQID: null,
  wikidataPublishedAt: null,
  lastCrawledAt: null,
  crawlData: null,
  status: 'pending',
  createdAt: new Date(),
  updatedAt: new Date(),
};

async function runRealDataTest() {
  try {
    // ============================================================================
    // PHASE 1: Web Crawling
    // ============================================================================
    console.log(`${colors.bright}📡 PHASE 1: Web Crawling${colors.reset}`);
    console.log('─'.repeat(80));
    
    const startCrawl = Date.now();
    console.log(`${colors.gray}⏳ Crawling ${testUrl}...${colors.reset}`);
    
    const crawlResult = await webCrawler.crawl(testUrl);
    const crawlTime = Date.now() - startCrawl;
    
    if (!crawlResult.success) {
      console.log(`${colors.red}❌ Crawl failed: ${crawlResult.error}${colors.reset}\n`);
      return;
    }
    
    console.log(`${colors.green}✅ Crawl completed in ${crawlTime}ms${colors.reset}`);
    console.log(`\n📊 Crawled Data:`);
    console.log(`   Name: ${crawlResult.data?.name || 'N/A'}`);
    console.log(`   Description: ${crawlResult.data?.description?.substring(0, 80)}...`);
    console.log(`   Phone: ${crawlResult.data?.phone || 'N/A'}`);
    console.log(`   Email: ${crawlResult.data?.email || 'N/A'}`);
    console.log(`   Social Links: ${Object.keys(crawlResult.data?.socialLinks || {}).length} platforms`);
    
    if (crawlResult.data?.businessDetails) {
      console.log(`\n   ${colors.cyan}🤖 LLM-Enhanced Data:${colors.reset}`);
      const details = crawlResult.data.businessDetails;
      if (details.industry) console.log(`      Industry: ${details.industry}`);
      if (details.founded) console.log(`      Founded: ${details.founded}`);
      if (details.employeeCount) console.log(`      Employees: ${details.employeeCount}`);
      if (details.ceo) console.log(`      CEO: ${details.ceo}`);
      console.log(`      Total fields: ${Object.keys(details).length}`);
    }
    
    // Update business with crawl data
    mockBusiness.name = crawlResult.data?.name || mockBusiness.name;
    mockBusiness.crawlData = crawlResult.data as any;
    
    // ============================================================================
    // PHASE 2: Wikidata Entity Building
    // ============================================================================
    console.log(`\n\n${colors.bright}🏗️  PHASE 2: Wikidata Entity Building${colors.reset}`);
    console.log('─'.repeat(80));
    
    const startBuild = Date.now();
    console.log(`${colors.gray}⏳ Building Wikidata entity...${colors.reset}`);
    
    const entity = await entityBuilder.buildEntity(mockBusiness, crawlResult.data);
    const buildTime = Date.now() - startBuild;
    
    console.log(`${colors.green}✅ Entity built in ${buildTime}ms${colors.reset}`);
    console.log(`\n📦 Entity Structure:`);
    console.log(`   Properties (PIDs): ${Object.keys(entity.claims).length}`);
    console.log(`   Labels: ${Object.keys(entity.labels).join(', ')}`);
    console.log(`   Descriptions: ${Object.keys(entity.descriptions).join(', ')}`);
    
    console.log(`\n   Property Breakdown:`);
    const propertyNames: Record<string, string> = {
      P31: 'instance of',
      P856: 'official website',
      P625: 'coordinate location',
      P1448: 'official name',
      P1329: 'phone number',
      P6375: 'street address',
      P452: 'industry',
      P571: 'inception',
      P1454: 'legal form',
      P159: 'headquarters',
      P1128: 'employees',
      P749: 'parent org',
      P169: 'CEO',
    };
    
    Object.keys(entity.claims).forEach(pid => {
      const name = propertyNames[pid] || 'unknown';
      console.log(`      ${pid} (${name})`);
    });
    
    if (entity.llmSuggestions) {
      console.log(`\n   ${colors.cyan}🤖 LLM Suggestions:${colors.reset}`);
      console.log(`      Quality Score: ${entity.llmSuggestions.qualityScore}/100`);
      console.log(`      Completeness: ${entity.llmSuggestions.completeness}%`);
    }
    
    // Validate notability
    const notabilityCheck = entityBuilder.validateNotability(entity);
    console.log(`\n   Notability: ${notabilityCheck.isNotable ? colors.green + '✅ Meets standards' : colors.red + '❌ Does not meet standards'}${colors.reset}`);
    if (!notabilityCheck.isNotable) {
      notabilityCheck.reasons.forEach(r => console.log(`      - ${r}`));
    }
    
    // ============================================================================
    // PHASE 3: Notability Checking (if configured)
    // ============================================================================
    if (hasGoogleSearch) {
      console.log(`\n\n${colors.bright}🔍 PHASE 3: Notability Checking${colors.reset}`);
      console.log('─'.repeat(80));
      
      const startNotability = Date.now();
      console.log(`${colors.gray}⏳ Checking notability with Google Search + LLM...${colors.reset}`);
      
      const notabilityChecker = new NotabilityChecker();
      const notabilityResult = await notabilityChecker.checkNotability(
        mockBusiness.name,
        mockBusiness.location || undefined
      );
      const notabilityTime = Date.now() - startNotability;
      
      console.log(`${colors.green}✅ Notability check completed in ${notabilityTime}ms${colors.reset}`);
      console.log(`\n📊 Notability Assessment:`);
      console.log(`   Notable: ${notabilityResult.isNotable ? colors.green + 'Yes ✅' : colors.red + 'No ❌'}${colors.reset}`);
      console.log(`   Confidence: ${(notabilityResult.confidence * 100).toFixed(1)}%`);
      console.log(`   Serious References: ${notabilityResult.seriousReferenceCount}/3 required`);
      
      if (notabilityResult.reasons.length > 0) {
        console.log(`\n   Reasons:`);
        notabilityResult.reasons.forEach(r => console.log(`      - ${r}`));
      }
      
      if (notabilityResult.topReferences.length > 0) {
        console.log(`\n   Top References:`);
        notabilityResult.topReferences.slice(0, 3).forEach((ref, idx) => {
          console.log(`      ${idx + 1}. ${ref.title}`);
          console.log(`         ${colors.gray}${ref.url}${colors.reset}`);
        });
      }
    } else {
      console.log(`\n\n${colors.yellow}⚠️  PHASE 3: Notability Checking - SKIPPED${colors.reset}`);
      console.log('─'.repeat(80));
      console.log(`   ${colors.gray}Google Search API not configured${colors.reset}`);
    }
    
    // ============================================================================
    // PHASE 4: LLM Fingerprinting (if configured)
    // ============================================================================
    if (hasOpenRouter) {
      console.log(`\n\n${colors.bright}🔬 PHASE 4: LLM Fingerprinting${colors.reset}`);
      console.log('─'.repeat(80));
      
      const startFingerprint = Date.now();
      console.log(`${colors.gray}⏳ Querying 5 LLMs with 3 prompt types (15 queries)...${colors.reset}`);
      
      const fingerprintResult = await llmFingerprinter.fingerprint(mockBusiness);
      const fingerprintTime = Date.now() - startFingerprint;
      
      console.log(`${colors.green}✅ Fingerprinting completed in ${fingerprintTime}ms${colors.reset}`);
      console.log(`\n📊 Fingerprint Results:`);
      console.log(`   Visibility Score: ${colors.bright}${fingerprintResult.visibilityScore}/100${colors.reset}`);
      console.log(`   Mention Rate: ${(fingerprintResult.mentionRate * 100).toFixed(1)}%`);
      console.log(`   Sentiment: ${(fingerprintResult.sentimentScore * 100).toFixed(1)}%`);
      console.log(`   Accuracy: ${(fingerprintResult.accuracyScore * 100).toFixed(1)}%`);
      
      // Group by model
      const modelResults: Record<string, any[]> = {};
      fingerprintResult.llmResults.forEach(result => {
        const model = result.model.split('/')[1] || result.model;
        if (!modelResults[model]) modelResults[model] = [];
        modelResults[model].push(result);
      });
      
      console.log(`\n   Model Breakdown:`);
      Object.entries(modelResults).forEach(([model, results]) => {
        const mentions = results.filter(r => r.mentioned).length;
        console.log(`      ${model}: ${mentions}/${results.length} mentioned`);
      });
    } else {
      console.log(`\n\n${colors.yellow}⚠️  PHASE 4: LLM Fingerprinting - SKIPPED${colors.reset}`);
      console.log('─'.repeat(80));
      console.log(`   ${colors.gray}OpenRouter API not configured${colors.reset}`);
    }
    
    // ============================================================================
    // Summary
    // ============================================================================
    console.log(`\n\n${colors.bright}📊 COMPLETE PIPELINE SUMMARY${colors.reset}`);
    console.log('═'.repeat(80));
    console.log(`\n✅ ${colors.green}Success!${colors.reset} All configured phases completed.\n`);
    
    console.log(`${colors.gray}Data extracted from: ${testUrl}${colors.reset}`);
    console.log(`${colors.gray}Ready for Wikidata publishing via API route: POST /api/wikidata/publish${colors.reset}`);
    
    console.log('\n═'.repeat(80));
    console.log(`\n${colors.bright}💡 Next Steps:${colors.reset}`);
    console.log(`   1. Add this business to your database`);
    console.log(`   2. View on dashboard at /dashboard/businesses`);
    console.log(`   3. Publish to Wikidata (requires auth)`);
    
    if (!hasOpenRouter || !hasGoogleSearch) {
      console.log(`\n${colors.yellow}⚠️  To test with full LLM capabilities, add missing API keys to .env${colors.reset}`);
    }
    
    console.log('\n');
    
  } catch (error) {
    console.error(`\n${colors.red}❌ Test failed:${colors.reset}`, error);
    process.exit(1);
  }
}

// Run the test
console.log(`${colors.gray}Starting real data flow test...${colors.reset}\n`);
runRealDataTest();

