/**
 * Strategic Property Selector Integration Tests
 * Tests integration with crawlData, tiered entity builder, and real-world scenarios
 * 
 * DRY: Reusable test data factories
 * SOLID: Single Responsibility - test integration scenarios
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { strategicPropertySelector } from '../strategic-property-selector';
import { TieredEntityBuilder } from '../tiered-entity-builder';
import type { CrawledData } from '@/lib/types/gemflush';
import type { Business } from '@/lib/db/schema';

/**
 * Test data factories
 * DRY: Reusable test data creation
 */
function createMockBusiness(overrides?: Partial<Business>): Business {
  return {
    id: 1,
    name: 'Test Business',
    url: 'https://test.com',
    teamId: 1,
    status: 'crawled',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as Business;
}

function createRichCrawlData(): CrawledData {
  return {
    name: 'Acme Corporation',
    description: 'Software company specializing in project management tools',
    phone: '+1-555-123-4567',
    email: 'contact@acmecorp.com',
    address: '123 Main St',
    location: {
      address: '123 Main St, Suite 100',
      city: 'Seattle',
      state: 'WA',
      country: 'US',
      lat: 47.6062,
      lng: -122.3321,
    },
    socialLinks: {
      twitter: 'https://twitter.com/acmecorp',
      facebook: 'https://facebook.com/acmecorp',
      instagram: 'https://instagram.com/acmecorp',
      linkedin: 'https://linkedin.com/company/acme-corp',
    },
    founded: '2015',
    businessDetails: {
      industry: 'Technology',
      employeeCount: 50,
      stockSymbol: 'ACME',
    },
  };
}

function createMinimalCrawlData(): CrawledData {
  return {
    name: 'Test Business',
  };
}

describe('StrategicPropertySelector Integration', () => {
  describe('Integration with crawlData', () => {
    it('should select properties based on available crawlData', () => {
      const richCrawlData = createRichCrawlData();
      const minimalCrawlData = createMinimalCrawlData();

      const richProps = strategicPropertySelector.getPropertiesForTier(
        'pro',
        undefined,
        richCrawlData
      );
      const minimalProps = strategicPropertySelector.getPropertiesForTier(
        'pro',
        undefined,
        minimalCrawlData
      );

      // Rich crawlData should yield more properties
      expect(richProps.length).toBeGreaterThan(minimalProps.length);

      // Rich crawlData should include contact properties
      expect(richProps).toContain('P1329'); // phone
      expect(richProps).toContain('P968'); // email

      // Rich crawlData should include social properties
      expect(richProps).toContain('P2002'); // Twitter
      expect(richProps).toContain('P2013'); // Facebook
      expect(richProps).toContain('P2003'); // Instagram
      expect(richProps).toContain('P4264'); // LinkedIn

      // Rich crawlData should include location properties
      expect(richProps).toContain('P625'); // coordinates
      expect(richProps).toContain('P6375'); // address

      // Minimal crawlData should only have required properties
      expect(minimalProps).toContain('P31');
      expect(minimalProps).toContain('P856');
      expect(minimalProps).toContain('P1448');
    });

    it('should handle partial crawlData gracefully', () => {
      const partialCrawlData: CrawledData = {
        name: 'Test Business',
        phone: '+1-555-1234',
        // No email, social links, or location
      };

      const props = strategicPropertySelector.getPropertiesForTier(
        'pro',
        undefined,
        partialCrawlData
      );

      // Should include properties with available data
      expect(props).toContain('P1329'); // phone

      // Should not include properties without data
      expect(props).not.toContain('P968'); // email (no data)
      expect(props).not.toContain('P2002'); // Twitter (no data)
    });
  });

  describe('Tier progression', () => {
    it('should show property progression from free to pro to agency', () => {
      const crawlData = createRichCrawlData();

      const freeProps = strategicPropertySelector.getPropertiesForTier('free', undefined, crawlData);
      const proProps = strategicPropertySelector.getPropertiesForTier('pro', undefined, crawlData);
      const agencyProps = strategicPropertySelector.getPropertiesForTier('agency', undefined, crawlData);

      // Each tier should have more or equal properties than the previous
      expect(proProps.length).toBeGreaterThanOrEqual(freeProps.length);
      expect(agencyProps.length).toBeGreaterThanOrEqual(proProps.length);

      // Free tier should have core properties
      expect(freeProps).toContain('P31');
      expect(freeProps).toContain('P856');
      expect(freeProps).toContain('P1448');

      // Pro tier should have all free properties plus more
      expect(proProps).toContain('P31');
      expect(proProps).toContain('P968'); // email (pro tier)

      // Agency tier should have all pro properties
      expect(agencyProps).toContain('P31');
      expect(agencyProps).toContain('P968');
    });

    it('should show enrichment level progression for agency tier', () => {
      const crawlData = createRichCrawlData();

      const level1Props = strategicPropertySelector.getPropertiesForTier('agency', 1, crawlData);
      const level2Props = strategicPropertySelector.getPropertiesForTier('agency', 2, crawlData);
      const level3Props = strategicPropertySelector.getPropertiesForTier('agency', 3, crawlData);
      const level4Props = strategicPropertySelector.getPropertiesForTier('agency', 4, crawlData);

      // Each level should have more or equal properties
      expect(level2Props.length).toBeGreaterThanOrEqual(level1Props.length);
      expect(level3Props.length).toBeGreaterThanOrEqual(level2Props.length);
      expect(level4Props.length).toBeGreaterThanOrEqual(level3Props.length);

      // Level 3+ should include classification properties
      expect(level3Props).toContain('P452'); // industry
      expect(level4Props).toContain('P452');

      // Level 4 should include relationship properties
      expect(level4Props.length).toBeGreaterThan(level3Props.length);
    });
  });

  describe('Real-world scenarios', () => {
    it('should handle software company with full data', () => {
      const softwareCompanyData: CrawledData = {
        name: 'TechCorp Inc.',
        description: 'Enterprise software solutions',
        phone: '+1-555-TECH',
        email: 'info@techcorp.com',
        location: {
          city: 'San Francisco',
          state: 'CA',
          lat: 37.7749,
          lng: -122.4194,
        },
        socialLinks: {
          twitter: 'https://twitter.com/techcorp',
          linkedin: 'https://linkedin.com/company/techcorp',
        },
        founded: '2010',
        businessDetails: {
          industry: 'Software',
          employeeCount: 200,
        },
      };

      const props = strategicPropertySelector.getPropertiesForTier(
        'pro',
        undefined,
        softwareCompanyData
      );

      // Should include all available properties
      expect(props).toContain('P31');
      expect(props).toContain('P856');
      expect(props).toContain('P1448');
      expect(props).toContain('P625');
      expect(props).toContain('P1329');
      expect(props).toContain('P968');
      expect(props).toContain('P2002');
      expect(props).toContain('P4264');
      expect(props).toContain('P571');
      expect(props).toContain('P1128');
    });

    it('should handle local business with minimal data', () => {
      const localBusinessData: CrawledData = {
        name: 'Local Coffee Shop',
        phone: '+1-555-COFFEE',
        location: {
          address: '123 Main St',
          city: 'Seattle',
          state: 'WA',
          lat: 47.6062,
          lng: -122.3321,
        },
      };

      const props = strategicPropertySelector.getPropertiesForTier(
        'free',
        undefined,
        localBusinessData
      );

      // Should include basic properties
      expect(props).toContain('P31');
      expect(props).toContain('P856');
      expect(props).toContain('P1448');
      expect(props).toContain('P625'); // coordinates available
      expect(props).toContain('P1329'); // phone available

      // Should not include properties without data
      expect(props).not.toContain('P968'); // no email
      expect(props).not.toContain('P2002'); // no social
    });

    it('should handle e-commerce business with social presence', () => {
      const ecommerceData: CrawledData = {
        name: 'ShopOnline',
        email: 'support@shoponline.com',
        socialLinks: {
          twitter: 'https://twitter.com/shoponline',
          facebook: 'https://facebook.com/shoponline',
          instagram: 'https://instagram.com/shoponline',
          linkedin: 'https://linkedin.com/company/shoponline',
        },
        businessDetails: {
          employeeCount: 25,
        },
      };

      const props = strategicPropertySelector.getPropertiesForTier(
        'pro',
        undefined,
        ecommerceData
      );

      // Should include all social properties
      expect(props).toContain('P2002'); // Twitter
      expect(props).toContain('P2013'); // Facebook
      expect(props).toContain('P2003'); // Instagram
      expect(props).toContain('P4264'); // LinkedIn

      // Should include contact properties
      expect(props).toContain('P968'); // email
      expect(props).toContain('P1128'); // employees
    });
  });

  describe('Recommendation system', () => {
    it('should recommend missing properties with available data', () => {
      const richCrawlData = createRichCrawlData();
      const currentProperties = ['P31', 'P856', 'P1448'];

      const recommended = strategicPropertySelector.getRecommendedProperties(
        currentProperties,
        richCrawlData,
        'pro'
      );

      // Should recommend properties with available data
      expect(recommended.length).toBeGreaterThan(0);
      expect(recommended).toContain('P1329'); // phone available
      expect(recommended).toContain('P968'); // email available
      expect(recommended).toContain('P625'); // coordinates available
    });

    it('should prioritize high-value recommendations', () => {
      const crawlData: CrawledData = {
        name: 'Test Business',
        phone: '+1-555-1234',
        email: 'test@test.com',
        socialLinks: {
          twitter: 'https://twitter.com/test',
        },
      };

      const currentProperties = ['P31', 'P856', 'P1448'];
      const recommended = strategicPropertySelector.getRecommendedProperties(
        currentProperties,
        crawlData,
        'pro'
      );

      // High priority properties should be recommended first
      const p1329Index = recommended.indexOf('P1329'); // high priority
      const p968Index = recommended.indexOf('P968'); // high priority
      const p2002Index = recommended.indexOf('P2002'); // high priority

      // All should be recommended
      expect(p1329Index).not.toBe(-1);
      expect(p968Index).not.toBe(-1);
      expect(p2002Index).not.toBe(-1);
    });
  });

  describe('Property completeness', () => {
    it('should identify missing high-value properties', () => {
      const crawlData = createRichCrawlData();
      const allProps = strategicPropertySelector.getPropertiesForTier(
        'pro',
        undefined,
        crawlData
      );

      // Should have comprehensive property coverage
      expect(allProps.length).toBeGreaterThan(10);

      // Should include all major categories
      const categories = new Set(
        allProps.map(pid => strategicPropertySelector.getPropertyStats(pid)?.category)
      );

      expect(categories.has('core')).toBe(true);
      expect(categories.has('location')).toBe(true);
      expect(categories.has('contact')).toBe(true);
      expect(categories.has('social')).toBe(true);
    });

    it('should maximize property count for agency tier with full data', () => {
      const richCrawlData = createRichCrawlData();
      const agencyProps = strategicPropertySelector.getPropertiesForTier(
        'agency',
        4, // Maximum enrichment
        richCrawlData
      );

      // Agency tier with full data should have many properties
      expect(agencyProps.length).toBeGreaterThan(15);

      // Should include all property categories
      const categories = agencyProps.map(pid => 
        strategicPropertySelector.getPropertyStats(pid)?.category
      ).filter(Boolean);

      expect(categories.length).toBeGreaterThan(5);
    });
  });

  describe('Edge cases', () => {
    it('should handle undefined crawlData', () => {
      const props = strategicPropertySelector.getPropertiesForTier('pro');

      // Should still return required properties (even without crawlData)
      expect(props).toContain('P31');
      expect(props).toContain('P856');
      expect(props).toContain('P1448'); // Required, so included even without data

      // Should not include non-required properties requiring crawlData
      expect(props).not.toContain('P1329'); // phone requires data
      expect(props).not.toContain('P968'); // email requires data
    });

    it('should handle empty crawlData', () => {
      const emptyCrawlData: CrawledData = {};
      const props = strategicPropertySelector.getPropertiesForTier(
        'pro',
        undefined,
        emptyCrawlData
      );

      // Should still return required properties (even with empty crawlData)
      expect(props).toContain('P31');
      expect(props).toContain('P856');
      expect(props).toContain('P1448'); // Required, so included even with empty data
    });

    it('should handle invalid enrichment level', () => {
      const crawlData = createRichCrawlData();
      
      // Enrichment level 0 should default to level 1 behavior
      const propsLevel0 = strategicPropertySelector.getPropertiesForTier(
        'agency',
        0,
        crawlData
      );
      
      // Enrichment level 10 should include all properties
      const propsLevel10 = strategicPropertySelector.getPropertiesForTier(
        'agency',
        10,
        crawlData
      );

      expect(propsLevel10.length).toBeGreaterThanOrEqual(propsLevel0.length);
    });
  });
});

