import { describe, it, expect } from 'vitest';
import type {
  BusinessLocation,
  CrawledData,
  CrawlResult,
  FingerprintAnalysis,
  LLMResult,
  WikidataEntityData,
  PlanFeatures,
  SubscriptionPlan,
  CompetitiveBenchmark,
} from '../gemflush';

describe('GEMflush Types - Type Validation', () => {
  describe('BusinessLocation', () => {
    it('should accept valid location data', () => {
      const location: BusinessLocation = {
        city: 'San Francisco',
        state: 'CA',
        country: 'US',
      };

      expect(location.city).toBe('San Francisco');
      expect(location.state).toBe('CA');
      expect(location.country).toBe('US');
    });

    it('should support optional fields', () => {
      const location: BusinessLocation = {
        address: '123 Main St',
        city: 'San Francisco',
        state: 'CA',
        country: 'US',
        lat: 37.7749,
        lng: -122.4194,
      };

      expect(location.address).toBe('123 Main St');
      expect(location.lat).toBe(37.7749);
      expect(location.lng).toBe(-122.4194);
    });
  });

  describe('CrawledData', () => {
    it('should accept minimal crawled data', () => {
      const data: CrawledData = {};

      expect(data).toBeDefined();
    });

    it('should support all optional fields', () => {
      const data: CrawledData = {
        name: 'Test Business',
        description: 'A test business',
        phone: '555-1234',
        email: 'test@example.com',
        address: '123 Main St',
        socialLinks: {
          facebook: 'https://facebook.com/test',
          instagram: 'https://instagram.com/test',
        },
        categories: ['restaurant', 'food'],
        services: ['dining', 'catering'],
        imageUrl: 'https://example.com/image.jpg',
      };

      expect(data.name).toBe('Test Business');
      expect(data.socialLinks?.facebook).toBe('https://facebook.com/test');
      expect(data.categories).toHaveLength(2);
    });

    it('should support businessDetails', () => {
      const data: CrawledData = {
        businessDetails: {
          industry: 'Technology',
          employeeCount: 50,
          revenue: '$1M',
          products: ['Software', 'Services'],
        },
      };

      expect(data.businessDetails?.industry).toBe('Technology');
      expect(data.businessDetails?.employeeCount).toBe(50);
    });

    it('should support llmEnhanced data', () => {
      const data: CrawledData = {
        llmEnhanced: {
          extractedEntities: ['Entity1', 'Entity2'],
          businessCategory: 'Technology',
          serviceOfferings: ['Consulting'],
          targetAudience: 'Enterprises',
          keyDifferentiators: ['Quality'],
          confidence: 0.9,
          model: 'gpt-4',
          processedAt: new Date(),
        },
      };

      expect(data.llmEnhanced?.confidence).toBe(0.9);
      expect(data.llmEnhanced?.processedAt).toBeInstanceOf(Date);
    });
  });

  describe('CrawlResult', () => {
    it('should support successful crawl', () => {
      const result: CrawlResult = {
        success: true,
        data: {
          name: 'Test Business',
        },
        url: 'https://example.com',
        crawledAt: new Date(),
      };

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.error).toBeUndefined();
    });

    it('should support failed crawl', () => {
      const result: CrawlResult = {
        success: false,
        error: 'Failed to fetch',
        url: 'https://example.com',
        crawledAt: new Date(),
      };

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to fetch');
      expect(result.data).toBeUndefined();
    });
  });

  describe('LLMResult', () => {
    it('should accept valid LLM result', () => {
      const result: LLMResult = {
        model: 'gpt-4',
        promptType: 'factual',
        mentioned: true,
        sentiment: 'positive',
        accuracy: 0.8,
        rankPosition: null,
        rawResponse: 'Test response',
        tokensUsed: 100,
      };

      expect(result.model).toBe('gpt-4');
      expect(result.mentioned).toBe(true);
      expect(result.sentiment).toBe('positive');
    });

    it('should support all sentiment values', () => {
      const sentiments: LLMResult['sentiment'][] = ['positive', 'neutral', 'negative'];
      
      sentiments.forEach(sentiment => {
        const result: LLMResult = {
          model: 'gpt-4',
          promptType: 'factual',
          mentioned: true,
          sentiment,
          accuracy: 0.5,
          rankPosition: null,
          rawResponse: 'Test',
          tokensUsed: 50,
        };
        expect(result.sentiment).toBe(sentiment);
      });
    });

    it('should support optional fields', () => {
      const result: LLMResult = {
        model: 'gpt-4',
        promptType: 'recommendation',
        mentioned: true,
        sentiment: 'positive',
        accuracy: 0.9,
        rankPosition: 1,
        rawResponse: 'Test',
        tokensUsed: 150,
        reasoning: 'High confidence',
        confidence: 0.95,
        contextualRelevance: 0.9,
        competitorMentions: ['Competitor A'],
        keyPhrases: ['quality', 'service'],
      };

      expect(result.reasoning).toBe('High confidence');
      expect(result.competitorMentions).toHaveLength(1);
    });
  });

  describe('FingerprintAnalysis', () => {
    it('should accept valid fingerprint analysis', () => {
      const analysis: FingerprintAnalysis = {
        businessId: 1,
        businessName: 'Test Business',
        visibilityScore: 75,
        mentionRate: 80,
        sentimentScore: 0.8,
        accuracyScore: 0.85,
        avgRankPosition: 2,
        llmResults: [],
        generatedAt: new Date(),
      };

      expect(analysis.visibilityScore).toBe(75);
      expect(analysis.mentionRate).toBe(80);
      expect(analysis.generatedAt).toBeInstanceOf(Date);
    });

    it('should support optional competitiveBenchmark', () => {
      const analysis: FingerprintAnalysis = {
        businessId: 1,
        businessName: 'Test',
        visibilityScore: 50,
        mentionRate: 50,
        sentimentScore: 0.5,
        accuracyScore: 0.5,
        avgRankPosition: null,
        llmResults: [],
        generatedAt: new Date(),
        competitiveBenchmark: {
          rank: 3,
          totalCompetitors: 10,
          competitorScores: [
            { businessId: 2, businessName: 'Competitor', score: 80 },
          ],
        },
      };

      expect(analysis.competitiveBenchmark?.rank).toBe(3);
    });

    it('should support optional insights', () => {
      const analysis: FingerprintAnalysis = {
        businessId: 1,
        businessName: 'Test',
        visibilityScore: 50,
        mentionRate: 50,
        sentimentScore: 0.5,
        accuracyScore: 0.5,
        avgRankPosition: null,
        llmResults: [],
        generatedAt: new Date(),
        insights: {
          strengths: ['Quality service'],
          weaknesses: ['Limited visibility'],
          opportunities: ['SEO improvement'],
          summary: 'Good business with growth potential',
          confidenceLevel: 'high',
          generatedBy: 'gpt-4',
        },
      };

      expect(analysis.insights?.confidenceLevel).toBe('high');
      expect(analysis.insights?.strengths).toHaveLength(1);
    });
  });

  describe('PlanFeatures', () => {
    it('should accept valid plan features', () => {
      const features: PlanFeatures = {
        wikidataPublishing: true,
        fingerprintFrequency: 'weekly',
        maxBusinesses: 5,
        historicalData: true,
        competitiveBenchmark: true,
      };

      expect(features.wikidataPublishing).toBe(true);
      expect(features.fingerprintFrequency).toBe('weekly');
    });

    it('should support all frequency values', () => {
      const frequencies: PlanFeatures['fingerprintFrequency'][] = ['monthly', 'weekly', 'daily'];
      
      frequencies.forEach(frequency => {
        const features: PlanFeatures = {
          wikidataPublishing: false,
          fingerprintFrequency: frequency,
          maxBusinesses: 1,
          historicalData: false,
          competitiveBenchmark: true,
        };
        expect(features.fingerprintFrequency).toBe(frequency);
      });
    });

    it('should support optional fields', () => {
      const features: PlanFeatures = {
        wikidataPublishing: true,
        fingerprintFrequency: 'weekly',
        maxBusinesses: 25,
        historicalData: true,
        competitiveBenchmark: true,
        progressiveEnrichment: true,
        apiAccess: true,
      };

      expect(features.progressiveEnrichment).toBe(true);
      expect(features.apiAccess).toBe(true);
    });
  });

  describe('SubscriptionPlan', () => {
    it('should accept valid subscription plan', () => {
      const plan: SubscriptionPlan = {
        id: 'pro',
        name: 'Pro Plan',
        price: 49,
        features: {
          wikidataPublishing: true,
          fingerprintFrequency: 'weekly',
          maxBusinesses: 5,
          historicalData: true,
          competitiveBenchmark: true,
        },
      };

      expect(plan.id).toBe('pro');
      expect(plan.price).toBe(49);
    });

    it('should support optional stripePriceId', () => {
      const plan: SubscriptionPlan = {
        id: 'pro',
        name: 'Pro Plan',
        price: 49,
        stripePriceId: 'price_123',
        features: {
          wikidataPublishing: true,
          fingerprintFrequency: 'weekly',
          maxBusinesses: 5,
          historicalData: true,
          competitiveBenchmark: true,
        },
      };

      expect(plan.stripePriceId).toBe('price_123');
    });
  });
});

