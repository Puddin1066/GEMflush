/**
 * Dashboard Test Helpers
 * 
 * DRY: Centralized test utilities for dashboard tests
 * SOLID: Single Responsibility - only handles dashboard test setup
 * 
 * Usage: Import these helpers in dashboard test files to avoid duplication
 */

import { vi } from 'vitest';
import type { DashboardDTO } from '@/lib/data/types';

/**
 * Mock useDashboard hook to return loading state so initialData is used
 * DRY: Reusable mock configuration
 */
export function mockUseDashboard() {
  return vi.mock('@/lib/hooks/use-dashboard', () => ({
    useDashboard: vi.fn(() => ({
      stats: { totalBusinesses: -1, businesses: [], wikidataEntities: 0, avgVisibilityScore: 0 },
      loading: true,
      error: null,
      refresh: vi.fn(),
    })),
  }));
}

/**
 * Mock dashboard DTO module
 * DRY: Reusable mock configuration
 */
export function mockDashboardDTO() {
  return vi.mock('@/lib/data/dashboard-dto', () => ({
    getDashboardDTO: vi.fn(),
  }));
}

/**
 * Mock database queries module
 * DRY: Reusable mock configuration
 */
export function mockDatabaseQueries() {
  return vi.mock('@/lib/db/queries', () => ({
    getBusinessesByTeam: vi.fn(),
    getBusinessCountByTeam: vi.fn(),
    getLatestFingerprint: vi.fn(),
    getFingerprintHistory: vi.fn(),
    getBusinessById: vi.fn(),
  }));
}

/**
 * Create a mock dashboard DTO with sensible defaults
 * DRY: Reusable test data factory
 * 
 * @param overrides - Partial DTO to override defaults
 * @returns Complete DashboardDTO
 */
export function createMockDashboardDTO(overrides?: Partial<DashboardDTO>): DashboardDTO {
  return {
    totalBusinesses: 0,
    wikidataEntities: 0,
    avgVisibilityScore: 0,
    businesses: [],
    totalCrawled: 0,
    totalPublished: 0,
    ...overrides,
  };
}

/**
 * Setup all common mocks for dashboard tests
 * DRY: Single function to setup all mocks
 * SOLID: Single Responsibility - test setup only
 */
export function setupDashboardTestMocks() {
  mockUseDashboard();
  mockDashboardDTO();
  mockDatabaseQueries();
}

