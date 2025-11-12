import { describe, it, expect } from 'vitest';
import {
  createBusinessSchema,
  updateBusinessSchema,
  businessLocationSchema,
  businessCategorySchema,
  crawlRequestSchema,
  fingerprintRequestSchema,
  wikidataPublishRequestSchema,
} from '@/lib/validation/business';

describe('Validation E2E Tests', () => {
  describe('Complete Business Creation Flow', () => {
    it('should validate complete business creation workflow', () => {
      const businessData = {
        name: 'Acme Corp',
        url: 'https://acmecorp.com',
        category: 'technology' as const,
        location: {
          address: '123 Tech St',
          city: 'San Francisco',
          state: 'CA',
          country: 'US',
          lat: 37.7749,
          lng: -122.4194,
        },
      };

      // Validate location
      const locationResult = businessLocationSchema.safeParse(businessData.location);
      expect(locationResult.success).toBe(true);

      // Validate category
      const categoryResult = businessCategorySchema.safeParse(businessData.category);
      expect(categoryResult.success).toBe(true);

      // Validate complete business
      const businessResult = createBusinessSchema.safeParse(businessData);
      expect(businessResult.success).toBe(true);
    });

    it('should validate business update workflow', () => {
      const originalBusiness = {
        name: 'Acme Corp',
        url: 'https://acmecorp.com',
        location: {
          city: 'San Francisco',
          state: 'CA',
          country: 'US',
        },
      };

      // Validate original
      const originalResult = createBusinessSchema.safeParse(originalBusiness);
      expect(originalResult.success).toBe(true);

      // Validate partial update
      const update = {
        name: 'Acme Corporation',
        location: {
          city: 'New York',
          state: 'NY',
          country: 'US',
        },
      };

      const updateResult = updateBusinessSchema.safeParse(update);
      expect(updateResult.success).toBe(true);
    });
  });

  describe('API Request Validation Flow', () => {
    it('should validate crawl request workflow', () => {
      const request = {
        businessId: 1,
        forceRecrawl: true,
      };

      const result = crawlRequestSchema.safeParse(request);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.businessId).toBe(1);
        expect(result.data.forceRecrawl).toBe(true);
      }
    });

    it('should validate fingerprint request workflow', () => {
      const request = {
        businessId: 1,
        includeCompetitors: false,
      };

      const result = fingerprintRequestSchema.safeParse(request);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.businessId).toBe(1);
        expect(result.data.includeCompetitors).toBe(false);
      }
    });

    it('should validate wikidata publish request workflow', () => {
      const request = {
        businessId: 1,
        publishToProduction: true,
      };

      const result = wikidataPublishRequestSchema.safeParse(request);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.businessId).toBe(1);
        expect(result.data.publishToProduction).toBe(true);
      }
    });
  });

  describe('Error Handling Flow', () => {
    it('should handle validation errors gracefully', () => {
      const invalidBusiness = {
        name: 'A', // Too short
        url: 'not-a-url',
        location: {
          // Missing required fields
        },
      };

      const result = createBusinessSchema.safeParse(invalidBusiness);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.length).toBeGreaterThan(0);
      }
    });

    it('should provide detailed error messages', () => {
      const invalidLocation = {
        // Missing city, state, country
      };

      const result = businessLocationSchema.safeParse(invalidLocation);
      expect(result.success).toBe(false);
      if (!result.success) {
        const errors = result.error.issues.map(issue => issue.path.join('.'));
        expect(errors).toContain('city');
        expect(errors).toContain('state');
        expect(errors).toContain('country');
      }
    });
  });
});

