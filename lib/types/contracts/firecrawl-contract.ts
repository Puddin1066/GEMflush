// Firecrawl API Contract
// Defines the expected request/response structure for Firecrawl API integration
// SOLID: Interface Segregation - separate contracts for different Firecrawl endpoints

/**
 * Firecrawl Extract API Request Contract
 * Used for structured data extraction from websites
 */
export interface FirecrawlExtractRequest {
  urls: string[];
  prompt?: string;
  schema?: FirecrawlExtractSchema;
  scrapeOptions?: {
    formats?: string[];
    headers?: Record<string, string>;
    includeTags?: string[];
    excludeTags?: string[];
    onlyMainContent?: boolean;
    timeout?: number;
  };
}

/**
 * Firecrawl Extract API Response Contract
 * Standardized response structure from Firecrawl Extract endpoint
 */
export interface FirecrawlExtractResponse {
  success: boolean;
  id?: string;
  urlTrace?: string[];
  data?: FirecrawlExtractedData[];
  extract?: FirecrawlExtractedData[];
  error?: string;
  message?: string;
}

/**
 * Extracted data structure from Firecrawl Extract API
 */
export interface FirecrawlExtractedData {
  url: string;
  extract?: BusinessExtractData;
  // Raw extracted data (varies based on schema)
  [key: string]: any;
}

/**
 * Business-specific extracted data schema
 * Matches our extraction requirements for business information
 */
export interface BusinessExtractData {
  businessName?: string;
  description?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  industry?: string;
  founded?: string;
  services?: string[];
  socialMedia?: {
    facebook?: string;
    instagram?: string;
    twitter?: string;
    linkedin?: string;
  };
  hours?: string;
  website?: string;
}

/**
 * Firecrawl Extract Schema Definition
 * JSON Schema for structured data extraction
 */
export interface FirecrawlExtractSchema {
  type: 'object';
  properties: Record<string, FirecrawlSchemaProperty>;
  required?: string[];
}

export interface FirecrawlSchemaProperty {
  type: string | string[];
  description?: string;
  items?: FirecrawlSchemaProperty;
  properties?: Record<string, FirecrawlSchemaProperty>;
}

/**
 * Firecrawl Traditional Scrape API Response Contract
 * For backward compatibility with traditional scraping
 */
export interface FirecrawlScrapeResponse {
  success: boolean;
  data?: {
    markdown?: string;
    html?: string;
    metadata?: {
      title?: string;
      description?: string;
      language?: string;
      ogTitle?: string;
      ogDescription?: string;
      ogImage?: string;
      canonicalUrl?: string;
      [key: string]: unknown;
    };
  };
  error?: string;
}

/**
 * Firecrawl API Client Contract
 * Interface for interacting with Firecrawl services
 */
export interface IFirecrawlClient {
  /**
   * Extract structured data from a URL using Firecrawl Extract API
   * @param url - URL to extract data from
   * @param options - Extraction options
   * @returns Structured extraction result
   */
  extractStructuredData(
    url: string,
    options?: {
      schema?: FirecrawlExtractSchema;
      prompt?: string;
      useCache?: boolean;
    }
  ): Promise<FirecrawlExtractResponse>;

  /**
   * Multi-page crawl using Firecrawl Crawl API with LLM extraction
   * @param url - Base URL to crawl
   * @param options - Crawl configuration options
   * @returns Crawl result with multi-page data
   */
  crawlWithLLMExtraction(
    url: string,
    options?: {
      maxDepth?: number;
      limit?: number;
      extractionPrompt?: string;
      extractionSchema?: FirecrawlExtractSchema;
      includes?: string[];
      excludes?: string[];
    }
  ): Promise<FirecrawlCrawlResponse>;

  /**
   * Check status of async crawl job
   * @param jobId - Firecrawl job ID
   * @returns Job status and results
   */
  getCrawlJobStatus(jobId: string): Promise<FirecrawlJobStatusResponse>;

  /**
   * Traditional scrape using Firecrawl Scrape API
   * @param url - URL to scrape
   * @param options - Scraping options
   * @returns Scrape result with HTML/Markdown
   */
  scrapeTraditional(
    url: string,
    options?: {
      formats?: string[];
      useCache?: boolean;
    }
  ): Promise<FirecrawlScrapeResponse>;
}

/**
 * Firecrawl API Error Types
 */
export interface FirecrawlApiError {
  code: string;
  message: string;
  details?: any;
}

/**
 * Firecrawl Crawl API Request Contract
 * Used for multi-page crawling and subpage discovery
 */
export interface FirecrawlCrawlRequest {
  url: string;
  crawlerOptions?: {
    includes?: string[];
    excludes?: string[];
    generateImgAltText?: boolean;
    returnOnlyUrls?: boolean;
    maxDepth?: number;
    mode?: 'default' | 'fast';
    ignoreSitemap?: boolean;
    limit?: number;
    allowBackwardCrawling?: boolean;
    allowExternalContentLinks?: boolean;
  };
  pageOptions?: {
    headers?: Record<string, string>;
    includeHtml?: boolean;
    includeRawHtml?: boolean;
    onlyIncludeTags?: string[];
    removeTags?: string[];
    onlyMainContent?: boolean;
    includeLinks?: boolean;
    screenshot?: boolean;
    fullPageScreenshot?: boolean;
    waitFor?: number;
  };
  extractorOptions?: {
    mode?: 'llm-extraction';
    extractionPrompt?: string;
    extractionSchema?: FirecrawlExtractSchema;
  };
}

/**
 * Firecrawl Crawl API Response Contract
 * Response structure for multi-page crawling
 */
export interface FirecrawlCrawlResponse {
  success: boolean;
  id?: string;
  url?: string;
  data?: FirecrawlCrawlPageData[];
  error?: string;
  message?: string;
}

/**
 * Individual page data from Firecrawl Crawl API
 */
export interface FirecrawlCrawlPageData {
  url: string;
  markdown?: string;
  html?: string;
  rawHtml?: string;
  links?: string[];
  screenshot?: string;
  metadata?: {
    title?: string;
    description?: string;
    language?: string;
    sourceURL?: string;
    statusCode?: number;
    error?: string;
    [key: string]: any;
  };
  llm_extraction?: BusinessExtractData;
  extract?: BusinessExtractData;
}

/**
 * Firecrawl Job Status Response
 * For tracking async crawl job progress
 */
export interface FirecrawlJobStatusResponse {
  success: boolean;
  status: 'scraping' | 'completed' | 'failed' | 'cancelled';
  completed?: number;
  total?: number;
  creditsUsed?: number;
  expiresAt?: string;
  data?: FirecrawlCrawlPageData[];
  error?: string;
}

/**
 * Rate limiting configuration for Firecrawl API
 */
export interface FirecrawlRateLimitConfig {
  requestsPerMinute: number;
  minIntervalMs: number;
  retryDelayMs: number;
  maxRetries: number;
}
