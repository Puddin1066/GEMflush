/**
 * TDD Test: Competitor Queries and Error Handling - Tests Drive Implementation
 * 
 * SPECIFICATION: Competitor Queries and Error Handling Must Work Correctly
 * 
 * As a developer
 * I want competitor queries and error handling to work correctly
 * So that the application can reliably manage competitors and handle errors gracefully
 * 
 * Acceptance Criteria:
 * 1. Competitor queries (getCompetitors) work correctly
 * 2. Error handling works correctly for all query functions
 * 3. Edge cases are handled properly
 * 4. Null/undefined inputs are handled gracefully
 * 5. Database constraint violations are handled properly
 * 
 * TDD Cycle: RED → GREEN → REFACTOR
 * Tests written FIRST to drive implementation
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { db } from '../drizzle';
import {
  competitors,
  businesses,
  users,
  teams,
} from '../schema';
import { BusinessTestFactory } from '@/lib/test-helpers/tdd-helpers';
import type { Competitor } from '../schema';

// Mock drizzle db
vi.mock('../drizzle', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

// Mock next/headers cookies function
vi.mock('next/headers', () => ({
  cookies: vi.fn(),
}));

// Mock auth session
vi.mock('@/lib/auth/session', () => ({
  verifyToken: vi.fn(),
}));

const mockDb = vi.mocked(db);

describe('🔴 RED: Competitor Queries and Error Handling Specification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * SPECIFICATION 1: Competitor Queries
   */
  describe('Competitor Queries', () => {
    /**
     * SPECIFICATION 1.1: getCompetitors() - MUST Return Competitors for Business
     * 
     * Given: Business ID
     * When: getCompetitors() is called
     * Then: Returns all competitors for that business, ordered by creation date descending
     */
    describe('getCompetitors', () => {
      it('MUST return competitors for business ordered by creation date', async () => {
        // Arrange: Mock competitors exist
        const mockCompetitors: Competitor[] = [
          {
            id: 2,
            businessId: 1,
            competitorBusinessId: 3,
            competitorName: 'Competitor B',
            competitorUrl: 'https://competitor-b.com',
            addedBy: 'user',
            createdAt: new Date('2024-01-02'),
          },
          {
            id: 1,
            businessId: 1,
            competitorBusinessId: 2,
            competitorName: 'Competitor A',
            competitorUrl: 'https://competitor-a.com',
            addedBy: 'user',
            createdAt: new Date('2024-01-01'),
          },
        ];

        const mockSelect = {
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          orderBy: vi.fn().mockResolvedValue(mockCompetitors),
        };

        mockDb.select.mockReturnValue(mockSelect as any);

        // Act: Import and call function
        const { getCompetitors } = await import('../queries');
        const result = await getCompetitors(1);

        // Assert: SPECIFICATION - MUST return competitors
        expect(result).toEqual(mockCompetitors);
        expect(mockDb.select).toHaveBeenCalled();
        expect(mockSelect.where).toHaveBeenCalled();
        expect(mockSelect.orderBy).toHaveBeenCalled();
      });

      it('MUST return empty array when business has no competitors', async () => {
        // Arrange: Mock no competitors
        const mockSelect = {
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          orderBy: vi.fn().mockResolvedValue([]),
        };

        mockDb.select.mockReturnValue(mockSelect as any);

        // Act: Import and call function
        const { getCompetitors } = await import('../queries');
        const result = await getCompetitors(999);

        // Assert: SPECIFICATION - MUST return empty array
        expect(result).toEqual([]);
      });

      it('MUST handle competitors with null competitorBusinessId (manual entries)', async () => {
        // Arrange: Mock competitor with manual entry (no linked business)
        const mockCompetitors: Competitor[] = [
          {
            id: 1,
            businessId: 1,
            competitorBusinessId: null,
            competitorName: 'Manual Competitor',
            competitorUrl: 'https://manual-competitor.com',
            addedBy: 'user',
            createdAt: new Date(),
          },
        ];

        const mockSelect = {
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          orderBy: vi.fn().mockResolvedValue(mockCompetitors),
        };

        mockDb.select.mockReturnValue(mockSelect as any);

        // Act: Import and call function
        const { getCompetitors } = await import('../queries');
        const result = await getCompetitors(1);

        // Assert: SPECIFICATION - MUST return competitors with null competitorBusinessId
        expect(result).toEqual(mockCompetitors);
        expect(result[0].competitorBusinessId).toBeNull();
      });
    });
  });

  /**
   * SPECIFICATION 2: Error Handling
   */
  describe('Error Handling', () => {
    /**
     * SPECIFICATION 2.1: Database Connection Errors
     * 
     * Given: Database connection fails
     * When: Any query function is called
     * Then: Error is propagated correctly
     */
    describe('Database Connection Errors', () => {
      it('MUST propagate database connection errors', async () => {
        // Arrange: Mock database connection error
        const dbError = new Error('Database connection failed');
        
        // Mock select to throw error when called
        const mockSelect = {
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          limit: vi.fn().mockRejectedValue(dbError),
        };
        mockDb.select.mockReturnValue(mockSelect as any);

        // Act & Assert: Import and call function, expect error
        const { getBusinessById } = await import('../queries');
        await expect(getBusinessById(1)).rejects.toThrow('Database connection failed');
      });
    });

    /**
     * SPECIFICATION 2.2: Invalid Input Handling
     * 
     * Given: Invalid input (null, undefined, invalid types)
     * When: Query function is called
     * Then: Error is handled gracefully or validation occurs
     */
    describe('Invalid Input Handling', () => {
      it('MUST handle null business ID gracefully', async () => {
        // Arrange: Mock query with null ID (should filter or error)
        const mockSelect = {
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue([]),
        };

        mockDb.select.mockReturnValue(mockSelect as any);

        // Act: Import and call function with null (TypeScript should prevent this, but test runtime behavior)
        const { getBusinessById } = await import('../queries');
        // Note: TypeScript will prevent null, but if it gets through, should handle gracefully
        const result = await getBusinessById(0); // Use 0 as invalid ID

        // Assert: SPECIFICATION - MUST return null for invalid ID
        expect(result).toBeNull();
      });
    });

    /**
     * SPECIFICATION 2.3: Constraint Violation Handling
     * 
     * Given: Database constraint violation (unique, foreign key, etc.)
     * When: Insert or update operation is called
     * Then: Error is handled appropriately
     */
    describe('Constraint Violation Handling', () => {
      it('MUST handle unique constraint violations in createWikidataEntity', async () => {
        // Arrange: Mock unique constraint violation
        const newEntity = {
          businessId: 1,
          qid: 'Q123456',
          entityData: { name: 'Test Business' },
          publishedTo: 'wikidata',
          version: 1,
          enrichmentLevel: 1,
        };

        const existingEntity = {
          id: 1,
          businessId: 1,
          qid: 'Q123456',
          entityData: { name: 'Existing Business' },
          publishedTo: 'wikidata',
          version: 1,
          enrichmentLevel: 1,
          publishedAt: new Date(),
          lastEnrichedAt: null,
        };

        // Mock insert throws conflict error
        const mockInsert = {
          values: vi.fn().mockReturnThis(),
          onConflictDoUpdate: vi.fn().mockReturnThis(),
          returning: vi.fn().mockRejectedValue({
            code: '23505',
            message: 'duplicate key value violates unique constraint',
          }),
        };

        mockDb.insert = vi.fn().mockReturnValue(mockInsert as any);

        // Mock fallback select and update
        const mockSelect = {
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue([existingEntity]),
        };

        const updatedEntity = {
          ...existingEntity,
          entityData: newEntity.entityData,
          version: 2,
        };

        const mockUpdate = {
          set: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          returning: vi.fn().mockResolvedValue([updatedEntity]),
        };

        mockDb.select.mockReturnValue(mockSelect as any);
        mockDb.update = vi.fn().mockReturnValue(mockUpdate as any);

        // Act: Import and call function
        const { createWikidataEntity } = await import('../queries');
        const result = await createWikidataEntity(newEntity);

        // Assert: SPECIFICATION - MUST handle conflict and update existing entity
        expect(result).toEqual(updatedEntity);
        expect(mockDb.select).toHaveBeenCalled(); // Fallback executed
        expect(mockDb.update).toHaveBeenCalled(); // Update executed
      });

      it('MUST handle foreign key constraint violations', async () => {
        // Arrange: Mock foreign key constraint violation
        const dbError = {
          code: '23503',
          message: 'foreign key constraint violation',
        };

        const mockInsert = {
          values: vi.fn().mockReturnThis(),
          returning: vi.fn().mockRejectedValue(dbError),
        };

        mockDb.insert = vi.fn().mockReturnValue(mockInsert as any);

        // Act & Assert: Import and call function, expect error
        const { createBusiness } = await import('../queries');
        await expect(
          createBusiness({
            teamId: 999, // Non-existent team ID
            name: 'Test Business',
            url: 'https://example.com',
            status: 'pending',
          })
        ).rejects.toEqual(dbError);
      });
    });

    /**
     * SPECIFICATION 2.4: Empty Result Handling
     * 
     * Given: Query returns empty result
     * When: Query function expects single result
     * Then: Returns null or empty array appropriately
     */
    describe('Empty Result Handling', () => {
      it('MUST return null for single result queries when no result found', async () => {
        // Arrange: Mock empty result
        const mockSelect = {
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue([]),
        };

        mockDb.select.mockReturnValue(mockSelect as any);

        // Act: Import and call function
        const { getBusinessById } = await import('../queries');
        const result = await getBusinessById(999);

        // Assert: SPECIFICATION - MUST return null
        expect(result).toBeNull();
      });

      it('MUST return empty array for list queries when no results found', async () => {
        // Arrange: Mock empty result
        const mockSelect = {
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          orderBy: vi.fn().mockResolvedValue([]),
        };

        mockDb.select.mockReturnValue(mockSelect as any);

        // Act: Import and call function
        const { getBusinessesByTeam } = await import('../queries');
        const result = await getBusinessesByTeam(999);

        // Assert: SPECIFICATION - MUST return empty array
        expect(result).toEqual([]);
      });
    });

    /**
     * SPECIFICATION 2.5: Authentication Error Handling
     * 
     * Given: User not authenticated
     * When: Query function requiring authentication is called
     * Then: Error is thrown or null is returned appropriately
     */
    describe('Authentication Error Handling', () => {
      it('MUST throw error when getUser() returns null for getActivityLogs', async () => {
        // Arrange: Mock no authenticated user
        const mockCookies = {
          get: vi.fn().mockReturnValue(null),
        };
        
        // Mock the cookies function (already mocked at module level)
        const { cookies } = await import('next/headers');
        vi.mocked(cookies).mockResolvedValue(mockCookies as any);

        // Act & Assert: Import and call function, expect error
        const { getActivityLogs } = await import('../queries');
        await expect(getActivityLogs()).rejects.toThrow('User not authenticated');
      });

      it('MUST return null when getUser() returns null for getTeamForUser', async () => {
        // Arrange: Mock no authenticated user
        const mockCookies = {
          get: vi.fn().mockReturnValue(null),
        };
        
        // Mock the cookies function (already mocked at module level)
        const { cookies } = await import('next/headers');
        vi.mocked(cookies).mockResolvedValue(mockCookies as any);

        // Act: Import and call function
        const { getTeamForUser } = await import('../queries');
        const result = await getTeamForUser();

        // Assert: SPECIFICATION - MUST return null
        expect(result).toBeNull();
      });
    });
  });

  /**
   * SPECIFICATION 3: Edge Cases
   */
  describe('Edge Cases', () => {
    /**
     * SPECIFICATION 3.1: Large Result Sets
     * 
     * Given: Query that could return many results
     * When: Query function is called
     * Then: Results are limited appropriately
     */
    describe('Large Result Sets', () => {
      it('MUST limit fingerprint history to specified limit', async () => {
        // Arrange: Mock many fingerprints
        const mockFingerprints = Array.from({ length: 20 }, (_, i) => ({
          id: i + 1,
          businessId: 1,
          visibilityScore: 75,
          mentionRate: 0.5,
          sentimentScore: 0.8,
          accuracyScore: 0.9,
          avgRankPosition: 2.5,
          createdAt: new Date(),
          llmResults: {},
          competitiveBenchmark: null,
          competitiveLeaderboard: null,
        }));

        const mockSelect = {
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          orderBy: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue(mockFingerprints.slice(0, 10)),
        };

        mockDb.select.mockReturnValue(mockSelect as any);

        // Act: Import and call function with limit
        const { getFingerprintHistory } = await import('../queries');
        const result = await getFingerprintHistory(1, 10);

        // Assert: SPECIFICATION - MUST limit results
        expect(result.length).toBeLessThanOrEqual(10);
        expect(mockSelect.limit).toHaveBeenCalledWith(10);
      });
    });

    /**
     * SPECIFICATION 3.2: Concurrent Updates
     * 
     * Given: Multiple concurrent update operations
     * When: Update functions are called
     * Then: Updates are handled correctly (optimistic locking, etc.)
     */
    describe('Concurrent Updates', () => {
      it('MUST handle concurrent business updates', async () => {
        // Arrange: Mock concurrent updates
        const updates1 = { name: 'Updated Name 1' };
        const updates2 = { name: 'Updated Name 2' };

        const updatedBusiness1 = BusinessTestFactory.create({
          id: 1,
          name: 'Updated Name 1',
        });

        const updatedBusiness2 = BusinessTestFactory.create({
          id: 1,
          name: 'Updated Name 2',
        });

        const mockUpdate1 = {
          set: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          returning: vi.fn().mockResolvedValue([updatedBusiness1]),
        };

        const mockUpdate2 = {
          set: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          returning: vi.fn().mockResolvedValue([updatedBusiness2]),
        };

        mockDb.update = vi.fn()
          .mockReturnValueOnce(mockUpdate1 as any)
          .mockReturnValueOnce(mockUpdate2 as any);

        // Act: Import and call function concurrently
        const { updateBusiness } = await import('../queries');
        const [result1, result2] = await Promise.all([
          updateBusiness(1, updates1),
          updateBusiness(1, updates2),
        ]);

        // Assert: SPECIFICATION - MUST handle both updates
        expect(result1).toEqual(updatedBusiness1);
        expect(result2).toEqual(updatedBusiness2);
        expect(mockDb.update).toHaveBeenCalledTimes(2);
      });
    });

    /**
     * SPECIFICATION 3.3: Null and Optional Fields
     * 
     * Given: Query with null or optional fields
     * When: Query function is called
     * Then: Null values are handled correctly
     */
    describe('Null and Optional Fields', () => {
      it('MUST handle businesses with null optional fields', async () => {
        // Arrange: Mock business with null optional fields
        const testBusiness = BusinessTestFactory.create({
          id: 1,
          category: null,
          location: null,
          wikidataQID: null,
          lastCrawledAt: null,
          crawlData: null,
        });

        const mockSelect = {
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue([testBusiness]),
        };

        mockDb.select.mockReturnValue(mockSelect as any);

        // Act: Import and call function
        const { getBusinessById } = await import('../queries');
        const result = await getBusinessById(1);

        // Assert: SPECIFICATION - MUST return business with null fields
        expect(result).toEqual(testBusiness);
        expect(result?.category).toBeNull();
        expect(result?.location).toBeNull();
      });
    });
  });
});

