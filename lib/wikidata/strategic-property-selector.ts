/**
 * Strategic Property Selector
 * Selects Wikidata properties strategically based on:
 * - Usage frequency (from Wikidata database reports)
 * - Relevance to business entities
 * - Data availability from crawlData
 * - Tier-based value proposition
 * 
 * Reference: https://www.wikidata.org/wiki/Wikidata:Database_reports/List_of_properties/all
 * 
 * DRY: Centralized property selection logic
 * SOLID: Single Responsibility - strategic property selection
 */

import type { CrawledData } from '@/lib/types/gemflush';

/**
 * Property Usage Statistics
 * Based on Wikidata database reports (usage frequency)
 * Higher usage = more valuable for entity completeness
 */
export interface PropertyUsageStats {
  pid: string;
  label: string;
  usageCount?: number; // Number of uses in Wikidata (if available)
  category: PropertyCategory;
  priority: PropertyPriority;
  dataSource: 'crawlData' | 'business' | 'llm' | 'hardcoded';
  tier: 'free' | 'pro' | 'agency';
  enrichmentLevel?: number; // Minimum enrichment level for agency tier
}

/**
 * Property Categories
 * Groups properties by semantic meaning
 */
export type PropertyCategory =
  | 'core' // Essential for any entity
  | 'identification' // Name, labels, identifiers
  | 'location' // Geographic information
  | 'contact' // Communication channels
  | 'temporal' // Dates and time
  | 'classification' // Industry, type, category
  | 'social' // Social media presence
  | 'scale' // Size, employees, revenue
  | 'relationships' // Parent, subsidiary, partnerships
  | 'media' // Images, logos, videos
  | 'financial' // Revenue, stock, funding
  | 'operational' // Products, services, awards
  | 'metadata'; // References, quality indicators

/**
 * Property Priority
 * Determines when to include a property
 */
export type PropertyPriority =
  | 'required' // Always include (core properties)
  | 'high' // Include if data available (high value)
  | 'medium' // Include if data available and tier allows (moderate value)
  | 'low' // Include only for complete entities (nice to have)
  | 'optional'; // Include only if explicitly requested

/**
 * Strategic Property Database
 * Curated list of properties with strategic metadata
 * Based on Wikidata database reports and business entity best practices
 */
export const STRATEGIC_PROPERTIES: Record<string, PropertyUsageStats> = {
  // ===== CORE PROPERTIES (Required) =====
  'P31': {
    pid: 'P31',
    label: 'instance of',
    category: 'core',
    priority: 'required',
    dataSource: 'hardcoded',
    tier: 'free',
  },
  'P856': {
    pid: 'P856',
    label: 'official website',
    category: 'identification',
    priority: 'required',
    dataSource: 'business',
    tier: 'free',
  },
  'P1448': {
    pid: 'P1448',
    label: 'official name',
    category: 'identification',
    priority: 'required',
    dataSource: 'crawlData',
    tier: 'free',
  },

  // ===== LOCATION PROPERTIES (High Priority) =====
  'P625': {
    pid: 'P625',
    label: 'coordinate location',
    category: 'location',
    priority: 'high',
    dataSource: 'crawlData',
    tier: 'free',
  },
  'P6375': {
    pid: 'P6375',
    label: 'street address',
    category: 'location',
    priority: 'high',
    dataSource: 'crawlData',
    tier: 'pro',
  },
  'P131': {
    pid: 'P131',
    label: 'located in',
    category: 'location',
    priority: 'medium',
    dataSource: 'llm', // Requires QID resolution
    tier: 'agency',
    enrichmentLevel: 3,
  },
  'P159': {
    pid: 'P159',
    label: 'headquarters location',
    category: 'location',
    priority: 'medium',
    dataSource: 'llm', // Requires QID resolution
    tier: 'agency',
    enrichmentLevel: 3,
  },
  'P17': {
    pid: 'P17',
    label: 'country',
    category: 'location',
    priority: 'medium',
    dataSource: 'llm', // Requires QID resolution
    tier: 'agency',
    enrichmentLevel: 3,
  },

  // ===== CONTACT PROPERTIES (High Priority) =====
  'P1329': {
    pid: 'P1329',
    label: 'phone number',
    category: 'contact',
    priority: 'high',
    dataSource: 'crawlData',
    tier: 'free',
  },
  'P968': {
    pid: 'P968',
    label: 'email address',
    category: 'contact',
    priority: 'high',
    dataSource: 'crawlData',
    tier: 'pro',
  },

  // ===== TEMPORAL PROPERTIES (Medium Priority) =====
  'P571': {
    pid: 'P571',
    label: 'inception',
    category: 'temporal',
    priority: 'medium',
    dataSource: 'crawlData',
    tier: 'pro',
  },
  'P576': {
    pid: 'P576',
    label: 'dissolved',
    category: 'temporal',
    priority: 'low',
    dataSource: 'crawlData',
    tier: 'agency',
    enrichmentLevel: 4,
  },
  'P580': {
    pid: 'P580',
    label: 'start time',
    category: 'temporal',
    priority: 'low',
    dataSource: 'crawlData',
    tier: 'agency',
    enrichmentLevel: 4,
  },
  'P582': {
    pid: 'P582',
    label: 'end time',
    category: 'temporal',
    priority: 'low',
    dataSource: 'crawlData',
    tier: 'agency',
    enrichmentLevel: 4,
  },

  // ===== CLASSIFICATION PROPERTIES (Medium Priority) =====
  'P452': {
    pid: 'P452',
    label: 'industry',
    category: 'classification',
    priority: 'medium',
    dataSource: 'llm', // Requires QID resolution
    tier: 'agency',
    enrichmentLevel: 3,
  },
  'P1454': {
    pid: 'P1454',
    label: 'legal form',
    category: 'classification',
    priority: 'medium',
    dataSource: 'llm', // Requires QID resolution
    tier: 'agency',
    enrichmentLevel: 3,
  },
  'P279': {
    pid: 'P279',
    label: 'subclass of',
    category: 'classification',
    priority: 'low',
    dataSource: 'llm',
    tier: 'agency',
    enrichmentLevel: 4,
  },

  // ===== SOCIAL MEDIA PROPERTIES (High Priority) =====
  'P2002': {
    pid: 'P2002',
    label: 'Twitter username',
    category: 'social',
    priority: 'high',
    dataSource: 'crawlData',
    tier: 'pro',
  },
  'P2013': {
    pid: 'P2013',
    label: 'Facebook ID',
    category: 'social',
    priority: 'high',
    dataSource: 'crawlData',
    tier: 'pro',
  },
  'P2003': {
    pid: 'P2003',
    label: 'Instagram username',
    category: 'social',
    priority: 'high',
    dataSource: 'crawlData',
    tier: 'pro',
  },
  'P4264': {
    pid: 'P4264',
    label: 'LinkedIn company ID',
    category: 'social',
    priority: 'high',
    dataSource: 'crawlData',
    tier: 'pro',
  },
  'P2004': {
    pid: 'P2004',
    label: 'YouTube channel ID',
    category: 'social',
    priority: 'medium',
    dataSource: 'crawlData',
    tier: 'agency',
    enrichmentLevel: 2,
  },
  'P2012': {
    pid: 'P2012',
    label: 'Facebook page ID',
    category: 'social',
    priority: 'medium',
    dataSource: 'crawlData',
    tier: 'agency',
    enrichmentLevel: 2,
  },

  // ===== SCALE PROPERTIES (Medium Priority) =====
  'P1128': {
    pid: 'P1128',
    label: 'employees',
    category: 'scale',
    priority: 'medium',
    dataSource: 'crawlData',
    tier: 'pro',
  },
  'P2138': {
    pid: 'P2138',
    label: 'employees (at time of dissolution)',
    category: 'scale',
    priority: 'low',
    dataSource: 'crawlData',
    tier: 'agency',
    enrichmentLevel: 4,
  },

  // ===== RELATIONSHIP PROPERTIES (Low Priority) =====
  'P749': {
    pid: 'P749',
    label: 'parent organization',
    category: 'relationships',
    priority: 'low',
    dataSource: 'llm', // Requires QID resolution
    tier: 'agency',
    enrichmentLevel: 4,
  },
  'P355': {
    pid: 'P355',
    label: 'subsidiary',
    category: 'relationships',
    priority: 'low',
    dataSource: 'llm',
    tier: 'agency',
    enrichmentLevel: 4,
  },
  'P112': {
    pid: 'P112',
    label: 'founded by',
    category: 'relationships',
    priority: 'low',
    dataSource: 'llm',
    tier: 'agency',
    enrichmentLevel: 4,
  },
  'P169': {
    pid: 'P169',
    label: 'chief executive officer',
    category: 'relationships',
    priority: 'low',
    dataSource: 'llm',
    tier: 'agency',
    enrichmentLevel: 4,
  },

  // ===== MEDIA PROPERTIES (Medium Priority) =====
  'P18': {
    pid: 'P18',
    label: 'image',
    category: 'media',
    priority: 'medium',
    dataSource: 'crawlData',
    tier: 'agency',
    enrichmentLevel: 3,
  },
  'P4896': {
    pid: 'P4896',
    label: 'logo',
    category: 'media',
    priority: 'medium',
    dataSource: 'crawlData',
    tier: 'agency',
    enrichmentLevel: 3,
  },
  'P154': {
    pid: 'P154',
    label: 'logo image',
    category: 'media',
    priority: 'low',
    dataSource: 'crawlData',
    tier: 'agency',
    enrichmentLevel: 4,
  },

  // ===== FINANCIAL PROPERTIES (Low Priority) =====
  'P249': {
    pid: 'P249',
    label: 'ticker symbol',
    category: 'financial',
    priority: 'medium',
    dataSource: 'crawlData',
    tier: 'agency',
    enrichmentLevel: 2,
  },
  'P414': {
    pid: 'P414',
    label: 'stock exchange',
    category: 'financial',
    priority: 'low',
    dataSource: 'llm',
    tier: 'agency',
    enrichmentLevel: 4,
  },
  'P2139': {
    pid: 'P2139',
    label: 'total revenue',
    category: 'financial',
    priority: 'low',
    dataSource: 'crawlData',
    tier: 'agency',
    enrichmentLevel: 4,
  },

  // ===== OPERATIONAL PROPERTIES (Low Priority) =====
  'P1056': {
    pid: 'P1056',
    label: 'product or material produced',
    category: 'operational',
    priority: 'low',
    dataSource: 'crawlData',
    tier: 'agency',
    enrichmentLevel: 4,
  },
  'P1015': {
    pid: 'P1015',
    label: 'NORAF ID',
    category: 'identification',
    priority: 'low',
    dataSource: 'llm',
    tier: 'agency',
    enrichmentLevel: 4,
  },
};

/**
 * Strategic Property Selector
 * Selects properties based on tier, enrichment level, and data availability
 */
export class StrategicPropertySelector {
  /**
   * Get properties for tier and enrichment level
   * Strategically selects properties based on:
   * - Tier (free, pro, agency)
   * - Enrichment level (1-5 for agency)
   * - Data availability from crawlData
   * - Property priority and category
   */
  getPropertiesForTier(
    tier: 'free' | 'pro' | 'agency',
    enrichmentLevel?: number,
    crawlData?: CrawledData
  ): string[] {
    const properties: string[] = [];

    // Filter properties by tier and enrichment level
    for (const [pid, stats] of Object.entries(STRATEGIC_PROPERTIES)) {
      // Check tier eligibility
      if (!this.isEligibleForTier(stats, tier, enrichmentLevel)) {
        continue;
      }

      // Check data availability (if required)
      // Required properties are always included, even without data
      if (stats.priority !== 'required' && stats.dataSource === 'crawlData' && !this.hasDataForProperty(pid, crawlData)) {
        continue;
      }

      // Add property
      properties.push(pid);
    }

    // Sort by priority (required > high > medium > low > optional)
    return this.sortByPriority(properties);
  }

  /**
   * Check if property is eligible for tier and enrichment level
   */
  private isEligibleForTier(
    stats: PropertyUsageStats,
    tier: 'free' | 'pro' | 'agency',
    enrichmentLevel?: number
  ): boolean {
    // Required properties are always eligible
    if (stats.priority === 'required') {
      return true;
    }

    // Check tier eligibility
    if (tier === 'free' && stats.tier !== 'free') {
      return false;
    }

    if (tier === 'pro' && stats.tier === 'agency') {
      return false;
    }

    // Check enrichment level for agency tier
    if (tier === 'agency' && stats.enrichmentLevel) {
      if (!enrichmentLevel || enrichmentLevel < stats.enrichmentLevel) {
        return false;
      }
    }

    return true;
  }

  /**
   * Check if crawlData has data for property
   */
  private hasDataForProperty(pid: string, crawlData?: CrawledData): boolean {
    if (!crawlData) {
      return false;
    }

    // Map PIDs to crawlData fields
    const dataMap: Record<string, (data: CrawledData) => boolean> = {
      'P1448': (d) => !!d.name,
      'P625': (d) => !!(d.location?.lat && d.location?.lng),
      'P6375': (d) => !!(d.location?.address || d.address),
      'P1329': (d) => !!d.phone,
      'P968': (d) => !!d.email,
      'P571': (d) => !!(d.founded || d.businessDetails?.founded),
      'P2002': (d) => !!d.socialLinks?.twitter,
      'P2013': (d) => !!d.socialLinks?.facebook,
      'P2003': (d) => !!d.socialLinks?.instagram,
      'P4264': (d) => !!d.socialLinks?.linkedin,
      'P1128': (d) => !!d.businessDetails?.employeeCount,
      'P249': (d) => !!d.businessDetails?.stockSymbol,
      'P18': (d) => !!d.imageUrl,
    };

    const checker = dataMap[pid];
    return checker ? checker(crawlData) : false;
  }

  /**
   * Sort properties by priority
   */
  private sortByPriority(properties: string[]): string[] {
    const priorityOrder: Record<PropertyPriority, number> = {
      required: 0,
      high: 1,
      medium: 2,
      low: 3,
      optional: 4,
    };

    return properties.sort((a, b) => {
      const aPriority = STRATEGIC_PROPERTIES[a]?.priority || 'optional';
      const bPriority = STRATEGIC_PROPERTIES[b]?.priority || 'optional';
      return priorityOrder[aPriority] - priorityOrder[bPriority];
    });
  }

  /**
   * Get properties by category
   */
  getPropertiesByCategory(category: PropertyCategory): string[] {
    return Object.entries(STRATEGIC_PROPERTIES)
      .filter(([_, stats]) => stats.category === category)
      .map(([pid]) => pid);
  }

  /**
   * Get properties by priority
   */
  getPropertiesByPriority(priority: PropertyPriority): string[] {
    return Object.entries(STRATEGIC_PROPERTIES)
      .filter(([_, stats]) => stats.priority === priority)
      .map(([pid]) => pid);
  }

  /**
   * Get property statistics
   */
  getPropertyStats(pid: string): PropertyUsageStats | undefined {
    return STRATEGIC_PROPERTIES[pid];
  }

  /**
   * Get recommended properties for crawlData
   * Returns properties that could be added if more data is available
   */
  getRecommendedProperties(
    currentProperties: string[],
    crawlData?: CrawledData,
    tier: 'free' | 'pro' | 'agency' = 'pro'
  ): string[] {
    const recommended: string[] = [];

    for (const [pid, stats] of Object.entries(STRATEGIC_PROPERTIES)) {
      // Skip if already included
      if (currentProperties.includes(pid)) {
        continue;
      }

      // Check tier eligibility
      if (!this.isEligibleForTier(stats, tier)) {
        continue;
      }

      // Check if data is available but property not included
      if (stats.dataSource === 'crawlData' && this.hasDataForProperty(pid, crawlData)) {
        recommended.push(pid);
      }
    }

    return this.sortByPriority(recommended);
  }
}

/**
 * Singleton instance
 */
export const strategicPropertySelector = new StrategicPropertySelector();

