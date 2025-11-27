/**
 * Health Check Endpoint
 * 
 * Simple health check to verify application and database connectivity.
 * Used by monitoring services (UptimeRobot, etc.)
 * 
 * SOLID: Single Responsibility - health checking only
 */

import { NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { sql } from 'drizzle-orm';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  const startTime = Date.now();
  const checks: Record<string, { status: 'healthy' | 'degraded' | 'unhealthy'; latency?: number }> = {};

  // Check database connectivity
  try {
    const dbStartTime = Date.now();
    await db.execute(sql`SELECT 1`);
    const dbLatency = Date.now() - dbStartTime;
    
    checks.database = {
      status: dbLatency < 1000 ? 'healthy' : dbLatency < 5000 ? 'degraded' : 'unhealthy',
      latency: dbLatency,
    };
  } catch (error) {
    checks.database = {
      status: 'unhealthy',
    };
  }

  // Determine overall status
  const hasUnhealthy = Object.values(checks).some((check) => check.status === 'unhealthy');
  const hasDegraded = Object.values(checks).some((check) => check.status === 'degraded');
  
  const overallStatus = hasUnhealthy ? 'unhealthy' : hasDegraded ? 'degraded' : 'healthy';
  const statusCode = hasUnhealthy ? 503 : hasDegraded ? 200 : 200;
  const totalLatency = Date.now() - startTime;

  return NextResponse.json(
    {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      checks,
      latency: totalLatency,
    },
    {
      status: statusCode,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    }
  );
}


