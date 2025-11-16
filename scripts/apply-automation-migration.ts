#!/usr/bin/env tsx
/**
 * Apply Automation Migration Directly
 * Applies the automation fields migration to the database
 */

import { client } from '@/lib/db/drizzle';
import { readFileSync } from 'fs';
import { join } from 'path';

async function applyMigration() {
  console.log('📦 Applying automation migration...');
  
  try {
    const migrationPath = join(process.cwd(), 'lib/db/migrations/0005_add_automation_fields.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf-8');
    
    // Execute the migration
    await client.unsafe(migrationSQL);
    
    console.log('✅ Migration applied successfully!');
    console.log('\nAdded fields:');
    console.log('  - automation_enabled (boolean, default: false)');
    console.log('  - next_crawl_at (timestamp)');
    console.log('  - last_auto_published_at (timestamp)');
    console.log('  - Index: idx_businesses_next_crawl');
    
    return true;
  } catch (error: any) {
    if (error?.message?.includes('already exists') || error?.code === '42P07') {
      console.log('✅ Migration already applied (columns/indexes exist)');
      return true;
    }
    console.error('❌ Migration failed:', error.message);
    return false;
  } finally {
    await client.end();
  }
}

applyMigration()
  .then(success => {
    if (success) {
      console.log('\n🎉 Ready to deploy!');
      process.exit(0);
    } else {
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });

