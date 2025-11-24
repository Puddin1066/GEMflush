/**
 * Unit tests for fingerprint history API route
 * Tests authentication, authorization, data fetching, and error handling
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '../route';
import { db } from '@/lib/db/drizzle';

// Mock dependencies
vi.mock('@/lib/db/queries', () => ({
  getUser: vi.fn(),
  getTeamForUser: vi.fn(),
}));

vi.mock('@/lib/db/drizzle', () => ({
  db: {
    select: vi.fn(),
  },
}));

describe('GET /api/business/[id]/fingerprint/history', () => {
  const mockUser = { id: 1, email: 'test@example.com' };
  const mockTeam = { id: 1, planName: 'pro' };
  const mockBusiness = {
    id: 1,
    name: 'Test Business',
    teamId: 1,
    url: 'https://example.com',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Authentication & Authorization', () => {
    it('should return 401 if user is not authenticated', async () => {
      const { getUser } = await import('@/lib/db/queries');
      vi.mocked(getUser).mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/business/1/fingerprint/history');
      const params = Promise.resolve({ id: '1' });

      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 401 if team is not found', async () => {
      const { getUser, getTeamForUser } = await import('@/lib/db/queries');
      vi.mocked(getUser).mockResolvedValue(mockUser);
      vi.mocked(getTeamForUser).mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/business/1/fingerprint/history');
      const params = Promise.resolve({ id: '1' });

      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 404 if business does not belong to team', async () => {
      const { getUser, getTeamForUser } = await import('@/lib/db/queries');
      vi.mocked(getUser).mockResolvedValue(mockUser);
      vi.mocked(getTeamForUser).mockResolvedValue(mockTeam);

      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      });

      vi.mocked(db.select).mockReturnValue(mockSelect() as any);

      const request = new NextRequest('http://localhost/api/business/1/fingerprint/history');
      const params = Promise.resolve({ id: '1' });

      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Business not found');
    });
  });

  describe('Input Validation', () => {
    it('should return 400 for invalid business ID', async () => {
      const { getUser, getTeamForUser } = await import('@/lib/db/queries');
      vi.mocked(getUser).mockResolvedValue(mockUser);
      vi.mocked(getTeamForUser).mockResolvedValue(mockTeam);

      const request = new NextRequest('http://localhost/api/business/invalid/fingerprint/history');
      const params = Promise.resolve({ id: 'invalid' });

      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid business ID');
    });
  });

  describe('Data Fetching', () => {
    it('should return fingerprint history for valid business', async () => {
      const { getUser, getTeamForUser } = await import('@/lib/db/queries');
      vi.mocked(getUser).mockResolvedValue(mockUser);
      vi.mocked(getTeamForUser).mockResolvedValue(mockTeam);

      const mockFingerprints = [
        {
          id: 1,
          visibilityScore: 75,
          mentionRate: 80.5,
          sentimentScore: 0.85,
          accuracyScore: 0.7,
          avgRankPosition: 2.5,
          createdAt: new Date('2024-01-15T10:00:00Z'),
        },
        {
          id: 2,
          visibilityScore: 72,
          mentionRate: 77.8,
          sentimentScore: 0.82,
          accuracyScore: 0.68,
          avgRankPosition: 3.0,
          createdAt: new Date('2024-01-10T10:00:00Z'),
        },
      ];

      // Mock business query
      const mockBusinessSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockBusiness]),
          }),
        }),
      });

      // Mock fingerprints query
      const mockFingerprintsSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue(mockFingerprints),
          }),
        }),
      });

      vi.mocked(db.select)
        .mockReturnValueOnce(mockBusinessSelect() as any)
        .mockReturnValueOnce(mockFingerprintsSelect() as any);

      const request = new NextRequest('http://localhost/api/business/1/fingerprint/history');
      const params = Promise.resolve({ id: '1' });

      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.businessId).toBe(1);
      expect(data.businessName).toBe('Test Business');
      expect(data.history).toHaveLength(2);
      expect(data.total).toBe(2);

      // Verify data transformation
      expect(data.history[0]).toMatchObject({
        id: 1,
        visibilityScore: 75,
        mentionRate: 81, // Rounded
        sentimentScore: 85, // Rounded and multiplied by 100
        accuracyScore: 70, // Rounded and multiplied by 100
        avgRankPosition: 2.5,
      });
      expect(data.history[0].date).toBeDefined();
    });

    it('should handle null values in metrics correctly', async () => {
      const { getUser, getTeamForUser } = await import('@/lib/db/queries');
      vi.mocked(getUser).mockResolvedValue(mockUser);
      vi.mocked(getTeamForUser).mockResolvedValue(mockTeam);

      const mockFingerprints = [
        {
          id: 1,
          visibilityScore: 50,
          mentionRate: null,
          sentimentScore: null,
          accuracyScore: null,
          avgRankPosition: null,
          createdAt: new Date('2024-01-15T10:00:00Z'),
        },
      ];

      const mockBusinessSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockBusiness]),
          }),
        }),
      });

      const mockFingerprintsSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue(mockFingerprints),
          }),
        }),
      });

      vi.mocked(db.select)
        .mockReturnValueOnce(mockBusinessSelect() as any)
        .mockReturnValueOnce(mockFingerprintsSelect() as any);

      const request = new NextRequest('http://localhost/api/business/1/fingerprint/history');
      const params = Promise.resolve({ id: '1' });

      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.history[0]).toMatchObject({
        visibilityScore: 50,
        mentionRate: null,
        sentimentScore: null,
        accuracyScore: null,
        avgRankPosition: null,
      });
    });

    it('should return empty array when no fingerprints exist', async () => {
      const { getUser, getTeamForUser } = await import('@/lib/db/queries');
      vi.mocked(getUser).mockResolvedValue(mockUser);
      vi.mocked(getTeamForUser).mockResolvedValue(mockTeam);

      const mockBusinessSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockBusiness]),
          }),
        }),
      });

      const mockFingerprintsSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue([]),
          }),
        }),
      });

      vi.mocked(db.select)
        .mockReturnValueOnce(mockBusinessSelect() as any)
        .mockReturnValueOnce(mockFingerprintsSelect() as any);

      const request = new NextRequest('http://localhost/api/business/1/fingerprint/history');
      const params = Promise.resolve({ id: '1' });

      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.history).toEqual([]);
      expect(data.total).toBe(0);
    });
  });

  describe('Date Handling', () => {
    it('should handle Date objects correctly', async () => {
      const { getUser, getTeamForUser } = await import('@/lib/db/queries');
      vi.mocked(getUser).mockResolvedValue(mockUser);
      vi.mocked(getTeamForUser).mockResolvedValue(mockTeam);

      const date = new Date('2024-01-15T10:00:00Z');
      const mockFingerprints = [
        {
          id: 1,
          visibilityScore: 75,
          mentionRate: 80,
          sentimentScore: 0.85,
          accuracyScore: 0.7,
          avgRankPosition: 2.5,
          createdAt: date,
        },
      ];

      const mockBusinessSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockBusiness]),
          }),
        }),
      });

      const mockFingerprintsSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue(mockFingerprints),
          }),
        }),
      });

      vi.mocked(db.select)
        .mockReturnValueOnce(mockBusinessSelect() as any)
        .mockReturnValueOnce(mockFingerprintsSelect() as any);

      const request = new NextRequest('http://localhost/api/business/1/fingerprint/history');
      const params = Promise.resolve({ id: '1' });

      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.history[0].date).toBe(date.toISOString());
    });

    it('should handle string dates correctly', async () => {
      const { getUser, getTeamForUser } = await import('@/lib/db/queries');
      vi.mocked(getUser).mockResolvedValue(mockUser);
      vi.mocked(getTeamForUser).mockResolvedValue(mockTeam);

      const dateString = '2024-01-15T10:00:00Z';
      const mockFingerprints = [
        {
          id: 1,
          visibilityScore: 75,
          mentionRate: 80,
          sentimentScore: 0.85,
          accuracyScore: 0.7,
          avgRankPosition: 2.5,
          createdAt: dateString,
        },
      ];

      const mockBusinessSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockBusiness]),
          }),
        }),
      });

      const mockFingerprintsSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue(mockFingerprints),
          }),
        }),
      });

      vi.mocked(db.select)
        .mockReturnValueOnce(mockBusinessSelect() as any)
        .mockReturnValueOnce(mockFingerprintsSelect() as any);

      const request = new NextRequest('http://localhost/api/business/1/fingerprint/history');
      const params = Promise.resolve({ id: '1' });

      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.history[0].date).toBe(new Date(dateString).toISOString());
    });
  });

  describe('Error Handling', () => {
    it('should return 500 on database error', async () => {
      const { getUser, getTeamForUser } = await import('@/lib/db/queries');
      vi.mocked(getUser).mockResolvedValue(mockUser);
      vi.mocked(getTeamForUser).mockResolvedValue(mockTeam);

      vi.mocked(db.select).mockImplementation(() => {
        throw new Error('Database connection failed');
      });

      const request = new NextRequest('http://localhost/api/business/1/fingerprint/history');
      const params = Promise.resolve({ id: '1' });

      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal server error');
    });
  });
});

