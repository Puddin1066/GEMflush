/**
 * Quick script to check business status and see what happened
 */

import { db } from '@/lib/db/drizzle';
import { businesses, teams } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

async function checkBusinessStatus(businessId: number) {
  const [business] = await db
    .select({
      id: businesses.id,
      name: businesses.name,
      url: businesses.url,
      status: businesses.status,
      teamId: businesses.teamId,
      automationEnabled: businesses.automationEnabled,
      lastCrawledAt: businesses.lastCrawledAt,
      createdAt: businesses.createdAt,
    })
    .from(businesses)
    .where(eq(businesses.id, businessId))
    .limit(1);

  if (!business) {
    console.log(`❌ Business ${businessId} not found`);
    return;
  }

  const [team] = await db
    .select({
      id: teams.id,
      name: teams.name,
      planName: teams.planName,
      subscriptionStatus: teams.subscriptionStatus,
    })
    .from(teams)
    .where(eq(teams.id, business.teamId))
    .limit(1);

  console.log('\n📊 Business Status:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`ID: ${business.id}`);
  console.log(`Name: ${business.name}`);
  console.log(`URL: ${business.url}`);
  console.log(`Status: ${business.status}`);
  console.log(`Automation Enabled: ${business.automationEnabled || false}`);
  console.log(`Last Crawled: ${business.lastCrawledAt ? new Date(business.lastCrawledAt).toISOString() : 'Never'}`);
  console.log(`Created: ${new Date(business.createdAt).toISOString()}`);
  
  if (team) {
    console.log('\n👥 Team Info:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Team ID: ${team.id}`);
    console.log(`Team Name: ${team.name}`);
    console.log(`Plan: ${team.planName}`);
    console.log(`Subscription Status: ${team.subscriptionStatus || 'None'}`);
  }

  console.log('\n');
}

const businessId = process.argv[2] ? parseInt(process.argv[2], 10) : 768;
checkBusinessStatus(businessId)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });


