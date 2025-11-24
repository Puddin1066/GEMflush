/**
 * Check full business details including crawl data and errors
 */

import { db } from '@/lib/db/drizzle';
import { businesses, crawlJobs, llmFingerprints } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';

async function checkBusinessDetails(businessId: number) {
  const [business] = await db
    .select()
    .from(businesses)
    .where(eq(businesses.id, businessId))
    .limit(1);

  if (!business) {
    console.log(`❌ Business ${businessId} not found`);
    return;
  }

  console.log('\n📊 Business Details:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Name: ${business.name}`);
  console.log(`Status: ${business.status}`);
  console.log(`URL: ${business.url}`);
  console.log(`Crawl Data: ${business.crawlData ? 'Present' : 'Missing'}`);
  if (business.crawlData) {
    const crawlData = typeof business.crawlData === 'string' 
      ? JSON.parse(business.crawlData) 
      : business.crawlData;
    console.log(`  - Name extracted: ${crawlData.name || 'None'}`);
    console.log(`  - Location: ${crawlData.location ? JSON.stringify(crawlData.location) : 'None'}`);
  }
  console.log(`Last Crawled: ${business.lastCrawledAt ? new Date(business.lastCrawledAt).toISOString() : 'Never'}`);

  // Check crawl jobs
  const jobs = await db
    .select()
    .from(crawlJobs)
    .where(eq(crawlJobs.businessId, businessId))
    .orderBy(desc(crawlJobs.createdAt))
    .limit(3);

  console.log(`\n📋 Crawl Jobs (${jobs.length}):`);
  if (jobs.length > 0) {
    jobs.forEach((job, i) => {
      console.log(`\n  Job ${i + 1}:`);
      console.log(`    Status: ${job.status}`);
      console.log(`    Created: ${new Date(job.createdAt).toISOString()}`);
      if (job.completedAt) {
        console.log(`    Completed: ${new Date(job.completedAt).toISOString()}`);
      }
      if (job.errorMessage) {
        console.log(`    ❌ Error: ${job.errorMessage}`);
      }
      if (job.result) {
        const result = typeof job.result === 'string' ? JSON.parse(job.result) : job.result;
        console.log(`    Result: ${result.success ? 'Success' : 'Failed'}`);
        if (result.error) {
          console.log(`    Error: ${result.error}`);
        }
      }
    });
  } else {
    console.log('  No crawl jobs found');
  }

  // Check fingerprints
  const fingerprints = await db
    .select()
    .from(llmFingerprints)
    .where(eq(llmFingerprints.businessId, businessId))
    .orderBy(desc(llmFingerprints.createdAt))
    .limit(1);

  console.log(`\n🔍 Fingerprints (${fingerprints.length}):`);
  if (fingerprints.length > 0) {
    const fp = fingerprints[0];
    console.log(`  ID: ${fp.id}`);
    console.log(`  Created: ${new Date(fp.createdAt).toISOString()}`);
    console.log(`  Visibility Score: ${fp.visibilityScore || 'N/A'}`);
  } else {
    console.log('  No fingerprints found');
  }

  console.log('\n');
}

const businessId = process.argv[2] ? parseInt(process.argv[2], 10) : 768;
checkBusinessDetails(businessId)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });



