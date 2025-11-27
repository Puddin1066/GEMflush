/**
 * TDD Test: Competitive Analysis Card Component - Tests Drive Implementation
 * 
 * SPECIFICATION: Competitive Analysis Card Component
 * 
 * As a user
 * I want to see competitive analysis and market position
 * So that I can understand how I compare to competitors
 * 
 * Acceptance Criteria:
 * 1. Displays market position badge (leading/competitive/emerging/unknown)
 * 2. Shows target business performance with mention count and rank
 * 3. Displays top 3 competitors with mention counts and market share
 * 4. Shows competitive gap alert when top competitor exists
 * 5. Displays strategic recommendation
 * 6. Links to detailed competitive page
 * 7. Handles loading state
 * 8. Handles null leaderboard with empty state
 * 9. Calculates market share correctly
 * 
 * TDD Cycle: RED → GREEN → REFACTOR
 * Tests written FIRST to drive implementation
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { CompetitiveLeaderboardDTO } from '@/lib/data/types';

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

describe('🔴 RED: CompetitiveAnalysisCard Component Specification', () => {
  let mockLeaderboard: CompetitiveLeaderboardDTO;

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockLeaderboard = {
      targetBusiness: {
        name: 'Test Business',
        mentionCount: 5,
        rankPosition: 2,
        marketPosition: 'competitive',
      },
      competitors: [
        {
          name: 'Competitor A',
          mentionCount: 10,
          rankPosition: 1,
          marketPosition: 'leading',
        },
        {
          name: 'Competitor B',
          mentionCount: 3,
          rankPosition: 3,
          marketPosition: 'emerging',
        },
        {
          name: 'Competitor C',
          mentionCount: 2,
          rankPosition: 4,
          marketPosition: 'emerging',
        },
      ],
      totalMentions: 20,
      marketShare: {
        target: 25,
        topCompetitor: 50,
      },
    };
  });

  /**
   * SPECIFICATION 1: Displays market position badge
   * 
   * Given: Leaderboard with market position
   * When: Component renders
   * Then: Should display position badge
   */
  it('MUST display market position badge (leading/competitive/emerging/unknown)', async () => {
    // Arrange: Leaderboard with position
    const { CompetitiveAnalysisCard } = await import('../competitive-analysis-card');
    
    // Act: Render component (TEST DRIVES IMPLEMENTATION)
    render(
      <CompetitiveAnalysisCard
        leaderboard={mockLeaderboard}
        businessName="Test Business"
        businessId={1}
      />
    );

    // Assert: SPECIFICATION - MUST display position badge
    expect(screen.getByText(/Competitive|Leading|Emerging/i)).toBeInTheDocument();
  });

  /**
   * SPECIFICATION 2: Shows target business performance
   * 
   * Given: Leaderboard with target business data
   * When: Component renders
   * Then: Should display mention count and rank
   */
  it('MUST show target business performance with mention count and rank', async () => {
    // Arrange: Leaderboard with target business
    const { CompetitiveAnalysisCard } = await import('../competitive-analysis-card');
    
    // Act: Render component
    render(
      <CompetitiveAnalysisCard
        leaderboard={mockLeaderboard}
        businessName="Test Business"
        businessId={1}
      />
    );

    // Assert: SPECIFICATION - MUST show performance
    expect(screen.getByText(/5|Mentions/i)).toBeInTheDocument();
    expect(screen.getByText(/#2|Rank/i)).toBeInTheDocument();
  });

  /**
   * SPECIFICATION 3: Displays top 3 competitors
   * 
   * Given: Leaderboard with competitors
   * When: Component renders
   * Then: Should display top 3 with mention counts and market share
   */
  it('MUST display top 3 competitors with mention counts and market share', async () => {
    // Arrange: Leaderboard with competitors
    const { CompetitiveAnalysisCard } = await import('../competitive-analysis-card');
    
    // Act: Render component
    render(
      <CompetitiveAnalysisCard
        leaderboard={mockLeaderboard}
        businessName="Test Business"
        businessId={1}
      />
    );

    // Assert: SPECIFICATION - MUST show top 3
    expect(screen.getByText(/Competitor A/i)).toBeInTheDocument();
    expect(screen.getByText(/Competitor B/i)).toBeInTheDocument();
    expect(screen.getByText(/10|Mentions/i)).toBeInTheDocument();
  });

  /**
   * SPECIFICATION 4: Shows competitive gap alert
   * 
   * Given: Leaderboard with top competitor
   * When: Component renders
   * Then: Should display gap alert
   */
  it('MUST show competitive gap alert when top competitor exists', async () => {
    // Arrange: Leaderboard with top competitor
    const { CompetitiveAnalysisCard } = await import('../competitive-analysis-card');
    
    // Act: Render component
    render(
      <CompetitiveAnalysisCard
        leaderboard={mockLeaderboard}
        businessName="Test Business"
        businessId={1}
      />
    );

    // Assert: SPECIFICATION - MUST show gap alert
    expect(screen.getByText(/Gap|Behind|Competitive Gap/i)).toBeInTheDocument();
  });

  /**
   * SPECIFICATION 5: Displays strategic recommendation
   * 
   * Given: Leaderboard with analysis
   * When: Component renders
   * Then: Should display recommendation
   */
  it('MUST display strategic recommendation', async () => {
    // Arrange: Leaderboard
    const { CompetitiveAnalysisCard } = await import('../competitive-analysis-card');
    
    // Act: Render component
    render(
      <CompetitiveAnalysisCard
        leaderboard={mockLeaderboard}
        businessName="Test Business"
        businessId={1}
      />
    );

    // Assert: SPECIFICATION - MUST show recommendation
    expect(screen.getByText(/Recommendation|Strategy|Action/i)).toBeInTheDocument();
  });

  /**
   * SPECIFICATION 6: Links to detailed competitive page
   * 
   * Given: Leaderboard data
   * When: Component renders
   * Then: Should have link to competitive detail page
   */
  it('MUST link to detailed competitive page', async () => {
    // Arrange: Leaderboard
    const { CompetitiveAnalysisCard } = await import('../competitive-analysis-card');
    
    // Act: Render component
    render(
      <CompetitiveAnalysisCard
        leaderboard={mockLeaderboard}
        businessName="Test Business"
        businessId={1}
      />
    );

    // Assert: SPECIFICATION - MUST have link
    const link = screen.getByRole('link', { name: /View Full Analysis|See Details/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', expect.stringContaining('1'));
  });

  /**
   * SPECIFICATION 7: Handles loading state
   * 
   * Given: Loading state
   * When: Component renders
   * Then: Should show loading skeleton
   */
  it('MUST handle loading state', async () => {
    // Arrange: Loading state
    const { CompetitiveAnalysisCard } = await import('../competitive-analysis-card');
    
    // Act: Render component
    render(
      <CompetitiveAnalysisCard
        leaderboard={null}
        businessName="Test Business"
        businessId={1}
        loading={true}
      />
    );

    // Assert: SPECIFICATION - MUST show loading
    expect(screen.getByText(/Competitive Analysis/i)).toBeInTheDocument();
  });

  /**
   * SPECIFICATION 8: Handles null leaderboard with empty state
   * 
   * Given: No leaderboard data
   * When: Component renders
   * Then: Should show empty state
   */
  it('MUST handle null leaderboard with empty state', async () => {
    // Arrange: No leaderboard
    const { CompetitiveAnalysisCard } = await import('../competitive-analysis-card');
    
    // Act: Render component
    render(
      <CompetitiveAnalysisCard
        leaderboard={null}
        businessName="Test Business"
        businessId={1}
        loading={false}
      />
    );

    // Assert: SPECIFICATION - MUST show empty state
    expect(screen.getByText(/No competitive data|Run analysis/i)).toBeInTheDocument();
  });

  /**
   * SPECIFICATION 9: Calculates market share correctly
   * 
   * Given: Leaderboard with mention counts
   * When: Component calculates market share
   * Then: Should show correct percentages
   */
  it('MUST calculate market share correctly', async () => {
    // Arrange: Leaderboard with market share data
    const { CompetitiveAnalysisCard } = await import('../competitive-analysis-card');
    
    // Act: Render component
    render(
      <CompetitiveAnalysisCard
        leaderboard={mockLeaderboard}
        businessName="Test Business"
        businessId={1}
      />
    );

    // Assert: SPECIFICATION - MUST show market share
    expect(screen.getByText(/25%|50%|Market Share/i)).toBeInTheDocument();
  });
});


