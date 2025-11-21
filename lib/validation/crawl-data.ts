/**
 * CrawlData Validation Schemas
 * Validates crawlData structure before entity building
 * 
 * DRY: Centralized validation logic
 * SOLID: Single Responsibility - crawlData validation only
 */

import { z } from 'zod';

/**
 * Social Links Schema
 * Validates social media URLs and handles (e.g., @username)
 * SOLID: Enhanced validation for flexible social media formats
 */
const socialMediaValidator = z.string().refine((value) => {
  // Allow full URLs
  try {
    new URL(value);
    return true;
  } catch {
    // Allow social media handles (e.g., @username, username)
    return /^@?[\w.-]+$/.test(value);
  }
}, {
  message: "Must be a valid URL or social media handle (e.g., @username)"
}).optional().nullable();

export const socialLinksSchema = z.object({
  facebook: socialMediaValidator,
  instagram: socialMediaValidator,
  linkedin: socialMediaValidator,
  twitter: socialMediaValidator,
}).optional();

/**
 * Location Schema
 * Validates location data with coordinates
 */
export const locationSchema = z.object({
  address: z.string().min(1).max(500).optional().nullable(),
  city: z.string().min(1).max(100).optional().nullable(),
  state: z.string().min(1).max(100).optional().nullable(),
  country: z.string().min(2).max(2).optional().nullable(), // ISO country code
  postalCode: z.string().max(20).optional().nullable(),
  lat: z.number().min(-90).max(90).optional().nullable(), // Latitude
  lng: z.number().min(-180).max(180).optional().nullable(), // Longitude
}).optional();

/**
 * Business Details Schema
 * Validates rich business information extracted by LLM
 */
export const businessDetailsSchema = z.object({
  industry: z.string().min(1).max(200).optional().nullable(),
  sector: z.string().min(1).max(200).optional().nullable(),
  businessType: z.string().min(1).max(200).optional().nullable(),
  legalForm: z.string().min(1).max(200).optional().nullable(),
  founded: z.string().regex(/^\d{4}(-\d{2}(-\d{2})?)?$/).optional().nullable(), // YYYY or YYYY-MM-DD
  dissolved: z.string().regex(/^\d{4}(-\d{2}(-\d{2})?)?$/).optional().nullable(),
  employeeCount: z.union([
    z.number().int().positive(),
    z.string().regex(/^\d+$/).transform((val) => parseInt(val, 10)),
  ]).optional().nullable(),
  revenue: z.string().max(200).optional().nullable(),
  locations: z.number().int().nonnegative().optional().nullable(),
  products: z.array(z.string()).optional().nullable(),
  services: z.array(z.string()).optional().nullable(),
  brands: z.array(z.string()).optional().nullable(),
  parentCompany: z.string().min(1).max(200).optional().nullable(),
  subsidiaries: z.array(z.string()).optional().nullable(),
  partnerships: z.array(z.string()).optional().nullable(),
  awards: z.array(z.string()).optional().nullable(),
  certifications: z.array(z.string()).optional().nullable(),
  targetMarket: z.string().max(200).optional().nullable(),
  headquarters: z.string().max(200).optional().nullable(),
  ceo: z.string().min(1).max(200).optional().nullable(),
  stockSymbol: z.string().regex(/^[A-Z]{1,5}$/).optional().nullable(), // Stock ticker format
}).optional();

/**
 * LLM Enhanced Schema
 * Validates LLM-enhanced extraction data
 */
export const llmEnhancedSchema = z.object({
  extractedEntities: z.array(z.string()).optional().nullable(),
  businessCategory: z.string().max(200).optional().nullable(),
  serviceOfferings: z.array(z.string()).optional().nullable(),
  targetAudience: z.string().max(200).optional().nullable(),
  keyDifferentiators: z.array(z.string()).optional().nullable(),
  confidence: z.number().min(0).max(1).optional().nullable(),
  model: z.string().optional().nullable(),
  processedAt: z.union([z.date(), z.string().datetime()]).optional().nullable(),
}).optional();

/**
 * CrawlData Schema
 * Complete validation schema for crawled business data
 */
export const crawlDataSchema = z.object({
  name: z.string().min(1).max(500).optional(),
  description: z.string().max(2000).optional(),
  phone: z.string().regex(/^[+\d\s().-]+$/).max(50).optional(), // Phone number format
  email: z.string().email().max(200).optional(),
  address: z.string().max(500).optional(),
  location: locationSchema,
  socialLinks: socialLinksSchema,
  structuredData: z.record(z.unknown()).optional(),
  metaTags: z.record(z.string()).optional(),
  founded: z.string().regex(/^\d{4}(-\d{2}(-\d{2})?)?$/).optional(), // YYYY or YYYY-MM-DD
  categories: z.array(z.string()).optional(),
  services: z.array(z.string()).optional(),
  imageUrl: z.string().url().optional(),
  businessDetails: businessDetailsSchema,
  llmEnhanced: llmEnhancedSchema,
}).refine(
  (data) => data.name || data.description,
  { message: 'CrawlData must have at least name or description' }
);

/**
 * Type inference from schemas
 */
export type CrawlDataInput = z.input<typeof crawlDataSchema>;
export type CrawlDataOutput = z.output<typeof crawlDataSchema>;
export type SocialLinksInput = z.input<typeof socialLinksSchema>;
export type LocationInput = z.input<typeof locationSchema>;
export type BusinessDetailsInput = z.input<typeof businessDetailsSchema>;

/**
 * Validate crawlData
 * 
 * @param data - CrawlData to validate
 * @returns Validation result with success flag and errors
 */
export function validateCrawlData(data: unknown): {
  success: boolean;
  data?: CrawlDataOutput;
  errors?: z.ZodError;
} {
  const result = crawlDataSchema.safeParse(data);
  
  if (result.success) {
    return { success: true, data: result.data };
  }
  
  return { success: false, errors: result.error };
}

/**
 * Validate and throw if invalid
 * Useful for fail-fast validation
 * 
 * @param data - CrawlData to validate
 * @throws ZodError if validation fails
 */
export function assertCrawlData(data: unknown): asserts data is CrawlDataOutput {
  crawlDataSchema.parse(data);
}

/**
 * Validate specific crawlData field
 * Useful for partial validation
 * 
 * Note: Due to ZodEffects (from refine), we validate the full object
 * and extract the field value. This is less efficient but more accurate.
 */
export function validateCrawlDataField<T extends keyof CrawlDataOutput>(
  field: T,
  value: unknown
): { success: boolean; data?: CrawlDataOutput[T]; errors?: z.ZodError } {
  // Create a minimal object with just this field for validation
  const partialData = { [field]: value };
  
  // Validate the partial data
  const result = crawlDataSchema.safeParse(partialData);
  
  if (result.success && result.data[field] !== undefined) {
    return { success: true, data: result.data[field] as CrawlDataOutput[T] };
  }
  
  // Extract field-specific errors
  const fieldErrors = result.success 
    ? undefined 
    : result.error.errors.filter(e => e.path.includes(String(field)));
  
  if (fieldErrors && fieldErrors.length > 0) {
    return {
      success: false,
      errors: new z.ZodError(fieldErrors),
    };
  }
  
  return {
    success: false,
    errors: new z.ZodError([
      {
        code: 'custom',
        path: [field],
        message: `Validation failed for field: ${String(field)}`,
      },
    ]),
  };
}

