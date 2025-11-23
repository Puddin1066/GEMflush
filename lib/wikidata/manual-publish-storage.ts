/**
 * Manual Publish Storage - Legacy Compatibility Layer
 * 
 * This file provides backward compatibility for manual publish storage.
 * 
 * TODO: Migrate to use database directly via queries
 */

import { db } from '@/lib/db/drizzle';
import { wikidataEntities } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import type { WikidataEntity } from './types';

/**
 * Store entity for manual publish (legacy API compatibility)
 */
export async function storeEntityForManualPublish(
  businessId: number,
  entity: WikidataEntity,
  options: {
    qid?: string;
    publishedTo?: 'wikidata' | 'test.wikidata';
  } = {}
): Promise<void> {
  try {
    // Check if entity already exists
    const existing = await db
      .select()
      .from(wikidataEntities)
      .where(eq(wikidataEntities.businessId, businessId))
      .limit(1);

    if (existing.length > 0) {
      // Update existing entity
      await db
        .update(wikidataEntities)
        .set({
          entityData: entity as any,
          qid: options.qid || existing[0].qid || undefined,
          publishedTo: options.publishedTo || existing[0].publishedTo || 'test.wikidata',
          version: (existing[0].version || 1) + 1,
        })
        .where(eq(wikidataEntities.businessId, businessId));
    } else {
      // Create new entity
      // qid is required in schema, use placeholder if not provided
      await db.insert(wikidataEntities).values({
        businessId,
        qid: options.qid || 'TEMP-' + businessId, // Temporary QID, will be updated when published
        entityData: entity as any,
        publishedTo: options.publishedTo || 'test.wikidata',
        version: 1,
        enrichmentLevel: 1,
      });
    }
  } catch (error) {
    console.error('Failed to store entity for manual publish:', error);
    throw error;
  }
}
