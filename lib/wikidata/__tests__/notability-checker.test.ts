import { describe, it, expect, vi, beforeEach } from 'vitest';
import { openRouterClient } from '@/lib/llm/openrouter';

// Create mock functions
const mockCseList = vi.fn();

// Mock googleapis BEFORE importing NotabilityChecker
vi.mock('googleapis', () => ({
  google: {
    customsearch: vi.fn(() => ({
      cse: {
        list: mockCseList,
      },
    })),
  },
}));

// Mock openRouterClient
vi.mock('@/lib/llm/openrouter', () => ({
  openRouterClient: {
    query: vi.fn(),
  },
}));

// Set test environment variables
process.env.GOOGLE_SEARCH_API_KEY = 'test-api-key';
process.env.GOOGLE_SEARCH_ENGINE_ID = 'test-engine-id';

// Import AFTER mocks are set up
const { NotabilityChecker } = await import('../notability-checker');

describe('NotabilityChecker', () => {
  let checker: NotabilityChecker;

  beforeEach(() => {
    checker = new NotabilityChecker();
    vi.clearAllMocks();
  });

  describe('checkNotability', () => {
    it('should return not notable when no references found', async () => {
      // Mock Google Search returning no results
      mockCseList.mockResolvedValue({
        data: {
          items: [],
        },
      });

      const result = await checker.checkNotability('Unknown Business');

      expect(result.isNotable).toBe(false);
      expect(result.confidence).toBe(0.9);
      expect(result.reasons).toContain('No publicly available references found');
      expect(result.references).toHaveLength(0);
    });

    it('should return notable when serious references exist', async () => {
      // Mock Google Search results
      mockCseList.mockResolvedValue({
        data: {
          items: [
            {
              title: 'Blue Bottle Coffee opens in Oakland',
              link: 'https://sfchronicle.com/food/article/blue-bottle',
              snippet: 'The acclaimed coffee roaster...',
            },
            {
              title: 'Blue Bottle Coffee acquired by Nestlé',
              link: 'https://reuters.com/nestle-bluebottle',
              snippet: 'Nestlé acquires premium...',
            },
          ],
        },
      });

      // Mock LLM assessment
      (openRouterClient.query as ReturnType<typeof vi.fn>).mockResolvedValue({
        content: JSON.stringify({
          meetsNotability: true,
          confidence: 0.95,
          seriousReferenceCount: 2,
          publiclyAvailableCount: 2,
          independentCount: 2,
          summary: 'Business has 2 serious independent references',
          references: [
            {
              index: 0,
              isSerious: true,
              isPubliclyAvailable: true,
              isIndependent: true,
              sourceType: 'news',
              trustScore: 95,
              reasoning: 'SF Chronicle is reputable newspaper',
            },
            {
              index: 1,
              isSerious: true,
              isPubliclyAvailable: true,
              isIndependent: true,
              sourceType: 'news',
              trustScore: 98,
              reasoning: 'Reuters is highly reputable',
            },
          ],
          recommendations: [],
        }),
      });

      const result = await checker.checkNotability('Blue Bottle Coffee', {
        city: 'Oakland',
        state: 'CA',
      });

      expect(result.isNotable).toBe(true);
      expect(result.confidence).toBe(0.95);
      expect(result.seriousReferenceCount).toBe(2);
      expect(result.references).toHaveLength(2);
      expect(result.assessment).toBeDefined();
    });

    it('should return not notable when only company website found', async () => {
      // Mock Google Search with only company site
      mockCseList.mockResolvedValue({
        data: {
          items: [
            {
              title: 'About Us - Test Business',
              link: 'https://testbusiness.com/about',
              snippet: 'We are Test Business...',
            },
          ],
        },
      });

      // Mock LLM assessment
      (openRouterClient.query as ReturnType<typeof vi.fn>).mockResolvedValue({
        content: JSON.stringify({
          meetsNotability: false,
          confidence: 0.85,
          seriousReferenceCount: 0,
          publiclyAvailableCount: 1,
          independentCount: 0,
          summary: 'Only company website found - no independent sources',
          references: [
            {
              index: 0,
              isSerious: false,
              isPubliclyAvailable: true,
              isIndependent: false,
              sourceType: 'company',
              trustScore: 30,
              reasoning: 'Company website is not independent source',
            },
          ],
          recommendations: [
            'Seek coverage in news outlets',
            'Obtain government or academic references',
          ],
        }),
      });

      const result = await checker.checkNotability('Test Business');

      expect(result.isNotable).toBe(false);
      expect(result.seriousReferenceCount).toBe(0);
      expect(result.assessment?.recommendations).toBeDefined();
    });

    it('should handle API errors gracefully', async () => {
      // Mock Google API failure
      mockCseList.mockRejectedValue(new Error('API Error'));

      const result = await checker.checkNotability('Test Business');

      expect(result.isNotable).toBe(false);
      expect(result.references).toHaveLength(0);
    });

    it('should handle LLM parsing errors gracefully', async () => {
      // Mock Google Search success
      mockCseList.mockResolvedValue({
        data: {
          items: [
            {
              title: 'Test Article',
              link: 'https://example.com/test',
              snippet: 'Test snippet',
            },
          ],
        },
      });

      // Mock LLM returning invalid JSON
      (openRouterClient.query as ReturnType<typeof vi.fn>).mockResolvedValue({
        content: 'Invalid JSON{',
      });

      const result = await checker.checkNotability('Test Business');

      // Should return fallback assessment
      expect(result.isNotable).toBe(false);
      expect(result.confidence).toBe(0.5);
      expect(result.assessment?.summary).toContain('manual review required');
    });

    it('should include location context in search query', async () => {
      mockCseList.mockResolvedValue({
        data: {
          items: [],
        },
      });

      await checker.checkNotability('Test Business', {
        city: 'San Francisco',
        state: 'CA',
      });

      expect(mockCseList).toHaveBeenCalledWith(
        expect.objectContaining({
          q: '"Test Business" San Francisco CA',
        })
      );
    });
  });
});

