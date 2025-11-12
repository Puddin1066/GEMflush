import { describe, it, expect } from 'vitest';
import {
  createBusinessSchema,
  updateBusinessSchema,
  businessCategorySchema,
  businessLocationSchema,
  crawlRequestSchema,
  fingerprintRequestSchema,
  wikidataPublishRequestSchema,
} from '../business';

describe('Business Validation', () => {
  describe('createBusinessSchema', () => {
    it('should validate a complete business object', () => {
      const validBusiness = {
        name: 'Test Business',
        url: 'https://testbusiness.com',
        category: 'restaurant',
        location: {
          city: 'San Francisco',
          state: 'CA',
          country: 'US',
        },
      };

      const result = createBusinessSchema.safeParse(validBusiness);
      expect(result.success).toBe(true);
    });

    it('should validate business with full address and coordinates', () => {
      const validBusiness = {
        name: 'Test Business',
        url: 'https://testbusiness.com',
        category: 'retail',
        location: {
          address: '123 Main St',
          city: 'San Francisco',
          state: 'CA',
          country: 'US',
          lat: 37.7749,
          lng: -122.4194,
        },
      };

      const result = createBusinessSchema.safeParse(validBusiness);
      expect(result.success).toBe(true);
    });

    it('should require business name', () => {
      const invalidBusiness = {
        url: 'https://testbusiness.com',
        category: 'restaurant',
        location: {
          city: 'San Francisco',
          state: 'CA',
          country: 'US',
        },
      };

      const result = createBusinessSchema.safeParse(invalidBusiness);
      expect(result.success).toBe(false);
    });

    it('should reject name shorter than 2 characters', () => {
      const invalidBusiness = {
        name: 'A',
        url: 'https://testbusiness.com',
        category: 'restaurant',
        location: {
          city: 'San Francisco',
          state: 'CA',
          country: 'US',
        },
      };

      const result = createBusinessSchema.safeParse(invalidBusiness);
      expect(result.success).toBe(false);
    });

    it('should reject name longer than 200 characters', () => {
      const invalidBusiness = {
        name: 'A'.repeat(201),
        url: 'https://testbusiness.com',
        category: 'restaurant',
        location: {
          city: 'San Francisco',
          state: 'CA',
          country: 'US',
        },
      };

      const result = createBusinessSchema.safeParse(invalidBusiness);
      expect(result.success).toBe(false);
    });

    it('should require valid URL', () => {
      const invalidBusiness = {
        name: 'Test Business',
        url: 'not-a-valid-url',
        category: 'restaurant',
        location: {
          city: 'San Francisco',
          state: 'CA',
          country: 'US',
        },
      };

      const result = createBusinessSchema.safeParse(invalidBusiness);
      expect(result.success).toBe(false);
    });

    it('should require valid category', () => {
      const invalidBusiness = {
        name: 'Test Business',
        url: 'https://testbusiness.com',
        category: 'invalid-category',
        location: {
          city: 'San Francisco',
          state: 'CA',
          country: 'US',
        },
      };

      const result = createBusinessSchema.safeParse(invalidBusiness);
      expect(result.success).toBe(false);
    });

    it('should require location city', () => {
      const invalidBusiness = {
        name: 'Test Business',
        url: 'https://testbusiness.com',
        category: 'restaurant',
        location: {
          state: 'CA',
          country: 'US',
        },
      };

      const result = createBusinessSchema.safeParse(invalidBusiness);
      expect(result.success).toBe(false);
    });

    it('should validate latitude range', () => {
      const invalidBusiness = {
        name: 'Test Business',
        url: 'https://testbusiness.com',
        category: 'restaurant',
        location: {
          city: 'San Francisco',
          state: 'CA',
          country: 'US',
          lat: 91, // Invalid: > 90
          lng: -122.4194,
        },
      };

      const result = createBusinessSchema.safeParse(invalidBusiness);
      expect(result.success).toBe(false);
    });

    it('should validate longitude range', () => {
      const invalidBusiness = {
        name: 'Test Business',
        url: 'https://testbusiness.com',
        category: 'restaurant',
        location: {
          city: 'San Francisco',
          state: 'CA',
          country: 'US',
          lat: 37.7749,
          lng: -181, // Invalid: < -180
        },
      };

      const result = createBusinessSchema.safeParse(invalidBusiness);
      expect(result.success).toBe(false);
    });
  });

  describe('updateBusinessSchema', () => {
    it('should allow partial updates', () => {
      const partialUpdate = {
        name: 'Updated Name',
      };

      const result = updateBusinessSchema.safeParse(partialUpdate);
      expect(result.success).toBe(true);
    });

    it('should allow updating only location', () => {
      const partialUpdate = {
        location: {
          city: 'New York',
          state: 'NY',
          country: 'US',
        },
      };

      const result = updateBusinessSchema.safeParse(partialUpdate);
      expect(result.success).toBe(true);
    });

    it('should allow empty update object', () => {
      const result = updateBusinessSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('should validate fields when provided', () => {
      const invalidUpdate = {
        name: 'A', // Too short
      };

      const result = updateBusinessSchema.safeParse(invalidUpdate);
      expect(result.success).toBe(false);
    });
  });

  describe('businessCategorySchema', () => {
    it('should include all business categories', () => {
      const categories = [
        'restaurant',
        'retail',
        'healthcare',
        'professional_services',
        'home_services',
        'automotive',
        'beauty',
        'fitness',
        'education',
        'entertainment',
        'real_estate',
        'technology',
        'other',
      ];

      categories.forEach(category => {
        expect(businessCategorySchema.options).toContain(category);
      });
    });

    it('should reject invalid categories', () => {
      const result = businessCategorySchema.safeParse('invalid');
      expect(result.success).toBe(false);
    });
  });

  describe('businessLocationSchema', () => {
    it('should validate complete location', () => {
      const location = {
        address: '123 Main St',
        city: 'San Francisco',
        state: 'CA',
        country: 'US',
        lat: 37.7749,
        lng: -122.4194,
      };

      const result = businessLocationSchema.safeParse(location);
      expect(result.success).toBe(true);
    });

    it('should validate minimal location', () => {
      const location = {
        city: 'San Francisco',
        state: 'CA',
        country: 'US',
      };

      const result = businessLocationSchema.safeParse(location);
      expect(result.success).toBe(true);
    });

    it('should require city', () => {
      const location = {
        state: 'CA',
        country: 'US',
      };

      const result = businessLocationSchema.safeParse(location);
      expect(result.success).toBe(false);
    });

    it('should validate latitude bounds', () => {
      const validLocation = {
        city: 'SF',
        state: 'CA',
        country: 'US',
        lat: 90,
        lng: 0,
      };

      const invalidLocation = {
        city: 'SF',
        state: 'CA',
        country: 'US',
        lat: 91,
        lng: 0,
      };

      expect(businessLocationSchema.safeParse(validLocation).success).toBe(true);
      expect(businessLocationSchema.safeParse(invalidLocation).success).toBe(false);
    });

    it('should validate longitude bounds', () => {
      const validLocation = {
        city: 'SF',
        state: 'CA',
        country: 'US',
        lat: 0,
        lng: 180,
      };

      const invalidLocation = {
        city: 'SF',
        state: 'CA',
        country: 'US',
        lat: 0,
        lng: 181,
      };

      expect(businessLocationSchema.safeParse(validLocation).success).toBe(true);
      expect(businessLocationSchema.safeParse(invalidLocation).success).toBe(false);
    });
  });

  describe('crawlRequestSchema', () => {
    it('should validate crawl request', () => {
      const request = {
        businessId: 1,
        forceRecrawl: false,
      };

      const result = crawlRequestSchema.safeParse(request);
      expect(result.success).toBe(true);
    });

    it('should require businessId', () => {
      const request = {
        forceRecrawl: true,
      };

      const result = crawlRequestSchema.safeParse(request);
      expect(result.success).toBe(false);
    });

    it('should require positive businessId', () => {
      const request = {
        businessId: 0,
      };

      const result = crawlRequestSchema.safeParse(request);
      expect(result.success).toBe(false);
    });

    it('should default forceRecrawl to false', () => {
      const request = {
        businessId: 1,
      };

      const result = crawlRequestSchema.safeParse(request);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.forceRecrawl).toBe(false);
      }
    });

    it('should accept forceRecrawl true', () => {
      const request = {
        businessId: 1,
        forceRecrawl: true,
      };

      const result = crawlRequestSchema.safeParse(request);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.forceRecrawl).toBe(true);
      }
    });
  });

  describe('fingerprintRequestSchema', () => {
    it('should validate fingerprint request', () => {
      const request = {
        businessId: 1,
        includeCompetitors: true,
      };

      const result = fingerprintRequestSchema.safeParse(request);
      expect(result.success).toBe(true);
    });

    it('should require businessId', () => {
      const request = {
        includeCompetitors: false,
      };

      const result = fingerprintRequestSchema.safeParse(request);
      expect(result.success).toBe(false);
    });

    it('should default includeCompetitors to true', () => {
      const request = {
        businessId: 1,
      };

      const result = fingerprintRequestSchema.safeParse(request);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.includeCompetitors).toBe(true);
      }
    });

    it('should accept includeCompetitors false', () => {
      const request = {
        businessId: 1,
        includeCompetitors: false,
      };

      const result = fingerprintRequestSchema.safeParse(request);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.includeCompetitors).toBe(false);
      }
    });
  });

  describe('wikidataPublishRequestSchema', () => {
    it('should validate publish request', () => {
      const request = {
        businessId: 1,
        publishToProduction: false,
      };

      const result = wikidataPublishRequestSchema.safeParse(request);
      expect(result.success).toBe(true);
    });

    it('should require businessId', () => {
      const request = {
        publishToProduction: true,
      };

      const result = wikidataPublishRequestSchema.safeParse(request);
      expect(result.success).toBe(false);
    });

    it('should default publishToProduction to false', () => {
      const request = {
        businessId: 1,
      };

      const result = wikidataPublishRequestSchema.safeParse(request);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.publishToProduction).toBe(false);
      }
    });

    it('should accept publishToProduction true', () => {
      const request = {
        businessId: 1,
        publishToProduction: true,
      };

      const result = wikidataPublishRequestSchema.safeParse(request);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.publishToProduction).toBe(true);
      }
    });
  });
});

