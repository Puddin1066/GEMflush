import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getWikidataPublishDTO } from '../wikidata-dto';

// Mock database
vi.mock('@/lib/db/drizzle', () => ({
  db: {
    query: {
      businesses: {
        findFirst: vi.fn(),
      },
    },
  },
}));

// Mock entity builder
vi.mock('@/lib/wikidata/entity-builder', () => ({
  entityBuilder: {
    buildEntity: vi.fn(),
  },
}));

// Mock notability checker
vi.mock('@/lib/wikidata/notability-checker', () => ({
  notabilityChecker: {
    checkNotability: vi.fn(),
  },
}));

describe('getWikidataPublishDTO', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const createMockBusiness = (overrides?: any) => ({
    id: 1,
    name: 'Test Business',
    location: {
      city: 'San Francisco',
      state: 'CA',
      country: 'USA',
    },
    crawlData: {
      name: 'Test Business',
      description: 'A test business',
    },
    ...overrides,
  });

  const createMockEntity = () => ({
    labels: {
      en: { value: 'Test Business' },
    },
    descriptions: {
      en: { value: 'A test business' },
    },
    claims: {
      P31: [{ mainsnak: { datavalue: { value: 'Q4830453' } } }],
      P17: [{ mainsnak: { datavalue: { value: 'Q30' } } }],
    },
  });

  const createMockNotabilityResult = (overrides?: any) => ({
    isNotable: true,
    confidence: 0.8,
    reasons: ['Has multiple references', 'Appears in news'],
    seriousReferenceCount: 5,
    references: [
      {
        title: 'Reference 1',
        url: 'https://example.com/ref1',
        source: 'News Site',
      },
      {
        title: 'Reference 2',
        url: 'https://example.com/ref2',
        source: 'Government Site',
      },
    ],
    assessment: {
      recommendations: ['Continue building references'],
      references: [
        { trustScore: 90 },
        { trustScore: 85 },
        { trustScore: 80 },
      ],
    },
    ...overrides,
  });

  it('should return DTO with correct structure', async () => {
    const { db } = await import('@/lib/db/drizzle');
    const { entityBuilder } = await import('@/lib/wikidata/entity-builder');
    const { notabilityChecker } = await import('@/lib/wikidata/notability-checker');

    vi.mocked(db.query.businesses.findFirst).mockResolvedValue(createMockBusiness() as any);
    vi.mocked(entityBuilder.buildEntity).mockResolvedValue(createMockEntity() as any);
    vi.mocked(notabilityChecker.checkNotability).mockResolvedValue(
      createMockNotabilityResult() as any
    );

    const dto = await getWikidataPublishDTO(1);

    expect(dto).toMatchObject({
      businessId: 1,
      businessName: 'Test Business',
      entity: {
        label: 'Test Business',
        description: 'A test business',
        claimCount: 2,
      },
      notability: {
        isNotable: true,
        confidence: 0.8,
        reasons: expect.any(Array),
        seriousReferenceCount: 5,
        topReferences: expect.any(Array),
      },
      canPublish: true,
      recommendation: expect.any(String),
      fullEntity: expect.any(Object),
    });
  });

  it('should throw error when business not found', async () => {
    const { db } = await import('@/lib/db/drizzle');
    vi.mocked(db.query.businesses.findFirst).mockResolvedValue(null);

    await expect(getWikidataPublishDTO(999)).rejects.toThrow('Business not found');
  });

  it('should determine canPublish based on notability and confidence', async () => {
    const { db } = await import('@/lib/db/drizzle');
    const { entityBuilder } = await import('@/lib/wikidata/entity-builder');
    const { notabilityChecker } = await import('@/lib/wikidata/notability-checker');

    vi.mocked(db.query.businesses.findFirst).mockResolvedValue(createMockBusiness() as any);
    vi.mocked(entityBuilder.buildEntity).mockResolvedValue(createMockEntity() as any);

    // Notable with high confidence - can publish
    vi.mocked(notabilityChecker.checkNotability).mockResolvedValue(
      createMockNotabilityResult({ isNotable: true, confidence: 0.8 }) as any
    );
    const publishable = await getWikidataPublishDTO(1);
    expect(publishable.canPublish).toBe(true);

    // Notable but low confidence - cannot publish
    vi.mocked(notabilityChecker.checkNotability).mockResolvedValue(
      createMockNotabilityResult({ isNotable: true, confidence: 0.6 }) as any
    );
    const lowConfidence = await getWikidataPublishDTO(1);
    expect(lowConfidence.canPublish).toBe(false);

    // Not notable - cannot publish
    vi.mocked(notabilityChecker.checkNotability).mockResolvedValue(
      createMockNotabilityResult({ isNotable: false, confidence: 0.5 }) as any
    );
    const notNotable = await getWikidataPublishDTO(1);
    expect(notNotable.canPublish).toBe(false);
  });

  it('should build appropriate recommendation messages', async () => {
    const { db } = await import('@/lib/db/drizzle');
    const { entityBuilder } = await import('@/lib/wikidata/entity-builder');
    const { notabilityChecker } = await import('@/lib/wikidata/notability-checker');

    vi.mocked(db.query.businesses.findFirst).mockResolvedValue(createMockBusiness() as any);
    vi.mocked(entityBuilder.buildEntity).mockResolvedValue(createMockEntity() as any);

    // Ready to publish
    vi.mocked(notabilityChecker.checkNotability).mockResolvedValue(
      createMockNotabilityResult({ isNotable: true, confidence: 0.8, seriousReferenceCount: 5 }) as any
    );
    const ready = await getWikidataPublishDTO(1);
    expect(ready.recommendation).toContain('Ready to publish');

    // Not notable
    vi.mocked(notabilityChecker.checkNotability).mockResolvedValue(
      createMockNotabilityResult({
        isNotable: false,
        assessment: {
          recommendations: ['Get more references'],
        },
      }) as any
    );
    const notNotable = await getWikidataPublishDTO(1);
    expect(notNotable.recommendation).toContain('Do not publish');

    // Low confidence
    vi.mocked(notabilityChecker.checkNotability).mockResolvedValue(
      createMockNotabilityResult({ isNotable: true, confidence: 0.6 }) as any
    );
    const lowConf = await getWikidataPublishDTO(1);
    expect(lowConf.recommendation).toContain('Manual review');
  });

  it('should extract top references with trust scores', async () => {
    const { db } = await import('@/lib/db/drizzle');
    const { entityBuilder } = await import('@/lib/wikidata/entity-builder');
    const { notabilityChecker } = await import('@/lib/wikidata/notability-checker');

    vi.mocked(db.query.businesses.findFirst).mockResolvedValue(createMockBusiness() as any);
    vi.mocked(entityBuilder.buildEntity).mockResolvedValue(createMockEntity() as any);
    vi.mocked(notabilityChecker.checkNotability).mockResolvedValue(
      createMockNotabilityResult({
        references: [
          { title: 'Ref 1', url: 'https://example.com/1', source: 'Source 1' },
          { title: 'Ref 2', url: 'https://example.com/2', source: 'Source 2' },
          { title: 'Ref 3', url: 'https://example.com/3', source: 'Source 3' },
          { title: 'Ref 4', url: 'https://example.com/4', source: 'Source 4' },
        ],
        assessment: {
          references: [
            { trustScore: 90 },
            { trustScore: 85 },
            { trustScore: 80 },
          ],
        },
      }) as any
    );

    const dto = await getWikidataPublishDTO(1);

    expect(dto.notability.topReferences).toHaveLength(3);
    expect(dto.notability.topReferences[0]).toMatchObject({
      title: 'Ref 1',
      url: 'https://example.com/1',
      source: 'Source 1',
      trustScore: 90,
    });
  });

  it('should use default trust score when not provided', async () => {
    const { db } = await import('@/lib/db/drizzle');
    const { entityBuilder } = await import('@/lib/wikidata/entity-builder');
    const { notabilityChecker } = await import('@/lib/wikidata/notability-checker');

    vi.mocked(db.query.businesses.findFirst).mockResolvedValue(createMockBusiness() as any);
    vi.mocked(entityBuilder.buildEntity).mockResolvedValue(createMockEntity() as any);
    vi.mocked(notabilityChecker.checkNotability).mockResolvedValue(
      createMockNotabilityResult({
        references: [
          { title: 'Ref 1', url: 'https://example.com/1', source: 'Source 1' },
        ],
        assessment: {
          recommendations: [],
          references: undefined, // No trust scores provided
        },
      }) as any
    );

    const dto = await getWikidataPublishDTO(1);

    expect(dto.notability.topReferences[0].trustScore).toBe(50);
  });

  it('should handle business without location', async () => {
    const { db } = await import('@/lib/db/drizzle');
    const { entityBuilder } = await import('@/lib/wikidata/entity-builder');
    const { notabilityChecker } = await import('@/lib/wikidata/notability-checker');

    vi.mocked(db.query.businesses.findFirst).mockResolvedValue(
      createMockBusiness({ location: null }) as any
    );
    vi.mocked(entityBuilder.buildEntity).mockResolvedValue(createMockEntity() as any);
    vi.mocked(notabilityChecker.checkNotability).mockResolvedValue(
      createMockNotabilityResult() as any
    );

    const dto = await getWikidataPublishDTO(1);

    expect(dto).toBeDefined();
    expect(notabilityChecker.checkNotability).toHaveBeenCalledWith('Test Business', undefined);
  });

  it('should use fallback label and description', async () => {
    const { db } = await import('@/lib/db/drizzle');
    const { entityBuilder } = await import('@/lib/wikidata/entity-builder');
    const { notabilityChecker } = await import('@/lib/wikidata/notability-checker');

    vi.mocked(db.query.businesses.findFirst).mockResolvedValue(createMockBusiness() as any);
    vi.mocked(entityBuilder.buildEntity).mockResolvedValue({
      labels: {},
      descriptions: {},
      claims: {},
    } as any);
    vi.mocked(notabilityChecker.checkNotability).mockResolvedValue(
      createMockNotabilityResult() as any
    );

    const dto = await getWikidataPublishDTO(1);

    expect(dto.entity.label).toBe('Test Business');
    expect(dto.entity.description).toBe('');
  });
});

