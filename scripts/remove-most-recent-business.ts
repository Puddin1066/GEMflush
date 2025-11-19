/**
 * Script to remove the most recent business stored via the test account
 * 
 * This script:
 * 1. Finds the test user (test@test.com)
 * 2. Finds their team
 * 3. Finds the most recent business for that team
 * 4. Deletes all related data (fingerprints, wikidata entities, crawl jobs, competitors)
 * 5. Deletes the business
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
  competitors
} from '../lib/db/schema';
import { eq, desc, or } from 'drizzle-orm';

const TEST_ACCOUNT_EMAIL = 'test@test.com';

async function removeMostRecentBusiness() {
  try {
    console.log(`🔍 Looking for test account: ${TEST_ACCOUNT_EMAIL}`);

    // Find user by email
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, TEST_ACCOUNT_EMAIL))
      .limit(1);

    if (!user) {
      console.log(`❌ User ${TEST_ACCOUNT_EMAIL} not found in database`);
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

    // Find the most recent business for this team
    const [mostRecentBusiness] = await db
      .select()
      .from(businesses)
      .where(eq(businesses.teamId, team.id))
      .orderBy(desc(businesses.createdAt))
      .limit(1);

    if (!mostRecentBusiness) {
      console.log('\n❌ No businesses found for this team');
      process.exit(0);
    }

    console.log('\n🎯 Most Recent Business Found:');
    console.log({
      id: mostRecentBusiness.id,
      name: mostRecentBusiness.name,
      url: mostRecentBusiness.url,
      category: mostRecentBusiness.category,
      status: mostRecentBusiness.status,
      createdAt: mostRecentBusiness.createdAt,
    });

    const businessId = mostRecentBusiness.id;

    // Delete related data first (to avoid foreign key constraint violations)
    console.log('\n🗑️  Deleting related data...');

    // Delete wikidata entities
    const deletedWikidata = await db
      .delete(wikidataEntities)
      .where(eq(wikidataEntities.businessId, businessId));
    console.log(`   ✓ Deleted wikidata entities for business ${businessId}`);

    // Delete LLM fingerprints
    const deletedFingerprints = await db
      .delete(llmFingerprints)
      .where(eq(llmFingerprints.businessId, businessId));
    console.log(`   ✓ Deleted LLM fingerprints for business ${businessId}`);

    // Delete crawl jobs
    const deletedCrawlJobs = await db
      .delete(crawlJobs)
      .where(eq(crawlJobs.businessId, businessId));
    console.log(`   ✓ Deleted crawl jobs for business ${businessId}`);

    // Delete competitors (both where business is the main business and where it's a competitor)
    const deletedCompetitors = await db
      .delete(competitors)
      .where(
        or(
          eq(competitors.businessId, businessId),
          eq(competitors.competitorBusinessId, businessId)
        )
      );
    console.log(`   ✓ Deleted competitors for business ${businessId}`);

    // Finally, delete the business itself
    console.log('\n🗑️  Deleting business...');
    await db
      .delete(businesses)
      .where(eq(businesses.id, businessId));

    console.log(`\n✅ Successfully deleted business "${mostRecentBusiness.name}" (ID: ${businessId})`);
    console.log('   All related data has been removed.');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error removing business:', error);
    if (error instanceof Error) {
      console.error('Error details:', error.message);
      if (error.stack) {
        console.error(error.stack);
      }
    }
    process.exit(1);
  }
}

// Run the script
removeMostRecentBusiness();

