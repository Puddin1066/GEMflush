// Web crawler service for extracting business data from websites

import * as cheerio from 'cheerio';
import { CrawledData, CrawlResult } from '@/lib/types/gemflush';
import { openRouterClient } from '@/lib/llm/openrouter';

// MOCKING API CALLS: This is a simulated crawler for development
// In production, implement actual HTTP fetching and parsing
export class WebCrawler {
  private userAgent = 'GEMflush-Bot/1.0 (Business Entity Crawler)';
  
  async crawl(url: string): Promise<CrawlResult> {
    try {
      // Validate URL
      const parsedUrl = new URL(url);
      
      // MOCK: Simulated fetch for development
      console.log(`[MOCK] Crawling URL: ${url}`);
      const html = await this.fetchHTML(url);
      
      // Parse the HTML
      const $ = cheerio.load(html);
      
      // Extract structured data
      const crawledData = await this.extractData($, url);
      
      return {
        success: true,
        data: crawledData,
        url,
        crawledAt: new Date(),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown crawl error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      console.error(`[CRAWLER] Crawl error for ${url}:`, errorMessage);
      if (errorStack) {
        console.error(`[CRAWLER] Error stack:`, errorStack);
      }
      return {
        success: false,
        error: errorMessage,
        url,
        crawledAt: new Date(),
      };
    }
  }
  
  private async fetchHTML(url: string): Promise<string> {
    // PRODUCTION: Real HTTP fetch
    console.log(`🌐 Fetching: ${url}`);
    
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': this.userAgent,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
        },
        // Follow redirects
        redirect: 'follow',
        // 10 second timeout
        signal: AbortSignal.timeout(10000),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const html = await response.text();
      console.log(`✅ Fetched ${html.length} bytes from ${url}`);
      
      return html;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown fetch error';
      const errorName = error instanceof Error ? error.name : 'UnknownError';
      console.error(`[CRAWLER] ❌ Fetch failed for ${url}:`, errorName, errorMessage);
      if (error instanceof Error && error.stack) {
        console.error(`[CRAWLER] Fetch error stack:`, error.stack);
      }
      throw error;
    }
  }
  
  private async extractData($: cheerio.CheerioAPI, url: string): Promise<CrawledData> {
    const data: CrawledData = {};
    
    // PASS 0: Try to extract location from URL/domain first (fast fallback)
    const urlLocation = this.extractLocationFromUrl(url);
    if (urlLocation) {
      data.location = urlLocation;
    }
    
    // PASS 1: Extract structured data (JSON-LD)
    const structuredData = this.extractJSONLD($);
    if (structuredData) {
      data.structuredData = structuredData;
      
      // Map structured data to business fields
      if (structuredData.name) data.name = String(structuredData.name);
      if (structuredData.description) data.description = String(structuredData.description);
      if (structuredData.telephone) data.phone = String(structuredData.telephone);
      if (structuredData.email) data.email = String(structuredData.email);
      
      // NEW: Extract location from JSON-LD (LocalBusiness schema)
      // Only override if we didn't already get location from URL
      if (!data.location && structuredData.address) {
        const addr = structuredData.address;
        if (typeof addr === 'object' && addr !== null) {
          data.location = {
            address: (addr as any).streetAddress || (addr as any).address || undefined,
            city: (addr as any).addressLocality || (addr as any).city || undefined,
            state: (addr as any).addressRegion || (addr as any).state || undefined,
            country: (addr as any).addressCountry || (addr as any).country || 'US',
            postalCode: (addr as any).postalCode || undefined,
          };
        }
      } else if (data.location && structuredData.address) {
        // Merge JSON-LD data with URL-extracted data (JSON-LD takes precedence for specific fields)
        const addr = structuredData.address;
        if (typeof addr === 'object' && addr !== null) {
          data.location = {
            ...data.location,
            address: (addr as any).streetAddress || (addr as any).address || data.location.address,
            city: (addr as any).addressLocality || (addr as any).city || data.location.city,
            state: (addr as any).addressRegion || (addr as any).state || data.location.state,
            country: (addr as any).addressCountry || (addr as any).country || data.location.country || 'US',
            postalCode: (addr as any).postalCode || data.location.postalCode,
          };
        }
      }
      
      // Extract coordinates if available
      if (structuredData.geo) {
        const geo = structuredData.geo;
        if (typeof geo === 'object' && geo !== null) {
          if (!data.location) data.location = { country: 'US' };
          data.location.lat = (geo as any).latitude || (geo as any).lat || undefined;
          data.location.lng = (geo as any).longitude || (geo as any).lng || undefined;
        }
      }
    }
    
    // Extract meta tags
    data.metaTags = this.extractMetaTags($);
    
    // Extract fallback data from HTML if structured data not available
    if (!data.name) {
      data.name = this.extractBusinessName($);
    }
    
    if (!data.description) {
      data.description = this.extractDescription($);
    }
    
    // Extract social links
    data.socialLinks = this.extractSocialLinks($);
    
    // Extract images
    data.imageUrl = this.extractMainImage($, url);
    
    // Extract categories/services
    data.categories = this.extractCategories($);
    data.services = this.extractServices($);
    
    // PASS 2: LLM-enhanced extraction
    const llmEnhancement = await this.enhanceWithLLM($, data, url);
    
    // Merge location from LLM if available (LLM may extract better location)
    if (llmEnhancement.location) {
      if (!data.location) {
        data.location = llmEnhancement.location;
      } else {
        // Fill in missing fields from LLM extraction
        data.location = {
          ...data.location,
          city: data.location.city || llmEnhancement.location.city || undefined,
          state: data.location.state || llmEnhancement.location.state || undefined,
          country: data.location.country || llmEnhancement.location.country || data.location.country || 'US',
          address: data.location.address || llmEnhancement.location.address || undefined,
          postalCode: data.location.postalCode || llmEnhancement.location.postalCode || undefined,
        };
      }
      // Remove location from llmEnhancement to avoid duplication
      const { location, ...restEnhancement } = llmEnhancement;
      return {
        ...data,
        ...restEnhancement,
      };
    }
    
    return {
      ...data,
      ...llmEnhancement,
    };
  }
  
  private extractJSONLD($: cheerio.CheerioAPI): Record<string, unknown> | null {
    try {
      const jsonLdScript = $('script[type="application/ld+json"]').first().html();
      if (jsonLdScript) {
        return JSON.parse(jsonLdScript) as Record<string, unknown>;
      }
    } catch (error) {
      console.error('Error parsing JSON-LD:', error);
    }
    return null;
  }
  
  private extractMetaTags($: cheerio.CheerioAPI): Record<string, string> {
    const metaTags: Record<string, string> = {};
    
    $('meta').each((_, el) => {
      const name = $(el).attr('name') || $(el).attr('property');
      const content = $(el).attr('content');
      if (name && content) {
        metaTags[name] = content;
      }
    });
    
    return metaTags;
  }
  
  private extractBusinessName($: cheerio.CheerioAPI): string {
    // Try various selectors
    return (
      $('h1').first().text().trim() ||
      $('title').text().trim().split('-')[0].trim() ||
      $('[itemprop="name"]').first().text().trim() ||
      'Unknown Business'
    );
  }
  
  private extractDescription($: cheerio.CheerioAPI): string | undefined {
    return (
      $('meta[name="description"]').attr('content') ||
      $('meta[property="og:description"]').attr('content') ||
      $('p').first().text().trim().substring(0, 500)
    );
  }
  
  private extractSocialLinks($: cheerio.CheerioAPI): CrawledData['socialLinks'] {
    const socialLinks: CrawledData['socialLinks'] = {};
    
    $('a[href*="facebook.com"]').each((_, el) => {
      const href = $(el).attr('href');
      if (href) socialLinks.facebook = href;
    });
    
    $('a[href*="instagram.com"]').each((_, el) => {
      const href = $(el).attr('href');
      if (href) socialLinks.instagram = href;
    });
    
    $('a[href*="linkedin.com"]').each((_, el) => {
      const href = $(el).attr('href');
      if (href) socialLinks.linkedin = href;
    });
    
    $('a[href*="twitter.com"], a[href*="x.com"]').each((_, el) => {
      const href = $(el).attr('href');
      if (href) socialLinks.twitter = href;
    });
    
    return socialLinks;
  }
  
  private extractMainImage($: cheerio.CheerioAPI, baseUrl: string): string | undefined {
    const ogImage = $('meta[property="og:image"]').attr('content');
    if (ogImage) return this.resolveUrl(ogImage, baseUrl);
    
    const firstImg = $('img').first().attr('src');
    if (firstImg) return this.resolveUrl(firstImg, baseUrl);
    
    return undefined;
  }
  
  private extractCategories($: cheerio.CheerioAPI): string[] {
    const categories: string[] = [];
    
    // Look for category-related keywords in text
    const text = $('body').text().toLowerCase();
    const categoryKeywords = ['restaurant', 'retail', 'healthcare', 'professional', 'service'];
    
    categoryKeywords.forEach(keyword => {
      if (text.includes(keyword)) {
        categories.push(keyword);
      }
    });
    
    return categories;
  }
  
  private extractServices($: cheerio.CheerioAPI): string[] {
    const services: string[] = [];
    
    // Look for lists that might contain services
    $('ul li, ol li').each((_, el) => {
      const text = $(el).text().trim();
      if (text.length > 5 && text.length < 100) {
        services.push(text);
      }
    });
    
    return services.slice(0, 10); // Limit to 10 services
  }
  
  private resolveUrl(url: string, baseUrl: string): string {
    try {
      return new URL(url, baseUrl).toString();
    } catch {
      return url;
    }
  }
  
  /**
   * Extract location from URL/domain
   * Uses domain analysis and common patterns to infer location
   * Follows Single Responsibility Principle: Only handles URL-based location extraction
   */
  private extractLocationFromUrl(url: string): CrawledData['location'] | null {
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname.toLowerCase();
      
      // Check for country-specific TLDs
      const countryTldMap: Record<string, { country: string; state?: string; city?: string }> = {
        '.ca': { country: 'CA', state: 'ON' }, // Canada - default to Ontario
        '.co.uk': { country: 'GB' }, // United Kingdom
        '.com.au': { country: 'AU', state: 'NSW' }, // Australia - default to NSW
        '.de': { country: 'DE' }, // Germany
        '.fr': { country: 'FR' }, // France
        '.it': { country: 'IT' }, // Italy
        '.es': { country: 'ES' }, // Spain
        '.nl': { country: 'NL' }, // Netherlands
        '.jp': { country: 'JP' }, // Japan
        '.cn': { country: 'CN' }, // China
        '.in': { country: 'IN' }, // India
        '.br': { country: 'BR' }, // Brazil
        '.mx': { country: 'MX' }, // Mexico
      };
      
      // Check domain for location hints
      for (const [tld, location] of Object.entries(countryTldMap)) {
        if (hostname.endsWith(tld)) {
          return {
            country: location.country,
            state: location.state,
            city: location.city,
          };
        }
      }
      
      // Check for US state-specific domains or city-specific patterns
      // Common patterns: cityname.com, cityname-state.com, etc.
      const usStateAbbrevs = ['AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'];
      
      // Try to extract city and state from subdomain or path
      // Example: losangeles.example.com, boston-ma.example.com
      const cityStateMatch = hostname.match(/([a-z]+)-([a-z]{2})\./);
      if (cityStateMatch) {
        const [, cityHint, stateHint] = cityStateMatch;
        const stateUpper = stateHint.toUpperCase();
        if (usStateAbbrevs.includes(stateUpper)) {
          return {
            country: 'US',
            state: stateUpper,
            city: cityHint.charAt(0).toUpperCase() + cityHint.slice(1),
          };
        }
      }
      
      // Check for common US city names in domain (major cities only for accuracy)
      const majorUsCities: Record<string, { city: string; state: string }> = {
        'newyork': { city: 'New York', state: 'NY' },
        'losangeles': { city: 'Los Angeles', state: 'CA' },
        'chicago': { city: 'Chicago', state: 'IL' },
        'houston': { city: 'Houston', state: 'TX' },
        'phoenix': { city: 'Phoenix', state: 'AZ' },
        'philadelphia': { city: 'Philadelphia', state: 'PA' },
        'sanantonio': { city: 'San Antonio', state: 'TX' },
        'sandiego': { city: 'San Diego', state: 'CA' },
        'dallas': { city: 'Dallas', state: 'TX' },
        'sanfrancisco': { city: 'San Francisco', state: 'CA' },
        'boston': { city: 'Boston', state: 'MA' },
        'seattle': { city: 'Seattle', state: 'WA' },
        'denver': { city: 'Denver', state: 'CO' },
        'miami': { city: 'Miami', state: 'FL' },
        'atlanta': { city: 'Atlanta', state: 'GA' },
        'detroit': { city: 'Detroit', state: 'MI' },
        'lasvegas': { city: 'Las Vegas', state: 'NV' },
        'portland': { city: 'Portland', state: 'OR' },
        'austin': { city: 'Austin', state: 'TX' },
      };
      
      for (const [cityKey, location] of Object.entries(majorUsCities)) {
        if (hostname.includes(cityKey)) {
          return {
            country: 'US',
            state: location.state,
            city: location.city,
          };
        }
      }
      
      // Default to US if .com, .net, .org with no other indicators
      if (hostname.endsWith('.com') || hostname.endsWith('.net') || hostname.endsWith('.org')) {
        // Try to extract state from subdomain or path if possible
        // Otherwise, return null to let other extraction methods try
        return null;
      }
      
      return null;
    } catch (error) {
      console.error('Error extracting location from URL:', error);
      return null;
    }
  }

  /**
   * LLM-enhanced extraction
   * Extracts rich business data that regex/selectors can't find
   * Follows Single Responsibility Principle: Only handles LLM extraction
   */
  private async enhanceWithLLM(
    $: cheerio.CheerioAPI,
    basicData: Partial<CrawledData>,
    url: string
  ): Promise<Partial<CrawledData>> {
    try {
      // Extract clean text content
      const textContent = this.extractCleanText($);
      
      // Build comprehensive extraction prompt
      const prompt = this.buildExtractionPrompt(basicData, textContent, url);
      
      // Query LLM with timeout to prevent hanging
      const response = await Promise.race([
        openRouterClient.query('openai/gpt-4-turbo', prompt),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('LLM query timeout')), 30000)
        )
      ]);
      
      // Extract JSON from response (handle markdown code blocks)
      const jsonContent = this.extractJSONFromResponse(response.content);
      
      // Parse structured response with validation
      if (!jsonContent || jsonContent.trim().length === 0) {
        console.warn('LLM returned empty content, using basic extraction');
        return {};
      }
      
      let extracted;
      try {
        extracted = JSON.parse(jsonContent);
      } catch (parseError) {
        console.error('LLM JSON parse error:', parseError);
        console.error('Content received:', jsonContent.substring(0, 200));
        // Return empty on parse failure - basic data still available
        return {};
      }
      
      // Validate and return
      return this.validateExtraction(extracted);
      
    } catch (error) {
      // Handle timeout and other errors gracefully
      if (error instanceof Error && error.message === 'LLM query timeout') {
        console.error('LLM query timed out after 30s');
      } else {
        console.error('LLM extraction error:', error);
      }
      // Return empty on failure - basic data still available
      return {};
    }
  }
  
  /**
   * Extract JSON from LLM response
   * Handles cases where LLM wraps JSON in markdown code blocks (```json ... ```)
   * Follows DRY: Centralized JSON extraction logic
   */
  private extractJSONFromResponse(content: string): string {
    // Remove markdown code block markers if present
    const jsonBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jsonBlockMatch) {
      return jsonBlockMatch[1].trim();
    }
    
    // Try to find JSON object/array boundaries
    const jsonObjectMatch = content.match(/\{[\s\S]*\}/);
    if (jsonObjectMatch) {
      return jsonObjectMatch[0];
    }
    
    const jsonArrayMatch = content.match(/\[[\s\S]*\]/);
    if (jsonArrayMatch) {
      return jsonArrayMatch[0];
    }
    
    // Fallback: return content as-is (will fail in JSON.parse if invalid)
    return content.trim();
  }
  
  /**
   * Extract clean text from HTML (remove noise)
   * Follows DRY principle: Centralized text extraction
   */
  private extractCleanText($: cheerio.CheerioAPI): string {
    // Remove scripts, styles, navigation
    $('script, style, nav, header, footer').remove();
    
    // Get main content (try common selectors)
    const mainContent = $('main, article, .content, #content, .main')
      .first()
      .text();
    
    if (mainContent) {
      return this.cleanText(mainContent);
    }
    
    // Fallback: get body text
    return this.cleanText($('body').text());
  }
  
  /**
   * Clean and normalize text
   */
  private cleanText(text: string): string {
    return text
      .replace(/\s+/g, ' ')           // Normalize whitespace
      .replace(/[^\x20-\x7E\n]/g, '') // Remove non-ASCII
      .trim();
  }
  
  /**
   * Build comprehensive extraction prompt
   * Follows Interface Segregation: Returns only what UI needs
   */
  private buildExtractionPrompt(
    basicData: Partial<CrawledData>,
    textContent: string,
    url: string
  ): string {
    return `
You are a business intelligence extraction system. Analyze this website and extract ALL available information.

URL: ${url}

Basic Info Already Extracted:
- Name: ${basicData.name || 'Unknown'}
- Description: ${basicData.description || 'None'}
- Phone: ${basicData.phone || 'None'}
- Email: ${basicData.email || 'None'}
- Address: ${basicData.address || 'None'}

Website Content (first 4000 chars):
${textContent.substring(0, 4000)}

Extract the following (use null if not found, DO NOT GUESS):

CRITICAL RULES:
- Only include information explicitly stated on the website
- Use null for any field where information is not found
- DO NOT make assumptions or inferences
- For location: Extract city, state, country separately
- For country: Use ISO 3166-1 alpha-2 code (e.g., "US", "CA", "GB") or full name
- For state: Use standard abbreviation (e.g., "CA", "NY") or full name
- For dates, prefer "YYYY" format unless full date is clear
- Be conservative - it's better to return null than incorrect data

Return ONLY valid JSON (no markdown, no explanations):
{
  "businessDetails": {
    "industry": string | null,
    "sector": string | null,
    "legalForm": string | null,
    "founded": string | null,
    "employeeCount": string | number | null,
    "revenue": string | null,
    "locations": number | null,
    "products": string[] | null,
    "services": string[] | null,
    "parentCompany": string | null,
    "ceo": string | null,
    "awards": string[] | null,
    "certifications": string[] | null,
    "stockSymbol": string | null
  },
  "location": {
    "address": string | null,
    "city": string | null,
    "state": string | null,
    "country": string | null,
    "postalCode": string | null
  },
  "llmEnhanced": {
    "extractedEntities": string[],
    "businessCategory": string,
    "serviceOfferings": string[],
    "targetAudience": string,
    "keyDifferentiators": string[],
    "confidence": number
  }
}
    `.trim();
  }
  
  /**
   * Validate LLM extraction results
   * Follows Dependency Inversion: Validates against business rules
   */
  private validateExtraction(extracted: any): Partial<CrawledData> {
    if (!extracted || typeof extracted !== 'object') {
      return {};
    }
    
    // Validate employee count format
    if (extracted.businessDetails?.employeeCount) {
      const count = extracted.businessDetails.employeeCount;
      if (typeof count === 'string' && !/^\d+(-\d+)?(\+)?$/.test(count)) {
        extracted.businessDetails.employeeCount = null;
      }
    }
    
    // Validate founded year format
    if (extracted.businessDetails?.founded) {
      if (!/^\d{4}(-\d{2}-\d{2})?$/.test(extracted.businessDetails.founded)) {
        extracted.businessDetails.founded = null;
      }
    }
    
    // Validate confidence score
    if (extracted.llmEnhanced?.confidence) {
      const conf = extracted.llmEnhanced.confidence;
      if (conf < 0 || conf > 1) {
        extracted.llmEnhanced.confidence = 0.5;
      }
    }
    
    // Add processedAt timestamp
    if (extracted.llmEnhanced) {
      extracted.llmEnhanced.processedAt = new Date();
      extracted.llmEnhanced.model = 'openai/gpt-4-turbo';
    }
    
    // Location merging happens in enhanceWithLLM, not here
    // This function just validates the extraction structure
    // Return extracted data as-is (location will be merged in enhanceWithLLM)
    return extracted;
  }
}

// Export singleton instance
export const webCrawler = new WebCrawler();

