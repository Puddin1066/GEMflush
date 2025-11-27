/**
 * TDD Test: Fingerprint Query Functions - Tests Drive Implementation
 * 
 * SPECIFICATION: Additional Query Functions for Fingerprint Operations
 * 
 * As a developer
 * I want query functions for fingerprint operations
 * So that API routes can use proper abstractions instead of direct DB access
 * 
 * Acceptance Criteria:
 * 1. getFingerprintById() returns fingerprint or null
 * 2. getBusinessForTeam() returns business with team verification
 * 
 * TDD Cycle: RED → GREEN → REFACTOR
 * Tests written FIRST to drive implementation
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { db } from '../drizzle';
import { llmFingerprints, businesses } from '../schema';
import { BusinessTestFactory, TeamTestFactory } from '@/lib/test-helpers/tdd-helpers';
import type { Business, Team, LLMFingerprint } from '../schema';

// Mock drizzle db
vi.mock('../drizzle', () => ({
  db: {
    select: vi.fn(),
  },
}));

const mockDb = vi.mocked(db);

describe('🔴 RED: Fingerprint Query Functions Specification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * SPECIFICATION 1: getFingerprintById() - MUST Return Fingerprint or Null
   * 
   * Given: Fingerprint ID
   * When: getFingerprintById() is called
   * Then: Returns fingerprint if exists, null otherwise
   */
  describe('getFingerprintById', () => {
    it('MUST return fingerprint when exists', async () => {
      // Arrange: Mock fingerprint exists
      const mockFingerprint = {
        id: 1,
        businessId: 1,
        visibilityScore: 75,
        mentionRate: 0.5,
        sentimentScore: 0.8,
        accuracyScore: 0.9,
        avgRankPosition: 2.5,
        createdAt: new Date(),
        llmResults: {},
        competitiveLeaderboard: {},
      };

      const mockSelect = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([mockFingerprint]),
      };

      mockDb.select.mockReturnValue(mockSelect as any);

      // Act: Import and call function (TEST DRIVES IMPLEMENTATION)
      const { getFingerprintById } = await import('../queries');
      const result = await getFingerprintById(1);

      // Assert: SPECIFICATION - MUST return fingerprint
      expect(result).toEqual(mockFingerprint);
      expect(mockDb.select).toHaveBeenCalled();
    });

    it('MUST return null when fingerprint does not exist', async () => {
      // Arrange: Mock fingerprint not found
      const mockSelect = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
      };

      mockDb.select.mockReturnValue(mockSelect as any);

      // Act: Import and call function
      const { getFingerprintById } = await import('../queries');
      const result = await getFingerprintById(999);

      // Assert: SPECIFICATION - MUST return null
      expect(result).toBeNull();
    });
  });

  /**
   * SPECIFICATION 2: getBusinessForTeam() - MUST Return Business with Team Verification
   * 
   * Given: Business ID and Team ID
   * When: getBusinessForTeam() is called
   * Then: Returns business if exists and belongs to team, null otherwise
   */
  describe('getBusinessForTeam', () => {
    it('MUST return business when exists and belongs to team', async () => {
      // Arrange: Mock business exists and belongs to team
      const testTeam = TeamTestFactory.createFree({ id: 1 });
      const testBusiness = BusinessTestFactory.create({ 
        id: 1, 
        teamId: testTeam.id 
      });

      const mockSelect = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([testBusiness]),
      };

      mockDb.select.mockReturnValue(mockSelect as any);

      // Act: Import and call function (TEST DRIVES IMPLEMENTATION)
      const { getBusinessForTeam } = await import('../queries');
      const result = await getBusinessForTeam(1, 1);

      // Assert: SPECIFICATION - MUST return business
      expect(result).toEqual(testBusiness);
      expect(mockDb.select).toHaveBeenCalled();
    });

    it('MUST return null when business does not exist', async () => {
      // Arrange: Mock business not found
      const mockSelect = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
      };

      mockDb.select.mockReturnValue(mockSelect as any);

      // Act: Import and call function
      const { getBusinessForTeam } = await import('../queries');
      const result = await getBusinessForTeam(999, 1);

      // Assert: SPECIFICATION - MUST return null
      expect(result).toBeNull();
    });

    it('MUST return null when business belongs to different team', async () => {
      // Arrange: Mock business exists but wrong team
      const testBusiness = BusinessTestFactory.create({ 
        id: 1, 
        teamId: 2 // Different team
      });

      const mockSelect = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]), // Query filters by teamId, so returns empty
      };

      mockDb.select.mockReturnValue(mockSelect as any);

      // Act: Import and call function
      const { getBusinessForTeam } = await import('../queries');
      const result = await getBusinessForTeam(1, 1); // Looking for team 1, but business is team 2

      // Assert: SPECIFICATION - MUST return null (query filters by both businessId and teamId)
      expect(result).toBeNull();
    });
  });
});


