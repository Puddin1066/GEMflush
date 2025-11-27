/**
 * TDD Test: Business DTO - Tests Drive Implementation
 * 
 * SPECIFICATION: Business Data Transfer Object Transformation
 * 
 * As a system
 * I want to transform Business domain objects to DTOs
 * So that the UI receives properly formatted data
 * 
 * Acceptance Criteria:
 * 1. toBusinessDetailDTO() MUST transform Business to BusinessDetailDTO
 * 2. toBusinessDetailDTO() MUST convert Date objects to ISO strings
 * 3. toBusinessDetailDTO() MUST handle null/undefined fields gracefully
 * 4. toBusinessDetailDTO() MUST filter out success messages from errorMessage
 * 5. toBusinessDetailDTO() MUST get errorMessage from crawlJobs, not businesses
 * 6. getBusinessDetailDTO() MUST return null if business not found
 * 7. getBusinessDetailDTO() MUST fetch latest crawl job for errorMessage
 * 8. toBusinessDetailDTOs() MUST transform multiple businesses
 * 
 * TDD Cycle: RED → GREEN → REFACTOR
 * Tests written FIRST to drive implementation
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BusinessTestFactory } from '@/lib/test-helpers/tdd-helpers';
import type { Business } from '@/lib/db/schema';

// Mock dependencies
vi.mock('@/lib/db/queries', () => ({
  getBusinessById: vi.fn(),
  getLatestCrawlJob: vi.fn(),
}));

vi.mock('@/lib/utils/dto-logger', () => ({
  dtoLogger: {
    logFieldExtraction: vi.fn(),
    logTransformation: vi.fn(),
  },
}));

describe('🔴 RED: Business DTO - Missing Functionality Specification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * SPECIFICATION 1: toBusinessDetailDTO - MUST Transform Business to DTO
   * 
   * CORRECT BEHAVIOR: toBusinessDetailDTO() MUST transform a Business domain
   * object to a BusinessDetailDTO with proper field mapping.
   * 
   * This test WILL FAIL until implementation is added.
   */
  it('MUST transform Business to BusinessDetailDTO with correct fields', async () => {
    // Arrange: Business with all fields
    const business = BusinessTestFactory.create({
      id: 1,
      name: 'Test Business',
      url: 'https://example.com',
      status: 'crawled',
      createdAt: new Date('2024-01-01'),
    });

    // Act: Transform to DTO (TEST DRIVES IMPLEMENTATION)
    const { toBusinessDetailDTO } = await import('../business-dto');
    const dto = await toBusinessDetailDTO(business);

    // Assert: SPECIFICATION - MUST have correct fields
    expect(dto.id).toBe(1);
    expect(dto.name).toBe('Test Business');
    expect(dto.url).toBe('https://example.com');
    expect(dto.status).toBe('crawled');
  });

  /**
   * SPECIFICATION 2: toBusinessDetailDTO - MUST Convert Dates to ISO Strings
   * 
   * CORRECT BEHAVIOR: toBusinessDetailDTO() MUST convert Date objects to
   * ISO string format for JSON serialization.
   * 
   * This test WILL FAIL until implementation is added.
   */
  it('MUST convert Date objects to ISO strings', async () => {
    // Arrange: Business with Date fields
    const createdAt = new Date('2024-01-01T00:00:00Z');
    const updatedAt = new Date('2024-01-02T00:00:00Z');
    const business = BusinessTestFactory.create({
      id: 1,
      createdAt,
      updatedAt,
    });

    // Act: Transform to DTO (TEST DRIVES IMPLEMENTATION)
    const { toBusinessDetailDTO } = await import('../business-dto');
    const dto = await toBusinessDetailDTO(business);

    // Assert: SPECIFICATION - MUST be ISO strings
    expect(dto.createdAt).toBe(createdAt.toISOString());
    expect(dto.updatedAt).toBe(updatedAt.toISOString());
  });

  /**
   * SPECIFICATION 3: toBusinessDetailDTO - MUST Filter Success Messages from errorMessage
   * 
   * CORRECT BEHAVIOR: toBusinessDetailDTO() MUST filter out success/status messages
   * from errorMessage, only including actual errors.
   * 
   * This test WILL FAIL until implementation is added.
   */
  it('MUST filter out success messages from errorMessage', async () => {
    // Arrange: Crawl job with success message in errorMessage
    const business = BusinessTestFactory.create({ id: 1 });
    const latestCrawlJob = {
      errorMessage: 'Crawl completed successfully',
    };

    // Act: Transform to DTO (TEST DRIVES IMPLEMENTATION)
    const { toBusinessDetailDTO } = await import('../business-dto');
    const dto = await toBusinessDetailDTO(business, latestCrawlJob);

    // Assert: SPECIFICATION - MUST filter out success messages
    expect(dto.errorMessage).toBeNull();
  });

  /**
   * SPECIFICATION 4: getBusinessDetailDTO - MUST Return Null if Business Not Found
   * 
   * CORRECT BEHAVIOR: getBusinessDetailDTO() MUST return null when business
   * doesn't exist.
   * 
   * This test WILL FAIL until implementation is added.
   */
  it('MUST return null if business not found', async () => {
    // Arrange: Business not found
    const queries = await import('@/lib/db/queries');
    vi.mocked(queries.getBusinessById).mockResolvedValue(null);

    // Act: Get DTO (TEST DRIVES IMPLEMENTATION)
    const { getBusinessDetailDTO } = await import('../business-dto');
    const dto = await getBusinessDetailDTO(999);

    // Assert: SPECIFICATION - MUST return null
    expect(dto).toBeNull();
  });

  /**
   * SPECIFICATION 5: getBusinessDetailDTO - MUST Fetch Latest Crawl Job
   * 
   * CORRECT BEHAVIOR: getBusinessDetailDTO() MUST fetch the latest crawl job
   * to get errorMessage.
   * 
   * This test WILL FAIL until implementation is added.
   */
  it('MUST fetch latest crawl job for errorMessage', async () => {
    // Arrange: Business with crawl job
    const business = BusinessTestFactory.create({ id: 1 });
    const latestCrawlJob = {
      errorMessage: 'Actual error message',
    };

    const queries = await import('@/lib/db/queries');
    vi.mocked(queries.getBusinessById).mockResolvedValue(business);
    vi.mocked(queries.getLatestCrawlJob).mockResolvedValue(latestCrawlJob as any);

    // Act: Get DTO (TEST DRIVES IMPLEMENTATION)
    const { getBusinessDetailDTO } = await import('../business-dto');
    await getBusinessDetailDTO(1);

    // Assert: SPECIFICATION - MUST fetch latest crawl job
    expect(queries.getLatestCrawlJob).toHaveBeenCalledWith(1);
  });

  /**
   * SPECIFICATION 6: toBusinessDetailDTOs - MUST Transform Multiple Businesses
   * 
   * CORRECT BEHAVIOR: toBusinessDetailDTOs() MUST transform an array of
   * businesses to DTOs.
   * 
   * This test WILL FAIL until implementation is added.
   */
  it('MUST transform multiple businesses to DTOs', async () => {
    // Arrange: Multiple businesses
    const businesses = [
      BusinessTestFactory.create({ id: 1, name: 'Business 1' }),
      BusinessTestFactory.create({ id: 2, name: 'Business 2' }),
      BusinessTestFactory.create({ id: 3, name: 'Business 3' }),
    ];

    // Act: Transform to DTOs (TEST DRIVES IMPLEMENTATION)
    const { toBusinessDetailDTOs } = await import('../business-dto');
    const dtos = await toBusinessDetailDTOs(businesses);

    // Assert: SPECIFICATION - MUST transform all businesses
    expect(dtos).toHaveLength(3);
    expect(dtos[0].id).toBe(1);
    expect(dtos[1].id).toBe(2);
    expect(dtos[2].id).toBe(3);
  });
});




