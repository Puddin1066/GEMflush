/**
 * Business Context Conversion Utilities
 * DRY: Centralized logic for converting Business entities to BusinessContext
 */

import type { BusinessContext } from '../types';
import type { Business } from '@/lib/db/schema';

/**
 * Convert Business entity to BusinessContext
 * DRY: Used in both business-fingerprinter and prompt-generator
 */
export function businessToContext(business: Business): BusinessContext {
  return {
    businessId: business.id,
    name: business.name,
    url: business.url,
    category: business.category || undefined,
    location: business.location ? {
      city: business.location.city,
      state: business.location.state,
      country: business.location.country
    } : undefined,
    crawlData: business.crawlData || undefined
  };
}


