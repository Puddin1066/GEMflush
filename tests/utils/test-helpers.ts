/**
 * Test Utilities - Following DRY Principles
 * Centralized helpers for unit, integration, and E2E tests
 */

import { NextRequest } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { users, teams, teamMembers, businesses, type NewUser, type NewTeam, type NewBusiness } from '@/lib/db/schema';
import { hashPassword } from '@/lib/auth/session';
import { SignJWT } from 'jose';
import { eq } from 'drizzle-orm';

// Test-specific session token creation
// Ensure AUTH_SECRET is at least 32 characters for JWT signing
const AUTH_SECRET = process.env.AUTH_SECRET || 'test-secret-key-for-testing-only-must-be-at-least-32-characters-long';
const key = new TextEncoder().encode(AUTH_SECRET);

async function createTestSessionToken(userId: number): Promise<string> {
  const expiresInOneDay = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const session = {
    user: { id: userId },
    expires: expiresInOneDay.toISOString(),
  };
  
  return await new SignJWT(session)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1 day from now')
    .sign(key);
}

/**
 * Test User Factory - Creates test users with teams
 * Single Responsibility: User creation
 */
export class TestUserFactory {
  static async createUser(overrides?: Partial<NewUser>) {
    const email = overrides?.email || `test-${Date.now()}@example.com`;
    const passwordHash = overrides?.passwordHash || await hashPassword('testpassword123');
    
    const [user] = await db
      .insert(users)
      .values({
        email,
        passwordHash,
        role: 'owner',
        ...overrides,
      })
      .returning();

    return user;
  }

  static async createUserWithTeam(overrides?: Partial<NewUser>) {
    const user = await this.createUser(overrides);
    
    const [team] = await db
      .insert(teams)
      .values({
        name: `${user.email}'s Team`,
      })
      .returning();

    await db.insert(teamMembers).values({
      userId: user.id,
      teamId: team.id,
      role: 'owner',
    });

    return { user, team };
  }

  static async cleanup(userId: number) {
    await db.delete(users).where(eq(users.id, userId));
  }
}

/**
 * Test Business Factory - Creates test businesses
 * Single Responsibility: Business creation
 */
export class TestBusinessFactory {
  static async createBusiness(teamId: number, overrides?: Partial<NewBusiness>) {
    const [business] = await db
      .insert(businesses)
      .values({
        teamId,
        name: overrides?.name || `Test Business ${Date.now()}`,
        url: overrides?.url || 'https://example.com',
        category: overrides?.category || 'Restaurant',
        location: overrides?.location || { city: 'Seattle', state: 'WA', country: 'USA' },
        status: overrides?.status || 'pending',
        ...overrides,
      })
      .returning();

    return business;
  }

  static async cleanup(businessId: number) {
    await db.delete(businesses).where(eq(businesses.id, businessId));
  }
}

// Note: For unit tests, we mock getUser() directly instead of creating session tokens
// This is simpler and tests behavior, not implementation details

/**
 * Database Cleanup Helper
 * Single Responsibility: Cleanup test data
 */
export class DatabaseCleanup {
  static async cleanupUser(userId: number) {
    // Delete team members first (foreign key constraint)
    const userTeams = await db
      .select({ teamId: teamMembers.teamId })
      .from(teamMembers)
      .where(eq(teamMembers.userId, userId));

    for (const { teamId } of userTeams) {
      await db.delete(teamMembers).where(eq(teamMembers.teamId, teamId));
      await db.delete(teams).where(eq(teams.id, teamId));
    }

    await db.delete(users).where(eq(users.id, userId));
  }

  static async cleanupBusiness(businessId: number) {
    await db.delete(businesses).where(eq(businesses.id, businessId));
  }
}

/**
 * Mock Data Generators
 * Single Responsibility: Generate test data
 */
export class MockDataGenerator {
  static generateBusiness(overrides?: Partial<NewBusiness>): Partial<NewBusiness> {
    return {
      name: `Test Business ${Date.now()}`,
      url: 'https://example.com',
      category: 'Restaurant',
      location: { city: 'Seattle', state: 'WA', country: 'USA' },
      ...overrides,
    };
  }

  static generateUser(overrides?: Partial<NewUser>): Partial<NewUser> {
    return {
      email: `test-${Date.now()}@example.com`,
      passwordHash: 'hashedpassword',
      role: 'owner',
      ...overrides,
    };
  }
}

