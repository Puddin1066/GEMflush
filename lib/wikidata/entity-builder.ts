// Wikidata entity builder - constructs Wikidata JSON entities from business data
// Uses strict TypeScript contract aligned with Wikibase JSON Specification

import { CrawledData } from '@/lib/types/gemflush';
import { 
  WikidataEntityDataContract,
  WikidataClaim,
  WikidataSnak,
  WikidataReference,
  type CleanedWikidataEntity
} from '@/lib/types/wikidata-contract';
import { Business } from '@/lib/db/schema';
import { openRouterClient } from '@/lib/llm/openrouter-client';
import { BUSINESS_PROPERTY_MAP, type PropertyMapping } from './property-mapping';
import type { Reference } from './notability-checker';
import { IWikidataEntityBuilder } from '@/lib/types/service-contracts';
import { validateWikidataEntity } from '@/lib/validation/wikidata';
import { sparqlService } from './sparql';
import { normalizeBusinessName } from './utils';

// Type alias for service contract compatibility (returns strict contract internally)
type WikidataEntityData = WikidataEntityDataContract;

export class WikidataEntityBuilder implements IWikidataEntityBuilder {
  /**
   * Build a Wikidata entity from business and crawled data
   * Enhanced with LLM property suggestions and notability references
   * 
   * @param business - Business data
   * @param crawledData - Crawled business data
   * @param notabilityReferences - Optional array of notability references to attach to claims
   */
  async buildEntity(
    business: Business, 
    crawledData?: CrawledData,
    notabilityReferences?: Reference[]
  ): Promise<WikidataEntityData> {
    // Build basic claims (existing logic)
    // CRITICAL: buildClaims is now async to support QID lookups for rich properties
    const basicClaims = await this.buildClaims(business, crawledData);
    
    // LLM: Suggest additional properties based on crawled data
    const suggestedClaims = await this.suggestAdditionalProperties(business, crawledData);
    
    // Merge claims (basic + suggested)
    const allClaims = this.mergeClaims(basicClaims, suggestedClaims);
    
    // Attach multiple notability references to claims if provided
    // This ensures multiple references are published to Wikidata
    if (notabilityReferences && notabilityReferences.length > 0) {
      this.attachNotabilityReferences(allClaims, notabilityReferences, business.url);
    }
    
    // Calculate quality metrics
    const qualityScore = this.calculateQualityScore(allClaims);
    const completeness = this.calculateCompleteness(allClaims);
    
    const entity: WikidataEntityData = {
      labels: this.buildLabels(business, crawledData),
      descriptions: this.buildDescriptions(business, crawledData),
      claims: allClaims,
      llmSuggestions: {
        suggestedProperties: suggestedClaims.suggestions,
        suggestedReferences: notabilityReferences?.map(ref => ({
          url: ref.url,
          title: ref.title,
          relevance: 1.0,
        })) || [],
        qualityScore,
        completeness,
        model: 'openai/gpt-4-turbo',
        generatedAt: new Date(),
      },
    };
    
    // Validate entity structure according to Wikibase Data Model before returning
    // This ensures entities conform to Wikibase JSON specification
    // DRY: Reuse validation logic
    this.validateEntity(entity);
    
    return entity;
  }
  
  /**
   * Validate entity structure according to Wikibase Data Model
   * Implements IWikidataEntityBuilder contract
   * Uses Zod schema validation based on Wikibase JSON specification
   * 
   * References:
   * - Wikibase Data Model: https://www.mediawiki.org/wiki/Wikibase/DataModel
   * - Wikibase JSON Spec: https://doc.wikimedia.org/Wikibase/master/php/md_docs_topics_json.html
   * 
   * @param entity - Entity data to validate
   * @returns true if valid, throws error if invalid
   */
  validateEntity(entity: WikidataEntityData): boolean {
    const validation = validateWikidataEntity(entity);
    
    if (!validation.success) {
      console.error('[ENTITY BUILDER] Entity validation failed:', validation.errors);
      throw new Error(
        `Entity validation failed: ${validation.errors?.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')}`
      );
    }
    
    return true;
  }
  
  /**
   * Normalize business name by removing test timestamps and trailing numbers
   * DRY: Reuses centralized utility function from utils.ts
   * SOLID: Single Responsibility - delegates to utility
   */
  private normalizeBusinessName(name: string): string {
    return normalizeBusinessName(name);
  }
  
  private buildLabels(business: Business, crawledData?: CrawledData): WikidataEntityData['labels'] {
    // Use crawled name if available, otherwise use business name
    // DRY: Normalize name to remove test timestamps before using in Wikidata
    const rawName = crawledData?.name || business.name;
    const normalizedName = this.normalizeBusinessName(rawName);
    
    if (rawName !== normalizedName) {
      console.log(`[ENTITY BUILDER] Normalized business name for label: "${rawName}" -> "${normalizedName}"`);
    }
    
    return {
      en: {
        language: 'en',
        value: normalizedName,
      },
    };
  }
  
  private buildDescriptions(business: Business, crawledData?: CrawledData): WikidataEntityData['descriptions'] {
    const description = crawledData?.description 
      || `Local business in ${business.location?.city}, ${business.location?.state}`;
    
    // Truncate to 250 chars (Wikidata limit)
    const truncated = description.substring(0, 250);
    
    return {
      en: {
        language: 'en',
        value: truncated,
      },
    };
  }
  
  /**
   * Build claims from business and crawled data
   * CRITICAL: Now async to support QID lookups for location, industry, and other properties
   * Ensures at least 10 properties are extracted from crawlData (user requirement)
   */
  private async buildClaims(business: Business, crawledData?: CrawledData): Promise<WikidataEntityData['claims']> {
    const claims: WikidataEntityData['claims'] = {};
    
    // P31: instance of - business (Q4830453)
    // Handle null URL gracefully (GREEN: Fix bug caught by test)
    claims.P31 = [this.createItemClaim('P31', 'Q4830453', business.url || undefined)];
    
    // P856: official website
    if (business.url) {
      claims.P856 = [this.createUrlClaim('P856', business.url)];
    }
    
    // P625: coordinate location
    // Check both business.location and crawledData.location for coordinates
    // Location data MUST be included when available (user requirement)
    let lat: number | undefined;
    let lng: number | undefined;
    let locationSource: string | undefined;
    
    if (business.location?.coordinates?.lat && business.location?.coordinates?.lng) {
      lat = business.location.coordinates.lat;
      lng = business.location.coordinates.lng;
      locationSource = 'business.location.coordinates';
    } else if (crawledData?.location?.lat && crawledData?.location?.lng) {
      // Use location data from crawl if business.location doesn't have coordinates
      lat = crawledData.location.lat;
      lng = crawledData.location.lng;
      locationSource = 'crawledData.location';
    }
    
    if (lat !== undefined && lng !== undefined) {
      claims.P625 = [this.createCoordinateClaim(
        'P625',
        lat,
        lng,
        business.url
      )];
      console.log(`[ENTITY BUILDER] ✓ Added P625 (coordinate location) from ${locationSource}: lat=${lat}, lng=${lng}`);
    } else {
      // Log why location wasn't added (for debugging)
      const hasBusinessLocation = !!business.location;
      const hasCrawlLocation = !!crawledData?.location;
      const businessHasCoords = !!(business.location?.coordinates?.lat && business.location?.coordinates?.lng);
      const crawlHasCoords = !!(crawledData?.location?.lat && crawledData?.location?.lng);
      console.log(`[ENTITY BUILDER] ⚠ P625 (coordinate location) NOT added - business.location: ${hasBusinessLocation}, business.coords: ${businessHasCoords}, crawl.location: ${hasCrawlLocation}, crawl.coords: ${crawlHasCoords}`);
      if (crawledData?.location) {
        console.log(`[ENTITY BUILDER]   Crawl location data:`, JSON.stringify(crawledData.location, null, 2));
      }
    }
    
    // P6375: street address (MUST be included when available - user requirement)
    // Check multiple sources for address data
    let streetAddress: string | undefined;
    if (crawledData?.location?.address) {
      streetAddress = crawledData.location.address;
    } else if (crawledData?.address) {
      // Fallback to top-level address field
      streetAddress = crawledData.address;
    }
    
    // If no explicit address, construct from location components (city, state, country)
    // This ensures location data is included even without a street address
    if (!streetAddress) {
      const city = crawledData?.location?.city || business.location?.city;
      const state = crawledData?.location?.state || business.location?.state;
      const country = crawledData?.location?.country || business.location?.country;
      if (city && state) {
        // Construct a location string for P6375
        streetAddress = `${city}, ${state}${country && country !== 'US' ? `, ${country}` : ''}`;
      }
    }
    
    if (streetAddress && !claims.P6375) {
      claims.P6375 = [this.createStringClaim('P6375', streetAddress, business.url)];
      console.log(`[ENTITY BUILDER] ✓ Added P6375 (street address): ${streetAddress.substring(0, 50)}...`);
    } else if (!streetAddress) {
      console.log(`[ENTITY BUILDER] ⚠ P6375 (street address) NOT added - no address data found in crawl or business location`);
    }
    
    // P131: located in (administrative territorial entity)
    // CRITICAL: Extract location data from crawlData and add P131 claim
    // This is essential for rich entity publication (user requirement: at least 10 properties)
    if (crawledData?.location?.city || business.location?.city) {
      const city = crawledData?.location?.city || business.location?.city;
      const state = crawledData?.location?.state || business.location?.state;
      const country = crawledData?.location?.country || business.location?.country || 'US';
      
      if (city) {
        // Try to find city QID (use fast mode to avoid blocking)
        try {
          const countryQID = country === 'US' ? 'Q30' : 'Q30'; // Default to US for now
          const cityQID = await sparqlService.findCityQID(city, state || undefined, countryQID, true); // fast mode
          if (cityQID) {
            claims.P131 = [this.createItemClaim('P131', cityQID, business.url || undefined)];
            console.log(`[ENTITY BUILDER] ✓ Added P131 (located in): ${city}, ${state} → ${cityQID}`);
          } else {
            console.log(`[ENTITY BUILDER] ⚠ P131 (located in) NOT added - city QID not found for ${city}, ${state}`);
          }
        } catch (error) {
          console.warn(`[ENTITY BUILDER] Error looking up city QID for P131: ${error}`);
        }
      }
    }
    
    // P17: country
    // CRITICAL: Extract country from location data (user requirement: at least 10 properties)
    const country = crawledData?.location?.country || business.location?.country || 'US';
    if (country) {
      // Map common country codes to QIDs
      const countryQIDMap: Record<string, string> = {
        'US': 'Q30',
        'CA': 'Q16',
        'GB': 'Q145',
        'UK': 'Q145',
        'AU': 'Q408',
        'DE': 'Q183',
        'FR': 'Q142',
        'IT': 'Q38',
        'ES': 'Q29',
        'MX': 'Q96',
        'BR': 'Q155',
        'IN': 'Q668',
        'CN': 'Q148',
        'JP': 'Q17',
      };
      
      const countryQID = countryQIDMap[country.toUpperCase()] || countryQIDMap['US']; // Default to US
      if (countryQID) {
        claims.P17 = [this.createItemClaim('P17', countryQID, business.url || undefined)];
        console.log(`[ENTITY BUILDER] ✓ Added P17 (country): ${country} → ${countryQID}`);
      }
    }
    
    // P159: headquarters location (same as P131 for most businesses)
    // Use same city QID if available
    if (claims.P131 && claims.P131[0]?.mainsnak?.datavalue?.value) {
      const value = claims.P131[0].mainsnak.datavalue.value;
      if (typeof value === 'object' && 'id' in value && typeof value.id === 'string') {
        const cityQID = value.id;
        claims.P159 = [this.createItemClaim('P159', cityQID, business.url || undefined)];
        console.log(`[ENTITY BUILDER] ✓ Added P159 (headquarters): ${cityQID}`);
      }
    }
    
    // P452: industry
    // CRITICAL: Extract industry from crawlData (user requirement: at least 10 properties)
    const industry = crawledData?.businessDetails?.industry || crawledData?.businessDetails?.sector || null;
    if (industry) {
      try {
        const industryQID = await sparqlService.findIndustryQID(industry, true); // fast mode
        if (industryQID) {
          claims.P452 = [this.createItemClaim('P452', industryQID, business.url || undefined)];
          console.log(`[ENTITY BUILDER] ✓ Added P452 (industry): ${industry} → ${industryQID}`);
        } else {
          console.log(`[ENTITY BUILDER] ⚠ P452 (industry) NOT added - industry QID not found for ${industry}`);
        }
      } catch (error) {
        console.warn(`[ENTITY BUILDER] Error looking up industry QID for P452: ${error}`);
      }
    }
    
    // P1454: legal form
    // Extract legal form from crawlData if available
    const legalForm = crawledData?.businessDetails?.legalForm || null;
    if (legalForm) {
      try {
        const legalFormQID = await sparqlService.findLegalFormQID(legalForm);
        if (legalFormQID) {
          claims.P1454 = [this.createItemClaim('P1454', legalFormQID, business.url || undefined)];
          console.log(`[ENTITY BUILDER] ✓ Added P1454 (legal form): ${legalForm} → ${legalFormQID}`);
        }
      } catch (error) {
        console.warn(`[ENTITY BUILDER] Error looking up legal form QID for P1454: ${error}`);
      }
    }
    
    // P1448: official name
    // DRY: Normalize name to remove test timestamps before using in Wikidata
    const rawOfficialName = crawledData?.name || business.name;
    const officialName = this.normalizeBusinessName(rawOfficialName);
    if (rawOfficialName !== officialName) {
      console.log(`[ENTITY BUILDER] Normalized business name for P1448: "${rawOfficialName}" -> "${officialName}"`);
    }
    claims.P1448 = [this.createStringClaim('P1448', officialName, business.url)];
    
    // P1329: phone number
    if (crawledData?.phone) {
      claims.P1329 = [this.createStringClaim('P1329', crawledData.phone, business.url)];
    }
    
    // P6375: street address (replaces deprecated P969)
    // Note: Address is stored in crawledData parameter
    if (crawledData?.address) {
      claims.P6375 = [this.createStringClaim('P6375', crawledData.address, business.url)];
    }
    
    // P968: email address
    if (crawledData?.email) {
      claims.P968 = [this.createStringClaim('P968', crawledData.email, business.url)];
    }
    
    // P571: inception (founded date)
    if (crawledData?.founded) {
      const foundedClaim = this.createTimeClaim('P571', crawledData.founded, business.url);
      if (foundedClaim) {
        claims.P571 = [foundedClaim];
      }
    }
    
    // SOCIAL MEDIA PROPERTIES
    if (crawledData?.socialLinks) {
      // P2002: Twitter username
      if (crawledData.socialLinks.twitter) {
        const username = this.extractUsername(crawledData.socialLinks.twitter, 'twitter');
        if (username) {
          claims.P2002 = [this.createStringClaim('P2002', username, business.url)];
        }
      }
      
      // P2013: Facebook ID
      if (crawledData.socialLinks.facebook) {
        const fbId = this.extractUsername(crawledData.socialLinks.facebook, 'facebook');
        if (fbId) {
          claims.P2013 = [this.createStringClaim('P2013', fbId, business.url)];
        }
      }
      
      // P2003: Instagram username
      if (crawledData.socialLinks.instagram) {
        const username = this.extractUsername(crawledData.socialLinks.instagram, 'instagram');
        if (username) {
          claims.P2003 = [this.createStringClaim('P2003', username, business.url)];
        }
      }
      
      // P4264: LinkedIn company ID
      if (crawledData.socialLinks.linkedin) {
        const linkedinId = this.extractUsername(crawledData.socialLinks.linkedin, 'linkedin');
        if (linkedinId) {
          claims.P4264 = [this.createStringClaim('P4264', linkedinId, business.url)];
        }
      }
    }
    
    // BUSINESS DETAILS (from crawledData.businessDetails)
    if (crawledData?.businessDetails) {
      // P1128: employee count
      if (crawledData.businessDetails.employeeCount) {
        const count = typeof crawledData.businessDetails.employeeCount === 'number'
          ? crawledData.businessDetails.employeeCount
          : parseInt(String(crawledData.businessDetails.employeeCount));
        
        if (!isNaN(count) && count > 0) {
          // P1128 (number of employees) should use unit Q11573 (person), not "1" (dimensionless)
          claims.P1128 = [this.createQuantityClaim('P1128', count, business.url, 'Q11573')];
        }
      }
      
      // P249: stock ticker symbol
      if (crawledData.businessDetails.stockSymbol) {
        claims.P249 = [this.createStringClaim('P249', crawledData.businessDetails.stockSymbol, business.url)];
      }
    }
    
    // CRITICAL: Log property count and ensure we're meeting the 10-property requirement
    const propertyCount = Object.keys(claims).length;
    console.log(`[ENTITY BUILDER] Property count: ${propertyCount} (target: 10+)`);
    
    if (propertyCount < 10) {
      console.warn(`[ENTITY BUILDER] ⚠ WARNING: Only ${propertyCount} properties extracted. Target is at least 10 properties for rich publication.`);
      console.log(`[ENTITY BUILDER] Available properties: ${Object.keys(claims).join(', ')}`);
      
      // Log what's missing
      const availableButNotExtracted: string[] = [];
      if (crawledData?.businessDetails?.industry && !claims.P452) {
        availableButNotExtracted.push('P452 (industry)');
      }
      if (crawledData?.location?.city && !claims.P131) {
        availableButNotExtracted.push('P131 (located in)');
      }
      if (crawledData?.location?.country && !claims.P17) {
        availableButNotExtracted.push('P17 (country)');
      }
      if (crawledData?.businessDetails?.legalForm && !claims.P1454) {
        availableButNotExtracted.push('P1454 (legal form)');
      }
      if (crawledData?.email && !claims.P968) {
        availableButNotExtracted.push('P968 (email)');
      }
      if (crawledData?.phone && !claims.P1329) {
        availableButNotExtracted.push('P1329 (phone)');
      }
      if (crawledData?.founded && !claims.P571) {
        availableButNotExtracted.push('P571 (founded)');
      }
      if (crawledData?.socialLinks && !claims.P2002 && !claims.P2013 && !claims.P2003 && !claims.P4264) {
        availableButNotExtracted.push('Social media properties');
      }
      
      if (availableButNotExtracted.length > 0) {
        console.warn(`[ENTITY BUILDER] Missing properties that could be extracted: ${availableButNotExtracted.join(', ')}`);
      }
    } else {
      console.log(`[ENTITY BUILDER] ✓ Successfully extracted ${propertyCount} properties (meets 10+ requirement)`);
    }
    
    return claims;
  }
  
  /**
   * Extract username from social media URL
   * Follows Single Responsibility: Only handles URL parsing
   */
  private extractUsername(url: string, platform: 'twitter' | 'facebook' | 'instagram' | 'linkedin'): string | null {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      
      switch (platform) {
        case 'twitter':
          // https://twitter.com/username or https://x.com/username
          const twitterMatch = pathname.match(/^\/([a-zA-Z0-9_]+)\/?$/);
          return twitterMatch ? twitterMatch[1] : null;
          
        case 'facebook':
          // https://facebook.com/pages/name/123456 or https://facebook.com/username
          const fbMatch = pathname.match(/\/pages\/[^\/]+\/(\d+)|^\/([a-zA-Z0-9.]+)\/?$/);
          return fbMatch ? (fbMatch[1] || fbMatch[2]) : null;
          
        case 'instagram':
          // https://instagram.com/username
          const instaMatch = pathname.match(/^\/([a-zA-Z0-9._]+)\/?$/);
          return instaMatch ? instaMatch[1] : null;
          
        case 'linkedin':
          // https://linkedin.com/company/company-name
          const linkedinMatch = pathname.match(/\/company\/([^\/]+)\/?$/);
          return linkedinMatch ? linkedinMatch[1] : null;
          
        default:
          return null;
      }
    } catch (error) {
      console.warn(`Failed to extract ${platform} username from: ${url}`);
      return null;
    }
  }
  
  private createItemClaim(property: string, qid: string, referenceUrl: string): WikidataClaim {
    return {
      mainsnak: {
        snaktype: 'value',
        property,
        datavalue: {
          value: {
            'entity-type': 'item',
            id: qid,
          },
          type: 'wikibase-entityid',
        },
      },
      type: 'statement',
      references: [this.createReference(referenceUrl)],
    };
  }
  
  private createStringClaim(property: string, value: string, referenceUrl: string): WikidataClaim {
    return {
      mainsnak: {
        snaktype: 'value',
        property,
        datavalue: {
          value,
          type: 'string',
        },
      },
      type: 'statement',
      references: [this.createReference(referenceUrl)],
    };
  }
  
  private createUrlClaim(property: string, url: string): WikidataClaim {
    return {
      mainsnak: {
        snaktype: 'value',
        property,
        datavalue: {
          value: url,
          type: 'string',
        },
      },
      type: 'statement',
    };
  }
  
  private createCoordinateClaim(
    property: string,
    latitude: number,
    longitude: number,
    referenceUrl: string
  ): WikidataClaim {
    return {
      mainsnak: {
        snaktype: 'value',
        property,
        datavalue: {
          value: {
            latitude,
            longitude,
            precision: 0.0001,
            globe: 'http://www.wikidata.org/entity/Q2',
          },
          type: 'globecoordinate',
        },
      },
      type: 'statement',
      references: [this.createReference(referenceUrl)],
    };
  }
  
  /**
   * Create reference with URL, title, and retrieved date
   * Can accept Reference object from notability checker or plain URL
   */
  private createReference(urlOrRef: string | { url: string; title?: string; snippet?: string } | undefined) {
    // Handle null/undefined gracefully (GREEN: Fix bug caught by test)
    if (!urlOrRef) {
      // Return empty reference if no URL provided
      return { snaks: {} };
    }
    const url = typeof urlOrRef === 'string' ? urlOrRef : urlOrRef.url;
    const title = typeof urlOrRef === 'object' ? urlOrRef.title : undefined;
    
    const reference: any = {
      snaks: {
        P854: [
          {
            snaktype: 'value',
            property: 'P854',
            datavalue: {
              value: url,
              type: 'string',
            },
          },
        ],
      },
    };
    
    // Add title if available (P1476)
    if (title) {
      reference.snaks.P1476 = [
        {
          snaktype: 'value',
          property: 'P1476',
          datavalue: {
            value: {
              text: title,
              language: 'en',
            },
            type: 'monolingualtext',
          },
        },
      ];
    }
    
    // Add retrieved date (P813)
    const today = new Date().toISOString().split('T')[0];
    reference.snaks.P813 = [
      {
        snaktype: 'value',
        property: 'P813',
        datavalue: {
          value: {
            time: `+${today}T00:00:00Z`,
            precision: 11, // day precision
            timezone: 0,
            before: 0, // Required by contract - 0 for exact dates
            after: 0, // Required by contract - 0 for exact dates
            calendarmodel: 'http://www.wikidata.org/entity/Q1985727',
          },
          type: 'time',
        },
      },
    ];
    
    return reference;
  }
  
  /**
   * Validate that entity meets notability standards
   */
  validateNotability(entity: WikidataEntityData): { isNotable: boolean; reasons: string[] } {
    const reasons: string[] = [];
    let isNotable = true;
    
    // Must have at least one reference
    const hasReferences = Object.values(entity.claims).some(claims =>
      claims.some(claim => claim.references && claim.references.length > 0)
    );
    
    if (!hasReferences) {
      isNotable = false;
      reasons.push('No references provided');
    }
    
    // Must have at least 3 substantial properties beyond name
    const propertyCount = Object.keys(entity.claims).length;
    if (propertyCount < 3) {
      isNotable = false;
      reasons.push(`Only ${propertyCount} properties (minimum 3 required)`);
    }
    
    // Must have instance of (P31)
    if (!entity.claims.P31) {
      isNotable = false;
      reasons.push('Missing "instance of" (P31) property');
    }
    
    return { isNotable, reasons };
  }
  
  /**
   * Use LLM to suggest additional Wikidata properties
   * Follows Single Responsibility: Only handles property suggestion
   */
  private async suggestAdditionalProperties(
    business: Business,
    crawledData?: CrawledData
  ): Promise<{ claims: Record<string, WikidataClaim[]>; suggestions: any[] }> {
    try {
      // Build context from available data
      const dataContext = this.formatDataContext(business, crawledData);
      
      // Build prompt with property options
      const prompt = this.buildPropertySuggestionPrompt(dataContext);
      
      // Query LLM
      const response = await openRouterClient.query('openai/gpt-4-turbo', prompt);
      
      // Clean up markdown code blocks if present
      let content = response.content.trim();
      if (content.startsWith('```json')) {
        content = content.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (content.startsWith('```')) {
        content = content.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }
      
      // P1 Fix: Robust JSON parsing with fallback
      // SOLID: Single Responsibility - handles JSON parsing errors gracefully
      // DRY: Reuses parseLLMResponse utility pattern
      const parsed = this.parseLLMResponseSafely(content);
      
      // Handle different response formats (DRY: normalize to array)
      // LLM might return array directly or object with suggestions property
      const suggestions = Array.isArray(parsed) 
        ? parsed 
        : (parsed.suggestions || parsed.properties || []);
      
      // Ensure suggestions is an array (SOLID: defensive programming)
      if (!Array.isArray(suggestions)) {
        console.warn('[ENTITY BUILDER] Suggestions is not an array, using empty array');
        return { claims: {}, suggestions: [] };
      }
      
      // Convert suggestions to claims with QID resolution
      const claims = await this.convertSuggestionsToClaims(suggestions, business.url);
      
      return { claims, suggestions };
      
    } catch (error) {
      console.error('Property suggestion error:', error);
      // P1 Fix: Log error details for debugging
      if (error instanceof Error) {
        console.error('Error details:', {
          message: error.message,
          stack: error.stack?.split('\n').slice(0, 3).join('\n')
        });
      }
      return { claims: {}, suggestions: [] };
    }
  }

  /**
   * Parse LLM response safely with fallback strategies
   * P1 Fix: Handles non-JSON LLM responses gracefully
   * SOLID: Single Responsibility - JSON parsing only
   * DRY: Centralized parsing logic for reuse
   * 
   * @param content - Raw LLM response content
   * @returns Parsed JSON object or throws error
   */
  private parseLLMResponseSafely(content: string): any {
    // Try direct JSON parse first
    try {
      return JSON.parse(content);
    } catch (error) {
      // Fallback 1: Extract JSON from text (common LLM pattern)
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          // Fix common JSON issues
          const fixed = jsonMatch[0]
            .replace(/,\s*}/g, '}')  // Remove trailing commas in objects
            .replace(/,\s*]/g, ']')  // Remove trailing commas in arrays
            .replace(/([{,]\s*)(\w+):/g, '$1"$2":'); // Add quotes to unquoted keys
          
          return JSON.parse(fixed);
        } catch (fixError) {
          // Fallback 2: Try to extract array if object parse fails
          const arrayMatch = content.match(/\[[\s\S]*\]/);
          if (arrayMatch) {
            try {
              return JSON.parse(arrayMatch[0]);
            } catch {
              // Continue to final error
            }
          }
        }
      }
      
      // If all parsing attempts fail, throw descriptive error
      throw new Error(
        `Failed to parse LLM response as JSON. ` +
        `Content preview: ${content.substring(0, 200)}... ` +
        `Original error: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
  
  /**
   * Format business data for LLM context
   * Follows DRY: Centralized data formatting
   */
  private formatDataContext(business: Business, crawledData?: CrawledData): string {
    const lines: string[] = [];
    
    lines.push(`Name: ${business.name}`);
    lines.push(`URL: ${business.url}`);
    if (business.location) {
      lines.push(`Location: ${business.location.city}, ${business.location.state}`);
    }
    
    if (crawledData?.description) {
      lines.push(`Description: ${crawledData.description}`);
    }
    
    if (crawledData?.phone) lines.push(`Phone: ${crawledData.phone}`);
    if (crawledData?.email) lines.push(`Email: ${crawledData.email}`);
    if (crawledData?.address) lines.push(`Address: ${crawledData.address}`);
    
    // Business details from LLM extraction
    if (crawledData?.businessDetails) {
      const bd = crawledData.businessDetails;
      if (bd.industry) lines.push(`Industry: ${bd.industry}`);
      if (bd.sector) lines.push(`Sector: ${bd.sector}`);
      if (bd.legalForm) lines.push(`Legal Form: ${bd.legalForm}`);
      if (bd.founded) lines.push(`Founded: ${bd.founded}`);
      if (bd.employeeCount) lines.push(`Employees: ${bd.employeeCount}`);
      if (bd.revenue) lines.push(`Revenue: ${bd.revenue}`);
      if (bd.parentCompany) lines.push(`Parent Company: ${bd.parentCompany}`);
      if (bd.ceo) lines.push(`CEO: ${bd.ceo}`);
      if (bd.stockSymbol) lines.push(`Stock Symbol: ${bd.stockSymbol}`);
      if (bd.products?.length) lines.push(`Products: ${bd.products.join(', ')}`);
      if (bd.services?.length) lines.push(`Services: ${bd.services.join(', ')}`);
    }
    
    return lines.join('\n');
  }
  
  /**
   * Build property suggestion prompt
   * Follows Interface Segregation: Focused on property mapping
   */
  private buildPropertySuggestionPrompt(dataContext: string): string {
    return `
You are a Wikidata entity expert. Given business data, suggest ALL applicable Wikidata properties (PIDs) with their values.

BUSINESS DATA:
${dataContext}

AVAILABLE PROPERTIES:
P452: industry (e.g., "Software Development", "Healthcare")
P1454: legal form (e.g., "LLC", "Corporation")
P571: inception/founded (format: "YYYY" or "YYYY-MM-DD")
P159: headquarters location (city name only)
P1128: number of employees (numeric only)
P749: parent organization (name only)
P169: CEO (name only)
P249: stock ticker symbol (format: "AAPL", "TSLA")

CRITICAL RULES:
- Only suggest properties where data is explicitly available
- For dates: use format "YYYY" or "YYYY-MM-DD"
- For locations: provide ONLY city name (we'll resolve QID)
- For organizations/people: provide ONLY name (we'll resolve QID)
- Include confidence score (0-1)
- Only suggest if confidence >= 0.7

Return ONLY valid JSON array:
[
  {
    "pid": "P452",
    "value": "Software Development",
    "dataType": "item",
    "confidence": 0.95,
    "reasoning": "Website clearly states software development company"
  }
]
    `.trim();
  }
  
  /**
   * Convert LLM suggestions to WikidataClaims
   * Follows Dependency Inversion: Uses property mapping abstraction
   */
  private async convertSuggestionsToClaims(
    suggestions: any[],
    referenceUrl: string
  ): Promise<Record<string, WikidataClaim[]>> {
    const claims: Record<string, WikidataClaim[]> = {};
    
    for (const suggestion of suggestions) {
      if (suggestion.confidence < 0.7) continue;
      
      const mapping = BUSINESS_PROPERTY_MAP[suggestion.pid];
      if (!mapping) continue;
      
      // Resolve QID if needed
      // CRITICAL: Only resolve QIDs for 'item' dataType properties
      // String/URL properties should NEVER have QID resolution
      let value = suggestion.value;
      if (mapping.dataType === 'item' && mapping.qidResolver) {
        const qid = await mapping.qidResolver(value);
        if (!qid) {
          console.warn(`[ENTITY BUILDER] QID not found for: ${value} (${suggestion.pid})`);
          continue;
        }
        value = qid;
        // Validate QID format
        if (typeof value !== 'string' || !value.startsWith('Q')) {
          console.warn(`[ENTITY BUILDER] Invalid QID format for ${suggestion.pid}: ${value}. Expected QID (e.g., Q123).`);
          continue;
        }
      } else if (mapping.dataType !== 'item' && (typeof value === 'string' && value.startsWith('Q'))) {
        // Safety check: If a non-item property has a QID value, it's likely a mistake
        console.warn(`[ENTITY BUILDER] Property ${suggestion.pid} (dataType: ${mapping.dataType}) has QID value ${value}. This may cause type mismatch.`);
        // Don't fail, but log the warning - the validator will catch it if it's truly invalid
      }
      
      // Validate value
      if (mapping.validator && !mapping.validator(value)) {
        console.warn(`[ENTITY BUILDER] Invalid value for ${suggestion.pid}: ${value}`);
        continue;
      }
      
      // Create claim with validated dataType
      // Use mapping.dataType (authoritative) not suggestion.dataType (may be wrong)
      const claim = this.createClaimFromSuggestion(
        suggestion.pid,
        value,
        mapping.dataType, // Use mapping dataType, not suggestion dataType
        referenceUrl
      );
      
      if (claim) {
        claims[suggestion.pid] = [claim];
      }
    }
    
    return claims;
  }
  
  /**
   * Create claim from suggestion
   * Reuses existing claim creation logic (DRY)
   * SOLID: Single Responsibility - claim creation from suggestions
   */
  private createClaimFromSuggestion(
    pid: string,
    value: any,
    dataType: string,
    referenceUrl: string
  ): WikidataClaim | null {
    switch (dataType) {
      case 'item':
        // Validate: value should be a QID (starts with Q)
        if (typeof value !== 'string' || !value.startsWith('Q')) {
          console.warn(`[ENTITY BUILDER] Invalid QID for ${pid}: ${value}. Expected QID format (e.g., Q123).`);
          return null;
        }
        return this.createItemClaim(pid, value, referenceUrl);
      case 'string':
      case 'url':
        // URLs are stored as strings in Wikidata API
        // Validate: value should be a string
        if (typeof value !== 'string') {
          console.warn(`[ENTITY BUILDER] Invalid string value for ${pid}: ${value}. Expected string.`);
          return null;
        }
        return this.createStringClaim(pid, value, referenceUrl);
      case 'time':
        return this.createTimeClaim(pid, value, referenceUrl);
      case 'quantity':
        return this.createQuantityClaim(pid, value, referenceUrl);
      case 'coordinate':
        // Coordinates need lat/lng, handled separately in buildClaims
        console.warn(`[ENTITY BUILDER] Coordinate claims must be created with createCoordinateClaim. Skipping ${pid}.`);
        return null;
      default:
        console.warn(`[ENTITY BUILDER] Unknown dataType '${dataType}' for ${pid}. Skipping.`);
        return null;
    }
  }
  
  /**
   * Create time claim (for dates)
   */
  private createTimeClaim(property: string, date: string, referenceUrl: string): WikidataClaim {
    // Parse date to Wikidata time format
    const precision = date.length === 4 ? 9 : 11; // Year vs full date
    
    return {
      mainsnak: {
        snaktype: 'value',
        property,
        datavalue: {
          value: {
            time: `+${date}-00-00T00:00:00Z`,
            precision,
            timezone: 0,
            before: 0, // Required by contract - 0 for exact dates
            after: 0, // Required by contract - 0 for exact dates
            calendarmodel: 'http://www.wikidata.org/entity/Q1985727',
          },
          type: 'time',
        },
      },
      type: 'statement',
      references: [this.createReference(referenceUrl)],
    };
  }
  
  /**
   * Create quantity claim (for numbers)
   * DRY: Centralized quantity claim creation
   * SOLID: Single Responsibility - quantity formatting only
   * 
   * @param property - Property ID (e.g., P1128 for number of employees)
   * @param amount - Numeric value
   * @param referenceUrl - Reference URL for the claim
   * @param unit - Optional unit QID (defaults to "1" for dimensionless, use "Q11573" for person count)
   */
  private createQuantityClaim(
    property: string, 
    amount: number, 
    referenceUrl: string,
    unit: string = '1' // Default to dimensionless
  ): WikidataClaim {
    // Validate unit format: should be "1" or a QID string
    if (unit !== '1' && (!unit.startsWith('Q') || !/^Q\d+$/.test(unit))) {
      console.warn(`[ENTITY BUILDER] Invalid unit format for ${property}: ${unit}. Using "1" (dimensionless).`);
      unit = '1';
    }
    
    return {
      mainsnak: {
        snaktype: 'value',
        property,
        datavalue: {
          value: {
            amount: `+${amount}`, // Must be string with + or - prefix
            unit: unit, // String: "1" for dimensionless or QID like "Q11573" for units
          },
          type: 'quantity',
        },
      },
      type: 'statement',
      references: [this.createReference(referenceUrl)],
    };
  }
  
  /**
   * Merge basic and suggested claims
   * Follows Open/Closed: Easy to extend merging logic
   */
  private mergeClaims(
    basicClaims: Record<string, WikidataClaim[]>,
    suggestedResult: { claims: Record<string, WikidataClaim[]>; suggestions: any[] }
  ): Record<string, WikidataClaim[]> {
    const merged = { ...basicClaims };
    
    // Add suggested claims (don't override basic ones)
    for (const [pid, claims] of Object.entries(suggestedResult.claims)) {
      if (!merged[pid]) {
        merged[pid] = claims;
      }
    }
    
    return merged;
  }
  
  /**
   * Calculate entity quality score (0-100)
   */
  private calculateQualityScore(claims: Record<string, WikidataClaim[]>): number {
    let score = 0;
    
    // Base score for required properties
    const requiredProps = ['P31', 'P856', 'P1448'];
    const hasRequired = requiredProps.every(pid => claims[pid]);
    score += hasRequired ? 30 : 0;
    
    // Score for number of properties (max 40 points)
    const propertyCount = Object.keys(claims).length;
    score += Math.min(propertyCount * 2, 40);
    
    // Score for references (max 30 points)
    let referencedClaims = 0;
    for (const claimArray of Object.values(claims)) {
      for (const claim of claimArray) {
        if (claim.references && claim.references.length > 0) {
          referencedClaims++;
        }
      }
    }
    score += Math.min(referencedClaims * 3, 30);
    
    return Math.min(score, 100);
  }
  
  /**
   * Calculate completeness score (0-100)
   */
  private calculateCompleteness(claims: Record<string, WikidataClaim[]>): number {
    const allPossibleProps = Object.keys(BUSINESS_PROPERTY_MAP).length;
    const includedProps = Object.keys(claims).length;
    
    return Math.round((includedProps / allPossibleProps) * 100);
  }
  
  /**
   * Attach multiple notability references to claims
   * Distributes references across different claims to ensure multiple are published
   * Follows DRY: Reuses createReference method
   * SOLID: Single Responsibility - only handles reference attachment
   * 
   * Strategy:
   * - Prioritize core claims (P31, P856, P1448) with best references
   * - Distribute remaining references across other claims
   * - Ensure at least 2-3 different references are used
   * - Always include business URL as fallback reference
   * 
   * @param claims - Claims to attach references to
   * @param notabilityReferences - Array of notability references (typically top 3-5)
   * @param businessUrl - Business URL as fallback reference
   */
  private attachNotabilityReferences(
    claims: Record<string, WikidataClaim[]>,
    notabilityReferences: Reference[],
    businessUrl: string
  ): void {
    if (notabilityReferences.length === 0) return;
    
    // Priority order for attaching references (core claims first)
    const priorityPIDs = ['P31', 'P856', 'P1448', 'P625', 'P159', 'P452', 'P571', 'P1128'];
    
    // Get all PIDs in priority order, then others
    const allPIDs = [
      ...priorityPIDs.filter(pid => claims[pid]),
      ...Object.keys(claims).filter(pid => !priorityPIDs.includes(pid))
    ];
    
    // Distribute references across claims
    // Strategy: Use top references for priority claims, distribute others
    const referencesToUse = notabilityReferences.slice(0, Math.min(5, notabilityReferences.length));
    
    // Always include business URL as a reference option
    const allReferences = [
      ...referencesToUse,
      { url: businessUrl, title: 'Official website', snippet: '', source: 'company' }
    ];
    
    // Attach references to claims, ensuring multiple different references are used
    allPIDs.forEach((pid, index) => {
      const claimArray = claims[pid];
      if (!claimArray || claimArray.length === 0) return;
      
      // Select reference(s) for this claim
      // Use different references for different claims to ensure multiple are published
      const refIndex = index % allReferences.length;
      const selectedRef = allReferences[refIndex];
      
      // For each claim with this PID, add the selected reference
      claimArray.forEach(claim => {
        // Add to existing references or create new array
        if (!claim.references) {
          claim.references = [];
        }
        
        // Check if this reference URL already exists in the claim's references
        const hasDuplicate = claim.references.some(existingRef => {
          const existingUrl = this.extractReferenceUrl([existingRef]);
          return existingUrl === selectedRef.url;
        });
        
        // Only add if not a duplicate
        if (!hasDuplicate) {
          const reference = this.createReference(selectedRef);
          claim.references.push(reference);
        }
      });
    });
    
    console.log(`[REFERENCE] Attached ${referencesToUse.length} notability references across ${allPIDs.length} claims`);
  }
  
  /**
   * Extract URL from reference for duplicate checking
   * Helper method following Single Responsibility
   */
  private extractReferenceUrl(references: any[]): string | null {
    if (!references || references.length === 0) return null;
    
    // Try to extract URL from first reference's snaks
    const firstRef = references[0];
    if (firstRef?.snaks?.P854?.[0]?.datavalue?.value) {
      return firstRef.snaks.P854[0].datavalue.value;
    }
    
    return null;
  }
}

export const entityBuilder = new WikidataEntityBuilder();

