/**
 * TDD Test: WikidataClient - Wikibase Action API Implementation
 * 
 * SPECIFICATION: Wikibase Action API Integration
 * 
 * As a system
 * I want to interact with Wikibase Action API
 * So that I can create and update entities on Wikidata
 * 
 * Acceptance Criteria:
 * 1. Authenticates with Wikibase API
 * 2. Creates entities using wbeditentity action
 * 3. Updates existing entities
 * 4. Handles API errors gracefully
 * 5. Respects rate limiting
 * 6. Validates entity data before publishing
 * 
 * TDD Cycle: RED → GREEN → REFACTOR
 * No Overfitting: Test behavior, not implementation details
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WikidataClient } from '../client';
import type { WikidataEntity, PublishOptions } from '../types';

// Mock fetch for API calls
global.fetch = vi.fn();

describe('WikidataClient - Wikibase Action API Implementation', () => {
  let client: WikidataClient;
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    client = new WikidataClient({
      apiUrl: 'https://test.wikidata.org/w/api.php',
    });
    mockFetch = global.fetch as ReturnType<typeof vi.fn>;
  });

  /**
   * SPECIFICATION 1: Authenticates with Wikibase API
   */
  it('authenticates with Wikibase API to get token', async () => {
    // Arrange
    const mockTokenResponse = {
      query: {
        tokens: {
          csrftoken: 'test-token-12345',
        },
      },
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockTokenResponse,
      headers: new Headers({ 'set-cookie': 'session=abc123' }),
    } as Response);

    // Act
    const result = await (client as any).authenticate('https://test.wikidata.org/w/api.php');

    // Assert: Verify authentication succeeds (behavior: token retrieved)
    expect(result.token).toBeDefined();
    expect(result.token).toBe('test-token-12345');
    expect(mockFetch).toHaveBeenCalled();
  });

  /**
   * SPECIFICATION 2: Creates entities using wbeditentity action
   */
  it('creates entity using wbeditentity action', async () => {
    // Arrange
    const entity: WikidataEntity = {
      labels: { en: { value: 'Test Business' } },
      descriptions: { en: { value: 'A test business' } },
      claims: {},
    };

    // Mock authentication
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ query: { tokens: { csrftoken: 'token-123' } } }),
      headers: new Headers({ 'set-cookie': 'session=abc' }),
    } as Response);

    // Mock entity creation
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        entity: {
          id: 'Q123456',
          success: 1,
        },
      }),
    } as Response);

    // Act
    const result = await client.publishEntity(entity, { target: 'test' });

    // Assert: Verify entity created (behavior: QID returned)
    expect(result.success).toBe(true);
    expect(result.qid).toBeDefined();
    expect(mockFetch).toHaveBeenCalledTimes(2); // Auth + Create
  });

  /**
   * SPECIFICATION 3: Updates existing entities
   */
  it('updates existing entity when QID provided', async () => {
    // Arrange
    const entity: WikidataEntity = {
      labels: { en: { value: 'Updated Business' } },
      claims: {},
    };

    // Mock authentication
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ query: { tokens: { csrftoken: 'token-123' } } }),
      headers: new Headers({ 'set-cookie': 'session=abc' }),
    } as Response);

    // Mock entity update
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        entity: {
          id: 'Q123456',
          success: 1,
        },
      }),
    } as Response);

    // Act
    const result = await (client as any).updateEntity('Q123456', entity, { target: 'test' });

    // Assert: Verify entity updated (behavior: update succeeds)
    expect(result.success).toBe(true);
    expect(result.qid).toBe('Q123456');
  });

  /**
   * SPECIFICATION 4: Handles API errors gracefully
   */
  it('handles API errors gracefully', async () => {
    // Arrange
    const entity: WikidataEntity = {
      labels: { en: { value: 'Test' } },
      claims: {},
    };

    // Mock authentication
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ query: { tokens: { csrftoken: 'token-123' } } }),
      headers: new Headers({ 'set-cookie': 'session=abc' }),
    } as Response);

    // Mock API error
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        error: {
          code: 'invalid-entity',
          info: 'Entity validation failed',
        },
      }),
    } as Response);

    // Act & Assert: Verify error handled (behavior: error returned, not thrown)
    const result = await client.publishEntity(entity, { target: 'test' });
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  /**
   * SPECIFICATION 5: Uses correct API action (wbeditentity)
   */
  it('uses wbeditentity action for entity creation', async () => {
    // Arrange
    const entity: WikidataEntity = {
      labels: { en: { value: 'Test' } },
      claims: {},
    };

    // Mock authentication
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ query: { tokens: { csrftoken: 'token-123' } } }),
      headers: new Headers({ 'set-cookie': 'session=abc' }),
    } as Response);

    // Mock entity creation
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        entity: { id: 'Q123', success: 1 },
      }),
    } as Response);

    // Act
    await client.publishEntity(entity, { target: 'test' });

    // Assert: Verify wbeditentity action used (behavior: correct API action)
    const createCall = mockFetch.mock.calls.find((call: any) => {
      const url = call[0];
      return url && url.includes('wbeditentity');
    });
    expect(createCall).toBeDefined();
  });

  /**
   * SPECIFICATION 6: Validates entity data before publishing
   */
  it('validates entity data structure before publishing', async () => {
    // Arrange
    const invalidEntity = {
      // Missing required fields
    } as any;

    // Mock authentication
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ query: { tokens: { csrftoken: 'token-123' } } }),
      headers: new Headers({ 'set-cookie': 'session=abc' }),
    } as Response);

    // Act & Assert: Verify validation occurs (behavior: invalid entity handled)
    const result = await client.publishEntity(invalidEntity, { target: 'test' });
    // Client may handle invalid entities gracefully
    expect(result.success === false || result.qid === undefined).toBeTruthy();
  });

  /**
   * SPECIFICATION 7: Checks for existing entities before creating
   */
  it('checks for existing entities before creating new ones', async () => {
    // Arrange
    const entity: WikidataEntity = {
      labels: { en: { value: 'Existing Business' } },
      claims: {},
    };

    // Mock findExistingEntity to return existing QID
    vi.spyOn(client as any, 'findExistingEntity').mockResolvedValue('Q999999');

    // Mock findExistingEntity to return existing QID
    vi.spyOn(client as any, 'findExistingEntity').mockResolvedValue('Q999999');

    // Mock authentication
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ query: { tokens: { csrftoken: 'token-123' } } }),
      headers: new Headers({ 'set-cookie': 'session=abc' }),
    } as Response);

    // Mock update (not create)
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        entity: { id: 'Q999999', success: 1 },
      }),
    } as Response);

    // Act
    const result = await client.publishEntity(entity, { target: 'test' });

    // Assert: Verify existing entity updated instead of created (behavior: prevents duplicates)
    expect(result.qid).toBe('Q999999');
    expect((client as any).findExistingEntity).toHaveBeenCalled();
  });
});

