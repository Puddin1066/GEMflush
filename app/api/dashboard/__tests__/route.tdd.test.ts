/**
 * TDD Test: Dashboard API Route - Tests Drive Implementation
 * 
 * SPECIFICATION: GET /api/dashboard
 * 
 * As a user
 * I want to fetch dashboard statistics for my team
 * So that I can see my business overview and statistics
 * 
 * Acceptance Criteria:
 * 1. Route uses getDashboardDTO() from lib/data/dashboard-dto
 * 2. Route uses getUser() and getTeamForUser() for authentication
 * 3. Returns 200 with dashboard DTO on success
 * 4. Returns 401 when not authenticated
 * 5. Returns 404 when team not found
 * 6. Returns 500 on server error
 * 
 * TDD Cycle: RED → GREEN → REFACTOR
 * Tests written FIRST to drive implementation
 * SOLID: Single Responsibility - each test specifies one behavior
 * DRY: Reusable test factories and mocks
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GET } from '../route';
import { NextRequest } from 'next/server';
import { BusinessTestFactory, TeamTestFactory } from '@/lib/test-helpers/tdd-helpers';
import type { User, Team } from '@/lib/db/schema';

// Mock dependencies
vi.mock('@/lib/db/queries', async () => {
  const actual = await vi.importActual('@/lib/db/queries');
  return {
    ...actual,
    getUser: vi.fn(),
    getTeamForUser: vi.fn(),
  };
});

vi.mock('@/lib/data/dashboard-dto', async () => {
  const actual = await vi.importActual('@/lib/data/dashboard-dto');
  return {
    ...actual,
    getDashboardDTO: vi.fn(),
  };
});

import { getUser, getTeamForUser } from '@/lib/db/queries';
import { getDashboardDTO } from '@/lib/data/dashboard-dto';

const mockGetUser = vi.mocked(getUser);
const mockGetTeamForUser = vi.mocked(getTeamForUser);
const mockGetDashboardDTO = vi.mocked(getDashboardDTO);

describe('🔴 RED: GET /api/dashboard - Specification', () => {
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
   * SPECIFICATION 1: Route uses getDashboardDTO() from lib/data/dashboard-dto
   * 
   * Given: Authenticated user with team
   * When: GET request is made
   * Then: Route MUST call getDashboardDTO() with team ID
   */
  it('MUST use getDashboardDTO() from lib/data/dashboard-dto', async () => {
    // Arrange: Mock successful authentication and dashboard data
    mockGetUser.mockResolvedValue(testUser);
    mockGetTeamForUser.mockResolvedValue(testTeam);
    
    const mockDashboardDTO = {
      totalBusinesses: 5,
      wikidataEntities: 2,
      avgVisibilityScore: 75,
      businesses: [],
      totalCrawled: 3,
      totalPublished: 2,
    };
    mockGetDashboardDTO.mockResolvedValue(mockDashboardDTO);

    // Act: Make GET request
    const request = new NextRequest('http://localhost/api/dashboard');
    const response = await GET();

    // Assert: SPECIFICATION - MUST use getDashboardDTO() function
    expect(mockGetDashboardDTO).toHaveBeenCalledWith(testTeam.id);
    expect(mockGetDashboardDTO).toHaveBeenCalledTimes(1);
    expect(response.status).toBe(200);
  });

  /**
   * SPECIFICATION 2: Route uses getUser() and getTeamForUser() for authentication
   * 
   * Given: Authenticated user
   * When: GET request is made
   * Then: Route MUST call getUser() and getTeamForUser()
   */
  it('MUST use getUser() and getTeamForUser() for authentication', async () => {
    // Arrange: Mock successful authentication
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

    // Act: Make GET request
    await GET();

    // Assert: SPECIFICATION - MUST use getUser() and getTeamForUser()
    expect(mockGetUser).toHaveBeenCalledTimes(1);
    expect(mockGetTeamForUser).toHaveBeenCalledTimes(1);
  });

  /**
   * SPECIFICATION 3: Returns 200 with dashboard DTO on success
   * 
   * Given: Authenticated user with team and dashboard data
   * When: GET request is made
   * Then: Response should be 200 with dashboard DTO
   */
  it('returns 200 with dashboard DTO on success', async () => {
    // Arrange: Mock successful flow
    mockGetUser.mockResolvedValue(testUser);
    mockGetTeamForUser.mockResolvedValue(testTeam);
    
    const mockDashboardDTO = {
      totalBusinesses: 5,
      wikidataEntities: 2,
      avgVisibilityScore: 75,
      businesses: [
        {
          id: '1',
          name: 'Business 1',
          location: 'Seattle, WA',
          visibilityScore: 80,
          trend: 'up' as const,
          trendValue: 5,
          wikidataQid: 'Q123',
          lastFingerprint: '2024-01-01',
          status: 'published' as const,
        },
      ],
      totalCrawled: 3,
      totalPublished: 2,
    };
    mockGetDashboardDTO.mockResolvedValue(mockDashboardDTO);

    // Act: Make GET request
    const response = await GET();

    // Assert: SPECIFICATION - Response should be 200 with dashboard data
    expect(response.status).toBe(200);
    
    const data = await response.json();
    expect(data.totalBusinesses).toBe(5);
    expect(data.wikidataEntities).toBe(2);
    expect(data.avgVisibilityScore).toBe(75);
    expect(data.businesses).toHaveLength(1);
    expect(data.businesses[0].name).toBe('Business 1');
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
    const response = await GET();

    // Assert: SPECIFICATION - Response should be 401
    expect(response.status).toBe(401);
    
    const data = await response.json();
    expect(data.error).toBe('Unauthorized');
    
    // Verify getDashboardDTO was not called
    expect(mockGetDashboardDTO).not.toHaveBeenCalled();
  });

  /**
   * SPECIFICATION 5: Returns 404 when team not found
   * 
   * Given: Authenticated user but no team
   * When: GET request is made
   * Then: Response should be 404
   */
  it('returns 404 when team not found', async () => {
    // Arrange: Mock user but no team
    mockGetUser.mockResolvedValue(testUser);
    mockGetTeamForUser.mockResolvedValue(null);

    // Act: Make GET request
    const response = await GET();

    // Assert: SPECIFICATION - Response should be 404
    expect(response.status).toBe(404);
    
    const data = await response.json();
    expect(data.error).toBe('No team found');
    
    // Verify getDashboardDTO was not called
    expect(mockGetDashboardDTO).not.toHaveBeenCalled();
  });

  /**
   * SPECIFICATION 6: Returns 500 on server error
   * 
   * Given: Server error occurs
   * When: GET request is made
   * Then: Response should be 500 with error message
   */
  it('returns 500 on server error', async () => {
    // Arrange: Mock server error
    mockGetUser.mockResolvedValue(testUser);
    mockGetTeamForUser.mockRejectedValue(new Error('Database connection failed'));

    // Act: Make GET request
    const response = await GET();

    // Assert: SPECIFICATION - Response should be 500
    expect(response.status).toBe(500);
    
    const data = await response.json();
    expect(data.error).toBe('Internal server error');
  });
});

