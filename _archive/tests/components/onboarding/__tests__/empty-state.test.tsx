/**
 * TDD Test: EmptyState Component
 * 
 * SPECIFICATION: Empty State Display
 * 
 * As a user
 * I want to see helpful empty states
 * So that I know what to do next
 * 
 * Acceptance Criteria:
 * 1. Displays title and description
 * 2. Shows action button when provided
 * 3. Displays icon when provided
 * 4. Handles missing optional props gracefully
 * 
 * TDD Cycle: RED → GREEN → REFACTOR
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EmptyState } from '../empty-state';

describe('EmptyState Component - Behavior Specifications', () => {
  /**
   * SPECIFICATION 1: Displays title and description
   */
  it('displays title and description', () => {
    // Arrange
    const title = 'No businesses yet';
    const description = 'Get started by adding your first business';

    // Act
    render(<EmptyState title={title} description={description} />);

    // Assert: Verify content displayed
    expect(screen.getByText(title)).toBeInTheDocument();
    expect(screen.getByText(description)).toBeInTheDocument();
  });

  /**
   * SPECIFICATION 2: Shows action button when provided
   */
  it('displays action button when action prop provided', () => {
    // Arrange
    const action = {
      label: 'Add Business',
      href: '/dashboard/businesses/new',
    };

    // Act
    render(
      <EmptyState
        title="No businesses"
        description="Get started"
        action={action}
      />
    );

    // Assert: Verify action button displayed
    const button = screen.getByRole('link', { name: /add business/i });
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute('href', action.href);
  });

  /**
   * SPECIFICATION 3: Handles missing optional props gracefully
   */
  it('renders without error when optional props are missing', () => {
    // Arrange
    const title = 'Empty';

    // Act & Assert: Should not throw error
    expect(() => {
      render(<EmptyState title={title} />);
    }).not.toThrow();

    // Verify title still displayed
    expect(screen.getByText(title)).toBeInTheDocument();
  });

  /**
   * SPECIFICATION 4: Displays icon when provided
   */
  it('displays icon when icon prop provided', () => {
    // Arrange
    const Icon = () => <span data-testid="icon">💎</span>;

    // Act
    render(<EmptyState title="Empty" icon={Icon} />);

    // Assert: Verify icon displayed (behavior: icon rendered)
    const icon = screen.queryByTestId('icon');
    expect(icon).toBeInTheDocument();
  });
});



