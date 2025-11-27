/**
 * Subscription validation schemas
 * DRY: Centralized validation for subscription-related API endpoints
 */

import { z } from 'zod';

/**
 * Upgrade feature query parameter schema
 */
export const upgradeFeatureQuerySchema = z.object({
  feature: z.enum(['wikidata', 'businesses', 'api', 'enrichment', 'history'], {
    errorMap: () => ({
      message: 'Feature must be one of: wikidata, businesses, api, enrichment, history',
    }),
  }),
});


