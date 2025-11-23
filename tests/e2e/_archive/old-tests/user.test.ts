import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/user/route';
import { getUser } from '@/lib/db/queries';

// Mock dependencies
vi.mock('@/lib/db/queries', () => ({
  getUser: vi.fn(),
}));

describe('User E2E Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Complete User Retrieval Workflow', () => {
    it('should retrieve authenticated user', async () => {
      const mockUser = {
        id: 1,
        name: 'Test User',
        email: 'test@example.com',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        deletedAt: null,
      };

      vi.mocked(getUser).mockResolvedValue(mockUser as any);

      const request = new NextRequest('http://localhost:3000/api/user');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.id).toBe(1);
      expect(data.name).toBe('Test User');
      expect(data.email).toBe('test@example.com');
    });

    it('should handle unauthenticated user', async () => {
      vi.mocked(getUser).mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/user');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toBeNull();
    });

    it('should handle expired session', async () => {
      // getUser() returns null for expired sessions
      vi.mocked(getUser).mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/user');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toBeNull();
    });
  });

  describe('Error Handling Workflow', () => {
    it('should handle database errors gracefully', async () => {
      vi.mocked(getUser).mockRejectedValue(new Error('Database connection failed'));

      const request = new NextRequest('http://localhost:3000/api/user');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal server error');
    });
  });
});

