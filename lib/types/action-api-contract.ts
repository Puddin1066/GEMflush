/**
 * Wikidata Action API Publishing Contract
 * 
 * Defines the contract for publishing entities to Wikidata via the Action API
 * Based on Wikibase Data Model and Action API specifications
 * 
 * References:
 * - Wikibase Data Model: https://www.mediawiki.org/wiki/Wikibase/DataModel
 * - Wikibase JSON Spec: https://doc.wikimedia.org/Wikibase/master/php/md_docs_topics_json.html
 * - Wikidata Action API: https://www.wikidata.org/wiki/Wikidata:Data_access
 * - wbeditentity: https://www.mediawiki.org/wiki/Wikibase/API#wbeditentity
 * 
 * DRY: Centralized contract definitions
 * SOLID: Single Responsibility - contract definitions only
 */

import type { CleanedWikidataEntity } from './wikidata-contract';

/**
 * Action API Request Parameters
 * Parameters for wbeditentity action
 */
export interface ActionApiRequestParams {
  action: 'wbeditentity';
  new?: 'item' | 'property'; // Create new item/property (omit for editing)
  id?: string; // QID for editing existing entity (e.g., "Q123")
  data: string; // JSON string of entity structure
  token: string; // CSRF token (required for write operations)
  format: 'json'; // Response format
  bot?: '1'; // Optional: Mark as bot edit (requires bot flag)
  summary?: string; // Edit summary (visible in history)
  baserevid?: number; // Optional: Base revision ID for conflict detection
  clear?: '1'; // Optional: Clear entity before editing
}

/**
 * Action API Response (Success)
 * Response structure for successful wbeditentity call
 */
export interface ActionApiSuccessResponse {
  success: 1;
  entity: {
    id: string; // QID (e.g., "Q123456")
    type: 'item' | 'property';
    labels?: Record<string, { language: string; value: string }>;
    descriptions?: Record<string, { language: string; value: string }>;
    claims?: Record<string, unknown[]>;
    lastrevid: number; // Revision ID
  };
}

/**
 * Action API Error Response
 * Error structure from Action API
 */
export interface ActionApiErrorResponse {
  error: {
    code: string; // Error code (e.g., "badtoken", "missingparam", "baddata")
    info: string; // Human-readable error message
    messages?: Array<{
      name: string;
      html: string;
    }>;
    '*': string; // Additional error context
  };
  servedby?: string; // Server that handled the request
}

/**
 * Action API Response
 * Union type for success or error response
 */
export type ActionApiResponse = ActionApiSuccessResponse | ActionApiErrorResponse;

/**
 * Authentication Token Response
 * Response from token request (login or CSRF)
 */
export interface TokenResponse {
  query?: {
    tokens?: {
      logintoken?: string;
      csrftoken?: string;
    };
  };
  login?: {
    result: 'Success' | 'NeedToken' | 'WrongPass' | 'Failed';
    lguserid?: number;
    lgusername?: string;
    reason?: string;
  };
  error?: {
    code: string;
    info: string;
  };
}

/**
 * Publishing Result
 * Result of publishing operation
 */
export interface PublishingResult {
  success: boolean;
  qid: string; // QID of published entity
  error?: string; // Error message if failed
  publishedTo: 'test.wikidata.org' | 'wikidata.org';
  revisionId?: number; // Revision ID from Wikidata
  entityId?: number; // Internal entity ID (if applicable)
}

/**
 * Publishing Options
 * Options for publishing operation
 */
export interface PublishingOptions {
  production?: boolean; // If true, publish to wikidata.org; if false, test.wikidata.org
  useBotFlag?: boolean; // If true, mark edit as bot edit
  summary?: string; // Edit summary
  baseRevId?: number; // Base revision ID for conflict detection
  clear?: boolean; // Clear entity before editing
}

/**
 * Entity Preparation Result
 * Result of preparing entity for API
 */
export interface EntityPreparationResult {
  cleanedEntity: CleanedWikidataEntity; // Entity without internal metadata
  entityJson: string; // JSON string ready for API
  validationErrors: string[]; // Any validation warnings
}

/**
 * Action API Publishing Contract
 * Contract for Action API publishing operations
 */
export interface IActionApiPublisher {
  /**
   * Publish entity to Wikidata via Action API
   * 
   * @param entity - Entity to publish (will be cleaned of internal metadata)
   * @param options - Publishing options
   * @returns Publishing result with QID
   * @throws Error if publishing fails
   */
  publishEntity(
    entity: CleanedWikidataEntity,
    options?: PublishingOptions
  ): Promise<PublishingResult>;

  /**
   * Prepare entity for API publication
   * - Removes internal metadata (llmSuggestions)
   * - Validates entity structure
   * - Converts to JSON string
   * 
   * @param entity - Entity to prepare
   * @returns Prepared entity and JSON string
   */
  prepareEntityForApi(
    entity: CleanedWikidataEntity
  ): Promise<EntityPreparationResult>;

  /**
   * Authenticate with Wikidata API
   * 
   * @param baseUrl - API base URL
   * @returns Session cookies
   * @throws Error if authentication fails
   */
  authenticate(baseUrl: string): Promise<string>;

  /**
   * Get CSRF token for write operations
   * 
   * @param baseUrl - API base URL
   * @param cookies - Session cookies from authentication
   * @returns CSRF token
   * @throws Error if token retrieval fails
   */
  getCSRFToken(baseUrl: string, cookies: string): Promise<string>;

  /**
   * Call Wikidata Action API
   * 
   * @param baseUrl - API base URL
   * @param params - Request parameters
   * @param cookies - Session cookies
   * @returns API response
   * @throws Error if API call fails
   */
  callActionApi(
    baseUrl: string,
    params: ActionApiRequestParams,
    cookies: string
  ): Promise<ActionApiResponse>;
}

/**
 * Publishing Validation Contract
 * Contract for validating entities before publication
 */
export interface IPublishingValidator {
  /**
   * Validate entity structure before publication
   * 
   * @param entity - Entity to validate
   * @returns Validation result
   */
  validateEntity(entity: CleanedWikidataEntity): {
    valid: boolean;
    errors: string[];
    warnings: string[];
  };

  /**
   * Validate entity claims structure
   * 
   * @param claims - Claims to validate
   * @returns Validation result
   */
  validateClaims(claims: Record<string, unknown[]>): {
    valid: boolean;
    errors: string[];
  };

  /**
   * Validate entity labels and descriptions
   * 
   * @param labels - Labels to validate
   * @param descriptions - Descriptions to validate
   * @returns Validation result
   */
  validateLabelsAndDescriptions(
    labels: Record<string, { language: string; value: string }>,
    descriptions: Record<string, { language: string; value: string }>
  ): {
    valid: boolean;
    errors: string[];
  };
}

/**
 * Type guards for Action API responses
 */
export function isActionApiSuccessResponse(
  response: unknown
): response is ActionApiSuccessResponse {
  return (
    typeof response === 'object' &&
    response !== null &&
    'success' in response &&
    (response as ActionApiSuccessResponse).success === 1 &&
    'entity' in response &&
    typeof (response as ActionApiSuccessResponse).entity === 'object'
  );
}

export function isActionApiErrorResponse(
  response: unknown
): response is ActionApiErrorResponse {
  return (
    typeof response === 'object' &&
    response !== null &&
    'error' in response &&
    typeof (response as ActionApiErrorResponse).error === 'object' &&
    'code' in (response as ActionApiErrorResponse).error &&
    'info' in (response as ActionApiErrorResponse).error
  );
}

/**
 * Common Action API error codes
 */
export enum ActionApiErrorCode {
  BAD_TOKEN = 'badtoken',
  MISSING_PARAM = 'missingparam',
  BAD_DATA = 'baddata',
  MUST_BE_LOGGED_IN = 'mustbeloggedin',
  ASSERT_USER_FAILED = 'assertuserfailed',
  SESSION_EXPIRED = 'sessionexpired',
  INVALID_VALUE = 'invalid-value',
  UNKNOWN_ERROR = 'unknown-error',
}

/**
 * Error code to human-readable message mapping
 */
export const ACTION_API_ERROR_MESSAGES: Record<ActionApiErrorCode, string> = {
  [ActionApiErrorCode.BAD_TOKEN]: 'Invalid or expired CSRF token. Please retry.',
  [ActionApiErrorCode.MISSING_PARAM]: 'Required parameter missing in API request.',
  [ActionApiErrorCode.BAD_DATA]: 'Invalid entity data structure. Check entity format.',
  [ActionApiErrorCode.MUST_BE_LOGGED_IN]: 'Authentication required. Please log in.',
  [ActionApiErrorCode.ASSERT_USER_FAILED]: 'Authentication failed. Check credentials.',
  [ActionApiErrorCode.SESSION_EXPIRED]: 'Session expired. Please re-authenticate.',
  [ActionApiErrorCode.INVALID_VALUE]: 'Invalid property value. Check data types.',
  [ActionApiErrorCode.UNKNOWN_ERROR]: 'Unknown error occurred during publication.',
};


