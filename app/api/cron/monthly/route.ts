// Monthly automation cron entrypoint
// SOLID: thin HTTP adapter that delegates to monthly-processing service
// DRY: shared logic for Vercel cron and tests

import { NextResponse } from 'next/server';
import { runMonthlyProcessing } from '@/lib/services/monthly-processing';

export const dynamic = 'force-dynamic';

export async function GET() {
  // Safety guard: allow enabling/disabling via env so tests/preview aren't affected
  if (process.env.RUN_MONTHLY_PROCESSING !== 'true') {
    return NextResponse.json(
      {
        success: false,
        message: 'Monthly processing disabled by configuration',
      },
      { status: 200 }
    );
  }

  await runMonthlyProcessing();

  return NextResponse.json(
    {
      success: true,
      message: 'Monthly processing started',
    },
    { status: 200 }
  );
}


