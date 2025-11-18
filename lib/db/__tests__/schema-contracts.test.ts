import { describe, it, expect } from 'vitest';
import {
  users,
  teams,
  teamMembers,
  businesses,
  wikidataEntities,
  llmFingerprints,
  crawlJobs,
  competitors,
  qidCache,
  type User,
  type NewUser,
  type Team,
  type NewTeam,
  type Business,
  type NewBusiness,
  type WikidataEntity,
  type NewWikidataEntity,
  type LLMFingerprint,
  type NewLLMFingerprint,
  type CrawlJob,
  type NewCrawlJob,
  type Competitor,
  type NewCompetitor,
  type QidCache,
  type NewQidCache,
} from '../schema';

/**
 * Unit Tests for Database Schema Contracts
 * 
 * Tests the Drizzle ORM schema type inference and contract structure
 * SOLID: Single Responsibility - tests schema types only
 * DRY: Reusable test fixtures
 */

describe('Database Schema Contracts', () => {
  // DRY: Reusable test fixtures
  const createValidUser = (): NewUser => ({
    email: 'test@example.com',
    passwordHash: 'hashed_password',
    name: 'Test User',
    role: 'member',
  });

  const createValidTeam = (): NewTeam => ({
    name: 'Test Team',
  });

  const createValidBusiness = (teamId: number): NewBusiness => ({
    teamId,
    name: 'Test Business',
    url: 'https://testbusiness.com',
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
    status: 'pending',
  });

  describe('User Schema Contract', () => {
    it('should infer correct User type from schema', () => {
      const user: User = {
        id: 1,
        email: 'test@example.com',
        passwordHash: 'hashed',
        name: 'Test User',
        role: 'member',
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      expect(user.id).toBe(1);
      expect(user.email).toBe('test@example.com');
      expect(user.role).toBe('member');
    });

    it('should infer correct NewUser type from schema', () => {
      const newUser: NewUser = createValidUser();

      expect(newUser.email).toBe('test@example.com');
      expect(newUser.passwordHash).toBe('hashed_password');
      // id, createdAt, updatedAt should not be required for NewUser
      expect('id' in newUser).toBe(false);
    });

    it('should enforce required fields in NewUser', () => {
      // TypeScript should enforce required fields
      const newUser: NewUser = {
        email: 'required@example.com',
        passwordHash: 'required',
        // name and role are optional
      };

      expect(newUser.email).toBeDefined();
      expect(newUser.passwordHash).toBeDefined();
    });

    it('should allow optional fields in User', () => {
      const user: User = {
        id: 1,
        email: 'test@example.com',
        passwordHash: 'hashed',
        name: null, // Optional
        role: 'member',
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null, // Optional
      };

      expect(user.name).toBeNull();
      expect(user.deletedAt).toBeNull();
    });
  });

  describe('Team Schema Contract', () => {
    it('should infer correct Team type from schema', () => {
      const team: Team = {
        id: 1,
        name: 'Test Team',
        createdAt: new Date(),
        updatedAt: new Date(),
        stripeCustomerId: 'cus_123',
        stripeSubscriptionId: 'sub_123',
        stripeProductId: 'prod_123',
        planName: 'Pro',
        subscriptionStatus: 'active',
      };

      expect(team.id).toBe(1);
      expect(team.name).toBe('Test Team');
      expect(team.stripeCustomerId).toBe('cus_123');
    });

    it('should infer correct NewTeam type from schema', () => {
      const newTeam: NewTeam = createValidTeam();

      expect(newTeam.name).toBe('Test Team');
      // Stripe fields should be optional
      expect('stripeCustomerId' in newTeam).toBe(false);
    });

    it('should allow optional Stripe fields', () => {
      const team: Team = {
        id: 1,
        name: 'Test Team',
        createdAt: new Date(),
        updatedAt: new Date(),
        stripeCustomerId: null,
        stripeSubscriptionId: null,
        stripeProductId: null,
        planName: null,
        subscriptionStatus: null,
      };

      expect(team.stripeCustomerId).toBeNull();
    });
  });

  describe('Business Schema Contract', () => {
    it('should infer correct Business type from schema', () => {
      const business: Business = {
        id: 1,
        teamId: 1,
        name: 'Test Business',
        url: 'https://test.com',
        category: 'technology',
        location: {
          city: 'San Francisco',
          state: 'CA',
          country: 'US',
        },
        wikidataQID: null,
        wikidataPublishedAt: null,
        lastCrawledAt: null,
        crawlData: null,
        status: 'pending',
        automationEnabled: false,
        nextCrawlAt: null,
        lastAutoPublishedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(business.id).toBe(1);
      expect(business.name).toBe('Test Business');
      expect(business.status).toBe('pending');
    });

    it('should infer correct NewBusiness type from schema', () => {
      const newBusiness: NewBusiness = createValidBusiness(1);

      expect(newBusiness.teamId).toBe(1);
      expect(newBusiness.name).toBe('Test Business');
      expect(newBusiness.status).toBe('pending');
      // id, createdAt, updatedAt should not be required
      expect('id' in newBusiness).toBe(false);
    });

    it('should handle JSONB location field correctly', () => {
      const business: Business = {
        id: 1,
        teamId: 1,
        name: 'Test Business',
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

      expect(business.location).toBeDefined();
      expect(business.location?.city).toBe('San Francisco');
      expect(business.location?.coordinates?.lat).toBe(37.7749);
    });

    it('should handle JSONB crawlData field correctly', () => {
      const business: Business = {
        id: 1,
        teamId: 1,
        name: 'Test Business',
        url: 'https://test.com',
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
        crawlData: {
          phone: '+1-555-0123',
          email: 'info@test.com',
          description: 'A test business',
          socialLinks: {
            twitter: 'https://twitter.com/test',
            linkedin: 'https://linkedin.com/company/test',
          },
        },
        location: null,
        category: null,
        wikidataQID: null,
        wikidataPublishedAt: null,
        lastCrawledAt: null,
        automationEnabled: false,
        nextCrawlAt: null,
        lastAutoPublishedAt: null,
      };

      expect(business.crawlData).toBeDefined();
      expect((business.crawlData as any)?.phone).toBe('+1-555-0123');
    });

    it('should enforce required fields in NewBusiness', () => {
      const newBusiness: NewBusiness = {
        teamId: 1,
        name: 'Required Name',
        url: 'https://required.com',
        status: 'pending',
        // category, location are optional
      };

      expect(newBusiness.teamId).toBeDefined();
      expect(newBusiness.name).toBeDefined();
      expect(newBusiness.url).toBeDefined();
      expect(newBusiness.status).toBeDefined();
    });
  });

  describe('WikidataEntity Schema Contract', () => {
    it('should infer correct WikidataEntity type from schema', () => {
      const entity: WikidataEntity = {
        id: 1,
        businessId: 1,
        qid: 'Q123',
        entityData: {
          labels: { en: { language: 'en', value: 'Test' } },
          descriptions: { en: { language: 'en', value: 'Test description' } },
          claims: {},
        },
        publishedTo: 'test.wikidata.org',
        version: 1,
        enrichmentLevel: 1,
        publishedAt: new Date(),
        lastEnrichedAt: null,
      };

      expect(entity.id).toBe(1);
      expect(entity.qid).toBe('Q123');
      expect(entity.publishedTo).toBe('test.wikidata.org');
    });

    it('should infer correct NewWikidataEntity type from schema', () => {
      const newEntity: NewWikidataEntity = {
        businessId: 1,
        qid: 'Q123',
        entityData: {
          labels: { en: { language: 'en', value: 'Test' } },
          descriptions: { en: { language: 'en', value: 'Test' } },
          claims: {},
        },
        publishedTo: 'test.wikidata.org',
      };

      expect(newEntity.businessId).toBe(1);
      expect(newEntity.qid).toBe('Q123');
      // version, enrichmentLevel, publishedAt should not be required
      expect('version' in newEntity).toBe(false);
    });

    it('should handle JSONB entityData field correctly', () => {
      const entity: WikidataEntity = {
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
        publishedAt: new Date(),
        version: null,
        enrichmentLevel: null,
        lastEnrichedAt: null,
      };

      expect(entity.entityData).toBeDefined();
      expect((entity.entityData as any)?.labels?.en?.value).toBe('Test Business');
      expect((entity.entityData as any)?.claims?.P31).toBeDefined();
    });
  });

  describe('LLMFingerprint Schema Contract', () => {
    it('should infer correct LLMFingerprint type from schema', () => {
      const fingerprint: LLMFingerprint = {
        id: 1,
        businessId: 1,
        visibilityScore: 75,
        mentionRate: 0.8,
        sentimentScore: 0.85,
        accuracyScore: 0.9,
        avgRankPosition: 2.5,
        llmResults: [],
        competitiveBenchmark: null,
        competitiveLeaderboard: null,
        createdAt: new Date(),
      };

      expect(fingerprint.id).toBe(1);
      expect(fingerprint.visibilityScore).toBe(75);
      expect(fingerprint.mentionRate).toBe(0.8);
    });

    it('should infer correct NewLLMFingerprint type from schema', () => {
      const newFingerprint: NewLLMFingerprint = {
        businessId: 1,
        visibilityScore: 75,
      };

      expect(newFingerprint.businessId).toBe(1);
      expect(newFingerprint.visibilityScore).toBe(75);
      // mentionRate, sentimentScore, etc. are optional
      expect('mentionRate' in newFingerprint).toBe(false);
    });

    it('should handle JSONB llmResults field correctly', () => {
      const fingerprint: LLMFingerprint = {
        id: 1,
        businessId: 1,
        visibilityScore: 75,
        createdAt: new Date(),
        llmResults: [
          {
            model: 'gpt-4',
            mentioned: true,
            sentiment: 'positive',
            confidence: 0.9,
          },
        ],
        mentionRate: null,
        sentimentScore: null,
        accuracyScore: null,
        avgRankPosition: null,
        competitiveBenchmark: null,
        competitiveLeaderboard: null,
      };

      expect(fingerprint.llmResults).toBeDefined();
      expect(Array.isArray(fingerprint.llmResults)).toBe(true);
    });
  });

  describe('CrawlJob Schema Contract', () => {
    it('should infer correct CrawlJob type from schema', () => {
      const job: CrawlJob = {
        id: 1,
        businessId: 1,
        jobType: 'initial_crawl',
        status: 'queued',
        progress: 0,
        result: null,
        errorMessage: null,
        completedAt: null,
        createdAt: new Date(),
      };

      expect(job.id).toBe(1);
      expect(job.jobType).toBe('initial_crawl');
      expect(job.status).toBe('queued');
    });

    it('should infer correct NewCrawlJob type from schema', () => {
      const newJob: NewCrawlJob = {
        businessId: 1,
        jobType: 'initial_crawl',
        status: 'queued',
      };

      expect(newJob.businessId).toBe(1);
      expect(newJob.jobType).toBe('initial_crawl');
      // progress, result, etc. are optional
      expect('progress' in newJob).toBe(false);
    });

    it('should handle JSONB result field correctly', () => {
      const job: CrawlJob = {
        id: 1,
        businessId: 1,
        jobType: 'initial_crawl',
        status: 'completed',
        createdAt: new Date(),
        result: {
          success: true,
          data: {
            phone: '+1-555-0123',
            email: 'info@test.com',
          },
        },
        progress: null,
        errorMessage: null,
        completedAt: null,
      };

      expect(job.result).toBeDefined();
      expect((job.result as any)?.success).toBe(true);
    });
  });

  describe('Competitor Schema Contract', () => {
    it('should infer correct Competitor type from schema', () => {
      const competitor: Competitor = {
        id: 1,
        businessId: 1,
        competitorBusinessId: 2,
        competitorName: 'Competitor Inc',
        competitorUrl: 'https://competitor.com',
        addedBy: 'user',
        createdAt: new Date(),
      };

      expect(competitor.id).toBe(1);
      expect(competitor.businessId).toBe(1);
      expect(competitor.competitorBusinessId).toBe(2);
    });

    it('should infer correct NewCompetitor type from schema', () => {
      const newCompetitor: NewCompetitor = {
        businessId: 1,
        competitorName: 'Competitor Inc',
        competitorUrl: 'https://competitor.com',
        addedBy: 'user',
      };

      expect(newCompetitor.businessId).toBe(1);
      expect(newCompetitor.addedBy).toBe('user');
      // competitorBusinessId is optional
      expect('competitorBusinessId' in newCompetitor).toBe(false);
    });
  });

  describe('QidCache Schema Contract', () => {
    it('should infer correct QidCache type from schema', () => {
      const cache: QidCache = {
        id: 1,
        entityType: 'city',
        searchKey: 'San Francisco, CA',
        qid: 'Q62',
        source: 'local_mapping',
        queryCount: 5,
        lastQueriedAt: new Date(),
        validatedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(cache.id).toBe(1);
      expect(cache.entityType).toBe('city');
      expect(cache.qid).toBe('Q62');
      expect(cache.source).toBe('local_mapping');
    });

    it('should infer correct NewQidCache type from schema', () => {
      const newCache: NewQidCache = {
        entityType: 'city',
        searchKey: 'San Francisco, CA',
        qid: 'Q62',
        source: 'local_mapping',
      };

      expect(newCache.entityType).toBe('city');
      expect(newCache.searchKey).toBe('San Francisco, CA');
      // queryCount, lastQueriedAt, etc. have defaults
      expect('queryCount' in newCache).toBe(false);
    });
  });

  describe('Schema Type Compatibility', () => {
    it('should ensure Select and Insert types are compatible', () => {
      // NewUser should be assignable to User (after insert)
      const newUser: NewUser = createValidUser();
      
      // After insert, NewUser fields should match User fields
      const user: User = {
        id: 1,
        ...newUser,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      expect(user.email).toBe(newUser.email);
      expect(user.passwordHash).toBe(newUser.passwordHash);
    });

    it('should ensure Business location type matches JSONB structure', () => {
      const business: Business = {
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

      // TypeScript should enforce the location structure
      if (business.location) {
        expect(business.location.city).toBeDefined();
        expect(business.location.state).toBeDefined();
        expect(business.location.country).toBeDefined();
        if (business.location.coordinates) {
          expect(typeof business.location.coordinates.lat).toBe('number');
          expect(typeof business.location.coordinates.lng).toBe('number');
        }
      }
    });
  });

  describe('Schema Default Values', () => {
    it('should handle default values correctly', () => {
      // User role defaults to 'member'
      const newUser: NewUser = {
        email: 'test@example.com',
        passwordHash: 'hashed',
        // role should default to 'member' in database
      };

      expect(newUser.email).toBeDefined();
      // TypeScript allows omitting default fields in NewUser
    });

    it('should handle Business status default', () => {
      const newBusiness: NewBusiness = {
        teamId: 1,
        name: 'Test',
        url: 'https://test.com',
        // status defaults to 'pending' in database
      };

      expect(newBusiness.teamId).toBeDefined();
      // TypeScript allows omitting default fields
    });
  });
});

