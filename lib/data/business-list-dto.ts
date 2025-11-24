/**
 * Business List DTO - Data Transfer Object for Business List Display
 * 
 * Transforms businesses for list view with quick actions
 * 
 * TDD: This file was created to satisfy tests in business-list-dto.tdd.test.ts
 * Following RED → GREEN → REFACTOR cycle
 */

import 'server-only';
import type { Business } from '@/lib/db/schema';
import { getLatestFingerprint } from '@/lib/db/queries';

/**
 * Business List Item DTO
 */
export interface BusinessListItemDTO {
  id: string;
  name: string;
  status: 'pending' | 'crawling' | 'crawled' | 'generating' | 'published' | 'error';
  visibilityScore: number | null;
  canCrawl: boolean;
  canFingerprint: boolean;
  canPublish: boolean;
  wikidataQid: string | null;
  lastFingerprint: string | null;
}

/**
 * Business List DTO
 */
export interface BusinessListDTO {
  businesses: BusinessListItemDTO[];
  total: number;
}

/**
 * Transform businesses to list DTO format
 * 
 * @param businesses - Array of businesses
 * @returns Business list DTO
 */
export async function toBusinessListDTO(businesses: Business[]): Promise<BusinessListDTO> {
  const items = await Promise.all(
    businesses.map(async (business) => {
      const fingerprint = await getLatestFingerprint(business.id);
      
      return {
        id: business.id.toString(),
        name: business.name,
        status: business.status as BusinessListItemDTO['status'],
        visibilityScore: fingerprint?.visibilityScore ?? null,
        canCrawl: determineCanCrawl(business),
        canFingerprint: determineCanFingerprint(business),
        canPublish: determineCanPublish(business),
        wikidataQid: business.wikidataQID,
        lastFingerprint: fingerprint?.createdAt 
          ? formatTimestamp(fingerprint.createdAt)
          : null,
      };
    })
  );

  return {
    businesses: items,
    total: items.length,
  };
}

/**
 * Determine if business can be crawled
 */
function determineCanCrawl(business: Business): boolean {
  // Can always crawl (for refresh, re-crawl, etc.)
  return true;
}

/**
 * Determine if business can be fingerprinted
 */
function determineCanFingerprint(business: Business): boolean {
  // Can fingerprint if crawled or published
  return business.status === 'crawled' || business.status === 'published';
}

/**
 * Determine if business can be published
 */
function determineCanPublish(business: Business): boolean {
  // Can publish if crawled or published (for re-publish)
  return business.status === 'crawled' || business.status === 'published';
}

/**
 * Format timestamp for display
 */
function formatTimestamp(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
  return `${Math.floor(days / 30)} months ago`;
}



