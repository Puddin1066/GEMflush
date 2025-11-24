/**
 * Crawl Data Processor
 * 
 * Processes crawl data to extract structured information for Wikidata entity creation.
 * Integrates with existing crawl data types and enhances them for rich entity population.
 */

import type { CrawledData } from '@/lib/types/gemflush';
import type { Business } from '@/lib/db/schema';
import type { CrawlDataInput } from './types';

export class CrawlDataProcessor {
  /**
   * Convert existing CrawledData to standardized CrawlDataInput
   */
  static processCrawlData(
    business: Business,
    crawledData?: CrawledData
  ): CrawlDataInput {
    const processed: CrawlDataInput = {
      url: business.url,
      name: crawledData?.name || business.name,
      description: crawledData?.description,
    };

    // Process location data
    if (crawledData?.location || business.location) {
      processed.location = {
        address: crawledData?.address || crawledData?.location?.address,
        city: crawledData?.location?.city || business.location?.city,
        state: crawledData?.location?.state || business.location?.state,
        country: crawledData?.location?.country || business.location?.country || 'US',
        coordinates: crawledData?.location?.lat && crawledData?.location?.lng 
          ? {
              lat: crawledData.location.lat,
              lng: crawledData.location.lng
            }
          : business.location?.coordinates
      };
    }

    // Process contact information
    if (crawledData?.phone || crawledData?.email) {
      processed.contact = {
        phone: crawledData.phone,
        email: crawledData.email
      };
    }

    // Process business details
    if (crawledData?.businessDetails) {
      const bd = crawledData.businessDetails;
      processed.business = {
        industry: bd.industry,
        sector: bd.sector,
        legalForm: bd.legalForm,
        founded: bd.founded,
        employeeCount: bd.employeeCount,
        revenue: bd.revenue,
        stockSymbol: bd.stockSymbol
      };
    }

    // Process social media links
    if (crawledData?.socialLinks) {
      processed.social = {
        facebook: crawledData.socialLinks.facebook,
        twitter: crawledData.socialLinks.twitter,
        instagram: crawledData.socialLinks.instagram,
        linkedin: crawledData.socialLinks.linkedin
      };
    }

    // Process content data
    if (crawledData?.content || crawledData?.images) {
      processed.content = {
        text: crawledData.content,
        images: crawledData.images,
        links: this.extractLinks(crawledData.content)
      };
    }

    return processed;
  }

  /**
   * Enhance crawl data with additional processing
   */
  static enhanceCrawlData(crawlData: CrawlDataInput): CrawlDataInput {
    const enhanced = { ...crawlData };

    // Enhance business name
    if (enhanced.name) {
      enhanced.name = this.cleanBusinessName(enhanced.name);
    }

    // Enhance description
    if (enhanced.description) {
      enhanced.description = this.cleanDescription(enhanced.description);
    }

    // Enhance location data
    if (enhanced.location) {
      enhanced.location = this.enhanceLocation(enhanced.location);
    }

    // Enhance business data
    if (enhanced.business) {
      enhanced.business = this.enhanceBusiness(enhanced.business);
    }

    // Validate and clean contact info
    if (enhanced.contact) {
      enhanced.contact = this.cleanContact(enhanced.contact);
    }

    return enhanced;
  }

  /**
   * Extract key metrics from crawl data
   */
  static extractMetrics(crawlData: CrawlDataInput): {
    completeness: number;
    quality: number;
    richness: number;
    propertyCount: number;
  } {
    let completeness = 0;
    let quality = 0;
    let richness = 0;
    let propertyCount = 0;

    // Core fields (required)
    const coreFields = ['url', 'name'];
    const corePresent = coreFields.filter(field => crawlData[field as keyof CrawlDataInput]).length;
    completeness += (corePresent / coreFields.length) * 0.4;

    // Location data
    if (crawlData.location) {
      propertyCount += 2; // P625, P6375
      if (crawlData.location.coordinates) {
        quality += 0.15;
        richness += 0.1;
      }
      if (crawlData.location.address) {
        quality += 0.1;
      }
      if (crawlData.location.city && crawlData.location.state) {
        propertyCount += 2; // P131, P17
        quality += 0.1;
      }
    }

    // Contact information
    if (crawlData.contact) {
      if (crawlData.contact.phone) {
        propertyCount += 1; // P1329
        quality += 0.05;
      }
      if (crawlData.contact.email) {
        propertyCount += 1; // P968
        quality += 0.05;
      }
    }

    // Business details
    if (crawlData.business) {
      if (crawlData.business.industry) {
        propertyCount += 1; // P452
        quality += 0.1;
        richness += 0.15;
      }
      if (crawlData.business.founded) {
        propertyCount += 1; // P571
        quality += 0.1;
      }
      if (crawlData.business.employeeCount) {
        propertyCount += 1; // P1128
        quality += 0.05;
      }
    }

    // Social media
    if (crawlData.social) {
      const socialCount = Object.values(crawlData.social).filter(Boolean).length;
      propertyCount += socialCount;
      quality += socialCount * 0.02;
      richness += socialCount * 0.05;
    }

    // Description quality
    if (crawlData.description && crawlData.description.length > 50) {
      quality += 0.1;
      richness += 0.1;
    }

    // Calculate final scores
    completeness = Math.min(completeness + (propertyCount / 15) * 0.6, 1.0);
    quality = Math.min(quality, 1.0);
    richness = Math.min(richness, 1.0);

    return {
      completeness,
      quality,
      richness,
      propertyCount
    };
  }

  /**
   * Validate crawl data for entity creation
   */
  static validateCrawlData(crawlData: CrawlDataInput): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required fields
    if (!crawlData.url) {
      errors.push('URL is required');
    } else if (!this.isValidUrl(crawlData.url)) {
      errors.push('Invalid URL format');
    }

    if (!crawlData.name) {
      warnings.push('Business name not provided');
    }

    // Location validation
    if (crawlData.location?.coordinates) {
      const { lat, lng } = crawlData.location.coordinates;
      if (lat < -90 || lat > 90) {
        errors.push('Invalid latitude');
      }
      if (lng < -180 || lng > 180) {
        errors.push('Invalid longitude');
      }
    }

    // Contact validation
    if (crawlData.contact?.email && !this.isValidEmail(crawlData.contact.email)) {
      warnings.push('Invalid email format');
    }

    if (crawlData.contact?.phone && !this.isValidPhone(crawlData.contact.phone)) {
      warnings.push('Invalid phone format');
    }

    // Business data validation
    if (crawlData.business?.employeeCount && crawlData.business.employeeCount < 0) {
      warnings.push('Invalid employee count');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  // Private helper methods

  private static cleanBusinessName(name: string): string {
    return name
      .replace(/\s+\d{10,}$/, '') // Remove timestamps
      .replace(/\s+\d{1,3}$/, '') // Remove trailing numbers
      .replace(/\s+/g, ' ')
      .trim();
  }

  private static cleanDescription(description: string): string {
    return description
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 250); // Wikidata limit
  }

  private static enhanceLocation(location: CrawlDataInput['location']): CrawlDataInput['location'] {
    if (!location) return location;

    const enhanced = { ...location };

    // Standardize country codes
    if (enhanced.country) {
      enhanced.country = this.standardizeCountry(enhanced.country);
    }

    // Clean address
    if (enhanced.address) {
      enhanced.address = enhanced.address.replace(/\s+/g, ' ').trim();
    }

    return enhanced;
  }

  private static enhanceBusiness(business: CrawlDataInput['business']): CrawlDataInput['business'] {
    if (!business) return business;

    const enhanced = { ...business };

    // Standardize industry
    if (enhanced.industry) {
      enhanced.industry = this.standardizeIndustry(enhanced.industry);
    }

    // Clean founded date
    if (enhanced.founded) {
      enhanced.founded = this.standardizeDate(enhanced.founded);
    }

    return enhanced;
  }

  private static cleanContact(contact: CrawlDataInput['contact']): CrawlDataInput['contact'] {
    if (!contact) return contact;

    const cleaned = { ...contact };

    // Clean phone number
    if (cleaned.phone) {
      cleaned.phone = cleaned.phone.replace(/[^\d\-\+\(\)\s]/g, '').trim();
    }

    // Clean email
    if (cleaned.email) {
      cleaned.email = cleaned.email.toLowerCase().trim();
    }

    return cleaned;
  }

  private static extractLinks(content?: string): string[] {
    if (!content) return [];

    const urlRegex = /https?:\/\/[^\s<>"]+/gi;
    const matches = content.match(urlRegex);
    return matches ? [...new Set(matches)] : [];
  }

  private static standardizeCountry(country: string): string {
    const countryMap: Record<string, string> = {
      'usa': 'US',
      'united states': 'US',
      'america': 'US',
      'canada': 'CA',
      'uk': 'GB',
      'united kingdom': 'GB',
      'britain': 'GB'
    };

    const normalized = country.toLowerCase();
    return countryMap[normalized] || country.toUpperCase();
  }

  private static standardizeIndustry(industry: string): string {
    // Basic industry standardization
    const industryMap: Record<string, string> = {
      'tech': 'Technology',
      'software': 'Software Development',
      'healthcare': 'Healthcare',
      'finance': 'Financial Services',
      'retail': 'Retail',
      'manufacturing': 'Manufacturing'
    };

    const normalized = industry.toLowerCase();
    return industryMap[normalized] || industry;
  }

  private static standardizeDate(date: string): string {
    // Try to parse and standardize date format
    try {
      const parsed = new Date(date);
      if (!isNaN(parsed.getTime())) {
        return parsed.getFullYear().toString();
      }
    } catch {
      // Fall back to original if parsing fails
    }

    // Extract year from string
    const yearMatch = date.match(/\b(19|20)\d{2}\b/);
    return yearMatch ? yearMatch[0] : date;
  }

  private static isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  private static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private static isValidPhone(phone: string): boolean {
    const phoneRegex = /^[\d\-\+\(\)\s]{7,}$/;
    return phoneRegex.test(phone);
  }
}

