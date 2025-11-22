/**
 * Streamlined Wikidata Types
 * 
 * Core types for the new efficient wikidata module
 */

// Core Entity Types
export interface WikidataEntity {
  labels: Record<string, { language: string; value: string }>;
  descriptions: Record<string, { language: string; value: string }>;
  claims: Record<string, EntityClaim[]>;
  sitelinks?: Record<string, { site: string; title: string }>;
}

export interface EntityClaim {
  mainsnak: EntitySnak;
  type: 'statement';
  rank?: 'preferred' | 'normal' | 'deprecated';
  references?: EntityReference[];
  qualifiers?: Record<string, EntitySnak[]>;
}

export interface EntitySnak {
  snaktype: 'value' | 'novalue' | 'somevalue';
  property: string;
  datavalue?: {
    value: PropertyValue;
    type: PropertyDataType;
  };
}

export interface EntityReference {
  snaks: Record<string, EntitySnak[]>;
  'snaks-order'?: string[];
}

// Property Value Types
export type PropertyValue = 
  | string                           // String properties
  | WikibaseEntityId                 // Item/Property references
  | TimeValue                        // Dates/times
  | QuantityValue                    // Numbers with units
  | CoordinateValue                  // Geographic coordinates
  | MonolingualTextValue;            // Text with language

export interface WikibaseEntityId {
  'entity-type': 'item' | 'property';
  id: string;
}

export interface TimeValue {
  time: string;
  timezone: number;
  before: number;
  after: number;
  precision: number;
  calendarmodel: string;
}

export interface QuantityValue {
  amount: string;
  unit: string;
  upperBound?: string;
  lowerBound?: string;
}

export interface CoordinateValue {
  latitude: number;
  longitude: number;
  precision: number;
  globe: string;
}

export interface MonolingualTextValue {
  text: string;
  language: string;
}

export type PropertyDataType = 
  | 'string'
  | 'wikibase-entityid'
  | 'time'
  | 'quantity'
  | 'globecoordinate'
  | 'monolingualtext'
  | 'url'
  | 'external-id';

// Crawl Data Input
export interface CrawlDataInput {
  name?: string;
  description?: string;
  url: string;
  location?: {
    address?: string;
    city?: string;
    state?: string;
    country?: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
  };
  contact?: {
    phone?: string;
    email?: string;
  };
  business?: {
    industry?: string;
    sector?: string;
    legalForm?: string;
    founded?: string;
    employeeCount?: number;
    revenue?: string;
    stockSymbol?: string;
  };
  social?: {
    facebook?: string;
    twitter?: string;
    instagram?: string;
    linkedin?: string;
  };
  content?: {
    text?: string;
    images?: string[];
    links?: string[];
  };
}

// Property Management
export interface PropertyConfig {
  pid: string;
  dataType: PropertyDataType;
  priority: number;
  required: boolean;
  validator?: (value: any) => boolean;
  transformer?: (value: any) => PropertyValue;
  qidResolver?: (value: string) => Promise<string | null>;
}

export interface PropertySelection {
  selectedPIDs: string[];
  selectedQIDs: string[];
  totalProperties: number;
  qualityScore: number;
}

// Publishing
export interface PublishOptions {
  target: 'test' | 'production';
  dryRun?: boolean;
  validateOnly?: boolean;
  maxProperties?: number;
  includeReferences?: boolean;
}

export interface PublishResult {
  success: boolean;
  qid?: string;
  entityId?: string;
  publishedTo: string;
  propertiesPublished: number;
  referencesPublished: number;
  error?: string;
  warnings?: string[];
}

// Template System
export interface EntityTemplate {
  id: string;
  name: string;
  description: string;
  properties: PropertyConfig[];
  requiredFields: string[];
  optionalFields: string[];
  maxProperties: number;
  qualityThreshold: number;
}

// Service Configuration
export interface WikidataConfig {
  apiUrl?: string;
  userAgent?: string;
  timeout?: number;
  retryAttempts?: number;
  maxProperties?: number;
  enableCaching?: boolean;
  validateEntities?: boolean;
}

// Error Types
export class WikidataError extends Error {
  constructor(
    message: string,
    public code?: string,
    public details?: any
  ) {
    super(message);
    this.name = 'WikidataError';
  }
}

export class ValidationError extends WikidataError {
  constructor(message: string, public validationErrors: string[]) {
    super(message, 'VALIDATION_ERROR', { validationErrors });
    this.name = 'ValidationError';
  }
}

export class PublishError extends WikidataError {
  constructor(message: string, public apiResponse?: any) {
    super(message, 'PUBLISH_ERROR', { apiResponse });
    this.name = 'PublishError';
  }
}
