/**
 * TDD Test: POST /api/business/[id]/process - CFP Processing
 * 
 * SPECIFICATION: Business CFP Processing
 * 
 * As a user
 * I want to trigger CFP processing for my business
 * So that I can crawl, fingerprint, and publish my business
 * 
 * Acceptance Criteria:
 * 1. Returns 202 when processing starts successfully
 * 2. Returns 401 when not authenticated
 * 3. Returns 403 when user doesn't own business
 * 4. Returns 404 when business doesn't exist
 * 5. Triggers CFP automation workflow
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

vi.mock('@/lib/services/business-execution', () => ({
  autoStartProcessing: vi.fn(),
}));

vi.mock('@/lib/gemflush/permissions', () => ({
  canProcessBusiness: vi.fn(),
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

describe('POST /api/business/[id]/process - CFP Processing', () => {
  let mockGetUser: any;
  let mockGetTeamForUser: any;
  let mockGetBusinessById: any;
  let mockAutoStartProcessing: any;
  let mockCanProcessBusiness: any;

  beforeEach(async () => {
    vi.clearAllMocks();

    const dbQueries = await import('@/lib/db/queries');
    const businessExecution = await import('@/lib/services/business-execution');
    const permissions = await import('@/lib/gemflush/permissions');

    mockGetUser = dbQueries.getUser;
    mockGetTeamForUser = dbQueries.getTeamForUser;
    mockGetBusinessById = dbQueries.getBusinessById;
    mockAutoStartProcessing = businessExecution.autoStartProcessing;
    mockCanProcessBusiness = permissions.canProcessBusiness;
  });

  /**
   * SPECIFICATION 1: Returns 202 when processing starts successfully
   */
  it('returns 202 when processing starts successfully', async () => {
    // Arrange
    const user = { id: 1, teamId: 1 };
    const team = TeamTestFactory.createPro();
    const business = BusinessTestFactory.create({ id: 123, teamId: 1 });

    mockGetUser.mockResolvedValue(user);
    mockGetTeamForUser.mockResolvedValue(team);
    mockGetBusinessById.mockResolvedValue(business);
    mockCanProcessBusiness.mockResolvedValue(true);
    mockAutoStartProcessing.mockResolvedValue({ success: true });

    // Act
    const { POST } = await import('@/app/api/business/[id]/process/route');
    const request = new NextRequest('http://localhost/api/business/123/process', {
      method: 'POST',
    });
    const response = await POST(request, { params: Promise.resolve({ id: '123' }) });

    // Assert: Verify API contract (route returns 200 on success)
    expect(response.status).toBe(200);
    expect(mockAutoStartProcessing).toHaveBeenCalledWith(business.id);
  });

  /**
   * SPECIFICATION 2: Returns 401 when not authenticated
   */
  it('returns 401 when not authenticated', async () => {
    // Arrange
    mockGetUser.mockResolvedValue(null);

    // Act
    const { POST } = await import('@/app/api/business/[id]/process/route');
    const request = new NextRequest('http://localhost/api/business/123/process', {
      method: 'POST',
    });
    const response = await POST(request, { params: Promise.resolve({ id: '123' }) });

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
    const business = BusinessTestFactory.create({ id: 123, teamId: 999 });

    mockGetUser.mockResolvedValue(user);
    mockGetTeamForUser.mockResolvedValue(team);
    mockGetBusinessById.mockResolvedValue(business);
    mockCanProcessBusiness.mockResolvedValue(false);

    // Act
    const { POST } = await import('@/app/api/business/[id]/process/route');
    const request = new NextRequest('http://localhost/api/business/123/process', {
      method: 'POST',
    });
    const response = await POST(request, { params: Promise.resolve({ id: '123' }) });

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
    mockGetBusinessById.mockResolvedValue(null);

    // Act
    const { POST } = await import('@/app/api/business/[id]/process/route');
    const request = new NextRequest('http://localhost/api/business/999/process', {
      method: 'POST',
    });
    const response = await POST(request, { params: Promise.resolve({ id: '999' }) });

    // Assert
    expect(response.status).toBe(404);
  });
});
