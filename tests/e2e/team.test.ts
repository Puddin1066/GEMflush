import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/team/route';
import { getTeamForUser } from '@/lib/db/queries';

// Mock dependencies
vi.mock('@/lib/db/queries', () => ({
  getTeamForUser: vi.fn(),
}));

describe('Team E2E Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Complete Team Retrieval Workflow', () => {
    it('should retrieve team with all details', async () => {
      const mockTeam = {
        id: 1,
        name: 'Test Team',
        planName: 'pro',
        stripeCustomerId: 'cus_test123',
        stripeProductId: 'prod_test123',
        stripeSubscriptionId: 'sub_test123',
        subscriptionStatus: 'active',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        teamMembers: [
          {
            id: 1,
            userId: 1,
            teamId: 1,
            role: 'owner',
            user: {
              id: 1,
              name: 'Owner',
              email: 'owner@example.com',
            },
          },
          {
            id: 2,
            userId: 2,
            teamId: 1,
            role: 'member',
            user: {
              id: 2,
              name: 'Member',
              email: 'member@example.com',
            },
          },
        ],
      };

      vi.mocked(getTeamForUser).mockResolvedValue(mockTeam as any);

      const request = new NextRequest('http://localhost:3000/api/team');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.id).toBe(1);
      expect(data.name).toBe('Test Team');
      expect(data.planName).toBe('pro');
      expect(data.teamMembers).toHaveLength(2);
      expect(data.teamMembers[0].user.name).toBe('Owner');
      expect(data.teamMembers[1].user.name).toBe('Member');
    });

    it('should handle user without team', async () => {
      vi.mocked(getTeamForUser).mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/team');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toBeNull();
    });

    it('should return team with free plan', async () => {
      const mockTeam = {
        id: 1,
        name: 'Free Team',
        planName: 'free',
        teamMembers: [
          {
            id: 1,
            userId: 1,
            teamId: 1,
            role: 'owner',
            user: {
              id: 1,
              name: 'User',
              email: 'user@example.com',
            },
          },
        ],
      };

      vi.mocked(getTeamForUser).mockResolvedValue(mockTeam as any);

      const request = new NextRequest('http://localhost:3000/api/team');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.planName).toBe('free');
    });
  });

  describe('Error Handling Workflow', () => {
    it('should handle database errors gracefully', async () => {
      vi.mocked(getTeamForUser).mockRejectedValue(new Error('Database connection failed'));

      const request = new NextRequest('http://localhost:3000/api/team');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal server error');
    });
  });
});

