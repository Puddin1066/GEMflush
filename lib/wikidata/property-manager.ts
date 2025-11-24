/**
 * Property Manager
 * 
 * Manages PID/QID selection and validation with limits of up to 10 PIDs and 10 QIDs.
 * Ensures optimal property selection for rich Wikidata entities.
 */

import type { 
  PropertyConfig, 
  PropertySelection, 
  CrawlDataInput,
  WikibaseEntityId 
} from './types';
import { sparqlService } from './sparql';

export class PropertyManager {
  private static readonly MAX_PIDS = 10;
  private static readonly MAX_QIDS = 10;

  // Priority-ordered property configurations
  private static readonly PROPERTY_CONFIGS: PropertyConfig[] = [
    // Tier 1: Essential properties (always include)
    {
      pid: 'P31',
      dataType: 'wikibase-entityid',
      priority: 1,
      required: true,
      transformer: () => ({ 'entity-type': 'item' as const, id: 'Q4830453' })
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

    // Tier 2: High-value properties (include if available)
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
      qidResolver: async (cityName: string) => {
        // Extract city and state from the value if formatted as "City, State"
        const parts = cityName.split(',').map(p => p.trim());
        const city = parts[0];
        const state = parts[1];
        return await sparqlService.findCityQID(city, state, 'Q30', true);
      }
    },
    {
      pid: 'P17',
      dataType: 'wikibase-entityid',
      priority: 7,
      required: false,
      transformer: () => ({ 'entity-type': 'item' as const, id: 'Q30' }) // Default to US
    },
    {
      pid: 'P452',
      dataType: 'wikibase-entityid',
      priority: 8,
      required: false,
      qidResolver: async (industry: string) => {
        return await sparqlService.findIndustryQID(industry, true);
      }
    },

    // Tier 3: Supplementary properties
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
    },
    {
      pid: 'P571',
      dataType: 'time',
      priority: 11,
      required: false,
      validator: (value) => value && (typeof value === 'string' || typeof value.time === 'string')
    },
    {
      pid: 'P1128',
      dataType: 'quantity',
      priority: 12,
      required: false,
      validator: (value) => value && typeof value.amount === 'string' && !isNaN(parseInt(value.amount))
    },

    // Social media properties (lower priority)
    {
      pid: 'P2002',
      dataType: 'string',
      priority: 13,
      required: false,
      validator: (value) => typeof value === 'string' && value.length > 0
    },
    {
      pid: 'P2013',
      dataType: 'string',
      priority: 14,
      required: false,
      validator: (value) => typeof value === 'string' && value.length > 0
    },
    {
      pid: 'P2003',
      dataType: 'string',
      priority: 15,
      required: false,
      validator: (value) => typeof value === 'string' && value.length > 0
    }
  ];

  /**
   * Select optimal properties from crawl data
   */
  static async selectProperties(
    crawlData: CrawlDataInput,
    options: {
      maxPIDs?: number;
      maxQIDs?: number;
      qualityThreshold?: number;
      includeOptional?: boolean;
    } = {}
  ): Promise<PropertySelection> {
    const {
      maxPIDs = this.MAX_PIDS,
      maxQIDs = this.MAX_QIDS,
      qualityThreshold = 0.7,
      includeOptional = true
    } = options;

    // Extract available data
    const availableData = this.extractAvailableData(crawlData);
    
    // Filter and prioritize properties
    const candidateProperties = this.PROPERTY_CONFIGS
      .filter(config => {
        // Always include required properties
        if (config.required) return true;
        
        // Skip optional properties if disabled
        if (!includeOptional && !config.required) return false;
        
        // Check if data is available for this property
        return availableData.has(config.pid);
      })
      .sort((a, b) => a.priority - b.priority);

    // Select properties within limits
    const selectedPIDs: string[] = [];
    const selectedQIDs: string[] = [];
    let totalProperties = 0;
    let qualityScore = 0;

    for (const config of candidateProperties) {
      if (totalProperties >= maxPIDs) break;

      const value = availableData.get(config.pid);
      
      // Validate value if validator exists
      if (config.validator && !config.validator(value)) {
        console.warn(`Property ${config.pid} failed validation:`, value);
        continue;
      }

      // Check QID limits for entity properties
      if (config.dataType === 'wikibase-entityid') {
        if (selectedQIDs.length >= maxQIDs) {
          console.warn(`Skipping ${config.pid} - QID limit (${maxQIDs}) reached`);
          continue;
        }
        
        // Try to resolve QID if resolver exists
        if (config.qidResolver && typeof value === 'string') {
          try {
            const qid = await config.qidResolver(value);
            if (!qid) {
              console.warn(`Could not resolve QID for ${config.pid}: ${value}`);
              continue;
            }
            selectedQIDs.push(qid);
          } catch (error) {
            console.error(`QID resolution failed for ${config.pid}:`, error);
            continue;
          }
        } else if (config.transformer) {
          // Use transformer for static QIDs
          const transformed = config.transformer(value);
          if (transformed && typeof transformed === 'object' && 'id' in transformed) {
            selectedQIDs.push(transformed.id);
          }
        }
      }

      selectedPIDs.push(config.pid);
      totalProperties++;

      // Calculate quality contribution
      if (config.required) {
        qualityScore += 0.2;
      } else {
        qualityScore += 0.1;
      }
    }

    // Normalize quality score
    qualityScore = Math.min(qualityScore, 1.0);

    const selection: PropertySelection = {
      selectedPIDs,
      selectedQIDs,
      totalProperties,
      qualityScore
    };

    console.log(`Selected ${totalProperties} properties (${selectedQIDs.length} QIDs) with quality score ${qualityScore.toFixed(2)}`);
    
    return selection;
  }

  /**
   * Get property configuration by PID
   */
  static getPropertyConfig(pid: string): PropertyConfig | undefined {
    return this.PROPERTY_CONFIGS.find(config => config.pid === pid);
  }

  /**
   * Validate property selection against limits
   */
  static validateSelection(selection: PropertySelection): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check PID limit
    if (selection.selectedPIDs.length > this.MAX_PIDS) {
      errors.push(`Too many PIDs: ${selection.selectedPIDs.length} > ${this.MAX_PIDS}`);
    }

    // Check QID limit
    if (selection.selectedQIDs.length > this.MAX_QIDS) {
      errors.push(`Too many QIDs: ${selection.selectedQIDs.length} > ${this.MAX_QIDS}`);
    }

    // Check required properties
    const requiredPIDs = this.PROPERTY_CONFIGS
      .filter(config => config.required)
      .map(config => config.pid);
    
    const missingRequired = requiredPIDs.filter(pid => !selection.selectedPIDs.includes(pid));
    if (missingRequired.length > 0) {
      errors.push(`Missing required properties: ${missingRequired.join(', ')}`);
    }

    // Quality warnings
    if (selection.qualityScore < 0.5) {
      warnings.push(`Low quality score: ${selection.qualityScore.toFixed(2)}`);
    }

    if (selection.totalProperties < 5) {
      warnings.push(`Few properties selected: ${selection.totalProperties}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Get property statistics
   */
  static getPropertyStats(selection: PropertySelection): {
    requiredCount: number;
    optionalCount: number;
    entityCount: number;
    stringCount: number;
    otherCount: number;
  } {
    const configs = selection.selectedPIDs
      .map(pid => this.getPropertyConfig(pid))
      .filter(Boolean) as PropertyConfig[];

    const requiredCount = configs.filter(c => c.required).length;
    const optionalCount = configs.filter(c => !c.required).length;
    const entityCount = configs.filter(c => c.dataType === 'wikibase-entityid').length;
    const stringCount = configs.filter(c => c.dataType === 'string').length;
    const otherCount = configs.filter(c => !['wikibase-entityid', 'string'].includes(c.dataType)).length;

    return {
      requiredCount,
      optionalCount,
      entityCount,
      stringCount,
      otherCount
    };
  }

  /**
   * Extract available data from crawl input
   */
  private static extractAvailableData(crawlData: CrawlDataInput): Map<string, any> {
    const data = new Map<string, any>();

    // P31: instance of (always available - business)
    data.set('P31', 'Q4830453');

    // P856: official website
    if (crawlData.url) {
      data.set('P856', crawlData.url);
    }

    // P1448: official name
    if (crawlData.name) {
      data.set('P1448', crawlData.name);
    }

    // P625: coordinate location
    if (crawlData.location?.coordinates) {
      data.set('P625', crawlData.location.coordinates);
    }

    // P6375: street address
    if (crawlData.location?.address) {
      data.set('P6375', crawlData.location.address);
    }

    // P131: located in (administrative entity)
    if (crawlData.location?.city && crawlData.location?.state) {
      data.set('P131', `${crawlData.location.city}, ${crawlData.location.state}`);
    }

    // P17: country
    if (crawlData.location?.country) {
      data.set('P17', crawlData.location.country);
    }

    // P452: industry
    if (crawlData.business?.industry) {
      data.set('P452', crawlData.business.industry);
    }

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
      data.set('P571', crawlData.business.founded);
    }

    // P1128: number of employees
    if (crawlData.business?.employeeCount) {
      data.set('P1128', {
        amount: `+${crawlData.business.employeeCount}`,
        unit: 'Q11573' // person
      });
    }

    // Social media properties
    if (crawlData.social?.twitter) {
      const username = this.extractSocialUsername(crawlData.social.twitter, 'twitter');
      if (username) data.set('P2002', username);
    }

    if (crawlData.social?.facebook) {
      const username = this.extractSocialUsername(crawlData.social.facebook, 'facebook');
      if (username) data.set('P2013', username);
    }

    if (crawlData.social?.instagram) {
      const username = this.extractSocialUsername(crawlData.social.instagram, 'instagram');
      if (username) data.set('P2003', username);
    }

    return data;
  }

  /**
   * Extract username from social media URL
   */
  private static extractSocialUsername(url: string, platform: string): string | null {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      
      switch (platform) {
        case 'twitter':
          const twitterMatch = pathname.match(/^\/([a-zA-Z0-9_]+)\/?$/);
          return twitterMatch ? twitterMatch[1] : null;
          
        case 'facebook':
          const fbMatch = pathname.match(/\/pages\/[^\/]+\/(\d+)|^\/([a-zA-Z0-9.]+)\/?$/);
          return fbMatch ? (fbMatch[1] || fbMatch[2]) : null;
          
        case 'instagram':
          const instaMatch = pathname.match(/^\/([a-zA-Z0-9._]+)\/?$/);
          return instaMatch ? instaMatch[1] : null;
          
        default:
          return null;
      }
    } catch (error) {
      console.warn(`Failed to extract ${platform} username from: ${url}`);
      return null;
    }
  }
}

