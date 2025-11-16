/**
 * Automation Flow Integration Tests
 * Tests automation configuration and tier-based logic
 * SOLID: Single Responsibility - tests automation integration
 * Focused: Tests tier-based behavior without external dependencies
 */

import { describe, it, expect, vi } from 'vitest';
import { getAutomationConfig, shouldAutoCrawl, shouldAutoPublish, getEntityRichnessForTier } from '@/lib/services/automation-service';
import { TieredEntityBuilder } from '@/lib/wikidata/tiered-entity-builder';
import type { Team, Business } from '@/lib/db/schema';

// Mock the entity builder to avoid LLM calls
vi.mock('@/lib/wikidata/entity-builder', () => ({
  WikidataEntityBuilder: class {
    async buildEntity() {
      return {
        labels: { en: { language: 'en', value: 'Test Business' } },
        descriptions: { en: { language: 'en', value: 'A test business' } },
        claims: {
          P31: [{ mainsnak: { property: 'P31' } }],
          P856: [{ mainsnak: { property: 'P856' } }],
          P1448: [{ mainsnak: { property: 'P1448' } }],
          P625: [{ mainsnak: { property: 'P625' } }],
          P1329: [{ mainsnak: { property: 'P1329' } }],
          P6375: [{ mainsnak: { property: 'P6375' } }],
          P968: [{ mainsnak: { property: 'P968' } }],
          P2002: [{ mainsnak: { property: 'P2002' } }],
          P2013: [{ mainsnak: { property: 'P2013' } }],
          P2003: [{ mainsnak: { property: 'P2003' } }],
          P4264: [{ mainsnak: { property: 'P4264' } }],
          P571: [{ mainsnak: { property: 'P571' } }],
          P1128: [{ mainsnak: { property: 'P1128' } }],
          P131: [{ mainsnak: { property: 'P131' } }],
          P159: [{ mainsnak: { property: 'P159' } }],
          P17: [{ mainsnak: { property: 'P17' } }],
          P452: [{ mainsnak: { property: 'P452' } }],
          P18: [{ mainsnak: { property: 'P18' } }],
        },
        llmSuggestions: {},
      };
    }
  },
}));

describe('Automation Flow Integration', () => {
  const mockBusiness: Business = {
    id: 1,
    teamId: 1,
    name: 'Test Business',
    url: 'https://test.com',
    category: 'restaurant',
    location: {
      city: 'San Francisco',
      state: 'CA',
      country: 'US',
      coordinates: { lat: 37.7749, lng: -122.4194 },
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

  const builder = new TieredEntityBuilder();

  describe('Pro Tier Automation', () => {
    const proTeam: Team = {
      id: 1,
      name: 'Pro Team',
      planName: 'pro',
      subscriptionStatus: 'active',
      stripeCustomerId: 'cus_test',
      stripeSubscriptionId: 'sub_test',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should enable automation for Pro tier', () => {
      const config = getAutomationConfig(proTeam);
      
      expect(config.crawlFrequency).toBe('weekly');
      expect(config.autoPublish).toBe(true);
      expect(config.entityRichness).toBe('enhanced');
    });

    it('should filter to enhanced properties for Pro tier', async () => {
      const entity = await builder.buildEntity(
        mockBusiness,
        undefined,
        'pro'
      );

      // Should include enhanced properties
      expect(entity.claims.P31).toBeDefined(); // Basic
      expect(entity.claims.P968).toBeDefined(); // Enhanced: email
      expect(entity.claims.P2002).toBeDefined(); // Enhanced: Twitter
      // Should not include complete properties
      expect(entity.claims.P131).toBeUndefined(); // Complete: located in
    });

    it('should allow auto-crawl for Pro tier with automation enabled', () => {
      const business = {
        ...mockBusiness,
        automationEnabled: true,
        nextCrawlAt: new Date(Date.now() - 1000), // Past date
      };

      expect(shouldAutoCrawl(business, proTeam)).toBe(true);
    });

    it('should allow auto-publish for Pro tier after crawl', () => {
      const business = {
        ...mockBusiness,
        status: 'crawled',
        lastCrawledAt: new Date(),
      };

      expect(shouldAutoPublish(business, proTeam)).toBe(true);
    });
  });

  describe('Agency Tier Automation', () => {
    const agencyTeam: Team = {
      id: 2,
      name: 'Agency Team',
      planName: 'agency',
      subscriptionStatus: 'active',
      stripeCustomerId: 'cus_test',
      stripeSubscriptionId: 'sub_test',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should enable automation with enrichment for Agency tier', () => {
      const config = getAutomationConfig(agencyTeam);
      
      expect(config.crawlFrequency).toBe('weekly');
      expect(config.autoPublish).toBe(true);
      expect(config.entityRichness).toBe('complete');
      expect(config.progressiveEnrichment).toBe(true);
    });

    it('should filter to enhanced properties for Agency tier level 1-2', async () => {
      const entity = await builder.buildEntity(
        mockBusiness,
        undefined,
        'agency',
        2
      );

      // Should include enhanced properties
      expect(entity.claims.P968).toBeDefined();
      // Should not include complete properties yet
      expect(entity.claims.P131).toBeUndefined();
    });

    it('should filter to complete properties for Agency tier level 3+', async () => {
      const entity = await builder.buildEntity(
        mockBusiness,
        undefined,
        'agency',
        3
      );

      // Should include complete properties
      expect(entity.claims.P131).toBeDefined(); // Complete: located in
      expect(entity.claims.P452).toBeDefined(); // Complete: industry
    });
  });

  describe('Free Tier (No Automation)', () => {
    const freeTeam: Team = {
      id: 3,
      name: 'Free Team',
      planName: 'free',
      subscriptionStatus: null,
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should not enable automation for Free tier', () => {
      const config = getAutomationConfig(freeTeam);
      
      expect(config.crawlFrequency).toBe('manual');
      expect(config.autoPublish).toBe(false);
      expect(config.entityRichness).toBe('basic');
    });

    it('should filter to basic properties for Free tier', async () => {
      const entity = await builder.buildEntity(
        mockBusiness,
        undefined,
        'free'
      );

      // Should only include basic properties
      expect(entity.claims.P31).toBeDefined();
      expect(entity.claims.P856).toBeDefined();
      expect(entity.claims.P1448).toBeDefined();
      // Should not include enhanced properties
      expect(entity.claims.P968).toBeUndefined();
      expect(entity.claims.P2002).toBeUndefined();
    });

    it('should not allow auto-crawl for Free tier', () => {
      const business = {
        ...mockBusiness,
        automationEnabled: true,
      };

      expect(shouldAutoCrawl(business, freeTeam)).toBe(false);
    });

    it('should not allow auto-publish for Free tier', () => {
      const business = {
        ...mockBusiness,
        status: 'crawled',
      };

      expect(shouldAutoPublish(business, freeTeam)).toBe(false);
    });
  });

  describe('Automation State Transitions', () => {
    const proTeam: Team = {
      id: 1,
      name: 'Pro Team',
      planName: 'pro',
      subscriptionStatus: 'active',
      stripeCustomerId: 'cus_test',
      stripeSubscriptionId: 'sub_test',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should transition: pending → crawled → published', () => {
      // Pending: no automation yet
      const pending = { ...mockBusiness, status: 'pending' };
      expect(shouldAutoPublish(pending, proTeam)).toBe(false);

      // Crawled: ready for auto-publish
      const crawled = { ...mockBusiness, status: 'crawled' };
      expect(shouldAutoPublish(crawled, proTeam)).toBe(true);

      // Published: check if re-publish needed
      const published = {
        ...mockBusiness,
        status: 'published',
        lastCrawledAt: new Date(),
        lastAutoPublishedAt: new Date(Date.now() - 1000),
      };
      // If crawl is newer than publish, should re-publish
      expect(shouldAutoPublish(published, proTeam)).toBe(true);
    });
  });
});

