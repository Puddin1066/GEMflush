/**
 * TDD Test: POST /api/business/[id]/reset-fingerprint - Reset Fingerprint Data
 * 
 * SPECIFICATION: Development Fingerprint Reset
 * 
 * As a developer
 * I want to reset fingerprint data for a business
 * So that I can test CFP workflow changes without creating new businesses
 * 
 * Acceptance Criteria:
 * 1. Returns 200 when fingerprint reset succeeds
 * 2. Returns 403 in production (development only)
 * 3. Returns 401 when not authenticated
 * 4. Returns 404 when business not found
 * 5. Returns 403 when user lacks access
 * 6. Deletes fingerprints and competitors
 * 7. Re-starts CFP processing
 * 
 * TDD Cycle: RED → GREEN → REFACTOR
 * No Overfitting: Test behavior, not implementation details
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { BusinessTestFactory } from '@/lib/test-helpers/tdd-helpers';

// Mock dependencies
vi.mock('@/lib/db/queries', () => ({
  getUser: vi.fn(),
  getTeamForUser: vi.fn(),
  getBusinessById: vi.fn(),
}));

vi.mock('@/lib/db/drizzle', () => ({
  db: {
    delete: vi.fn(),
  },
  eq: vi.fn((col: any, val: any) => ({ col, val })),
  and: vi.fn((...args: any[]) => ({ args })),
}));

// Mock schema tables - Drizzle table objects
// The route accesses llmFingerprints.businessId in eq() calls
// These need to be objects that can have properties accessed
vi.mock('@/lib/db/schema', () => ({
  llmFingerprints: {
    id: 'llmFingerprints.id',
    businessId: 'llmFingerprints.businessId',
  },
  competitors: {
    id: 'competitors.id',
    businessId: 'competitors.businessId',
  },
}));

vi.mock('@/lib/services/business-execution', () => ({
  autoStartProcessing: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/utils/logger', () => ({
  loggers: {
    api: {
      info: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    },
  },
}));

describe('POST /api/business/[id]/reset-fingerprint', () => {
  let mockGetUser: any;
  let mockGetTeamForUser: any;
  let mockGetBusinessById: any;
  let mockDbDelete: any;
  let mockAutoStartProcessing: any;
  const originalEnv = process.env.NODE_ENV;

  beforeEach(async () => {
    vi.clearAllMocks();
    process.env.NODE_ENV = 'development'; // Default to development

    const dbQueries = await import('@/lib/db/queries');
    const db = await import('@/lib/db/drizzle');
    const businessExecution = await import('@/lib/services/business-execution');

    mockGetUser = dbQueries.getUser;
    mockGetTeamForUser = dbQueries.getTeamForUser;
    mockGetBusinessById = dbQueries.getBusinessById;
    mockDbDelete = db.db.delete;
    mockAutoStartProcessing = businessExecution.autoStartProcessing;
    
    // Ensure autoStartProcessing returns a resolved promise
    mockAutoStartProcessing.mockResolvedValue(undefined);
  });

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
  });

  /**
   * SPECIFICATION 1: Returns 200 when fingerprint reset succeeds
   */
  it('returns 200 when fingerprint reset succeeds', async () => {
    // Arrange
    const user = { id: 1, teamId: 1 };
    const team = { id: 1, planName: 'pro' };
    const business = BusinessTestFactory.createCrawled({ id: 123, teamId: 1 });

    mockGetUser.mockResolvedValue(user);
    mockGetTeamForUser.mockResolvedValue(team);
    mockGetBusinessById.mockResolvedValue(business);

    // Mock database delete operations
    // Pattern: db.delete(table).where(...).returning() - returns Promise
    // The route calls: db.delete(llmFingerprints).where(...).returning()
    const mockReturning1 = vi.fn().mockResolvedValue([{ id: 1 }, { id: 2 }]);
    const mockWhere1 = vi.fn().mockReturnValue({ returning: mockReturning1 });
    
    // Pattern: db.delete(table).where(...) - returns Promise (no returning)
    // The route calls: db.delete(competitors).where(...)
    const mockWhere2 = vi.fn().mockResolvedValue(undefined);
    
    // Mock delete calls - db.delete(table) returns object with .where() method
    // Need to handle both calls: db.delete(llmFingerprints) and db.delete(competitors)
    mockDbDelete
      .mockReturnValueOnce({ where: mockWhere1 }) // First: llmFingerprints with returning
      .mockReturnValueOnce({ where: mockWhere2 }); // Second: competitors without returning

    // Act
    const { POST } = await import('@/app/api/business/[id]/reset-fingerprint/route');
    const request = new NextRequest('http://localhost/api/business/123/reset-fingerprint', {
      method: 'POST',
    });
    const response = await POST(request, { params: Promise.resolve({ id: '123' }) });

    // Assert: Verify API contract (behavior: successful reset)
    // Debug: Check response if not 200
    if (response.status !== 200) {
      const errorData = await response.json();
      console.error('Route error response:', JSON.stringify(errorData, null, 2));
      // Check if it's a mock issue
      console.error('Mock calls:', {
        deleteCalls: mockDbDelete.mock.calls.length,
        deleteReturns: mockDbDelete.mock.results,
      });
    }
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.businessId).toBe(123);
    expect(data.fingerprintsDeleted).toBe(2);
    expect(mockAutoStartProcessing).toHaveBeenCalledWith(123);
  });

  /**
   * SPECIFICATION 2: Returns 403 in production (development only)
   */
  it('returns 403 in production environment', async () => {
    // Arrange
    process.env.NODE_ENV = 'production';

    // Act
    const { POST } = await import('@/app/api/business/[id]/reset-fingerprint/route');
    const request = new NextRequest('http://localhost/api/business/123/reset-fingerprint', {
      method: 'POST',
    });
    const response = await POST(request, { params: Promise.resolve({ id: '123' }) });

    // Assert: Verify production restriction (behavior: security enforcement)
    expect(response.status).toBe(403);
    const data = await response.json();
    expect(data.error).toContain('development');
    expect(mockGetUser).not.toHaveBeenCalled();
  });

  /**
   * SPECIFICATION 3: Returns 401 when not authenticated
   */
  it('returns 401 when not authenticated', async () => {
    // Arrange
    mockGetUser.mockResolvedValue(null);

    // Act
    const { POST } = await import('@/app/api/business/[id]/reset-fingerprint/route');
    const request = new NextRequest('http://localhost/api/business/123/reset-fingerprint', {
      method: 'POST',
    });
    const response = await POST(request, { params: Promise.resolve({ id: '123' }) });

    // Assert: Verify authentication (behavior: security enforcement)
    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toBe('Unauthorized');
  });

  /**
   * SPECIFICATION 4: Returns 404 when business not found
   */
  it('returns 404 when business not found', async () => {
    // Arrange
    const user = { id: 1, teamId: 1 };
    const team = { id: 1, planName: 'pro' };

    mockGetUser.mockResolvedValue(user);
    mockGetTeamForUser.mockResolvedValue(team);
    mockGetBusinessById.mockResolvedValue(null);

    // Act
    const { POST } = await import('@/app/api/business/[id]/reset-fingerprint/route');
    const request = new NextRequest('http://localhost/api/business/999/reset-fingerprint', {
      method: 'POST',
    });
    const response = await POST(request, { params: Promise.resolve({ id: '999' }) });

    // Assert: Verify not found handling (behavior: proper error response)
    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.error).toBe('Business not found');
  });

  /**
   * SPECIFICATION 5: Returns 403 when user lacks access
   */
  it('returns 403 when user lacks access to business', async () => {
    // Arrange
    const user = { id: 1, teamId: 2 };
    const team = { id: 2, planName: 'pro' };
    const business = BusinessTestFactory.create({ id: 123, teamId: 1 }); // Different team

    mockGetUser.mockResolvedValue(user);
    mockGetTeamForUser.mockResolvedValue(team);
    mockGetBusinessById.mockResolvedValue(business);

    // Act
    const { POST } = await import('@/app/api/business/[id]/reset-fingerprint/route');
    const request = new NextRequest('http://localhost/api/business/123/reset-fingerprint', {
      method: 'POST',
    });
    const response = await POST(request, { params: Promise.resolve({ id: '123' }) });

    // Assert: Verify authorization (behavior: access control)
    expect(response.status).toBe(403);
    const data = await response.json();
    expect(data.error).toBe('Unauthorized');
  });

  /**
   * SPECIFICATION 6: Deletes fingerprints and competitors
   */
  it('deletes fingerprints and competitors from database', async () => {
    // Arrange
    const user = { id: 1, teamId: 1 };
    const team = { id: 1, planName: 'pro' };
    const business = BusinessTestFactory.createCrawled({ id: 123, teamId: 1 });

    mockGetUser.mockResolvedValue(user);
    mockGetTeamForUser.mockResolvedValue(team);
    mockGetBusinessById.mockResolvedValue(business);

    const mockReturning = vi.fn().mockResolvedValue([{ id: 1 }]);
    const mockWhere = vi.fn().mockReturnValue({ returning: mockReturning });
    mockDbDelete.mockReturnValue({ where: mockWhere });

    // Act
    const { POST } = await import('@/app/api/business/[id]/reset-fingerprint/route');
    const request = new NextRequest('http://localhost/api/business/123/reset-fingerprint', {
      method: 'POST',
    });
    await POST(request, { params: Promise.resolve({ id: '123' }) });

    // Assert: Verify database operations (behavior: data cleanup)
    expect(mockDbDelete).toHaveBeenCalledTimes(2); // Fingerprints and competitors
  });

  /**
   * SPECIFICATION 7: Re-starts CFP processing
   */
  it('re-starts CFP processing after reset', async () => {
    // Arrange
    const user = { id: 1, teamId: 1 };
    const team = { id: 1, planName: 'pro' };
    const business = BusinessTestFactory.createCrawled({ id: 123, teamId: 1 });

    mockGetUser.mockResolvedValue(user);
    mockGetTeamForUser.mockResolvedValue(team);
    mockGetBusinessById.mockResolvedValue(business);

    const mockReturning1 = vi.fn().mockResolvedValue([]);
    const mockWhere1 = vi.fn().mockReturnValue({ returning: mockReturning1 });
    const mockWhere2 = vi.fn().mockResolvedValue(undefined);
    
    mockDbDelete
      .mockReturnValueOnce({ where: mockWhere1 })
      .mockReturnValueOnce({ where: mockWhere2 });

    // Act
    const { POST } = await import('@/app/api/business/[id]/reset-fingerprint/route');
    const request = new NextRequest('http://localhost/api/business/123/reset-fingerprint', {
      method: 'POST',
    });
    await POST(request, { params: Promise.resolve({ id: '123' }) });

    // Assert: Verify CFP restart (behavior: workflow re-initiation)
    expect(mockAutoStartProcessing).toHaveBeenCalledWith(123);
  });
});

