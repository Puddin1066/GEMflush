/**
 * TDD Test: Team API Route - Tests Drive Implementation
 * 
 * SPECIFICATION: GET /api/team
 * 
 * As a user
 * I want to fetch my team data
 * So that I can access team information and settings
 * 
 * Acceptance Criteria:
 * 1. Route uses getTeamForUser() for authentication and team retrieval
 * 2. Returns 200 with team data on success
 * 3. Returns 500 on server error
 * 4. Handles errors gracefully with proper error messages
 * 
 * TDD Cycle: RED → GREEN → REFACTOR
 * Tests written FIRST to drive implementation
 * SOLID: Single Responsibility - each test specifies one behavior
 * DRY: Reusable test factories
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GET } from '../route';
import { NextRequest } from 'next/server';
import { TeamTestFactory } from '@/lib/test-helpers/tdd-helpers';
import type { Team } from '@/lib/db/schema';

// Mock dependencies
vi.mock('@/lib/db/queries', async () => {
  const actual = await vi.importActual('@/lib/db/queries');
  return {
    ...actual,
    getTeamForUser: vi.fn(),
  };
});

import { getTeamForUser } from '@/lib/db/queries';

const mockGetTeamForUser = vi.mocked(getTeamForUser);

describe('🔴 RED: GET /api/team - Specification', () => {
  let testTeam: Team;

  beforeEach(() => {
    vi.clearAllMocks();
    testTeam = TeamTestFactory.createFree();
  });

  /**
   * SPECIFICATION 1: Route uses getTeamForUser() for authentication and team retrieval
   * 
   * Given: Authenticated user with team
   * When: GET request is made
   * Then: Route MUST call getTeamForUser()
   */
  it('MUST use getTeamForUser() for authentication and team retrieval', async () => {
    // Arrange: Mock successful team retrieval
    mockGetTeamForUser.mockResolvedValue(testTeam);

    // Act: Make GET request
    await GET();

    // Assert: SPECIFICATION - MUST use getTeamForUser()
    expect(mockGetTeamForUser).toHaveBeenCalledTimes(1);
  });

  /**
   * SPECIFICATION 2: Returns 200 with team data on success
   * 
   * Given: Authenticated user with team
   * When: GET request is made
   * Then: Response should be 200 with team data
   */
  it('returns 200 with team data on success', async () => {
    // Arrange: Mock team data
    const proTeam = TeamTestFactory.createPro({
      id: 1,
      name: 'Test Team',
      planName: 'pro',
    });
    mockGetTeamForUser.mockResolvedValue(proTeam);

    // Act: Make GET request
    const response = await GET();

    // Assert: SPECIFICATION - Response should be 200 with team data
    expect(response.status).toBe(200);
    
    const data = await response.json();
    expect(data.id).toBe(1);
    expect(data.name).toBe('Test Team');
    expect(data.planName).toBe('pro');
    expect(data.subscriptionStatus).toBe('active');
  });

  /**
   * SPECIFICATION 3: Returns 500 on server error
   * 
   * Given: Server error occurs
   * When: GET request is made
   * Then: Response should be 500 with error message
   */
  it('returns 500 on server error', async () => {
    // Arrange: Mock server error
    mockGetTeamForUser.mockRejectedValue(new Error('Database connection failed'));

    // Act: Make GET request
    const response = await GET();

    // Assert: SPECIFICATION - Response should be 500
    expect(response.status).toBe(500);
    
    const data = await response.json();
    expect(data.error).toBe('Internal server error');
  });

  /**
   * SPECIFICATION 4: Handles errors gracefully with proper error messages
   * 
   * Given: Error occurs during team retrieval
   * When: GET request is made
   * Then: Response should include error message and proper status code
   */
  it('handles errors gracefully with proper error messages', async () => {
    // Arrange: Mock different types of errors
    const testCases = [
      { error: new Error('Database timeout'), expectedStatus: 500 },
      { error: new Error('Network error'), expectedStatus: 500 },
      { error: new Error('Unknown error'), expectedStatus: 500 },
    ];

    for (const testCase of testCases) {
      mockGetTeamForUser.mockRejectedValue(testCase.error);

      // Act: Make GET request
      const response = await GET();

      // Assert: SPECIFICATION - Proper error handling
      expect(response.status).toBe(testCase.expectedStatus);
      const data = await response.json();
      expect(data.error).toBe('Internal server error');
    }
  });
});

