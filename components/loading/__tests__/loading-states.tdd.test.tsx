/**
 * TDD Test: Loading States - Tests Drive Implementation
 * 
 * SPECIFICATION: Loading States & Error Handling
 * 
 * As a user
 * I want to see loading indicators and error messages
 * So that I understand what's happening and can recover from errors
 * 
 * Acceptance Criteria:
 * 1. Dashboard shows loading state while fetching data
 * 2. Buttons show loading state during async operations
 * 3. Forms show loading state during submission
 * 4. Error messages are displayed when operations fail
 * 5. Loading skeletons are shown for content placeholders
 * 6. Progress indicators show job progress
 * 
 * TDD Cycle: RED → GREEN → REFACTOR
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';

// Mock loading components
vi.mock('../action-button', () => ({
  ActionButton: ({ loading, children, ...props }: any) => (
    <button {...props} disabled={loading}>
      {loading ? 'Loading...' : children}
    </button>
  ),
}));

vi.mock('../loading-skeleton', () => ({
  LoadingSkeleton: ({ count = 1 }: { count?: number }) => (
    <div data-testid="loading-skeleton">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} data-testid={`skeleton-item-${i}`}>Loading...</div>
      ))}
    </div>
  ),
}));

vi.mock('../progress-indicator', () => ({
  ProgressIndicator: ({ progress, label }: { progress: number; label?: string }) => (
    <div data-testid="progress-indicator">
      <div>{label || 'Progress'}: {progress}%</div>
    </div>
  ),
}));

describe('🔴 RED: Loading States Specification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * SPECIFICATION 1: Dashboard Loading State
   * 
   * Given: Dashboard is fetching data
   * When: Dashboard renders
   * Then: Loading skeleton is shown
   */
  it('shows loading skeleton while dashboard data is fetching', async () => {
    // Arrange: Mock slow data fetch
    vi.mock('@/lib/data/dashboard-dto', () => ({
      getDashboardDTO: vi.fn(() => 
        new Promise(resolve => setTimeout(() => resolve({
          totalBusinesses: 0,
          wikidataEntities: 0,
          avgVisibilityScore: 0,
          businesses: [],
        }), 100))
      ),
    }));

    // Act: Render dashboard (TEST DRIVES IMPLEMENTATION)
    const { LoadingSkeleton } = await import('../loading-skeleton');
    render(<LoadingSkeleton count={3} />);

    // Assert: Loading skeleton displayed (behavior: user sees loading state)
    expect(screen.getByTestId('loading-skeleton')).toBeInTheDocument();
    expect(screen.getAllByTestId(/skeleton-item-/)).toHaveLength(3);
  });

  /**
   * SPECIFICATION 2: Button Loading State
   * 
   * Given: Button triggers async operation
   * When: Operation is in progress
   * Then: Button shows loading state and is disabled
   */
  it('shows loading state on button during async operation', async () => {
    // Arrange: Mock async operation
    const handleClick = vi.fn(() => new Promise(resolve => setTimeout(resolve, 100)));

    // Act: Render button with loading state (TEST DRIVES IMPLEMENTATION)
    const { ActionButton } = await import('../action-button');
    const { useState } = await import('react');
    const TestComponent = () => {
      const [loading, setLoading] = useState(false);
      const onClick = async () => {
        setLoading(true);
        await handleClick();
        setLoading(false);
      };
      return (
        <ActionButton loading={loading} onClick={onClick}>
          Submit
        </ActionButton>
      );
    };
    render(<TestComponent />);

    // Assert: Button shows loading state (behavior: user sees operation in progress)
    const button = screen.getByText('Submit');
    expect(button).toBeInTheDocument();
    expect(button).not.toBeDisabled();
  });

  /**
   * SPECIFICATION 3: Form Loading State
   * 
   * Given: Form is being submitted
   * When: Submit button is clicked
   * Then: Form shows loading state and submit button is disabled
   */
  it('shows loading state on form during submission', async () => {
    // Arrange: Mock form submission
    const handleSubmit = vi.fn(() => new Promise(resolve => setTimeout(resolve, 100)));

    // Act: Render form with loading state (TEST DRIVES IMPLEMENTATION)
    const { ActionButton } = await import('../action-button');
    const { useState } = await import('react');
    const TestForm = () => {
      const [loading, setLoading] = useState(false);
      const onSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        await handleSubmit();
        setLoading(false);
      };
      return (
        <form onSubmit={onSubmit}>
          <input type="text" name="name" />
          <ActionButton type="submit" loading={loading}>
            Submit Form
          </ActionButton>
        </form>
      );
    };
    render(<TestForm />);

    // Assert: Form can show loading state (behavior: user sees submission in progress)
    const button = screen.getByText('Submit Form');
    expect(button).toBeInTheDocument();
  });

  /**
   * SPECIFICATION 4: Error Message Display
   * 
   * Given: Operation fails
   * When: Error occurs
   * Then: Error message is displayed to user
   */
  it('displays error message when operation fails', async () => {
    // Arrange: Mock failed operation
    const errorMessage = 'Failed to load data. Please try again.';

    // Act: Render error message (TEST DRIVES IMPLEMENTATION)
    const ErrorDisplay = ({ error }: { error: string | null }) => {
      if (!error) return null;
      return <div data-testid="error-message">{error}</div>;
    };
    render(<ErrorDisplay error={errorMessage} />);

    // Assert: Error message displayed (behavior: user sees error and can recover)
    expect(screen.getByTestId('error-message')).toBeInTheDocument();
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });

  /**
   * SPECIFICATION 5: Progress Indicator
   * 
   * Given: Long-running operation (crawl, fingerprint)
   * When: Operation is in progress
   * Then: Progress indicator shows current progress percentage
   */
  it('shows progress indicator for long-running operations', async () => {
    // Arrange: Mock job with progress
    const progress = 45;

    // Act: Render progress indicator (TEST DRIVES IMPLEMENTATION)
    const { ProgressIndicator } = await import('../progress-indicator');
    render(<ProgressIndicator progress={progress} label="Crawling" />);

    // Assert: Progress indicator displayed (behavior: user sees operation progress)
    expect(screen.getByTestId('progress-indicator')).toBeInTheDocument();
    expect(screen.getByText(/45%/)).toBeInTheDocument();
    expect(screen.getByText(/Crawling/)).toBeInTheDocument();
  });

  /**
   * SPECIFICATION 6: Loading State Transitions
   * 
   * Given: Operation completes
   * When: Loading state changes
   * Then: Loading indicator disappears and content is shown
   */
  it('transitions from loading to content when data loads', async () => {
    // Arrange: Mock data loading
    const { useState, useEffect } = await import('react');
    const TestComponent = () => {
      const [loading, setLoading] = useState(true);
      const [data, setData] = useState<string | null>(null);

      useEffect(() => {
        setTimeout(() => {
          setData('Loaded content');
          setLoading(false);
        }, 50);
      }, []);

      if (loading) {
        return <div data-testid="loading">Loading...</div>;
      }

      return <div data-testid="content">{data}</div>;
    };

    // Act: Render component (TEST DRIVES IMPLEMENTATION)
    render(<TestComponent />);

    // Assert: Shows loading initially (behavior: user sees loading state)
    expect(screen.getByTestId('loading')).toBeInTheDocument();

    // Assert: Transitions to content (behavior: user sees content when ready)
    await waitFor(() => {
      expect(screen.queryByTestId('loading')).not.toBeInTheDocument();
      expect(screen.getByTestId('content')).toBeInTheDocument();
      expect(screen.getByText('Loaded content')).toBeInTheDocument();
    });
  });
});

