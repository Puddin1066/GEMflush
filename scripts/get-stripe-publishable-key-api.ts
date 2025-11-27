#!/usr/bin/env tsx
/**
 * Get Stripe Publishable Key via Stripe API
 * 
 * Uses the Stripe API to verify account and provide instructions
 * for retrieving the publishable key.
 * 
 * Note: Stripe API doesn't expose publishable keys directly for security,
 * but we can verify the account and provide the correct dashboard link.
 * 
 * Usage:
 *   pnpm tsx scripts/get-stripe-publishable-key-api.ts
 */

import Stripe from 'stripe';
import * as fs from 'fs';
import * as path from 'path';

async function getStripePublishableKey(): Promise<void> {
  // Get secret key from .env.vercel
  const envFile = path.join(process.cwd(), '.env.vercel');
  if (!fs.existsSync(envFile)) {
    console.error('❌ .env.vercel not found. Pulling from Vercel...');
    const { execSync } = await import('child_process');
    execSync('vercel env pull .env.vercel', { stdio: 'inherit' });
  }
  
  const envContent = fs.readFileSync(envFile, 'utf-8');
  const secretKeyMatch = envContent.match(/^STRIPE_SECRET_KEY="?(.+?)"?$/m);
  
  if (!secretKeyMatch) {
    console.error('❌ STRIPE_SECRET_KEY not found in .env.vercel');
    console.log('\nTo get the publishable key manually:');
    console.log('  1. Go to: https://dashboard.stripe.com/apikeys');
    console.log('  2. Copy the "Publishable key"');
    console.log('  3. Set it: vercel env add NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY production');
    return;
  }
  
  const secretKey = secretKeyMatch[1].replace(/\\n/g, '').replace(/"/g, '').trim();
  const isTestMode = secretKey.startsWith('sk_test_');
  const accountPrefix = secretKey.substring(0, 12); // e.g., "sk_test_51RA"
  
  console.log('🔍 Retrieving Stripe Account Information\n');
  console.log(`Secret Key: ${secretKey.substring(0, 20)}...`);
  console.log(`Mode: ${isTestMode ? 'Test' : 'Live'}\n`);
  
  try {
    const stripe = new Stripe(secretKey, {
      apiVersion: '2025-04-30.basil',
    });
    
    // Retrieve account to verify key works
    const account = await stripe.accounts.retrieve();
    
    console.log('✅ Stripe Account Verified');
    console.log(`   Account ID: ${account.id}`);
    console.log(`   Type: ${account.type}`);
    console.log(`   Email: ${account.email || 'N/A'}\n`);
    
    // Stripe doesn't provide publishable keys via API, but we can provide instructions
    console.log('📋 To Get Your Publishable Key:\n');
    console.log('   Option 1: Stripe Dashboard (Recommended)');
    console.log('   1. Go to: https://dashboard.stripe.com/apikeys');
    console.log(`   2. Look for the publishable key in ${isTestMode ? 'Test' : 'Live'} mode`);
    console.log(`   3. It should start with: pk_${isTestMode ? 'test' : 'live'}_${accountPrefix.substring(8)}`);
    console.log('   4. Copy the full publishable key\n');
    
    console.log('   Option 2: Use Stripe CLI (if configured)');
    console.log('   stripe config --list\n');
    
    // Provide the command to set it
    console.log('   After getting the key, set it in Vercel:');
    console.log('   vercel env add NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY production');
    console.log('   # Paste: pk_test_... or pk_live_...');
    console.log('   vercel env add NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY preview');
    console.log('   vercel env add NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY development\n');
    
    // Try to construct a likely publishable key (not guaranteed to work)
    const likelyPublishableKey = `pk_${isTestMode ? 'test' : 'live'}_${secretKey.substring(8)}`;
    console.log('💡 Likely Publishable Key (verify in dashboard):');
    console.log(`   ${likelyPublishableKey}\n`);
    console.log('   ⚠️  This is an educated guess based on your secret key.');
    console.log('   Please verify in Stripe Dashboard before using.\n');
    
  } catch (error) {
    console.error('❌ Failed to connect to Stripe:', error instanceof Error ? error.message : String(error));
    console.log('\nPlease check:');
    console.log('  1. STRIPE_SECRET_KEY is correct');
    console.log('  2. You have internet connectivity');
    console.log('  3. Stripe API is accessible\n');
  }
}

getStripePublishableKey().catch(console.error);


