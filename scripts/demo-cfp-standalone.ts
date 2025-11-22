#!/usr/bin/env tsx

/**
 * Standalone CFP Demo Script
 * 
 * Demonstrates the CFP flow without server-only imports for direct execution
 */

import { webCrawler } from '@/lib/crawler';
import { businessFingerprinter } from '@/lib/llm';
import { wikidataService } from '@/lib/wikidata';
import type { CrawledData } from '@/lib/types/gemflush';

// ============================================================================
// STANDALONE CFP IMPLEMENTATION
// ============================================================================

interface StandaloneCFPResult {
  success: boolean;
  url: string;
  crawlData?: CrawledData;
  fingerprintAnalysis?: any;
  entity?: any;
  processingTime: number;
  error?: string;
}

async function runStandaloneCFP(url: string): Promise<StandaloneCFPResult> {
  const startTime = Date.now();
  
  console.log(`🚀 Starting CFP flow for: ${url}`);
  console.log('=' .repeat(60));
  
  try {
    // Phase 1: Crawl and Fingerprint in parallel
    console.log('\n📊 Phase 1: Parallel Crawl + Fingerprint');
    console.log('⏳ Starting crawl and fingerprint operations...');
    
    const [crawlResult, fingerprintResult] = await Promise.allSettled([
      // Crawl operation
      (async () => {
        console.log('🕷️  Starting website crawl...');
        const result = await webCrawler.crawl(url);
        console.log(`🕷️  Crawl ${result.success ? '✅ completed' : '❌ failed'}`);
        return result;
      })(),
      
      // Fingerprint operation
      (async () => {
        console.log('🔍 Starting fingerprint analysis...');
        const businessContext = {
          name: extractBusinessNameFromUrl(url),
          url,
          location: { city: 'Unknown', state: 'Unknown', country: 'US' },
          category: 'healthcare'
        };
        const result = await businessFingerprinter.fingerprintWithContext(businessContext);
        console.log('🔍 Fingerprint ✅ completed');
        return result;
      })()
    ]);
    
    // Process crawl results
    let crawlData: CrawledData | undefined;
    if (crawlResult.status === 'fulfilled' && crawlResult.value.success) {
      crawlData = crawlResult.value.data;
      console.log('✅ Crawl successful - extracted business data');
    } else {
      console.log('❌ Crawl failed:', crawlResult.status === 'rejected' ? crawlResult.reason : crawlResult.value.error);
    }
    
    // Process fingerprint results
    let fingerprintAnalysis: any;
    if (fingerprintResult.status === 'fulfilled') {
      fingerprintAnalysis = fingerprintResult.value;
      console.log('✅ Fingerprint successful - visibility analysis complete');
    } else {
      console.log('❌ Fingerprint failed:', fingerprintResult.reason);
    }
    
    // Phase 2: Entity Creation
    console.log('\n📊 Phase 2: Wikidata Entity Creation');
    console.log('🏗️  Creating Wikidata entity...');
    
    let entity: any = null;
    if (crawlData) {
      try {
        const businessData = createBusinessDataFromUrl(url, crawlData);
        const entityResult = await wikidataService.createAndPublishEntity(
          businessData,
          crawlData,
          {
            target: 'test',
            shouldPublish: false,
            includeReferences: true,
            maxProperties: 10,
            maxQIDs: 10,
            qualityThreshold: 0.7,
            enhanceData: true
          }
        );
        entity = entityResult.entity;
        console.log('✅ Entity creation successful');
      } catch (error) {
        console.log('❌ Entity creation failed:', error);
      }
    } else {
      console.log('⚠️  Skipping entity creation - no crawl data available');
    }
    
    const processingTime = Date.now() - startTime;
    
    return {
      success: true,
      url,
      crawlData,
      fingerprintAnalysis,
      entity,
      processingTime
    };
    
  } catch (error) {
    const processingTime = Date.now() - startTime;
    return {
      success: false,
      url,
      processingTime,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

function extractBusinessNameFromUrl(url: string): string {
  try {
    const parsedUrl = new URL(url);
    const domain = parsedUrl.hostname.replace('www.', '');
    const parts = domain.split('.');
    const mainPart = parts[0];
    return mainPart.charAt(0).toUpperCase() + mainPart.slice(1);
  } catch {
    return 'Unknown Business';
  }
}

function createBusinessDataFromUrl(url: string, crawlData?: CrawledData): any {
  const businessName = crawlData?.name || extractBusinessNameFromUrl(url);
  
  return {
    id: 0,
    name: businessName,
    url,
    category: crawlData?.businessDetails?.industry || 'healthcare',
    location: crawlData?.location || { city: 'Providence', state: 'RI', country: 'US' },
    status: 'crawled',
    crawlData,
    createdAt: new Date(),
    updatedAt: new Date()
  };
}

// ============================================================================
// RESULTS DISPLAY
// ============================================================================

function displayResults(result: StandaloneCFPResult) {
  console.log('\n📊 CFP FLOW RESULTS');
  console.log('=' .repeat(50));
  console.log(`✅ Overall Success: ${result.success}`);
  console.log(`⏱️  Total Processing Time: ${result.processingTime}ms`);
  console.log(`🌐 URL: ${result.url}`);
  
  if (result.error) {
    console.log(`❌ Error: ${result.error}`);
    return;
  }
  
  if (result.crawlData) {
    console.log('\n🕷️  CRAWL DATA:');
    console.log(`  📛 Business Name: ${result.crawlData.name || 'Not found'}`);
    console.log(`  📄 Description: ${result.crawlData.description?.substring(0, 100) || 'Not found'}${result.crawlData.description?.length > 100 ? '...' : ''}`);
    console.log(`  📍 Location: ${result.crawlData.location?.city || 'Unknown'}, ${result.crawlData.location?.state || 'Unknown'}`);
    console.log(`  📞 Phone: ${result.crawlData.phone || 'Not found'}`);
    console.log(`  📧 Email: ${result.crawlData.email || 'Not found'}`);
    console.log(`  🏷️  Services: ${result.crawlData.services?.length || 0} found`);
    if (result.crawlData.services && result.crawlData.services.length > 0) {
      console.log(`    └─ ${result.crawlData.services.slice(0, 3).join(', ')}${result.crawlData.services.length > 3 ? '...' : ''}`);
    }
  }
  
  if (result.fingerprintAnalysis) {
    console.log('\n🔍 FINGERPRINT ANALYSIS:');
    console.log(`  👁️  Visibility Score: ${result.fingerprintAnalysis.visibilityScore}/100`);
    console.log(`  📊 Mention Rate: ${(result.fingerprintAnalysis.mentionRate * 100).toFixed(1)}%`);
    console.log(`  😊 Sentiment Score: ${(result.fingerprintAnalysis.sentimentScore * 100).toFixed(1)}%`);
    console.log(`  🎯 Accuracy Score: ${(result.fingerprintAnalysis.accuracyScore * 100).toFixed(1)}%`);
    console.log(`  🏆 Competitors: ${result.fingerprintAnalysis.competitiveLeaderboard?.competitors?.length || 0} found`);
  }
  
  if (result.entity) {
    console.log('\n🏗️  WIKIDATA ENTITY:');
    console.log(`  🆔 Entity ID: ${result.entity.id || 'Generated'}`);
    console.log(`  📝 Label: ${result.entity.labels?.en?.value || 'No label'}`);
    console.log(`  📄 Description: ${result.entity.descriptions?.en?.value || 'No description'}`);
    console.log(`  🏷️  Claims: ${Object.keys(result.entity.claims || {}).length}`);
    console.log(`  📚 References: ${Object.values(result.entity.claims || {}).reduce((acc: number, claim: any) => acc + (claim.references?.length || 0), 0)}`);
    
    // Show some key claims
    if (result.entity.claims) {
      console.log('\n  📋 Key Claims:');
      Object.entries(result.entity.claims).slice(0, 5).forEach(([pid, claim]: [string, any]) => {
        const value = claim.mainsnak?.datavalue?.value;
        if (value) {
          console.log(`    ${pid}: ${typeof value === 'string' ? value : JSON.stringify(value).substring(0, 50)}`);
        }
      });
    }
  }
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function main() {
  const url = process.argv[2];
  
  if (!url) {
    console.log('Usage: tsx scripts/demo-cfp-standalone.ts <url>');
    console.log('Example: tsx scripts/demo-cfp-standalone.ts https://brownphysicians.org');
    return;
  }
  
  console.log('🎯 CFP ORCHESTRATOR STANDALONE DEMO');
  console.log('=' .repeat(60));
  console.log(`🕒 Started at: ${new Date().toLocaleString()}`);
  console.log(`🌐 URL: ${url}`);
  
  try {
    const result = await runStandaloneCFP(url);
    displayResults(result);
  } catch (error) {
    console.error('\n💥 Demo execution failed:', error);
    process.exit(1);
  }
  
  console.log('\n🏁 Demo completed!');
}

if (require.main === module) {
  main().catch(console.error);
}
