// Monthly Processing Service
// SOLID: Orchestrates recurring automation without HTTP concerns
// DRY: Shared between Vercel cron entrypoint and tests/scripts
// Optimized: Batch processing with parallel operations

import { db } from '@/lib/db/drizzle';
import { businesses, teams, type Business, type Team } from '@/lib/db/schema';
import { eq, and, or, lte, sql } from 'drizzle-orm';
import { executeCrawlJob, executeFingerprint } from './business-processing';
import { handleAutoPublish } from './scheduler-service';
import { getAutomationConfig, calculateNextCrawlDate } from './automation-service';
import { updateBusiness } from '@/lib/db/queries';

/**
 * Run monthly processing for all businesses with automation enabled
 * 
 * Optimizations:
 * - Batch database queries (eliminate N+1)
 * - Parallel processing with concurrency limits
 * - Efficient date-based filtering
 */
export async function runMonthlyProcessing(): Promise<void> {
  console.log('[MONTHLY] Starting monthly processing');
  const startTime = Date.now();
  
  const now = new Date();
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  // OPTIMIZATION: Single query with JOIN to get businesses + teams
  // Eliminates N+1 query problem
  const dueBusinessesWithTeams = await db
    .select({
      business: businesses,
      team: teams,
    })
    .from(businesses)
    .innerJoin(teams, eq(businesses.teamId, teams.id))
    .where(
      and(
        eq(businesses.automationEnabled, true),
        or(
          // Next crawl is due
          lte(businesses.nextCrawlAt, now),
          // Or last crawl was >30 days ago (catch missed schedules)
          sql`${businesses.lastCrawledAt} < ${thirtyDaysAgo}`,
          // Or never crawled but automation enabled
          sql`${businesses.lastCrawledAt} IS NULL`
        )
      )
    );

  console.log(`[MONTHLY] Found ${dueBusinessesWithTeams.length} businesses due for processing`);

  if (dueBusinessesWithTeams.length === 0) {
    console.log('[MONTHLY] No businesses to process');
    return;
  }

  // Batch process with concurrency limit (avoid overwhelming APIs)
  const BATCH_SIZE = 10; // Process 10 businesses concurrently
  const results = {
    success: 0,
    failed: 0,
    skipped: 0,
  };

  for (let i = 0; i < dueBusinessesWithTeams.length; i += BATCH_SIZE) {
    const batch = dueBusinessesWithTeams.slice(i, i + BATCH_SIZE);
    console.log(`[MONTHLY] Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(dueBusinessesWithTeams.length / BATCH_SIZE)}`);

    const batchResults = await Promise.allSettled(
      batch.map(({ business, team }) => processBusinessMonthly(business, team))
    );

    batchResults.forEach((result, idx) => {
      if (result.status === 'fulfilled') {
        if (result.value === 'success') results.success++;
        else if (result.value === 'skipped') results.skipped++;
        else results.failed++;
      } else {
        console.error(`[MONTHLY] Business ${batch[idx].business.id} failed:`, result.reason);
        results.failed++;
      }
    });
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`[MONTHLY] Processing completed in ${duration}s`);
  console.log(`[MONTHLY] Results: ${results.success} success, ${results.skipped} skipped, ${results.failed} failed`);
}

/**
 * Process a single business for monthly update
 * 
 * Flow:
 * 1. Run crawl + fingerprint in parallel (independent operations)
 * 2. After crawl completes, run publish (if Pro tier)
 * 3. Schedule next month's processing
 */
async function processBusinessMonthly(
  business: Business,
  team: Team
): Promise<'success' | 'skipped' | 'failed'> {
  try {
    const config = getAutomationConfig(team);
    
    // Skip if automation not configured
    if (config.crawlFrequency === 'manual') {
      return 'skipped';
    }

    console.log(`[MONTHLY] Processing business ${business.id} (${business.name})`);

    // STEP 1: Run crawl + fingerprint in parallel (they're independent!)
    const [crawlResult, fingerprintResult] = await Promise.allSettled([
      executeCrawlJob(null, business.id),
      executeFingerprint(business),
    ]);

    // Log results
    if (crawlResult.status === 'fulfilled') {
      console.log(`[MONTHLY] Crawl completed for business ${business.id}`);
    } else {
      console.error(`[MONTHLY] Crawl failed for business ${business.id}:`, crawlResult.reason);
    }

    if (fingerprintResult.status === 'fulfilled') {
      console.log(`[MONTHLY] Fingerprint completed for business ${business.id}`);
    } else {
      console.error(`[MONTHLY] Fingerprint failed for business ${business.id}:`, fingerprintResult.reason);
    }

    // STEP 2: Publish depends on crawl, so run after crawl completes
    if (crawlResult.status === 'fulfilled' && config.autoPublish) {
      try {
        await handleAutoPublish(business.id);
        console.log(`[MONTHLY] Publication completed for business ${business.id}`);
      } catch (error) {
        console.error(`[MONTHLY] Publication failed for business ${business.id}:`, error);
        // Don't fail entire process if publish fails
      }
    }

    // STEP 3: Schedule next month's processing
    const nextMonth = calculateNextCrawlDate('monthly');
    await updateBusiness(business.id, {
      nextCrawlAt: nextMonth,
    });

    console.log(`[MONTHLY] Business ${business.id} scheduled for next month: ${nextMonth.toISOString()}`);

    return 'success';
  } catch (error) {
    console.error(`[MONTHLY] Error processing business ${business.id}:`, error);
    return 'failed';
  }
}
