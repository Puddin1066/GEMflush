/**
 * TDD Test: Wikidata Publish Data Route - Tests Drive Implementation
 * 
 * SPECIFICATION: GET /api/wikidata/publish-data/[businessId]
 * 
 * As a user
 * I want to fetch Wikidata publish data with notability check
 * So that I can see if my business can be published and what the impact would be
 * 
 * Acceptance Criteria:
 * 1. Route uses getWikidataPublishDTO() from lib/data/wikidata-dto
 * 2. Route uses verifyBusinessOwnership() for authorization
 * 3. Returns 200 with publish DTO on success
 * 4. Returns 401 when not authenticated
 * 5. Returns 404 when business not found
 * 6. Returns 403 when user lacks access
 * 7. Returns 400 when business ID is invalid
 * 
 * TDD Cycle: RED → GREEN → REFACTOR
 * Tests written FIRST to drive implementation
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GET } from '../route';
import { NextRequest } from 'next/server';
import { BusinessTestFactory, TeamTestFactory } from '@/lib/test-helpers/tdd-helpers';
import type { Business, User, Team } from '@/lib/db/schema';

// Mock dependencies
vi.mock('@/lib/db/queries', async () => {
  const actual = await vi.importActual('@/lib/db/queries');
  return {
    ...actual,
    getUser: vi.fn(),
    getTeamForUser: vi.fn(),
  };
});

vi.mock('@/lib/auth/middleware', async () => {
  const actual = await vi.importActual('@/lib/auth/middleware');
  return {
    ...actual,
    verifyBusinessOwnership: vi.fn(),
  };
});

vi.mock('@/lib/data/wikidata-dto', async () => {
  const actual = await vi.importActual('@/lib/data/wikidata-dto');
  return {
    ...actual,
    getWikidataPublishDTO: vi.fn(),
  };
});

vi.mock('@/lib/validation/common', async () => {
  const actual = await vi.importActual('@/lib/validation/common');
  return {
    ...actual,
    businessIdParamSchema: {
      safeParse: vi.fn(),
    },
  };
});

import { getUser, getTeamForUser } from '@/lib/db/queries';
import { verifyBusinessOwnership } from '@/lib/auth/middleware';
import { getWikidataPublishDTO } from '@/lib/data/wikidata-dto';
import { businessIdParamSchema } from '@/lib/validation/common';

const mockGetUser = vi.mocked(getUser);
const mockGetTeamForUser = vi.mocked(getTeamForUser);
const mockVerifyBusinessOwnership = vi.mocked(verifyBusinessOwnership);
const mockGetWikidataPublishDTO = vi.mocked(getWikidataPublishDTO);
const mockBusinessIdParamSchema = vi.mocked(businessIdParamSchema);

describe('🔴 RED: GET /api/wikidata/publish-data/[businessId] - Specification', () => {
  let testUser: User;
  let testTeam: Team;
  let testBusiness: Business;

  beforeEach(() => {
    vi.clearAllMocks();
    
    testUser = {
      id: 1,
      name: 'Test User',
      email: 'test@example.com',
      passwordHash: 'hashed',
      role: 'member',
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
      resetToken: null,
      resetTokenExpiry: null,
    } as User;
    
    testTeam = TeamTestFactory.createFree();
    testBusiness = BusinessTestFactory.create({ teamId: testTeam.id });
  });

  /**
   * SPECIFICATION 1: Route uses getWikidataPublishDTO() from lib/data/wikidata-dto
   * 
   * Given: Authenticated user with access to business
   * When: GET request is made
   * Then: Route MUST call getWikidataPublishDTO() for data
   */
  it('MUST use getWikidataPublishDTO() from lib/data/wikidata-dto', async () => {
    // Arrange: Mock successful authentication and authorization
    mockGetUser.mockResolvedValue(testUser);
    mockGetTeamForUser.mockResolvedValue(testTeam);
    mockVerifyBusinessOwnership.mockResolvedValue({
      authorized: true,
      business: testBusiness,
    });
    mockBusinessIdParamSchema.safeParse.mockReturnValue({
      success: true,
      data: { businessId: testBusiness.id },
    } as any);
    
    const mockPublishDTO = {
      businessId: testBusiness.id,
      businessName: testBusiness.name,
      entity: {
        label: 'Test Business',
        description: 'A test business',
        claimCount: 10,
      },
      notability: {
        isNotable: true,
        confidence: 85,
        recommendation: 'Business meets notability standards',
      },
      canPublish: true,
    };
    mockGetWikidataPublishDTO.mockResolvedValue(mockPublishDTO as any);

    // Act: Make GET request
    const request = new NextRequest('http://localhost/api/wikidata/publish-data/1');
    const params = Promise.resolve({ businessId: '1' });
    await GET(request, { params });

    // Assert: SPECIFICATION - MUST use getWikidataPublishDTO() function
    expect(mockGetWikidataPublishDTO).toHaveBeenCalledWith(testBusiness.id);
    expect(mockGetWikidataPublishDTO).toHaveBeenCalledTimes(1);
  });

  /**
   * SPECIFICATION 2: Route uses verifyBusinessOwnership() for authorization
   * 
   * Given: Authenticated user
   * When: GET request is made
   * Then: Route MUST use verifyBusinessOwnership() for authorization
   */
  it('MUST use verifyBusinessOwnership() for authorization', async () => {
    // Arrange: Mock successful authentication
    mockGetUser.mockResolvedValue(testUser);
    mockGetTeamForUser.mockResolvedValue(testTeam);
    mockVerifyBusinessOwnership.mockResolvedValue({
      authorized: true,
      business: testBusiness,
    });
    mockBusinessIdParamSchema.safeParse.mockReturnValue({
      success: true,
      data: { businessId: testBusiness.id },
    } as any);
    mockGetWikidataPublishDTO.mockResolvedValue({
      businessId: testBusiness.id,
      businessName: testBusiness.name,
      canPublish: true,
    } as any);

    // Act: Make GET request
    const request = new NextRequest('http://localhost/api/wikidata/publish-data/1');
    const params = Promise.resolve({ businessId: '1' });
    await GET(request, { params });

    // Assert: SPECIFICATION - MUST use verifyBusinessOwnership()
    expect(mockVerifyBusinessOwnership).toHaveBeenCalledWith(
      testBusiness.id,
      testTeam.id
    );
    expect(mockVerifyBusinessOwnership).toHaveBeenCalledTimes(1);
  });

  /**
   * SPECIFICATION 3: Returns 200 with publish DTO on success
   * 
   * Given: Authenticated user with access to business
   * When: GET request is made
   * Then: Response should be 200 with publish DTO
   */
  it('returns 200 with publish DTO on success', async () => {
    // Arrange: Mock successful flow
    mockGetUser.mockResolvedValue(testUser);
    mockGetTeamForUser.mockResolvedValue(testTeam);
    mockVerifyBusinessOwnership.mockResolvedValue({
      authorized: true,
      business: testBusiness,
    });
    mockBusinessIdParamSchema.safeParse.mockReturnValue({
      success: true,
      data: { businessId: testBusiness.id },
    } as any);
    
    const mockPublishDTO = {
      businessId: testBusiness.id,
      businessName: testBusiness.name,
      entity: {
        label: 'Test Business',
        description: 'A test business',
        claimCount: 10,
      },
      notability: {
        isNotable: true,
        confidence: 85,
        recommendation: 'Business meets notability standards',
      },
      canPublish: true,
    };
    mockGetWikidataPublishDTO.mockResolvedValue(mockPublishDTO as any);

    // Act: Make GET request
    const request = new NextRequest('http://localhost/api/wikidata/publish-data/1');
    const params = Promise.resolve({ businessId: '1' });
    const response = await GET(request, { params });

    // Assert: SPECIFICATION - Response should be 200
    expect(response.status).toBe(200);
    
    const data = await response.json();
    expect(data.businessId).toBe(testBusiness.id);
    expect(data.businessName).toBe(testBusiness.name);
    expect(data.canPublish).toBe(true);
  });

  /**
   * SPECIFICATION 4: Returns 401 when not authenticated
   * 
   * Given: No authenticated user
   * When: GET request is made
   * Then: Response should be 401
   */
  it('returns 401 when not authenticated', async () => {
    // Arrange: Mock no user
    mockGetUser.mockResolvedValue(null);

    // Act: Make GET request
    const request = new NextRequest('http://localhost/api/wikidata/publish-data/1');
    const params = Promise.resolve({ businessId: '1' });
    const response = await GET(request, { params });

    // Assert: SPECIFICATION - Response should be 401
    expect(response.status).toBe(401);
    
    const data = await response.json();
    expect(data.error).toBe('Unauthorized');
  });

  /**
   * SPECIFICATION 5: Returns 404 when business not found
   * 
   * Given: Authenticated user, business doesn't exist
   * When: GET request is made
   * Then: Response should be 404
   */
  it('returns 404 when business not found', async () => {
    // Arrange: Mock authentication but business not found
    mockGetUser.mockResolvedValue(testUser);
    mockGetTeamForUser.mockResolvedValue(testTeam);
    mockVerifyBusinessOwnership.mockResolvedValue({
      authorized: false,
      business: null,
    });
    mockBusinessIdParamSchema.safeParse.mockReturnValue({
      success: true,
      data: { businessId: 999 },
    } as any);

    // Act: Make GET request
    const request = new NextRequest('http://localhost/api/wikidata/publish-data/999');
    const params = Promise.resolve({ businessId: '999' });
    const response = await GET(request, { params });

    // Assert: SPECIFICATION - Response should be 404
    expect(response.status).toBe(404);
    
    const data = await response.json();
    expect(data.error).toBe('Not found');
  });

  /**
   * SPECIFICATION 6: Returns 400 when business ID is invalid
   * 
   * Given: Invalid business ID format
   * When: GET request is made
   * Then: Response should be 400
   */
  it('returns 400 when business ID is invalid', async () => {
    // Arrange: Mock invalid ID validation
    mockBusinessIdParamSchema.safeParse.mockReturnValue({
      success: false,
      error: {
        errors: [{ path: ['businessId'], message: 'Invalid business ID' }],
      },
    } as any);

    // Act: Make GET request
    const request = new NextRequest('http://localhost/api/wikidata/publish-data/invalid');
    const params = Promise.resolve({ businessId: 'invalid' });
    const response = await GET(request, { params });

    // Assert: SPECIFICATION - Response should be 400
    expect(response.status).toBe(400);
    
    const data = await response.json();
    expect(data.error).toContain('Invalid');
  });
});


