/**
 * Business Name Extraction Utility
 * 
 * Extracts meaningful business names from URLs when crawl data is unavailable.
 * Follows SOLID principles by providing a single responsibility utility.
 */

import { generateMockCrawlData, shouldUseMockCrawlData } from './mock-crawl-data';

/**
 * Extract a business name from a URL
 * 
 * @param url - The business URL
 * @returns A human-readable business name
 */
export function extractBusinessNameFromUrl(url: string): string {
  try {
    // First, check if we have mock data for this URL
    if (shouldUseMockCrawlData(url)) {
      const mockData = generateMockCrawlData(url);
      return mockData.name;
    }

    // Parse the URL to extract domain
    const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`);
    let domain = urlObj.hostname.replace(/^www\./, '');

    // Remove common TLDs
    domain = domain.replace(/\.(com|org|net|co|io|biz|info|us|uk|ca)$/, '');

    // Handle subdomains (keep only the main domain part)
    const parts = domain.split('.');
    if (parts.length > 1) {
      // For most cases, use the second-to-last part (main domain)
      domain = parts[parts.length - 1];
    }

    // Convert to title case
    const name = domain
      .split(/[-_]/) // Split on hyphens and underscores
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');

    // Handle common business name patterns
    const businessName = name
      .replace(/\b(Inc|Corp|LLC|Ltd|Co)\b/gi, '') // Remove corporate suffixes
      .trim();

    return businessName || 'Business'; // Fallback to 'Business' if extraction fails
  } catch (error) {
    console.warn(`[BUSINESS_NAME_EXTRACTOR] Failed to extract name from URL: ${url}`, error);
    return 'Business';
  }
}

/**
 * Validate if an extracted business name is meaningful
 * 
 * @param name - The extracted business name
 * @returns True if the name is meaningful, false if it's too generic
 */
export function isValidBusinessName(name: string): boolean {
  const genericNames = ['business', 'company', 'corp', 'inc', 'llc', 'ltd', 'www', 'http', 'https'];
  const lowercaseName = name.toLowerCase().trim();
  
  // Check if it's too short or generic
  if (lowercaseName.length < 2 || genericNames.includes(lowercaseName)) {
    return false;
  }

  // Check if it contains only numbers or special characters
  if (!/[a-zA-Z]/.test(name)) {
    return false;
  }

  return true;
}

/**
 * Get a business name with fallback options
 * 
 * @param url - The business URL
 * @param fallbackName - Optional fallback name
 * @returns The best available business name
 */
export function getBusinessNameWithFallback(url: string, fallbackName?: string): string {
  const extractedName = extractBusinessNameFromUrl(url);
  
  if (isValidBusinessName(extractedName)) {
    return extractedName;
  }

  if (fallbackName && isValidBusinessName(fallbackName)) {
    return fallbackName;
  }

  return 'Business'; // Final fallback
}

