import 'server-only';
import type { CrawlJob } from '@/lib/db/schema';
import type { CrawlResultDTO } from './types';

/**
 * Crawl Job Data Transfer Object (DTO) Adapters
 * Transforms domain CrawlJob → CrawlJobDTO for UI consumption
 * 
 * Following Next.js Data Access Layer pattern
 * @see https://nextjs.org/docs/app/building-your-application/data-fetching/patterns#data-access-layer
 */

/**
 * Crawl Job DTO - for job status display
 */
export interface CrawlJobDTO {
  id: number;
  businessId: number;
  jobType: string;
  status: string;
  progress: number | null;
  result: any;
  errorMessage: string | null;
  firecrawlJobId: string | null;
  startedAt: string | null; // ISO string
  pagesDiscovered: number | null;
  pagesProcessed: number | null;
  firecrawlMetadata: any;
  createdAt: string; // ISO string
  completedAt: string | null; // ISO string
}

/**
 * Transform CrawlJob domain object → CrawlJobDTO
 * Filters out technical details, adds UI-friendly fields
 */
export function toCrawlJobDTO(job: CrawlJob): CrawlJobDTO {
  return {
    id: job.id,
    businessId: job.businessId,
    jobType: job.jobType,
    status: job.status,
    progress: job.progress,
    result: job.result,
    errorMessage: job.errorMessage || null,
    firecrawlJobId: job.firecrawlJobId || null,
    startedAt: job.startedAt instanceof Date 
      ? job.startedAt.toISOString() 
      : job.startedAt,
    pagesDiscovered: job.pagesDiscovered || null,
    pagesProcessed: job.pagesProcessed || null,
    firecrawlMetadata: job.firecrawlMetadata || null,
    createdAt: job.createdAt instanceof Date 
      ? job.createdAt.toISOString() 
      : typeof job.createdAt === 'string' 
        ? job.createdAt 
        : new Date().toISOString(),
    completedAt: job.completedAt instanceof Date 
      ? job.completedAt.toISOString() 
      : job.completedAt,
  };
}


