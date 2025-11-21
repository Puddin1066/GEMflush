/**
 * Mock Crawl Data Generator
 * 
 * Provides realistic mock crawl data for testing downstream processes
 * when external APIs (Firecrawl) are unavailable or rate-limited.
 * 
 * Follows DRY principles by centralizing mock data generation.
 */

import type { CrawledData } from '@/lib/types/gemflush';

interface MockBusinessProfile {
  name: string;
  domain: string;
  industry: string;
  location: {
    city: string;
    state: string;
    country: string;
    address?: string;
    lat?: number;
    lng?: number;
  };
  services: string[];
  description: string;
  phone?: string;
  email?: string;
}

const MOCK_BUSINESS_PROFILES: Record<string, MockBusinessProfile> = {
  'bluebottlecoffee.com': {
    name: 'Blue Bottle Coffee',
    domain: 'bluebottlecoffee.com',
    industry: 'coffee shop',
    location: {
      city: 'Oakland',
      state: 'CA',
      country: 'US',
      address: '300 Webster St, Oakland, CA 94607',
      lat: 37.7749,
      lng: -122.4194
    },
    services: ['coffee', 'espresso', 'pastries', 'coffee beans', 'brewing equipment'],
    description: 'Specialty coffee roaster and retailer known for high-quality, freshly roasted coffee beans and artisanal brewing methods.',
    phone: '(510) 653-3394',
    email: 'info@bluebottlecoffee.com'
  },
  'brownphysicians.org': {
    name: 'Brown Physicians',
    domain: 'brownphysicians.org',
    industry: 'healthcare',
    location: {
      city: 'Providence',
      state: 'RI',
      country: 'US',
      address: '593 Eddy St, Providence, RI 02903',
      lat: 41.8240,
      lng: -71.4128
    },
    services: ['primary care', 'internal medicine', 'family medicine', 'preventive care', 'health screenings'],
    description: 'Multi-specialty physician practice affiliated with Brown University providing comprehensive healthcare services.',
    phone: '(401) 444-5648',
    email: 'info@brownphysicians.org'
  },
  'princestreetpizza.com': {
    name: 'Prince Street Pizza',
    domain: 'princestreetpizza.com',
    industry: 'restaurant',
    location: {
      city: 'New York',
      state: 'NY',
      country: 'US',
      address: '27 Prince St, New York, NY 10012',
      lat: 40.7223,
      lng: -73.9948
    },
    services: ['pizza', 'pepperoni pizza', 'cheese pizza', 'sicilian pizza', 'takeout', 'delivery'],
    description: 'Iconic New York pizza shop famous for its pepperoni square slices and authentic Italian-style pizza.',
    phone: '(212) 966-4100'
  },
  'anchormedical.org': {
    name: 'Anchor Medical Associates',
    domain: 'anchormedical.org',
    industry: 'healthcare',
    location: {
      city: 'Boston',
      state: 'MA',
      country: 'US',
      address: '123 Medical Center Dr, Boston, MA 02118',
      lat: 42.3601,
      lng: -71.0589
    },
    services: ['cardiology', 'internal medicine', 'diagnostic imaging', 'preventive care', 'specialist referrals'],
    description: 'Comprehensive medical practice specializing in cardiovascular health and internal medicine.',
    phone: '(617) 555-0123',
    email: 'contact@anchormedical.org'
  }
};

/**
 * Extract domain from URL for mock profile lookup
 */
function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`);
    return urlObj.hostname.replace(/^www\./, '');
  } catch {
    return url.replace(/^https?:\/\/(www\.)?/, '').split('/')[0];
  }
}

/**
 * Generate mock crawl data based on URL
 * 
 * @param url - The business URL to generate mock data for
 * @returns Realistic CrawledData object
 */
export function generateMockCrawlData(url: string): CrawledData {
  const domain = extractDomain(url);
  const profile = MOCK_BUSINESS_PROFILES[domain];

  if (!profile) {
    // Generate generic mock data for unknown domains
    const genericName = domain
      .replace(/\.(com|org|net|co|io)$/, '')
      .split('.')
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');

    return {
      name: genericName,
      description: `${genericName} provides quality services`,
      location: {
        city: 'San Francisco',
        state: 'CA',
        country: 'US'
      },
      categories: ['service'],
      llmEnhanced: {
        targetAudience: 'Local customers seeking quality services',
        keyDifferentiators: ['Quality service', 'Customer focused', 'Local expertise'],
        businessCategory: 'service'
      }
    };
  }

  // Generate realistic mock data based on profile
  return {
    name: profile.name,
    description: profile.description,
    phone: profile.phone,
    email: profile.email,
    address: profile.location.address,
    location: profile.location,
    services: profile.services,
    categories: [profile.industry],
    llmEnhanced: {
      targetAudience: generateTargetAudience(profile),
      keyDifferentiators: generateKeyDifferentiators(profile),
      businessCategory: profile.industry
    }
  };
}

/**
 * Generate realistic page content based on business profile
 */
function generateRealisticContent(profile: MockBusinessProfile): string {
  const templates = {
    'coffee shop': `Welcome to ${profile.name}! We're passionate about serving exceptional coffee in ${profile.location.city}. Our expertly roasted beans and skilled baristas create the perfect cup every time. Visit us at ${profile.location.address} for ${profile.services.join(', ')}.`,
    'healthcare': `${profile.name} provides comprehensive medical care in ${profile.location.city}, ${profile.location.state}. Our experienced physicians offer ${profile.services.join(', ')} with a focus on patient-centered care. Schedule your appointment today.`,
    'restaurant': `${profile.name} serves authentic ${profile.services[0]} in the heart of ${profile.location.city}. Known for our ${profile.services.slice(0, 3).join(', ')}, we've been a local favorite since our opening. Order online or visit us at ${profile.location.address}.`
  };

  return templates[profile.industry as keyof typeof templates] || 
         `${profile.name} is a leading ${profile.industry} business in ${profile.location.city}. ${profile.description}`;
}

/**
 * Generate target audience based on business type
 */
function generateTargetAudience(profile: MockBusinessProfile): string {
  const audiences = {
    'coffee shop': `Coffee enthusiasts and professionals in ${profile.location.city} seeking high-quality, artisanal coffee experiences`,
    'healthcare': `Patients in ${profile.location.city} and surrounding areas seeking comprehensive medical care and preventive health services`,
    'restaurant': `Food lovers and locals in ${profile.location.city} looking for authentic, high-quality dining experiences`
  };

  return audiences[profile.industry as keyof typeof audiences] || 
         `Local customers in ${profile.location.city} seeking quality ${profile.industry} services`;
}

/**
 * Generate key differentiators based on business profile
 */
function generateKeyDifferentiators(profile: MockBusinessProfile): string[] {
  const differentiators = {
    'coffee shop': ['Freshly roasted beans', 'Expert baristas', 'Sustainable sourcing', 'Artisanal brewing methods'],
    'healthcare': ['Board-certified physicians', 'Comprehensive care', 'Patient-centered approach', 'Advanced diagnostics'],
    'restaurant': ['Authentic recipes', 'Fresh ingredients', 'Family-owned tradition', 'Local favorite']
  };

  return differentiators[profile.industry as keyof typeof differentiators] || 
         ['Quality service', 'Local expertise', 'Customer satisfaction', 'Professional staff'];
}

/**
 * Check if mock data should be used based on environment or URL
 */
export function shouldUseMockCrawlData(url: string): boolean {
  // Use mock data in development or when Firecrawl API is unavailable
  const isDevelopment = process.env.NODE_ENV === 'development';
  const domain = extractDomain(url);
  const hasMockProfile = domain in MOCK_BUSINESS_PROFILES;
  
  // Always use mock for known test domains, or in development for any domain
  return hasMockProfile || isDevelopment;
}

/**
 * Get available mock business domains for testing
 */
export function getAvailableMockDomains(): string[] {
  return Object.keys(MOCK_BUSINESS_PROFILES);
}
