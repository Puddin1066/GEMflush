/**
 * Visibility Intel Card Component Tests
 * Tests publishing impact note addition
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { VisibilityIntelCard } from '../visibility-intel-card';
import type { FingerprintDetailDTO } from '@/lib/data/types';

describe('VisibilityIntelCard - Publishing Impact Note', () => {
  const createMockFingerprint = (): FingerprintDetailDTO => ({
    visibilityScore: 75,
    trend: 'up',
    createdAt: '2 days ago',
    summary: {
      mentionRate: 60,
      sentiment: 'positive',
      averageRank: 2,
      topModels: ['ChatGPT', 'Claude'],
    },
    results: [
      { model: 'ChatGPT', mentioned: true, rank: 1 },
      { model: 'Claude', mentioned: true, rank: 2 },
    ],
    competitiveLeaderboard: null,
  });

  it('should show publishing impact note for unpublished businesses', () => {
    render(
      <VisibilityIntelCard
        fingerprint={createMockFingerprint()}
        onAnalyze={() => {}}
        isPublished={false}
      />
    );

    expect(screen.getByText(/Boost Your Visibility Score/i)).toBeInTheDocument();
    expect(screen.getByText(/340%/i)).toBeInTheDocument();
    expect(screen.getByText(/Publishing to Wikidata can increase/i)).toBeInTheDocument();
  });

  it('should not show publishing impact note for published businesses', () => {
    render(
      <VisibilityIntelCard
        fingerprint={createMockFingerprint()}
        onAnalyze={() => {}}
        isPublished={true}
      />
    );

    expect(screen.queryByText(/Boost Your Visibility Score/i)).not.toBeInTheDocument();
  });

  it('should display visibility score when fingerprint exists', () => {
    render(
      <VisibilityIntelCard
        fingerprint={createMockFingerprint()}
        onAnalyze={() => {}}
        isPublished={false}
      />
    );

    // Should show the score (exact format depends on VisibilityScoreDisplay component)
    expect(screen.getByText(/75/)).toBeInTheDocument();
  });
});

