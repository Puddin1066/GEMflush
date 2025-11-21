/**
 * Scheduler Orchestration Module
 * 
 * Handles auto-publish workflow orchestration and decision-making.
 * Extracted from scheduler-service.ts for better separation of concerns.
 * 
 * SOLID: Single Responsibility - focused on publish workflow orchestration
 * DRY: Centralizes publish logic and status management
 */

import { getBusinessById, updateBusiness, getTeamForBusiness, createWikidataEntity } from '@/lib/db/queries';
import { shouldAutoPublish, getAutomationConfig } from '../automation-service';
import { getWikidataPublishDTO } from '@/lib/data/wikidata-dto';
import { wikidataPublisher } from '@/lib/wikidata/publisher';
import { storeEntityForManualPublish } from '@/lib/wikidata/manual-publish-storage';
import { loggers } from '@/lib/utils/logger';

const log = loggers.scheduler;

/**
 * Handle auto-publish after crawl completes
 * OPTIMIZED: Adds status updates during publish for better UI feedback
 */
export async function handleAutoPublish(businessId: number): Promise<void> {
  const operationId = log.start('Auto-Publish', { businessId });
  let publishResult: { success: boolean; qid?: string | null; error?: string } | null = null;
  
  try {
    const business = await getBusinessById(businessId);
    if (!business) {
      throw new Error('Business not found');
    }

    const team = await getTeamForBusiness(businessId);
    if (!shouldAutoPublish(business, team)) {
      log.info('Auto-publish skipped - conditions not met', { 
        businessId,
        status: business.status,
        planName: team?.planName,
        autoPublish: team ? getAutomationConfig(team).autoPublish : 'no team',
      });
      // No need to revert status as we haven't changed it yet
      return;
    }

    // Update status to 'generating' to show publish progress in UI
    await updateBusiness(businessId, {
      status: 'generating', // Publishing in progress
    });
    log.statusChange('crawled', 'generating', { businessId });

    // Get publish data
    log.info('Fetching publish data', { businessId });
    console.log(`[DEBUG] handleAutoPublish: Fetching publish data for business ${businessId}`);
    const publishData = await getWikidataPublishDTO(businessId);
    console.log(`[DEBUG] handleAutoPublish: canPublish=${publishData.canPublish}, isNotable=${publishData.notability.isNotable}, confidence=${publishData.notability.confidence}`);
    
    // IDEAL: Log test mode detection for debugging
    const nodeEnv = process.env.NODE_ENV || '';
    const playwrightTest = process.env.PLAYWRIGHT_TEST === 'true';
    const useMockFlag = process.env.USE_MOCK_GOOGLE_SEARCH === 'true';
    const isTestBusiness = business.name.includes('Ideal UX Test Business') || 
                           business.name.includes('Test Business');
    log.info('Publish data fetched', {
      businessId,
      canPublish: publishData.canPublish,
      isNotable: publishData.notability.isNotable,
      confidence: publishData.notability.confidence,
      testMode: useMockFlag || playwrightTest || (nodeEnv as string) === 'test' || isTestBusiness,
    });
    
    // Store entity for manual publication (unbeknownst to user)
    // This happens regardless of canPublish status
    await storeEntityForManualPublish(
      businessId,
      business.name,
      publishData.fullEntity,
      publishData.canPublish,
      {
        isNotable: publishData.notability.isNotable,
        confidence: publishData.notability.confidence,
        recommendation: publishData.recommendation,
      }
    );
    
    if (!publishData.canPublish) {
      const reason = publishData.notability.isNotable 
        ? `Not notable (confidence: ${publishData.notability.confidence})`
        : publishData.recommendation || 'Notability requirements not met';
      log.warn('Auto-publish skipped - notability check failed', {
        businessId,
        reason,
        isNotable: publishData.notability.isNotable,
        confidence: publishData.notability.confidence,
        testMode: useMockFlag || playwrightTest || (nodeEnv as string) === 'test' || isTestBusiness,
      });
      // Revert status back to 'crawled' if notability check failed
      await updateBusiness(businessId, {
        status: 'crawled',
      });
      log.statusChange('generating', 'crawled', { businessId });
      return;
    }

    // Publish to test.wikidata.org (production can be enabled later)
    // CRITICAL: If business already has QID, update existing entity instead of creating new
    log.info('Publishing entity to Wikidata', { 
      businessId,
      hasExistingQID: !!business.wikidataQID,
      existingQID: business.wikidataQID || null,
    });
    console.log(`[DEBUG] handleAutoPublish: Calling ${business.wikidataQID ? 'updateEntity' : 'publishEntity'}, WIKIDATA_PUBLISH_MODE=${process.env.WIKIDATA_PUBLISH_MODE}`);
    const publishStartTime = Date.now();
    
    if (business.wikidataQID) {
      // Business already has QID - update existing entity
      // Remove labels/descriptions as they already exist
      const entityForUpdate = { ...publishData.fullEntity };
      delete entityForUpdate.labels;
      delete entityForUpdate.descriptions;
      
      const updateResult = await wikidataPublisher.updateEntity(
        business.wikidataQID,
        entityForUpdate,
        false // production: false for now
      );
      
      publishResult = {
        success: updateResult.success,
        qid: business.wikidataQID, // Use existing QID
        error: updateResult.error,
      };
    } else {
      // No existing QID - create new entity
      publishResult = await wikidataPublisher.publishEntity(
        publishData.fullEntity,
        false // publishToProduction: false for now
      );
    }
    console.log(`[DEBUG] handleAutoPublish: publishResult.success=${publishResult.success}, qid=${publishResult.qid || 'none'}`);

    const publishDuration = Date.now() - publishStartTime;
    
    if (!publishResult.success || !publishResult.qid) {
      const errorMessage = publishResult.error || 'Publication failed - no QID returned';
      
      // Simplify error message for user display
      const simplifiedError = errorMessage.includes('already has label')
        ? 'Business already exists in Wikidata. Updating existing entry...'
        : errorMessage.includes('Bad value type')
        ? 'Data format error. Please contact support if this persists.'
        : errorMessage.length > 100
        ? errorMessage.substring(0, 100) + '...'
        : errorMessage;
      
      log.error('Publication failed', new Error(errorMessage), {
        businessId,
        duration: publishDuration,
      });
      
      // Update status to error with simplified message
      await updateBusiness(businessId, {
        status: 'error',
        errorMessage: simplifiedError,
      });
      log.statusChange('generating', 'error', { businessId });
      
      throw new Error(errorMessage);
    }

    const qid = publishResult.qid; // Type guard: qid is guaranteed to exist here
    log.performance('Publication to Wikidata', publishDuration, {
      businessId,
      qid,
    });

    // Store Wikidata entity
    await createWikidataEntity({
      businessId,
      qid, // Type-safe: qid is guaranteed to be string here
      entityData: publishData.fullEntity,
      publishedTo: 'test.wikidata',
      version: 1,
      enrichmentLevel: 1,
    });

    // Update business to published status
    await updateBusiness(businessId, {
      status: 'published',
      wikidataQID: qid,
      wikidataPublishedAt: new Date(),
      lastAutoPublishedAt: new Date(),
    });
    log.statusChange('generating', 'published', { businessId, qid });

    log.complete(operationId, 'Auto-Publish', {
      businessId,
      qid,
      status: 'published',
    });
  } catch (error) {
    log.error('Auto-publish error', error, { businessId });
    
    // Only update status to error if we haven't already set it (avoid overwriting)
    // Check current status first
    const currentBusiness = await getBusinessById(businessId);
    if (currentBusiness && currentBusiness.status !== 'error') {
      // Simplify error message for user display
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      const simplifiedError = errorMessage.includes('already has label')
        ? 'Business already exists in Wikidata. Updating existing entry...'
        : errorMessage.includes('Bad value type')
        ? 'Data format error. Please contact support if this persists.'
        : errorMessage.length > 100
        ? errorMessage.substring(0, 100) + '...'
        : errorMessage;
      
      await updateBusiness(businessId, {
        status: 'error',
        errorMessage: simplifiedError,
      }).catch(err => {
        log.error('Failed to update business status to error', err, { businessId });
      });
    }
    
    log.complete(operationId, 'Auto-Publish', {
      businessId,
      status: 'error',
    });
    
    // Re-throw error to surface it in autoStartProcessing
    throw error;
  }
}
