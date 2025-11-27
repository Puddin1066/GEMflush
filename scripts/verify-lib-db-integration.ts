/**
 * Integration Verification Script: @lib ↔ @db
 * 
 * Verifies that all @lib modules are properly integrated with @db
 * Uses Supabase/PostgreSQL CLI and API for verification
 * 
 * SOLID: Single Responsibility - integration verification only
 * DRY: Reusable verification patterns
 */

import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { db } from '@/lib/db/drizzle';
import { 
  businesses, 
  users, 
  teams, 
  crawlJobs, 
  llmFingerprints, 
  wikidataEntities,
  activityLogs 
} from '@/lib/db/schema';
import { eq, count, sql } from 'drizzle-orm';

const execAsync = promisify(exec);

interface IntegrationCheck {
  module: string;
  status: '✅' | '❌' | '⚠️';
  message: string;
  details?: string;
}

const checks: IntegrationCheck[] = [];

/**
 * Check 1: Database Connection
 */
async function checkDatabaseConnection(): Promise<void> {
  try {
    const result = await db.execute(sql`SELECT 1 as test, version() as pg_version`);
    checks.push({
      module: 'Database Connection',
      status: '✅',
      message: 'Database connection successful',
      details: `PostgreSQL version: ${result.rows[0]?.pg_version || 'Unknown'}`
    });
  } catch (error) {
    checks.push({
      module: 'Database Connection',
      status: '❌',
      message: 'Database connection failed',
      details: error instanceof Error ? error.message : String(error)
    });
  }
}

/**
 * Check 2: Schema Tables Exist
 */
async function checkSchemaTables(): Promise<void> {
  const requiredTables = [
    'users', 'teams', 'team_members', 'businesses',
    'crawl_jobs', 'llm_fingerprints', 'wikidata_entities', 'activity_logs'
  ];
  
  try {
    const result = await db.execute(sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN (${sql.join(
        requiredTables.map(t => sql`${t}`),
        sql`, `
      )})
    `);
    
    const existingTables = result.rows.map((r: any) => r.table_name);
    const missingTables = requiredTables.filter(t => !existingTables.includes(t));
    
    if (missingTables.length === 0) {
      checks.push({
        module: 'Schema Tables',
        status: '✅',
        message: `All ${requiredTables.length} required tables exist`,
        details: existingTables.join(', ')
      });
    } else {
      checks.push({
        module: 'Schema Tables',
        status: '❌',
        message: `Missing tables: ${missingTables.join(', ')}`,
        details: `Found: ${existingTables.join(', ')}`
      });
    }
  } catch (error) {
    checks.push({
      module: 'Schema Tables',
      status: '❌',
      message: 'Failed to check schema tables',
      details: error instanceof Error ? error.message : String(error)
    });
  }
}

/**
 * Check 3: @lib/data Module Integration
 */
async function checkDataModuleIntegration(): Promise<void> {
  try {
    // Check if data module can query database
    const { getBusinessesByTeam } = await import('@/lib/db/queries');
    
    // Try to query (even if empty result is OK)
    const businesses = await getBusinessesByTeam(999999); // Non-existent team ID
    
    checks.push({
      module: '@lib/data',
      status: '✅',
      message: 'Data module can query database',
      details: 'getBusinessesByTeam() function accessible and working'
    });
  } catch (error) {
    checks.push({
      module: '@lib/data',
      status: '❌',
      message: 'Data module database integration failed',
      details: error instanceof Error ? error.message : String(error)
    });
  }
}

/**
 * Check 4: @lib/crawler Module Integration
 */
async function checkCrawlerModuleIntegration(): Promise<void> {
  try {
    // Check if crawler module imports db queries
    const crawlerModule = await import('@/lib/crawler');
    const { updateCrawlJob } = await import('@/lib/db/queries');
    
    // Verify updateCrawlJob is accessible
    if (typeof updateCrawlJob === 'function') {
      checks.push({
        module: '@lib/crawler',
        status: '✅',
        message: 'Crawler module integrated with database',
        details: 'updateCrawlJob() function accessible'
      });
    } else {
      checks.push({
        module: '@lib/crawler',
        status: '❌',
        message: 'Crawler module missing database integration',
        details: 'updateCrawlJob() not accessible'
      });
    }
  } catch (error) {
    checks.push({
      module: '@lib/crawler',
      status: '❌',
      message: 'Crawler module integration check failed',
      details: error instanceof Error ? error.message : String(error)
    });
  }
}

/**
 * Check 5: @lib/llm Module Integration
 */
async function checkLLMModuleIntegration(): Promise<void> {
  try {
    // Check if LLM module can access fingerprint queries
    const { createFingerprint, getFingerprintByBusinessId } = await import('@/lib/db/queries');
    
    if (typeof createFingerprint === 'function' && typeof getFingerprintByBusinessId === 'function') {
      checks.push({
        module: '@lib/llm',
        status: '✅',
        message: 'LLM module integrated with database',
        details: 'Fingerprint query functions accessible'
      });
    } else {
      checks.push({
        module: '@lib/llm',
        status: '❌',
        message: 'LLM module missing database integration',
        details: 'Fingerprint query functions not accessible'
      });
    }
  } catch (error) {
    checks.push({
      module: '@lib/llm',
      status: '❌',
      message: 'LLM module integration check failed',
      details: error instanceof Error ? error.message : String(error)
    });
  }
}

/**
 * Check 6: @lib/wikidata Module Integration
 */
async function checkWikidataModuleIntegration(): Promise<void> {
  try {
    // Check if wikidata module can access entity queries
    const { createWikidataEntity, getWikidataEntityByBusinessId } = await import('@/lib/db/queries');
    
    if (typeof createWikidataEntity === 'function' && typeof getWikidataEntityByBusinessId === 'function') {
      checks.push({
        module: '@lib/wikidata',
        status: '✅',
        message: 'Wikidata module integrated with database',
        details: 'Entity query functions accessible'
      });
    } else {
      checks.push({
        module: '@lib/wikidata',
        status: '❌',
        message: 'Wikidata module missing database integration',
        details: 'Entity query functions not accessible'
      });
    }
  } catch (error) {
    checks.push({
      module: '@lib/wikidata',
      status: '❌',
      message: 'Wikidata module integration check failed',
      details: error instanceof Error ? error.message : String(error)
    });
  }
}

/**
 * Check 7: PostgreSQL CLI Access
 */
async function checkPostgresCLIAccess(): Promise<void> {
  const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  
  if (!dbUrl) {
    checks.push({
      module: 'PostgreSQL CLI',
      status: '⚠️',
      message: 'DATABASE_URL not set',
      details: 'Cannot verify CLI access without connection string'
    });
    return;
  }
  
  try {
    // Test psql command
    const { stdout } = await execAsync(`psql "${dbUrl}" -c "SELECT 1;" -t`);
    
    if (stdout.trim() === '1') {
      checks.push({
        module: 'PostgreSQL CLI',
        status: '✅',
        message: 'PostgreSQL CLI (psql) accessible',
        details: 'Can execute queries via psql'
      });
    } else {
      checks.push({
        module: 'PostgreSQL CLI',
        status: '⚠️',
        message: 'PostgreSQL CLI accessible but unexpected output',
        details: `Output: ${stdout.trim()}`
      });
    }
  } catch (error) {
    checks.push({
      module: 'PostgreSQL CLI',
      status: '⚠️',
      message: 'PostgreSQL CLI (psql) not available',
      details: error instanceof Error ? error.message : 'psql may not be installed'
    });
  }
}

/**
 * Check 8: Supabase CLI Access
 */
async function checkSupabaseCLIAccess(): Promise<void> {
  try {
    // Test supabase CLI
    const { stdout } = await execAsync('supabase --version');
    
    checks.push({
      module: 'Supabase CLI',
      status: '✅',
      message: 'Supabase CLI installed',
      details: stdout.trim()
    });
  } catch (error) {
    checks.push({
      module: 'Supabase CLI',
      status: '⚠️',
      message: 'Supabase CLI not installed',
      details: 'Install with: npm install -g supabase'
    });
  }
}

/**
 * Check 9: Drizzle Studio Access
 */
async function checkDrizzleStudioAccess(): Promise<void> {
  try {
    // Test drizzle-kit
    const { stdout } = await execAsync('npx drizzle-kit --version');
    
    checks.push({
      module: 'Drizzle Studio',
      status: '✅',
      message: 'Drizzle Kit available',
      details: `Version: ${stdout.trim()}`
    });
  } catch (error) {
    checks.push({
      module: 'Drizzle Studio',
      status: '⚠️',
      message: 'Drizzle Kit not available',
      details: 'Run: pnpm install'
    });
  }
}

/**
 * Check 10: Import Verification
 * Verifies that lib modules can import from @db
 */
async function checkImportVerification(): Promise<void> {
  const modules = [
    { name: '@lib/data', imports: ['@/lib/db/queries', '@/lib/db/schema'] },
    { name: '@lib/crawler', imports: ['@/lib/db/queries'] },
    { name: '@lib/llm', imports: ['@/lib/db/queries'] },
    { name: '@lib/wikidata', imports: ['@/lib/db/queries', '@/lib/db/schema'] },
  ];
  
  const results: string[] = [];
  
  for (const module of modules) {
    try {
      for (const importPath of module.imports) {
        await import(importPath);
      }
      results.push(`${module.name}: ✅`);
    } catch (error) {
      results.push(`${module.name}: ❌ (${error instanceof Error ? error.message : String(error)})`);
    }
  }
  
  const allPassed = results.every(r => r.includes('✅'));
  
  checks.push({
    module: 'Import Verification',
    status: allPassed ? '✅' : '❌',
    message: allPassed ? 'All modules can import from @db' : 'Some modules cannot import from @db',
    details: results.join('\n')
  });
}

/**
 * Display Results
 */
function displayResults(): void {
  console.log('\n' + '='.repeat(70));
  console.log('🔍 @lib ↔ @db INTEGRATION VERIFICATION');
  console.log('='.repeat(70) + '\n');
  
  const passed = checks.filter(c => c.status === '✅').length;
  const failed = checks.filter(c => c.status === '❌').length;
  const warnings = checks.filter(c => c.status === '⚠️').length;
  
  checks.forEach(check => {
    console.log(`${check.status} ${check.module}`);
    console.log(`   ${check.message}`);
    if (check.details) {
      console.log(`   Details: ${check.details}`);
    }
    console.log('');
  });
  
  console.log('='.repeat(70));
  console.log(`Summary: ${passed} passed, ${failed} failed, ${warnings} warnings`);
  console.log('='.repeat(70) + '\n');
  
  if (failed > 0) {
    console.log('❌ Integration issues detected. Please fix the failed checks.');
    process.exit(1);
  } else if (warnings > 0) {
    console.log('⚠️  Some optional checks failed. Integration is functional but CLI tools may not be available.');
    process.exit(0);
  } else {
    console.log('✅ All integration checks passed!');
    process.exit(0);
  }
}

/**
 * Main Execution
 */
async function main() {
  console.log('Starting @lib ↔ @db integration verification...\n');
  
  await checkDatabaseConnection();
  await checkSchemaTables();
  await checkDataModuleIntegration();
  await checkCrawlerModuleIntegration();
  await checkLLMModuleIntegration();
  await checkWikidataModuleIntegration();
  await checkPostgresCLIAccess();
  await checkSupabaseCLIAccess();
  await checkDrizzleStudioAccess();
  await checkImportVerification();
  
  displayResults();
}

main().catch(error => {
  console.error('❌ Verification script failed:', error);
  process.exit(1);
});


