#!/usr/bin/env tsx
/**
 * Clear Test Accounts and Businesses
 * 
 * Removes all test accounts and their associated businesses.
 * Identifies test accounts by email patterns:
 *   - test@test.com
 *   - *@example.com
 *   - test-*@* (any email starting with "test-")
 * 
 * Deletes related data in the correct order to handle foreign key constraints:
 *   1. Competitors
 *   2. Crawl jobs
 *   3. LLM fingerprints
 *   4. Wikidata entities
 *   5. Businesses
 *   6. Activity logs
 *   7. Invitations
 *   8. Team members
 *   9. Teams
 *   10. Users
 * 
 * Usage:
 *   tsx scripts/clear-test-accounts.ts
 * 
 *   # Preview what will be deleted without actually deleting
 *   tsx scripts/clear-test-accounts.ts --dry-run
 * 
 *   # Clear specific email pattern
 *   tsx scripts/clear-test-accounts.ts --email-pattern "@example.com"
 */

import { db } from '../lib/db/drizzle';
import { 
  users, 
  teams, 
  teamMembers, 
  businesses,
  wikidataEntities,
  llmFingerprints,
  crawlJobs,
  competitors,
  activityLogs,
  invitations,
} from '../lib/db/schema';
import { eq, and, inArray, or, like, sql } from 'drizzle-orm';

const isDryRun = process.argv.includes('--dry-run');
const emailPatternArg = process.argv.find(arg => arg.startsWith('--email-pattern='));
const emailPattern = emailPatternArg ? emailPatternArg.split('=')[1] : null;

interface TestAccount {
  user: typeof users.$inferSelect;
  teams: Array<{
    team: typeof teams.$inferSelect;
    businesses: Array<typeof businesses.$inferSelect>;
  }>;
}

async function findTestAccounts(): Promise<TestAccount[]> {
  console.log('\n🔍 Finding test accounts...\n');
  
  // Build email filter conditions
  const emailConditions = emailPattern
    ? [like(users.email, `%${emailPattern}%`)]
    : [
        eq(users.email, 'test@test.com'),
        like(users.email, '%@example.com'),
        like(users.email, 'test-%'),
      ];

  // Find all test users
  const testUsers = await db
    .select()
    .from(users)
    .where(or(...emailConditions));

  if (testUsers.length === 0) {
    console.log('✅ No test accounts found');
    return [];
  }

  console.log(`📋 Found ${testUsers.length} test account(s):`);
  testUsers.forEach((user, index) => {
    console.log(`  ${index + 1}. ${user.email} (ID: ${user.id})`);
  });

  // For each user, find their teams and businesses
  const testAccounts: TestAccount[] = [];

  for (const user of testUsers) {
    // Find teams for this user
    const userTeamMembers = await db
      .select({
        teamId: teamMembers.teamId,
      })
      .from(teamMembers)
      .where(eq(teamMembers.userId, user.id));

    const teamIds = userTeamMembers.map(tm => tm.teamId);
    
    if (teamIds.length === 0) {
      testAccounts.push({
        user,
        teams: [],
      });
      continue;
    }

    // Get team details
    const userTeams = await db
      .select()
      .from(teams)
      .where(inArray(teams.id, teamIds));

    // For each team, get businesses
    const teamsWithBusinesses = await Promise.all(
      userTeams.map(async (team) => {
        const teamBusinesses = await db
          .select()
          .from(businesses)
          .where(eq(businesses.teamId, team.id));

        return {
          team,
          businesses: teamBusinesses,
        };
      })
    );

    testAccounts.push({
      user,
      teams: teamsWithBusinesses,
    });
  }

  return testAccounts;
}

async function deleteTestAccounts(testAccounts: TestAccount[]) {
  if (testAccounts.length === 0) {
    console.log('\n✅ No test accounts to delete');
    return;
  }

  // Collect all IDs to delete
  const allBusinessIds: number[] = [];
  const allTeamIds: number[] = [];
  const allUserId: number[] = [];

  for (const account of testAccounts) {
    allUserId.push(account.user.id);
    
    for (const { team, businesses } of account.teams) {
      allTeamIds.push(team.id);
      allBusinessIds.push(...businesses.map(b => b.id));
    }
  }

  console.log('\n📊 Summary of data to delete:');
  console.log(`   - ${allUserId.length} user(s)`);
  console.log(`   - ${allTeamIds.length} team(s)`);
  console.log(`   - ${allBusinessIds.length} business(es)`);

  if (isDryRun) {
    console.log('\n🔍 DRY RUN MODE - No data will be deleted');
    console.log('\nTest accounts that would be deleted:');
    testAccounts.forEach((account) => {
      console.log(`\n  User: ${account.user.email} (ID: ${account.user.id})`);
      account.teams.forEach(({ team, businesses }) => {
        console.log(`    Team: ${team.name} (ID: ${team.id})`);
        businesses.forEach((business) => {
          console.log(`      Business: ${business.name} (ID: ${business.id})`);
        });
      });
    });
    return;
  }

  console.log('\n🗑️  Starting deletion process...\n');

  // 1. Delete competitors (references businesses)
  if (allBusinessIds.length > 0) {
    console.log('  1. Deleting competitors...');
    await db
      .delete(competitors)
      .where(inArray(competitors.businessId, allBusinessIds));
    await db
      .delete(competitors)
      .where(inArray(competitors.competitorBusinessId, allBusinessIds));
    console.log(`     ✅ Deleted competitors`);
  }

  // 2. Delete crawl jobs
  if (allBusinessIds.length > 0) {
    console.log('  2. Deleting crawl jobs...');
    await db
      .delete(crawlJobs)
      .where(inArray(crawlJobs.businessId, allBusinessIds));
    console.log(`     ✅ Deleted crawl jobs`);
  }

  // 3. Delete LLM fingerprints
  if (allBusinessIds.length > 0) {
    console.log('  3. Deleting LLM fingerprints...');
    await db
      .delete(llmFingerprints)
      .where(inArray(llmFingerprints.businessId, allBusinessIds));
    console.log(`     ✅ Deleted LLM fingerprints`);
  }

  // 4. Delete Wikidata entities
  if (allBusinessIds.length > 0) {
    console.log('  4. Deleting Wikidata entities...');
    await db
      .delete(wikidataEntities)
      .where(inArray(wikidataEntities.businessId, allBusinessIds));
    console.log(`     ✅ Deleted Wikidata entities`);
  }

  // 5. Delete businesses
  if (allBusinessIds.length > 0) {
    console.log('  5. Deleting businesses...');
    await db
      .delete(businesses)
      .where(inArray(businesses.id, allBusinessIds));
    console.log(`     ✅ Deleted ${allBusinessIds.length} business(es)`);
  }

  // 6. Delete activity logs
  if (allTeamIds.length > 0) {
    console.log('  6. Deleting activity logs...');
    await db
      .delete(activityLogs)
      .where(inArray(activityLogs.teamId, allTeamIds));
    console.log(`     ✅ Deleted activity logs`);
  }

  // 7. Delete invitations
  if (allTeamIds.length > 0) {
    console.log('  7. Deleting invitations...');
    await db
      .delete(invitations)
      .where(inArray(invitations.teamId, allTeamIds));
    console.log(`     ✅ Deleted invitations`);
  }

  // 8. Delete team members
  if (allTeamIds.length > 0) {
    console.log('  8. Deleting team members...');
    await db
      .delete(teamMembers)
      .where(inArray(teamMembers.teamId, allTeamIds));
    console.log(`     ✅ Deleted team members`);
  }

  // 9. Delete teams
  if (allTeamIds.length > 0) {
    console.log('  9. Deleting teams...');
    await db
      .delete(teams)
      .where(inArray(teams.id, allTeamIds));
    console.log(`     ✅ Deleted ${allTeamIds.length} team(s)`);
  }

  // 10. Delete users
  if (allUserId.length > 0) {
    console.log('  10. Deleting users...');
    await db
      .delete(users)
      .where(inArray(users.id, allUserId));
    console.log(`     ✅ Deleted ${allUserId.length} user(s)`);
  }

  console.log('\n✅ Successfully deleted all test accounts and related data!');
  console.log(`   - ${allUserId.length} user(s)`);
  console.log(`   - ${allTeamIds.length} team(s)`);
  console.log(`   - ${allBusinessIds.length} business(es)`);
  console.log(`   - Related Wikidata entities, LLM fingerprints, crawl jobs, competitors, activity logs, and invitations\n`);
}

async function main() {
  try {
    console.log('='.repeat(80));
    console.log('🧹 CLEAR TEST ACCOUNTS AND BUSINESSES');
    console.log('='.repeat(80));

    if (isDryRun) {
      console.log('\n⚠️  DRY RUN MODE - No data will be deleted\n');
    }

    const testAccounts = await findTestAccounts();
    await deleteTestAccounts(testAccounts);

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error clearing test accounts:', error);
    if (error instanceof Error) {
      console.error('Error details:', error.message);
      if (error.stack) {
        console.error(error.stack);
      }
    }
    process.exit(1);
  }
}

main();


