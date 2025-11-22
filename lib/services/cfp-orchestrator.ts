/**
 * CFP Orchestrator Service
 * 
 * Automated CFP (Crawl, Fingerprint, Publish) flow that takes a single URL input
 * and produces a complete JSON entity by orchestrating the @crawler, @llm, and @wikidata services.
 * 
 * Features:
 * - Single URL input → Complete JSON entity output
 * - Parallel execution of crawl and fingerprint operations
 * - Automatic Wikidata entity creation and publishing
 * - Comprehensive error handling and fallbacks
 * - Progress tracking and detailed logging
 * - Mock data support for development/testing
 * 
 * Architecture:
 * URL → [Crawl + Fingerprint] → [Entity Creation] → [Publish] → JSON Entity
 */

import 'server-only';

import { webCrawler } from '@/lib/crawler';
import { businessFingerprinter } from '@/lib/llm';
import { wikidataService } from '@/lib/wikidata';
import type { CrawledData } from '@/lib/types/gemflush';
import type { FingerprintAnalysis } from '@/lib/llm/types';
import type { WikidataEntity, PublishResult } from '@/lib/wikidata/types';
import { loggers } from '@/lib/utils/logger';

const log = loggers.processing;

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

export interface CFPInput {
  url: string;
  options?: {
    /** Whether to publish to test.wikidata.org (default) or production */
    publishTarget?: 'test' | 'production';
    /** Whether to include fingerprint analysis in output */
    includeFingerprint?: boolean;
    /** Whether to actually publish to Wikidata or just create entity */
    shouldPublish?: boolean;
    /** Maximum time to wait for operations (ms) */
    timeout?: number;
    /** Whether to use mock data if available */
    allowMockData?: boolean;
  };
}

export interface CFPResult {
  success: boolean;
  url: string;
  entity: WikidataEntity | null;
  publishResult?: PublishResult;
  
  // Processing results
  crawlData?: CrawledData;
  fingerprintAnalysis?: FingerprintAnalysis;
  
  // Metadata
  processingTime: number;
  timestamp: Date;
  
  // Error information
  error?: string;
  partialResults?: {
    crawlSuccess: boolean;
    fingerprintSuccess: boolean;
    entityCreationSuccess: boolean;
    publishSuccess: boolean;
  };
}

export interface CFPProgress {
  stage: 'crawling' | 'fingerprinting' | 'creating_entity' | 'publishing' | 'completed' | 'failed';
  progress: number; // 0-100
  message: string;
  timestamp: Date;
}

export type CFPProgressCallback = (progress: CFPProgress) => void;

// ============================================================================
// MAIN CFP ORCHESTRATOR CLASS
// ============================================================================

export class CFPOrchestrator {
  private readonly DEFAULT_TIMEOUT = 60000; // 60 seconds
  
  /**
   * Execute complete CFP flow from URL to JSON entity
   */
  async executeCFPFlow(
    input: CFPInput,
    progressCallback?: CFPProgressCallback
  ): Promise<CFPResult> {
    const startTime = Date.now();
    const { url, options = {} } = input;
    
    // Set defaults
    const config = {
      publishTarget: options.publishTarget || 'test',
      includeFingerprint: options.includeFingerprint !== false,
      shouldPublish: options.shouldPublish !== false,
      timeout: options.timeout || this.DEFAULT_TIMEOUT,
      allowMockData: options.allowMockData !== false,
    };
    
    log.info('Starting CFP flow', {
      url,
      config,
      timestamp: new Date().toISOString()
    });
    
    const updateProgress = (stage: CFPProgress['stage'], progress: number, message: string) => {
      const progressUpdate: CFPProgress = {
        stage,
        progress,
        message,
        timestamp: new Date()
      };
      progressCallback?.(progressUpdate);
      log.info(`CFP Progress: ${stage} (${progress}%)`, { message, url });
    };
    
    try {
      // Validate URL
      this.validateUrl(url);
      
      updateProgress('crawling', 10, 'Starting crawl and fingerprint operations...');
      
      // Phase 1: Execute Crawl and Fingerprint in parallel
      // Build promises array conditionally to avoid null in Promise.allSettled
      const promises: Array<Promise<any>> = [
        this.executeCrawlWithTimeout(url, config.timeout / 2)
      ];
      
      if (config.includeFingerprint) {
        promises.push(this.executeFingerprintWithTimeout(url, config.timeout / 2));
      }
      
      const settledResults = await Promise.allSettled(promises);
      const crawlResult = settledResults[0];
      const fingerprintResult = config.includeFingerprint ? settledResults[1] : undefined;
      
      // Process crawl results
      let crawlData: CrawledData | undefined;
      let crawlSuccess = false;
      
      if (crawlResult.status === 'fulfilled' && crawlResult.value.success) {
        crawlData = crawlResult.value.data;
        crawlSuccess = true;
        updateProgress('crawling', 40, 'Crawl completed successfully');
      } else {
        const error = crawlResult.status === 'rejected' ? crawlResult.reason : crawlResult.value.error;
        log.warn('Crawl failed, continuing with limited data', { url, error });
        updateProgress('crawling', 40, 'Crawl failed, using fallback data');
      }
      
      // Process fingerprint results
      let fingerprintAnalysis: FingerprintAnalysis | undefined = undefined;
      let fingerprintSuccess = false;
      
      if (config.includeFingerprint && fingerprintResult) {
        if (fingerprintResult.status === 'fulfilled') {
          fingerprintAnalysis = fingerprintResult.value ?? undefined; // Ensure undefined not null
          fingerprintSuccess = true;
          updateProgress('fingerprinting', 60, 'Fingerprint analysis completed');
        } else {
          log.warn('Fingerprint failed, continuing without analysis', { 
            url, 
            error: fingerprintResult.reason 
          });
          updateProgress('fingerprinting', 60, 'Fingerprint failed, continuing without analysis');
          fingerprintAnalysis = undefined; // Explicitly set to undefined
        }
      } else {
        updateProgress('fingerprinting', 60, 'Fingerprint skipped');
        fingerprintSuccess = true; // Not an error if skipped
        fingerprintAnalysis = undefined; // Explicitly set to undefined
      }
      
      // Phase 2: Create Wikidata Entity
      updateProgress('creating_entity', 70, 'Creating Wikidata entity...');
      
      const businessData = this.createBusinessDataFromUrl(url, crawlData);
      let entity: WikidataEntity | null = null;
      let entityCreationSuccess = false;
      
      let publishResult: PublishResult | undefined;
      let publishSuccess = false;
      
      try {
        // createAndPublishEntity already publishes, use dryRun to control publishing
        const entityResult = await wikidataService.createAndPublishEntity(
          businessData,
          crawlData,
          {
            target: config.publishTarget,
            dryRun: !config.shouldPublish, // If shouldPublish is false, use dryRun to skip publishing
            includeReferences: true,
            maxProperties: 10,
            maxQIDs: 10,
            qualityThreshold: 0.7,
            enhanceData: true
          }
        );
        
        entity = entityResult.entity;
        publishResult = entityResult.result; // publishResult is included in the response
        entityCreationSuccess = true;
        publishSuccess = publishResult.success;
        
        if (config.shouldPublish) {
          updateProgress('creating_entity', 85, 'Entity created and published successfully');
        } else {
          updateProgress('creating_entity', 85, 'Entity created successfully (not published)');
        }
        
      } catch (error) {
        log.error('Entity creation failed', error, { url });
        updateProgress('creating_entity', 85, 'Entity creation failed');
      }
      
      if (!config.shouldPublish && entityCreationSuccess) {
        updateProgress('publishing', 100, 'Publishing skipped');
        publishSuccess = true; // Not an error if skipped
      }
      
      // Calculate overall success
      const overallSuccess = crawlSuccess && fingerprintSuccess && entityCreationSuccess && publishSuccess;
      
      const processingTime = Date.now() - startTime;
      
      const result: CFPResult = {
        success: overallSuccess,
        url,
        entity,
        publishResult,
        crawlData,
        fingerprintAnalysis,
        processingTime,
        timestamp: new Date(),
        partialResults: {
          crawlSuccess,
          fingerprintSuccess,
          entityCreationSuccess,
          publishSuccess
        }
      };
      
      if (overallSuccess) {
        updateProgress('completed', 100, 'CFP flow completed successfully');
        log.info('CFP flow completed successfully', {
          url,
          processingTime,
          publishedQID: publishResult?.qid
        });
      } else {
        updateProgress('failed', 100, 'CFP flow completed with partial failures');
        log.warn('CFP flow completed with partial failures', {
          url,
          processingTime,
          partialResults: result.partialResults
        });
      }
      
      return result;
      
    } catch (error) {
      const processingTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      updateProgress('failed', 100, `CFP flow failed: ${errorMessage}`);
      log.error('CFP flow failed', error, { url, processingTime });
      
      return {
        success: false,
        url,
        entity: null,
        fingerprintAnalysis: undefined, // Ensure undefined not null
        processingTime,
        timestamp: new Date(),
        error: errorMessage
      };
    }
  }
  
  /**
   * Execute crawl operation with timeout
   */
  private async executeCrawlWithTimeout(url: string, timeout: number) {
    return Promise.race([
      webCrawler.crawl(url),
      new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Crawl timeout')), timeout)
      )
    ]);
  }
  
  /**
   * Execute fingerprint operation with timeout
   */
  private async executeFingerprintWithTimeout(url: string, timeout: number): Promise<FingerprintAnalysis> {
    // Create minimal business context for fingerprinting
    const businessContext = {
      name: this.extractBusinessNameFromUrl(url),
      url,
      location: { city: 'Unknown', state: 'Unknown', country: 'US' },
      category: 'business'
    };
    
    return Promise.race([
      businessFingerprinter.fingerprintWithContext(businessContext),
      new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Fingerprint timeout')), timeout)
      )
    ]);
  }
  
  /**
   * Create business data object from URL and crawl data
   */
  private createBusinessDataFromUrl(url: string, crawlData?: CrawledData): any {
    const businessName = crawlData?.name || this.extractBusinessNameFromUrl(url);
    
    return {
      id: 0, // Temporary ID for entity creation
      name: businessName,
      url,
      category: crawlData?.businessDetails?.industry || 'business',
      location: crawlData?.location || { city: 'Unknown', state: 'Unknown', country: 'US' },
      status: 'crawled',
      crawlData,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }
  
  /**
   * Extract business name from URL
   */
  private extractBusinessNameFromUrl(url: string): string {
    try {
      const parsedUrl = new URL(url);
      const domain = parsedUrl.hostname.replace('www.', '');
      const parts = domain.split('.');
      
      // Take the main domain part (before TLD)
      const mainPart = parts[0];
      
      // Capitalize first letter and clean up
      return mainPart.charAt(0).toUpperCase() + mainPart.slice(1);
    } catch {
      return 'Unknown Business';
    }
  }
  
  /**
   * Validate URL format
   */
  private validateUrl(url: string): void {
    try {
      const parsedUrl = new URL(url);
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        throw new Error('Only HTTP and HTTPS URLs are supported');
      }
    } catch (error) {
      throw new Error(`Invalid URL format: ${url}`);
    }
  }
}

// ============================================================================
// SINGLETON INSTANCE AND CONVENIENCE FUNCTIONS
// ============================================================================

export const cfpOrchestrator = new CFPOrchestrator();

/**
 * Execute CFP flow with a single URL - convenience function
 */
export async function executeCFPFlow(
  url: string,
  options?: CFPInput['options'],
  progressCallback?: CFPProgressCallback
): Promise<CFPResult> {
  return cfpOrchestrator.executeCFPFlow({ url, options }, progressCallback);
}

/**
 * Execute CFP flow and return only the JSON entity - simplified interface
 */
export async function createEntityFromUrl(
  url: string,
  options?: Omit<CFPInput['options'], 'shouldPublish'>
): Promise<WikidataEntity | null> {
  const result = await cfpOrchestrator.executeCFPFlow({
    url,
    options: { ...options, shouldPublish: false }
  });
  
  return result.entity;
}

/**
 * Execute complete CFP flow with publishing - full automation
 */
export async function crawlFingerprintAndPublish(
  url: string,
  options?: CFPInput['options'],
  progressCallback?: CFPProgressCallback
): Promise<CFPResult> {
  return cfpOrchestrator.executeCFPFlow({
    url,
    options: { ...options, shouldPublish: true }
  }, progressCallback);
}

// Types are already exported above via the interface/type declarations
