/**
 * TDD Test: Wikidata Notability Checker - Tests Drive Implementation
 * 
 * SPECIFICATION: Check Business Notability for Wikidata Publishing
 * 
 * As a system
 * I want to check if a business meets Wikidata notability standards
 * So that only notable businesses are published to Wikidata
 * 
 * Acceptance Criteria:
 * 1. Normalizes business names (removes test timestamps, trailing numbers)
 * 2. Finds references using Google Search API
 * 3. Assesses reference quality with LLM
 * 4. Determines notability based on serious, publicly available references
 * 5. Handles rate limits gracefully
 * 6. Returns structured notability result with confidence scores
 * 
 * TDD Cycle: RED → GREEN → REFACTOR
 * Tests written FIRST to drive implementation
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotabilityChecker } from '../notability-checker';
import { google } from 'googleapis';
import { openRouterClient } from '@/lib/llm';

// Mock Google Search API
vi.mock('googleapis', () => ({
  google: {
    customsearch: vi.fn(() => ({
      cse: {
        list: vi.fn(),
      },
    })),
  },
}));

// Mock OpenRouter LLM client
vi.mock('@/lib/llm', () => ({
  openRouterClient: {
    query: vi.fn(),
  },
}));

describe('🔴 RED: Wikidata Notability Checker Specification', () => {
  let checker: NotabilityChecker;
  let mockCustomSearch: any;
  let mockLLMQuery: any;

  beforeEach(() => {
    vi.clearAllMocks();
    checker = new NotabilityChecker();
    
    // Get mocked instances
    mockCustomSearch = (google.customsearch as any)();
    mockLLMQuery = vi.mocked(openRouterClient.query);
    
    // Reset environment variables
    process.env.GOOGLE_SEARCH_API_KEY = 'test-key';
    process.env.GOOGLE_SEARCH_ENGINE_ID = 'test-engine';
    process.env.USE_MOCK_GOOGLE_SEARCH = 'false';
    process.env.NODE_ENV = 'test';
  });

  /**
   * SPECIFICATION 1: Normalize Business Names
   * 
   * Given: Business name with test timestamp suffix
   * When: checkNotability is called
   * Then: Name is normalized (timestamp removed) before searching
   */
  it('normalizes business name by removing test timestamps', async () => {
    // Arrange: Business name with timestamp
    const businessName = 'Blue Bottle Coffee 1763324055284';
    const location = { city: 'San Francisco', state: 'CA' };
    
    // Mock Google Search to return references
    vi.mocked(mockCustomSearch.cse.list).mockResolvedValue({
      data: {
        items: [
          {
            link: 'https://example.com/blue-bottle',
            title: 'Blue Bottle Coffee',
            snippet: 'Coffee shop in San Francisco',
          },
        ],
      },
    });
    
    // Mock LLM assessment
    mockLLMQuery.mockResolvedValue({
      content: JSON.stringify({
        meetsNotability: true,
        confidence: 0.85,
        seriousReferenceCount: 3,
        publiclyAvailableCount: 3,
        independentCount: 3,
        summary: 'Notable business with serious references',
        references: [
          {
            index: 0,
            isSerious: true,
            isPubliclyAvailable: true,
            isIndependent: true,
            sourceType: 'news',
            trustScore: 0.9,
            reasoning: 'Reliable news source',
          },
        ],
      }),
    });
    
    // Act: Check notability (TEST DRIVES IMPLEMENTATION)
    const result = await checker.checkNotability(businessName, location);
    
    // Assert: Name was normalized (behavior: search uses clean name)
    // The search query should use "Blue Bottle Coffee" not "Blue Bottle Coffee 1763324055284"
    expect(mockCustomSearch.cse.list).toHaveBeenCalled();
    const searchQuery = vi.mocked(mockCustomSearch.cse.list).mock.calls[0][0]?.q;
    expect(searchQuery).toContain('Blue Bottle Coffee');
    expect(searchQuery).not.toContain('1763324055284');
    expect(result.isNotable).toBe(true);
  });

  /**
   * SPECIFICATION 2: Find References Using Google Search
   * 
   * Given: Business name and location
   * When: checkNotability is called
   * Then: Google Search API is called with correct query
   */
  it('finds references using Google Search API', async () => {
    // Arrange: Business with location
    const businessName = 'Test Business';
    const location = { city: 'Seattle', state: 'WA' };
    
    // Mock Google Search response
    vi.mocked(mockCustomSearch.cse.list).mockResolvedValue({
      data: {
        items: [
          {
            link: 'https://news.example.com/test-business',
            title: 'Test Business Opens in Seattle',
            snippet: 'Local business news article',
          },
          {
            link: 'https://gov.example.com/business-license',
            title: 'Business License - Test Business',
            snippet: 'Government business registration',
          },
        ],
      },
    });
    
    // Mock LLM assessment
    mockLLMQuery.mockResolvedValue({
      content: JSON.stringify({
        meetsNotability: true,
        confidence: 0.8,
        seriousReferenceCount: 2,
        publiclyAvailableCount: 2,
        independentCount: 2,
        summary: 'Notable with government and news references',
        references: [
          {
            index: 0,
            isSerious: true,
            isPubliclyAvailable: true,
            isIndependent: true,
            sourceType: 'news',
            trustScore: 0.85,
            reasoning: 'News article',
          },
          {
            index: 1,
            isSerious: true,
            isPubliclyAvailable: true,
            isIndependent: true,
            sourceType: 'government',
            trustScore: 0.9,
            reasoning: 'Government source',
          },
        ],
      }),
    });
    
    // Act: Check notability (TEST DRIVES IMPLEMENTATION)
    const result = await checker.checkNotability(businessName, location);
    
    // Assert: Google Search was called (behavior: references are found)
    expect(mockCustomSearch.cse.list).toHaveBeenCalled();
    expect(result.references).toHaveLength(2);
    expect(result.references[0].url).toBe('https://news.example.com/test-business');
    expect(result.references[1].url).toBe('https://gov.example.com/business-license');
  });

  /**
   * SPECIFICATION 3: Assess Reference Quality with LLM
   * 
   * Given: References found from Google Search
   * When: checkNotability is called
   * Then: LLM assesses reference quality and determines notability
   */
  it('assesses reference quality with LLM to determine notability', async () => {
    // Arrange: Business with references
    const businessName = 'Notable Business';
    const location = { city: 'New York', state: 'NY' };
    
    // Mock Google Search
    mockCustomSearch.cse.list.mockResolvedValue({
      data: {
        items: [
          {
            link: 'https://nytimes.com/notable-business',
            title: 'Notable Business Featured in NY Times',
            snippet: 'Major news coverage',
          },
        ],
      },
    });
    
    // Mock LLM assessment indicating notability
    mockLLMQuery.mockResolvedValue({
      content: JSON.stringify({
        meetsNotability: true,
        confidence: 0.95,
        seriousReferenceCount: 1,
        publiclyAvailableCount: 1,
        independentCount: 1,
        summary: 'Highly notable with major news coverage',
        references: [
          {
            index: 0,
            isSerious: true,
            isPubliclyAvailable: true,
            isIndependent: true,
            sourceType: 'news',
            trustScore: 0.95,
            reasoning: 'Major news outlet, independent coverage',
          },
        ],
      }),
    });
    
    // Act: Check notability (TEST DRIVES IMPLEMENTATION)
    const result = await checker.checkNotability(businessName, location);
    
    // Assert: LLM was called and notability determined (behavior: quality assessment)
    expect(mockLLMQuery).toHaveBeenCalled();
    expect(result.isNotable).toBe(true);
    expect(result.confidence).toBeGreaterThan(0.8);
    expect(result.seriousReferenceCount).toBe(1);
    expect(result.assessment).toBeDefined();
    expect(result.assessment?.meetsNotability).toBe(true);
  });

  /**
   * SPECIFICATION 4: Return Not Notable When References Are Insufficient
   * 
   * Given: Business with few or low-quality references
   * When: checkNotability is called
   * Then: Returns isNotable=false with reasons
   */
  it('returns not notable when references are insufficient', async () => {
    // Arrange: Business with weak references
    const businessName = 'Unknown Business';
    const location = { city: 'Small Town', state: 'MT' };
    
    // Mock Google Search with few results
    vi.mocked(mockCustomSearch.cse.list).mockResolvedValue({
      data: {
        items: [
          {
            link: 'https://review-site.com/unknown-business',
            title: 'User Review - Unknown Business',
            snippet: 'Customer review',
          },
        ],
      },
    });
    
    // Mock LLM assessment indicating not notable
    mockLLMQuery.mockResolvedValue({
      content: JSON.stringify({
        meetsNotability: false,
        confidence: 0.3,
        seriousReferenceCount: 0,
        publiclyAvailableCount: 1,
        independentCount: 0,
        summary: 'Insufficient serious references - only review sites found',
        references: [
          {
            index: 0,
            isSerious: false,
            isPubliclyAvailable: true,
            isIndependent: false,
            sourceType: 'review',
            trustScore: 0.2,
            reasoning: 'User-generated review, not independent source',
          },
        ],
      }),
    });
    
    // Act: Check notability (TEST DRIVES IMPLEMENTATION)
    const result = await checker.checkNotability(businessName, location);
    
    // Assert: Not notable (behavior: quality control)
    expect(result.isNotable).toBe(false);
    expect(result.confidence).toBeLessThan(0.5);
    expect(result.seriousReferenceCount).toBe(0);
    expect(result.reasons.length).toBeGreaterThan(0);
    expect(result.reasons[0]).toContain('Insufficient');
  });

  /**
   * SPECIFICATION 5: Handle Rate Limits Gracefully
   * 
   * Given: Daily query limit reached
   * When: checkNotability is called
   * Then: Returns rate-limited result without making API calls
   */
  it('handles rate limits gracefully', async () => {
    // Arrange: Rate limit reached (simulate by setting dailyQueries)
    const checker = new NotabilityChecker();
    (checker as any).dailyQueries = 100; // At limit
    
    // Act: Check notability (TEST DRIVES IMPLEMENTATION)
    const result = await checker.checkNotability('Test Business');
    
    // Assert: Rate-limited result (behavior: doesn't exceed API limits)
    expect(result.isNotable).toBe(false);
    expect(result.reasons).toContain(expect.stringMatching(/rate limit|limit reached/i));
    expect(mockCustomSearch.cse.list).not.toHaveBeenCalled();
  });

  /**
   * SPECIFICATION 6: Return Structured Notability Result
   * 
   * Given: Business with valid references
   * When: checkNotability is called
   * Then: Returns complete NotabilityResult with all required fields
   */
  it('returns structured notability result with all required fields', async () => {
    // Arrange: Business with references
    const businessName = 'Structured Test Business';
    const location = { city: 'Portland', state: 'OR' };
    
    // Mock Google Search
    mockCustomSearch.cse.list.mockResolvedValue({
      data: {
        items: [
          {
            link: 'https://example.com/business',
            title: 'Business Article',
            snippet: 'Article content',
          },
        ],
      },
    });
    
    // Mock LLM assessment
    mockLLMQuery.mockResolvedValue({
      content: JSON.stringify({
        meetsNotability: true,
        confidence: 0.85,
        seriousReferenceCount: 1,
        publiclyAvailableCount: 1,
        independentCount: 1,
        summary: 'Notable business',
        references: [
          {
            index: 0,
            isSerious: true,
            isPubliclyAvailable: true,
            isIndependent: true,
            sourceType: 'news',
            trustScore: 0.85,
            reasoning: 'Valid reference',
          },
        ],
      }),
    });
    
    // Act: Check notability (TEST DRIVES IMPLEMENTATION)
    const result = await checker.checkNotability(businessName, location);
    
    // Assert: Complete result structure (behavior: all data available)
    expect(result).toHaveProperty('isNotable');
    expect(result).toHaveProperty('confidence');
    expect(result).toHaveProperty('reasons');
    expect(result).toHaveProperty('references');
    expect(result).toHaveProperty('seriousReferenceCount');
    expect(result).toHaveProperty('assessment');
    expect(result).toHaveProperty('topReferences');
    expect(Array.isArray(result.references)).toBe(true);
    expect(Array.isArray(result.reasons)).toBe(true);
    expect(typeof result.confidence).toBe('number');
    expect(result.confidence).toBeGreaterThanOrEqual(0);
    expect(result.confidence).toBeLessThanOrEqual(1);
  });

  /**
   * SPECIFICATION 7: Handle No References Found
   * 
   * Given: Business with no search results
   * When: checkNotability is called
   * Then: Returns not notable with appropriate message
   */
  it('handles no references found gracefully', async () => {
    // Arrange: Business with no search results
    const businessName = 'Completely Unknown Business';
    const location = { city: 'Nowhere', state: 'AK' };
    
    // Mock Google Search returning no results
    vi.mocked(mockCustomSearch.cse.list).mockResolvedValue({
      data: {
        items: [],
      },
    });
    
    // Act: Check notability (TEST DRIVES IMPLEMENTATION)
    const result = await checker.checkNotability(businessName, location);
    
    // Assert: Not notable with no references (behavior: handles edge case)
    expect(result.isNotable).toBe(false);
    expect(result.references).toHaveLength(0);
    expect(result.reasons.length).toBeGreaterThan(0);
    expect(result.seriousReferenceCount).toBe(0);
  });

  /**
   * SPECIFICATION 8: Extract Top References for Wikidata Citations
   * 
   * Given: Business with multiple references
   * When: checkNotability is called
   * Then: topReferences contains best references for Wikidata citations
   */
  it('extracts top references for Wikidata citations', async () => {
    // Arrange: Business with multiple references
    const businessName = 'Multi-Reference Business';
    const location = { city: 'Chicago', state: 'IL' };
    
    // Mock Google Search with multiple results
    vi.mocked(mockCustomSearch.cse.list).mockResolvedValue({
      data: {
        items: [
          {
            link: 'https://news.com/business-1',
            title: 'News Article 1',
            snippet: 'High quality news',
          },
          {
            link: 'https://news.com/business-2',
            title: 'News Article 2',
            snippet: 'Another article',
          },
          {
            link: 'https://review.com/business',
            title: 'Review',
            snippet: 'Low quality review',
          },
        ],
      },
    });
    
    // Mock LLM assessment with varying quality
    mockLLMQuery.mockResolvedValue({
      content: JSON.stringify({
        meetsNotability: true,
        confidence: 0.8,
        seriousReferenceCount: 2,
        publiclyAvailableCount: 3,
        independentCount: 2,
        summary: 'Notable with quality references',
        references: [
          {
            index: 0,
            isSerious: true,
            isPubliclyAvailable: true,
            isIndependent: true,
            sourceType: 'news',
            trustScore: 0.9,
            reasoning: 'High quality',
          },
          {
            index: 1,
            isSerious: true,
            isPubliclyAvailable: true,
            isIndependent: true,
            sourceType: 'news',
            trustScore: 0.85,
            reasoning: 'Good quality',
          },
          {
            index: 2,
            isSerious: false,
            isPubliclyAvailable: true,
            isIndependent: false,
            sourceType: 'review',
            trustScore: 0.3,
            reasoning: 'Low quality',
          },
        ],
      }),
    });
    
    // Act: Check notability (TEST DRIVES IMPLEMENTATION)
    const result = await checker.checkNotability(businessName, location);
    
    // Assert: Top references extracted (behavior: best citations available)
    expect(result.topReferences).toBeDefined();
    expect(Array.isArray(result.topReferences)).toBe(true);
    // Top references should be serious, high-quality references
    if (result.topReferences && result.topReferences.length > 0) {
      expect(result.topReferences.length).toBeLessThanOrEqual(result.references.length);
      // Top references should be from serious sources
      const topUrls = result.topReferences.map(r => r.url);
      expect(topUrls).toContain('https://news.com/business-1');
      expect(topUrls).toContain('https://news.com/business-2');
    }
  });
});

