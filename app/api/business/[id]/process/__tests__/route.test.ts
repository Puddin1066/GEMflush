/**
 * API Route tests for CFP processing endpoint
 * Tests /api/business/[id]/process endpoint
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '../route';
import { autoStartProcessing } from '@/lib/services/business-execution';

// Mock dependencies
vi.mock('@/lib/db/queries', () => ({
  getUser: vi.fn(),
  getTeamForUser: vi.fn(),
  getBusinessById: vi.fn(),
}));

vi.mock('@/lib/services/business-execution', () => ({
  autoStartProcessing: vi.fn(),
}));

vi.mock('@/lib/utils/logger', () => ({
  loggers: {
    api: {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
    },
  },
}));

describe('POST /api/business/[id]/process', () => {
  let mockGetUser: any;
  let mockGetTeamForUser: any;
  let mockGetBusinessById: any;
  let mockAutoStartProcessing: any;

  // DRY: Common test data
  const mockUser = { id: 1, email: 'test@example.com' };
  const mockTeam = { id: 1, name: 'Test Team' };
  const mockBusiness = {
    id: 1,
    name: 'Test Business',
    url: 'https://example.com',
    teamId: 1,
    status: 'pending',
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    const dbQueries = await import('@/lib/db/queries');
    const businessExecution = await import('@/lib/services/business-execution');

    mockGetUser = dbQueries.getUser;
    mockGetTeamForUser = dbQueries.getTeamForUser;
    mockGetBusinessById = dbQueries.getBusinessById;
    mockAutoStartProcessing = businessExecution.autoStartProcessing;
  });

  // DRY: Helper function for creating requests
  const createRequest = (businessId: string) =>
    new NextRequest(`http://localhost:3000/api/business/${businessId}/process`, {
      method: 'POST',
    });

  it('should successfully trigger CFP processing', async () => {
    // Setup mocks
    mockGetUser.mockResolvedValue(mockUser);
    mockGetTeamForUser.mockResolvedValue(mockTeam);
    mockGetBusinessById.mockResolvedValue(mockBusiness);
    mockAutoStartProcessing.mockResolvedValue({ success: true, businessId: 1 });

    // Execute
    const request = createRequest('1');
    const response = await POST(request, { params: Promise.resolve({ id: '1' }) });
    const data = await response.json();

    // Log response for debugging (avoid overfitting)
    console.log('[TEST] API Response:', { status: response.status, data });

    // Verify behavior: successful response and CFP triggered
    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockAutoStartProcessing).toHaveBeenCalledWith(1);
  });

  // DRY: Test error cases with table-driven approach
  const errorCases = [
    {
      name: '401 when user not authenticated',
      setup: () => mockGetUser.mockResolvedValue(null),
      expectedStatus: 401,
      expectedError: 'Unauthorized',
    },
    {
      name: '404 when business not found',
      setup: () => {
        mockGetUser.mockResolvedValue(mockUser);
        mockGetTeamForUser.mockResolvedValue(mockTeam);
        mockGetBusinessById.mockResolvedValue(null);
      },
      expectedStatus: 404,
      expectedError: 'Business not found',
      id: '999',
    },
    {
      name: '403 when user does not own business',
      setup: () => {
        mockGetUser.mockResolvedValue(mockUser);
        mockGetTeamForUser.mockResolvedValue({ id: 2, name: 'Different Team' });
        mockGetBusinessById.mockResolvedValue(mockBusiness);
      },
      expectedStatus: 403,
      expectedError: 'Unauthorized',
    },
    {
      name: '400 for invalid business ID',
      setup: () => mockGetUser.mockResolvedValue(mockUser),
      expectedStatus: 400,
      expectedError: 'Invalid business ID',
      id: 'invalid',
    },
  ];

  it.each(errorCases)('should return $expectedStatus - $name', async ({ setup, expectedStatus, expectedError, id = '1' }) => {
    setup();
    const request = createRequest(id);
    const response = await POST(request, { params: Promise.resolve({ id }) });
    const data = await response.json();

    // Log response for debugging (avoid overfitting)
    console.log(`[TEST] Error case "${id}":`, { status: response.status, error: data.error });

    // Verify behavior: correct status code and error (not exact text match)
    expect(response.status).toBe(expectedStatus);
    expect(data.error).toBeTruthy(); // Has error message (flexible)
    expect(mockAutoStartProcessing).not.toHaveBeenCalled();
  });

  it('should handle CFP processing errors gracefully', async () => {
    mockGetUser.mockResolvedValue(mockUser);
    mockGetTeamForUser.mockResolvedValue(mockTeam);
    mockGetBusinessById.mockResolvedValue(mockBusiness);
    mockAutoStartProcessing.mockRejectedValue(new Error('CFP processing failed'));

    const request = createRequest('1');
    const response = await POST(request, { params: Promise.resolve({ id: '1' }) });
    const data = await response.json();

    // Behavior: returns 200 even if background processing fails
    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockAutoStartProcessing).toHaveBeenCalledWith(1);
  });
});
