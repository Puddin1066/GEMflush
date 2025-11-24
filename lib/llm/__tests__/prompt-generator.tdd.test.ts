/**
 * TDD Test: Prompt Generator - Tests Drive Implementation
 * 
 * SPECIFICATION: Context-Aware Prompt Generation
 * 
 * As a system
 * I want to generate sophisticated prompts for business fingerprinting
 * So that LLM queries are context-aware and natural
 * 
 * IMPORTANT: These tests specify DESIRED behavior for prompt generation.
 * Tests verify that prompts are generated correctly with business context.
 * 
 * TDD Cycle: RED → GREEN → REFACTOR
 * Tests written to specify desired prompt generation behavior
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BusinessTestFactory } from '@/lib/test-helpers/tdd-helpers';
import type { Business } from '@/lib/db/schema';
import type { CrawledData } from '@/lib/types/gemflush';

describe('🔴 RED: Prompt Generator - Desired Behavior Specification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * SPECIFICATION 1: generatePrompts() - MUST Generate Context-Aware Prompts
   * 
   * DESIRED BEHAVIOR: generatePrompts() MUST create three types of prompts
   * (factual, opinion, recommendation) using business context.
   */
  describe('generatePrompts', () => {
    it('MUST generate factual, opinion, and recommendation prompts', async () => {
      // Arrange: Business with context
      const business = BusinessTestFactory.create({
        id: 1,
        name: 'Test Business',
        url: 'https://test.com',
        category: 'restaurant',
      });

      const context = {
        businessId: business.id,
        name: business.name,
        url: business.url,
        category: business.category,
      };

      // Act: Generate prompts (TEST SPECIFIES DESIRED BEHAVIOR)
      const { PromptGenerator } = await import('../prompt-generator');
      const generator = new PromptGenerator();
      const prompts = generator.generatePrompts(context);

      // Assert: SPECIFICATION - MUST generate all three prompt types
      expect(prompts).toBeDefined();
      expect(prompts.factual).toBeDefined();
      expect(prompts.opinion).toBeDefined();
      expect(prompts.recommendation).toBeDefined();
      expect(typeof prompts.factual).toBe('string');
      expect(typeof prompts.opinion).toBe('string');
      expect(typeof prompts.recommendation).toBe('string');
    });

    it('MUST include business name in all prompts', async () => {
      // Arrange: Business
      const business = BusinessTestFactory.create({
        name: 'Popular Restaurant',
      });

      const context = {
        businessId: business.id,
        name: business.name,
        url: business.url,
      };

      // Act: Generate prompts (TEST SPECIFIES DESIRED BEHAVIOR)
      const { PromptGenerator } = await import('../prompt-generator');
      const generator = new PromptGenerator();
      const prompts = generator.generatePrompts(context);

      // Assert: SPECIFICATION - MUST include business name
      expect(prompts.factual).toContain('Popular Restaurant');
      expect(prompts.opinion).toContain('Popular Restaurant');
      expect(prompts.recommendation).toContain('Popular Restaurant');
    });

    it('MUST include location context when available', async () => {
      // Arrange: Business with location
      const business = BusinessTestFactory.create({
        name: 'Test Business',
        location: {
          city: 'San Francisco',
          state: 'CA',
          country: 'US',
        },
      });

      const context = {
        businessId: business.id,
        name: business.name,
        url: business.url,
        location: business.location ? {
          city: business.location.city,
          state: business.location.state,
          country: business.location.country,
        } : undefined,
      };

      // Act: Generate prompts (TEST SPECIFIES DESIRED BEHAVIOR)
      const { PromptGenerator } = await import('../prompt-generator');
      const generator = new PromptGenerator();
      const prompts = generator.generatePrompts(context);

      // Assert: SPECIFICATION - MUST include location
      expect(prompts.factual).toMatch(/San Francisco|CA|California/i);
      expect(prompts.opinion).toMatch(/San Francisco|CA|California/i);
      expect(prompts.recommendation).toMatch(/San Francisco|CA|California/i);
    });

    it('MUST use industry-specific terminology for recommendations', async () => {
      // Arrange: Business with category
      const business = BusinessTestFactory.create({
        name: 'Test Dental',
        category: 'dental',
      });

      const context = {
        businessId: business.id,
        name: business.name,
        url: business.url,
        category: business.category,
      };

      // Act: Generate prompts (TEST SPECIFIES DESIRED BEHAVIOR)
      const { PromptGenerator } = await import('../prompt-generator');
      const generator = new PromptGenerator();
      const prompts = generator.generatePrompts(context);

      // Assert: SPECIFICATION - MUST use industry terminology
      expect(prompts.recommendation).toMatch(/dental|dentist|dental practice/i);
    });

    it('MUST generate natural, customer-like queries', async () => {
      // Arrange: Business
      const business = BusinessTestFactory.create({
        name: 'Test Business',
      });

      const context = {
        businessId: business.id,
        name: business.name,
        url: business.url,
      };

      // Act: Generate prompts (TEST SPECIFIES DESIRED BEHAVIOR)
      const { PromptGenerator } = await import('../prompt-generator');
      const generator = new PromptGenerator();
      const prompts = generator.generatePrompts(context);

      // Assert: SPECIFICATION - MUST be natural queries
      // Factual should ask for information
      expect(prompts.factual).toMatch(/what|tell me|information|details/i);
      // Opinion should ask for assessment
      expect(prompts.opinion).toMatch(/think|opinion|assessment|reputation|quality/i);
      // Recommendation should ask for recommendations
      expect(prompts.recommendation).toMatch(/recommend|best|top|leading/i);
    });

    it('MUST handle missing context gracefully', async () => {
      // Arrange: Minimal context
      const context = {
        name: 'Test Business',
        url: 'https://test.com',
      };

      // Act: Generate prompts with minimal context (TEST SPECIFIES DESIRED BEHAVIOR)
      const { PromptGenerator } = await import('../prompt-generator');
      const generator = new PromptGenerator();
      const prompts = generator.generatePrompts(context);

      // Assert: SPECIFICATION - MUST still generate prompts
      expect(prompts.factual).toBeDefined();
      expect(prompts.opinion).toBeDefined();
      expect(prompts.recommendation).toBeDefined();
      expect(prompts.factual.length).toBeGreaterThan(0);
    });
  });
});

