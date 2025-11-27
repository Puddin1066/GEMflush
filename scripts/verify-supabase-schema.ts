#!/usr/bin/env tsx
/**
 * Verify Supabase Schema Completeness
 * Checks if all expected columns exist in the database
 */

import { db } from '@/lib/db/drizzle';
import { sql } from 'drizzle-orm';

interface ColumnInfo {
  table_name: string;
  column_name: string;
  data_type: string;
  is_nullable: string;
}

async function getTableColumns(tableName: string): Promise<ColumnInfo[]> {
  const result = await db.execute<ColumnInfo>(
    sql`SELECT column_name, data_type, is_nullable 
        FROM information_schema.columns 
        WHERE table_name = ${tableName}
        ORDER BY ordinal_position`
  );
  return result as ColumnInfo[];
}

async function verifySchema() {
  console.log('🔍 Verifying Supabase Schema Completeness\n');
  console.log('='.repeat(60));

  const issues: string[] = [];
  const warnings: string[] = [];

  // Expected schema based on schema.ts
  const expectedSchema = {
    users: [
      'id', 'name', 'email', 'password_hash', 'role', 
      'created_at', 'updated_at', 'deleted_at',
      'reset_token', 'reset_token_expiry'
    ],
    teams: [
      'id', 'name', 'created_at', 'updated_at',
      'stripe_customer_id', 'stripe_subscription_id', 'stripe_product_id',
      'plan_name', 'subscription_status'
    ],
    businesses: [
      'id', 'team_id', 'name', 'url', 'category', 'location',
      'wikidata_qid', 'wikidata_published_at', 'last_crawled_at',
      'crawl_data', 'status',
      'automation_enabled', 'next_crawl_at', 'last_auto_published_at',
      'created_at', 'updated_at'
    ],
    llm_fingerprints: [
      'id', 'business_id', 'visibility_score', 'mention_rate',
      'sentiment_score', 'accuracy_score', 'avg_rank_position',
      'llm_results', 'competitive_benchmark', 'competitive_leaderboard',
      'created_at'
    ],
    wikidata_entities: [
      'id', 'business_id', 'qid', 'entity_data', 'published_to',
      'version', 'enrichment_level', 'published_at', 'last_enriched_at'
    ],
    crawl_jobs: [
      'id', 'business_id', 'job_type', 'status', 'progress', 'result',
      'error_message', 'firecrawl_job_id', 'started_at',
      'pages_discovered', 'pages_processed', 'firecrawl_metadata',
      'completed_at', 'created_at'
    ],
    competitors: [
      'id', 'business_id', 'competitor_business_id', 'competitor_name',
      'competitor_url', 'added_by', 'created_at'
    ],
    qid_cache: [
      'id', 'entity_type', 'search_key', 'qid', 'source',
      'query_count', 'last_queried_at', 'validated_at',
      'created_at', 'updated_at'
    ],
    email_logs: [
      'id', 'team_id', 'user_id', 'business_id', 'to', 'type',
      'subject', 'status', 'sent_at', 'error_message', 'metadata',
      'created_at'
    ],
  };

  for (const [tableName, expectedColumns] of Object.entries(expectedSchema)) {
    console.log(`\n📋 Checking table: ${tableName}`);
    console.log('-'.repeat(60));

    try {
      const columns = await getTableColumns(tableName);
      
      if (columns.length === 0) {
        issues.push(`❌ Table '${tableName}' does not exist`);
        console.log(`  ❌ Table does not exist`);
        continue;
      }

      const actualColumnNames = columns.map(c => c.column_name);
      const missingColumns = expectedColumns.filter(
        col => !actualColumnNames.includes(col)
      );
      const extraColumns = actualColumnNames.filter(
        col => !expectedColumns.includes(col)
      );

      if (missingColumns.length > 0) {
        issues.push(`❌ Table '${tableName}' missing columns: ${missingColumns.join(', ')}`);
        console.log(`  ❌ Missing columns: ${missingColumns.join(', ')}`);
      }

      if (extraColumns.length > 0) {
        warnings.push(`⚠️  Table '${tableName}' has extra columns: ${extraColumns.join(', ')}`);
        console.log(`  ⚠️  Extra columns (may be OK): ${extraColumns.join(', ')}`);
      }

      if (missingColumns.length === 0 && extraColumns.length === 0) {
        console.log(`  ✅ All expected columns present (${expectedColumns.length} columns)`);
      } else if (missingColumns.length === 0) {
        console.log(`  ✅ All required columns present (${expectedColumns.length} expected, ${actualColumnNames.length} actual)`);
      }

      // Show column details for key tables
      if (tableName === 'businesses' || tableName === 'users') {
        console.log(`  Columns: ${actualColumnNames.join(', ')}`);
      }
    } catch (error: any) {
      if (error?.code === '42P01') {
        issues.push(`❌ Table '${tableName}' does not exist`);
        console.log(`  ❌ Table does not exist`);
      } else {
        issues.push(`❌ Error checking table '${tableName}': ${error.message}`);
        console.log(`  ❌ Error: ${error.message}`);
      }
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('\n📊 Summary\n');

  if (issues.length === 0 && warnings.length === 0) {
    console.log('✅ All tables and columns are properly configured!');
    console.log('✅ Schema matches expected structure');
    return true;
  }

  if (issues.length > 0) {
    console.log('❌ Issues found:');
    issues.forEach(issue => console.log(`  ${issue}`));
    console.log('\n💡 To fix, run migrations:');
    console.log('   pnpm db:migrate');
    console.log('   or');
    console.log('   pnpm db:push');
  }

  if (warnings.length > 0) {
    console.log('\n⚠️  Warnings (may be OK):');
    warnings.forEach(warning => console.log(`  ${warning}`));
  }

  return issues.length === 0;
}

verifySchema()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  });

