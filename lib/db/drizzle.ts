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

export const client = postgres(databaseUrl);
export const db = drizzle(client, { schema });
