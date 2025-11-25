/**
 * TDD Test: Wikidata Client - Tests Drive Implementation
 * 
 * SPECIFICATION: Publish Entities to Wikidata API
 * 
 * As a system
 * I want to publish entities to Wikidata via Action API
 * So that businesses appear in Wikidata
 * 
 * Acceptance Criteria:
 * 1. Publishes entity to test.wikidata.org by default
 * 2. Validates entity before publishing
 * 3. Handles authentication
 * 4. Returns QID after successful publication
 * 5. Handles errors gracefully
 * 6. Supports dry run mode
 * 
 * TDD Cycle: RED → GREEN → REFACTOR
 * Tests written FIRST to drive implementation
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { WikidataEntity, PublishOptions } from '../types';

// Mock fetch for API calls
global.fetch = vi.fn();

describe('🔴 RED: Wikidata Client Specification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset environment - set to 'real' to test actual behavior
    process.env.WIKIDATA_PUBLISH_MODE = 'real';
    delete process.env.WIKIDATA_ALLOW_PRODUCTION;
  });

  /**
   * SPECIFICATION 1: Publish to Test by Default
   * 
   * Given: Entity ready to publish
   * When: Publish is called without target
   * Then: Entity is published to test.wikidata.org
   */
  it('publishes entity to test.wikidata.org by default', async () => {
    // Arrange: Entity with valid claims (GREEN: Fix test data to satisfy validation requirements)
    // Test specification: "publishes successfully" - entity must be valid
    const entity: WikidataEntity = {
      labels: { en: { language: 'en', value: 'Test Business' } },
      descriptions: { en: { language: 'en', value: 'A test business' } },
      claims: {
        P31: [{
          mainsnak: {
            snaktype: 'value',
            property: 'P31',
            datavalue: {
              value: { 'entity-type': 'item', id: 'Q4830453' },
              type: 'wikibase-entityid',
            },
          },
          type: 'statement',
        }],
      },
    };

    // Mock successful API response (GREEN: Mock must match Wikidata API response structure)
    // Code flow: login token → login → CSRF token → publish
    vi.mocked(fetch)
      // 1. Mock login token request
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ query: { tokens: { logintoken: 'test-login-token' } } }),
        headers: new Headers({ 'set-cookie': 'token-cookie=test' }),
      } as Response)
      // 2. Mock login request
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ login: { result: 'Success' } }),
        headers: new Headers({ 'set-cookie': 'session=test' }),
      } as Response)
      // 3. Mock CSRF token request
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ query: { tokens: { csrftoken: 'test-token' } } }),
      } as Response)
      // 4. Mock publish request (Wikidata API format)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          entity: {
            id: 'Q12345',
            claims: entity.claims,
          },
          success: 1,
        }),
      } as Response);

    // Act: Publish entity (TEST DRIVES IMPLEMENTATION)
    const { WikidataClient } = await import('../client');
    const client = new WikidataClient();
    const result = await client.publishEntity(entity);

    // Assert: Published to test (behavior: safe default)
    // TEST SPECIFICATION: When publishing succeeds, result MUST have success=true and publishedTo='test.wikidata.org'
    expect(result).toBeDefined();
    expect(result.success).toBe(true);
    expect(result.publishedTo).toBe('test.wikidata.org');
    expect(result.qid).toBeDefined();
  });

  /**
   * SPECIFICATION 2: Validate Entity Before Publishing
   * 
   * Given: Invalid entity
   * When: Publish is attempted
   * Then: Validation error is returned in result
   */
  it('validates entity before publishing', async () => {
    // Arrange: Invalid entity (missing required fields)
    const invalidEntity = {
      labels: {},
      descriptions: {},
      claims: {},
    } as WikidataEntity;

    // Act: Attempt publish (TEST DRIVES IMPLEMENTATION)
    const { WikidataClient } = await import('../client');
    const client = new WikidataClient({ validateEntities: true });
    const result = await client.publishEntity(invalidEntity);
    
    // Assert: Validation error returned (behavior: invalid entities are rejected)
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.error).toMatch(/label|validation/i);
  });

  /**
   * SPECIFICATION 3: Return QID After Publication
   * 
   * Given: Valid entity
   * When: Publication succeeds
   * Then: QID is returned in result
   */
  it('returns QID after successful publication', async () => {
    // Arrange: Valid entity with required claims (GREEN: Fix test data to satisfy validation)
    const entity: WikidataEntity = {
      labels: { en: { language: 'en', value: 'Test Business' } },
      descriptions: { en: { language: 'en', value: 'A test business' } },
      claims: {
        P31: [{
          mainsnak: {
            snaktype: 'value',
            property: 'P31',
            datavalue: {
              value: { 'entity-type': 'item', id: 'Q4830453' },
              type: 'wikibase-entityid',
            },
          },
          type: 'statement',
        }],
      },
    };

    const mockQid = 'Q12345';
    // Mock API responses (GREEN: Must mock all fetch calls in correct order)
    vi.mocked(fetch)
      // 1. Login token
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ query: { tokens: { logintoken: 'test-login-token' } } }),
        headers: new Headers({ 'set-cookie': 'token-cookie=test' }),
      } as Response)
      // 2. Login
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ login: { result: 'Success' } }),
        headers: new Headers({ 'set-cookie': 'session=test' }),
      } as Response)
      // 3. CSRF token
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ query: { tokens: { csrftoken: 'test-token' } } }),
      } as Response)
      // 4. Publish
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          entity: { id: mockQid, claims: entity.claims },
          success: 1,
        }),
      } as Response);

    // Act: Publish entity (TEST DRIVES IMPLEMENTATION)
    const { WikidataClient } = await import('../client');
    const client = new WikidataClient();
    const result = await client.publishEntity(entity);

    // Assert: QID returned (behavior: entity is linked)
    // TEST SPECIFICATION: When publication succeeds, result MUST have success=true and qid matching the returned QID
    expect(result.success).toBe(true);
    expect(result.qid).toBe(mockQid);
  });

  /**
   * SPECIFICATION 4: Handle Errors Gracefully
   * 
   * Given: API error occurs
   * When: Publish is attempted
   * Then: Error is caught and returned in result
   */
  it('handles API errors gracefully', async () => {
    // Arrange: Valid entity that causes API error (GREEN: Entity must pass validation first)
    const entity: WikidataEntity = {
      labels: { en: { language: 'en', value: 'Test Business' } },
      descriptions: { en: { language: 'en', value: 'A test business' } },
      claims: {
        P31: [{
          mainsnak: {
            snaktype: 'value',
            property: 'P31',
            datavalue: {
              value: { 'entity-type': 'item', id: 'Q4830453' },
              type: 'wikibase-entityid',
            },
          },
          type: 'statement',
        }],
      },
    };

    // Mock API error
    vi.mocked(fetch).mockRejectedValueOnce(new Error('API Error'));

    // Act: Publish entity (TEST DRIVES IMPLEMENTATION)
    const { WikidataClient } = await import('../client');
    const client = new WikidataClient();
    const result = await client.publishEntity(entity);

    // Assert: Error handled (behavior: doesn't crash, returns error)
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  /**
   * SPECIFICATION 5: Support Dry Run Mode
   * 
   * Given: Entity with dry run option
   * When: Publish is called
   * Then: Entity is validated but not published
   */
  it('supports dry run mode', async () => {
    // Arrange: Valid entity with dry run (GREEN: Entity must pass validation)
    const entity: WikidataEntity = {
      labels: { en: { language: 'en', value: 'Test Business' } },
      descriptions: { en: { language: 'en', value: 'A test business' } },
      claims: {
        P31: [{
          mainsnak: {
            snaktype: 'value',
            property: 'P31',
            datavalue: {
              value: { 'entity-type': 'item', id: 'Q4830453' },
              type: 'wikibase-entityid',
            },
          },
          type: 'statement',
        }],
      },
    };
    const options: PublishOptions = {
      target: 'test',
      dryRun: true,
    };

    // Act: Publish with dry run (TEST DRIVES IMPLEMENTATION)
    const { WikidataClient } = await import('../client');
    const client = new WikidataClient();
    const result = await client.publishEntity(entity, options);

    // Assert: Dry run completed (behavior: validation without publishing)
    // TEST SPECIFICATION: When dry run is used, result MUST have success=true and no actual API call
    expect(result).toBeDefined();
    expect(result.success).toBe(true);
    expect(result.qid).toBeDefined();
    // Should not make actual API call in dry run mode
    expect(vi.mocked(fetch)).not.toHaveBeenCalled();
  });

  /**
   * SPECIFICATION 6: Block Production by Default
   * 
   * Given: Entity with production target
   * When: Production not explicitly allowed
   * Then: Falls back to test.wikidata.org
   */
  it('blocks production publishing by default', async () => {
    // Arrange: Valid entity with production target (GREEN: Entity must pass validation)
    const entity: WikidataEntity = {
      labels: { en: { language: 'en', value: 'Test Business' } },
      descriptions: { en: { language: 'en', value: 'A test business' } },
      claims: {
        P31: [{
          mainsnak: {
            snaktype: 'value',
            property: 'P31',
            datavalue: {
              value: { 'entity-type': 'item', id: 'Q4830453' },
              type: 'wikibase-entityid',
            },
          },
          type: 'statement',
        }],
      },
    };
    const options: PublishOptions = {
      target: 'production',
    };

    // Mock API responses (GREEN: Must mock all fetch calls in correct order)
    vi.mocked(fetch)
      // 1. Login token
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ query: { tokens: { logintoken: 'test-login-token' } } }),
        headers: new Headers({ 'set-cookie': 'token-cookie=test' }),
      } as Response)
      // 2. Login
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ login: { result: 'Success' } }),
        headers: new Headers({ 'set-cookie': 'session=test' }),
      } as Response)
      // 3. CSRF token
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ query: { tokens: { csrftoken: 'test-token' } } }),
      } as Response)
      // 4. Publish
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          entity: { id: 'Q12345', claims: entity.claims },
          success: 1,
        }),
      } as Response);

    // Act: Publish to production (TEST DRIVES IMPLEMENTATION)
    const { WikidataClient } = await import('../client');
    const client = new WikidataClient();
    const result = await client.publishEntity(entity, options);

    // Assert: Falls back to test (behavior: safety first)
    expect(result.publishedTo).toBe('test.wikidata.org');
    // Production is blocked by default, should use test.wikidata.org
  });
});

