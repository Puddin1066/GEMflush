// Wikidata validation schemas using Zod
// Based on Wikibase Data Model and JSON specification
// 
// CONTRACTS & SPECIFICATIONS:
// - Wikibase Data Model: https://www.mediawiki.org/wiki/Wikibase/DataModel
// - Wikibase JSON Spec: https://doc.wikimedia.org/Wikibase/master/php/md_docs_topics_json.html
// - Wikidata Action API: https://www.wikidata.org/wiki/Wikidata:Data_access
// - Wikidata Bot Policy: https://www.wikidata.org/wiki/Wikidata:Bots
//
// DRY: Centralized validation logic
// SOLID: Single Responsibility - validation schemas only

import { z } from 'zod';

/**
 * Wikidata Label Schema
 * Validates label structure (language code + value)
 */
export const wikidataLabelSchema = z.object({
  language: z.string().min(2).max(10), // Language codes are typically 2-10 chars
  value: z.string().min(1).max(400), // Wikidata label limit
});

/**
 * Wikidata Description Schema
 * Validates description structure (language code + value, max 250 chars)
 */
export const wikidataDescriptionSchema = z.object({
  language: z.string().min(2).max(10),
  value: z.string().min(1).max(250), // Wikidata description limit
});

/**
 * Wikidata Datavalue Schema
 * Validates datavalue structure (type + value)
 */
export const wikidataDatavalueSchema = z.object({
  type: z.enum([
    'wikibase-entityid',
    'string',
    'time',
    'quantity',
    'monolingualtext',
    'globecoordinate',
  ]),
  value: z.unknown(), // Value type depends on 'type' field
});

/**
 * Wikidata Snak Schema
 * Validates snak structure (snaktype + property + datavalue)
 */
export const wikidataSnakSchema = z.object({
  snaktype: z.enum(['value', 'novalue', 'somevalue']),
  property: z.string().regex(/^P\d+$/), // Property IDs start with P
  datavalue: wikidataDatavalueSchema.optional(),
});

/**
 * Wikidata Reference Snak Schema
 * More flexible for reference snaks
 */
export const wikidataReferenceSnakSchema = z.object({
  snaktype: z.enum(['value', 'novalue', 'somevalue']),
  property: z.string().regex(/^P\d+$/),
  datavalue: wikidataDatavalueSchema.optional(),
});

/**
 * Wikidata Reference Schema
 * Validates reference structure (snaks object)
 */
export const wikidataReferenceSchema = z.object({
  snaks: z.record(
    z.string().regex(/^P\d+$/), // Property IDs as keys
    z.array(wikidataReferenceSnakSchema) // Array of snaks
  ),
});

/**
 * Wikidata Claim Schema
 * Validates claim structure (mainsnak + type + optional references)
 */
export const wikidataClaimSchema = z.object({
  mainsnak: wikidataSnakSchema,
  type: z.enum(['statement', 'claim']),
  rank: z.enum(['preferred', 'normal', 'deprecated']).optional(),
  references: z.array(wikidataReferenceSchema).optional(),
});

/**
 * Wikidata Entity Data Schema
 * Validates complete entity structure for Wikidata API
 * Based on Wikibase JSON specification
 * DRY: Centralized entity validation
 * SOLID: Single Responsibility - entity structure validation
 * 
 * Note: This schema validates the structure but allows llmSuggestions (internal metadata).
 * The publisher will clean llmSuggestions before sending to Wikidata API.
 */
export const wikidataEntityDataSchema = z.object({
  labels: z.record(z.string(), wikidataLabelSchema),
  descriptions: z.record(z.string(), wikidataDescriptionSchema),
  claims: z.record(
    z.string().regex(/^P\d+$/), // Property IDs as keys (P#### format)
    z.array(wikidataClaimSchema).min(1) // Array of claims (at least one per property)
  ),
  llmSuggestions: z.object({
    suggestedProperties: z.array(z.any()).optional(),
    suggestedReferences: z.array(z.any()).optional(),
    qualityScore: z.number().optional(),
    completeness: z.number().optional(),
    model: z.string().optional(),
    generatedAt: z.date().or(z.string()).optional(),
  }).optional(),
}).refine(
  (data) => Object.keys(data.labels).length > 0,
  { message: 'Entity must have at least one label' }
).refine(
  (data) => Object.keys(data.claims).length > 0,
  { message: 'Entity must have at least one claim' }
);

/**
 * Type inference from schema
 */
export type WikidataEntityDataInput = z.input<typeof wikidataEntityDataSchema>;
export type WikidataEntityDataOutput = z.output<typeof wikidataEntityDataSchema>;

/**
 * Validate Wikidata entity data
 * DRY: Reusable validation function
 * SOLID: Single Responsibility - validation only
 * 
 * @param entity - Entity data to validate
 * @returns Validation result with success flag and errors
 */
export function validateWikidataEntity(entity: unknown): {
  success: boolean;
  errors?: z.ZodError;
} {
  const result = wikidataEntityDataSchema.safeParse(entity);
  
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
 * @param entity - Entity data to validate
 * @throws ZodError if validation fails
 */
export function assertWikidataEntity(entity: unknown): asserts entity is z.infer<typeof wikidataEntityDataSchema> {
  wikidataEntityDataSchema.parse(entity);
}

