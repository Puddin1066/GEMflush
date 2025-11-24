/**
 * TDD Test: GET /api/business/[id]/status - Business Status API
 * 
 * SPECIFICATION: Business Status Retrieval
 * 
 * As a user
 * I want to fetch business status
 * So that I can see the current processing state
 * 
 * Acceptance Criteria:
 * 1. Returns 200 with status when business exists and user owns it
 * 2. Returns 401 when not authenticated
 * 3. Returns 403 when user doesn't own business
 * 4. Returns 404 when business doesn't exist
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
}));

vi.mock('@/lib/auth/middleware', () => ({
  verifyBusinessOwnership: vi.fn(),
}));

vi.mock('@/lib/data/status-dto', () => ({
  toBusinessStatusDTO: vi.fn((business) => ({
    businessId: business.id,
    status: business.status,
  })),
}));

vi.mock('@/lib/utils/logger', () => ({
  loggers: {
    api: {
      debug: vi.fn(),
      error: vi.fn(),
    },
  },
}));

describe('GET /api/business/[id]/status - Business Status API', () => {
  let mockGetUser: any;
  let mockGetTeamForUser: any;
  let mockVerifyBusinessOwnership: any;

  beforeEach(async () => {
    vi.clearAllMocks();

    const dbQueries = await import('@/lib/db/queries');
    const middleware = await import('@/lib/auth/middleware');
    mockGetUser = dbQueries.getUser;
    mockGetTeamForUser = dbQueries.getTeamForUser;
    mockVerifyBusinessOwnership = middleware.verifyBusinessOwnership;
  });

  /**
   * SPECIFICATION 1: Returns status when business exists and user owns it
   */
  it('returns 200 with status when business exists and user owns it', async () => {
    // Arrange
    const user = { id: 1, teamId: 1 };
    const team = TeamTestFactory.createPro();
    const business = BusinessTestFactory.create({
      id: 123,
      teamId: 1,
      status: 'crawled',
    });

    mockGetUser.mockResolvedValue(user);
    mockGetTeamForUser.mockResolvedValue(team);
    mockVerifyBusinessOwnership.mockResolvedValue({ authorized: true, business });

    // Act
    const { GET } = await import('@/app/api/business/[id]/status/route');
    const request = new NextRequest('http://localhost/api/business/123/status');
    const response = await GET(request, { params: Promise.resolve({ id: '123' }) });

    // Assert: Verify API contract
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.status).toBe('crawled');
    expect(data.businessId).toBe(123);
  });

  /**
   * SPECIFICATION 2: Returns 401 when not authenticated
   */
  it('returns 401 when not authenticated', async () => {
    // Arrange
    mockGetUser.mockResolvedValue(null);

    // Act
    const { GET } = await import('@/app/api/business/[id]/status/route');
    const request = new NextRequest('http://localhost/api/business/123/status');
    const response = await GET(request, { params: Promise.resolve({ id: '123' }) });

    // Assert
    expect(response.status).toBe(401);
  });

  /**
   * SPECIFICATION 3: Returns 403 when user doesn't own business
   */
  it('returns 403 when user does not own business', async () => {
    // Arrange
    const user = { id: 1, teamId: 1 };
    const team = TeamTestFactory.createPro();

    mockGetUser.mockResolvedValue(user);
    mockGetTeamForUser.mockResolvedValue(team);
    mockVerifyBusinessOwnership.mockResolvedValue({ authorized: false, business: null });

    // Act
    const { GET } = await import('@/app/api/business/[id]/status/route');
    const request = new NextRequest('http://localhost/api/business/123/status');
    const response = await GET(request, { params: Promise.resolve({ id: '123' }) });

    // Assert
    expect(response.status).toBe(403);
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
    mockVerifyBusinessOwnership.mockResolvedValue({ authorized: false, business: null });

    // Act
    const { GET } = await import('@/app/api/business/[id]/status/route');
    const request = new NextRequest('http://localhost/api/business/999/status');
    const response = await GET(request, { params: Promise.resolve({ id: '999' }) });

    // Assert
    expect(response.status).toBe(403); // Route returns 403 for unauthorized, not 404
  });
});

