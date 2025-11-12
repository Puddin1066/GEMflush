import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST } from '../route';

// Mock dependencies
vi.mock('@/lib/db/queries', () => ({
  getUser: vi.fn(),
  getTeamForUser: vi.fn(),
  getBusinessesByTeam: vi.fn(),
  createBusiness: vi.fn(),
  getBusinessCountByTeam: vi.fn(),
}));

vi.mock('@/lib/gemflush/permissions', () => ({
  canAddBusiness: vi.fn(),
  getMaxBusinesses: vi.fn(),
}));

vi.mock('@/lib/validation/business', () => ({
  createBusinessSchema: {
    parse: vi.fn(),
  },
}));

describe('GET /api/business', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    const { getUser } = await import('@/lib/db/queries');
    vi.mocked(getUser).mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/business');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('returns 404 when no team found', async () => {
    const { getUser, getTeamForUser } = await import('@/lib/db/queries');
    vi.mocked(getUser).mockResolvedValue({ id: 1 } as any);
    vi.mocked(getTeamForUser).mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/business');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('No team found');
  });

  it('returns businesses for team', async () => {
    const { getUser, getTeamForUser, getBusinessesByTeam } = await import('@/lib/db/queries');
    const { getMaxBusinesses } = await import('@/lib/gemflush/permissions');

    const mockTeam = { id: 1, name: 'Test Team' };
    const mockBusinesses = [
      { id: 1, name: 'Business 1', teamId: 1 },
      { id: 2, name: 'Business 2', teamId: 1 },
    ];

    vi.mocked(getUser).mockResolvedValue({ id: 1 } as any);
    vi.mocked(getTeamForUser).mockResolvedValue(mockTeam as any);
    vi.mocked(getBusinessesByTeam).mockResolvedValue(mockBusinesses as any);
    vi.mocked(getMaxBusinesses).mockReturnValue(10);

    const request = new NextRequest('http://localhost:3000/api/business');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.businesses).toHaveLength(2);
    expect(data.maxBusinesses).toBe(10);
  });
});

describe('POST /api/business', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    const { getUser } = await import('@/lib/db/queries');
    vi.mocked(getUser).mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/business', {
      method: 'POST',
      body: JSON.stringify({ name: 'New Business' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('returns 403 when plan does not allow adding businesses', async () => {
    const { getUser, getTeamForUser } = await import('@/lib/db/queries');
    const { canAddBusiness } = await import('@/lib/gemflush/permissions');

    vi.mocked(getUser).mockResolvedValue({ id: 1 } as any);
    vi.mocked(getTeamForUser).mockResolvedValue({ id: 1 } as any);
    vi.mocked(canAddBusiness).mockReturnValue(false);

    const request = new NextRequest('http://localhost:3000/api/business', {
      method: 'POST',
      body: JSON.stringify({ name: 'New Business' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe('Business limit reached');
    expect(data.maxBusinesses).toBeDefined();
  });

  it('creates business successfully', async () => {
    const { getUser, getTeamForUser, createBusiness, getBusinessCountByTeam } = await import('@/lib/db/queries');
    const { canAddBusiness } = await import('@/lib/gemflush/permissions');
    const { createBusinessSchema } = await import('@/lib/validation/business');

    const mockTeam = { id: 1 };
    const mockBusiness = { id: 1, name: 'New Business', teamId: 1 };

    vi.mocked(getUser).mockResolvedValue({ id: 1 } as any);
    vi.mocked(getTeamForUser).mockResolvedValue(mockTeam as any);
    vi.mocked(canAddBusiness).mockReturnValue(true);
    vi.mocked(getBusinessCountByTeam).mockResolvedValue(0);
    vi.mocked(createBusinessSchema.parse).mockReturnValue({ name: 'New Business' });
    vi.mocked(createBusiness).mockResolvedValue(mockBusiness as any);

    const request = new NextRequest('http://localhost:3000/api/business', {
      method: 'POST',
      body: JSON.stringify({ name: 'New Business' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.business).toMatchObject(mockBusiness);
  });
});
