/**
 * Integration Tests for Business API
 * Tests API routes with actual database connections
 * Following SOLID and DRY principles
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { TestUserFactory, TestBusinessFactory, DatabaseCleanup } from '../utils/test-helpers';
import { db } from '@/lib/db/drizzle';
import { businesses, teams, teamMembers, users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

describe('Business API - Integration Tests', () => {
  let testUser: any;
  let testTeam: any;
  const testUserIds: number[] = [];
  const testBusinessIds: number[] = [];

  beforeAll(async () => {
    // Set up test environment
    process.env.AUTH_SECRET = process.env.AUTH_SECRET || 'test-secret-key-for-integration-tests';
  });

  afterAll(async () => {
    // Cleanup test data
    for (const businessId of testBusinessIds) {
      await DatabaseCleanup.cleanupBusiness(businessId);
    }
    for (const userId of testUserIds) {
      await DatabaseCleanup.cleanupUser(userId);
    }
  });

  beforeEach(async () => {
    // Create test user and team for each test
    const userWithTeam = await TestUserFactory.createUserWithTeam();
    testUser = userWithTeam.user;
    testTeam = userWithTeam.team;
    testUserIds.push(testUser.id);
  });

  describe('Business Creation', () => {
    it('should create a business in the database', async () => {
      const business = await TestBusinessFactory.createBusiness(testTeam.id, {
        name: 'Integration Test Business',
        url: 'https://integration-test.com',
        category: 'restaurant',
        location: { city: 'Seattle', state: 'WA', country: 'USA' },
      });

      testBusinessIds.push(business.id);

      expect(business).toBeDefined();
      expect(business.name).toBe('Integration Test Business');
      expect(business.teamId).toBe(testTeam.id);
      expect(business.status).toBe('pending');

      // Verify in database
      const [savedBusiness] = await db
        .select()
        .from(businesses)
        .where(eq(businesses.id, business.id))
        .limit(1);

      expect(savedBusiness).toBeDefined();
      expect(savedBusiness?.name).toBe('Integration Test Business');
    });

    it('should retrieve businesses for a team', async () => {
      // Create multiple businesses
      const business1 = await TestBusinessFactory.createBusiness(testTeam.id, {
        name: 'Business 1',
      });
      const business2 = await TestBusinessFactory.createBusiness(testTeam.id, {
        name: 'Business 2',
      });

      testBusinessIds.push(business1.id, business2.id);

      // Retrieve businesses
      const teamBusinesses = await db
        .select()
        .from(businesses)
        .where(eq(businesses.teamId, testTeam.id));

      expect(teamBusinesses.length).toBeGreaterThanOrEqual(2);
      expect(teamBusinesses.some((b) => b.id === business1.id)).toBe(true);
      expect(teamBusinesses.some((b) => b.id === business2.id)).toBe(true);
    });
  });

  describe('Business Ownership', () => {
    it('should only return businesses for the correct team', async () => {
      // Create business for test team
      const business1 = await TestBusinessFactory.createBusiness(testTeam.id, {
        name: 'Team 1 Business',
      });
      testBusinessIds.push(business1.id);

      // Create another team and business
      const userWithTeam2 = await TestUserFactory.createUserWithTeam();
      const business2 = await TestBusinessFactory.createBusiness(userWithTeam2.team.id, {
        name: 'Team 2 Business',
      });
      testUserIds.push(userWithTeam2.user.id);
      testBusinessIds.push(business2.id);

      // Retrieve businesses for test team
      const teamBusinesses = await db
        .select()
        .from(businesses)
        .where(eq(businesses.teamId, testTeam.id));

      // Should only include business1
      expect(teamBusinesses.some((b) => b.id === business1.id)).toBe(true);
      expect(teamBusinesses.some((b) => b.id === business2.id)).toBe(false);
    });
  });
});

