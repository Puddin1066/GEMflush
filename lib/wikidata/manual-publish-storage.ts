/**
 * Manual Publish Storage - Legacy Compatibility Layer
 * 
 * This file provides backward compatibility for manual publish storage.
 * 
 * TODO: Migrate to use database directly via queries
 */

import { db } from '@/lib/db/drizzle';
import { wikidataEntities } from '@/lib/db/schema';
import { eq, or, sql } from 'drizzle-orm';
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
    const tempQid = options.qid || 'TEMP-' + businessId;
    
    // Check if entity already exists by businessId OR by qid (to handle duplicate key constraint)
    const existing = await db
      .select()
      .from(wikidataEntities)
      .where(
        or(
          eq(wikidataEntities.businessId, businessId),
          eq(wikidataEntities.qid, tempQid)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      // Update existing entity (DRY: handle both businessId and qid matches)
      await db
        .update(wikidataEntities)
        .set({
          entityData: entity as any,
          qid: options.qid || existing[0].qid || tempQid,
          publishedTo: options.publishedTo || existing[0].publishedTo || 'test.wikidata',
          version: (existing[0].version || 1) + 1,
          // Update businessId if it was matched by qid only
          ...(existing[0].businessId !== businessId && { businessId }),
        })
        .where(
          or(
            eq(wikidataEntities.businessId, businessId),
            eq(wikidataEntities.qid, tempQid)
          )
        );
    } else {
      // Create new entity with upsert logic (SOLID: handle race conditions)
      // DRY: Use ON CONFLICT to handle duplicate key constraint atomically
      // This prevents race conditions where multiple calls happen simultaneously
      try {
        await db
          .insert(wikidataEntities)
          .values({
            businessId,
            qid: tempQid, // Temporary QID, will be updated when published
            entityData: entity as any,
            publishedTo: options.publishedTo || 'test.wikidata',
            version: 1,
            enrichmentLevel: 1,
          })
          .onConflictDoUpdate({
            target: [wikidataEntities.qid], // Conflict on qid unique constraint
            set: {
              entityData: entity as any,
              businessId, // Update businessId if it changed
              publishedTo: options.publishedTo || 'test.wikidata',
              version: sql`${wikidataEntities.version} + 1`, // Increment version
            },
          });
      } catch (insertError: any) {
        // If ON CONFLICT fails (e.g., conflict on businessId instead of qid), fall back to update
        if (insertError?.code === '23505' || insertError?.message?.includes('unique constraint')) {
          // Try to find and update by businessId
          const existingByBusiness = await db
            .select()
            .from(wikidataEntities)
            .where(eq(wikidataEntities.businessId, businessId))
            .limit(1);
          
          if (existingByBusiness.length > 0) {
            await db
              .update(wikidataEntities)
              .set({
                entityData: entity as any,
                qid: options.qid || existingByBusiness[0].qid || tempQid,
                publishedTo: options.publishedTo || existingByBusiness[0].publishedTo || 'test.wikidata',
                version: (existingByBusiness[0].version || 1) + 1,
              })
              .where(eq(wikidataEntities.businessId, businessId));
            return; // Successfully updated
          }
        }
        throw insertError; // Re-throw if we can't handle it
      }
    }
  } catch (error: any) {
    // Handle duplicate key constraint gracefully (SOLID: Error handling)
    if (error?.code === '23505' || error?.message?.includes('unique constraint')) {
      // Entity with this qid already exists - try to update it instead
      const tempQid = options.qid || 'TEMP-' + businessId;
      const existing = await db
        .select()
        .from(wikidataEntities)
        .where(eq(wikidataEntities.qid, tempQid))
        .limit(1);
      
      if (existing.length > 0) {
        await db
          .update(wikidataEntities)
          .set({
            entityData: entity as any,
            businessId, // Update businessId if it changed
            publishedTo: options.publishedTo || existing[0].publishedTo || 'test.wikidata',
            version: (existing[0].version || 1) + 1,
          })
          .where(eq(wikidataEntities.qid, tempQid));
        return; // Successfully updated
      }
    }
    console.error('Failed to store entity for manual publish:', error);
    throw error;
  }
}
