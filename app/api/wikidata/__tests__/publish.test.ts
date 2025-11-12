import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '../publish/route';

// Mock dependencies
vi.mock('@/lib/db/queries', () => ({
  getUser: vi.fn(),
  getTeamForUser: vi.fn(),
  getBusinessById: vi.fn(),
  updateBusiness: vi.fn(),
  createWikidataEntity: vi.fn(),
}));

vi.mock('@/lib/gemflush/permissions', () => ({
  canPublishToWikidata: vi.fn(),
}));

vi.mock('@/lib/data/wikidata-dto', () => ({
  getWikidataPublishDTO: vi.fn(),
}));

vi.mock('@/lib/wikidata/publisher', () => ({
  wikidataPublisher: {
    publishEntity: vi.fn(),
  },
}));

describe('POST /api/wikidata/publish', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    const { getUser } = await import('@/lib/db/queries');
    vi.mocked(getUser).mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/wikidata/publish', {
      method: 'POST',
      body: JSON.stringify({ businessId: 1 }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('returns 404 when no team found', async () => {
    const { getUser, getTeamForUser } = await import('@/lib/db/queries');
    vi.mocked(getUser).mockResolvedValue({ id: 1 } as any);
    vi.mocked(getTeamForUser).mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/wikidata/publish', {
      method: 'POST',
      body: JSON.stringify({ businessId: 1 }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('No team found');
  });

  it('returns 403 when plan does not allow publishing', async () => {
    const { getUser, getTeamForUser } = await import('@/lib/db/queries');
    const { canPublishToWikidata } = await import('@/lib/gemflush/permissions');

    vi.mocked(getUser).mockResolvedValue({ id: 1 } as any);
    vi.mocked(getTeamForUser).mockResolvedValue({ id: 1 } as any);
    vi.mocked(canPublishToWikidata).mockReturnValue(false);

    const request = new NextRequest('http://localhost:3000/api/wikidata/publish', {
      method: 'POST',
      body: JSON.stringify({ businessId: 1 }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe('Upgrade to Pro plan to publish to Wikidata');
  });

  it('returns 400 when business not crawled', async () => {
    const { getUser, getTeamForUser, getBusinessById } = await import('@/lib/db/queries');
    const { canPublishToWikidata } = await import('@/lib/gemflush/permissions');

    vi.mocked(getUser).mockResolvedValue({ id: 1 } as any);
    vi.mocked(getTeamForUser).mockResolvedValue({ id: 1 } as any);
    vi.mocked(canPublishToWikidata).mockReturnValue(true);
    vi.mocked(getBusinessById).mockResolvedValue({
      id: 1,
      teamId: 1,
      status: 'pending',
    } as any);

    const request = new NextRequest('http://localhost:3000/api/wikidata/publish', {
      method: 'POST',
      body: JSON.stringify({ businessId: 1 }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Business must be crawled before publishing');
  });

  it('returns 400 when business does not meet notability standards', async () => {
    const { getUser, getTeamForUser, getBusinessById } = await import('@/lib/db/queries');
    const { canPublishToWikidata } = await import('@/lib/gemflush/permissions');
    const { getWikidataPublishDTO } = await import('@/lib/data/wikidata-dto');

    vi.mocked(getUser).mockResolvedValue({ id: 1 } as any);
    vi.mocked(getTeamForUser).mockResolvedValue({ id: 1 } as any);
    vi.mocked(canPublishToWikidata).mockReturnValue(true);
    vi.mocked(getBusinessById).mockResolvedValue({
      id: 1,
      teamId: 1,
      status: 'crawled',
    } as any);
    vi.mocked(getWikidataPublishDTO).mockResolvedValue({
      canPublish: false,
      notability: {
        isNotable: false,
        confidence: 0.5,
        reasons: ['Insufficient references'],
        seriousReferenceCount: 1,
        topReferences: [],
      },
      recommendation: 'Do not publish',
      businessId: 1,
      businessName: 'Test Business',
      entity: { label: 'Test', description: 'Test', claimCount: 0 },
      fullEntity: {},
    } as any);

    const request = new NextRequest('http://localhost:3000/api/wikidata/publish', {
      method: 'POST',
      body: JSON.stringify({ businessId: 1 }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Business does not meet notability standards');
    expect(data.recommendation).toBe('Do not publish');
  });

  it('publishes successfully when all conditions met', async () => {
    const { getUser, getTeamForUser, getBusinessById, updateBusiness, createWikidataEntity } = await import('@/lib/db/queries');
    const { canPublishToWikidata } = await import('@/lib/gemflush/permissions');
    const { getWikidataPublishDTO } = await import('@/lib/data/wikidata-dto');
    const { wikidataPublisher } = await import('@/lib/wikidata/publisher');

    vi.mocked(getUser).mockResolvedValue({ id: 1 } as any);
    vi.mocked(getTeamForUser).mockResolvedValue({ id: 1 } as any);
    vi.mocked(canPublishToWikidata).mockReturnValue(true);
    vi.mocked(getBusinessById).mockResolvedValue({
      id: 1,
      teamId: 1,
      status: 'crawled',
    } as any);
    vi.mocked(getWikidataPublishDTO).mockResolvedValue({
      canPublish: true,
      notability: {
        isNotable: true,
        confidence: 0.8,
        reasons: ['Has references'],
        seriousReferenceCount: 5,
        topReferences: [],
      },
      recommendation: 'Ready to publish',
      businessId: 1,
      businessName: 'Test Business',
      entity: { label: 'Test', description: 'Test', claimCount: 2 },
      fullEntity: { labels: {}, descriptions: {}, claims: {} },
    } as any);
    vi.mocked(wikidataPublisher.publishEntity).mockResolvedValue({
      success: true,
      qid: 'Q123',
    } as any);
    vi.mocked(createWikidataEntity).mockResolvedValue({ id: 1 } as any);

    const request = new NextRequest('http://localhost:3000/api/wikidata/publish', {
      method: 'POST',
      body: JSON.stringify({ businessId: 1 }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.qid).toBe('Q123');
    expect(updateBusiness).toHaveBeenCalled();
    expect(wikidataPublisher.publishEntity).toHaveBeenCalled();
  });
});

