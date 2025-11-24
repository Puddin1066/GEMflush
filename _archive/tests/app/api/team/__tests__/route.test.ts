import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '../route';
import { getTeamForUser } from '@/lib/db/queries';

// Mock dependencies
vi.mock('@/lib/db/queries', () => ({
  getTeamForUser: vi.fn(),
}));

describe('GET /api/team', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return team data when team exists', async () => {
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
            name: 'Test User',
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
    expect(data.teamMembers).toBeDefined();
  });

  it('should return null when no team found', async () => {
    vi.mocked(getTeamForUser).mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/team');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toBeNull();
  });

  it('should handle errors gracefully', async () => {
    vi.mocked(getTeamForUser).mockRejectedValue(new Error('Database error'));

    const request = new NextRequest('http://localhost:3000/api/team');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Internal server error');
  });

  it('should return team with all members', async () => {
    const mockTeam = {
      id: 1,
      name: 'Test Team',
      planName: 'free',
      teamMembers: [
        {
          id: 1,
          userId: 1,
          teamId: 1,
          role: 'owner',
          user: {
            id: 1,
            name: 'Owner User',
          },
        },
        {
          id: 2,
          userId: 2,
          teamId: 1,
          role: 'member',
          user: {
            id: 2,
            name: 'Member User',
          },
        },
      ],
    };

    vi.mocked(getTeamForUser).mockResolvedValue(mockTeam as any);

    const request = new NextRequest('http://localhost:3000/api/team');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.teamMembers).toHaveLength(2);
    expect(data.teamMembers[0].role).toBe('owner');
    expect(data.teamMembers[1].role).toBe('member');
  });
});

