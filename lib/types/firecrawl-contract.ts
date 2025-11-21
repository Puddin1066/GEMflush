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
 * Rate limiting configuration for Firecrawl API
 */
export interface FirecrawlRateLimitConfig {
  requestsPerMinute: number;
  minIntervalMs: number;
  retryDelayMs: number;
  maxRetries: number;
}
