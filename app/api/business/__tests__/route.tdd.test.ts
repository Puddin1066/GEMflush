/**
 * TDD Test: Business API Route - Tests Drive Implementation
 * 
 * SPECIFICATION: GET/POST /api/business
 * 
 * As a user
 * I want to manage my businesses via API
 * So that I can create and retrieve businesses programmatically
 * 
 * Acceptance Criteria:
 * GET /api/business:
 * 1. Route uses getUser() and getTeamForUser() for authentication
 * 2. Route uses getDashboardDTO() to fetch businesses
 * 3. Returns 200 with businesses array and maxBusinesses on success
 * 4. Returns 401 when not authenticated
 * 5. Returns 404 when team not found
 * 6. Returns 500 on server error
 * 
 * POST /api/business:
 * 1. Route validates request body with createBusinessSchema
 * 2. Route checks business limit via canAddBusiness()
 * 3. Route creates business via createBusiness()
 * 4. Route triggers auto-processing for new businesses
 * 5. Returns 201 with business data on success
 * 6. Returns 401 when not authenticated
 * 7. Returns 403 when business limit reached
 * 8. Returns 400 when validation fails
 * 
 * TDD Cycle: RED → GREEN → REFACTOR
 * Tests written FIRST to drive implementation
 * SOLID: Single Responsibility - each test specifies one behavior
 * DRY: Reusable test factories and mocks
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GET, POST } from '../route';
import { NextRequest } from 'next/server';
import { BusinessTestFactory, TeamTestFactory } from '@/lib/test-helpers/tdd-helpers';
import type { User, Team, Business } from '@/lib/db/schema';

// Mock dependencies
vi.mock('@/lib/db/queries', async () => {
  const actual = await vi.importActual('@/lib/db/queries');
  return {
    ...actual,
    getUser: vi.fn(),
    getTeamForUser: vi.fn(),
    getBusinessCountByTeam: vi.fn(),
    createBusiness: vi.fn(),
  };
});

vi.mock('@/lib/data/dashboard-dto', async () => {
  const actual = await vi.importActual('@/lib/data/dashboard-dto');
  return {
    ...actual,
    getDashboardDTO: vi.fn(),
  };
});

vi.mock('@/lib/gemflush/permissions', async () => {
  const actual = await vi.importActual('@/lib/gemflush/permissions');
  return {
    ...actual,
    canAddBusiness: vi.fn(),
    getMaxBusinesses: vi.fn(),
  };
});

vi.mock('@/lib/validation/business', async () => {
  const actual = await vi.importActual('@/lib/validation/business');
  return {
    ...actual,
    createBusinessSchema: {
      parse: vi.fn(),
      safeParse: vi.fn(),
    },
    createBusinessFromUrlSchema: {
      parse: vi.fn(),
      safeParse: vi.fn(),
    },
  };
});

vi.mock('@/lib/services/business-execution', async () => {
  const actual = await vi.importActual('@/lib/services/business-execution');
  return {
    ...actual,
    autoStartProcessing: vi.fn(() => Promise.resolve()),
  };
});

// Mock drizzle database with proper query chain
// Create a mock query builder chain
const createMockQueryBuilder = () => ({
  from: vi.fn(() => ({
    where: vi.fn(() => ({
      limit: vi.fn(() => Promise.resolve([])), // Default: no existing business
    })),
  })),
});

vi.mock('@/lib/db/drizzle', async () => {
  const actual = await vi.importActual('@/lib/db/drizzle');
  return {
    ...actual,
    db: {
      select: vi.fn(() => createMockQueryBuilder()),
    },
  };
});

vi.mock('@/lib/utils/idempotency', async () => {
  const actual = await vi.importActual('@/lib/utils/idempotency');
  return {
    ...actual,
    getIdempotencyKey: vi.fn(),
    getCachedResponse: vi.fn(),
    cacheResponse: vi.fn(),
    generateIdempotencyKey: vi.fn(),
  };
});

vi.mock('@/lib/utils/business-name-extractor', async () => {
  const actual = await vi.importActual('@/lib/utils/business-name-extractor');
  return {
    ...actual,
    getBusinessNameWithFallback: vi.fn((url, name) => name || url),
  };
});

vi.mock('@/lib/api/rate-limit', async () => {
  const actual = await vi.importActual('@/lib/api/rate-limit');
  return {
    ...actual,
    checkRateLimit: vi.fn(() => null),
    getRateLimitStatus: vi.fn(() => ({
      count: 1,
      remaining: 99,
      limited: false,
      resetAt: Date.now() + 3600000,
    })),
    getClientIdentifier: vi.fn(() => 'test-client'),
    RATE_LIMITS: {
      api: { maxRequests: 100, windowMs: 3600000 },
      businessCreate: { maxRequests: 5, windowMs: 3600000 },
    },
  };
});

import { getUser, getTeamForUser, getBusinessCountByTeam, createBusiness } from '@/lib/db/queries';
import { getDashboardDTO } from '@/lib/data/dashboard-dto';
import { canAddBusiness, getMaxBusinesses } from '@/lib/gemflush/permissions';
import { createBusinessSchema } from '@/lib/validation/business';
import { autoStartProcessing } from '@/lib/services/business-execution';
import { getCachedResponse } from '@/lib/utils/idempotency';
import { db } from '@/lib/db/drizzle';

const mockGetUser = vi.mocked(getUser);
const mockGetTeamForUser = vi.mocked(getTeamForUser);
const mockGetDashboardDTO = vi.mocked(getDashboardDTO);
const mockGetBusinessCountByTeam = vi.mocked(getBusinessCountByTeam);
const mockCreateBusiness = vi.mocked(createBusiness);
const mockCanAddBusiness = vi.mocked(canAddBusiness);
const mockGetMaxBusinesses = vi.mocked(getMaxBusinesses);
const mockCreateBusinessSchema = vi.mocked(createBusinessSchema);
const mockAutoStartProcessing = vi.mocked(autoStartProcessing);
const mockGetCachedResponse = vi.mocked(getCachedResponse);

describe('🔴 RED: GET /api/business - Specification', () => {
  let testUser: User;
  let testTeam: Team;

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
  });

  /**
   * SPECIFICATION 1: Route uses getUser() and getTeamForUser() for authentication
   */
  it('MUST use getUser() and getTeamForUser() for authentication', async () => {
    // Arrange
    mockGetUser.mockResolvedValue(testUser);
    mockGetTeamForUser.mockResolvedValue(testTeam);
    mockGetDashboardDTO.mockResolvedValue({
      totalBusinesses: 0,
      wikidataEntities: 0,
      avgVisibilityScore: 0,
      businesses: [],
      totalCrawled: 0,
      totalPublished: 0,
    });

    // Act
    const request = new NextRequest('http://localhost/api/business');
    await GET(request);

    // Assert
    expect(mockGetUser).toHaveBeenCalledTimes(1);
    expect(mockGetTeamForUser).toHaveBeenCalledTimes(1);
  });

  /**
   * SPECIFICATION 2: Route uses getDashboardDTO() to fetch businesses
   */
  it('MUST use getDashboardDTO() to fetch businesses', async () => {
    // Arrange
    mockGetUser.mockResolvedValue(testUser);
    mockGetTeamForUser.mockResolvedValue(testTeam);
    mockGetDashboardDTO.mockResolvedValue({
      totalBusinesses: 2,
      wikidataEntities: 0,
      avgVisibilityScore: 0,
      businesses: [],
      totalCrawled: 0,
      totalPublished: 0,
    });
    mockGetMaxBusinesses.mockReturnValue(5);

    // Act
    const request = new NextRequest('http://localhost/api/business');
    await GET(request);

    // Assert
    expect(mockGetDashboardDTO).toHaveBeenCalledWith(testTeam.id);
  });

  /**
   * SPECIFICATION 3: Returns 200 with businesses array and maxBusinesses on success
   */
  it('returns 200 with businesses array and maxBusinesses on success', async () => {
    // Arrange
    mockGetUser.mockResolvedValue(testUser);
    mockGetTeamForUser.mockResolvedValue(testTeam);
    const businesses = [
      {
        id: '1',
        name: 'Business 1',
        location: 'Seattle, WA',
        visibilityScore: null,
        trend: 'neutral' as const,
        trendValue: 0,
        wikidataQid: null,
        lastFingerprint: 'Never',
        status: 'pending' as const,
      },
    ];
    mockGetDashboardDTO.mockResolvedValue({
      totalBusinesses: 1,
      wikidataEntities: 0,
      avgVisibilityScore: 0,
      businesses,
      totalCrawled: 0,
      totalPublished: 0,
    });
    mockGetMaxBusinesses.mockReturnValue(5);

    // Act
    const request = new NextRequest('http://localhost/api/business');
    const response = await GET(request);

    // Assert
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.businesses).toHaveLength(1);
    expect(data.businesses[0].name).toBe('Business 1');
    expect(data.maxBusinesses).toBe(5);
  });

  /**
   * SPECIFICATION 4: Returns 401 when not authenticated
   */
  it('returns 401 when not authenticated', async () => {
    // Arrange
    mockGetUser.mockResolvedValue(null);

    // Act
    const request = new NextRequest('http://localhost/api/business');
    const response = await GET(request);

    // Assert
    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toBe('Unauthorized');
  });

  /**
   * SPECIFICATION 5: Returns 404 when team not found
   */
  it('returns 404 when team not found', async () => {
    // Arrange
    mockGetUser.mockResolvedValue(testUser);
    mockGetTeamForUser.mockResolvedValue(null);

    // Act
    const request = new NextRequest('http://localhost/api/business');
    const response = await GET(request);

    // Assert
    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.error).toBe('No team found');
  });
});

describe('🔴 RED: POST /api/business - Specification', () => {
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
    
    mockGetCachedResponse.mockReturnValue(null);
    mockCanAddBusiness.mockReturnValue(true);
    mockGetMaxBusinesses.mockReturnValue(5);
  });

  /**
   * SPECIFICATION 1: Route validates request body with createBusinessSchema
   */
  it('MUST validate request body with createBusinessSchema', async () => {
    // Arrange
    mockGetUser.mockResolvedValue(testUser);
    mockGetTeamForUser.mockResolvedValue(testTeam);
    mockGetBusinessCountByTeam.mockResolvedValue(0);
    
    const validatedData = {
      name: 'Test Business',
      url: 'https://example.com',
      category: 'Restaurant',
      location: { city: 'Seattle', state: 'WA', country: 'US' },
    };
    mockCreateBusinessSchema.parse.mockReturnValue(validatedData);
    mockCreateBusiness.mockResolvedValue(testBusiness);
    
    const requestBody = {
      name: 'Test Business',
      url: 'https://example.com',
      category: 'Restaurant',
      location: { city: 'Seattle', state: 'WA', country: 'US' },
    };

    // Act
    const request = new NextRequest('http://localhost/api/business', {
      method: 'POST',
      body: JSON.stringify(requestBody),
      headers: { 'Content-Type': 'application/json' },
    });
    await POST(request);

    // Assert
    expect(mockCreateBusinessSchema.parse).toHaveBeenCalled();
  });

  /**
   * SPECIFICATION 2: Route checks business limit via canAddBusiness()
   */
  it('MUST check business limit via canAddBusiness()', async () => {
    // Arrange
    mockGetUser.mockResolvedValue(testUser);
    mockGetTeamForUser.mockResolvedValue(testTeam);
    mockGetBusinessCountByTeam.mockResolvedValue(3);
    mockCanAddBusiness.mockReturnValue(true);
    
    const validatedData = {
      name: 'Test Business',
      url: 'https://example.com',
      category: 'Restaurant',
      location: { city: 'Seattle', state: 'WA', country: 'US' },
    };
    mockCreateBusinessSchema.parse.mockReturnValue(validatedData);
    mockCreateBusiness.mockResolvedValue(testBusiness);

    const requestBody = {
      name: 'Test Business',
      url: 'https://example.com',
      category: 'Restaurant',
      location: { city: 'Seattle', state: 'WA', country: 'US' },
    };

    // Act
    const request = new NextRequest('http://localhost/api/business', {
      method: 'POST',
      body: JSON.stringify(requestBody),
      headers: { 'Content-Type': 'application/json' },
    });
    await POST(request);

    // Assert
    expect(mockCanAddBusiness).toHaveBeenCalledWith(3, testTeam);
  });

  /**
   * SPECIFICATION 3: Route creates business via createBusiness()
   */
  it('MUST create business via createBusiness()', async () => {
    // Arrange
    mockGetUser.mockResolvedValue(testUser);
    mockGetTeamForUser.mockResolvedValue(testTeam);
    mockGetBusinessCountByTeam.mockResolvedValue(0);
    
    const validatedData = {
      name: 'Test Business',
      url: 'https://example.com',
      category: 'Restaurant',
      location: { city: 'Seattle', state: 'WA', country: 'US' },
    };
    mockCreateBusinessSchema.parse.mockReturnValue(validatedData);
    mockCreateBusiness.mockResolvedValue(testBusiness);

    const requestBody = {
      name: 'Test Business',
      url: 'https://example.com',
      category: 'Restaurant',
      location: { city: 'Seattle', state: 'WA', country: 'US' },
    };

    // Act
    const request = new NextRequest('http://localhost/api/business', {
      method: 'POST',
      body: JSON.stringify(requestBody),
      headers: { 'Content-Type': 'application/json' },
    });
    await POST(request);

    // Assert
    expect(mockCreateBusiness).toHaveBeenCalled();
  });

  /**
   * SPECIFICATION 4: Returns 201 with business data on success
   */
  it('returns 201 with business data on success', async () => {
    // Arrange
    mockGetUser.mockResolvedValue(testUser);
    mockGetTeamForUser.mockResolvedValue(testTeam);
    mockGetBusinessCountByTeam.mockResolvedValue(0);
    
    const validatedData = {
      name: 'Test Business',
      url: 'https://example.com',
      category: 'Restaurant',
      location: { city: 'Seattle', state: 'WA', country: 'US' },
    };
    mockCreateBusinessSchema.parse.mockReturnValue(validatedData);
    mockCreateBusiness.mockResolvedValue(testBusiness);

    const requestBody = {
      name: 'Test Business',
      url: 'https://example.com',
      category: 'Restaurant',
      location: { city: 'Seattle', state: 'WA', country: 'US' },
    };

    // Act
    const request = new NextRequest('http://localhost/api/business', {
      method: 'POST',
      body: JSON.stringify(requestBody),
      headers: { 'Content-Type': 'application/json' },
    });
    const response = await POST(request);

    // Assert
    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data.business).toBeDefined();
    expect(data.business.name).toBe(testBusiness.name);
    expect(data.message).toBe('Business created successfully');
  });

  /**
   * SPECIFICATION 5: Returns 401 when not authenticated
   */
  it('returns 401 when not authenticated', async () => {
    // Arrange
    mockGetUser.mockResolvedValue(null);

    // Act
    const request = new NextRequest('http://localhost/api/business', {
      method: 'POST',
      body: JSON.stringify({ name: 'Test', url: 'https://example.com' }),
      headers: { 'Content-Type': 'application/json' },
    });
    const response = await POST(request);

    // Assert
    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toBe('Unauthorized');
  });

  /**
   * SPECIFICATION 6: Returns 403 when business limit reached
   */
  it('returns 403 when business limit reached', async () => {
    // Arrange
    mockGetUser.mockResolvedValue(testUser);
    mockGetTeamForUser.mockResolvedValue(testTeam);
    mockGetBusinessCountByTeam.mockResolvedValue(5);
    mockCanAddBusiness.mockReturnValue(false);
    mockGetMaxBusinesses.mockReturnValue(5);

    // Act
    const request = new NextRequest('http://localhost/api/business', {
      method: 'POST',
      body: JSON.stringify({ name: 'Test', url: 'https://example.com' }),
      headers: { 'Content-Type': 'application/json' },
    });
    const response = await POST(request);

    // Assert
    expect(response.status).toBe(403);
    const data = await response.json();
    expect(data.error).toBe('Business limit reached');
    expect(data.maxBusinesses).toBe(5);
    expect(data.currentCount).toBe(5);
  });
});

