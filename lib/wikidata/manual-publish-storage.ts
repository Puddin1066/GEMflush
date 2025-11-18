// Manual Publication Storage
// Stores assembled entity JSON for manual review and batch publishing
// SOLID: Single Responsibility - handles storage of entities for manual publication
// DRY: Centralized storage logic

import { promises as fs } from 'fs';
import { join } from 'path';
import type { 
  WikidataEntityDataContract,
  StoredEntityMetadata,
  NotabilityAssessment
} from '@/lib/types/wikidata-contract';
import type { IManualPublishStorage } from '@/lib/types/service-contracts';
import { validateStoredEntityMetadata } from '@/lib/validation/wikidata';

// Storage directory for manual publication entities
// Stored in project root under .wikidata-manual-publish/
const STORAGE_DIR = join(process.cwd(), '.wikidata-manual-publish');

/**
 * Ensure storage directory exists
 * DRY: Centralized directory creation
 */
async function ensureStorageDir(): Promise<void> {
  try {
    await fs.mkdir(STORAGE_DIR, { recursive: true });
  } catch (error) {
    console.error('[MANUAL-PUBLISH] Error creating storage directory:', error);
    throw error;
  }
}

/**
 * Store entity JSON for manual publication
 * Called automatically when entity is assembled (unbeknownst to user)
 * 
 * @param businessId - Business ID
 * @param businessName - Business name
 * @param entity - Assembled entity JSON
 * @param canPublish - Whether entity meets publication criteria
 * @param notability - Optional notability information
 */
export async function storeEntityForManualPublish(
  businessId: number,
  businessName: string,
  entity: WikidataEntityDataContract,
  canPublish: boolean,
  notability?: NotabilityAssessment
): Promise<void> {
  try {
    await ensureStorageDir();
    
    // Create filename with business ID and timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const entityFileName = `entity-${businessId}-${timestamp}.json`;
    const metadataFileName = `entity-${businessId}-${timestamp}.metadata.json`;
    
    const entityPath = join(STORAGE_DIR, entityFileName);
    const metadataPath = join(STORAGE_DIR, metadataFileName);
    
    // Store entity JSON
    await fs.writeFile(
      entityPath,
      JSON.stringify(entity, null, 2),
      'utf-8'
    );
    
    // Store metadata
    const metadata: StoredEntityMetadata = {
      businessId,
      businessName,
      storedAt: new Date().toISOString(),
      entityFileName,
      metadataFileName,
      canPublish,
      notability,
    };
    
    // Validate metadata before storing
    const validation = validateStoredEntityMetadata(metadata);
    if (!validation.success) {
      console.warn(`[MANUAL-PUBLISH] Metadata validation failed for business ${businessId}:`, validation.errors);
      // Continue anyway - validation is for safety, not blocking
    }
    
    await fs.writeFile(
      metadataPath,
      JSON.stringify(metadata, null, 2),
      'utf-8'
    );
    
    console.log(`[MANUAL-PUBLISH] Stored entity for business ${businessId} (${businessName})`);
    console.log(`[MANUAL-PUBLISH] Entity: ${entityFileName}`);
    console.log(`[MANUAL-PUBLISH] Metadata: ${metadataFileName}`);
  } catch (error) {
    // Don't throw - storage failure shouldn't break publication flow
    console.warn(`[MANUAL-PUBLISH] Failed to store entity for business ${businessId}:`, error);
  }
}

/**
 * List all stored entities
 * Returns metadata for all stored entities
 */
export async function listStoredEntities(): Promise<StoredEntityMetadata[]> {
  try {
    await ensureStorageDir();
    
    const files = await fs.readdir(STORAGE_DIR);
    const metadataFiles = files.filter(f => f.endsWith('.metadata.json'));
    
    const entities: StoredEntityMetadata[] = [];
    
    for (const metadataFile of metadataFiles) {
      try {
        const metadataPath = join(STORAGE_DIR, metadataFile);
        const metadataContent = await fs.readFile(metadataPath, 'utf-8');
        const parsedMetadata = JSON.parse(metadataContent);
        
        // Validate metadata structure
        const validation = validateStoredEntityMetadata(parsedMetadata);
        if (validation.success && validation.data) {
          entities.push(validation.data);
        } else {
          console.warn(`[MANUAL-PUBLISH] Invalid metadata in ${metadataFile}:`, validation.errors);
        }
      } catch (error) {
        console.warn(`[MANUAL-PUBLISH] Failed to read metadata file ${metadataFile}:`, error);
      }
    }
    
    // Sort by storedAt (newest first)
    entities.sort((a, b) => 
      new Date(b.storedAt).getTime() - new Date(a.storedAt).getTime()
    );
    
    return entities;
  } catch (error) {
    console.error('[MANUAL-PUBLISH] Error listing stored entities:', error);
    return [];
  }
}

/**
 * Load stored entity JSON
 * @param metadata - Entity metadata
 * @returns Entity JSON
 */
export async function loadStoredEntity(
  metadata: StoredEntityMetadata
): Promise<WikidataEntityDataContract> {
  const entityPath = join(STORAGE_DIR, metadata.entityFileName);
  const entityContent = await fs.readFile(entityPath, 'utf-8');
  return JSON.parse(entityContent) as WikidataEntityDataContract;
}

/**
 * Delete stored entity files
 * @param metadata - Entity metadata
 */
export async function deleteStoredEntity(
  metadata: StoredEntityMetadata
): Promise<void> {
  const entityFilePath = join(STORAGE_DIR, metadata.entityFileName);
  const metadataFilePath = join(STORAGE_DIR, metadata.metadataFileName);

  try {
    await fs.unlink(entityFilePath);
    await fs.unlink(metadataFilePath);
    console.log(`[MANUAL-PUBLISH] Deleted stored entity for business ${metadata.businessId}`);
  } catch (error) {
    console.warn(`[MANUAL-PUBLISH] Error deleting entity files:`, error);
  }
}

