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
  private apiKey: string | null;
  private baseUrl = 'https://api.firecrawl.dev';
  private lastRequestTime = 0;
  private readonly MIN_REQUEST_INTERVAL = 7000; // 7 seconds between requests
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
        waitFor: 2000, // Wait 2 seconds for dynamic content
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
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate API delay
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
        const errorText = await response.text();
        if (response.status === 429) {
          throw new Error('Firecrawl Rate Limit Exceeded (429)');
        }
        throw new Error(`Firecrawl Crawl API Error ${response.status}: ${errorText}`);
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
      console.error(`[FIRECRAWL] Crawl failed for ${url}:`, error);
      throw error;
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
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API delay
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
      console.error(`[FIRECRAWL] Job status check failed for ${jobId}:`, error);
      throw error;
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
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    this.lastRequestTime = Date.now();
  }
}

// Export singleton instance
export const firecrawlClient = new EnhancedFirecrawlClient();
