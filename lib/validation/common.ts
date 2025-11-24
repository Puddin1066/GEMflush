// Common validation schemas for API routes
import { z } from 'zod';

/**
 * Validates a numeric ID from path parameters
 */
export const idParamSchema = z.object({
  id: z.string().regex(/^\d+$/, 'ID must be a positive integer').transform(Number),
});

/**
 * Validates a business ID from path parameters
 */
export const businessIdParamSchema = z.object({
  businessId: z.string().regex(/^\d+$/, 'Business ID must be a positive integer').transform(Number),
});

/**
 * Validates a fingerprint ID from path parameters
 */
export const fingerprintIdParamSchema = z.object({
  id: z.string().regex(/^\d+$/, 'Fingerprint ID must be a positive integer').transform(Number),
});

/**
 * Validates a job ID from path parameters
 */
export const jobIdParamSchema = z.object({
  jobId: z.string().regex(/^\d+$/, 'Job ID must be a positive integer').transform(Number),
});



