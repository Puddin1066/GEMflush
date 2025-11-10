#!/usr/bin/env tsx
/**
 * Real LLM Fingerprinting Test
 * Tests actual API calls with real business
 */

import { LLMFingerprinter } from '../lib/llm/fingerprinter';
import { webCrawler } from '../lib/crawler';
import { Business } from '../lib/db/schema';
import 'dotenv/config';

const url = process.argv[2] || 'https://motherearthri.com';

console.log('\n═══════════════════════════════════════════════════════════════════════════════');
console.log('🔍 REAL LLM FINGERPRINTING TEST');
console.log('═══════════════════════════════════════════════════════════════════════════════\n');
console.log(`📥 INPUT: ${url}\n`);

async function test() {
  try {
    // Crawl to get business name
    console.log('⏳ Step 1: Crawling website...');
    const crawlResult = await webCrawler.crawl(url);
    if (!crawlResult.success) throw new Error(`Crawl failed: ${crawlResult.error}`);
    const crawledData = crawlResult.data!;
    console.log(`✅ Business: ${crawledData.name}\n`);
    
    // Build business object
    const business: Business = {
      id: 1,
      teamId: 1,
      name: crawledData.name || 'Mother Earth Wellness',
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
    
    console.log('⏳ Step 2: Running LLM fingerprinting (15 queries in parallel)...');
    console.log('   This will take ~3-5 seconds\n');
    
    const fingerprinter = new LLMFingerprinter();
    const startTime = Date.now();
    const analysis = await fingerprinter.fingerprint(business);
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    
    console.log(`\n✅ Fingerprinting complete in ${duration}s\n`);
    
    // Display results
    console.log('═══════════════════════════════════════════════════════════════════════════════');
    console.log('📊 RESULTS');
    console.log('═══════════════════════════════════════════════════════════════════════════════\n');
    
    console.log(`Business: ${business.name}`);
    console.log(`Location: ${business.location?.city}, ${business.location?.state}`);
    console.log(`\n📈 Overall Metrics:`);
    console.log(`  Visibility Score: ${analysis.visibilityScore.toFixed(1)}%`);
    console.log(`  Mention Rate: ${analysis.mentionRate.toFixed(1)}%`);
    console.log(`  Avg Sentiment Score: ${(analysis.sentimentScore * 100).toFixed(1)}%`);
    console.log(`  Avg Accuracy: ${(analysis.accuracyScore * 100).toFixed(1)}%`);
    
    console.log(`\n🤖 Per-Model Breakdown:`);
    const modelStats = new Map<string, { mentions: number; total: number; results: any[] }>();
    
    analysis.llmResults.forEach(result => {
      if (!modelStats.has(result.model)) {
        modelStats.set(result.model, { mentions: 0, total: 0, results: [] });
      }
      const stats = modelStats.get(result.model)!;
      stats.total++;
      if (result.mentioned) stats.mentions++;
      stats.results.push(result);
    });
    
    modelStats.forEach((stats, model) => {
      const rate = (stats.mentions / stats.total * 100).toFixed(0);
      const icon = stats.mentions > 0 ? '✅' : '❌';
      console.log(`\n  ${icon} ${model}: ${stats.mentions}/${stats.total} prompts (${rate}%)`);
      
      stats.results.forEach(r => {
        const mentionIcon = r.mentioned ? '✓' : '✗';
        const sentimentEmoji = r.sentiment === 'positive' ? '😊' : r.sentiment === 'neutral' ? '😐' : '😞';
        console.log(`     ${mentionIcon} ${r.promptType}: ${sentimentEmoji} ${r.sentiment} (${(r.accuracy * 100).toFixed(0)}% accuracy)`);
        if (r.rankPosition) {
          console.log(`        Ranked #${r.rankPosition}`);
        }
      });
    });
    
    console.log(`\n💬 Per-Prompt Type Breakdown:`);
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
    
    console.log(`\n🏆 Rankings (when mentioned in recommendation prompts):`);
    const rankings = analysis.llmResults
      .filter(r => r.promptType === 'recommendation' && r.rankPosition !== null)
      .sort((a, b) => (a.rankPosition || 999) - (b.rankPosition || 999));
    
    if (rankings.length > 0) {
      rankings.forEach(r => {
        console.log(`  #${r.rankPosition} by ${r.model}`);
      });
    } else {
      console.log(`  Not ranked by any model`);
    }
    
    console.log(`\n💰 API Usage:`);
    console.log(`  Total Queries: ${analysis.llmResults.length}`);
    console.log(`  Total Tokens: ${analysis.llmResults.reduce((sum, r) => sum + r.tokensUsed, 0).toLocaleString()}`);
    console.log(`  Execution Time: ${duration}s`);
    
    console.log(`\n📝 Sample Responses:\n`);
    
    // Show one example response from each model
    const shownModels = new Set<string>();
    for (const result of analysis.llmResults) {
      if (!shownModels.has(result.model)) {
        shownModels.add(result.model);
        console.log(`  ${result.model} (${result.promptType}):`);
        const preview = result.rawResponse.substring(0, 150);
        console.log(`    "${preview}..."\n`);
        
        if (shownModels.size >= 3) break; // Show 3 examples
      }
    }
    
    console.log('\n═══════════════════════════════════════════════════════════════════════════════');
    console.log('✅ LLM Fingerprinting Complete');
    console.log('═══════════════════════════════════════════════════════════════════════════════\n');
    
  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  }
}

test();

