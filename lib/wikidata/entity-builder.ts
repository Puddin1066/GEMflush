// Wikidata entity builder - constructs Wikidata JSON entities from business data

import { CrawledData, WikidataEntityData, WikidataClaim } from '@/lib/types/gemflush';
import { Business } from '@/lib/db/schema';
import { openRouterClient } from '@/lib/llm/openrouter';
import { BUSINESS_PROPERTY_MAP, type PropertyMapping } from './property-mapping';

export class WikidataEntityBuilder {
  /**
   * Build a Wikidata entity from business and crawled data
   * Enhanced with LLM property suggestions
   */
  async buildEntity(business: Business, crawledData?: CrawledData): Promise<WikidataEntityData> {
    // Build basic claims (existing logic)
    const basicClaims = this.buildClaims(business, crawledData);
    
    // LLM: Suggest additional properties based on crawled data
    const suggestedClaims = await this.suggestAdditionalProperties(business, crawledData);
    
    // Merge claims (basic + suggested)
    const allClaims = this.mergeClaims(basicClaims, suggestedClaims);
    
    // Calculate quality metrics
    const qualityScore = this.calculateQualityScore(allClaims);
    const completeness = this.calculateCompleteness(allClaims);
    
    const entity: WikidataEntityData = {
      labels: this.buildLabels(business, crawledData),
      descriptions: this.buildDescriptions(business, crawledData),
      claims: allClaims,
      llmSuggestions: {
        suggestedProperties: suggestedClaims.suggestions,
        suggestedReferences: [],
        qualityScore,
        completeness,
        model: 'openai/gpt-4-turbo',
        generatedAt: new Date(),
      },
    };
    
    return entity;
  }
  
  private buildLabels(business: Business, crawledData?: CrawledData): WikidataEntityData['labels'] {
    const name = crawledData?.name || business.name;
    
    return {
      en: {
        language: 'en',
        value: name,
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
  
  private buildClaims(business: Business, crawledData?: CrawledData): WikidataEntityData['claims'] {
    const claims: WikidataEntityData['claims'] = {};
    
    // P31: instance of - business (Q4830453)
    claims.P31 = [this.createItemClaim('P31', 'Q4830453', business.url)];
    
    // P856: official website
    if (business.url) {
      claims.P856 = [this.createUrlClaim('P856', business.url)];
    }
    
    // P625: coordinate location
    if (business.location?.coordinates?.lat && business.location?.coordinates?.lng) {
      claims.P625 = [this.createCoordinateClaim(
        'P625',
        business.location.coordinates.lat,
        business.location.coordinates.lng,
        business.url
      )];
    }
    
    // P159: headquarters location (city QID would need to be looked up)
    // For now, we'll skip this as it requires SPARQL lookup
    
    // P1448: official name
    const officialName = crawledData?.name || business.name;
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
    
    return claims;
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
  
  private createReference(url: string) {
    return {
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
      
      // Parse suggestions
      const suggestions = JSON.parse(response.content);
      
      // Convert suggestions to claims with QID resolution
      const claims = await this.convertSuggestionsToClaims(suggestions, business.url);
      
      return { claims, suggestions };
      
    } catch (error) {
      console.error('Property suggestion error:', error);
      return { claims: {}, suggestions: [] };
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
      let value = suggestion.value;
      if (mapping.dataType === 'item' && mapping.qidResolver) {
        const qid = await mapping.qidResolver(value);
        if (!qid) {
          console.warn(`QID not found for: ${value} (${suggestion.pid})`);
          continue;
        }
        value = qid;
      }
      
      // Validate value
      if (mapping.validator && !mapping.validator(value)) {
        console.warn(`Invalid value for ${suggestion.pid}: ${value}`);
        continue;
      }
      
      // Create claim
      const claim = this.createClaimFromSuggestion(
        suggestion.pid,
        value,
        mapping.dataType,
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
   */
  private createClaimFromSuggestion(
    pid: string,
    value: any,
    dataType: string,
    referenceUrl: string
  ): WikidataClaim | null {
    switch (dataType) {
      case 'item':
        return this.createItemClaim(pid, value, referenceUrl);
      case 'string':
        return this.createStringClaim(pid, value, referenceUrl);
      case 'time':
        return this.createTimeClaim(pid, value, referenceUrl);
      case 'quantity':
        return this.createQuantityClaim(pid, value, referenceUrl);
      default:
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
   */
  private createQuantityClaim(property: string, amount: number, referenceUrl: string): WikidataClaim {
    return {
      mainsnak: {
        snaktype: 'value',
        property,
        datavalue: {
          value: {
            amount: `+${amount}`,
            unit: '1', // Unitless
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
}

export const entityBuilder = new WikidataEntityBuilder();

