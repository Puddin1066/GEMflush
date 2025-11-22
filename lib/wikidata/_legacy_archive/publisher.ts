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
import { WikidataPublishResult } from '@/lib/types/gemflush';
import { IWikidataPublisher } from '@/lib/types/service-contracts';
import { validateWikidataEntity } from '@/lib/validation/wikidata';
import { BUSINESS_PROPERTY_MAP } from './property-mapping';

export class WikidataPublisher implements IWikidataPublisher {
  // Configurable API URLs via environment variables (with sensible defaults)
  private testBaseUrl = process.env.WIKIDATA_TEST_API_URL || 'https://test.wikidata.org/w/api.php';
  private prodBaseUrl = process.env.WIKIDATA_PROD_API_URL || 'https://www.wikidata.org/w/api.php';
  private sessionCookies: string | null = null; // Cache session cookies (SOLID: single responsibility)
  private propertyTypeCache = new Map<string, Map<string, string>>(); // Cache property types per baseUrl
  private cookieExpiry: number | null = null; // Track cookie expiration (30 minutes)
  private readonly COOKIE_TTL = 30 * 60 * 1000; // 30 minutes
  
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
            
            // PRODUCTION MODE: Can be enabled via WIKIDATA_ENABLE_PRODUCTION env var
            // IMPORTANT: Only enable if you have valid production credentials and bot account
            // By default, production is disabled to prevent accidental real Wikidata publishing
            if (production) {
              const enableProduction = process.env.WIKIDATA_ENABLE_PRODUCTION === 'true';
              if (!enableProduction) {
                console.warn(`[BLOCKED] Production publishing to wikidata.org is DISABLED`);
                console.warn(`[BLOCKED] Set WIKIDATA_ENABLE_PRODUCTION=true to enable production publishing`);
                console.warn(`[BLOCKED] Only use this if you have valid production credentials and bot account`);
                console.log(`[MOCK] Publishing entity to ${environment} (production mode - blocked and mocked)`);
                console.log(`[MOCK] Entity data (ready for production):`, JSON.stringify(entity, null, 2));
                await new Promise(resolve => setTimeout(resolve, 1000));
                const qid = this.generateMockQID(production);
                console.log(`[MOCK] Returning mock QID (production publishing disabled): ${qid}`);
                return { qid, success: true };
              }
              // Production enabled - continue with real API call
              console.log(`[REAL] Production publishing ENABLED - publishing to wikidata.org`);
            }
            
            // REAL API CALL: Publish to test.wikidata.org
            // The enriched entity JSON (PIDs, QIDs, notability, references) is sent as-is
            console.log(`[REAL] Publishing entity to ${environment}`);
            
            // Check credentials before attempting auth (DRY: centralized validation)
            if (this.hasInvalidCredentials()) {
              console.warn(`[REAL] Wikidata credentials not configured or are placeholders. Falling back to mock mode.`);
              console.warn(`[REAL] To enable real publishing, set valid WIKIDATA_BOT_USERNAME and WIKIDATA_BOT_PASSWORD`);
              console.warn(`[REAL] Create bot account at https://test.wikidata.org/wiki/Special:BotPasswords`);
              const qid = this.generateMockQID(production);
              console.log(`[REAL] Returning mock QID (credentials not configured): ${qid}`);
              return { qid, success: true };
            }
            
            // DRY: Reuse shared entity processing
            const { cleanedEntity, token, cookies } = await this.prepareEntityForApi(entity, baseUrl, production);
            
            // Log entity data for debugging
      // Final check: ensure no references exist before serialization
      const finalCheck = Object.values(cleanedEntity.claims || {})
        .flat()
        .some((claim: any) => claim.references && claim.references.length > 0);
      if (finalCheck) {
        console.error('[REAL] CRITICAL: References still exist before API call! Force removing...');
        for (const [pid, claimArray] of Object.entries(cleanedEntity.claims)) {
          cleanedEntity.claims[pid] = (claimArray as any[]).map(claim => {
            const { references, ...cleanClaim } = claim as any;
            return cleanClaim;
          });
        }
      }
      
      const entityJson = JSON.stringify(cleanedEntity);
      console.log('[REAL] Entity JSON length:', entityJson.length, 'characters');
      console.log('[REAL] Entity JSON preview (first 1000 chars):', entityJson.substring(0, 1000));
      
      // Verify no "references" in JSON string
      if (entityJson.includes('"references"')) {
        console.error('[REAL] CRITICAL ERROR: Entity JSON still contains "references" keyword!');
        console.error('[REAL] This will cause API validation errors on test.wikidata.org');
      }
      
            // DRY: Reuse API call logic
            const result = await this.callWikidataApi(baseUrl, {
          action: 'wbeditentity',
          new: 'item',
          data: entityJson,
          token,
          format: 'json',
          ...(process.env.WIKIDATA_USE_BOT_FLAG === 'true' ? { bot: '1' } : {}),
          summary: 'Created via GEMflush - Automated business entity generation',
            }, cookies);
      
            // DRY: Reuse error handling
      if (result.error) {
        // Check if error indicates item already exists (has QID in error message)
        const existingQID = this.extractQIDFromError(result.error);
        if (existingQID && result.error.info?.includes('already has label')) {
          console.log(`[REAL] Item already exists with QID ${existingQID}, updating instead of creating...`);
          
          // Remove labels/descriptions when updating (they already exist)
          const entityForUpdate = { ...cleanedEntity };
          delete entityForUpdate.labels;
          delete entityForUpdate.descriptions;
          
          // Update existing entity
          const updateResult = await this.callWikidataApi(baseUrl, {
            action: 'wbeditentity',
            id: existingQID,
            data: JSON.stringify(entityForUpdate),
            clear: 'false', // Don't clear existing claims, just add/update
            token,
            format: 'json',
            ...(process.env.WIKIDATA_USE_BOT_FLAG === 'true' ? { bot: '1' } : {}),
            summary: 'Updated via GEMflush - Automated business entity update',
          }, cookies);
          
          if (updateResult.error) {
            this.handleApiError(updateResult.error, cleanedEntity, 'update after duplicate detection');
            throw new Error(this.extractErrorMessage(updateResult.error));
          }
          
          if (updateResult.success) {
            console.log(`[REAL] Entity ${existingQID} updated successfully on ${environment}`);
            return {
              qid: existingQID,
              success: true,
            };
          }
        }
        
        // If not a duplicate error, handle normally
        this.handleApiError(result.error, cleanedEntity, 'publication');
        throw new Error(this.extractErrorMessage(result.error));
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
    this.cookieExpiry = Date.now() + this.COOKIE_TTL; // Set expiration
    
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
  private validateSnak(pid: string, snak: WikidataSnak, context: string): void {
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
   * Get property types with caching for efficiency
   * DRY: Centralized property type retrieval with caching
   * SOLID: Single Responsibility - property type retrieval only
   * 
   * @param entity - Entity to verify
   * @param baseUrl - Wikidata API base URL
   * @returns Map of property ID to expected API type
   */
  private async getPropertyTypes(entity: CleanedWikidataEntity, baseUrl: string): Promise<Map<string, string>> {
    // Check cache first (efficiency improvement)
    const cached = this.propertyTypeCache.get(baseUrl);
    if (cached) {
      // Verify we have all needed properties in cache
      const neededProps = this.collectPropertyIds(entity);
      const hasAllProps = Array.from(neededProps).every(pid => cached.has(pid));
      if (hasAllProps) {
        console.error(`[REAL] Using cached property types for ${baseUrl}`);
        return cached;
      }
    }
    
    // Cache miss or incomplete - fetch and cache
    const propertyTypeMap = await this.verifyPropertyTypes(entity, baseUrl);
    this.propertyTypeCache.set(baseUrl, propertyTypeMap);
    return propertyTypeMap;
  }

  /**
   * Collect all property IDs from entity (mainsnaks and references)
   * DRY: Centralized property ID collection
   */
  private collectPropertyIds(entity: CleanedWikidataEntity): Set<string> {
    const allPropertyIds = new Set<string>();
    
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
    
    return allPropertyIds;
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
    // DRY: Reuse collectPropertyIds instead of re-collecting
    const allPropertyIds = this.collectPropertyIds(entity);
    const propertyTypeMap = new Map<string, string>();
    
    if (allPropertyIds.size === 0) {
      return propertyTypeMap;
    }
    
    // Query property info for all properties at once
    const propertyIds = Array.from(allPropertyIds).join('|');
    const propertyInfoUrl = `${baseUrl}?action=wbgetentities&ids=${propertyIds}&props=datatype&format=json`;
    
    try {
      console.error(`[REAL] Querying property info for: ${propertyIds}`);
      const response = await fetch(propertyInfoUrl);
      const data = await response.json() as { entities?: Record<string, { datatype?: string }> };
      
      if (data.entities) {
        for (const [pid, propertyInfo] of Object.entries(data.entities)) {
          if (propertyInfo.datatype) {
            const expectedType = this.mapWikidataDatatypeToApiType(propertyInfo.datatype);
            propertyTypeMap.set(pid, expectedType);
            console.error(`[REAL] Property ${pid} expects datatype: ${propertyInfo.datatype} (API type: ${expectedType})`);
            
            // Check if our mapping matches
            const mapping = BUSINESS_PROPERTY_MAP[pid];
            if (mapping) {
              const ourExpectedType = this.mapPropertyDataTypeToWikidataType(mapping.dataType);
              if (ourExpectedType && ourExpectedType !== expectedType) {
                console.error(`[REAL] WARNING: Property ${pid} type mismatch!`);
                console.error(`[REAL]   Our mapping says: ${mapping.dataType} -> ${ourExpectedType}`);
                console.error(`[REAL]   Wikidata says: ${propertyInfo.datatype} -> ${expectedType}`);
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
      // Get or reuse session cookies (with expiration check)
      let cookies = this.sessionCookies;
      
      if (!cookies || !this.cookieExpiry || Date.now() > this.cookieExpiry) {
        // Login if we don't have cookies or they've expired
        cookies = await this.login(baseUrl);
        this.cookieExpiry = Date.now() + this.COOKIE_TTL;
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
            this.cookieExpiry = null; // Clear expiry
          cookies = await this.login(baseUrl);
            this.cookieExpiry = Date.now() + this.COOKIE_TTL;
          
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
      this.cookieExpiry = null;
      throw error instanceof Error 
        ? error 
        : new Error('Failed to obtain CSRF token');
    }
  }
  
  /**
   * Update an existing entity
   * SOLID: Single Responsibility - handles entity updates
   * DRY: Reuses shared logic from publishEntity
   * 
   * Note: Wikidata's wbeditentity expects full entity structure, not partial updates
   * The entity should include all claims, labels, and descriptions (full replacement)
   */
  async updateEntity(
    qid: string,
    entity: WikidataEntityDataContract,
    production: boolean = false
  ): Promise<{ success: boolean; error?: string }> {
    const baseUrl = production ? this.prodBaseUrl : this.testBaseUrl;
    const environment = production ? 'wikidata.org' : 'test.wikidata.org';
    
    try {
      // DRY: Reuse mock mode check
      if (this.shouldUseMockMode(production)) {
        console.log(`[MOCK] Updating entity ${qid} on ${environment} (mock mode)`);
        await new Promise(resolve => setTimeout(resolve, 800));
        return { success: true };
      }
      
      console.log(`[REAL] Updating entity ${qid} on ${environment}`);
      
      // DRY: Reuse shared entity processing
      const { cleanedEntity, token, cookies } = await this.prepareEntityForApi(entity, baseUrl, production);
      
      // DRY: Reuse API call logic
      const result = await this.callWikidataApi(baseUrl, {
        action: 'wbeditentity',
        id: qid,
        data: JSON.stringify(cleanedEntity),
        clear: 'true',
        token,
        format: 'json',
        ...(process.env.WIKIDATA_USE_BOT_FLAG === 'true' ? { bot: '1' } : {}),
        summary: 'Updated via GEMflush',
      }, cookies);
      
      if (result.error) {
        // DRY: Reuse error handling
        this.handleApiError(result.error, cleanedEntity, `update for ${qid}`);
        throw new Error(this.extractErrorMessage(result.error));
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

  /**
   * Check if mock mode should be used
   * DRY: Centralized mock mode check
   */
  private shouldUseMockMode(production: boolean): boolean {
    if (process.env.WIKIDATA_PUBLISH_MODE === 'mock') {
      return true;
    }
    // Production is still mocked (even in real mode)
    return production;
  }

  /**
   * Check if credentials are invalid or placeholders
   * DRY: Centralized credential validation
   */
  private hasInvalidCredentials(): boolean {
    const botUsername = process.env.WIKIDATA_BOT_USERNAME;
    const botPassword = process.env.WIKIDATA_BOT_PASSWORD;
    
    if (!botUsername || !botPassword) {
      return true;
    }
    
    // Detect placeholder/invalid credentials (common in .env templates)
    return (
      botUsername.includes('YourBot') ||
      botUsername.includes('example') ||
      botUsername.includes('placeholder') ||
      botPassword.includes('the_full_bot_password') ||
      botPassword.includes('example') ||
      botPassword.includes('placeholder') ||
      botPassword.length < 5 // Minimum reasonable length
    );
  }

  /**
   * Prepare entity for API call (clean, validate, get auth)
   * DRY: Shared logic for publishEntity and updateEntity
   */
  private async prepareEntityForApi(
    entity: WikidataEntityDataContract,
    baseUrl: string,
    production: boolean
  ): Promise<{
    cleanedEntity: CleanedWikidataEntity;
    token: string;
    cookies: string;
  }> {
    // Clean entity data
      const cleanedEntity = this.cleanEntityForWikidata(entity);
      
    // Validate entity structure
    const validation = validateWikidataEntity(cleanedEntity);
    if (!validation.success) {
      console.error('[REAL] Entity validation failed:', validation.errors);
      throw new Error(
        `Entity validation failed: ${validation.errors?.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')}`
      );
    }
    
    // CRITICAL: Query property types from TARGET environment (not production)
    // test.wikidata.org has different property definitions than production
    // We must query the target environment to know what it expects
    console.log(`[REAL] Querying property types from ${baseUrl.includes('test.wikidata.org') ? 'test.wikidata.org' : 'production wikidata.org'}`);
    const targetPropertyTypeMap = await this.getPropertyTypes(cleanedEntity, baseUrl);
    
    // Also query production types for comparison/logging
    const productionBaseUrl = this.prodBaseUrl;
    const productionPropertyTypeMap = await this.getPropertyTypes(cleanedEntity, productionBaseUrl);
    
    // Log differences between test and production
    if (baseUrl !== productionBaseUrl && targetPropertyTypeMap.size > 0) {
      console.log(`[REAL] Property type differences between test and production:`);
      for (const [pid, testType] of targetPropertyTypeMap.entries()) {
        const prodType = productionPropertyTypeMap.get(pid);
        if (prodType && prodType !== testType) {
          console.log(`[REAL]   ${pid}: test expects ${testType}, production expects ${prodType}`);
        }
      }
    }
    
    // Adapt entity to match TARGET environment's property types
    if (baseUrl !== productionBaseUrl) {
      // Publishing to test.wikidata.org - adapt to test's property definitions
      console.log(`[REAL] Adapting entity for test.wikidata.org property definitions...`);
      this.adaptEntityForEnvironment(cleanedEntity, targetPropertyTypeMap, 'test');
    } else {
      // Publishing to production - validate against production types
      if (targetPropertyTypeMap.size > 0) {
        try {
          this.validateEntityAgainstPropertyTypes(cleanedEntity, targetPropertyTypeMap);
          console.log('[REAL] Entity matches production property types');
        } catch (validationError) {
          console.error('[REAL] WARNING: Entity does not match production property types:', validationError);
        }
      }
    }
    
    // Runtime validation
    this.validateEntityForWikidata(cleanedEntity);
    
    // Get authentication
    const { token, cookies } = await this.getCSRFTokenAndCookies(baseUrl);
    if (!token) {
      throw new Error('Failed to obtain CSRF token');
    }
    
    return { cleanedEntity, token, cookies };
  }

  /**
   * Adapt entity for target environment (test or production)
   * Queries property types from target environment and filters entity to match
   * DRY: Centralized environment adaptation
   * SOLID: Single Responsibility - adapts entity for target environment
   * 
   * @param cleanedEntity - Entity to adapt
   * @param targetPropertyTypeMap - Property types from target environment
   * @param environment - 'test' or 'production'
   */
  private adaptEntityForEnvironment(
    cleanedEntity: CleanedWikidataEntity,
    targetPropertyTypeMap: Map<string, string>,
    environment: 'test' | 'production'
  ): void {
    const isTest = environment === 'test';
    const removedProperties: string[] = [];
    let referenceCount = 0;
    
    // Filter properties based on what target environment expects
    for (const [pid, claimArray] of Object.entries(cleanedEntity.claims)) {
      const expectedType = targetPropertyTypeMap.get(pid);
      
      // Check if property type matches what target expects
      let shouldRemove = false;
      if (expectedType) {
        // Verify each claim's type matches expected
        for (const claim of claimArray || []) {
          const actualType = claim.mainsnak?.datavalue?.type;
          if (actualType && actualType !== expectedType) {
            console.warn(`[REAL] Property ${pid} type mismatch for ${environment}: expected ${expectedType}, got ${actualType}`);
            shouldRemove = true;
            break;
          }
        }
      } else if (isTest) {
        // For test, if we don't know the type, be conservative and remove
        // Known problematic properties on test
        const knownProblematic = ['P31', 'P856', 'P1128', 'P2003'];
        if (knownProblematic.includes(pid)) {
          shouldRemove = true;
        }
      }
      
      if (shouldRemove) {
        removedProperties.push(pid);
        delete cleanedEntity.claims[pid];
      } else {
        // Remove references - test.wikidata.org has wrong types for reference properties
        // Production can keep references
        if (isTest) {
          for (const claim of claimArray || []) {
            if (claim.references && claim.references.length > 0) {
              referenceCount += claim.references.length;
              delete claim.references;
            }
          }
        }
      }
    }
    
    if (removedProperties.length > 0) {
      console.log(`[REAL] Removed ${removedProperties.length} properties for ${environment}: ${removedProperties.join(', ')}`);
    }
    
    if (referenceCount > 0) {
      console.log(`[REAL] Removed ${referenceCount} references for ${environment}`);
    }
    
    const remainingProps = Object.keys(cleanedEntity.claims).length;
    console.log(`[REAL] Publishing to ${environment} - ${remainingProps} properties remaining, ${isTest ? '0' : 'with'} references`);
  }

  /**
   * Call Wikidata API with error handling
   * DRY: Centralized API call logic
   */
  private async callWikidataApi(
    baseUrl: string,
    params: Record<string, string>,
    cookies: string
  ): Promise<{ success?: boolean; error?: { code?: string; info?: string; messages?: Array<{ name?: string; parameters?: unknown[] }> }; entity?: { id?: string } }> {
      const response = await fetch(baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'GEMflush/1.0 (https://github.com/your-repo)',
          'Cookie': cookies,
        },
      body: new URLSearchParams(params),
    });
    
    return await response.json();
  }

  /**
   * Handle API errors with detailed logging
   * DRY: Centralized error handling
   */
  private handleApiError(
    error: { code?: string; info?: string; messages?: Array<{ name?: string; parameters?: unknown[] }> },
    entity: CleanedWikidataEntity,
    context: string
  ): void {
    console.error(`[REAL] Wikidata API error for ${context}:`, JSON.stringify(error, null, 2));
    
    if (error.info?.includes('Bad value type')) {
          console.error('[REAL] Type mismatch detected. Analyzing entity claims...');
      this.logEntityClaimTypes(entity);
      this.logAllReferenceSnaks(entity);
    }
    
    // Extract property IDs from error messages
    if (error.messages && Array.isArray(error.messages)) {
      for (const msg of error.messages) {
        if (msg.parameters && Array.isArray(msg.parameters)) {
          const propertyParams = msg.parameters.filter((p): p is string => 
            typeof p === 'string' && /^P\d+$/.test(p)
          );
          if (propertyParams.length > 0) {
            console.error(`[REAL] Properties with potential issues: ${propertyParams.join(', ')}`);
            for (const pid of propertyParams) {
              this.logPropertyDetails(entity, pid);
            }
          }
        }
      }
    }
    
    // Check error info for property references
    if (error.info) {
      const propertyMatches = error.info.match(/P\d+/g);
      if (propertyMatches) {
        const uniqueProperties = [...new Set(propertyMatches)];
        console.error(`[REAL] Properties found in error info: ${uniqueProperties.join(', ')}`);
        for (const pid of uniqueProperties) {
          this.logPropertyDetails(entity, pid);
        }
      }
    }
  }

  /**
   * Extract error message from API error response
   * DRY: Centralized error message extraction
   */
  /**
   * Extract QID from error message if item already exists
   * Handles cases like: "Item [[Q242874|Q242874]] already has label..."
   */
  private extractQIDFromError(error: { code?: string; info?: string }): string | null {
    if (!error.info) return null;
    
    // Match patterns like: "Item [[Q242874|Q242874]]" or "Item Q242874"
    const qidMatch = error.info.match(/\[\[(Q\d+)\|/i) || error.info.match(/Item\s+(Q\d+)/i);
    return qidMatch ? qidMatch[1] : null;
  }

  private extractErrorMessage(error: { code?: string; info?: string }): string {
    let errorMessage = error.info || 'Unknown error';
    
    // Simplify error messages for user display
    if (error.info?.includes('already has label')) {
      errorMessage = 'This business already exists in Wikidata. Updating existing entry...';
    } else if (error.info?.includes('Bad value type')) {
      errorMessage = 'Data format error. Please contact support if this persists.';
    } else if (error.code) {
      // Keep code but simplify message
      errorMessage = error.info || `${error.code} error occurred`;
    }
    
    return errorMessage;
  }
}

export const wikidataPublisher = new WikidataPublisher();

