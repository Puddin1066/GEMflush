/**
 * Unit Tests: Wikidata Entity API Route
 * Tests entity retrieval with permission checks
 * 
 * SOLID: Single Responsibility - tests one API endpoint
 * DRY: Reuses existing mock patterns and test utilities
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '../[businessId]/route';
import * as queries from '@/lib/db/queries';
import { canPublishToWikidata } from '@/lib/gemflush/permissions';

// Mock database queries
vi.mock('@/lib/db/queries', () => ({
  getUser: vi.fn(),
  getTeamForUser: vi.fn(),
  getBusinessById: vi.fn(),
  getWikidataEntity: vi.fn(),
}));

// Mock permissions
vi.mock('@/lib/gemflush/permissions', () => ({
  canPublishToWikidata: vi.fn(),
}));

// Mock DTO conversion
vi.mock('@/lib/data/wikidata-dto', () => ({
  getWikidataPublishDTO: vi.fn(),
  toWikidataEntityDetailDTO: vi.fn(),
}));

describe('GET /api/wikidata/entity/[businessId]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    vi.mocked(queries.getUser).mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/wikidata/entity/1');
    const response = await GET(request, {
      params: Promise.resolve({ businessId: '1' }),
    });
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('returns 404 when no team found', async () => {
    vi.mocked(queries.getUser).mockResolvedValue({ id: 1 } as any);
    vi.mocked(queries.getTeamForUser).mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/wikidata/entity/1');
    const response = await GET(request, {
      params: Promise.resolve({ businessId: '1' }),
    });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('No team found');
  });

  it('returns 403 for free tier users', async () => {
    const mockUser = { id: 1 } as any;
    const mockTeam = { id: 1, planName: 'free' } as any;
    const mockBusiness = { id: 1, teamId: 1, status: 'crawled' } as any;

    vi.mocked(queries.getUser).mockResolvedValue(mockUser);
    vi.mocked(queries.getTeamForUser).mockResolvedValue(mockTeam);
    vi.mocked(queries.getBusinessById).mockResolvedValue(mockBusiness);
    vi.mocked(canPublishToWikidata).mockReturnValue(false);

    const request = new NextRequest('http://localhost:3000/api/wikidata/entity/1');
    const response = await GET(request, {
      params: Promise.resolve({ businessId: '1' }),
    });
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe('Upgrade to Pro plan to access Wikidata entity data');
    expect(canPublishToWikidata).toHaveBeenCalledWith(mockTeam);
  });

  it('returns entity data for pro tier users', async () => {
    const mockUser = { id: 1 } as any;
    const mockTeam = { id: 1, planName: 'pro' } as any;
    const mockBusiness = { id: 1, teamId: 1, status: 'crawled', wikidataQID: null } as any;
    const mockEntityData = {
      labels: { en: { value: 'Test Business' } },
      descriptions: { en: { value: 'Test Description' } },
      claims: {},
    };
    const mockEntityDTO = {
      label: 'Test Business',
      description: 'Test Description',
      claims: [],
    };

    vi.mocked(queries.getUser).mockResolvedValue(mockUser);
    vi.mocked(queries.getTeamForUser).mockResolvedValue(mockTeam);
    vi.mocked(queries.getBusinessById).mockResolvedValue(mockBusiness);
    vi.mocked(queries.getWikidataEntity).mockResolvedValue(null);
    vi.mocked(canPublishToWikidata).mockReturnValue(true);

    const { getWikidataPublishDTO, toWikidataEntityDetailDTO } = await import('@/lib/data/wikidata-dto');
    vi.mocked(getWikidataPublishDTO).mockResolvedValue({
      fullEntity: mockEntityData,
      canPublish: true,
      notability: { score: 0.8 },
      recommendation: 'publish',
    } as any);
    vi.mocked(toWikidataEntityDetailDTO).mockReturnValue(mockEntityDTO as any);

    const request = new NextRequest('http://localhost:3000/api/wikidata/entity/1');
    const response = await GET(request, {
      params: Promise.resolve({ businessId: '1' }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual(mockEntityDTO);
    expect(getWikidataPublishDTO).toHaveBeenCalledWith(1);
  });

  it('returns existing entity from database if published', async () => {
    const mockUser = { id: 1 } as any;
    const mockTeam = { id: 1, planName: 'pro' } as any;
    const mockBusiness = { id: 1, teamId: 1, status: 'published', wikidataQID: 'Q12345' } as any;
    const mockEntityData = {
      labels: { en: { value: 'Published Business' } },
      descriptions: { en: { value: 'Published Description' } },
      claims: {},
    };
    const mockEntityDTO = {
      label: 'Published Business',
      description: 'Published Description',
      claims: [],
      qid: 'Q12345',
    };

    vi.mocked(queries.getUser).mockResolvedValue(mockUser);
    vi.mocked(queries.getTeamForUser).mockResolvedValue(mockTeam);
    vi.mocked(queries.getBusinessById).mockResolvedValue(mockBusiness);
    vi.mocked(queries.getWikidataEntity).mockResolvedValue({
      id: 1,
      businessId: 1,
      entityData: mockEntityData,
    } as any);
    vi.mocked(canPublishToWikidata).mockReturnValue(true);

    const { toWikidataEntityDetailDTO } = await import('@/lib/data/wikidata-dto');
    vi.mocked(toWikidataEntityDetailDTO).mockReturnValue(mockEntityDTO as any);

    const request = new NextRequest('http://localhost:3000/api/wikidata/entity/1');
    const response = await GET(request, {
      params: Promise.resolve({ businessId: '1' }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual(mockEntityDTO);
    expect(toWikidataEntityDetailDTO).toHaveBeenCalledWith(mockEntityData, 'Q12345');
  });

  it('returns 400 if business not crawled', async () => {
    const mockUser = { id: 1 } as any;
    const mockTeam = { id: 1, planName: 'pro' } as any;
    const mockBusiness = { id: 1, teamId: 1, status: 'pending' } as any;

    vi.mocked(queries.getUser).mockResolvedValue(mockUser);
    vi.mocked(queries.getTeamForUser).mockResolvedValue(mockTeam);
    vi.mocked(queries.getBusinessById).mockResolvedValue(mockBusiness);
    vi.mocked(queries.getWikidataEntity).mockResolvedValue(null);
    vi.mocked(canPublishToWikidata).mockReturnValue(true);

    const request = new NextRequest('http://localhost:3000/api/wikidata/entity/1');
    const response = await GET(request, {
      params: Promise.resolve({ businessId: '1' }),
    });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Business must be crawled before entity can be generated');
  });

  it('returns 403 if business belongs to different team', async () => {
    const mockUser = { id: 1 } as any;
    const mockTeam = { id: 1, planName: 'pro' } as any;
    const mockBusiness = { id: 1, teamId: 2, status: 'crawled' } as any; // Different team

    vi.mocked(queries.getUser).mockResolvedValue(mockUser);
    vi.mocked(queries.getTeamForUser).mockResolvedValue(mockTeam);
    vi.mocked(queries.getBusinessById).mockResolvedValue(mockBusiness);
    vi.mocked(canPublishToWikidata).mockReturnValue(true);

    const request = new NextRequest('http://localhost:3000/api/wikidata/entity/1');
    const response = await GET(request, {
      params: Promise.resolve({ businessId: '1' }),
    });
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe('Unauthorized');
  });

  it('returns 400 if invalid business ID', async () => {
    const mockUser = { id: 1 } as any;
    const mockTeam = { id: 1, planName: 'pro' } as any;

    vi.mocked(queries.getUser).mockResolvedValue(mockUser);
    vi.mocked(queries.getTeamForUser).mockResolvedValue(mockTeam);

    const request = new NextRequest('http://localhost:3000/api/wikidata/entity/invalid');
    const response = await GET(request, {
      params: Promise.resolve({ businessId: 'invalid' }),
    });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid business ID');
  });

  it('returns 404 if business not found', async () => {
    const mockUser = { id: 1 } as any;
    const mockTeam = { id: 1, planName: 'pro' } as any;

    vi.mocked(queries.getUser).mockResolvedValue(mockUser);
    vi.mocked(queries.getTeamForUser).mockResolvedValue(mockTeam);
    vi.mocked(queries.getBusinessById).mockResolvedValue(null);
    vi.mocked(canPublishToWikidata).mockReturnValue(true);

    const request = new NextRequest('http://localhost:3000/api/wikidata/entity/999');
    const response = await GET(request, {
      params: Promise.resolve({ businessId: '999' }),
    });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Business not found');
  });
});

