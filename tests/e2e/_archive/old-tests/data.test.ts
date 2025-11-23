import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock all dependencies
vi.mock('@/lib/db/queries', () => ({
  getUser: vi.fn(),
  getTeamForUser: vi.fn(),
  getBusinessesByTeam: vi.fn(),
  getLatestFingerprint: vi.fn(),
  getBusinessById: vi.fn(),
}));

vi.mock('@/lib/db/drizzle', () => ({
  db: {
    query: {
      businesses: {
        findFirst: vi.fn(),
      },
    },
  },
}));

vi.mock('@/lib/wikidata/entity-builder', () => ({
  entityBuilder: {
    buildEntity: vi.fn(),
  },
}));

vi.mock('@/lib/wikidata/notability-checker', () => ({
  notabilityChecker: {
    checkNotability: vi.fn(),
  },
}));

describe('Data DTO E2E Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Dashboard DTO Flow', () => {
    it('should complete dashboard data flow from database to DTO', async () => {
      const { getDashboardDTO } = await import('@/lib/data/dashboard-dto');
      const { getBusinessesByTeam, getLatestFingerprint } = await import('@/lib/db/queries');

      const mockBusinesses = [
        {
          id: 1,
          name: 'Business 1',
          location: { city: 'SF', state: 'CA' },
          wikidataQID: 'Q123',
          status: 'published',
        },
        {
          id: 2,
          name: 'Business 2',
          location: { city: 'NYC', state: 'NY' },
          wikidataQID: null,
          status: 'pending',
        },
      ];

      vi.mocked(getBusinessesByTeam).mockResolvedValue(mockBusinesses as any);
      vi.mocked(getLatestFingerprint)
        .mockResolvedValueOnce({ visibilityScore: 80, createdAt: new Date() } as any)
        .mockResolvedValueOnce(null);

      const dto = await getDashboardDTO(1);

      expect(dto.totalBusinesses).toBe(2);
      expect(dto.wikidataEntities).toBe(1);
      expect(dto.businesses).toHaveLength(2);
      expect(dto.businesses[0].visibilityScore).toBe(80);
      expect(dto.businesses[1].visibilityScore).toBeNull();
    });
  });

  describe('Fingerprint DTO Flow', () => {
    it('should complete fingerprint transformation flow', async () => {
      const { toFingerprintDetailDTO } = await import('@/lib/data/fingerprint-dto');

      const analysis = {
        businessId: 1,
        businessName: 'Test Business',
        visibilityScore: 75,
        mentionRate: 60,
        sentimentScore: 0.8,
        avgRankPosition: 2.5,
        llmResults: [
          {
            model: 'openai/gpt-4-turbo',
            promptType: 'recommendation',
            mentioned: true,
            sentiment: 'positive',
            accuracy: 0.9,
            rankPosition: 1,
            rawResponse: 'Test',
            tokensUsed: 100,
          },
        ],
        generatedAt: new Date(),
      };

      const previousAnalysis = {
        ...analysis,
        visibilityScore: 65, // 75 - 65 = 10, which is > 5 threshold
      };

      const dto = toFingerprintDetailDTO(analysis as any, previousAnalysis as any);

      expect(dto.visibilityScore).toBe(75);
      expect(dto.trend).toBe('up');
      expect(dto.summary.sentiment).toBe('positive');
      expect(dto.results).toHaveLength(1);
      expect(dto.results[0]).not.toHaveProperty('rawResponse');
    });
  });

  describe('Wikidata DTO Flow', () => {
    it('should complete wikidata publish DTO flow', async () => {
      const { getWikidataPublishDTO } = await import('@/lib/data/wikidata-dto');
      const { db } = await import('@/lib/db/drizzle');
      const { entityBuilder } = await import('@/lib/wikidata/entity-builder');
      const { notabilityChecker } = await import('@/lib/wikidata/notability-checker');

      const mockBusiness = {
        id: 1,
        name: 'Test Business',
        location: { city: 'SF', state: 'CA' },
        crawlData: { name: 'Test Business' },
      };

      const mockEntity = {
        labels: { en: { value: 'Test Business' } },
        descriptions: { en: { value: 'A business' } },
        claims: { P31: [{}] },
      };

      const mockNotability = {
        isNotable: true,
        confidence: 0.8,
        reasons: ['Has references'],
        seriousReferenceCount: 5,
        references: [{ title: 'Ref 1', url: 'https://example.com', source: 'News' }],
        assessment: {
          recommendations: [],
          references: [{ trustScore: 90 }],
        },
      };

      vi.mocked(db.query.businesses.findFirst).mockResolvedValue(mockBusiness as any);
      vi.mocked(entityBuilder.buildEntity).mockResolvedValue(mockEntity as any);
      vi.mocked(notabilityChecker.checkNotability).mockResolvedValue(mockNotability as any);

      const dto = await getWikidataPublishDTO(1);

      expect(dto.businessId).toBe(1);
      expect(dto.canPublish).toBe(true);
      expect(dto.entity.label).toBe('Test Business');
      expect(dto.notability.isNotable).toBe(true);
      expect(dto.notability.topReferences).toHaveLength(1);
    });
  });
});

