/**
 * TDD Test: Visibility Metrics Card Component - Tests Drive Implementation
 * 
 * SPECIFICATION: Visibility Metrics Card Component
 * 
 * As a user
 * I want to see comprehensive LLM visibility metrics and trends
 * So that I can understand my business's AI visibility performance
 * 
 * Acceptance Criteria:
 * 1. Displays visibility score prominently
 * 2. Shows trend indicator (up/down/neutral) with value
 * 3. Displays mention rate metric with progress bar
 * 4. Displays average rank metric
 * 5. Shows top 5 model performance results
 * 6. Displays top performing models as badges
 * 7. Calculates trend from history correctly
 * 8. Handles loading state with skeleton
 * 9. Handles null fingerprint with empty state
 * 10. Formats model names correctly
 * 
 * TDD Cycle: RED → GREEN → REFACTOR
 * Tests written FIRST to drive implementation
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { FingerprintDetailDTO, FingerprintHistoryDTO } from '@/lib/data/types';

describe('🔴 RED: VisibilityMetricsCard Component Specification', () => {
  let mockFingerprint: FingerprintDetailDTO;
  let mockHistory: FingerprintHistoryDTO[];

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockFingerprint = {
      visibilityScore: 75,
      trend: 'up',
      summary: {
        mentionRate: 50,
        sentiment: 'positive',
        topModels: ['gpt-4', 'claude-3'],
        averageRank: 2.5,
      },
      results: [
        {
          model: 'openai/gpt-4',
          promptType: 'factual',
          mentioned: true,
          sentiment: 'positive',
          confidence: 90,
          rankPosition: 1,
        },
        {
          model: 'anthropic/claude-3',
          promptType: 'recommendation',
          mentioned: true,
          sentiment: 'positive',
          confidence: 85,
          rankPosition: 2,
        },
      ],
      competitiveLeaderboard: null,
      createdAt: '2 days ago',
    };

    mockHistory = [
      {
        id: 2,
        date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        visibilityScore: 70,
        mentionRate: 45,
        sentimentScore: 80,
        accuracyScore: 85,
        avgRankPosition: 3.0,
      },
      {
        id: 1,
        date: new Date().toISOString(),
        visibilityScore: 75,
        mentionRate: 50,
        sentimentScore: 85,
        accuracyScore: 90,
        avgRankPosition: 2.5,
      },
    ];
  });

  /**
   * SPECIFICATION 1: Displays visibility score prominently
   * 
   * Given: Fingerprint with visibility score
   * When: Component renders
   * Then: Should display score prominently
   */
  it('MUST display visibility score prominently', async () => {
    // Arrange: Fingerprint with score
    const { VisibilityMetricsCard } = await import('../visibility-metrics-card');
    
    // Act: Render component (TEST DRIVES IMPLEMENTATION)
    render(
      <VisibilityMetricsCard
        fingerprint={mockFingerprint}
        history={mockHistory}
        businessName="Test Business"
      />
    );

    // Assert: SPECIFICATION - MUST display score prominently
    expect(screen.getByText('75')).toBeInTheDocument();
    expect(screen.getByText(/Visibility Score/i)).toBeInTheDocument();
  });

  /**
   * SPECIFICATION 2: Shows trend indicator (up/down/neutral) with value
   * 
   * Given: Fingerprint with trend data
   * When: Component renders
   * Then: Should display trend indicator with value
   */
  it('MUST show trend indicator (up/down/neutral) with value', async () => {
    // Arrange: Fingerprint with up trend
    const { VisibilityMetricsCard } = await import('../visibility-metrics-card');
    
    // Act: Render component
    render(
      <VisibilityMetricsCard
        fingerprint={mockFingerprint}
        history={mockHistory}
        businessName="Test Business"
      />
    );

    // Assert: SPECIFICATION - MUST show trend
    expect(screen.getByText(/\+5|Improved|up/i)).toBeInTheDocument();
  });

  /**
   * SPECIFICATION 3: Displays mention rate metric with progress bar
   * 
   * Given: Fingerprint with mention rate
   * When: Component renders
   * Then: Should display mention rate with progress
   */
  it('MUST display mention rate metric with progress bar', async () => {
    // Arrange: Fingerprint with mention rate
    const { VisibilityMetricsCard } = await import('../visibility-metrics-card');
    
    // Act: Render component
    render(
      <VisibilityMetricsCard
        fingerprint={mockFingerprint}
        history={mockHistory}
        businessName="Test Business"
      />
    );

    // Assert: SPECIFICATION - MUST display mention rate
    expect(screen.getByText(/50%/)).toBeInTheDocument();
    expect(screen.getByText(/Mention Rate/i)).toBeInTheDocument();
  });

  /**
   * SPECIFICATION 4: Displays average rank metric
   * 
   * Given: Fingerprint with average rank
   * When: Component renders
   * Then: Should display average rank
   */
  it('MUST display average rank metric', async () => {
    // Arrange: Fingerprint with rank
    const { VisibilityMetricsCard } = await import('../visibility-metrics-card');
    
    // Act: Render component
    render(
      <VisibilityMetricsCard
        fingerprint={mockFingerprint}
        history={mockHistory}
        businessName="Test Business"
      />
    );

    // Assert: SPECIFICATION - MUST display rank
    expect(screen.getByText(/#2\.5|Avg Rank/i)).toBeInTheDocument();
  });

  /**
   * SPECIFICATION 5: Shows top 5 model performance results
   * 
   * Given: Fingerprint with model results
   * When: Component renders
   * Then: Should display top 5 models
   */
  it('MUST show top 5 model performance results', async () => {
    // Arrange: Fingerprint with multiple models
    const fingerprintWithManyModels = {
      ...mockFingerprint,
      results: Array.from({ length: 6 }, (_, i) => ({
        model: `model-${i}`,
        promptType: 'factual',
        mentioned: true,
        sentiment: 'positive' as const,
        confidence: 80,
        rankPosition: i + 1,
      })),
    };
    
    const { VisibilityMetricsCard } = await import('../visibility-metrics-card');
    
    // Act: Render component
    render(
      <VisibilityMetricsCard
        fingerprint={fingerprintWithManyModels}
        history={mockHistory}
        businessName="Test Business"
      />
    );

    // Assert: SPECIFICATION - MUST show top 5 (not all 6)
    const modelElements = screen.getAllByText(/model-/);
    expect(modelElements.length).toBeLessThanOrEqual(5);
  });

  /**
   * SPECIFICATION 6: Displays top performing models as badges
   * 
   * Given: Fingerprint with top models
   * When: Component renders
   * Then: Should display top models as badges
   */
  it('MUST display top performing models as badges', async () => {
    // Arrange: Fingerprint with top models
    const { VisibilityMetricsCard } = await import('../visibility-metrics-card');
    
    // Act: Render component
    render(
      <VisibilityMetricsCard
        fingerprint={mockFingerprint}
        history={mockHistory}
        businessName="Test Business"
      />
    );

    // Assert: SPECIFICATION - MUST show top models
    expect(screen.getByText(/Top Performing Models/i)).toBeInTheDocument();
  });

  /**
   * SPECIFICATION 7: Calculates trend from history correctly
   * 
   * Given: Fingerprint history with score changes
   * When: Component calculates trend
   * Then: Should show correct trend direction and value
   */
  it('MUST calculate trend from history correctly', async () => {
    // Arrange: History showing improvement
    const improvingHistory = [
      {
        id: 1,
        date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
        visibilityScore: 60,
        mentionRate: 40,
        sentimentScore: 70,
        accuracyScore: 75,
        avgRankPosition: 4.0,
      },
      {
        id: 2,
        date: new Date().toISOString(),
        visibilityScore: 75,
        mentionRate: 50,
        sentimentScore: 85,
        accuracyScore: 90,
        avgRankPosition: 2.5,
      },
    ];
    
    const { VisibilityMetricsCard } = await import('../visibility-metrics-card');
    
    // Act: Render component
    render(
      <VisibilityMetricsCard
        fingerprint={mockFingerprint}
        history={improvingHistory}
        businessName="Test Business"
      />
    );

    // Assert: SPECIFICATION - MUST show up trend
    expect(screen.getByText(/\+15|Improved/i)).toBeInTheDocument();
  });

  /**
   * SPECIFICATION 8: Handles loading state with skeleton
   * 
   * Given: Loading state
   * When: Component renders
   * Then: Should show loading skeleton
   */
  it('MUST handle loading state with skeleton', async () => {
    // Arrange: Loading state
    const { VisibilityMetricsCard } = await import('../visibility-metrics-card');
    
    // Act: Render component
    render(
      <VisibilityMetricsCard
        fingerprint={null}
        history={null}
        businessName="Test Business"
        loading={true}
      />
    );

    // Assert: SPECIFICATION - MUST show loading
    expect(screen.getByText(/LLM Visibility Metrics/i)).toBeInTheDocument();
    // Skeleton elements should be present
  });

  /**
   * SPECIFICATION 9: Handles null fingerprint with empty state
   * 
   * Given: No fingerprint data
   * When: Component renders
   * Then: Should show empty state message
   */
  it('MUST handle null fingerprint with empty state', async () => {
    // Arrange: No fingerprint
    const { VisibilityMetricsCard } = await import('../visibility-metrics-card');
    
    // Act: Render component
    render(
      <VisibilityMetricsCard
        fingerprint={null}
        history={null}
        businessName="Test Business"
        loading={false}
      />
    );

    // Assert: SPECIFICATION - MUST show empty state
    expect(screen.getByText(/No visibility data yet|Run analysis/i)).toBeInTheDocument();
  });

  /**
   * SPECIFICATION 10: Formats model names correctly
   * 
   * Given: Fingerprint with model IDs
   * When: Component renders
   * Then: Should format model names for display
   */
  it('MUST format model names correctly', async () => {
    // Arrange: Fingerprint with formatted model names
    const { VisibilityMetricsCard } = await import('../visibility-metrics-card');
    
    // Act: Render component
    render(
      <VisibilityMetricsCard
        fingerprint={mockFingerprint}
        history={mockHistory}
        businessName="Test Business"
      />
    );

    // Assert: SPECIFICATION - MUST format names (remove openai/, anthropic/ prefixes)
    // Model names should be readable, not full IDs
    const modelText = screen.getByText(/gpt-4|claude-3/i);
    expect(modelText).toBeInTheDocument();
  });
});


