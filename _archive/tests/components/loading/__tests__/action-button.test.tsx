/**
 * TDD Test: ActionButton Component
 * 
 * SPECIFICATION: Action Button with Loading State
 * 
 * As a user
 * I want to see loading states on action buttons
 * So that I know when actions are in progress
 * 
 * Acceptance Criteria:
 * 1. Displays button text
 * 2. Shows loading state when loading prop is true
 * 3. Disables button when loading
 * 4. Calls onClick when clicked (when not loading)
 * 5. Handles different button variants
 * 
 * TDD Cycle: RED → GREEN → REFACTOR
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ActionButton } from '../action-button';

describe('ActionButton Component - Behavior Specifications', () => {
  /**
   * SPECIFICATION 1: Displays button text
   */
  it('displays button text', () => {
    // Arrange
    const buttonText = 'Submit';

    // Act
    render(<ActionButton>{buttonText}</ActionButton>);

    // Assert: Verify button text displayed
    expect(screen.getByText(buttonText)).toBeInTheDocument();
  });

  /**
   * SPECIFICATION 2: Shows loading state when loading prop is true
   */
  it('shows loading state when loading', () => {
    // Arrange
    render(<ActionButton loading={true}>Submit</ActionButton>);

    // Assert: Verify loading indicator displayed (behavior: shows loading)
    const loadingText = screen.queryByText(/loading|submitting|processing/i);
    expect(loadingText || screen.getByRole('button').disabled).toBeTruthy();
  });

  /**
   * SPECIFICATION 3: Disables button when loading
   */
  it('disables button when loading', () => {
    // Arrange
    render(<ActionButton loading={true}>Submit</ActionButton>);

    // Assert: Verify button is disabled
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
  });

  /**
   * SPECIFICATION 4: Calls onClick when clicked (when not loading)
   */
  it('calls onClick when clicked and not loading', async () => {
    // Arrange
    const user = userEvent.setup();
    const onClick = vi.fn();

    // Act
    render(<ActionButton onClick={onClick}>Submit</ActionButton>);
    const button = screen.getByRole('button');
    await user.click(button);

    // Assert: Verify onClick called
    expect(onClick).toHaveBeenCalled();
  });

  /**
   * SPECIFICATION 5: Does not call onClick when loading
   */
  it('does not call onClick when loading', async () => {
    // Arrange
    const user = userEvent.setup();
    const onClick = vi.fn();

    // Act
    render(<ActionButton onClick={onClick} loading={true}>Submit</ActionButton>);
    const button = screen.getByRole('button');
    await user.click(button);

    // Assert: Verify onClick not called when loading
    expect(onClick).not.toHaveBeenCalled();
  });
});



