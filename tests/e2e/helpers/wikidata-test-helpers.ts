/**
 * Wikidata Test Helpers
 * 
 * DRY: Reusable utilities for Wikidata publishing flow tests
 * SOLID: Single Responsibility - each helper has one clear purpose
 */

import type { Page } from '@playwright/test';

export interface WikidataEntityDTO {
  entity: {
    labels?: Record<string, { value: string }>;
    descriptions?: Record<string, { value: string }>;
    claims?: Record<string, any[]>;
  };
  notability?: {
    isNotable: boolean;
    confidence: number;
    reasons: string[];
    seriousReferenceCount: number;
    topReferences: Array<{ url: string; title: string }>;
  };
  canPublish?: boolean;
  error?: string;
}

export interface PropertyVerification {
  propertyCount: number;
  availableProperties: string[];
  missingProperties: string[];
}

export interface NotabilityVerification {
  isValid: boolean;
  issues: string[];
}

/**
 * Fetch Wikidata entity DTO from API
 * 
 * Returns: Entity DTO with notability and publish readiness
 */
export async function fetchWikidataEntityDTO(
  page: Page,
  baseURL: string,
  businessId: number
): Promise<WikidataEntityDTO> {
  const response = await page.request.get(
    `${baseURL}/api/wikidata/entity/${businessId}`,
    { timeout: 30000 }
  );

  if (!response.ok()) {
    const errorBody = await response.json().catch(() => ({ error: 'Unknown error' }));
    const errorMessage = errorBody?.error || 'Unknown error';
    
    console.error(`[WIKIDATA HELPER] ❌ Entity fetch failed:`, {
      status: response.status(),
      error: errorMessage,
      businessId,
    });
    
    // Handle 403 (permission denied) - may need Pro plan
    if (response.status() === 403) {
      throw new Error(`Permission denied (${response.status()}): ${errorMessage}. May need Pro plan.`);
    }
    
    throw new Error(`Failed to fetch entity (${response.status()}): ${errorMessage}`);
  }

  const entityDTO = await response.json();
  console.log('[WIKIDATA HELPER] ✓ Entity DTO fetched');
  return entityDTO;
}

/**
 * Verify entity properties
 * 
 * Handles both raw entity structure (claims object) and DetailDTO structure (claims array)
 * 
 * Returns: Property verification result
 */
export function verifyEntityProperties(
  entity: WikidataEntityDTO['entity'] | { claims?: any[] | Record<string, any[]> }
): PropertyVerification {
  // Handle DetailDTO structure (claims is array)
  if (Array.isArray(entity?.claims)) {
    const claimsArray = entity.claims as any[];
    const claimsMap: Record<string, any[]> = {};
    claimsArray.forEach((claim: any) => {
      const pid = claim.pid || claim.propertyId;
      if (pid) {
        if (!claimsMap[pid]) {
          claimsMap[pid] = [];
        }
        claimsMap[pid].push(claim);
      }
    });
    const propertyCount = Object.keys(claimsMap).length;
    const availableProperties = Object.keys(claimsMap);
    
    // Common properties that should be present for rich entities
    const expectedProperties = [
      'P31', 'P856', 'P17', 'P1448', 'P625', 'P6375', 'P2002', 'P4264',
    ];
    const missingProperties = expectedProperties.filter(
      (prop) => !availableProperties.includes(prop)
    );
    
    return {
      propertyCount,
      availableProperties,
      missingProperties,
    };
  }
  
  // Handle raw entity structure (claims is object)
  const claims = (entity?.claims as Record<string, any[]>) || {};
  const propertyCount = Object.keys(claims).length;
  
  const availableProperties = Object.keys(claims);
  
  // Common properties that should be present for rich entities
  const expectedProperties = [
    'P31', // instance of
    'P856', // official website
    'P17', // country
    'P1448', // official name
    'P625', // coordinate location
    'P6375', // street address
    'P2002', // Twitter username
    'P4264', // LinkedIn company ID
  ];
  
  const missingProperties = expectedProperties.filter(
    (prop) => !availableProperties.includes(prop)
  );
  
  return {
    propertyCount,
    availableProperties,
    missingProperties,
  };
}

/**
 * Verify notability check
 * 
 * Returns: Notability verification result
 */
export function verifyNotabilityCheck(
  notability: WikidataEntityDTO['notability']
): NotabilityVerification {
  const issues: string[] = [];
  
  if (!notability) {
    issues.push('Notability data is missing');
    return { isValid: false, issues };
  }
  
  if (typeof notability.isNotable !== 'boolean') {
    issues.push('isNotable is not a boolean');
  }
  
  if (typeof notability.confidence !== 'number') {
    issues.push('confidence is not a number');
  }
  
  if (!Array.isArray(notability.reasons)) {
    issues.push('reasons is not an array');
  }
  
  if (typeof notability.seriousReferenceCount !== 'number') {
    issues.push('seriousReferenceCount is not a number');
  }
  
  return {
    isValid: issues.length === 0,
    issues,
  };
}

/**
 * Verify entity builder errors
 * 
 * Checks for common entity builder errors from terminal logs:
 * - JSON parsing errors
 * - LLM query failures
 * - Property suggestion errors
 * 
 * Returns: Array of error messages
 */
export function verifyEntityBuilderErrors(
  entityDTO: WikidataEntityDTO
): string[] {
  const errors: string[] = [];
  
  // Check for error in response
  if (entityDTO.error) {
    errors.push(`Entity builder error: ${entityDTO.error}`);
  }
  
  // Check for entity structure (can be DetailDTO or raw entity)
  const hasDetailDTOStructure = entityDTO.label && entityDTO.claims;
  const hasRawEntityStructure = entityDTO.entity?.labels && entityDTO.entity?.claims;
  
  if (!hasDetailDTOStructure && !hasRawEntityStructure) {
    errors.push('Entity structure is missing');
  } else {
    // Check for missing labels (DetailDTO has label, raw entity has labels)
    if (hasDetailDTOStructure) {
      if (!entityDTO.label) {
        errors.push('Entity label is missing');
      }
      if (!entityDTO.claims || entityDTO.claims.length === 0) {
        errors.push('Entity claims are missing');
      }
    } else if (hasRawEntityStructure) {
      // Check for missing labels
      if (!entityDTO.entity.labels || Object.keys(entityDTO.entity.labels).length === 0) {
        errors.push('Entity labels are missing');
      }
      
      // Check for missing claims
      if (!entityDTO.entity.claims || Object.keys(entityDTO.entity.claims).length === 0) {
        errors.push('Entity claims are missing');
      }
    }
  }
  
  return errors;
}

/**
 * Verify entity publication readiness
 * 
 * Returns: Publication readiness result
 */
export function verifyPublicationReadiness(
  entityDTO: WikidataEntityDTO
): { canPublish: boolean; reasons: string[] } {
  const reasons: string[] = [];
  let canPublish = true;
  
  // Check notability
  if (!entityDTO.notability?.isNotable) {
    canPublish = false;
    reasons.push('Business is not notable');
  }
  
  // Check property count
  if (entityDTO.entity) {
    const propertyVerification = verifyEntityProperties(entityDTO.entity);
    if (propertyVerification.propertyCount < 4) {
      canPublish = false;
      reasons.push(`Property count too low: ${propertyVerification.propertyCount} (minimum: 4)`);
    }
  }
  
  // Check canPublish flag
  if (entityDTO.canPublish === false) {
    canPublish = false;
    reasons.push('canPublish flag is false');
  }
  
  return { canPublish, reasons };
}

