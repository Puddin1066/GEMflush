import { describe, it, expect } from 'vitest';
import type {
  DashboardDTO,
  DashboardBusinessDTO,
  BusinessDetailDTO,
  ActivityDTO,
  FingerprintDetailDTO,
  FingerprintResultDTO,
  CompetitiveLeaderboardDTO,
  CompetitorDTO,
  WikidataPublishDTO,
  WikidataStatusDTO,
  WikidataEntityDetailDTO,
  WikidataClaimDTO,
  WikidataPropertySuggestionDTO,
  CrawlResultDTO,
} from '../types';

/**
 * Unit Tests for DTO Type Contracts
 * 
 * Tests the DTO type definitions to ensure they match expected structure
 * SOLID: Single Responsibility - tests DTO type contracts only
 * DRY: Reusable test fixtures
 */

describe('DTO Type Contracts', () => {
  // DRY: Reusable test fixtures
  const createDashboardBusinessDTO = (): DashboardBusinessDTO => ({
    id: '1',
    name: 'Test Business',
    location: 'San Francisco, CA',
    visibilityScore: 75,
    trend: 'up',
    trendValue: 5,
    wikidataQid: 'Q123',
    lastFingerprint: '2 days ago',
    status: 'published',
  });

  const createFingerprintResultDTO = (): FingerprintResultDTO => ({
    model: 'gpt-4-turbo',
    mentioned: true,
    sentiment: 'positive',
    confidence: 90,
    rankPosition: 1,
  });

  const createCompetitorDTO = (): CompetitorDTO => ({
    rank: 1,
    name: 'Competitor Inc',
    mentionCount: 10,
    avgPosition: 2.5,
    appearsWithTarget: 5,
    marketShare: 30,
    badge: 'top',
  });

  describe('DashboardDTO Contract', () => {
    it('should match DashboardDTO structure', () => {
      const dto: DashboardDTO = {
        totalBusinesses: 5,
        wikidataEntities: 3,
        avgVisibilityScore: 75,
        businesses: [createDashboardBusinessDTO()],
      };

      expect(dto.totalBusinesses).toBe(5);
      expect(dto.wikidataEntities).toBe(3);
      expect(dto.avgVisibilityScore).toBe(75);
      expect(Array.isArray(dto.businesses)).toBe(true);
    });

    it('should enforce required fields', () => {
      const dto: DashboardDTO = {
        totalBusinesses: 0,
        wikidataEntities: 0,
        avgVisibilityScore: 0,
        businesses: [],
      };

      expect(dto.totalBusinesses).toBeDefined();
      expect(dto.wikidataEntities).toBeDefined();
      expect(dto.avgVisibilityScore).toBeDefined();
      expect(dto.businesses).toBeDefined();
    });
  });

  describe('DashboardBusinessDTO Contract', () => {
    it('should match DashboardBusinessDTO structure', () => {
      const dto: DashboardBusinessDTO = createDashboardBusinessDTO();

      expect(dto.id).toBe('1');
      expect(typeof dto.id).toBe('string'); // ID must be string
      expect(dto.name).toBe('Test Business');
      expect(dto.location).toBe('San Francisco, CA');
      expect(dto.visibilityScore).toBe(75);
      expect(dto.trend).toBe('up');
      expect(dto.wikidataQid).toBe('Q123');
      expect(dto.status).toBe('published');
    });

    it('should allow null visibilityScore', () => {
      const dto: DashboardBusinessDTO = {
        ...createDashboardBusinessDTO(),
        visibilityScore: null,
      };

      expect(dto.visibilityScore).toBeNull();
    });

    it('should enforce trend union type', () => {
      const dto: DashboardBusinessDTO = {
        ...createDashboardBusinessDTO(),
        trend: 'down', // Valid
      };

      expect(['up', 'down', 'neutral']).toContain(dto.trend);
    });

    it('should enforce status union type', () => {
      const dto: DashboardBusinessDTO = {
        ...createDashboardBusinessDTO(),
        status: 'pending', // Valid
      };

      expect(['published', 'pending', 'crawled']).toContain(dto.status);
    });
  });

  describe('BusinessDetailDTO Contract', () => {
    it('should match BusinessDetailDTO structure', () => {
      const dto: BusinessDetailDTO = {
        id: '1',
        name: 'Test Business',
        url: 'https://test.com',
        description: 'A test business',
        location: {
          city: 'San Francisco',
          state: 'CA',
          country: 'US',
          coordinates: {
            lat: 37.7749,
            lng: -122.4194,
          },
        },
        crawlInfo: {
          lastCrawled: '2 days ago',
          phone: '+1-555-0123',
          email: 'info@test.com',
          socialLinks: {
            twitter: 'https://twitter.com/test',
            linkedin: 'https://linkedin.com/company/test',
          },
        },
        visibilityInfo: {
          score: 75,
          trend: 'up',
          lastChecked: '1 day ago',
          summary: 'Mentioned in 3/5 models',
        },
        wikidataInfo: {
          qid: 'Q123',
          url: 'https://www.wikidata.org/wiki/Q123',
          status: 'published',
        },
        status: 'published',
        createdAt: '2025-01-01',
      };

      expect(dto.id).toBe('1');
      expect(dto.location?.city).toBe('San Francisco');
      expect(dto.crawlInfo?.phone).toBe('+1-555-0123');
      expect(dto.visibilityInfo?.score).toBe(75);
      expect(dto.wikidataInfo?.qid).toBe('Q123');
    });

    it('should allow null optional fields', () => {
      const dto: BusinessDetailDTO = {
        id: '1',
        name: 'Test Business',
        url: null,
        description: null,
        location: null,
        crawlInfo: null,
        visibilityInfo: null,
        wikidataInfo: null,
        status: 'pending',
        createdAt: '2025-01-01',
      };

      expect(dto.url).toBeNull();
      expect(dto.location).toBeNull();
      expect(dto.crawlInfo).toBeNull();
    });

    it('should allow optional coordinates in location', () => {
      const dto: BusinessDetailDTO = {
        id: '1',
        name: 'Test Business',
        url: null,
        description: null,
        location: {
          city: 'San Francisco',
          state: 'CA',
          country: 'US',
          // coordinates is optional
        },
        crawlInfo: null,
        visibilityInfo: null,
        wikidataInfo: null,
        status: 'pending',
        createdAt: '2025-01-01',
      };

      expect(dto.location?.coordinates).toBeUndefined();
    });
  });

  describe('ActivityDTO Contract', () => {
    it('should match ActivityDTO structure', () => {
      const dto: ActivityDTO = {
        id: '1',
        type: 'crawl',
        businessId: '1',
        businessName: 'Test Business',
        status: 'completed',
        message: 'Crawl completed successfully',
        timestamp: '2 hours ago',
        details: {
          progress: 100,
          result: 'Success',
        },
      };

      expect(dto.id).toBe('1');
      expect(dto.type).toBe('crawl');
      expect(dto.status).toBe('completed');
      expect(dto.details?.progress).toBe(100);
    });

    it('should enforce type union', () => {
      const dto: ActivityDTO = {
        id: '1',
        type: 'fingerprint', // Valid
        businessId: '1',
        businessName: 'Test',
        status: 'completed',
        message: 'Test',
        timestamp: 'now',
      };

      expect(['crawl', 'fingerprint', 'publish']).toContain(dto.type);
    });

    it('should enforce status union', () => {
      const dto: ActivityDTO = {
        id: '1',
        type: 'crawl',
        businessId: '1',
        businessName: 'Test',
        status: 'failed', // Valid
        message: 'Test',
        timestamp: 'now',
      };

      expect(['completed', 'failed', 'processing', 'queued']).toContain(dto.status);
    });

    it('should allow optional details', () => {
      const dto: ActivityDTO = {
        id: '1',
        type: 'crawl',
        businessId: '1',
        businessName: 'Test',
        status: 'completed',
        message: 'Test',
        timestamp: 'now',
        // details is optional
      };

      expect(dto.details).toBeUndefined();
    });
  });

  describe('FingerprintDetailDTO Contract', () => {
    it('should match FingerprintDetailDTO structure', () => {
      const dto: FingerprintDetailDTO = {
        visibilityScore: 75,
        trend: 'up',
        summary: {
          mentionRate: 60,
          sentiment: 'positive',
          topModels: ['gpt-4', 'claude-3'],
          averageRank: 2.5,
        },
        results: [createFingerprintResultDTO()],
        competitiveLeaderboard: null,
        createdAt: '2025-01-01',
      };

      expect(dto.visibilityScore).toBe(75);
      expect(dto.trend).toBe('up');
      expect(dto.summary.mentionRate).toBe(60);
      expect(dto.summary.sentiment).toBe('positive');
      expect(Array.isArray(dto.results)).toBe(true);
    });

    it('should enforce trend union', () => {
      const dto: FingerprintDetailDTO = {
        visibilityScore: 75,
        trend: 'down', // Valid
        summary: {
          mentionRate: 60,
          sentiment: 'positive',
          topModels: [],
          averageRank: null,
        },
        results: [],
        competitiveLeaderboard: null,
        createdAt: '2025-01-01',
      };

      expect(['up', 'down', 'neutral']).toContain(dto.trend);
    });

    it('should enforce sentiment union', () => {
      const dto: FingerprintDetailDTO = {
        visibilityScore: 75,
        trend: 'neutral',
        summary: {
          mentionRate: 60,
          sentiment: 'negative', // Valid
          topModels: [],
          averageRank: null,
        },
        results: [],
        competitiveLeaderboard: null,
        createdAt: '2025-01-01',
      };

      expect(['positive', 'neutral', 'negative']).toContain(dto.summary.sentiment);
    });

    it('should allow null averageRank', () => {
      const dto: FingerprintDetailDTO = {
        visibilityScore: 75,
        trend: 'neutral',
        summary: {
          mentionRate: 60,
          sentiment: 'positive',
          topModels: [],
          averageRank: null,
        },
        results: [],
        competitiveLeaderboard: null,
        createdAt: '2025-01-01',
      };

      expect(dto.summary.averageRank).toBeNull();
    });
  });

  describe('FingerprintResultDTO Contract', () => {
    it('should match FingerprintResultDTO structure', () => {
      const dto: FingerprintResultDTO = createFingerprintResultDTO();

      expect(dto.model).toBe('gpt-4-turbo');
      expect(dto.mentioned).toBe(true);
      expect(dto.sentiment).toBe('positive');
      expect(dto.confidence).toBe(90);
      expect(dto.rankPosition).toBe(1);
    });

    it('should allow null rankPosition', () => {
      const dto: FingerprintResultDTO = {
        ...createFingerprintResultDTO(),
        rankPosition: null,
      };

      expect(dto.rankPosition).toBeNull();
    });

    it('should enforce sentiment union', () => {
      const dto: FingerprintResultDTO = {
        ...createFingerprintResultDTO(),
        sentiment: 'neutral', // Valid
      };

      expect(['positive', 'neutral', 'negative']).toContain(dto.sentiment);
    });
  });

  describe('CompetitiveLeaderboardDTO Contract', () => {
    it('should match CompetitiveLeaderboardDTO structure', () => {
      const dto: CompetitiveLeaderboardDTO = {
        targetBusiness: {
          name: 'Test Business',
          rank: 1,
          mentionCount: 10,
          mentionRate: 80,
        },
        competitors: [createCompetitorDTO()],
        totalQueries: 50,
        insights: {
          marketPosition: 'leading',
          topCompetitor: 'Competitor Inc',
          competitiveGap: 5,
          recommendation: 'Continue current strategy',
        },
      };

      expect(dto.targetBusiness.name).toBe('Test Business');
      expect(dto.targetBusiness.rank).toBe(1);
      expect(Array.isArray(dto.competitors)).toBe(true);
      expect(dto.insights.marketPosition).toBe('leading');
    });

    it('should allow null rank in targetBusiness', () => {
      const dto: CompetitiveLeaderboardDTO = {
        targetBusiness: {
          name: 'Test Business',
          rank: null,
          mentionCount: 10,
          mentionRate: 80,
        },
        competitors: [],
        totalQueries: 50,
        insights: {
          marketPosition: 'unknown',
          topCompetitor: null,
          competitiveGap: null,
          recommendation: 'Need more data',
        },
      };

      expect(dto.targetBusiness.rank).toBeNull();
    });

    it('should enforce marketPosition union', () => {
      const dto: CompetitiveLeaderboardDTO = {
        targetBusiness: {
          name: 'Test',
          rank: null,
          mentionCount: 0,
          mentionRate: 0,
        },
        competitors: [],
        totalQueries: 0,
        insights: {
          marketPosition: 'competitive', // Valid
          topCompetitor: null,
          competitiveGap: null,
          recommendation: 'Test',
        },
      };

      expect(['leading', 'competitive', 'emerging', 'unknown']).toContain(
        dto.insights.marketPosition
      );
    });
  });

  describe('CompetitorDTO Contract', () => {
    it('should match CompetitorDTO structure', () => {
      const dto: CompetitorDTO = createCompetitorDTO();

      expect(dto.rank).toBe(1);
      expect(dto.name).toBe('Competitor Inc');
      expect(dto.mentionCount).toBe(10);
      expect(dto.avgPosition).toBe(2.5);
      expect(dto.marketShare).toBe(30);
      expect(dto.badge).toBe('top');
    });

    it('should allow optional badge', () => {
      const dto: CompetitorDTO = {
        ...createCompetitorDTO(),
        badge: undefined,
      };

      expect(dto.badge).toBeUndefined();
    });

    it('should enforce badge union', () => {
      const dto: CompetitorDTO = {
        ...createCompetitorDTO(),
        badge: 'rising', // Valid
      };

      expect(['top', 'rising', 'declining']).toContain(dto.badge);
    });
  });

  describe('WikidataPublishDTO Contract', () => {
    it('should match WikidataPublishDTO structure', () => {
      const dto: WikidataPublishDTO = {
        businessId: 1,
        businessName: 'Test Business',
        entity: {
          label: 'Test Business',
          description: 'A test business',
          claimCount: 5,
        },
        notability: {
          isNotable: true,
          confidence: 0.8,
          reasons: ['Has multiple references', 'Appears in news'],
          seriousReferenceCount: 5,
          topReferences: [
            {
              title: 'Reference 1',
              url: 'https://example.com/ref1',
              source: 'News Site',
              trustScore: 90,
            },
          ],
        },
        canPublish: true,
        recommendation: 'Ready to publish',
      };

      expect(dto.businessId).toBe(1);
      expect(dto.entity.label).toBe('Test Business');
      expect(dto.notability.isNotable).toBe(true);
      expect(dto.canPublish).toBe(true);
    });

    it('should enforce boolean fields', () => {
      const dto: WikidataPublishDTO = {
        businessId: 1,
        businessName: 'Test',
        entity: {
          label: 'Test',
          description: 'Test',
          claimCount: 0,
        },
        notability: {
          isNotable: false,
          confidence: 0.5,
          reasons: [],
          seriousReferenceCount: 0,
          topReferences: [],
        },
        canPublish: false,
        recommendation: 'Not ready',
      };

      expect(typeof dto.notability.isNotable).toBe('boolean');
      expect(typeof dto.canPublish).toBe('boolean');
    });
  });

  describe('WikidataStatusDTO Contract', () => {
    it('should match WikidataStatusDTO structure', () => {
      const dto: WikidataStatusDTO = {
        qid: 'Q123',
        status: 'published',
        url: 'https://www.wikidata.org/wiki/Q123',
        lastChecked: '2 days ago',
        claimCount: 5,
        notabilityScore: 80,
      };

      expect(dto.qid).toBe('Q123');
      expect(dto.status).toBe('published');
      expect(dto.claimCount).toBe(5);
    });

    it('should allow null qid', () => {
      const dto: WikidataStatusDTO = {
        qid: null,
        status: 'not-started',
        url: null,
        lastChecked: null,
        claimCount: 0,
        notabilityScore: null,
      };

      expect(dto.qid).toBeNull();
      expect(dto.status).toBe('not-started');
    });

    it('should enforce status union', () => {
      const dto: WikidataStatusDTO = {
        qid: null,
        status: 'pending', // Valid
        url: null,
        lastChecked: null,
        claimCount: 0,
        notabilityScore: null,
      };

      expect(['published', 'pending', 'not-started']).toContain(dto.status);
    });
  });

  describe('WikidataEntityDetailDTO Contract', () => {
    it('should match WikidataEntityDetailDTO structure', () => {
      const dto: WikidataEntityDetailDTO = {
        qid: 'Q123',
        label: 'Test Business',
        description: 'A test business',
        wikidataUrl: 'https://www.wikidata.org/wiki/Q123',
        lastUpdated: '2 days ago',
        claims: [],
        stats: {
          totalClaims: 5,
          claimsWithReferences: 3,
          referenceQuality: 'high',
        },
        canEdit: true,
        editUrl: 'https://www.wikidata.org/wiki/Q123#edit',
      };

      expect(dto.qid).toBe('Q123');
      expect(dto.label).toBe('Test Business');
      expect(Array.isArray(dto.claims)).toBe(true);
      expect(dto.stats.totalClaims).toBe(5);
      expect(dto.canEdit).toBe(true);
    });

    it('should enforce referenceQuality union', () => {
      const dto: WikidataEntityDetailDTO = {
        qid: 'Q123',
        label: 'Test',
        description: 'Test',
        wikidataUrl: null,
        lastUpdated: null,
        claims: [],
        stats: {
          totalClaims: 0,
          claimsWithReferences: 0,
          referenceQuality: 'medium', // Valid
        },
        canEdit: false,
        editUrl: null,
      };

      expect(['high', 'medium', 'low']).toContain(dto.stats.referenceQuality);
    });
  });

  describe('WikidataClaimDTO Contract', () => {
    it('should match WikidataClaimDTO structure with string value', () => {
      const dto: WikidataClaimDTO = {
        pid: 'P31',
        propertyLabel: 'instance of',
        propertyDescription: 'Type of entity',
        value: 'business',
        valueType: 'string',
        references: [],
        rank: 'preferred',
        hasQualifiers: false,
      };

      expect(dto.pid).toBe('P31');
      expect(dto.valueType).toBe('string');
      expect(typeof dto.value).toBe('string');
    });

    it('should match WikidataClaimDTO structure with item value', () => {
      const dto: WikidataClaimDTO = {
        pid: 'P31',
        propertyLabel: 'instance of',
        value: {
          qid: 'Q4830453',
          label: 'business',
        },
        valueType: 'item',
        references: [],
        rank: 'normal',
        hasQualifiers: true,
      };

      expect(dto.valueType).toBe('item');
      if (typeof dto.value === 'object' && 'qid' in dto.value) {
        expect(dto.value.qid).toBe('Q4830453');
        expect(dto.value.label).toBe('business');
      }
    });

    it('should enforce valueType union', () => {
      const dto: WikidataClaimDTO = {
        pid: 'P31',
        propertyLabel: 'instance of',
        value: 'test',
        valueType: 'url', // Valid
        references: [],
        rank: 'normal',
        hasQualifiers: false,
      };

      expect(['item', 'string', 'time', 'quantity', 'coordinate', 'url']).toContain(
        dto.valueType
      );
    });

    it('should enforce rank union', () => {
      const dto: WikidataClaimDTO = {
        pid: 'P31',
        propertyLabel: 'instance of',
        value: 'test',
        valueType: 'string',
        references: [],
        rank: 'deprecated', // Valid
        hasQualifiers: false,
      };

      expect(['preferred', 'normal', 'deprecated']).toContain(dto.rank);
    });
  });

  describe('WikidataPropertySuggestionDTO Contract', () => {
    it('should match WikidataPropertySuggestionDTO structure', () => {
      const dto: WikidataPropertySuggestionDTO = {
        pid: 'P17',
        propertyLabel: 'country',
        description: 'Country where entity is located',
        suggestedValue: 'United States',
        confidence: 85,
        reasoning: 'Business is located in US',
        priority: 'high',
      };

      expect(dto.pid).toBe('P17');
      expect(dto.confidence).toBe(85);
      expect(dto.priority).toBe('high');
    });

    it('should enforce priority union', () => {
      const dto: WikidataPropertySuggestionDTO = {
        pid: 'P17',
        propertyLabel: 'country',
        description: 'Test',
        suggestedValue: 'Test',
        confidence: 50,
        reasoning: 'Test',
        priority: 'low', // Valid
      };

      expect(['high', 'medium', 'low']).toContain(dto.priority);
    });
  });

  describe('CrawlResultDTO Contract', () => {
    it('should match CrawlResultDTO structure', () => {
      const dto: CrawlResultDTO = {
        success: true,
        status: 'completed',
        lastCrawled: '2 days ago',
        data: {
          phone: '+1-555-0123',
          email: 'info@test.com',
          socialLinks: {
            twitter: 'https://twitter.com/test',
            linkedin: 'https://linkedin.com/company/test',
          },
          description: 'A test business',
          founded: '2020',
          categories: ['technology', 'software'],
        },
        errorMessage: null,
      };

      expect(dto.success).toBe(true);
      expect(dto.status).toBe('completed');
      expect(dto.data?.phone).toBe('+1-555-0123');
      expect(Array.isArray(dto.data?.categories)).toBe(true);
    });

    it('should allow null data on failure', () => {
      const dto: CrawlResultDTO = {
        success: false,
        status: 'failed',
        lastCrawled: null,
        data: null,
        errorMessage: 'Connection timeout',
      };

      expect(dto.success).toBe(false);
      expect(dto.data).toBeNull();
      expect(dto.errorMessage).toBe('Connection timeout');
    });

    it('should enforce status union', () => {
      const dto: CrawlResultDTO = {
        success: false,
        status: 'processing', // Valid
        lastCrawled: null,
        data: null,
        errorMessage: null,
      };

      expect(['completed', 'failed', 'processing']).toContain(dto.status);
    });
  });

  describe('DTO Type Compatibility', () => {
    it('should ensure DashboardBusinessDTO fields are strings where required', () => {
      const dto: DashboardBusinessDTO = createDashboardBusinessDTO();

      // ID must be string (not number)
      expect(typeof dto.id).toBe('string');
      expect(typeof dto.name).toBe('string');
      expect(typeof dto.location).toBe('string');
      expect(typeof dto.lastFingerprint).toBe('string');
    });

    it('should ensure BusinessDetailDTO uses formatted strings for dates', () => {
      const dto: BusinessDetailDTO = {
        id: '1',
        name: 'Test',
        url: null,
        description: null,
        location: null,
        crawlInfo: null,
        visibilityInfo: null,
        wikidataInfo: null,
        status: 'pending',
        createdAt: '2025-01-01', // Formatted string, not Date
      };

      expect(typeof dto.createdAt).toBe('string');
      expect(dto.createdAt).toMatch(/\d{4}-\d{2}-\d{2}/);
    });

    it('should ensure DTOs use union types correctly', () => {
      // Test that union types are enforced
      const trend: 'up' | 'down' | 'neutral' = 'up';
      const status: 'published' | 'pending' | 'crawled' = 'published';
      const sentiment: 'positive' | 'neutral' | 'negative' = 'positive';

      expect(['up', 'down', 'neutral']).toContain(trend);
      expect(['published', 'pending', 'crawled']).toContain(status);
      expect(['positive', 'neutral', 'negative']).toContain(sentiment);
    });
  });
});

