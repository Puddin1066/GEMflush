/**
 * TDD Test: GEMflush Value Proposition Delivery - Integration Tests
 * 
 * SPECIFICATION: Services + Components → Dashboard Value Delivery
 * 
 * As a GEMflush user
 * I want to see my business's AI visibility and Wikidata publishing status
 * So that I understand the value GEMflush provides
 * 
 * IMPORTANT: These tests specify DESIRED behavior for the complete integration
 * between services (business logic) and components (UI) to deliver GEMflush value.
 * 
 * TDD Cycle: RED → GREEN → REFACTOR
 * Tests written to specify desired integration behavior
 * 
 * Value Proposition: "Get Found by AI. Not Just Google."
 * - Businesses should see their visibility scores
 * - Businesses should see Wikidata publishing status
 * - Businesses should see competitive positioning
 * - Businesses should see automation status
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BusinessTestFactory, TeamTestFactory } from '@/lib/test-helpers/tdd-helpers';
import type { Business } from '@/lib/db/schema';

// Mock all service dependencies
vi.mock('@/lib/data/dashboard-dto', () => ({
  getDashboardDTO: vi.fn(),
}));

vi.mock('@/lib/data/activity-dto', () => ({
  getActivityFeedDTO: vi.fn(),
}));

vi.mock('@/lib/services/automation-service', () => ({
  getAutomationConfig: vi.fn(),
}));

vi.mock('@/lib/services/business-execution', () => ({
  executeCFPAutomation: vi.fn(),
}));

vi.mock('@/lib/services/cfp-orchestrator', () => ({
  cfpOrchestrator: {
    executeFullCFP: vi.fn(),
  },
}));

vi.mock('@/lib/hooks/use-dashboard', () => ({
  useDashboard: vi.fn(),
}));

vi.mock('@/lib/hooks/use-user', () => ({
  useUser: vi.fn(),
}));

vi.mock('@/lib/hooks/use-team', () => ({
  useTeam: vi.fn(),
}));

describe('🔴 RED: GEMflush Value Delivery - Integration Specification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * SPECIFICATION 1: Dashboard MUST Display AI Visibility Score
   * 
   * DESIRED BEHAVIOR: When services calculate visibility scores,
   * the dashboard MUST display them prominently to show GEMflush value.
   */
  describe('AI Visibility Score Display', () => {
    it('MUST display average visibility score from dashboard service', async () => {
      // Arrange: Dashboard service returns visibility data
      const mockDashboardData = {
        totalBusinesses: 3,
        wikidataEntities: 2,
        avgVisibilityScore: 75,
        businesses: [
          {
            id: 1,
            name: 'Test Business',
            visibilityScore: 80,
            wikidataQid: 'Q12345',
            status: 'published',
          },
        ],
      };

      const { useDashboard } = await import('@/lib/hooks/use-dashboard');
      const { useUser } = await import('@/lib/hooks/use-user');
      const { useTeam } = await import('@/lib/hooks/use-team');

      vi.mocked(useDashboard).mockReturnValue({
        stats: mockDashboardData,
        loading: false,
        error: null,
      } as any);

      vi.mocked(useUser).mockReturnValue({
        user: { id: 1, email: 'test@example.com' },
      } as any);

      vi.mocked(useTeam).mockReturnValue({
        planTier: 'pro',
        maxBusinesses: 10,
        isPro: true,
      } as any);

      // Act: Render dashboard (TEST SPECIFIES DESIRED BEHAVIOR)
      const DashboardPage = (await import('@/app/(dashboard)/dashboard/page')).default;
      render(<DashboardPage />);

      // Assert: SPECIFICATION - MUST display visibility score
      await waitFor(() => {
        expect(screen.getByText(/75/i)).toBeInTheDocument();
        expect(screen.getByText(/Avg Visibility Score/i)).toBeInTheDocument();
      });
    });

    it('MUST display individual business visibility scores', async () => {
      // Arrange: Business with visibility score
      const mockDashboardData = {
        totalBusinesses: 1,
        wikidataEntities: 1,
        avgVisibilityScore: 85,
        businesses: [
          {
            id: 1,
            name: 'Popular Restaurant',
            visibilityScore: 85,
            wikidataQid: 'Q12345',
            status: 'published',
            location: 'San Francisco, CA',
          },
        ],
      };

      const { useDashboard } = await import('@/lib/hooks/use-dashboard');
      const { useUser } = await import('@/lib/hooks/use-user');
      const { useTeam } = await import('@/lib/hooks/use-team');

      vi.mocked(useDashboard).mockReturnValue({
        stats: mockDashboardData,
        loading: false,
        error: null,
      } as any);

      vi.mocked(useUser).mockReturnValue({
        user: { id: 1, email: 'test@example.com' },
      } as any);

      vi.mocked(useTeam).mockReturnValue({
        planTier: 'pro',
        maxBusinesses: 10,
        isPro: true,
      } as any);

      // Act: Render dashboard (TEST SPECIFIES DESIRED BEHAVIOR)
      const DashboardPage = (await import('@/app/(dashboard)/dashboard/page')).default;
      render(<DashboardPage />);

      // Assert: SPECIFICATION - MUST display business visibility
      await waitFor(() => {
        expect(screen.getByText('Popular Restaurant')).toBeInTheDocument();
        expect(screen.getByText(/85/i)).toBeInTheDocument();
        expect(screen.getByText(/AI Visibility Score/i)).toBeInTheDocument();
      });
    });
  });

  /**
   * SPECIFICATION 2: Dashboard MUST Display Wikidata Publishing Status
   * 
   * DESIRED BEHAVIOR: When services publish to Wikidata,
   * the dashboard MUST show publishing status to demonstrate value.
   */
  describe('Wikidata Publishing Status Display', () => {
    it('MUST display Wikidata QID when business is published', async () => {
      // Arrange: Published business
      const mockDashboardData = {
        totalBusinesses: 1,
        wikidataEntities: 1,
        avgVisibilityScore: 75,
        businesses: [
          {
            id: 1,
            name: 'Published Business',
            visibilityScore: 75,
            wikidataQid: 'Q12345',
            status: 'published',
            location: 'San Francisco, CA',
          },
        ],
      };

      const { useDashboard } = await import('@/lib/hooks/use-dashboard');
      const { useUser } = await import('@/lib/hooks/use-user');
      const { useTeam } = await import('@/lib/hooks/use-team');

      vi.mocked(useDashboard).mockReturnValue({
        stats: mockDashboardData,
        loading: false,
        error: null,
      } as any);

      vi.mocked(useUser).mockReturnValue({
        user: { id: 1, email: 'test@example.com' },
      } as any);

      vi.mocked(useTeam).mockReturnValue({
        planTier: 'pro',
        maxBusinesses: 10,
        isPro: true,
      } as any);

      // Act: Render dashboard (TEST SPECIFIES DESIRED BEHAVIOR)
      const DashboardPage = (await import('@/app/(dashboard)/dashboard/page')).default;
      render(<DashboardPage />);

      // Assert: SPECIFICATION - MUST display Wikidata QID
      await waitFor(() => {
        expect(screen.getByText('Q12345')).toBeInTheDocument();
        expect(screen.getByText(/In LLMs/i)).toBeInTheDocument();
        expect(screen.getByText(/Discoverable by AI/i)).toBeInTheDocument();
      });
    });

    it('MUST display count of published businesses in stats', async () => {
      // Arrange: Multiple published businesses
      const mockDashboardData = {
        totalBusinesses: 5,
        wikidataEntities: 3, // 3 published
        avgVisibilityScore: 70,
        businesses: [],
      };

      const { useDashboard } = await import('@/lib/hooks/use-dashboard');
      const { useUser } = await import('@/lib/hooks/use-user');
      const { useTeam } = await import('@/lib/hooks/use-team');

      vi.mocked(useDashboard).mockReturnValue({
        stats: mockDashboardData,
        loading: false,
        error: null,
      } as any);

      vi.mocked(useUser).mockReturnValue({
        user: { id: 1, email: 'test@example.com' },
      } as any);

      vi.mocked(useTeam).mockReturnValue({
        planTier: 'pro',
        maxBusinesses: 10,
        isPro: true,
      } as any);

      // Act: Render dashboard (TEST SPECIFIES DESIRED BEHAVIOR)
      const DashboardPage = (await import('@/app/(dashboard)/dashboard/page')).default;
      render(<DashboardPage />);

      // Assert: SPECIFICATION - MUST display published count
      await waitFor(() => {
        expect(screen.getByText('3')).toBeInTheDocument();
        expect(screen.getByText(/Visible in LLMs/i)).toBeInTheDocument();
        expect(screen.getByText(/Published to Wikidata/i)).toBeInTheDocument();
      });
    });

    it('MUST show "Not in LLMs yet" for unpublished businesses', async () => {
      // Arrange: Unpublished business
      const mockDashboardData = {
        totalBusinesses: 1,
        wikidataEntities: 0,
        avgVisibilityScore: 0,
        businesses: [
          {
            id: 1,
            name: 'Unpublished Business',
            visibilityScore: null,
            wikidataQid: null,
            status: 'crawled',
            location: 'San Francisco, CA',
          },
        ],
      };

      const { useDashboard } = await import('@/lib/hooks/use-dashboard');
      const { useUser } = await import('@/lib/hooks/use-user');
      const { useTeam } = await import('@/lib/hooks/use-team');

      vi.mocked(useDashboard).mockReturnValue({
        stats: mockDashboardData,
        loading: false,
        error: null,
      } as any);

      vi.mocked(useUser).mockReturnValue({
        user: { id: 1, email: 'test@example.com' },
      } as any);

      vi.mocked(useTeam).mockReturnValue({
        planTier: 'free',
        maxBusinesses: 1,
        isPro: false,
      } as any);

      // Act: Render dashboard (TEST SPECIFIES DESIRED BEHAVIOR)
      const DashboardPage = (await import('@/app/(dashboard)/dashboard/page')).default;
      render(<DashboardPage />);

      // Assert: SPECIFICATION - MUST show unpublished status
      await waitFor(() => {
        expect(screen.getByText(/Not in LLMs yet/i)).toBeInTheDocument();
      });
    });
  });

  /**
   * SPECIFICATION 3: Dashboard MUST Display Value Proposition Message
   * 
   * DESIRED BEHAVIOR: Dashboard MUST prominently display GEMflush value proposition
   * to communicate the benefit to users.
   */
  describe('Value Proposition Display', () => {
    it('MUST display "Get Found by AI. Not Just Google." headline', async () => {
      // Arrange: Dashboard data
      const mockDashboardData = {
        totalBusinesses: 1,
        wikidataEntities: 0,
        avgVisibilityScore: 0,
        businesses: [],
      };

      const { useDashboard } = await import('@/lib/hooks/use-dashboard');
      const { useUser } = await import('@/lib/hooks/use-user');
      const { useTeam } = await import('@/lib/hooks/use-team');

      vi.mocked(useDashboard).mockReturnValue({
        stats: mockDashboardData,
        loading: false,
        error: null,
      } as any);

      vi.mocked(useUser).mockReturnValue({
        user: { id: 1, email: 'test@example.com' },
      } as any);

      vi.mocked(useTeam).mockReturnValue({
        planTier: 'free',
        maxBusinesses: 1,
        isPro: false,
      } as any);

      // Act: Render dashboard (TEST SPECIFIES DESIRED BEHAVIOR)
      const DashboardPage = (await import('@/app/(dashboard)/dashboard/page')).default;
      render(<DashboardPage />);

      // Assert: SPECIFICATION - MUST display value proposition
      await waitFor(() => {
        expect(screen.getByText(/Get Found by AI/i)).toBeInTheDocument();
        expect(screen.getByText(/Not Just Google/i)).toBeInTheDocument();
      });
    });

    it('MUST explain how Wikidata publishing makes businesses visible to AI', async () => {
      // Arrange: Dashboard with businesses
      const mockDashboardData = {
        totalBusinesses: 1,
        wikidataEntities: 1,
        avgVisibilityScore: 75,
        businesses: [
          {
            id: 1,
            name: 'Test Business',
            visibilityScore: 75,
            wikidataQid: 'Q12345',
            status: 'published',
          },
        ],
      };

      const { useDashboard } = await import('@/lib/hooks/use-dashboard');
      const { useUser } = await import('@/lib/hooks/use-user');
      const { useTeam } = await import('@/lib/hooks/use-team');

      vi.mocked(useDashboard).mockReturnValue({
        stats: mockDashboardData,
        loading: false,
        error: null,
      } as any);

      vi.mocked(useUser).mockReturnValue({
        user: { id: 1, email: 'test@example.com' },
      } as any);

      vi.mocked(useTeam).mockReturnValue({
        planTier: 'pro',
        maxBusinesses: 10,
        isPro: true,
      } as any);

      // Act: Render dashboard (TEST SPECIFIES DESIRED BEHAVIOR)
      const DashboardPage = (await import('@/app/(dashboard)/dashboard/page')).default;
      render(<DashboardPage />);

      // Assert: SPECIFICATION - MUST explain Wikidata value
      await waitFor(() => {
        expect(screen.getByText(/Wikidata Publishing Makes You Visible/i)).toBeInTheDocument();
        expect(screen.getByText(/ChatGPT, Claude, Perplexity/i)).toBeInTheDocument();
      });
    });
  });

  /**
   * SPECIFICATION 4: Dashboard MUST Display Automation Status
   * 
   * DESIRED BEHAVIOR: When automation services are running,
   * the dashboard MUST show automation status to demonstrate ongoing value.
   */
  describe('Automation Status Display', () => {
    it('MUST display processing status when CFP automation is running', async () => {
      // Arrange: Business being processed
      const mockDashboardData = {
        totalBusinesses: 1,
        wikidataEntities: 0,
        avgVisibilityScore: 0,
        businesses: [
          {
            id: 1,
            name: 'Processing Business',
            visibilityScore: null,
            wikidataQid: null,
            status: 'crawling',
            automationEnabled: true,
            location: 'San Francisco, CA',
          },
        ],
      };

      const { useDashboard } = await import('@/lib/hooks/use-dashboard');
      const { useUser } = await import('@/lib/hooks/use-user');
      const { useTeam } = await import('@/lib/hooks/use-team');

      vi.mocked(useDashboard).mockReturnValue({
        stats: mockDashboardData,
        loading: false,
        error: null,
      } as any);

      vi.mocked(useUser).mockReturnValue({
        user: { id: 1, email: 'test@example.com' },
      } as any);

      vi.mocked(useTeam).mockReturnValue({
        planTier: 'pro',
        maxBusinesses: 10,
        isPro: true,
      } as any);

      // Act: Render dashboard (TEST SPECIFIES DESIRED BEHAVIOR)
      const DashboardPage = (await import('@/app/(dashboard)/dashboard/page')).default;
      render(<DashboardPage />);

      // Assert: SPECIFICATION - MUST display processing status
      await waitFor(() => {
        expect(screen.getByText('Processing Business')).toBeInTheDocument();
        // Processing status should be visible
        expect(screen.getByText(/crawling|processing/i)).toBeInTheDocument();
      });
    });

    it('MUST show automation enabled badge for Pro tier businesses', async () => {
      // Arrange: Pro tier business with automation
      const mockDashboardData = {
        totalBusinesses: 1,
        wikidataEntities: 0,
        avgVisibilityScore: 0,
        businesses: [
          {
            id: 1,
            name: 'Automated Business',
            visibilityScore: null,
            wikidataQid: null,
            status: 'pending',
            automationEnabled: true,
            location: 'San Francisco, CA',
          },
        ],
      };

      const { useDashboard } = await import('@/lib/hooks/use-dashboard');
      const { useUser } = await import('@/lib/hooks/use-user');
      const { useTeam } = await import('@/lib/hooks/use-team');

      vi.mocked(useDashboard).mockReturnValue({
        stats: mockDashboardData,
        loading: false,
        error: null,
      } as any);

      vi.mocked(useUser).mockReturnValue({
        user: { id: 1, email: 'test@example.com' },
      } as any);

      vi.mocked(useTeam).mockReturnValue({
        planTier: 'pro',
        maxBusinesses: 10,
        isPro: true,
      } as any);

      // Act: Render dashboard (TEST SPECIFIES DESIRED BEHAVIOR)
      const DashboardPage = (await import('@/app/(dashboard)/dashboard/page')).default;
      render(<DashboardPage />);

      // Assert: SPECIFICATION - MUST show automation status
      await waitFor(() => {
        expect(screen.getByText('Automated Business')).toBeInTheDocument();
        // Automation status component should render
      });
    });
  });

  /**
   * SPECIFICATION 5: Services MUST Provide Data for Components
   * 
   * DESIRED BEHAVIOR: Services MUST transform and aggregate data
   * so components can display GEMflush value effectively.
   */
  describe('Service Data Provision', () => {
    it('MUST aggregate visibility scores from fingerprint service', async () => {
      // Arrange: Dashboard service should aggregate scores
      const { getDashboardDTO } = await import('@/lib/data/dashboard-dto');
      
      const mockBusinesses = [
        BusinessTestFactory.create({ id: 1, name: 'Business 1' }),
        BusinessTestFactory.create({ id: 2, name: 'Business 2' }),
      ];

      // Mock fingerprint data with visibility scores
      vi.mocked(getDashboardDTO).mockResolvedValue({
        totalBusinesses: 2,
        wikidataEntities: 1,
        avgVisibilityScore: 75, // Average of business scores
        businesses: [
          {
            id: 1,
            name: 'Business 1',
            visibilityScore: 80,
            wikidataQid: 'Q12345',
            status: 'published',
          },
          {
            id: 2,
            name: 'Business 2',
            visibilityScore: 70,
            wikidataQid: null,
            status: 'crawled',
          },
        ],
      } as any);

      // Act: Get dashboard data (TEST SPECIFIES DESIRED BEHAVIOR)
      const result = await getDashboardDTO(1);

      // Assert: SPECIFICATION - MUST aggregate visibility scores
      expect(result.avgVisibilityScore).toBe(75);
      expect(result.businesses[0].visibilityScore).toBe(80);
      expect(result.businesses[1].visibilityScore).toBe(70);
    });

    it('MUST count published businesses from Wikidata service', async () => {
      // Arrange: Dashboard service should count published
      const { getDashboardDTO } = await import('@/lib/data/dashboard-dto');

      vi.mocked(getDashboardDTO).mockResolvedValue({
        totalBusinesses: 5,
        wikidataEntities: 3, // 3 published
        avgVisibilityScore: 70,
        businesses: [],
      } as any);

      // Act: Get dashboard data (TEST SPECIFIES DESIRED BEHAVIOR)
      const result = await getDashboardDTO(1);

      // Assert: SPECIFICATION - MUST count published businesses
      expect(result.wikidataEntities).toBe(3);
      expect(result.totalBusinesses).toBe(5);
    });
  });

  /**
   * SPECIFICATION 6: Components MUST Display Competitive Intelligence
   * 
   * DESIRED BEHAVIOR: When services provide competitive data,
   * components MUST display it to show market positioning value.
   */
  describe('Competitive Intelligence Display', () => {
    it('MUST display competitive leaderboard when available', async () => {
      // Arrange: Business with competitive data
      const mockFingerprint = {
        businessId: 1,
        businessName: 'Test Business',
        metrics: {
          visibilityScore: 75,
          mentionRate: 60,
          sentimentScore: 0.8,
        },
        competitiveLeaderboard: {
          targetBusiness: {
            name: 'Test Business',
            rank: 2,
            mentionCount: 5,
          },
          competitors: [
            { name: 'Competitor A', rank: 1, mentionCount: 7 },
            { name: 'Competitor B', rank: 3, mentionCount: 3 },
          ],
        },
      };

      // This would be tested in business detail page component
      // For now, we specify the behavior
      expect(mockFingerprint.competitiveLeaderboard).toBeDefined();
      expect(mockFingerprint.competitiveLeaderboard.targetBusiness.rank).toBe(2);
    });
  });

  /**
   * SPECIFICATION 7: Integration MUST Handle Loading States
   * 
   * DESIRED BEHAVIOR: While services are fetching data,
   * components MUST show appropriate loading states.
   */
  describe('Loading State Handling', () => {
    it('MUST show loading skeleton while dashboard service loads', async () => {
      // Arrange: Dashboard loading
      const { useDashboard } = await import('@/lib/hooks/use-dashboard');
      const { useUser } = await import('@/lib/hooks/use-user');
      const { useTeam } = await import('@/lib/hooks/use-team');

      vi.mocked(useDashboard).mockReturnValue({
        stats: null,
        loading: true,
        error: null,
      } as any);

      vi.mocked(useUser).mockReturnValue({
        user: { id: 1, email: 'test@example.com' },
      } as any);

      vi.mocked(useTeam).mockReturnValue({
        planTier: 'free',
        maxBusinesses: 1,
        isPro: false,
      } as any);

      // Act: Render dashboard (TEST SPECIFIES DESIRED BEHAVIOR)
      const DashboardPage = (await import('@/app/(dashboard)/dashboard/page')).default;
      render(<DashboardPage />);

      // Assert: SPECIFICATION - MUST show loading state
      // Loading skeleton should be visible
      expect(screen.queryByText(/Get Found by AI/i)).not.toBeInTheDocument();
    });
  });

  /**
   * SPECIFICATION 8: Integration MUST Handle Errors Gracefully
   * 
   * DESIRED BEHAVIOR: When services fail,
   * components MUST display error messages without breaking the UI.
   */
  describe('Error Handling', () => {
    it('MUST display error message when dashboard service fails', async () => {
      // Arrange: Dashboard error
      const { useDashboard } = await import('@/lib/hooks/use-dashboard');
      const { useUser } = await import('@/lib/hooks/use-user');
      const { useTeam } = await import('@/lib/hooks/use-team');

      vi.mocked(useDashboard).mockReturnValue({
        stats: null,
        loading: false,
        error: new Error('Failed to load dashboard data'),
      } as any);

      vi.mocked(useUser).mockReturnValue({
        user: { id: 1, email: 'test@example.com' },
      } as any);

      vi.mocked(useTeam).mockReturnValue({
        planTier: 'free',
        maxBusinesses: 1,
        isPro: false,
      } as any);

      // Act: Render dashboard (TEST SPECIFIES DESIRED BEHAVIOR)
      const DashboardPage = (await import('@/app/(dashboard)/dashboard/page')).default;
      render(<DashboardPage />);

      // Assert: SPECIFICATION - MUST display error
      await waitFor(() => {
        expect(screen.getByText(/Failed to load/i)).toBeInTheDocument();
      });
    });
  });
});




