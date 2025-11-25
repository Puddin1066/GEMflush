import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import dotenv from 'dotenv';

dotenv.config();

// Support both DATABASE_URL (Vercel standard) and POSTGRES_URL
const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;

if (!databaseUrl) {
  throw new Error(
    'DATABASE_URL or POSTGRES_URL environment variable is not set. ' +
    'Please set it in your Vercel project settings: ' +
    'https://vercel.com/johns-projects-ebcf5697/saas-starter/settings/environment-variables'
  );
}

// Configure postgres client for Supabase compatibility
// Supabase requires SSL and has specific connection pooler settings
export const client = postgres(databaseUrl, {
  ssl: 'require', // Supabase requires SSL connections
  max: 10, // Maximum number of connections in the pool
  idle_timeout: 20, // Close idle connections after 20 seconds
  connect_timeout: 10, // Connection timeout
  // Handle connection pooler (port 6543) vs direct connection (port 5432)
  ...(databaseUrl.includes('pooler.supabase.com') && {
    // Pooler-specific settings
    max_lifetime: 60 * 30, // 30 minutes
  }),
});

export const db = drizzle(client, { schema });
