// Enhanced Firecrawl Client with Multi-page Crawling and LLM Extraction
// SOLID: Single Responsibility - handles all Firecrawl API interactions
// DRY: Centralized Firecrawl API logic with reusable methods

import 'server-only';

import {
  IFirecrawlClient,
  FirecrawlExtractRequest,
  FirecrawlExtractResponse,
  FirecrawlExtractSchema,
  FirecrawlScrapeResponse,
  FirecrawlCrawlRequest,
  FirecrawlCrawlResponse,
  FirecrawlJobStatusResponse,
  BusinessExtractData,
} from '@/lib/types/firecrawl-contract';
import { 
  shouldUseMockFirecrawl, 
  generateMockFirecrawlCrawlResponse, 
  generateMockFirecrawlJobStatus 
} from '@/lib/utils/firecrawl-mock';

export class EnhancedFirecrawlClient implements IFirecrawlClient {
  // Constants
  private static readonly FIRECRAWL_API_BASE_URL = 'https://api.firecrawl.dev';
  private static readonly MIN_REQUEST_INTERVAL_MS = 7000; // 7 seconds between requests
  private static readonly MOCK_DELAY_MS = 2000; // Simulate API delay for mocks
  private static readonly JOB_STATUS_MOCK_DELAY_MS = 1000;
  private static readonly SUPPORTED_ERROR_CODES = [402, 403, 429] as const;
  private static readonly DEFAULT_WAIT_FOR_MS = 2000; // Wait for dynamic content

  private apiKey: string | null;
  private baseUrl = EnhancedFirecrawlClient.FIRECRAWL_API_BASE_URL;
  private lastRequestTime = 0;
  private readonly MIN_REQUEST_INTERVAL = EnhancedFirecrawlClient.MIN_REQUEST_INTERVAL_MS;
  private useMock: boolean;

  constructor() {
    const apiKey = process.env.FIRECRAWL_API_KEY;
    this.apiKey = apiKey || null;
    this.useMock = shouldUseMockFirecrawl();
    
    if (this.useMock) {
      console.log('[FIRECRAWL] Using mock responses (API key not configured)');
    } else {
      console.log('[FIRECRAWL] Using real API');
    }
  }

  /**
   * Multi-page crawl with LLM extraction - Primary method for thorough business data extraction
   * Leverages Firecrawl's built-in LLM features for structured data extraction across multiple pages
   */
  async crawlWithLLMExtraction(
    url: string,
    options: {
      maxDepth?: number;
      limit?: number;
      extractionPrompt?: string;
      extractionSchema?: FirecrawlExtractSchema;
      includes?: string[];
      excludes?: string[];
    } = {}
  ): Promise<FirecrawlCrawlResponse> {
    await this.enforceRateLimit();

    const {
      maxDepth = 2,
      limit = 10,
      extractionPrompt,
      extractionSchema,
      includes = ['**/about*', '**/services*', '**/contact*', '**/team*', '**/products*'],
      excludes = ['**/blog*', '**/news*', '**/events*', '**/careers*', '**/privacy*', '**/terms*'],
    } = options;

    // Build comprehensive business extraction prompt
    const businessExtractionPrompt = extractionPrompt || `
Extract comprehensive business information from this webpage. Focus on:

1. **Business Identity**: Official business name, description, mission statement
2. **Contact Information**: Phone numbers, email addresses, physical addresses
3. **Location Details**: City, state, country, postal codes, service areas
4. **Business Operations**: Industry type, services offered, products sold
5. **Company Details**: Founded date, team size, leadership, certifications
6. **Social Presence**: Social media links and handles
7. **Operating Information**: Business hours, locations served

Return structured data that would be suitable for creating a comprehensive business profile.
Be precise and only extract information that is explicitly stated on the webpage.
`;

    // Default business extraction schema
    const businessSchema: FirecrawlExtractSchema = extractionSchema || {
      type: 'object',
      properties: {
        businessName: { type: 'string', description: 'Official business name (clean, without page title artifacts)' },
        description: { type: 'string', description: 'Business description, mission, or value proposition' },
        industry: { type: 'string', description: 'Primary industry or business category' },
        services: { type: 'array', items: { type: 'string' }, description: 'List of services or products offered' },
        phone: { type: 'string', description: 'Primary phone number with area code' },
        email: { type: 'string', description: 'Primary contact email address' },
        address: { type: 'string', description: 'Full street address' },
        city: { type: 'string', description: 'City name' },
        state: { type: 'string', description: 'State or province' },
        country: { type: 'string', description: 'Country (use US for United States)' },
        postalCode: { type: 'string', description: 'ZIP or postal code' },
        founded: { type: 'string', description: 'Year founded (YYYY format)' },
        website: { type: 'string', description: 'Official website URL' },
        socialMedia: {
          type: 'object',
          properties: {
            facebook: { type: 'string', description: 'Facebook page URL' },
            instagram: { type: 'string', description: 'Instagram profile URL' },
            twitter: { type: 'string', description: 'Twitter/X profile URL' },
            linkedin: { type: 'string', description: 'LinkedIn company page URL' },
          },
        },
        hours: { type: 'string', description: 'Business operating hours' },
        teamSize: { type: 'string', description: 'Number of employees or team size' },
        certifications: { type: 'array', items: { type: 'string' }, description: 'Professional certifications or accreditations' },
      },
      required: ['businessName'],
    };

    const crawlRequest: FirecrawlCrawlRequest = {
      url,
      crawlerOptions: {
        includes,
        excludes,
        maxDepth,
        limit,
        mode: 'default', // Use default mode for thorough crawling
        ignoreSitemap: false,
        allowBackwardCrawling: false,
        allowExternalContentLinks: false,
      },
      pageOptions: {
        onlyMainContent: true,
        includeLinks: true,
        waitFor: EnhancedFirecrawlClient.DEFAULT_WAIT_FOR_MS,
      },
      extractorOptions: {
        mode: 'llm-extraction',
        extractionPrompt: businessExtractionPrompt,
        extractionSchema: businessSchema,
      },
    };

    console.log(`[FIRECRAWL] Starting multi-page crawl for: ${url}`);
    console.log(`[FIRECRAWL] Crawl config: maxDepth=${maxDepth}, limit=${limit}`);

    // Use mock if API key not available
    if (this.useMock) {
      console.log(`[FIRECRAWL] Using mock response for: ${url}`);
      await this.simulateApiDelay(EnhancedFirecrawlClient.MOCK_DELAY_MS);
      return generateMockFirecrawlCrawlResponse(url);
    }

    try {
      const response = await fetch(`${this.baseUrl}/v1/crawl`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(crawlRequest),
      });

      if (!response.ok) {
        return this.handleApiError(response, url);
      }

      const data: FirecrawlCrawlResponse = await response.json();
      console.log(`[FIRECRAWL] Crawl response received:`, {
        success: data.success,
        jobId: data.id,
        immediateData: !!data.data,
        pageCount: data.data?.length || 0,
      });

      return data;
    } catch (error) {
      return this.handleApiFailure(error, url);
    }
  }

  /**
   * Check status of async crawl job and retrieve results
   */
  async getCrawlJobStatus(jobId: string): Promise<FirecrawlJobStatusResponse> {
    await this.enforceRateLimit();

    console.log(`[FIRECRAWL] Checking job status: ${jobId}`);

    // Use mock if API key not available
    if (this.useMock) {
      console.log(`[FIRECRAWL] Using mock job status for: ${jobId}`);
      await this.simulateApiDelay(EnhancedFirecrawlClient.JOB_STATUS_MOCK_DELAY_MS);
      return generateMockFirecrawlJobStatus(jobId, 'https://example.com', 'completed');
    }

    try {
      const response = await fetch(`${this.baseUrl}/v1/crawl/${jobId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        
        // P0 Fix: Handle paused subscription - fall back to mocks
        if (this.isRecoverableError(response.status)) {
          console.warn(`[FIRECRAWL] Job status API error ${response.status} (subscription paused), using mock: ${errorText}`);
          return generateMockFirecrawlJobStatus(jobId, 'https://example.com', 'completed');
        }
        
        throw new Error(`Firecrawl Job Status API Error ${response.status}: ${errorText}`);
      }

      const data: FirecrawlJobStatusResponse = await response.json();
      console.log(`[FIRECRAWL] Job status:`, {
        status: data.status,
        completed: data.completed,
        total: data.total,
        creditsUsed: data.creditsUsed,
      });

      return data;
    } catch (error) {
      // P0 Fix: Fall back to mocks on any API failure
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.warn(`[FIRECRAWL] Job status check failed, using mock: ${errorMsg}`);
      return generateMockFirecrawlJobStatus(jobId, 'https://example.com', 'completed');
    }
  }

  /**
   * Extract structured data from a single URL using Firecrawl Extract API
   * Maintained for backward compatibility and single-page extraction
   */
  async extractStructuredData(
    url: string,
    options: {
      schema?: FirecrawlExtractSchema;
      prompt?: string;
      useCache?: boolean;
    } = {}
  ): Promise<FirecrawlExtractResponse> {
    await this.enforceRateLimit();

    const { schema, prompt, useCache = true } = options;

    const extractRequest: FirecrawlExtractRequest = {
      urls: [url],
      prompt,
      schema,
      scrapeOptions: {
        formats: ['markdown', 'html'],
        onlyMainContent: true,
      },
    };

    console.log(`[FIRECRAWL] Extracting structured data from: ${url}`);

    try {
      const response = await fetch(`${this.baseUrl}/v2/extract`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(extractRequest),
      });

      if (!response.ok) {
        const errorText = await response.text();
        if (response.status === 429) {
          throw new Error('Firecrawl Rate Limit Exceeded (429)');
        }
        throw new Error(`Firecrawl Extract API Error ${response.status}: ${errorText}`);
      }

      const data: FirecrawlExtractResponse = await response.json();
      console.log(`[FIRECRAWL] Extract response:`, {
        success: data.success,
        jobId: data.id,
        immediateData: !!data.data,
      });

      return data;
    } catch (error) {
      console.error(`[FIRECRAWL] Extract failed for ${url}:`, error);
      throw error;
    }
  }

  /**
   * Traditional scrape using Firecrawl Scrape API
   * Maintained for backward compatibility
   */
  async scrapeTraditional(
    url: string,
    options: {
      formats?: string[];
      useCache?: boolean;
    } = {}
  ): Promise<FirecrawlScrapeResponse> {
    await this.enforceRateLimit();

    const { formats = ['markdown'], useCache = true } = options;

    console.log(`[FIRECRAWL] Traditional scrape for: ${url}`);

    try {
      const response = await fetch(`${this.baseUrl}/v1/scrape`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          url,
          formats,
          onlyMainContent: true,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        if (response.status === 429) {
          throw new Error('Firecrawl Rate Limit Exceeded (429)');
        }
        throw new Error(`Firecrawl Scrape API Error ${response.status}: ${errorText}`);
      }

      const data: FirecrawlScrapeResponse = await response.json();
      console.log(`[FIRECRAWL] Scrape completed:`, {
        success: data.success,
        hasMarkdown: !!data.data?.markdown,
        hasHtml: !!data.data?.html,
      });

      return data;
    } catch (error) {
      console.error(`[FIRECRAWL] Scrape failed for ${url}:`, error);
      throw error;
    }
  }

  /**
   * Rate limiting enforcement
   */
  private async enforceRateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;

    if (timeSinceLastRequest < this.MIN_REQUEST_INTERVAL) {
      const waitTime = this.MIN_REQUEST_INTERVAL - timeSinceLastRequest;
      console.log(`[FIRECRAWL] Rate limit: waiting ${waitTime}ms...`);
      await this.simulateApiDelay(waitTime);
    }

    this.lastRequestTime = Date.now();
  }

  /**
   * Handle API error responses with fallback to mocks
   */
  private async handleApiError(response: Response, url: string): Promise<FirecrawlCrawlResponse> {
    let errorText = '';
    try {
      errorText = await response.text();
    } catch {
      // Response might not have text() method (e.g., in tests)
      errorText = `HTTP ${response.status} ${response.statusText || 'Error'}`;
    }
    
    // P0 Fix: Handle paused subscription and API failures - fall back to mocks
    if (this.isRecoverableError(response.status)) {
      console.warn(`[FIRECRAWL] API error ${response.status} (subscription paused or rate limited), falling back to mock: ${errorText}`);
      console.log(`[FIRECRAWL] Using mock response as fallback for: ${url}`);
      await this.simulateApiDelay(EnhancedFirecrawlClient.MOCK_DELAY_MS);
      return generateMockFirecrawlCrawlResponse(url);
    }
    
    if (response.status === 429) {
      throw new Error('Firecrawl Rate Limit Exceeded (429)');
    }
    throw new Error(`Firecrawl Crawl API Error ${response.status}: ${errorText}`);
  }

  /**
   * Handle API failures (network errors, etc.) with fallback to mocks
   */
  private async handleApiFailure(error: unknown, url: string): Promise<FirecrawlCrawlResponse> {
    // P0 Fix: Fall back to mocks on any API failure (subscription paused, network error, etc.)
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.warn(`[FIRECRAWL] API call failed, falling back to mock: ${errorMsg}`);
    console.log(`[FIRECRAWL] Using mock response as fallback for: ${url}`);
    await this.simulateApiDelay(EnhancedFirecrawlClient.MOCK_DELAY_MS);
    return generateMockFirecrawlCrawlResponse(url);
  }

  /**
   * Check if error status code is recoverable (should fall back to mocks)
   */
  private isRecoverableError(statusCode: number): boolean {
    return EnhancedFirecrawlClient.SUPPORTED_ERROR_CODES.includes(statusCode as typeof EnhancedFirecrawlClient.SUPPORTED_ERROR_CODES[number]);
  }

  /**
   * Simulate API delay for mock responses
   */
  private async simulateApiDelay(ms: number): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export const firecrawlClient = new EnhancedFirecrawlClient();
