/**
 * Entity Builder Validation Schemas
 * Validates entity building process and intermediate structures
 * 
 * DRY: Centralized validation for entity building
 * SOLID: Single Responsibility - entity building validation only
 */

import { z } from 'zod';
import { crawlDataSchema, type CrawlDataOutput } from './crawl-data';
import { wikidataEntityDataSchema } from './wikidata';
import type { Business } from '@/lib/db/schema';

/**
 * Property Value Mapping Schema
 * Validates property value before claim creation
 */
export const propertyValueSchema = z.object({
  pid: z.string().regex(/^P\d+$/), // Property ID format
  value: z.unknown(), // Value depends on property type
  dataType: z.enum(['item', 'string', 'time', 'quantity', 'url', 'coordinate', 'monolingualtext']),
  source: z.enum(['crawlData', 'business', 'llm', 'hardcoded']), // Data source
  confidence: z.number().min(0).max(1).optional(), // Confidence score for LLM-suggested values
}).refine(
  (data) => {
    // Validate value type matches dataType
    switch (data.dataType) {
      case 'string':
      case 'url':
        return typeof data.value === 'string';
      case 'item':
        return typeof data.value === 'string' && data.value.startsWith('Q');
      case 'time':
        return typeof data.value === 'string' && /^\d{4}(-\d{2}(-\d{2})?)?$/.test(data.value);
      case 'quantity':
        return typeof data.value === 'number' || (typeof data.value === 'string' && /^\d+$/.test(data.value));
      case 'coordinate':
        return typeof data.value === 'object' && data.value !== null && 'lat' in data.value && 'lng' in data.value;
      case 'monolingualtext':
        return typeof data.value === 'object' && data.value !== null && 'text' in data.value && 'language' in data.value;
      default:
        return true;
    }
  },
  { message: 'Value type must match dataType' }
);

/**
 * Claim Building Context Schema
 * Validates context for building a single claim
 */
export const claimBuildingContextSchema = z.object({
  pid: z.string().regex(/^P\d+$/),
  propertyMapping: z.object({
    pid: z.string(),
    label: z.string(),
    description: z.string(),
    dataType: z.enum(['item', 'string', 'time', 'quantity', 'url', 'coordinate', 'monolingualtext']),
    required: z.boolean(),
  }),
  value: z.unknown(),
  referenceUrl: z.string().url(),
  notabilityReferences: z.array(z.object({
    url: z.string().url(),
    title: z.string().optional(),
    snippet: z.string().optional(),
  })).optional(),
});

/**
 * Entity Building Input Schema
 * Validates input for entity building process
 */
export const entityBuildingInputSchema = z.object({
  business: z.object({
    id: z.number().int().positive(),
    name: z.string().min(1),
    url: z.string().url(),
    location: z.object({
      city: z.string().optional(),
      state: z.string().optional(),
      country: z.string().optional(),
      coordinates: z.object({
        lat: z.number().optional(),
        lng: z.number().optional(),
      }).optional(),
    }).optional().nullable(),
  }),
  crawlData: crawlDataSchema.optional(),
  tier: z.enum(['free', 'pro', 'agency']),
  enrichmentLevel: z.number().int().min(1).max(5).optional(),
  notabilityReferences: z.array(z.object({
    url: z.string().url(),
    title: z.string().optional(),
    snippet: z.string().optional(),
  })).optional(),
});

/**
 * Entity Building Result Schema
 * Validates the result of entity building
 */
export const entityBuildingResultSchema = z.object({
  entity: wikidataEntityDataSchema,
  metadata: z.object({
    sourceDataQuality: z.number().min(0).max(1), // Quality score of source data
    propertiesExtracted: z.number().int().nonnegative(), // Number of properties extracted
    propertiesFromCrawlData: z.number().int().nonnegative(), // Properties from crawlData
    propertiesFromBusiness: z.number().int().nonnegative(), // Properties from business
    propertiesFromLLM: z.number().int().nonnegative(), // Properties from LLM suggestions
    validationErrors: z.array(z.string()).optional(), // Any validation warnings
    buildTime: z.number().nonnegative(), // Build time in milliseconds
  }),
});

/**
 * Type inference from schemas
 */
export type PropertyValueInput = z.input<typeof propertyValueSchema>;
export type PropertyValueOutput = z.output<typeof propertyValueSchema>;
export type ClaimBuildingContextInput = z.input<typeof claimBuildingContextSchema>;
export type EntityBuildingInputInput = z.input<typeof entityBuildingInputSchema>;
export type EntityBuildingInputOutput = z.output<typeof entityBuildingInputSchema>;
export type EntityBuildingResultInput = z.input<typeof entityBuildingResultSchema>;
export type EntityBuildingResultOutput = z.output<typeof entityBuildingResultSchema>;

/**
 * Validate entity building input
 * 
 * @param input - Entity building input to validate
 * @returns Validation result
 */
export function validateEntityBuildingInput(input: unknown): {
  success: boolean;
  data?: EntityBuildingInputOutput;
  errors?: z.ZodError;
} {
  const result = entityBuildingInputSchema.safeParse(input);
  
  if (result.success) {
    return { success: true, data: result.data };
  }
  
  return { success: false, errors: result.error };
}

/**
 * Validate entity building result
 * 
 * @param result - Entity building result to validate
 * @returns Validation result
 */
export function validateEntityBuildingResult(result: unknown): {
  success: boolean;
  data?: EntityBuildingResultOutput;
  errors?: z.ZodError;
} {
  const resultValidation = entityBuildingResultSchema.safeParse(result);
  
  if (resultValidation.success) {
    return { success: true, data: resultValidation.data };
  }
  
  return { success: false, errors: resultValidation.error };
}

/**
 * Validate property value before claim creation
 * 
 * @param propertyValue - Property value to validate
 * @returns Validation result
 */
export function validatePropertyValue(propertyValue: unknown): {
  success: boolean;
  data?: PropertyValueOutput;
  errors?: z.ZodError;
} {
  const result = propertyValueSchema.safeParse(propertyValue);
  
  if (result.success) {
    return { success: true, data: result.data };
  }
  
  return { success: false, errors: result.error };
}

/**
 * Type guard for Business object
 * Useful for runtime validation
 */
export function isValidBusinessForEntityBuilding(
  business: unknown
): business is Pick<Business, 'id' | 'name' | 'url' | 'location'> {
  if (!business || typeof business !== 'object') {
    return false;
  }
  
  const b = business as Record<string, unknown>;
  
  return (
    typeof b.id === 'number' &&
    typeof b.name === 'string' &&
    b.name.length > 0 &&
    typeof b.url === 'string' &&
    /^https?:\/\/.+/.test(b.url)
  );
}

/**
 * Type guard for CrawlData
 * Useful for runtime validation
 */
export function isValidCrawlDataForEntityBuilding(
  crawlData: unknown
): crawlData is CrawlDataOutput {
  const validation = crawlDataSchema.safeParse(crawlData);
  return validation.success;
}


