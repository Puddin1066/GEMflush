/**
 * TDD Test: POST /api/wikidata/publish - Wikibase Action API Route
 * 
 * SPECIFICATION: Wikidata Publishing via Action API
 * 
 * As a user
 * I want to publish my business to Wikidata
 * So that it appears on Wikidata
 * 
 * Acceptance Criteria:
 * 1. Returns 201 with QID when publication succeeds
 * 2. Returns 401 when not authenticated
 * 3. Returns 403 when user lacks permission (free tier)
 * 4. Returns 400 when business not crawled
 * 5. Uses Wikibase Action API for publishing
 * 6. Stores QID in database after publication
 * 
 * TDD Cycle: RED → GREEN → REFACTOR
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { BusinessTestFactory, TeamTestFactory } from '@/lib/test-helpers/tdd-helpers';

// Mock dependencies
vi.mock('@/lib/db/queries', () => ({
  getUser: vi.fn(),
  getTeamForUser: vi.fn(),
  getBusinessById: vi.fn(),
  updateBusiness: vi.fn(),
  createWikidataEntity: vi.fn(),
  getWikidataEntity: vi.fn(),
}));

vi.mock('@/lib/gemflush/permissions', () => ({
  canPublishToWikidata: vi.fn(),
}));

vi.mock('@/lib/data/wikidata-dto', () => ({
  getWikidataPublishDTO: vi.fn(),
}));

// Create a shared mock instance so all WikidataClient instances use the same mocks
const mockPublishEntityFn = vi.fn();
const mockUpdateEntityFn = vi.fn();

// Mock WikidataClient as a class
vi.mock('@/lib/wikidata/client', () => {
  class MockWikidataClient {
    publishEntity = mockPublishEntityFn;
    updateEntity = mockUpdateEntityFn;
  }
  return {
    WikidataClient: MockWikidataClient,
  };
});

vi.mock('@/lib/wikidata/manual-publish-storage', () => ({
  storeEntityForManualPublish: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/utils/logger', () => ({
  loggers: {
    api: {
      info: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    },
  },
}));

// Mock drizzle database operations
vi.mock('@/lib/db/drizzle', () => ({
  db: {
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    }),
  },
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((col: any, val: any) => ({ col, val })),
}));

describe('POST /api/wikidata/publish - Wikibase Action API', () => {
  let mockGetUser: any;
  let mockGetTeamForUser: any;
  let mockGetBusinessById: any;
  let mockUpdateBusiness: any;
  let mockGetWikidataEntity: any;
  let mockCreateWikidataEntity: any;
  let mockCanPublishToWikidata: any;
  let mockGetWikidataPublishDTO: any;
  let mockStoreEntityForManualPublish: any;

  beforeEach(async () => {
    vi.clearAllMocks();

    const dbQueries = await import('@/lib/db/queries');
    const permissions = await import('@/lib/gemflush/permissions');
    const wikidataDTO = await import('@/lib/data/wikidata-dto');
    const manualPublish = await import('@/lib/wikidata/manual-publish-storage');

    mockGetUser = dbQueries.getUser;
    mockGetTeamForUser = dbQueries.getTeamForUser;
    mockGetBusinessById = dbQueries.getBusinessById;
    mockUpdateBusiness = dbQueries.updateBusiness;
    mockGetWikidataEntity = dbQueries.getWikidataEntity;
    mockCreateWikidataEntity = dbQueries.createWikidataEntity;
    mockCanPublishToWikidata = permissions.canPublishToWikidata;
    mockGetWikidataPublishDTO = wikidataDTO.getWikidataPublishDTO;
    mockStoreEntityForManualPublish = manualPublish.storeEntityForManualPublish;
    
    // Default: no existing entity
    mockGetWikidataEntity.mockResolvedValue(null);
    mockCreateWikidataEntity.mockResolvedValue({ id: 1 });
    mockStoreEntityForManualPublish.mockResolvedValue(undefined);
  });

  /**
   * SPECIFICATION 1: Returns 201 with QID when publication succeeds
   */
  it('returns 201 with QID when publication succeeds via Action API', async () => {
    // Arrange
    const user = { id: 1, teamId: 1 };
    const team = TeamTestFactory.createPro();
    const business = BusinessTestFactory.createCrawled({
      id: 123,
      teamId: 1,
    });

    mockGetUser.mockResolvedValue(user);
    mockGetTeamForUser.mockResolvedValue(team);
    mockGetBusinessById.mockResolvedValue(business);
    mockCanPublishToWikidata.mockReturnValue(true);
    mockGetWikidataPublishDTO.mockResolvedValue({
      business,
      crawlData: { name: 'Test' },
      canPublish: true,
      fullEntity: { labels: { en: { value: 'Test' } } },
      notability: { isNotable: true, confidence: 0.9 },
      recommendation: 'publish',
    });
    mockPublishEntityFn.mockResolvedValue({
      success: true,
      qid: 'Q123456',
    });

    // Act
    const { POST } = await import('@/app/api/wikidata/publish/route');
    const request = new NextRequest('http://localhost/api/wikidata/publish', {
      method: 'POST',
      body: JSON.stringify({ businessId: 123 }),
    });
    const response = await POST(request);

    // Assert: Verify API contract (behavior: Action API publishes successfully)
    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data.qid).toBe('Q123456');
    expect(mockPublishEntityFn).toHaveBeenCalled();
  });

  /**
   * SPECIFICATION 2: Returns 401 when not authenticated
   */
  it('returns 401 when not authenticated', async () => {
    // Arrange
    mockGetUser.mockResolvedValue(null);

    // Act
    const { POST } = await import('@/app/api/wikidata/publish/route');
    const request = new NextRequest('http://localhost/api/wikidata/publish', {
      method: 'POST',
      body: JSON.stringify({ businessId: 123 }),
    });
    const response = await POST(request);

    // Assert
    expect(response.status).toBe(401);
  });

  /**
   * SPECIFICATION 3: Returns 403 when user lacks permission
   */
  it('returns 403 when free tier user tries to publish', async () => {
    // Arrange
    const user = { id: 1, teamId: 1 };
    const team = TeamTestFactory.createFree();

    mockGetUser.mockResolvedValue(user);
    mockGetTeamForUser.mockResolvedValue(team);
    mockCanPublishToWikidata.mockReturnValue(false);

    // Act
    const { POST } = await import('@/app/api/wikidata/publish/route');
    const request = new NextRequest('http://localhost/api/wikidata/publish', {
      method: 'POST',
      body: JSON.stringify({ businessId: 123 }),
    });
    const response = await POST(request);

    // Assert
    expect(response.status).toBe(403);
    const data = await response.json();
    expect(data.error).toContain('Pro plan');
  });

  /**
   * SPECIFICATION 4: Returns 400 when business not crawled
   */
  it('returns 400 when business not crawled', async () => {
    // Arrange
    const user = { id: 1, teamId: 1 };
    const team = TeamTestFactory.createPro();
    const business = BusinessTestFactory.create({
      id: 123,
      teamId: 1,
      status: 'pending', // Not crawled
    });

    mockGetUser.mockResolvedValue(user);
    mockGetTeamForUser.mockResolvedValue(team);
    mockGetBusinessById.mockResolvedValue(business);
    mockCanPublishToWikidata.mockReturnValue(true);

    // Act
    const { POST } = await import('@/app/api/wikidata/publish/route');
    const request = new NextRequest('http://localhost/api/wikidata/publish', {
      method: 'POST',
      body: JSON.stringify({ businessId: 123 }),
    });
    const response = await POST(request);

    // Assert
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain('crawled');
  });

  /**
   * SPECIFICATION 5: Uses Wikibase Action API for publishing
   */
  it('uses Wikibase Action API via WikidataService', async () => {
    // Arrange
    const user = { id: 1, teamId: 1 };
    const team = TeamTestFactory.createPro();
    const business = BusinessTestFactory.createCrawled({ id: 123, teamId: 1 });

    mockGetUser.mockResolvedValue(user);
    mockGetTeamForUser.mockResolvedValue(team);
    mockGetBusinessById.mockResolvedValue(business);
    mockCanPublishToWikidata.mockReturnValue(true);
    mockGetWikidataPublishDTO.mockResolvedValue({
      business,
      crawlData: { name: 'Test' },
      canPublish: true,
      fullEntity: { labels: { en: { value: 'Test' } } },
      notability: { isNotable: true, confidence: 0.9 },
      recommendation: 'publish',
    });
    mockPublishEntityFn.mockResolvedValue({
      success: true,
      qid: 'Q123',
    });

    // Act
    const { POST } = await import('@/app/api/wikidata/publish/route');
    const request = new NextRequest('http://localhost/api/wikidata/publish', {
      method: 'POST',
      body: JSON.stringify({ businessId: 123 }),
    });
    await POST(request);

    // Assert: Verify Action API used (behavior: WikidataClient called)
    expect(mockPublishEntityFn).toHaveBeenCalled();
    const callArgs = mockPublishEntityFn.mock.calls[0];
    expect(callArgs[0]).toHaveProperty('labels');
  });

  /**
   * SPECIFICATION 6: Stores QID in database after publication
   */
  it('stores QID in database after successful publication', async () => {
    // Arrange
    const user = { id: 1, teamId: 1 };
    const team = TeamTestFactory.createPro();
    const business = BusinessTestFactory.createCrawled({ id: 123, teamId: 1 });

    mockGetUser.mockResolvedValue(user);
    mockGetTeamForUser.mockResolvedValue(team);
    mockGetBusinessById.mockResolvedValue(business);
    mockCanPublishToWikidata.mockReturnValue(true);
    mockGetWikidataPublishDTO.mockResolvedValue({
      business,
      crawlData: { name: 'Test' },
      canPublish: true,
      fullEntity: { labels: { en: { value: 'Test' } } },
      notability: { isNotable: true, confidence: 0.9 },
      recommendation: 'publish',
    });
    mockPublishEntityFn.mockResolvedValue({
      success: true,
      qid: 'Q789012',
    });

    // Act
    const { POST } = await import('@/app/api/wikidata/publish/route');
    const request = new NextRequest('http://localhost/api/wikidata/publish', {
      method: 'POST',
      body: JSON.stringify({ businessId: 123 }),
    });
    await POST(request);

    // Assert: Verify QID stored (behavior: database updated)
    // The route calls updateBusiness twice: once for 'generating' status, once for 'published'
    expect(mockUpdateBusiness).toHaveBeenCalled();
    const updateCalls = mockUpdateBusiness.mock.calls;
    const publishedCall = updateCalls.find((call: any[]) => 
      call[1]?.status === 'published' && call[1]?.wikidataQID === 'Q789012'
    );
    expect(publishedCall).toBeDefined();
  });
});

