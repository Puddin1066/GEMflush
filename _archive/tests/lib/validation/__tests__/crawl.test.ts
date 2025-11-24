// Crawl data validation schema tests
// Tests for CrawledData structure validation

import { describe, it, expect } from 'vitest';
import {
  crawledDataSchema,
  socialLinksSchema,
  businessDetailsSchema,
  llmEnhancedSchema,
  validateCrawledData,
  assertCrawledData,
} from '../crawl';
import type { CrawledData } from '@/lib/types/gemflush';

describe('Crawl Data Validation Schemas', () => {
  describe('crawledDataSchema', () => {
    it('should validate minimal CrawledData (empty object)', () => {
      const data = {};
      const result = crawledDataSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should validate CrawledData with all optional fields', () => {
      const data: CrawledData = {
        name: 'Test Business',
        description: 'Test description',
        phone: '123-456-7890',
        email: 'test@example.com',
        address: '123 Main St',
        socialLinks: {
          facebook: 'https://facebook.com/test',
          instagram: 'https://instagram.com/test',
          twitter: 'https://twitter.com/test',
          linkedin: 'https://linkedin.com/company/test',
        },
        structuredData: { '@type': 'LocalBusiness' },
        metaTags: { 'og:title': 'Test' },
        founded: '2020',
        categories: ['technology'],
        services: ['Software Development'],
        imageUrl: 'https://example.com/image.jpg',
        businessDetails: {
          industry: 'Software',
          sector: 'Technology',
          employeeCount: 50,
        },
      };
      const result = crawledDataSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should validate socialLinks structure', () => {
      const data = {
        socialLinks: {
          facebook: 'https://facebook.com/test',
          instagram: 'https://instagram.com/test',
        },
      };
      const result = crawledDataSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should validate businessDetails structure', () => {
      const data = {
        businessDetails: {
          industry: 'Software',
          employeeCount: 50,
          products: ['Product A'],
          services: ['Service B'],
        },
      };
      const result = crawledDataSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should validate llmEnhanced structure', () => {
      const data = {
        llmEnhanced: {
          extractedEntities: ['Entity1'],
          businessCategory: 'Technology',
          serviceOfferings: ['Service1'],
          targetAudience: 'Enterprise',
          keyDifferentiators: ['Differentiator1'],
          confidence: 0.95,
          model: 'gpt-4',
          processedAt: new Date(),
        },
      };
      const result = crawledDataSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should accept llmEnhanced with string date', () => {
      const data = {
        llmEnhanced: {
          extractedEntities: ['Entity1'],
          businessCategory: 'Technology',
          serviceOfferings: ['Service1'],
          targetAudience: 'Enterprise',
          keyDifferentiators: ['Differentiator1'],
          confidence: 0.95,
          model: 'gpt-4',
          processedAt: new Date().toISOString(),
        },
      };
      const result = crawledDataSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should reject invalid email format', () => {
      const data = { email: 'not-an-email' };
      const result = crawledDataSchema.safeParse(data);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('email');
      }
    });

    it('should reject invalid URL in socialLinks', () => {
      const data = {
        socialLinks: {
          facebook: 'not-a-url',
        },
      };
      const result = crawledDataSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should reject invalid URL in imageUrl', () => {
      const data = {
        imageUrl: 'not-a-url',
      };
      const result = crawledDataSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should accept employeeCount as number', () => {
      const data = {
        businessDetails: {
          employeeCount: 50,
        },
      };
      const result = crawledDataSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should accept employeeCount as string', () => {
      const data = {
        businessDetails: {
          employeeCount: '50-100',
        },
      };
      const result = crawledDataSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should validate all social link fields', () => {
      const data = {
        socialLinks: {
          facebook: 'https://facebook.com/test',
          instagram: 'https://instagram.com/test',
          linkedin: 'https://linkedin.com/company/test',
          twitter: 'https://twitter.com/test',
          youtube: 'https://youtube.com/@test',
          tiktok: 'https://tiktok.com/@test',
        },
      };
      const result = crawledDataSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should validate complete businessDetails', () => {
      const data = {
        businessDetails: {
          industry: 'Software',
          sector: 'Technology',
          businessType: 'B2B SaaS',
          legalForm: 'LLC',
          founded: '2020',
          dissolved: undefined,
          employeeCount: 50,
          revenue: '$5M-10M',
          locations: 3,
          products: ['Product A', 'Product B'],
          services: ['Service A', 'Service B'],
          brands: ['Brand A'],
          parentCompany: 'Parent Corp',
          subsidiaries: ['Sub A'],
          partnerships: ['Partner A'],
          awards: ['Award 2023'],
          certifications: ['ISO 9001'],
          targetMarket: 'Enterprise',
          headquarters: 'San Francisco',
          ceo: 'John Doe',
          stockSymbol: 'TEST',
        },
      };
      const result = crawledDataSchema.safeParse(data);
      expect(result.success).toBe(true);
    });
  });

  describe('socialLinksSchema', () => {
    it('should validate valid social links', () => {
      const links = {
        facebook: 'https://facebook.com/test',
        instagram: 'https://instagram.com/test',
      };
      const result = socialLinksSchema.safeParse(links);
      expect(result.success).toBe(true);
    });

    it('should reject invalid URLs', () => {
      const links = {
        facebook: 'not-a-url',
      };
      const result = socialLinksSchema.safeParse(links);
      expect(result.success).toBe(false);
    });

    it('should accept undefined', () => {
      const result = socialLinksSchema.safeParse(undefined);
      expect(result.success).toBe(true);
    });
  });

  describe('businessDetailsSchema', () => {
    it('should validate complete business details', () => {
      const details = {
        industry: 'Software',
        employeeCount: 50,
        products: ['Product A'],
      };
      const result = businessDetailsSchema.safeParse(details);
      expect(result.success).toBe(true);
    });

    it('should accept employeeCount as number', () => {
      const details = { employeeCount: 50 };
      const result = businessDetailsSchema.safeParse(details);
      expect(result.success).toBe(true);
    });

    it('should accept employeeCount as string', () => {
      const details = { employeeCount: '50-100' };
      const result = businessDetailsSchema.safeParse(details);
      expect(result.success).toBe(true);
    });
  });

  describe('llmEnhancedSchema', () => {
    it('should validate complete llmEnhanced data', () => {
      const enhanced = {
        extractedEntities: ['Entity1'],
        businessCategory: 'Technology',
        serviceOfferings: ['Service1'],
        targetAudience: 'Enterprise',
        keyDifferentiators: ['Diff1'],
        confidence: 0.95,
        model: 'gpt-4',
        processedAt: new Date(),
      };
      const result = llmEnhancedSchema.safeParse(enhanced);
      expect(result.success).toBe(true);
    });

    it('should reject confidence outside 0-1 range', () => {
      const enhanced = {
        extractedEntities: ['Entity1'],
        businessCategory: 'Technology',
        serviceOfferings: ['Service1'],
        targetAudience: 'Enterprise',
        keyDifferentiators: ['Diff1'],
        confidence: 1.5, // Invalid: > 1
        model: 'gpt-4',
        processedAt: new Date(),
      };
      const result = llmEnhancedSchema.safeParse(enhanced);
      expect(result.success).toBe(false);
    });

    it('should reject negative confidence', () => {
      const enhanced = {
        extractedEntities: ['Entity1'],
        businessCategory: 'Technology',
        serviceOfferings: ['Service1'],
        targetAudience: 'Enterprise',
        keyDifferentiators: ['Diff1'],
        confidence: -0.1, // Invalid: < 0
        model: 'gpt-4',
        processedAt: new Date(),
      };
      const result = llmEnhancedSchema.safeParse(enhanced);
      expect(result.success).toBe(false);
    });
  });

  describe('validateCrawledData', () => {
    it('should return success for valid data', () => {
      const data = { name: 'Test Business' };
      const result = validateCrawledData(data);
      expect(result.success).toBe(true);
      expect(result.errors).toBeUndefined();
    });

    it('should return errors for invalid data', () => {
      const data = { email: 'not-an-email' };
      const result = validateCrawledData(data);
      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
    });
  });

  describe('assertCrawledData', () => {
    it('should not throw for valid data', () => {
      const data = { name: 'Test Business' };
      expect(() => assertCrawledData(data)).not.toThrow();
    });

    it('should throw for invalid data', () => {
      const data = { email: 'not-an-email' };
      expect(() => assertCrawledData(data)).toThrow();
    });
  });
});

