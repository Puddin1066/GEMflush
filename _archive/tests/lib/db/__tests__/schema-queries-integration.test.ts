import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as queries from '../queries';
import type {
  User,
  Team,
  Business,
  WikidataEntity,
  LLMFingerprint,
  CrawlJob,
  Competitor,
} from '../schema';

/**
 * Integration Tests: Schema Contracts + Queries
 * 
 * Tests that query return types match schema contract types
 * Verifies type safety between schema definitions and query functions
 * 
 * SOLID: Single Responsibility - tests integration between schema and queries
 * DRY: Reusable type checking patterns
 */

// Mock dependencies
vi.mock('../drizzle', () => ({
  db: {
    select: vi.fn(),
    update: vi.fn(),
    insert: vi.fn(),
    query: {
      teamMembers: {
        findFirst: vi.fn(),
      },
    },
  },
}));

vi.mock('next/headers', () => ({
  cookies: vi.fn(),
}));

vi.mock('@/lib/auth/session', () => ({
  verifyToken: vi.fn(),
}));

describe('Schema Contracts + Queries Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getUser - Type Contract Compliance', () => {
    it('should return User type matching schema contract', async () => {
      const { cookies } = await import('next/headers');
      const { verifyToken } = await import('@/lib/auth/session');
      const { db } = await import('../drizzle');

      vi.mocked(cookies).mockResolvedValue({
        get: vi.fn().mockReturnValue({ value: 'valid-token' }),
      } as any);
      vi.mocked(verifyToken).mockResolvedValue({
        user: { id: 1 },
        expires: new Date(Date.now() + 3600000).toISOString(),
      } as any);

      const mockUser: User = {
        id: 1,
        email: 'test@example.com',
        passwordHash: 'hashed',
        name: 'Test User',
        role: 'member',
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockUser]),
          }),
        }),
      });
      vi.mocked(db.select).mockReturnValue(mockSelect() as any);

      const user = await queries.getUser();

      // Verify return type matches User contract
      expect(user).not.toBeNull();
      if (user) {
        // TypeScript ensures user matches User type
        expect(user.id).toBeDefined();
        expect(user.email).toBeDefined();
        expect(user.passwordHash).toBeDefined();
        expect(user.role).toBeDefined();
        expect(user.createdAt).toBeDefined();
        expect(user.updatedAt).toBeDefined();
        // deletedAt is optional
        expect('deletedAt' in user).toBe(true);
      }
    });
  });

  describe('getBusinessesByTeam - Type Contract Compliance', () => {
    it('should return Business[] matching schema contract', async () => {
      const { db } = await import('../drizzle');

      const mockBusinesses: Business[] = [
        {
          id: 1,
          teamId: 1,
          name: 'Business 1',
          url: 'https://business1.com',
          status: 'pending',
          createdAt: new Date(),
          updatedAt: new Date(),
          category: null,
          location: null,
          wikidataQID: null,
          wikidataPublishedAt: null,
          lastCrawledAt: null,
          crawlData: null,
          automationEnabled: false,
          nextCrawlAt: null,
          lastAutoPublishedAt: null,
        },
        {
          id: 2,
          teamId: 1,
          name: 'Business 2',
          url: 'https://business2.com',
          status: 'crawled',
          createdAt: new Date(),
          updatedAt: new Date(),
          category: 'technology',
          location: {
            city: 'San Francisco',
            state: 'CA',
            country: 'US',
          },
          wikidataQID: null,
          wikidataPublishedAt: null,
          lastCrawledAt: new Date(),
          crawlData: {
            phone: '+1-555-0123',
            email: 'info@business2.com',
          },
          automationEnabled: false,
          nextCrawlAt: null,
          lastAutoPublishedAt: null,
        },
      ];

      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue(mockBusinesses),
          }),
        }),
      });
      vi.mocked(db.select).mockReturnValue(mockSelect() as any);

      const businesses = await queries.getBusinessesByTeam(1);

      // Verify return type matches Business[] contract
      expect(Array.isArray(businesses)).toBe(true);
      expect(businesses.length).toBe(2);

      businesses.forEach((business) => {
        // TypeScript ensures business matches Business type
        expect(business.id).toBeDefined();
        expect(business.teamId).toBeDefined();
        expect(business.name).toBeDefined();
        expect(business.url).toBeDefined();
        expect(business.status).toBeDefined();
        expect(business.createdAt).toBeDefined();
        expect(business.updatedAt).toBeDefined();

        // JSONB fields should be accessible
        expect('location' in business).toBe(true);
        expect('crawlData' in business).toBe(true);
      });
    });
  });

  describe('getBusinessById - Type Contract Compliance', () => {
    it('should return Business | null matching schema contract', async () => {
      const { db } = await import('../drizzle');

      const mockBusiness: Business = {
        id: 1,
        teamId: 1,
        name: 'Test Business',
        url: 'https://test.com',
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
        category: 'technology',
        location: {
          city: 'San Francisco',
          state: 'CA',
          country: 'US',
          coordinates: {
            lat: 37.7749,
            lng: -122.4194,
          },
        },
        wikidataQID: 'Q123',
        wikidataPublishedAt: new Date(),
        lastCrawledAt: new Date(),
        crawlData: {
          phone: '+1-555-0123',
          email: 'info@test.com',
          description: 'A test business',
        },
        automationEnabled: true,
        nextCrawlAt: new Date(),
        lastAutoPublishedAt: new Date(),
      };

      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockBusiness]),
          }),
        }),
      });
      vi.mocked(db.select).mockReturnValue(mockSelect() as any);

      const business = await queries.getBusinessById(1);

      // Verify return type matches Business | null contract
      expect(business).not.toBeNull();
      if (business) {
        // TypeScript ensures business matches Business type
        expect(business.id).toBe(1);
        expect(business.name).toBe('Test Business');
        
        // Verify JSONB fields are accessible
        if (business.location) {
          expect(business.location.city).toBe('San Francisco');
          if (business.location.coordinates) {
            expect(business.location.coordinates.lat).toBe(37.7749);
          }
        }
        
        if (business.crawlData) {
          expect((business.crawlData as any)?.phone).toBe('+1-555-0123');
        }
      }
    });
  });

  describe('createBusiness - Type Contract Compliance', () => {
    it('should accept NewBusiness and return Business', async () => {
      const { db } = await import('../drizzle');

      const newBusiness = {
        teamId: 1,
        name: 'New Business',
        url: 'https://newbusiness.com',
        status: 'pending' as const,
        location: {
          city: 'San Francisco',
          state: 'CA',
          country: 'US',
        },
      };

      const createdBusiness: Business = {
        id: 1,
        ...newBusiness,
        createdAt: new Date(),
        updatedAt: new Date(),
        category: null,
        wikidataQID: null,
        wikidataPublishedAt: null,
        lastCrawledAt: null,
        crawlData: null,
        automationEnabled: false,
        nextCrawlAt: null,
        lastAutoPublishedAt: null,
      };

      const mockInsert = vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([createdBusiness]),
        }),
      });
      vi.mocked(db.insert).mockReturnValue(mockInsert() as any);

      const business = await queries.createBusiness(newBusiness);

      // Verify return type matches Business contract
      expect(business.id).toBeDefined();
      expect(business.name).toBe(newBusiness.name);
      expect(business.teamId).toBe(newBusiness.teamId);
      expect(business.createdAt).toBeDefined();
      expect(business.updatedAt).toBeDefined();
    });
  });

  describe('getLatestFingerprint - Type Contract Compliance', () => {
    it('should return LLMFingerprint | null matching schema contract', async () => {
      const { db } = await import('../drizzle');

      const mockFingerprint: LLMFingerprint = {
        id: 1,
        businessId: 1,
        visibilityScore: 75,
        mentionRate: 0.8,
        sentimentScore: 0.85,
        accuracyScore: 0.9,
        avgRankPosition: 2.5,
        llmResults: [
          {
            model: 'gpt-4',
            mentioned: true,
            sentiment: 'positive',
            confidence: 0.9,
          },
        ],
        competitiveBenchmark: {
          avgVisibility: 70,
          topCompetitor: 'Competitor Inc',
        },
        competitiveLeaderboard: {
          rank: 1,
          totalCompetitors: 5,
        },
        createdAt: new Date(),
      };

      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([mockFingerprint]),
            }),
          }),
        }),
      });
      vi.mocked(db.select).mockReturnValue(mockSelect() as any);

      const fingerprint = await queries.getLatestFingerprint(1);

      // Verify return type matches LLMFingerprint | null contract
      expect(fingerprint).not.toBeNull();
      if (fingerprint) {
        // TypeScript ensures fingerprint matches LLMFingerprint type
        expect(fingerprint.id).toBeDefined();
        expect(fingerprint.businessId).toBeDefined();
        expect(fingerprint.visibilityScore).toBeDefined();
        expect(fingerprint.createdAt).toBeDefined();
        
        // JSONB fields should be accessible
        expect('llmResults' in fingerprint).toBe(true);
        expect('competitiveBenchmark' in fingerprint).toBe(true);
        expect('competitiveLeaderboard' in fingerprint).toBe(true);
      }
    });
  });

  describe('getWikidataEntity - Type Contract Compliance', () => {
    it('should return WikidataEntity | null matching schema contract', async () => {
      const { db } = await import('../drizzle');

      const mockEntity: WikidataEntity = {
        id: 1,
        businessId: 1,
        qid: 'Q123',
        entityData: {
          labels: { en: { language: 'en', value: 'Test Business' } },
          descriptions: { en: { language: 'en', value: 'A test business' } },
          claims: {
            P31: [
              {
                mainsnak: {
                  snaktype: 'value',
                  property: 'P31',
                  datavalue: {
                    type: 'wikibase-entityid',
                    value: { 'entity-type': 'item', id: 'Q4830453' },
                  },
                },
                type: 'statement',
              },
            ],
          },
        },
        publishedTo: 'test.wikidata.org',
        version: 1,
        enrichmentLevel: 1,
        publishedAt: new Date(),
        lastEnrichedAt: new Date(),
      };

      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([mockEntity]),
            }),
          }),
        }),
      });
      vi.mocked(db.select).mockReturnValue(mockSelect() as any);

      const entity = await queries.getWikidataEntity(1);

      // Verify return type matches WikidataEntity | null contract
      expect(entity).not.toBeNull();
      if (entity) {
        // TypeScript ensures entity matches WikidataEntity type
        expect(entity.id).toBeDefined();
        expect(entity.businessId).toBeDefined();
        expect(entity.qid).toBeDefined();
        expect(entity.publishedTo).toBeDefined();
        expect(entity.publishedAt).toBeDefined();
        
        // JSONB entityData should be accessible
        expect('entityData' in entity).toBe(true);
        if (entity.entityData) {
          expect((entity.entityData as any)?.labels).toBeDefined();
          expect((entity.entityData as any)?.claims).toBeDefined();
        }
      }
    });
  });

  describe('createCrawlJob - Type Contract Compliance', () => {
    it('should accept NewCrawlJob and return CrawlJob', async () => {
      const { db } = await import('../drizzle');

      const newJob = {
        businessId: 1,
        jobType: 'initial_crawl' as const,
        status: 'queued' as const,
        progress: 0,
      };

      const createdJob: CrawlJob = {
        id: 1,
        ...newJob,
        result: null,
        errorMessage: null,
        completedAt: null,
        createdAt: new Date(),
      };

      const mockInsert = vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([createdJob]),
        }),
      });
      vi.mocked(db.insert).mockReturnValue(mockInsert() as any);

      const job = await queries.createCrawlJob(newJob);

      // Verify return type matches CrawlJob contract
      expect(job.id).toBeDefined();
      expect(job.businessId).toBe(newJob.businessId);
      expect(job.jobType).toBe(newJob.jobType);
      expect(job.status).toBe(newJob.status);
      expect(job.createdAt).toBeDefined();
    });
  });

  describe('Type Safety: Query Returns Match Schema Types', () => {
    it('should ensure getUser returns User | null', async () => {
      const { cookies } = await import('next/headers');
      const { verifyToken } = await import('@/lib/auth/session');
      const { db } = await import('../drizzle');

      vi.mocked(cookies).mockResolvedValue({
        get: vi.fn().mockReturnValue(null),
      } as any);

      const user = await queries.getUser();

      // TypeScript ensures return type is User | null
      if (user) {
        // If user exists, it must match User type
        const userType: User = user;
        expect(userType.id).toBeDefined();
        expect(userType.email).toBeDefined();
      } else {
        expect(user).toBeNull();
      }
    });

    it('should ensure getBusinessesByTeam returns Business[]', async () => {
      const { db } = await import('../drizzle');

      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue([]),
          }),
        }),
      });
      vi.mocked(db.select).mockReturnValue(mockSelect() as any);

      const businesses = await queries.getBusinessesByTeam(1);

      // TypeScript ensures return type is Business[]
      const businessesType: Business[] = businesses;
      expect(Array.isArray(businessesType)).toBe(true);
    });

    it('should ensure getBusinessById returns Business | null', async () => {
      const { db } = await import('../drizzle');

      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      });
      vi.mocked(db.select).mockReturnValue(mockSelect() as any);

      const business = await queries.getBusinessById(1);

      // TypeScript ensures return type is Business | null
      if (business) {
        const businessType: Business = business;
        expect(businessType.id).toBeDefined();
      } else {
        expect(business).toBeNull();
      }
    });
  });

  describe('JSONB Field Type Safety', () => {
    it('should maintain type safety for Business location JSONB field', async () => {
      const { db } = await import('../drizzle');

      const mockBusiness: Business = {
        id: 1,
        teamId: 1,
        name: 'Test',
        url: 'https://test.com',
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
        location: {
          city: 'San Francisco',
          state: 'CA',
          country: 'US',
          coordinates: {
            lat: 37.7749,
            lng: -122.4194,
          },
        },
        category: null,
        wikidataQID: null,
        wikidataPublishedAt: null,
        lastCrawledAt: null,
        crawlData: null,
        automationEnabled: false,
        nextCrawlAt: null,
        lastAutoPublishedAt: null,
      };

      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockBusiness]),
          }),
        }),
      });
      vi.mocked(db.select).mockReturnValue(mockSelect() as any);

      const business = await queries.getBusinessById(1);

      if (business && business.location) {
        // TypeScript should enforce location structure
        expect(business.location.city).toBeDefined();
        expect(business.location.state).toBeDefined();
        expect(business.location.country).toBeDefined();
        
        if (business.location.coordinates) {
          expect(typeof business.location.coordinates.lat).toBe('number');
          expect(typeof business.location.coordinates.lng).toBe('number');
        }
      }
    });

    it('should maintain type safety for WikidataEntity entityData JSONB field', async () => {
      const { db } = await import('../drizzle');

      const mockEntity: WikidataEntity = {
        id: 1,
        businessId: 1,
        qid: 'Q123',
        entityData: {
          labels: { en: { language: 'en', value: 'Test' } },
          descriptions: { en: { language: 'en', value: 'Test description' } },
          claims: {},
        },
        publishedTo: 'test.wikidata.org',
        publishedAt: new Date(),
        version: null,
        enrichmentLevel: null,
        lastEnrichedAt: null,
      };

      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([mockEntity]),
            }),
          }),
        }),
      });
      vi.mocked(db.select).mockReturnValue(mockSelect() as any);

      const entity = await queries.getWikidataEntity(1);

      if (entity && entity.entityData) {
        // TypeScript should allow access to entityData structure
        const entityData = entity.entityData as any;
        expect(entityData.labels).toBeDefined();
        expect(entityData.descriptions).toBeDefined();
        expect(entityData.claims).toBeDefined();
      }
    });
  });
});

