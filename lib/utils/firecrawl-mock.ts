/**
 * Firecrawl API Mock for Development
 * Provides realistic mock responses for Firecrawl API calls
 */

import type { 
  FirecrawlCrawlResponse, 
  FirecrawlJobStatusResponse,
  FirecrawlCrawlPageData,
  BusinessExtractData 
} from '@/lib/types/contracts/firecrawl-contract';

// Mock business data for different domains
// All fields must match BusinessExtractData type
const MOCK_BUSINESS_DATA: Record<string, BusinessExtractData> = {
  'stripe.com': {
    businessName: 'Stripe',
    description: 'Online payment processing for internet businesses. Stripe is a suite of payment APIs that powers commerce for online businesses of all sizes.',
    industry: 'Financial Technology',
    phone: '+1-888-926-2289',
    email: 'support@stripe.com',
    address: '354 Oyster Point Blvd, South San Francisco, CA 94080, USA',
    city: 'South San Francisco',
    state: 'California',
    country: 'United States',
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
    website: 'https://stripe.com',
    founded: '2010'
  },
  'tesla.com': {
    businessName: 'Tesla',
    description: 'Tesla designs and manufactures electric vehicles, energy generation and storage systems.',
    industry: 'Automotive & Energy',
    phone: '+1-650-681-5000',
    email: 'info@tesla.com',
    address: '1 Tesla Road, Austin, TX 78725, USA',
    city: 'Austin',
    state: 'Texas',
    country: 'United States',
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
    website: 'https://tesla.com',
    founded: '2003',
    hours: '9:00 AM - 9:00 PM'
  },
  'brownphysicians.org': {
    businessName: 'Brown Physicians',
    description: 'Multi-specialty physician practice affiliated with Brown University providing comprehensive healthcare services.',
    industry: 'Healthcare',
    email: 'info@brownphysicians.org',
    phone: '(401) 444-5648',
    address: '593 Eddy St, Providence, RI 02903',
    city: 'Providence',
    state: 'Rhode Island',
    country: 'United States',
    postalCode: '02903',
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
    website: 'https://brownphysicians.org',
    hours: '8:00 AM - 5:00 PM'
  },
  'default': {
    businessName: 'Sample Business',
    description: 'A sample business for demonstration purposes.',
    industry: 'General Business',
    email: 'contact@example.com',
    phone: '+1-555-0123',
    address: '123 Main St, Anytown, USA',
    city: 'Anytown',
    state: 'California',
    country: 'United States',
    services: [
      'General Services',
      'Customer Support',
      'Consulting'
    ],
    socialMedia: {
      twitter: 'https://twitter.com/example',
      linkedin: 'https://linkedin.com/company/example'
    },
    website: 'https://example.com',
    founded: '2020',
    hours: '9:00 AM - 5:00 PM'
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
    businessData.website = url;
  }

  // Enhanced mock response matching FireCrawl API v1 structure
  // Based on: https://docs.firecrawl.dev/api-reference/crawl
  const jobId = `job-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const timestamp = new Date().toISOString();
  
  const mockPageData: FirecrawlCrawlPageData = {
    url: url,
    markdown: `# ${businessData.businessName || 'Business'}\n\n${businessData.description || ''}\n\n## Services\n${(businessData.services || []).map(s => `- ${s}`).join('\n')}\n\n## Contact\nEmail: ${businessData.email || ''}\nPhone: ${businessData.phone || ''}\nAddress: ${businessData.address || ''}`,
    html: `<html><head><title>${businessData.businessName || 'Business'}</title><meta name="description" content="${businessData.description || ''}"></head><body><h1>${businessData.businessName || 'Business'}</h1><p>${businessData.description || ''}</p><nav><a href="${url}/about">About</a><a href="${url}/services">Services</a><a href="${url}/contact">Contact</a></nav></body></html>`,
    rawHtml: `<html><head><title>${businessData.businessName || 'Business'}</title></head><body><h1>${businessData.businessName || 'Business'}</h1><p>${businessData.description || ''}</p></body></html>`,
    links: [
      `${url}/about`,
      `${url}/services`,
      `${url}/contact`,
      businessData.socialMedia?.twitter || '',
      businessData.socialMedia?.linkedin || ''
    ].filter(Boolean),
    screenshot: `https://example.com/screenshots/${domain}.png`,
    metadata: {
      title: businessData.businessName || '',
      description: businessData.description || '',
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
    data: [mockPageData]
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
      data: crawlResponse.data || []
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
      data: []
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
