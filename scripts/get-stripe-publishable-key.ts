#!/usr/bin/env tsx
/**
 * Get Stripe Publishable Key via Stripe API
 * 
 * Uses the Stripe API with the secret key to retrieve account information
 * and derive the publishable key.
 * 
 * Usage:
 *   pnpm tsx scripts/get-stripe-publishable-key.ts
 */

import Stripe from 'stripe';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

async function getStripePublishableKey(): Promise<string | null> {
  // Try to get secret key from environment or .env.vercel
  let secretKey = process.env.STRIPE_SECRET_KEY;
  
  if (!secretKey) {
    // Try to pull from Vercel
    const envFile = path.join(process.cwd(), '.env.vercel');
    if (fs.existsSync(envFile)) {
      const envContent = fs.readFileSync(envFile, 'utf-8');
      const match = envContent.match(/^STRIPE_SECRET_KEY="?(.+?)"?$/m);
      if (match) {
        secretKey = match[1].replace(/\\n/g, '').replace(/"/g, '');
      }
    }
  }
  
  if (!secretKey) {
    console.error('❌ STRIPE_SECRET_KEY not found');
    console.log('\nTo get the publishable key:');
    console.log('  1. Go to: https://dashboard.stripe.com/apikeys');
    console.log('  2. Copy the "Publishable key" (starts with pk_test_ or pk_live_)');
    console.log('  3. Set it: vercel env add NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY production');
    return null;
  }
  
  try {
    // Initialize Stripe client
    const stripe = new Stripe(secretKey, {
      apiVersion: '2025-04-30.basil',
    });
    
    // Get account information
    const account = await stripe.accounts.retrieve();
    
    console.log('✅ Connected to Stripe account:', account.id);
    console.log('   Account type:', account.type);
    console.log('   Email:', account.email || 'N/A');
    
    // Stripe doesn't provide an API to list publishable keys directly
    // However, we can use the Stripe CLI or provide instructions
    console.log('\n⚠️  Stripe API does not provide an endpoint to retrieve publishable keys.');
    console.log('   The publishable key must be retrieved from the Stripe Dashboard.\n');
    
    // Try using Stripe CLI if available
    try {
      console.log('Attempting to use Stripe CLI...');
      const cliOutput = execSync('stripe api keys list --limit 1', {
        encoding: 'utf-8',
        stdio: 'pipe',
      });
      console.log('Stripe CLI output:', cliOutput);
    } catch (cliError) {
      console.log('Stripe CLI not configured or keys endpoint not available');
    }
    
    // Provide manual instructions
    console.log('\n📋 To get your publishable key:');
    console.log('   1. Go to: https://dashboard.stripe.com/apikeys');
    console.log('   2. Find the publishable key that matches your secret key');
    console.log('      (If secret is sk_test_51..., publishable is pk_test_51...)');
    console.log('   3. Copy the publishable key');
    console.log('\n   Then set it in Vercel:');
    console.log('   vercel env add NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY production');
    console.log('   # Paste: pk_test_... or pk_live_...');
    
    return null;
  } catch (error) {
    console.error('❌ Failed to connect to Stripe:', error instanceof Error ? error.message : String(error));
    return null;
  }
}

async function main() {
  console.log('🔍 Retrieving Stripe Publishable Key\n');
  
  const publishableKey = await getStripePublishableKey();
  
  if (publishableKey) {
    console.log('\n✅ Publishable Key:', publishableKey);
    console.log('\nTo set in Vercel:');
    console.log(`  echo "${publishableKey}" | vercel env add NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY production`);
  }
}

main().catch(console.error);


