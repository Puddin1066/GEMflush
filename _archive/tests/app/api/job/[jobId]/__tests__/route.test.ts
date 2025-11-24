/**
 * TDD Test: GET /api/job/[jobId] - Job Status API
 * 
 * SPECIFICATION: Job Status Polling
 * 
 * As a user
 * I want to poll job status
 * So that I can track long-running operations
 * 
 * Acceptance Criteria:
 * 1. Returns 200 with job status when job exists
 * 2. Returns 401 when not authenticated
 * 3. Returns 404 when job doesn't exist
 * 4. Returns job progress and status
 * 
 * TDD Cycle: RED → GREEN → REFACTOR
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

// Mock dependencies
vi.mock('@/lib/db/queries', () => ({
  getUser: vi.fn(),
  getTeamForUser: vi.fn(),
  getCrawlJob: vi.fn(),
}));

vi.mock('@/lib/auth/middleware', () => ({
  verifyBusinessOwnership: vi.fn(),
}));

vi.mock('@/lib/data/crawl-dto', () => ({
  toCrawlJobDTO: vi.fn((job) => ({ job })),
}));

vi.mock('@/lib/utils/logger', () => ({
  loggers: {
    api: {
      debug: vi.fn(),
      error: vi.fn(),
    },
  },
}));

describe('GET /api/job/[jobId] - Job Status API', () => {
  let mockGetUser: any;
  let mockGetTeamForUser: any;
  let mockGetCrawlJob: any;
  let mockVerifyBusinessOwnership: any;

  beforeEach(async () => {
    vi.clearAllMocks();

    const dbQueries = await import('@/lib/db/queries');
    const middleware = await import('@/lib/auth/middleware');
    mockGetUser = dbQueries.getUser;
    mockGetTeamForUser = dbQueries.getTeamForUser;
    mockGetCrawlJob = dbQueries.getCrawlJob;
    mockVerifyBusinessOwnership = middleware.verifyBusinessOwnership;
  });

  /**
   * SPECIFICATION 1: Returns job status when job exists
   */
  it('returns 200 with job status when job exists', async () => {
    // Arrange
    const user = { id: 1, teamId: 1 };
    const team = { id: 1 };
    const job = {
      id: 123,
      businessId: 456,
      status: 'running',
      progress: 50,
      jobType: 'enhanced_multipage_crawl',
    };
    const business = { id: 456, teamId: 1 };

    mockGetUser.mockResolvedValue(user);
    mockGetTeamForUser.mockResolvedValue(team);
    mockGetCrawlJob.mockResolvedValue(job);
    mockVerifyBusinessOwnership.mockResolvedValue({ authorized: true, business });

    // Act
    const { GET } = await import('@/app/api/job/[jobId]/route');
    const request = new NextRequest('http://localhost/api/job/123');
    const response = await GET(request, { params: Promise.resolve({ jobId: '123' }) });

    // Assert: Verify API contract
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.job).toBeDefined();
  });

  /**
   * SPECIFICATION 2: Returns 401 when not authenticated
   */
  it('returns 401 when not authenticated', async () => {
    // Arrange
    mockGetUser.mockResolvedValue(null);

    // Act
    const { GET } = await import('@/app/api/job/[jobId]/route');
    const request = new NextRequest('http://localhost/api/job/123');
    const response = await GET(request, { params: Promise.resolve({ jobId: '123' }) });

    // Assert
    expect(response.status).toBe(401);
  });

  /**
   * SPECIFICATION 3: Returns 404 when job doesn't exist
   */
  it('returns 404 when job does not exist', async () => {
    // Arrange
    const user = { id: 1, teamId: 1 };
    const team = { id: 1 };

    mockGetUser.mockResolvedValue(user);
    mockGetTeamForUser.mockResolvedValue(team);
    mockGetCrawlJob.mockResolvedValue(null);

    // Act
    const { GET } = await import('@/app/api/job/[jobId]/route');
    const request = new NextRequest('http://localhost/api/job/999');
    const response = await GET(request, { params: Promise.resolve({ jobId: '999' }) });

    // Assert
    expect(response.status).toBe(404);
  });
});

