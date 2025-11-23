/**
 * @deprecated This file is DEPRECATED and should NOT be used.
 * 
 * Use `lib/wikidata/property-mapping.ts` instead.
 * 
 * This file is kept only for reference in the legacy archive and will be removed
 * in a future version. All functionality has been migrated to the modern version.
 * 
 * Migration:
 * - Import from '../property-mapping' instead of './property-mapping'
 * - All functionality is available in the modern version
 * - Modern version uses PropertyManager for QID resolution (DRY principle)
 * 
 * Legacy Wikidata Property Mapping
 * Maps business attributes to correct PIDs with validation rules
 * Follows Open/Closed Principle: Easy to extend with new properties
 */

import { sparqlService } from '../sparql';

export interface PropertyMapping {
  pid: string;
  label: string;
  description: string;
  dataType: 'item' | 'string' | 'time' | 'quantity' | 'url' | 'coordinate' | 'monolingualtext';
  required: boolean;
  validator?: (value: any) => boolean;
  qidResolver?: (value: string) => Promise<string | null>;
  examples?: string[];
}

/**
 * Complete property mapping for business entities
 * Follows Single Responsibility: Only defines property mappings
 */
export const BUSINESS_PROPERTY_MAP: Record<string, PropertyMapping> = {
  // CORE PROPERTIES (always include)
  'P31': {
    pid: 'P31',
    label: 'instance of',
    description: 'type of entity',
    dataType: 'item',
    required: true,
    examples: ['Q4830453 (business)', 'Q6881511 (enterprise)'],
  },
  
  'P856': {
    pid: 'P856',
    label: 'official website',
    description: 'URL of official website',
    dataType: 'url',
    required: true,
    validator: (url) => /^https?:\/\/.+/.test(url),
  },
  
  'P1448': {
    pid: 'P1448',
    label: 'official name',
    description: 'official name of the subject',
    dataType: 'string',
    required: true,
  },
  
  // CLASSIFICATION
  'P452': {
    pid: 'P452',
    label: 'industry',
    description: 'industry of company or organization',
    dataType: 'item',
    required: false,
    qidResolver: async (industry) => await resolveIndustryQID(industry),
    examples: ['Q11650 (software)', 'Q8148 (manufacturing)'],
  },
  
  'P1454': {
    pid: 'P1454',
    label: 'legal form',
    description: 'legal form of an entity',
    dataType: 'item',
    required: false,
    qidResolver: async (form) => await resolveLegalFormQID(form),
    examples: ['Q1269299 (LLC)', 'Q167037 (corporation)'],
  },
  
  // TEMPORAL
  'P571': {
    pid: 'P571',
    label: 'inception',
    description: 'date when entity was founded or created',
    dataType: 'time',
    required: false,
    validator: (date) => /^\d{4}(-\d{2}-\d{2})?/.test(date),
  },
  
  'P576': {
    pid: 'P576',
    label: 'dissolved',
    description: 'date when organization ceased to exist',
    dataType: 'time',
    required: false,
    validator: (date) => /^\d{4}(-\d{2}-\d{2})?/.test(date),
  },
  
  // LOCATION
  'P625': {
    pid: 'P625',
    label: 'coordinate location',
    description: 'geocoordinates',
    dataType: 'coordinate',
    required: false,
  },
  
  'P159': {
    pid: 'P159',
    label: 'headquarters location',
    description: 'city or town where headquarters are located',
    dataType: 'item',
    required: false,
    qidResolver: async (city) => await resolveCityQID(city),
    examples: ['Q62 (San Francisco)', 'Q60 (New York City)'],
  },
  
  'P6375': {
    pid: 'P6375',
    label: 'street address',
    description: 'full street address',
    dataType: 'string',
    required: false,
  },
  
  // CONTACT
  'P1329': {
    pid: 'P1329',
    label: 'phone number',
    description: 'telephone number',
    dataType: 'string',
    required: false,
    validator: (phone) => /^[+\d\s()-]+$/.test(phone),
  },
  
  'P968': {
    pid: 'P968',
    label: 'email address',
    description: 'email address',
    dataType: 'string',
    required: false,
    validator: (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),
  },
  
  // SCALE
  'P1128': {
    pid: 'P1128',
    label: 'employees',
    description: 'number of employees',
    dataType: 'quantity',
    required: false,
    validator: (count) => typeof count === 'number' && count > 0,
  },
  
  // RELATIONSHIPS
  'P749': {
    pid: 'P749',
    label: 'parent organization',
    description: 'parent organization of an organization',
    dataType: 'item',
    required: false,
    qidResolver: async (org) => await resolveOrganizationQID(org),
  },
  
  'P355': {
    pid: 'P355',
    label: 'subsidiary',
    description: 'subsidiary of a company or organization',
    dataType: 'item',
    required: false,
    qidResolver: async (org) => await resolveOrganizationQID(org),
  },
  
  'P112': {
    pid: 'P112',
    label: 'founded by',
    description: 'founder or co-founder',
    dataType: 'item',
    required: false,
    qidResolver: async (person) => await resolvePersonQID(person),
  },
  
  'P169': {
    pid: 'P169',
    label: 'chief executive officer',
    description: 'CEO of the organization',
    dataType: 'item',
    required: false,
    qidResolver: async (person) => await resolvePersonQID(person),
  },
  
  // STOCK
  'P414': {
    pid: 'P414',
    label: 'stock exchange',
    description: 'exchange where securities are traded',
    dataType: 'item',
    required: false,
    examples: ['Q13677 (NYSE)', 'Q82059 (NASDAQ)'],
  },
  
  'P249': {
    pid: 'P249',
    label: 'ticker symbol',
    description: 'stock ticker symbol',
    dataType: 'string',
    required: false,
    validator: (symbol) => /^[A-Z]{1,5}$/.test(symbol),
  },
  
  // SOCIAL MEDIA
  'P2002': {
    pid: 'P2002',
    label: 'Twitter username',
    description: 'username on Twitter/X',
    dataType: 'string',
    required: false,
  },
  
  'P2013': {
    pid: 'P2013',
    label: 'Facebook ID',
    description: 'identifier on Facebook',
    dataType: 'string',
    required: false,
  },
  
  'P2003': {
    pid: 'P2003',
    label: 'Instagram username',
    description: 'username on Instagram',
    dataType: 'string',
    required: false,
  },
  
  'P4264': {
    pid: 'P4264',
    label: 'LinkedIn company ID',
    description: 'identifier on LinkedIn',
    dataType: 'string',
    required: false,
  },
  
  // REFERENCES (used in claim references, not as main property)
  'P854': {
    pid: 'P854',
    label: 'reference URL',
    description: 'URL used as reference for claims',
    dataType: 'url',
    required: false,
    validator: (url) => /^https?:\/\/.+/.test(url),
  },
  
  'P813': {
    pid: 'P813',
    label: 'retrieved',
    description: 'date when information was retrieved from source',
    dataType: 'time',
    required: false,
  },
  
  'P1476': {
    pid: 'P1476',
    label: 'title',
    description: 'title of referenced work',
    dataType: 'monolingualtext', // P1476 uses monolingualtext type (text + language)
    required: false,
  },
};

/**
 * QID Resolution Functions
 * Use SPARQL to find existing Wikidata items
 * Follows Dependency Inversion: Depends on SPARQL service abstraction
 */

async function resolveIndustryQID(industry: string): Promise<string | null> {
  // Use existing SPARQL service
  return await sparqlService.findIndustryQID(industry);
}

async function resolveLegalFormQID(form: string): Promise<string | null> {
  // Use comprehensive local mapping via SPARQL service
  return await sparqlService.findLegalFormQID(form);
}

async function resolveCityQID(city: string, state?: string): Promise<string | null> {
  // Use hybrid SPARQL service with state context for better accuracy
  return await sparqlService.findCityQID(city, state);
}

async function resolveOrganizationQID(org: string): Promise<string | null> {
  // In production, query Wikidata SPARQL for organization
  // For now, return null (will be manual entry)
  return null;
}

async function resolvePersonQID(person: string): Promise<string | null> {
  // In production, query Wikidata SPARQL for person
  // For now, return null (will be manual entry)
  return null;
}

/**
 * Get property mapping by PID
 * Follows DRY: Centralized property lookup
 */
export function getPropertyMapping(pid: string): PropertyMapping | null {
  return BUSINESS_PROPERTY_MAP[pid] || null;
}

/**
 * Get all required properties
 */
export function getRequiredProperties(): PropertyMapping[] {
  return Object.values(BUSINESS_PROPERTY_MAP).filter(p => p.required);
}

/**
 * Get all optional properties
 */
export function getOptionalProperties(): PropertyMapping[] {
  return Object.values(BUSINESS_PROPERTY_MAP).filter(p => !p.required);
}

