/**
 * Entity Preview Card Component Tests
 * Tests LLM visibility section addition
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EntityPreviewCard } from '../entity-preview-card';
import type { WikidataEntityDetailDTO } from '@/lib/data/types';

describe('EntityPreviewCard - LLM Visibility Section', () => {
  const createMockEntity = (overrides?: Partial<WikidataEntityDetailDTO>): WikidataEntityDetailDTO => ({
    label: 'Test Business',
    description: 'A test business',
    qid: null,
    wikidataUrl: null,
    stats: {
      totalClaims: 5,
      claimsWithReferences: 3,
      referenceQuality: 'high' as const,
    },
    lastUpdated: null,
    ...overrides,
  });

  it('should display LLM Visibility section', () => {
    const entity = createMockEntity();
    render(
      <EntityPreviewCard
        entity={entity}
        onPublish={() => {}}
        onPreview={() => {}}
      />
    );

    expect(screen.getByText('LLM Visibility')).toBeInTheDocument();
  });

  it('should list major LLMs that can discover the entity', () => {
    const entity = createMockEntity();
    render(
      <EntityPreviewCard
        entity={entity}
        onPublish={() => {}}
        onPreview={() => {}}
      />
    );

    expect(screen.getByText('ChatGPT')).toBeInTheDocument();
    expect(screen.getByText('Claude')).toBeInTheDocument();
    expect(screen.getByText('Perplexity')).toBeInTheDocument();
    expect(screen.getByText('Google Gemini')).toBeInTheDocument();
  });

  it('should show "Active in knowledge graph" for published entities', () => {
    const entity = createMockEntity({
      qid: 'Q12345',
      wikidataUrl: 'https://www.wikidata.org/wiki/Q12345',
    });

    render(
      <EntityPreviewCard
        entity={entity}
        onPublish={() => {}}
        onPreview={() => {}}
      />
    );

    const activeText = screen.getByText(/Active in knowledge graph/i);
    expect(activeText).toBeInTheDocument();
    // QID appears in multiple places, verify it's in the active text context
    expect(activeText.textContent).toContain('Q12345');
  });

  it('should not show "Active in knowledge graph" for unpublished entities', () => {
    const entity = createMockEntity({ qid: null });

    render(
      <EntityPreviewCard
        entity={entity}
        onPublish={() => {}}
        onPreview={() => {}}
      />
    );

    expect(screen.queryByText(/Active in knowledge graph/i)).not.toBeInTheDocument();
  });
});

