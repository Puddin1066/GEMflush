#!/usr/bin/env tsx
/**
 * Check and Set Missing Environment Variables
 * 
 * Checks which required environment variables are missing in Vercel
 * and helps you set them.
 * 
 * Usage:
 *   pnpm tsx scripts/check-and-set-env.ts
 */

import { execSync } from 'child_process';

interface EnvVar {
  name: string;
  required: boolean;
  description: string;
  validate?: (value: string) => boolean;
}

const REQUIRED_VARS: EnvVar[] = [
  {
    name: 'DATABASE_URL',
    required: true,
    description: 'PostgreSQL connection string',
    validate: (v) => v.startsWith('postgresql://') || v.startsWith('postgres://'),
  },
  {
    name: 'POSTGRES_URL',
    required: false, // Can use DATABASE_URL instead
    description: 'PostgreSQL connection string (alternative to DATABASE_URL)',
  },
  {
    name: 'AUTH_SECRET',
    required: true,
    description: 'Authentication secret (32+ characters)',
    validate: (v) => v.length >= 32,
  },
  {
    name: 'STRIPE_SECRET_KEY',
    required: true,
    description: 'Stripe secret key',
    validate: (v) => v.startsWith('sk_test_') || v.startsWith('sk_live_'),
  },
  {
    name: 'STRIPE_WEBHOOK_SECRET',
    required: true,
    description: 'Stripe webhook secret',
    validate: (v) => v.startsWith('whsec_'),
  },
  {
    name: 'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
    required: true,
    description: 'Stripe publishable key',
    validate: (v) => v.startsWith('pk_test_') || v.startsWith('pk_live_'),
  },
  {
    name: 'NEXT_PUBLIC_APP_URL',
    required: true,
    description: 'Application URL',
    validate: (v) => v.startsWith('http://') || v.startsWith('https://'),
  },
];

const OPTIONAL_VARS: EnvVar[] = [
  {
    name: 'SENTRY_DSN',
    required: false,
    description: 'Sentry DSN for error tracking',
    validate: (v) => v.startsWith('https://'),
  },
  {
    name: 'WIKIDATA_PUBLISH_MODE',
    required: false,
    description: 'Wikidata publish mode (mock|test|production)',
    validate: (v) => ['mock', 'test', 'production'].includes(v),
  },
  {
    name: 'WIKIDATA_BOT_USERNAME',
    required: false,
    description: 'Wikidata bot username',
  },
  {
    name: 'WIKIDATA_BOT_PASSWORD',
    required: false,
    description: 'Wikidata bot password',
  },
];

function getEnvVars(): Set<string> {
  try {
    const output = execSync('vercel env ls', { encoding: 'utf-8' });
    const vars = new Set<string>();
    const lines = output.split('\n');
    
    for (const line of lines) {
      const match = line.match(/^(\S+)\s+/);
      if (match) {
        vars.add(match[1]);
      }
    }
    
    return vars;
  } catch (error) {
    console.error('Failed to get environment variables:', error);
    return new Set();
  }
}

function checkVar(varDef: EnvVar, existingVars: Set<string>, env: string): {
  exists: boolean;
  needsSet: boolean;
} {
  const exists = existingVars.has(varDef.name);
  
  // Special case: DATABASE_URL or POSTGRES_URL
  if (varDef.name === 'DATABASE_URL') {
    const hasPostgresUrl = existingVars.has('POSTGRES_URL');
    return {
      exists: exists || hasPostgresUrl,
      needsSet: !exists && !hasPostgresUrl,
    };
  }
  
  return {
    exists,
    needsSet: !exists && varDef.required,
  };
}

async function main() {
  console.log('🔍 Checking Vercel Environment Variables\n');
  
  const existingVars = getEnvVars();
  const environments = ['production', 'preview', 'development'];
  
  console.log('📋 Required Variables\n');
  const missingRequired: EnvVar[] = [];
  
  for (const varDef of REQUIRED_VARS) {
    const results = environments.map((env) => checkVar(varDef, existingVars, env));
    const allExist = results.every((r) => r.exists);
    const needsSet = results.some((r) => r.needsSet);
    
    if (allExist) {
      console.log(`  ✅ ${varDef.name} - Set for all environments`);
    } else if (needsSet) {
      console.log(`  ❌ ${varDef.name} - Missing`);
      console.log(`     ${varDef.description}`);
      missingRequired.push(varDef);
    } else {
      console.log(`  ⚠️  ${varDef.name} - Partially set`);
      missingRequired.push(varDef);
    }
  }
  
  console.log('\n📌 Optional Variables\n');
  const missingOptional: EnvVar[] = [];
  
  for (const varDef of OPTIONAL_VARS) {
    const exists = existingVars.has(varDef.name);
    if (exists) {
      console.log(`  ✅ ${varDef.name} - Set`);
    } else {
      console.log(`  ⏭️  ${varDef.name} - Not set (optional)`);
      missingOptional.push(varDef);
    }
  }
  
  if (missingRequired.length === 0) {
    console.log('\n✅ All required environment variables are set!\n');
    console.log('Next steps:');
    console.log('  1. Redeploy: vercel --prod');
    console.log('  2. Test health check: curl https://your-app.vercel.app/api/health');
    return;
  }
  
  console.log(`\n❌ Missing ${missingRequired.length} required variable(s)\n`);
  console.log('To set missing variables, run:');
  console.log('  pnpm tsx scripts/set-vercel-env-quick.ts\n');
  console.log('Or set them manually:');
  for (const varDef of missingRequired) {
    console.log(`  vercel env add ${varDef.name} production`);
    console.log(`  vercel env add ${varDef.name} preview`);
    console.log(`  vercel env add ${varDef.name} development`);
  }
}

main().catch(console.error);


