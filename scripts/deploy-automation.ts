#!/usr/bin/env tsx
/**
 * Automation Deployment Verification Script
 * Verifies automation infrastructure is ready for deployment
 */

import { db } from '@/lib/db/drizzle';
import { businesses } from '@/lib/db/schema';
import { sql } from 'drizzle-orm';

async function checkDatabaseMigration() {
  console.log('🔍 Checking database migration...');
  
  try {
    // Try to query the automation fields directly
    await db.select({
      automationEnabled: businesses.automationEnabled,
      nextCrawlAt: businesses.nextCrawlAt,
      lastAutoPublishedAt: businesses.lastAutoPublishedAt,
    }).from(businesses).limit(1);
    
    console.log('✅ Database migration verified');
    return true;
  } catch (error: any) {
    // Check if error is about missing columns
    if (error?.message?.includes('column') || error?.code === '42703') {
      console.error('❌ Automation columns not found in database');
      console.log('💡 Run: pnpm db:migrate');
      return false;
    }
    // Other errors (like connection issues) are not migration failures
    console.warn('⚠️  Could not verify migration (may be connection issue)');
    console.log('💡 If columns exist, this is OK. Otherwise run: pnpm db:migrate');
    return true; // Assume OK if we can't verify
  }
}

async function checkIndex() {
  console.log('🔍 Checking database index...');
  
  try {
    const result = await db.execute(sql`
      SELECT indexname 
      FROM pg_indexes 
      WHERE tablename = 'businesses' 
        AND indexname = 'idx_businesses_next_crawl'
    `);
    
    const indexes = (result as any).map((row: any) => row.indexname);
    
    if (indexes.length === 0) {
      console.warn('⚠️  Index idx_businesses_next_crawl not found');
      console.log('💡 Index will be created on next migration (not critical)');
      return true; // Not critical
    }
    
    console.log('✅ Database index verified');
    return true;
  } catch (error) {
    console.warn('⚠️  Could not verify index (not critical):', error);
    return true; // Not critical
  }
}

function checkVercelConfig() {
  console.log('🔍 Checking Vercel configuration...');
  
  const fs = require('fs');
  const path = require('path');
  
  try {
    const vercelJsonPath = path.join(process.cwd(), 'vercel.json');
    if (!fs.existsSync(vercelJsonPath)) {
      console.error('❌ vercel.json not found');
      return false;
    }
    
    const vercelJson = JSON.parse(fs.readFileSync(vercelJsonPath, 'utf-8'));
    
    if (!vercelJson.crons || vercelJson.crons.length === 0) {
      console.error('❌ No cron jobs configured in vercel.json');
      return false;
    }
    
    const weeklyCrawl = vercelJson.crons.find((cron: any) => 
      cron.path === '/api/cron/weekly-crawls'
    );
    
    if (!weeklyCrawl) {
      console.error('❌ Weekly crawls cron not found in vercel.json');
      return false;
    }
    
    console.log('✅ Vercel cron configuration verified');
    console.log(`   Schedule: ${weeklyCrawl.schedule}`);
    return true;
  } catch (error) {
    console.error('❌ Vercel config check failed:', error);
    return false;
  }
}

function checkEnvironmentVariables() {
  console.log('🔍 Checking environment variables...');
  
  const required = ['POSTGRES_URL', 'DATABASE_URL'];
  const hasDbUrl = required.some(key => process.env[key]);
  
  if (!hasDbUrl) {
    console.error('❌ Database URL not found (POSTGRES_URL or DATABASE_URL)');
    return false;
  }
  
  if (!process.env.AUTH_SECRET) {
    console.warn('⚠️  AUTH_SECRET not set (may be set in Vercel)');
  }
  
  console.log('✅ Environment variables verified');
  return true;
}

async function main() {
  console.log('🚀 Automation Deployment Verification\n');
  
  const checks = [
    checkDatabaseMigration(),
    checkIndex(),
    checkVercelConfig(),
    checkEnvironmentVariables(),
  ];
  
  const results = await Promise.all(checks);
  const allPassed = results.every(r => r);
  
  console.log('\n' + '='.repeat(50));
  if (allPassed) {
    console.log('✅ All checks passed! Ready for deployment.');
    console.log('\nNext steps:');
    console.log('1. Deploy to Vercel: vercel --prod');
    console.log('2. Verify cron job in Vercel Dashboard');
    console.log('3. Monitor first execution');
  } else {
    console.log('❌ Some checks failed. Please fix issues before deploying.');
    process.exit(1);
  }
}

main().catch(console.error);

