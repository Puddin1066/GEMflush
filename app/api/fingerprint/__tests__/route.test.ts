import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '../route';
import { llmFingerprinter } from '@/lib/llm/fingerprinter';
import { db } from '@/lib/db/drizzle';

// Mock dependencies
vi.mock('@/lib/db/queries', () => ({
  getUser: vi.fn(),
}));

vi.mock('@/lib/db/drizzle', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    query: {
      teamMembers: {
        findMany: vi.fn(),
      },
    },
  },
}));

vi.mock('@/lib/llm/fingerprinter', () => ({
  llmFingerprinter: {
    fingerprint: vi.fn(),
  },
}));

describe('POST /api/fingerprint', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 401 when user is not authenticated', async () => {
    const { getUser } = await import('@/lib/db/queries');
    vi.mocked(getUser).mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/fingerprint', {
      method: 'POST',
      body: JSON.stringify({ businessId: 1 }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('should return 400 when businessId is missing', async () => {
    const { getUser } = await import('@/lib/db/queries');
    vi.mocked(getUser).mockResolvedValue({ id: 1 } as any);

    const request = new NextRequest('http://localhost:3000/api/fingerprint', {
      method: 'POST',
      body: JSON.stringify({}),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Business ID required');
  });

  it('should return 404 when business is not found', async () => {
    const { getUser } = await import('@/lib/db/queries');
    vi.mocked(getUser).mockResolvedValue({ id: 1 } as any);

    const mockDbSelect = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      }),
    });

    vi.mocked(db.select).mockReturnValue(mockDbSelect() as any);

    const request = new NextRequest('http://localhost:3000/api/fingerprint', {
      method: 'POST',
      body: JSON.stringify({ businessId: 999 }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Business not found');
  });

  it('should return 403 when user does not have access to business', async () => {
    const { getUser } = await import('@/lib/db/queries');
    vi.mocked(getUser).mockResolvedValue({ id: 1 } as any);

    const mockBusiness = { id: 1, teamId: 2 };
    const mockDbSelect = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([mockBusiness]),
        }),
      }),
    });

    vi.mocked(db.select).mockReturnValue(mockDbSelect() as any);
    vi.mocked(db.query.teamMembers.findMany).mockResolvedValue([
      { userId: 1, teamId: 1 } as any, // Different team
    ]);

    const request = new NextRequest('http://localhost:3000/api/fingerprint', {
      method: 'POST',
      body: JSON.stringify({ businessId: 1 }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe('Not authorized to access this business');
  });

  it('should run fingerprint analysis and save result', async () => {
    const { getUser } = await import('@/lib/db/queries');
    vi.mocked(getUser).mockResolvedValue({ id: 1 } as any);

    const mockBusiness = { id: 1, teamId: 1, name: 'Test Business' };
    const mockDbSelect = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([mockBusiness]),
        }),
      }),
    });

    const mockDbInsert = vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ id: 1 }]),
      }),
    });

    vi.mocked(db.select).mockReturnValue(mockDbSelect() as any);
    vi.mocked(db.insert).mockReturnValue(mockDbInsert() as any);
    vi.mocked(db.query.teamMembers.findMany).mockResolvedValue([
      { userId: 1, teamId: 1 } as any,
    ]);

    const mockAnalysis = {
      businessId: 1,
      businessName: 'Test Business',
      visibilityScore: 75,
      mentionRate: 80,
      sentimentScore: 0.8,
      accuracyScore: 0.85,
      avgRankPosition: 2,
      llmResults: [],
      competitiveLeaderboard: {
        targetBusiness: { name: 'Test Business', rank: 2, mentionCount: 3, avgPosition: 2 },
        competitors: [],
        totalRecommendationQueries: 3,
      },
      generatedAt: new Date(),
    };

    vi.mocked(llmFingerprinter.fingerprint).mockResolvedValue(mockAnalysis as any);

    const request = new NextRequest('http://localhost:3000/api/fingerprint', {
      method: 'POST',
      body: JSON.stringify({ businessId: 1 }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.fingerprintId).toBeDefined();
    expect(data.status).toBe('completed');
    expect(llmFingerprinter.fingerprint).toHaveBeenCalledWith(mockBusiness);
  });
});
