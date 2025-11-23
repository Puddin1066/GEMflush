import 'server-only';
import { getBusinessById, getLatestCrawlJob } from '@/lib/db/queries';
import type { Business } from '@/lib/db/schema';
import { dtoLogger } from '@/lib/utils/dto-logger';

/**
 * Business Data Transfer Object (DTO) Adapters
 * Transforms domain Business → BusinessDetailDTO for UI consumption
 * 
 * Following Next.js Data Access Layer pattern
 * @see https://nextjs.org/docs/app/building-your-application/data-fetching/patterns#data-access-layer
 */

/**
 * Business Detail DTO - matches what useBusinessDetail hook expects
 * Simplified version that matches actual Business schema
 */
export interface BusinessDetailDTO {
  id: number;
  name: string;
  url: string;
  category?: string | null;
  location?: {
    city: string;
    state: string;
    country: string;
  } | null;
  wikidataQID?: string | null;
  status: string;
  createdAt: string;
  lastCrawledAt?: string | null;
  automationEnabled?: boolean;
  crawlData?: any;
  errorMessage?: string | null;
  updatedAt?: string;
  wikidataPublishedAt?: string | null;
  nextCrawlAt?: string | null;
  lastAutoPublishedAt?: string | null;
}

/**
 * Transform Business domain object → BusinessDetailDTO
 * Filters out technical details, adds UI-friendly fields
 * 
 * Note: errorMessage comes from crawlJobs table, not businesses table
 */
export async function toBusinessDetailDTO(business: Business, latestCrawlJob?: { errorMessage?: string | null } | null): Promise<BusinessDetailDTO> {
  // Extract errorMessage from latest crawl job (not from business table)
  // errorMessage doesn't exist in businesses table - it's in crawlJobs table
  // PRODUCTION FIX: Filter out success/status messages from errorMessage
  // The crawler incorrectly uses errorMessage for status updates (e.g., "Crawl completed")
  // Only include actual error messages (messages that indicate failure)
  let errorMessage = latestCrawlJob?.errorMessage || null;
  
  // Filter out success/status messages that shouldn't be in errorMessage
  // These are not errors, just status updates
  if (errorMessage) {
    const successMessages = [
      'Crawl completed',
      'Crawl completed successfully',
      'completed',
      'success',
    ];
    const isSuccessMessage = successMessages.some(msg => 
      errorMessage?.toLowerCase().includes(msg.toLowerCase())
    );
    if (isSuccessMessage) {
      errorMessage = null; // Not an error, don't show as errorMessage
    }
  }

  // Log if we're trying to access errorMessage from business (it doesn't exist there)
  if ((business as any).errorMessage !== undefined) {
    dtoLogger.logFieldExtraction('errorMessage', (business as any).errorMessage, 'businesses', {
      businessId: business.id,
    });
    dtoLogger.logTransformation('BusinessDetailDTO', business, { errorMessage }, {
      businessId: business.id,
      issues: ['errorMessage'],
      warnings: ['errorMessage should come from crawlJobs table, not businesses table'],
    });
  }

  const dto: BusinessDetailDTO = {
    id: business.id,
    name: business.name,
    url: business.url,
    category: business.category || null,
    location: business.location || null,
    status: business.status,
    wikidataQID: business.wikidataQID || null,
    automationEnabled: business.automationEnabled ?? true,
    createdAt: business.createdAt instanceof Date 
      ? business.createdAt.toISOString() 
      : typeof business.createdAt === 'string' 
        ? business.createdAt 
        : new Date().toISOString(),
    updatedAt: business.updatedAt instanceof Date 
      ? business.updatedAt.toISOString() 
      : typeof business.updatedAt === 'string' 
        ? business.updatedAt 
        : undefined,
    lastCrawledAt: business.lastCrawledAt instanceof Date 
      ? business.lastCrawledAt.toISOString() 
      : typeof business.lastCrawledAt === 'string' 
        ? business.lastCrawledAt 
        : business.lastCrawledAt,
    wikidataPublishedAt: business.wikidataPublishedAt instanceof Date 
      ? business.wikidataPublishedAt.toISOString() 
      : business.wikidataPublishedAt,
    nextCrawlAt: business.nextCrawlAt instanceof Date 
      ? business.nextCrawlAt.toISOString() 
      : business.nextCrawlAt,
    lastAutoPublishedAt: business.lastAutoPublishedAt instanceof Date 
      ? business.lastAutoPublishedAt.toISOString() 
      : business.lastAutoPublishedAt,
    crawlData: business.crawlData || null,
    errorMessage, // From crawlJobs, not businesses
  };

  // Log transformation with bug detection
  dtoLogger.logTransformation('BusinessDetailDTO', business, dto, {
    businessId: business.id,
    issues: ['automationEnabled', 'errorMessage'],
    warnings: ['errorMessage should come from crawlJobs table'],
  });

  return dto;
}

/**
 * Get business detail DTO by ID
 * Fetches business and transforms to DTO
 * Also fetches latest crawl job for errorMessage
 */
export async function getBusinessDetailDTO(businessId: number): Promise<BusinessDetailDTO | null> {
  const business = await getBusinessById(businessId);
  if (!business) {
    return null;
  }

  // Fetch latest crawl job for errorMessage (errorMessage is in crawlJobs, not businesses)
  const latestCrawlJob = await getLatestCrawlJob(businessId);

  return toBusinessDetailDTO(business, latestCrawlJob);
}

/**
 * Transform multiple businesses to DTOs
 * Used for business list endpoints
 * Note: This doesn't fetch crawl jobs - use getBusinessDetailDTO for individual businesses
 */
export async function toBusinessDetailDTOs(businesses: Business[]): Promise<BusinessDetailDTO[]> {
  return Promise.all(businesses.map(b => toBusinessDetailDTO(b)));
}

