/**
 * TDD Test: Business Name Display - Tests Drive Implementation
 * 
 * SPECIFICATION: Display Actual Business Names
 * 
 * As a user
 * I want to see actual business names instead of generic "Business"
 * So that I can identify my businesses easily
 * 
 * Acceptance Criteria:
 * 1. Business cards show actual business name
 * 2. Dashboard list shows business names
 * 3. Business detail page shows business name in header
 * 4. Name is loaded from database correctly
 * 
 * TDD Cycle: RED → GREEN → REFACTOR
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { setupDashboardTestMocks, createMockDashboardDTO } from './test-helpers';

// Setup all common mocks (DRY: centralized mock setup)
setupDashboardTestMocks();

describe('🔴 RED: Business Name Display Specification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * SPECIFICATION 1: Display Actual Name in Cards
   * 
   * Given: Business with name "Blue Bottle Coffee"
   * When: Business card renders
   * Then: "Blue Bottle Coffee" is displayed, not "Business"
   */
  it('displays actual business name in business cards', async () => {
    // Arrange: Business with actual name
    const business = {
      id: 1,
      name: 'Blue Bottle Coffee',
      status: 'pending',
    };
    
    const { getDashboardDTO } = await import('@/lib/data/dashboard-dto');
    vi.mocked(getDashboardDTO).mockResolvedValue({
      totalBusinesses: 1,
      wikidataEntities: 0,
      avgVisibilityScore: 0,
      businesses: [{
        id: '1',
        name: 'Blue Bottle Coffee',
        location: 'Seattle, WA',
        visibilityScore: null,
        trend: 'neutral' as const,
        trendValue: 0,
        wikidataQid: null,
        lastFingerprint: 'Never',
        status: 'pending' as const,
      }],
    });
    
    // Act: Render dashboard (TEST DRIVES IMPLEMENTATION)
    const { DashboardClient } = await import('../dashboard-client');
    render(
      <DashboardClient
        dashboardData={{
          totalBusinesses: 1,
          wikidataEntities: 0,
          avgVisibilityScore: 0,
          businesses: [{
            id: '1',
            name: 'Blue Bottle Coffee',
            location: 'Seattle, WA',
            visibilityScore: null,
            trend: 'neutral',
            trendValue: 0,
            wikidataQid: null,
            lastFingerprint: 'Never',
            status: 'pending',
          }],
        }}
        user={{ id: 1, email: 'test@example.com' } as any}
        team={{ id: 1, planName: 'free' } as any}
      />
    );
    
    // Assert: Actual name displayed (behavior: user sees real name)
    await waitFor(() => {
      expect(screen.getByText('Blue Bottle Coffee')).toBeInTheDocument();
      expect(screen.queryByText('Business')).not.toBeInTheDocument();
    });
  });

  /**
   * SPECIFICATION 2: Display Name in List View
   * 
   * Given: Multiple businesses with different names
   * When: Business list renders
   * Then: Each business shows its actual name
   */
  it('displays actual names for all businesses in list view', async () => {
    // Arrange: Multiple businesses
    const businesses = [
      { id: 1, name: 'Blue Bottle Coffee' },
      { id: 2, name: 'Prince Street Pizza' },
      { id: 3, name: 'Joe\'s Coffee Shop' },
    ];
    
    const { getDashboardDTO } = await import('@/lib/data/dashboard-dto');
    vi.mocked(getDashboardDTO).mockResolvedValue({
      totalBusinesses: 3,
      wikidataEntities: 0,
      avgVisibilityScore: 0,
      businesses: businesses.map(b => ({
        id: b.id.toString(),
        name: b.name,
        location: 'Seattle, WA',
        visibilityScore: null,
        trend: 'neutral' as const,
        trendValue: 0,
        wikidataQid: null,
        lastFingerprint: 'Never',
        status: 'pending' as const,
      })),
    });
    
    // Act: Render list (TEST DRIVES IMPLEMENTATION)
    const { DashboardClient } = await import('../dashboard-client');
    render(
      <DashboardClient
        dashboardData={{
          totalBusinesses: 3,
          wikidataEntities: 0,
          avgVisibilityScore: 0,
          businesses: businesses.map(b => ({
            id: b.id.toString(),
            name: b.name,
            location: 'Seattle, WA',
            visibilityScore: null,
            trend: 'neutral',
            trendValue: 0,
            wikidataQid: null,
            lastFingerprint: 'Never',
            status: 'pending',
          })),
        }}
        user={{ id: 1, email: 'test@example.com' } as any}
        team={{ id: 1, planName: 'free' } as any}
      />
    );
    
    // Assert: All names displayed (behavior: user can identify businesses)
    await waitFor(() => {
      expect(screen.getByText('Blue Bottle Coffee')).toBeInTheDocument();
      expect(screen.getByText('Prince Street Pizza')).toBeInTheDocument();
      expect(screen.getByText('Joe\'s Coffee Shop')).toBeInTheDocument();
    });
  });
});

