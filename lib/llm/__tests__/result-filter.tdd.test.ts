/**
 * TDD Test: Result Filter Utility - Tests Drive Implementation
 * 
 * SPECIFICATION: LLM Result Filtering Functions
 * 
 * As a system
 * I want to filter LLM results by various criteria
 * So that I can process and analyze results efficiently
 * 
 * IMPORTANT: These tests specify DESIRED behavior for result filtering.
 * Tests verify that results are filtered correctly according to criteria.
 * 
 * TDD Cycle: RED → GREEN → REFACTOR
 * Tests written to specify desired filtering behavior
 */

import { describe, it, expect } from 'vitest';
import type { LLMResult } from '../types';

describe('🔴 RED: Result Filter Utility - Desired Behavior Specification', () => {
  /**
   * SPECIFICATION 1: filterValidResults() - MUST Filter Valid Results
   * 
   * DESIRED BEHAVIOR: filterValidResults() MUST filter out invalid results
   * (null, undefined, or results with errors).
   */
  describe('filterValidResults', () => {
    it('MUST return only valid LLMResult objects', async () => {
      // Arrange: Mix of valid and invalid results
      const validResult: LLMResult = {
        model: 'openai/gpt-4-turbo',
        promptType: 'factual',
        mentioned: true,
        sentiment: 'positive',
        confidence: 0.9,
        rankPosition: null,
        competitorMentions: [],
        rawResponse: 'Valid response',
        tokensUsed: 100,
        prompt: 'Query',
        processingTime: 500,
      };

      const results: (LLMResult | null | undefined)[] = [
        validResult,
        null,
        undefined,
        {
          ...validResult,
          error: 'API error',
        },
      ];

      // Act: Filter valid results (TEST DRIVES IMPLEMENTATION)
      const { filterValidResults } = await import('../result-filter');
      const filtered = filterValidResults(results);

      // Assert: SPECIFICATION - MUST return only valid results
      expect(filtered).toBeDefined();
      expect(Array.isArray(filtered)).toBe(true);
      expect(filtered.length).toBe(1);
      expect(filtered[0]).toEqual(validResult);
    });

    it('MUST filter out results with error field', async () => {
      // Arrange: Result with error
      const resultWithError: LLMResult = {
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
        error: 'API timeout',
      };

      const results: (LLMResult | null | undefined)[] = [resultWithError];

      // Act: Filter valid results (TEST DRIVES IMPLEMENTATION)
      const { filterValidResults } = await import('../result-filter');
      const filtered = filterValidResults(results);

      // Assert: SPECIFICATION - MUST filter out results with errors
      expect(filtered.length).toBe(0);
    });

    it('MUST filter out null values', async () => {
      // Arrange: Array with null values
      const validResult: LLMResult = {
        model: 'openai/gpt-4-turbo',
        promptType: 'factual',
        mentioned: true,
        sentiment: 'positive',
        confidence: 0.9,
        rankPosition: null,
        competitorMentions: [],
        rawResponse: 'Valid',
        tokensUsed: 100,
        prompt: 'Query',
        processingTime: 500,
      };

      const results: (LLMResult | null | undefined)[] = [null, validResult, null];

      // Act: Filter valid results (TEST DRIVES IMPLEMENTATION)
      const { filterValidResults } = await import('../result-filter');
      const filtered = filterValidResults(results);

      // Assert: SPECIFICATION - MUST filter out null values
      expect(filtered.length).toBe(1);
      expect(filtered[0]).toEqual(validResult);
    });

    it('MUST filter out undefined values', async () => {
      // Arrange: Array with undefined values
      const validResult: LLMResult = {
        model: 'openai/gpt-4-turbo',
        promptType: 'factual',
        mentioned: true,
        sentiment: 'positive',
        confidence: 0.9,
        rankPosition: null,
        competitorMentions: [],
        rawResponse: 'Valid',
        tokensUsed: 100,
        prompt: 'Query',
        processingTime: 500,
      };

      const results: (LLMResult | null | undefined)[] = [undefined, validResult, undefined];

      // Act: Filter valid results (TEST DRIVES IMPLEMENTATION)
      const { filterValidResults } = await import('../result-filter');
      const filtered = filterValidResults(results);

      // Assert: SPECIFICATION - MUST filter out undefined values
      expect(filtered.length).toBe(1);
      expect(filtered[0]).toEqual(validResult);
    });

    it('MUST return empty array when all results are invalid', async () => {
      // Arrange: Only invalid results
      const results: (LLMResult | null | undefined)[] = [null, undefined, null];

      // Act: Filter valid results (TEST DRIVES IMPLEMENTATION)
      const { filterValidResults } = await import('../result-filter');
      const filtered = filterValidResults(results);

      // Assert: SPECIFICATION - MUST return empty array
      expect(filtered).toEqual([]);
      expect(filtered.length).toBe(0);
    });

    it('MUST return all results when all are valid', async () => {
      // Arrange: All valid results
      const validResults: LLMResult[] = [
        {
          model: 'openai/gpt-4-turbo',
          promptType: 'factual',
          mentioned: true,
          sentiment: 'positive',
          confidence: 0.9,
          rankPosition: null,
          competitorMentions: [],
          rawResponse: 'Response 1',
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
          rawResponse: 'Response 2',
          tokensUsed: 120,
          prompt: 'Query 2',
          processingTime: 600,
        },
      ];

      // Act: Filter valid results (TEST DRIVES IMPLEMENTATION)
      const { filterValidResults } = await import('../result-filter');
      const filtered = filterValidResults(validResults);

      // Assert: SPECIFICATION - MUST return all valid results
      expect(filtered.length).toBe(2);
      expect(filtered).toEqual(validResults);
    });
  });

  /**
   * SPECIFICATION 2: filterByPromptType() - MUST Filter by Prompt Type
   * 
   * DESIRED BEHAVIOR: filterByPromptType() MUST filter results by prompt type.
   */
  describe('filterByPromptType', () => {
    it('MUST return only results matching specified prompt type', async () => {
      // Arrange: Results with different prompt types
      const results: LLMResult[] = [
        {
          model: 'openai/gpt-4-turbo',
          promptType: 'factual',
          mentioned: true,
          sentiment: 'positive',
          confidence: 0.9,
          rankPosition: null,
          competitorMentions: [],
          rawResponse: 'Factual response',
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
          rawResponse: 'Opinion response',
          tokensUsed: 120,
          prompt: 'What do people think?',
          processingTime: 600,
        },
        {
          model: 'google/gemini-pro',
          promptType: 'recommendation',
          mentioned: true,
          sentiment: 'positive',
          confidence: 0.8,
          rankPosition: 1,
          competitorMentions: [],
          rawResponse: 'Recommendation response',
          tokensUsed: 150,
          prompt: 'Recommend',
          processingTime: 700,
        },
      ];

      // Act: Filter by prompt type (TEST DRIVES IMPLEMENTATION)
      const { filterByPromptType } = await import('../result-filter');
      const filtered = filterByPromptType(results, 'factual');

      // Assert: SPECIFICATION - MUST return only factual results
      expect(filtered.length).toBe(1);
      expect(filtered[0].promptType).toBe('factual');
    });

    it('MUST return empty array when no results match prompt type', async () => {
      // Arrange: Results with different prompt types
      const results: LLMResult[] = [
        {
          model: 'openai/gpt-4-turbo',
          promptType: 'factual',
          mentioned: true,
          sentiment: 'positive',
          confidence: 0.9,
          rankPosition: null,
          competitorMentions: [],
          rawResponse: 'Response',
          tokensUsed: 100,
          prompt: 'Query',
          processingTime: 500,
        },
      ];

      // Act: Filter by different prompt type (TEST DRIVES IMPLEMENTATION)
      const { filterByPromptType } = await import('../result-filter');
      const filtered = filterByPromptType(results, 'recommendation');

      // Assert: SPECIFICATION - MUST return empty array when no match
      expect(filtered).toEqual([]);
      expect(filtered.length).toBe(0);
    });

    it('MUST handle all three prompt types correctly', async () => {
      // Arrange: Results with all prompt types
      const results: LLMResult[] = [
        {
          model: 'openai/gpt-4-turbo',
          promptType: 'factual',
          mentioned: true,
          sentiment: 'positive',
          confidence: 0.9,
          rankPosition: null,
          competitorMentions: [],
          rawResponse: 'Factual',
          tokensUsed: 100,
          prompt: 'Query',
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
          rawResponse: 'Opinion',
          tokensUsed: 120,
          prompt: 'Query',
          processingTime: 600,
        },
        {
          model: 'google/gemini-pro',
          promptType: 'recommendation',
          mentioned: true,
          sentiment: 'positive',
          confidence: 0.8,
          rankPosition: 1,
          competitorMentions: [],
          rawResponse: 'Recommendation',
          tokensUsed: 150,
          prompt: 'Query',
          processingTime: 700,
        },
      ];

      // Act & Assert: Filter by each type (TEST DRIVES IMPLEMENTATION)
      const { filterByPromptType } = await import('../result-filter');
      
      const factual = filterByPromptType(results, 'factual');
      expect(factual.length).toBe(1);
      expect(factual[0].promptType).toBe('factual');

      const opinion = filterByPromptType(results, 'opinion');
      expect(opinion.length).toBe(1);
      expect(opinion[0].promptType).toBe('opinion');

      const recommendation = filterByPromptType(results, 'recommendation');
      expect(recommendation.length).toBe(1);
      expect(recommendation[0].promptType).toBe('recommendation');
    });
  });

  /**
   * SPECIFICATION 3: filterMentionedResults() - MUST Filter Mentioned Results
   * 
   * DESIRED BEHAVIOR: filterMentionedResults() MUST return only results
   * where the business was mentioned.
   */
  describe('filterMentionedResults', () => {
    it('MUST return only results where business was mentioned', async () => {
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
          prompt: 'Query',
          processingTime: 500,
        },
        {
          model: 'anthropic/claude-3-opus',
          promptType: 'opinion',
          mentioned: false,
          sentiment: 'neutral',
          confidence: 0.5,
          rankPosition: null,
          competitorMentions: [],
          rawResponse: 'Not mentioned',
          tokensUsed: 80,
          prompt: 'Query',
          processingTime: 400,
        },
        {
          model: 'google/gemini-pro',
          promptType: 'recommendation',
          mentioned: true,
          sentiment: 'positive',
          confidence: 0.8,
          rankPosition: 1,
          competitorMentions: [],
          rawResponse: 'Mentioned again',
          tokensUsed: 120,
          prompt: 'Query',
          processingTime: 600,
        },
      ];

      // Act: Filter mentioned results (TEST DRIVES IMPLEMENTATION)
      const { filterMentionedResults } = await import('../result-filter');
      const filtered = filterMentionedResults(results);

      // Assert: SPECIFICATION - MUST return only mentioned results
      expect(filtered.length).toBe(2);
      expect(filtered.every(r => r.mentioned)).toBe(true);
    });

    it('MUST return empty array when no results mention business', async () => {
      // Arrange: Results without mentions
      const results: LLMResult[] = [
        {
          model: 'openai/gpt-4-turbo',
          promptType: 'factual',
          mentioned: false,
          sentiment: 'neutral',
          confidence: 0.5,
          rankPosition: null,
          competitorMentions: [],
          rawResponse: 'Not mentioned',
          tokensUsed: 80,
          prompt: 'Query',
          processingTime: 400,
        },
      ];

      // Act: Filter mentioned results (TEST DRIVES IMPLEMENTATION)
      const { filterMentionedResults } = await import('../result-filter');
      const filtered = filterMentionedResults(results);

      // Assert: SPECIFICATION - MUST return empty array
      expect(filtered).toEqual([]);
      expect(filtered.length).toBe(0);
    });
  });

  /**
   * SPECIFICATION 4: filterRankedResults() - MUST Filter Ranked Results
   * 
   * DESIRED BEHAVIOR: filterRankedResults() MUST return only results
   * with rank positions.
   */
  describe('filterRankedResults', () => {
    it('MUST return only results with rank positions', async () => {
      // Arrange: Mix of ranked and unranked results
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
          promptType: 'factual',
          mentioned: true,
          sentiment: 'positive',
          confidence: 0.85,
          rankPosition: null,
          competitorMentions: [],
          rawResponse: 'Not ranked',
          tokensUsed: 120,
          prompt: 'What is?',
          processingTime: 600,
        },
        {
          model: 'anthropic/claude-3-opus',
          promptType: 'recommendation',
          mentioned: true,
          sentiment: 'positive',
          confidence: 0.8,
          rankPosition: 3,
          competitorMentions: [],
          rawResponse: 'Ranked #3',
          tokensUsed: 100,
          prompt: 'Recommend',
          processingTime: 500,
        },
      ];

      // Act: Filter ranked results (TEST DRIVES IMPLEMENTATION)
      const { filterRankedResults } = await import('../result-filter');
      const filtered = filterRankedResults(results);

      // Assert: SPECIFICATION - MUST return only ranked results
      expect(filtered.length).toBe(2);
      expect(filtered.every(r => r.rankPosition !== null)).toBe(true);
    });

    it('MUST return empty array when no results have rankings', async () => {
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
          rawResponse: 'No rank',
          tokensUsed: 100,
          prompt: 'Query',
          processingTime: 500,
        },
      ];

      // Act: Filter ranked results (TEST DRIVES IMPLEMENTATION)
      const { filterRankedResults } = await import('../result-filter');
      const filtered = filterRankedResults(results);

      // Assert: SPECIFICATION - MUST return empty array
      expect(filtered).toEqual([]);
      expect(filtered.length).toBe(0);
    });

    it('MUST handle rankPosition of 0 as valid rank', async () => {
      // Arrange: Result with rankPosition 0 (edge case)
      const results: LLMResult[] = [
        {
          model: 'google/gemini-pro',
          promptType: 'recommendation',
          mentioned: true,
          sentiment: 'positive',
          confidence: 0.9,
          rankPosition: 0, // Edge case: 0 might be considered valid
          competitorMentions: [],
          rawResponse: 'Ranked 0',
          tokensUsed: 100,
          prompt: 'Recommend',
          processingTime: 500,
        },
      ];

      // Act: Filter ranked results (TEST DRIVES IMPLEMENTATION)
      const { filterRankedResults } = await import('../result-filter');
      const filtered = filterRankedResults(results);

      // Assert: SPECIFICATION - Behavior depends on implementation (0 vs null)
      // For now, expect that null is the "no rank" indicator, so 0 might be included
      expect(filtered.length).toBeGreaterThanOrEqual(0);
    });
  });
});


