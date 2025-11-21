/**
 * Scheduler Service
 * SOLID: Single Responsibility - handles scheduled automation tasks
 * DRY: Centralizes scheduling logic
 * REFACTORED: Unified frequency-aware processing (replaces monthly-processing.ts)
 */

import { getBusinessById, updateBusiness, getTeamForBusiness, createCrawlJob, createWikidataEntity } from '@/lib/db/queries';
import { shouldAutoCrawl, shouldAutoPublish, getAutomationConfig, calculateNextCrawlDate } from './automation-service';
import { executeCrawlJob, executeFingerprint } from './business-processing';
import { getWikidataPublishDTO } from '@/lib/data/wikidata-dto';
import { wikidataPublisher } from '@/lib/wikidata/publisher';
import { storeEntityForManualPublish } from '@/lib/wikidata/manual-publish-storage';
import { db } from '@/lib/db/drizzle';
import { businesses, teams, type Business, type Team } from '@/lib/db/schema';
import { eq, and, or, lte, sql } from 'drizzle-orm';
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

/**
 * Process scheduled automation for all businesses (frequency-aware)
 * REFACTORED: Unified function that handles weekly/monthly/daily frequencies
 * Replaces both processWeeklyCrawls() and runMonthlyProcessing()
 * 
 * Flow:
 * 1. Finds businesses due for processing (respects automation config)
 * 2. Runs full CFP pipeline: crawl + fingerprint (parallel) → publish (after crawl)
 * 3. Schedules next processing based on tier frequency
 * 
 * @param options - Processing options
 *   - batchSize: Number of businesses to process concurrently (default: 10)
 *   - catchMissed: Include businesses that missed their schedule (default: true)
 */
export async function processScheduledAutomation(options: {
  batchSize?: number;
  catchMissed?: boolean;
} = {}): Promise<{
  total: number;
  success: number;
  skipped: number;
  failed: number;
}> {
  const { batchSize = 10, catchMissed = true } = options;
  const operationId = log.start('Scheduled Automation Processing');
  
  try {
    const now = new Date();
    
    // Build query conditions
    const baseConditions = [eq(businesses.automationEnabled, true)];
    
    // Build date-based conditions
    let dateConditions;
    if (catchMissed) {
      // Catch businesses that missed their schedule (30+ days overdue) OR next crawl is due
      const thirtyDaysAgo = new Date(now);
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      dateConditions = or(
        lte(businesses.nextCrawlAt, now),
        sql`${businesses.lastCrawledAt} < ${thirtyDaysAgo.toISOString()}`,
        sql`${businesses.lastCrawledAt} IS NULL`
      );
    } else {
      // Only businesses with next crawl due
      dateConditions = lte(businesses.nextCrawlAt, now);
    }
    
    const conditions = and(...baseConditions, dateConditions);
    
    // OPTIMIZATION: Single query with JOIN to get businesses + teams
    // Eliminates N+1 query problem
    const dueBusinessesWithTeams = await db
      .select({
        business: businesses,
        team: teams,
      })
      .from(businesses)
      .innerJoin(teams, eq(businesses.teamId, teams.id))
      .where(conditions);

    log.info(`Found ${dueBusinessesWithTeams.length} businesses due for processing`, {
      count: dueBusinessesWithTeams.length,
      catchMissed,
    });

    if (dueBusinessesWithTeams.length === 0) {
      log.complete(operationId, 'Scheduled Automation Processing', {
        total: 0,
        success: 0,
        skipped: 0,
        failed: 0,
      });
      return { total: 0, success: 0, skipped: 0, failed: 0 };
    }

    // Batch process with concurrency limit
    const results = {
      success: 0,
      failed: 0,
      skipped: 0,
    };

    for (let i = 0; i < dueBusinessesWithTeams.length; i += batchSize) {
      const batch = dueBusinessesWithTeams.slice(i, i + batchSize);
      const batchNum = Math.floor(i / batchSize) + 1;
      const totalBatches = Math.ceil(dueBusinessesWithTeams.length / batchSize);
      
      log.info(`Processing batch ${batchNum}/${totalBatches}`, {
        batchSize: batch.length,
        batchNum,
        totalBatches,
      });

      const batchResults = await Promise.allSettled(
        batch.map(({ business, team }) => processBusinessAutomation(business, team))
      );

      batchResults.forEach((result, idx) => {
        if (result.status === 'fulfilled') {
          if (result.value === 'success') results.success++;
          else if (result.value === 'skipped') results.skipped++;
          else results.failed++;
        } else {
          log.error(`Business ${batch[idx].business.id} failed`, result.reason, {
            businessId: batch[idx].business.id,
          });
          results.failed++;
        }
      });
    }

    log.complete(operationId, 'Scheduled Automation Processing', {
      total: dueBusinessesWithTeams.length,
      ...results,
    });

    return {
      total: dueBusinessesWithTeams.length,
      ...results,
    };
  } catch (error) {
    log.error('Error in scheduled automation processing', error);
    log.complete(operationId, 'Scheduled Automation Processing', { status: 'error' });
    throw error;
  }
}

/**
 * Process a single business for scheduled automation
 * Runs full CFP pipeline: crawl + fingerprint (parallel) → publish
 * 
 * @param business - Business to process
 * @param team - Team for automation config
 * @returns Processing result
 */
async function processBusinessAutomation(
  business: Business,
  team: Team
): Promise<'success' | 'skipped' | 'failed'> {
  try {
    const config = getAutomationConfig(team);
    
    // Skip if automation not configured
    if (config.crawlFrequency === 'manual') {
      log.debug('Skipping business - manual frequency', {
        businessId: business.id,
        planName: team.planName,
      });
      return 'skipped';
    }

    // Double-check shouldAutoCrawl (respects automation config)
    if (!shouldAutoCrawl(business, team)) {
      log.debug('Skipping business - shouldAutoCrawl returned false', {
        businessId: business.id,
        automationEnabled: business.automationEnabled,
        nextCrawlAt: business.nextCrawlAt?.toISOString(),
      });
      return 'skipped';
    }

    log.info('Processing business for scheduled automation', {
      businessId: business.id,
      businessName: business.name,
      planName: team.planName,
      crawlFrequency: config.crawlFrequency,
    });

    // STEP 1: Run crawl + fingerprint in parallel (they're independent!)
    const [crawlResult, fingerprintResult] = await Promise.allSettled([
      executeCrawlJob(null, business.id, business),
      executeFingerprint(business, true),
    ]);

    // Log results
    if (crawlResult.status === 'fulfilled') {
      log.info('Crawl completed for business', { businessId: business.id });
    } else {
      log.error('Crawl failed for business', crawlResult.reason, { businessId: business.id });
    }

    if (fingerprintResult.status === 'fulfilled') {
      log.info('Fingerprint completed for business', { businessId: business.id });
    } else {
      log.error('Fingerprint failed for business', fingerprintResult.reason, { businessId: business.id });
    }

    // STEP 2: Publish depends on crawl, so run after crawl completes
    if (crawlResult.status === 'fulfilled' && config.autoPublish) {
      try {
        await handleAutoPublish(business.id);
        log.info('Publication completed for business', { businessId: business.id });
      } catch (error) {
        log.error('Publication failed for business', error, { businessId: business.id });
        // Don't fail entire process if publish fails
      }
    }

    // STEP 3: Schedule next processing based on frequency
    const nextDate = calculateNextCrawlDate(config.crawlFrequency);
    await updateBusiness(business.id, {
      nextCrawlAt: nextDate,
    });

    log.info('Business scheduled for next processing', {
      businessId: business.id,
      nextCrawlAt: nextDate.toISOString(),
      frequency: config.crawlFrequency,
    });

    return 'success';
  } catch (error) {
    log.error('Error processing business for automation', error, { businessId: business.id });
    return 'failed';
  }
}

/**
 * @deprecated Use processScheduledAutomation() instead
 * Legacy function for backward compatibility
 * Process weekly crawls for all businesses with automation enabled
 */
export async function processWeeklyCrawls(): Promise<void> {
  log.warn('processWeeklyCrawls() is deprecated, use processScheduledAutomation() instead');
  await processScheduledAutomation();
}

