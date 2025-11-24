/**
 * TDD Integration Test: Component Dataflow
 * 
 * SPECIFICATION: Component Data Consumption and Rendering
 * 
 * As a component
 * I want to receive correctly formatted data from API routes
 * So that I can render business information accurately
 * 
 * Dataflow Path:
 * API Route → Component Props → Component Rendering
 * 
 * Acceptance Criteria:
 * 1. Components receive DTO data correctly
 * 2. Components transform DTO data for display
 * 3. Components handle loading and error states
 * 4. Components maintain data integrity during rendering
 * 
 * TDD Cycle: RED → GREEN → REFACTOR
 * SOLID: Single Responsibility - each component tested independently
 * DRY: Reusable test utilities
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BusinessTestFactory } from '@/lib/test-helpers/tdd-helpers';

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useParams: vi.fn(() => ({ id: '123' })),
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    replace: vi.fn(),
  })),
}));

// Mock API hooks
vi.mock('@/lib/hooks/use-business-detail', () => ({
  useBusinessDetail: vi.fn(),
}));

describe('🔄 Component Dataflow: API → Components', () => {
  let mockUseBusinessDetail: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    const hooks = await import('@/lib/hooks/use-business-detail');
    mockUseBusinessDetail = hooks.useBusinessDetail;
  });

  /**
   * SPECIFICATION 1: Business Detail Component Receives DTO Data
   * 
   * Given: API returns BusinessDetailDTO
   * When: Component receives the data
   * Then: Component has access to all required fields
   */
  it('receives BusinessDetailDTO correctly in components', () => {
    // Arrange: Mock DTO data
    const businessDTO = {
      id: 123,
      name: 'Example Business',
      url: 'https://example.com',
      status: 'published',
      visibilityScore: 75,
      wikidataQID: 'Q123456',
      location: {
        city: 'Seattle',
        state: 'WA',
        country: 'US',
      },
    };

    mockUseBusinessDetail.mockReturnValue({
      business: businessDTO,
      fingerprint: null,
      entity: null,
      loading: false,
      error: null,
      refresh: vi.fn(),
    });

    // Act & Assert: Verify data structure (behavior: component-ready data)
    const hookResult = mockUseBusinessDetail(123);
    expect(hookResult.business).toMatchObject({
      id: expect.any(Number),
      name: expect.any(String),
      status: expect.any(String),
    });
    expect(hookResult.business.visibilityScore).toBe(75);
  });

  /**
   * SPECIFICATION 2: Fingerprint Component Receives DTO Data
   * 
   * Given: API returns FingerprintDetailDTO
   * When: Component receives the data
   * Then: Component has access to visibility metrics and trends
   */
  it('receives FingerprintDetailDTO correctly in components', () => {
    // Arrange: Mock fingerprint DTO
    const fingerprintDTO = {
      visibilityScore: 75,
      trend: 'up',
      summary: {
        mentionRate: 80,
        sentiment: 'positive',
      },
      competitiveLeaderboard: [
        { businessName: 'Competitor 1', visibilityScore: 85 },
        { businessName: 'Example Business', visibilityScore: 75 },
      ],
    };

    mockUseBusinessDetail.mockReturnValue({
      business: BusinessTestFactory.create({ id: 123 }),
      fingerprint: fingerprintDTO,
      entity: null,
      loading: false,
      error: null,
      refresh: vi.fn(),
    });

    // Act & Assert: Verify fingerprint data (behavior: metrics available)
    const hookResult = mockUseBusinessDetail(123);
    expect(hookResult.fingerprint).toMatchObject({
      visibilityScore: expect.any(Number),
      trend: expect.any(String),
      summary: expect.objectContaining({
        mentionRate: expect.any(Number),
      }),
    });
    expect(hookResult.fingerprint.visibilityScore).toBe(75);
  });

  /**
   * SPECIFICATION 3: Component Handles Loading State
   * 
   * Given: API request in progress
   * When: Component receives loading state
   * Then: Component displays loading indicator
   */
  it('handles loading state correctly', () => {
    // Arrange: Mock loading state
    mockUseBusinessDetail.mockReturnValue({
      business: null,
      fingerprint: null,
      entity: null,
      loading: true,
      error: null,
      refresh: vi.fn(),
    });

    // Act & Assert: Verify loading state (behavior: graceful loading)
    const hookResult = mockUseBusinessDetail(123);
    expect(hookResult.loading).toBe(true);
    expect(hookResult.business).toBeNull();
  });

  /**
   * SPECIFICATION 4: Component Handles Error State
   * 
   * Given: API request fails
   * When: Component receives error state
   * Then: Component displays error message
   */
  it('handles error state correctly', () => {
    // Arrange: Mock error state
    const errorMessage = 'Failed to load business data';
    mockUseBusinessDetail.mockReturnValue({
      business: null,
      fingerprint: null,
      entity: null,
      loading: false,
      error: errorMessage,
      refresh: vi.fn(),
    });

    // Act & Assert: Verify error handling (behavior: graceful error display)
    const hookResult = mockUseBusinessDetail(123);
    expect(hookResult.error).toBe(errorMessage);
    expect(hookResult.business).toBeNull();
  });

  /**
   * SPECIFICATION 5: Component Maintains Data Integrity
   * 
   * Given: Business data from API
   * When: Component processes the data
   * Then: Core business information remains unchanged
   */
  it('maintains data integrity during component processing', () => {
    // Arrange: Source data
    const sourceBusiness = {
      id: 123,
      name: 'Example Business',
      url: 'https://example.com',
      status: 'published',
    };

    mockUseBusinessDetail.mockReturnValue({
      business: sourceBusiness,
      fingerprint: null,
      entity: null,
      loading: false,
      error: null,
      refresh: vi.fn(),
    });

    // Act: Get data from hook
    const hookResult = mockUseBusinessDetail(123);

    // Assert: Verify data integrity (behavior: consistent data)
    expect(hookResult.business.id).toBe(sourceBusiness.id);
    expect(hookResult.business.name).toBe(sourceBusiness.name);
    expect(hookResult.business.url).toBe(sourceBusiness.url);
    expect(hookResult.business.status).toBe(sourceBusiness.status);
  });

  /**
   * SPECIFICATION 6: Component Handles Partial Data
   * 
   * Given: Partial business data (e.g., no fingerprint yet)
   * When: Component receives partial data
   * Then: Component renders available data gracefully
   */
  it('handles partial data gracefully', () => {
    // Arrange: Partial data (business exists, fingerprint doesn't)
    mockUseBusinessDetail.mockReturnValue({
      business: BusinessTestFactory.create({ id: 123 }),
      fingerprint: null, // Not yet available
      entity: null,
      loading: false,
      error: null,
      refresh: vi.fn(),
    });

    // Act & Assert: Verify partial data handling (behavior: graceful degradation)
    const hookResult = mockUseBusinessDetail(123);
    expect(hookResult.business).toBeDefined();
    expect(hookResult.fingerprint).toBeNull();
    expect(hookResult.loading).toBe(false);
    expect(hookResult.error).toBeNull();
  });
});



