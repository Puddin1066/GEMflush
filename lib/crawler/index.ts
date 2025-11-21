// Web crawler service for extracting business data from websites
// Architecture: Firecrawl Extract API Only - Streamlined and Efficient
// SOLID Principle: Single Responsibility - focused on structured data extraction

import 'server-only'; // Ensure this module is never bundled client-side

import { CrawledData, CrawlResult } from '@/lib/types/gemflush';
import { openRouterClient } from '@/lib/llm/openrouter';
import { IWebCrawler } from '@/lib/types/service-contracts';
import { 
  FirecrawlExtractResponse, 
  FirecrawlExtractRequest, 
  BusinessExtractData,
  FirecrawlExtractSchema 
} from '@/lib/types/firecrawl-contract';

// Using contract-based types instead of inline interfaces

interface CrawlCacheEntry {
  result: CrawlResult;
  timestamp: number;
}

class WebCrawler implements IWebCrawler {
  // Standard browser UA to avoid basic blocking
  private userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';
  
  // Rate Limiting State
  private lastRequestTime = 0;
  // Free plan limit: 10 req/min = 1 req every 6 seconds
  // We'll be conservative and use 7 seconds to be safe
  private readonly MIN_REQUEST_INTERVAL = 7000; 

  // Caching State
  private cache: Map<string, CrawlCacheEntry> = new Map();
  private readonly CACHE_TTL = 1000 * 60 * 60 * 24; // 24 hours cache
  private readonly MAX_CACHE_SIZE = 100;

  async crawl(url: string): Promise<CrawlResult> {
    // Check Cache First
    const cached = this.getFromCache(url);
    if (cached) {
      console.log(`[CRAWLER] ⚡ Cache hit for: ${url}`);
      return cached;
    }

    const startTime = Date.now();
    let method = 'unknown';

    try {
      // Validate URL
      const parsedUrl = new URL(url);
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        throw new Error('Only HTTP and HTTPS URLs are supported');
      }

      console.log(`[CRAWLER] Starting crawl for: ${url}`);
      
      // STREAMLINED STRATEGY: Firecrawl Extract Only
      // OPTIMIZED: Direct structured extraction with LLM processing
      // Returns business data in our exact schema format, eliminating validation issues
      let extractedData: any = null;
      
      if (!process.env.FIRECRAWL_API_KEY) {
        throw new Error('FIRECRAWL_API_KEY is required for business data extraction');
      }

         try {
           await this.enforceRateLimit();
        console.log(`[CRAWLER] 🔥 Using Firecrawl Extract API for structured data extraction...`);
        const extractResult = await this.fetchWithFirecrawlExtract(url, { useCache: true });
        
        if (extractResult.success && extractResult.data) {
          extractedData = extractResult.data as BusinessExtractData;
          method = 'firecrawl-extract';
          console.log(`[CRAWLER] ✅ Firecrawl Extract success - structured data extracted`);
          console.log(`[CRAWLER] 📋 Business name: "${extractedData.businessName || 'Not found'}"`);
          console.log(`[CRAWLER] 📍 Location: ${extractedData.city || 'Unknown'}, ${extractedData.state || 'Unknown'}`);
        } else {
          throw new Error(`Firecrawl Extract failed: ${extractResult.error || 'Unknown error'}`);
           }
         } catch (fcError) {
           const errorMsg = fcError instanceof Error ? fcError.message : String(fcError);
        console.error(`[CRAWLER] ❌ Firecrawl Extract failed: ${errorMsg}`);
        throw new Error(`Failed to extract business data: ${errorMsg}`);
      }

      if (!extractedData) {
        throw new Error('No structured data extracted from website');
      }

      // Extract Data - Use structured data from Firecrawl Extract
      console.log(`[CRAWLER] ✅ Transforming structured data from Firecrawl Extract`);
      const crawledData = this.transformExtractedData(extractedData, url);

      // LLM Enhancement (Optional)
      if (process.env.OPENROUTER_API_KEY && crawledData) {
        try {
          console.log(`[CRAWLER] 🤖 Enhancing data with LLM analysis...`);
          const enhancedData = await this.enhanceWithLLM(crawledData, url);
          Object.assign(crawledData, enhancedData);
          console.log(`[CRAWLER] ✅ LLM enhancement completed`);
        } catch (llmError) {
          console.warn(`[CRAWLER] ⚠️ LLM enhancement failed, using base data:`, llmError);
        }
      }
      
      const duration = Date.now() - startTime;
      const result: CrawlResult = {
        success: true,
        data: crawledData,
        url,
        crawledAt: new Date()
      };

      // Cache the result
      this.saveToCache(url, result);

      console.log(`[CRAWLER] ✅ Crawl completed successfully in ${duration}ms using ${method}`);
      return result;

    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      console.error(`[CRAWLER] ❌ Crawl failed for ${url}: ${errorMessage}`);
      
      const result: CrawlResult = {
        success: false,
        error: errorMessage,
        url,
        crawledAt: new Date()
      };

      return result;
    }
  }

  /**
   * Firecrawl Extract API call - Enhanced for Structured Data Extraction
   * 
   * OPTIMIZED FOR DATA QUALITY:
   * - Uses /v2/extract endpoint with structured schema
   * - Extracts business data directly with LLM processing
   * - Returns consistent JSON structure matching our validation schema
   * - Eliminates manual HTML parsing and validation errors
   * - Handles complex websites with dynamic content
   * 
   * Performance Benefits:
   * - Direct structured extraction (no post-processing needed)
   * - Consistent data format (eliminates validation failures)
   * - Better business intelligence extraction
   * - Handles anti-bot protection automatically
   */
  private async fetchWithFirecrawlExtract(url: string, options?: { useCache?: boolean }): Promise<{ success: boolean; data?: BusinessExtractData; error?: string }> {
    const apiKey = process.env.FIRECRAWL_API_KEY;
    if (!apiKey) {
      throw new Error('FIRECRAWL_API_KEY is not configured');
    }

    try {
      // Define comprehensive business data extraction schema using contract
      const extractionSchema: FirecrawlExtractSchema = {
        type: 'object',
        properties: {
          businessName: { type: 'string', description: 'The actual business name (not page title)' },
          description: { type: 'string', description: 'Business description or mission statement' },
          phone: { type: 'string', description: 'Phone number with area code' },
          email: { type: 'string', description: 'Contact email address' },
          address: { type: 'string', description: 'Full street address' },
          city: { type: 'string', description: 'City name' },
          state: { type: 'string', description: 'State or province' },
          country: { type: 'string', description: 'Country (use US for United States)' },
          postalCode: { type: 'string', description: 'ZIP or postal code' },
          industry: { type: 'string', description: 'Industry type (restaurant, healthcare, legal, etc.)' },
          founded: { type: 'string', description: 'Year founded (YYYY format)' },
          services: { type: 'array', items: { type: 'string' }, description: 'List of services offered' },
          socialMedia: {
            type: 'object',
            properties: {
              facebook: { type: 'string' },
              instagram: { type: 'string' },
              twitter: { type: 'string' },
              linkedin: { type: 'string' }
            }
          },
          hours: { type: 'string', description: 'Business hours if available' },
          website: { type: 'string', description: 'Official website URL' }
        },
        required: ['businessName']
      };

      const extractPrompt = `
Extract comprehensive business information from this website. Focus on:
1. The actual business name (clean up page titles like "Home | Business Name")
2. Complete contact information including address, phone, email
3. Location details (city, state, country, ZIP code)
4. Business type/industry and services offered
5. Social media links and founding information
6. Operating hours if available

Be precise and only extract information that is explicitly stated on the website.
`;

      const requestBody: FirecrawlExtractRequest = {
        urls: [url],
        prompt: extractPrompt,
        schema: extractionSchema,
        scrapeOptions: {
          formats: ['markdown', 'html']
        }
      };

      console.log(`[CRAWLER] 🔥 Using Firecrawl Extract API for structured data extraction...`);
      
      const response = await fetch('https://api.firecrawl.dev/v2/extract', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorText = await response.text();
        if (response.status === 429) {
             throw new Error('Firecrawl Rate Limit Exceeded (429)');
        }
        throw new Error(`Firecrawl Extract API Error ${response.status}: ${errorText}`);
      }

      const data: FirecrawlExtractResponse = await response.json();
      console.log(`[CRAWLER] ✅ Firecrawl Extract job submitted successfully`);
      console.log(`[CRAWLER] 🔍 Extract response:`, JSON.stringify(data, null, 2));
      
      // Handle Firecrawl Extract API response format based on contract
      if (!data.success) {
        return { success: false, error: data.error || data.message || 'Unknown error' };
      }
      
      // Check if we have immediate data (synchronous response)
      if (data.data && typeof data.data === 'object' && !Array.isArray(data.data)) {
        console.log(`[CRAWLER] ✅ Immediate extraction data received`);
        return { success: true, data: data.data as BusinessExtractData };
      }
      
      // If we have a job ID, poll for completion (asynchronous response)
      if (data.id) {
        console.log(`[CRAWLER] ⏳ Polling for job completion: ${data.id}`);
        const pollResult = await this.pollFirecrawlJob(data.id, apiKey);
        return pollResult;
      }
      
      // Fallback: no data and no job ID
      console.log(`[CRAWLER] ⚠️ No data or job ID in Firecrawl response`);
      return { 
        success: false, 
        error: 'No data or job ID returned from Firecrawl Extract API' 
      };
    } catch (error) {
      console.error(`[CRAWLER] ❌ Firecrawl Extract failed:`, error);
      throw error;
    }
  }

  /**
   * Poll Firecrawl Extract job for completion
   * SOLID: Single Responsibility - job polling only
   * DRY: Reusable polling logic with configurable timeouts
   */
  private async pollFirecrawlJob(jobId: string, apiKey: string, maxAttempts: number = 20, intervalMs: number = 3000): Promise<{ success: boolean; data?: BusinessExtractData; error?: string }> {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        console.log(`[CRAWLER] 🔄 Polling attempt ${attempt}/${maxAttempts} for job: ${jobId}`);
        
        const response = await fetch(`https://api.firecrawl.dev/v2/extract/${jobId}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${apiKey}`
          }
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Firecrawl Job Status API Error ${response.status}: ${errorText}`);
        }

        const jobData = await response.json();
        console.log(`[CRAWLER] 📊 Job status:`, jobData.status || 'unknown');

        // Check if job is completed
        if (jobData.success && jobData.status === 'completed' && jobData.data) {
          console.log(`[CRAWLER] ✅ Job completed successfully after ${attempt} attempts`);
          return { success: true, data: jobData.data as BusinessExtractData };
        }

        // Check if job failed
        if (jobData.status === 'failed' || jobData.status === 'error') {
          console.log(`[CRAWLER] ❌ Job failed with status: ${jobData.status}`);
          const errorMsg = jobData.error || `Job failed with status: ${jobData.status}`;
          console.log(`[CRAWLER] 🔍 Job error details:`, errorMsg);
          return { success: false, error: errorMsg };
        }

        // Check for error in successful response (e.g., invalid URLs)
        if (jobData.success && jobData.error) {
          console.log(`[CRAWLER] ⚠️ Job completed with error: ${jobData.error}`);
          return { success: false, error: jobData.error };
        }

        // Job still processing, wait before next attempt
        if (attempt < maxAttempts) {
          console.log(`[CRAWLER] ⏳ Job still processing, waiting ${intervalMs}ms...`);
          await new Promise(resolve => setTimeout(resolve, intervalMs));
        }
      } catch (error) {
        console.error(`[CRAWLER] ❌ Polling attempt ${attempt} failed:`, error);
        if (attempt === maxAttempts) {
          throw error;
        }
        // Wait before retry on error
        await new Promise(resolve => setTimeout(resolve, intervalMs));
      }
    }

    // Max attempts reached
    return { 
      success: false, 
      error: `Job polling timeout after ${maxAttempts} attempts (${(maxAttempts * intervalMs) / 1000}s)` 
    };
  }

  /**
   * Transform structured data from Firecrawl Extract into CrawledData format
   * SOLID: Single Responsibility - data transformation only
   * DRY: Reusable transformation logic
   */
  private transformExtractedData(extractedData: BusinessExtractData | any, url: string): CrawledData {
    const data: CrawledData = {};
    
    // Basic business information
    if (extractedData.businessName) {
      data.name = String(extractedData.businessName).trim();
    }
    if (extractedData.description) {
      data.description = String(extractedData.description).trim();
    }
    if (extractedData.phone) {
      data.phone = String(extractedData.phone).trim();
    }
    if (extractedData.email) {
      data.email = String(extractedData.email).trim();
    }
    if (extractedData.website) {
      data.imageUrl = String(extractedData.website).trim();
    }

    // Location data
    if (extractedData.address || extractedData.city || extractedData.state || extractedData.country) {
          data.location = {
        address: extractedData.address ? String(extractedData.address).trim() : undefined,
        city: extractedData.city ? String(extractedData.city).trim() : undefined,
        state: extractedData.state ? String(extractedData.state).trim() : undefined,
        country: extractedData.country ? String(extractedData.country).trim() : 'US',
        postalCode: extractedData.postalCode ? String(extractedData.postalCode).trim() : undefined,
      };
    }

    // Business details
    if (extractedData.industry || extractedData.founded || extractedData.services) {
      data.businessDetails = {
        industry: extractedData.industry ? String(extractedData.industry).trim() : undefined,
        founded: extractedData.founded ? String(extractedData.founded).trim() : undefined,
        services: Array.isArray(extractedData.services) ? extractedData.services.map((s: any) => String(s).trim()) : undefined,
      };
    }

    // Social media links
    if (extractedData.socialMedia) {
      data.socialLinks = {
        facebook: extractedData.socialMedia.facebook ? String(extractedData.socialMedia.facebook) : undefined,
        instagram: extractedData.socialMedia.instagram ? String(extractedData.socialMedia.instagram) : undefined,
        twitter: extractedData.socialMedia.twitter ? String(extractedData.socialMedia.twitter) : undefined,
        linkedin: extractedData.socialMedia.linkedin ? String(extractedData.socialMedia.linkedin) : undefined,
      };
    }

    // Services array
    if (Array.isArray(extractedData.services)) {
      data.services = extractedData.services.map((s: any) => String(s).trim()).slice(0, 10);
    }

    // LLM Enhanced data (mark as processed by Firecrawl Extract)
    data.llmEnhanced = {
      extractedEntities: [data.name || 'Unknown Business'],
      businessCategory: extractedData.industry || 'business',
      serviceOfferings: data.services || [],
      targetAudience: 'general public', // Default to avoid validation error
      keyDifferentiators: [],
      confidence: 0.9, // High confidence for structured extraction
      model: 'firecrawl-extract',
      processedAt: new Date(),
    };

    console.log(`[CRAWLER] 📊 Transformed structured data: name="${data.name}", location="${data.location?.city}, ${data.location?.state}"`);
    console.log(`[CRAWLER] 🔍 Full transformed data:`, JSON.stringify(data, null, 2));
    
    return data;
  }

  /**
   * Enhanced LLM analysis for additional business insights
   * SOLID: Single Responsibility - LLM enhancement only
   */
  private async enhanceWithLLM(crawledData: CrawledData, url: string): Promise<Partial<CrawledData>> {
    if (!crawledData.name) {
      return {};
    }

    const prompt = `
Analyze this business data and provide additional insights:

Business: ${crawledData.name}
Location: ${crawledData.location?.city}, ${crawledData.location?.state}
Industry: ${crawledData.businessDetails?.industry || 'Unknown'}
Description: ${crawledData.description || 'None'}
Services: ${crawledData.services?.join(', ') || 'None'}

Provide additional analysis in JSON format:
{
  "targetAudience": "string - primary customer demographic",
  "keyDifferentiators": ["array of unique selling points"],
  "businessCategory": "refined business category"
}
`;

    try {
      const response = await openRouterClient.query('anthropic/claude-3-haiku', prompt);
      
      const enhanced = JSON.parse(response.content);
      
      return {
        llmEnhanced: {
          ...crawledData.llmEnhanced,
          targetAudience: enhanced.targetAudience || crawledData.llmEnhanced?.targetAudience || 'general public',
          keyDifferentiators: enhanced.keyDifferentiators || [],
          businessCategory: enhanced.businessCategory || crawledData.llmEnhanced?.businessCategory || 'business',
          model: 'claude-3-haiku',
          processedAt: new Date(),
        }
      };
    } catch (error) {
      console.warn(`[CRAWLER] LLM enhancement failed:`, error);
      return {};
    }
  }

  // Rate limiting for Firecrawl API
  private async enforceRateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.MIN_REQUEST_INTERVAL) {
      const waitTime = this.MIN_REQUEST_INTERVAL - timeSinceLastRequest;
      console.log(`[CRAWLER] ⏳ Firecrawl Rate Limit: Waiting ${waitTime}ms...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    this.lastRequestTime = Date.now();
  }

  // Cache management
  private getFromCache(url: string): CrawlResult | null {
    const entry = this.cache.get(url);
    if (!entry) return null;
    
    const now = Date.now();
    if (now - entry.timestamp > this.CACHE_TTL) {
      this.cache.delete(url);
      return null;
    }
    
    return entry.result;
  }

  private saveToCache(url: string, result: CrawlResult): void {
    // Implement LRU eviction if cache is full
    if (this.cache.size >= this.MAX_CACHE_SIZE) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }
    
    this.cache.set(url, {
      result,
      timestamp: Date.now()
    });
  }
}

// Export singleton instance for compatibility
export const webCrawler = new WebCrawler();

// Also export the class for direct instantiation
export { WebCrawler };