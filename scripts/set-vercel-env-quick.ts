#!/usr/bin/env tsx
/**
 * Quick Vercel Environment Variables Setup
 * 
 * Interactive script to set all required environment variables in Vercel.
 * Uses Vercel CLI to set variables for Production, Preview, and Development.
 * 
 * Usage:
 *   pnpm tsx scripts/set-vercel-env-quick.ts
 * 
 * Prerequisites:
 *   1. Vercel CLI installed: npm i -g vercel
 *   2. Logged in: vercel login
 *   3. Linked to project: vercel link
 */

import { execSync } from 'child_process';
import * as readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(query: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(query, resolve);
  });
}

function execCommand(command: string): string {
  try {
    return execSync(command, { encoding: 'utf-8', stdio: 'pipe' }).trim();
  } catch (error) {
    return '';
  }
}

async function setEnvVar(name: string, description: string, required: boolean = true): Promise<boolean> {
  console.log(`\n${required ? '📋' : '📌'} ${name}`);
  console.log(`   ${description}`);
  
  // Check if already set
  const existing = execCommand(`vercel env ls 2>/dev/null | grep "^${name}" || true`);
  if (existing) {
    console.log(`   ⚠️  Already set. Current value: ${existing.split(/\s+/)[1] || 'hidden'}`);
    const skip = await question('   Skip? (y/n): ');
    if (skip.toLowerCase() === 'y') {
      return false;
    }
  }
  
  const value = await question(`   Enter value${required ? ' (required)' : ' (optional, press Enter to skip)'}: `);
  
  if (!value && required) {
    console.log(`   ❌ ${name} is required. Skipping for now...`);
    return false;
  }
  
  if (!value && !required) {
    console.log(`   ⏭️  Skipped ${name}`);
    return false;
  }
  
  // Set for all environments
  const environments = ['production', 'preview', 'development'];
  for (const env of environments) {
    try {
      // Use echo to pipe value to vercel env add
      execSync(`echo "${value}" | vercel env add ${name} ${env}`, { stdio: 'inherit' });
      console.log(`   ✅ Set for ${env}`);
    } catch (error) {
      console.log(`   ⚠️  Failed to set for ${env}: ${error}`);
    }
  }
  
  return true;
}

async function main() {
  console.log('🚀 Vercel Environment Variables Setup');
  console.log('=====================================\n');
  console.log('This script will help you set all required environment variables.');
  console.log('Make sure you have:');
  console.log('  1. Vercel CLI installed: npm i -g vercel');
  console.log('  2. Logged in: vercel login');
  console.log('  3. Linked to project: vercel link\n');
  
  const proceed = await question('Ready to proceed? (y/n): ');
  if (proceed.toLowerCase() !== 'y') {
    console.log('Cancelled.');
    rl.close();
    return;
  }
  
  // Required variables
  console.log('\n📋 Required Variables');
  console.log('====================');
  
  await setEnvVar(
    'DATABASE_URL',
    'PostgreSQL connection string (postgresql://user:password@host:port/database)',
    true
  );
  
  await setEnvVar(
    'AUTH_SECRET',
    'Authentication secret (generate with: openssl rand -base64 32)',
    true
  );
  
  await setEnvVar(
    'STRIPE_SECRET_KEY',
    'Stripe secret key (sk_test_... or sk_live_...)',
    true
  );
  
  await setEnvVar(
    'STRIPE_WEBHOOK_SECRET',
    'Stripe webhook secret (whsec_...)',
    true
  );
  
  await setEnvVar(
    'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
    'Stripe publishable key (pk_test_... or pk_live_...)',
    true
  );
  
  await setEnvVar(
    'NEXT_PUBLIC_APP_URL',
    'Application URL (https://your-app.vercel.app)',
    true
  );
  
  // Optional variables
  console.log('\n📌 Optional Variables');
  console.log('=====================');
  console.log('These are optional but recommended. Press Enter to skip.\n');
  
  await setEnvVar(
    'SENTRY_DSN',
    'Sentry DSN for error tracking (https://...@sentry.io/...)',
    false
  );
  
  await setEnvVar(
    'WIKIDATA_PUBLISH_MODE',
    'Wikidata publish mode (mock|test|production, default: test)',
    false
  );
  
  await setEnvVar(
    'WIKIDATA_BOT_USERNAME',
    'Wikidata bot username (required if WIKIDATA_PUBLISH_MODE=production)',
    false
  );
  
  await setEnvVar(
    'WIKIDATA_BOT_PASSWORD',
    'Wikidata bot password (required if WIKIDATA_PUBLISH_MODE=production)',
    false
  );
  
  await setEnvVar(
    'OPENROUTER_API_KEY',
    'OpenRouter API key for LLM features (sk-or-v1-...)',
    false
  );
  
  await setEnvVar(
    'GOOGLE_SEARCH_API_KEY',
    'Google Custom Search API key',
    false
  );
  
  await setEnvVar(
    'GOOGLE_SEARCH_ENGINE_ID',
    'Google Custom Search Engine ID',
    false
  );
  
  await setEnvVar(
    'RESEND_API_KEY',
    'Resend API key for emails',
    false
  );
  
  await setEnvVar(
    'EMAIL_FROM',
    'Email from address (e.g., GEMflush <noreply@gemflush.com>)',
    false
  );
  
  await setEnvVar(
    'SUPPORT_EMAIL',
    'Support email address',
    false
  );
  
  console.log('\n✅ Environment Variables Setup Complete!\n');
  console.log('Next steps:');
  console.log('  1. Verify variables: vercel env ls');
  console.log('  2. Redeploy: vercel --prod');
  console.log('  3. Test health check: curl https://your-app.vercel.app/api/health');
  console.log('  4. Check environment validation: View deployment logs\n');
  
  rl.close();
}

main().catch((error) => {
  console.error('Error:', error);
  rl.close();
  process.exit(1);
});


