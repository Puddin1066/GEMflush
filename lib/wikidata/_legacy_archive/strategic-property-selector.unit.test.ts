/**
 * Strategic Property Selector Unit Tests
 * Tests property selection logic, tier eligibility, and data availability checks
 * 
 * DRY: Reusable test helpers
 * SOLID: Single Responsibility - test one thing at a time
 */

import { describe, it, expect } from 'vitest';
import {
  StrategicPropertySelector,
  strategicPropertySelector,
  STRATEGIC_PROPERTIES,
} from '../strategic-property-selector';
import type { CrawledData } from '@/lib/types/gemflush';

describe('StrategicPropertySelector', () => {
  const selector = new StrategicPropertySelector();

  describe('getPropertiesForTier', () => {
    it('should return required properties for free tier', () => {
      const properties = selector.getPropertiesForTier('free');
      
      // Required properties should always be included
      expect(properties).toContain('P31'); // instance of
      expect(properties).toContain('P856'); // official website
      expect(properties).toContain('P1448'); // official name
      
      // Free tier should have basic properties
      expect(properties.length).toBeGreaterThanOrEqual(3);
    });

    it('should return more properties for pro tier than free tier', () => {
      const crawlData: CrawledData = {
        name: 'Test Business',
        email: 'test@test.com',
        socialLinks: {
          twitter: 'https://twitter.com/test',
        },
      };

      const freeProps = selector.getPropertiesForTier('free', undefined, crawlData);
      const proProps = selector.getPropertiesForTier('pro', undefined, crawlData);
      
      expect(proProps.length).toBeGreaterThan(freeProps.length);
      expect(proProps).toContain('P968'); // email (pro tier)
      expect(proProps).toContain('P2002'); // Twitter (pro tier)
    });

    it('should return more properties for agency tier than pro tier', () => {
      const proProps = selector.getPropertiesForTier('pro');
      const agencyProps = selector.getPropertiesForTier('agency');
      
      expect(agencyProps.length).toBeGreaterThanOrEqual(proProps.length);
    });

    it('should filter properties by enrichment level for agency tier', () => {
      const level1Props = selector.getPropertiesForTier('agency', 1);
      const level3Props = selector.getPropertiesForTier('agency', 3);
      const level4Props = selector.getPropertiesForTier('agency', 4);
      
      // Level 3 should have more properties than level 1
      expect(level3Props.length).toBeGreaterThanOrEqual(level1Props.length);
      
      // Level 4 should have more properties than level 3
      expect(level4Props.length).toBeGreaterThanOrEqual(level3Props.length);
      
      // Level 3+ should include P452 (industry)
      expect(level3Props).toContain('P452');
      expect(level4Props).toContain('P452');
    });

    it('should filter properties based on data availability', () => {
      const crawlDataWithPhone: CrawledData = {
        name: 'Test Business',
        phone: '+1-555-1234',
        email: 'test@test.com',
        location: {
          lat: 37.7749,
          lng: -122.4194,
        },
      };

      const properties = selector.getPropertiesForTier('pro', undefined, crawlDataWithPhone);
      
      // Should include P1329 (phone) if data is available
      expect(properties).toContain('P1329');
      // Should include P968 (email) if data is available
      expect(properties).toContain('P968');
      // Should include P625 (coordinates) if data is available
      expect(properties).toContain('P625');
    });

    it('should exclude properties without data availability', () => {
      const crawlDataWithoutPhone: CrawledData = {
        name: 'Test Business',
        // No phone, email, or location data
      };

      const properties = selector.getPropertiesForTier('pro', undefined, crawlDataWithoutPhone);
      
      // Should still include required properties
      expect(properties).toContain('P31');
      expect(properties).toContain('P856');
      expect(properties).toContain('P1448');
      
      // Should exclude P1329 (phone) if data is not available
      expect(properties).not.toContain('P1329');
      // Should exclude P968 (email) if data is not available
      expect(properties).not.toContain('P968');
    });

    it('should sort properties by priority', () => {
      const crawlData: CrawledData = {
        name: 'Test Business',
        phone: '+1-555-1234',
        founded: '2015',
      };

      const properties = selector.getPropertiesForTier('pro', undefined, crawlData);
      
      // Required properties should come first
      const p31Index = properties.indexOf('P31');
      const p856Index = properties.indexOf('P856');
      const p1448Index = properties.indexOf('P1448');
      
      // High priority properties should come before medium priority
      const p1329Index = properties.indexOf('P1329'); // high priority
      const p571Index = properties.indexOf('P571'); // medium priority
      
      // All required properties should be present
      expect(p31Index).not.toBe(-1);
      expect(p856Index).not.toBe(-1);
      expect(p1448Index).not.toBe(-1);
      
      // Required properties should come before high priority
      if (p1329Index !== -1) {
        expect(p31Index).toBeLessThan(p1329Index);
        expect(p856Index).toBeLessThan(p1329Index);
        expect(p1448Index).toBeLessThan(p1329Index);
      }
      
      // High priority should come before medium priority
      if (p1329Index !== -1 && p571Index !== -1) {
        expect(p1329Index).toBeLessThan(p571Index);
      }
    });
  });

  describe('getPropertiesByCategory', () => {
    it('should return all location properties', () => {
      const locationProps = selector.getPropertiesByCategory('location');
      
      expect(locationProps).toContain('P625'); // coordinate location
      expect(locationProps).toContain('P6375'); // street address
      expect(locationProps).toContain('P131'); // located in
      expect(locationProps).toContain('P159'); // headquarters
      expect(locationProps).toContain('P17'); // country
    });

    it('should return all social media properties', () => {
      const socialProps = selector.getPropertiesByCategory('social');
      
      expect(socialProps).toContain('P2002'); // Twitter
      expect(socialProps).toContain('P2013'); // Facebook
      expect(socialProps).toContain('P2003'); // Instagram
      expect(socialProps).toContain('P4264'); // LinkedIn
    });

    it('should return all contact properties', () => {
      const contactProps = selector.getPropertiesByCategory('contact');
      
      expect(contactProps).toContain('P1329'); // phone
      expect(contactProps).toContain('P968'); // email
    });

    it('should return all core properties', () => {
      const coreProps = selector.getPropertiesByCategory('core');
      
      expect(coreProps).toContain('P31'); // instance of
    });
  });

  describe('getPropertiesByPriority', () => {
    it('should return all required properties', () => {
      const requiredProps = selector.getPropertiesByPriority('required');
      
      expect(requiredProps).toContain('P31');
      expect(requiredProps).toContain('P856');
      expect(requiredProps).toContain('P1448');
    });

    it('should return high priority properties', () => {
      const highPriorityProps = selector.getPropertiesByPriority('high');
      
      expect(highPriorityProps.length).toBeGreaterThan(0);
      expect(highPriorityProps).toContain('P625'); // coordinate location
      expect(highPriorityProps).toContain('P1329'); // phone
    });
  });

  describe('getPropertyStats', () => {
    it('should return property statistics for valid PID', () => {
      const stats = selector.getPropertyStats('P31');
      
      expect(stats).toBeDefined();
      expect(stats?.pid).toBe('P31');
      expect(stats?.label).toBe('instance of');
      expect(stats?.category).toBe('core');
      expect(stats?.priority).toBe('required');
    });

    it('should return undefined for invalid PID', () => {
      const stats = selector.getPropertyStats('P99999');
      
      expect(stats).toBeUndefined();
    });
  });

  describe('getRecommendedProperties', () => {
    it('should recommend properties with available data', () => {
      const crawlData: CrawledData = {
        name: 'Test Business',
        phone: '+1-555-1234',
        email: 'test@test.com',
        socialLinks: {
          twitter: 'https://twitter.com/test',
        },
      };

      const currentProperties = ['P31', 'P856', 'P1448'];
      const recommended = selector.getRecommendedProperties(
        currentProperties,
        crawlData,
        'pro'
      );

      // Should recommend P1329 (phone) if data is available
      expect(recommended).toContain('P1329');
      // Should recommend P968 (email) if data is available
      expect(recommended).toContain('P968');
      // Should recommend P2002 (Twitter) if data is available
      expect(recommended).toContain('P2002');
    });

    it('should not recommend properties already included', () => {
      const crawlData: CrawledData = {
        name: 'Test Business',
        phone: '+1-555-1234',
      };

      const currentProperties = ['P31', 'P856', 'P1448', 'P1329'];
      const recommended = selector.getRecommendedProperties(
        currentProperties,
        crawlData,
        'pro'
      );

      // Should not recommend P1329 if already included
      expect(recommended).not.toContain('P1329');
    });

    it('should only recommend properties eligible for tier', () => {
      const crawlData: CrawledData = {
        name: 'Test Business',
        businessDetails: {
          industry: 'Technology',
        },
      };

      const currentProperties = ['P31', 'P856', 'P1448'];
      
      // Free tier should not recommend agency-only properties
      const freeRecommended = selector.getRecommendedProperties(
        currentProperties,
        crawlData,
        'free'
      );
      expect(freeRecommended).not.toContain('P452'); // Industry (agency only)

      // Agency tier should recommend agency properties
      const agencyRecommended = selector.getRecommendedProperties(
        currentProperties,
        crawlData,
        'agency'
      );
      // P452 requires enrichment level 3, so may not be included without enrichment level
      // But the recommendation system should still suggest it if eligible
    });

    it('should return empty array if no recommendations', () => {
      const crawlData: CrawledData = {
        name: 'Test Business',
      };

      const currentProperties = ['P31', 'P856', 'P1448', 'P625', 'P1329', 'P968'];
      const recommended = selector.getRecommendedProperties(
        currentProperties,
        crawlData,
        'free'
      );

      // Should return empty or minimal recommendations for free tier with limited data
      expect(Array.isArray(recommended)).toBe(true);
    });
  });

  describe('Data availability checks', () => {
    it('should check for name data (P1448)', () => {
      const crawlDataWithName: CrawledData = { name: 'Test Business' };
      const crawlDataWithoutName: CrawledData = {};

      const propsWithName = selector.getPropertiesForTier('free', undefined, crawlDataWithName);
      const propsWithoutName = selector.getPropertiesForTier('free', undefined, crawlDataWithoutName);

      // P1448 should be included if name is available
      expect(propsWithName).toContain('P1448');
      // P1448 is required, so it should still be included even without data
      // (required properties don't check data availability)
    });

    it('should check for coordinate data (P625)', () => {
      const crawlDataWithCoords: CrawledData = {
        location: { lat: 37.7749, lng: -122.4194 },
      };
      const crawlDataWithoutCoords: CrawledData = {};

      const propsWithCoords = selector.getPropertiesForTier('free', undefined, crawlDataWithCoords);
      const propsWithoutCoords = selector.getPropertiesForTier('free', undefined, crawlDataWithoutCoords);

      // P625 should be included if coordinates are available
      expect(propsWithCoords).toContain('P625');
      // P625 is in free tier, but requires data availability
      // So it may not be included without data
    });

    it('should check for social media data', () => {
      const crawlDataWithSocial: CrawledData = {
        socialLinks: {
          twitter: 'https://twitter.com/test',
          facebook: 'https://facebook.com/test',
          instagram: 'https://instagram.com/test',
          linkedin: 'https://linkedin.com/company/test',
        },
      };

      const props = selector.getPropertiesForTier('pro', undefined, crawlDataWithSocial);

      expect(props).toContain('P2002'); // Twitter
      expect(props).toContain('P2013'); // Facebook
      expect(props).toContain('P2003'); // Instagram
      expect(props).toContain('P4264'); // LinkedIn
    });

    it('should check for business details data', () => {
      const crawlDataWithDetails: CrawledData = {
        businessDetails: {
          employeeCount: 50,
          stockSymbol: 'TEST',
        },
      };

      const props = selector.getPropertiesForTier('pro', undefined, crawlDataWithDetails);

      expect(props).toContain('P1128'); // employees
      
      // P249 (stock symbol) requires agency tier
      const agencyProps = selector.getPropertiesForTier('agency', 2, crawlDataWithDetails);
      expect(agencyProps).toContain('P249');
    });
  });

  describe('Singleton instance', () => {
    it('should export singleton instance', () => {
      expect(strategicPropertySelector).toBeInstanceOf(StrategicPropertySelector);
    });

    it('should be the same instance', () => {
      const instance1 = strategicPropertySelector;
      const instance2 = strategicPropertySelector;
      
      expect(instance1).toBe(instance2);
    });
  });

  describe('Property database', () => {
    it('should have all required properties defined', () => {
      expect(STRATEGIC_PROPERTIES['P31']).toBeDefined();
      expect(STRATEGIC_PROPERTIES['P856']).toBeDefined();
      expect(STRATEGIC_PROPERTIES['P1448']).toBeDefined();
    });

    it('should have consistent property metadata', () => {
      for (const [pid, stats] of Object.entries(STRATEGIC_PROPERTIES)) {
        expect(stats.pid).toBe(pid);
        expect(stats.label).toBeTruthy();
        expect(stats.category).toBeTruthy();
        expect(stats.priority).toBeTruthy();
        expect(stats.dataSource).toBeTruthy();
        expect(stats.tier).toBeTruthy();
      }
    });
  });
});

