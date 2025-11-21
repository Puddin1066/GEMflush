/**
 * Scheduler Test Helpers
 * DRY: Centralized test utilities for scheduler service tests
 * SOLID: Single Responsibility - provides test data and mocks
 */

import type { Business, Team } from '@/lib/db/schema';

/**
 * Mock Business Factory
 * Generates test business objects with sensible defaults
 */
export class MockBusinessFactory {
  static create(overrides?: Partial<Business>): Business {
    const now = new Date();
    const nextCrawl = new Date(now);
    nextCrawl.setDate(nextCrawl.getDate() - 1); // Past date (due for crawl)

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
      automationEnabled: true,
      nextCrawlAt: nextCrawl,
      lastCrawledAt: null,
      crawlData: null,
      wikidataQID: null,
      wikidataPublishedAt: null,
      lastAutoPublishedAt: null,
      createdAt: now,
      updatedAt: now,
      ...overrides,
    } as Business;
  }

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

  static createPublished(overrides?: Partial<Business>): Business {
    return this.createCrawled({
      status: 'published',
      wikidataQID: 'Q12345',
      wikidataPublishedAt: new Date(),
      lastAutoPublishedAt: new Date(),
      ...overrides,
    });
  }
}

/**
 * Mock Team Factory
 * Generates test team objects with tier configurations
 */
export class MockTeamFactory {
  static create(overrides?: Partial<Team>): Team {
    return {
      id: 1,
      name: 'Test Team',
      planName: 'pro',
      subscriptionStatus: 'active',
      stripeCustomerId: 'cus_test',
      stripeSubscriptionId: 'sub_test',
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    } as Team;
  }

  static createFree(): Team {
    return this.create({
      planName: 'free',
      subscriptionStatus: null,
      stripeCustomerId: null,
      stripeSubscriptionId: null,
    });
  }

  static createPro(): Team {
    return this.create({
      planName: 'pro',
    });
  }

  static createAgency(): Team {
    return this.create({
      planName: 'agency',
    });
  }
}

/**
 * Mock Publish Data Factory
 * Generates mock publish DTO responses
 */
export class MockPublishDataFactory {
  static createPublishable() {
    return {
      canPublish: true,
      notability: {
        isNotable: true,
        confidence: 0.85,
        sources: [
          { url: 'https://example.com/article', title: 'Test Article' },
        ],
      },
      recommendation: 'Publish',
      fullEntity: {
        labels: { en: { language: 'en', value: 'Test Business' } },
        descriptions: { en: { language: 'en', value: 'A test business' } },
        claims: {
          P31: [{ mainsnak: { property: 'P31', datavalue: { value: 'Q4830453' } } }],
          P856: [{ mainsnak: { property: 'P856', datavalue: { value: 'https://example.com' } } }],
        },
      },
    };
  }

  static createNotPublishable() {
    return {
      canPublish: false,
      notability: {
        isNotable: false,
        confidence: 0.3,
        sources: [],
      },
      recommendation: 'Not notable enough',
      fullEntity: {
        labels: { en: { language: 'en', value: 'Test Business' } },
        descriptions: { en: { language: 'en', value: 'A test business' } },
        claims: {},
      },
    };
  }
}


