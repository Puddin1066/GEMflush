/**
 * TDD Test: GET /api/business/[id] - Business Details API
 * 
 * SPECIFICATION: Business Details Retrieval
 * 
 * As a user
 * I want to fetch business details by ID
 * So that I can view and manage individual businesses
 * 
 * Acceptance Criteria:
 * 1. Returns 200 with business data when business exists and user owns it
 * 2. Returns 401 when not authenticated
 * 3. Returns 403 when user doesn't own business
 * 4. Returns 404 when business doesn't exist
 * 5. Returns 400 when business ID is invalid
 * 
 * TDD Cycle: RED → GREEN → REFACTOR
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { BusinessTestFactory, TeamTestFactory } from '@/lib/test-helpers/tdd-helpers';

// Mock dependencies at module level (SOLID: Dependency Inversion)
vi.mock('@/lib/db/queries', () => ({
  getUser: vi.fn(),
  getTeamForUser: vi.fn(),
  getBusinessById: vi.fn(),
}));

vi.mock('@/lib/data/business-dto', () => ({
  getBusinessDetailDTO: vi.fn(),
}));

vi.mock('@/lib/utils/logger', () => ({
  loggers: {
    api: {
      debug: vi.fn(),
      error: vi.fn(),
      info: vi.fn(),
    },
  },
}));

describe('GET /api/business/[id] - Business Details API', () => {
  let mockGetUser: any;
  let mockGetTeamForUser: any;
  let mockGetBusinessById: any;
  let mockGetBusinessDetailDTO: any;

  beforeEach(async () => {
    vi.clearAllMocks();

    const dbQueries = await import('@/lib/db/queries');
    const businessDTO = await import('@/lib/data/business-dto');

    mockGetUser = dbQueries.getUser;
    mockGetTeamForUser = dbQueries.getTeamForUser;
    mockGetBusinessById = dbQueries.getBusinessById;
    mockGetBusinessDetailDTO = businessDTO.getBusinessDetailDTO;
  });

  /**
   * SPECIFICATION 1: Returns business details when user owns business
   */
  it('returns 200 with business data when business exists and user owns it', async () => {
    // Arrange
    const user = { id: 1, teamId: 1 };
    const team = TeamTestFactory.createPro();
    const business = BusinessTestFactory.create({
      id: 123,
      teamId: 1,
    });
    const businessDTO = {
      id: business.id,
      name: business.name,
      url: business.url,
      status: business.status,
    };

    mockGetUser.mockResolvedValue(user);
    mockGetTeamForUser.mockResolvedValue(team);
    mockGetBusinessById.mockResolvedValue(business);
    mockGetBusinessDetailDTO.mockResolvedValue(businessDTO);

    // Act
    const { GET } = await import('@/app/api/business/[id]/route');
    const request = new NextRequest('http://localhost/api/business/123');
    const response = await GET(request, { params: Promise.resolve({ id: '123' }) });

    // Assert: Verify API contract
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.business).toBeDefined();
    expect(data.business.id).toBe(123);
    expect(data.business.name).toBe(business.name);
  });

  /**
   * SPECIFICATION 2: Returns 401 when not authenticated
   */
  it('returns 401 when not authenticated', async () => {
    // Arrange
    mockGetUser.mockResolvedValue(null);

    // Act
    const { GET } = await import('@/app/api/business/[id]/route');
    const request = new NextRequest('http://localhost/api/business/123');
    const response = await GET(request, { params: Promise.resolve({ id: '123' }) });

    // Assert
    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toBeDefined();
  });

  /**
   * SPECIFICATION 3: Returns 403 when user doesn't own business
   */
  it('returns 403 when user does not own business', async () => {
    // Arrange
    const user = { id: 1, teamId: 1 };
    const team = TeamTestFactory.createPro();
    const business = BusinessTestFactory.create({
      id: 123,
      teamId: 999, // Different team
    });

    mockGetUser.mockResolvedValue(user);
    mockGetTeamForUser.mockResolvedValue(team);
    mockGetBusinessById.mockResolvedValue(business);

    // Act
    const { GET } = await import('@/app/api/business/[id]/route');
    const request = new NextRequest('http://localhost/api/business/123');
    const response = await GET(request, { params: Promise.resolve({ id: '123' }) });

    // Assert
    expect(response.status).toBe(403);
    const data = await response.json();
    expect(data.error).toBeDefined();
  });

  /**
   * SPECIFICATION 4: Returns 404 when business doesn't exist
   */
  it('returns 404 when business does not exist', async () => {
    // Arrange
    const user = { id: 1, teamId: 1 };
    const team = TeamTestFactory.createPro();

    mockGetUser.mockResolvedValue(user);
    mockGetTeamForUser.mockResolvedValue(team);
    mockGetBusinessById.mockResolvedValue(null);

    // Act
    const { GET } = await import('@/app/api/business/[id]/route');
    const request = new NextRequest('http://localhost/api/business/999');
    const response = await GET(request, { params: Promise.resolve({ id: '999' }) });

    // Assert
    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.error).toBeDefined();
  });
});

