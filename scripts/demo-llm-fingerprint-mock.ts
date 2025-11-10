#!/usr/bin/env tsx
/**
 * END-TO-END DEMONSTRATION: LLM Fingerprinting (Mock Mode)
 * Input: Business name + location
 * Output: Complete LLM visibility analysis structure
 * 
 * Note: Uses mock data to demonstrate structure without expensive API calls
 * For real API calls, use the actual fingerprinter service
 */

import { Business } from '../lib/db/schema';
import { FingerprintAnalysis, LLMResult } from '../lib/types/gemflush';
import 'dotenv/config';

const businessName = process.argv[2] || 'Mother Earth Wellness';
const city = process.argv[3] || 'Providence';
const state = process.argv[4] || 'RI';

console.log('\n═══════════════════════════════════════════════════════════════════════════════');
console.log('🔍 END-TO-END DEMONSTRATION: LLM Fingerprinting');
console.log('═══════════════════════════════════════════════════════════════════════════════\n');
console.log(`📥 INPUT:`);
console.log(`   Business: ${businessName}`);
console.log(`   Location: ${city}, ${state}\n`);

async function demo() {
  try {
    // Simulate the business object
    const business: Business = {
      id: 1,
      teamId: 1,
      name: businessName,
      url: 'https://motherearthri.com',
      category: 'dispensary',
      location: {
        city,
        state,
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
    
    console.log('⏳ Simulating LLM fingerprinting across 5 models with 3 prompt types...');
    console.log('   Models: GPT-4 Turbo, Claude 3 Opus, Gemini Pro, Llama 3 70B, Perplexity');
    console.log('   Prompts: Factual, Opinion, Recommendation\n');
    
    // Generate mock results that demonstrate the structure
    const models = [
      'openai/gpt-4-turbo',
      'anthropic/claude-3-opus',
      'google/gemini-pro',
      'meta-llama/llama-3-70b-instruct',
      'perplexity/pplx-70b-online',
    ];
    
    const promptTypes = ['factual', 'opinion', 'recommendation'];
    
    const llmResults: LLMResult[] = [];
    
    // Simulate realistic results
    models.forEach((model, modelIdx) => {
      promptTypes.forEach((promptType, promptIdx) => {
        const mentioned = Math.random() > 0.3; // 70% mention rate
        const sentiment: 'positive' | 'neutral' | 'negative' = 
          mentioned ? (Math.random() > 0.2 ? 'positive' : 'neutral') : 'neutral';
        const accuracy = mentioned ? 0.6 + Math.random() * 0.3 : 0;
        const rankPosition = promptType === 'recommendation' && mentioned 
          ? Math.floor(Math.random() * 5) + 1 
          : null;
        
        llmResults.push({
          model,
          promptType,
          mentioned,
          sentiment,
          accuracy,
          rankPosition,
          rawResponse: mentioned
            ? `Based on available information, ${businessName} is a ${business.category} located in ${city}, ${state}. ${
                sentiment === 'positive' 
                  ? 'They have a good reputation in the local community.' 
                  : 'They appear to be a legitimate business.'
              }`
            : `I don't have specific information about ${businessName} in my knowledge base.`,
          tokensUsed: 150 + Math.floor(Math.random() * 100),
        });
      });
    });
    
    // Calculate metrics
    const mentionCount = llmResults.filter(r => r.mentioned).length;
    const mentionRate = (mentionCount / llmResults.length) * 100;
    const visibilityScore = mentionRate * 0.8; // Weighted score
    
    const sentimentScores = { positive: 1, neutral: 0.5, negative: 0 };
    const avgSentiment = llmResults
      .map(r => sentimentScores[r.sentiment])
      .reduce((sum, score) => sum + score, 0) / llmResults.length;
    
    const avgAccuracy = llmResults
      .reduce((sum, r) => sum + r.accuracy, 0) / llmResults.length;
    
    const analysis: FingerprintAnalysis = {
      businessId: business.id,
      businessName: business.name,
      llmResults,
      metrics: {
        visibilityScore,
        mentionRate,
        avgSentiment: avgSentiment > 0.7 ? 'positive' : avgSentiment > 0.4 ? 'neutral' : 'negative',
        avgAccuracy,
      },
      generatedAt: new Date(),
    };
    
    console.log('✅ Fingerprinting complete\n');
    
    // Output
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
    console.log(`  Visibility Score: ${analysis.metrics.visibilityScore.toFixed(1)}%`);
    console.log(`  Mention Rate: ${analysis.metrics.mentionRate.toFixed(1)}%`);
    console.log(`  Avg Sentiment: ${analysis.metrics.avgSentiment}`);
    console.log(`  Avg Accuracy: ${(analysis.metrics.avgAccuracy * 100).toFixed(1)}%`);
    
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
    
    console.log(`\nRankings (in recommendation prompts):`);
    const rankings = analysis.llmResults
      .filter(r => r.promptType === 'recommendation' && r.rankPosition !== null)
      .sort((a, b) => (a.rankPosition || 999) - (b.rankPosition || 999));
    
    if (rankings.length > 0) {
      rankings.forEach(r => {
        console.log(`  • ${r.model}: #${r.rankPosition}`);
      });
    } else {
      console.log(`  Not ranked by any model`);
    }
    
    console.log(`\nTotal API Calls: ${analysis.llmResults.length} (5 models × 3 prompts)`);
    console.log(`Total Tokens Used: ${analysis.llmResults.reduce((sum, r) => sum + r.tokensUsed, 0).toLocaleString()}`);
    
    console.log(`\n✅ This analysis reveals the business's visibility across major LLMs`);
    console.log(`   Use cases:`);
    console.log(`   • SEO & Digital Marketing Strategy`);
    console.log(`   • Reputation Monitoring`);
    console.log(`   • Competitive Analysis`);
    console.log(`   • LLM Training Data Assessment`);
    console.log(`   • Before/After Wikidata Publication Comparison\n`);
    
    console.log(`💡 To run with REAL API calls:`);
    console.log(`   import { LLMFingerprinter } from '../lib/llm/fingerprinter';`);
    console.log(`   const fingerprinter = new LLMFingerprinter();`);
    console.log(`   const analysis = await fingerprinter.fingerprint(business);\n`);
    
  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  }
}

demo();

