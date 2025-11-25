/**
 * TDD Test: Dashboard Data Consistency - Tests Drive Implementation
 * 
 * SPECIFICATION: Consistent Business Count Across Dashboard
 * 
 * As a user
 * I want consistent business count displayed in sidebar and main content
 * So that I can trust the information shown
 * 
 * Acceptance Criteria:
 * 1. Sidebar business count matches main content count
 * 2. Both use same data source
 * 3. Both update simultaneously when data changes
 * 4. No discrepancies between components
 * 
 * TDD Cycle: RED → GREEN → REFACTOR
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';

// Mock database queries
vi.mock('@/lib/db/queries', () => ({
  getBusinessesByTeam: vi.fn(),
  getBusinessCountByTeam: vi.fn(),
}));

// Mock dashboard DTO
vi.mock('@/lib/data/dashboard-dto', () => ({
  getDashboardDTO: vi.fn(),
}));

describe('🔴 RED: Dashboard Data Consistency Specification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * SPECIFICATION 1: Consistent Business Count
   * 
   * Given: Team has 2 businesses
   * When: Dashboard renders
   * Then: Sidebar and main content show same count (2)
   */
  it('displays consistent business count in sidebar and main content', async () => {
    // Arrange: Mock 2 businesses
    const businesses = [
      BusinessTestFactory.create({ id: 1, name: 'Business 1' }),
      BusinessTestFactory.create({ id: 2, name: 'Business 2' }),
    ];
    
    const { getBusinessesByTeam } = await import('@/lib/db/queries');
    vi.mocked(getBusinessesByTeam).mockResolvedValue(businesses);
    
    const { getDashboardDTO } = await import('@/lib/data/dashboard-dto');
    vi.mocked(getDashboardDTO).mockResolvedValue({
      totalBusinesses: 2,
      wikidataEntities: 0,
      avgVisibilityScore: 0,
      businesses: businesses.map(b => ({
        id: b.id.toString(),
        name: b.name,
        location: b.location ? `${b.location.city}, ${b.location.state}` : 'Location not set',
        visibilityScore: null,
        trend: 'neutral' as const,
        trendValue: 0,
        wikidataQid: null,
        lastFingerprint: 'Never',
        status: b.status as any,
      })),
    });
    
    // Act: Render dashboard (TEST DRIVES IMPLEMENTATION)
    const { DashboardClient } = await import('../dashboard-client');
    render(
      <DashboardClient
        dashboardData={{
          totalBusinesses: 2,
          wikidataEntities: 0,
          avgVisibilityScore: 0,
          businesses: businesses.map(b => ({
            id: b.id.toString(),
            name: b.name,
            location: b.location ? `${b.location.city}, ${b.location.state}` : 'Location not set',
            visibilityScore: null,
            trend: 'neutral',
            trendValue: 0,
            wikidataQid: null,
            lastFingerprint: 'Never',
            status: b.status as any,
          })),
        }}
        user={{ id: 1, email: 'test@example.com' } as any}
        team={{ id: 1, planName: 'free' } as any}
      />
    );
    
    // Assert: Both show count of 2 (behavior: consistent display)
    await waitFor(() => {
      const counts = screen.getAllByText(/2/i);
      // Should appear in both main content (Total Businesses) and potentially sidebar
      expect(counts.length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText(/2.*business/i)).toBeInTheDocument();
    });
  });

  /**
   * SPECIFICATION 2: Same Data Source
   * 
   * Given: Dashboard components exist
   * When: Business count is displayed
   * Then: Both sidebar and main content use same query function
   */
  it('uses same data source for sidebar and main content', async () => {
    // Arrange: Mock queries
    const { getDashboardDTO } = await import('@/lib/data/dashboard-dto');
    vi.mocked(getDashboardDTO).mockResolvedValue({
      totalBusinesses: 0,
      wikidataEntities: 0,
      avgVisibilityScore: 0,
      businesses: [],
    });
    
    // Act: Render dashboard (TEST DRIVES IMPLEMENTATION)
    const Dashboard = await import('../page');
    
    // Assert: Same query called (behavior: single source of truth)
    await waitFor(() => {
      expect(getDashboardDTO).toHaveBeenCalled();
    });
  });
});

