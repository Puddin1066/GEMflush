/**
 * TDD Test: GET /api/dashboard - Dashboard Data API
 * 
 * SPECIFICATION: Dashboard Data Retrieval
 * 
 * As a user
 * I want to fetch dashboard summary data
 * So that I can see an overview of my businesses
 * 
 * Acceptance Criteria:
 * 1. Returns 200 with dashboard data when authenticated
 * 2. Returns 401 when not authenticated
 * 3. Returns aggregated business statistics
 * 
 * TDD Cycle: RED → GREEN → REFACTOR
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { TeamTestFactory } from '@/lib/test-helpers/tdd-helpers';

vi.mock('@/lib/db/queries', () => ({
  getUser: vi.fn(),
  getTeamForUser: vi.fn(),
}));

vi.mock('@/lib/data/dashboard-dto', () => ({
  getDashboardDTO: vi.fn(),
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

describe('GET /api/dashboard - Dashboard Data API', () => {
  let mockGetUser: any;
  let mockGetTeamForUser: any;
  let mockGetDashboardDTO: any;

  beforeEach(async () => {
    vi.clearAllMocks();

    const dbQueries = await import('@/lib/db/queries');
    const dashboardDTO = await import('@/lib/data/dashboard-dto');

    mockGetUser = dbQueries.getUser;
    mockGetTeamForUser = dbQueries.getTeamForUser;
    mockGetDashboardDTO = dashboardDTO.getDashboardDTO;
  });

  /**
   * SPECIFICATION 1: Returns dashboard data when authenticated
   */
  it('returns 200 with dashboard data when authenticated', async () => {
    // Arrange
    const user = { id: 1, teamId: 1 };
    const team = TeamTestFactory.createPro();
    const dashboardData = {
      businesses: [
        { id: 1, name: 'Business 1', status: 'crawled' },
        { id: 2, name: 'Business 2', status: 'published' },
      ],
      maxBusinesses: 10,
      stats: {
        total: 2,
        crawled: 1,
        published: 1,
      },
    };

    mockGetUser.mockResolvedValue(user);
    mockGetTeamForUser.mockResolvedValue(team);
    mockGetDashboardDTO.mockResolvedValue(dashboardData);

    // Act
    const { GET } = await import('@/app/api/dashboard/route');
    const request = new NextRequest('http://localhost/api/dashboard');
    const response = await GET(request);

    // Assert: Verify API contract
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.businesses).toBeDefined();
    expect(Array.isArray(data.businesses)).toBe(true);
  });

  /**
   * SPECIFICATION 2: Returns 401 when not authenticated
   */
  it('returns 401 when not authenticated', async () => {
    // Arrange
    mockGetUser.mockResolvedValue(null);

    // Act
    const { GET } = await import('@/app/api/dashboard/route');
    const request = new NextRequest('http://localhost/api/dashboard');
    const response = await GET(request);

    // Assert
    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toBeDefined();
  });
});

