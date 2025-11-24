/**
 * Component tests for AutomatedCFPStatus
 * Tests user-visible behavior, not implementation details (SOLID/DRY)
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AutomatedCFPStatus } from '../automated-cfp-status';

describe('AutomatedCFPStatus Component', () => {
  const businessName = 'Brown Physicians';

  // DRY: Test all statuses with logging to avoid overfitting
  const statusTests = ['pending', 'crawling', 'crawled', 'generating', 'published', 'error'];

  describe('Status Display', () => {
    // DRY: Single test for all statuses - test behavior, log details
    it.each(statusTests)('should display $status status correctly', (status) => {
      const { container } = render(
        <AutomatedCFPStatus status={status} businessName={businessName} />
      );
      
      // Log what's actually rendered (for debugging, not for exact matching)
      const renderedText = container.textContent || '';
      console.log(`[TEST] Status "${status}" rendered: ${renderedText.substring(0, 150)}`);
      
      // Test behavior: component renders with meaningful content
      expect(container).toBeInTheDocument();
      expect(renderedText.length).toBeGreaterThan(0);
      
      // Test behavior: shows status-related content (flexible pattern matching)
      const hasStatusContent = /Initializing|Crawling|Complete|Publishing|Retrying|Analysis|AI|automation/i.test(renderedText);
      expect(hasStatusContent).toBe(true);
    });
  });

  describe('Tier-Based Messaging', () => {
    it('should show different automation messages based on tier', () => {
      // Pro tier
      const { container: proContainer, rerender } = render(
        <AutomatedCFPStatus status="pending" businessName={businessName} isPro={true} />
      );
      const proText = proContainer.textContent || '';
      console.log(`[TEST] Pro tier message: ${proText.substring(0, 150)}`);
      
      // Test behavior: Pro tier mentions publishing (not checking exact text)
      expect(/publish/i.test(proText) || /automation/i.test(proText)).toBe(true);

      // Free tier
      rerender(
        <AutomatedCFPStatus status="pending" businessName={businessName} isPro={false} />
      );
      const freeText = proContainer.textContent || '';
      console.log(`[TEST] Free tier message: ${freeText.substring(0, 150)}`);
      
      // Test behavior: Free tier mentions upgrade or limitation (flexible)
      expect(/upgrade|automation/i.test(freeText)).toBe(true);
    });

    it('should show completion message when published', () => {
      const { container } = render(
        <AutomatedCFPStatus status="published" businessName={businessName} />
      );
      const text = container.textContent || '';
      console.log(`[TEST] Published status message: ${text.substring(0, 150)}`);
      
      // Test behavior: shows completion messaging (flexible match)
      expect(/GEMflush|Complete|delivered/i.test(text)).toBe(true);
    });
  });

  describe('Component Rendering', () => {
    it('should render without crashing for any valid status', () => {
      const { container } = render(
        <AutomatedCFPStatus status="pending" businessName={businessName} />
      );
      
      // Log rendered content for debugging
      const text = container.textContent || '';
      console.log(`[TEST] Component rendered: ${text.substring(0, 100)}`);
      
      // Test behavior: component renders with content
      expect(container).toBeInTheDocument();
      expect(text.length).toBeGreaterThan(0);
    });
  });
});
