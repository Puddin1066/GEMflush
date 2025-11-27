import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import dotenv from 'dotenv';
import { loggers } from '@/lib/utils/logger';

dotenv.config();

const log = loggers.db;

/**
 * Get database URL with fallback support
 * Supports both DATABASE_URL (Vercel standard) and POSTGRES_URL
 * 
 * @throws {Error} If neither environment variable is set
 */
function getDatabaseUrl(): string {
  // Strategic logging: Log environment variable status
  const hasDatabaseUrl = !!process.env.DATABASE_URL;
  const hasPostgresUrl = !!process.env.POSTGRES_URL;
  const isE2E = !!process.env.PLAYWRIGHT_TEST;
  const isTest = process.env.NODE_ENV === 'test';
  
  log.debug('Database connection initialization', {
    hasDatabaseUrl,
    hasPostgresUrl,
    isE2E,
    isTest,
    nodeEnv: process.env.NODE_ENV,
  });
  
  const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  
  if (!databaseUrl) {
    const errorMessage = 
      'DATABASE_URL or POSTGRES_URL environment variable is not set. ' +
      'Please set it in your Vercel project settings: ' +
      'https://vercel.com/johns-projects-ebcf5697/saas-starter/settings/environment-variables';
    
    log.error('Database URL not configured', {
      hasDatabaseUrl,
      hasPostgresUrl,
      isE2E,
      isTest,
      nodeEnv: process.env.NODE_ENV,
    });
    
    throw new Error(errorMessage);
  }
  
  // Log connection string info (without exposing password)
  const urlInfo = new URL(databaseUrl);
  log.info('Database connection configured', {
    host: urlInfo.hostname,
    port: urlInfo.port,
    database: urlInfo.pathname.replace('/', ''),
    hasUser: !!urlInfo.username,
    isPooler: urlInfo.hostname.includes('pooler'),
    isE2E,
    isTest,
  });
  
  return databaseUrl;
}

/**
 * Create postgres client with proper error handling
 * 
 * @param databaseUrl - Database connection string
 * @returns Configured postgres client
 * @throws {Error} If connection fails with clear error message
 */
function createPostgresClient(databaseUrl: string) {
  try {
    log.debug('Creating postgres client', {
      isPooler: databaseUrl.includes('pooler.supabase.com'),
      hasSSL: true,
      maxConnections: 10,
    });
    
    const client = postgres(databaseUrl, {
      ssl: 'require', // Supabase requires SSL connections
      max: 10, // Maximum number of connections in the pool
      idle_timeout: 20, // Close idle connections after 20 seconds
      connect_timeout: 10, // Connection timeout
      // Handle connection pooler (port 6543) vs direct connection (port 5432)
      ...(databaseUrl.includes('pooler.supabase.com') && {
        // Pooler-specific settings
        max_lifetime: 60 * 30, // 30 minutes
      }),
      // Enhanced error handling
      onnotice: () => {}, // Suppress notices
      transform: {
        undefined: null, // Transform undefined to null for PostgreSQL
      },
    });
    
    log.info('Postgres client created successfully');
    return client;
  } catch (error) {
    // Strategic logging: Log detailed error information
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorCode = (error as any)?.code;
    const errorDetails = {
      errorMessage,
      errorCode,
      errorType: error?.constructor?.name,
      hasDatabaseUrl: !!process.env.DATABASE_URL,
      hasPostgresUrl: !!process.env.POSTGRES_URL,
      isE2E: !!process.env.PLAYWRIGHT_TEST,
      isTest: process.env.NODE_ENV === 'test',
    };
    
    log.error('Failed to create database connection', errorDetails);
    
    throw new Error(
      `Failed to create database connection: ${errorMessage}. ` +
      `Please check your DATABASE_URL or POSTGRES_URL environment variable. ` +
      `Error code: ${errorCode || 'unknown'}`
    );
  }
}

// Support both DATABASE_URL (Vercel standard) and POSTGRES_URL
const databaseUrl = getDatabaseUrl();

// Configure postgres client for Supabase compatibility
// Supabase requires SSL and has specific connection pooler settings
export const client = createPostgresClient(databaseUrl);

export const db = drizzle(client, { schema });
