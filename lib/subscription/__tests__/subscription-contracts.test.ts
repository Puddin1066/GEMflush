// Subscription schema and contract tests
// Ensures UpgradeFeature, FeatureConfig, and UPGRADE_CONFIGS match service contracts

import { describe, it, expect } from 'vitest';
import {
  type UpgradeFeature,
  type FeatureConfig,
  UPGRADE_CONFIGS,
  getUpgradeConfig,
  getRecommendedPlan,
} from '../upgrade-config';

describe('Subscription Contracts', () => {
  describe('UpgradeFeature type contract', () => {
    it('should have all required feature keys', () => {
      const expectedFeatures: UpgradeFeature[] = [
        'wikidata',
        'businesses',
        'api',
        'enrichment',
        'history',
      ];

      // Type check: all expected features should be valid UpgradeFeature
      expectedFeatures.forEach((feature) => {
        expect(typeof feature).toBe('string');
        // Runtime validation that feature is a valid UpgradeFeature
        expect(UPGRADE_CONFIGS).toHaveProperty(feature);
      });
    });

    it('should enforce UpgradeFeature is a union of specific strings', () => {
      // TypeScript compile-time check - these should be valid
      const validFeatures: UpgradeFeature[] = [
        'wikidata',
        'businesses',
        'api',
        'enrichment',
        'history',
      ];

      validFeatures.forEach((feature) => {
        expect(typeof feature).toBe('string');
        expect(UPGRADE_CONFIGS[feature]).toBeDefined();
      });
    });

    it('should reject invalid feature keys at runtime', () => {
      // Invalid features should not exist in UPGRADE_CONFIGS
      const invalidFeatures = ['invalid', 'test', 'unknown'];

      invalidFeatures.forEach((feature) => {
        expect(UPGRADE_CONFIGS).not.toHaveProperty(feature);
      });
    });
  });

  describe('FeatureConfig interface contract', () => {
    it('should have required title property as string', () => {
      const config: FeatureConfig = UPGRADE_CONFIGS.wikidata;

      expect(config).toHaveProperty('title');
      expect(typeof config.title).toBe('string');
      expect(config.title.length).toBeGreaterThan(0);
    });

    it('should have required description property as string', () => {
      const config: FeatureConfig = UPGRADE_CONFIGS.wikidata;

      expect(config).toHaveProperty('description');
      expect(typeof config.description).toBe('string');
      expect(config.description.length).toBeGreaterThan(0);
    });

    it('should have required benefits property as string array', () => {
      const config: FeatureConfig = UPGRADE_CONFIGS.wikidata;

      expect(config).toHaveProperty('benefits');
      expect(Array.isArray(config.benefits)).toBe(true);
      expect(config.benefits.length).toBeGreaterThan(0);
      config.benefits.forEach((benefit) => {
        expect(typeof benefit).toBe('string');
      });
    });

    it('should have required icon property', () => {
      const config: FeatureConfig = UPGRADE_CONFIGS.wikidata;

      expect(config).toHaveProperty('icon');
      // Icon can be a component or function
      expect(config.icon).toBeDefined();
    });

    it('should have required targetPlan as pro or agency', () => {
      const config: FeatureConfig = UPGRADE_CONFIGS.wikidata;

      expect(config).toHaveProperty('targetPlan');
      expect(['pro', 'agency']).toContain(config.targetPlan);
    });

    it('should have required price property as number', () => {
      const config: FeatureConfig = UPGRADE_CONFIGS.wikidata;

      expect(config).toHaveProperty('price');
      expect(typeof config.price).toBe('number');
      expect(config.price).toBeGreaterThanOrEqual(0);
    });

    it('should have required ctaText property as string', () => {
      const config: FeatureConfig = UPGRADE_CONFIGS.wikidata;

      expect(config).toHaveProperty('ctaText');
      expect(typeof config.ctaText).toBe('string');
      expect(config.ctaText.length).toBeGreaterThan(0);
    });

    it('should match FeatureConfig structure for all features', () => {
      const features: UpgradeFeature[] = [
        'wikidata',
        'businesses',
        'api',
        'enrichment',
        'history',
      ];

      features.forEach((feature) => {
        const config = UPGRADE_CONFIGS[feature];
        expect(config).toHaveProperty('title');
        expect(config).toHaveProperty('description');
        expect(config).toHaveProperty('benefits');
        expect(config).toHaveProperty('icon');
        expect(config).toHaveProperty('targetPlan');
        expect(config).toHaveProperty('price');
        expect(config).toHaveProperty('ctaText');
      });
    });
  });

  describe('UPGRADE_CONFIGS completeness contract', () => {
    it('should have config for all UpgradeFeature keys', () => {
      const expectedFeatures: UpgradeFeature[] = [
        'wikidata',
        'businesses',
        'api',
        'enrichment',
        'history',
      ];

      expectedFeatures.forEach((feature) => {
        expect(UPGRADE_CONFIGS).toHaveProperty(feature);
        expect(UPGRADE_CONFIGS[feature]).toBeDefined();
      });
    });

    it('should not have extra keys beyond UpgradeFeature', () => {
      const expectedFeatures: UpgradeFeature[] = [
        'wikidata',
        'businesses',
        'api',
        'enrichment',
        'history',
      ];

      const configKeys = Object.keys(UPGRADE_CONFIGS);
      expect(configKeys.length).toBe(expectedFeatures.length);

      configKeys.forEach((key) => {
        expect(expectedFeatures).toContain(key as UpgradeFeature);
      });
    });

    it('should have exactly 5 feature configurations', () => {
      const configKeys = Object.keys(UPGRADE_CONFIGS);
      expect(configKeys.length).toBe(5);
    });
  });

  describe('getUpgradeConfig function contract', () => {
    it('should return FeatureConfig for valid UpgradeFeature', () => {
      const config = getUpgradeConfig('wikidata');

      expect(config).toBeDefined();
      expect(config).toHaveProperty('title');
      expect(config).toHaveProperty('description');
      expect(config).toHaveProperty('benefits');
      expect(config).toHaveProperty('targetPlan');
      expect(config).toHaveProperty('price');
      expect(config).toHaveProperty('ctaText');
    });

    it('should return correct config for each feature', () => {
      const features: UpgradeFeature[] = [
        'wikidata',
        'businesses',
        'api',
        'enrichment',
        'history',
      ];

      features.forEach((feature) => {
        const config = getUpgradeConfig(feature);
        expect(config).toBe(UPGRADE_CONFIGS[feature]);
      });
    });

    it('should match FeatureConfig interface return type', () => {
      const config: FeatureConfig = getUpgradeConfig('wikidata');

      // Type check: should match FeatureConfig interface
      expect(typeof config.title).toBe('string');
      expect(typeof config.description).toBe('string');
      expect(Array.isArray(config.benefits)).toBe(true);
      expect(['pro', 'agency']).toContain(config.targetPlan);
      expect(typeof config.price).toBe('number');
      expect(typeof config.ctaText).toBe('string');
    });
  });

  describe('getRecommendedPlan function contract', () => {
    it('should return pro or agency', () => {
      const result = getRecommendedPlan('free', 'wikidata');
      expect(['pro', 'agency']).toContain(result);
    });

    it('should return agency when already on agency plan', () => {
      const result = getRecommendedPlan('agency', 'wikidata');
      expect(result).toBe('agency');
    });

    it('should return agency when feature requires agency', () => {
      const result = getRecommendedPlan('free', 'api');
      expect(result).toBe('agency');
    });

    it('should return agency when feature requires agency (from pro)', () => {
      const result = getRecommendedPlan('pro', 'api');
      expect(result).toBe('agency');
    });

    it('should return pro when feature requires pro (from free)', () => {
      const result = getRecommendedPlan('free', 'wikidata');
      expect(result).toBe('pro');
    });

    it('should return pro when feature requires pro (already on pro)', () => {
      const result = getRecommendedPlan('pro', 'wikidata');
      expect(result).toBe('pro');
    });

    it('should match return type contract', () => {
      const result: 'pro' | 'agency' = getRecommendedPlan('free', 'wikidata');
      expect(['pro', 'agency']).toContain(result);
    });

    it('should handle all plan transitions correctly', () => {
      const testCases: Array<{
        currentPlan: 'free' | 'pro' | 'agency';
        feature: UpgradeFeature;
        expected: 'pro' | 'agency';
      }> = [
        { currentPlan: 'free', feature: 'wikidata', expected: 'pro' },
        { currentPlan: 'free', feature: 'businesses', expected: 'pro' },
        { currentPlan: 'free', feature: 'history', expected: 'pro' },
        { currentPlan: 'free', feature: 'api', expected: 'agency' },
        { currentPlan: 'free', feature: 'enrichment', expected: 'agency' },
        { currentPlan: 'pro', feature: 'wikidata', expected: 'pro' },
        { currentPlan: 'pro', feature: 'api', expected: 'agency' },
        { currentPlan: 'agency', feature: 'wikidata', expected: 'agency' },
        { currentPlan: 'agency', feature: 'api', expected: 'agency' },
      ];

      testCases.forEach(({ currentPlan, feature, expected }) => {
        const result = getRecommendedPlan(currentPlan, feature);
        expect(result).toBe(expected);
      });
    });
  });

  describe('Contract stability', () => {
    it('should maintain UpgradeFeature union type', () => {
      // Critical: Components depend on these exact feature keys
      const features: UpgradeFeature[] = [
        'wikidata',
        'businesses',
        'api',
        'enrichment',
        'history',
      ];

      features.forEach((feature) => {
        expect(UPGRADE_CONFIGS[feature]).toBeDefined();
      });
    });

    it('should maintain FeatureConfig interface structure', () => {
      // Critical: UI components depend on these properties
      const config = UPGRADE_CONFIGS.wikidata;

      // Required properties must remain
      expect(config).toHaveProperty('title');
      expect(config).toHaveProperty('description');
      expect(config).toHaveProperty('benefits');
      expect(config).toHaveProperty('icon');
      expect(config).toHaveProperty('targetPlan');
      expect(config).toHaveProperty('price');
      expect(config).toHaveProperty('ctaText');
    });

    it('should maintain targetPlan as pro or agency only', () => {
      // Critical: Upgrade logic depends on these exact values
      const features: UpgradeFeature[] = [
        'wikidata',
        'businesses',
        'api',
        'enrichment',
        'history',
      ];

      features.forEach((feature) => {
        const config = UPGRADE_CONFIGS[feature];
        expect(['pro', 'agency']).toContain(config.targetPlan);
      });
    });

    it('should maintain price as non-negative number', () => {
      // Critical: Pricing display depends on this
      const features: UpgradeFeature[] = [
        'wikidata',
        'businesses',
        'api',
        'enrichment',
        'history',
      ];

      features.forEach((feature) => {
        const config = UPGRADE_CONFIGS[feature];
        expect(typeof config.price).toBe('number');
        expect(config.price).toBeGreaterThanOrEqual(0);
      });
    });
  });

  describe('Integration contracts', () => {
    it('should work with getUpgradeConfig and getRecommendedPlan together', () => {
      const feature: UpgradeFeature = 'wikidata';
      const config = getUpgradeConfig(feature);
      const recommendedPlan = getRecommendedPlan('free', feature);

      expect(config.targetPlan).toBe(recommendedPlan);
    });

    it('should ensure all pro features have pro targetPlan', () => {
      const proFeatures: UpgradeFeature[] = ['wikidata', 'businesses', 'history'];

      proFeatures.forEach((feature) => {
        const config = getUpgradeConfig(feature);
        expect(config.targetPlan).toBe('pro');
      });
    });

    it('should ensure all agency features have agency targetPlan', () => {
      const agencyFeatures: UpgradeFeature[] = ['api', 'enrichment'];

      agencyFeatures.forEach((feature) => {
        const config = getUpgradeConfig(feature);
        expect(config.targetPlan).toBe('agency');
      });
    });

    it('should have consistent pricing for same targetPlan', () => {
      const proFeatures: UpgradeFeature[] = ['wikidata', 'businesses', 'history'];
      const proPrices = proFeatures.map((f) => getUpgradeConfig(f).price);

      // All pro features should have the same price
      const uniqueProPrices = [...new Set(proPrices)];
      expect(uniqueProPrices.length).toBe(1);

      const agencyFeatures: UpgradeFeature[] = ['api', 'enrichment'];
      const agencyPrices = agencyFeatures.map((f) => getUpgradeConfig(f).price);

      // All agency features should have the same price
      const uniqueAgencyPrices = [...new Set(agencyPrices)];
      expect(uniqueAgencyPrices.length).toBe(1);
    });
  });
});

