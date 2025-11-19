/**
 * Diagnostic Script: Compare API Data vs Component Expectations
 * 
 * This script checks:
 * 1. What data the APIs return
 * 2. What data the components expect
 * 3. Any mismatches or missing fields
 */

import { db } from '@/lib/db/drizzle';
import { businesses, llmFingerprints, wikidataEntities } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import { getBusinessById } from '@/lib/db/queries';

async function diagnoseBusinessData(businessId: number) {
  console.log(`\n🔍 Diagnosing Business ${businessId} Data Flow\n`);
  console.log('='.repeat(60));
  
  // 1. Check database record
  console.log('\n📊 DATABASE RECORD:');
  const business = await getBusinessById(businessId);
  if (!business) {
    console.error(`❌ Business ${businessId} not found in database`);
    return;
  }
  
  console.log(`✅ Business found: ${business.name}`);
  console.log(`   Status: ${business.status}`);
  console.log(`   Has crawlData: ${!!business.crawlData ? 'YES' : 'NO'}`);
  console.log(`   Has location: ${!!business.location ? 'YES' : 'NO'}`);
  console.log(`   Has wikidataQID: ${!!business.wikidataQID ? 'YES' : 'NO'}`);
  console.log(`   Last crawled: ${business.lastCrawledAt || 'Never'}`);
  
  if (business.crawlData) {
    const crawlData = business.crawlData as any;
    console.log(`\n   CrawlData fields:`);
    console.log(`     - name: ${!!crawlData.name ? 'YES' : 'NO'}`);
    console.log(`     - description: ${!!crawlData.description ? 'YES' : 'NO'}`);
    console.log(`     - phone: ${!!crawlData.phone ? 'YES' : 'NO'}`);
    console.log(`     - email: ${!!crawlData.email ? 'YES' : 'NO'}`);
    console.log(`     - location: ${!!crawlData.location ? 'YES' : 'NO'}`);
    console.log(`     - businessDetails: ${!!crawlData.businessDetails ? 'YES' : 'NO'}`);
    console.log(`     - llmEnhanced: ${!!crawlData.llmEnhanced ? 'YES' : 'NO'}`);
  }
  
  // 2. Check what API would return
  console.log(`\n🌐 API RESPONSE STRUCTURE:`);
  console.log(`   GET /api/business/${businessId} would return:`);
  console.log(`   {`);
  console.log(`     business: {`);
  console.log(`       id: ${business.id} (${typeof business.id})`);
  console.log(`       name: "${business.name}"`);
  console.log(`       status: "${business.status}"`);
  console.log(`       crawlData: ${business.crawlData ? 'present' : 'null'}`);
  console.log(`       location: ${business.location ? 'present' : 'null'}`);
  console.log(`       ...`);
  console.log(`     }`);
  console.log(`   }`);
  
  // 3. Check what hook expects
  console.log(`\n🎣 HOOK EXPECTATIONS (useBusinessDetail):`);
  console.log(`   Expected interface:`);
  console.log(`   {`);
  console.log(`     business: {`);
  console.log(`       id: number`);
  console.log(`       name: string`);
  console.log(`       url: string`);
  console.log(`       status: string`);
  console.log(`       location?: { city, state, country }`);
  console.log(`       ...`);
  console.log(`     }`);
  console.log(`   }`);
  
  // 4. Check component expectations
  console.log(`\n🎨 COMPONENT EXPECTATIONS:`);
  console.log(`   GemOverviewCard expects:`);
  console.log(`     - business.name: ✅`);
  console.log(`     - business.url: ✅`);
  console.log(`     - business.location: ${business.location ? '✅' : '❌'}`);
  console.log(`     - business.category: ${business.category ? '✅' : '❌'}`);
  console.log(`     - business.status: ✅`);
  
  // 5. Check fingerprint
  console.log(`\n🔍 FINGERPRINT DATA:`);
  const [fingerprint] = await db
    .select()
    .from(llmFingerprints)
    .where(eq(llmFingerprints.businessId, businessId))
    .orderBy(desc(llmFingerprints.createdAt))
    .limit(1);
  
  if (fingerprint) {
    console.log(`✅ Fingerprint found (ID: ${fingerprint.id})`);
    console.log(`   Visibility Score: ${fingerprint.visibilityScore}`);
    console.log(`   Has llmResults: ${!!fingerprint.llmResults ? 'YES' : 'NO'}`);
    console.log(`   Has competitiveLeaderboard: ${!!fingerprint.competitiveLeaderboard ? 'YES' : 'NO'}`);
  } else {
    console.log(`❌ No fingerprint found`);
  }
  
  // 6. Check entity
  console.log(`\n📦 WIKIDATA ENTITY DATA:`);
  const [entity] = await db
    .select()
    .from(wikidataEntities)
    .where(eq(wikidataEntities.businessId, businessId))
    .limit(1);
  
  if (entity) {
    console.log(`✅ Entity found (QID: ${entity.qid})`);
    console.log(`   Has entityData: ${!!entity.entityData ? 'YES' : 'NO'}`);
  } else {
    console.log(`❌ No entity found (may not be published yet)`);
  }
  
  // 7. Data flow analysis
  console.log(`\n📈 DATA FLOW ANALYSIS:`);
  console.log(`   1. Database → API: ${business ? '✅' : '❌'}`);
  console.log(`   2. API → Hook: ${business ? '✅' : '❌'} (needs verification)`);
  console.log(`   3. Hook → Component: ${business ? '✅' : '❌'} (needs verification)`);
  console.log(`   4. Component → Display: ${business ? '✅' : '❌'} (needs verification)`);
  
  // 8. Potential issues
  console.log(`\n⚠️  POTENTIAL ISSUES:`);
  const issues: string[] = [];
  
  if (business.status === 'error') {
    issues.push('Business status is "error" - crawl may have failed');
  }
  
  if (!business.crawlData && business.status !== 'pending') {
    issues.push('Business has no crawlData but status is not pending');
  }
  
  if (!business.location) {
    issues.push('Business has no location data - components may not display location');
  }
  
  if (!fingerprint && business.status === 'crawled') {
    issues.push('Business is crawled but has no fingerprint - fingerprint card will be empty');
  }
  
  if (issues.length === 0) {
    console.log(`   ✅ No obvious issues detected`);
  } else {
    issues.forEach((issue, i) => {
      console.log(`   ${i + 1}. ${issue}`);
    });
  }
  
  console.log(`\n${'='.repeat(60)}\n`);
}

// Run diagnosis
const businessId = process.argv[2] ? parseInt(process.argv[2]) : null;

if (!businessId) {
  console.error('Usage: pnpm tsx scripts/diagnose-page-data.ts <businessId>');
  process.exit(1);
}

diagnoseBusinessData(businessId)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Diagnosis error:', error);
    process.exit(1);
  });

