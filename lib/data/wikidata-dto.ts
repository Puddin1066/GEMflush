import 'server-only';
import { db } from '@/lib/db/drizzle';
import { businesses } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { entityBuilder } from '@/lib/wikidata/entity-builder';
import { notabilityChecker, type NotabilityResult } from '@/lib/wikidata/notability-checker';
import type { WikidataPublishDTO } from './types';
import type { WikidataEntityData } from '@/lib/types/gemflush';

/**
 * Wikidata Data Access Layer
 * Follows Single Responsibility Principle: Only handles Wikidata data transformation
 * 
 * Following Next.js Data Access Layer pattern
 */

/**
 * Get Wikidata publish data with notability check
 * 
 * @param businessId - Business ID to check
 * @returns DTO with entity and notability assessment
 * 
 * @example
 * ```typescript
 * const data = await getWikidataPublishDTO(1);
 * if (data.canPublish) {
 *   // Proceed with publishing
 * } else {
 *   // Show user why they can't publish
 *   console.log(data.recommendation);
 * }
 * ```
 */
export async function getWikidataPublishDTO(
  businessId: number
): Promise<WikidataPublishDTO & { fullEntity: WikidataEntityData }> {
  // Fetch business from database
  const business = await db.query.businesses.findFirst({
    where: eq(businesses.id, businessId),
  });
  
  if (!business) {
    throw new Error(`Business not found: ${businessId}`);
  }
  
  // Build Wikidata entity (now async due to LLM enhancements)
  const fullEntity = await entityBuilder.buildEntity(business, business.crawlData);
  
  // Check notability with Google Search + LLM
  const notabilityResult = await notabilityChecker.checkNotability(
    business.name,
    business.location
  );
  
  // Determine if can publish
  const canPublish = notabilityResult.isNotable && notabilityResult.confidence >= 0.7;
  
  // Build recommendation message
  const recommendation = buildRecommendation(notabilityResult, canPublish);
  
  // Extract top references (with trust scores if available)
  const topReferences = extractTopReferences(notabilityResult);
  
  return {
    businessId: business.id,
    businessName: business.name,
    entity: {
      label: fullEntity.labels.en?.value || business.name,
      description: fullEntity.descriptions.en?.value || '',
      claimCount: Object.keys(fullEntity.claims).length,
    },
    notability: {
      isNotable: notabilityResult.isNotable,
      confidence: notabilityResult.confidence,
      reasons: notabilityResult.reasons,
      seriousReferenceCount: notabilityResult.seriousReferenceCount,
      topReferences: topReferences,
    },
    canPublish: canPublish,
    recommendation: recommendation,
    fullEntity: fullEntity, // For API route to use with publisher
  };
}

/**
 * Build recommendation message based on notability result
 * Follows DRY principle: Centralized recommendation logic
 */
function buildRecommendation(
  notabilityResult: NotabilityResult,
  canPublish: boolean
): string {
  if (!notabilityResult.isNotable) {
    const suggestion = notabilityResult.assessment?.recommendations?.[0] || 
      'Seek additional references from reputable sources (news, government, academic).';
    return `Do not publish - insufficient notability. ${suggestion}`;
  }
  
  if (notabilityResult.confidence < 0.7) {
    return 'Manual review recommended - confidence below threshold. Verify references independently before publishing.';
  }
  
  if (canPublish) {
    return `Ready to publish - meets notability standards with ${notabilityResult.seriousReferenceCount} serious references.`;
  }
  
  return 'Additional review recommended before publishing.';
}

/**
 * Extract top 3 references with trust scores
 * Follows Interface Segregation: Returns only what UI needs
 */
function extractTopReferences(notabilityResult: NotabilityResult): Array<{
  title: string;
  url: string;
  source: string;
  trustScore: number;
}> {
  return notabilityResult.references
    .slice(0, 3)
    .map((ref, idx) => ({
      title: ref.title,
      url: ref.url,
      source: ref.source,
      trustScore: notabilityResult.assessment?.references[idx]?.trustScore || 50,
    }));
}

