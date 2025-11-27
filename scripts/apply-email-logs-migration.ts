#!/usr/bin/env tsx
/**
 * Apply Email Logs Migration
 * Creates the email_logs table in the database
 */

import { client } from '@/lib/db/drizzle';
import { readFileSync } from 'fs';
import { join } from 'path';

async function applyMigration() {
  console.log('📦 Applying email_logs table migration...');
  
  try {
    const migrationPath = join(process.cwd(), 'lib/db/migrations/0008_add_email_logs_table.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf-8');
    
    // Execute the migration
    await client.unsafe(migrationSQL);
    
    console.log('✅ Migration applied successfully!');
    console.log('\nCreated:');
    console.log('  - email_logs table');
    console.log('  - Indexes for team_id, user_id, business_id, status, created_at');
    
    return true;
  } catch (error: any) {
    if (error?.message?.includes('already exists') || error?.code === '42P07') {
      console.log('✅ Migration already applied (table exists)');
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
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });

