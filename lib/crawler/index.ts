// Web crawler service for extracting business data from websites

import * as cheerio from 'cheerio';
import { CrawledData, CrawlResult } from '@/lib/types/gemflush';

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
    // MOCK: Return simulated HTML for development
    // In production: Use fetch() or axios with proper headers and error handling
    
    // Simulated delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Sample Business - Professional Services</title>
          <meta name="description" content="Leading provider of professional services since 2010">
          <script type="application/ld+json">
          {
            "@context": "https://schema.org",
            "@type": "LocalBusiness",
            "name": "Sample Business Inc",
            "description": "Professional services provider",
            "telephone": "+1-555-123-4567",
            "email": "info@samplebusiness.com",
            "address": {
              "@type": "PostalAddress",
              "streetAddress": "123 Main Street",
              "addressLocality": "San Francisco",
              "addressRegion": "CA",
              "postalCode": "94102",
              "addressCountry": "US"
            }
          }
          </script>
        </head>
        <body>
          <h1>Sample Business Inc</h1>
          <p>We provide excellent professional services to our clients.</p>
          <div class="contact">
            <p>Phone: +1-555-123-4567</p>
            <p>Email: info@samplebusiness.com</p>
          </div>
          <div class="social">
            <a href="https://facebook.com/samplebusiness">Facebook</a>
            <a href="https://linkedin.com/company/samplebusiness">LinkedIn</a>
          </div>
        </body>
      </html>
    `;
  }
  
  private async extractData($: cheerio.CheerioAPI, url: string): Promise<CrawledData> {
    const data: CrawledData = {};
    
    // Extract structured data (JSON-LD)
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
    
    return data;
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
}

// Export singleton instance
export const webCrawler = new WebCrawler();

