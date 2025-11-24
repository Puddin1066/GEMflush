/**
 * TDD Test: GET /api/fingerprint/business/[businessId] - Get Latest Fingerprint
 * 
 * SPECIFICATION: Fingerprint Retrieval by Business ID
 * 
 * As a user
 * I want to get the latest fingerprint for my business
 * So that I can view visibility metrics and trends
 * 
 * Acceptance Criteria:
 * 1. Returns 200 with fingerprint DTO when fingerprint exists
 * 2. Returns 200 with null when no fingerprint exists
 * 3. Returns 401 when not authenticated
 * 4. Returns 403 when user lacks access to business
 * 5. Returns 404 when business not found
 * 6. Returns 400 when business ID is invalid
 * 7. Includes trend calculation from previous fingerprint
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
}));

// Mock Drizzle query builder chain
const createMockQueryBuilder = (result: any[]) => {
  const mockLimit = vi.fn().mockResolvedValue(result);
  const mockOrderBy = vi.fn().mockReturnValue({ limit: mockLimit });
  const mockWhere = vi.fn().mockReturnValue({ orderBy: mockOrderBy, limit: mockLimit });
  const mockFrom = vi.fn().mockReturnValue({ where: mockWhere, limit: mockLimit });
  const mockSelect = vi.fn().mockReturnValue({ from: mockFrom });
  return { mockSelect, mockFrom, mockWhere, mockOrderBy, mockLimit };
};

vi.mock('@/lib/db/drizzle', () => ({
  db: {
    select: vi.fn(),
    query: {
      teamMembers: {
        findMany: vi.fn(),
      },
    },
  },
  eq: vi.fn((col: any, val: any) => ({ col, val })),
  desc: vi.fn((col: any) => ({ col, direction: 'desc' })),
}));

vi.mock('@/lib/data/fingerprint-dto', () => ({
  toFingerprintDetailDTO: vi.fn(),
}));

vi.mock('@/lib/validation/common', () => ({
  businessIdParamSchema: {
    safeParse: vi.fn(),
  },
}));

vi.mock('@/lib/utils/logger', () => ({
  loggers: {
    fingerprint: {
      debug: vi.fn(),
      error: vi.fn(),
      info: vi.fn(),
    },
  },
}));

describe('GET /api/fingerprint/business/[businessId]', () => {
  let mockGetUser: any;
  let mockDbSelect: any;
  let mockDbQuery: any;
  let mockToFingerprintDetailDTO: any;
  let mockBusinessIdParamSchema: any;

  beforeEach(async () => {
    vi.clearAllMocks();

    const dbQueries = await import('@/lib/db/queries');
    const db = await import('@/lib/db/drizzle');
    const fingerprintDTO = await import('@/lib/data/fingerprint-dto');
    const validation = await import('@/lib/validation/common');

    mockGetUser = dbQueries.getUser;
    mockDbSelect = db.db.select;
    mockDbQuery = db.db.query;
    mockToFingerprintDetailDTO = fingerprintDTO.toFingerprintDetailDTO;
    mockBusinessIdParamSchema = validation.businessIdParamSchema;
  });

  /**
   * SPECIFICATION 1: Returns 200 with fingerprint DTO when fingerprint exists
   */
  it('returns 200 with fingerprint DTO when fingerprint exists', async () => {
    // Arrange
    const user = { id: 1, teamId: 1 };
    const business = BusinessTestFactory.createCrawled({ id: 123, teamId: 1 });
    const fingerprint = {
      id: 1,
      businessId: 123,
      visibilityScore: 75,
      mentionRate: 80,
      sentimentScore: 0.7,
      createdAt: new Date(),
    };
    const dto = {
      visibilityScore: 75,
      trend: 'up',
      summary: { mentionRate: 80, sentiment: 'positive' },
    };

    mockGetUser.mockResolvedValue(user);
    mockBusinessIdParamSchema.safeParse.mockReturnValue({
      success: true,
      data: { businessId: 123 },
    });

    mockDbQuery.teamMembers.findMany.mockResolvedValue([{ teamId: 1, userId: 1 }]);

    // Mock business query: db.select().from(businesses).where(...).limit(1)
    const businessLimit = vi.fn().mockResolvedValue([business]);
    const businessWhere = vi.fn().mockReturnValue({ limit: businessLimit });
    const businessFrom = vi.fn().mockReturnValue({ where: businessWhere, limit: businessLimit });
    
    // Mock fingerprint query: db.select().from(llmFingerprints).where(...).orderBy(...).limit(2)
    const fingerprintLimit = vi.fn().mockResolvedValue([fingerprint]);
    const fingerprintOrderBy = vi.fn().mockReturnValue({ limit: fingerprintLimit });
    const fingerprintWhere = vi.fn().mockReturnValue({ orderBy: fingerprintOrderBy, limit: fingerprintLimit });
    const fingerprintFrom = vi.fn().mockReturnValue({ where: fingerprintWhere, limit: fingerprintLimit });
    
    // Return different chains for different calls
    mockDbSelect
      .mockReturnValueOnce({ from: businessFrom }) // First call: business query
      .mockReturnValueOnce({ from: fingerprintFrom }); // Second call: fingerprint query

    mockToFingerprintDetailDTO.mockReturnValue(dto);

    // Act
    const { GET } = await import('@/app/api/fingerprint/business/[businessId]/route');
    const request = new NextRequest('http://localhost/api/fingerprint/business/123');
    const response = await GET(request, { params: Promise.resolve({ businessId: '123' }) });

    // Assert: Verify API contract (behavior: fingerprint returned)
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.visibilityScore).toBe(75);
    expect(data.trend).toBe('up');
    expect(mockToFingerprintDetailDTO).toHaveBeenCalled();
  });

  /**
   * SPECIFICATION 2: Returns 200 with null when no fingerprint exists
   */
  it('returns 200 with null when no fingerprint exists', async () => {
    // Arrange
    const user = { id: 1, teamId: 1 };
    const business = BusinessTestFactory.create({ id: 123, teamId: 1 });

    mockGetUser.mockResolvedValue(user);
    mockBusinessIdParamSchema.safeParse.mockReturnValue({
      success: true,
      data: { businessId: 123 },
    });

    mockDbQuery.teamMembers.findMany.mockResolvedValue([{ teamId: 1, userId: 1 }]);

    // Mock business query
    const businessLimit = vi.fn().mockResolvedValue([business]);
    const businessWhere = vi.fn().mockReturnValue({ limit: businessLimit });
    const businessFrom = vi.fn().mockReturnValue({ where: businessWhere, limit: businessLimit });
    
    // Mock fingerprint query (no fingerprints)
    const fingerprintLimit = vi.fn().mockResolvedValue([]);
    const fingerprintOrderBy = vi.fn().mockReturnValue({ limit: fingerprintLimit });
    const fingerprintWhere = vi.fn().mockReturnValue({ orderBy: fingerprintOrderBy, limit: fingerprintLimit });
    const fingerprintFrom = vi.fn().mockReturnValue({ where: fingerprintWhere, limit: fingerprintLimit });
    
    mockDbSelect
      .mockReturnValueOnce({ from: businessFrom })
      .mockReturnValueOnce({ from: fingerprintFrom });

    // Act
    const { GET } = await import('@/app/api/fingerprint/business/[businessId]/route');
    const request = new NextRequest('http://localhost/api/fingerprint/business/123');
    const response = await GET(request, { params: Promise.resolve({ businessId: '123' }) });

    // Assert: Verify null response (behavior: graceful handling of missing data)
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toBeNull();
  });

  /**
   * SPECIFICATION 3: Returns 401 when not authenticated
   */
  it('returns 401 when not authenticated', async () => {
    // Arrange
    mockGetUser.mockResolvedValue(null);
    mockBusinessIdParamSchema.safeParse.mockReturnValue({
      success: true,
      data: { businessId: 123 },
    });

    // Act
    const { GET } = await import('@/app/api/fingerprint/business/[businessId]/route');
    const request = new NextRequest('http://localhost/api/fingerprint/business/123');
    const response = await GET(request, { params: Promise.resolve({ businessId: '123' }) });

    // Assert: Verify authentication (behavior: security enforcement)
    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toBe('Unauthorized');
  });

  /**
   * SPECIFICATION 4: Returns 403 when user lacks access
   */
  it('returns 403 when user lacks access to business', async () => {
    // Arrange
    const user = { id: 1, teamId: 2 };
    const business = BusinessTestFactory.create({ id: 123, teamId: 1 });

    mockGetUser.mockResolvedValue(user);
    mockBusinessIdParamSchema.safeParse.mockReturnValue({
      success: true,
      data: { businessId: 123 },
    });

    const mockWhere = vi.fn().mockReturnValue({ limit: vi.fn().mockResolvedValue([business]) });
    const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
    mockDbSelect.mockReturnValue({ from: mockFrom });

    mockDbQuery.teamMembers.findMany.mockResolvedValue([{ teamId: 2, userId: 1 }]); // Different team

    // Act
    const { GET } = await import('@/app/api/fingerprint/business/[businessId]/route');
    const request = new NextRequest('http://localhost/api/fingerprint/business/123');
    const response = await GET(request, { params: Promise.resolve({ businessId: '123' }) });

    // Assert: Verify authorization (behavior: access control)
    expect(response.status).toBe(403);
    const data = await response.json();
    expect(data.error).toContain('Not authorized');
  });

  /**
   * SPECIFICATION 5: Returns 404 when business not found
   */
  it('returns 404 when business not found', async () => {
    // Arrange
    const user = { id: 1, teamId: 1 };

    mockGetUser.mockResolvedValue(user);
    mockBusinessIdParamSchema.safeParse.mockReturnValue({
      success: true,
      data: { businessId: 999 },
    });

    // Mock business query (no business found)
    const businessLimit = vi.fn().mockResolvedValue([]);
    const businessWhere = vi.fn().mockReturnValue({ limit: businessLimit });
    const businessFrom = vi.fn().mockReturnValue({ where: businessWhere, limit: businessLimit });
    mockDbSelect.mockReturnValue({ from: businessFrom });

    // Act
    const { GET } = await import('@/app/api/fingerprint/business/[businessId]/route');
    const request = new NextRequest('http://localhost/api/fingerprint/business/999');
    const response = await GET(request, { params: Promise.resolve({ businessId: '999' }) });

    // Assert: Verify not found handling (behavior: proper error response)
    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.error).toBe('Business not found');
  });

  /**
   * SPECIFICATION 6: Returns 400 when business ID is invalid
   */
  it('returns 400 when business ID is invalid', async () => {
    // Arrange
    const user = { id: 1, teamId: 1 };

    mockGetUser.mockResolvedValue(user);
    mockBusinessIdParamSchema.safeParse.mockReturnValue({
      success: false,
      error: { errors: [{ path: ['businessId'], message: 'Invalid ID' }] },
    });

    // Act
    const { GET } = await import('@/app/api/fingerprint/business/[businessId]/route');
    const request = new NextRequest('http://localhost/api/fingerprint/business/invalid');
    const response = await GET(request, { params: Promise.resolve({ businessId: 'invalid' }) });

    // Assert: Verify validation (behavior: input validation)
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('Invalid business ID');
  });
});

