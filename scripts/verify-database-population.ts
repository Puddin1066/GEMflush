#!/usr/bin/env tsx
/**
 * Database Population Verification Script
 * Verifies that database tables are populated with data from @lib modules
 * including auth, payments, and business data
 */

import { db } from '@/lib/db/drizzle';
import { 
  users, 
  teams, 
  teamMembers, 
  businesses, 
  crawlJobs, 
  llmFingerprints, 
  wikidataEntities, 
  competitors,
  qidCache,
  activityLogs,
  invitations
} from '@/lib/db/schema';
import { count, sql } from 'drizzle-orm';

interface TableStats {
  tableName: string;
  recordCount: number;
  sampleData?: any[];
  relatedModules: string[];
}

async function getTableStats(): Promise<TableStats[]> {
  console.log('📊 Gathering database statistics...\n');

  const stats: TableStats[] = [];

  // Auth-related tables
  const userCount = await db.select({ count: count() }).from(users);
  const userSample = await db.select().from(users).limit(3);
  stats.push({
    tableName: 'users',
    recordCount: userCount[0].count,
    sampleData: userSample,
    relatedModules: ['@lib/auth', '@lib/db/queries']
  });

  const teamCount = await db.select({ count: count() }).from(teams);
  const teamSample = await db.select().from(teams).limit(3);
  stats.push({
    tableName: 'teams',
    recordCount: teamCount[0].count,
    sampleData: teamSample,
    relatedModules: ['@lib/auth', '@lib/payments', '@lib/gemflush']
  });

  const teamMemberCount = await db.select({ count: count() }).from(teamMembers);
  const teamMemberSample = await db.select().from(teamMembers).limit(3);
  stats.push({
    tableName: 'team_members',
    recordCount: teamMemberCount[0].count,
    sampleData: teamMemberSample,
    relatedModules: ['@lib/auth']
  });

  // Business-related tables
  const businessCount = await db.select({ count: count() }).from(businesses);
  const businessSample = await db.select().from(businesses).limit(3);
  stats.push({
    tableName: 'businesses',
    recordCount: businessCount[0].count,
    sampleData: businessSample,
    relatedModules: ['@lib/services', '@lib/validation', '@lib/data']
  });

  const crawlJobCount = await db.select({ count: count() }).from(crawlJobs);
  const crawlJobSample = await db.select().from(crawlJobs).limit(3);
  stats.push({
    tableName: 'crawl_jobs',
    recordCount: crawlJobCount[0].count,
    sampleData: crawlJobSample,
    relatedModules: ['@lib/crawler', '@lib/services']
  });

  const fingerprintCount = await db.select({ count: count() }).from(llmFingerprints);
  const fingerprintSample = await db.select().from(llmFingerprints).limit(3);
  stats.push({
    tableName: 'llm_fingerprints',
    recordCount: fingerprintCount[0].count,
    sampleData: fingerprintSample,
    relatedModules: ['@lib/llm', '@lib/services']
  });

  const wikidataCount = await db.select({ count: count() }).from(wikidataEntities);
  const wikidataSample = await db.select().from(wikidataEntities).limit(3);
  stats.push({
    tableName: 'wikidata_entities',
    recordCount: wikidataCount[0].count,
    sampleData: wikidataSample,
    relatedModules: ['@lib/wikidata', '@lib/services']
  });

  const competitorCount = await db.select({ count: count() }).from(competitors);
  const competitorSample = await db.select().from(competitors).limit(3);
  stats.push({
    tableName: 'competitors',
    recordCount: competitorCount[0].count,
    sampleData: competitorSample,
    relatedModules: ['@lib/data', '@lib/services']
  });

  // Caching and utility tables
  const qidCacheCount = await db.select({ count: count() }).from(qidCache);
  const qidCacheSample = await db.select().from(qidCache).limit(3);
  stats.push({
    tableName: 'qid_cache',
    recordCount: qidCacheCount[0].count,
    sampleData: qidCacheSample,
    relatedModules: ['@lib/wikidata']
  });

  const activityCount = await db.select({ count: count() }).from(activityLogs);
  const activitySample = await db.select().from(activityLogs).limit(3);
  stats.push({
    tableName: 'activity_logs',
    recordCount: activityCount[0].count,
    sampleData: activitySample,
    relatedModules: ['@lib/auth', '@lib/db/queries']
  });

  const invitationCount = await db.select({ count: count() }).from(invitations);
  const invitationSample = await db.select().from(invitations).limit(3);
  stats.push({
    tableName: 'invitations',
    recordCount: invitationCount[0].count,
    sampleData: invitationSample,
    relatedModules: ['@lib/auth']
  });

  return stats;
}

async function checkPaymentIntegration(): Promise<void> {
  console.log('💳 Checking Payment Integration...\n');

  // Check teams with Stripe data
  const teamsWithStripe = await db
    .select()
    .from(teams)
    .where(sql`stripe_customer_id IS NOT NULL OR stripe_subscription_id IS NOT NULL`)
    .limit(5);

  console.log(`Teams with Stripe integration: ${teamsWithStripe.length}`);
  if (teamsWithStripe.length > 0) {
    console.log('Sample Stripe data:');
    teamsWithStripe.forEach((team, i) => {
      console.log(`  ${i + 1}. Team ${team.id}: ${team.planName || 'free'} plan`);
      console.log(`     Customer ID: ${team.stripeCustomerId || 'none'}`);
      console.log(`     Subscription: ${team.subscriptionStatus || 'none'}`);
    });
  }
  console.log();
}

async function checkAuthIntegration(): Promise<void> {
  console.log('🔐 Checking Auth Integration...\n');

  // Check users with recent activity
  const recentUsers = await db
    .select({
      id: users.id,
      email: users.email,
      createdAt: users.createdAt,
      role: users.role
    })
    .from(users)
    .limit(5);

  console.log(`Total users: ${recentUsers.length}`);
  if (recentUsers.length > 0) {
    console.log('Sample user data:');
    recentUsers.forEach((user, i) => {
      console.log(`  ${i + 1}. ${user.email} (${user.role})`);
      console.log(`     Created: ${user.createdAt.toISOString()}`);
    });
  }
  console.log();
}

async function checkBusinessDataFlow(): Promise<void> {
  console.log('🏢 Checking Business Data Flow...\n');

  // Check businesses with related data
  const businessesWithData = await db
    .select({
      id: businesses.id,
      name: businesses.name,
      status: businesses.status,
      lastCrawledAt: businesses.lastCrawledAt,
      automationEnabled: businesses.automationEnabled
    })
    .from(businesses)
    .limit(5);

  console.log(`Total businesses: ${businessesWithData.length}`);
  if (businessesWithData.length > 0) {
    console.log('Sample business data:');
    businessesWithData.forEach((business, i) => {
      console.log(`  ${i + 1}. ${business.name} (${business.status})`);
      console.log(`     Last crawled: ${business.lastCrawledAt?.toISOString() || 'never'}`);
      console.log(`     Automation: ${business.automationEnabled ? 'enabled' : 'disabled'}`);
    });
  }
  console.log();
}

async function checkModuleIntegration(): Promise<void> {
  console.log('🔗 Checking Module Integration...\n');

  // Check if data flows between modules
  const businessesWithJobs = await db
    .select({
      businessId: businesses.id,
      businessName: businesses.name,
      crawlJobCount: sql<number>`(SELECT COUNT(*) FROM crawl_jobs WHERE business_id = businesses.id)`,
      fingerprintCount: sql<number>`(SELECT COUNT(*) FROM llm_fingerprints WHERE business_id = businesses.id)`,
      wikidataCount: sql<number>`(SELECT COUNT(*) FROM wikidata_entities WHERE business_id = businesses.id)`
    })
    .from(businesses)
    .limit(5);

  console.log('Business → Module Data Flow:');
  businessesWithJobs.forEach((business, i) => {
    console.log(`  ${i + 1}. ${business.businessName}:`);
    console.log(`     Crawl jobs: ${business.crawlJobCount}`);
    console.log(`     Fingerprints: ${business.fingerprintCount}`);
    console.log(`     Wikidata entities: ${business.wikidataCount}`);
  });
  console.log();
}

function displaySummary(stats: TableStats[]): void {
  console.log('📋 DATABASE POPULATION SUMMARY');
  console.log('='.repeat(50));
  
  let totalRecords = 0;
  let populatedTables = 0;
  
  stats.forEach(stat => {
    const status = stat.recordCount > 0 ? '✅' : '❌';
    console.log(`${status} ${stat.tableName.padEnd(20)} ${stat.recordCount.toString().padStart(6)} records`);
    console.log(`   Related modules: ${stat.relatedModules.join(', ')}`);
    
    totalRecords += stat.recordCount;
    if (stat.recordCount > 0) populatedTables++;
  });
  
  console.log('='.repeat(50));
  console.log(`📊 Summary: ${populatedTables}/${stats.length} tables populated`);
  console.log(`📈 Total records: ${totalRecords}`);
  
  if (populatedTables === 0) {
    console.log('\n⚠️  No data found! Consider running:');
    console.log('   pnpm db:seed    # Add sample data');
    console.log('   pnpm dev        # Start app and create test data');
  } else if (populatedTables < stats.length) {
    console.log('\n💡 Some tables are empty. This may be normal if:');
    console.log('   - App is newly deployed');
    console.log('   - No users have used certain features yet');
    console.log('   - Running in development mode with mock data');
  } else {
    console.log('\n🎉 All tables have data! Database is fully populated.');
  }
}

async function main() {
  try {
    console.log('🔍 DATABASE POPULATION VERIFICATION');
    console.log('='.repeat(50));
    console.log('Checking if database tables are populated with @lib data...\n');

    const stats = await getTableStats();
    
    await checkAuthIntegration();
    await checkPaymentIntegration();
    await checkBusinessDataFlow();
    await checkModuleIntegration();
    
    displaySummary(stats);
    
  } catch (error) {
    console.error('❌ Error verifying database population:', error);
    process.exit(1);
  }
}

main();
