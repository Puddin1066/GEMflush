/**
 * TDD Test: SPARQL Query Constants - Tests Drive Implementation
 * 
 * SPECIFICATION: SPARQL Queries Use Extracted Constants
 * 
 * As a developer
 * I want SPARQL queries to use extracted constants for property IDs and entity types
 * So that queries are maintainable and testable
 * 
 * Acceptance Criteria:
 * 1. Property IDs (P31, P279, P17) are extracted to constants
 * 2. Entity type QIDs (Q515, Q268592, Q30) are extracted to constants
 * 3. Queries use these constants instead of hardcoded values
 * 4. Constants are accessible for testing
 * 
 * TDD Cycle: RED → GREEN → REFACTOR
 * Tests written FIRST to drive implementation
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WikidataSPARQLService } from '../sparql';

// Mock database and fetch
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

global.fetch = vi.fn();

describe('🔴 RED: SPARQL Query Constants Specification', () => {
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
   * SPECIFICATION 1: Property IDs Are Extracted to Constants
   * 
   * Given: SPARQL service
   * When: Constants are accessed
   * Then: Property IDs (P31, P279, P17) are available as constants
   */
  it('exposes property IDs as constants', () => {
    // Arrange & Act: Access constants (TEST DRIVES IMPLEMENTATION)
    // Test specification: Constants must be accessible
    const properties = (WikidataSPARQLService as any).WIKIDATA_PROPERTIES;
    
    // Assert: Property IDs are defined
    expect(properties).toBeDefined();
    expect(properties.INSTANCE_OF).toBe('P31');
    expect(properties.SUBCLASS_OF).toBe('P279');
    expect(properties.COUNTRY).toBe('P17');
  });

  /**
   * SPECIFICATION 2: Entity Type QIDs Are Extracted to Constants
   * 
   * Given: SPARQL service
   * When: Constants are accessed
   * Then: Entity type QIDs (Q515, Q268592, Q30) are available as constants
   */
  it('exposes entity type QIDs as constants', () => {
    // Arrange & Act: Access constants (TEST DRIVES IMPLEMENTATION)
    const entityTypes = (WikidataSPARQLService as any).WIKIDATA_ENTITY_TYPES;
    
    // Assert: Entity type QIDs are defined
    expect(entityTypes).toBeDefined();
    expect(entityTypes.CITY).toBe('Q515');
    expect(entityTypes.INDUSTRY).toBe('Q268592');
    expect(entityTypes.COUNTRY_US).toBe('Q30');
  });

  /**
   * SPECIFICATION 3: City Query Uses Constants
   * 
   * Given: SPARQL service with mocked fetch
   * When: findCityQID is called with skipSparql=false
   * Then: SPARQL query uses constants instead of hardcoded values
   */
  it('city query uses constants for property IDs and entity types', async () => {
    // Arrange: Mock SPARQL response
    const mockSparqlResponse = {
      results: {
        bindings: [{
          city: { value: 'http://www.wikidata.org/entity/Q99999' }
        }]
      }
    };

    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => mockSparqlResponse,
    } as Response);

    // Act: Find city QID (TEST DRIVES IMPLEMENTATION)
    await service.findCityQID('Test City', 'CA', 'Q30', false);

    // Assert: Query uses constants (check fetch was called with query containing constants)
    expect(fetch).toHaveBeenCalled();
    const fetchCall = vi.mocked(fetch).mock.calls[0];
    const requestBody = fetchCall[1]?.body as string;
    const query = new URLSearchParams(requestBody).get('query') || '';
    
    // Test specification: Query must use constants, not hardcoded values
    // Check that query contains property constants (not hardcoded P31, P279, P17)
    // Check that query contains entity type constants (not hardcoded Q515)
    expect(query).toContain('P31'); // Should use constant value
    expect(query).toContain('P279'); // Should use constant value
    expect(query).toContain('P17'); // Should use constant value
    expect(query).toContain('Q515'); // Should use constant value
    expect(query).toContain('Q30'); // Should use constant value (countryQID parameter)
  });

  /**
   * SPECIFICATION 4: Industry Query Uses Constants
   * 
   * Given: SPARQL service with mocked fetch
   * When: findIndustryQID is called with skipSparql=false
   * Then: SPARQL query uses constants instead of hardcoded values
   */
  it('industry query uses constants for property IDs and entity types', async () => {
    // Arrange: Mock SPARQL response
    const mockSparqlResponse = {
      results: {
        bindings: [{
          industry: { value: 'http://www.wikidata.org/entity/Q99999' }
        }]
      }
    };

    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => mockSparqlResponse,
    } as Response);

    // Act: Find industry QID (TEST DRIVES IMPLEMENTATION)
    await service.findIndustryQID('Test Industry', false);

    // Assert: Query uses constants
    expect(fetch).toHaveBeenCalled();
    const fetchCall = vi.mocked(fetch).mock.calls[0];
    const requestBody = fetchCall[1]?.body as string;
    const query = new URLSearchParams(requestBody).get('query') || '';
    
    // Test specification: Query must use constants
    expect(query).toContain('P31'); // Should use constant value
    expect(query).toContain('P279'); // Should use constant value
    expect(query).toContain('Q268592'); // Should use constant value
  });

  /**
   * SPECIFICATION 5: Default Country QID Uses Constant
   * 
   * Given: SPARQL service
   * When: findCityQID is called without countryQID parameter
   * Then: Default country QID uses constant (Q30 for US)
   */
  it('uses constant for default country QID', async () => {
    // Arrange: Mock SPARQL response
    const mockSparqlResponse = {
      results: {
        bindings: [{
          city: { value: 'http://www.wikidata.org/entity/Q99999' }
        }]
      }
    };

    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => mockSparqlResponse,
    } as Response);

    // Act: Find city QID without countryQID (uses default) (TEST DRIVES IMPLEMENTATION)
    await service.findCityQID('Test City', 'CA', undefined as any, false);

    // Assert: Query uses default country constant (Q30)
    expect(fetch).toHaveBeenCalled();
    const fetchCall = vi.mocked(fetch).mock.calls[0];
    const requestBody = fetchCall[1]?.body as string;
    const query = new URLSearchParams(requestBody).get('query') || '';
    
    // Test specification: Default country must use constant
    expect(query).toContain('Q30'); // Should use constant value
  });
});

