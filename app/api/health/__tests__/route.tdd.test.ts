/**
 * TDD Test: Health Check API Route - Tests Drive Implementation
 * 
 * SPECIFICATION: GET /api/health
 * 
 * As a monitoring service
 * I want to check application and database health
 * So that I can monitor system status
 * 
 * Acceptance Criteria:
 * 1. Route checks database connectivity
 * 2. Returns 200 with healthy status when all checks pass
 * 3. Returns 200 with degraded status when database is slow
 * 4. Returns 503 with unhealthy status when database is down
 * 5. Includes latency information in response
 * 6. Response includes timestamp and checks object
 * 
 * TDD Cycle: RED → GREEN → REFACTOR
 * Tests written FIRST to drive implementation
 * SOLID: Single Responsibility - each test specifies one behavior
 * DRY: Reusable test mocks
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GET } from '../route';
import { NextRequest } from 'next/server';

// Mock database
vi.mock('@/lib/db/drizzle', async () => {
  const actual = await vi.importActual('@/lib/db/drizzle');
  return {
    ...actual,
    db: {
      execute: vi.fn(),
    },
  };
});

vi.mock('drizzle-orm', async () => {
  const actual = await vi.importActual('drizzle-orm');
  return {
    ...actual,
    sql: vi.fn(() => ({})),
  };
});

import { db } from '@/lib/db/drizzle';

const mockDbExecute = vi.mocked(db.execute);

describe('🔴 RED: GET /api/health - Specification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * SPECIFICATION 1: Route checks database connectivity
   * 
   * Given: Healthy database
   * When: GET request is made
   * Then: Route MUST execute database query to check connectivity
   */
  it('MUST check database connectivity', async () => {
    // Arrange: Mock successful database query
    mockDbExecute.mockResolvedValue({} as any);

    // Act: Make GET request
    await GET();

    // Assert: SPECIFICATION - MUST execute database query
    expect(mockDbExecute).toHaveBeenCalledTimes(1);
  });

  /**
   * SPECIFICATION 2: Returns 200 with healthy status when all checks pass
   * 
   * Given: Database is healthy (fast response)
   * When: GET request is made
   * Then: Response should be 200 with status "healthy"
   */
  it('returns 200 with healthy status when all checks pass', async () => {
    // Arrange: Mock fast database response (< 1000ms)
    mockDbExecute.mockImplementation(() => {
      return new Promise((resolve) => {
        setTimeout(() => resolve({} as any), 10); // Fast response
      });
    });

    // Act: Make GET request
    const response = await GET();

    // Assert: SPECIFICATION - Response should be 200 with healthy status
    expect(response.status).toBe(200);
    
    const data = await response.json();
    expect(data.status).toBe('healthy');
    expect(data.checks.database.status).toBe('healthy');
    expect(data.checks.database.latency).toBeDefined();
    expect(data.checks.database.latency).toBeLessThan(1000);
    expect(data.timestamp).toBeDefined();
    expect(data.latency).toBeDefined();
  });

  /**
   * SPECIFICATION 3: Returns 200 with degraded status when database is slow
   * 
   * Given: Database is slow (1s < latency < 5s)
   * When: GET request is made
   * Then: Response should be 200 with status "degraded"
   */
  it('returns 200 with degraded status when database is slow', async () => {
    // Arrange: Mock slow database response (1-5 seconds)
    mockDbExecute.mockImplementation(() => {
      return new Promise((resolve) => {
        setTimeout(() => resolve({} as any), 2000); // Slow but not failing
      });
    });

    // Act: Make GET request
    const response = await GET();

    // Assert: SPECIFICATION - Response should be 200 with degraded status
    expect(response.status).toBe(200);
    
    const data = await response.json();
    expect(data.status).toBe('degraded');
    expect(data.checks.database.status).toBe('degraded');
    expect(data.checks.database.latency).toBeGreaterThanOrEqual(1000);
    expect(data.checks.database.latency).toBeLessThan(5000);
  });

  /**
   * SPECIFICATION 4: Returns 503 with unhealthy status when database is down
   * 
   * Given: Database connection fails
   * When: GET request is made
   * Then: Response should be 503 with status "unhealthy"
   */
  it('returns 503 with unhealthy status when database is down', async () => {
    // Arrange: Mock database failure
    mockDbExecute.mockRejectedValue(new Error('Database connection failed'));

    // Act: Make GET request
    const response = await GET();

    // Assert: SPECIFICATION - Response should be 503 with unhealthy status
    expect(response.status).toBe(503);
    
    const data = await response.json();
    expect(data.status).toBe('unhealthy');
    expect(data.checks.database.status).toBe('unhealthy');
    expect(data.checks.database.latency).toBeUndefined();
  });

  /**
   * SPECIFICATION 5: Includes latency information in response
   * 
   * Given: Healthy database
   * When: GET request is made
   * Then: Response MUST include latency information
   */
  it('MUST include latency information in response', async () => {
    // Arrange: Mock database response
    mockDbExecute.mockResolvedValue({} as any);

    // Act: Make GET request
    const response = await GET();

    // Assert: SPECIFICATION - Response MUST include latency
    const data = await response.json();
    expect(data.latency).toBeDefined();
    expect(typeof data.latency).toBe('number');
    expect(data.checks.database.latency).toBeDefined();
    expect(typeof data.checks.database.latency).toBe('number');
  });

  /**
   * SPECIFICATION 6: Response includes timestamp and checks object
   * 
   * Given: Any health check scenario
   * When: GET request is made
   * Then: Response MUST include timestamp and checks object
   */
  it('MUST include timestamp and checks object in response', async () => {
    // Arrange: Mock database response
    mockDbExecute.mockResolvedValue({} as any);

    // Act: Make GET request
    const response = await GET();

    // Assert: SPECIFICATION - Response MUST include timestamp and checks
    const data = await response.json();
    expect(data.timestamp).toBeDefined();
    expect(typeof data.timestamp).toBe('string');
    expect(new Date(data.timestamp)).toBeInstanceOf(Date);
    
    expect(data.checks).toBeDefined();
    expect(typeof data.checks).toBe('object');
    expect(data.checks.database).toBeDefined();
    expect(data.checks.database.status).toBeDefined();
    expect(['healthy', 'degraded', 'unhealthy']).toContain(data.checks.database.status);
  });
});

