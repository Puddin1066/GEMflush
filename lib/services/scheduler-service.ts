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
import { db } from '@/lib/db/drizzle';
import { businesses } from '@/lib/db/schema';
import { eq, and, lte } from 'drizzle-orm';

/**
 * Handle auto-publish after crawl completes
 */
export async function handleAutoPublish(businessId: number): Promise<void> {
  try {
    console.log(`[SCHEDULER] Starting auto-publish for business ${businessId}`);
    
    const business = await getBusinessById(businessId);
    if (!business) {
      throw new Error('Business not found');
    }

    const team = await getTeamForBusiness(businessId);
    if (!shouldAutoPublish(business, team)) {
      console.log(`[SCHEDULER] Auto-publish skipped for business ${businessId} - conditions not met`);
      return;
    }

    // Get publish data
    const publishData = await getWikidataPublishDTO(businessId);
    
    if (!publishData.canPublish) {
      console.log(`[SCHEDULER] Auto-publish skipped for business ${businessId} - notability check failed`);
      return;
    }

    // Publish to test.wikidata.org (production can be enabled later)
    const publishResult = await wikidataPublisher.publishEntity(
      publishData.fullEntity,
      false // publishToProduction: false for now
    );

    if (!publishResult.success) {
      throw new Error(publishResult.error || 'Publication failed');
    }

    // Store Wikidata entity
    await createWikidataEntity({
      businessId,
      qid: publishResult.qid,
      entityData: publishData.fullEntity,
      publishedTo: 'test.wikidata',
      version: 1,
      enrichmentLevel: 1,
    });

    // Update business
    await updateBusiness(businessId, {
      status: 'published',
      wikidataQID: publishResult.qid,
      wikidataPublishedAt: new Date(),
      lastAutoPublishedAt: new Date(),
    });

    console.log(`[SCHEDULER] Auto-publish completed for business ${businessId} - QID: ${publishResult.qid}`);
  } catch (error) {
    console.error(`[SCHEDULER] Auto-publish error for business ${businessId}:`, error);
    // Don't throw - allow retry on next cycle
  }
}

/**
 * Process weekly crawls for all businesses with automation enabled
 */
export async function processWeeklyCrawls(): Promise<void> {
  try {
    console.log('[SCHEDULER] Starting weekly crawl processing');
    
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

    console.log(`[SCHEDULER] Found ${dueBusinesses.length} businesses due for crawl`);

    for (const business of dueBusinesses) {
      try {
        const team = await getTeamForBusiness(business.id);
        if (!shouldAutoCrawl(business, team)) {
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
          console.error(`[SCHEDULER] Crawl failed for business ${business.id}:`, error);
        });

        console.log(`[SCHEDULER] Scheduled crawl for business ${business.id}`);
      } catch (error) {
        console.error(`[SCHEDULER] Error processing business ${business.id}:`, error);
        // Continue with next business
      }
    }

    console.log('[SCHEDULER] Weekly crawl processing completed');
  } catch (error) {
    console.error('[SCHEDULER] Error in weekly crawl processing:', error);
    throw error;
  }
}

