import { db } from '../lib/db/drizzle';
import { users, teams, teamMembers } from '../lib/db/schema';
import { eq } from 'drizzle-orm';

async function checkUserTier(email: string) {
  try {
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

    console.log('\n📊 Team Subscription Details:');
    console.log({
      teamId: team.id,
      teamName: team.name,
      planName: team.planName || 'null (free)',
      subscriptionStatus: team.subscriptionStatus || 'null',
      stripeCustomerId: team.stripeCustomerId || 'null',
      stripeSubscriptionId: team.stripeSubscriptionId || 'null',
      stripeProductId: team.stripeProductId || 'null',
      updatedAt: team.updatedAt,
    });

    const tier = team.planName || 'free';
    console.log(`\n✅ User tier: ${tier.toUpperCase()}`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error checking user tier:', error);
    if (error instanceof Error) {
      console.error('Error details:', error.message);
      if (error.stack) {
        console.error(error.stack);
      }
    }
    process.exit(1);
  }
}

const email = process.argv[2] || 'test@test.com';
checkUserTier(email);


