/**
 * Typed Entity Builder
 * Type-safe and validated entity building with comprehensive validation
 * 
 * DRY: Wraps existing entity builder with validation
 * SOLID: Single Responsibility - typed and validated entity building
 */

import { WikidataEntityBuilder } from './entity-builder';
import { TieredEntityBuilder } from './tiered-entity-builder';
import { validateCrawlData, assertCrawlData, type CrawlDataOutput } from '@/lib/validation/crawl-data';
import {
  validateEntityBuildingInput,
  validateEntityBuildingResult,
  validatePropertyValue,
  isValidBusinessForEntityBuilding,
  isValidCrawlDataForEntityBuilding,
  type EntityBuildingInputOutput,
  type EntityBuildingResultOutput,
} from '@/lib/validation/entity-builder';
import { validateWikidataEntity, assertWikidataEntity } from '@/lib/validation/wikidata';
import type { Business } from '@/lib/db/schema';
import type { CrawledData } from '@/lib/types/gemflush';
import type { CrawlDataOutput } from '@/lib/validation/crawl-data';
import type { WikidataEntityDataContract } from '@/lib/types/wikidata-contract';
import type { Reference } from './notability-checker';

/**
 * Entity Building Metadata
 * Tracks quality and source of entity data
 */
export interface EntityBuildingMetadata {
  sourceDataQuality: number; // 0-1 quality score of source data
  propertiesExtracted: number; // Total properties extracted
  propertiesFromCrawlData: number; // Properties from crawlData
  propertiesFromBusiness: number; // Properties from business
  propertiesFromLLM: number; // Properties from LLM suggestions
  validationErrors: string[]; // Validation warnings
  buildTime: number; // Build time in milliseconds
}

/**
 * Typed Entity Building Result
 */
export interface TypedEntityBuildingResult {
  entity: WikidataEntityDataContract;
  metadata: EntityBuildingMetadata;
}

/**
 * Typed Entity Builder
 * Provides type-safe and validated entity building
 */
export class TypedEntityBuilder {
  private entityBuilder: WikidataEntityBuilder;
  private tieredEntityBuilder: TieredEntityBuilder;

  constructor() {
    this.entityBuilder = new WikidataEntityBuilder();
    this.tieredEntityBuilder = new TieredEntityBuilder();
  }

  /**
   * Build entity with full type safety and validation
   * 
   * @param business - Business data (validated)
   * @param crawlData - Crawled data (validated)
   * @param tier - Subscription tier
   * @param enrichmentLevel - Optional enrichment level
   * @param notabilityReferences - Optional notability references
   * @returns Typed and validated entity with metadata
   */
  async buildEntity(
    business: Business,
    crawlData: CrawledData | undefined,
    tier: 'free' | 'pro' | 'agency',
    enrichmentLevel?: number,
    notabilityReferences?: Reference[]
  ): Promise<TypedEntityBuildingResult> {
    const startTime = Date.now();
    const metadata: EntityBuildingMetadata = {
      sourceDataQuality: 0,
      propertiesExtracted: 0,
      propertiesFromCrawlData: 0,
      propertiesFromBusiness: 0,
      propertiesFromLLM: 0,
      validationErrors: [],
      buildTime: 0,
    };

    try {
      // Step 1: Validate business input
      if (!isValidBusinessForEntityBuilding(business)) {
        throw new Error('Invalid business data: missing required fields (id, name, url)');
      }

      // Step 2: Validate crawlData if provided
      let validatedCrawlData: CrawlDataOutput | undefined;
      if (crawlData) {
        const crawlValidation = validateCrawlData(crawlData);
        if (!crawlValidation.success) {
          metadata.validationErrors.push(
            `CrawlData validation failed: ${crawlValidation.errors?.errors.map(e => e.message).join(', ')}`
          );
          // Continue with partial crawlData if validation fails (graceful degradation)
          console.warn('[TYPED ENTITY BUILDER] CrawlData validation failed, continuing with partial data');
        } else {
          validatedCrawlData = crawlValidation.data;
          // Calculate source data quality
          metadata.sourceDataQuality = this.calculateSourceDataQuality(validatedCrawlData);
        }
      } else {
        metadata.validationErrors.push('No crawlData provided - entity will have minimal properties');
      }

      // Step 3: Validate entity building input
      const inputValidation = validateEntityBuildingInput({
        business: {
          id: business.id,
          name: business.name,
          url: business.url,
          location: business.location || undefined,
        },
        crawlData: validatedCrawlData,
        tier,
        enrichmentLevel,
        notabilityReferences: notabilityReferences?.map(ref => ({
          url: ref.url,
          title: ref.title,
          snippet: ref.snippet,
        })),
      });

      if (!inputValidation.success) {
        throw new Error(
          `Entity building input validation failed: ${inputValidation.errors?.errors.map(e => e.message).join(', ')}`
        );
      }

      // Step 4: Build entity using existing builder
      const fullEntity = await this.entityBuilder.buildEntity(
        business,
        validatedCrawlData,
        notabilityReferences
      );

      // Step 5: Count properties by source
      metadata.propertiesExtracted = Object.keys(fullEntity.claims).length;
      metadata.propertiesFromBusiness = this.countPropertiesFromSource(fullEntity, 'business');
      metadata.propertiesFromCrawlData = this.countPropertiesFromSource(fullEntity, 'crawlData');
      metadata.propertiesFromLLM = this.countPropertiesFromSource(fullEntity, 'llm');

      // Step 6: Filter by tier
      const tieredEntity = await this.tieredEntityBuilder.buildEntity(
        business,
        validatedCrawlData,
        tier,
        enrichmentLevel,
        notabilityReferences
      );

      // Step 7: Validate final entity structure
      const entityValidation = validateWikidataEntity(tieredEntity);
      if (!entityValidation.success) {
        const errorMessages = entityValidation.errors?.errors.map(e => 
          `${e.path.join('.')}: ${e.message}`
        ).join(', ') || 'Unknown validation error';
        metadata.validationErrors.push(`Entity validation failed: ${errorMessages}`);
        throw new Error(`Entity validation failed: ${errorMessages}`);
      }

      // Step 8: Calculate build time
      metadata.buildTime = Date.now() - startTime;

      // Step 9: Validate result structure
      const result: TypedEntityBuildingResult = {
        entity: tieredEntity,
        metadata,
      };

      const resultValidation = validateEntityBuildingResult(result);
      if (!resultValidation.success) {
        throw new Error(
          `Entity building result validation failed: ${resultValidation.errors?.errors.map(e => e.message).join(', ')}`
        );
      }

      return result;
    } catch (error) {
      metadata.buildTime = Date.now() - startTime;
      metadata.validationErrors.push(
        error instanceof Error ? error.message : 'Unknown error during entity building'
      );
      throw error;
    }
  }

  /**
   * Calculate source data quality score (0-1)
   * Based on completeness and validity of crawlData
   */
  private calculateSourceDataQuality(crawlData: CrawlDataOutput): number {
    let score = 0;
    let maxScore = 0;

    // Basic fields (40% weight)
    maxScore += 40;
    if (crawlData.name) score += 10;
    if (crawlData.description) score += 10;
    if (crawlData.phone) score += 10;
    if (crawlData.email) score += 10;

    // Location data (20% weight)
    maxScore += 20;
    if (crawlData.location?.address) score += 5;
    if (crawlData.location?.city) score += 5;
    if (crawlData.location?.lat && crawlData.location?.lng) score += 10;

    // Social links (15% weight)
    maxScore += 15;
    if (crawlData.socialLinks) {
      const socialCount = Object.values(crawlData.socialLinks).filter(Boolean).length;
      score += Math.min(socialCount * 3.75, 15); // Max 15 points for 4+ social links
    }

    // Business details (15% weight)
    maxScore += 15;
    if (crawlData.businessDetails) {
      const detailCount = Object.values(crawlData.businessDetails).filter(Boolean).length;
      score += Math.min(detailCount * 1.5, 15); // Max 15 points for 10+ details
    }

    // Temporal data (10% weight)
    maxScore += 10;
    if (crawlData.founded) score += 10;

    return Math.min(score / maxScore, 1);
  }

  /**
   * Count properties extracted from a specific source
   * This is an approximation based on property types
   */
  private countPropertiesFromSource(
    entity: WikidataEntityDataContract,
    source: 'business' | 'crawlData' | 'llm'
  ): number {
    // Properties that typically come from business
    const businessProperties = ['P31', 'P856']; // instance of, official website

    // Properties that typically come from crawlData
    const crawlDataProperties = [
      'P1448', // official name (from crawlData.name)
      'P625', // coordinate location
      'P6375', // street address
      'P1329', // phone number
      'P968', // email
      'P571', // inception
      'P2002', // Twitter
      'P2013', // Facebook
      'P2003', // Instagram
      'P4264', // LinkedIn
      'P1128', // employees
      'P249', // stock symbol
    ];

    // Properties that typically come from LLM
    const llmProperties = [
      'P452', // industry
      'P1454', // legal form
      'P159', // headquarters
    ];

    let count = 0;
    const propertySet = source === 'business' 
      ? businessProperties 
      : source === 'crawlData' 
        ? crawlDataProperties 
        : llmProperties;

    for (const pid of propertySet) {
      if (entity.claims[pid]) {
        count++;
      }
    }

    return count;
  }
}

/**
 * Singleton instance
 */
export const typedEntityBuilder = new TypedEntityBuilder();

