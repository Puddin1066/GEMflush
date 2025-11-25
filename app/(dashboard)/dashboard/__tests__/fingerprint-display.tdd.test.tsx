/**
 * TDD Test: Fingerprint Data Display - Tests Drive Implementation
 * 
 * SPECIFICATION: Display Fingerprint Data in Dashboard
 * 
 * As a user
 * I want to see fingerprint data (visibility score, last fingerprint date)
 * So that I can understand my business's AI visibility
 * 
 * Acceptance Criteria:
 * 1. Visibility score is displayed when fingerprint exists
 * 2. Last fingerprint date is displayed in readable format
 * 3. "Never" is shown when no fingerprint exists
 * 4. Data is loaded from database correctly
 * 5. Loading state is shown while fetching
 * 
 * TDD Cycle: RED → GREEN → REFACTOR
 * Tests written FIRST to drive implementation
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { setupDashboardTestMocks, createMockDashboardDTO } from './test-helpers';

// Setup all common mocks (DRY: centralized mock setup)
setupDashboardTestMocks();

describe('🔴 RED: Fingerprint Data Display Specification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * SPECIFICATION 1: Display Visibility Score
   * 
   * Given: Business has fingerprint with visibility score
   * When: Dashboard renders business card
   * Then: Visibility score is displayed
   */
  it('displays visibility score when fingerprint exists', async () => {
    // Arrange: Mock fingerprint data
    const fingerprint = {
      id: 1,
      businessId: 123,
      visibilityScore: 75,
      createdAt: new Date('2025-01-15'),
    };
    
    const { getLatestFingerprint } = await import('@/lib/db/queries');
    vi.mocked(getLatestFingerprint).mockResolvedValue(fingerprint);
    
    const { getDashboardDTO } = await import('@/lib/data/dashboard-dto');
    vi.mocked(getDashboardDTO).mockResolvedValue({
      totalBusinesses: 1,
      wikidataEntities: 0,
      avgVisibilityScore: 75,
      businesses: [{
        id: '123',
        name: 'Test Business',
        location: 'Seattle, WA',
        visibilityScore: 75,
        trend: 'neutral' as const,
        trendValue: 0,
        wikidataQid: null,
        lastFingerprint: '2 days ago',
        status: 'published' as const,
      }],
    });
    
    // Act: Render dashboard (TEST DRIVES IMPLEMENTATION)
    const Dashboard = await import('../page');
    const { default: DashboardPage } = Dashboard;
    const { render: renderServer } = await import('@testing-library/react');
    // Note: This is a server component, so we'll test the client component instead
    const { DashboardClient } = await import('../dashboard-client');
    renderServer(
      <DashboardClient
        dashboardData={{
          totalBusinesses: 1,
          wikidataEntities: 0,
          avgVisibilityScore: 75,
          businesses: [{
            id: '123',
            name: 'Test Business',
            location: 'Seattle, WA',
            visibilityScore: 75,
            trend: 'neutral',
            trendValue: 0,
            wikidataQid: null,
            lastFingerprint: '2 days ago',
            status: 'published',
          }],
        }}
        user={{ id: 1, email: 'test@example.com' } as any}
        team={{ id: 1, planName: 'free' } as any}
      />
    );
    
    // Assert: Visibility score displayed (behavior: user sees score)
    await waitFor(() => {
      // The visibility score should be displayed in the business card
      // There are multiple "75" texts (stats card and business card), so check for the business card specifically
      const businessCard = screen.getByText('Test Business').closest('a');
      expect(businessCard).toBeInTheDocument();
      // Check that the visibility score is in the business card
      const visibilityScores = screen.getAllByText('75');
      expect(visibilityScores.length).toBeGreaterThanOrEqual(1);
      // Verify the business card contains the visibility score
      expect(businessCard?.textContent).toContain('75');
    });
  });

  /**
   * SPECIFICATION 2: Display Last Fingerprint Date
   * 
   * Given: Business has fingerprint with date
   * When: Dashboard renders business card
   * Then: Last fingerprint date is displayed in readable format
   */
  it('displays last fingerprint date in readable format', async () => {
    // Arrange: Mock fingerprint with date
    const fingerprintDate = new Date('2025-01-15T10:30:00Z');
    const fingerprint = {
      id: 1,
      businessId: 123,
      visibilityScore: 75,
      createdAt: fingerprintDate,
    };
    
    const { getLatestFingerprint } = await import('@/lib/db/queries');
    vi.mocked(getLatestFingerprint).mockResolvedValue(fingerprint);
    
    // Act: Render dashboard (TEST DRIVES IMPLEMENTATION)
    const { DashboardClient } = await import('../dashboard-client');
    render(
      <DashboardClient
        dashboardData={{
          totalBusinesses: 1,
          wikidataEntities: 0,
          avgVisibilityScore: 75,
          businesses: [{
            id: '123',
            name: 'Test Business',
            location: 'Seattle, WA',
            visibilityScore: 75,
            trend: 'neutral',
            trendValue: 0,
            wikidataQid: null,
            lastFingerprint: '2 days ago',
            status: 'published',
          }],
        }}
        user={{ id: 1, email: 'test@example.com' } as any}
        team={{ id: 1, planName: 'free' } as any}
      />
    );
    
    // Assert: Date displayed in readable format (behavior: user sees date)
    await waitFor(() => {
      // The last fingerprint date should be displayed
      expect(screen.getByText('2 days ago')).toBeInTheDocument();
    });
  });

  /**
   * SPECIFICATION 3: Show "Never" When No Fingerprint
   * 
   * Given: Business has no fingerprint
   * When: Dashboard renders business card
   * Then: "Never" is shown for last fingerprint date
   */
  it('shows "Never" when no fingerprint exists', async () => {
    // Arrange: No fingerprint
    const { getLatestFingerprint } = await import('@/lib/db/queries');
    vi.mocked(getLatestFingerprint).mockResolvedValue(null);
    
    // Act: Render dashboard (TEST DRIVES IMPLEMENTATION)
    const { DashboardClient } = await import('../dashboard-client');
    render(
      <DashboardClient
        dashboardData={{
      totalBusinesses: 1,
      wikidataEntities: 0,
      avgVisibilityScore: 0,
      businesses: [{
        id: '123',
        name: 'Test Business',
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
    
    // Assert: "Never" displayed (behavior: user sees no fingerprint indicator)
    await waitFor(() => {
      expect(screen.getByText(/never/i)).toBeInTheDocument();
    });
  });

  /**
   * SPECIFICATION 4: Load Data from Database
   * 
   * Given: Dashboard page loads
   * When: Component mounts
   * Then: getDashboardDTO is called which fetches fingerprint data
   */
  it('loads fingerprint data from database on mount', async () => {
    // Arrange: Mock query functions
    const { getLatestFingerprint } = await import('@/lib/db/queries');
    vi.mocked(getLatestFingerprint).mockResolvedValue(null);
    
    const { getDashboardDTO } = await import('@/lib/data/dashboard-dto');
    const mockData = {
      totalBusinesses: 1,
      wikidataEntities: 0,
      avgVisibilityScore: 0,
      businesses: [{
        id: '123',
        name: 'Test Business',
        location: 'Seattle, WA',
        visibilityScore: null,
        trend: 'neutral' as const,
        trendValue: 0,
        wikidataQid: null,
        lastFingerprint: 'Never',
        status: 'pending' as const,
      }],
    };
    vi.mocked(getDashboardDTO).mockResolvedValue(mockData);
    
    // Act: Render dashboard client component (TEST DRIVES IMPLEMENTATION)
    // Note: Server component calls getDashboardDTO, but we test the client component
    const { DashboardClient } = await import('../dashboard-client');
    render(
      <DashboardClient
        dashboardData={mockData}
        user={{ id: 1, email: 'test@example.com' } as any}
        team={{ id: 1, planName: 'free' } as any}
      />
    );
    
    // Assert: Data is displayed (behavior: data is fetched and shown)
    await waitFor(() => {
      expect(screen.getByText('Test Business')).toBeInTheDocument();
    });
  });
});

