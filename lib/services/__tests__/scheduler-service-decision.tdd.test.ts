/**
 * TDD Test: Scheduler Service Decision - Auto-Publish Functionality
 * 
 * SPECIFICATION: Auto-Publish After Crawl Completion
 * 
 * As a system
 * I want to automatically publish businesses to Wikidata after crawl completes
 * So that businesses are published without manual intervention when conditions are met
 * 
 * Acceptance Criteria:
 * 1. handleAutoPublish() MUST check if auto-publish is enabled for the team
 * 2. handleAutoPublish() MUST skip publish if conditions not met
 * 3. handleAutoPublish() MUST update business status to 'generating' during publish
 * 4. handleAutoPublish() MUST fetch publish data and check notability
 * 5. handleAutoPublish() MUST store entity for manual publish regardless of notability
 * 6. handleAutoPublish() MUST publish to test.wikidata.org if notability check passes
 * 7. handleAutoPublish() MUST update existing entity if business has QID
 * 8. handleAutoPublish() MUST create new entity if business has no QID
 * 9. handleAutoPublish() MUST update business status to 'published' on success
 * 10. handleAutoPublish() MUST revert status to 'crawled' if notability check fails
 * 11. handleAutoPublish() MUST handle errors gracefully and update status to 'error'
 * 
 * TDD Cycle: RED → GREEN → REFACTOR
 * Tests written FIRST to drive implementation
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BusinessTestFactory } from '@/lib/test-helpers/tdd-helpers';
import { TeamTestFactory } from '@/lib/test-helpers/tdd-helpers';

// Mock dependencies
vi.mock('@/lib/db/queries', () => ({
  getBusinessById: vi.fn(),
  updateBusiness: vi.fn().mockResolvedValue(undefined),
  getTeamForBusiness: vi.fn(),
  createWikidataEntity: vi.fn(),
}));

vi.mock('../automation-service', () => ({
  shouldAutoPublish: vi.fn(),
  getAutomationConfig: vi.fn().mockReturnValue({
    automationEnabled: false,
    autoCrawl: false,
    autoPublish: false,
    fingerprintFrequency: 'manual',
    progressiveEnrichment: false,
  }),
}));

vi.mock('@/lib/data/wikidata-dto', () => ({
  getWikidataPublishDTO: vi.fn(),
}));

vi.mock('@/lib/wikidata/service', () => ({
  wikidataService: {
    updateEntity: vi.fn(),
    createAndPublishEntity: vi.fn(),
  },
}));

vi.mock('@/lib/wikidata/manual-publish-storage', () => ({
  storeEntityForManualPublish: vi.fn(),
}));

vi.mock('@/lib/utils/logger', () => ({
  loggers: {
    scheduler: {
      start: vi.fn(() => 'operation-id'),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      complete: vi.fn(),
      statusChange: vi.fn(),
      performance: vi.fn(),
    },
  },
}));

describe('🔴 RED: Scheduler Service Decision - Missing Auto-Publish Functionality Specification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * SPECIFICATION 1: handleAutoPublish - MUST Check Auto-Publish Conditions
   * 
   * CORRECT BEHAVIOR: handleAutoPublish() MUST check if auto-publish is enabled
   * and skip if conditions are not met.
   * 
   * This test WILL FAIL until implementation is added.
   */
  it('MUST skip publish if shouldAutoPublish returns false', async () => {
    // Arrange: Business and team where auto-publish is disabled
    const business = BusinessTestFactory.create({
      id: 1,
      status: 'crawled',
    });
    const team = TeamTestFactory.createFree(); // Free tier doesn't have auto-publish

    const queries = await import('@/lib/db/queries');
    const automation = await import('../automation-service');

    vi.mocked(queries.getBusinessById).mockResolvedValue(business);
    vi.mocked(queries.getTeamForBusiness).mockResolvedValue(team);
    vi.mocked(automation.shouldAutoPublish).mockReturnValue(false);

    // Act: Attempt auto-publish (TEST DRIVES IMPLEMENTATION)
    const { handleAutoPublish } = await import('../scheduler-service-decision');
    await handleAutoPublish(1);

    // Assert: SPECIFICATION - MUST skip publish and not update status
    expect(automation.shouldAutoPublish).toHaveBeenCalledWith(business, team);
    expect(queries.updateBusiness).not.toHaveBeenCalled();
  });

  /**
   * SPECIFICATION 2: handleAutoPublish - MUST Update Status During Publish
   * 
   * CORRECT BEHAVIOR: handleAutoPublish() MUST update business status to 'generating'
   * to show publish progress in UI.
   * 
   * This test WILL FAIL until implementation is added.
   */
  it('MUST update business status to generating during publish', async () => {
    // Arrange: Business ready for auto-publish
    const business = BusinessTestFactory.create({
      id: 1,
      status: 'crawled',
    });
    const team = TeamTestFactory.createPro(); // Pro tier has auto-publish

    const queries = await import('@/lib/db/queries');
    const automation = await import('../automation-service');
    const wikidataDTO = await import('@/lib/data/wikidata-dto');

    vi.mocked(queries.getBusinessById).mockResolvedValue(business);
    vi.mocked(queries.getTeamForBusiness).mockResolvedValue(team);
    vi.mocked(automation.shouldAutoPublish).mockReturnValue(true);
    vi.mocked(wikidataDTO.getWikidataPublishDTO).mockResolvedValue({
      canPublish: true,
      notability: { isNotable: true, confidence: 0.9 },
      fullEntity: {} as any,
      recommendation: 'Publish',
    });

    const wikidataService = await import('@/lib/wikidata/service');
    vi.mocked(wikidataService.wikidataService.createAndPublishEntity).mockResolvedValue({
      result: { success: true, qid: 'Q123456' },
    });

    // Act: Auto-publish (TEST DRIVES IMPLEMENTATION)
    const { handleAutoPublish } = await import('../scheduler-service-decision');
    await handleAutoPublish(1);

    // Assert: SPECIFICATION - MUST update status to 'generating' first
    expect(queries.updateBusiness).toHaveBeenCalledWith(1, {
      status: 'generating',
    });
  });

  /**
   * SPECIFICATION 3: handleAutoPublish - MUST Store Entity for Manual Publish
   * 
   * CORRECT BEHAVIOR: handleAutoPublish() MUST store entity for manual publish
   * regardless of notability status.
   * 
   * This test WILL FAIL until implementation is added.
   */
  it('MUST store entity for manual publish regardless of notability', async () => {
    // Arrange: Business with notability check that fails
    const business = BusinessTestFactory.create({
      id: 1,
      status: 'crawled',
    });
    const team = TeamTestFactory.createPro();
    const publishData = {
      canPublish: false,
      notability: { isNotable: false, confidence: 0.3 },
      fullEntity: { id: 'Q123' } as any,
      recommendation: 'Not notable enough',
    };

    const queries = await import('@/lib/db/queries');
    const automation = await import('../automation-service');
    const wikidataDTO = await import('@/lib/data/wikidata-dto');
    const manualStorage = await import('@/lib/wikidata/manual-publish-storage');

    vi.mocked(queries.getBusinessById).mockResolvedValue(business);
    vi.mocked(queries.getTeamForBusiness).mockResolvedValue(team);
    vi.mocked(automation.shouldAutoPublish).mockReturnValue(true);
    vi.mocked(wikidataDTO.getWikidataPublishDTO).mockResolvedValue(publishData);

    // Act: Auto-publish (TEST DRIVES IMPLEMENTATION)
    const { handleAutoPublish } = await import('../scheduler-service-decision');
    await handleAutoPublish(1);

    // Assert: SPECIFICATION - MUST store entity even if notability fails
    expect(manualStorage.storeEntityForManualPublish).toHaveBeenCalledWith(
      1,
      publishData.fullEntity,
      {}
    );
  });

  /**
   * SPECIFICATION 4: handleAutoPublish - MUST Update Existing Entity if QID Exists
   * 
   * CORRECT BEHAVIOR: handleAutoPublish() MUST update existing Wikidata entity
   * if business already has a QID.
   * 
   * This test WILL FAIL until implementation is added.
   */
  it('MUST update existing entity if business has QID', async () => {
    // Arrange: Business with existing QID
    const business = BusinessTestFactory.create({
      id: 1,
      status: 'crawled',
      wikidataQID: 'Q123456',
    });
    const team = TeamTestFactory.createPro();
    const publishData = {
      canPublish: true,
      notability: { isNotable: true, confidence: 0.9 },
      fullEntity: {} as any,
      recommendation: 'Publish',
    };

    const queries = await import('@/lib/db/queries');
    const automation = await import('../automation-service');
    const wikidataDTO = await import('@/lib/data/wikidata-dto');
    const wikidataService = await import('@/lib/wikidata/service');

    vi.mocked(queries.getBusinessById).mockResolvedValue(business);
    vi.mocked(queries.getTeamForBusiness).mockResolvedValue(team);
    vi.mocked(automation.shouldAutoPublish).mockReturnValue(true);
    vi.mocked(wikidataDTO.getWikidataPublishDTO).mockResolvedValue(publishData);
    vi.mocked(wikidataService.wikidataService.updateEntity).mockResolvedValue({
      success: true,
      qid: 'Q123456',
    });

    // Act: Auto-publish (TEST DRIVES IMPLEMENTATION)
    const { handleAutoPublish } = await import('../scheduler-service-decision');
    await handleAutoPublish(1);

    // Assert: SPECIFICATION - MUST call updateEntity, not createAndPublishEntity
    expect(wikidataService.wikidataService.updateEntity).toHaveBeenCalledWith(
      'Q123456',
      business,
      business.crawlData,
      expect.objectContaining({
        target: 'test',
        includeReferences: true,
      })
    );
    expect(wikidataService.wikidataService.createAndPublishEntity).not.toHaveBeenCalled();
  });

  /**
   * SPECIFICATION 5: handleAutoPublish - MUST Create New Entity if No QID
   * 
   * CORRECT BEHAVIOR: handleAutoPublish() MUST create new Wikidata entity
   * if business has no QID.
   * 
   * This test WILL FAIL until implementation is added.
   */
  it('MUST create new entity if business has no QID', async () => {
    // Arrange: Business without QID
    const business = BusinessTestFactory.create({
      id: 1,
      status: 'crawled',
      wikidataQID: null,
    });
    const team = TeamTestFactory.createPro();
    const publishData = {
      canPublish: true,
      notability: { isNotable: true, confidence: 0.9 },
      fullEntity: {} as any,
      recommendation: 'Publish',
    };

    const queries = await import('@/lib/db/queries');
    const automation = await import('../automation-service');
    const wikidataDTO = await import('@/lib/data/wikidata-dto');
    const wikidataService = await import('@/lib/wikidata/service');

    vi.mocked(queries.getBusinessById).mockResolvedValue(business);
    vi.mocked(queries.getTeamForBusiness).mockResolvedValue(team);
    vi.mocked(automation.shouldAutoPublish).mockReturnValue(true);
    vi.mocked(wikidataDTO.getWikidataPublishDTO).mockResolvedValue(publishData);
    vi.mocked(wikidataService.wikidataService.createAndPublishEntity).mockResolvedValue({
      result: { success: true, qid: 'Q789012' },
    });

    // Act: Auto-publish (TEST DRIVES IMPLEMENTATION)
    const { handleAutoPublish } = await import('../scheduler-service-decision');
    await handleAutoPublish(1);

    // Assert: SPECIFICATION - MUST call createAndPublishEntity, not updateEntity
    expect(wikidataService.wikidataService.createAndPublishEntity).toHaveBeenCalledWith(
      business,
      business.crawlData,
      expect.objectContaining({
        target: 'test',
        includeReferences: true,
      })
    );
    expect(wikidataService.wikidataService.updateEntity).not.toHaveBeenCalled();
  });

  /**
   * SPECIFICATION 6: handleAutoPublish - MUST Update Status to Published on Success
   * 
   * CORRECT BEHAVIOR: handleAutoPublish() MUST update business status to 'published'
   * and store QID when publish succeeds.
   * 
   * This test WILL FAIL until implementation is added.
   */
  it('MUST update business status to published and store QID on success', async () => {
    // Arrange: Successful publish
    const business = BusinessTestFactory.create({
      id: 1,
      status: 'crawled',
      wikidataQID: null,
    });
    const team = TeamTestFactory.createPro();
    const publishData = {
      canPublish: true,
      notability: { isNotable: true, confidence: 0.9 },
      fullEntity: {} as any,
      recommendation: 'Publish',
    };
    const newQID = 'Q789012';

    const queries = await import('@/lib/db/queries');
    const automation = await import('../automation-service');
    const wikidataDTO = await import('@/lib/data/wikidata-dto');
    const wikidataService = await import('@/lib/wikidata/service');

    vi.mocked(queries.getBusinessById).mockResolvedValue(business);
    vi.mocked(queries.getTeamForBusiness).mockResolvedValue(team);
    vi.mocked(automation.shouldAutoPublish).mockReturnValue(true);
    vi.mocked(wikidataDTO.getWikidataPublishDTO).mockResolvedValue(publishData);
    vi.mocked(wikidataService.wikidataService.createAndPublishEntity).mockResolvedValue({
      result: { success: true, qid: newQID },
    });

    // Act: Auto-publish (TEST DRIVES IMPLEMENTATION)
    const { handleAutoPublish } = await import('../scheduler-service-decision');
    await handleAutoPublish(1);

    // Assert: SPECIFICATION - MUST update status to 'published' with QID
    expect(queries.updateBusiness).toHaveBeenCalledWith(1, expect.objectContaining({
      status: 'published',
      wikidataQID: newQID,
      wikidataPublishedAt: expect.any(Date),
      lastAutoPublishedAt: expect.any(Date),
    }));
  });

  /**
   * SPECIFICATION 7: handleAutoPublish - MUST Revert Status if Notability Fails
   * 
   * CORRECT BEHAVIOR: handleAutoPublish() MUST revert business status back to 'crawled'
   * if notability check fails.
   * 
   * This test WILL FAIL until implementation is added.
   */
  it('MUST revert status to crawled if notability check fails', async () => {
    // Arrange: Business that fails notability check
    const business = BusinessTestFactory.create({
      id: 1,
      status: 'crawled',
    });
    const team = TeamTestFactory.createPro();
    const publishData = {
      canPublish: false,
      notability: { isNotable: false, confidence: 0.3 },
      fullEntity: {} as any,
      recommendation: 'Not notable enough',
    };

    const queries = await import('@/lib/db/queries');
    const automation = await import('../automation-service');
    const wikidataDTO = await import('@/lib/data/wikidata-dto');

    vi.mocked(queries.getBusinessById).mockResolvedValue(business);
    vi.mocked(queries.getTeamForBusiness).mockResolvedValue(team);
    vi.mocked(automation.shouldAutoPublish).mockReturnValue(true);
    vi.mocked(wikidataDTO.getWikidataPublishDTO).mockResolvedValue(publishData);

    // Act: Auto-publish (TEST DRIVES IMPLEMENTATION)
    const { handleAutoPublish } = await import('../scheduler-service-decision');
    await handleAutoPublish(1);

    // Assert: SPECIFICATION - MUST revert status to 'crawled'
    // First call sets to 'generating', second call reverts to 'crawled'
    const updateCalls = vi.mocked(queries.updateBusiness).mock.calls;
    expect(updateCalls[updateCalls.length - 1]).toEqual([1, { status: 'crawled' }]);
  });
});

