/**
 * Scheduler Service
 * SOLID: Single Responsibility - handles scheduled automation tasks
 * DRY: Centralizes scheduling logic
 */

import { getBusinessById, updateBusiness, getTeamForBusiness, createCrawlJob, createWikidataEntity } from '@/lib/db/queries';
import { shouldAutoCrawl, shouldAutoPublish, getAutomationConfig, calculateNextCrawlDate } from './automation-service';
import { executeCrawlJob } from './business-processing';
import { getWikidataPublishDTO } from '@/lib/data/wikidata-dto';
import { wikidataPublisher } from '@/lib/wikidata/publisher';
import { storeEntityForManualPublish } from '@/lib/wikidata/manual-publish-storage';
import { db } from '@/lib/db/drizzle';
import { businesses } from '@/lib/db/schema';
import { eq, and, lte } from 'drizzle-orm';
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
    log.info('Publishing entity to Wikidata', { businessId });
    console.log(`[DEBUG] handleAutoPublish: Calling publishEntity, WIKIDATA_PUBLISH_MODE=${process.env.WIKIDATA_PUBLISH_MODE}`);
    const publishStartTime = Date.now();
    
    publishResult = await wikidataPublisher.publishEntity(
      publishData.fullEntity,
      false // publishToProduction: false for now
    );
    console.log(`[DEBUG] handleAutoPublish: publishResult.success=${publishResult.success}, qid=${publishResult.qid || 'none'}`);

    const publishDuration = Date.now() - publishStartTime;
    
    if (!publishResult.success || !publishResult.qid) {
      const errorMessage = publishResult.error || 'Publication failed - no QID returned';
      log.error('Publication failed', new Error(errorMessage), {
        businessId,
        duration: publishDuration,
      });
      
      // Update status to error if publish failed
      await updateBusiness(businessId, {
        status: 'error',
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
      await updateBusiness(businessId, {
        status: 'error',
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
 * Process weekly crawls for all businesses with automation enabled
 */
export async function processWeeklyCrawls(): Promise<void> {
  const operationId = log.start('Weekly Crawl Processing');
  
  try {
    // Find all businesses with automation enabled and next crawl due
    const now = new Date();
    const dueBusinesses = await db
      .select()
      .from(businesses)
      .where(
        and(
          eq(businesses.automationEnabled, true),
          lte(businesses.nextCrawlAt, now)
        )
      );

    log.info(`Found ${dueBusinesses.length} businesses due for crawl`, {
      count: dueBusinesses.length,
    });

    let scheduled = 0;
    let skipped = 0;
    let errors = 0;

    for (const business of dueBusinesses) {
      try {
        const team = await getTeamForBusiness(business.id);
        if (!shouldAutoCrawl(business, team)) {
          skipped++;
          log.debug('Skipping crawl - conditions not met', {
            businessId: business.id,
            automationEnabled: business.automationEnabled,
            nextCrawlAt: business.nextCrawlAt?.toISOString(),
          });
          continue;
        }

        // Create crawl job
        const crawlJob = await createCrawlJob({
          businessId: business.id,
          jobType: 'scheduled_crawl',
          status: 'queued',
          progress: 0,
        });

        // Execute crawl in background (fire and forget)
        executeCrawlJob(crawlJob.id, business.id).catch(error => {
          log.error('Crawl failed for business', error, { businessId: business.id });
        });

        scheduled++;
        log.info('Scheduled crawl for business', {
          businessId: business.id,
          jobId: crawlJob.id,
        });
      } catch (error) {
        errors++;
        log.error('Error processing business', error, { businessId: business.id });
        // Continue with next business
      }
    }

    log.complete(operationId, 'Weekly Crawl Processing', {
      total: dueBusinesses.length,
      scheduled,
      skipped,
      errors,
    });
  } catch (error) {
    log.error('Error in weekly crawl processing', error);
    log.complete(operationId, 'Weekly Crawl Processing', { status: 'error' });
    throw error;
  }
}

