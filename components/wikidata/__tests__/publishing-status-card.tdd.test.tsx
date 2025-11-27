/**
 * TDD Test: Publishing Status Card Component - Tests Drive Implementation
 * 
 * SPECIFICATION: Publishing Status Card Component
 * 
 * As a user
 * I want to see Wikidata publishing status and impact
 * So that I can understand if my business can be published and what the benefits are
 * 
 * Acceptance Criteria:
 * 1. Displays published status when isPublished=true and wikidataQID exists
 * 2. Shows entity stats (claims, languages, references) when published
 * 3. Displays notability check when not published
 * 4. Shows publishing impact preview with boost percentage
 * 5. Shows auto-progress indicator when showAutoProgress=true
 * 6. Renders publish button when not published and notability passed
 * 7. Links to Wikidata entity page when published
 * 8. Handles loading state
 * 9. Handles null entity gracefully
 * 
 * TDD Cycle: RED → GREEN → REFACTOR
 * Tests written FIRST to drive implementation
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { WikidataEntityDetailDTO, WikidataPublishDTO } from '@/lib/data/types';

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

describe('🔴 RED: PublishingStatusCard Component Specification', () => {
  let mockEntity: WikidataEntityDetailDTO;
  let mockPublishData: WikidataPublishDTO;

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockEntity = {
      qid: 'Q123456',
      label: 'Test Business',
      description: 'A test business',
      wikidataUrl: 'https://test.wikidata.org/wiki/Q123456',
      lastUpdated: new Date().toISOString(),
      claims: [],
      stats: {
        totalClaims: 10,
        claimsWithReferences: 8,
        referenceQuality: 'high',
      },
      canEdit: true,
      editUrl: 'https://test.wikidata.org/wiki/Q123456',
    };

    mockPublishData = {
      businessId: 1,
      businessName: 'Test Business',
      entity: {
        label: 'Test Business',
        description: 'A test business',
        claimCount: 10,
      },
      notability: {
        isNotable: true,
        confidence: 0.85,
        reasons: ['Has website', 'Has location'],
        seriousReferenceCount: 5,
        topReferences: [],
      },
      canPublish: true,
      recommendation: 'Business meets notability standards',
    };
  });

  /**
   * SPECIFICATION 1: Displays published status when isPublished=true and wikidataQID exists
   * 
   * Given: Business is published with QID
   * When: Component renders
   * Then: Should display published status with QID
   */
  it('MUST display published status when isPublished=true and wikidataQID exists', async () => {
    // Arrange: Published business
    const { PublishingStatusCard } = await import('../publishing-status-card');
    
    // Act: Render component (TEST DRIVES IMPLEMENTATION)
    render(
      <PublishingStatusCard
        entity={mockEntity}
        publishData={null}
        businessId={1}
        businessName="Test Business"
        isPublished={true}
        wikidataQID="Q123456"
      />
    );

    // Assert: SPECIFICATION - MUST display published status
    expect(screen.getByText(/Published/i)).toBeInTheDocument();
    expect(screen.getByText(/Q123456/i)).toBeInTheDocument();
  });

  /**
   * SPECIFICATION 2: Shows entity stats when published
   * 
   * Given: Published entity with stats
   * When: Component renders
   * Then: Should display claims, languages, references counts
   */
  it('MUST show entity stats (claims, languages, references) when published', async () => {
    // Arrange: Published entity with stats
    const entityWithStats = {
      ...mockEntity,
      stats: {
        totalClaims: 15,
        claimsWithReferences: 12,
        referenceQuality: 'high' as const,
      },
    };
    
    const { PublishingStatusCard } = await import('../publishing-status-card');
    
    // Act: Render component
    render(
      <PublishingStatusCard
        entity={entityWithStats}
        publishData={null}
        businessId={1}
        businessName="Test Business"
        isPublished={true}
        wikidataQID="Q123456"
      />
    );

    // Assert: SPECIFICATION - MUST show stats
    expect(screen.getByText(/15/i)).toBeInTheDocument(); // Claims
    // Note: Languages and references may need to be added to stats
  });

  /**
   * SPECIFICATION 3: Displays notability check when not published
   * 
   * Given: Not published business with publish data
   * When: Component renders
   * Then: Should display notability check information
   */
  it('MUST display notability check when not published', async () => {
    // Arrange: Not published with notability data
    const { PublishingStatusCard } = await import('../publishing-status-card');
    
    // Act: Render component
    render(
      <PublishingStatusCard
        entity={null}
        publishData={mockPublishData}
        businessId={1}
        businessName="Test Business"
        isPublished={false}
        wikidataQID={null}
      />
    );

    // Assert: SPECIFICATION - MUST display notability check
    expect(screen.getByText(/Notability|Meets Notability Standards/i)).toBeInTheDocument();
    expect(screen.getByText(/85/i)).toBeInTheDocument(); // Confidence percentage
  });

  /**
   * SPECIFICATION 4: Shows publishing impact preview with boost percentage
   * 
   * Given: Not published business
   * When: Component renders
   * Then: Should display potential visibility boost percentage
   */
  it('MUST show publishing impact preview with boost percentage', async () => {
    // Arrange: Not published with entity data for impact calculation
    const { PublishingStatusCard } = await import('../publishing-status-card');
    
    // Act: Render component
    render(
      <PublishingStatusCard
        entity={mockEntity}
        publishData={mockPublishData}
        businessId={1}
        businessName="Test Business"
        isPublished={false}
        wikidataQID={null}
      />
    );

    // Assert: SPECIFICATION - MUST show impact preview
    expect(screen.getByText(/Potential Visibility Boost|Boost/i)).toBeInTheDocument();
    expect(screen.getByText(/\+.*%/)).toBeInTheDocument(); // Boost percentage
  });

  /**
   * SPECIFICATION 5: Shows auto-progress indicator when showAutoProgress=true
   * 
   * Given: Auto-publishing in progress
   * When: Component renders
   * Then: Should display auto-progress indicator
   */
  it('MUST show auto-progress indicator when showAutoProgress=true', async () => {
    // Arrange: Auto-publishing
    const { PublishingStatusCard } = await import('../publishing-status-card');
    
    // Act: Render component
    render(
      <PublishingStatusCard
        entity={null}
        publishData={mockPublishData}
        businessId={1}
        businessName="Test Business"
        isPublished={false}
        wikidataQID={null}
        publishing={true}
        showAutoProgress={true}
      />
    );

    // Assert: SPECIFICATION - MUST show auto-progress
    expect(screen.getByText(/Auto-publishing|publishing in progress/i)).toBeInTheDocument();
  });

  /**
   * SPECIFICATION 6: Renders publish button when not published and notability passed
   * 
   * Given: Not published, notability passed, onPublish handler provided
   * When: Component renders
   * Then: Should display publish button
   */
  it('MUST render publish button when not published and notability passed', async () => {
    // Arrange: Not published, can publish
    const mockOnPublish = vi.fn();
    const { PublishingStatusCard } = await import('../publishing-status-card');
    
    // Act: Render component
    render(
      <PublishingStatusCard
        entity={null}
        publishData={mockPublishData}
        businessId={1}
        businessName="Test Business"
        isPublished={false}
        wikidataQID={null}
        onPublish={mockOnPublish}
      />
    );

    // Assert: SPECIFICATION - MUST show publish button
    expect(screen.getByRole('button', { name: /Publish to Wikidata/i })).toBeInTheDocument();
  });

  /**
   * SPECIFICATION 7: Links to Wikidata entity page when published
   * 
   * Given: Published entity with QID
   * When: Component renders
   * Then: Should have link to Wikidata entity page
   */
  it('MUST link to Wikidata entity page when published', async () => {
    // Arrange: Published entity
    const { PublishingStatusCard } = await import('../publishing-status-card');
    
    // Act: Render component
    render(
      <PublishingStatusCard
        entity={mockEntity}
        publishData={null}
        businessId={1}
        businessName="Test Business"
        isPublished={true}
        wikidataQID="Q123456"
      />
    );

    // Assert: SPECIFICATION - MUST have link
    const link = screen.getByRole('link', { name: /View on Wikidata/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', expect.stringContaining('Q123456'));
  });

  /**
   * SPECIFICATION 8: Handles null entity gracefully
   * 
   * Given: No entity data
   * When: Component renders
   * Then: Should not crash and show appropriate state
   */
  it('MUST handle null entity gracefully', async () => {
    // Arrange: No entity
    const { PublishingStatusCard } = await import('../publishing-status-card');
    
    // Act: Render component
    render(
      <PublishingStatusCard
        entity={null}
        publishData={mockPublishData}
        businessId={1}
        businessName="Test Business"
        isPublished={false}
        wikidataQID={null}
      />
    );

    // Assert: SPECIFICATION - MUST not crash
    expect(screen.getByText(/Wikidata Publishing/i)).toBeInTheDocument();
  });
});


