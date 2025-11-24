/**
 * TDD Test: Automation Service - Tests Drive Implementation
 * 
 * SPECIFICATION: Automation Configuration Service
 * 
 * As a KGaaS platform
 * I want automation configuration to work correctly
 * So that tier-based automation is properly enforced
 * 
 * Acceptance Criteria:
 * 1. Returns correct automation config per tier
 * 2. Determines crawl frequency correctly
 * 3. Determines publish eligibility correctly
 * 4. Calculates next crawl date correctly
 * 
 * TDD Cycle: RED → GREEN → REFACTOR
 * Tests written FIRST to drive implementation
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BusinessTestFactory } from '@/lib/test-helpers/tdd-helpers';

describe('🔴 RED: Automation Service Specification', () => {
  /**
   * SPECIFICATION 1: Get Automation Config
   * 
   * Given: Team with subscription tier
   * When: Getting automation config
   * Then: Returns correct config for tier
   */
  it('returns correct automation config per tier', async () => {
    // Arrange: Team with Free tier
    const freeTeam = { planName: 'free' };
    const proTeam = { planName: 'pro' };

    // Act: Get automation config (TEST DRIVES IMPLEMENTATION)
    const { getAutomationConfig } = await import('../automation-service');
    const freeConfig = getAutomationConfig(freeTeam);
    const proConfig = getAutomationConfig(proTeam);

    // Assert: Verify tier-based config (behavior: correct config per tier)
    expect(freeConfig).toMatchObject({
      crawlFrequency: 'manual',
      autoPublish: false,
    });
    expect(proConfig).toMatchObject({
      crawlFrequency: 'monthly',
      autoPublish: true,
    });
  });

  /**
   * SPECIFICATION 2: Determine Crawl Frequency
   * 
   * Given: Business and team
   * When: Checking crawl frequency
   * Then: Returns correct frequency
   */
  it('determines crawl frequency correctly', async () => {
    // Arrange: Business with automation enabled and Pro team
    const business = BusinessTestFactory.create({ 
      id: 1,
      automationEnabled: true, // Required for shouldAutoCrawl to return true
    });
    const team = { planName: 'pro' };

    // Act: Check crawl frequency (TEST DRIVES IMPLEMENTATION)
    const { shouldAutoCrawl } = await import('../automation-service');
    const shouldCrawl = shouldAutoCrawl(business, team);

    // Assert: Verify frequency logic (behavior: correct frequency determination)
    expect(typeof shouldCrawl).toBe('boolean');
    // Pro tier with automation enabled should allow crawling
    expect(shouldCrawl).toBe(true);
  });
});

