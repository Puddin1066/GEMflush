import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '../[id]/route';

// Mock database
vi.mock('@/lib/db/drizzle', () => ({
  db: {
    select: vi.fn(),
    query: {
      teamMembers: {
        findMany: vi.fn(),
      },
    },
  },
}));

// Mock queries
vi.mock('@/lib/db/queries', () => ({
  getUser: vi.fn(),
}));

// Mock DTO
vi.mock('@/lib/data/fingerprint-dto', () => ({
  toFingerprintDetailDTO: vi.fn(),
}));

describe('GET /api/fingerprint/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    const { getUser } = await import('@/lib/db/queries');
    vi.mocked(getUser).mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/fingerprint/1');
    const response = await GET(request, { params: Promise.resolve({ id: '1' }) });
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('returns 400 for invalid fingerprint ID', async () => {
    const { getUser } = await import('@/lib/db/queries');
    vi.mocked(getUser).mockResolvedValue({ id: 1 } as any);

    const request = new NextRequest('http://localhost:3000/api/fingerprint/invalid');
    const response = await GET(request, { params: Promise.resolve({ id: 'invalid' }) });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid fingerprint ID');
  });

  it('returns 404 when fingerprint not found', async () => {
    const { getUser } = await import('@/lib/db/queries');
    const { db } = await import('@/lib/db/drizzle');

    vi.mocked(getUser).mockResolvedValue({ id: 1 } as any);
    const mockSelect = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        innerJoin: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      }),
    });
    vi.mocked(db.select).mockReturnValue(mockSelect() as any);

    const request = new NextRequest('http://localhost:3000/api/fingerprint/999');
    const response = await GET(request, { params: Promise.resolve({ id: '999' }) });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Fingerprint not found');
  });

  it('returns 403 when user does not have access', async () => {
    const { getUser } = await import('@/lib/db/queries');
    const { db } = await import('@/lib/db/drizzle');

    vi.mocked(getUser).mockResolvedValue({ id: 1 } as any);
    vi.mocked(db.query.teamMembers.findMany).mockResolvedValue([]);

    const mockSelect = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        innerJoin: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([
              {
                fingerprint: { id: 1, businessId: 1 },
                business: { id: 1, teamId: 2 },
              },
            ]),
          }),
        }),
      }),
    });
    vi.mocked(db.select).mockReturnValue(mockSelect() as any);

    const request = new NextRequest('http://localhost:3000/api/fingerprint/1');
    const response = await GET(request, { params: Promise.resolve({ id: '1' }) });
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe('Not authorized to view this fingerprint');
  });

  it('returns fingerprint DTO when found', async () => {
    const { getUser } = await import('@/lib/db/queries');
    const { db } = await import('@/lib/db/drizzle');
    const { toFingerprintDetailDTO } = await import('@/lib/data/fingerprint-dto');

    vi.mocked(getUser).mockResolvedValue({ id: 1 } as any);
    vi.mocked(db.query.teamMembers.findMany).mockResolvedValue([{ teamId: 1 }] as any);

    const mockFingerprint = {
      id: 1,
      businessId: 1,
      visibilityScore: 75,
      llmResults: [],
      generatedAt: new Date(),
    };

    const mockSelect = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        innerJoin: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([
              {
                fingerprint: mockFingerprint,
                business: { id: 1, teamId: 1 },
              },
            ]),
          }),
        }),
      }),
    });
    vi.mocked(db.select).mockReturnValue(mockSelect() as any);

    // Mock previous fingerprint query
    const mockSelectPrevious = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockFingerprint]),
          }),
        }),
      }),
    });
    vi.mocked(db.select).mockReturnValueOnce(mockSelect() as any).mockReturnValueOnce(mockSelectPrevious() as any);

    const mockDTO = {
      visibilityScore: 75,
      trend: 'neutral',
      summary: { mentionRate: 60 },
      results: [],
    };
    vi.mocked(toFingerprintDetailDTO).mockReturnValue(mockDTO as any);

    const request = new NextRequest('http://localhost:3000/api/fingerprint/1');
    const response = await GET(request, { params: Promise.resolve({ id: '1' }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toMatchObject(mockDTO);
    expect(toFingerprintDetailDTO).toHaveBeenCalled();
  });
});

