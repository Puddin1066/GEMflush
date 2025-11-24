/**
 * Firecrawl API Mock for Development
 * Provides realistic mock responses for Firecrawl API calls
 */

import type { 
  FirecrawlCrawlResponse, 
  FirecrawlJobStatusResponse,
  FirecrawlCrawlPageData,
  BusinessExtractData 
} from '@/lib/types/firecrawl-contract';

// Mock business data for different domains
const MOCK_BUSINESS_DATA: Record<string, BusinessExtractData> = {
  'stripe.com': {
    businessName: 'Stripe',
    businessDescription: 'Online payment processing for internet businesses. Stripe is a suite of payment APIs that powers commerce for online businesses of all sizes.',
    businessCategory: 'Financial Technology',
    contactInfo: {
      email: 'support@stripe.com',
      phone: '+1-888-926-2289',
      address: '354 Oyster Point Blvd, South San Francisco, CA 94080, USA'
    },
    location: {
      city: 'South San Francisco',
      state: 'California',
      country: 'United States',
      coordinates: {
        latitude: 37.6624,
        longitude: -122.3897
      }
    },
    services: [
      'Payment Processing',
      'Online Payments',
      'Subscription Management',
      'Marketplace Payments',
      'Mobile Payments',
      'International Payments'
    ],
    socialMedia: {
      twitter: 'https://twitter.com/stripe',
      linkedin: 'https://linkedin.com/company/stripe',
      facebook: 'https://facebook.com/StripeHQ'
    },
    businessHours: {
      monday: '24/7 Support',
      tuesday: '24/7 Support',
      wednesday: '24/7 Support',
      thursday: '24/7 Support',
      friday: '24/7 Support',
      saturday: '24/7 Support',
      sunday: '24/7 Support'
    },
    additionalInfo: {
      founded: '2010',
      employees: '4000+',
      headquarters: 'South San Francisco, California',
      website: 'https://stripe.com',
      industry: 'Financial Services'
    }
  },
  'tesla.com': {
    businessName: 'Tesla',
    businessDescription: 'Tesla designs and manufactures electric vehicles, energy generation and storage systems.',
    businessCategory: 'Automotive & Energy',
    contactInfo: {
      email: 'info@tesla.com',
      phone: '+1-650-681-5000',
      address: '1 Tesla Road, Austin, TX 78725, USA'
    },
    location: {
      city: 'Austin',
      state: 'Texas',
      country: 'United States',
      coordinates: {
        latitude: 30.2672,
        longitude: -97.7431
      }
    },
    services: [
      'Electric Vehicles',
      'Energy Storage',
      'Solar Panels',
      'Supercharging Network',
      'Autonomous Driving',
      'Energy Solutions'
    ],
    socialMedia: {
      twitter: 'https://twitter.com/tesla',
      linkedin: 'https://linkedin.com/company/tesla-motors',
      facebook: 'https://facebook.com/tesla'
    },
    businessHours: {
      monday: '9:00 AM - 9:00 PM',
      tuesday: '9:00 AM - 9:00 PM',
      wednesday: '9:00 AM - 9:00 PM',
      thursday: '9:00 AM - 9:00 PM',
      friday: '9:00 AM - 9:00 PM',
      saturday: '9:00 AM - 9:00 PM',
      sunday: '10:00 AM - 7:00 PM'
    },
    additionalInfo: {
      founded: '2003',
      employees: '127000+',
      headquarters: 'Austin, Texas',
      website: 'https://tesla.com',
      industry: 'Automotive'
    }
  },
  'brownphysicians.org': {
    businessName: 'Brown Physicians',
    businessDescription: 'Multi-specialty physician practice affiliated with Brown University providing comprehensive healthcare services.',
    businessCategory: 'Healthcare',
    contactInfo: {
      email: 'info@brownphysicians.org',
      phone: '(401) 444-5648',
      address: '593 Eddy St, Providence, RI 02903'
    },
    location: {
      city: 'Providence',
      state: 'Rhode Island',
      country: 'United States',
      coordinates: {
        latitude: 41.824,
        longitude: -71.4128
      }
    },
    services: [
      'Primary Care',
      'Internal Medicine',
      'Family Medicine',
      'Preventive Care',
      'Health Screenings'
    ],
    socialMedia: {
      twitter: '',
      linkedin: '',
      facebook: ''
    },
    businessHours: {
      monday: '8:00 AM - 5:00 PM',
      tuesday: '8:00 AM - 5:00 PM',
      wednesday: '8:00 AM - 5:00 PM',
      thursday: '8:00 AM - 5:00 PM',
      friday: '8:00 AM - 5:00 PM',
      saturday: 'Closed',
      sunday: 'Closed'
    },
    additionalInfo: {
      founded: '',
      employees: '50+',
      headquarters: 'Providence, Rhode Island',
      website: 'https://brownphysicians.org',
      industry: 'Healthcare'
    }
  },
  'default': {
    businessName: 'Sample Business',
    businessDescription: 'A sample business for demonstration purposes.',
    businessCategory: 'General Business',
    contactInfo: {
      email: 'contact@example.com',
      phone: '+1-555-0123',
      address: '123 Main St, Anytown, USA'
    },
    location: {
      city: 'Anytown',
      state: 'California',
      country: 'United States',
      coordinates: {
        latitude: 37.7749,
        longitude: -122.4194
      }
    },
    services: [
      'General Services',
      'Customer Support',
      'Consulting'
    ],
    socialMedia: {
      twitter: 'https://twitter.com/example',
      linkedin: 'https://linkedin.com/company/example'
    },
    businessHours: {
      monday: '9:00 AM - 5:00 PM',
      tuesday: '9:00 AM - 5:00 PM',
      wednesday: '9:00 AM - 5:00 PM',
      thursday: '9:00 AM - 5:00 PM',
      friday: '9:00 AM - 5:00 PM',
      saturday: 'Closed',
      sunday: 'Closed'
    },
    additionalInfo: {
      founded: '2020',
      employees: '50+',
      headquarters: 'Anytown, California',
      website: 'https://example.com',
      industry: 'General'
    }
  }
};

/**
 * Extract domain from URL for mock data lookup
 */
function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace('www.', '');
  } catch {
    return 'default';
  }
}

/**
 * Generate mock Firecrawl crawl response
 */
export function generateMockFirecrawlCrawlResponse(url: string): FirecrawlCrawlResponse {
  const domain = extractDomain(url);
  const businessData = MOCK_BUSINESS_DATA[domain] || MOCK_BUSINESS_DATA.default;
  
  // Customize business data based on URL
  if (domain !== 'stripe.com' && domain !== 'tesla.com' && domain !== 'default') {
    businessData.businessName = domain.split('.')[0].charAt(0).toUpperCase() + domain.split('.')[0].slice(1);
    businessData.additionalInfo.website = url;
  }

  // Enhanced mock response matching FireCrawl API v1 structure
  // Based on: https://docs.firecrawl.dev/api-reference/crawl
  const jobId = `job-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const timestamp = new Date().toISOString();
  
  const mockPageData: FirecrawlCrawlPageData = {
    markdown: `# ${businessData.businessName}\n\n${businessData.businessDescription}\n\n## Services\n${businessData.services.map(s => `- ${s}`).join('\n')}\n\n## Contact\nEmail: ${businessData.contactInfo.email}\nPhone: ${businessData.contactInfo.phone}\nAddress: ${businessData.contactInfo.address}`,
    html: `<html><head><title>${businessData.businessName}</title><meta name="description" content="${businessData.businessDescription}"></head><body><h1>${businessData.businessName}</h1><p>${businessData.businessDescription}</p><nav><a href="${url}/about">About</a><a href="${url}/services">Services</a><a href="${url}/contact">Contact</a></nav></body></html>`,
    rawHtml: `<html><head><title>${businessData.businessName}</title></head><body><h1>${businessData.businessName}</h1><p>${businessData.businessDescription}</p></body></html>`,
    linksOnPage: [
      `${url}/about`,
      `${url}/services`,
      `${url}/contact`,
      businessData.socialMedia.twitter || '',
      businessData.socialMedia.linkedin || ''
    ].filter(Boolean),
    screenshot: `https://example.com/screenshots/${domain}.png`,
    metadata: {
      title: businessData.businessName,
      description: businessData.businessDescription,
      language: 'en',
      sourceURL: url,
      statusCode: 200,
      error: ''
    },
    llm_extraction: businessData
  };

  // Match FireCrawl API v1 response structure exactly
  // Reference: https://docs.firecrawl.dev/api-reference/crawl#response
  return {
    success: true,
    id: jobId,
    url: url,
    data: [mockPageData],
    partial_data: [],
    warning: null,
    error: null
  };
}

/**
 * Generate mock Firecrawl job status response
 */
export function generateMockFirecrawlJobStatus(
  jobId: string, 
  url: string,
  status: 'scraping' | 'completed' | 'failed' = 'completed'
): FirecrawlJobStatusResponse {
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  
  // Match FireCrawl API v1 job status response structure
  // Reference: https://docs.firecrawl.dev/api-reference/crawl#get-job-status
  if (status === 'completed') {
    const crawlResponse = generateMockFirecrawlCrawlResponse(url);
    return {
      success: true,
      status: 'completed',
      total: 1,
      completed: 1,
      creditsUsed: 1,
      expiresAt: expiresAt,
      data: crawlResponse.data || [],
      partial_data: []
    };
  }

  if (status === 'scraping') {
    return {
      success: true,
      status: 'scraping',
      total: 1,
      completed: 0,
      creditsUsed: 0,
      expiresAt: expiresAt,
      data: [],
      partial_data: []
    };
  }

  // Failed status - match API error response structure
  return {
    success: false,
    status: 'failed',
    total: 1,
    completed: 0,
    creditsUsed: 1,
    expiresAt: expiresAt,
    data: [],
    partial_data: [],
    error: 'Crawl job failed - unable to access target URL'
  };
}

/**
 * Check if we should use mock Firecrawl data
 * P0 Fix: Handle paused subscription - always use mocks if subscription is paused
 * DRY: Centralized mock detection logic
 * 
 * Note: If Firecrawl subscription is paused, API key may exist but API calls will fail.
 * Set USE_MOCK_FIRECRAWL=true to force mocks.
 */
export function shouldUseMockFirecrawl(): boolean {
  // Use mocks if:
  // 1. API key not configured
  // 2. In development mode
  // 3. Explicitly disabled via environment variable (for paused subscriptions)
  // 4. In test mode (Playwright tests)
  return !process.env.FIRECRAWL_API_KEY 
    || process.env.NODE_ENV === 'development'
    || process.env.USE_MOCK_FIRECRAWL === 'true'
    || process.env.PLAYWRIGHT_TEST === 'true';
}

/**
 * Mock fetch implementation for Firecrawl API
 */
export async function mockFirecrawlFetch(url: string, options: RequestInit): Promise<Response> {
  console.log(`[FIRECRAWL MOCK] Intercepting request to: ${url}`);
  
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));

  if (url.includes('/v1/crawl') && options.method === 'POST') {
    // Mock crawl initiation
    const body = JSON.parse(options.body as string);
    const targetUrl = body.url;
    
    console.log(`[FIRECRAWL MOCK] Starting crawl for: ${targetUrl}`);
    
    const response = generateMockFirecrawlCrawlResponse(targetUrl);
    
    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  if (url.includes('/v1/crawl/') && options.method === 'GET') {
    // Mock job status check
    const jobId = url.split('/').pop() || '';
    const mockUrl = 'https://example.com'; // Default for job status
    
    console.log(`[FIRECRAWL MOCK] Checking job status: ${jobId}`);
    
    const response = generateMockFirecrawlJobStatus(jobId, mockUrl, 'completed');
    
    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Fallback for other requests
  return new Response(JSON.stringify({ error: 'Mock endpoint not implemented' }), {
    status: 404,
    headers: { 'Content-Type': 'application/json' }
  });
}
