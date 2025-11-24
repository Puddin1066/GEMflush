/**
 * TDD Test: BusinessStatusIndicator Component
 * 
 * SPECIFICATION: Business Status Display
 * 
 * As a user
 * I want to see the current status of my business operations
 * So that I know what's happening with my business
 * 
 * TDD Cycle: RED → GREEN → REFACTOR
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BusinessStatusIndicator } from '../business-status-indicator';

describe('BusinessStatusIndicator Component - Behavior Specifications', () => {
  /**
   * SPECIFICATION 1: Displays status information
   */
  it('displays status information', () => {
    // Arrange
    const status = 'crawling';

    // Act
    render(<BusinessStatusIndicator status={status} />);

    // Assert: Verify status is displayed (flexible format)
    const statusText = screen.queryByText(/status|crawling/i);
    expect(statusText).toBeInTheDocument();
  });

  /**
   * SPECIFICATION 2: Shows progress when provided
   */
  it('displays progress information when provided', () => {
    // Arrange
    const progress = {
      label: 'Crawling website',
      percentage: 65,
      message: 'Extracting data...',
    };

    // Act
    render(<BusinessStatusIndicator status="crawling" progress={progress} />);

    // Assert: Verify progress displayed (behavior: shows progress info)
    const progressText = screen.queryByText(/crawling|65|extracting/i);
    expect(progressText).toBeInTheDocument();
  });

  /**
   * SPECIFICATION 3: Handles different status values
   */
  it('handles different status values', () => {
    // Arrange
    const statuses = ['pending', 'crawling', 'crawled', 'published', 'error'];

    statuses.forEach((status) => {
      // Act
      const { unmount } = render(<BusinessStatusIndicator status={status} />);

      // Assert: Component renders without error (behavior: handles all statuses)
      const component = screen.queryByText(/status/i);
      expect(component).toBeInTheDocument();
      unmount();
    });
  });
});

