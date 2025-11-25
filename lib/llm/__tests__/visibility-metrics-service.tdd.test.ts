/**
 * TDD Test: Visibility Metrics Service - Tests Drive Implementation
 * 
 * SPECIFICATION: Business Visibility Metrics Calculation
 * 
 * As a system
 * I want to calculate comprehensive visibility metrics from LLM results
 * So that businesses can understand their AI visibility and market presence
 * 
 * IMPORTANT: These tests specify DESIRED behavior for metrics calculation.
 * Tests verify that visibility metrics are calculated correctly from LLM results.
 * 
 * TDD Cycle: RED → GREEN → REFACTOR
 * Tests written to specify desired metrics calculation behavior
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { LLMResult, BusinessVisibilityMetrics } from '../types';

// Mock utilities
vi.mock('../result-filter', () => ({
  filterValidResults: vi.fn((results) => results.filter(r => r && !r.error)),
  filterMentionedResults: vi.fn((results) => results.filter(r => r.mentioned)),
  filterRankedResults: vi.fn((results) => results.filter(r => r.rankPosition !== null && r.rankPosition !== undefined)),
}));

vi.mock('../score-calculator', () => ({
  calculateVisibilityScore: vi.fn((metrics) => {
    // Mock score calculation: weighted formula
    const mentionScore = metrics.mentionRate * 40;
    const sentimentScore = metrics.sentimentScore * 25;
    const confidenceScore = metrics.confidenceLevel * 20;
    const rankingScore = metrics.avgRankPosition !== null 
      ? Math.max(0, 15 - (metrics.avgRankPosition - 1) * 3)
      : 0;
    const successRate = metrics.successfulQueries / metrics.totalQueries;
    const successPenalty = (1 - successRate) * 10;
    return Math.max(0, Math.min(100, Math.round(mentionScore + sentimentScore + confidenceScore + rankingScore - successPenalty)));
  }),
  SCORE_WEIGHTS: {
    MENTION: 40,
    SENTIMENT: 25,
    CONFIDENCE: 20,
    RANKING: 15,
    SUCCESS_PENALTY: 10,
  },
}));

describe('🔴 RED: Visibility Metrics Service - Desired Behavior Specification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * SPECIFICATION 1: calculateMetrics() - MUST Calculate Visibility Metrics
   * 
   * DESIRED BEHAVIOR: calculateMetrics() MUST calculate comprehensive visibility
   * metrics including visibility score, mention rate, sentiment, and rankings.
   */
  describe('calculateMetrics', () => {
    it('MUST calculate visibility score from LLM results', async () => {
      // Arrange: LLM results with high visibility indicators
      const results: LLMResult[] = [
        {
          model: 'openai/gpt-4-turbo',
          promptType: 'factual',
          mentioned: true,
          sentiment: 'positive',
          confidence: 0.9,
          rankPosition: 1,
          competitorMentions: [],
          rawResponse: 'Business is well-known',
          tokensUsed: 100,
          prompt: 'What is Business?',
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
          rawResponse: 'People like Business',
          tokensUsed: 120,
          prompt: 'What do people think?',
          processingTime: 600,
        },
      ];

      // Act: Calculate metrics (TEST DRIVES IMPLEMENTATION)
      const { VisibilityMetricsService } = await import('../visibility-metrics-service');
      const service = new VisibilityMetricsService();
      const metrics = service.calculateMetrics(results);

      // Assert: SPECIFICATION - MUST return visibility metrics with score
      expect(metrics).toBeDefined();
      expect(metrics.visibilityScore).toBeGreaterThanOrEqual(0);
      expect(metrics.visibilityScore).toBeLessThanOrEqual(100);
      expect(metrics.mentionRate).toBeGreaterThanOrEqual(0);
      expect(metrics.sentimentScore).toBeGreaterThanOrEqual(0);
      expect(metrics.sentimentScore).toBeLessThanOrEqual(1);
      expect(metrics.confidenceLevel).toBeGreaterThanOrEqual(0);
      expect(metrics.confidenceLevel).toBeLessThanOrEqual(1);
    });

    it('MUST calculate mention rate as percentage (0-100) from mentioned results', async () => {
      // Arrange: Mix of mentioned and not mentioned results
      const results: LLMResult[] = [
        {
          model: 'openai/gpt-4-turbo',
          promptType: 'factual',
          mentioned: true,
          sentiment: 'positive',
          confidence: 0.9,
          rankPosition: null,
          competitorMentions: [],
          rawResponse: 'Mentioned',
          tokensUsed: 100,
          prompt: 'Query 1',
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
          rawResponse: 'Mentioned again',
          tokensUsed: 120,
          prompt: 'Query 2',
          processingTime: 600,
        },
        {
          model: 'google/gemini-pro',
          promptType: 'recommendation',
          mentioned: false,
          sentiment: 'neutral',
          confidence: 0.5,
          rankPosition: null,
          competitorMentions: [],
          rawResponse: 'Not mentioned',
          tokensUsed: 80,
          prompt: 'Query 3',
          processingTime: 400,
        },
      ];

      // Act: Calculate metrics (TEST DRIVES IMPLEMENTATION)
      const { VisibilityMetricsService } = await import('../visibility-metrics-service');
      const service = new VisibilityMetricsService();
      const metrics = service.calculateMetrics(results);

      // Assert: SPECIFICATION - MUST calculate mention rate as percentage
      // 2 out of 3 mentioned = 66.67% (or rounded)
      expect(metrics.mentionRate).toBeGreaterThanOrEqual(0);
      expect(metrics.mentionRate).toBeLessThanOrEqual(100);
      expect(metrics.mentionRate).toBeGreaterThan(50); // Should be ~67%
    });

    it('MUST calculate sentiment score from mentioned results only', async () => {
      // Arrange: Results with different sentiments
      const results: LLMResult[] = [
        {
          model: 'openai/gpt-4-turbo',
          promptType: 'opinion',
          mentioned: true,
          sentiment: 'positive',
          confidence: 0.9,
          rankPosition: null,
          competitorMentions: [],
          rawResponse: 'Positive mention',
          tokensUsed: 100,
          prompt: 'What do people think?',
          processingTime: 500,
        },
        {
          model: 'anthropic/claude-3-opus',
          promptType: 'opinion',
          mentioned: true,
          sentiment: 'neutral',
          confidence: 0.8,
          rankPosition: null,
          competitorMentions: [],
          rawResponse: 'Neutral mention',
          tokensUsed: 120,
          prompt: 'What do people think?',
          processingTime: 600,
        },
        {
          model: 'google/gemini-pro',
          promptType: 'opinion',
          mentioned: false,
          sentiment: 'negative', // Not mentioned, so should not affect score
          confidence: 0.5,
          rankPosition: null,
          competitorMentions: [],
          rawResponse: 'Not mentioned',
          tokensUsed: 80,
          prompt: 'What do people think?',
          processingTime: 400,
        },
      ];

      // Act: Calculate metrics (TEST DRIVES IMPLEMENTATION)
      const { VisibilityMetricsService } = await import('../visibility-metrics-service');
      const service = new VisibilityMetricsService();
      const metrics = service.calculateMetrics(results);

      // Assert: SPECIFICATION - MUST calculate sentiment from mentioned results only
      // Positive (1.0) + Neutral (0.5) = 1.5 / 2 = 0.75
      expect(metrics.sentimentScore).toBeGreaterThanOrEqual(0);
      expect(metrics.sentimentScore).toBeLessThanOrEqual(1);
      expect(metrics.sentimentScore).toBeGreaterThan(0.5); // Should be 0.75
      expect(metrics.sentimentScore).toBeLessThan(1); // Not all positive
    });

    it('MUST calculate average confidence level from all valid results', async () => {
      // Arrange: Results with varying confidence levels
      const results: LLMResult[] = [
        {
          model: 'openai/gpt-4-turbo',
          promptType: 'factual',
          mentioned: true,
          sentiment: 'positive',
          confidence: 0.9,
          rankPosition: null,
          competitorMentions: [],
          rawResponse: 'High confidence',
          tokensUsed: 100,
          prompt: 'Query 1',
          processingTime: 500,
        },
        {
          model: 'anthropic/claude-3-opus',
          promptType: 'opinion',
          mentioned: true,
          sentiment: 'positive',
          confidence: 0.7,
          rankPosition: null,
          competitorMentions: [],
          rawResponse: 'Medium confidence',
          tokensUsed: 120,
          prompt: 'Query 2',
          processingTime: 600,
        },
        {
          model: 'google/gemini-pro',
          promptType: 'recommendation',
          mentioned: false,
          sentiment: 'neutral',
          confidence: 0.8,
          rankPosition: null,
          competitorMentions: [],
          rawResponse: 'Also medium confidence',
          tokensUsed: 80,
          prompt: 'Query 3',
          processingTime: 400,
        },
      ];

      // Act: Calculate metrics (TEST DRIVES IMPLEMENTATION)
      const { VisibilityMetricsService } = await import('../visibility-metrics-service');
      const service = new VisibilityMetricsService();
      const metrics = service.calculateMetrics(results);

      // Assert: SPECIFICATION - MUST calculate average confidence
      // (0.9 + 0.7 + 0.8) / 3 = 0.8
      expect(metrics.confidenceLevel).toBeGreaterThanOrEqual(0);
      expect(metrics.confidenceLevel).toBeLessThanOrEqual(1);
      expect(metrics.confidenceLevel).toBeCloseTo(0.8, 1);
    });

    it('MUST calculate average rank position from ranked results only', async () => {
      // Arrange: Results with rankings
      const results: LLMResult[] = [
        {
          model: 'google/gemini-pro',
          promptType: 'recommendation',
          mentioned: true,
          sentiment: 'positive',
          confidence: 0.9,
          rankPosition: 1,
          competitorMentions: [],
          rawResponse: 'Ranked #1',
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
          rawResponse: 'Ranked #3',
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
          rankPosition: null, // Not ranked
          competitorMentions: [],
          rawResponse: 'Mentioned but not ranked',
          tokensUsed: 100,
          prompt: 'Recommend',
          processingTime: 500,
        },
      ];

      // Act: Calculate metrics (TEST DRIVES IMPLEMENTATION)
      const { VisibilityMetricsService } = await import('../visibility-metrics-service');
      const service = new VisibilityMetricsService();
      const metrics = service.calculateMetrics(results);

      // Assert: SPECIFICATION - MUST calculate average rank from ranked results
      // (1 + 3) / 2 = 2
      expect(metrics.avgRankPosition).toBe(2);
    });

    it('MUST set avgRankPosition to null when no ranked results exist', async () => {
      // Arrange: Results without rankings
      const results: LLMResult[] = [
        {
          model: 'openai/gpt-4-turbo',
          promptType: 'factual',
          mentioned: true,
          sentiment: 'positive',
          confidence: 0.9,
          rankPosition: null,
          competitorMentions: [],
          rawResponse: 'Not ranked',
          tokensUsed: 100,
          prompt: 'What is?',
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
          rawResponse: 'Also not ranked',
          tokensUsed: 120,
          prompt: 'What do people think?',
          processingTime: 600,
        },
      ];

      // Act: Calculate metrics (TEST DRIVES IMPLEMENTATION)
      const { VisibilityMetricsService } = await import('../visibility-metrics-service');
      const service = new VisibilityMetricsService();
      const metrics = service.calculateMetrics(results);

      // Assert: SPECIFICATION - MUST return null for avgRankPosition
      expect(metrics.avgRankPosition).toBeNull();
    });

    it('MUST return zero metrics when no valid results exist', async () => {
      // Arrange: Empty results array
      const results: LLMResult[] = [];

      // Act: Calculate metrics (TEST DRIVES IMPLEMENTATION)
      const { VisibilityMetricsService } = await import('../visibility-metrics-service');
      const service = new VisibilityMetricsService();
      const metrics = service.calculateMetrics(results);

      // Assert: SPECIFICATION - MUST return zero/empty metrics
      expect(metrics).toBeDefined();
      expect(metrics.visibilityScore).toBe(0);
      expect(metrics.mentionRate).toBe(0);
      expect(metrics.sentimentScore).toBe(0);
      expect(metrics.confidenceLevel).toBe(0);
      expect(metrics.avgRankPosition).toBeNull();
      expect(metrics.totalQueries).toBeDefined();
      expect(metrics.successfulQueries).toBe(0);
    });

    it('MUST handle results with errors gracefully', async () => {
      // Arrange: Results with errors
      const results: LLMResult[] = [
        {
          model: 'openai/gpt-4-turbo',
          promptType: 'factual',
          mentioned: false,
          sentiment: 'neutral',
          confidence: 0,
          rankPosition: null,
          competitorMentions: [],
          rawResponse: '',
          tokensUsed: 0,
          prompt: 'Query',
          processingTime: 0,
          error: 'API error',
        },
        {
          model: 'anthropic/claude-3-opus',
          promptType: 'opinion',
          mentioned: true,
          sentiment: 'positive',
          confidence: 0.9,
          rankPosition: null,
          competitorMentions: [],
          rawResponse: 'Valid result',
          tokensUsed: 100,
          prompt: 'Query',
          processingTime: 500,
        },
      ];

      // Act: Calculate metrics (TEST DRIVES IMPLEMENTATION)
      const { VisibilityMetricsService } = await import('../visibility-metrics-service');
      const service = new VisibilityMetricsService();
      const metrics = service.calculateMetrics(results);

      // Assert: SPECIFICATION - MUST filter out errors and calculate from valid results
      expect(metrics).toBeDefined();
      expect(metrics.successfulQueries).toBeGreaterThan(0);
    });

    it('MUST count total and successful queries correctly', async () => {
      // Arrange: Mix of valid and invalid results
      const results: LLMResult[] = [
        {
          model: 'openai/gpt-4-turbo',
          promptType: 'factual',
          mentioned: true,
          sentiment: 'positive',
          confidence: 0.9,
          rankPosition: null,
          competitorMentions: [],
          rawResponse: 'Valid 1',
          tokensUsed: 100,
          prompt: 'Query 1',
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
          rawResponse: 'Valid 2',
          tokensUsed: 120,
          prompt: 'Query 2',
          processingTime: 600,
        },
        {
          model: 'google/gemini-pro',
          promptType: 'recommendation',
          mentioned: false,
          sentiment: 'neutral',
          confidence: 0,
          rankPosition: null,
          competitorMentions: [],
          rawResponse: '',
          tokensUsed: 0,
          prompt: 'Query 3',
          processingTime: 0,
          error: 'API error',
        },
      ];

      // Act: Calculate metrics (TEST DRIVES IMPLEMENTATION)
      const { VisibilityMetricsService } = await import('../visibility-metrics-service');
      const service = new VisibilityMetricsService();
      const metrics = service.calculateMetrics(results);

      // Assert: SPECIFICATION - MUST count queries correctly
      expect(metrics.totalQueries).toBeGreaterThanOrEqual(3);
      expect(metrics.successfulQueries).toBe(2); // Only valid results
    });

    it('MUST use default models for totalQueries when results array is empty', async () => {
      // Arrange: Empty results
      const results: LLMResult[] = [];

      // Act: Calculate metrics (TEST DRIVES IMPLEMENTATION)
      const { VisibilityMetricsService } = await import('../visibility-metrics-service');
      const service = new VisibilityMetricsService();
      const metrics = service.calculateMetrics(results);

      // Assert: SPECIFICATION - MUST use default model count for totalQueries
      // Default: 3 models × 3 prompts = 9 total queries
      expect(metrics.totalQueries).toBeGreaterThan(0);
      expect(metrics.totalQueries).toBeLessThanOrEqual(9);
    });

    it('MUST calculate visibility score using weighted formula', async () => {
      // Arrange: High visibility results (all positive indicators)
      const results: LLMResult[] = [
        {
          model: 'openai/gpt-4-turbo',
          promptType: 'factual',
          mentioned: true,
          sentiment: 'positive',
          confidence: 0.95,
          rankPosition: 1,
          competitorMentions: [],
          rawResponse: 'High visibility',
          tokensUsed: 100,
          prompt: 'Query',
          processingTime: 500,
        },
        {
          model: 'anthropic/claude-3-opus',
          promptType: 'opinion',
          mentioned: true,
          sentiment: 'positive',
          confidence: 0.9,
          rankPosition: null,
          competitorMentions: [],
          rawResponse: 'High visibility',
          tokensUsed: 120,
          prompt: 'Query',
          processingTime: 600,
        },
        {
          model: 'google/gemini-pro',
          promptType: 'recommendation',
          mentioned: true,
          sentiment: 'positive',
          confidence: 0.85,
          rankPosition: 2,
          competitorMentions: [],
          rawResponse: 'High visibility',
          tokensUsed: 100,
          prompt: 'Query',
          processingTime: 500,
        },
      ];

      // Act: Calculate metrics (TEST DRIVES IMPLEMENTATION)
      const { VisibilityMetricsService } = await import('../visibility-metrics-service');
      const service = new VisibilityMetricsService();
      const metrics = service.calculateMetrics(results);

      // Assert: SPECIFICATION - MUST calculate high visibility score
      // High mention rate + positive sentiment + high confidence + good ranking = high score
      expect(metrics.visibilityScore).toBeGreaterThan(50); // Should be high
      expect(metrics.visibilityScore).toBeLessThanOrEqual(100);
    });

    it('MUST map sentiment values correctly (positive=1.0, neutral=0.5, negative=0.0)', async () => {
      // Arrange: Results with each sentiment type
      const results: LLMResult[] = [
        {
          model: 'openai/gpt-4-turbo',
          promptType: 'opinion',
          mentioned: true,
          sentiment: 'positive',
          confidence: 0.9,
          rankPosition: null,
          competitorMentions: [],
          rawResponse: 'Positive',
          tokensUsed: 100,
          prompt: 'Query',
          processingTime: 500,
        },
        {
          model: 'anthropic/claude-3-opus',
          promptType: 'opinion',
          mentioned: true,
          sentiment: 'neutral',
          confidence: 0.8,
          rankPosition: null,
          competitorMentions: [],
          rawResponse: 'Neutral',
          tokensUsed: 120,
          prompt: 'Query',
          processingTime: 600,
        },
        {
          model: 'google/gemini-pro',
          promptType: 'opinion',
          mentioned: true,
          sentiment: 'negative',
          confidence: 0.7,
          rankPosition: null,
          competitorMentions: [],
          rawResponse: 'Negative',
          tokensUsed: 100,
          prompt: 'Query',
          processingTime: 500,
        },
      ];

      // Act: Calculate metrics (TEST DRIVES IMPLEMENTATION)
      const { VisibilityMetricsService } = await import('../visibility-metrics-service');
      const service = new VisibilityMetricsService();
      const metrics = service.calculateMetrics(results);

      // Assert: SPECIFICATION - MUST map sentiments correctly
      // (1.0 + 0.5 + 0.0) / 3 = 0.5
      expect(metrics.sentimentScore).toBeCloseTo(0.5, 1);
    });
  });
});


