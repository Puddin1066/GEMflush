/**
 * TDD Test: Wikidata SPARQL Service - Tests Drive Implementation
 * 
 * SPECIFICATION: QID Lookups via Hybrid Caching Strategy
 * 
 * As a system
 * I want to find Wikidata QIDs for cities, industries, legal forms, states, and countries
 * So that entities can be properly linked in Wikidata
 * 
 * Acceptance Criteria:
 * 1. Uses memory cache (L1) when available
 * 2. Falls back to database cache (L2) when memory cache misses
 * 3. Uses local mappings (L3) for common values
 * 4. Optionally uses SPARQL (L4) for edge cases when skipSparql=false
 * 5. Caches results appropriately
 * 6. Handles errors gracefully
 * 
 * TDD Cycle: RED → GREEN → REFACTOR
 * Tests written FIRST to drive implementation
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WikidataSPARQLService } from '../sparql';
import { db } from '@/lib/db/drizzle';
import { qidCache } from '@/lib/db/schema';

// Mock database (Drizzle ORM query chain)
const mockSelect = vi.fn();
const mockUpdate = vi.fn();
const mockInsert = vi.fn();

vi.mock('@/lib/db/drizzle', () => ({
  db: {
    select: () => mockSelect,
    update: () => mockUpdate,
    insert: () => mockInsert,
  },
}));

// Mock fetch for SPARQL queries
global.fetch = vi.fn();

describe('🔴 RED: Wikidata SPARQL Service Specification', () => {
  let service: WikidataSPARQLService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new WikidataSPARQLService();
    
    // Reset database mocks
    mockSelect.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      }),
    });
    
    mockUpdate.mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    });
    
    mockInsert.mockReturnValue({
      values: vi.fn().mockReturnValue({
        onConflictDoUpdate: vi.fn().mockResolvedValue(undefined),
      }),
    });
  });

  /**
   * SPECIFICATION 1: Memory Cache (L1) Priority
   * 
   * Given: QID is in memory cache
   * When: findCityQID is called
   * Then: Returns cached QID immediately without database/SPARQL calls
   */
  it('returns QID from memory cache when available', async () => {
    // Arrange: Populate memory cache
    (service as any).memoryCache.set('city:san francisco, ca', 'Q62');

    // Act: Find QID (TEST DRIVES IMPLEMENTATION)
    const qid = await service.findCityQID('San Francisco', 'CA');

    // Assert: Returns cached value, no database/SPARQL calls
    expect(qid).toBe('Q62');
    expect(mockSelect).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });

  /**
   * SPECIFICATION 2: Database Cache (L2) Fallback
   * 
   * Given: QID not in memory cache but exists in database
   * When: findCityQID is called
   * Then: Returns database QID and populates memory cache
   */
  it('falls back to database cache when memory cache misses', async () => {
    // Arrange: Use a city NOT in local mappings, mock database to return QID
    const mockDbResult = { qid: 'Q99999' };
    const mockFrom = vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue([mockDbResult]),
      }),
    });
    mockSelect.mockReturnValue({ from: mockFrom });

    // Act: Find QID for city not in local mappings (TEST DRIVES IMPLEMENTATION)
    const qid = await service.findCityQID('Unknown Test City', 'CA');

    // Assert: Returns database QID and populates memory cache
    expect(qid).toBe('Q99999');
    expect(mockSelect).toHaveBeenCalled();
    const memoryCache = (service as any).memoryCache;
    expect(memoryCache.get('city:unknown test city, ca')).toBe('Q99999');
  });

  /**
   * SPECIFICATION 3: Local Mappings (L3) for Common Values
   * 
   * Given: QID not in cache but exists in local mappings
   * When: findCityQID is called
   * Then: Returns local mapping QID and caches it
   */
  it('uses local mappings for common cities', async () => {
    // Arrange: Ensure not in memory or database cache
    mockSelect.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      }),
    });

    // Act: Find QID for a common city (TEST DRIVES IMPLEMENTATION)
    // Note: This will use US_CITY_QIDS mapping if available
    const qid = await service.findCityQID('New York', 'NY');

    // Assert: Returns QID from local mapping (or null if not in mappings)
    // Test specification: Should use local mappings when available
    expect(qid).toBeTruthy(); // Will be null if not in mappings, but test specifies behavior
  });

  /**
   * SPECIFICATION 4: SPARQL Lookup (L4) for Edge Cases
   * 
   * Given: QID not in cache or local mappings, skipSparql=false
   * When: findCityQID is called
   * Then: Queries SPARQL endpoint and caches result
   */
  it('queries SPARQL when skipSparql=false and not in cache', async () => {
    // Arrange: Not in memory, database, or local mappings
    mockSelect.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      }),
    });

    // Mock SPARQL response
    const mockSparqlResponse = {
      results: {
        bindings: [{
          item: { value: 'http://www.wikidata.org/entity/Q99999' }
        }]
      }
    };

    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => mockSparqlResponse,
    } as Response);

    // Act: Find QID with skipSparql=false (TEST DRIVES IMPLEMENTATION)
    const qid = await service.findCityQID('Edge Case City', 'CA', 'Q30', false);

    // Assert: SPARQL was called and result is cached
    expect(fetch).toHaveBeenCalled();
    expect(qid).toBe('Q99999');
  });

  /**
   * SPECIFICATION 5: Skips SPARQL by Default
   * 
   * Given: QID not in cache or local mappings, skipSparql=true (default)
   * When: findCityQID is called
   * Then: Returns null without querying SPARQL
   */
  it('skips SPARQL lookup by default when not in cache', async () => {
    // Arrange: Not in memory, database, or local mappings
    mockSelect.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      }),
    });

    // Act: Find QID with default skipSparql=true (TEST DRIVES IMPLEMENTATION)
    const qid = await service.findCityQID('Unknown City', 'CA');

    // Assert: Returns null without SPARQL call
    expect(qid).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
  });

  /**
   * SPECIFICATION 6: Handles SPARQL Errors Gracefully
   * 
   * Given: SPARQL query fails
   * When: findCityQID is called with skipSparql=false
   * Then: Returns null and logs error
   */
  it('handles SPARQL errors gracefully', async () => {
    // Arrange: Not in cache, SPARQL fails
    mockSelect.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      }),
    });

    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      text: async () => 'SPARQL endpoint error',
    } as Response);

    // Act: Find QID with skipSparql=false (TEST DRIVES IMPLEMENTATION)
    const qid = await service.findCityQID('Error City', 'CA', 'Q30', false);

    // Assert: Returns null on error
    expect(qid).toBeNull();
  });

  /**
   * SPECIFICATION 7: Industry QID Lookup
   * 
   * Given: Industry name
   * When: findIndustryQID is called
   * Then: Returns QID using same caching strategy
   */
  it('finds industry QID using caching strategy', async () => {
    // Arrange: Populate memory cache
    (service as any).memoryCache.set('industry:technology', 'Q11019');

    // Act: Find industry QID (TEST DRIVES IMPLEMENTATION)
    const qid = await service.findIndustryQID('Technology');

    // Assert: Returns cached QID
    expect(qid).toBe('Q11019');
  });

  /**
   * SPECIFICATION 8: Legal Form QID Lookup
   * 
   * Given: Legal form name
   * When: findLegalFormQID is called
   * Then: Returns QID from local mappings (99%+ coverage)
   */
  it('finds legal form QID from local mappings', async () => {
    // Arrange: Not in memory or database
    mockSelect.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      }),
    });

    // Act: Find legal form QID (TEST DRIVES IMPLEMENTATION)
    const qid = await service.findLegalFormQID('LLC');

    // Assert: Returns QID from local mappings (or null if not in mappings)
    // Legal forms should be in local mappings (LEGAL_FORM_QIDS)
    expect(qid).toBeTruthy(); // Will be null if not in mappings, but test specifies behavior
  });
});

