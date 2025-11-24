/**
 * TDD Test Helpers
 * 
 * Centralized test utilities following TDD principles:
 * - DRY: Reusable test data factories
 * - SOLID: Single responsibility per helper
 * - Test Isolation: Each helper is independent
 * 
 * Usage in TDD workflow:
 * 1. RED: Write failing test using these helpers
 * 2. GREEN: Implement minimal code to pass
 * 3. REFACTOR: Improve while keeping tests green
 */

import type { Business, Team, CrawlJob } from '@/lib/db/schema';
import { vi } from 'vitest';

/**
 * Business Test Factory
 * Creates test business objects with sensible defaults
 */
export class BusinessTestFactory {
  /**
   * Create a pending business (default state)
   */
  static create(overrides?: Partial<Business>): Business {
    const now = new Date();
    return {
      id: 1,
      teamId: 1,
      name: 'Test Business',
      url: 'https://example.com',
      category: 'Restaurant',
      location: {
        city: 'Seattle',
        state: 'WA',
        country: 'US',
      },
      status: 'pending',
      automationEnabled: false,
      nextCrawlAt: null,
      lastCrawledAt: null,
      crawlData: null,
      wikidataQID: null,
      wikidataPublishedAt: null,
      lastAutoPublishedAt: null,
      errorMessage: null,
      createdAt: now,
      updatedAt: now,
      ...overrides,
    } as Business;
  }

  /**
   * Create a business that has been crawled
   */
  static createCrawled(overrides?: Partial<Business>): Business {
    return this.create({
      status: 'crawled',
      lastCrawledAt: new Date(),
      crawlData: {
        name: 'Test Business',
        description: 'A test business',
        phone: '555-0100',
        email: 'test@example.com',
      },
      ...overrides,
    });
  }

  /**
   * Create a business with error status
   */
  static createWithError(errorMessage: string, overrides?: Partial<Business>): Business {
    return this.create({
      status: 'error',
      errorMessage,
      ...overrides,
    });
  }

  /**
   * Create a published business
   */
  static createPublished(overrides?: Partial<Business>): Business {
    return this.createCrawled({
      status: 'published',
      wikidataQID: 'Q123456',
      wikidataPublishedAt: new Date(),
      lastAutoPublishedAt: new Date(),
      ...overrides,
    });
  }
}

/**
 * Team Test Factory
 * Creates test team objects with tier configurations
 */
export class TeamTestFactory {
  /**
   * Create a free tier team
   */
  static createFree(overrides?: Partial<Team>): Team {
    return {
      id: 1,
      name: 'Test Team',
      planName: 'free',
      subscriptionStatus: 'active',
      subscriptionId: null,
      subscriptionCurrentPeriodEnd: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    } as Team;
  }

  /**
   * Create a pro tier team
   */
  static createPro(overrides?: Partial<Team>): Team {
    return {
      id: 1,
      name: 'Test Team',
      planName: 'pro',
      subscriptionStatus: 'active',
      subscriptionId: 'sub_test',
      subscriptionCurrentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    } as Team;
  }

  /**
   * Create an agency tier team
   */
  static createAgency(overrides?: Partial<Team>): Team {
    return {
      id: 1,
      name: 'Test Team',
      planName: 'agency',
      subscriptionStatus: 'active',
      subscriptionId: 'sub_test',
      subscriptionCurrentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    } as Team;
  }

  /**
   * Create an expired subscription team
   */
  static createExpired(overrides?: Partial<Team>): Team {
    return {
      id: 1,
      name: 'Test Team',
      planName: 'pro',
      subscriptionStatus: 'canceled',
      subscriptionId: 'sub_test',
      subscriptionCurrentPeriodEnd: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    } as Team;
  }
}

/**
 * Crawl Job Test Factory
 * Creates test crawl job objects
 */
export class CrawlJobTestFactory {
  /**
   * Create a pending crawl job
   */
  static create(overrides?: Partial<CrawlJob>): CrawlJob {
    const now = new Date();
    return {
      id: 1,
      businessId: 1,
      status: 'pending',
      errorMessage: null,
      createdAt: now,
      updatedAt: now,
      ...overrides,
    } as CrawlJob;
  }

  /**
   * Create a completed crawl job
   */
  static createCompleted(overrides?: Partial<CrawlJob>): CrawlJob {
    return this.create({
      status: 'completed',
      ...overrides,
    });
  }

  /**
   * Create a failed crawl job
   */
  static createFailed(errorMessage: string, overrides?: Partial<CrawlJob>): CrawlJob {
    return this.create({
      status: 'error',
      errorMessage,
      ...overrides,
    });
  }
}

/**
 * Mock Crawler Factory
 * Creates mocked crawler instances for testing
 */
export class MockCrawlerFactory {
  /**
   * Create a successful crawler mock
   */
  static createSuccess(crawlData?: any) {
    return {
      crawl: vi.fn().mockResolvedValue({
        success: true,
        data: crawlData || {
          url: 'https://example.com',
          content: '<html><body>Test Content</body></html>',
          metadata: {
            title: 'Test Business',
            description: 'A test business',
          },
        },
      }),
    };
  }

  /**
   * Create a failing crawler mock
   */
  static createFailure(errorMessage: string = 'Crawl failed') {
    return {
      crawl: vi.fn().mockRejectedValue(new Error(errorMessage)),
    };
  }

  /**
   * Create a crawler mock that throws specific error
   */
  static createError(error: Error) {
    return {
      crawl: vi.fn().mockRejectedValue(error),
    };
  }
}

/**
 * Mock Fingerprinter Factory
 * Creates mocked fingerprinter instances for testing
 */
export class MockFingerprinterFactory {
  /**
   * Create a successful fingerprinter mock
   */
  static createSuccess(fingerprintData?: any) {
    return {
      fingerprint: vi.fn().mockResolvedValue({
        success: true,
        data: fingerprintData || {
          visibilityScore: 75,
          competitors: [],
          marketShare: {},
        },
      }),
    };
  }

  /**
   * Create a failing fingerprinter mock
   */
  static createFailure(errorMessage: string = 'Fingerprint failed') {
    return {
      fingerprint: vi.fn().mockRejectedValue(new Error(errorMessage)),
    };
  }
}

/**
 * Mock Wikidata Client Factory
 * Creates mocked Wikidata client instances for testing
 */
export class MockWikidataClientFactory {
  /**
   * Create a successful Wikidata client mock
   */
  static createSuccess(qid: string = 'Q123456') {
    return {
      publishEntity: vi.fn().mockResolvedValue({
        success: true,
        qid,
      }),
      findExistingEntity: vi.fn().mockResolvedValue(null),
    };
  }

  /**
   * Create a failing Wikidata client mock
   */
  static createFailure(errorMessage: string = 'Publish failed') {
    return {
      publishEntity: vi.fn().mockRejectedValue(new Error(errorMessage)),
      findExistingEntity: vi.fn().mockResolvedValue(null),
    };
  }

  /**
   * Create a Wikidata client that finds existing entity
   */
  static createWithExistingEntity(qid: string = 'Q123456') {
    return {
      publishEntity: vi.fn().mockResolvedValue({
        success: true,
        qid,
      }),
      findExistingEntity: vi.fn().mockResolvedValue({ qid }),
    };
  }
}

/**
 * Database Query Mocks Factory
 * Creates mocked database query functions
 */
export class MockDatabaseFactory {
  /**
   * Create successful database query mocks
   */
  static createSuccess() {
    return {
      getBusinessById: vi.fn(),
      updateBusiness: vi.fn().mockResolvedValue(undefined),
      createCrawlJob: vi.fn(),
      updateCrawlJob: vi.fn().mockResolvedValue(undefined),
      getTeamForBusiness: vi.fn(),
    };
  }

  /**
   * Create database query mocks that throw errors
   */
  static createFailure(errorMessage: string = 'Database error') {
    return {
      getBusinessById: vi.fn().mockRejectedValue(new Error(errorMessage)),
      updateBusiness: vi.fn().mockRejectedValue(new Error(errorMessage)),
      createCrawlJob: vi.fn().mockRejectedValue(new Error(errorMessage)),
      updateCrawlJob: vi.fn().mockRejectedValue(new Error(errorMessage)),
      getTeamForBusiness: vi.fn().mockRejectedValue(new Error(errorMessage)),
    };
  }
}

/**
 * Test Assertion Helpers
 * Common assertion patterns for TDD
 */
export class TDDAssertions {
  /**
   * Assert that an error was properly propagated
   */
  static expectErrorPropagated(
    job: CrawlJob | null,
    expectedError: string
  ) {
    expect(job).toBeDefined();
    expect(job?.status).toBe('error');
    expect(job?.errorMessage).toContain(expectedError);
  }

  /**
   * Assert that a business status transition occurred
   */
  static expectStatusTransition(
    business: Business,
    expectedStatus: Business['status']
  ) {
    expect(business.status).toBe(expectedStatus);
  }

  /**
   * Assert that a crawl job was created
   */
  static expectCrawlJobCreated(job: CrawlJob | null) {
    expect(job).toBeDefined();
    expect(job?.status).toBe('pending');
  }
}

/**
 * Test Data Builders
 * Fluent interface for building test data
 */
export class TestDataBuilder {
  private business: Partial<Business> = {};
  private team: Partial<Team> = {};
  private crawlJob: Partial<CrawlJob> = {};

  static business() {
    return new TestDataBuilder();
  }

  withStatus(status: Business['status']) {
    this.business.status = status;
    return this;
  }

  withError(errorMessage: string) {
    this.business.status = 'error';
    this.business.errorMessage = errorMessage;
    return this;
  }

  withCrawlData(data: any) {
    this.business.crawlData = data;
    this.business.status = 'crawled';
    this.business.lastCrawledAt = new Date();
    return this;
  }

  withTeam(team: Partial<Team>) {
    this.team = team;
    return this;
  }

  withCrawlJob(job: Partial<CrawlJob>) {
    this.crawlJob = job;
    return this;
  }

  build(): { business: Business; team: Team; crawlJob: CrawlJob } {
    return {
      business: BusinessTestFactory.create(this.business) as Business,
      team: TeamTestFactory.createPro(this.team) as Team,
      crawlJob: CrawlJobTestFactory.create(this.crawlJob) as CrawlJob,
    };
  }
}

