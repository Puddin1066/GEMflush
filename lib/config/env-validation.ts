/**
 * Environment Variable Validation
 * 
 * Validates all required environment variables at startup.
 * Fails fast with clear error messages if validation fails.
 * 
 * SOLID: Single Responsibility - only handles env var validation
 * DRY: Centralized validation logic
 */

import { z } from 'zod';

const envSchema = z.object({
  // Required for all environments
  DATABASE_URL: z
    .string()
    .min(1, 'DATABASE_URL is required')
    .refine(
      (val) => val.startsWith('postgresql://') || val.startsWith('postgres://'),
      'DATABASE_URL must be a valid PostgreSQL connection string'
    ),
  AUTH_SECRET: z
    .string()
    .min(32, 'AUTH_SECRET must be at least 32 characters'),
  
  // Stripe (required for subscriptions)
  STRIPE_SECRET_KEY: z
    .string()
    .min(1, 'STRIPE_SECRET_KEY is required')
    .refine(
      (val) => val.startsWith('sk_test_') || val.startsWith('sk_live_'),
      'STRIPE_SECRET_KEY must start with sk_test_ or sk_live_'
    ),
  STRIPE_WEBHOOK_SECRET: z
    .string()
    .min(1, 'STRIPE_WEBHOOK_SECRET is required')
    .refine(
      (val) => val.startsWith('whsec_'),
      'STRIPE_WEBHOOK_SECRET must start with whsec_'
    ),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z
    .string()
    .min(1, 'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is required')
    .refine(
      (val) => val.startsWith('pk_test_') || val.startsWith('pk_live_'),
      'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY must start with pk_test_ or pk_live_'
    ),
  
  // Application URL
  NEXT_PUBLIC_APP_URL: z
    .string()
    .url('NEXT_PUBLIC_APP_URL must be a valid URL'),
  
  // Optional but validated if present
  OPENROUTER_API_KEY: z
    .string()
    .startsWith('sk-or-v1-', 'OPENROUTER_API_KEY must start with sk-or-v1-')
    .optional(),
  
  WIKIDATA_BOT_USERNAME: z.string().optional(),
  WIKIDATA_BOT_PASSWORD: z.string().optional(),
  WIKIDATA_PUBLISH_MODE: z
    .enum(['mock', 'test', 'production'], {
      errorMap: () => ({ message: 'WIKIDATA_PUBLISH_MODE must be mock, test, or production' }),
    })
    .optional(),
  
  // Sentry (optional but validated if present)
  SENTRY_DSN: z.string().url('SENTRY_DSN must be a valid URL').optional(),
  
  // Support both DATABASE_URL and POSTGRES_URL
  POSTGRES_URL: z.string().optional(),
});

/**
 * Validate environment variables
 * 
 * @throws {Error} If validation fails with detailed error message
 */
export function validateEnv(): z.infer<typeof envSchema> {
  try {
    // Support both DATABASE_URL and POSTGRES_URL (use POSTGRES_URL if DATABASE_URL not set)
    const env = {
      ...process.env,
      DATABASE_URL: process.env.DATABASE_URL || process.env.POSTGRES_URL || '',
    };
    
    return envSchema.parse(env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.errors
        .filter((e) => e.code === 'too_small' || e.code === 'invalid_type')
        .map((e) => e.path.join('.'));
      
      const invalidVars = error.errors
        .filter((e) => e.code !== 'too_small' && e.code !== 'invalid_type')
        .map((e) => `${e.path.join('.')}: ${e.message}`);
      
      let errorMessage = '❌ Environment variable validation failed:\n\n';
      
      if (missingVars.length > 0) {
        errorMessage += `Missing required variables:\n${missingVars.map((v) => `  - ${v}`).join('\n')}\n\n`;
      }
      
      if (invalidVars.length > 0) {
        errorMessage += `Invalid variables:\n${invalidVars.map((v) => `  - ${v}`).join('\n')}\n\n`;
      }
      
      errorMessage += 'Please check your deployment configuration and ensure all required environment variables are set.';
      
      throw new Error(errorMessage);
    }
    
    throw error;
  }
}

/**
 * Get validated environment variables
 * Call this at application startup (not at module load time)
 * 
 * Note: We don't export a pre-validated `env` object because validation
 * should only happen at runtime, not during build time.
 */
// export const env = validateEnv(); // Removed - causes build failures

