/**
 * Unit tests for VisibilityScoreChart component
 * Tests rendering, data fetching, error handling, and chart display
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { VisibilityScoreChart } from '../visibility-score-chart';

// Mock recharts to avoid rendering issues in tests
vi.mock('recharts', () => ({
  LineChart: ({ children }: any) => <div data-testid="line-chart">{children}</div>,
  Line: () => <div data-testid="line" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  Legend: () => <div data-testid="legend" />,
  ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container">{children}</div>,
}));

// Mock fetch
global.fetch = vi.fn();

describe('VisibilityScoreChart', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Loading State', () => {
    it('should show loading state while fetching data', () => {
      vi.mocked(fetch).mockImplementation(() => 
        new Promise(() => {}) // Never resolves
      );

      render(<VisibilityScoreChart businessId={1} />);

      // Should render the component structure
      expect(screen.getByText(/visibility score over time/i)).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should display error message when API call fails', async () => {
      vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'));

      render(<VisibilityScoreChart businessId={1} />);

      await waitFor(() => {
        expect(screen.getByText(/error loading chart/i)).toBeInTheDocument();
        expect(screen.getByText(/network error/i)).toBeInTheDocument();
      });
    });

    it('should display error message when API returns error status', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 500,
      } as Response);

      render(<VisibilityScoreChart businessId={1} />);

      await waitFor(() => {
        expect(screen.getByText(/error loading chart/i)).toBeInTheDocument();
      });
    });
  });

  describe('Empty State', () => {
    it('should display empty state when no history data exists', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ history: [], total: 0 }),
      } as Response);

      render(<VisibilityScoreChart businessId={1} />);

      await waitFor(() => {
        expect(screen.getByText(/no historical data available yet/i)).toBeInTheDocument();
        expect(screen.getByText(/run multiple analyses to see trends/i)).toBeInTheDocument();
      });
    });
  });

  describe('Chart Display', () => {
    it('should render chart with single data point', async () => {
      const mockHistory = [
        {
          id: 1,
          date: '2024-01-15T10:00:00Z',
          visibilityScore: 75,
          mentionRate: 80,
          sentimentScore: 85,
          accuracyScore: 70,
          avgRankPosition: 2.5,
        },
      ];

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ history: mockHistory, total: 1 }),
      } as Response);

      render(<VisibilityScoreChart businessId={1} />);

      await waitFor(() => {
        expect(screen.getByText(/1 analysis tracked/i)).toBeInTheDocument();
        expect(screen.getByTestId('line-chart')).toBeInTheDocument();
      });
    });

    it('should render chart with multiple data points', async () => {
      const mockHistory = [
        {
          id: 2,
          date: '2024-01-20T10:00:00Z',
          visibilityScore: 80,
          mentionRate: 85,
          sentimentScore: 90,
          accuracyScore: 75,
          avgRankPosition: 2.0,
        },
        {
          id: 1,
          date: '2024-01-15T10:00:00Z',
          visibilityScore: 75,
          mentionRate: 80,
          sentimentScore: 85,
          accuracyScore: 70,
          avgRankPosition: 2.5,
        },
      ];

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ history: mockHistory, total: 2 }),
      } as Response);

      render(<VisibilityScoreChart businessId={1} />);

      await waitFor(() => {
        // Should render chart(s) when data is available (may have multiple charts)
        const charts = screen.getAllByTestId('line-chart');
        expect(charts.length).toBeGreaterThan(0);
      });
    });

    it('should calculate and display trend correctly', async () => {
      const mockHistory = [
        {
          id: 2,
          date: '2024-01-20T10:00:00Z',
          visibilityScore: 80,
          mentionRate: 85,
          sentimentScore: 90,
          accuracyScore: 75,
          avgRankPosition: 2.0,
        },
        {
          id: 1,
          date: '2024-01-15T10:00:00Z',
          visibilityScore: 75,
          mentionRate: 80,
          sentimentScore: 85,
          accuracyScore: 70,
          avgRankPosition: 2.5,
        },
      ];

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ history: mockHistory, total: 2 }),
      } as Response);

      render(<VisibilityScoreChart businessId={1} />);

      await waitFor(() => {
        // Should display trend (positive change)
        expect(screen.getByText(/\+5/i)).toBeInTheDocument();
      });
    });

    it('should display negative trend correctly', async () => {
      const mockHistory = [
        {
          id: 2,
          date: '2024-01-20T10:00:00Z',
          visibilityScore: 70,
          mentionRate: 75,
          sentimentScore: 80,
          accuracyScore: 65,
          avgRankPosition: 3.0,
        },
        {
          id: 1,
          date: '2024-01-15T10:00:00Z',
          visibilityScore: 75,
          mentionRate: 80,
          sentimentScore: 85,
          accuracyScore: 70,
          avgRankPosition: 2.5,
        },
      ];

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ history: mockHistory, total: 2 }),
      } as Response);

      render(<VisibilityScoreChart businessId={1} />);

      await waitFor(() => {
        // Should display negative trend
        expect(screen.getByText(/-5/i)).toBeInTheDocument();
      });
    });

    it('should render component metrics chart when multiple data points exist', async () => {
      const mockHistory = [
        {
          id: 2,
          date: '2024-01-20T10:00:00Z',
          visibilityScore: 80,
          mentionRate: 85,
          sentimentScore: 90,
          accuracyScore: 75,
          avgRankPosition: 2.0,
        },
        {
          id: 1,
          date: '2024-01-15T10:00:00Z',
          visibilityScore: 75,
          mentionRate: 80,
          sentimentScore: 85,
          accuracyScore: 70,
          avgRankPosition: 2.5,
        },
      ];

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ history: mockHistory, total: 2 }),
      } as Response);

      render(<VisibilityScoreChart businessId={1} />);

      await waitFor(() => {
        // Should show component metrics when 2+ data points
        expect(screen.getByText(/component metrics/i)).toBeInTheDocument();
      });
    });
  });


  describe('API Integration', () => {
    it('should call correct API endpoint with business ID', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ history: [], total: 0 }),
      } as Response);

      render(<VisibilityScoreChart businessId={123} />);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith('/api/business/123/fingerprint/history');
      });
    });
  });
});

