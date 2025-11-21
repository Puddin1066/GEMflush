// Crawl data validation schemas using Zod
// Validates CrawledData structure before storage and use
//
// DRY: Centralized validation logic
// SOLID: Single Responsibility - crawl data validation only

import { z } from 'zod';
import type { CrawledData } from '@/lib/types/gemflush';

/**
 * Social links schema
 * Validates social media URLs
 */
export const socialLinksSchema = z.object({
  facebook: z.string().url().optional(),
  instagram: z.string().url().optional(),
  linkedin: z.string().url().optional(),
  twitter: z.string().url().optional(),
  youtube: z.string().url().optional(),
  tiktok: z.string().url().optional(),
}).optional();

/**
 * Business details schema
 * Validates rich business information extracted from websites
 * Uses .nullish() to allow both null and undefined (LLM returns null for missing fields)
 */
export const businessDetailsSchema = z.object({
  industry: z.string().nullish(),
  sector: z.string().nullish(),
  businessType: z.string().nullish(),
  legalForm: z.string().nullish(),
  founded: z.string().nullish(),
  dissolved: z.string().nullish(),
  employeeCount: z.union([z.number(), z.string()]).nullish(),
  revenue: z.string().nullish(),
  locations: z.number().nullish(),
  products: z.array(z.string()).nullish(),
  services: z.array(z.string()).nullish(),
  brands: z.array(z.string()).nullish(),
  parentCompany: z.string().nullish(),
  subsidiaries: z.array(z.string()).nullish(),
  partnerships: z.array(z.string()).nullish(),
  awards: z.array(z.string()).nullish(),
  certifications: z.array(z.string()).nullish(),
  targetMarket: z.string().nullish(),
  headquarters: z.string().nullish(),
  ceo: z.string().nullish(),
  stockSymbol: z.string().nullish(),
}).optional();

/**
 * LLM-enhanced extraction schema
 * Validates LLM-processed crawl data
 * 
 * Note: Fields can be null if LLM couldn't extract the information
 * This allows graceful degradation when LLM extraction fails for specific fields
 */
export const llmEnhancedSchema = z.object({
  extractedEntities: z.array(z.string()).nullish(),
  businessCategory: z.string().nullish(),
  serviceOfferings: z.array(z.string()).nullish(),
  targetAudience: z.string().nullish(), // Allow null - LLM may not find this
  keyDifferentiators: z.array(z.string()).nullish(),
  confidence: z.number().min(0).max(1).nullish(),
  model: z.string().nullish(),
  processedAt: z.date().or(z.string()).nullish(),
}).optional();

/**
 * CrawledData schema
 * Validates complete crawl data structure
 * 
 * All fields are optional because crawl may not extract all data
 * This schema ensures that if data exists, it's in the correct format
 */
export const crawledDataSchema: z.ZodType<CrawledData> = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  address: z.string().optional(),
  socialLinks: socialLinksSchema,
  structuredData: z.record(z.unknown()).optional(),
  metaTags: z.record(z.string()).optional(),
  founded: z.string().optional(),
  categories: z.array(z.string()).optional(),
  services: z.array(z.string()).optional(),
  imageUrl: z.string().url().optional(),
  businessDetails: businessDetailsSchema,
  llmEnhanced: llmEnhancedSchema,
});

/**
 * Validate CrawledData
 * DRY: Reusable validation function
 * SOLID: Single Responsibility - validation only
 * 
 * @param data - Crawl data to validate
 * @returns Validation result with success flag and errors
 */
export function validateCrawledData(data: unknown): {
  success: boolean;
  errors?: z.ZodError;
} {
  const result = crawledDataSchema.safeParse(data);
  
  if (!result.success) {
    return {
      success: false,
      errors: result.error,
    };
  }
  
  return { success: true };
}

/**
 * Validate and throw if invalid
 * Useful for fail-fast validation
 * 
 * @param data - Crawl data to validate
 * @throws ZodError if validation fails
 */
export function assertCrawledData(data: unknown): asserts data is CrawledData {
  crawledDataSchema.parse(data);
}

/**
 * Type inference from schema
 */
export type CrawledDataInput = z.input<typeof crawledDataSchema>;
export type CrawledDataOutput = z.output<typeof crawledDataSchema>;

