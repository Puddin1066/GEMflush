/**
 * Stripe Products Setup Script
 * Creates Pro and Agency products with prices in Stripe
 * 
 * Supports both Stripe API and Stripe CLI
 * 
 * Usage:
 *   pnpm setup:stripe              # Uses Stripe API (requires STRIPE_SECRET_KEY)
 *   pnpm setup:stripe --cli         # Uses Stripe CLI (requires stripe CLI login)
 */

import { stripe } from '../lib/payments/stripe';
import { execSync } from 'child_process';

interface SetupOptions {
  useCli?: boolean;
  skipEnv?: boolean;
}

async function setupStripeProducts(options: SetupOptions = {}) {
  const { useCli = false, skipEnv = false } = options;

  console.log('🚀 Setting up Stripe products and prices...\n');

  if (useCli) {
    return setupViaCLI(skipEnv);
  } else {
    return setupViaAPI(skipEnv);
  }
}

async function setupViaAPI(skipEnv: boolean) {
  try {
    // Validate API key
    if (!process.env.STRIPE_SECRET_KEY) {
      console.error('❌ STRIPE_SECRET_KEY not found in environment variables');
      console.error('   Please set STRIPE_SECRET_KEY in your .env file');
      console.error('   Or use Stripe CLI: pnpm setup:stripe --cli\n');
      process.exit(1);
    }

    // Check if products already exist
    const existingProducts = await stripe.products.list({
      active: true,
      limit: 100,
    });

    // Look for exact match first, then fallback to includes
    const existingPro = existingProducts.data.find((p) =>
      p.name.toLowerCase() === 'pro'
    ) || existingProducts.data.find((p) =>
      p.name.toLowerCase() === 'pro plan'
    ) || existingProducts.data.find((p) =>
      p.name.toLowerCase().includes('pro') && p.metadata?.planId === 'pro'
    );
    
    const existingAgency = existingProducts.data.find((p) =>
      p.name.toLowerCase() === 'agency'
    ) || existingProducts.data.find((p) =>
      p.name.toLowerCase() === 'agency plan'
    ) || existingProducts.data.find((p) =>
      p.name.toLowerCase().includes('agency') && p.metadata?.planId === 'agency'
    );

    // Create Pro Product
    let proProduct;
    if (existingPro) {
      console.log('✅ Pro product already exists:', existingPro.id);
      proProduct = existingPro;
    } else {
      console.log('📦 Creating Pro product...');
      proProduct = await stripe.products.create({
        name: 'Pro',
        description: 'Wikidata Publisher + Premium Features - Up to 5 businesses, weekly fingerprints, Wikidata publishing',
        metadata: {
          planId: 'pro',
          maxBusinesses: '5',
          fingerprintFrequency: 'weekly',
        },
      });
      console.log('✅ Pro product created:', proProduct.id);
    }

    // Create Pro Price
    const existingProPrices = await stripe.prices.list({
      product: proProduct.id,
      active: true,
    });

    let proPrice;
    if (existingProPrices.data.length > 0) {
      proPrice = existingProPrices.data[0];
      console.log('✅ Pro price already exists:', proPrice.id);
    } else {
      console.log('💰 Creating Pro price ($49/month)...');
      proPrice = await stripe.prices.create({
        product: proProduct.id,
        unit_amount: 4900, // $49.00 in cents
        currency: 'usd',
        recurring: {
          interval: 'month',
          trial_period_days: 14,
        },
        metadata: {
          planId: 'pro',
        },
      });
      console.log('✅ Pro price created:', proPrice.id);
    }

    // Create Agency Product
    let agencyProduct;
    if (existingAgency) {
      console.log('✅ Agency product already exists:', existingAgency.id);
      agencyProduct = existingAgency;
    } else {
      console.log('📦 Creating Agency product...');
      agencyProduct = await stripe.products.create({
        name: 'Agency',
        description: 'For marketing agencies and consultants - Up to 25 businesses, API access, priority support',
        metadata: {
          planId: 'agency',
          maxBusinesses: '25',
          fingerprintFrequency: 'weekly',
        },
      });
      console.log('✅ Agency product created:', agencyProduct.id);
    }

    // Create Agency Price
    const existingAgencyPrices = await stripe.prices.list({
      product: agencyProduct.id,
      active: true,
    });

    let agencyPrice;
    if (existingAgencyPrices.data.length > 0) {
      agencyPrice = existingAgencyPrices.data[0];
      console.log('✅ Agency price already exists:', agencyPrice.id);
    } else {
      console.log('💰 Creating Agency price ($149/month)...');
      agencyPrice = await stripe.prices.create({
        product: agencyProduct.id,
        unit_amount: 14900, // $149.00 in cents
        currency: 'usd',
        recurring: {
          interval: 'month',
          trial_period_days: 14,
        },
        metadata: {
          planId: 'agency',
        },
      });
      console.log('✅ Agency price created:', agencyPrice.id);
    }

    console.log('\n✨ Setup complete!\n');
    
    if (!skipEnv) {
      console.log('📋 Optional: Add these to your .env file:\n');
      console.log(`STRIPE_PRO_PRICE_ID=${proPrice.id}`);
      console.log(`STRIPE_AGENCY_PRICE_ID=${agencyPrice.id}\n`);
    }
    
    console.log('💡 Note: The pricing page will automatically find products by name.');
    console.log('   You can also use these price IDs directly if needed.\n');

    return { proPrice: proPrice.id, agencyPrice: agencyPrice.id };
  } catch (error) {
    console.error('❌ Error setting up Stripe products:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      if (error.message.includes('No such API key')) {
        console.error('\n💡 Tip: Make sure your STRIPE_SECRET_KEY is valid');
        console.error('   For test mode, use: sk_test_...');
        console.error('   For live mode, use: sk_live_...');
      }
    }
    throw error;
  }
}

async function setupViaCLI(skipEnv: boolean) {
  console.log('📡 Using Stripe CLI...\n');

  try {
    // Check if Stripe CLI is installed
    execSync('stripe --version', { stdio: 'ignore' });
  } catch {
    console.error('❌ Stripe CLI not found');
    console.error('   Install it: https://stripe.com/docs/stripe-cli');
    console.error('   Or use API: pnpm setup:stripe (without --cli flag)\n');
    process.exit(1);
  }

  try {
    // Check for existing products using Stripe CLI
    let existingPro: any = null;
    let existingAgency: any = null;
    
    try {
      const productsOutput = execSync(
        'stripe products list --limit=100',
        { encoding: 'utf-8' }
      );
      const products = JSON.parse(productsOutput);
      
      existingPro = products.data?.find((p: any) =>
        p.name.toLowerCase() === 'pro' || 
        p.name.toLowerCase() === 'pro plan' ||
        (p.name.toLowerCase().includes('pro') && p.metadata?.planId === 'pro')
      );
      
      existingAgency = products.data?.find((p: any) =>
        p.name.toLowerCase() === 'agency' || 
        p.name.toLowerCase() === 'agency plan' ||
        (p.name.toLowerCase().includes('agency') && p.metadata?.planId === 'agency')
      );
    } catch {
      // If listing fails, continue and try to create (will fail gracefully if duplicates)
      console.log('⚠️  Could not check for existing products, will attempt to create...\n');
    }

    // Create or use existing Pro product
    let proProduct;
    if (existingPro) {
      console.log('✅ Pro product already exists:', existingPro.id);
      proProduct = existingPro;
    } else {
      console.log('📦 Creating Pro product...');
      try {
        const proProductOutput = execSync(
          `stripe products create --name="Pro" --description="Wikidata Publisher + Premium Features - Up to 5 businesses, weekly fingerprints, Wikidata publishing" --metadata[planId]=pro --metadata[maxBusinesses]=5 --metadata[fingerprintFrequency]=weekly`,
          { encoding: 'utf-8' }
        );
        proProduct = JSON.parse(proProductOutput);
        console.log('✅ Pro product created:', proProduct.id);
      } catch (error: any) {
        if (error.message.includes('already exists') || error.message.includes('duplicate')) {
          console.log('⚠️  Pro product may already exist, checking again...');
          // Try to find it
          const productsOutput = execSync('stripe products list --limit=100', { encoding: 'utf-8' });
          const products = JSON.parse(productsOutput);
          proProduct = products.data?.find((p: any) =>
            p.name.toLowerCase() === 'pro' || 
            (p.name.toLowerCase().includes('pro') && p.metadata?.planId === 'pro')
          );
          if (proProduct) {
            console.log('✅ Found existing Pro product:', proProduct.id);
          } else {
            throw error;
          }
        } else {
          throw error;
        }
      }
    }

    // Check for existing Pro prices
    let proPrice;
    try {
      const pricesOutput = execSync(
        `stripe prices list --product=${proProduct.id} --limit=10`,
        { encoding: 'utf-8' }
      );
      const prices = JSON.parse(pricesOutput);
      if (prices.data && prices.data.length > 0) {
        proPrice = prices.data[0];
        console.log('✅ Pro price already exists:', proPrice.id);
      }
    } catch {
      // Continue to create
    }

    if (!proPrice) {
      console.log('💰 Creating Pro price ($49/month)...');
      try {
        const proPriceOutput = execSync(
          `stripe prices create --product=${proProduct.id} --unit-amount=4900 --currency=usd --recurring[interval]=month --recurring[trial_period_days]=14 --metadata[planId]=pro`,
          { encoding: 'utf-8' }
        );
        proPrice = JSON.parse(proPriceOutput);
        console.log('✅ Pro price created:', proPrice.id);
      } catch (error: any) {
        if (error.message.includes('already exists') || error.message.includes('duplicate')) {
          console.log('⚠️  Pro price may already exist, checking again...');
          const pricesOutput = execSync(
            `stripe prices list --product=${proProduct.id} --limit=10`,
            { encoding: 'utf-8' }
          );
          const prices = JSON.parse(pricesOutput);
          if (prices.data && prices.data.length > 0) {
            proPrice = prices.data[0];
            console.log('✅ Found existing Pro price:', proPrice.id);
          } else {
            throw error;
          }
        } else {
          throw error;
        }
      }
    }

    // Create or use existing Agency product
    let agencyProduct;
    if (existingAgency) {
      console.log('✅ Agency product already exists:', existingAgency.id);
      agencyProduct = existingAgency;
    } else {
      console.log('📦 Creating Agency product...');
      try {
        const agencyProductOutput = execSync(
          `stripe products create --name="Agency" --description="For marketing agencies and consultants - Up to 25 businesses, API access, priority support" --metadata[planId]=agency --metadata[maxBusinesses]=25 --metadata[fingerprintFrequency]=weekly`,
          { encoding: 'utf-8' }
        );
        agencyProduct = JSON.parse(agencyProductOutput);
        console.log('✅ Agency product created:', agencyProduct.id);
      } catch (error: any) {
        if (error.message.includes('already exists') || error.message.includes('duplicate')) {
          console.log('⚠️  Agency product may already exist, checking again...');
          const productsOutput = execSync('stripe products list --limit=100', { encoding: 'utf-8' });
          const products = JSON.parse(productsOutput);
          agencyProduct = products.data?.find((p: any) =>
            p.name.toLowerCase() === 'agency' || 
            (p.name.toLowerCase().includes('agency') && p.metadata?.planId === 'agency')
          );
          if (agencyProduct) {
            console.log('✅ Found existing Agency product:', agencyProduct.id);
          } else {
            throw error;
          }
        } else {
          throw error;
        }
      }
    }

    // Check for existing Agency prices
    let agencyPrice;
    try {
      const pricesOutput = execSync(
        `stripe prices list --product=${agencyProduct.id} --limit=10`,
        { encoding: 'utf-8' }
      );
      const prices = JSON.parse(pricesOutput);
      if (prices.data && prices.data.length > 0) {
        agencyPrice = prices.data[0];
        console.log('✅ Agency price already exists:', agencyPrice.id);
      }
    } catch {
      // Continue to create
    }

    if (!agencyPrice) {
      console.log('💰 Creating Agency price ($149/month)...');
      try {
        const agencyPriceOutput = execSync(
          `stripe prices create --product=${agencyProduct.id} --unit-amount=14900 --currency=usd --recurring[interval]=month --recurring[trial_period_days]=14 --metadata[planId]=agency`,
          { encoding: 'utf-8' }
        );
        agencyPrice = JSON.parse(agencyPriceOutput);
        console.log('✅ Agency price created:', agencyPrice.id);
      } catch (error: any) {
        if (error.message.includes('already exists') || error.message.includes('duplicate')) {
          console.log('⚠️  Agency price may already exist, checking again...');
          const pricesOutput = execSync(
            `stripe prices list --product=${agencyProduct.id} --limit=10`,
            { encoding: 'utf-8' }
          );
          const prices = JSON.parse(pricesOutput);
          if (prices.data && prices.data.length > 0) {
            agencyPrice = prices.data[0];
            console.log('✅ Found existing Agency price:', agencyPrice.id);
          } else {
            throw error;
          }
        } else {
          throw error;
        }
      }
    }

    console.log('\n✨ Setup complete!\n');
    
    if (!skipEnv) {
      console.log('📋 Optional: Add these to your .env file:\n');
      console.log(`STRIPE_PRO_PRICE_ID=${proPrice.id}`);
      console.log(`STRIPE_AGENCY_PRICE_ID=${agencyPrice.id}\n`);
    }
    
    console.log('💡 Note: The pricing page will automatically find products by name.');
    console.log('   You can also use these price IDs directly if needed.\n');

    return { proPrice: proPrice.id, agencyPrice: agencyPrice.id };
  } catch (error: any) {
    console.error('❌ Error setting up Stripe products via CLI:', error.message);
    if (error.message.includes('not authenticated')) {
      console.error('\n💡 Tip: Run "stripe login" first');
    }
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  const args = process.argv.slice(2);
  const useCli = args.includes('--cli');
  const skipEnv = args.includes('--skip-env');

  setupStripeProducts({ useCli, skipEnv })
    .then(() => {
      console.log('✅ Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Script failed:', error);
      process.exit(1);
    });
}

export { setupStripeProducts };

