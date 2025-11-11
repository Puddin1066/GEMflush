#!/usr/bin/env tsx
/**
 * END-TO-END DEMONSTRATION: LLM Fingerprinting
 * Input: Business name + location
 * Output: Complete LLM visibility analysis across 5 models
 */

import { LLMFingerprinter } from '../lib/llm/fingerprinter';
import { webCrawler } from '../lib/crawler';
import { Business } from '../lib/db/schema';
import 'dotenv/config';

const url = process.argv[2] || 'https://motherearthri.com';

console.log('\n═══════════════════════════════════════════════════════════════════════════════');
console.log('🔍 END-TO-END DEMONSTRATION: LLM Fingerprinting');
console.log('═══════════════════════════════════════════════════════════════════════════════\n');
console.log(`📥 INPUT: ${url}\n`);

async function demo() {
  try {
    // Step 1: Crawl to get business name
    console.log('⏳ Crawling website to extract business name...');
    const crawlResult = await webCrawler.crawl(url);
    if (!crawlResult.success) throw new Error(`Crawl failed: ${crawlResult.error}`);
    const crawledData = crawlResult.data!;
    console.log(`✅ Business: ${crawledData.name}\n`);
    
    // Step 2: Build business object
    const business: Business = {
      id: 1,
      teamId: 1,
      name: crawledData.name || 'Unknown',
      url: url,
      category: 'dispensary',
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
    
    // Step 3: Run LLM fingerprinting
    console.log('⏳ Running LLM fingerprinting across 5 models with 3 prompt types...');
    console.log('   Models: GPT-4 Turbo, Claude 3 Opus, Gemini Pro, Llama 3 70B, Perplexity\n');
    
    const fingerprinter = new LLMFingerprinter();
    const analysis = await fingerprinter.fingerprint(business);
    
    console.log('✅ Fingerprinting complete\n');
    
    // Step 4: Output
    console.log('═══════════════════════════════════════════════════════════════════════════════');
    console.log('📤 OUTPUT: LLM Fingerprint Analysis');
    console.log('═══════════════════════════════════════════════════════════════════════════════\n');
    
    console.log(JSON.stringify(analysis, null, 2));
    
    console.log('\n═══════════════════════════════════════════════════════════════════════════════');
    console.log('📊 SUMMARY');
    console.log('═══════════════════════════════════════════════════════════════════════════════\n');
    
    console.log(`Business: ${business.name}`);
    console.log(`Location: ${business.location?.city}, ${business.location?.state}`);
    console.log(`\nOverall Metrics:`);
    console.log(`  Visibility Score: ${analysis.visibilityScore.toFixed(1)}%`);
    console.log(`  Mention Rate: ${analysis.mentionRate.toFixed(1)}%`);
    console.log(`  Sentiment Score: ${analysis.sentimentScore.toFixed(1)}%`);
    console.log(`  Accuracy: ${analysis.accuracyScore.toFixed(1)}%`);
    
    console.log(`\nPer-Model Breakdown:`);
    const modelStats = new Map<string, { mentions: number; total: number }>();
    
    analysis.llmResults.forEach(result => {
      if (!modelStats.has(result.model)) {
        modelStats.set(result.model, { mentions: 0, total: 0 });
      }
      const stats = modelStats.get(result.model)!;
      stats.total++;
      if (result.mentioned) stats.mentions++;
    });
    
    modelStats.forEach((stats, model) => {
      const rate = (stats.mentions / stats.total * 100).toFixed(0);
      const icon = stats.mentions > 0 ? '✅' : '❌';
      console.log(`  ${icon} ${model}: ${stats.mentions}/${stats.total} prompts (${rate}%)`);
    });
    
    console.log(`\nPer-Prompt Type Breakdown:`);
    const promptStats = new Map<string, { mentions: number; total: number }>();
    
    analysis.llmResults.forEach(result => {
      if (!promptStats.has(result.promptType)) {
        promptStats.set(result.promptType, { mentions: 0, total: 0 });
      }
      const stats = promptStats.get(result.promptType)!;
      stats.total++;
      if (result.mentioned) stats.mentions++;
    });
    
    promptStats.forEach((stats, promptType) => {
      const rate = (stats.mentions / stats.total * 100).toFixed(0);
      const icon = stats.mentions > 0 ? '✅' : '❌';
      console.log(`  ${icon} ${promptType}: ${stats.mentions}/${stats.total} models (${rate}%)`);
    });
    
    console.log(`\nRankings (when mentioned in recommendation prompts):`);
    const rankings = analysis.llmResults
      .filter(r => r.promptType === 'recommendation' && r.rankPosition !== null)
      .map(r => `${r.model}: #${r.rankPosition}`)
      .join(', ');
    console.log(`  ${rankings || 'Not ranked by any model'}`);
    
    console.log(`\nTotal API Calls: ${analysis.llmResults.length} (5 models × 3 prompts)`);
    console.log(`Total Tokens Used: ${analysis.llmResults.reduce((sum, r) => sum + r.tokensUsed, 0).toLocaleString()}`);
    
    console.log(`\n✅ This analysis reveals the business's visibility across major LLMs`);
    console.log(`   Use cases: SEO strategy, reputation monitoring, competitive analysis\n`);
    
  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  }
}

demo();

