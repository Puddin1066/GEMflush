#!/usr/bin/env tsx
/**
 * LLM Fingerprinting Performance Comparison
 * Demonstrates parallel vs sequential execution speed
 */

import { Business } from '../lib/db/schema';
import 'dotenv/config';

// Mock the fingerprinter to show performance difference
async function mockQuery(model: string, prompt: string, delay: number): Promise<any> {
  await new Promise(resolve => setTimeout(resolve, delay));
  return {
    content: `Mock response from ${model}`,
    tokensUsed: 150,
  };
}

const businessName = 'Mother Earth Wellness';
const models = [
  'openai/gpt-4-turbo',
  'anthropic/claude-3-opus',
  'google/gemini-pro',
  'meta-llama/llama-3-70b-instruct',
  'perplexity/pplx-70b-online',
];
const promptTypes = ['factual', 'opinion', 'recommendation'];
const avgResponseTime = 3000; // 3 seconds per API call

console.log('\n═══════════════════════════════════════════════════════════════════════════════');
console.log('⚡ LLM Fingerprinting Performance Comparison');
console.log('═══════════════════════════════════════════════════════════════════════════════\n');

async function demonstratePerformance() {
  const totalQueries = models.length * promptTypes.length;
  
  console.log(`Business: ${businessName}`);
  console.log(`Total queries: ${totalQueries} (${models.length} models × ${promptTypes.length} prompts)`);
  console.log(`Avg API response time: ${avgResponseTime}ms\n`);
  
  // ============================================================================
  // SEQUENTIAL (OLD METHOD)
  // ============================================================================
  console.log('─'.repeat(80));
  console.log('📦 SEQUENTIAL EXECUTION (Old Method)');
  console.log('─'.repeat(80));
  console.log('Running queries one-by-one...\n');
  
  const seqStart = Date.now();
  
  for (let i = 0; i < totalQueries; i++) {
    const model = models[Math.floor(i / promptTypes.length)];
    const promptType = promptTypes[i % promptTypes.length];
    console.log(`  ${i + 1}/${totalQueries}: ${model} - ${promptType}`);
    await mockQuery(model, promptType, avgResponseTime);
  }
  
  const seqDuration = Date.now() - seqStart;
  console.log(`\n✓ Completed in ${(seqDuration / 1000).toFixed(1)}s\n`);
  
  // ============================================================================
  // PARALLEL (NEW METHOD)
  // ============================================================================
  console.log('─'.repeat(80));
  console.log('🚀 PARALLEL EXECUTION (New Method - Default)');
  console.log('─'.repeat(80));
  console.log(`Running all ${totalQueries} queries simultaneously...\n`);
  
  const parStart = Date.now();
  
  const tasks = models.flatMap(model =>
    promptTypes.map(promptType => ({
      model,
      promptType,
    }))
  );
  
  await Promise.allSettled(
    tasks.map((task, i) => {
      console.log(`  Launched ${i + 1}/${totalQueries}: ${task.model} - ${task.promptType}`);
      return mockQuery(task.model, task.promptType, avgResponseTime);
    })
  );
  
  const parDuration = Date.now() - parStart;
  console.log(`\n✓ Completed in ${(parDuration / 1000).toFixed(1)}s\n`);
  
  // ============================================================================
  // BATCHED (RATE-LIMITED)
  // ============================================================================
  console.log('─'.repeat(80));
  console.log('📊 BATCHED EXECUTION (Rate-Limited Option)');
  console.log('─'.repeat(80));
  console.log(`Running ${totalQueries} queries in batches of 5...\n`);
  
  const batchStart = Date.now();
  const batchSize = 5;
  
  for (let i = 0; i < tasks.length; i += batchSize) {
    const batch = tasks.slice(i, i + batchSize);
    const batchNum = Math.floor(i / batchSize) + 1;
    const totalBatches = Math.ceil(tasks.length / batchSize);
    
    console.log(`  Batch ${batchNum}/${totalBatches}: ${batch.length} queries`);
    batch.forEach((task, idx) => {
      console.log(`    ${i + idx + 1}/${totalQueries}: ${task.model} - ${task.promptType}`);
    });
    
    await Promise.allSettled(
      batch.map(task => mockQuery(task.model, task.promptType, avgResponseTime))
    );
    console.log(`  ✓ Batch ${batchNum} complete\n`);
  }
  
  const batchDuration = Date.now() - batchStart;
  console.log(`✓ Completed in ${(batchDuration / 1000).toFixed(1)}s\n`);
  
  // ============================================================================
  // COMPARISON
  // ============================================================================
  console.log('═══════════════════════════════════════════════════════════════════════════════');
  console.log('📊 PERFORMANCE COMPARISON');
  console.log('═══════════════════════════════════════════════════════════════════════════════\n');
  
  const seqSec = seqDuration / 1000;
  const parSec = parDuration / 1000;
  const batchSec = batchDuration / 1000;
  
  console.log(`Sequential:  ${seqSec.toFixed(1)}s  (100% - baseline)`);
  console.log(`Parallel:    ${parSec.toFixed(1)}s  (${((parSec / seqSec) * 100).toFixed(0)}% of sequential) ⚡ ${(seqSec / parSec).toFixed(1)}x faster`);
  console.log(`Batched (5): ${batchSec.toFixed(1)}s  (${((batchSec / seqSec) * 100).toFixed(0)}% of sequential) ⚡ ${(seqSec / batchSec).toFixed(1)}x faster`);
  
  console.log(`\n✅ Speedup with parallel: ${(seqSec / parSec).toFixed(1)}x faster (${((seqSec - parSec)).toFixed(1)}s saved)`);
  console.log(`✅ Speedup with batching: ${(seqSec / batchSec).toFixed(1)}x faster (${((seqSec - batchSec)).toFixed(1)}s saved)\n`);
  
  // ============================================================================
  // USAGE EXAMPLES
  // ============================================================================
  console.log('═══════════════════════════════════════════════════════════════════════════════');
  console.log('💡 USAGE');
  console.log('═══════════════════════════════════════════════════════════════════════════════\n');
  
  console.log('```typescript');
  console.log('import { LLMFingerprinter } from \'@/lib/llm/fingerprinter\';');
  console.log('');
  console.log('const fingerprinter = new LLMFingerprinter();');
  console.log('');
  console.log('// Parallel (default) - fastest, ~3-5s');
  console.log('const analysis1 = await fingerprinter.fingerprint(business);');
  console.log('');
  console.log('// Parallel with explicit option');
  console.log('const analysis2 = await fingerprinter.fingerprint(business, { parallel: true });');
  console.log('');
  console.log('// Batched (rate-limited) - 5 concurrent requests');
  console.log('const analysis3 = await fingerprinter.fingerprint(business, { ');
  console.log('  parallel: true, ');
  console.log('  batchSize: 5 ');
  console.log('});');
  console.log('');
  console.log('// Sequential (legacy) - slowest, ~45-60s');
  console.log('const analysis4 = await fingerprinter.fingerprint(business, { parallel: false });');
  console.log('```\n');
  
  console.log('═══════════════════════════════════════════════════════════════════════════════');
  console.log('📋 RECOMMENDATIONS');
  console.log('═══════════════════════════════════════════════════════════════════════════════\n');
  
  console.log('✅ **Parallel (default)**: Best for most use cases');
  console.log('   - Fastest execution');
  console.log('   - No API rate limits for most providers');
  console.log('   - Use: Production, real-time analysis\n');
  
  console.log('⚠️  **Batched**: Use if hitting rate limits');
  console.log('   - Controlled concurrency');
  console.log('   - Prevents API throttling');
  console.log('   - Use: High-volume processing, strict rate limits\n');
  
  console.log('❌ **Sequential**: Avoid unless required');
  console.log('   - 10-15x slower than parallel');
  console.log('   - Only for debugging or API requirements');
  console.log('   - Use: Development/testing only\n');
}

demonstratePerformance();

