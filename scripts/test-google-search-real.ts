#!/usr/bin/env tsx
/**
 * Test Google Custom Search API with REAL data
 * This demonstrates the notability checker's Google Search integration
 */

import { NotabilityChecker } from '../lib/wikidata/notability-checker';
import 'dotenv/config';

const businessName = process.argv[2] || 'Stripe Inc';

console.log('🔍 Testing REAL Google Custom Search API');
console.log('='.repeat(70));
console.log(`\n🎯 Searching for: "${businessName}"`);
console.log(`📡 Using API Key: ${process.env.GOOGLE_SEARCH_API_KEY?.substring(0, 20)}...`);
console.log(`🔧 Search Engine ID: ${process.env.GOOGLE_SEARCH_ENGINE_ID}\n`);

async function test() {
  if (!process.env.GOOGLE_SEARCH_API_KEY || !process.env.GOOGLE_SEARCH_ENGINE_ID) {
    console.log('❌ Missing API credentials!');
    console.log('   Set GOOGLE_SEARCH_API_KEY and GOOGLE_SEARCH_ENGINE_ID in .env');
    process.exit(1);
  }

  const checker = new NotabilityChecker();
  
  console.log('⏳ Checking notability (Google Search + LLM assessment)...\n');
  const startTime = Date.now();
  
  try {
    const result = await checker.checkNotability(businessName);
    const duration = Date.now() - startTime;
    
    console.log('═'.repeat(70));
    console.log(`\n✅ Notability check completed in ${duration}ms\n`);
    
    // Overall Result
    console.log('📊 NOTABILITY ASSESSMENT:\n');
    console.log(`   Notable for Wikidata: ${result.isNotable ? '✅ YES' : '❌ NO'}`);
    console.log(`   Confidence: ${(result.confidence * 100).toFixed(1)}%`);
    console.log(`   Serious References: ${result.seriousReferenceCount}/3 required`);
    
    // Reasons
    if (result.reasons.length > 0) {
      console.log(`\n📝 Reasoning:`);
      result.reasons.forEach(reason => {
        console.log(`   • ${reason}`);
      });
    }
    
    // Top References
    if (result.topReferences && result.topReferences.length > 0) {
      console.log(`\n📚 Top ${result.topReferences.length} References Found:\n`);
      result.topReferences.forEach((ref, idx) => {
        console.log(`   ${idx + 1}. ${ref.title}`);
        console.log(`      URL: ${ref.url}`);
        console.log(`      Snippet: ${ref.snippet?.substring(0, 100)}...`);
        console.log('');
      });
    }
    
    // Wikidata Compliance
    console.log('═'.repeat(70));
    console.log('\n🎓 Wikidata Notability Policy:');
    console.log('   Requires 3+ "serious" references from:');
    console.log('   • News organizations');
    console.log('   • Academic publications');
    console.log('   • Government sources');
    console.log('   • Industry publications');
    console.log('   • Books');
    console.log('');
    console.log(`   This business: ${result.isNotable ? '✅ Meets standards' : '❌ Needs more references'}`);
    
    if (result.isNotable) {
      console.log('\n✨ Ready for Wikidata publishing!');
    } else {
      console.log('\n⚠️  Not ready for Wikidata - needs more credible references');
    }
    
    console.log('\n' + '═'.repeat(70) + '\n');
    
  } catch (error: any) {
    console.error('\n❌ Test failed:', error.message);
    if (error.message.includes('API key not valid')) {
      console.log('\n💡 Check your GOOGLE_SEARCH_API_KEY in .env');
    }
    process.exit(1);
  }
}

console.log('Starting notability check...\n');
test();

