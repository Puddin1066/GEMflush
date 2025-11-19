// Business Processing Service
// SOLID: Single Responsibility - handles automatic business processing (crawl + fingerprint)
// DRY: Centralizes auto-processing logic
// Optimized: Runs crawl and fingerprint in parallel for faster processing

import { Business } from '@/lib/db/schema';
import { getBusinessById, updateBusiness, createCrawlJob, updateCrawlJob, getTeamForUser, getTeamForBusiness } from '@/lib/db/queries';
import { webCrawler } from '@/lib/crawler';
import { llmFingerprinter } from '@/lib/llm/fingerprinter';
import { db } from '@/lib/db/drizzle';
import { llmFingerprints } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import { getFingerprintFrequency } from '@/lib/gemflush/permissions';
import { getAutomationConfig, shouldAutoPublish, calculateNextCrawlDate } from './automation-service';
import { validateCrawledData } from '@/lib/validation/crawl';
import { loggers } from '@/lib/utils/logger';

const log = loggers.processing;

/**
 * Check if crawl is needed (cache logic)
 * DRY: Centralized crawl caching logic
 * 
 * @param business - Business to check
 * @returns true if crawl is needed, false if cached result is valid
 */
export async function shouldCrawl(business: Business): Promise<boolean> {
  // If no crawl data exists, crawl is needed
  if (!business.crawlData || !business.lastCrawledAt) {
    return true;
  }
  
  // If URL changed, crawl is needed
  // Note: We'd need to store originalUrl to detect changes, but for now
  // we'll re-crawl if last crawl was > 24 hours ago
  const hoursSinceCrawl = (Date.now() - new Date(business.lastCrawledAt).getTime()) / (1000 * 60 * 60);
  
  // Re-crawl if last crawl was > 24 hours ago (cache TTL)
  return hoursSinceCrawl >= 24;
}

/**
 * Check if fingerprint can be run (frequency enforcement)
 * DRY: Centralized frequency checking logic
 * 
 * @param business - Business to check
 * @param team - Team to check frequency limits
 * @returns true if fingerprint can be run, false if too soon
 */
export async function canRunFingerprint(business: Business, team: any): Promise<boolean> {
  const frequency = getFingerprintFrequency(team);
  
  // Get latest fingerprint for this business
  const [latestFingerprint] = await db
    .select()
    .from(llmFingerprints)
    .where(eq(llmFingerprints.businessId, business.id))
    .orderBy(desc(llmFingerprints.createdAt))
    .limit(1);
  
  // If no previous fingerprint, allow
  if (!latestFingerprint || !latestFingerprint.createdAt) {
    return true;
  }
  
  const daysSinceLast = (Date.now() - new Date(latestFingerprint.createdAt).getTime()) / (1000 * 60 * 60 * 24);
  
  // Enforce frequency limits (DRY: reuse plan frequency logic)
  if (frequency === 'monthly' && daysSinceLast < 30) {
    console.log(`[PROCESSING] Fingerprint skipped - last run ${daysSinceLast.toFixed(1)} days ago (monthly limit)`);
    return false;
  }
  
  if (frequency === 'weekly' && daysSinceLast < 7) {
    console.log(`[PROCESSING] Fingerprint skipped - last run ${daysSinceLast.toFixed(1)} days ago (weekly limit)`);
    return false;
  }
  
  return true;
}

/**
 * Execute crawl job with retry logic (extracted from route for reuse)
 * SOLID: Single Responsibility - handles crawl execution
 * DRY: Centralizes retry logic for reliability
 */
export async function executeCrawlJob(jobId: number | null, businessId: number, business?: Business): Promise<void> {
  const MAX_RETRIES = 3;
  const RETRY_DELAY_BASE = 2000; // 2 seconds base delay
  const operationId = log.start('Crawl Job', { businessId, jobId: jobId || 'auto' });
  
  try {
    // OPTIMIZATION: Batch status updates
    const updatePromises: Promise<unknown>[] = [];
    
    if (jobId) {
      updatePromises.push(updateCrawlJob(jobId, {
        status: 'processing',
      }));
    }
    
    updatePromises.push(updateBusiness(businessId, {
      status: 'crawling',
    }));
    
    await Promise.all(updatePromises);
    log.statusChange('pending', 'crawling', { businessId, jobId: jobId || 'auto' });
    
    // OPTIMIZATION: Use passed business object if available, otherwise fetch
    let businessData: Business | null = business || null;
    if (!businessData) {
      businessData = await getBusinessById(businessId);
      if (!businessData) {
        throw new Error('Business not found');
      }
    }
    
    // Execute crawl with retry logic
    let result;
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      const attemptStartTime = Date.now();
      try {
        log.info(`Crawl attempt ${attempt}/${MAX_RETRIES}`, {
          businessId,
          jobId: jobId || 'auto',
          attempt,
          maxAttempts: MAX_RETRIES,
          url: businessData.url,
        });
        
        result = await webCrawler.crawl(businessData.url);
        
        const attemptDuration = Date.now() - attemptStartTime;
        log.performance(`Crawl attempt ${attempt}`, attemptDuration, {
          businessId,
          attempt,
          success: result.success,
        });
        
        // If successful, break out of retry loop
        if (result.success && result.data) {
          log.info(`Crawl attempt ${attempt} succeeded`, {
            businessId,
            attempt,
            duration: attemptDuration,
          });
          break;
        }
        
        // If failed, store error for retry
        lastError = new Error(result.error || 'Crawl failed');
        log.warn(`Crawl attempt ${attempt} failed`, {
          businessId,
          attempt,
          maxAttempts: MAX_RETRIES,
          error: lastError.message,
          duration: attemptDuration,
        });
        
        // If not last attempt, wait before retrying (exponential backoff)
        if (attempt < MAX_RETRIES) {
          const delay = RETRY_DELAY_BASE * Math.pow(2, attempt - 1); // 2s, 4s, 8s
          log.retry(attempt, MAX_RETRIES, 'Crawl', delay, {
            businessId,
            url: businessData.url,
          });
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown crawl error');
        const attemptDuration = Date.now() - attemptStartTime;
        log.error(`Crawl attempt ${attempt} exception`, error, {
          businessId,
          attempt,
          maxAttempts: MAX_RETRIES,
          duration: attemptDuration,
        });
        
        // If not last attempt, wait before retrying
        if (attempt < MAX_RETRIES) {
          const delay = RETRY_DELAY_BASE * Math.pow(2, attempt - 1);
          log.retry(attempt, MAX_RETRIES, 'Crawl', delay, {
            businessId,
            url: businessData.url,
          });
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    // Check if we have a successful result after retries
    if (!result || !result.success || !result.data) {
      const errorMessage = lastError?.message || result?.error || 'Unknown error after retries';
      
      log.error('Crawl failed after all retries', lastError || new Error(errorMessage), {
        businessId,
        jobId: jobId || 'auto',
        url: businessData?.url,
        attempts: MAX_RETRIES,
      });
      
      // Only set to error after all retries fail
      await updateBusiness(businessId, {
        status: 'error',
      });
      log.statusChange('crawling', 'error', { businessId, jobId: jobId || 'auto' });
      
      if (jobId) {
        await updateCrawlJob(jobId, {
          status: 'failed',
          errorMessage: `Failed after ${MAX_RETRIES} attempts: ${errorMessage}`,
          completedAt: new Date(),
        }).catch(err => {
          log.error('Failed to update crawl job status', err, { businessId, jobId });
        });
      }
      
      log.complete(operationId, 'Crawl Job', {
        businessId,
        jobId: jobId || 'auto',
        status: 'failed',
        attempts: MAX_RETRIES,
      });
      
      throw new Error(`Crawl failed after ${MAX_RETRIES} attempts: ${errorMessage}`);
    }
    
    // Success! Process the result
    log.info('Crawl succeeded', { businessId, jobId: jobId || 'auto' });
    
    if (result.success && result.data) {
      // Validate crawl data before storage (DRY: use validation schema)
      const validation = validateCrawledData(result.data);
      if (!validation.success) {
        const validationError = new Error(
          `Crawl data validation failed: ${validation.errors?.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')}`
        );
        log.error('Crawl data validation failed', validationError, {
          businessId,
          validationErrors: validation.errors,
        });
        throw validationError;
      }
      
      log.info('Crawl data validation passed', { businessId });
      
      // OPTIMIZATION: Get team/config only if needed for automation
      // Note: auto-publish is handled in autoStartProcessing, so we skip here
      // This reduces database queries when crawl is called standalone
      const shouldScheduleNext = businessData.automationEnabled;
      let team = null;
      let config = null;
      let nextCrawlAt: Date | undefined = undefined;
      
      if (shouldScheduleNext) {
        team = await getTeamForBusiness(businessId);
        config = getAutomationConfig(team);
        if (config && config.crawlFrequency !== 'manual') {
          nextCrawlAt = calculateNextCrawlDate(config.crawlFrequency);
        }
      }
      
      // OPTIMIZATION: Batch business and job updates
      const updatePromises: Promise<unknown>[] = [];
      
      // IDEAL: Update location if crawl extracted it and business doesn't have one
      const updateData: {
        status: string;
        crawlData: typeof result.data;
        lastCrawledAt: Date;
        location?: { city: string; state: string; country: string; coordinates?: { lat: number; lng: number } };
        name?: string;
        nextCrawlAt?: Date;
      } = {
        status: 'crawled',
        crawlData: result.data,
        lastCrawledAt: new Date(),
      };
      
      // Update location if crawl extracted it and business location is missing
      if (result.data.location && 
          result.data.location.city && result.data.location.city !== 'Unknown' &&
          result.data.location.state && result.data.location.state !== 'Unknown') {
        // Only update if business doesn't have location or has temporary location
        if (!businessData.location || 
            !businessData.location.city || 
            businessData.location.city === 'Temporary' ||
            !businessData.location.state ||
            businessData.location.state === 'XX') {
          // Ensure city and state are strings (required by schema)
          const crawledCity = result.data.location.city;
          const crawledState = result.data.location.state;
          if (crawledCity && crawledState) {
            updateData.location = {
              city: crawledCity,
              state: crawledState,
              country: result.data.location.country || 'US',
              ...(result.data.location.lat && result.data.location.lng ? {
                coordinates: {
                  lat: result.data.location.lat,
                  lng: result.data.location.lng,
                }
              } : {}),
            };
            log.info('Updating business location from crawl data', { businessId });
          }
        }
      }
      
      // Update name if crawl extracted it and business has default name
      if (result.data.name && 
          businessData.name && 
          (businessData.name === 'Business' || businessData.name === 'Unknown Business')) {
        updateData.name = result.data.name;
        log.info('Updating business name from crawl data', { businessId, name: result.data.name });
      }
      
      if (nextCrawlAt) {
        updateData.nextCrawlAt = nextCrawlAt;
      }
      
      updatePromises.push(updateBusiness(businessId, updateData));
      
      if (jobId) {
        updatePromises.push(updateCrawlJob(jobId, {
          status: 'completed',
          progress: 100,
          result: { crawledData: result.data },
          completedAt: new Date(),
        }));
      }
      
      await Promise.all(updatePromises);
      log.statusChange('crawling', 'crawled', {
        businessId,
        jobId: jobId || 'auto',
        nextCrawlAt: nextCrawlAt?.toISOString(),
      });
      
      // Trigger auto-publish if enabled (fire and forget)
      // Only if team was fetched and auto-publish is enabled
      // Note: In autoStartProcessing, this is handled explicitly, so this is for standalone crawl calls
      if (team && shouldAutoPublish(businessData, team)) {
        log.info('Scheduling auto-publish after crawl', { businessId });
        // Use dynamic import to avoid circular dependency
        import('./scheduler-service').then(({ handleAutoPublish }) => {
          handleAutoPublish(businessId).catch(error => {
            log.error('Auto-publish failed after crawl', error, { businessId });
          });
        }).catch(error => {
          log.error('Failed to load scheduler service for auto-publish', error, { businessId });
        });
      }
      
      log.complete(operationId, 'Crawl Job', {
        businessId,
        jobId: jobId || 'auto',
        status: 'crawled',
        nextCrawlAt: nextCrawlAt?.toISOString(),
      });
    }
  } catch (error) {
    log.error('Crawl job error', error, {
      businessId,
      jobId: jobId || 'auto',
    });
    
    // Update job status if job exists
    if (jobId) {
      await updateCrawlJob(jobId, {
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        completedAt: new Date(),
      }).catch(err => {
        log.error('Failed to update crawl job status to failed', err, { businessId, jobId });
      });
    }
    
    // Update business status
    await updateBusiness(businessId, {
      status: 'error',
    }).catch(err => {
      log.error('Failed to update business status to error', err, { businessId });
    });
    
    log.complete(operationId, 'Crawl Job', {
      businessId,
      jobId: jobId || 'auto',
      status: 'error',
    });
    
    throw error;
  }
}

/**
 * Execute fingerprint (extracted from route for reuse)
 * SOLID: Single Responsibility - handles fingerprint execution
 * 
 * @param business - Business to fingerprint
 * @param updateStatus - Whether to update business status during processing (default: true)
 * @returns Updated business object after fingerprint
 */
export async function executeFingerprint(business: Business, updateStatus: boolean = true): Promise<Business> {
  const businessId = business.id;
  const operationId = log.start('Fingerprint', { businessId });
  
  try {
    // Update status to 'generating' to show progress in UI
    if (updateStatus) {
      await updateBusiness(businessId, {
        status: 'generating',
      });
      log.statusChange('crawled', 'generating', { businessId });
    }
    
    // Run fingerprint analysis
    const fingerprintStartTime = Date.now();
    const analysis = await llmFingerprinter.fingerprint(business);
    const fingerprintDuration = Date.now() - fingerprintStartTime;
    
    log.performance('Fingerprint analysis', fingerprintDuration, {
      businessId,
      visibilityScore: analysis.visibilityScore,
      mentionRate: analysis.mentionRate,
    });
    
    // Save fingerprint to database
    await db.insert(llmFingerprints).values({
      businessId: businessId,
      visibilityScore: Math.round(analysis.visibilityScore),
      mentionRate: analysis.mentionRate,
      sentimentScore: analysis.sentimentScore,
      accuracyScore: analysis.accuracyScore,
      avgRankPosition: analysis.avgRankPosition,
      llmResults: analysis.llmResults as unknown as Record<string, unknown>,
      competitiveLeaderboard: analysis.competitiveLeaderboard as unknown as Record<string, unknown>,
      createdAt: new Date(),
    });
    
    // Update business status back to 'crawled' (fingerprint doesn't change business status fundamentally)
    // Status will be updated to 'generating' → 'published' after publish completes
    // Only update to 'crawled' if status is still 'generating' (don't overwrite if publish already started)
    if (updateStatus) {
      // Check current status before updating (publish might have started)
      const currentBusiness = await getBusinessById(businessId);
      if (currentBusiness && currentBusiness.status === 'generating') {
        await updateBusiness(businessId, {
          status: 'crawled', // Fingerprint completed, ready for publish
        });
        log.statusChange('generating', 'crawled', { businessId });
      }
    }
    
    // Fetch updated business to return
    const updatedBusiness = await getBusinessById(businessId);
    if (!updatedBusiness) {
      throw new Error('Business not found after fingerprint');
    }
    
    log.complete(operationId, 'Fingerprint', {
      businessId,
      visibilityScore: analysis.visibilityScore,
      mentionRate: analysis.mentionRate,
      sentimentScore: analysis.sentimentScore,
    });
    
    return updatedBusiness;
  } catch (error) {
    log.error('Fingerprint error', error, { businessId });
    
    // Update status to error if updateStatus is enabled
    if (updateStatus) {
      await updateBusiness(businessId, {
        status: 'error',
      }).catch(err => {
        log.error('Failed to update business status after fingerprint error', err, { businessId });
      });
    }
    
    log.complete(operationId, 'Fingerprint', {
      businessId,
      status: 'error',
    });
    
    // Return original business on error (don't throw - fingerprint failure shouldn't block)
    return business;
  }
}

/**
 * Auto-start sequential processing for new business (Pro tier only)
 * SOLID: Single Responsibility - handles auto-processing orchestration
 * DRY: Centralizes sequential processing logic
 * OPTIMIZED: Reduces database queries by passing objects and caching team/config
 * 
 * For Pro tier: Automatically runs crawl → fingerprint → publish in sequence
 * For Free tier: No automatic processing
 * 
 * @param business - Newly created business
 */
export async function autoStartProcessing(business: Business): Promise<void> {
  const businessId = business.id;
  const operationId = log.start('Auto-Processing Pipeline', {
    businessId,
    businessName: business.name,
    url: business.url,
  });
  
  // Early validation: Check if business has required fields
  if (!business.url) {
    log.warn('Business missing URL - skipping auto-processing', { businessId });
    // Update status to indicate manual intervention needed
    await updateBusiness(businessId, {
      status: 'pending',
    }).catch(err => {
      log.error('Failed to update business status', err, { businessId });
    });
    return;
  }
  
  // IDEAL: Location is not required upfront - crawl will extract it
  // Only warn if location is missing (crawl will try to extract it)
  if (!business.location || !business.location.city || !business.location.state) {
    log.info('Business missing location - crawl will attempt to extract it', {
      businessId,
      hasLocation: !!business.location,
      url: business.url,
    });
    // Don't return - continue with crawl which will extract location
  }
  
  // OPTIMIZATION: Get team once and cache config (used multiple times)
  const team = await getTeamForBusiness(businessId);
  if (!team) {
    log.warn('No team found - skipping auto-processing', { businessId });
    // Update status to indicate issue
    await updateBusiness(businessId, {
      status: 'pending',
    }).catch(err => {
      log.error('Failed to update business status', err, { businessId });
    });
    return;
  }
  
  // OPTIMIZATION: Calculate config once and reuse
  const config = getAutomationConfig(team);
  if (config.crawlFrequency === 'manual' || !config.autoPublish) {
    log.info('Auto-processing skipped - not Pro tier', {
      businessId,
      crawlFrequency: config.crawlFrequency,
      autoPublish: config.autoPublish,
      planName: team.planName,
    });
    // For Free tier, status should remain 'pending' (manual processing)
    // Don't update status here - let user manually trigger processing
    return;
  }
  
  // OPTIMIZATION: Batch automation setup with next crawl date
  const nextCrawlAt = calculateNextCrawlDate(config.crawlFrequency);
  await updateBusiness(businessId, {
    automationEnabled: true,
    nextCrawlAt,
  });
  log.info('Automation enabled (Pro tier)', {
    businessId,
    planName: team.planName,
    crawlFrequency: config.crawlFrequency,
    nextCrawlAt: nextCrawlAt.toISOString(),
  });
  
  // Sequential processing: crawl → fingerprint → publish
  // This ensures each step completes before the next starts
  let currentBusiness = business; // Cache business object to avoid re-fetching
  
  try {
    // Step 1: Crawl
    log.info('Step 1/3: Starting crawl', { businessId });
    const crawlStartTime = Date.now();
    
    const crawlJob = await createCrawlJob({
      businessId: businessId,
      jobType: 'initial_crawl',
      status: 'queued',
      progress: 0,
    });
    
    await executeCrawlJob(crawlJob.id, businessId);
    
    // OPTIMIZATION: Fetch business once after crawl (pass to next step)
    const crawledBusiness = await getBusinessById(businessId);
    if (!crawledBusiness) {
      throw new Error('Business not found after crawl');
    }
    currentBusiness = crawledBusiness;
    
    const crawlDuration = Date.now() - crawlStartTime;
    log.performance('Step 1/3: Crawl', crawlDuration, { businessId });
    
    // Step 2: Fingerprint (after crawl completes)
    log.info('Step 2/3: Starting fingerprint', { businessId });
    const fingerprintStartTime = Date.now();
    
    try {
      // OPTIMIZATION: Pass current business object instead of re-fetching
      currentBusiness = await executeFingerprint(currentBusiness, true);
      
      const fingerprintDuration = Date.now() - fingerprintStartTime;
      log.performance('Step 2/3: Fingerprint', fingerprintDuration, { businessId });
    } catch (fingerprintError) {
      const fingerprintDuration = Date.now() - fingerprintStartTime;
      log.error('Step 2/3: Fingerprint failed', fingerprintError, {
        businessId,
        duration: fingerprintDuration,
      });
      
      // Update status to error but continue to publish step (publish might still work)
      await updateBusiness(businessId, {
        status: 'crawled', // Keep as crawled even if fingerprint failed
      }).catch(err => {
        log.error('Failed to update business status after fingerprint error', err, { businessId });
      });
      
      // Re-fetch business for publish step
      const businessAfterFingerprint = await getBusinessById(businessId);
      if (businessAfterFingerprint) {
        currentBusiness = businessAfterFingerprint;
      }
      
      // Don't throw - allow publish to proceed even if fingerprint failed
      // User can manually retry fingerprint later
    }
    
    // Step 3: Auto-publish (after fingerprint completes)
    log.info('Step 3/3: Starting auto-publish', { businessId });
    const publishStartTime = Date.now();
    
    // OPTIMIZATION: Use current business object (no need to re-fetch)
    // Re-fetch to get latest status after fingerprint
    const businessForPublish = await getBusinessById(businessId);
    if (!businessForPublish) {
      throw new Error('Business not found before publish');
    }
    
    // IDEAL: Log publish conditions for debugging
    const shouldPublish = shouldAutoPublish(businessForPublish, team);
    log.info('Step 3/3: Checking auto-publish conditions', {
      businessId,
      status: businessForPublish.status,
      autoPublish: config.autoPublish,
      hasWikidataQID: !!businessForPublish.wikidataQID,
      shouldAutoPublish: shouldPublish,
    });
    console.log(`[DEBUG] autoStartProcessing: shouldAutoPublish=${shouldPublish}, status=${businessForPublish.status}, autoPublish=${config.autoPublish}`);
    
    if (shouldAutoPublish(businessForPublish, team)) {
      try {
        // Use scheduler service for auto-publish
        const { handleAutoPublish } = await import('./scheduler-service');
        log.info('Step 3/3: Calling handleAutoPublish', { businessId });
        await handleAutoPublish(businessId);
        
        // Verify publish completed
        const businessAfterPublish = await getBusinessById(businessId);
        log.info('Step 3/3: Publish completed', {
          businessId,
          status: businessAfterPublish?.status,
          qid: businessAfterPublish?.wikidataQID,
        });
        
        const publishDuration = Date.now() - publishStartTime;
        log.performance('Step 3/3: Auto-publish', publishDuration, { businessId });
      } catch (publishError) {
        const publishDuration = Date.now() - publishStartTime;
        log.error('Step 3/3: Auto-publish failed', publishError, {
          businessId,
          duration: publishDuration,
          errorMessage: publishError instanceof Error ? publishError.message : 'Unknown error',
          errorStack: publishError instanceof Error ? publishError.stack : undefined,
        });
        
        // Status is already set to 'error' by handleAutoPublish on failure
        // Don't throw - allow business creation to succeed even if publish fails
        // User can retry publish manually
      }
    } else {
      log.info('Step 3/3: Auto-publish skipped - conditions not met', {
        businessId,
        status: businessForPublish.status,
        autoPublish: config.autoPublish,
        hasWikidataQID: !!businessForPublish.wikidataQID,
        shouldAutoPublishResult: shouldAutoPublish(businessForPublish, team),
      });
    }
    
    // Verify final status
    const finalBusiness = await getBusinessById(businessId);
    log.complete(operationId, 'Auto-Processing Pipeline', {
      businessId,
      finalStatus: finalBusiness?.status,
      published: finalBusiness?.wikidataQID ? `Yes (${finalBusiness.wikidataQID})` : 'No',
      visibilityScore: currentBusiness ? 'completed' : 'unknown',
    });
  } catch (error) {
    log.error('Auto-processing error', error, { businessId });
    
    // Update business status to error if processing failed
    await updateBusiness(businessId, {
      status: 'error',
    }).catch(err => {
      log.error('Failed to update business status after error', err, { businessId });
    });
    
    log.complete(operationId, 'Auto-Processing Pipeline', {
      businessId,
      status: 'error',
    });
    
    // Don't throw - allow business creation to succeed even if processing fails
  }
}

