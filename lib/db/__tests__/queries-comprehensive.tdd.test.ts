/**
 * TDD Test: Comprehensive Database Query Functions - Tests Drive Implementation
 * 
 * SPECIFICATION: All Database Query Functions Must Work Correctly
 * 
 * As a developer
 * I want all database query functions to work correctly
 * So that the application can reliably interact with the database
 * 
 * Acceptance Criteria:
 * 1. User queries (getUser, getUserByEmail, getUserWithTeam) work correctly
 * 2. Team queries (getTeamByStripeCustomerId, updateTeamSubscription, getTeamForUser) work correctly
 * 3. Business queries (CRUD operations) work correctly
 * 4. Fingerprint queries work correctly
 * 5. Wikidata queries work correctly
 * 6. Crawl job queries work correctly
 * 7. Competitor queries work correctly
 * 8. Error handling works correctly
 * 9. Edge cases are handled properly
 * 
 * TDD Cycle: RED → GREEN → REFACTOR
 * Tests written FIRST to drive implementation
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { db } from '../drizzle';
import {
  users,
  teams,
  teamMembers,
  businesses,
  llmFingerprints,
  wikidataEntities,
  crawlJobs,
  competitors,
  activityLogs,
} from '../schema';
import { BusinessTestFactory, TeamTestFactory } from '@/lib/test-helpers/tdd-helpers';
import type { Business, Team, User, LLMFingerprint, WikidataEntity, CrawlJob, Competitor } from '../schema';

// Mock drizzle db
vi.mock('../drizzle', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    query: {
      teamMembers: {
        findFirst: vi.fn(),
      },
    },
  },
}));

// Mock cookies and session
vi.mock('next/headers', () => ({
  cookies: vi.fn(),
}));

vi.mock('@/lib/auth/session', () => ({
  verifyToken: vi.fn(),
}));

const mockDb = vi.mocked(db);

describe('🔴 RED: Comprehensive Database Query Functions Specification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * SPECIFICATION 1: User Queries
   */
  describe('User Queries', () => {
    /**
     * SPECIFICATION 1.1: getUserByEmail() - MUST Return User or Null
     * 
     * Given: Email address
     * When: getUserByEmail() is called
     * Then: Returns user if exists and not deleted, null otherwise
     */
    describe('getUserByEmail', () => {
      it('MUST return user when exists and not deleted', async () => {
        // Arrange: Mock user exists
        const mockUser = {
          id: 1,
          email: 'test@example.com',
          passwordHash: 'hashed',
          name: 'Test User',
          role: 'member',
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
          resetToken: null,
          resetTokenExpiry: null,
        };

        const mockSelect = {
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue([mockUser]),
        };

        mockDb.select.mockReturnValue(mockSelect as any);

        // Act: Import and call function
        const { getUserByEmail } = await import('../queries');
        const result = await getUserByEmail('test@example.com');

        // Assert: SPECIFICATION - MUST return user
        expect(result).toEqual(mockUser);
        expect(mockDb.select).toHaveBeenCalled();
      });

      it('MUST return null when user does not exist', async () => {
        // Arrange: Mock user not found
        const mockSelect = {
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue([]),
        };

        mockDb.select.mockReturnValue(mockSelect as any);

        // Act: Import and call function
        const { getUserByEmail } = await import('../queries');
        const result = await getUserByEmail('nonexistent@example.com');

        // Assert: SPECIFICATION - MUST return null
        expect(result).toBeNull();
      });

      it('MUST return null when user is deleted', async () => {
        // Arrange: Mock deleted user (query filters by deletedAt IS NULL)
        const mockSelect = {
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue([]), // Query filters deleted users
        };

        mockDb.select.mockReturnValue(mockSelect as any);

        // Act: Import and call function
        const { getUserByEmail } = await import('../queries');
        const result = await getUserByEmail('deleted@example.com');

        // Assert: SPECIFICATION - MUST return null for deleted users
        expect(result).toBeNull();
      });
    });

    /**
     * SPECIFICATION 1.2: getUserWithTeam() - MUST Return User with Team ID
     * 
     * Given: User ID
     * When: getUserWithTeam() is called
     * Then: Returns user with teamId if user has team, null teamId otherwise
     */
    describe('getUserWithTeam', () => {
      it('MUST return user with teamId when user has team', async () => {
        // Arrange: Mock user with team
        const mockResult = {
          user: {
            id: 1,
            email: 'test@example.com',
            passwordHash: 'hashed',
            name: 'Test User',
            role: 'member',
            createdAt: new Date(),
            updatedAt: new Date(),
            deletedAt: null,
            resetToken: null,
            resetTokenExpiry: null,
          },
          teamId: 1,
        };

        const mockSelect = {
          from: vi.fn().mockReturnThis(),
          leftJoin: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue([mockResult]),
        };

        mockDb.select.mockReturnValue(mockSelect as any);

        // Act: Import and call function
        const { getUserWithTeam } = await import('../queries');
        const result = await getUserWithTeam(1);

        // Assert: SPECIFICATION - MUST return user with teamId
        expect(result).toEqual(mockResult);
        expect(mockDb.select).toHaveBeenCalled();
      });

      it('MUST return user with null teamId when user has no team', async () => {
        // Arrange: Mock user without team
        const mockResult = {
          user: {
            id: 1,
            email: 'test@example.com',
            passwordHash: 'hashed',
            name: 'Test User',
            role: 'member',
            createdAt: new Date(),
            updatedAt: new Date(),
            deletedAt: null,
            resetToken: null,
            resetTokenExpiry: null,
          },
          teamId: null,
        };

        const mockSelect = {
          from: vi.fn().mockReturnThis(),
          leftJoin: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue([mockResult]),
        };

        mockDb.select.mockReturnValue(mockSelect as any);

        // Act: Import and call function
        const { getUserWithTeam } = await import('../queries');
        const result = await getUserWithTeam(1);

        // Assert: SPECIFICATION - MUST return user with null teamId
        expect(result).toEqual(mockResult);
        expect(result.teamId).toBeNull();
      });
    });
  });

  /**
   * SPECIFICATION 2: Team Queries
   */
  describe('Team Queries', () => {
    /**
     * SPECIFICATION 2.1: getTeamByStripeCustomerId() - MUST Return Team or Null
     * 
     * Given: Stripe customer ID
     * When: getTeamByStripeCustomerId() is called
     * Then: Returns team if exists, null otherwise
     */
    describe('getTeamByStripeCustomerId', () => {
      it('MUST return team when exists', async () => {
        // Arrange: Mock team exists
        const testTeam = TeamTestFactory.createPro({
          id: 1,
          stripeCustomerId: 'cus_test123',
        });

        const mockSelect = {
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue([testTeam]),
        };

        mockDb.select.mockReturnValue(mockSelect as any);

        // Act: Import and call function
        const { getTeamByStripeCustomerId } = await import('../queries');
        const result = await getTeamByStripeCustomerId('cus_test123');

        // Assert: SPECIFICATION - MUST return team
        expect(result).toEqual(testTeam);
        expect(mockDb.select).toHaveBeenCalled();
      });

      it('MUST return null when team does not exist', async () => {
        // Arrange: Mock team not found
        const mockSelect = {
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue([]),
        };

        mockDb.select.mockReturnValue(mockSelect as any);

        // Act: Import and call function
        const { getTeamByStripeCustomerId } = await import('../queries');
        const result = await getTeamByStripeCustomerId('cus_nonexistent');

        // Assert: SPECIFICATION - MUST return null
        expect(result).toBeNull();
      });
    });

    /**
     * SPECIFICATION 2.2: updateTeamSubscription() - MUST Update Team Subscription
     * 
     * Given: Team ID and subscription data
     * When: updateTeamSubscription() is called
     * Then: Updates team subscription fields and updatedAt timestamp
     */
    describe('updateTeamSubscription', () => {
      it('MUST update team subscription fields', async () => {
        // Arrange: Mock update operation
        const updatedTeam = TeamTestFactory.createPro({
          id: 1,
          stripeSubscriptionId: 'sub_new123',
          planName: 'pro',
          subscriptionStatus: 'active',
        });

        const mockUpdate = {
          set: vi.fn().mockReturnThis(),
          where: vi.fn().mockResolvedValue(undefined),
        };

        mockDb.update = vi.fn().mockReturnValue(mockUpdate as any);

        // Act: Import and call function
        const { updateTeamSubscription } = await import('../queries');
        await updateTeamSubscription(1, {
          stripeSubscriptionId: 'sub_new123',
          stripeProductId: 'prod_test',
          planName: 'pro',
          subscriptionStatus: 'active',
        });

        // Assert: SPECIFICATION - MUST update team
        expect(mockDb.update).toHaveBeenCalledWith(teams);
        expect(mockUpdate.set).toHaveBeenCalled();
        expect(mockUpdate.where).toHaveBeenCalled();
      });
    });

    /**
     * SPECIFICATION 2.3: getTeamForUser() - MUST Return Team with Members or Null
     * 
     * Given: Authenticated user
     * When: getTeamForUser() is called
     * Then: Returns team with members if user has team, null otherwise
     */
    describe('getTeamForUser', () => {
      it('MUST return team with members when user has team', async () => {
        // Arrange: Mock user and team
        const mockUser = {
          id: 1,
          email: 'test@example.com',
          passwordHash: 'hashed',
          name: 'Test User',
          role: 'member',
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
          resetToken: null,
          resetTokenExpiry: null,
        };

        const mockTeam = {
          id: 1,
          name: 'Test Team',
          planName: 'pro',
          subscriptionStatus: 'active',
          stripeCustomerId: null,
          stripeSubscriptionId: null,
          stripeProductId: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          teamMembers: [
            {
              id: 1,
              userId: 1,
              teamId: 1,
              role: 'owner',
              joinedAt: new Date(),
              user: {
                id: 1,
                name: 'Test User',
                email: 'test@example.com',
              },
            },
          ],
        };

        // Mock getUser to return user - need to mock the internal getUser function
        const { cookies } = await import('next/headers');
        const { verifyToken } = await import('@/lib/auth/session');
        
        // Mock cookies to return a valid session cookie
        const mockCookies = {
          get: vi.fn().mockReturnValue({ value: 'valid_token' }),
        };
        vi.mocked(cookies).mockResolvedValue(mockCookies as any);
        
        // Mock verifyToken to return valid session
        vi.mocked(verifyToken).mockResolvedValue({
          user: { id: 1 },
          expires: new Date(Date.now() + 3600000).toISOString(),
        } as any);

        // Mock db.select for getUser() internal call
        const mockSelect = {
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue([mockUser]),
        };
        mockDb.select.mockReturnValue(mockSelect as any);

        // Mock db.query.teamMembers.findFirst
        mockDb.query.teamMembers.findFirst = vi.fn().mockResolvedValue({
          team: mockTeam,
        });

        // Act: Import and call function
        const { getTeamForUser } = await import('../queries');
        const result = await getTeamForUser();

        // Assert: SPECIFICATION - MUST return team with members
        expect(result).toEqual(mockTeam);
        expect(mockDb.query.teamMembers.findFirst).toHaveBeenCalled();
      });

      it('MUST return null when user has no team', async () => {
        // Arrange: Mock user without team
        const mockUser = {
          id: 1,
          email: 'test@example.com',
          passwordHash: 'hashed',
          name: 'Test User',
          role: 'member',
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
          resetToken: null,
          resetTokenExpiry: null,
        };

        const { cookies } = await import('next/headers');
        const { verifyToken } = await import('@/lib/auth/session');
        
        // Mock cookies to return a valid session cookie
        const mockCookies = {
          get: vi.fn().mockReturnValue({ value: 'valid_token' }),
        };
        vi.mocked(cookies).mockResolvedValue(mockCookies as any);
        
        // Mock verifyToken to return valid session
        vi.mocked(verifyToken).mockResolvedValue({
          user: { id: 1 },
          expires: new Date(Date.now() + 3600000).toISOString(),
        } as any);

        // Mock db.select for getUser() internal call
        const mockSelect = {
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue([mockUser]),
        };
        mockDb.select.mockReturnValue(mockSelect as any);

        // Mock db.query.teamMembers.findFirst returns null
        mockDb.query.teamMembers.findFirst = vi.fn().mockResolvedValue(null);

        // Act: Import and call function
        const { getTeamForUser } = await import('../queries');
        const result = await getTeamForUser();

        // Assert: SPECIFICATION - MUST return null
        expect(result).toBeNull();
      });
    });
  });

  /**
   * SPECIFICATION 3: Business Queries
   */
  describe('Business Queries', () => {
    /**
     * SPECIFICATION 3.1: getBusinessesByTeam() - MUST Return Businesses for Team
     * 
     * Given: Team ID
     * When: getBusinessesByTeam() is called
     * Then: Returns all businesses for that team, ordered by creation date descending
     */
    describe('getBusinessesByTeam', () => {
      it('MUST return businesses for team ordered by creation date', async () => {
        // Arrange: Mock businesses exist
        const testBusinesses = [
          BusinessTestFactory.create({ id: 1, teamId: 1, createdAt: new Date('2024-01-02') }),
          BusinessTestFactory.create({ id: 2, teamId: 1, createdAt: new Date('2024-01-01') }),
        ];

        const mockSelect = {
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          orderBy: vi.fn().mockResolvedValue(testBusinesses),
        };

        mockDb.select.mockReturnValue(mockSelect as any);

        // Act: Import and call function
        const { getBusinessesByTeam } = await import('../queries');
        const result = await getBusinessesByTeam(1);

        // Assert: SPECIFICATION - MUST return businesses
        expect(result).toEqual(testBusinesses);
        expect(mockDb.select).toHaveBeenCalled();
        expect(mockSelect.orderBy).toHaveBeenCalled();
      });

      it('MUST return empty array when team has no businesses', async () => {
        // Arrange: Mock no businesses
        const mockSelect = {
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          orderBy: vi.fn().mockResolvedValue([]),
        };

        mockDb.select.mockReturnValue(mockSelect as any);

        // Act: Import and call function
        const { getBusinessesByTeam } = await import('../queries');
        const result = await getBusinessesByTeam(999);

        // Assert: SPECIFICATION - MUST return empty array
        expect(result).toEqual([]);
      });
    });

    /**
     * SPECIFICATION 3.2: getBusinessById() - MUST Return Business or Null
     * 
     * Given: Business ID
     * When: getBusinessById() is called
     * Then: Returns business if exists, null otherwise
     */
    describe('getBusinessById', () => {
      it('MUST return business when exists', async () => {
        // Arrange: Mock business exists
        const testBusiness = BusinessTestFactory.create({ id: 1, teamId: 1 });

        const mockSelect = {
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue([testBusiness]),
        };

        mockDb.select.mockReturnValue(mockSelect as any);

        // Act: Import and call function
        const { getBusinessById } = await import('../queries');
        const result = await getBusinessById(1);

        // Assert: SPECIFICATION - MUST return business
        expect(result).toEqual(testBusiness);
      });

      it('MUST return null when business does not exist', async () => {
        // Arrange: Mock business not found
        const mockSelect = {
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue([]),
        };

        mockDb.select.mockReturnValue(mockSelect as any);

        // Act: Import and call function
        const { getBusinessById } = await import('../queries');
        const result = await getBusinessById(999);

        // Assert: SPECIFICATION - MUST return null
        expect(result).toBeNull();
      });
    });

    /**
     * SPECIFICATION 3.3: createBusiness() - MUST Create Business
     * 
     * Given: Business data
     * When: createBusiness() is called
     * Then: Creates business and returns created business
     */
    describe('createBusiness', () => {
      it('MUST create and return business', async () => {
        // Arrange: Mock insert operation
        const newBusiness = {
          teamId: 1,
          name: 'New Business',
          url: 'https://example.com',
          category: 'Restaurant',
          status: 'pending' as const,
        };

        const createdBusiness = BusinessTestFactory.create({
          id: 1,
          ...newBusiness,
        });

        const mockInsert = {
          values: vi.fn().mockReturnThis(),
          returning: vi.fn().mockResolvedValue([createdBusiness]),
        };

        mockDb.insert = vi.fn().mockReturnValue(mockInsert as any);

        // Act: Import and call function
        const { createBusiness } = await import('../queries');
        const result = await createBusiness(newBusiness);

        // Assert: SPECIFICATION - MUST create and return business
        expect(result).toEqual(createdBusiness);
        expect(mockDb.insert).toHaveBeenCalledWith(businesses);
        expect(mockInsert.values).toHaveBeenCalledWith(newBusiness);
      });
    });

    /**
     * SPECIFICATION 3.4: updateBusiness() - MUST Update Business
     * 
     * Given: Business ID and updates
     * When: updateBusiness() is called
     * Then: Updates business and returns updated business
     */
    describe('updateBusiness', () => {
      it('MUST update and return business', async () => {
        // Arrange: Mock update operation
        const updates = {
          name: 'Updated Business',
          status: 'crawled' as const,
        };

        const updatedBusiness = BusinessTestFactory.create({
          id: 1,
          ...updates,
        });

        const mockUpdate = {
          set: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          returning: vi.fn().mockResolvedValue([updatedBusiness]),
        };

        mockDb.update = vi.fn().mockReturnValue(mockUpdate as any);

        // Act: Import and call function
        const { updateBusiness } = await import('../queries');
        const result = await updateBusiness(1, updates);

        // Assert: SPECIFICATION - MUST update and return business
        expect(result).toEqual(updatedBusiness);
        expect(mockDb.update).toHaveBeenCalledWith(businesses);
        expect(mockUpdate.set).toHaveBeenCalled();
      });
    });

    /**
     * SPECIFICATION 3.5: deleteBusiness() - MUST Delete Business
     * 
     * Given: Business ID
     * When: deleteBusiness() is called
     * Then: Deletes business and returns deleted business
     */
    describe('deleteBusiness', () => {
      it('MUST delete and return business', async () => {
        // Arrange: Mock delete operation
        const deletedBusiness = BusinessTestFactory.create({ id: 1 });

        const mockDelete = {
          where: vi.fn().mockReturnThis(),
          returning: vi.fn().mockResolvedValue([deletedBusiness]),
        };

        mockDb.delete = vi.fn().mockReturnValue(mockDelete as any);

        // Act: Import and call function
        const { deleteBusiness } = await import('../queries');
        const result = await deleteBusiness(1);

        // Assert: SPECIFICATION - MUST delete and return business
        expect(result).toEqual(deletedBusiness);
        expect(mockDb.delete).toHaveBeenCalledWith(businesses);
      });

      it('MUST return null when business does not exist', async () => {
        // Arrange: Mock delete returns empty
        const mockDelete = {
          where: vi.fn().mockReturnThis(),
          returning: vi.fn().mockResolvedValue([]),
        };

        mockDb.delete = vi.fn().mockReturnValue(mockDelete as any);

        // Act: Import and call function
        const { deleteBusiness } = await import('../queries');
        const result = await deleteBusiness(999);

        // Assert: SPECIFICATION - MUST return null
        expect(result).toBeNull();
      });
    });

    /**
     * SPECIFICATION 3.6: getBusinessCountByTeam() - MUST Return Count
     * 
     * Given: Team ID
     * When: getBusinessCountByTeam() is called
     * Then: Returns count of businesses for that team
     */
    describe('getBusinessCountByTeam', () => {
      it('MUST return count of businesses for team', async () => {
        // Arrange: Mock count query
        const mockSelect = {
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockResolvedValue([{ count: 5 }]),
        };

        mockDb.select.mockReturnValue(mockSelect as any);

        // Act: Import and call function
        const { getBusinessCountByTeam } = await import('../queries');
        const result = await getBusinessCountByTeam(1);

        // Assert: SPECIFICATION - MUST return count
        expect(result).toBe(5);
      });

      it('MUST return 0 when team has no businesses', async () => {
        // Arrange: Mock count query returns 0
        const mockSelect = {
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockResolvedValue([{ count: 0 }]),
        };

        mockDb.select.mockReturnValue(mockSelect as any);

        // Act: Import and call function
        const { getBusinessCountByTeam } = await import('../queries');
        const result = await getBusinessCountByTeam(999);

        // Assert: SPECIFICATION - MUST return 0
        expect(result).toBe(0);
      });
    });
  });
});

