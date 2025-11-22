/**
 * Streamlined Wikidata Module
 * 
 * Efficient and streamlined wikidata entity creation using crawl data
 * to dynamically populate JSON templates capable of creating rich Wikidata entities
 * with descriptions, statements, and up to 10 PIDs and 10 QIDs published via Action API.
 * 
 * Architecture:
 * - WikidataService: Main orchestrator service (recommended entry point)
 * - WikidataClient: Efficient Action API client with authentication
 * - EntityTemplate: Dynamic JSON template system for rich entities  
 * - CrawlDataProcessor: Extracts structured data from crawl results
 * - PropertyManager: Manages PID/QID selection and validation (up to 10 each)
 */

// Main service (recommended entry point)
export { WikidataService, wikidataService } from './service';

// Core components
export { WikidataClient } from './client';
export { EntityTemplate } from './template';
export { CrawlDataProcessor } from './processor';
export { PropertyManager } from './property-manager';
export { ReferenceFinder } from './reference-finder';

// Types
export type {
  WikidataEntity,
  EntityClaim,
  EntityReference,
  EntitySnak,
  PropertyValue,
  PropertyConfig,
  PropertySelection,
  CrawlDataInput,
  PublishOptions,
  PublishResult,
  WikidataConfig,
  EntityTemplate as EntityTemplateType
} from './types';

// Reference finder types
export type {
  NotabilityReference,
  ReferenceFinderResult
} from './reference-finder';

// Error classes
export { WikidataError, ValidationError, PublishError } from './types';

// Re-export for backward compatibility (legacy components archived)
// Use WikidataService instead of these legacy exports:
// - wikidataPublisher -> WikidataService
// - entityBuilder -> WikidataService + EntityTemplate
export { sparqlService } from './sparql';
