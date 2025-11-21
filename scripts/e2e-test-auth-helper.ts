#!/usr/bin/env tsx
/**
 * E2E Test Authentication Helper
 * 
 * Helps set up authentication for E2E tests by creating a test user
 * and providing session cookie for test requests.
 * 
 * Usage:
 *   tsx scripts/e2e-test-auth-helper.ts [--email=test@test.com] [--password=test123]
 */

import { db } from '../lib/db/drizzle';
import { users, teams, teamMembers } from '../lib/db/schema';
import { eq } from 'drizzle-orm';
import { hashPassword } from '../lib/auth/session';
import { signToken } from '../lib/auth/session';

interface AuthHelperConfig {
  email: string;
  password: string;
}

async function createTestUser(config: AuthHelperConfig) {
  // Check if user exists
  const existingUser = await db
    .select()
    .from(users)
    .where(eq(users.email, config.email))
    .limit(1);

  if (existingUser.length > 0) {
    console.log(`✅ Test user already exists: ${config.email}`);
    return existingUser[0];
  }

  // Create user
  const passwordHash = await hashPassword(config.password);
  const [user] = await db
    .insert(users)
    .values({
      email: config.email,
      passwordHash,
      role: 'owner',
    })
    .returning();

  console.log(`✅ Created test user: ${config.email} (ID: ${user.id})`);

  // Create or get team
  let team = await db
    .select()
    .from(teams)
    .where(eq(teams.name, 'Test Team'))
    .limit(1);

  if (team.length === 0) {
    [team] = await db
      .insert(teams)
      .values({
        name: 'Test Team',
        planName: 'pro',
        subscriptionStatus: 'active',
      })
      .returning();
    console.log(`✅ Created test team: Test Team (ID: ${team[0].id})`);
  } else {
    console.log(`✅ Using existing team: Test Team (ID: ${team[0].id})`);
  }

  // Add user to team
  const existingMember = await db
    .select()
    .from(teamMembers)
    .where(eq(teamMembers.userId, user.id))
    .limit(1);

  if (existingMember.length === 0) {
    await db.insert(teamMembers).values({
      userId: user.id,
      teamId: team[0].id,
      role: 'owner',
    });
    console.log(`✅ Added user to team`);
  }

  return user;
}

async function generateSessionCookie(userId: number): Promise<string> {
  const expiresInOneDay = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const session = {
    user: { id: userId },
    expires: expiresInOneDay.toISOString(),
  };
  return await signToken(session);
}

async function main() {
  const args = process.argv.slice(2);
  const email = args.find(arg => arg.startsWith('--email='))?.split('=')[1] || 'test@test.com';
  const password = args.find(arg => arg.startsWith('--password='))?.split('=')[1] || 'test123';

  try {
    const user = await createTestUser({ email, password });
    const sessionCookie = await generateSessionCookie(user.id);
    
    console.log('\n✅ Authentication setup complete!');
    console.log('\nTo use in E2E tests, set this cookie:');
    console.log(`SESSION_COOKIE="${sessionCookie}"`);
    console.log('\nOr use in fetch requests:');
    console.log(`fetch(url, { headers: { Cookie: 'session=${sessionCookie}' } })`);
    
    // Save to .env.test for test usage
    const envContent = `# E2E Test Authentication
E2E_TEST_USER_EMAIL=${email}
E2E_TEST_USER_ID=${user.id}
E2E_TEST_SESSION_COOKIE=${sessionCookie}
`;
    
    console.log('\n💡 Tip: Add these to your .env.test file for automated testing');
  } catch (error) {
    console.error('❌ Error setting up authentication:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

