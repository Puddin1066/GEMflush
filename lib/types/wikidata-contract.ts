// Strict TypeScript contract for Wikidata entity structure
// Based on Wikibase Data Model and JSON specification
// 
// CONTEXTUAL CONTRACTS (Wikidata's equivalent to MCP contracts):
// These specifications function as contextual contracts for bots, editors, and machine-generated statements:
//
// 1. Wikibase Data Model (WDM) - Core schema contract
//    https://www.mediawiki.org/wiki/Wikibase/DataModel
//    Defines how items, properties, statements, qualifiers, references are structured
//
// 2. Wikibase JSON Specification - Context format contract
//    https://doc.wikimedia.org/Wikibase/master/php/md_docs_topics_json.html
//    Defines the JSON format your agent must produce when writing via the API
//
// 3. Wikidata Action API Protocol - Communication contract
//    https://www.wikidata.org/wiki/Wikidata:Data_access
//    Defines authentication, tokens, edits, rate limits, error structures, snak formats
//
// 4. Wikidata Bot Policy - Behavioral protocol contract
//    https://www.wikidata.org/wiki/Wikidata:Bots
//    Defines what an agent/bot is allowed to do
//
// 5. Wikidata Ontology - Conceptual contract
//    https://www.wikidata.org/wiki/Wikidata:Glossary
//    Defines relationships between items, properties, classes (schema.org-derived)
//
// 6. ORES + Edit Quality Models - Quality constraints contract
//    https://www.mediawiki.org/wiki/ORES
//    Defines constraints you must respect to avoid reverts or bans
//
// DRY: Centralized type definitions
// SOLID: Single Responsibility - type contracts only
//
// This contract ensures compile-time type safety for Wikidata entity structures
// and aligns with the Wikibase JSON Specification (context format contract)

/**
 * Wikibase Entity ID value structure
 * Used for properties that reference other Wikidata items (QIDs)
 */
export interface WikibaseEntityIdValue {
  'entity-type': 'item' | 'property';
  id: string; // QID format: "Q123" or PID format: "P123"
  'numeric-id'?: number; // Optional numeric ID
}

/**
 * Time value structure
 * Used for date/time properties (P813, P571, P576, etc.)
 */
export interface TimeValue {
  time: string; // ISO 8601 format with + prefix: "+2025-11-17T00:00:00Z"
  timezone: number; // Timezone offset in minutes (0 for UTC)
  before: number; // Number of units before the given time (typically 0 for exact dates)
  after: number; // Number of units after the given time (typically 0 for exact dates)
  precision: number; // Precision level (9=year, 10=month, 11=day, etc.)
  calendarmodel: string; // Calendar model URI: "http://www.wikidata.org/entity/Q1985727" (Gregorian)
}

/**
 * Quantity value structure
 * Used for numeric properties with units (P1128, etc.)
 */
export interface QuantityValue {
  amount: string; // String with + or - prefix: "+10" or "-5"
  unit: string; // Unit QID: "Q11573" (person) or "1" (dimensionless)
  upperBound?: string; // Optional upper bound
  lowerBound?: string; // Optional lower bound
}

/**
 * Monolingual text value structure
 * Used for text properties with language (P1476, etc.)
 */
export interface MonolingualTextValue {
  text: string; // The text content
  language: string; // Language code: "en", "fr", etc.
}

/**
 * Globe coordinate value structure
 * Used for location properties (P625, etc.)
 */
export interface GlobeCoordinateValue {
  latitude: number; // Latitude in degrees
  longitude: number; // Longitude in degrees
  precision: number; // Precision in degrees
  globe: string; // Globe URI: "http://www.wikidata.org/entity/Q2" (Earth)
  altitude?: number; // Optional altitude
}

/**
 * Discriminated union for all possible datavalue types
 * This ensures type safety - the value structure must match the type
 */
export type WikidataDatavalue =
  | {
      type: 'wikibase-entityid';
      value: WikibaseEntityIdValue;
    }
  | {
      type: 'string';
      value: string;
    }
  | {
      type: 'time';
      value: TimeValue;
    }
  | {
      type: 'quantity';
      value: QuantityValue;
    }
  | {
      type: 'monolingualtext';
      value: MonolingualTextValue;
    }
  | {
      type: 'globecoordinate';
      value: GlobeCoordinateValue;
    };

/**
 * Snak structure
 * A snak is a property-value pair (or no-value/some-value)
 */
export interface WikidataSnak {
  snaktype: 'value' | 'somevalue' | 'novalue';
  property: string; // Property ID: "P31", "P856", etc.
  datavalue?: WikidataDatavalue; // Required if snaktype is 'value'
  hash?: string; // Optional hash for reference snaks
}

/**
 * Reference snak structure
 * References use the same snak structure as mainsnaks
 */
export type WikidataReferenceSnak = WikidataSnak;

/**
 * Reference structure
 * References provide sources for claims
 */
export interface WikidataReference {
  hash?: string; // Optional reference hash
  snaks: Record<string, WikidataReferenceSnak[]>; // Property ID -> array of snaks
}

/**
 * Claim structure
 * A claim is a statement about an entity
 */
export interface WikidataClaim {
  mainsnak: WikidataSnak;
  type: 'statement' | 'claim';
  rank?: 'preferred' | 'normal' | 'deprecated';
  qualifiers?: Record<string, WikidataSnak[]>; // Optional qualifiers
  qualifiersOrder?: string[]; // Optional qualifier order
  references?: WikidataReference[]; // Optional references
  id?: string; // Optional claim GUID
}

/**
 * Label structure
 * Entity name in a specific language
 */
export interface WikidataLabel {
  language: string; // Language code: "en", "fr", etc.
  value: string; // Label text (max 400 chars)
}

/**
 * Description structure
 * Entity description in a specific language
 */
export interface WikidataDescription {
  language: string; // Language code: "en", "fr", etc.
  value: string; // Description text (max 250 chars)
}

/**
 * LLM Suggestions (internal metadata, not sent to Wikidata)
 */
export interface LLMSuggestions {
  suggestedProperties: Array<{
    property: string;
    propertyLabel: string;
    suggestedValue: string;
    confidence: number;
    reasoning: string;
  }>;
  suggestedReferences: Array<{
    url: string;
    title: string;
    relevance: number;
  }>;
  qualityScore: number;
  completeness: number;
  model: string;
  generatedAt: Date;
}

/**
 * Complete Wikidata Entity Data structure
 * This is the contract for entities ready to be published to Wikidata
 * 
 * IMPORTANT: This structure matches the Wikibase JSON specification exactly.
 * The `llmSuggestions` field is internal metadata and should be removed
 * before sending to Wikidata (via cleanEntityForWikidata).
 */
export interface WikidataEntityDataContract {
  labels: Record<string, WikidataLabel>; // Language code -> Label
  descriptions: Record<string, WikidataDescription>; // Language code -> Description
  claims: Record<string, WikidataClaim[]>; // Property ID -> array of claims
  llmSuggestions?: LLMSuggestions; // Internal metadata (removed before publishing)
}

/**
 * Cleaned Wikidata Entity (without internal metadata)
 * This is what gets sent to the Wikidata API
 */
export type CleanedWikidataEntity = Omit<WikidataEntityDataContract, 'llmSuggestions'>;

/**
 * Type guard to check if data matches the strict contract
 * Useful for runtime validation and type narrowing
 */
export function isWikidataEntityDataContract(
  data: unknown
): data is WikidataEntityDataContract {
  if (!data || typeof data !== 'object') {
    return false;
  }
  
  const entity = data as Record<string, unknown>;
  
  // Check required fields
  if (!entity.labels || !entity.descriptions || !entity.claims) {
    return false;
  }
  
  // Labels and descriptions should be records
  if (
    typeof entity.labels !== 'object' ||
    typeof entity.descriptions !== 'object' ||
    typeof entity.claims !== 'object'
  ) {
    return false;
  }
  
  // Basic structure check - full validation should use Zod schemas
  return true;
}

