// Monthly Processing Service
// SOLID: Orchestrates recurring automation without HTTP concerns
// DRY: Shared between Vercel cron entrypoint and tests/scripts

import { db } from '@/lib/db/drizzle';
import { businesses, type Business } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { autoStartProcessing } from './business-processing';

/**
 * Run recurring processing for all businesses with automation enabled.
 * Frequency/TTL is enforced inside autoStartProcessing via shouldCrawl/canRunFingerprint.
 */
export async function runMonthlyProcessing(): Promise<void> {
  const dueBusinesses = await db
    .select()
    .from(businesses)
    .where(eq(businesses.automationEnabled, true));

  for (const business of dueBusinesses as Business[]) {
    await autoStartProcessing(business).catch((error) => {
      console.error(
        `[AUTOMATION] Monthly processing failed for business ${business.id} (team ${business.teamId}):`,
        error
      );
    });
  }
}



