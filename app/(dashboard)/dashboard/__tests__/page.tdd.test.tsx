/**
 * TDD Test: Dashboard Page - Tests Drive Implementation
 * 
 * SPECIFICATION: Dashboard Page Server Component
 * 
 * As a user
 * I want to see my dashboard with business statistics
 * So that I can monitor my businesses
 * 
 * Acceptance Criteria:
 * 1. Page fetches user via getUser()
 * 2. Page fetches team via getTeamForUser()
 * 3. Page fetches dashboard data via getDashboardDTO()
 * 4. Page passes data to DashboardClient component
 * 5. Page handles missing user gracefully (returns null)
 * 6. Page handles missing team gracefully (returns null)
 * 
 * TDD Cycle: RED → GREEN → REFACTOR
 * Tests written FIRST to drive implementation
 * SOLID: Single Responsibility - each test specifies one behavior
 * DRY: Reusable test helpers and factories
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import React from 'react';
import { render } from '@testing-library/react';
import DashboardPage from '../page';
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

vi.mock('../dashboard-client', () => ({
  DashboardClient: ({ dashboardData, user, team }: any) => (
    <div data-testid="dashboard-client">
      <div data-testid="user-email">{user?.email}</div>
      <div data-testid="team-name">{team?.name}</div>
      <div data-testid="total-businesses">{dashboardData?.totalBusinesses}</div>
    </div>
  ),
}));

import { getUser, getTeamForUser } from '@/lib/db/queries';
import { getDashboardDTO } from '@/lib/data/dashboard-dto';

const mockGetUser = vi.mocked(getUser);
const mockGetTeamForUser = vi.mocked(getTeamForUser);
const mockGetDashboardDTO = vi.mocked(getDashboardDTO);

describe('🔴 RED: Dashboard Page - Specification', () => {
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
   * SPECIFICATION 1: Page fetches user via getUser()
   * 
   * Given: Dashboard page renders
   * When: Page component is rendered
   * Then: Page MUST call getUser()
   */
  it('MUST fetch user via getUser()', async () => {
    // Arrange: Mock user and team
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

    // Act: Render page
    await DashboardPage();

    // Assert: SPECIFICATION - MUST call getUser()
    expect(mockGetUser).toHaveBeenCalledTimes(1);
  });

  /**
   * SPECIFICATION 2: Page fetches team via getTeamForUser()
   * 
   * Given: Authenticated user
   * When: Page component is rendered
   * Then: Page MUST call getTeamForUser()
   */
  it('MUST fetch team via getTeamForUser()', async () => {
    // Arrange: Mock user and team
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

    // Act: Render page
    await DashboardPage();

    // Assert: SPECIFICATION - MUST call getTeamForUser()
    expect(mockGetTeamForUser).toHaveBeenCalledTimes(1);
  });

  /**
   * SPECIFICATION 3: Page fetches dashboard data via getDashboardDTO()
   * 
   * Given: Authenticated user with team
   * When: Page component is rendered
   * Then: Page MUST call getDashboardDTO() with team ID
   */
  it('MUST fetch dashboard data via getDashboardDTO()', async () => {
    // Arrange: Mock user, team, and dashboard data
    mockGetUser.mockResolvedValue(testUser);
    mockGetTeamForUser.mockResolvedValue(testTeam);
    mockGetDashboardDTO.mockResolvedValue({
      totalBusinesses: 5,
      wikidataEntities: 2,
      avgVisibilityScore: 75,
      businesses: [],
      totalCrawled: 3,
      totalPublished: 2,
    });

    // Act: Render page
    await DashboardPage();

    // Assert: SPECIFICATION - MUST call getDashboardDTO() with team ID
    expect(mockGetDashboardDTO).toHaveBeenCalledWith(testTeam.id);
    expect(mockGetDashboardDTO).toHaveBeenCalledTimes(1);
  });

  /**
   * SPECIFICATION 4: Page passes data to DashboardClient component
   * 
   * Given: All data fetched successfully
   * When: Page component is rendered
   * Then: Page MUST pass user, team, and dashboardData to DashboardClient
   */
  it('MUST pass data to DashboardClient component', async () => {
    // Arrange: Mock all data
    mockGetUser.mockResolvedValue(testUser);
    mockGetTeamForUser.mockResolvedValue(testTeam);
    const dashboardData = {
      totalBusinesses: 5,
      wikidataEntities: 2,
      avgVisibilityScore: 75,
      businesses: [],
      totalCrawled: 3,
      totalPublished: 2,
    };
    mockGetDashboardDTO.mockResolvedValue(dashboardData);

    // Act: Render page
    const pageContent = await DashboardPage();
    const { container } = render(pageContent as React.ReactElement);

    // Assert: SPECIFICATION - Data passed to DashboardClient
    expect(container.querySelector('[data-testid="dashboard-client"]')).toBeInTheDocument();
    expect(container.querySelector('[data-testid="user-email"]')?.textContent).toBe(testUser.email);
    expect(container.querySelector('[data-testid="team-name"]')?.textContent).toBe(testTeam.name);
    expect(container.querySelector('[data-testid="total-businesses"]')?.textContent).toBe('5');
  });

  /**
   * SPECIFICATION 5: Page handles missing user gracefully (returns null)
   * 
   * Given: No authenticated user
   * When: Page component is rendered
   * Then: Page MUST return null
   */
  it('MUST handle missing user gracefully (returns null)', async () => {
    // Arrange: Mock no user
    mockGetUser.mockResolvedValue(null);

    // Act: Render page
    const pageContent = await DashboardPage();

    // Assert: SPECIFICATION - Returns null when no user
    expect(pageContent).toBeNull();
    expect(mockGetTeamForUser).not.toHaveBeenCalled();
    expect(mockGetDashboardDTO).not.toHaveBeenCalled();
  });

  /**
   * SPECIFICATION 6: Page handles missing team gracefully (returns null)
   * 
   * Given: Authenticated user but no team
   * When: Page component is rendered
   * Then: Page MUST return null
   */
  it('MUST handle missing team gracefully (returns null)', async () => {
    // Arrange: Mock user but no team
    mockGetUser.mockResolvedValue(testUser);
    mockGetTeamForUser.mockResolvedValue(null);

    // Act: Render page
    const pageContent = await DashboardPage();

    // Assert: SPECIFICATION - Returns null when no team
    expect(pageContent).toBeNull();
    expect(mockGetDashboardDTO).not.toHaveBeenCalled();
  });
});

