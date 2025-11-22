/**
 * Streamlined Wikidata Service
 * 
 * Main orchestrator service that combines all components to create and publish
 * rich Wikidata entities from crawl data with up to 10 PIDs and 10 QIDs.
 */

import type { Business } from '@/lib/db/schema';
import type { CrawledData } from '@/lib/types/gemflush';
import type { 
  WikidataEntity,
  CrawlDataInput,
  PublishOptions,
  PublishResult,
  PropertySelection,
  WikidataConfig
} from './types';

import { EntityTemplate } from './template';
import { CrawlDataProcessor } from './processor';
import { PropertyManager } from './property-manager';
import { WikidataClient } from './client';

export class WikidataService {
  private client: WikidataClient;

  constructor(config: WikidataConfig = {}) {
    this.client = new WikidataClient(config);
  }

  /**
   * Create and publish a rich Wikidata entity from business and crawl data
   */
  async createAndPublishEntity(
    business: Business,
    crawledData?: CrawledData,
    options: PublishOptions & {
      maxProperties?: number;
      maxQIDs?: number;
      qualityThreshold?: number;
      enhanceData?: boolean;
    } = { target: 'test' }
  ): Promise<{
    entity: WikidataEntity;
    selection: PropertySelection;
    result: PublishResult;
    metrics: {
      processingTime: number;
      dataQuality: number;
      propertyCount: number;
      qidCount: number;
    };
  }> {
    const startTime = Date.now();
    
    try {
      console.log(`[WIKIDATA SERVICE] Creating entity for: ${business.name}`);

      // Step 1: Process crawl data
      const crawlDataInput = CrawlDataProcessor.processCrawlData(business, crawledData);
      
      // Step 2: Enhance data if requested
      const enhancedData = options.enhanceData !== false 
        ? CrawlDataProcessor.enhanceCrawlData(crawlDataInput)
        : crawlDataInput;

      // Step 3: Validate crawl data
      const validation = CrawlDataProcessor.validateCrawlData(enhancedData);
      if (!validation.isValid) {
        console.warn('[WIKIDATA SERVICE] Crawl data validation failed:', validation.errors);
      }

      // Step 4: Select optimal properties
      const selection = await PropertyManager.selectProperties(enhancedData, {
        maxPIDs: options.maxProperties || 10,
        maxQIDs: options.maxQIDs || 10,
        qualityThreshold: options.qualityThreshold || 0.7
      });

      // Step 5: Validate property selection
      const selectionValidation = PropertyManager.validateSelection(selection);
      if (!selectionValidation.isValid) {
        console.error('[WIKIDATA SERVICE] Property selection validation failed:', selectionValidation.errors);
        throw new Error(`Property selection invalid: ${selectionValidation.errors.join(', ')}`);
      }

      // Step 6: Generate entity using template with notability references
      const entity = await EntityTemplate.generateEntity(enhancedData, {
        maxProperties: selection.totalProperties,
        includeReferences: options.includeReferences !== false,
        qualityThreshold: options.qualityThreshold || 0.7,
        findNotabilityReferences: true,
        maxNotabilityReferences: 5
      });

      // Step 7: Calculate metrics
      const dataMetrics = CrawlDataProcessor.extractMetrics(enhancedData);
      const processingTime = Date.now() - startTime;

      // Step 8: Publish entity
      const publishResult = await this.client.publishEntity(entity, options);

      const metrics = {
        processingTime,
        dataQuality: dataMetrics.quality,
        propertyCount: selection.totalProperties,
        qidCount: selection.selectedQIDs.length
      };

      console.log(`[WIKIDATA SERVICE] Entity creation completed:`, {
        success: publishResult.success,
        qid: publishResult.qid,
        properties: metrics.propertyCount,
        qids: metrics.qidCount,
        quality: metrics.dataQuality.toFixed(2),
        time: `${processingTime}ms`
      });

      return {
        entity,
        selection,
        result: publishResult,
        metrics
      };

    } catch (error) {
      console.error('[WIKIDATA SERVICE] Entity creation failed:', error);
      
      const failureResult: PublishResult = {
        success: false,
        publishedTo: options.target === 'production' ? 'wikidata.org' : 'test.wikidata.org',
        propertiesPublished: 0,
        referencesPublished: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      };

      return {
        entity: this.createEmptyEntity(),
        selection: this.createEmptySelection(),
        result: failureResult,
        metrics: {
          processingTime: Date.now() - startTime,
          dataQuality: 0,
          propertyCount: 0,
          qidCount: 0
        }
      };
    }
  }

  /**
   * Update an existing Wikidata entity
   */
  async updateEntity(
    qid: string,
    business: Business,
    crawledData?: CrawledData,
    options: PublishOptions = { target: 'test' }
  ): Promise<PublishResult> {
    try {
      console.log(`[WIKIDATA SERVICE] Updating entity: ${qid}`);

      // Process and enhance data
      const crawlDataInput = CrawlDataProcessor.processCrawlData(business, crawledData);
      const enhancedData = CrawlDataProcessor.enhanceCrawlData(crawlDataInput);

      // Generate updated entity with notability references
      const entity = await EntityTemplate.generateEntity(enhancedData, {
        maxProperties: options.maxProperties || 10,
        includeReferences: options.includeReferences !== false,
        findNotabilityReferences: true,
        maxNotabilityReferences: 5
      });

      // Update via client
      const result = await this.client.updateEntity(qid, entity, options);

      console.log(`[WIKIDATA SERVICE] Entity update completed:`, {
        success: result.success,
        qid: result.qid,
        properties: result.propertiesPublished
      });

      return result;

    } catch (error) {
      console.error('[WIKIDATA SERVICE] Entity update failed:', error);
      return {
        success: false,
        publishedTo: options.target === 'production' ? 'wikidata.org' : 'test.wikidata.org',
        propertiesPublished: 0,
        referencesPublished: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Preview entity without publishing
   */
  async previewEntity(
    business: Business,
    crawledData?: CrawledData,
    options: {
      maxProperties?: number;
      maxQIDs?: number;
      enhanceData?: boolean;
    } = {}
  ): Promise<{
    entity: WikidataEntity;
    selection: PropertySelection;
    validation: {
      isValid: boolean;
      errors: string[];
      warnings: string[];
    };
    metrics: {
      completeness: number;
      quality: number;
      richness: number;
      propertyCount: number;
    };
  }> {
    try {
      console.log(`[WIKIDATA SERVICE] Previewing entity for: ${business.name}`);

      // Process data
      const crawlDataInput = CrawlDataProcessor.processCrawlData(business, crawledData);
      const enhancedData = options.enhanceData !== false 
        ? CrawlDataProcessor.enhanceCrawlData(crawlDataInput)
        : crawlDataInput;

      // Select properties
      const selection = await PropertyManager.selectProperties(enhancedData, {
        maxPIDs: options.maxProperties || 10,
        maxQIDs: options.maxQIDs || 10
      });

      // Generate entity with notability references
      const entity = await EntityTemplate.generateEntity(enhancedData, {
        maxProperties: selection.totalProperties,
        includeReferences: true,
        findNotabilityReferences: true,
        maxNotabilityReferences: 5
      });

      // Validate
      const validation = CrawlDataProcessor.validateCrawlData(enhancedData);
      const selectionValidation = PropertyManager.validateSelection(selection);
      
      const combinedValidation = {
        isValid: validation.isValid && selectionValidation.isValid,
        errors: [...validation.errors, ...selectionValidation.errors],
        warnings: [...validation.warnings, ...selectionValidation.warnings]
      };

      // Calculate metrics
      const metrics = CrawlDataProcessor.extractMetrics(enhancedData);

      return {
        entity,
        selection,
        validation: combinedValidation,
        metrics
      };

    } catch (error) {
      console.error('[WIKIDATA SERVICE] Entity preview failed:', error);
      throw error;
    }
  }

  /**
   * Get service statistics
   */
  getServiceStats(): {
    version: string;
    maxProperties: number;
    maxQIDs: number;
    supportedDataTypes: string[];
    features: string[];
  } {
    return {
      version: '1.0.0',
      maxProperties: 10,
      maxQIDs: 10,
      supportedDataTypes: [
        'string',
        'wikibase-entityid',
        'time',
        'quantity',
        'globecoordinate',
        'monolingualtext'
      ],
      features: [
        'Dynamic JSON templates',
        'Crawl data integration',
        'Property optimization',
        'QID resolution',
        'Reference management',
        'Quality scoring',
        'Mock mode support',
        'Validation',
        'Rate limiting'
      ]
    };
  }

  /**
   * Validate configuration
   */
  validateConfiguration(): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check environment variables
    if (!process.env.WIKIDATA_BOT_USERNAME) {
      warnings.push('WIKIDATA_BOT_USERNAME not set - will use mock mode');
    }

    if (!process.env.WIKIDATA_BOT_PASSWORD) {
      warnings.push('WIKIDATA_BOT_PASSWORD not set - will use mock mode');
    }

    // Check publish mode
    const publishMode = process.env.WIKIDATA_PUBLISH_MODE;
    if (publishMode && !['mock', 'real'].includes(publishMode)) {
      warnings.push(`Unknown WIKIDATA_PUBLISH_MODE: ${publishMode}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  // Private helper methods

  private createEmptyEntity(): WikidataEntity {
    return {
      labels: {},
      descriptions: {},
      claims: {}
    };
  }

  private createEmptySelection(): PropertySelection {
    return {
      selectedPIDs: [],
      selectedQIDs: [],
      totalProperties: 0,
      qualityScore: 0
    };
  }
}

// Export singleton instance
export const wikidataService = new WikidataService();
