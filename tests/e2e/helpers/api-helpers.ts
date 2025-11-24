/**
 * API Helpers for E2E Tests
 * DRY: Centralized API interaction helpers
 * SOLID: Single Responsibility - only handles API interactions
 * 
 * Pragmatic: Use real internal APIs, only mock external services
 */

import { Page } from '@playwright/test';
import type Stripe from 'stripe';

/**
 * Track active routes for cleanup (SOLID: single responsibility for route management)
 * DRY: Centralized route tracking
 */
const activeRoutes = new WeakMap<Page, Set<string>>();

/**
 * Clean up all active routes for a page (SOLID: cleanup responsibility)
 * DRY: Reusable cleanup helper
 * Fixes: Tests hanging because routes stay active
 */
export async function cleanupRoutes(page: Page) {
  const routes = activeRoutes.get(page);
  if (routes) {
    for (const pattern of routes) {
      try {
        await page.unroute(pattern);
      } catch (error) {
        // Ignore errors (route might not exist)
      }
    }
    routes.clear();
  }
}

/**
 * Track a route pattern for cleanup (DRY: centralized tracking)
 */
function trackRoute(page: Page, pattern: string) {
  if (!activeRoutes.has(page)) {
    activeRoutes.set(page, new Set());
  }
  activeRoutes.get(page)!.add(pattern);
}

/**
 * Setup Pro team using real webhook endpoint (DRY: reusable helper)
 * 
 * Uses the actual production `/api/stripe/webhook` endpoint, ensuring:
 * - Real e2e behavior (same API endpoint as production)
 * - Real webhook route logic (event handling, normalization)
 * - Backend queries (getTeamForUser) return correct plan
 * - Permission checks (canPublishToWikidata) work correctly
 * 
 * This uses the real webhook API endpoint with test-mode signature bypass.
 * All production code paths are exercised (webhook route → handleSubscriptionChange → updateTeamSubscription).
 */
export async function setupProTeam(page: Page) {
  // Get user's team first via real API endpoint
  const teamResponse = await page.request.get('/api/team');
  if (!teamResponse.ok()) {
    throw new Error(`Failed to get team: ${teamResponse.status}`);
  }
  const team = await teamResponse.json();
  if (!team || !team.id) {
    throw new Error('No team found for user');
  }

  // Ensure team has a Stripe customer ID (required by handleSubscriptionChange)
  // Use test-only API endpoint to set customer ID (still uses real API, just test-only route)
  let customerId = team.stripeCustomerId;
  if (!customerId) {
    // For test setup, we need to set customer ID
    // In production, this would be set during Stripe checkout
    customerId = `cus_test_${team.id}`;
    const customerIdResponse = await page.request.post('/api/test/team/customer-id', {
      data: { customerId },
    });
    if (!customerIdResponse.ok()) {
      const error = await customerIdResponse.text();
      throw new Error(`Failed to set customer ID: ${customerIdResponse.status} - ${error}`);
    }
  }

  // Create Stripe webhook event matching production structure
  // This will be processed by the REAL /api/stripe/webhook endpoint
  // Use static import to avoid dynamic import issues in Playwright
  const Stripe = (await import('stripe')).default;
  const webhookEvent: Stripe.Event = {
    id: `evt_test_${team.id}`,
    type: 'customer.subscription.updated',
    api_version: '2025-04-30.basil',
    created: Math.floor(Date.now() / 1000),
    livemode: false,
    pending_webhooks: 0,
    request: null,
    object: 'event',
    data: {
      object: {
        id: `sub_test_${team.id}`,
        customer: customerId,
        status: 'active',
        items: {
          data: [
            {
              plan: {
                product: {
                  name: 'Pro Plan', // Will be normalized to 'pro' by normalizeProductNameToPlanId
                },
                id: `price_test_pro_${team.id}`,
              },
            },
          ],
        },
      } as Stripe.Subscription,
    },
  };

  // Call the REAL webhook endpoint (production API route)
  // Signature verification is bypassed in test mode (see webhook route)
  const webhookResponse = await page.request.post('/api/stripe/webhook', {
    data: JSON.stringify(webhookEvent),
    headers: {
      'Content-Type': 'application/json',
      'stripe-signature': 'test-signature', // Triggers test-mode bypass
    },
  });

  if (!webhookResponse.ok()) {
    const error = await webhookResponse.text();
    throw new Error(`Failed to setup Pro team via webhook: ${webhookResponse.status} - ${error}`);
  }

  // Verify the update succeeded via real API endpoint
  const updatedTeamResponse = await page.request.get('/api/team');
  if (!updatedTeamResponse.ok()) {
    throw new Error(`Failed to verify team update: ${updatedTeamResponse.status}`);
  }
  const updatedTeam = await updatedTeamResponse.json();
  if (updatedTeam.planName !== 'pro') {
    throw new Error(`Team plan not updated correctly. Expected 'pro', got '${updatedTeam.planName}'`);
  }
}

/**
 * Setup Free team via API (DRY: reusable helper)
 */
export async function setupFreeTeam(page: Page) {
  const pattern = '**/api/team';
  trackRoute(page, pattern);
  await page.route(pattern, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 1,
        name: 'Test Team',
        planName: 'free',
        planId: 'free',
        stripeCustomerId: null,
        stripeSubscriptionId: null,
        stripeProductId: null,
        subscriptionStatus: null,
      }),
    });
  });
}

/**
 * Setup Agency team via API (DRY: reusable helper)
 */
export async function setupAgencyTeam(page: Page) {
  const pattern = '**/api/team';
  trackRoute(page, pattern);
  await page.route(pattern, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 1,
        name: 'Test Team',
        planName: 'agency',
        planId: 'agency',
        stripeCustomerId: 'cus_test_123',
        stripeSubscriptionId: 'sub_test_123',
        stripeProductId: 'prod_agency_123',
        subscriptionStatus: 'active',
      }),
    });
  });
}

/**
 * Mock OpenRouter API (external service - expensive, slow)
 * DRY: Centralized OpenRouter mocking
 * Pragmatic: Mock to save money and speed up tests
 * Fixes: Crawl operations are slow/expensive because they use real OpenRouter API calls
 */
export async function mockOpenRouterAPI(page: Page) {
  // Match OpenRouter API endpoint (external service - expensive, slow)
  // Pattern matches both http and https, with or without trailing paths
  const pattern = '**/openrouter.ai/api/v1/chat/completions*';
  trackRoute(page, pattern);
  await page.route(pattern, async (route) => {
    // Parse request to understand what's being asked
    const request = route.request();
    let body: any = {};
    try {
      body = request.postDataJSON() || {};
    } catch {
      // Request might not have JSON body - use defaults
      body = {};
    }
    
    // Generate detailed mock response matching OpenRouter API structure
    // Reference: https://openrouter.ai/docs/api-reference/chat/create
    const requestId = `chatcmpl-mock-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const model = body.model || 'openai/gpt-4-turbo';
    const messages = body.messages || [];
    const lastMessage = messages[messages.length - 1]?.content || '';
    
    // Extract business context from prompt for realistic responses
    const businessNameMatch = lastMessage.match(/(?:about|for|regarding)\s+([A-Z][a-zA-Z\s&]+?)(?:\s+in|\s+at|\.|$)/i);
    const businessName = businessNameMatch ? businessNameMatch[1].trim() : 'the business';
    
    // Generate context-aware content based on prompt type
    let content = '';
    const lowerPrompt = lastMessage.toLowerCase();
    
    // For recommendation queries, ensure we include competitors for competitive analysis
    if (lowerPrompt.includes('recommend') || lowerPrompt.includes('best') || lowerPrompt.includes('top')) {
      // Use realistic competitor names that will pass validation
      const competitors = ['TechCorp Solutions', 'DataSystems Inc', 'CloudSoft LLC', 'DevTools Group'];
      const mentioned = Math.random() > 0.3; // 70% chance of mentioning target business
      const position = mentioned ? Math.floor(Math.random() * 3) + 1 : null;
      
      content = `Here are the top recommendations:\n\n`;
      let rank = 1;
      
      if (mentioned && position) {
        // Insert target business at specified position
        // Format: "1. BusinessName" (no dash, easier to parse)
        for (let i = 1; i < position; i++) {
          content += `${i}. ${competitors[i - 1]}\n`;
          rank++;
        }
        content += `${position}. ${businessName}\n`;
        rank++;
      }
      
      // Add remaining competitors
      for (let i = rank - 1; i < competitors.length && rank <= 5; i++) {
        content += `${rank}. ${competitors[i]}\n`;
        rank++;
      }
      
      content += `\nEach of these businesses has demonstrated professional standards.`;
    } else if (lowerPrompt.includes('what do you know about') || lowerPrompt.includes('information about')) {
      content = `I know that ${businessName} is a well-established business in their industry. They provide quality services and have a good reputation in their local market. The business has been operating for several years and serves customers in their area.`;
    } else if (lowerPrompt.includes('thinking about') || lowerPrompt.includes('considering')) {
      content = `${businessName} seems like a solid choice. They have a good track record and appear to be reputable. I would consider them if you're looking for their type of services in the area.`;
    } else {
      content = `I can provide information about ${businessName}. They are a local business that offers quality services. For more specific details, I'd recommend visiting their website or contacting them directly.`;
    }
    
    // Match OpenRouter API response structure exactly
    // Reference: https://openrouter.ai/docs/api-reference/chat/create#response
    const mockResponse = {
      id: requestId,
      model: model,
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      choices: [
        {
          index: 0,
          message: {
            role: 'assistant',
            content: content,
          },
          finish_reason: 'stop',
          logprobs: null,
        },
      ],
      usage: {
        prompt_tokens: Math.floor(lastMessage.length / 4) + 50, // Rough estimate
        completion_tokens: Math.floor(content.length / 4),
        total_tokens: Math.floor((lastMessage.length + content.length) / 4) + 50,
      },
      // OpenRouter-specific fields
      provider: {
        id: model.includes('gpt') ? 'openai' : model.includes('claude') ? 'anthropic' : 'google',
        is_moderation: false,
      },
    };
    
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockResponse),
    });
  });
}

/**
 * Mock external services only (Stripe, Wikidata, OpenRouter)
 * DRY: Centralized external service mocking
 * Pragmatic: Only mock what's external, use real internal APIs
 */
export async function mockExternalServices(page: Page) {
  // Mock OpenRouter API (external service - expensive, slow)
  await mockOpenRouterAPI(page);
  
  // Mock Stripe checkout (external service - must mock)
  const pattern = '**/api/stripe/checkout**';
  trackRoute(page, pattern);
  await page.route(pattern, async (route) => {
    if (route.request().method() === 'POST') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          url: 'https://checkout.stripe.com/test',
        }),
      });
    } else {
      await route.continue();
    }
  });
}

/**
 * Mock crawl API (internal service, but may be slow)
 * Pragmatic: Mock if slow, use real if fast
 * DRY: Centralized crawl API mocking
 */
export async function mockCrawlAPI(page: Page, businessId?: number) {
  await page.route('**/api/crawl', async (route) => {
    if (route.request().method() === 'POST') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          jobId: 1,
          status: 'queued',
          message: 'Crawl job started',
        }),
      });
    } else {
      await route.continue();
    }
  });

  // Mock job status API (internal service)
  await page.route('**/api/job/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 1,
        status: 'completed',
        result: {
          businessId: businessId || 1,
        },
      }),
    });
  });
}

/**
 * Mock Wikidata entity API (internal service, but may be slow)
 * Pragmatic: Mock for speed - entity building can be slow
 * DRY: Centralized entity API mocking
 */
export async function mockWikidataEntityAPI(page: Page, businessId: number, qid: string | null = null) {
  // DRY: Mock entity API response matching actual entity endpoint format
  // SOLID: Single Responsibility - mock matches real API contract
  // Pragmatic: Include all fields that entity endpoint now returns (including notability)
  const mockEntityResponse = {
    qid: qid || null,
    label: 'Test Business',
    description: 'A test business',
    wikidataUrl: qid ? `https://www.wikidata.org/wiki/${qid}` : null,
    lastUpdated: new Date().toISOString(),
    claims: [],
    stats: {
      totalClaims: 5,
      claimsWithReferences: 3,
      referenceQuality: 'high' as const,
    },
    canEdit: qid !== null,
    editUrl: qid ? `https://www.wikidata.org/wiki/${qid}` : null,
    // DRY: Include notability data (entity endpoint now includes this after our fix)
    notability: {
      isNotable: true,
      confidence: 0.85,
      reasons: ['Test business'],
      seriousReferenceCount: 1,
      topReferences: [],
    },
    canPublish: true,
  };

  await page.route(`**/api/wikidata/entity/${businessId}**`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockEntityResponse),
    });
  });

  // Also mock generic entity endpoint (pragmatic: handle different URL patterns)
  await page.route('**/api/wikidata/entity**', async (route) => {
    // Extract businessId from URL if possible
    const url = route.request().url();
    const businessIdMatch = url.match(/\/entity\/(\d+)/);
    const entityBusinessId = businessIdMatch ? parseInt(businessIdMatch[1]) : businessId;

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockEntityResponse),
    });
  });
}

/**
 * Mock fingerprint API (internal service, but may be slow)
 * Pragmatic: Mock if slow, use real if fast
 * DRY: Centralized fingerprint API mocking
 */
export async function mockFingerprintAPI(page: Page, businessId?: number) {
  await page.route('**/api/fingerprint', async (route) => {
    if (route.request().method() === 'POST') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          fingerprintId: 1,
          status: 'completed',
          visibilityScore: 75,
        }),
      });
    } else {
      await route.continue();
    }
  });

  // Mock fingerprint GET endpoint
  if (businessId) {
    await page.route(`**/api/fingerprint/business/${businessId}**`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          visibilityScore: 75,
          mentionRate: 0.85,
          sentimentScore: 0.9,
          results: [],
        }),
      });
    });
  }
}

// NOTE: waitForBusinessInAPI has been moved to business-helpers.ts
// This function is kept for backwards compatibility but delegates to the centralized version
// DRY: Single source of truth for business API polling logic
export async function waitForBusinessInAPI(
  page: Page,
  businessId: number,
  timeoutOrOptions: number | { status?: string; timeout?: number } = 5000
) {
  // Import the centralized version (DRY: avoid duplication)
  const { waitForBusinessInAPI: waitForBusiness } = await import('./business-helpers');
  
  // Handle both old signature (number) and new signature (options object)
  if (typeof timeoutOrOptions === 'number') {
    return await waitForBusiness(page, businessId, { timeout: timeoutOrOptions });
  } else {
    return await waitForBusiness(page, businessId, timeoutOrOptions);
  }
}

