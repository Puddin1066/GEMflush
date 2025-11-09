// Wikidata entity builder - constructs Wikidata JSON entities from business data

import { CrawledData, WikidataEntityData, WikidataClaim } from '@/lib/types/gemflush';
import { Business } from '@/lib/db/schema';

export class WikidataEntityBuilder {
  /**
   * Build a Wikidata entity from business and crawled data
   */
  buildEntity(business: Business, crawledData?: CrawledData): WikidataEntityData {
    const entity: WikidataEntityData = {
      labels: this.buildLabels(business, crawledData),
      descriptions: this.buildDescriptions(business, crawledData),
      claims: this.buildClaims(business, crawledData),
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
    if (business.location?.lat && business.location?.lng) {
      claims.P625 = [this.createCoordinateClaim(
        'P625',
        business.location.lat,
        business.location.lng,
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
    
    // P969: street address
    if (business.location?.address) {
      claims.P969 = [this.createStringClaim('P969', business.location.address, business.url)];
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
}

export const entityBuilder = new WikidataEntityBuilder();

