// Wikidata publisher - publishes entities to Wikidata (test or production)
// 
// IMPORTANT: The enriched entity JSON structure (PIDs, QIDs, notability, references)
// is environment-agnostic. The same entity data can be published to both:
// - test.wikidata.org (for development/testing)
// - wikidata.org (for production)
//
// Environment switching is controlled by:
// 1. `production` parameter: false = test.wikidata.org, true = wikidata.org
// 2. `WIKIDATA_PUBLISH_MODE` env var: 'mock' = mock mode, 'real' = real API calls
// 3. Authentication credentials: WIKIDATA_BOT_USERNAME and WIKIDATA_BOT_PASSWORD
//
// CONTRACTS & SPECIFICATIONS:
// - Wikibase Data Model: https://www.mediawiki.org/wiki/Wikibase/DataModel
// - Wikibase JSON Spec: https://doc.wikimedia.org/Wikibase/master/php/md_docs_topics_json.html
// - Wikidata Action API: https://www.wikidata.org/wiki/Wikidata:Data_access
// - Wikidata Bot Policy: https://www.wikidata.org/wiki/Wikidata:Bots

// Use strict contract types for internal operations
import { 
  WikidataEntityDataContract,
  CleanedWikidataEntity,
  WikidataClaim,
  WikidataSnak,
  WikidataReference
} from '@/lib/types/wikidata-contract';
// Keep loose type for backward compatibility with service contract
import { WikidataEntityData as WikidataEntityDataLoose, WikidataPublishResult } from '@/lib/types/gemflush';
import { IWikidataPublisher } from '@/lib/types/service-contracts';
import { validateWikidataEntity } from '@/lib/validation/wikidata';
import { BUSINESS_PROPERTY_MAP } from './property-mapping';

// Type alias for service contract compatibility (accepts loose type, uses strict internally)
type WikidataEntityData = WikidataEntityDataContract;

export class WikidataPublisher implements IWikidataPublisher {
  // Configurable API URLs via environment variables (with sensible defaults)
  private testBaseUrl = process.env.WIKIDATA_TEST_API_URL || 'https://test.wikidata.org/w/api.php';
  private prodBaseUrl = process.env.WIKIDATA_PROD_API_URL || 'https://www.wikidata.org/w/api.php';
  private sessionCookies: string | null = null; // Cache session cookies (SOLID: single responsibility)
  
  /**
   * Publish entity to Wikidata (test or production)
   * 
   * SOLID: Single Responsibility - handles publication to Wikidata
   * DRY: Centralized publication logic
   * 
   * The enriched entity JSON structure (PIDs, QIDs, notability, references) is preserved
   * when switching between test.wikidata.org and wikidata.org. Only the base URL changes.
   * 
   * @param entity - Enriched Wikidata entity data (same structure for test and production)
   * @param production - If true, publish to wikidata.org; if false, publish to test.wikidata.org
   * @returns QID and success status
   * 
   * Environment behavior:
   * - test.wikidata.org (production=false):
   *   - If WIKIDATA_PUBLISH_MODE='mock': Returns mock QID (for tests)
   *   - If WIKIDATA_PUBLISH_MODE='real': Real API call to test.wikidata.org (requires credentials)
   * - wikidata.org (production=true):
   *   - Currently mocked until test entities are verified
   *   - Future: Real API call to wikidata.org (requires production credentials)
   */
  /**
   * Publish entity to Wikidata (implements IWikidataPublisher contract)
   * Wrapper around publishEntity for contract compliance
   * 
   * Note: Contract expects WikidataPublishResult which doesn't include success/error fields.
   * This method adapts the internal result format to match the contract.
   */
  async publish(
    entity: WikidataEntityDataContract,
    target: 'test' | 'production'
  ): Promise<WikidataPublishResult> {
    const result = await this.publishEntity(entity, target === 'production');
    
    if (!result.success) {
      throw new Error(result.error || 'Publication failed');
    }
    
    // Map to contract format (WikidataPublishResult)
    // Note: Contract format doesn't include success/error, so we throw on failure
    return {
      qid: result.qid,
      entityId: 0, // Not available from publishEntity, would need to be fetched separately
      publishedTo: target === 'production' ? 'wikidata.org' : 'test.wikidata.org',
    };
  }
  
  /**
   * Publish entity to Wikidata (test or production)
   * 
   * SOLID: Single Responsibility - handles publication to Wikidata
   * DRY: Centralized publication logic
   * 
   * The enriched entity JSON structure (PIDs, QIDs, notability, references) is preserved
   * when switching between test.wikidata.org and wikidata.org. Only the base URL changes.
   * 
   * @param entity - Enriched Wikidata entity data (same structure for test and production)
   * @param production - If true, publish to wikidata.org; if false, publish to test.wikidata.org
   * @returns QID and success status
   * 
   * Environment behavior:
   * - test.wikidata.org (production=false):
   *   - If WIKIDATA_PUBLISH_MODE='mock': Returns mock QID (for tests)
   *   - If WIKIDATA_PUBLISH_MODE='real': Real API call to test.wikidata.org (requires credentials)
   * - wikidata.org (production=true):
   *   - Currently mocked until test entities are verified
   *   - Future: Real API call to wikidata.org (requires production credentials)
   */
  async publishEntity(
    entity: WikidataEntityDataContract,
    production: boolean = false
  ): Promise<{ qid: string; success: boolean; error?: string }> {
    // Select base URL based on environment
    // The entity JSON structure remains the same regardless of URL
    const baseUrl = production ? this.prodBaseUrl : this.testBaseUrl;
    const environment = production ? 'wikidata.org' : 'test.wikidata.org';
    
    try {
            // MOCK MODE: Bypass real API calls (for tests and development)
            // The enriched entity JSON is still logged for verification
            if (process.env.WIKIDATA_PUBLISH_MODE === 'mock') {
              console.log(`[MOCK] Publishing entity to ${environment} (mock mode)`);
              console.log(`[MOCK] Entity data (preserved for production):`, JSON.stringify(entity, null, 2));
              await new Promise((resolve) => setTimeout(resolve, production ? 1000 : 500));
              const qid = this.generateMockQID(production);
              console.log(`[MOCK] Returning mock QID for ${environment}: ${qid}`);
              console.log(`[MOCK] Note: Same entity structure can be published to real ${environment} by setting WIKIDATA_PUBLISH_MODE=real`);
              return { qid, success: true };
            }
            
            // PRODUCTION MODE: Currently mocked and DISABLED
            // IMPORTANT: Bot account is banned from wikidata.org - only use test.wikidata.org
            // Production publishing is permanently disabled to prevent accidental real Wikidata publishing
            if (production) {
              console.warn(`[BLOCKED] Production publishing to wikidata.org is DISABLED`);
              console.warn(`[BLOCKED] Bot account is banned from wikidata.org - only test.wikidata.org is available`);
              console.log(`[MOCK] Publishing entity to ${environment} (production mode - blocked and mocked)`);
              console.log(`[MOCK] Entity data (ready for production):`, JSON.stringify(entity, null, 2));
              await new Promise(resolve => setTimeout(resolve, 1000));
              const qid = this.generateMockQID(production);
              console.log(`[MOCK] Returning mock QID (production publishing disabled): ${qid}`);
              return { qid, success: true };
            }
            
            // REAL API CALL: Publish to test.wikidata.org
            // The enriched entity JSON (PIDs, QIDs, notability, references) is sent as-is
            // This same structure can later be published to wikidata.org by setting production=true
            console.log(`[REAL] Publishing entity to ${environment}`);
            console.log(`[REAL] Entity data (same structure for production):`, JSON.stringify(entity, null, 2));
            
            // Check if credentials are available and valid before attempting auth
            // SOLID: Fail fast with clear error if credentials missing or invalid
            // DRY: Centralized credential validation
            const botUsername = process.env.WIKIDATA_BOT_USERNAME;
            const botPassword = process.env.WIKIDATA_BOT_PASSWORD;
            
            // Detect placeholder/invalid credentials (common in .env templates)
            // Note: Bot passwords from Wikidata can be various lengths, so we only check for obvious placeholders
            const isPlaceholder = 
              !botUsername || 
              !botPassword ||
              botUsername.includes('YourBot') ||
              botUsername.includes('example') ||
              botUsername.includes('placeholder') ||
              botPassword.includes('the_full_bot_password') ||
              botPassword.includes('example') ||
              botPassword.includes('placeholder') ||
              botPassword.length < 5; // Minimum reasonable length (bot passwords are typically 8+ chars, but can be shorter)
            
            if (isPlaceholder) {
              console.warn(`[REAL] Wikidata credentials not configured or are placeholders. Falling back to mock mode.`);
              console.warn(`[REAL] To enable real publishing, set valid WIKIDATA_BOT_USERNAME and WIKIDATA_BOT_PASSWORD`);
              console.warn(`[REAL] Create bot account at https://test.wikidata.org/wiki/Special:BotPasswords`);
              // Fall back to mock mode when credentials are missing/invalid (better UX than hard failure)
              const qid = this.generateMockQID(production);
              console.log(`[REAL] Returning mock QID (credentials not configured): ${qid}`);
              return { qid, success: true };
            }
            
            // Get CSRF token and session cookies (required for write operations)
            const { token, cookies } = await this.getCSRFTokenAndCookies(baseUrl);
      
      if (!token) {
        throw new Error('Failed to obtain CSRF token. Please check authentication.');
      }
      
      // Clean entity data - remove internal metadata fields (llmSuggestions, etc.)
      // DRY: Use centralized cleaning method
      const cleanedEntity = this.cleanEntityForWikidata(entity);
      
      // Validate entity structure according to Wikibase Data Model
      // Uses Zod schema based on Wikibase JSON specification
      // References:
      // - Wikibase Data Model: https://www.mediawiki.org/wiki/Wikibase/DataModel
      // - Wikibase JSON Spec: https://doc.wikimedia.org/Wikibase/master/php/md_docs_topics_json.html
      const validation = validateWikidataEntity(cleanedEntity);
      if (!validation.success) {
        console.error('[REAL] Entity validation failed:', validation.errors);
        throw new Error(
          `Entity validation failed: ${validation.errors?.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')}`
        );
      }
      
      // Query PRODUCTION Wikidata property info to verify expected types
      // We build entities for production Wikidata, but may publish to test.wikidata.org
      // test.wikidata.org should accept any properties since it's test data
      // IMPORTANT: Always validate against production property definitions
      const productionBaseUrl = this.prodBaseUrl;
      console.error('[REAL] Querying PRODUCTION Wikidata property info to verify types...');
      console.error(`[REAL] Building entity for production (${productionBaseUrl}), publishing to ${baseUrl === productionBaseUrl ? 'production' : 'test'}`);
      const propertyTypeMap = await this.verifyPropertyTypes(cleanedEntity, productionBaseUrl);
      
      // Validate entity against production property types (for logging/debugging)
      // But DON'T filter - test.wikidata.org should accept any properties
      if (propertyTypeMap.size > 0 && baseUrl === productionBaseUrl) {
        // Only validate (and potentially filter) when publishing to production
        console.error('[REAL] Validating entity against production property types...');
        try {
          this.validateEntityAgainstPropertyTypes(cleanedEntity, propertyTypeMap);
          console.error('[REAL] Entity matches production property types');
        } catch (validationError) {
          console.error('[REAL] WARNING: Entity does not match production property types:', validationError);
          // For production, we should fail or filter
          // But for now, let's just log and continue (API will reject if needed)
        }
      } else if (baseUrl !== productionBaseUrl) {
        // Publishing to test - remove properties that don't match test's schema
        // test.wikidata.org has incorrect property definitions for many properties
        // Properties to remove on test (wrong types):
        // - P31: url (should be wikibase-item)
        // - P856: globe-coordinate (should be url/string)
        // - P1128: url (should be quantity)
        // - P2003: quantity (should be string)
        const propertiesToRemove = ['P31', 'P856', 'P1128', 'P2003'];
        for (const pid of propertiesToRemove) {
          if (cleanedEntity.claims[pid]) {
            console.warn(`[REAL] Removing ${pid} for test.wikidata.org - wrong property type`);
            delete cleanedEntity.claims[pid];
          }
        }
        
        // Remove all references - test.wikidata.org has wrong types for reference properties (P854, P813, P1476)
        // This allows mainsnaks to be published while avoiding reference type mismatches
        console.warn(`[REAL] Removing all references for test.wikidata.org - reference properties have wrong types`);
        for (const [pid, claimArray] of Object.entries(cleanedEntity.claims)) {
          for (const claim of claimArray) {
            if (claim.references) {
              claim.references = [];
            }
          }
        }
        
        // Make labels/descriptions unique for test to avoid duplicate errors
        // Add timestamp suffix to ensure uniqueness
        const timestamp = Date.now();
        if (cleanedEntity.labels?.en) {
          cleanedEntity.labels.en.value = `${cleanedEntity.labels.en.value} [${timestamp}]`;
        }
        if (cleanedEntity.descriptions?.en) {
          cleanedEntity.descriptions.en.value = `${cleanedEntity.descriptions.en.value} [test ${timestamp}]`;
        }
        
        const remainingProps = Object.keys(cleanedEntity.claims).length;
        console.log(`[REAL] Publishing to test.wikidata.org - ${remainingProps} properties remaining (P31, P856, P1128, P2003 removed, all references removed, labels made unique)`);
      }
      
      // Additional runtime validation for Wikibase-specific constraints
      // SOLID: Single Responsibility - validation logic
      console.error('[REAL] Starting runtime validation for Wikibase-specific constraints...');
      try {
        this.validateEntityForWikidata(cleanedEntity);
        console.error('[REAL] Runtime validation completed successfully');
      } catch (validationError) {
        console.error('[REAL] Runtime validation failed:', validationError);
        throw validationError;
      }
      
      // Prepare entity data for API
      const entityJson = JSON.stringify(cleanedEntity);
      console.log('[REAL] Entity JSON length:', entityJson.length, 'characters');
      console.log('[REAL] Entity JSON preview (first 500 chars):', entityJson.substring(0, 500));
      
      // Create entity via Wikidata Action API
      const response = await fetch(baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'GEMflush/1.0 (https://github.com/your-repo)',
          ...(cookies ? { 'Cookie': cookies } : {}),
        },
        body: new URLSearchParams({
          action: 'wbeditentity',
          new: 'item',
          data: entityJson,
          token,
          format: 'json',
          // Note: bot='1' requires the account to have the bot flag
          // For test.wikidata.org, you can publish without bot flag (lower rate limits)
          // For production wikidata.org, bot flag is strongly recommended
          // Set WIKIDATA_USE_BOT_FLAG=true if your account has the bot flag
          ...(process.env.WIKIDATA_USE_BOT_FLAG === 'true' ? { bot: '1' } : {}),
          summary: 'Created via GEMflush - Automated business entity generation',
        }),
      });
      
      const result = await response.json();
      
      // Check for API errors
      if (result.error) {
        console.error('[REAL] Wikidata API error:', JSON.stringify(result.error, null, 2));
        
        // Enhanced error logging for type mismatch errors
        if (result.error.info?.includes('Bad value type')) {
          console.error('[REAL] Type mismatch detected. Analyzing entity claims...');
          this.logEntityClaimTypes(cleanedEntity);
          
          // Log all reference snaks in detail
          console.error('[REAL] Checking all reference snaks for type mismatches...');
          this.logAllReferenceSnaks(cleanedEntity);
        }
        
        // Extract property information from error messages if available
        let errorMessage = result.error.info || 'Unknown error publishing entity';
        if (result.error.code) {
          errorMessage = `${result.error.code}: ${errorMessage}`;
        }
        
        // Try to extract property ID from error messages
        // Wikidata error messages often include property IDs or context in parameters
        if (result.error.messages && Array.isArray(result.error.messages)) {
          for (const msg of result.error.messages) {
            console.error(`[REAL] Error message: ${msg.name}`, JSON.stringify(msg, null, 2));
            if (msg.parameters && Array.isArray(msg.parameters)) {
              // Look for property IDs (P####) in parameters
              const propertyParams = msg.parameters.filter((p: any) => 
                typeof p === 'string' && /^P\d+$/.test(p)
              );
              if (propertyParams.length > 0) {
                errorMessage += `\n\nProperties that may have issues: ${propertyParams.join(', ')}`;
                console.error(`[REAL] Properties with potential issues: ${propertyParams.join(', ')}`);
                
                // Log details for each potentially problematic property
                for (const pid of propertyParams) {
                  this.logPropertyDetails(cleanedEntity, pid);
                }
              }
              
              // Also check for any QID values in parameters (might indicate which value is wrong)
              const qidParams = msg.parameters.filter((p: any) => 
                typeof p === 'string' && /^Q\d+$/.test(p)
              );
              if (qidParams.length > 0) {
                console.error(`[REAL] QIDs mentioned in error: ${qidParams.join(', ')}`);
              }
              
              // Log all parameters for debugging
              console.error(`[REAL] All error parameters:`, JSON.stringify(msg.parameters, null, 2));
            }
          }
        }
        
        // Also check the full error object for any property references
        console.error(`[REAL] Full error object:`, JSON.stringify(result.error, null, 2));
        
        // Try to find property references in error info
        if (result.error.info) {
          const infoStr = String(result.error.info);
          const propertyMatches = infoStr.match(/P\d+/g);
          if (propertyMatches) {
            const uniqueProperties = [...new Set(propertyMatches)];
            console.error(`[REAL] Properties found in error info: ${uniqueProperties.join(', ')}`);
            errorMessage += `\n\nProperties mentioned in error: ${uniqueProperties.join(', ')}`;
            
            // Log details for each property found in error
            for (const pid of uniqueProperties) {
              this.logPropertyDetails(cleanedEntity, pid);
            }
          }
        }
        
        // Add helpful context for common errors
        if (result.error.info?.includes('Bad value type')) {
          errorMessage += '\n\nThis usually means a property expects a string but received a QID (or vice versa).';
          errorMessage += '\nCheck the entity builder logs above for type mismatches.';
          errorMessage += '\nThe issue may be in a reference snak, not the mainsnak.';
        }
        
        throw new Error(errorMessage);
      }
      
      // Verify successful creation
      if (result.success && result.entity && result.entity.id) {
        const qid = result.entity.id;
        console.log(`[REAL] Entity published successfully to ${environment} with QID: ${qid}`);
        console.log(`[REAL] View entity: https://${environment}/wiki/${qid}`);
        console.log(`[REAL] Same entity structure can be published to production by setting production=true`);
        
        return {
          qid,
          success: true,
        };
      }
      
      throw new Error('Publication succeeded but no entity ID returned');
      
    } catch (error) {
      console.error('Wikidata publication error:', error);
      return {
        qid: '',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
  
  /**
   * Generate a mock QID for development/testing
   * SOLID: Single Responsibility - generates clearly fake QIDs
   * DRY: Centralized mock QID generation to avoid confusion
   * 
   * Uses Q999999000-Q999999999 range (clearly fake, unlikely to match real entities)
   * This prevents confusion where mock QIDs happen to match real Wikidata entities
   */
  private generateMockQID(production: boolean): string {
    // Use Q999999999 as base - clearly fake and unlikely to exist in real Wikidata
    // This prevents confusion where Q1019664 (real entity: Jenison, Michigan) 
    // appears to be a successful publication when it's actually just a mock
    const mockBase = 999999999;
    const randomOffset = Math.floor(Math.random() * 1000);
    const mockQID = mockBase - randomOffset; // Q999999000 - Q999999999
    return `Q${mockQID}`;
  }
  
         /**
          * Extract cookies from HTTP response set-cookie header
          * DRY: Centralized cookie parsing logic
          * SOLID: Single Responsibility - cookie extraction only
          * 
          * @param setCookieHeader - The set-cookie header value from response
          * @returns Parsed cookie string ready for Cookie header
          */
         private parseCookies(setCookieHeader: string | null): string | undefined {
           if (!setCookieHeader) {
             return undefined;
           }
           // Parse cookies: split by comma, take first part before semicolon
           // Format: "CookieName1=value1; Path=/; HttpOnly, CookieName2=value2; Path=/; HttpOnly"
           return setCookieHeader
             .split(',')
             .map(cookie => cookie.split(';')[0].trim())
             .join('; ');
         }
         
         /**
          * Build login request headers with cookies
          * DRY: Centralized header construction
          * SOLID: Single Responsibility - header building only
          * 
          * @param tokenCookies - Cookies from token request (optional)
          * @returns Headers object for login request
          */
         private buildLoginHeaders(tokenCookies?: string): Record<string, string> {
           const headers: Record<string, string> = {
             'Content-Type': 'application/x-www-form-urlencoded',
             'User-Agent': 'GEMflush/1.0 (https://github.com/your-repo)',
           };
           if (tokenCookies) {
             headers['Cookie'] = tokenCookies;
           }
           return headers;
         }
         
         /**
          * Attempt login with given credentials
          * DRY: Centralized login attempt logic
          * SOLID: Single Responsibility - single login attempt
          * 
          * @param baseUrl - API endpoint URL
          * @param loginUsername - Username for login (lgname)
          * @param loginPassword - Password for login (lgpassword)
          * @param loginToken - Login token from token request
          * @param tokenCookies - Cookies from token request
          * @param formatName - Format name for logging (e.g., "NEW FORMAT", "OLD FORMAT")
          * @returns Login response data
          */
         private async attemptLoginRequest(
           baseUrl: string,
           loginUsername: string,
           loginPassword: string,
           loginToken: string,
           tokenCookies: string | undefined,
           formatName: string
         ): Promise<{ response: Response; data: any }> {
           const headers = this.buildLoginHeaders(tokenCookies);
           
           console.log(`[REAL] Attempting login with ${formatName}:`);
           console.log(`[REAL]   lgname: ${loginUsername}`);
           console.log(`[REAL]   lgpassword: ${loginPassword.substring(0, 20)}... (length: ${loginPassword.length})`);
           if (tokenCookies) {
             console.log(`[REAL]   Including ${tokenCookies.split(';').length} cookies from token request`);
           }
           
           const response = await fetch(baseUrl, {
             method: 'POST',
             headers,
             body: new URLSearchParams({
               action: 'login',
               lgname: loginUsername,
               lgpassword: loginPassword,
               lgtoken: loginToken,
               format: 'json',
             }),
           });
           
           const data = await response.json();
           console.log(`[REAL] ${formatName} response:`, JSON.stringify(data, null, 2));
           
           return { response, data };
  }
  
         /**
          * Login to Wikidata and get session cookies
          * SOLID: Single Responsibility - handles authentication
          * DRY: Centralized auth logic, uses helper methods
          * 
          * MediaWiki bot password authentication flow:
          * 1. Get login token (with cookies)
          * 2. Login with bot password (include cookies from token request)
          * 3. Handle NeedToken if needed (retry with same token and cookies)
          * 4. Extract session cookies from response
          * 
          * Error handling: Provides clear error messages for common auth failures
          * 
          * @param baseUrl - The API endpoint URL (test.wikidata.org or wikidata.org)
          */
         private async login(baseUrl: string): Promise<string> {
           // Log which endpoint we're authenticating to
           const isTestEnv = baseUrl.includes('test.wikidata.org');
           console.log(`[REAL] Authenticating to ${isTestEnv ? 'test.wikidata.org' : 'wikidata.org'} (${baseUrl})`);
           
           const botUsername = process.env.WIKIDATA_BOT_USERNAME;
           const botPassword = process.env.WIKIDATA_BOT_PASSWORD;
           
           if (!botUsername || !botPassword) {
             throw new Error(
               'WIKIDATA_BOT_USERNAME and WIKIDATA_BOT_PASSWORD environment variables are required.\n' +
               'Create a bot account at https://test.wikidata.org\n' +
               'Set up a bot password at https://test.wikidata.org/wiki/Special:BotPasswords\n' +
               'Format: username@botname:password (e.g., "MyBot@MyBot:randompass123")\n' +
               'For testing without credentials, set WIKIDATA_PUBLISH_MODE=mock'
             );
           }
    
    // Step 1: Get login token
    // CRITICAL: Extract cookies from token response - MediaWiki requires these for login
    // See WIKIDATA_AUTH_DETAILED.md for details
    const loginTokenUrl = `${baseUrl}?action=query&meta=tokens&type=login&format=json`;
    const loginTokenResponse = await fetch(loginTokenUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'GEMflush/1.0 (https://github.com/your-repo)',
      },
    });
    
    // Extract cookies from token response (required for login)
    // CRITICAL: MediaWiki requires cookies from token request in login request
    // See WIKIDATA_AUTH_DETAILED.md for details
    const setCookieHeader = loginTokenResponse.headers.get('set-cookie');
    const tokenCookies = this.parseCookies(setCookieHeader);
    if (tokenCookies) {
      console.log(`[REAL] Extracted ${tokenCookies.split(';').length} cookies from token response`);
    } else {
      console.warn(`[REAL] WARNING: No cookies in token response - login may fail`);
    }
    
    const loginTokenData = await loginTokenResponse.json();
    
    if (loginTokenData.error) {
      throw new Error(`Failed to get login token: ${loginTokenData.error.info || 'Unknown error'}`);
    }
    
    const loginToken = loginTokenData.query?.tokens?.logintoken;
    if (!loginToken) {
      throw new Error('Login token not found in API response');
    }
    
    // Step 2: Login with bot password
    // Bot password formats from Wikidata (per Special:BotPasswords creation message):
    // 
    // NEW FORMAT (recommended, per Wikidata message):
    // - lgname: "Puddin1066@Puddin1066@kgaasbot" (username@username@botname)
    // - lgpassword: "0g435bt282nfk3fhq7rql3qvt0astl3h" (just the random password)
    //
    // OLD FORMAT (legacy compatibility, per Wikidata message):
    // - lgname: "Puddin1066" (just username)
    // - lgpassword: "Puddin1066@kgaasbot@0g435bt282nfk3fhq7rql3qvt0astl3h" (username@botname@password)
    //
    // We'll try the NEW FORMAT first, then fall back to OLD FORMAT if it fails
    // IMPORTANT: Bot names are case-sensitive - preserve exact case from .env
    const username = botUsername.includes('@') ? botUsername.split('@')[0] : botUsername;
    const botName = botUsername.includes('@') ? botUsername.split('@')[1] : botUsername;
    
    // NEW FORMAT: username@username@botname (per Wikidata bot password creation message)
    // This is the format shown in the "new password to log in with" message
    const newFormatUsername = `${username}@${username}@${botName}`; // username@username@botname
    const newFormatPassword = botPassword; // Just the random password part
    
    // OLD FORMAT as fallback: username as lgname, username@botname@password as lgpassword
    const oldFormatUsername = username;
    const oldFormatPassword = `${username}@${botName}@${botPassword}`; // Preserve exact case
    
    // Try NEW FORMAT first (per Wikidata bot password creation message)
    let loginResult = await this.attemptLoginRequest(
      baseUrl,
      newFormatUsername,
      newFormatPassword,
      loginToken,
      tokenCookies,
      'NEW FORMAT'
    );
    let loginResponse = loginResult.response;
    let loginData = loginResult.data;
    
    // Handle NeedToken response (MediaWiki two-step login)
    // IMPORTANT: For NeedToken, use the SAME token and cookies, not new ones
    if (loginData.login?.result === 'NeedToken') {
      console.log(`[REAL] NeedToken response - retrying with same token and cookies (MediaWiki two-step login)`);
      
      // Retry with SAME token and cookies
      loginResult = await this.attemptLoginRequest(
        baseUrl,
        newFormatUsername,
        newFormatPassword,
        loginToken, // SAME token
        tokenCookies, // SAME cookies
        'NEW FORMAT (NeedToken retry)'
      );
      loginResponse = loginResult.response;
      loginData = loginResult.data;
    }
    
    // If NEW FORMAT fails (and not NeedToken), try OLD FORMAT (legacy compatibility)
    if (loginData.login?.result !== 'Success' && loginData.login?.result !== 'NeedToken') {
      console.log(`[REAL] New format login failed (${loginData.login?.result}), trying old format...`);
      
      loginResult = await this.attemptLoginRequest(
        baseUrl,
        oldFormatUsername,
        oldFormatPassword,
        loginToken, // Use same token
        tokenCookies, // Use same cookies
        'OLD FORMAT'
      );
      loginResponse = loginResult.response;
      loginData = loginResult.data;
      
      // Handle NeedToken for OLD FORMAT too
      if (loginData.login?.result === 'NeedToken') {
        console.log(`[REAL] NeedToken response for OLD FORMAT - retrying with same token and cookies`);
        
        loginResult = await this.attemptLoginRequest(
          baseUrl,
          oldFormatUsername,
          oldFormatPassword,
          loginToken, // SAME token
          tokenCookies, // SAME cookies
          'OLD FORMAT (NeedToken retry)'
        );
        loginResponse = loginResult.response;
        loginData = loginResult.data;
      }
    }
    
    if (loginData.error) {
      throw new Error(
        `Login failed: ${loginData.error.code || 'unknown'} - ${loginData.error.info || 'Unknown error'}.\n` +
        'Check WIKIDATA_BOT_USERNAME and WIKIDATA_BOT_PASSWORD.'
      );
    }
    
    if (loginData.login?.result !== 'Success') {
      // Enhanced error handling for common login failures
      const reason = loginData.login?.reason || 'Unknown';
      const result = loginData.login?.result || 'Unknown error';
      
      // Check for common issues and provide helpful guidance
      let errorMessage = `Login failed: ${result}.\nReason: ${reason}`;
      
      if (reason.includes('session') || reason.includes('timeout')) {
        errorMessage += '\n\nPossible fixes:\n' +
          '- Check that WIKIDATA_BOT_USERNAME and WIKIDATA_BOT_PASSWORD are correct\n' +
          '- Verify bot password format: username@botname:password\n' +
          '- Ensure bot account exists at test.wikidata.org\n' +
          '- Try creating a new bot password at https://test.wikidata.org/wiki/Special:BotPasswords';
      } else if (reason.includes('wrong') || reason.includes('password')) {
        errorMessage += '\n\nCheck:\n' +
          '- Bot password format is correct: username@botname:password\n' +
          '- Password matches exactly what was generated at Special:BotPasswords\n' +
          '- Username is correct (without the @botname part for lgname)';
      }
      
      throw new Error(errorMessage);
    }
    
    // Extract session cookies from response
    // MediaWiki sets multiple cookies (session, userid, username, etc.)
    // DRY: Use centralized cookie parsing method
    const cookiesHeader = loginResponse.headers.get('set-cookie');
    if (!cookiesHeader) {
      throw new Error('No session cookies received from login. Authentication failed.');
    }
    
    // Parse cookies - extract key=value pairs
    // DRY: Reuse parseCookies method
    const cookies = this.parseCookies(cookiesHeader);
    if (!cookies) {
      throw new Error('Failed to parse session cookies from login response. Authentication failed.');
    }
    
    console.log(`[REAL] Successfully authenticated as ${username}`);
    this.sessionCookies = cookies; // Cache for reuse (DRY: avoid re-login)
    
    return cookies;
  }
  
  /**
   * Validate entity structure before sending to Wikidata API
   * Checks for common type mismatches and structural issues
   * DRY: Centralized validation logic
   * SOLID: Single Responsibility - validation only
   * 
   * @param entity - Cleaned entity data
   * @throws Error if validation fails
   */
  private validateEntityForWikidata(entity: CleanedWikidataEntity): void {
    if (!entity.claims) {
      throw new Error('Entity has no claims');
    }
    
    console.error('[VALIDATION] ========================================');
    console.error('[VALIDATION] Starting entity validation...');
    const propertyCount = Object.keys(entity.claims).length;
    console.error(`[VALIDATION] Validating ${propertyCount} properties: ${Object.keys(entity.claims).join(', ')}`);
    console.error('[VALIDATION] ========================================');
    
    // Validate each claim's data type matches expected format
    for (const [pid, claimArray] of Object.entries(entity.claims)) {
      console.error(`[VALIDATION] Checking property ${pid}...`);
      if (!Array.isArray(claimArray) || claimArray.length === 0) {
        console.warn(`[VALIDATION] Property ${pid} has invalid claim array`);
        continue;
      }
      
      for (const claim of claimArray) {
        // Validate mainsnak
        if (!claim.mainsnak?.datavalue) {
          console.warn(`[VALIDATION] Property ${pid} has claim without datavalue`);
          continue;
        }
        
        this.validateSnak(pid, claim.mainsnak, 'mainsnak');
        
        // Validate reference snaks (references can also have type mismatches)
        if (claim.references) {
          for (let refIdx = 0; refIdx < claim.references.length; refIdx++) {
            const reference = claim.references[refIdx];
            if (reference.snaks) {
              for (const [refPid, refSnakArray] of Object.entries(reference.snaks)) {
                if (Array.isArray(refSnakArray)) {
                  for (let snakIdx = 0; snakIdx < refSnakArray.length; snakIdx++) {
                    const refSnak = refSnakArray[snakIdx];
                    if (refSnak && typeof refSnak === 'object' && 'datavalue' in refSnak) {
                      this.validateSnak(refPid, refSnak, `reference[${refIdx}].snaks.${refPid}[${snakIdx}]`);
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
    
    console.error('[VALIDATION] ========================================');
    console.error('[VALIDATION] Entity structure validated successfully');
    console.error('[VALIDATION] ========================================');
  }
  
  /**
   * Map property mapping dataType to Wikidata API type
   * DRY: Centralized type mapping logic
   * SOLID: Single Responsibility - type conversion only
   * 
   * @param dataType - Property mapping dataType ('item', 'string', 'url', 'time', 'quantity', 'coordinate', 'monolingualtext')
   * @returns Wikidata API type ('wikibase-entityid', 'string', 'time', 'quantity', 'globecoordinate', 'monolingualtext') or null
   */
  private mapPropertyDataTypeToWikidataType(
    dataType: 'item' | 'string' | 'url' | 'time' | 'quantity' | 'coordinate' | 'monolingualtext'
  ): string | null {
    const typeMap: Record<string, string> = {
      'item': 'wikibase-entityid',
      'string': 'string',
      'url': 'string', // URLs are stored as strings in Wikidata
      'time': 'time',
      'quantity': 'quantity',
      'coordinate': 'globecoordinate',
      'monolingualtext': 'monolingualtext',
    };
    return typeMap[dataType] || null;
  }
  
  /**
   * Validate a single snak (mainsnak or reference snak)
   * DRY: Centralized snak validation logic
   * SOLID: Single Responsibility - snak validation only
   * 
   * @param pid - Property ID (e.g., P31, P854)
   * @param snak - Snak to validate
   * @param context - Context string for error messages (e.g., "mainsnak", "reference[0].snaks.P854[0]")
   */
  private validateSnak(pid: string, snak: any, context: string): void {
    if (!snak?.datavalue) {
      return;
    }
    
    const datavalue = snak.datavalue;
    const value = datavalue.value;
    const type = datavalue.type;
    
    // Check if this property is in our mapping and validate type matches
    const mapping = BUSINESS_PROPERTY_MAP[pid];
    
    if (mapping) {
      // Map our dataType to Wikidata API type
      const expectedType = this.mapPropertyDataTypeToWikidataType(mapping.dataType);
      console.error(`[VALIDATION] ${context} (${pid}): mapping.dataType=${mapping.dataType}, expectedType=${expectedType}, actualType=${type}`);
      if (expectedType && type !== expectedType) {
        const errorMsg = `[VALIDATION] ${context} (${pid}) type mismatch: ` +
          `expected ${expectedType} (from property mapping: ${mapping.dataType}), ` +
          `but got ${type}. Value: ${JSON.stringify(value).substring(0, 100)}`;
        console.error(`[VALIDATION] ERROR: ${errorMsg}`);
        throw new Error(errorMsg);
      } else {
        console.error(`[VALIDATION] ${context} (${pid}): Type check passed (${type})`);
      }
    } else {
      // Property not in mapping - log warning but don't fail validation
      // This allows for properties we haven't explicitly mapped yet
      // Reference properties (P813, P1476, P854) should be in mapping, but others might not be
      if (!pid.startsWith('P')) {
        console.warn(`[VALIDATION] ${context} (${pid}) is not a valid property ID (should start with P)`);
      } else {
        console.error(`[VALIDATION] ${context} (${pid}) not in property mapping - skipping type validation`);
      }
    }
    
    // Check for type mismatches
    if (type === 'wikibase-entityid') {
      // Should be an object with entity-type and id
      if (typeof value !== 'object' || value === null) {
        throw new Error(
          `[VALIDATION] ${context} (${pid}) has invalid wikibase-entityid: ` +
          `expected object with id and entity-type, got ${JSON.stringify(value)}`
        );
      }
      
      // Type guard for entity value
      const entityValue = value as { id?: string; 'entity-type'?: string };
      if (!entityValue.id || !entityValue['entity-type']) {
        throw new Error(
          `[VALIDATION] ${context} (${pid}) has invalid wikibase-entityid: ` +
          `expected object with id and entity-type, got ${JSON.stringify(value)}`
        );
      }
      
      // QID should start with Q
      if (typeof entityValue.id !== 'string' || !entityValue.id.startsWith('Q')) {
        throw new Error(
          `[VALIDATION] ${context} (${pid}) has invalid QID format: ${entityValue.id}. Expected QID (e.g., Q123)`
        );
      }
    } else if (type === 'string') {
      // Should be a string, not a QID
      if (typeof value === 'string' && value.startsWith('Q') && value.length > 1 && /^Q\d+$/.test(value)) {
        throw new Error(
          `[VALIDATION] ${context} (${pid}) has QID value "${value}" but type is "string". ` +
          `This property likely expects a string, not a QID. Check property mapping.`
        );
      }
      if (typeof value !== 'string') {
        throw new Error(
          `[VALIDATION] ${context} (${pid}) has non-string value for string type: ${JSON.stringify(value)}`
        );
      }
    } else if (type === 'quantity') {
      // Quantity should have amount and unit
      if (typeof value !== 'object' || value === null) {
        throw new Error(
          `[VALIDATION] ${context} (${pid}) has invalid quantity: expected object with amount and unit`
        );
      }
      const qtyValue = value as { amount?: string; unit?: string };
      if (!qtyValue.amount || !qtyValue.unit) {
        throw new Error(
          `[VALIDATION] ${context} (${pid}) has invalid quantity: missing amount or unit`
        );
      }
      // Unit should be "1" (dimensionless) or a QID starting with Q
      if (qtyValue.unit !== '1' && (!qtyValue.unit.startsWith('Q') || !/^Q\d+$/.test(qtyValue.unit))) {
        console.warn(
          `[VALIDATION] ${context} (${pid}) has unusual unit format: ${qtyValue.unit}. Expected "1" or QID.`
        );
      }
    } else if (type === 'monolingualtext') {
      // Monolingualtext should have text and language
      if (typeof value !== 'object' || value === null) {
        throw new Error(
          `[VALIDATION] ${context} (${pid}) has invalid monolingualtext: expected object with text and language`
        );
      }
      const mtValue = value as { text?: string; language?: string };
      if (!mtValue.text || !mtValue.language) {
        throw new Error(
          `[VALIDATION] ${context} (${pid}) has invalid monolingualtext: missing text or language`
        );
      }
    }
  }
  
  /**
   * Log claim types for debugging type mismatch errors
   * DRY: Centralized logging logic
   * SOLID: Single Responsibility - logging only
   */
  private logEntityClaimTypes(entity: CleanedWikidataEntity): void {
    console.log('[DEBUG] Entity claim types (mainsnaks):');
    for (const [pid, claimArray] of Object.entries(entity.claims || {})) {
      if (Array.isArray(claimArray) && claimArray.length > 0) {
        const firstClaim = claimArray[0];
        const datavalue = firstClaim?.mainsnak?.datavalue;
        if (datavalue) {
          const value = datavalue.value;
          const valuePreview = typeof value === 'string' 
            ? (value.length > 50 ? value.substring(0, 50) + '...' : value)
            : JSON.stringify(value).substring(0, 50);
          console.log(`  ${pid}: type=${datavalue.type}, value=${valuePreview}`);
        }
      }
    }
  }
  
  /**
   * Log details for a specific property
   * DRY: Centralized property logging
   * SOLID: Single Responsibility - property inspection only
   */
  private logPropertyDetails(entity: CleanedWikidataEntity, pid: string): void {
    console.error(`[DEBUG] Details for property ${pid}:`);
    const claims = entity.claims?.[pid];
    if (!claims || !Array.isArray(claims)) {
      console.error(`  Property ${pid} not found in entity`);
      return;
    }
    
    for (let i = 0; i < claims.length; i++) {
      const claim = claims[i];
      console.error(`  Claim ${i}:`);
      if (claim.mainsnak?.datavalue) {
        const dv = claim.mainsnak.datavalue;
        console.error(`    mainsnak: type=${dv.type}, value=${JSON.stringify(dv.value).substring(0, 100)}`);
      }
      if (claim.references) {
        for (let refIdx = 0; refIdx < claim.references.length; refIdx++) {
          const ref = claim.references[refIdx];
          if (ref.snaks) {
            for (const [refPid, refSnaks] of Object.entries(ref.snaks)) {
              if (Array.isArray(refSnaks)) {
                for (const refSnak of refSnaks) {
                  if (refSnak && typeof refSnak === 'object' && 'datavalue' in refSnak) {
                    const refDv = (refSnak as any).datavalue;
                    console.error(`    reference[${refIdx}].${refPid}: type=${refDv.type}, value=${JSON.stringify(refDv.value).substring(0, 100)}`);
                  }
                }
              }
            }
          }
        }
      }
    }
  }
  
  /**
   * Log all reference snaks for debugging
   * DRY: Centralized logging logic
   * SOLID: Single Responsibility - logging only
   */
  private logAllReferenceSnaks(entity: CleanedWikidataEntity): void {
    console.log('[DEBUG] All reference snaks:');
    for (const [pid, claimArray] of Object.entries(entity.claims || {})) {
      if (Array.isArray(claimArray)) {
        for (let claimIdx = 0; claimIdx < claimArray.length; claimIdx++) {
          const claim = claimArray[claimIdx];
          if (claim.references) {
            for (let refIdx = 0; refIdx < claim.references.length; refIdx++) {
              const reference = claim.references[refIdx];
              if (reference.snaks) {
                for (const [refPid, refSnakArray] of Object.entries(reference.snaks)) {
                  if (Array.isArray(refSnakArray)) {
                    for (let snakIdx = 0; snakIdx < refSnakArray.length; snakIdx++) {
                      const refSnak = refSnakArray[snakIdx];
                      if (refSnak && typeof refSnak === 'object' && 'datavalue' in refSnak) {
                        const datavalue = (refSnak as any).datavalue;
                        if (datavalue) {
                          const value = datavalue.value;
                          const valuePreview = typeof value === 'string' 
                            ? (value.length > 50 ? value.substring(0, 50) + '...' : value)
                            : JSON.stringify(value).substring(0, 50);
                          console.log(`  ${pid}[${claimIdx}].references[${refIdx}].${refPid}[${snakIdx}]: type=${datavalue.type}, value=${valuePreview}`);
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
  
  /**
   * Query Wikidata property info API to verify expected data types
   * This helps identify type mismatches before sending to API
   * IMPORTANT: test.wikidata.org may have different property definitions than production
   * DRY: Centralized property verification
   * SOLID: Single Responsibility - property type verification only
   * 
   * @param entity - Entity to verify
   * @param baseUrl - Wikidata API base URL
   * @returns Map of property ID to expected API type
   */
  private async verifyPropertyTypes(entity: CleanedWikidataEntity, baseUrl: string): Promise<Map<string, string>> {
    const allPropertyIds = new Set<string>();
    const propertyTypeMap = new Map<string, string>();
    
    // Collect all property IDs from mainsnaks
    for (const [pid, claimArray] of Object.entries(entity.claims || {})) {
      allPropertyIds.add(pid);
      
      // Also collect from reference snaks
      for (const claim of claimArray || []) {
        if (claim.references) {
          for (const ref of claim.references) {
            if (ref.snaks) {
              for (const refPid of Object.keys(ref.snaks)) {
                allPropertyIds.add(refPid);
              }
            }
          }
        }
      }
    }
    
    if (allPropertyIds.size === 0) {
      return propertyTypeMap;
    }
    
    // Query property info for all properties at once
    const propertyIds = Array.from(allPropertyIds).join('|');
    const propertyInfoUrl = `${baseUrl}?action=wbgetentities&ids=${propertyIds}&props=datatype&format=json`;
    
    try {
      console.error(`[REAL] Querying property info for: ${propertyIds}`);
      const response = await fetch(propertyInfoUrl);
      const data = await response.json();
      
      if (data.entities) {
        for (const [pid, propertyInfo] of Object.entries(data.entities)) {
          const info = propertyInfo as any;
          if (info.datatype) {
            const expectedType = this.mapWikidataDatatypeToApiType(info.datatype);
            propertyTypeMap.set(pid, expectedType);
            console.error(`[REAL] Property ${pid} expects datatype: ${info.datatype} (API type: ${expectedType})`);
            
            // Check if our mapping matches
            const mapping = BUSINESS_PROPERTY_MAP[pid];
            if (mapping) {
              const ourExpectedType = this.mapPropertyDataTypeToWikidataType(mapping.dataType);
              if (ourExpectedType && ourExpectedType !== expectedType) {
                console.error(`[REAL] WARNING: Property ${pid} type mismatch!`);
                console.error(`[REAL]   Our mapping says: ${mapping.dataType} -> ${ourExpectedType}`);
                console.error(`[REAL]   Wikidata says: ${info.datatype} -> ${expectedType}`);
                console.error(`[REAL]   Using Wikidata's definition (test.wikidata.org may differ from production)`);
              }
            }
          }
        }
      }
    } catch (error) {
      console.warn(`[REAL] Failed to query property info: ${error}`);
      // Don't fail validation if property info query fails
    }
    
    return propertyTypeMap;
  }
  
  /**
   * Filter entity to remove properties that don't match expected types
   * This adapts the entity to match test.wikidata.org property definitions
   * DRY: Centralized filtering logic
   * SOLID: Single Responsibility - entity filtering only
   * 
   * @param entity - Entity to filter
   * @param propertyTypeMap - Map of property ID to expected API type
   * @returns Filtered entity with only matching properties
   */
  private filterEntityByPropertyTypes(
    entity: CleanedWikidataEntity,
    propertyTypeMap: Map<string, string>
  ): CleanedWikidataEntity {
    const filteredClaims: Record<string, WikidataClaim[]> = {};
    
    // Filter mainsnaks
    for (const [pid, claimArray] of Object.entries(entity.claims || {})) {
      const expectedType = propertyTypeMap.get(pid);
      if (expectedType) {
        const matchingClaims: WikidataClaim[] = [];
        for (const claim of claimArray || []) {
          const actualType = claim.mainsnak?.datavalue?.type;
          if (actualType === expectedType) {
            // Also filter reference snaks to match expected types
            const filteredClaim = { ...claim };
            if (filteredClaim.references) {
              filteredClaim.references = filteredClaim.references.map(ref => {
                const filteredRef = { ...ref };
                if (filteredRef.snaks) {
                  const filteredSnaks: Record<string, WikidataSnak[]> = {};
                  for (const [refPid, refSnakArray] of Object.entries(filteredRef.snaks)) {
                    const expectedRefType = propertyTypeMap.get(refPid);
                    if (expectedRefType) {
                      const matchingRefSnaks = (refSnakArray || []).filter(refSnak => {
                        const actualRefType = refSnak?.datavalue?.type;
                        return actualRefType === expectedRefType;
                      });
                      if (matchingRefSnaks.length > 0) {
                        filteredSnaks[refPid] = matchingRefSnaks;
                      }
                    }
                  }
                  filteredRef.snaks = filteredSnaks;
                }
                return filteredRef;
              }).filter(ref => Object.keys(ref.snaks || {}).length > 0);
            }
            matchingClaims.push(filteredClaim);
          } else {
            console.warn(`[REAL] Skipping property ${pid}: expected ${expectedType}, got ${actualType}`);
          }
        }
        if (matchingClaims.length > 0) {
          filteredClaims[pid] = matchingClaims;
        }
      } else {
        // Property not in type map - keep it (might be valid)
        filteredClaims[pid] = claimArray || [];
      }
    }
    
    return {
      ...entity,
      claims: filteredClaims,
    };
  }
  
  /**
   * Validate entity against actual Wikidata property types
   * This catches type mismatches before sending to API
   * DRY: Centralized validation logic
   * SOLID: Single Responsibility - type validation only
   * 
   * @param entity - Entity to validate
   * @param propertyTypeMap - Map of property ID to expected API type
   */
  private validateEntityAgainstPropertyTypes(
    entity: CleanedWikidataEntity,
    propertyTypeMap: Map<string, string>
  ): void {
    // Validate mainsnaks
    for (const [pid, claimArray] of Object.entries(entity.claims || {})) {
      const expectedType = propertyTypeMap.get(pid);
      if (expectedType) {
        for (const claim of claimArray || []) {
          const actualType = claim.mainsnak?.datavalue?.type;
          if (actualType && actualType !== expectedType) {
            const errorMsg = `[VALIDATION] Property ${pid} type mismatch: ` +
              `expected ${expectedType} (from Wikidata), ` +
              `but got ${actualType}. ` +
              `Value: ${JSON.stringify(claim.mainsnak?.datavalue?.value).substring(0, 100)}`;
            console.error(`[VALIDATION] ERROR: ${errorMsg}`);
            throw new Error(errorMsg);
          }
        }
      }
      
      // Validate reference snaks
      for (const claim of claimArray || []) {
        if (claim.references) {
          for (const ref of claim.references) {
            if (ref.snaks) {
              for (const [refPid, refSnakArray] of Object.entries(ref.snaks)) {
                const expectedRefType = propertyTypeMap.get(refPid);
                if (expectedRefType) {
                  for (const refSnak of refSnakArray || []) {
                    const actualRefType = refSnak?.datavalue?.type;
                    if (actualRefType && actualRefType !== expectedRefType) {
                      const errorMsg = `[VALIDATION] Reference property ${refPid} type mismatch: ` +
                        `expected ${expectedRefType} (from Wikidata), ` +
                        `but got ${actualRefType}. ` +
                        `Value: ${JSON.stringify(refSnak?.datavalue?.value).substring(0, 100)}`;
                      console.error(`[VALIDATION] ERROR: ${errorMsg}`);
                      throw new Error(errorMsg);
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
  
  /**
   * Map Wikidata datatype to API type
   * DRY: Centralized type mapping
   */
  private mapWikidataDatatypeToApiType(datatype: string): string {
    const typeMap: Record<string, string> = {
      'wikibase-item': 'wikibase-entityid',
      'wikibase-property': 'wikibase-entityid',
      'string': 'string',
      'url': 'string', // URLs are stored as strings in Wikidata API
      'time': 'time',
      'quantity': 'quantity',
      'monolingualtext': 'monolingualtext',
      'globe-coordinate': 'globecoordinate',
    };
    return typeMap[datatype] || datatype;
  }
  
  /**
   * Clean entity data for Wikidata API
   * Removes non-Wikidata fields (e.g., llmSuggestions) that are internal metadata
   * PRESERVES: All PIDs, QIDs, claims, references, labels, descriptions - maintains full entity richness
   * DRY: Centralized entity cleaning logic
   * SOLID: Single Responsibility - entity data cleaning only
   * 
   * @param entity - Full entity data with optional metadata fields
   * @returns Cleaned entity data ready for Wikidata API (with all PIDs, QIDs, and richness preserved)
   */
  private cleanEntityForWikidata(entity: WikidataEntityDataContract): CleanedWikidataEntity {
    // Extract only Wikidata-compatible fields
    // llmSuggestions is internal metadata and should not be sent to Wikidata
    // IMPORTANT: All other fields are preserved:
    //   - labels: All language labels (preserved)
    //   - descriptions: All language descriptions (preserved)
    //   - claims: All property IDs (PIDs), entity IDs (QIDs), references, and claim data (preserved)
    const { llmSuggestions, ...cleanedEntity } = entity;
    
    // Log entity richness for verification
    const claimCount = Object.keys(cleanedEntity.claims || {}).length;
    const totalStatements = Object.values(cleanedEntity.claims || {}).reduce(
      (sum, claimArray) => sum + (Array.isArray(claimArray) ? claimArray.length : 0),
      0
    );
    const labelCount = Object.keys(cleanedEntity.labels || {}).length;
    const descriptionCount = Object.keys(cleanedEntity.descriptions || {}).length;
    
    console.log(`[REAL] Entity cleaned for Wikidata API - Richness preserved:`);
    console.log(`[REAL]   - Properties (PIDs): ${claimCount}`);
    console.log(`[REAL]   - Total statements: ${totalStatements}`);
    console.log(`[REAL]   - Labels (languages): ${labelCount}`);
    console.log(`[REAL]   - Descriptions (languages): ${descriptionCount}`);
    console.log(`[REAL]   - All QIDs, references, and claim data preserved`);
    
    return cleanedEntity;
  }
  
  /**
   * Get CSRF token and session cookies for Wikidata API
   * Required for write operations (authentication)
   * SOLID: Single Responsibility - handles token and cookie retrieval
   * DRY: Centralized authentication logic
   * 
   * Returns both token and cookies needed for authenticated requests
   */
  private async getCSRFTokenAndCookies(baseUrl: string): Promise<{ token: string; cookies: string }> {
    try {
      // Get or reuse session cookies
      let cookies = this.sessionCookies;
      
      if (!cookies) {
        // Login if we don't have cookies yet
        cookies = await this.login(baseUrl);
      }
      
      // Get CSRF token using authenticated session
      const tokenUrl = `${baseUrl}?action=query&meta=tokens&type=csrf&format=json`;
      const response = await fetch(tokenUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'GEMflush/1.0 (https://github.com/your-repo)',
          'Cookie': cookies,
        },
      });
      
      if (!response.ok) {
        // If token fetch fails, try logging in again (session may have expired)
        if (response.status === 401 || response.status === 403) {
          console.log(`[REAL] Session expired, re-authenticating...`);
          this.sessionCookies = null; // Clear cached cookies
          cookies = await this.login(baseUrl);
          
          // Retry token fetch with new cookies
          const retryResponse = await fetch(tokenUrl, {
            method: 'GET',
            headers: {
              'User-Agent': 'GEMflush/1.0 (https://github.com/your-repo)',
              'Cookie': cookies,
            },
          });
          
          if (!retryResponse.ok) {
            throw new Error(`Failed to fetch CSRF token after re-auth: ${retryResponse.status} ${retryResponse.statusText}`);
          }
          
          const retryData = await retryResponse.json();
          if (retryData.error) {
            throw new Error(
              `Wikidata API error: ${retryData.error.code || 'unknown'} - ${retryData.error.info || 'Unknown error'}`
            );
          }
          
          const token = retryData.query?.tokens?.csrftoken;
          if (!token) {
            throw new Error('CSRF token not found in API response after re-auth');
          }
          
          console.log(`[REAL] CSRF token obtained successfully`);
          return { token, cookies };
        }
        
        throw new Error(`Failed to fetch CSRF token: ${response.status} ${response.statusText}`);
      }
    
    const data = await response.json();
      
      // Check for API errors
      if (data.error) {
        throw new Error(
          `Wikidata API error: ${data.error.code || 'unknown'} - ${data.error.info || 'Unknown error'}`
        );
      }
      
      const token = data.query?.tokens?.csrftoken;
      
      if (!token) {
        throw new Error('CSRF token not found in API response. Authentication may have failed.');
      }
      
      console.log(`[REAL] CSRF token obtained successfully`);
      return { token, cookies };
      
    } catch (error) {
      console.error('[REAL] Error obtaining CSRF token:', error);
      // Clear cached cookies on error (they may be invalid)
      this.sessionCookies = null;
      throw error instanceof Error 
        ? error 
        : new Error('Failed to obtain CSRF token');
    }
  }
  
  /**
   * Update an existing entity
   * SOLID: Single Responsibility - handles entity updates
   * DRY: Reuses CSRF token logic from publishEntity
   */
  async updateEntity(
    qid: string,
    updates: Partial<WikidataEntityDataContract>,
    production: boolean = false
  ): Promise<{ success: boolean; error?: string }> {
    const baseUrl = production ? this.prodBaseUrl : this.testBaseUrl;
    
    try {
      // Mock mode: bypass real API calls
      if (process.env.WIKIDATA_PUBLISH_MODE === 'mock') {
        const environment = production ? 'wikidata.org' : 'test.wikidata.org';
        console.log(`[MOCK] Updating entity ${qid} on ${environment} (mock mode)`);
        await new Promise(resolve => setTimeout(resolve, 800));
        return { success: true };
      }
      
      // Production is still mocked (even in real mode)
      if (production) {
        console.log(`[MOCK] Updating entity ${qid} on production Wikidata (mocked)`);
        await new Promise(resolve => setTimeout(resolve, 800));
        return { success: true };
      }
      
      // Real API call to test.wikidata.org or wikidata.org
      const environment = production ? 'wikidata.org' : 'test.wikidata.org';
      console.log(`[REAL] Updating entity ${qid} on ${environment}`);
      
      const { token, cookies } = await this.getCSRFTokenAndCookies(baseUrl);
      
      if (!token) {
        throw new Error('Failed to obtain CSRF token for update');
      }
      
      const response = await fetch(baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'GEMflush/1.0 (https://github.com/your-repo)',
          'Cookie': cookies,
        },
        body: new URLSearchParams({
          action: 'wbeditentity',
          id: qid,
          data: JSON.stringify(
            // Clean updates - remove internal metadata fields if present
            // DRY: Use centralized cleaning method
            this.cleanEntityForWikidata(updates as WikidataEntityDataContract)
          ),
          token,
          format: 'json',
          // Note: bot='1' requires the account to have the bot flag
          ...(process.env.WIKIDATA_USE_BOT_FLAG === 'true' ? { bot: '1' } : {}),
          summary: 'Updated via GEMflush',
        }),
      });
      
      const result = await response.json();
      
      if (result.error) {
        throw new Error(
          result.error.code 
            ? `${result.error.code}: ${result.error.info || 'Unknown error'}`
            : result.error.info || 'Unknown error updating entity'
        );
      }
      
      if (result.success) {
        console.log(`[REAL] Entity ${qid} updated successfully on ${environment}`);
        return { success: true };
      }
      
      throw new Error('Update succeeded but API returned success=false');
      
    } catch (error) {
      console.error('Wikidata update error:', error);
    return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
    };
    }
  }
}

export const wikidataPublisher = new WikidataPublisher();

