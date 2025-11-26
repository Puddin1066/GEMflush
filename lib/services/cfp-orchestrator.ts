/**
 * CFP Orchestrator Service
 * 
 * Automated CFP (Crawl, Fingerprint, Publish) flow that takes a single URL input
 * and produces a complete JSON entity by orchestrating the @crawler, @llm, and @wikidata services.
 * 
 * Features:
 * - Single URL input → Complete JSON entity output
 * - Sequential execution: Crawl → Fingerprint (with crawl data) → Entity Creation → Publish
 * - Automatic Wikidata entity creation and publishing
 * - Comprehensive error handling and fallbacks
 * - Progress tracking and detailed logging
 * - Mock data support for development/testing
 * 
 * Architecture:
 * URL → Crawl → Fingerprint (with crawl data) → Entity Creation → Publish → JSON Entity
 */

import 'server-only';

import { webCrawler } from '@/lib/crawler';
import { businessFingerprinter } from '@/lib/llm';
import { wikidataService, WikidataClient } from '@/lib/wikidata';
import type { CrawledData } from '@/lib/types/domain/gemflush';
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
    
    const operationId = log.start('CFP flow execution', {
      url,
      publishTarget: config.publishTarget,
      includeFingerprint: config.includeFingerprint,
      shouldPublish: config.shouldPublish,
      timeout: config.timeout
    });
    
    const updateProgress = (stage: CFPProgress['stage'], progress: number, message: string) => {
      const progressUpdate: CFPProgress = {
        stage,
        progress,
        message,
        timestamp: new Date()
      };
      progressCallback?.(progressUpdate);
      log.info(`CFP Progress: ${stage} (${progress}%)`, { 
        operationId,
        message, 
        url,
        stage,
        progress 
      });
    };
    
    try {
      // Validate URL
      this.validateUrl(url);
      
      updateProgress('crawling', 10, 'Starting crawl operation...');
      
      // Phase 1: Execute Crawl first to get location data for fingerprinting
      const crawlResult = await Promise.allSettled([
        this.executeCrawlWithTimeout(url, config.timeout * 0.6) // Use 60% of timeout for crawl
      ]).then(results => results[0]);
      
      // Process crawl results
      let crawlData: CrawledData | undefined;
      let crawlSuccess = false;
      
      const crawlStartTime = Date.now();
      if (crawlResult.status === 'fulfilled' && crawlResult.value.success) {
        crawlData = crawlResult.value.data;
        crawlSuccess = true;
        const crawlDuration = Date.now() - crawlStartTime;
        updateProgress('crawling', 40, 'Crawl completed successfully');
        log.info('Crawl completed successfully', { 
          operationId,
          url, 
          duration: crawlDuration,
          hasLocation: !!crawlData?.location,
          location: crawlData?.location,
          businessName: crawlData?.name,
          hasBusinessDetails: !!crawlData?.businessDetails
        });
      } else {
        const error = crawlResult.status === 'rejected' ? crawlResult.reason : crawlResult.value.error;
        const crawlDuration = Date.now() - crawlStartTime;
        log.warn('Crawl failed, continuing with limited data', { 
          operationId,
          url, 
          error: error instanceof Error ? error.message : String(error),
          duration: crawlDuration,
          errorType: crawlResult.status === 'rejected' ? 'rejected' : 'failed'
        });
        updateProgress('crawling', 40, 'Crawl failed, using fallback data');
      }
      
      // Phase 1b: Execute Fingerprint with crawl data (if available)
      let fingerprintAnalysis: FingerprintAnalysis | undefined = undefined;
      let fingerprintSuccess = false;
      
      if (config.includeFingerprint) {
        updateProgress('fingerprinting', 45, 'Starting fingerprint analysis with crawl data...');
        const fingerprintStartTime = Date.now();
        const fingerprintResult = await Promise.allSettled([
          this.executeFingerprintWithTimeout(url, crawlData, config.timeout * 0.4) // Use remaining 40% for fingerprint
        ]).then(results => results[0]);
        
        const fingerprintDuration = Date.now() - fingerprintStartTime;
        
        if (fingerprintResult.status === 'fulfilled') {
          fingerprintAnalysis = fingerprintResult.value ?? undefined;
          fingerprintSuccess = true;
          updateProgress('fingerprinting', 60, 'Fingerprint analysis completed');
          log.info('Fingerprint analysis completed successfully', {
            operationId,
            url,
            duration: fingerprintDuration,
            visibilityScore: fingerprintAnalysis?.visibilityScore,
            mentionRate: fingerprintAnalysis?.mentionRate,
            hasLLMResults: !!fingerprintAnalysis?.llmResults
          });
        } else {
          const error = fingerprintResult.reason instanceof Error 
            ? fingerprintResult.reason.message 
            : String(fingerprintResult.reason);
          log.warn('Fingerprint failed, continuing without analysis', { 
            operationId,
            url, 
            error,
            duration: fingerprintDuration,
            errorType: 'fingerprint_failed'
          });
          updateProgress('fingerprinting', 60, 'Fingerprint failed, continuing without analysis');
          fingerprintAnalysis = undefined;
        }
      } else {
        updateProgress('fingerprinting', 60, 'Fingerprint skipped');
        log.debug('Fingerprint skipped by config', { operationId, url });
        fingerprintSuccess = true; // Not an error if skipped
        fingerprintAnalysis = undefined;
      }
      
      // Phase 2: Create Wikidata Entity (without publishing)
      updateProgress('creating_entity', 70, 'Creating Wikidata entity...');
      
      const businessData = this.createBusinessDataFromUrl(url, crawlData);
      let entity: WikidataEntity | null = null;
      let entityCreationSuccess = false;
      const entityStartTime = Date.now();
      
      try {
        log.info('Creating Wikidata entity', {
          operationId,
          url,
          businessName: businessData.name,
          hasCrawlData: !!crawlData,
          publishTarget: config.publishTarget
        });
        
        // Create entity without publishing (use dryRun: true)
        const entityResult = await wikidataService.createAndPublishEntity(
          businessData,
          crawlData,
          {
            target: config.publishTarget,
            dryRun: true, // Always create without publishing first
            includeReferences: true,
            maxProperties: 10,
            maxQIDs: 10,
            qualityThreshold: 0.7,
            enhanceData: true
          }
        );
        
        entity = entityResult.entity;
        entityCreationSuccess = true;
        const entityDuration = Date.now() - entityStartTime;
        updateProgress('creating_entity', 85, 'Entity created successfully');
        log.info('Entity created successfully', { 
          operationId,
          url, 
          hasEntity: !!entity,
          duration: entityDuration,
          propertyCount: entity ? Object.keys(entity.claims || {}).length : 0,
          label: entity?.labels?.en?.value
        });
        
      } catch (error) {
        const entityDuration = Date.now() - entityStartTime;
        log.error('Entity creation failed', error, { 
          operationId,
          url,
          duration: entityDuration,
          businessName: businessData.name
        });
        updateProgress('creating_entity', 85, 'Entity creation failed');
      }
      
      // Phase 3: Publish Entity (only if shouldPublish is true and entity was created)
      let publishResult: PublishResult | undefined;
      let publishSuccess = false;
      
      if (config.shouldPublish && entityCreationSuccess && entity) {
        updateProgress('publishing', 90, 'Publishing entity to Wikidata...');
        const publishStartTime = Date.now();
        
        try {
          log.info('Publishing entity to Wikidata', {
            operationId,
            url,
            publishTarget: config.publishTarget,
            entityLabel: entity.labels?.en?.value,
            propertyCount: Object.keys(entity.claims || {}).length
          });
          
          // Create a separate client instance for publishing
          const publishClient = new WikidataClient();
          publishResult = await publishClient.publishEntity(entity, {
            target: config.publishTarget,
            dryRun: false,
            includeReferences: true
          });
          
          publishSuccess = publishResult.success;
          const publishDuration = Date.now() - publishStartTime;
          
          if (publishSuccess) {
            updateProgress('publishing', 100, 'Entity published successfully');
            log.info('Entity published successfully', { 
              operationId,
              url, 
              qid: publishResult.qid,
              publishedTo: publishResult.publishedTo,
              duration: publishDuration,
              propertiesPublished: publishResult.propertiesPublished,
              referencesPublished: publishResult.referencesPublished
            });
          } else {
            updateProgress('publishing', 100, 'Publishing failed');
            log.warn('Publishing failed', { 
              operationId,
              url, 
              error: publishResult.error,
              duration: publishDuration,
              publishedTo: publishResult.publishedTo
            });
          }
        } catch (error) {
          const publishDuration = Date.now() - publishStartTime;
          log.error('Publishing failed with exception', error, { 
            operationId,
            url,
            duration: publishDuration,
            publishTarget: config.publishTarget
          });
          updateProgress('publishing', 100, 'Publishing failed');
          publishSuccess = false;
          publishResult = {
            success: false,
            publishedTo: config.publishTarget === 'production' ? 'wikidata.org' : 'test.wikidata.org',
            propertiesPublished: 0,
            referencesPublished: 0,
            error: error instanceof Error ? error.message : 'Unknown error'
          };
        }
      } else {
        if (!config.shouldPublish) {
          updateProgress('publishing', 100, 'Publishing skipped (shouldPublish: false)');
          log.debug('Publishing skipped by config', { operationId, url });
          publishSuccess = true; // Not an error if skipped
        } else if (!entityCreationSuccess) {
          updateProgress('publishing', 100, 'Publishing skipped (entity creation failed)');
          log.warn('Publishing skipped due to entity creation failure', { operationId, url });
          publishSuccess = false;
        } else {
          updateProgress('publishing', 100, 'Publishing skipped (no entity)');
          log.warn('Publishing skipped - no entity available', { operationId, url });
          publishSuccess = false;
        }
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
          operationId,
          url,
          processingTime,
          publishedQID: publishResult?.qid,
          hasEntity: !!entity,
          hasFingerprint: !!fingerprintAnalysis,
          hasCrawlData: !!crawlData
        });
        log.complete(operationId, 'CFP flow execution', {
          success: true,
          processingTime,
          publishedQID: publishResult?.qid
        });
      } else {
        updateProgress('failed', 100, 'CFP flow completed with partial failures');
        log.warn('CFP flow completed with partial failures', {
          operationId,
          url,
          processingTime,
          partialResults: result.partialResults,
          crawlSuccess: result.partialResults?.crawlSuccess,
          fingerprintSuccess: result.partialResults?.fingerprintSuccess,
          entityCreationSuccess: result.partialResults?.entityCreationSuccess,
          publishSuccess: result.partialResults?.publishSuccess
        });
        log.complete(operationId, 'CFP flow execution', {
          success: false,
          processingTime,
          partialResults: result.partialResults
        });
      }
      
      return result;
      
    } catch (error) {
      const processingTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      updateProgress('failed', 100, `CFP flow failed: ${errorMessage}`);
      log.error('CFP flow failed with exception', error, { 
        operationId,
        url, 
        processingTime 
      });
      log.complete(operationId, 'CFP flow execution', {
        success: false,
        error: errorMessage,
        processingTime
      });
      
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
   * Execute fingerprint operation with timeout, using crawl data if available
   */
  private async executeFingerprintWithTimeout(
    url: string, 
    crawlData?: CrawledData,
    timeout: number = 30000
  ): Promise<FingerprintAnalysis> {
    // Extract location from crawl data if available, otherwise omit it
    let location: { city?: string; state?: string; country?: string } | undefined;
    
    if (crawlData?.location) {
      // Only use location if it has valid city/state (not "Unknown")
      const loc = crawlData.location;
      if (loc.city && loc.city.toLowerCase() !== 'unknown' && 
          loc.state && loc.state.toLowerCase() !== 'unknown') {
        location = {
          city: loc.city,
          state: loc.state,
          country: loc.country || 'US'
        };
      }
    }
    
    // Create business context with crawl data
    const businessContext = {
      name: crawlData?.name || this.extractBusinessNameFromUrl(url),
      url,
      location,
      category: crawlData?.businessDetails?.industry || 'business',
      crawlData // Pass full crawl data for enhanced prompts
    };
    
    log.debug('Fingerprinting with context', {
      url,
      hasLocation: !!location,
      location,
      hasCrawlData: !!crawlData,
      businessName: businessContext.name,
      category: businessContext.category
    });
    
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
    
    // Only use location if it has valid city/state (not "Unknown")
    let location = crawlData?.location;
    if (location && (
      location.city?.toLowerCase() === 'unknown' || 
      location.state?.toLowerCase() === 'unknown'
    )) {
      location = undefined;
    }
    
    return {
      id: 0, // Temporary ID for entity creation
      name: businessName,
      url,
      category: crawlData?.businessDetails?.industry || 'business',
      location: location || undefined, // Don't use "Unknown, Unknown" - use undefined instead
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
