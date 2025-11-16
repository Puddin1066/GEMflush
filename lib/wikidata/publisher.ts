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

import { WikidataEntityData } from '@/lib/types/gemflush';

export class WikidataPublisher {
  private testBaseUrl = 'https://test.wikidata.org/w/api.php';
  private prodBaseUrl = 'https://www.wikidata.org/w/api.php';
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
  async publishEntity(
    entity: WikidataEntityData,
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
      
      // PRODUCTION MODE: Currently mocked until test entities are verified
      // TODO: Enable real production publishing after test.wikidata.org verification
      if (production) {
        console.log(`[MOCK] Publishing entity to ${environment} (production mode - currently mocked)`);
        console.log(`[MOCK] Entity data (ready for production):`, JSON.stringify(entity, null, 2));
        await new Promise(resolve => setTimeout(resolve, 1000));
        const qid = this.generateMockQID(production);
        console.log(`[MOCK] Entity published successfully with QID: ${qid}`);
        console.log(`[MOCK] TODO: Enable real production publishing by removing this mock block`);
        return { qid, success: true };
      }
      
      // REAL API CALL: Publish to test.wikidata.org
      // The enriched entity JSON (PIDs, QIDs, notability, references) is sent as-is
      // This same structure can later be published to wikidata.org by setting production=true
      console.log(`[REAL] Publishing entity to ${environment}`);
      console.log(`[REAL] Entity data (same structure for production):`, JSON.stringify(entity, null, 2));
      
      // Get CSRF token and session cookies (required for write operations)
      const { token, cookies } = await this.getCSRFTokenAndCookies(baseUrl);
      
      if (!token) {
        throw new Error('Failed to obtain CSRF token. Please check authentication.');
      }
      
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
          data: JSON.stringify(entity),
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
        console.error('[REAL] Wikidata API error:', result.error);
        throw new Error(
          result.error.code 
            ? `${result.error.code}: ${result.error.info || 'Unknown error'}`
            : result.error.info || 'Unknown error publishing entity'
        );
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
   * Login to Wikidata and get session cookies
   * SOLID: Single Responsibility - handles authentication
   * DRY: Centralized auth logic
   * 
   * MediaWiki bot password authentication flow:
   * 1. Get login token
   * 2. Login with bot password (username@botname:password format)
   * 3. Extract session cookies from response
   */
  private async login(baseUrl: string): Promise<string> {
    const botUsername = process.env.WIKIDATA_BOT_USERNAME;
    const botPassword = process.env.WIKIDATA_BOT_PASSWORD;
    
    if (!botUsername || !botPassword) {
      throw new Error(
        'WIKIDATA_BOT_USERNAME and WIKIDATA_BOT_PASSWORD environment variables are required.\n' +
        'Create a bot account at https://test.wikidata.org\n' +
        'Set up a bot password at https://test.wikidata.org/wiki/Special:BotPasswords\n' +
        'Format: username@botname:password (e.g., "MyBot@MyBot:randompass123")'
      );
    }
    
    // Step 1: Get login token
    const loginTokenUrl = `${baseUrl}?action=query&meta=tokens&type=login&format=json`;
    const loginTokenResponse = await fetch(loginTokenUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'GEMflush/1.0 (https://github.com/your-repo)',
      },
    });
    
    const loginTokenData = await loginTokenResponse.json();
    
    if (loginTokenData.error) {
      throw new Error(`Failed to get login token: ${loginTokenData.error.info || 'Unknown error'}`);
    }
    
    const loginToken = loginTokenData.query?.tokens?.logintoken;
    if (!loginToken) {
      throw new Error('Login token not found in API response');
    }
    
    // Step 2: Login with bot password
    // Bot password format: username@botname:password (e.g., "MyBot@MyBot:randompass123")
    // Split to get username and password parts
    const username = botUsername.includes('@') ? botUsername.split('@')[0] : botUsername;
    
    const loginUrl = baseUrl;
    const loginResponse = await fetch(loginUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'GEMflush/1.0 (https://github.com/your-repo)',
      },
      body: new URLSearchParams({
        action: 'login',
        lgname: username,
        lgpassword: botPassword,
        lgtoken: loginToken,
        format: 'json',
      }),
    });
    
    const loginData = await loginResponse.json();
    
    if (loginData.error) {
      throw new Error(
        `Login failed: ${loginData.error.code || 'unknown'} - ${loginData.error.info || 'Unknown error'}.\n` +
        'Check WIKIDATA_BOT_USERNAME and WIKIDATA_BOT_PASSWORD.'
      );
    }
    
    if (loginData.login?.result !== 'Success') {
      throw new Error(
        `Login failed: ${loginData.login?.result || 'Unknown error'}.\n` +
        `Reason: ${loginData.login?.reason || 'Unknown'}`
      );
    }
    
    // Extract session cookies from response
    // MediaWiki sets multiple cookies (session, userid, username, etc.)
    const cookiesHeader = loginResponse.headers.get('set-cookie');
    if (!cookiesHeader) {
      throw new Error('No session cookies received from login. Authentication failed.');
    }
    
    // Parse cookies - extract key=value pairs
    // Format: "CookieName1=value1; Path=/; HttpOnly, CookieName2=value2; Path=/; HttpOnly"
    const cookies = cookiesHeader
      .split(',')
      .map(cookie => cookie.split(';')[0].trim())
      .join('; ');
    
    console.log(`[REAL] Successfully authenticated as ${username}`);
    this.sessionCookies = cookies; // Cache for reuse (DRY: avoid re-login)
    
    return cookies;
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
    updates: Partial<WikidataEntityData>,
    production: boolean = false
  ): Promise<{ success: boolean; error?: string }> {
    const baseUrl = production ? this.prodBaseUrl : this.testBaseUrl;
    
    try {
      // Production is still mocked
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
          data: JSON.stringify(updates),
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

