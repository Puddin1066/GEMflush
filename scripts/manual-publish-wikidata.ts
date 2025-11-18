#!/usr/bin/env tsx
/**
 * Manual Wikidata Publication Script
 * 
 * Publishes stored entity JSON files to Wikidata (test or production)
 * Can publish one entity at a time or in batches
 * 
 * Usage:
 *   # List all stored entities
 *   tsx scripts/manual-publish-wikidata.ts list
 * 
 *   # Publish a specific entity by business ID
 *   tsx scripts/manual-publish-wikidata.ts publish <businessId>
 * 
 *   # Publish all stored entities (batch)
 *   tsx scripts/manual-publish-wikidata.ts publish-all
 * 
 *   # Publish all entities that meet publication criteria
 *   tsx scripts/manual-publish-wikidata.ts publish-ready
 * 
 *   # Delete a stored entity after publishing
 *   tsx scripts/manual-publish-wikidata.ts delete <businessId>
 */

import { 
  listStoredEntities, 
  loadStoredEntity, 
  deleteStoredEntity,
  type StoredEntityMetadata 
} from '@/lib/wikidata/manual-publish-storage';
import { wikidataPublisher } from '@/lib/wikidata/publisher';

// Parse command line arguments
const command = process.argv[2];
const businessIdArg = process.argv[3];

/**
 * List all stored entities with their metadata
 */
async function listEntities(): Promise<void> {
  console.log('\n📋 Stored Entities for Manual Publication\n');
  console.log('='.repeat(80));
  
  const entities = await listStoredEntities();
  
  if (entities.length === 0) {
    console.log('No stored entities found.');
    console.log('Entities are automatically stored when assembled during publication flow.\n');
    return;
  }
  
  for (const entity of entities) {
    console.log(`\nBusiness ID: ${entity.businessId}`);
    console.log(`Business Name: ${entity.businessName}`);
    console.log(`Stored At: ${new Date(entity.storedAt).toLocaleString()}`);
    console.log(`Can Publish: ${entity.canPublish ? '✅ Yes' : '❌ No'}`);
    
    if (entity.notability) {
      console.log(`Notability: ${entity.notability.isNotable ? '✅ Notable' : '❌ Not Notable'}`);
      console.log(`Confidence: ${(entity.notability.confidence * 100).toFixed(1)}%`);
      console.log(`Recommendation: ${entity.notability.recommendation}`);
    }
    
    console.log(`Entity File: ${entity.entityFileName}`);
    console.log(`Metadata File: ${entity.metadataFileName}`);
    console.log('-'.repeat(80));
  }
  
  console.log(`\nTotal: ${entities.length} stored entities\n`);
}

/**
 * Publish a specific entity by business ID
 */
async function publishEntity(businessId: string): Promise<void> {
  const id = parseInt(businessId, 10);
  
  if (isNaN(id)) {
    console.error('❌ Invalid business ID:', businessId);
    process.exit(1);
  }
  
  const entities = await listStoredEntities();
  const entity = entities.find(e => e.businessId === id);
  
  if (!entity) {
    console.error(`❌ No stored entity found for business ID: ${id}`);
    console.log('\nAvailable business IDs:');
    entities.forEach(e => console.log(`  - ${e.businessId}: ${e.businessName}`));
    process.exit(1);
  }
  
  console.log(`\n📤 Publishing entity for business ${id}: ${entity.businessName}\n`);
  
  // Check if entity meets publication criteria
  if (!entity.canPublish) {
    console.warn('⚠️  Warning: Entity does not meet publication criteria');
    if (entity.notability) {
      console.warn(`   Confidence: ${(entity.notability.confidence * 100).toFixed(1)}%`);
      console.warn(`   Recommendation: ${entity.notability.recommendation}`);
    }
    console.log('\nDo you want to proceed anyway? (y/N)');
    
    // For non-interactive mode, skip entities that don't meet criteria
    // In interactive mode, you could use readline to prompt
    console.log('Skipping (use --force flag in future to override)');
    process.exit(0);
  }
  
  // Load entity JSON
  const entityData = await loadStoredEntity(entity);
  
  // Determine target (default to test.wikidata.org)
  const production = process.env.WIKIDATA_PUBLISH_TO_PRODUCTION === 'true';
  const target = production ? 'wikidata.org' : 'test.wikidata.org';
  
  console.log(`Publishing to: ${target}`);
  console.log(`Entity has ${Object.keys(entityData.claims || {}).length} properties`);
  console.log(`Entity has ${Object.keys(entityData.labels || {}).length} language labels\n`);
  
  try {
    // Publish entity
    const result = await wikidataPublisher.publishEntity(
      entityData,
      production
    );
    
    if (!result.success) {
      console.error(`❌ Publication failed: ${result.error}`);
      process.exit(1);
    }
    
    console.log(`✅ Successfully published!`);
    console.log(`QID: ${result.qid}`);
    console.log(`View: https://${target}/wiki/${result.qid}\n`);
    
    // Ask if user wants to delete stored entity
    console.log('Entity published successfully. Stored files can be deleted.');
    console.log('To delete, run: tsx scripts/manual-publish-wikidata.ts delete', id);
    
  } catch (error) {
    console.error('❌ Publication error:', error);
    process.exit(1);
  }
}

/**
 * Publish all stored entities (batch)
 */
async function publishAll(): Promise<void> {
  const entities = await listStoredEntities();
  
  if (entities.length === 0) {
    console.log('No stored entities to publish.');
    return;
  }
  
  console.log(`\n📤 Publishing ${entities.length} stored entities\n`);
  
  const production = process.env.WIKIDATA_PUBLISH_TO_PRODUCTION === 'true';
  const target = production ? 'wikidata.org' : 'test.wikidata.org';
  
  console.log(`Target: ${target}\n`);
  
  let successCount = 0;
  let failCount = 0;
  
  for (const entity of entities) {
    console.log(`\n[${successCount + failCount + 1}/${entities.length}] Publishing business ${entity.businessId}: ${entity.businessName}`);
    
    if (!entity.canPublish) {
      console.log('  ⚠️  Skipping - does not meet publication criteria');
      failCount++;
      continue;
    }
    
    try {
      const entityData = await loadStoredEntity(entity);
      const result = await wikidataPublisher.publishEntity(entityData, production);
      
      if (result.success) {
        console.log(`  ✅ Published - QID: ${result.qid}`);
        successCount++;
      } else {
        console.log(`  ❌ Failed: ${result.error}`);
        failCount++;
      }
    } catch (error) {
      console.log(`  ❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      failCount++;
    }
    
    // Small delay between publications to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log(`\n📊 Summary:`);
  console.log(`  ✅ Successful: ${successCount}`);
  console.log(`  ❌ Failed: ${failCount}`);
  console.log(`  Total: ${entities.length}\n`);
}

/**
 * Publish only entities that meet publication criteria
 */
async function publishReady(): Promise<void> {
  const entities = await listStoredEntities();
  const readyEntities = entities.filter(e => e.canPublish);
  
  if (readyEntities.length === 0) {
    console.log('No entities ready for publication (all stored entities fail criteria).');
    return;
  }
  
  console.log(`\n📤 Publishing ${readyEntities.length} ready entities (out of ${entities.length} total)\n`);
  
  // Use publishAll logic but filter to ready entities
  const production = process.env.WIKIDATA_PUBLISH_TO_PRODUCTION === 'true';
  const target = production ? 'wikidata.org' : 'test.wikidata.org';
  
  console.log(`Target: ${target}\n`);
  
  let successCount = 0;
  let failCount = 0;
  
  for (const entity of readyEntities) {
    console.log(`\n[${successCount + failCount + 1}/${readyEntities.length}] Publishing business ${entity.businessId}: ${entity.businessName}`);
    
    try {
      const entityData = await loadStoredEntity(entity);
      const result = await wikidataPublisher.publishEntity(entityData, production);
      
      if (result.success) {
        console.log(`  ✅ Published - QID: ${result.qid}`);
        successCount++;
      } else {
        console.log(`  ❌ Failed: ${result.error}`);
        failCount++;
      }
    } catch (error) {
      console.log(`  ❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      failCount++;
    }
    
    // Small delay between publications
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log(`\n📊 Summary:`);
  console.log(`  ✅ Successful: ${successCount}`);
  console.log(`  ❌ Failed: ${failCount}`);
  console.log(`  Total: ${readyEntities.length}\n`);
}

/**
 * Delete a stored entity
 */
async function deleteEntity(businessId: string): Promise<void> {
  const id = parseInt(businessId, 10);
  
  if (isNaN(id)) {
    console.error('❌ Invalid business ID:', businessId);
    process.exit(1);
  }
  
  const entities = await listStoredEntities();
  const entity = entities.find(e => e.businessId === id);
  
  if (!entity) {
    console.error(`❌ No stored entity found for business ID: ${id}`);
    process.exit(1);
  }
  
  console.log(`\n🗑️  Deleting stored entity for business ${id}: ${entity.businessName}\n`);
  
  await deleteStoredEntity(entity);
  
  console.log('✅ Deleted successfully\n');
}

// Main command handler
async function main(): Promise<void> {
  switch (command) {
    case 'list':
      await listEntities();
      break;
      
    case 'publish':
      if (!businessIdArg) {
        console.error('❌ Business ID required');
        console.log('Usage: tsx scripts/manual-publish-wikidata.ts publish <businessId>');
        process.exit(1);
      }
      await publishEntity(businessIdArg);
      break;
      
    case 'publish-all':
      await publishAll();
      break;
      
    case 'publish-ready':
      await publishReady();
      break;
      
    case 'delete':
      if (!businessIdArg) {
        console.error('❌ Business ID required');
        console.log('Usage: tsx scripts/manual-publish-wikidata.ts delete <businessId>');
        process.exit(1);
      }
      await deleteEntity(businessIdArg);
      break;
      
    default:
      console.log('Manual Wikidata Publication Script\n');
      console.log('Usage:');
      console.log('  tsx scripts/manual-publish-wikidata.ts list              # List all stored entities');
      console.log('  tsx scripts/manual-publish-wikidata.ts publish <id>      # Publish specific entity');
      console.log('  tsx scripts/manual-publish-wikidata.ts publish-all      # Publish all entities');
      console.log('  tsx scripts/manual-publish-wikidata.ts publish-ready    # Publish ready entities only');
      console.log('  tsx scripts/manual-publish-wikidata.ts delete <id>       # Delete stored entity\n');
      console.log('Environment Variables:');
      console.log('  WIKIDATA_PUBLISH_TO_PRODUCTION=true  # Publish to wikidata.org (default: test.wikidata.org)');
      console.log('  WIKIDATA_PUBLISH_MODE=real            # Use real API (default: mock)\n');
      process.exit(1);
  }
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

