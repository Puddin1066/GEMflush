#!/usr/bin/env tsx

/**
 * CFP Orchestrator Demo Script
 * 
 * Demonstrates the automated CFP (Crawl, Fingerprint, Publish) flow
 * that takes a single URL and produces a complete JSON entity.
 * 
 * Usage:
 *   npm run demo:cfp <url> [options]
 *   
 * Examples:
 *   npm run demo:cfp https://example.com
 *   npm run demo:cfp https://example.com --publish --target=test
 *   npm run demo:cfp https://example.com --no-fingerprint --json-only
 */

import { executeCFPFlow, createEntityFromUrl, crawlFingerprintAndPublish } from '@/lib/services/cfp-orchestrator';
import type { CFPProgress } from '@/lib/services/cfp-orchestrator';

// ============================================================================
// DEMO CONFIGURATION
// ============================================================================

interface DemoOptions {
  url: string;
  publish?: boolean;
  target?: 'test' | 'production';
  includeFingerprint?: boolean;
  jsonOnly?: boolean;
  timeout?: number;
  verbose?: boolean;
}

// ============================================================================
// PROGRESS TRACKING
// ============================================================================

function createProgressTracker(verbose: boolean = false) {
  const startTime = Date.now();
  let lastStage = '';
  
  return (progress: CFPProgress) => {
    const elapsed = Date.now() - startTime;
    const timestamp = new Date().toLocaleTimeString();
    
    if (progress.stage !== lastStage || verbose) {
      console.log(`[${timestamp}] ${progress.stage.toUpperCase()} (${progress.progress}%): ${progress.message}`);
      lastStage = progress.stage;
    }
    
    if (verbose) {
      console.log(`  └─ Elapsed: ${elapsed}ms`);
    }
  };
}

// ============================================================================
// DEMO FUNCTIONS
// ============================================================================

/**
 * Demo 1: Simple entity creation (no publishing)
 */
async function demoEntityCreation(url: string, options: DemoOptions) {
  console.log('\n🏗️  DEMO: Entity Creation Only');
  console.log('=' .repeat(50));
  console.log(`URL: ${url}`);
  console.log(`Include Fingerprint: ${options.includeFingerprint !== false}`);
  
  const startTime = Date.now();
  
  try {
    const entity = await createEntityFromUrl(url, {
      includeFingerprint: options.includeFingerprint,
      timeout: options.timeout,
      allowMockData: true
    });
    
    const duration = Date.now() - startTime;
    
    if (entity) {
      console.log('\n✅ Entity Created Successfully!');
      console.log(`⏱️  Processing Time: ${duration}ms`);
      console.log(`📋 Entity ID: ${entity.id || 'Generated'}`);
      console.log(`📝 Label: ${entity.labels?.en?.value || 'No label'}`);
      console.log(`📄 Description: ${entity.descriptions?.en?.value || 'No description'}`);
      console.log(`🏷️  Claims: ${Object.keys(entity.claims || {}).length}`);
      
      if (options.jsonOnly) {
        console.log('\n📄 Complete Entity JSON:');
        console.log(JSON.stringify(entity, null, 2));
      }
    } else {
      console.log('\n❌ Entity Creation Failed');
    }
    
  } catch (error) {
    console.error('\n💥 Demo Failed:', error);
  }
}

/**
 * Demo 2: Full CFP flow with detailed progress
 */
async function demoFullCFPFlow(url: string, options: DemoOptions) {
  console.log('\n🚀 DEMO: Full CFP Flow');
  console.log('=' .repeat(50));
  console.log(`URL: ${url}`);
  console.log(`Publish: ${options.publish}`);
  console.log(`Target: ${options.target || 'test'}`);
  console.log(`Include Fingerprint: ${options.includeFingerprint !== false}`);
  
  const progressTracker = createProgressTracker(options.verbose);
  const startTime = Date.now();
  
  try {
    const result = await executeCFPFlow(url, {
      publishTarget: options.target,
      includeFingerprint: options.includeFingerprint,
      shouldPublish: options.publish,
      timeout: options.timeout,
      allowMockData: true
    }, progressTracker);
    
    const duration = Date.now() - startTime;
    
    console.log('\n📊 CFP FLOW RESULTS');
    console.log('=' .repeat(30));
    console.log(`✅ Overall Success: ${result.success}`);
    console.log(`⏱️  Total Processing Time: ${duration}ms`);
    console.log(`🌐 URL: ${result.url}`);
    
    if (result.partialResults) {
      console.log('\n📈 Stage Results:');
      console.log(`  🕷️  Crawl: ${result.partialResults.crawlSuccess ? '✅' : '❌'}`);
      console.log(`  🔍 Fingerprint: ${result.partialResults.fingerprintSuccess ? '✅' : '❌'}`);
      console.log(`  🏗️  Entity Creation: ${result.partialResults.entityCreationSuccess ? '✅' : '❌'}`);
      console.log(`  📤 Publishing: ${result.partialResults.publishSuccess ? '✅' : '❌'}`);
    }
    
    if (result.crawlData) {
      console.log('\n🕷️  CRAWL DATA:');
      console.log(`  📛 Business Name: ${result.crawlData.name || 'Not found'}`);
      console.log(`  📍 Location: ${result.crawlData.location?.city || 'Unknown'}, ${result.crawlData.location?.state || 'Unknown'}`);
      console.log(`  📞 Phone: ${result.crawlData.phone || 'Not found'}`);
      console.log(`  📧 Email: ${result.crawlData.email || 'Not found'}`);
      console.log(`  🏷️  Services: ${result.crawlData.services?.length || 0} found`);
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
      console.log(`  📚 References: ${Object.values(result.entity.claims || {}).reduce((acc, claim: any) => acc + (claim.references?.length || 0), 0)}`);
    }
    
    if (result.publishResult) {
      console.log('\n📤 PUBLISH RESULT:');
      console.log(`  ✅ Success: ${result.publishResult.success}`);
      console.log(`  🆔 QID: ${result.publishResult.qid || 'Not assigned'}`);
      console.log(`  🔗 URL: ${result.publishResult.url || 'Not available'}`);
      if (result.publishResult.error) {
        console.log(`  ❌ Error: ${result.publishResult.error}`);
      }
    }
    
    if (options.jsonOnly && result.entity) {
      console.log('\n📄 COMPLETE ENTITY JSON:');
      console.log(JSON.stringify(result.entity, null, 2));
    }
    
    if (result.error) {
      console.log(`\n❌ Error: ${result.error}`);
    }
    
  } catch (error) {
    console.error('\n💥 Demo Failed:', error);
  }
}

/**
 * Demo 3: Publish-enabled CFP flow
 */
async function demoPublishFlow(url: string, options: DemoOptions) {
  console.log('\n📤 DEMO: CFP Flow with Publishing');
  console.log('=' .repeat(50));
  console.log(`URL: ${url}`);
  console.log(`Target: ${options.target || 'test'}`);
  
  const progressTracker = createProgressTracker(options.verbose);
  const startTime = Date.now();
  
  try {
    const result = await crawlFingerprintAndPublish(url, {
      publishTarget: options.target,
      includeFingerprint: options.includeFingerprint,
      timeout: options.timeout,
      allowMockData: true
    }, progressTracker);
    
    const duration = Date.now() - startTime;
    
    console.log('\n📊 PUBLISH FLOW RESULTS');
    console.log('=' .repeat(30));
    console.log(`✅ Overall Success: ${result.success}`);
    console.log(`⏱️  Total Processing Time: ${duration}ms`);
    
    if (result.publishResult) {
      console.log(`📤 Published: ${result.publishResult.success ? '✅' : '❌'}`);
      console.log(`🆔 QID: ${result.publishResult.qid || 'Not assigned'}`);
      console.log(`🔗 Wikidata URL: ${result.publishResult.url || 'Not available'}`);
    }
    
    if (result.error) {
      console.log(`❌ Error: ${result.error}`);
    }
    
  } catch (error) {
    console.error('\n💥 Demo Failed:', error);
  }
}

// ============================================================================
// MAIN DEMO RUNNER
// ============================================================================

async function runDemo() {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    console.log(`
🚀 CFP Orchestrator Demo

Usage: npm run demo:cfp <url> [options]

Options:
  --publish              Enable publishing to Wikidata
  --target=<test|prod>   Publishing target (default: test)
  --no-fingerprint       Skip fingerprint analysis
  --json-only            Output only JSON entity
  --timeout=<ms>         Set timeout in milliseconds
  --verbose              Enable verbose progress logging
  --demo=<1|2|3>         Run specific demo (default: 2)

Examples:
  npm run demo:cfp https://example.com
  npm run demo:cfp https://example.com --publish --target=test
  npm run demo:cfp https://example.com --no-fingerprint --json-only
  npm run demo:cfp https://example.com --demo=1 --verbose
    `);
    return;
  }
  
  const url = args[0];
  const options: DemoOptions = {
    url,
    publish: args.includes('--publish'),
    target: args.find(arg => arg.startsWith('--target='))?.split('=')[1] as 'test' | 'production' || 'test',
    includeFingerprint: !args.includes('--no-fingerprint'),
    jsonOnly: args.includes('--json-only'),
    timeout: parseInt(args.find(arg => arg.startsWith('--timeout='))?.split('=')[1] || '60000'),
    verbose: args.includes('--verbose')
  };
  
  const demoNumber = parseInt(args.find(arg => arg.startsWith('--demo='))?.split('=')[1] || '2');
  
  console.log('🎯 CFP ORCHESTRATOR DEMO');
  console.log('=' .repeat(60));
  console.log(`🕒 Started at: ${new Date().toLocaleString()}`);
  console.log(`🌐 URL: ${url}`);
  console.log(`🎮 Demo: ${demoNumber}`);
  
  try {
    switch (demoNumber) {
      case 1:
        await demoEntityCreation(url, options);
        break;
      case 2:
        await demoFullCFPFlow(url, options);
        break;
      case 3:
        await demoPublishFlow(url, options);
        break;
      default:
        console.log('❌ Invalid demo number. Use 1, 2, or 3.');
        return;
    }
  } catch (error) {
    console.error('\n💥 Demo execution failed:', error);
    process.exit(1);
  }
  
  console.log('\n🏁 Demo completed!');
}

// Run the demo if this script is executed directly
if (require.main === module) {
  runDemo().catch(console.error);
}

export { runDemo, demoEntityCreation, demoFullCFPFlow, demoPublishFlow };

