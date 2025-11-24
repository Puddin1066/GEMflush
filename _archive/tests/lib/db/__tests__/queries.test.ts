import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as queries from '../queries';

// Mock dependencies
vi.mock('../drizzle', () => ({
  db: {
    select: vi.fn(),
    update: vi.fn(),
    insert: vi.fn(),
    query: {
      teamMembers: {
        findFirst: vi.fn(),
      },
    },
  },
}));

vi.mock('next/headers', () => ({
  cookies: vi.fn(),
}));

vi.mock('@/lib/auth/session', () => ({
  verifyToken: vi.fn(),
}));

describe('Database Queries', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getUser', () => {
    it('should return null when no session cookie', async () => {
      const { cookies } = await import('next/headers');
      vi.mocked(cookies).mockResolvedValue({
        get: vi.fn().mockReturnValue(null),
      } as any);

      const user = await queries.getUser();
      expect(user).toBeNull();
    });

    it('should return null when token is invalid', async () => {
      const { cookies } = await import('next/headers');
      const { verifyToken } = await import('@/lib/auth/session');
      const { db } = await import('../drizzle');

      vi.mocked(cookies).mockResolvedValue({
        get: vi.fn().mockReturnValue({ value: 'invalid-token' }),
      } as any);
      vi.mocked(verifyToken).mockResolvedValue(null);

      const user = await queries.getUser();
      expect(user).toBeNull();
    });

    it('should return null when token is expired', async () => {
      const { cookies } = await import('next/headers');
      const { verifyToken } = await import('@/lib/auth/session');

      vi.mocked(cookies).mockResolvedValue({
        get: vi.fn().mockReturnValue({ value: 'token' }),
      } as any);
      vi.mocked(verifyToken).mockResolvedValue({
        user: { id: 1 },
        expires: new Date(Date.now() - 1000).toISOString(),
      } as any);

      const user = await queries.getUser();
      expect(user).toBeNull();
    });

    it('should return user when session is valid', async () => {
      const { cookies } = await import('next/headers');
      const { verifyToken } = await import('@/lib/auth/session');
      const { db } = await import('../drizzle');

      vi.mocked(cookies).mockResolvedValue({
        get: vi.fn().mockReturnValue({ value: 'valid-token' }),
      } as any);
      vi.mocked(verifyToken).mockResolvedValue({
        user: { id: 1 },
        expires: new Date(Date.now() + 3600000).toISOString(),
      } as any);

      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ id: 1, email: 'test@test.com' }]),
          }),
        }),
      });
      vi.mocked(db.select).mockReturnValue(mockSelect() as any);

      const user = await queries.getUser();
      expect(user).toMatchObject({ id: 1, email: 'test@test.com' });
    });

    it('should return null when user is deleted', async () => {
      const { cookies } = await import('next/headers');
      const { verifyToken } = await import('@/lib/auth/session');
      const { db } = await import('../drizzle');

      vi.mocked(cookies).mockResolvedValue({
        get: vi.fn().mockReturnValue({ value: 'valid-token' }),
      } as any);
      vi.mocked(verifyToken).mockResolvedValue({
        user: { id: 1 },
        expires: new Date(Date.now() + 3600000).toISOString(),
      } as any);

      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]), // User not found (deleted)
          }),
        }),
      });
      vi.mocked(db.select).mockReturnValue(mockSelect() as any);

      const user = await queries.getUser();
      expect(user).toBeNull();
    });
  });

  describe('getTeamByStripeCustomerId', () => {
    it('should return team when found', async () => {
      const { db } = await import('../drizzle');

      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ id: 1, stripeCustomerId: 'cus_123' }]),
          }),
        }),
      });
      vi.mocked(db.select).mockReturnValue(mockSelect() as any);

      const team = await queries.getTeamByStripeCustomerId('cus_123');
      expect(team).toMatchObject({ id: 1, stripeCustomerId: 'cus_123' });
    });

    it('should return null when team not found', async () => {
      const { db } = await import('../drizzle');

      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      });
      vi.mocked(db.select).mockReturnValue(mockSelect() as any);

      const team = await queries.getTeamByStripeCustomerId('cus_999');
      expect(team).toBeNull();
    });
  });

  describe('updateTeamSubscription', () => {
    it('should update team subscription data', async () => {
      const { db } = await import('../drizzle');

      const mockUpdate = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      });
      vi.mocked(db.update).mockReturnValue(mockUpdate() as any);

      await queries.updateTeamSubscription(1, {
        stripeSubscriptionId: 'sub_123',
        stripeProductId: 'prod_123',
        planName: 'Pro',
        subscriptionStatus: 'active',
      });

      expect(db.update).toHaveBeenCalled();
    });
  });

  describe('getTeamForUser', () => {
    it('should return null when user not authenticated', async () => {
      const { cookies } = await import('next/headers');
      vi.mocked(cookies).mockResolvedValue({
        get: vi.fn().mockReturnValue(null),
      } as any);

      const team = await queries.getTeamForUser();
      expect(team).toBeNull();
    });

    it('should return team when user has team membership', async () => {
      const { db } = await import('../drizzle');
      const { cookies } = await import('next/headers');
      const { verifyToken } = await import('@/lib/auth/session');

      // Mock authentication
      vi.mocked(cookies).mockResolvedValue({
        get: vi.fn().mockReturnValue({ value: 'valid-token' }),
      } as any);
      vi.mocked(verifyToken).mockResolvedValue({
        user: { id: 1 },
        expires: new Date(Date.now() + 3600000).toISOString(),
      } as any);

      // Mock user query
      const mockUserSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ id: 1, email: 'test@test.com' }]),
          }),
        }),
      });
      vi.mocked(db.select).mockReturnValue(mockUserSelect() as any);

      // Mock team query
      vi.mocked(db.query.teamMembers.findFirst).mockResolvedValue({
        team: { id: 1, name: 'Test Team' },
      } as any);

      const team = await queries.getTeamForUser();
      expect(team).toMatchObject({ id: 1, name: 'Test Team' });
    });

    it('should return null when user has no team membership', async () => {
      const { db } = await import('../drizzle');
      const { cookies } = await import('next/headers');
      const { verifyToken } = await import('@/lib/auth/session');

      // Mock authentication
      vi.mocked(cookies).mockResolvedValue({
        get: vi.fn().mockReturnValue({ value: 'valid-token' }),
      } as any);
      vi.mocked(verifyToken).mockResolvedValue({
        user: { id: 1 },
        expires: new Date(Date.now() + 3600000).toISOString(),
      } as any);

      // Mock user query
      const mockUserSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ id: 1, email: 'test@test.com' }]),
          }),
        }),
      });
      vi.mocked(db.select).mockReturnValue(mockUserSelect() as any);

      // Mock no team membership
      vi.mocked(db.query.teamMembers.findFirst).mockResolvedValue(null);

      const team = await queries.getTeamForUser();
      expect(team).toBeNull();
    });
  });

  describe('getBusinessesByTeam', () => {
    it('should return businesses for team', async () => {
      const { db } = await import('../drizzle');

      const mockBusinesses = [
        { id: 1, name: 'Business 1', teamId: 1 },
        { id: 2, name: 'Business 2', teamId: 1 },
      ];

      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue(mockBusinesses),
          }),
        }),
      });
      vi.mocked(db.select).mockReturnValue(mockSelect() as any);

      const businesses = await queries.getBusinessesByTeam(1);
      expect(businesses).toHaveLength(2);
      expect(businesses[0]).toMatchObject({ id: 1, name: 'Business 1' });
    });

    it('should return empty array when team has no businesses', async () => {
      const { db } = await import('../drizzle');

      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue([]),
          }),
        }),
      });
      vi.mocked(db.select).mockReturnValue(mockSelect() as any);

      const businesses = await queries.getBusinessesByTeam(1);
      expect(businesses).toHaveLength(0);
    });
  });

  describe('getBusinessById', () => {
    it('should return business when found', async () => {
      const { db } = await import('../drizzle');

      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ id: 1, name: 'Test Business' }]),
          }),
        }),
      });
      vi.mocked(db.select).mockReturnValue(mockSelect() as any);

      const business = await queries.getBusinessById(1);
      expect(business).toMatchObject({ id: 1, name: 'Test Business' });
    });

    it('should return null when business not found', async () => {
      const { db } = await import('../drizzle');

      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      });
      vi.mocked(db.select).mockReturnValue(mockSelect() as any);

      const business = await queries.getBusinessById(999);
      expect(business).toBeNull();
    });
  });

  describe('createBusiness', () => {
    it('should create and return new business', async () => {
      const { db } = await import('../drizzle');

      const newBusiness = {
        name: 'New Business',
        teamId: 1,
        status: 'pending',
      };

      const mockInsert = vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: 1, ...newBusiness }]),
        }),
      });
      vi.mocked(db.insert).mockReturnValue(mockInsert() as any);

      const business = await queries.createBusiness(newBusiness as any);
      expect(business).toMatchObject({ id: 1, ...newBusiness });
    });
  });

  describe('updateBusiness', () => {
    it('should update and return business', async () => {
      const { db } = await import('../drizzle');

      const updates = { name: 'Updated Business' };

      const mockUpdate = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([{ id: 1, ...updates }]),
          }),
        }),
      });
      vi.mocked(db.update).mockReturnValue(mockUpdate() as any);

      const business = await queries.updateBusiness(1, updates);
      expect(business).toMatchObject({ id: 1, ...updates });
    });
  });

  describe('getBusinessCountByTeam', () => {
    it('should return count of businesses for team', async () => {
      const { db } = await import('../drizzle');

      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ count: 5 }]),
        }),
      });
      vi.mocked(db.select).mockReturnValue(mockSelect() as any);

      const count = await queries.getBusinessCountByTeam(1);
      expect(count).toBe(5);
    });

    it('should return 0 when team has no businesses', async () => {
      const { db } = await import('../drizzle');

      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ count: 0 }]),
        }),
      });
      vi.mocked(db.select).mockReturnValue(mockSelect() as any);

      const count = await queries.getBusinessCountByTeam(1);
      expect(count).toBe(0);
    });
  });

  describe('getLatestFingerprint', () => {
    it('should return latest fingerprint for business', async () => {
      const { db } = await import('../drizzle');

      const mockFingerprint = {
        id: 1,
        businessId: 1,
        visibilityScore: 75,
        createdAt: new Date(),
      };

      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([mockFingerprint]),
            }),
          }),
        }),
      });
      vi.mocked(db.select).mockReturnValue(mockSelect() as any);

      const fingerprint = await queries.getLatestFingerprint(1);
      expect(fingerprint).toMatchObject(mockFingerprint);
    });

    it('should return null when no fingerprint exists', async () => {
      const { db } = await import('../drizzle');

      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([]),
            }),
          }),
        }),
      });
      vi.mocked(db.select).mockReturnValue(mockSelect() as any);

      const fingerprint = await queries.getLatestFingerprint(1);
      expect(fingerprint).toBeNull();
    });
  });

  describe('createCrawlJob', () => {
    it('should create and return crawl job', async () => {
      const { db } = await import('../drizzle');

      const jobData = {
        businessId: 1,
        jobType: 'initial_crawl',
        status: 'queued',
        progress: 0,
      };

      const mockInsert = vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: 1, ...jobData }]),
        }),
      });
      vi.mocked(db.insert).mockReturnValue(mockInsert() as any);

      const job = await queries.createCrawlJob(jobData as any);
      expect(job).toMatchObject({ id: 1, ...jobData });
    });
  });

  describe('getActivityLogs', () => {
    it('should throw error when user not authenticated', async () => {
      // Mock getUser to return null by mocking cookies
      const { cookies } = await import('next/headers');
      vi.mocked(cookies).mockResolvedValue({
        get: vi.fn().mockReturnValue(null),
      } as any);

      await expect(queries.getActivityLogs()).rejects.toThrow('User not authenticated');
    });

    it('should query activity logs when user is authenticated', async () => {
      const { db } = await import('../drizzle');
      const { cookies } = await import('next/headers');
      const { verifyToken } = await import('@/lib/auth/session');

      // Mock authentication flow
      vi.mocked(cookies).mockResolvedValue({
        get: vi.fn().mockReturnValue({ value: 'valid-token' }),
      } as any);
      vi.mocked(verifyToken).mockResolvedValue({
        user: { id: 1 },
        expires: new Date(Date.now() + 3600000).toISOString(),
      } as any);

      const mockLogs = [
        { id: 1, action: 'SIGN_IN', timestamp: new Date(), userName: 'Test User' },
      ];

      // Create a chainable mock that handles both getUser and getActivityLogs queries
      let callCount = 0;
      const mockSelect = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // First call is getUser
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([{ id: 1, email: 'test@test.com' }]),
              }),
            }),
          };
        } else {
          // Second call is getActivityLogs
          return {
            from: vi.fn().mockReturnValue({
              leftJoin: vi.fn().mockReturnValue({
                where: vi.fn().mockReturnValue({
                  orderBy: vi.fn().mockReturnValue({
                    limit: vi.fn().mockResolvedValue(mockLogs),
                  }),
                }),
              }),
            }),
          };
        }
      });
      vi.mocked(db.select).mockImplementation(mockSelect);

      const logs = await queries.getActivityLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0]).toMatchObject({ action: 'SIGN_IN' });
    });
  });
});

