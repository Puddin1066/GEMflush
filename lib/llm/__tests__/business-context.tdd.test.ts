/**
 * TDD Test: Business Context Utility - Tests Drive Implementation
 * 
 * SPECIFICATION: Business Entity to Context Conversion
 * 
 * As a system
 * I want to convert Business entities to BusinessContext format
 * So that business data can be used consistently across the LLM module
 * 
 * IMPORTANT: These tests specify DESIRED behavior for context conversion.
 * Tests verify that Business entities are converted to BusinessContext correctly.
 * 
 * TDD Cycle: RED → GREEN → REFACTOR
 * Tests written to specify desired conversion behavior
 */

import { describe, it, expect } from 'vitest';
import { BusinessTestFactory } from '@/lib/test-helpers/tdd-helpers';
import type { Business } from '@/lib/db/schema';
import type { BusinessContext } from '../types';

describe('🔴 RED: Business Context Utility - Desired Behavior Specification', () => {
  /**
   * SPECIFICATION 1: businessToContext() - MUST Convert Business to Context
   * 
   * DESIRED BEHAVIOR: businessToContext() MUST convert a Business entity
   * to BusinessContext format with all relevant fields mapped correctly.
   */
  describe('businessToContext', () => {
    it('MUST convert Business entity with all fields to BusinessContext', async () => {
      // Arrange: Business with complete data
      const business = BusinessTestFactory.create({
        id: 123,
        name: 'Test Business',
        url: 'https://test-business.com',
        category: 'Restaurant',
        location: {
          city: 'San Francisco',
          state: 'CA',
          country: 'US',
        },
        crawlData: {
          name: 'Test Business',
          description: 'A test restaurant',
          phone: '555-0100',
          email: 'test@example.com',
        },
      });

      // Act: Convert to context (TEST DRIVES IMPLEMENTATION)
      const { businessToContext } = await import('../business-context');
      const context = businessToContext(business);

      // Assert: SPECIFICATION - MUST map all fields correctly
      expect(context).toBeDefined();
      expect(context.businessId).toBe(business.id);
      expect(context.name).toBe(business.name);
      expect(context.url).toBe(business.url);
      expect(context.category).toBe(business.category);
      expect(context.location).toBeDefined();
      expect(context.location?.city).toBe(business.location?.city);
      expect(context.location?.state).toBe(business.location?.state);
      expect(context.location?.country).toBe(business.location?.country);
      expect(context.crawlData).toBeDefined();
      expect(context.crawlData).toEqual(business.crawlData);
    });

    it('MUST handle Business without optional fields gracefully', async () => {
      // Arrange: Business with minimal required fields only
      const business = BusinessTestFactory.create({
        id: 456,
        name: 'Minimal Business',
        url: 'https://minimal.com',
        category: null,
        location: null,
        crawlData: null,
      });

      // Act: Convert to context (TEST DRIVES IMPLEMENTATION)
      const { businessToContext } = await import('../business-context');
      const context = businessToContext(business);

      // Assert: SPECIFICATION - MUST handle missing optional fields
      expect(context).toBeDefined();
      expect(context.businessId).toBe(business.id);
      expect(context.name).toBe(business.name);
      expect(context.url).toBe(business.url);
      expect(context.category).toBeUndefined();
      expect(context.location).toBeUndefined();
      expect(context.crawlData).toBeUndefined();
    });

    it('MUST convert category when present', async () => {
      // Arrange: Business with category
      const business = BusinessTestFactory.create({
        category: 'Technology',
      });

      // Act: Convert to context (TEST DRIVES IMPLEMENTATION)
      const { businessToContext } = await import('../business-context');
      const context = businessToContext(business);

      // Assert: SPECIFICATION - MUST include category when present
      expect(context.category).toBe('Technology');
    });

    it('MUST convert category to undefined when null', async () => {
      // Arrange: Business with null category
      const business = BusinessTestFactory.create({
        category: null,
      });

      // Act: Convert to context (TEST DRIVES IMPLEMENTATION)
      const { businessToContext } = await import('../business-context');
      const context = businessToContext(business);

      // Assert: SPECIFICATION - MUST convert null category to undefined
      expect(context.category).toBeUndefined();
    });

    it('MUST convert location object when present', async () => {
      // Arrange: Business with location
      const business = BusinessTestFactory.create({
        location: {
          city: 'Seattle',
          state: 'WA',
          country: 'US',
        },
      });

      // Act: Convert to context (TEST DRIVES IMPLEMENTATION)
      const { businessToContext } = await import('../business-context');
      const context = businessToContext(business);

      // Assert: SPECIFICATION - MUST include location object when present
      expect(context.location).toBeDefined();
      expect(context.location?.city).toBe('Seattle');
      expect(context.location?.state).toBe('WA');
      expect(context.location?.country).toBe('US');
    });

    it('MUST convert location to undefined when null', async () => {
      // Arrange: Business with null location
      const business = BusinessTestFactory.create({
        location: null,
      });

      // Act: Convert to context (TEST DRIVES IMPLEMENTATION)
      const { businessToContext } = await import('../business-context');
      const context = businessToContext(business);

      // Assert: SPECIFICATION - MUST convert null location to undefined
      expect(context.location).toBeUndefined();
    });

    it('MUST convert crawlData when present', async () => {
      // Arrange: Business with crawlData
      const crawlData = {
        name: 'Crawled Business',
        description: 'Business description',
        phone: '555-1234',
        email: 'info@business.com',
        address: '123 Main St',
      };
      const business = BusinessTestFactory.create({
        crawlData,
      });

      // Act: Convert to context (TEST DRIVES IMPLEMENTATION)
      const { businessToContext } = await import('../business-context');
      const context = businessToContext(business);

      // Assert: SPECIFICATION - MUST include crawlData when present
      expect(context.crawlData).toBeDefined();
      expect(context.crawlData).toEqual(crawlData);
    });

    it('MUST convert crawlData to undefined when null', async () => {
      // Arrange: Business with null crawlData
      const business = BusinessTestFactory.create({
        crawlData: null,
      });

      // Act: Convert to context (TEST DRIVES IMPLEMENTATION)
      const { businessToContext } = await import('../business-context');
      const context = businessToContext(business);

      // Assert: SPECIFICATION - MUST convert null crawlData to undefined
      expect(context.crawlData).toBeUndefined();
    });

    it('MUST preserve all required fields from Business entity', async () => {
      // Arrange: Business with all required fields
      const business = BusinessTestFactory.create({
        id: 789,
        name: 'Required Fields Business',
        url: 'https://required.com',
      });

      // Act: Convert to context (TEST DRIVES IMPLEMENTATION)
      const { businessToContext } = await import('../business-context');
      const context = businessToContext(business);

      // Assert: SPECIFICATION - MUST preserve all required fields
      expect(context.businessId).toBe(789);
      expect(context.name).toBe('Required Fields Business');
      expect(context.url).toBe('https://required.com');
    });

    it('MUST create new context object (not reference to original)', async () => {
      // Arrange: Business entity
      const business = BusinessTestFactory.create({
        location: {
          city: 'Portland',
          state: 'OR',
          country: 'US',
        },
      });

      // Act: Convert to context (TEST DRIVES IMPLEMENTATION)
      const { businessToContext } = await import('../business-context');
      const context = businessToContext(business);

      // Assert: SPECIFICATION - MUST create new object (not same reference)
      expect(context).not.toBe(business);
      expect(context.location).not.toBe(business.location); // New object, not reference
      
      // But should have same values
      expect(context.location?.city).toBe(business.location?.city);
    });
  });
});


