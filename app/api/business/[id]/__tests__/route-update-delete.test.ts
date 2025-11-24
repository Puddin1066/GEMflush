/**
 * TDD Test: PUT/DELETE /api/business/[id] - Update and Delete
 * 
 * SPECIFICATION: Business Update and Deletion
 * 
 * As a user
 * I want to update and delete my businesses
 * So that I can manage my business data
 * 
 * TDD Cycle: RED → GREEN → REFACTOR
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { BusinessTestFactory, TeamTestFactory } from '@/lib/test-helpers/tdd-helpers';

vi.mock('@/lib/db/queries', () => ({
  getUser: vi.fn(),
  getTeamForUser: vi.fn(),
  getBusinessById: vi.fn(),
  updateBusiness: vi.fn(),
  deleteBusiness: vi.fn(),
}));

vi.mock('@/lib/utils/logger', () => ({
  loggers: {
    api: {
      debug: vi.fn(),
      error: vi.fn(),
      info: vi.fn(),
    },
  },
  createLogger: vi.fn(() => ({
    debug: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  })),
}));

vi.mock('@/lib/data/business-dto', () => ({
  getBusinessDetailDTO: vi.fn(),
}));

describe('PUT /api/business/[id] - Update Business', () => {
  let mockGetUser: any;
  let mockGetTeamForUser: any;
  let mockGetBusinessById: any;
  let mockUpdateBusiness: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    const dbQueries = await import('@/lib/db/queries');
    mockGetUser = dbQueries.getUser;
    mockGetTeamForUser = dbQueries.getTeamForUser;
    mockGetBusinessById = dbQueries.getBusinessById;
    mockUpdateBusiness = dbQueries.updateBusiness;
  });

  it('updates business and returns 200', async () => {
    // Arrange
    const user = { id: 1, teamId: 1 };
    const team = TeamTestFactory.createPro();
    const business = BusinessTestFactory.create({ id: 123, teamId: 1 });
    const updateData = { name: 'Updated Name' };

    mockGetUser.mockResolvedValue(user);
    mockGetTeamForUser.mockResolvedValue(team);
    mockGetBusinessById.mockResolvedValue(business);
    mockUpdateBusiness.mockResolvedValue({ ...business, ...updateData });

    // Act
    const { PUT } = await import('@/app/api/business/[id]/route');
    const request = new NextRequest('http://localhost/api/business/123', {
      method: 'PUT',
      body: JSON.stringify(updateData),
    });
    const response = await PUT(request, { params: Promise.resolve({ id: '123' }) });

    // Assert
    expect(response.status).toBe(200);
    expect(mockUpdateBusiness).toHaveBeenCalled();
  });

  it('returns 403 when user does not own business', async () => {
    // Arrange
    const user = { id: 1, teamId: 1 };
    const team = TeamTestFactory.createPro();
    const business = BusinessTestFactory.create({ id: 123, teamId: 999 });

    mockGetUser.mockResolvedValue(user);
    mockGetTeamForUser.mockResolvedValue(team);
    mockGetBusinessById.mockResolvedValue(business);

    // Act
    const { PUT } = await import('@/app/api/business/[id]/route');
    const request = new NextRequest('http://localhost/api/business/123', {
      method: 'PUT',
      body: JSON.stringify({ name: 'Updated' }),
    });
    const response = await PUT(request, { params: Promise.resolve({ id: '123' }) });

    // Assert
    expect(response.status).toBe(403);
  });
});

describe('DELETE /api/business/[id] - Delete Business', () => {
  let mockGetUser: any;
  let mockGetTeamForUser: any;
  let mockGetBusinessById: any;
  let mockDeleteBusiness: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    const dbQueries = await import('@/lib/db/queries');
    mockGetUser = dbQueries.getUser;
    mockGetTeamForUser = dbQueries.getTeamForUser;
    mockGetBusinessById = dbQueries.getBusinessById;
    mockDeleteBusiness = dbQueries.deleteBusiness;
  });

  it('deletes business and returns 200', async () => {
    // Arrange
    const user = { id: 1, teamId: 1 };
    const team = TeamTestFactory.createPro();
    const business = BusinessTestFactory.create({ id: 123, teamId: 1 });

    mockGetUser.mockResolvedValue(user);
    mockGetTeamForUser.mockResolvedValue(team);
    mockGetBusinessById.mockResolvedValue(business);
    mockDeleteBusiness.mockResolvedValue(undefined);

    // Act
    const { DELETE } = await import('@/app/api/business/[id]/route');
    const request = new NextRequest('http://localhost/api/business/123', {
      method: 'DELETE',
    });
    const response = await DELETE(request, { params: Promise.resolve({ id: '123' }) });

    // Assert
    expect(response.status).toBe(200);
    expect(mockDeleteBusiness).toHaveBeenCalledWith(123);
  });
});

