/**
 * TDD Test: Activity DTO - Tests Drive Implementation
 * 
 * SPECIFICATION: Activity Feed Data Transformation
 * 
 * As a user
 * I want to see a feed of recent activity (crawls, fingerprints, publishes)
 * So that I can track what's happening with my businesses
 * 
 * Acceptance Criteria:
 * 1. Activity DTO transforms crawl jobs to activity items
 * 2. Activity DTO transforms fingerprint jobs to activity items
 * 3. Activity DTO transforms Wikidata publishes to activity items
 * 4. Activities are sorted by most recent first
 * 5. Activities include business context (name, ID)
 * 6. Activities include formatted timestamps
 * 7. Activities include status indicators (success, error, in-progress)
 * 
 * TDD Cycle: RED → GREEN → REFACTOR
 * Tests written FIRST to drive implementation
 * SOLID: Single Responsibility - activity transformation only
 * DRY: Reusable activity formatting
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BusinessTestFactory, CrawlJobTestFactory } from '@/lib/test-helpers/tdd-helpers';

// Mock dependencies
vi.mock('@/lib/db/queries', () => ({
  getCrawlJobsByTeam: vi.fn(() => Promise.resolve([])),
  getFingerprintsByTeam: vi.fn(() => Promise.resolve([])),
  getWikidataPublishesByTeam: vi.fn(() => Promise.resolve([])),
  getBusinessById: vi.fn(),
}));

describe('🔴 RED: Activity DTO Specification', () => {
  /**
   * SPECIFICATION 1: Transform Crawl Jobs to Activity Items
   * 
   * Given: Crawl jobs from database
   * When: Activity DTO transforms them
   * Then: Activities have correct structure and type
   */
  it('transforms crawl jobs to activity items', async () => {
    // Arrange: Crawl job data
    const crawlJob = CrawlJobTestFactory.create({
      id: 1,
      businessId: 123,
      status: 'completed',
      progress: 100,
      createdAt: new Date('2025-01-15T10:00:00Z'),
    });

    const business = BusinessTestFactory.create({ id: 123, name: 'Example Business' });

    // Act: Transform to activity (TEST DRIVES IMPLEMENTATION)
    // GREEN PHASE: Implementation exists - test verifies behavior
    const activityDTO = await import('../activity-dto');
    const activity = await activityDTO.toActivityDTO(crawlJob, business);

    // Assert: Verify activity structure (behavior: correct activity format)
    expect(activity).toMatchObject({
      id: 'crawl-1',
      type: 'crawl',
      businessId: '123',
      businessName: 'Example Business',
      status: 'completed',
      timestamp: expect.any(String),
      message: expect.stringContaining('Example Business'),
    });
  });

  /**
   * SPECIFICATION 2: Transform Fingerprint Jobs to Activity Items
   * 
   * Given: Fingerprint data from database
   * When: Activity DTO transforms them
   * Then: Activities have correct structure and type
   */
  it('transforms fingerprint jobs to activity items', async () => {
    // Arrange: Fingerprint data
    const fingerprint = {
      id: 1,
      businessId: 123,
      visibilityScore: 75,
      createdAt: new Date('2025-01-15T11:00:00Z'),
    };

    const business = BusinessTestFactory.create({ id: 123, name: 'Example Business' });

    // Act: Transform to activity (TEST DRIVES IMPLEMENTATION)
    const activityDTO = await import('../activity-dto');
    const activity = await activityDTO.toActivityDTO(fingerprint, business, 'fingerprint');

    // Assert: Verify activity structure (behavior: correct activity format)
    expect(activity).toMatchObject({
      id: 'fingerprint-1',
      type: 'fingerprint',
      businessId: '123',
      businessName: 'Example Business',
      status: 'completed',
      timestamp: expect.any(String),
      message: expect.stringContaining('visibility score'),
      details: expect.objectContaining({
        result: expect.stringContaining('75'),
      }),
    });
  });

  /**
   * SPECIFICATION 3: Transform Wikidata Publishes to Activity Items
   * 
   * Given: Wikidata publish data
   * When: Activity DTO transforms them
   * Then: Activities include QID and publish status
   */
  it('transforms Wikidata publishes to activity items', async () => {
    // Arrange: Wikidata publish data
    const publish = {
      id: 1,
      businessId: 123,
      qid: 'Q123456',
      publishedAt: new Date('2025-01-15T12:00:00Z'),
      success: true,
    };

    const business = BusinessTestFactory.create({ 
      id: 123, 
      name: 'Example Business',
      wikidataQID: 'Q123456',
    });

    // Act: Transform to activity (TEST DRIVES IMPLEMENTATION)
    const activityDTO = await import('../activity-dto');
    const activity = await activityDTO.toActivityDTO(publish, business, 'publish');

    // Assert: Verify activity structure (behavior: correct activity format)
    expect(activity).toMatchObject({
      id: 'publish-1',
      type: 'publish',
      businessId: '123',
      businessName: 'Example Business',
      status: 'completed',
      timestamp: expect.any(String),
      message: expect.stringContaining('Q123456'),
      details: expect.objectContaining({
        result: 'Q123456',
      }),
    });
  });

  /**
   * SPECIFICATION 4: Get Activity Feed for Team
   * 
   * Given: Team ID
   * When: Activity feed is fetched
   * Then: Returns sorted activities from all businesses
   */
  it('gets activity feed for team sorted by most recent', async () => {
    // Arrange: Multiple activities from different businesses
    const teamId = 1;
    
    // Mock data
    const crawlJobs = [
      CrawlJobTestFactory.create({
        id: 1,
        businessId: 123,
        createdAt: new Date('2025-01-15T10:00:00Z'),
      }),
      CrawlJobTestFactory.create({
        id: 2,
        businessId: 124,
        createdAt: new Date('2025-01-15T11:00:00Z'),
      }),
    ];

    // Mock queries
    const queries = await vi.importMock('@/lib/db/queries');
    vi.mocked(queries.getCrawlJobsByTeam).mockResolvedValue(crawlJobs);
    vi.mocked(queries.getFingerprintsByTeam).mockResolvedValue([]);
    vi.mocked(queries.getWikidataPublishesByTeam).mockResolvedValue([]);
    vi.mocked(queries.getBusinessById)
      .mockResolvedValueOnce(BusinessTestFactory.create({ id: 123, name: 'Business 1' }))
      .mockResolvedValueOnce(BusinessTestFactory.create({ id: 124, name: 'Business 2' }));

    // Act: Get activity feed (TEST DRIVES IMPLEMENTATION)
    const activityDTO = await import('../activity-dto');
    const result = await activityDTO.getActivityFeedDTO(teamId);
    const activities = result.activities;

    // Assert: Verify feed structure (behavior: sorted, complete feed)
    expect(result).toMatchObject({
      activities: expect.any(Array),
      total: expect.any(Number),
    });
    expect(activities).toHaveLength(2);
    // Most recent first (11:00 > 10:00)
    expect(new Date(activities[0].timestamp).getTime()).toBeGreaterThan(
      new Date(activities[1].timestamp).getTime()
    );
    expect(activities[0].type).toBeDefined();
    expect(activities[0].businessName).toBeDefined();
  });

  /**
   * SPECIFICATION 5: Format Activity Timestamps
   * 
   * Given: Activity timestamp
   * When: Activity is formatted
   * Then: Timestamp is human-readable
   */
  it('formats activity timestamps correctly', async () => {
    // Arrange: Recent and old timestamps
    const recent = new Date();
    const old = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000); // 2 days ago

    // Act: Format timestamps (TEST DRIVES IMPLEMENTATION)
    const activityDTO = await import('../activity-dto');
    const recentFormatted = activityDTO.formatActivityTimestamp(recent);
    const oldFormatted = activityDTO.formatActivityTimestamp(old);

    // Assert: Verify formatting (behavior: human-readable timestamps)
    expect(recentFormatted).toMatch(/just now|minutes ago|hours ago/i);
    expect(oldFormatted).toMatch(/days ago|weeks ago/i);
  });

  /**
   * SPECIFICATION 6: Activity Status Indicators
   * 
   * Given: Activity with different statuses
   * When: Activity is transformed
   * Then: Status is correctly indicated
   */
  it('includes correct status indicators', async () => {
    // Arrange: Activities with different statuses
    const completedCrawl = CrawlJobTestFactory.create({
      status: 'completed',
      progress: 100,
    });
    
    const failedCrawl = CrawlJobTestFactory.create({
      status: 'failed',
      errorMessage: 'Crawl failed',
    });
    
    const runningCrawl = CrawlJobTestFactory.create({
      status: 'running',
      progress: 50,
    });

    const business = BusinessTestFactory.create({ id: 123, name: 'Example Business' });

    // Act: Transform activities (TEST DRIVES IMPLEMENTATION)
    const activityDTO = await import('../activity-dto');
    const completed = await activityDTO.toActivityDTO(completedCrawl, business);
    const failed = await activityDTO.toActivityDTO(failedCrawl, business);
    const running = await activityDTO.toActivityDTO(runningCrawl, business);

    // Assert: Verify status indicators (behavior: correct status representation)
    expect(completed.status).toBe('completed');
    expect(completed.message).not.toContain('error');
    
    expect(failed.status).toBe('failed');
    expect(failed.message.toLowerCase()).toContain('error');
    expect(failed.details?.error).toBeDefined();
    
    expect(running.status).toBe('processing');
    expect(running.details?.progress).toBe(50);
  });
});

