/**
 * Publishing Onboarding Component Tests
 * Tests key UX improvements: value-first messaging and LLM connection
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PublishingOnboarding } from '../publishing-onboarding';
import * as useTeamHook from '@/lib/hooks/use-team';

// Mock the useTeam hook
vi.mock('@/lib/hooks/use-team', () => ({
  useTeam: vi.fn(),
}));

describe('PublishingOnboarding - UX Improvements', () => {
  beforeEach(() => {
    vi.mocked(useTeamHook.useTeam).mockReturnValue({
      planTier: 'free',
      isPro: false,
      team: null,
    });
  });

  it('should display value-first title "Get Your Business Into AI Systems"', () => {
    render(
      <PublishingOnboarding
        businessId={1}
        hasCrawlData={false}
        hasFingerprint={false}
        isPublished={false}
      />
    );

    expect(screen.getByText('Get Your Business Into AI Systems')).toBeInTheDocument();
  });

  it('should display LLM connection in description', () => {
    render(
      <PublishingOnboarding
        businessId={1}
        hasCrawlData={false}
        hasFingerprint={false}
        isPublished={false}
      />
    );

    expect(
      screen.getByText(/Follow these steps to make your business discoverable by ChatGPT, Claude, and Perplexity/i)
    ).toBeInTheDocument();
  });

  it('should mention specific LLMs in publish step description', () => {
    render(
      <PublishingOnboarding
        businessId={1}
        hasCrawlData={true}
        hasFingerprint={true}
        isPublished={false}
      />
    );

    expect(
      screen.getByText(/Make your business discoverable by AI systems \(ChatGPT, Claude, Perplexity\)/i)
    ).toBeInTheDocument();
  });

  it('should show progress percentage', () => {
    render(
      <PublishingOnboarding
        businessId={1}
        hasCrawlData={true}
        hasFingerprint={false}
        isPublished={false}
      />
    );

    // Should show some progress (25% - 1 of 4 steps)
    expect(screen.getByText(/\d+% Complete/)).toBeInTheDocument();
  });
});

