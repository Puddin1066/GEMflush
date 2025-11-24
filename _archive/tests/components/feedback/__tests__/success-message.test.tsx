/**
 * TDD Test: SuccessMessage Component
 * 
 * SPECIFICATION: Success Feedback Display
 * 
 * As a user
 * I want to see success messages
 * So that I know my actions completed successfully
 * 
 * Acceptance Criteria:
 * 1. Displays title and message
 * 2. Shows dismiss button when onDismiss provided
 * 3. Handles missing optional props gracefully
 * 
 * TDD Cycle: RED → GREEN → REFACTOR
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SuccessMessage } from '../success-message';

describe('SuccessMessage Component - Behavior Specifications', () => {
  /**
   * SPECIFICATION 1: Displays title and message
   */
  it('displays title and message', () => {
    // Arrange
    const title = 'Success!';
    const message = 'Operation completed successfully';

    // Act
    render(<SuccessMessage title={title} message={message} />);

    // Assert: Verify content displayed
    expect(screen.getByText(title)).toBeInTheDocument();
    expect(screen.getByText(message)).toBeInTheDocument();
  });

  /**
   * SPECIFICATION 2: Calls onDismiss when dismiss button clicked
   */
  it('calls onDismiss when dismiss button clicked', async () => {
    // Arrange
    const user = userEvent.setup();
    const onDismiss = vi.fn();

    // Act
    render(
      <SuccessMessage
        title="Success"
        message="Done"
        onDismiss={onDismiss}
      />
    );

    const dismissButton = screen.getByRole('button') || screen.getByText('×');
    await user.click(dismissButton);

    // Assert: Verify onDismiss called
    expect(onDismiss).toHaveBeenCalled();
  });

  /**
   * SPECIFICATION 3: Handles missing optional props gracefully
   */
  it('renders without error when optional props are missing', () => {
    // Arrange
    const title = 'Success';

    // Act & Assert: Should not throw error
    expect(() => {
      render(<SuccessMessage title={title} />);
    }).not.toThrow();

    // Verify title still displayed
    expect(screen.getByText(title)).toBeInTheDocument();
  });
});

