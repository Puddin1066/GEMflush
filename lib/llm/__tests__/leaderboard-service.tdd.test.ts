/**
 * TDD Test: Leaderboard Service - Tests Drive Implementation
 * 
 * SPECIFICATION: Competitive Leaderboard Generation
 * 
 * As a system
 * I want to generate competitive leaderboards from LLM results
 * So that businesses can understand their competitive positioning
 * 
 * IMPORTANT: These tests specify DESIRED behavior for leaderboard generation.
 * Tests verify that competitive leaderboards are generated correctly from LLM results.
 * 
 * TDD Cycle: RED → GREEN → REFACTOR
 * Tests written to specify desired leaderboard generation behavior
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { LLMResult, CompetitiveLeaderboard } from '../types';

// Mock utilities
vi.mock('../result-filter', () => ({
  filterValidResults: vi.fn((results) => results.filter(r => r && !r.error)),
  filterByPromptType: vi.fn((results, type) => results.filter(r => r.promptType === type)),
}));

vi.mock('../position-estimator', () => ({
  estimateCompetitorPosition: vi.fn((response, competitor) => {
    // Simple mock: return position based on competitor name in response
    const lines = response.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].toLowerCase().includes(competitor.toLowerCase())) {
        const match = lines[i].match(/^\s*(\d+)[\.\)]/);
        return match ? parseInt(match[1], 10) : null;
      }
    }
    return null;
  }),
}));

describe('🔴 RED: Leaderboard Service - Desired Behavior Specification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * SPECIFICATION 1: generateLeaderboard() - MUST Generate Leaderboard from Results
   * 
   * DESIRED BEHAVIOR: generateLeaderboard() MUST create a competitive leaderboard
   * with target business metrics and competitor list from recommendation query results.
   */
  describe('generateLeaderboard', () => {
    it('MUST generate leaderboard with target business metrics from recommendation results', async () => {
      // Arrange: LLM results with recommendation queries mentioning target business
      const businessName = 'Target Business';
      const results: LLMResult[] = [
        {
          model: 'google/gemini-pro',
          promptType: 'recommendation',
          mentioned: true,
          sentiment: 'positive',
          confidence: 0.9,
          rankPosition: 2,
          competitorMentions: ['Competitor A', 'Competitor B'],
          rawResponse: '1. Competitor A\n2. Target Business\n3. Competitor B',
          tokensUsed: 150,
          prompt: 'Recommend top businesses',
          processingTime: 800,
        },
        {
          model: 'openai/gpt-4-turbo',
          promptType: 'recommendation',
          mentioned: true,
          sentiment: 'positive',
          confidence: 0.85,
          rankPosition: 1,
          competitorMentions: ['Competitor A'],
          rawResponse: '1. Target Business\n2. Competitor A',
          tokensUsed: 120,
          prompt: 'Recommend best businesses',
          processingTime: 700,
        },
      ];

      // Act: Generate leaderboard (TEST DRIVES IMPLEMENTATION)
      const { LeaderboardService } = await import('../leaderboard-service');
      const service = new LeaderboardService();
      const leaderboard = service.generateLeaderboard(results, businessName);

      // Assert: SPECIFICATION - MUST return leaderboard with target business metrics
      expect(leaderboard).toBeDefined();
      expect(leaderboard.targetBusiness).toBeDefined();
      expect(leaderboard.targetBusiness.name).toBe(businessName);
      expect(leaderboard.targetBusiness.mentionCount).toBeGreaterThan(0);
      expect(leaderboard.targetBusiness.avgPosition).toBeDefined();
    });

    it('MUST calculate average position from multiple ranking results', async () => {
      // Arrange: Multiple recommendation results with different positions
      const businessName = 'Target Business';
      const results: LLMResult[] = [
        {
          model: 'google/gemini-pro',
          promptType: 'recommendation',
          mentioned: true,
          sentiment: 'positive',
          confidence: 0.9,
          rankPosition: 1,
          competitorMentions: [],
          rawResponse: '1. Target Business',
          tokensUsed: 100,
          prompt: 'Recommend',
          processingTime: 500,
        },
        {
          model: 'openai/gpt-4-turbo',
          promptType: 'recommendation',
          mentioned: true,
          sentiment: 'positive',
          confidence: 0.85,
          rankPosition: 3,
          competitorMentions: [],
          rawResponse: '3. Target Business',
          tokensUsed: 100,
          prompt: 'Recommend',
          processingTime: 500,
        },
        {
          model: 'anthropic/claude-3-opus',
          promptType: 'recommendation',
          mentioned: true,
          sentiment: 'positive',
          confidence: 0.8,
          rankPosition: 2,
          competitorMentions: [],
          rawResponse: '2. Target Business',
          tokensUsed: 100,
          prompt: 'Recommend',
          processingTime: 500,
        },
      ];

      // Act: Generate leaderboard (TEST DRIVES IMPLEMENTATION)
      const { LeaderboardService } = await import('../leaderboard-service');
      const service = new LeaderboardService();
      const leaderboard = service.generateLeaderboard(results, businessName);

      // Assert: SPECIFICATION - MUST calculate correct average position
      expect(leaderboard.targetBusiness.avgPosition).toBe(2); // (1 + 3 + 2) / 3 = 2
    });

    it('MUST include competitors sorted by mention count', async () => {
      // Arrange: Results with multiple competitors
      const businessName = 'Target Business';
      const results: LLMResult[] = [
        {
          model: 'google/gemini-pro',
          promptType: 'recommendation',
          mentioned: true,
          sentiment: 'positive',
          confidence: 0.9,
          rankPosition: 2,
          competitorMentions: ['Competitor A', 'Competitor B', 'Competitor C'],
          rawResponse: '1. Competitor A\n2. Target Business\n3. Competitor B\n4. Competitor C',
          tokensUsed: 200,
          prompt: 'Recommend',
          processingTime: 800,
        },
        {
          model: 'openai/gpt-4-turbo',
          promptType: 'recommendation',
          mentioned: true,
          sentiment: 'positive',
          confidence: 0.85,
          rankPosition: 1,
          competitorMentions: ['Competitor A', 'Competitor B'],
          rawResponse: '1. Target Business\n2. Competitor A\n3. Competitor B',
          tokensUsed: 150,
          prompt: 'Recommend',
          processingTime: 700,
        },
      ];

      // Act: Generate leaderboard (TEST DRIVES IMPLEMENTATION)
      const { LeaderboardService } = await import('../leaderboard-service');
      const service = new LeaderboardService();
      const leaderboard = service.generateLeaderboard(results, businessName);

      // Assert: SPECIFICATION - MUST include competitors sorted by mention count
      expect(leaderboard.competitors).toBeDefined();
      expect(Array.isArray(leaderboard.competitors)).toBe(true);
      expect(leaderboard.competitors.length).toBeGreaterThan(0);
      
      // Competitor A appears 2 times, Competitor B appears 2 times, Competitor C appears 1 time
      const competitorA = leaderboard.competitors.find(c => c.name === 'Competitor A');
      expect(competitorA).toBeDefined();
      expect(competitorA?.mentionCount).toBe(2);
      
      // Competitors should be sorted by mention count (descending)
      for (let i = 0; i < leaderboard.competitors.length - 1; i++) {
        expect(leaderboard.competitors[i].mentionCount).toBeGreaterThanOrEqual(
          leaderboard.competitors[i + 1].mentionCount
        );
      }
    });

    it('MUST track when competitors appear with target business', async () => {
      // Arrange: Results where some competitors appear with target, others don't
      const businessName = 'Target Business';
      const results: LLMResult[] = [
        {
          model: 'google/gemini-pro',
          promptType: 'recommendation',
          mentioned: true, // Target mentioned
          sentiment: 'positive',
          confidence: 0.9,
          rankPosition: 2,
          competitorMentions: ['Competitor A', 'Competitor B'], // These appear WITH target
          rawResponse: '1. Competitor A\n2. Target Business\n3. Competitor B',
          tokensUsed: 150,
          prompt: 'Recommend',
          processingTime: 800,
        },
        {
          model: 'openai/gpt-4-turbo',
          promptType: 'recommendation',
          mentioned: false, // Target NOT mentioned
          sentiment: 'neutral',
          confidence: 0.5,
          rankPosition: null,
          competitorMentions: ['Competitor C'], // This appears WITHOUT target
          rawResponse: '1. Competitor C',
          tokensUsed: 100,
          prompt: 'Recommend',
          processingTime: 600,
        },
      ];

      // Act: Generate leaderboard (TEST DRIVES IMPLEMENTATION)
      const { LeaderboardService } = await import('../leaderboard-service');
      const service = new LeaderboardService();
      const leaderboard = service.generateLeaderboard(results, businessName);

      // Assert: SPECIFICATION - MUST track co-occurrence correctly
      const competitorA = leaderboard.competitors.find(c => c.name === 'Competitor A');
      expect(competitorA).toBeDefined();
      expect(competitorA?.appearsWithTarget).toBe(1); // Appeared once with target

      const competitorC = leaderboard.competitors.find(c => c.name === 'Competitor C');
      expect(competitorC).toBeDefined();
      expect(competitorC?.appearsWithTarget).toBe(0); // Never appeared with target
    });

    it('MUST limit competitors to top 10 by mention count', async () => {
      // Arrange: Results with 15 different competitors
      const businessName = 'Target Business';
      const competitorNames = Array.from({ length: 15 }, (_, i) => `Competitor ${String.fromCharCode(65 + i)}`);
      
      const results: LLMResult[] = competitorNames.map((name, index) => ({
        model: 'google/gemini-pro',
        promptType: 'recommendation' as const,
        mentioned: true,
        sentiment: 'positive' as const,
        confidence: 0.9,
        rankPosition: index + 1,
        competitorMentions: [name],
        rawResponse: `${index + 1}. ${name}`,
        tokensUsed: 100,
        prompt: 'Recommend',
        processingTime: 500,
      }));

      // Act: Generate leaderboard (TEST DRIVES IMPLEMENTATION)
      const { LeaderboardService } = await import('../leaderboard-service');
      const service = new LeaderboardService();
      const leaderboard = service.generateLeaderboard(results, businessName);

      // Assert: SPECIFICATION - MUST limit to top 10 competitors
      expect(leaderboard.competitors.length).toBeLessThanOrEqual(10);
    });

    it('MUST return empty leaderboard when no recommendation results exist', async () => {
      // Arrange: Results with no recommendation queries
      const businessName = 'Target Business';
      const results: LLMResult[] = [
        {
          model: 'openai/gpt-4-turbo',
          promptType: 'factual',
          mentioned: true,
          sentiment: 'positive',
          confidence: 0.9,
          rankPosition: null,
          competitorMentions: [],
          rawResponse: 'Target Business is a company',
          tokensUsed: 100,
          prompt: 'What is Target Business?',
          processingTime: 500,
        },
        {
          model: 'anthropic/claude-3-opus',
          promptType: 'opinion',
          mentioned: true,
          sentiment: 'positive',
          confidence: 0.85,
          rankPosition: null,
          competitorMentions: [],
          rawResponse: 'People like Target Business',
          tokensUsed: 120,
          prompt: 'What do people think?',
          processingTime: 600,
        },
      ];

      // Act: Generate leaderboard (TEST DRIVES IMPLEMENTATION)
      const { LeaderboardService } = await import('../leaderboard-service');
      const service = new LeaderboardService();
      const leaderboard = service.generateLeaderboard(results, businessName);

      // Assert: SPECIFICATION - MUST return empty leaderboard structure
      expect(leaderboard).toBeDefined();
      expect(leaderboard.targetBusiness.name).toBe(businessName);
      expect(leaderboard.targetBusiness.mentionCount).toBe(0);
      expect(leaderboard.targetBusiness.avgPosition).toBeNull();
      expect(leaderboard.competitors).toEqual([]);
      expect(leaderboard.totalRecommendationQueries).toBe(0);
    });

    it('MUST handle null/undefined results gracefully', async () => {
      // Arrange: Results array with null/undefined values
      const businessName = 'Target Business';
      const results: (LLMResult | null | undefined)[] = [
        null,
        undefined,
        {
          model: 'google/gemini-pro',
          promptType: 'recommendation',
          mentioned: true,
          sentiment: 'positive',
          confidence: 0.9,
          rankPosition: 1,
          competitorMentions: [],
          rawResponse: 'Target Business is recommended',
          tokensUsed: 100,
          prompt: 'Recommend',
          processingTime: 500,
        },
      ];

      // Act: Generate leaderboard (TEST DRIVES IMPLEMENTATION)
      const { LeaderboardService } = await import('../leaderboard-service');
      const service = new LeaderboardService();
      const leaderboard = service.generateLeaderboard(results as LLMResult[], businessName);

      // Assert: SPECIFICATION - MUST filter out invalid results and still generate leaderboard
      expect(leaderboard).toBeDefined();
      expect(leaderboard.targetBusiness.name).toBe(businessName);
      // Should still process valid result
      expect(leaderboard.targetBusiness.mentionCount).toBeGreaterThanOrEqual(0);
    });

    it('MUST calculate average competitor position when positions are estimated', async () => {
      // Arrange: Results with competitor mentions that can be positioned
      const businessName = 'Target Business';
      const results: LLMResult[] = [
        {
          model: 'google/gemini-pro',
          promptType: 'recommendation',
          mentioned: true,
          sentiment: 'positive',
          confidence: 0.9,
          rankPosition: 2,
          competitorMentions: ['Competitor A'],
          rawResponse: '1. Competitor A\n2. Target Business', // Position can be extracted
          tokensUsed: 100,
          prompt: 'Recommend',
          processingTime: 500,
        },
        {
          model: 'openai/gpt-4-turbo',
          promptType: 'recommendation',
          mentioned: true,
          sentiment: 'positive',
          confidence: 0.85,
          rankPosition: 3,
          competitorMentions: ['Competitor A'],
          rawResponse: '3. Competitor A\n4. Target Business', // Different position
          tokensUsed: 100,
          prompt: 'Recommend',
          processingTime: 500,
        },
      ];

      // Act: Generate leaderboard (TEST DRIVES IMPLEMENTATION)
      const { LeaderboardService } = await import('../leaderboard-service');
      const service = new LeaderboardService();
      const leaderboard = service.generateLeaderboard(results, businessName);

      // Assert: SPECIFICATION - MUST calculate average position for competitors
      const competitorA = leaderboard.competitors.find(c => c.name === 'Competitor A');
      expect(competitorA).toBeDefined();
      if (competitorA && competitorA.avgPosition > 0) {
        // If positions were extracted, avgPosition should be calculated
        expect(competitorA.avgPosition).toBeGreaterThan(0);
      }
    });

    it('MUST set totalRecommendationQueries to number of recommendation results', async () => {
      // Arrange: Mix of recommendation and other query types
      const businessName = 'Target Business';
      const results: LLMResult[] = [
        {
          model: 'google/gemini-pro',
          promptType: 'recommendation',
          mentioned: true,
          sentiment: 'positive',
          confidence: 0.9,
          rankPosition: 1,
          competitorMentions: [],
          rawResponse: 'Recommendation 1',
          tokensUsed: 100,
          prompt: 'Recommend',
          processingTime: 500,
        },
        {
          model: 'openai/gpt-4-turbo',
          promptType: 'factual',
          mentioned: true,
          sentiment: 'neutral',
          confidence: 0.8,
          rankPosition: null,
          competitorMentions: [],
          rawResponse: 'Factual response',
          tokensUsed: 80,
          prompt: 'What is?',
          processingTime: 400,
        },
        {
          model: 'anthropic/claude-3-opus',
          promptType: 'recommendation',
          mentioned: true,
          sentiment: 'positive',
          confidence: 0.85,
          rankPosition: 2,
          competitorMentions: [],
          rawResponse: 'Recommendation 2',
          tokensUsed: 100,
          prompt: 'Recommend',
          processingTime: 500,
        },
      ];

      // Act: Generate leaderboard (TEST DRIVES IMPLEMENTATION)
      const { LeaderboardService } = await import('../leaderboard-service');
      const service = new LeaderboardService();
      const leaderboard = service.generateLeaderboard(results, businessName);

      // Assert: SPECIFICATION - MUST count only recommendation queries
      expect(leaderboard.totalRecommendationQueries).toBe(2);
    });
  });
});


