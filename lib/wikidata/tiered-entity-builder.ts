/**
 * @deprecated This wrapper may only be needed for DTOs, not core workflow.
 * Review usage - if only used in lib/data/wikidata-dto.ts, consider moving to data layer.
 * If not actively used, consider removing.
 * 
 * Tiered Entity Builder
 * SOLID: Single Responsibility - handles tier-based entity richness
 * DRY: Wraps existing entity builder with tier filtering
 */

import { WikidataEntityBuilder } from './entity-builder';
import { Business } from '@/lib/db/schema';
import type { CrawledData } from '@/lib/types/gemflush';
import type { WikidataEntityDataContract } from '@/lib/types/wikidata-contract';
import type { Reference } from './notability-checker';
import { getEntityRichnessForTier } from '@/lib/services/automation-service';

// Property sets by tier
const BASIC_PROPERTIES = ['P31', 'P856', 'P1448', 'P625', 'P1329'];
const ENHANCED_PROPERTIES = [
  ...BASIC_PROPERTIES,
  'P6375', // street address
  'P968',  // email
  'P2002', // Twitter
  'P2013', // Facebook
  'P2003', // Instagram
  'P4264', // LinkedIn
  'P571',  // inception
  'P1128', // employees
];
const COMPLETE_PROPERTIES = [
  ...ENHANCED_PROPERTIES,
  'P131',  // located in (city QID)
  'P159',  // headquarters
  'P17',   // country
  'P452',  // industry
  'P18',   // image
  'P4896', // logo
];

const entityBuilder = new WikidataEntityBuilder();

export class TieredEntityBuilder {
  /**
   * Build entity with tier-appropriate richness
   * 
   * @param business - Business data
   * @param crawledData - Crawled business data
   * @param tier - Subscription tier
   * @param enrichmentLevel - Optional enrichment level
   * @param notabilityReferences - Optional notability references to attach to claims
   */
  async buildEntity(
    business: Business,
    crawledData: CrawledData | undefined,
    tier: 'free' | 'pro' | 'agency',
    enrichmentLevel?: number,
    notabilityReferences?: Reference[]
  ): Promise<WikidataEntityDataContract> {
    // Build full entity first (with notability references if provided)
    const fullEntity = await entityBuilder.buildEntity(business, crawledData, notabilityReferences);
    
    // Get property set for tier
    const propertySet = this.getPropertiesForTier(tier, enrichmentLevel);
    
    // Filter claims to only include tier-appropriate properties
    // Note: References are preserved when filtering claims
    const filteredClaims: WikidataEntityDataContract['claims'] = {};
    for (const pid of propertySet) {
      if (fullEntity.claims[pid]) {
        filteredClaims[pid] = fullEntity.claims[pid];
      }
    }
    
    return {
      ...fullEntity,
      claims: filteredClaims,
    };
  }
  
  /**
   * Get properties for tier and enrichment level
   */
  getPropertiesForTier(tier: string, enrichmentLevel?: number): string[] {
    if (tier === 'agency') {
      // Agency gets complete properties, potentially enhanced by enrichment level
      if (enrichmentLevel && enrichmentLevel >= 3) {
        return COMPLETE_PROPERTIES;
      }
      // Level 1-2: enhanced
      return ENHANCED_PROPERTIES;
    }
    
    if (tier === 'pro') {
      return ENHANCED_PROPERTIES;
    }
    
    // Free tier: basic only
    return BASIC_PROPERTIES;
  }
  
  /**
   * Get expected property count for tier
   */
  getExpectedPropertyCount(tier: string, enrichmentLevel?: number): number {
    const properties = this.getPropertiesForTier(tier, enrichmentLevel);
    return properties.length;
  }
}

export const tieredEntityBuilder = new TieredEntityBuilder();

