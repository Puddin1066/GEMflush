/**
 * Tests for ReferenceFinder
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ReferenceFinder } from '../reference-finder';
import type { CrawlDataInput } from '../types';

// Mock the notability checker
vi.mock('../notability-checker', () => ({
  notabilityChecker: {
    checkNotability: vi.fn()
  }
}));

describe('ReferenceFinder', () => {
  const mockCrawlData: CrawlDataInput = {
    url: 'https://example-business.com',
    name: 'Example Business Inc',
    location: {
      city: 'San Francisco',
      state: 'CA',
      country: 'US'
    },
    business: {
      industry: 'Technology',
      founded: '2015',
      employees: '50-100'
    }
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('findNotabilityReferences', () => {
    it('should find and transform references successfully', async () => {
      const { notabilityChecker } = await import('../notability-checker');
      
      // Mock successful notability check
      vi.mocked(notabilityChecker.checkNotability).mockResolvedValue({
        isNotable: true,
        confidence: 0.85,
        reasons: ['Has multiple serious references'],
        references: [
          {
            url: 'https://news.example.com/business-feature',
            title: 'Example Business Featured in Local News',
            snippet: 'Local technology company making waves...',
            source: 'news'
          },
          {
            url: 'https://directory.example.com/example-business',
            title: 'Example Business - Business Directory',
            snippet: 'Official business listing...',
            source: 'directory'
          }
        ],
        seriousReferenceCount: 2,
        assessment: {
          meetsNotability: true,
          confidence: 0.85,
          seriousReferenceCount: 2,
          publiclyAvailableCount: 2,
          independentCount: 2,
          summary: 'Business meets notability standards',
          references: [
            {
              index: 0,
              isSerious: true,
              isPubliclyAvailable: true,
              isIndependent: true,
              sourceType: 'news',
              trustScore: 85,
              reasoning: 'News coverage provides verification'
            },
            {
              index: 1,
              isSerious: true,
              isPubliclyAvailable: true,
              isIndependent: true,
              sourceType: 'directory',
              trustScore: 75,
              reasoning: 'Directory listing provides verification'
            }
          ],
          recommendations: ['Ready to publish']
        }
      });

      const result = await ReferenceFinder.findNotabilityReferences(mockCrawlData, {
        maxReferences: 5,
        requireSerious: true,
        minConfidence: 0.7
      });

      expect(result.isNotable).toBe(true);
      expect(result.confidence).toBe(0.85);
      expect(result.references).toHaveLength(2);
      expect(result.seriousReferenceCount).toBe(2);
      
      // Check reference transformation
      expect(result.references[0]).toMatchObject({
        url: 'https://news.example.com/business-feature',
        title: 'Example Business Featured in Local News',
        source: 'news',
        trustScore: 85,
        isSerious: true
      });
    });

    it('should handle notability check failure gracefully', async () => {
      const { notabilityChecker } = await import('../notability-checker');
      
      // Mock notability check failure
      vi.mocked(notabilityChecker.checkNotability).mockRejectedValue(
        new Error('API rate limit exceeded')
      );

      const result = await ReferenceFinder.findNotabilityReferences(mockCrawlData);

      expect(result.isNotable).toBe(true); // Fallback should still be notable
      expect(result.references.length).toBeGreaterThan(0);
      expect(result.summary).toContain('Mock references generated');
    });

    it('should filter for serious references when required', async () => {
      const { notabilityChecker } = await import('../notability-checker');
      
      // Mock mixed reference quality
      vi.mocked(notabilityChecker.checkNotability).mockResolvedValue({
        isNotable: true,
        confidence: 0.75,
        reasons: ['Has some references'],
        references: [
          {
            url: 'https://news.example.com/article',
            title: 'News Article',
            snippet: 'News coverage',
            source: 'news'
          },
          {
            url: 'https://social.example.com/post',
            title: 'Social Media Post',
            snippet: 'Social media mention',
            source: 'social'
          }
        ],
        seriousReferenceCount: 1,
        assessment: {
          meetsNotability: true,
          confidence: 0.75,
          seriousReferenceCount: 1,
          publiclyAvailableCount: 2,
          independentCount: 2,
          summary: 'Mixed reference quality',
          references: [
            {
              index: 0,
              isSerious: true,
              isPubliclyAvailable: true,
              isIndependent: true,
              sourceType: 'news',
              trustScore: 85,
              reasoning: 'News coverage'
            },
            {
              index: 1,
              isSerious: false,
              isPubliclyAvailable: true,
              isIndependent: true,
              sourceType: 'social',
              trustScore: 45,
              reasoning: 'Social media mention'
            }
          ],
          recommendations: ['Consider additional references']
        }
      });

      const result = await ReferenceFinder.findNotabilityReferences(mockCrawlData, {
        requireSerious: true
      });

      expect(result.references).toHaveLength(1);
      expect(result.references[0].isSerious).toBe(true);
    });
  });

  describe('createMockReferences', () => {
    it('should create appropriate mock references', () => {
      const references = ReferenceFinder.createMockReferences(mockCrawlData);

      expect(references.length).toBeGreaterThan(0);
      
      // Should include Yelp reference
      const yelpRef = references.find(ref => ref.source === 'yelp');
      expect(yelpRef).toBeDefined();
      expect(yelpRef?.url).toContain('yelp.com');
      expect(yelpRef?.isSerious).toBe(true);

      // Should include Google Maps reference
      const mapsRef = references.find(ref => ref.source === 'google_maps');
      expect(mapsRef).toBeDefined();
      expect(mapsRef?.isSerious).toBe(true);

      // Should include location-specific reference
      const yellowPagesRef = references.find(ref => ref.source === 'yellow_pages');
      expect(yellowPagesRef).toBeDefined();
      expect(yellowPagesRef?.url).toContain('san-francisco');
    });

    it('should include industry-specific references when available', () => {
      const references = ReferenceFinder.createMockReferences(mockCrawlData);
      
      const industryRef = references.find(ref => ref.source === 'industry_directory');
      expect(industryRef).toBeDefined();
      expect(industryRef?.url).toContain('technology');
    });

    it('should include news reference for established businesses', () => {
      const establishedBusiness = {
        ...mockCrawlData,
        business: {
          ...mockCrawlData.business!,
          founded: '2010' // Established before 2020
        }
      };

      const references = ReferenceFinder.createMockReferences(establishedBusiness);
      
      const newsRef = references.find(ref => ref.source === 'local_news');
      expect(newsRef).toBeDefined();
      expect(newsRef?.isSerious).toBe(true);
      expect(newsRef?.trustScore).toBeGreaterThan(80);
    });
  });

  describe('validateReference', () => {
    it('should validate good references', () => {
      const goodReference = {
        url: 'https://example.com/article',
        title: 'Example Article Title',
        snippet: 'Article content...',
        source: 'news',
        trustScore: 85,
        isSerious: true
      };

      const result = ReferenceFinder.validateReference(goodReference);
      expect(result.isValid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it('should identify invalid URLs', () => {
      const badReference = {
        url: 'not-a-valid-url',
        title: 'Good Title',
        snippet: 'Content',
        source: 'news',
        trustScore: 85,
        isSerious: true
      };

      const result = ReferenceFinder.validateReference(badReference);
      expect(result.isValid).toBe(false);
      expect(result.issues).toContain('Invalid URL format');
    });

    it('should identify low trust scores', () => {
      const lowTrustReference = {
        url: 'https://example.com',
        title: 'Title',
        snippet: 'Content',
        source: 'unknown',
        trustScore: 30,
        isSerious: false
      };

      const result = ReferenceFinder.validateReference(lowTrustReference);
      expect(result.isValid).toBe(false);
      expect(result.issues).toContain('Trust score too low');
    });
  });

  describe('getStatistics', () => {
    it('should calculate reference statistics correctly', () => {
      const references = [
        {
          url: 'https://news.com/article',
          title: 'News Article',
          snippet: 'Content',
          source: 'news',
          trustScore: 85,
          isSerious: true
        },
        {
          url: 'https://directory.com/listing',
          title: 'Directory Listing',
          snippet: 'Content',
          source: 'directory',
          trustScore: 75,
          isSerious: true
        },
        {
          url: 'https://social.com/post',
          title: 'Social Post',
          snippet: 'Content',
          source: 'social',
          trustScore: 45,
          isSerious: false
        }
      ];

      const stats = ReferenceFinder.getStatistics(references);

      expect(stats.total).toBe(3);
      expect(stats.serious).toBe(2);
      expect(stats.averageTrustScore).toBeCloseTo(68.33, 1);
      expect(stats.sourceTypes).toEqual({
        news: 1,
        directory: 1,
        social: 1
      });
    });

    it('should handle empty reference array', () => {
      const stats = ReferenceFinder.getStatistics([]);

      expect(stats.total).toBe(0);
      expect(stats.serious).toBe(0);
      expect(stats.averageTrustScore).toBe(0);
      expect(stats.sourceTypes).toEqual({});
    });
  });
});
