/**
 * Weekly Crawls Cron Endpoint
 * SOLID: Single Responsibility - handles scheduled weekly crawl processing
 * Protected with API key or Vercel Cron
 */

import { NextRequest, NextResponse } from 'next/server';
import { processWeeklyCrawls } from '@/lib/services/scheduler-service';

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

    console.log('[CRON] Weekly crawls endpoint called');
    await processWeeklyCrawls();

    return NextResponse.json({
      success: true,
      message: 'Weekly crawls processed',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[CRON] Error processing weekly crawls:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

