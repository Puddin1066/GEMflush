import 'server-only';
import type { Business, CrawlJob, LLMFingerprint } from '@/lib/db/schema';

/**
 * Business Status Data Transfer Object (DTO)
 * Transforms domain objects → BusinessStatusDTO for UI consumption
 * 
 * Following Next.js Data Access Layer pattern
 * @see https://nextjs.org/docs/app/building-your-application/data-fetching/patterns#data-access-layer
 */

/**
 * Business Status DTO - composite status for processing display
 */
export interface BusinessStatusDTO {
  businessId: number;
  businessName: string;
  businessUrl: string;
  overallStatus: string;
  overallProgress: number;
  lastCrawledAt: Date | string | null;
  crawl: {
    status: string;
    progress: number;
    jobType: string;
    startedAt: Date | string | null;
    completedAt: Date | string | null;
    pagesDiscovered: number;
    pagesProcessed: number;
    firecrawlJobId: string | null;
    errorMessage: string | null;
  } | null;
  fingerprint: {
    visibilityScore: number | null;
    mentionRate: number | null;
    sentimentScore: number | null;
    accuracyScore: number | null;
    createdAt: Date | string | null;
  } | null;
  isParallelProcessing: boolean;
  hasMultiPageData: boolean;
  processingStartedAt: Date | string | null;
  estimatedCompletion: Date | string | null;
}

/**
 * Transform business status data → BusinessStatusDTO
 */
export function toBusinessStatusDTO(
  business: Business,
  crawlJob: CrawlJob | null,
  fingerprint: LLMFingerprint | null
): BusinessStatusDTO {
  const crawlStatus = crawlJob ? {
    status: crawlJob.status,
    progress: crawlJob.progress || 0,
    jobType: crawlJob.jobType,
    startedAt: crawlJob.startedAt,
    completedAt: crawlJob.completedAt,
    pagesDiscovered: crawlJob.pagesDiscovered || 0,
    pagesProcessed: crawlJob.pagesProcessed || 0,
    firecrawlJobId: crawlJob.firecrawlJobId || null,
    errorMessage: crawlJob.errorMessage || null,
  } : null;

  const fingerprintStatus = fingerprint ? {
    visibilityScore: fingerprint.visibilityScore,
    mentionRate: fingerprint.mentionRate,
    sentimentScore: fingerprint.sentimentScore,
    accuracyScore: fingerprint.accuracyScore,
    createdAt: fingerprint.createdAt,
  } : null;

  // Determine overall status
  let overallStatus = business.status;
  let overallProgress = 0;

  if (crawlStatus) {
    if (crawlStatus.status === 'running') {
      overallStatus = 'processing';
      overallProgress = Math.round(crawlStatus.progress / 2); // Crawl is 50% of total
    } else if (crawlStatus.status === 'completed') {
      if (fingerprintStatus) {
        overallStatus = 'fingerprinted';
        overallProgress = 100;
      } else {
        overallStatus = 'crawled';
        overallProgress = 50;
      }
    } else if (crawlStatus.status === 'failed') {
      overallStatus = 'error';
      overallProgress = 0;
    }
  }

  return {
    businessId: business.id,
    businessName: business.name,
    businessUrl: business.url,
    overallStatus,
    overallProgress,
    lastCrawledAt: business.lastCrawledAt,
    crawl: crawlStatus,
    fingerprint: fingerprintStatus,
    isParallelProcessing: crawlStatus?.status === 'running' || false,
    hasMultiPageData: (crawlStatus?.pagesProcessed || 0) > 1,
    processingStartedAt: crawlStatus?.startedAt || null,
    estimatedCompletion: crawlStatus?.status === 'running' && crawlStatus?.progress 
      ? new Date(Date.now() + ((100 - crawlStatus.progress) * 1000)) // Rough estimate
      : null,
  };
}


