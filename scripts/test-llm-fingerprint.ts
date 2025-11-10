#!/usr/bin/env tsx
// Test script to demonstrate LLM fingerprinting logic

import { llmFingerprinter } from '../lib/llm/fingerprinter';
import { Business } from '../lib/db/schema';

// Mock business data
const mockBusiness: Business = {
  id: 1,
  teamId: 1,
  name: 'Acme Coffee Roasters',
  url: 'https://acmecoffee.com',
  category: 'restaurant',
  location: {
    city: 'San Francisco',
    state: 'CA',
    country: 'US',
    coordinates: {
      lat: 37.7749,
      lng: -122.4194,
    },
  },
  wikidataQID: null,
  wikidataPublishedAt: null,
  lastCrawledAt: null,
  crawlData: null,
  status: 'crawled',
  createdAt: new Date(),
  updatedAt: new Date(),
};

console.log('🔍 GEMFlush - LLM Fingerprinting Test\n');
console.log('=' .repeat(80));
console.log('\n📋 Business to Fingerprint:');
console.log('  Name:', mockBusiness.name);
console.log('  Location:', `${mockBusiness.location?.city}, ${mockBusiness.location?.state}`);
console.log('  Category:', mockBusiness.category);

console.log('\n' + '='.repeat(80));
console.log('🤖 Running LLM Fingerprint Analysis...');
console.log('   (Using mock responses for demonstration)\n');

async function runTest() {
  try {
    const analysis = await llmFingerprinter.fingerprint(mockBusiness);

    console.log('✅ Fingerprint Analysis Complete!\n');
    console.log('=' .repeat(80));
    console.log('📊 OVERALL RESULTS:\n');
    console.log('  🎯 Visibility Score:', analysis.visibilityScore, '/ 100');
    console.log('  📢 Mention Rate:', (analysis.mentionRate * 100).toFixed(1) + '%');
    console.log('  😊 Sentiment Score:', (analysis.sentimentScore * 100).toFixed(1) + '%');
    console.log('  ✓ Accuracy Score:', (analysis.accuracyScore * 100).toFixed(1) + '%');
    
    if (analysis.avgRankPosition) {
      console.log('  🏆 Avg Rank Position:', analysis.avgRankPosition.toFixed(1));
    }

    console.log('\n' + '='.repeat(80));
    console.log('🤖 LLM-by-LLM Breakdown:\n');

    // Group results by model
    const modelResults: Record<string, any[]> = {};
    analysis.llmResults.forEach(result => {
      if (!modelResults[result.model]) {
        modelResults[result.model] = [];
      }
      modelResults[result.model].push(result);
    });

    Object.entries(modelResults).forEach(([model, results]) => {
      const modelName = model.split('/')[1] || model;
      console.log(`\n  📱 ${modelName.toUpperCase()}`);
      
      results.forEach(result => {
        const icon = result.mentioned ? '✅' : '❌';
        const sentimentIcons = {
          positive: '😊',
          neutral: '😐',
          negative: '☹️',
        };
        
        console.log(`    ${icon} ${result.promptType}:`);
        console.log(`       Mentioned: ${result.mentioned ? 'Yes' : 'No'}`);
        console.log(`       Sentiment: ${sentimentIcons[result.sentiment as keyof typeof sentimentIcons]} ${result.sentiment}`);
        if (result.rankPosition) {
          console.log(`       Rank: #${result.rankPosition}`);
        }
        console.log(`       Tokens: ${result.tokensUsed}`);
      });
    });

    console.log('\n' + '='.repeat(80));
    console.log('📈 Score Breakdown (How we calculate 0-100):\n');
    console.log('  Formula: (MentionRate × 40) + (Sentiment × 30) + (Accuracy × 20) + (Rank × 10)');
    console.log('');
    console.log(`  Mention Rate:    ${(analysis.mentionRate * 100).toFixed(1)}% × 40 = ${(analysis.mentionRate * 40).toFixed(1)} points`);
    console.log(`  Sentiment Score: ${(analysis.sentimentScore * 100).toFixed(1)}% × 30 = ${(analysis.sentimentScore * 30).toFixed(1)} points`);
    console.log(`  Accuracy Score:  ${(analysis.accuracyScore * 100).toFixed(1)}% × 20 = ${(analysis.accuracyScore * 20).toFixed(1)} points`);
    
    const rankPoints = analysis.avgRankPosition 
      ? Math.max(0, (6 - analysis.avgRankPosition) / 5 * 10)
      : 5;
    console.log(`  Rank Position:   ${rankPoints.toFixed(1)} points`);
    console.log(`  ${'─'.repeat(50)}`);
    console.log(`  TOTAL:           ${analysis.visibilityScore} / 100`);

    console.log('\n' + '='.repeat(80));
    console.log('📊 Sample LLM Responses:\n');

    // Show a couple of example responses
    const sampleResponses = analysis.llmResults.slice(0, 2);
    sampleResponses.forEach((result, idx) => {
      console.log(`  Example ${idx + 1}: ${result.model} - ${result.promptType}`);
      console.log(`  Response: "${result.rawResponse.substring(0, 150)}..."`);
      console.log('');
    });

    console.log('=' .repeat(80));
    console.log('\n📦 Full Analysis JSON:\n');
    
    // Create a clean version for JSON output
    const outputData = {
      visibilityScore: analysis.visibilityScore,
      mentionRate: analysis.mentionRate,
      sentimentScore: analysis.sentimentScore,
      accuracyScore: analysis.accuracyScore,
      avgRankPosition: analysis.avgRankPosition,
      llmResultsSummary: {
        totalQueries: analysis.llmResults.length,
        mentioned: analysis.llmResults.filter(r => r.mentioned).length,
        positive: analysis.llmResults.filter(r => r.sentiment === 'positive').length,
        neutral: analysis.llmResults.filter(r => r.sentiment === 'neutral').length,
        negative: analysis.llmResults.filter(r => r.sentiment === 'negative').length,
      },
      modelsTested: [...new Set(analysis.llmResults.map(r => r.model))],
      promptTypes: ['factual', 'opinion', 'recommendation'],
    };

    console.log(JSON.stringify(outputData, null, 2));

    console.log('\n' + '='.repeat(80));
    console.log('\n✨ LLM Fingerprinting test completed!\n');
    console.log('💡 This data would be stored in the llm_fingerprints table');
    console.log('   and displayed on the user dashboard.\n');

  } catch (error) {
    console.error('❌ Error running fingerprint:', error);
    process.exit(1);
  }
}

runTest();

