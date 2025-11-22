/**
 * Dynamic Entity Template System
 * 
 * Creates dynamic JSON templates capable of generating rich Wikidata entities
 * with descriptions, statements, and up to 10 PIDs and 10 QIDs.
 */

import type {
  WikidataEntity,
  EntityClaim,
  EntitySnak,
  EntityReference,
  PropertyValue,
  PropertyDataType,
  PropertyConfig,
  CrawlDataInput,
  WikibaseEntityId,
  TimeValue,
  QuantityValue,
  CoordinateValue,
  MonolingualTextValue
} from './types';
import { ReferenceFinder, type NotabilityReference } from './reference-finder';

export class EntityTemplate {
  private static readonly MAX_PROPERTIES = 10;
  private static readonly MAX_QIDS = 10;
  
  // Core business properties (prioritized for selection)
  private static readonly CORE_PROPERTIES: PropertyConfig[] = [
    {
      pid: 'P31',
      dataType: 'wikibase-entityid',
      priority: 1,
      required: true,
      transformer: () => ({ 'entity-type': 'item' as const, id: 'Q4830453' }) // business
    },
    {
      pid: 'P856',
      dataType: 'string',
      priority: 2,
      required: true,
      validator: (value) => typeof value === 'string' && value.startsWith('http')
    },
    {
      pid: 'P1448',
      dataType: 'string',
      priority: 3,
      required: true,
      validator: (value) => typeof value === 'string' && value.length > 0
    },
    {
      pid: 'P625',
      dataType: 'globecoordinate',
      priority: 4,
      required: false,
      validator: (value) => value && typeof value.latitude === 'number' && typeof value.longitude === 'number'
    },
    {
      pid: 'P6375',
      dataType: 'string',
      priority: 5,
      required: false,
      validator: (value) => typeof value === 'string' && value.length > 5
    },
    {
      pid: 'P131',
      dataType: 'wikibase-entityid',
      priority: 6,
      required: false,
      validator: (value) => value && typeof value.id === 'string' && value.id.startsWith('Q')
    },
    {
      pid: 'P17',
      dataType: 'wikibase-entityid',
      priority: 7,
      required: false,
      transformer: () => ({ 'entity-type': 'item' as const, id: 'Q30' }) // United States
    },
    {
      pid: 'P452',
      dataType: 'wikibase-entityid',
      priority: 8,
      required: false,
      validator: (value) => value && typeof value.id === 'string' && value.id.startsWith('Q')
    },
    {
      pid: 'P1329',
      dataType: 'string',
      priority: 9,
      required: false,
      validator: (value) => typeof value === 'string' && /[\d\-\+\(\)\s]+/.test(value)
    },
    {
      pid: 'P968',
      dataType: 'string',
      priority: 10,
      required: false,
      validator: (value) => typeof value === 'string' && value.includes('@')
    }
  ];

  /**
   * Generate a rich Wikidata entity from crawl data with notability references
   */
  static async generateEntity(
    crawlData: CrawlDataInput,
    options: {
      maxProperties?: number;
      includeReferences?: boolean;
      qualityThreshold?: number;
      findNotabilityReferences?: boolean;
      maxNotabilityReferences?: number;
    } = {}
  ): Promise<WikidataEntity> {
    const {
      maxProperties = this.MAX_PROPERTIES,
      includeReferences = true,
      qualityThreshold = 0.7,
      findNotabilityReferences = true,
      maxNotabilityReferences = 5
    } = options;

    // Find notability references if requested
    let notabilityReferences: NotabilityReference[] = [];
    if (findNotabilityReferences && includeReferences) {
      try {
        console.log('🔍 Finding notability references...');
        const referenceResult = await ReferenceFinder.findNotabilityReferences(crawlData, {
          maxReferences: maxNotabilityReferences,
          requireSerious: true,
          minConfidence: qualityThreshold
        });
        
        notabilityReferences = referenceResult.references;
        console.log(`📚 Found ${notabilityReferences.length} notability references`);
        
        // Log reference statistics
        const stats = ReferenceFinder.getStatistics(notabilityReferences);
        console.log(`   - Serious references: ${stats.serious}/${stats.total}`);
        console.log(`   - Average trust score: ${stats.averageTrustScore.toFixed(1)}`);
        console.log(`   - Source types: ${Object.keys(stats.sourceTypes).join(', ')}`);
        
      } catch (error) {
        console.warn('Failed to find notability references:', error);
        // Continue without notability references
      }
    }

    // Build labels and descriptions
    const labels = this.buildLabels(crawlData);
    const descriptions = this.buildDescriptions(crawlData);
    
    // Extract and prioritize properties
    const extractedData = this.extractPropertyData(crawlData);
    const selectedProperties = this.selectProperties(extractedData, maxProperties);
    
    // Build claims with references (including notability references)
    const claims = await this.buildClaims(
      selectedProperties, 
      crawlData.url, 
      includeReferences,
      notabilityReferences
    );
    
    // Validate quality
    const qualityScore = this.calculateQualityScore(claims);
    if (qualityScore < qualityThreshold) {
      console.warn(`Entity quality score ${qualityScore} below threshold ${qualityThreshold}`);
    }

    return {
      labels,
      descriptions,
      claims
    };
  }

  /**
   * Build multilingual labels
   */
  private static buildLabels(crawlData: CrawlDataInput): WikidataEntity['labels'] {
    const name = crawlData.name || this.extractNameFromUrl(crawlData.url);
    
    return {
      en: {
        language: 'en',
        value: this.cleanBusinessName(name)
      }
    };
  }

  /**
   * Build multilingual descriptions
   */
  private static buildDescriptions(crawlData: CrawlDataInput): WikidataEntity['descriptions'] {
    let description = crawlData.description;
    
    // Generate description if not provided
    if (!description) {
      const parts: string[] = [];
      
      if (crawlData.business?.industry) {
        parts.push(crawlData.business.industry);
      }
      
      if (crawlData.location?.city && crawlData.location?.state) {
        parts.push(`in ${crawlData.location.city}, ${crawlData.location.state}`);
      }
      
      description = parts.length > 0 
        ? `Business ${parts.join(' ')}`
        : 'Business entity';
    }

    // Truncate to Wikidata limit
    description = description.substring(0, 250);

    return {
      en: {
        language: 'en',
        value: description
      }
    };
  }

  /**
   * Extract property data from crawl results
   */
  private static extractPropertyData(crawlData: CrawlDataInput): Map<string, any> {
    const data = new Map<string, any>();

    // P31: instance of (always business)
    data.set('P31', { 'entity-type': 'item', id: 'Q4830453' });

    // P856: official website
    if (crawlData.url) {
      data.set('P856', crawlData.url);
    }

    // P1448: official name
    if (crawlData.name) {
      data.set('P1448', this.cleanBusinessName(crawlData.name));
    }

    // P625: coordinate location
    if (crawlData.location?.coordinates) {
      data.set('P625', {
        latitude: crawlData.location.coordinates.lat,
        longitude: crawlData.location.coordinates.lng,
        precision: 0.0001,
        globe: 'http://www.wikidata.org/entity/Q2'
      });
    }

    // P6375: street address
    if (crawlData.location?.address) {
      data.set('P6375', crawlData.location.address);
    }

    // P17: country (default to US, could be enhanced with detection)
    data.set('P17', { 'entity-type': 'item', id: 'Q30' });

    // P1329: phone number
    if (crawlData.contact?.phone) {
      data.set('P1329', crawlData.contact.phone);
    }

    // P968: email address
    if (crawlData.contact?.email) {
      data.set('P968', crawlData.contact.email);
    }

    // P571: inception (founded date)
    if (crawlData.business?.founded) {
      data.set('P571', this.parseDate(crawlData.business.founded));
    }

    // P1128: number of employees
    if (crawlData.business?.employeeCount) {
      data.set('P1128', {
        amount: `+${crawlData.business.employeeCount}`,
        unit: 'Q11573' // person
      });
    }

    return data;
  }

  /**
   * Select up to maxProperties properties based on priority and availability
   */
  private static selectProperties(
    extractedData: Map<string, any>,
    maxProperties: number
  ): Map<string, { value: any; config: PropertyConfig }> {
    const selected = new Map<string, { value: any; config: PropertyConfig }>();
    
    // Sort properties by priority
    const sortedProperties = this.CORE_PROPERTIES
      .filter(config => extractedData.has(config.pid))
      .sort((a, b) => a.priority - b.priority);

    // Select properties up to limit
    let count = 0;
    let qidCount = 0;
    
    for (const config of sortedProperties) {
      if (count >= maxProperties) break;
      
      const value = extractedData.get(config.pid);
      
      // Validate value
      if (config.validator && !config.validator(value)) {
        console.warn(`Property ${config.pid} failed validation:`, value);
        continue;
      }

      // Check QID limit for entity properties
      if (config.dataType === 'wikibase-entityid') {
        if (qidCount >= this.MAX_QIDS) {
          console.warn(`Skipping ${config.pid} - QID limit reached`);
          continue;
        }
        qidCount++;
      }

      selected.set(config.pid, { value, config });
      count++;
    }

    console.log(`Selected ${count} properties (${qidCount} QIDs) from ${extractedData.size} available`);
    return selected;
  }

  /**
   * Build claims with optional references including notability references
   */
  private static async buildClaims(
    selectedProperties: Map<string, { value: any; config: PropertyConfig }>,
    sourceUrl: string,
    includeReferences: boolean,
    notabilityReferences: NotabilityReference[] = []
  ): Promise<Record<string, EntityClaim[]>> {
    const claims: Record<string, EntityClaim[]> = {};

    for (const [pid, { value, config }] of selectedProperties) {
      try {
        const claim = await this.createClaim(pid, value, config, sourceUrl, includeReferences, notabilityReferences);
        if (claim) {
          claims[pid] = [claim];
        }
      } catch (error) {
        console.error(`Failed to create claim for ${pid}:`, error);
      }
    }

    return claims;
  }

  /**
   * Create a single claim with proper data type and notability references
   */
  private static async createClaim(
    pid: string,
    value: any,
    config: PropertyConfig,
    sourceUrl: string,
    includeReferences: boolean,
    notabilityReferences: NotabilityReference[] = []
  ): Promise<EntityClaim | null> {
    // Transform value if transformer provided
    const transformedValue = config.transformer ? config.transformer(value) : value;
    
    // Create snak based on data type
    const snak = this.createSnak(pid, transformedValue, config.dataType);
    if (!snak) return null;

    const claim: EntityClaim = {
      mainsnak: snak,
      type: 'statement'
    };

    // Add references if requested
    if (includeReferences) {
      const references: EntityReference[] = [];
      
      // Always include source URL as primary reference
      references.push(this.createReference(sourceUrl));
      
      // Add notability references for important properties
      if (notabilityReferences.length > 0) {
        const importantProperties = ['P31', 'P856', 'P1448', 'P625', 'P452'];
        
        if (importantProperties.includes(pid)) {
          // Select best notability reference for this property
          const bestReference = notabilityReferences
            .filter(ref => ref.isSerious)
            .sort((a, b) => b.trustScore - a.trustScore)[0];
          
          if (bestReference) {
            references.push(this.createNotabilityReference(bestReference));
          }
        }
      }
      
      claim.references = references;
    }

    return claim;
  }

  /**
   * Create snak based on data type
   */
  private static createSnak(
    pid: string,
    value: PropertyValue,
    dataType: PropertyDataType
  ): EntitySnak | null {
    if (!value) return null;

    const snak: EntitySnak = {
      snaktype: 'value',
      property: pid,
      datavalue: {
        value,
        type: dataType
      }
    };

    return snak;
  }

  /**
   * Create reference with URL and retrieved date
   */
  private static createReference(url: string): EntityReference {
    const today = new Date().toISOString().split('T')[0];
    
    return {
      snaks: {
        'P854': [{
          snaktype: 'value',
          property: 'P854',
          datavalue: {
            value: url,
            type: 'string'
          }
        }],
        'P813': [{
          snaktype: 'value',
          property: 'P813',
          datavalue: {
            value: {
              time: `+${today}T00:00:00Z`,
              timezone: 0,
              before: 0,
              after: 0,
              precision: 11,
              calendarmodel: 'http://www.wikidata.org/entity/Q1985727'
            },
            type: 'time'
          }
        }]
      }
    };
  }

  /**
   * Create notability reference with URL, title, and retrieved date
   */
  private static createNotabilityReference(reference: NotabilityReference): EntityReference {
    const today = new Date().toISOString().split('T')[0];
    
    const snaks: Record<string, EntitySnak[]> = {
      'P854': [{
        snaktype: 'value',
        property: 'P854',
        datavalue: {
          value: reference.url,
          type: 'string'
        }
      }],
      'P813': [{
        snaktype: 'value',
        property: 'P813',
        datavalue: {
          value: {
            time: `+${today}T00:00:00Z`,
            timezone: 0,
            before: 0,
            after: 0,
            precision: 11,
            calendarmodel: 'http://www.wikidata.org/entity/Q1985727'
          },
          type: 'time'
        }
      }]
    };

    // Add title if available (P1476)
    if (reference.title && reference.title.length > 0) {
      snaks['P1476'] = [{
        snaktype: 'value',
        property: 'P1476',
        datavalue: {
          value: {
            text: reference.title,
            language: 'en'
          },
          type: 'monolingualtext'
        }
      }];
    }

    return { snaks };
  }

  /**
   * Calculate entity quality score (0-1)
   */
  private static calculateQualityScore(claims: Record<string, EntityClaim[]>): number {
    const propertyCount = Object.keys(claims).length;
    const requiredProps = ['P31', 'P856', 'P1448'];
    const hasRequired = requiredProps.every(pid => claims[pid]);
    
    let score = 0;
    
    // Base score for required properties
    if (hasRequired) score += 0.4;
    
    // Score for property count (max 0.4)
    score += Math.min(propertyCount / 10, 0.4);
    
    // Score for references (max 0.2)
    const referencedClaims = Object.values(claims)
      .flat()
      .filter(claim => claim.references && claim.references.length > 0).length;
    score += Math.min(referencedClaims / propertyCount, 0.2);
    
    return Math.min(score, 1.0);
  }

  /**
   * Utility: Clean business name (remove timestamps, etc.)
   */
  private static cleanBusinessName(name: string): string {
    return name
      .replace(/\s+\d{10,}$/, '') // Remove timestamps
      .replace(/\s+\d{1,3}$/, '') // Remove trailing numbers
      .trim();
  }

  /**
   * Utility: Extract name from URL
   */
  private static extractNameFromUrl(url: string): string {
    try {
      const domain = new URL(url).hostname;
      return domain.replace(/^www\./, '').replace(/\.[^.]+$/, '');
    } catch {
      return 'Business';
    }
  }

  /**
   * Utility: Parse date string to Wikidata time format
   */
  private static parseDate(dateStr: string): TimeValue {
    const precision = dateStr.length === 4 ? 9 : 11; // Year vs full date
    const time = dateStr.length === 4 
      ? `+${dateStr}-00-00T00:00:00Z`
      : `+${dateStr}T00:00:00Z`;

    return {
      time,
      timezone: 0,
      before: 0,
      after: 0,
      precision,
      calendarmodel: 'http://www.wikidata.org/entity/Q1985727'
    };
  }
}
