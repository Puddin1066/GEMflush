/**
 * Efficient Wikidata Action API Client
 * 
 * Streamlined client for publishing entities to Wikidata via the Action API.
 * Handles authentication, rate limiting, and error recovery.
 */

import type { 
  WikidataEntity, 
  PublishOptions, 
  PublishResult, 
  WikidataConfig
} from './types';
import { WikidataError, PublishError } from './types';

export class WikidataClient {
  private readonly config: Required<WikidataConfig>;
  private sessionCookies: string | null = null;
  private cookieExpiry: number | null = null;
  private readonly COOKIE_TTL = 30 * 60 * 1000; // 30 minutes

  constructor(config: WikidataConfig = {}) {
    this.config = {
      apiUrl: config.apiUrl || 'https://test.wikidata.org/w/api.php',
      userAgent: config.userAgent || 'WikidataClient/1.0 (Streamlined)',
      timeout: config.timeout || 30000,
      retryAttempts: config.retryAttempts || 3,
      maxProperties: config.maxProperties || 10,
      enableCaching: config.enableCaching ?? true,
      validateEntities: config.validateEntities ?? true
    };
  }

  /**
   * Publish entity to Wikidata
   */
  async publishEntity(
    entity: WikidataEntity,
    options: PublishOptions = { target: 'test' }
  ): Promise<PublishResult> {
    const startTime = Date.now();
    
    try {
      // Validate entity if enabled
      if (this.config.validateEntities) {
        this.validateEntity(entity);
      }

      // Handle dry run
      if (options.dryRun) {
        return this.handleDryRun(entity, options);
      }

      // Handle validation only
      if (options.validateOnly) {
        return this.handleValidationOnly(entity, options);
      }

      // Set API URL based on target
      const apiUrl = options.target === 'production' 
        ? 'https://www.wikidata.org/w/api.php'
        : 'https://test.wikidata.org/w/api.php';

      // Check for mock mode
      if (process.env.WIKIDATA_PUBLISH_MODE === 'mock') {
        return this.handleMockMode(entity, options);
      }

      // Authenticate and get token
      const { token, cookies } = await this.authenticate(apiUrl);

      // Prepare entity data
      const entityData = this.prepareEntityData(entity, options);

      // Make API call
      const result = await this.callWikidataAPI(apiUrl, {
        action: 'wbeditentity',
        new: 'item',
        data: JSON.stringify(entityData),
        token,
        format: 'json',
        summary: 'Created via streamlined Wikidata client'
      }, cookies);

      // Process result
      return this.processAPIResult(result, options, Date.now() - startTime);

    } catch (error) {
      console.error('Entity publication failed:', error);
      return {
        success: false,
        publishedTo: options.target === 'production' ? 'wikidata.org' : 'test.wikidata.org',
        propertiesPublished: 0,
        referencesPublished: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Update existing entity
   */
  async updateEntity(
    qid: string,
    entity: WikidataEntity,
    options: PublishOptions = { target: 'test' }
  ): Promise<PublishResult> {
    try {
      const apiUrl = options.target === 'production' 
        ? 'https://www.wikidata.org/w/api.php'
        : 'https://test.wikidata.org/w/api.php';

      if (process.env.WIKIDATA_PUBLISH_MODE === 'mock') {
        return {
          success: true,
          qid,
          publishedTo: options.target === 'production' ? 'wikidata.org' : 'test.wikidata.org',
          propertiesPublished: Object.keys(entity.claims).length,
          referencesPublished: this.countReferences(entity)
        };
      }

      const { token, cookies } = await this.authenticate(apiUrl);
      const entityData = this.prepareEntityData(entity, options);

      const result = await this.callWikidataAPI(apiUrl, {
        action: 'wbeditentity',
        id: qid,
        data: JSON.stringify(entityData),
        token,
        format: 'json',
        summary: 'Updated via streamlined Wikidata client'
      }, cookies);

      return this.processAPIResult(result, options, 0);

    } catch (error) {
      console.error('Entity update failed:', error);
      return {
        success: false,
        publishedTo: options.target === 'production' ? 'wikidata.org' : 'test.wikidata.org',
        propertiesPublished: 0,
        referencesPublished: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Authenticate with Wikidata
   */
  private async authenticate(apiUrl: string): Promise<{ token: string; cookies: string }> {
    // Check if we have valid cached cookies
    if (this.sessionCookies && this.cookieExpiry && Date.now() < this.cookieExpiry) {
      const token = await this.getCSRFToken(apiUrl, this.sessionCookies);
      return { token, cookies: this.sessionCookies };
    }

    // Perform login
    const cookies = await this.login(apiUrl);
    const token = await this.getCSRFToken(apiUrl, cookies);

    // Cache session
    this.sessionCookies = cookies;
    this.cookieExpiry = Date.now() + this.COOKIE_TTL;

    return { token, cookies };
  }

  /**
   * Login to Wikidata
   * SOLID: Single Responsibility - handles authentication flow
   * DRY: Reuses makeRequest for token and login requests
   */
  private async login(apiUrl: string): Promise<string> {
    const username = process.env.WIKIDATA_BOT_USERNAME;
    const password = process.env.WIKIDATA_BOT_PASSWORD;

    if (!username || !password) {
      throw new WikidataError(
        'WIKIDATA_BOT_USERNAME and WIKIDATA_BOT_PASSWORD environment variables are required',
        'AUTH_ERROR'
      );
    }

    // Step 1: Get login token (MediaWiki requires cookies from this request for login)
    const tokenResult = await this.makeRequest(apiUrl, {
      action: 'query',
      meta: 'tokens',
      type: 'login',
      format: 'json'
    });

    const loginToken = tokenResult.data.query?.tokens?.logintoken;
    if (!loginToken) {
      throw new WikidataError('Failed to get login token', 'AUTH_ERROR');
    }

    // Step 2: Perform login with token cookies (critical for MediaWiki authentication)
    // Include cookies from token request to maintain session continuity
    const tokenCookies = tokenResult.cookies || '';
    const loginResult = await this.makeRequest(apiUrl, {
      action: 'login',
      lgname: username,
      lgpassword: password,
      lgtoken: loginToken,
      format: 'json'
    }, 'POST', tokenCookies);

    if (loginResult.data.login?.result !== 'Success') {
      const errorCode = loginResult.data.login?.result || 'Unknown error';
      const errorMessage = loginResult.data.login?.message || '';
      throw new WikidataError(
        `Login failed: ${errorCode}${errorMessage ? ` - ${errorMessage}` : ''}`,
        'AUTH_ERROR'
      );
    }

    // Step 3: Extract cookies from login response
    // Combine token cookies with login cookies for full session
    const loginCookies = loginResult.cookies || '';
    if (!loginCookies && !tokenCookies) {
      throw new WikidataError('No session cookies received from login', 'AUTH_ERROR');
    }

    // Combine cookies: prefer login cookies, fallback to token cookies
    const sessionCookies = loginCookies || tokenCookies;
    return sessionCookies;
  }

  /**
   * Get CSRF token
   * SOLID: Single Responsibility - retrieves CSRF token for authenticated requests
   */
  private async getCSRFToken(apiUrl: string, cookies: string): Promise<string> {
    const result = await this.makeRequest(apiUrl, {
      action: 'query',
      meta: 'tokens',
      type: 'csrf',
      format: 'json'
    }, 'GET', cookies);

    const token = result.data.query?.tokens?.csrftoken;
    if (!token) {
      throw new WikidataError('Failed to get CSRF token', 'AUTH_ERROR');
    }

    return token;
  }

  /**
   * Make HTTP request with retry logic
   * SOLID: Single Responsibility - handles HTTP requests with cookie management
   * DRY: Centralized request logic with retry and cookie extraction
   */
  private async makeRequest(
    url: string,
    params: Record<string, string>,
    method: 'GET' | 'POST' = 'GET',
    cookies?: string
  ): Promise<{ data: any; cookies?: string }> {
    const headers: Record<string, string> = {
      'User-Agent': this.config.userAgent
    };

    if (cookies) {
      headers['Cookie'] = cookies;
    }

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

        let response: Response;

        if (method === 'POST') {
          headers['Content-Type'] = 'application/x-www-form-urlencoded';
          response = await fetch(url, {
            method: 'POST',
            headers,
            body: new URLSearchParams(params),
            signal: controller.signal
          });
        } else {
          const urlWithParams = new URL(url);
          Object.entries(params).forEach(([key, value]) => {
            urlWithParams.searchParams.append(key, value);
          });
          
          response = await fetch(urlWithParams.toString(), {
            method: 'GET',
            headers,
            signal: controller.signal
          });
        }

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorText = await response.text().catch(() => 'Unknown error');
          throw new Error(`HTTP ${response.status}: ${errorText}`);
        }

        // Extract cookies from response headers (critical for MediaWiki authentication)
        const setCookieHeader = response.headers.get('set-cookie');
        let extractedCookies: string | undefined;
        if (setCookieHeader) {
          // Parse cookies: split by comma, take first part before semicolon, join with semicolon
          extractedCookies = setCookieHeader
            .split(',')
            .map(cookie => cookie.split(';')[0].trim())
            .join('; ');
        }

        const data = await response.json();

        return {
          data,
          cookies: extractedCookies
        };

      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        
        if (attempt < this.config.retryAttempts) {
          const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
          console.warn(`Request failed (attempt ${attempt}), retrying in ${delay}ms:`, error);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw new WikidataError(
      `Request failed after ${this.config.retryAttempts} attempts: ${lastError?.message}`,
      'NETWORK_ERROR',
      { lastError }
    );
  }

  /**
   * Call Wikidata API
   * SOLID: Single Responsibility - wrapper for API calls with authentication
   */
  private async callWikidataAPI(
    apiUrl: string,
    params: Record<string, string>,
    cookies: string
  ): Promise<any> {
    const result = await this.makeRequest(apiUrl, params, 'POST', cookies);
    return result.data;
  }

  /**
   * Prepare entity data for API
   */
  private prepareEntityData(entity: WikidataEntity, options: PublishOptions): WikidataEntity {
    const prepared = { ...entity };

    // Limit properties if specified
    if (options.maxProperties && options.maxProperties > 0) {
      const propertyKeys = Object.keys(prepared.claims);
      if (propertyKeys.length > options.maxProperties) {
        const limitedClaims: Record<string, any> = {};
        propertyKeys.slice(0, options.maxProperties).forEach(key => {
          limitedClaims[key] = prepared.claims[key];
        });
        prepared.claims = limitedClaims;
      }
    }

    // Remove references if not requested
    if (!options.includeReferences) {
      Object.values(prepared.claims).forEach(claimArray => {
        claimArray.forEach(claim => {
          delete claim.references;
        });
      });
    }

    return prepared;
  }

  /**
   * Process API result
   */
  private processAPIResult(
    result: any,
    options: PublishOptions,
    duration: number
  ): PublishResult {
    if (result.error) {
      throw new PublishError(
        `API error: ${result.error.info || result.error.code || 'Unknown error'}`,
        result.error
      );
    }

    if (result.success && result.entity?.id) {
      const qid = result.entity.id;
      const propertiesPublished = Object.keys(result.entity.claims || {}).length;
      const referencesPublished = this.countReferencesInResult(result.entity);

      console.log(`Entity published successfully: ${qid} (${duration}ms)`);

      return {
        success: true,
        qid,
        entityId: result.entity.id,
        publishedTo: options.target === 'production' ? 'wikidata.org' : 'test.wikidata.org',
        propertiesPublished,
        referencesPublished
      };
    }

    throw new PublishError('Unexpected API response format', result);
  }

  /**
   * Handle dry run mode
   */
  private handleDryRun(entity: WikidataEntity, options: PublishOptions): PublishResult {
    console.log('[DRY RUN] Entity would be published:', JSON.stringify(entity, null, 2));
    
    return {
      success: true,
      qid: 'Q999999999', // Mock QID
      publishedTo: `${options.target} (dry run)`,
      propertiesPublished: Object.keys(entity.claims).length,
      referencesPublished: this.countReferences(entity)
    };
  }

  /**
   * Handle validation only mode
   */
  private handleValidationOnly(entity: WikidataEntity, options: PublishOptions): PublishResult {
    try {
      this.validateEntity(entity);
      console.log('[VALIDATION] Entity is valid');
      
      return {
        success: true,
        publishedTo: `${options.target} (validation only)`,
        propertiesPublished: Object.keys(entity.claims).length,
        referencesPublished: this.countReferences(entity)
      };
    } catch (error) {
      return {
        success: false,
        publishedTo: `${options.target} (validation only)`,
        propertiesPublished: 0,
        referencesPublished: 0,
        error: error instanceof Error ? error.message : 'Validation failed'
      };
    }
  }

  /**
   * Handle mock mode
   */
  private handleMockMode(entity: WikidataEntity, options: PublishOptions): PublishResult {
    const mockQID = `Q${999999000 + Math.floor(Math.random() * 1000)}`;
    
    console.log(`[MOCK] Publishing to ${options.target}:`, {
      qid: mockQID,
      properties: Object.keys(entity.claims).length,
      references: this.countReferences(entity)
    });

    return {
      success: true,
      qid: mockQID,
      publishedTo: `${options.target} (mock)`,
      propertiesPublished: Object.keys(entity.claims).length,
      referencesPublished: this.countReferences(entity)
    };
  }

  /**
   * Validate entity structure
   */
  private validateEntity(entity: WikidataEntity): void {
    if (!entity.labels || Object.keys(entity.labels).length === 0) {
      throw new WikidataError('Entity must have at least one label', 'VALIDATION_ERROR');
    }

    if (!entity.claims || Object.keys(entity.claims).length === 0) {
      throw new WikidataError('Entity must have at least one claim', 'VALIDATION_ERROR');
    }

    // Validate required properties
    if (!entity.claims['P31']) {
      throw new WikidataError('Entity must have P31 (instance of) property', 'VALIDATION_ERROR');
    }

    // Validate property count
    const propertyCount = Object.keys(entity.claims).length;
    if (propertyCount > this.config.maxProperties) {
      throw new WikidataError(
        `Too many properties: ${propertyCount} > ${this.config.maxProperties}`,
        'VALIDATION_ERROR'
      );
    }
  }

  /**
   * Count references in entity
   */
  private countReferences(entity: WikidataEntity): number {
    return Object.values(entity.claims)
      .flat()
      .reduce((count, claim) => count + (claim.references?.length || 0), 0);
  }

  /**
   * Count references in API result
   */
  private countReferencesInResult(entityResult: any): number {
    if (!entityResult.claims) return 0;
    
    return Object.values(entityResult.claims)
      .flat()
      .reduce((count: number, claim: any) => count + (claim.references?.length || 0), 0);
  }

}
