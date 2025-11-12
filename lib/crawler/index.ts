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
      console.error('Crawl error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown crawl error',
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
      console.error(`❌ Fetch failed for ${url}:`, error);
      throw error;
    }
  }
  
  private async extractData($: cheerio.CheerioAPI, url: string): Promise<CrawledData> {
    const data: CrawledData = {};
    
    // PASS 1: Extract structured data (JSON-LD)
    const structuredData = this.extractJSONLD($);
    if (structuredData) {
      data.structuredData = structuredData;
      
      // Map structured data to business fields
      if (structuredData.name) data.name = String(structuredData.name);
      if (structuredData.description) data.description = String(structuredData.description);
      if (structuredData.telephone) data.phone = String(structuredData.telephone);
      if (structuredData.email) data.email = String(structuredData.email);
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
      
      // Query LLM
      const response = await openRouterClient.query('openai/gpt-4-turbo', prompt);
      
      // Extract JSON from response (handle markdown code blocks)
      const jsonContent = this.extractJSONFromResponse(response.content);
      
      // Parse structured response
      const extracted = JSON.parse(jsonContent);
      
      // Validate and return
      return this.validateExtraction(extracted);
      
    } catch (error) {
      console.error('LLM extraction error:', error);
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

Website Content (first 4000 chars):
${textContent.substring(0, 4000)}

Extract the following (use null if not found, DO NOT GUESS):

CRITICAL RULES:
- Only include information explicitly stated on the website
- Use null for any field where information is not found
- DO NOT make assumptions or inferences
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
    
    return extracted;
  }
}

// Export singleton instance
export const webCrawler = new WebCrawler();

