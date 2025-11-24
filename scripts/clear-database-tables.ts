#!/usr/bin/env tsx

import { db } from '../lib/db/drizzle.js';
import { 
  users, teams, teamMembers, businesses, crawlJobs, 
  llmFingerprints, wikidataEntities, competitors, 
  qidCache, activityLogs, invitations 
} from '../lib/db/schema.js';
import { sql } from 'drizzle-orm';

async function clearAllTables() {
  console.log('🗑️  CLEARING ALL DATABASE TABLES');
  console.log('⚠️  WARNING: This will delete ALL data!');
  console.log('=' .repeat(50));

  const tables = [
    { name: 'activity_logs', table: activityLogs },
    { name: 'llm_fingerprints', table: llmFingerprints },
    { name: 'crawl_jobs', table: crawlJobs },
    { name: 'wikidata_entities', table: wikidataEntities },
    { name: 'competitors', table: competitors },
    { name: 'qid_cache', table: qidCache },
    { name: 'invitations', table: invitations },
    { name: 'businesses', table: businesses },
    { name: 'team_members', table: teamMembers },
    { name: 'teams', table: teams },
    { name: 'users', table: users }
  ];

  let totalDeleted = 0;

  for (const { name, table } of tables) {
    try {
      console.log(`🗑️  Clearing ${name}...`);
      const result = await db.delete(table);
      console.log(`✅ Cleared ${name}`);
      
    } catch (error) {
      console.log(`❌ Error clearing ${name}: ${error.message}`);
    }
  }

  // Reset sequences
  console.log('\n🔄 Resetting ID sequences...');
  try {
    await db.execute(sql`
      ALTER SEQUENCE activity_logs_id_seq RESTART WITH 1;
      ALTER SEQUENCE businesses_id_seq RESTART WITH 1;
      ALTER SEQUENCE competitors_id_seq RESTART WITH 1;
      ALTER SEQUENCE crawl_jobs_id_seq RESTART WITH 1;
      ALTER SEQUENCE invitations_id_seq RESTART WITH 1;
      ALTER SEQUENCE llm_fingerprints_id_seq RESTART WITH 1;
      ALTER SEQUENCE qid_cache_id_seq RESTART WITH 1;
      ALTER SEQUENCE team_members_id_seq RESTART WITH 1;
      ALTER SEQUENCE teams_id_seq RESTART WITH 1;
      ALTER SEQUENCE users_id_seq RESTART WITH 1;
      ALTER SEQUENCE wikidata_entities_id_seq RESTART WITH 1;
    `);
    console.log('✅ ID sequences reset');
  } catch (error) {
    console.log(`⚠️  Could not reset sequences: ${error.message}`);
  }

  console.log('\n🎉 Database cleared successfully!');
  console.log('📊 All tables are now empty and ready for fresh data.');
  
  process.exit(0);
}

async function clearSpecificTables(tableNames: string[]) {
  console.log(`🗑️  CLEARING SPECIFIC TABLES: ${tableNames.join(', ')}`);
  console.log('=' .repeat(50));

  const tableMap = {
    'activity_logs': activityLogs,
    'businesses': businesses,
    'competitors': competitors,
    'crawl_jobs': crawlJobs,
    'invitations': invitations,
    'llm_fingerprints': llmFingerprints,
    'qid_cache': qidCache,
    'team_members': teamMembers,
    'teams': teams,
    'users': users,
    'wikidata_entities': wikidataEntities
  };

  for (const tableName of tableNames) {
    const table = tableMap[tableName];
    if (!table) {
      console.log(`❌ Unknown table: ${tableName}`);
      continue;
    }

    try {
      console.log(`🗑️  Clearing ${tableName}...`);
      await db.delete(table);
      console.log(`✅ Cleared ${tableName}`);
    } catch (error) {
      console.log(`❌ Error clearing ${tableName}: ${error.message}`);
    }
  }

  console.log('\n🎉 Selected tables cleared!');
  process.exit(0);
}

// Parse command line arguments
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  console.log(`
🗑️  Database Table Cleaner

Usage:
  npx tsx scripts/clear-database-tables.ts [options] [table_names...]

Options:
  --all, -a          Clear all tables
  --help, -h         Show this help message

Examples:
  npx tsx scripts/clear-database-tables.ts --all
  npx tsx scripts/clear-database-tables.ts users teams
  npx tsx scripts/clear-database-tables.ts crawl_jobs llm_fingerprints

Available tables:
  activity_logs, businesses, competitors, crawl_jobs, invitations,
  llm_fingerprints, qid_cache, team_members, teams, users, wikidata_entities
  `);
  process.exit(0);
}

if (args.includes('--all') || args.includes('-a')) {
  clearAllTables().catch(console.error);
} else if (args.length > 0) {
  clearSpecificTables(args).catch(console.error);
} else {
  console.log('❌ Please specify --all or table names. Use --help for usage info.');
  process.exit(1);
}

