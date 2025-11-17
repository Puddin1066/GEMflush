# Frictionless CRON-Driven Monthly Automation

## Overview

This document proposes a complete adaptation of the UX and data flows to enable frictionless onboarding (URL-only input) and monthly CRON-driven automation for all business processing operations.

## Goals

1. **Frictionless Onboarding**: Users provide only a URL; system auto-extracts all business data
2. **Monthly Automation**: All businesses receive automated crawl, fingerprint, and publication updates monthly
3. **Efficiency**: All operations run in parallel where possible, with optimized database queries
4. **UX Simplification**: Remove manual buttons for Pro/Agency users; show automation status instead

---

## 1. Frictionless URL-Only Onboarding

### 1.1 Current State

**Current Flow:**
- User must provide: name, URL, category, location (city, state, country)
- Manual form with multiple required fields
- Auto-processing starts after business creation

**Current Validation:**
```typescript
// lib/validation/business.ts
{
  name: string (required, min 2 chars),
  url: string (required, valid URL),
  category: enum (optional),
  location: {
    city: string (required),
    state: string (required),
    country: string (required)
  }
}
```

### 1.2 Proposed Changes

#### A. Simplified Business Creation Schema

```typescript
// lib/validation/business.ts

// New schema for URL-only creation
export const createBusinessFromUrlSchema = z.object({
  url: z.string().url('Must be a valid URL'),
  // All other fields optional - will be extracted from crawl
  name: z.string().min(2).max(200).optional(),
  category: businessCategorySchema.optional(),
  location: businessLocationSchema.optional(),
});

// Enhanced location extraction
export const extractedLocationSchema = z.object({
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional().default('US'),
  postalCode: z.string().optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
});
```

#### B. Enhanced Crawler Location Extraction

**File:** `lib/crawler/index.ts`

**Changes:**
1. Extract structured location from JSON-LD (LocalBusiness schema)
2. Enhance LLM prompt to extract city/state/country
3. Add fallback geocoding if location not found

```typescript
// lib/crawler/index.ts

export interface CrawledData {
  // ... existing fields ...
  location?: {
    address?: string;
    city?: string;
    state?: string;
    country?: string;
    postalCode?: string;
    lat?: number;
    lng?: number;
  };
}

private extractData($: cheerio.CheerioAPI, url: string): Promise<CrawledData> {
  const data: CrawledData = {};
  
  // PASS 1: Extract structured data (JSON-LD)
  const structuredData = this.extractJSONLD($);
  if (structuredData) {
    // ... existing extraction ...
    
    // NEW: Extract location from JSON-LD
    if (structuredData.address) {
      const addr = structuredData.address;
      if (typeof addr === 'object') {
        data.location = {
          address: addr.streetAddress || addr.address,
          city: addr.addressLocality || addr.city,
          state: addr.addressRegion || addr.state,
          country: addr.addressCountry || addr.country || 'US',
          postalCode: addr.postalCode,
        };
      }
    }
    
    // Extract coordinates if available
    if (structuredData.geo) {
      const geo = structuredData.geo;
      if (typeof geo === 'object') {
        if (data.location) {
          data.location.lat = geo.latitude || geo.lat;
          data.location.lng = geo.longitude || geo.lng;
        }
      }
    }
  }
  
  // ... existing extraction ...
  
  // PASS 2: LLM-enhanced extraction (enhanced prompt)
  const llmEnhancement = await this.enhanceWithLLM($, data, url);
  
  return {
    ...data,
    ...llmEnhancement,
  };
}

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
```

#### C. Business Creation Endpoint Update

**File:** `app/api/business/route.ts`

```typescript
export async function POST(request: NextRequest) {
  // ... existing auth checks ...
  
  const body = await request.json();
  
  // NEW: If only URL provided, crawl first to extract data
  let validatedData;
  
  if (body.url && (!body.name || !body.location)) {
    console.log('[BUSINESS] URL-only creation detected, crawling to extract data...');
    
    // Crawl URL to extract business data
    const crawlResult = await webCrawler.crawl(body.url);
    
    if (!crawlResult.success || !crawlResult.data) {
      return NextResponse.json(
        { error: 'Failed to crawl URL. Please provide business details manually.' },
        { status: 400 }
      );
    }
    
    const crawled = crawlResult.data;
    
    // Merge crawled data with user-provided data (user data takes precedence)
    const mergedData = {
      url: body.url,
      name: body.name || crawled.name || 'Unknown Business',
      category: body.category || mapCategoryToEnum(crawled.llmEnhanced?.businessCategory),
      location: body.location || (crawled.location ? {
        address: crawled.location.address,
        city: crawled.location.city || 'Unknown',
        state: crawled.location.state || 'Unknown',
        country: crawled.location.country || 'US',
        lat: crawled.location.lat,
        lng: crawled.location.lng,
      } : {
        city: 'Unknown',
        state: 'Unknown',
        country: 'US',
      }),
    };
    
    // Validate merged data
    validatedData = createBusinessSchema.parse(mergedData);
  } else {
    // Standard validation for full data
    validatedData = createBusinessSchema.parse(body);
  }
  
  // ... rest of business creation logic ...
  
  // Auto-start processing (crawl, fingerprint, publish for Pro tier)
  const { autoStartProcessing } = await import('@/lib/services/business-processing');
  autoStartProcessing(business).catch(error => {
    console.error('Auto-processing failed for business:', business.id, error);
  });
  
  return NextResponse.json(response, { status: 201 });
}

// Helper: Map LLM category to enum
function mapCategoryToEnum(llmCategory: string | undefined): string | undefined {
  if (!llmCategory) return undefined;
  
  const categoryMap: Record<string, string> = {
    'restaurant': 'restaurant',
    'retail': 'retail',
    'healthcare': 'healthcare',
    'professional services': 'professional_services',
    'home services': 'home_services',
    'automotive': 'automotive',
    'beauty': 'beauty',
    'fitness': 'fitness',
    'entertainment': 'entertainment',
    'education': 'education',
    'real estate': 'real_estate',
    'technology': 'technology',
  };
  
  const normalized = llmCategory.toLowerCase();
  return categoryMap[normalized] || 'other';
}
```

#### D. Updated UI Form

**File:** `app/(dashboard)/dashboard/businesses/new/page.tsx`

```typescript
export default function NewBusinessPage() {
  const [loading, setLoading] = useState(false);
  const [url, setUrl] = useState('');
  const [extractedData, setExtractedData] = useState<{
    name?: string;
    category?: string;
    location?: { city?: string; state?: string; country?: string };
  } | null>(null);

  const handleUrlBlur = async () => {
    if (!url) return;
    
    setLoading(true);
    try {
      // Preview crawl to show extracted data
      const response = await fetch('/api/crawl/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      
      if (response.ok) {
        const data = await response.json();
        setExtractedData(data);
      }
    } catch (error) {
      console.error('Preview crawl failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // Submit with just URL - backend will extract everything
      const response = await fetch('/api/business', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      
      if (response.ok) {
        const result = await response.json();
        router.push(`/dashboard/businesses/${result.business.id}`);
      }
    } catch (error) {
      console.error('Business creation failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="space-y-4">
        <div>
          <Label htmlFor="url">Website URL *</Label>
          <Input
            id="url"
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onBlur={handleUrlBlur}
            placeholder="https://example.com"
            required
          />
          <p className="text-sm text-muted-foreground mt-1">
            We'll automatically extract business details from your website
          </p>
        </div>
        
        {extractedData && (
          <Card className="p-4 bg-muted">
            <p className="text-sm font-medium mb-2">Extracted Information:</p>
            <ul className="text-sm space-y-1">
              <li>Name: {extractedData.name || 'Not found'}</li>
              <li>Location: {extractedData.location?.city || 'Unknown'}, {extractedData.location?.state || 'Unknown'}</li>
              <li>Category: {extractedData.category || 'Not detected'}</li>
            </ul>
            <p className="text-xs text-muted-foreground mt-2">
              You can edit these after creation if needed
            </p>
          </Card>
        )}
        
        <Button type="submit" disabled={loading || !url}>
          {loading ? 'Creating...' : 'Create Business'}
        </Button>
      </div>
    </form>
  );
}
```

---

## 2. Monthly CRON Scheduling

### 2.1 Current State

- Weekly CRON: `0 2 * * 1` (Monday 2 AM UTC)
- Processes businesses with `automationEnabled = true` and `nextCrawlAt <= now`
- Only handles crawl; fingerprint and publish are separate

### 2.2 Proposed Changes

#### A. Update Vercel CRON Configuration

**File:** `vercel.json`

```json
{
  "crons": [
    {
      "path": "/api/cron/monthly-processing",
      "schedule": "0 2 1 * *"
    }
  ]
}
```

**Schedule:** First day of each month at 2:00 AM UTC

#### B. Update Automation Config to Monthly

**File:** `lib/services/automation-service.ts`

```typescript
export function getAutomationConfig(team: Team | null): AutomationConfig {
  const planTier = team?.planName || 'free';
  
  // Free tier: manual only
  if (planTier === 'free') {
    return {
      crawlFrequency: 'manual',
      fingerprintFrequency: 'manual',
      autoPublish: false,
      entityRichness: 'basic',
      progressiveEnrichment: false,
    };
  }
  
  // Pro tier: automated monthly
  if (planTier === 'pro') {
    return {
      crawlFrequency: 'monthly',      // Changed from 'weekly'
      fingerprintFrequency: 'monthly', // Changed from 'weekly'
      autoPublish: true,
      entityRichness: 'enhanced',
      progressiveEnrichment: false,
    };
  }
  
  // Agency tier: automated monthly with enrichment
  if (planTier === 'agency') {
    return {
      crawlFrequency: 'monthly',      // Changed from 'weekly'
      fingerprintFrequency: 'monthly', // Changed from 'weekly'
      autoPublish: true,
      entityRichness: 'complete',
      progressiveEnrichment: true,
    };
  }
  
  return {
    crawlFrequency: 'manual',
    fingerprintFrequency: 'manual',
    autoPublish: false,
    entityRichness: 'basic',
    progressiveEnrichment: false,
  };
}

export function calculateNextCrawlDate(frequency: 'monthly' | 'weekly' | 'daily'): Date {
  const next = new Date();
  
  if (frequency === 'monthly') {
    next.setMonth(next.getMonth() + 1);
  } else if (frequency === 'weekly') {
    next.setDate(next.getDate() + 7);
  } else if (frequency === 'daily') {
    next.setDate(next.getDate() + 1);
  }
  
  return next;
}
```

#### C. Enhanced Monthly Processing Service

**File:** `lib/services/monthly-processing.ts`

```typescript
// Monthly Processing Service
// SOLID: Orchestrates recurring automation without HTTP concerns
// DRY: Shared between Vercel cron entrypoint and tests/scripts
// Optimized: Batch processing with parallel operations

import { db } from '@/lib/db/drizzle';
import { businesses, teams, type Business, type Team } from '@/lib/db/schema';
import { eq, and, or, lte, sql } from 'drizzle-orm';
import { autoStartProcessing } from './business-processing';
import { executeCrawlJob, executeFingerprint } from './business-processing';
import { handleAutoPublish } from './scheduler-service';
import { getAutomationConfig, calculateNextCrawlDate } from './automation-service';
import { getTeamForBusiness } from '@/lib/db/queries';

/**
 * Run monthly processing for all businesses with automation enabled
 * 
 * Optimizations:
 * - Batch database queries (eliminate N+1)
 * - Parallel processing with concurrency limits
 * - Efficient date-based filtering
 */
export async function runMonthlyProcessing(): Promise<void> {
  console.log('[MONTHLY] Starting monthly processing');
  const startTime = Date.now();
  
  const now = new Date();
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  // OPTIMIZATION: Single query with JOIN to get businesses + teams
  // Eliminates N+1 query problem
  const dueBusinessesWithTeams = await db
    .select({
      business: businesses,
      team: teams,
    })
    .from(businesses)
    .innerJoin(teams, eq(businesses.teamId, teams.id))
    .where(
      and(
        eq(businesses.automationEnabled, true),
        or(
          // Next crawl is due
          lte(businesses.nextCrawlAt, now),
          // Or last crawl was >30 days ago (catch missed schedules)
          sql`${businesses.lastCrawledAt} < ${thirtyDaysAgo}`,
          // Or never crawled but automation enabled
          sql`${businesses.lastCrawledAt} IS NULL`
        )
      )
    );

  console.log(`[MONTHLY] Found ${dueBusinessesWithTeams.length} businesses due for processing`);

  if (dueBusinessesWithTeams.length === 0) {
    console.log('[MONTHLY] No businesses to process');
    return;
  }

  // Batch process with concurrency limit (avoid overwhelming APIs)
  const BATCH_SIZE = 10; // Process 10 businesses concurrently
  const results = {
    success: 0,
    failed: 0,
    skipped: 0,
  };

  for (let i = 0; i < dueBusinessesWithTeams.length; i += BATCH_SIZE) {
    const batch = dueBusinessesWithTeams.slice(i, i + BATCH_SIZE);
    console.log(`[MONTHLY] Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(dueBusinessesWithTeams.length / BATCH_SIZE)}`);

    const batchResults = await Promise.allSettled(
      batch.map(({ business, team }) => processBusinessMonthly(business, team))
    );

    batchResults.forEach((result, idx) => {
      if (result.status === 'fulfilled') {
        if (result.value === 'success') results.success++;
        else if (result.value === 'skipped') results.skipped++;
        else results.failed++;
      } else {
        console.error(`[MONTHLY] Business ${batch[idx].business.id} failed:`, result.reason);
        results.failed++;
      }
    });
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`[MONTHLY] Processing completed in ${duration}s`);
  console.log(`[MONTHLY] Results: ${results.success} success, ${results.skipped} skipped, ${results.failed} failed`);
}

/**
 * Process a single business for monthly update
 * 
 * Flow:
 * 1. Run crawl + fingerprint in parallel (independent operations)
 * 2. After crawl completes, run publish (if Pro tier)
 * 3. Schedule next month's processing
 */
async function processBusinessMonthly(
  business: Business,
  team: Team
): Promise<'success' | 'skipped' | 'failed'> {
  try {
    const config = getAutomationConfig(team);
    
    // Skip if automation not configured
    if (config.crawlFrequency === 'manual') {
      return 'skipped';
    }

    console.log(`[MONTHLY] Processing business ${business.id} (${business.name})`);

    // STEP 1: Run crawl + fingerprint in parallel (they're independent!)
    const [crawlResult, fingerprintResult] = await Promise.allSettled([
      executeCrawlJob(null, business.id),
      executeFingerprint(business),
    ]);

    // Log results
    if (crawlResult.status === 'fulfilled') {
      console.log(`[MONTHLY] Crawl completed for business ${business.id}`);
    } else {
      console.error(`[MONTHLY] Crawl failed for business ${business.id}:`, crawlResult.reason);
    }

    if (fingerprintResult.status === 'fulfilled') {
      console.log(`[MONTHLY] Fingerprint completed for business ${business.id}`);
    } else {
      console.error(`[MONTHLY] Fingerprint failed for business ${business.id}:`, fingerprintResult.reason);
    }

    // STEP 2: Publish depends on crawl, so run after crawl completes
    if (crawlResult.status === 'fulfilled' && config.autoPublish) {
      try {
        await handleAutoPublish(business.id);
        console.log(`[MONTHLY] Publication completed for business ${business.id}`);
      } catch (error) {
        console.error(`[MONTHLY] Publication failed for business ${business.id}:`, error);
        // Don't fail entire process if publish fails
      }
    }

    // STEP 3: Schedule next month's processing
    const nextMonth = calculateNextCrawlDate('monthly');
    await updateBusiness(business.id, {
      nextCrawlAt: nextMonth,
    });

    console.log(`[MONTHLY] Business ${business.id} scheduled for next month: ${nextMonth.toISOString()}`);

    return 'success';
  } catch (error) {
    console.error(`[MONTHLY] Error processing business ${business.id}:`, error);
    return 'failed';
  }
}

// Helper: Execute fingerprint (exported from business-processing)
async function executeFingerprint(business: Business): Promise<void> {
  const { llmFingerprinter } = await import('@/lib/llm/fingerprinter');
  const { db } = await import('@/lib/db/drizzle');
  const { llmFingerprints } = await import('@/lib/db/schema');
  
  const analysis = await llmFingerprinter.fingerprint(business);
  
  await db.insert(llmFingerprints).values({
    businessId: business.id,
    visibilityScore: Math.round(analysis.visibilityScore),
    mentionRate: analysis.mentionRate,
    sentimentScore: analysis.sentimentScore,
    accuracyScore: analysis.accuracyScore,
    avgRankPosition: analysis.avgRankPosition,
    llmResults: analysis.llmResults as any,
    competitiveLeaderboard: analysis.competitiveLeaderboard as any,
    createdAt: new Date(),
  });
}
```

#### D. Monthly CRON Endpoint

**File:** `app/api/cron/monthly-processing/route.ts`

```typescript
/**
 * Monthly Processing Cron Endpoint
 * SOLID: Single Responsibility - handles scheduled monthly processing
 * Protected with API key or Vercel Cron
 */

import { NextRequest, NextResponse } from 'next/server';
import { runMonthlyProcessing } from '@/lib/services/monthly-processing';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Vercel Cron sends requests with 'x-vercel-cron' header
    // Also support manual calls with CRON_SECRET for testing
    const vercelCronHeader = request.headers.get('x-vercel-cron');
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    // Allow if:
    // 1. Request is from Vercel Cron (has x-vercel-cron header)
    // 2. No secret configured (development)
    // 3. Secret matches (manual testing)
    const isVercelCron = vercelCronHeader === '1';
    const hasValidSecret = !cronSecret || authHeader === `Bearer ${cronSecret}`;
    
    if (!isVercelCron && !hasValidSecret) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('[CRON] Monthly processing endpoint called');
    await runMonthlyProcessing();

    return NextResponse.json({
      success: true,
      message: 'Monthly processing completed',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[CRON] Error processing monthly updates:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
```

---

## 3. Efficiency Optimizations

### 3.1 Database Query Optimization

#### A. Batch Team Queries (Eliminate N+1)

**Current Problem:**
```typescript
// ❌ N+1 queries
for (const business of businesses) {
  const team = await getTeamForBusiness(business.id); // N queries
}
```

**Optimized Solution:**
```typescript
// ✅ Single query with JOIN
const businessesWithTeams = await db
  .select({
    business: businesses,
    team: teams,
  })
  .from(businesses)
  .innerJoin(teams, eq(businesses.teamId, teams.id))
  .where(/* conditions */);
```

#### B. Batch Fingerprint Frequency Checks

**File:** `lib/services/business-processing.ts`

```typescript
/**
 * Check fingerprint frequency for multiple businesses at once
 * OPTIMIZATION: Single query instead of N queries
 */
export async function getFingerprintEligibility(
  businessIds: number[]
): Promise<Map<number, boolean>> {
  if (businessIds.length === 0) return new Map();
  
  // Get latest fingerprint for each business in single query
  const latestFingerprints = await db
    .select({
      businessId: llmFingerprints.businessId,
      createdAt: llmFingerprints.createdAt,
    })
    .from(llmFingerprints)
    .where(inArray(llmFingerprints.businessId, businessIds))
    .orderBy(desc(llmFingerprints.createdAt));
  
  // Group by businessId, get latest for each
  const latestMap = new Map<number, Date>();
  for (const fp of latestFingerprints) {
    if (!latestMap.has(fp.businessId)) {
      latestMap.set(fp.businessId, fp.createdAt);
    }
  }
  
  // Check eligibility (monthly = 30 days)
  const eligibility = new Map<number, boolean>();
  const now = Date.now();
  const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
  
  for (const businessId of businessIds) {
    const lastFingerprint = latestMap.get(businessId);
    if (!lastFingerprint) {
      eligibility.set(businessId, true); // No previous fingerprint
    } else {
      const daysSince = (now - lastFingerprint.getTime()) / (1000 * 60 * 60 * 24);
      eligibility.set(businessId, daysSince >= 30);
    }
  }
  
  return eligibility;
}
```

### 3.2 Parallel Operations

#### A. Onboarding Pipeline

**File:** `lib/services/business-processing.ts`

```typescript
export async function autoStartProcessing(business: Business): Promise<void> {
  console.log(`[PROCESSING] Auto-starting processing for business ${business.id}`);
  
  const team = await getTeamForUser();
  if (!team) {
    console.warn(`[PROCESSING] No team found - skipping auto-processing for business ${business.id}`);
    return;
  }
  
  const config = getAutomationConfig(team);
  
  // Enable automation and schedule next month
  if (config.crawlFrequency !== 'manual') {
    const nextMonth = calculateNextCrawlDate('monthly');
    await updateBusiness(business.id, {
      automationEnabled: true,
      nextCrawlAt: nextMonth,
    });
    console.log(`[PROCESSING] Automation enabled for business ${business.id} (monthly)`);
  }
  
  // Check eligibility
  const needsCrawl = await shouldCrawl(business);
  const canFingerprint = await canRunFingerprint(business, team);
  
  // Run crawl + fingerprint in parallel (independent operations)
  const promises: Promise<void>[] = [];
  
  if (needsCrawl) {
    const crawlJob = await createCrawlJob({
      businessId: business.id,
      jobType: 'initial_crawl',
      status: 'queued',
      progress: 0,
    });
    
    promises.push(
      executeCrawlJob(crawlJob.id, business.id)
        .then(async () => {
          // Auto-publish for Pro tier (after crawl completes)
          if (config.autoPublish) {
            const { handleAutoPublish } = await import('./scheduler-service');
            await handleAutoPublish(business.id).catch(error => {
              console.error(`[PROCESSING] Auto-publish failed for business ${business.id}:`, error);
            });
          }
        })
        .catch(error => {
          console.error(`[PROCESSING] Crawl failed for business ${business.id}:`, error);
        })
    );
  }
  
  if (canFingerprint) {
    promises.push(
      executeFingerprint(business).catch(error => {
        console.error(`[PROCESSING] Fingerprint failed for business ${business.id}:`, error);
      })
    );
  }
  
  // Fire and forget - don't block response
  Promise.allSettled(promises).catch(error => {
    console.error(`[PROCESSING] Auto-processing error for business ${business.id}:`, error);
  });
  
  console.log(`[PROCESSING] Auto-processing started for business ${business.id} (crawl: ${needsCrawl}, fingerprint: ${canFingerprint})`);
}
```

#### B. Endpoint Parallel Data Fetching

**File:** `app/api/wikidata/entity/[businessId]/route.ts`

```typescript
export async function GET(
  request: NextRequest,
  { params }: { params: { businessId: string } }
) {
  const businessId = parseInt(params.businessId);
  
  // OPTIMIZATION: Fetch all data in parallel
  const [business, entity, fingerprint] = await Promise.all([
    getBusinessById(businessId),
    getWikidataEntity(businessId),
    getLatestFingerprint(businessId),
  ]);
  
  // Process and return
  return NextResponse.json({
    business,
    entity,
    fingerprint,
  });
}
```

### 3.3 Performance Targets

| Operation | Current | Target | Improvement |
|-----------|---------|--------|-------------|
| Onboarding (crawl + fingerprint) | ~7s sequential | ~5s parallel | 29% faster |
| Monthly CRON (100 businesses) | ~10 min sequential | ~2 min batched | 80% faster |
| Database queries (N businesses) | N+1 queries | 1-2 queries | 95% fewer |
| Endpoint response time | ~200ms | ~50ms | 75% faster |

---

## 4. UX Simplification

### 4.1 Remove Manual Buttons for Pro/Agency

**File:** `app/(dashboard)/dashboard/businesses/[id]/page.tsx`

```typescript
export default function BusinessDetailPage() {
  const { business, fingerprint, entity, loading, refresh } = useBusinessDetail(businessId);
  const { planTier } = useTeam();
  
  const isAutomated = planTier !== 'free' && business?.automationEnabled;
  
  // Remove manual action handlers for automated tiers
  // Only show status and next update date
  
  return (
    <div className="flex-1 p-4 lg:p-8">
      {/* ... existing header ... */}
      
      {/* Automation Status Card (for Pro/Agency) */}
      {isAutomated && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Automated Monthly Updates
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {business.nextCrawlAt && (
                <p className="text-sm">
                  <span className="font-medium">Next update:</span>{' '}
                  {formatDate(business.nextCrawlAt)}
                </p>
              )}
              {business.lastCrawledAt && (
                <p className="text-sm text-muted-foreground">
                  Last updated: {formatDate(business.lastCrawledAt)}
                </p>
              )}
              {business.wikidataQID && business.lastAutoPublishedAt && (
                <p className="text-sm text-muted-foreground">
                  Last published: {formatDate(business.lastAutoPublishedAt)}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* ... existing cards (without manual buttons for automated tiers) ... */}
    </div>
  );
}
```

### 4.2 Update Business Cards

**File:** `components/business/gem-overview-card.tsx`

```typescript
export function GemOverviewCard({ business }: { business: Business }) {
  const { planTier } = useTeam();
  const isAutomated = planTier !== 'free' && business.automationEnabled;
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>{business.name}</CardTitle>
        {isAutomated && (
          <Badge variant="success" className="mt-2">
            <Sparkles className="mr-1 h-3 w-3" />
            Automated Monthly Updates
          </Badge>
        )}
      </CardHeader>
      <CardContent>
        {/* Remove manual crawl button for automated tiers */}
        {!isAutomated && (
          <Button onClick={onCrawl} disabled={crawling}>
            {crawling ? 'Crawling...' : 'Crawl Website'}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
```

### 4.3 Simplified Onboarding Form

**File:** `app/(dashboard)/dashboard/businesses/new/page.tsx`

```typescript
export default function NewBusinessPage() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // Submit with just URL
      const response = await fetch('/api/business', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      
      if (response.ok) {
        const result = await response.json();
        router.push(`/dashboard/businesses/${result.business.id}`);
      }
    } catch (error) {
      console.error('Business creation failed:', error);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Add New Business</h1>
        <p className="text-muted-foreground">
          Enter your website URL and we'll automatically extract all business information
        </p>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Business Website</CardTitle>
          <CardDescription>
            We'll crawl your website to extract business name, location, and category
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="url">Website URL *</Label>
              <Input
                id="url"
                name="url"
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                required
                placeholder="https://example.com"
                disabled={loading}
              />
              <p className="text-sm text-muted-foreground">
                Processing will start automatically after creation
              </p>
            </div>
            
            <Button type="submit" disabled={loading || !url}>
              {loading ? 'Creating...' : 'Create Business'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
```

---

## 5. Implementation Checklist

### Phase 1: Core Automation (Week 1)
- [ ] Update `automation-service.ts` to use monthly frequency
- [ ] Update `calculateNextCrawlDate` to support monthly
- [ ] Update `vercel.json` CRON schedule to monthly
- [ ] Create/update `monthly-processing.ts` with batch processing
- [ ] Update `app/api/cron/monthly-processing/route.ts`

### Phase 2: Location Extraction (Week 1-2)
- [ ] Enhance `lib/crawler/index.ts` to extract structured location
- [ ] Update LLM prompt to extract city/state/country
- [ ] Add JSON-LD location extraction
- [ ] Update `CrawledData` type to include location
- [ ] Add fallback geocoding (optional)

### Phase 3: URL-Only Onboarding (Week 2)
- [ ] Create `createBusinessFromUrlSchema` validation
- [ ] Update `app/api/business/route.ts` to crawl on URL-only creation
- [ ] Add category mapping helper
- [ ] Update onboarding form to URL-only input
- [ ] Add preview crawl endpoint (optional)

### Phase 4: Efficiency Optimizations (Week 2-3)
- [ ] Batch database queries in monthly processing (JOIN teams)
- [ ] Optimize fingerprint frequency checks (batch query)
- [ ] Parallel data fetching in endpoints
- [ ] Add concurrency limits to batch processing

### Phase 5: UX Updates (Week 3)
- [ ] Remove manual buttons for Pro/Agency users
- [ ] Add automation status badges
- [ ] Show next update date
- [ ] Add real-time progress indicators
- [ ] Update business cards with automation status

### Phase 6: Testing (Week 3-4)
- [ ] Test URL-only business creation
- [ ] Test monthly CRON with batch processing
- [ ] Test onboarding flow with auto-publish
- [ ] Load test with 100+ businesses
- [ ] E2E tests for automated flow

---

## 6. Migration Notes

### Existing Businesses

For existing businesses with `automationEnabled = true`:
- Next monthly processing will pick them up automatically
- `nextCrawlAt` will be recalculated on first monthly run
- No manual migration needed

### Free Tier Users

- Continue to have manual controls
- No automation enabled
- Can upgrade to Pro for monthly automation

### Data Validation

- Existing businesses with incomplete location data will need manual updates
- Or can be re-crawled to extract missing location data
- Consider adding a migration script to backfill location from `crawlData.address`

---

## 7. Success Metrics

1. **Onboarding Time**: < 30 seconds from URL entry to business creation
2. **Processing Time**: Initial crawl + fingerprint + publish < 10 seconds (parallel)
3. **Monthly CRON**: Process 100 businesses in < 3 minutes
4. **Database Queries**: < 5 queries per business in monthly processing
5. **User Satisfaction**: 90%+ of Pro users never use manual buttons

---

## 8. Future Enhancements

1. **Smart Scheduling**: Stagger monthly updates across the month (not all on 1st)
2. **Retry Logic**: Automatic retry for failed crawls/fingerprints
3. **Notifications**: Email/SMS when monthly update completes
4. **Analytics Dashboard**: Show processing history and trends
5. **Custom Schedules**: Allow users to set custom update frequencies (Agency tier)

