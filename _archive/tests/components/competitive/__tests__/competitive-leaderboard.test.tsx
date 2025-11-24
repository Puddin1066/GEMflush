/**
 * Competitive Leaderboard Component Tests
 * Tests defensive programming and error handling
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CompetitiveLeaderboard } from '../competitive-leaderboard';
import type { CompetitiveLeaderboardDTO } from '@/lib/data/types';

describe('CompetitiveLeaderboard', () => {
  const createMockData = (overrides?: Partial<CompetitiveLeaderboardDTO>): CompetitiveLeaderboardDTO => ({
    targetBusiness: {
      name: 'Test Business',
      rank: 1,
      mentionCount: 50,
      mentionRate: 50,
    },
    competitors: [
      {
        rank: 2,
        name: 'Competitor 1',
        mentionCount: 30,
        avgPosition: 2.0,
        appearsWithTarget: 10,
        marketShare: 30,
      },
    ],
    totalQueries: 100,
    insights: {
      marketPosition: 'leading',
      topCompetitor: 'Competitor 1',
      competitiveGap: 20,
      recommendation: 'Excellent visibility!',
    },
    ...overrides,
  });

  it('should render with complete data', () => {
    const data = createMockData();
    render(<CompetitiveLeaderboard data={data} businessId={1} />);

    expect(screen.getByText('Competitive Leaderboard')).toBeInTheDocument();
    expect(screen.getByText('Test Business')).toBeInTheDocument();
    expect(screen.getByText('Competitor 1')).toBeInTheDocument();
  });

  it('should handle missing insights gracefully', () => {
    const data = createMockData({
      insights: undefined as any,
    });

    // Should not throw error - this is the key test
    expect(() => {
      render(<CompetitiveLeaderboard data={data} businessId={1} />);
    }).not.toThrow();

    // Component should render (may show "unknown" or default text)
    expect(screen.getByText(/Competitive Leaderboard/i)).toBeInTheDocument();
  });

  it('should handle missing competitors array', () => {
    const data = createMockData({
      competitors: undefined as any,
    });

    expect(() => {
      render(<CompetitiveLeaderboard data={data} businessId={1} />);
    }).not.toThrow();

    expect(screen.getByText('Test Business')).toBeInTheDocument();
  });

  it('should handle missing totalQueries', () => {
    const data = createMockData({
      totalQueries: undefined as any,
    });

    expect(() => {
      render(<CompetitiveLeaderboard data={data} businessId={1} />);
    }).not.toThrow();
  });

  it('should display market position badge', () => {
    const data = createMockData({
      insights: {
        marketPosition: 'leading',
        topCompetitor: null,
        competitiveGap: null,
        recommendation: 'Test recommendation',
      },
    });

    render(<CompetitiveLeaderboard data={data} businessId={1} />);
    
    // Badge should be rendered (exact text depends on implementation)
    expect(screen.getByText(/Market Position/i)).toBeInTheDocument();
  });

  it('should handle all market positions', () => {
    const positions: Array<'leading' | 'competitive' | 'emerging' | 'unknown'> = [
      'leading',
      'competitive',
      'emerging',
      'unknown',
    ];

    positions.forEach((position) => {
      const data = createMockData({
        insights: {
          marketPosition: position,
          topCompetitor: null,
          competitiveGap: null,
          recommendation: 'Test',
        },
      });

      // Should render without error for all positions
      expect(() => {
        const { unmount } = render(<CompetitiveLeaderboard data={data} businessId={1} />);
        expect(screen.getByText(/Competitive Leaderboard/i)).toBeInTheDocument();
        unmount();
      }).not.toThrow();
    });
  });

  it('should display top competitor when present', () => {
    const data = createMockData({
      insights: {
        marketPosition: 'competitive',
        topCompetitor: 'Top Competitor Inc',
        competitiveGap: 15,
        recommendation: 'Test',
      },
    });

    render(<CompetitiveLeaderboard data={data} businessId={1} />);
    // Check for top competitor section (flexible matching)
    const topCompetitorText = screen.queryByText(/Top Competitor/i);
    expect(topCompetitorText || screen.queryByText(/Top Competitor Inc/i)).toBeTruthy();
  });

  it('should not display top competitor section when null', () => {
    const data = createMockData({
      insights: {
        marketPosition: 'leading',
        topCompetitor: null,
        competitiveGap: null,
        recommendation: 'Test',
      },
    });

    render(<CompetitiveLeaderboard data={data} businessId={1} />);
    // Should not have top competitor section
    expect(screen.queryByText(/🥇 Top Competitor/i)).not.toBeInTheDocument();
  });

  it('should display recommendation', () => {
    const data = createMockData({
      insights: {
        marketPosition: 'leading',
        topCompetitor: null,
        competitiveGap: null,
        recommendation: 'This is a test recommendation',
      },
    });

    render(<CompetitiveLeaderboard data={data} businessId={1} />);
    expect(screen.getByText('This is a test recommendation')).toBeInTheDocument();
  });

  it('should handle empty competitors list', () => {
    const data = createMockData({
      competitors: [],
    });

    render(<CompetitiveLeaderboard data={data} businessId={1} />);
    expect(screen.getByText(/No competitors detected/i)).toBeInTheDocument();
  });

  it('should handle competitive gap display', () => {
    const data = createMockData({
      insights: {
        marketPosition: 'competitive',
        topCompetitor: 'Competitor A',
        competitiveGap: 5,
        recommendation: 'Test',
      },
    });

    // Should render without error
    expect(() => {
      render(<CompetitiveLeaderboard data={data} businessId={1} />);
    }).not.toThrow();
    
    // Should show top competitor section
    expect(screen.getByText(/Top Competitor/i)).toBeInTheDocument();
  });

  it('should handle singular mention in gap', () => {
    const data = createMockData({
      insights: {
        marketPosition: 'competitive',
        topCompetitor: 'Competitor A',
        competitiveGap: 1,
        recommendation: 'Test',
      },
    });

    // Should render without error
    expect(() => {
      render(<CompetitiveLeaderboard data={data} businessId={1} />);
    }).not.toThrow();
    
    // Should show top competitor section
    expect(screen.getByText(/Top Competitor/i)).toBeInTheDocument();
  });
});

