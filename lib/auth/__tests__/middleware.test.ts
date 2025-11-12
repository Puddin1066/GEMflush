import { describe, it, expect, vi, beforeEach } from 'vitest';
import { z } from 'zod';
import {
  validatedAction,
  validatedActionWithUser,
  withTeam,
  verifyBusinessOwnership,
  type ActionState,
} from '../middleware';
import { redirect } from 'next/navigation';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
}));

// Mock database queries
vi.mock('@/lib/db/queries', () => ({
  getUser: vi.fn(),
  getTeamForUser: vi.fn(),
  getBusinessById: vi.fn(),
}));

describe('Auth Middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('validatedAction', () => {
    it('should execute action with valid data', async () => {
      const schema = z.object({
        email: z.string().email(),
        name: z.string(),
      });

      const action = vi.fn(async (data) => {
        return { success: true, data };
      });

      const validated = validatedAction(schema, action);
      const formData = new FormData();
      formData.set('email', 'test@example.com');
      formData.set('name', 'Test User');

      const result = await validated({} as ActionState, formData);

      expect(action).toHaveBeenCalledWith(
        { email: 'test@example.com', name: 'Test User' },
        formData
      );
      expect(result.success).toBe(true);
    });

    it('should return error for invalid data', async () => {
      const schema = z.object({
        email: z.string().email(),
        name: z.string(),
      });

      const action = vi.fn();

      const validated = validatedAction(schema, action);
      const formData = new FormData();
      formData.set('email', 'invalid-email');
      formData.set('name', 'Test User');

      const result = await validated({} as ActionState, formData);

      expect(action).not.toHaveBeenCalled();
      expect(result.error).toBeDefined();
      expect(result.error).toContain('email');
    });
  });

  describe('validatedActionWithUser', () => {
    it('should execute action with authenticated user', async () => {
      const { getUser } = await import('@/lib/db/queries');
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        passwordHash: 'hash',
        role: 'owner' as const,
        name: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      vi.mocked(getUser).mockResolvedValue(mockUser);

      const schema = z.object({
        name: z.string(),
      });

      const action = vi.fn(async (data, formData, user) => {
        return { success: true, user: user.id };
      });

      const validated = validatedActionWithUser(schema, action);
      const formData = new FormData();
      formData.set('name', 'Test User');

      const result = await validated({} as ActionState, formData);

      expect(action).toHaveBeenCalledWith(
        { name: 'Test User' },
        formData,
        mockUser
      );
      expect(result.success).toBe(true);
    });

    it('should throw error when user is not authenticated', async () => {
      const { getUser } = await import('@/lib/db/queries');
      vi.mocked(getUser).mockResolvedValue(null);

      const schema = z.object({
        name: z.string(),
      });

      const action = vi.fn();

      const validated = validatedActionWithUser(schema, action);
      const formData = new FormData();
      formData.set('name', 'Test User');

      await expect(validated({} as ActionState, formData)).rejects.toThrow(
        'User is not authenticated'
      );

      expect(action).not.toHaveBeenCalled();
    });
  });

  describe('withTeam', () => {
    it('should execute action with team', async () => {
      const { getUser, getTeamForUser } = await import('@/lib/db/queries');
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        passwordHash: 'hash',
        role: 'owner' as const,
        name: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      const mockTeam = {
        id: 1,
        name: 'Test Team',
        createdAt: new Date(),
        updatedAt: new Date(),
        stripeCustomerId: null,
        stripeSubscriptionId: null,
        stripeProductId: null,
        planName: null,
        subscriptionStatus: null,
        members: [],
      };

      vi.mocked(getUser).mockResolvedValue(mockUser);
      vi.mocked(getTeamForUser).mockResolvedValue(mockTeam);

      const action = vi.fn(async (formData, team) => {
        return { success: true, teamId: team.id };
      });

      const withTeamAction = withTeam(action);
      const formData = new FormData();

      const result = await withTeamAction(formData);

      expect(action).toHaveBeenCalledWith(formData, mockTeam);
      expect(result.success).toBe(true);
      expect(result.teamId).toBe(1);
    });

    it('should redirect when user is not authenticated', async () => {
      const { getUser } = await import('@/lib/db/queries');
      vi.mocked(getUser).mockResolvedValue(null);

      const action = vi.fn();
      const withTeamAction = withTeam(action);
      const formData = new FormData();

      await expect(withTeamAction(formData)).rejects.toThrow('NEXT_REDIRECT');
      expect(redirect).toHaveBeenCalledWith('/sign-in');
      expect(action).not.toHaveBeenCalled();
    });

    it('should throw error when team is not found', async () => {
      const { getUser, getTeamForUser } = await import('@/lib/db/queries');
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        passwordHash: 'hash',
        role: 'owner' as const,
        name: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      vi.mocked(getUser).mockResolvedValue(mockUser);
      vi.mocked(getTeamForUser).mockResolvedValue(null);

      const action = vi.fn();
      const withTeamAction = withTeam(action);
      const formData = new FormData();

      await expect(withTeamAction(formData)).rejects.toThrow('Team not found');
      expect(action).not.toHaveBeenCalled();
    });
  });

  describe('verifyBusinessOwnership', () => {
    it('should return authorized when business belongs to team', async () => {
      const { getBusinessById } = await import('@/lib/db/queries');
      vi.mocked(getBusinessById).mockResolvedValue({
        id: 1,
        teamId: 1,
      } as any);

      const result = await verifyBusinessOwnership(1, 1);

      expect(result.authorized).toBe(true);
      expect(result.business).toBeDefined();
      expect(result.business?.teamId).toBe(1);
    });

    it('should return unauthorized when business belongs to different team', async () => {
      const { getBusinessById } = await import('@/lib/db/queries');
      vi.mocked(getBusinessById).mockResolvedValue({
        id: 1,
        teamId: 999,
      } as any);

      const result = await verifyBusinessOwnership(1, 1);

      expect(result.authorized).toBe(false);
      expect(result.business).toBeDefined();
    });

    it('should return unauthorized when business is not found', async () => {
      const { getBusinessById } = await import('@/lib/db/queries');
      vi.mocked(getBusinessById).mockResolvedValue(null);

      const result = await verifyBusinessOwnership(999, 1);

      expect(result.authorized).toBe(false);
      expect(result.business).toBeNull();
    });
  });
});

