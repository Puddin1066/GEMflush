#!/usr/bin/env tsx
/**
 * Remove Most Recent Businesses from Test Account
 * 
 * Removes all businesses (or most recent businesses) from the test account.
 * Deletes related data in the correct order to handle foreign key constraints.
 * 
 * Usage:
 *   # Remove all businesses from test account (default email: test@test.com)
 *   tsx scripts/remove-most-recent-business.ts
 * 
 *   # Remove all businesses from a specific account
 *   tsx scripts/remove-most-recent-business.ts test@test.com
 * 
 *   # Remove only the most recent business
 *   tsx scripts/remove-most-recent-business.ts --most-recent
 * 
 *   # Remove last N businesses (e.g., last 5)
 *   tsx scripts/remove-most-recent-business.ts --limit 5
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
} from '../lib/db/schema';
import { eq, and, desc, inArray } from 'drizzle-orm';

const email = process.argv[2] && !process.argv[2].startsWith('--') 
  ? process.argv[2] 
  : 'test@test.com';
const isMostRecent = process.argv.includes('--most-recent');
const limitArg = process.argv.find(arg => arg.startsWith('--limit='));
const limit = limitArg ? parseInt(limitArg.split('=')[1]) : null;

async function removeBusinessesFromTestAccount() {
  try {
    console.log(`\n🔍 Finding test account: ${email}\n`);
    console.log('='.repeat(80));

    // Find user by email
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (!user) {
      console.log(`❌ User ${email} not found in database`);
      process.exit(1);
    }

    console.log('✅ User found:', {
      id: user.id,
      email: user.email,
      role: user.role,
    });

    // Find team for user
    const [teamMember] = await db
      .select({
        teamId: teamMembers.teamId,
      })
      .from(teamMembers)
      .where(eq(teamMembers.userId, user.id))
      .limit(1);

    if (!teamMember) {
      console.log('❌ User is not associated with any team');
      process.exit(1);
    }

    // Get team details
    const [team] = await db
      .select()
      .from(teams)
      .where(eq(teams.id, teamMember.teamId))
      .limit(1);

    if (!team) {
      console.log('❌ Team not found');
      process.exit(1);
    }

    console.log('\n📊 Team Details:');
    console.log({
      teamId: team.id,
      teamName: team.name,
    });

    // Get businesses for team
    let businessQuery = db
      .select()
      .from(businesses)
      .where(eq(businesses.teamId, team.id))
      .orderBy(desc(businesses.createdAt));

    if (isMostRecent) {
      businessQuery = businessQuery.limit(1);
    } else if (limit) {
      businessQuery = businessQuery.limit(limit);
    }

    const businessesToDelete = await businessQuery;

    if (businessesToDelete.length === 0) {
      console.log('\n✅ No businesses found to delete');
      process.exit(0);
    }

    console.log(`\n📋 Found ${businessesToDelete.length} business(es) to delete:`);
    businessesToDelete.forEach((business, index) => {
      console.log(`  ${index + 1}. ${business.name} (ID: ${business.id}, URL: ${business.url})`);
    });

    const businessIds = businessesToDelete.map(b => b.id);

    console.log('\n🗑️  Starting deletion process...\n');

    // 1. Delete competitors (references businesses)
    console.log('  1. Deleting competitors...');
    const deletedCompetitors = await db
      .delete(competitors)
      .where(inArray(competitors.businessId, businessIds));
    console.log(`     ✅ Deleted competitors`);

    // 2. Delete competitors that reference these businesses as competitors
    await db
      .delete(competitors)
      .where(inArray(competitors.competitorBusinessId, businessIds));

    // 3. Delete crawl jobs
    console.log('  2. Deleting crawl jobs...');
    await db
      .delete(crawlJobs)
      .where(inArray(crawlJobs.businessId, businessIds));
    console.log(`     ✅ Deleted crawl jobs`);

    // 4. Delete LLM fingerprints
    console.log('  3. Deleting LLM fingerprints...');
    await db
      .delete(llmFingerprints)
      .where(inArray(llmFingerprints.businessId, businessIds));
    console.log(`     ✅ Deleted LLM fingerprints`);

    // 5. Delete Wikidata entities
    console.log('  4. Deleting Wikidata entities...');
    await db
      .delete(wikidataEntities)
      .where(inArray(wikidataEntities.businessId, businessIds));
    console.log(`     ✅ Deleted Wikidata entities`);

    // 6. Delete businesses (last, as it's referenced by others)
    console.log('  5. Deleting businesses...');
    const deletedBusinesses = await db
      .delete(businesses)
      .where(inArray(businesses.id, businessIds))
      .returning();
    console.log(`     ✅ Deleted ${deletedBusinesses.length} business(es)`);

    console.log('\n✅ Successfully deleted all related data:');
    console.log(`   - ${deletedBusinesses.length} business(es)`);
    console.log(`   - Related Wikidata entities`);
    console.log(`   - Related LLM fingerprints`);
    console.log(`   - Related crawl jobs`);
    console.log(`   - Related competitors\n`);

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error removing businesses:', error);
    if (error instanceof Error) {
      console.error('Error details:', error.message);
      if (error.stack) {
        console.error(error.stack);
      }
    }
    process.exit(1);
  }
}

removeBusinessesFromTestAccount();

