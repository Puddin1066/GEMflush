/**
 * TDD Test: Business List DTO - Tests Drive Implementation
 * 
 * SPECIFICATION: Business List Data Transformation
 * 
 * As a user
 * I want to see a list of my businesses with key metrics
 * So that I can quickly assess their status
 * 
 * Acceptance Criteria:
 * 1. Business list DTO transforms businesses for list display
 * 2. Includes essential fields (name, status, visibility score)
 * 3. Includes quick actions availability
 * 4. Handles pagination
 * 5. Supports filtering and sorting
 * 
 * TDD Cycle: RED → GREEN → REFACTOR
 * Tests written FIRST to drive implementation
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BusinessTestFactory } from '@/lib/test-helpers/tdd-helpers';

// Mock database queries
vi.mock('@/lib/db/queries', () => ({
  getLatestFingerprint: vi.fn().mockResolvedValue({
    visibilityScore: 75,
    createdAt: new Date(),
  }),
}));

describe('🔴 RED: Business List DTO Specification', () => {
  /**
   * SPECIFICATION 1: Transform Businesses to List DTO
   * 
   * Given: Array of businesses
   * When: Business list DTO transforms them
   * Then: Returns simplified list format
   */
  it('transforms businesses to list DTO format', async () => {
    // Arrange
    const businesses = [
      BusinessTestFactory.create({ id: 1, name: 'Business 1', status: 'published' }),
      BusinessTestFactory.create({ id: 2, name: 'Business 2', status: 'crawled' }),
    ];

    // Act: Transform to list DTO (TEST DRIVES IMPLEMENTATION)
    const { toBusinessListDTO } = await import('../business-list-dto');
    const listDTO = await toBusinessListDTO(businesses);

    // Assert: Verify list structure (behavior: simplified list format)
    expect(listDTO.businesses).toHaveLength(2);
    expect(listDTO.businesses[0]).toMatchObject({
      id: '1',
      name: 'Business 1',
      status: 'published',
      visibilityScore: expect.any(Number),
      canCrawl: expect.any(Boolean),
      canFingerprint: expect.any(Boolean),
      canPublish: expect.any(Boolean),
    });
  });

  /**
   * SPECIFICATION 2: Include Quick Actions Availability
   * 
   * Given: Business with different statuses
   * When: Business list DTO transforms them
   * Then: Quick actions reflect current state
   */
  it('includes correct quick actions availability', async () => {
    // Arrange: Businesses in different states
    const pendingBusiness = BusinessTestFactory.create({ status: 'pending' });
    const crawledBusiness = BusinessTestFactory.create({ status: 'crawled' });
    const publishedBusiness = BusinessTestFactory.create({ status: 'published' });

    // Act: Transform to list DTO (TEST DRIVES IMPLEMENTATION)
    const { toBusinessListDTO } = await import('../business-list-dto');
    const pending = await toBusinessListDTO([pendingBusiness]);
    const crawled = await toBusinessListDTO([crawledBusiness]);
    const published = await toBusinessListDTO([publishedBusiness]);

    // Assert: Verify actions (behavior: correct action availability)
    expect(pending.businesses[0].canCrawl).toBe(true);
    expect(pending.businesses[0].canFingerprint).toBe(false);
    
    expect(crawled.businesses[0].canCrawl).toBe(true);
    expect(crawled.businesses[0].canFingerprint).toBe(true);
    
    expect(published.businesses[0].canCrawl).toBe(true);
    expect(published.businesses[0].canFingerprint).toBe(true);
    expect(published.businesses[0].canPublish).toBe(true);
  });
});

