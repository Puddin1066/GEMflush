/**
 * Monthly Processing Cron Endpoint
 * @deprecated This endpoint is kept for backward compatibility
 * All scheduled automation now uses the unified processScheduledAutomation() function
 * This endpoint redirects to the unified processing (frequency-aware)
 * 
 * For new deployments, use /api/cron/weekly-crawls which handles all frequencies
 */

import { NextRequest, NextResponse } from 'next/server';
import { processScheduledAutomation } from '@/lib/services/scheduler-service-execution';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Vercel Cron sends requests with 'x-vercel-cron' header
    // Also support manual calls with CRON_SECRET for testing
    const vercelCronHeader = request.headers.get('x-vercel-cron');
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    // Allow if:
    // 1. Request is from Vercel Cron (has x-vercel-cron header)
    // 2. No secret configured (development)
    // 3. Secret matches (manual testing)
    const isVercelCron = vercelCronHeader === '1';
    const hasValidSecret = !cronSecret || authHeader === `Bearer ${cronSecret}`;
    
    if (!isVercelCron && !hasValidSecret) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('[CRON] Monthly processing endpoint called (using unified processing)');
    const results = await processScheduledAutomation({
      batchSize: 10,
      catchMissed: true,
    });

    return NextResponse.json({
      success: true,
      message: 'Monthly processing completed (unified automation)',
      results,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[CRON] Error processing monthly updates:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}


