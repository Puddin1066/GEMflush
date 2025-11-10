# 🏗️ Data Access Layer (DAL) Implementation Guide

**Created:** November 10, 2025  
**Purpose:** Guide for implementing DTO layer and LLM-assisted service enhancements  
**Status:** Planning → Implementation → LLM Enhancement

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Current State](#current-state)
3. [Phase 1: Create DTO Layer](#phase-1-create-dto-layer)
4. [Phase 2: LLM-Assisted Service Enhancement](#phase-2-llm-assisted-service-enhancement)
5. [Phase 2.7: Wikidata Notability Checker](#phase-27-wikidata-notability-checker)
6. [Type System Architecture](#type-system-architecture)
7. [Implementation Checklist](#implementation-checklist)

---

## 🎯 Overview

### What We're Building

A **Data Access Layer** that:
- ✅ Separates domain types from UI types
- ✅ Provides stable interfaces for UI consumption
- ✅ Enables service evolution without breaking UI
- ✅ Facilitates LLM-assisted enhancements

### Why This Matters

**Current Problem:**
```
Dashboard → Database/Services (directly)
         → UI breaks when services change
```

**Solution:**
```
Dashboard → DTO Layer → Services
         → UI stays stable when services evolve
```

### Next.js Pattern

Following [Next.js Data Access Layer best practices](https://nextjs.org/docs/app/building-your-application/data-fetching/patterns#data-access-layer):
- Use `'server-only'` directive
- Consolidate data fetching
- Return only what UI needs (API Minimization)
- Create DTOs (Data Transfer Objects)

---

## 📊 Current State

### Existing Structure

```
lib/
  ├── types/                         ✅ Domain types (EXISTS)
  │   ├── gemflush.ts                   - CrawledData, FingerprintAnalysis, etc.
  │   └── service-contracts.ts          - ILLMFingerprinter, IWebCrawler, etc.
  │
  ├── crawler/                       ✅ Crawler service (EXISTS)
  │   └── index.ts                      - Returns: CrawlResult
  │
  ├── llm/                           ✅ Fingerprinter service (EXISTS)
  │   ├── fingerprinter.ts              - Returns: FingerprintAnalysis
  │   └── openrouter.ts                 - LLM client
  │
  ├── wikidata/                      ✅ Wikidata service (EXISTS)
  │   ├── entity-builder.ts             - Returns: WikidataEntityData
  │   ├── publisher.ts                  - Publishes to Wikidata
  │   └── sparql.ts                     - Queries Wikidata
  │
  └── db/                            ✅ Database layer (EXISTS)
      ├── queries.ts                    - Returns: Business, Fingerprint, etc.
      └── schema.ts                     - Database schema
```

### Dashboard Integration Status

✅ **Dashboard is ALREADY integrated** with real data:
- Fetches from database: `getBusinessesByTeam()`, `getLatestFingerprint()`
- Transforms data inline (lines 62-87 of `dashboard/page.tsx`)
- Returns shaped data to UI

**What we're doing:** Extracting this transformation logic into a formal DTO layer.

---

## 🚀 Phase 1: Create DTO Layer

### Step 1.1: Create `lib/data/` Directory

```bash
mkdir -p lib/data
```

### Step 1.2: Create DTO Types (`lib/data/types.ts`)

**File:** `lib/data/types.ts`

```typescript
/**
 * Data Transfer Object (DTO) Types
 * These define stable interfaces for UI consumption
 * Following Next.js Data Access Layer pattern
 */

// ============================================================================
// Dashboard DTOs
// ============================================================================

/**
 * Dashboard overview data
 * Used by: app/(dashboard)/dashboard/page.tsx
 */
export interface DashboardDTO {
  totalBusinesses: number;
  wikidataEntities: number;
  avgVisibilityScore: number;
  businesses: DashboardBusinessDTO[];
}

/**
 * Business data for dashboard display
 * Simplified from full Business domain type
 */
export interface DashboardBusinessDTO {
  id: string;                        // Converted from number
  name: string;
  location: string;                  // Simplified: "San Francisco, CA"
  visibilityScore: number | null;    // From fingerprints table
  trend: 'up' | 'down' | 'neutral';  // Computed field
  trendValue: number;                // Future: actual trend calculation
  wikidataQid: string | null;
  lastFingerprint: string;           // Formatted: "2 days ago"
  status: 'published' | 'pending' | 'crawled';
}

// ============================================================================
// Business Detail DTOs (Future)
// ============================================================================

/**
 * Full business details for detail page
 * Used by: app/(dashboard)/dashboard/businesses/[id]/page.tsx (future)
 */
export interface BusinessDetailDTO {
  id: string;
  name: string;
  url: string | null;
  description: string | null;
  location: {
    city: string;
    state: string;
    country: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
  } | null;
  crawlInfo: {
    lastCrawled: string | null;     // Formatted date
    phone: string | null;
    email: string | null;
    socialLinks: {
      facebook?: string;
      instagram?: string;
      linkedin?: string;
      twitter?: string;
    };
  } | null;
  visibilityInfo: {
    score: number | null;
    trend: 'up' | 'down' | 'neutral';
    lastChecked: string | null;
    summary: string;                 // e.g., "Mentioned in 3/5 models"
  } | null;
  wikidataInfo: {
    qid: string;
    url: string;
    status: 'published' | 'pending';
  } | null;
  status: 'published' | 'pending' | 'crawled';
  createdAt: string;                 // Formatted date
}

// ============================================================================
// Activity Feed DTOs (Future)
// ============================================================================

/**
 * Activity feed item
 * Used by: app/(dashboard)/dashboard/activity/page.tsx (future)
 */
export interface ActivityDTO {
  id: string;
  type: 'crawl' | 'fingerprint' | 'publish';
  businessId: string;
  businessName: string;
  status: 'completed' | 'failed' | 'processing' | 'queued';
  message: string;                   // Human-readable message
  timestamp: string;                 // Formatted: "2 hours ago"
  details?: {
    progress?: number;
    error?: string;
    result?: string;
  };
}

// ============================================================================
// Fingerprint DTOs (Future)
// ============================================================================

/**
 * Detailed fingerprint analysis
 * Used by: app/(dashboard)/dashboard/businesses/[id]/fingerprint/page.tsx (future)
 */
export interface FingerprintDetailDTO {
  visibilityScore: number;
  trend: 'up' | 'down' | 'neutral';
  summary: {
    mentionRate: number;             // Percentage (0-100)
    sentiment: 'positive' | 'neutral' | 'negative';
    topModels: string[];             // Top 3 performing models
    averageRank: number | null;
  };
  results: FingerprintResultDTO[];
  createdAt: string;
}

/**
 * Individual LLM result (filtered for UI)
 */
export interface FingerprintResultDTO {
  model: string;                     // Display name (not full ID)
  mentioned: boolean;
  sentiment: 'positive' | 'neutral' | 'negative';
  confidence: number;                // 0-100
  rankPosition: number | null;
  // ❌ NO rawResponse (too technical for UI)
}
```

---

### Step 1.3: Create Dashboard DTO Function

**File:** `lib/data/dashboard-dto.ts`

```typescript
import 'server-only';
import { getBusinessesByTeam, getLatestFingerprint } from '@/lib/db/queries';
import type { DashboardDTO, DashboardBusinessDTO } from './types';

/**
 * Dashboard Data Access Layer
 * Fetches and shapes data for dashboard overview
 * 
 * Following Next.js pattern: consolidate data access in one place
 * Source: https://nextjs.org/docs/app/building-your-application/data-fetching/patterns
 */

/**
 * Get dashboard overview data
 * 
 * @param teamId - Team ID to fetch businesses for
 * @returns Dashboard data optimized for UI display
 * 
 * @example
 * ```typescript
 * const data = await getDashboardDTO(team.id);
 * // Returns: { totalBusinesses, wikidataEntities, avgVisibilityScore, businesses }
 * ```
 */
export async function getDashboardDTO(teamId: number): Promise<DashboardDTO> {
  // Fetch raw business data from database
  const businesses = await getBusinessesByTeam(teamId);
  
  // Enrich with fingerprint data and transform to DTO
  const enrichedBusinesses = await Promise.all(
    businesses.map(async (business) => {
      const fingerprint = await getLatestFingerprint(business.id);
      
      return transformBusinessToDTO(business, fingerprint);
    })
  );
  
  // Calculate aggregated stats
  return {
    totalBusinesses: businesses.length,
    wikidataEntities: businesses.filter(b => b.wikidataQID).length,
    avgVisibilityScore: calculateAvgScore(enrichedBusinesses),
    businesses: enrichedBusinesses,
  };
}

/**
 * Transform domain Business to DashboardBusinessDTO
 * 
 * This is where domain → DTO transformation happens
 * When domain types change, update this function (not UI)
 */
function transformBusinessToDTO(
  business: any,
  fingerprint: any
): DashboardBusinessDTO {
  return {
    id: business.id.toString(),
    name: business.name,
    location: formatLocation(business.location),
    visibilityScore: fingerprint?.visibilityScore ?? null,
    trend: calculateTrend(fingerprint),
    trendValue: 0,  // TODO: Calculate actual trend from historical data
    wikidataQid: business.wikidataQID,
    lastFingerprint: formatTimestamp(fingerprint?.createdAt),
    status: business.status as 'published' | 'pending' | 'crawled',
  };
}

// ============================================================================
// Helper Functions (Private to this DTO)
// ============================================================================

/**
 * Format location for display
 */
function formatLocation(location: any): string {
  if (!location) return 'Location not set';
  
  return `${location.city}, ${location.state}`;
}

/**
 * Calculate trend direction
 * TODO: Enhance with historical comparison
 */
function calculateTrend(fingerprint: any): 'up' | 'down' | 'neutral' {
  // Currently: just check if fingerprint exists
  // Future: Compare with previous fingerprint
  return fingerprint ? 'up' : 'neutral';
}

/**
 * Format timestamp for display
 */
function formatTimestamp(date?: Date | null): string {
  if (!date) return 'Never';
  
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
  return `${Math.floor(days / 30)} months ago`;
}

/**
 * Calculate average visibility score
 */
function calculateAvgScore(businesses: DashboardBusinessDTO[]): number {
  if (businesses.length === 0) return 0;
  
  const withScores = businesses.filter(b => b.visibilityScore !== null);
  if (withScores.length === 0) return 0;
  
  const sum = withScores.reduce((acc, b) => acc + (b.visibilityScore || 0), 0);
  return Math.round(sum / withScores.length);
}
```

---

### Step 1.4: Update Dashboard Page

**File:** `app/(dashboard)/dashboard/page.tsx`

**BEFORE (Current - 58 lines):**
```typescript
export default async function DashboardPage() {
  const user = await getUser();
  if (!user) redirect('/sign-in');
  
  const team = await getTeamForUser();
  if (!team) redirect('/sign-in');
  
  // 30+ lines of data fetching and transformation
  const businesses = await getBusinessesByTeam(team.id);
  const businessesWithScores = await Promise.all(...);
  const stats = { ... };
  
  return <DashboardUI stats={stats} />;
}
```

**AFTER (Simplified - 20 lines):**
```typescript
import { getDashboardDTO } from '@/lib/data/dashboard-dto';
import type { DashboardDTO } from '@/lib/data/types';

export default async function DashboardPage() {
  const user = await getUser();
  if (!user) redirect('/sign-in');
  
  const team = await getTeamForUser();
  if (!team) redirect('/sign-in');
  
  // Single clean DTO call
  const stats: DashboardDTO = await getDashboardDTO(team.id);
  
  const hasBusinesses = stats.totalBusinesses > 0;
  const planTier = team.planName || 'free';
  const isPro = planTier === 'pro' || planTier === 'agency';
  
  // Rest of component unchanged
  return <DashboardUI stats={stats} />;
}
```

---

## 🤖 Phase 2: LLM-Assisted Service Enhancement

### Overview

Now that we have a DTO layer protecting the UI, we can enhance services with LLM assistance without breaking the dashboard.

### 2.1: Enhance Domain Types

**File:** `lib/types/gemflush.ts`

**Add LLM-enhanced fields:**

```typescript
// ============================================================================
// ENHANCED: Crawler Types (LLM-Assisted)
// ============================================================================

export interface CrawledData {
  // Existing fields
  name?: string;
  description?: string;
  phone?: string;
  email?: string;
  socialLinks?: {
    facebook?: string;
    instagram?: string;
    linkedin?: string;
    twitter?: string;
  };
  structuredData?: Record<string, unknown>;
  metaTags?: Record<string, string>;
  founded?: string;
  categories?: string[];
  services?: string[];
  imageUrl?: string;
  
  // NEW: LLM-enhanced extraction
  llmEnhanced?: {
    extractedEntities: string[];     // LLM-extracted key entities
    businessCategory: string;         // LLM-classified category
    serviceOfferings: string[];       // LLM-extracted services
    targetAudience: string;           // LLM-inferred audience
    keyDifferentiators: string[];     // What makes them unique
    confidence: number;               // LLM confidence (0-1)
    model: string;                    // Which LLM was used
    processedAt: Date;
  };
}

// ============================================================================
// ENHANCED: LLM Fingerprinting Types
// ============================================================================

export interface LLMResult {
  // Existing fields
  model: string;
  promptType: string;
  mentioned: boolean;
  sentiment: 'positive' | 'neutral' | 'negative';
  accuracy: number;
  rankPosition: number | null;
  rawResponse: string;
  tokensUsed: number;
  
  // NEW: LLM reasoning and context
  reasoning?: string;                // Why this score/sentiment?
  confidence: number;                // How confident? (0-1)
  contextualRelevance?: number;      // How relevant was mention? (0-1)
  competitorMentions?: string[];     // Competitors mentioned alongside
  keyPhrases?: string[];             // Important phrases from response
}

export interface FingerprintAnalysis {
  // Existing fields
  visibilityScore: number;
  mentionRate: number;
  sentimentScore: number;
  accuracyScore: number;
  avgRankPosition: number | null;
  llmResults: LLMResult[];
  competitiveBenchmark?: CompetitiveBenchmark;
  
  // NEW: LLM-generated insights
  insights?: {
    strengths: string[];             // What LLMs consistently praise
    weaknesses: string[];            // What LLMs consistently criticize
    opportunities: string[];         // Suggested improvements
    summary: string;                 // AI-generated summary
    confidenceLevel: 'high' | 'medium' | 'low';
    generatedBy: string;             // Model used for insights
  };
}

// ============================================================================
// ENHANCED: Wikidata Types
// ============================================================================

export interface WikidataEntityData {
  labels: Record<string, { language: string; value: string }>;
  descriptions: Record<string, { language: string; value: string }>;
  claims: Record<string, WikidataClaim[]>;
  
  // NEW: LLM-generated suggestions
  llmSuggestions?: {
    suggestedProperties: Array<{
      property: string;              // Property ID (e.g., "P452")
      propertyLabel: string;         // Human-readable (e.g., "industry")
      suggestedValue: string;
      confidence: number;
      reasoning: string;
    }>;
    suggestedReferences: Array<{
      url: string;
      title: string;
      relevance: number;
    }>;
    qualityScore: number;            // Overall entity quality (0-100)
    completeness: number;            // How complete is the entity? (0-100)
    model: string;
    generatedAt: Date;
  };
}
```

---

### 2.2: Enhance Crawler Service

**File:** `lib/crawler/index.ts`

**Add LLM-assisted extraction:**

```typescript
import { openRouterClient } from '@/lib/llm/openrouter';

export class WebCrawler {
  // ... existing code ...
  
  /**
   * NEW: LLM-enhanced data extraction
   */
  private async enhanceWithLLM(
    crawledData: CrawledData,
    html: string
  ): Promise<CrawledData['llmEnhanced']> {
    try {
      // Extract key business information using LLM
      const prompt = `
        Analyze this business website content and extract:
        1. Key business entities (products, services, locations)
        2. Primary business category
        3. Service offerings
        4. Target audience
        5. Key differentiators
        
        Website description: ${crawledData.description}
        Business name: ${crawledData.name}
        Categories found: ${crawledData.categories?.join(', ')}
        Services found: ${crawledData.services?.join(', ')}
        
        Return as JSON with keys: extractedEntities, businessCategory, serviceOfferings, targetAudience, keyDifferentiators
      `.trim();
      
      const response = await openRouterClient.query(
        'openai/gpt-4-turbo',
        prompt
      );
      
      // Parse LLM response
      const parsed = JSON.parse(response.content);
      
      return {
        extractedEntities: parsed.extractedEntities || [],
        businessCategory: parsed.businessCategory || 'Unknown',
        serviceOfferings: parsed.serviceOfferings || [],
        targetAudience: parsed.targetAudience || 'General public',
        keyDifferentiators: parsed.keyDifferentiators || [],
        confidence: 0.85,  // TODO: Calculate from response
        model: 'openai/gpt-4-turbo',
        processedAt: new Date(),
      };
    } catch (error) {
      console.error('LLM enhancement error:', error);
      return undefined;
    }
  }
  
  /**
   * UPDATED: Crawl with optional LLM enhancement
   */
  async crawl(url: string, useLLM: boolean = false): Promise<CrawlResult> {
    // ... existing crawl logic ...
    
    const crawledData = await this.extractData($, url);
    
    // NEW: Optionally enhance with LLM
    if (useLLM) {
      crawledData.llmEnhanced = await this.enhanceWithLLM(crawledData, html);
    }
    
    return {
      success: true,
      data: crawledData,
      url,
      crawledAt: new Date(),
    };
  }
}
```

---

### 2.3: Enhance Fingerprinter Service

**File:** `lib/llm/fingerprinter.ts`

**Add LLM reasoning extraction:**

```typescript
export class LLMFingerprinter {
  // ... existing code ...
  
  /**
   * UPDATED: Analyze response with enhanced reasoning
   */
  private analyzeResponse(
    response: string,
    businessName: string,
    promptType: string
  ): LLMResult {
    // ... existing analysis logic ...
    
    // NEW: Extract reasoning using another LLM call
    const reasoning = await this.extractReasoning(response, businessName);
    
    return {
      // ... existing fields ...
      reasoning: reasoning.explanation,
      confidence: reasoning.confidence,
      contextualRelevance: reasoning.relevance,
      competitorMentions: reasoning.competitors,
      keyPhrases: reasoning.phrases,
    };
  }
  
  /**
   * NEW: Extract reasoning from LLM response
   */
  private async extractReasoning(
    response: string,
    businessName: string
  ): Promise<{
    explanation: string;
    confidence: number;
    relevance: number;
    competitors: string[];
    phrases: string[];
  }> {
    const prompt = `
      Analyze why this LLM response mentions or doesn't mention "${businessName}":
      
      Response: ${response}
      
      Provide:
      1. explanation - Why was this business mentioned/not mentioned?
      2. confidence - How confident is this assessment? (0-1)
      3. relevance - How relevant is the mention? (0-1)
      4. competitors - Any competing businesses mentioned?
      5. phrases - Key phrases about the business
      
      Return as JSON.
    `.trim();
    
    try {
      const meta = await openRouterClient.query('openai/gpt-4-turbo', prompt);
      return JSON.parse(meta.content);
    } catch (error) {
      return {
        explanation: 'Unable to extract reasoning',
        confidence: 0.5,
        relevance: 0.5,
        competitors: [],
        phrases: [],
      };
    }
  }
  
  /**
   * NEW: Generate insights from all results
   */
  private async generateInsights(
    llmResults: LLMResult[],
    business: Business
  ): Promise<FingerprintAnalysis['insights']> {
    const prompt = `
      Analyze these LLM fingerprint results for "${business.name}":
      
      Results: ${JSON.stringify(llmResults.map(r => ({
        model: r.model,
        mentioned: r.mentioned,
        sentiment: r.sentiment,
        reasoning: r.reasoning,
      })))}
      
      Provide strategic insights:
      1. strengths - What do LLMs consistently praise?
      2. weaknesses - What concerns are raised?
      3. opportunities - How can visibility improve?
      4. summary - Overall assessment
      5. confidenceLevel - high/medium/low
      
      Return as JSON.
    `.trim();
    
    try {
      const response = await openRouterClient.query('openai/gpt-4-turbo', prompt);
      const parsed = JSON.parse(response.content);
      
      return {
        ...parsed,
        generatedBy: 'openai/gpt-4-turbo',
      };
    } catch (error) {
      return undefined;
    }
  }
}
```

---

### 2.4: Enhance Wikidata Entity Builder

**File:** `lib/wikidata/entity-builder.ts`

**Add LLM property suggestions:**

```typescript
export class WikidataEntityBuilder {
  // ... existing code ...
  
  /**
   * NEW: Get LLM suggestions for additional properties
   */
  async suggestPropertiesWithLLM(
    business: Business,
    crawledData?: CrawledData
  ): Promise<WikidataEntityData['llmSuggestions']> {
    const prompt = `
      This business is being added to Wikidata:
      
      Name: ${business.name}
      Description: ${crawledData?.description || 'N/A'}
      Category: ${crawledData?.llmEnhanced?.businessCategory || 'Unknown'}
      Location: ${business.location?.city}, ${business.location?.state}
      
      Suggest additional Wikidata properties that should be added.
      Focus on: industry (P452), founded (P571), service area (P2541), etc.
      
      For each property provide:
      1. property - Wikidata property ID
      2. propertyLabel - Human-readable label
      3. suggestedValue - The value to add
      4. confidence - How confident? (0-1)
      5. reasoning - Why add this?
      
      Also assess:
      - qualityScore - Overall entity quality (0-100)
      - completeness - How complete? (0-100)
      
      Return as JSON: { suggestedProperties: [], qualityScore: 0, completeness: 0 }
    `.trim();
    
    try {
      const response = await openRouterClient.query('openai/gpt-4-turbo', prompt);
      const parsed = JSON.parse(response.content);
      
      return {
        suggestedProperties: parsed.suggestedProperties || [],
        suggestedReferences: [],  // TODO: Implement reference finding
        qualityScore: parsed.qualityScore || 50,
        completeness: parsed.completeness || 30,
        model: 'openai/gpt-4-turbo',
        generatedAt: new Date(),
      };
    } catch (error) {
      console.error('LLM suggestion error:', error);
      return undefined;
    }
  }
  
  /**
   * UPDATED: Build entity with optional LLM suggestions
   */
  async buildEntityWithSuggestions(
    business: Business,
    crawledData?: CrawledData,
    includeLLMSuggestions: boolean = false
  ): Promise<WikidataEntityData> {
    const entity = this.buildEntity(business, crawledData);
    
    if (includeLLMSuggestions) {
      entity.llmSuggestions = await this.suggestPropertiesWithLLM(business, crawledData);
    }
    
    return entity;
  }
}
```

---

### 2.5: Update DTO Layer to Handle LLM Enhancements

**File:** `lib/data/dashboard-dto.ts`

**Adapt to use LLM-enhanced data:**

```typescript
/**
 * UPDATED: Transform with LLM-enhanced data support
 */
function transformBusinessToDTO(
  business: any,
  fingerprint: any
): DashboardBusinessDTO {
  return {
    id: business.id.toString(),
    name: business.name,
    // ENHANCED: Prefer LLM-enhanced location if available
    location: formatLocationEnhanced(business.location, business.crawlData),
    visibilityScore: fingerprint?.visibilityScore ?? null,
    // ENHANCED: Use insights for trend if available
    trend: calculateTrendEnhanced(fingerprint),
    trendValue: 0,
    wikidataQid: business.wikidataQID,
    lastFingerprint: formatTimestamp(fingerprint?.createdAt),
    status: business.status as 'published' | 'pending' | 'crawled',
  };
}

/**
 * ENHANCED: Format location with LLM data
 */
function formatLocationEnhanced(location: any, crawlData: any): string {
  // Try LLM-enhanced location first
  if (crawlData?.llmEnhanced?.targetAudience) {
    const audience = crawlData.llmEnhanced.targetAudience;
    if (audience.includes('local')) {
      return `${location?.city}, ${location?.state} (Local)`;
    }
  }
  
  // Fallback to standard format
  return formatLocation(location);
}

/**
 * ENHANCED: Calculate trend using insights
 */
function calculateTrendEnhanced(fingerprint: any): 'up' | 'down' | 'neutral' {
  // Use LLM insights if available
  if (fingerprint?.insights?.strengths?.length > fingerprint?.insights?.weaknesses?.length) {
    return 'up';
  }
  if (fingerprint?.insights?.weaknesses?.length > fingerprint?.insights?.strengths?.length) {
    return 'down';
  }
  
  // Fallback to standard calculation
  return calculateTrend(fingerprint);
}
```

---

## 🔍 Phase 2.7: Wikidata Notability Checker

### Overview

Before publishing entities to Wikidata, we must verify they meet [Wikidata:Notability](https://www.wikidata.org/wiki/Wikidata:Notability) standards:

> "It refers to an instance of a **clearly identifiable conceptual or material entity** that can be described using **serious and publicly available references**."

**Current Issue:** The existing `validateNotability()` function only checks for:
- ✅ Label exists
- ✅ Description exists
- ✅ Some reference exists

**Missing:** Verification that references are **serious** and **publicly available**

---

### Step 2.7.1: Setup Prerequisites

**Required:**
1. Google Custom Search API key
2. OpenRouter API key (already have)

**Get Google Custom Search API Key:**

```bash
# 1. Go to Google Cloud Console
# https://console.cloud.google.com/

# 2. Create new project or select existing

# 3. Enable Custom Search API
# https://console.cloud.google.com/apis/library/customsearch.googleapis.com

# 4. Create credentials (API Key)
# https://console.cloud.google.com/apis/credentials

# 5. Create Custom Search Engine
# https://programmablesearchengine.google.com/

# 6. Add to .env.local
echo "GOOGLE_SEARCH_API_KEY=your_api_key" >> .env.local
echo "GOOGLE_SEARCH_ENGINE_ID=your_search_engine_id" >> .env.local
```

**Cost:**
- Free tier: 100 queries/day
- Paid: $5 per 1,000 queries
- LLM assessment: ~$0.03 per business
- Total for 100 businesses: ~$3/day = ~$90/month

---

### Step 2.7.2: Create Notability Checker

**File:** `lib/wikidata/notability-checker.ts` (NEW)

```typescript
import { google } from 'googleapis';
import { openRouterClient } from '@/lib/llm/openrouter';

/**
 * Reference found by Google Search
 */
export interface Reference {
  url: string;
  title: string;
  snippet: string;
  source: string;  // Domain name
}

/**
 * Notability assessment result
 */
export interface NotabilityResult {
  isNotable: boolean;
  confidence: number;  // 0-1
  reasons: string[];
  references: Reference[];
  seriousReferenceCount?: number;
  assessment?: NotabilityAssessment;
}

/**
 * LLM assessment of reference quality
 */
export interface NotabilityAssessment {
  meetsNotability: boolean;
  confidence: number;
  seriousReferenceCount: number;
  publiclyAvailableCount: number;
  independentCount: number;
  summary: string;
  references: Array<{
    index: number;
    isSerious: boolean;
    isPubliclyAvailable: boolean;
    isIndependent: boolean;
    sourceType: 'news' | 'government' | 'academic' | 'database' | 'company' | 'other';
    trustScore: number;
    reasoning: string;
  }>;
  recommendations?: string[];
}

/**
 * Wikidata Notability Checker
 * Uses Google Search API + LLM to verify entities meet Wikidata standards
 * 
 * Per: https://www.wikidata.org/wiki/Wikidata:Notability
 * Entities must have "serious and publicly available references"
 */
export class NotabilityChecker {
  private customSearch = google.customsearch('v1');
  
  /**
   * Check if business meets Wikidata notability standards
   * 
   * @param businessName - Name of the business
   * @param location - Location for search context
   * @returns Notability assessment with references
   */
  async checkNotability(
    businessName: string,
    location?: { city: string; state: string; country?: string }
  ): Promise<NotabilityResult> {
    // Step 1: Search for public references using Google
    console.log(`🔍 Searching for references: "${businessName}"`);
    const references = await this.findReferences(businessName, location);
    
    if (references.length === 0) {
      console.log(`❌ No references found for: ${businessName}`);
      return {
        isNotable: false,
        confidence: 0.9,
        reasons: [
          'No publicly available references found',
          'Cannot verify notability without sources'
        ],
        references: [],
        seriousReferenceCount: 0,
      };
    }
    
    console.log(`📚 Found ${references.length} potential references`);
    
    // Step 2: Assess reference quality using LLM
    console.log(`🤖 Assessing reference quality with LLM...`);
    const assessment = await this.assessReferenceQuality(references, businessName);
    
    const result: NotabilityResult = {
      isNotable: assessment.meetsNotability,
      confidence: assessment.confidence,
      reasons: assessment.meetsNotability ? [] : [assessment.summary],
      references: references,
      seriousReferenceCount: assessment.seriousReferenceCount,
      assessment: assessment,
    };
    
    console.log(
      assessment.meetsNotability 
        ? `✅ Notable (${assessment.seriousReferenceCount} serious references)`
        : `❌ Not notable: ${assessment.summary}`
    );
    
    return result;
  }
  
  /**
   * Find references using Google Custom Search API
   */
  private async findReferences(
    name: string,
    location?: { city: string; state: string; country?: string }
  ): Promise<Reference[]> {
    try {
      // Build search query
      const query = location 
        ? `"${name}" ${location.city} ${location.state}`
        : `"${name}"`;
      
      // Call Google Custom Search API
      const response = await this.customSearch.cse.list({
        auth: process.env.GOOGLE_SEARCH_API_KEY,
        cx: process.env.GOOGLE_SEARCH_ENGINE_ID,
        q: query,
        num: 10,  // Top 10 results
      });
      
      const references: Reference[] = [];
      
      for (const item of response.data.items || []) {
        if (item.link && item.title && item.snippet) {
          references.push({
            url: item.link,
            title: item.title,
            snippet: item.snippet,
            source: this.extractDomain(item.link),
          });
        }
      }
      
      return references;
    } catch (error) {
      console.error('Google Search API error:', error);
      return [];
    }
  }
  
  /**
   * Assess reference quality using LLM
   */
  private async assessReferenceQuality(
    references: Reference[],
    businessName: string
  ): Promise<NotabilityAssessment> {
    const prompt = `
Assess if these references meet Wikidata's "serious and publicly available" standard:

Business: ${businessName}

References:
${references.map((r, i) => `
${i + 1}. ${r.title}
   URL: ${r.url}
   Source: ${r.source}
   Snippet: ${r.snippet}
`).join('\n')}

Wikidata requires references to be:
1. From reputable sources (news, government, academic, official databases)
2. Publicly available (not paywalled, not private documents)
3. Independent (not just company's own website/marketing)

For each reference, assess:
- isSerious: Is this from a reputable source? (true/false)
- isPubliclyAvailable: Can anyone access this? (true/false)
- isIndependent: Is this from a third-party? (true/false)
- sourceType: "news" | "government" | "academic" | "database" | "company" | "other"
- trustScore: 0-100 (how trustworthy is this source?)
- reasoning: Why is this assessment given?

Overall:
- meetsNotability: Does the business have sufficient serious references?
- confidence: 0-1 (how confident in this assessment?)
- seriousReferenceCount: How many serious references?
- publiclyAvailableCount: How many publicly available?
- independentCount: How many independent sources?
- summary: Brief explanation of decision
- recommendations: What to do with this entity? (if not notable, suggest improvements)

Return as JSON.
    `.trim();
    
    try {
      const response = await openRouterClient.query(
        'openai/gpt-4-turbo',
        prompt
      );
      
      const assessment = JSON.parse(response.content);
      return assessment;
    } catch (error) {
      console.error('LLM assessment error:', error);
      
      // Fallback: conservative assessment
      return {
        meetsNotability: false,
        confidence: 0.5,
        seriousReferenceCount: 0,
        publiclyAvailableCount: references.length,
        independentCount: 0,
        summary: 'Unable to assess reference quality - manual review required',
        references: references.map((r, i) => ({
          index: i,
          isSerious: false,
          isPubliclyAvailable: true,
          isIndependent: false,
          sourceType: 'other' as const,
          trustScore: 50,
          reasoning: 'Assessment failed - requires manual review',
        })),
      };
    }
  }
  
  /**
   * Extract domain from URL
   */
  private extractDomain(url: string): string {
    try {
      const domain = new URL(url).hostname;
      return domain.replace('www.', '');
    } catch {
      return url;
    }
  }
}

// Export singleton
export const notabilityChecker = new NotabilityChecker();
```

---

### Step 2.7.3: Integrate with Entity Builder

**File:** `lib/wikidata/entity-builder.ts` (UPDATE)

```typescript
import { notabilityChecker } from './notability-checker';
import type { NotabilityResult } from './notability-checker';

export class WikidataEntityBuilder {
  // ... existing code ...
  
  /**
   * ENHANCED: Validate notability with Google Search + LLM
   * 
   * Replaces basic validation with comprehensive notability check
   * Per: https://www.wikidata.org/wiki/Wikidata:Notability
   */
  async validateNotability(
    entity: WikidataEntityData,
    business: Business
  ): Promise<NotabilityResult> {
    const reasons: string[] = [];
    
    // Basic checks
    if (!entity.labels || Object.keys(entity.labels).length === 0) {
      reasons.push('No label provided');
      return { 
        isNotable: false, 
        confidence: 1.0, 
        reasons,
        references: []
      };
    }
    
    if (!entity.descriptions || Object.keys(entity.descriptions).length === 0) {
      reasons.push('No description provided');
      return { 
        isNotable: false, 
        confidence: 1.0, 
        reasons,
        references: []
      };
    }
    
    // NEW: Comprehensive notability check
    console.log(`Checking notability for: ${business.name}`);
    const result = await notabilityChecker.checkNotability(
      business.name,
      business.location
    );
    
    return result;
  }
}
```

---

### Step 2.7.4: Create Wikidata DTO

**File:** `lib/data/wikidata-dto.ts` (NEW)

```typescript
import 'server-only';
import { getBusiness } from '@/lib/db/queries';
import { WikidataEntityBuilder } from '@/lib/wikidata/entity-builder';
import type { NotabilityResult } from '@/lib/wikidata/notability-checker';

const entityBuilder = new WikidataEntityBuilder();

/**
 * Wikidata publish DTO type
 */
export interface WikidataPublishDTO {
  businessId: number;
  businessName: string;
  entity: any;  // WikidataEntityData
  notability: {
    isNotable: boolean;
    confidence: number;
    reasons: string[];
    seriousReferenceCount: number;
    topReferences: Array<{
      title: string;
      url: string;
      source: string;
      trustScore: number;
    }>;
  };
  canPublish: boolean;
  recommendation: string;
}

/**
 * Get Wikidata publish data with notability check
 * 
 * @param businessId - Business ID to check
 * @returns DTO with entity and notability assessment
 */
export async function getWikidataPublishDTO(
  businessId: number
): Promise<WikidataPublishDTO> {
  const business = await getBusiness(businessId);
  
  if (!business) {
    throw new Error('Business not found');
  }
  
  // Build entity
  const entity = entityBuilder.buildEntity(business, business.crawlData);
  
  // Check notability
  const notabilityResult = await entityBuilder.validateNotability(entity, business);
  
  // Determine if can publish
  const canPublish = notabilityResult.isNotable && notabilityResult.confidence >= 0.7;
  
  // Build recommendation
  let recommendation = '';
  if (!notabilityResult.isNotable) {
    recommendation = 'Do not publish - insufficient notability. ' + 
      (notabilityResult.assessment?.recommendations?.[0] || 'Seek additional references.');
  } else if (notabilityResult.confidence < 0.7) {
    recommendation = 'Manual review recommended - confidence below threshold.';
  } else {
    recommendation = 'Ready to publish - meets notability standards.';
  }
  
  // Extract top references
  const topReferences = notabilityResult.references
    .slice(0, 3)
    .map((ref, idx) => ({
      title: ref.title,
      url: ref.url,
      source: ref.source,
      trustScore: notabilityResult.assessment?.references[idx]?.trustScore || 50,
    }));
  
  return {
    businessId: business.id,
    businessName: business.name,
    entity: entity,
    notability: {
      isNotable: notabilityResult.isNotable,
      confidence: notabilityResult.confidence,
      reasons: notabilityResult.reasons,
      seriousReferenceCount: notabilityResult.seriousReferenceCount || 0,
      topReferences: topReferences,
    },
    canPublish: canPublish,
    recommendation: recommendation,
  };
}
```

---

### Step 2.7.5: Update Publish API Route

**File:** `app/api/wikidata/publish/route.ts` (UPDATE)

```typescript
import { getWikidataPublishDTO } from '@/lib/data/wikidata-dto';

export async function POST(request: Request) {
  try {
    const { businessId } = await request.json();
    
    // Get DTO with notability check
    const publishData = await getWikidataPublishDTO(businessId);
    
    // Check if can publish
    if (!publishData.canPublish) {
      return Response.json({
        success: false,
        error: 'Business does not meet notability standards',
        notability: publishData.notability,
        recommendation: publishData.recommendation,
      }, { status: 400 });
    }
    
    // Proceed with publish...
    const result = await wikidataPublisher.publishEntity(publishData.entity);
    
    return Response.json({
      success: true,
      qid: result.qid,
      notability: publishData.notability,
    });
  } catch (error) {
    return Response.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
```

---

### Step 2.7.6: Environment Variables

**File:** `.env.local` (UPDATE)

```bash
# Existing variables
DATABASE_URL="..."
OPENROUTER_API_KEY="..."

# NEW: Google Custom Search API
GOOGLE_SEARCH_API_KEY="your_google_api_key"
GOOGLE_SEARCH_ENGINE_ID="your_search_engine_id"
```

---

### Testing Strategy

**Test Cases:**

```typescript
// lib/wikidata/__tests__/notability-checker.test.ts

describe('NotabilityChecker', () => {
  it('should pass for well-known business', async () => {
    const result = await notabilityChecker.checkNotability(
      'Blue Bottle Coffee',
      { city: 'Oakland', state: 'CA' }
    );
    
    expect(result.isNotable).toBe(true);
    expect(result.seriousReferenceCount).toBeGreaterThan(2);
    expect(result.confidence).toBeGreaterThan(0.8);
  });
  
  it('should fail for unknown business', async () => {
    const result = await notabilityChecker.checkNotability(
      'Random Coffee Shop XYZ',
      { city: 'Unknown', state: 'XX' }
    );
    
    expect(result.isNotable).toBe(false);
    expect(result.reasons.length).toBeGreaterThan(0);
  });
  
  it('should handle API errors gracefully', async () => {
    // Mock API failure
    jest.spyOn(google.customsearch('v1').cse, 'list').mockRejectedValue(new Error('API Error'));
    
    const result = await notabilityChecker.checkNotability('Test Business');
    
    expect(result.isNotable).toBe(false);
    expect(result.references.length).toBe(0);
  });
});
```

---

### Cost Management

**Free Tier Usage:**

```typescript
// lib/wikidata/notability-checker.ts

export class NotabilityChecker {
  private dailyQueries = 0;
  private readonly DAILY_LIMIT = 100;  // Free tier limit
  
  async checkNotability(name: string, location?: any): Promise<NotabilityResult> {
    // Check rate limit
    if (this.dailyQueries >= this.DAILY_LIMIT) {
      console.warn('Daily Google Search API limit reached');
      return {
        isNotable: false,
        confidence: 0.5,
        reasons: ['Rate limit exceeded - manual review required'],
        references: [],
      };
    }
    
    this.dailyQueries++;
    
    // ... rest of implementation
  }
}
```

**Plan-Based Features:**

```typescript
// lib/gemflush/permissions.ts

export function canUseNotabilityChecker(plan: string): boolean {
  return ['pro', 'agency'].includes(plan);
}

// Usage in API route
if (!canUseNotabilityChecker(team.planName)) {
  return Response.json({
    error: 'Notability checking requires Pro plan',
  }, { status: 403 });
}
```

---

### Benefits

**Before Notability Checker:**
```
User publishes entity → Wikidata editors review → Rejected (wasted effort)
                                                  ↓
                                    "Insufficient references"
```

**After Notability Checker:**
```
User attempts publish → Notability check → Pass ✅ → Publish
                                        → Fail ❌ → Show reasons & suggestions
                                                   → User improves entity
                                                   → Try again
```

**Key Improvements:**
1. ✅ **Prevent rejections** - Catch issues before Wikidata submission
2. ✅ **Save time** - No wasted effort on non-notable entities
3. ✅ **Educate users** - Clear reasons + improvement suggestions
4. ✅ **Quality assurance** - Only high-quality entities published
5. ✅ **Reference discovery** - Automatically find authoritative sources

---

## 🔄 How DTOs Adapt When Services Generate New Data

### The Critical Question

**"If LLM services generate new data, how does it reach the UI if DTOs don't facilitate that?"**

**Answer:** DTOs MUST evolve alongside services - but they **simplify and stabilize** the interface.

---

### Complete Example: LLM Insights Feature

#### **Step 1: Service Generates New Data**

```typescript
// lib/llm/fingerprinter.ts (Service Layer)

export interface FingerprintAnalysis {
  visibilityScore: number;
  llmResults: LLMResult[];
  
  // NEW: LLM generates insights
  insights?: {
    strengths: string[];        // 5-10 items from LLM
    weaknesses: string[];       // 3-7 items from LLM
    opportunities: string[];    // 4-8 items from LLM
    summary: string;            // Long paragraph
    confidenceLevel: 'high' | 'medium' | 'low';
    generatedBy: string;
  };
}

// Service returns this:
const result = await fingerprint(business);
// result.insights = { strengths: [...5 items...], weaknesses: [...3 items...], ... }
```

**Issue:** Service returns **all** insights data - too much for dashboard preview! ⚠️

---

#### **Step 2: DTO Simplifies for UI**

```typescript
// lib/data/types.ts (DTO Type)

export interface DashboardBusinessDTO {
  id: string;
  name: string;
  visibilityScore: number | null;
  
  // NEW: Simplified insights for dashboard
  insights?: {
    topStrength: string | null;      // Just the #1 strength
    topOpportunity: string | null;   // Just the #1 opportunity
    confidenceLevel?: 'high' | 'medium' | 'low';
    hasDetailedReport: boolean;      // Flag: more data available?
  };
}
```

**Key Changes:**
- ✅ `strengths: string[]` → `topStrength: string | null` (simplified)
- ✅ `opportunities: string[]` → `topOpportunity: string | null` (simplified)
- ✅ Added `hasDetailedReport` flag (UI shows "View More" button)
- ✅ Removed `summary`, `weaknesses` (not needed on dashboard)

---

#### **Step 3: DTO Function Transforms Data**

```typescript
// lib/data/dashboard-dto.ts (Transformation Logic)

function transformBusinessToDTO(
  business: any,
  fingerprint: any  // Has full insights data
): DashboardBusinessDTO {
  return {
    id: business.id.toString(),
    name: business.name,
    visibilityScore: fingerprint?.visibilityScore ?? null,
    
    // NEW: Transform complex service data → simple UI data
    insights: fingerprint?.insights ? {
      topStrength: fingerprint.insights.strengths[0] || null,
      topOpportunity: fingerprint.insights.opportunities[0] || null,
      confidenceLevel: fingerprint.insights.confidenceLevel,
      hasDetailedReport: (
        fingerprint.insights.strengths.length > 1 ||
        fingerprint.insights.opportunities.length > 1
      ),
    } : undefined,
    
    // ... other fields
  };
}
```

**What happened:**
- ✅ Extracted first item from arrays
- ✅ Added safety checks (`.length > 1`)
- ✅ Converted `undefined` → `null` for UI consistency
- ✅ Calculated `hasDetailedReport` from data

---

#### **Step 4: UI Consumes DTO**

```typescript
// app/(dashboard)/dashboard/page.tsx

export default async function DashboardPage() {
  const stats: DashboardDTO = await getDashboardDTO(team.id);
  
  return (
    <div>
      {stats.businesses.map(business => (
        <BusinessCard key={business.id}>
          <h3>{business.name}</h3>
          <p>Visibility Score: {business.visibilityScore}</p>
          
          {/* NEW: Show LLM insights */}
          {business.insights && (
            <div className="insights-preview">
              <div className="strength">
                <strong>💪 Key Strength:</strong>
                <p>{business.insights.topStrength}</p>
              </div>
              
              <div className="opportunity">
                <strong>💡 Top Opportunity:</strong>
                <p>{business.insights.topOpportunity}</p>
              </div>
              
              {business.insights.confidenceLevel === 'high' && (
                <Badge variant="success">High Confidence</Badge>
              )}
              
              {business.insights.hasDetailedReport && (
                <Link href={`/dashboard/businesses/${business.id}/insights`}>
                  <Button variant="outline">
                    View Full Report ({business.insights.confidenceLevel}) →
                  </Button>
                </Link>
              )}
            </div>
          )}
        </BusinessCard>
      ))}
    </div>
  );
}
```

**UI Benefits:**
- ✅ No array index access (no crashes)
- ✅ No null checks needed (DTO handles it)
- ✅ Simple conditional rendering
- ✅ Type-safe (TypeScript knows structure)

---

### The Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│ 🔧 SERVICE LAYER                                                │
│    lib/llm/fingerprinter.ts                                     │
│                                                                 │
│    Returns:                                                     │
│    {                                                            │
│      visibilityScore: 85,                                       │
│      insights: {                                                │
│        strengths: [                                             │
│          "Top coffee roaster",                                  │
│          "Strong brand recognition",                            │
│          "Excellent customer reviews",                          │
│          "Innovative brewing methods",                          │
│          "Sustainability leader"                                │
│        ],                                                       │
│        opportunities: [                                         │
│          "Expand content strategy",                             │
│          "International SEO",                                   │
│          "Video content creation"                               │
│        ],                                                       │
│        summary: "Your business shows strong local...(500 words)"│
│      }                                                          │
│    }                                                            │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     │ Transform & Simplify
                     ↓
┌─────────────────────────────────────────────────────────────────┐
│ 📦 DTO LAYER                                                    │
│    lib/data/dashboard-dto.ts                                    │
│                                                                 │
│    Returns:                                                     │
│    {                                                            │
│      visibilityScore: 85,                                       │
│      insights: {                                                │
│        topStrength: "Top coffee roaster",     ← First only      │
│        topOpportunity: "Expand content...",   ← First only      │
│        confidenceLevel: "high",                                 │
│        hasDetailedReport: true                ← Computed flag   │
│      }                                                          │
│    }                                                            │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     │ Render
                     ↓
┌─────────────────────────────────────────────────────────────────┐
│ 🎨 UI LAYER                                                     │
│    app/(dashboard)/dashboard/page.tsx                           │
│                                                                 │
│    ┌─────────────────────────────────────┐                     │
│    │ Blue Bottle Coffee                  │                     │
│    │ Visibility Score: 85                │                     │
│    │                                     │                     │
│    │ 💪 Key Strength:                    │                     │
│    │    Top coffee roaster               │ ← From DTO          │
│    │                                     │                     │
│    │ 💡 Top Opportunity:                 │                     │
│    │    Expand content strategy          │ ← From DTO          │
│    │                                     │                     │
│    │ [High Confidence] [View Full →]     │ ← From DTO flags    │
│    └─────────────────────────────────────┘                     │
└─────────────────────────────────────────────────────────────────┘
```

---

### Key Principle: DTOs MUST Evolve

**When services add new features, you MUST:**

1. ✅ **Add field to DTO type** (`lib/data/types.ts`)
2. ✅ **Transform in DTO function** (`lib/data/dashboard-dto.ts`)
3. ✅ **Render in UI** (`app/(dashboard)/dashboard/page.tsx`)

**What DTOs provide:**
- ✅ **Simplification** - 10 strengths → 1 top strength
- ✅ **Safety** - Handle edge cases (empty arrays, nulls)
- ✅ **Stability** - Service can change internally without breaking UI
- ✅ **Computed fields** - `hasDetailedReport` (derived from data)

---

### Example: Service Changes (Future)

**Scenario:** Service returns 20 strengths instead of 5

```typescript
// SERVICE CHANGE (lib/llm/fingerprinter.ts)
return {
  insights: {
    strengths: [...20 items...],  // Changed from 5 to 20!
    // ...
  }
};

// DTO UNCHANGED (lib/data/dashboard-dto.ts)
insights: {
  topStrength: fingerprint.insights.strengths[0],  // Still works!
  hasDetailedReport: fingerprint.insights.strengths.length > 1,  // Still true
}

// UI UNCHANGED (dashboard/page.tsx)
<p>{business.insights.topStrength}</p>  // Still renders first item
```

**Result:** UI doesn't break! ✅

---

### When DTOs DON'T Evolve (Anti-Pattern)

**❌ BAD: DTO doesn't expose new data**

```typescript
// Service has insights
const fingerprint = await getFingerprintAnalysis(business);
// fingerprint.insights exists!

// DTO ignores it
function transformBusinessToDTO(business, fingerprint) {
  return {
    visibilityScore: fingerprint.visibilityScore,
    // ❌ No insights field!
  };
}

// UI has no way to access it
<div>
  {business.insights}  {/* undefined - not in DTO! */}
</div>
```

**Result:** New feature invisible to users ❌

---

### Summary: DTOs Are Feature Conduits

Think of DTOs as **feature pipelines**:

```
New Feature → Service → DTO (simplify) → UI (render)
              ↓        ↓                  ↓
              Data     Transform          Display
```

**DTOs don't prevent features from reaching UI.**  
**DTOs ensure features reach UI in a clean, safe way.**

---

## 📋 Type System Architecture

### Domain Types (`lib/types/gemflush.ts`)

**Purpose:** Define what EXISTS in your system

```
Domain Types
├── Business (database record)
├── CrawledData (crawler output)
├── FingerprintAnalysis (fingerprinter output)
├── WikidataEntityData (Wikidata entity structure)
└── LLMResult (individual LLM response)
```

**Used by:** Services, database, business logic

**Changes when:** Database schema evolves, domain model changes

---

### DTO Types (`lib/data/types.ts`)

**Purpose:** Define what UI NEEDS

```
DTO Types
├── DashboardDTO (dashboard page)
├── DashboardBusinessDTO (business card in dashboard)
├── BusinessDetailDTO (business detail page)
├── FingerprintDetailDTO (fingerprint analysis page)
└── ActivityDTO (activity feed item)
```

**Used by:** UI components, page components

**Changes when:** UI requirements change

---

### Service Contracts (`lib/types/service-contracts.ts`)

**Purpose:** Define service behavior interfaces

```
Service Contracts
├── ILLMFingerprinter (fingerprint service interface)
├── IWebCrawler (crawler service interface)
└── IWikidataPublisher (publisher service interface)
```

**Used by:** Service implementations, tests, mocks

**Changes when:** Service APIs change

---

### The Flow

```
┌─────────────────────────────────────────────────────────┐
│ Services (lib/crawler/, lib/llm/, lib/wikidata/)       │
│ - Use: Domain Types                                    │
│ - Return: Domain Types                                 │
│ - Implement: Service Contracts                         │
└────────────────────┬────────────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────────────┐
│ DTO Functions (lib/data/*.ts)                          │
│ - Input: Domain Types                                   │
│ - Transform: Domain → DTO                               │
│ - Output: DTO Types                                     │
└────────────────────┬────────────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────────────┐
│ UI Components (app/*)                                   │
│ - Receive: DTO Types                                    │
│ - Render: User interface                                │
└─────────────────────────────────────────────────────────┘
```

---

## ✅ Implementation Checklist

### Phase 1: DTO Layer (Week 1)

- [ ] **1.1** Create `lib/data/` directory
- [ ] **1.2** Create `lib/data/types.ts`
  - [ ] Define `DashboardDTO`
  - [ ] Define `DashboardBusinessDTO`
  - [ ] Define `BusinessDetailDTO` (future)
  - [ ] Define `ActivityDTO` (future)
- [ ] **1.3** Create `lib/data/dashboard-dto.ts`
  - [ ] Implement `getDashboardDTO()`
  - [ ] Move transformation logic from dashboard page
  - [ ] Add helper functions
- [ ] **1.4** Update `app/(dashboard)/dashboard/page.tsx`
  - [ ] Import `getDashboardDTO`
  - [ ] Remove inline data fetching
  - [ ] Use DTO type annotations
- [ ] **1.5** Test dashboard
  - [ ] Verify data displays correctly
  - [ ] Check all stats are accurate
  - [ ] Ensure no regressions

### Phase 2: LLM Enhancement (Week 2)

- [ ] **2.1** Enhance domain types in `lib/types/gemflush.ts`
  - [ ] Add `llmEnhanced` to `CrawledData`
  - [ ] Add `reasoning`, `confidence` to `LLMResult`
  - [ ] Add `insights` to `FingerprintAnalysis`
  - [ ] Add `llmSuggestions` to `WikidataEntityData`
- [ ] **2.2** Enhance `lib/crawler/index.ts`
  - [ ] Add `enhanceWithLLM()` method
  - [ ] Update `crawl()` to use LLM enhancement
  - [ ] Add configuration flag for LLM usage
- [ ] **2.3** Enhance `lib/llm/fingerprinter.ts`
  - [ ] Add `extractReasoning()` method
  - [ ] Add `generateInsights()` method
  - [ ] Update result objects with new fields
- [ ] **2.4** Enhance `lib/wikidata/entity-builder.ts`
  - [ ] Add `suggestPropertiesWithLLM()` method
  - [ ] Create `buildEntityWithSuggestions()` method
- [ ] **2.5** Update DTO layer
  - [ ] Adapt `dashboard-dto.ts` to use LLM data
  - [ ] Add fallbacks for non-LLM data
  - [ ] Test both enhanced and standard data
- [ ] **2.6** Update API routes
  - [ ] Add LLM enhancement flags to crawl API
  - [ ] Add LLM enhancement flags to fingerprint API
  - [ ] Add LLM suggestions to Wikidata publish API
- [ ] **2.7** Wikidata Notability Checker (PRIORITY)
  - [ ] Get Google Custom Search API key
  - [ ] Create `lib/wikidata/notability-checker.ts`
  - [ ] Implement `findReferences()` with Google Search
  - [ ] Implement `assessReferenceQuality()` with LLM
  - [ ] Update `entity-builder.ts` to use notability checker
  - [ ] Create `lib/data/wikidata-dto.ts`
  - [ ] Update `app/api/wikidata/publish/route.ts`
  - [ ] Add environment variables (.env.local)
  - [ ] Write tests for notability checker
  - [ ] Add rate limiting for free tier

### Phase 3: UI Enhancements (Week 3)

- [ ] **3.1** Show LLM confidence indicators
- [ ] **3.2** Display insights on fingerprint page
- [ ] **3.3** Show Wikidata property suggestions
- [ ] **3.4** Add toggle for LLM features (plan-based)

---

## 🎯 Benefits Summary

### Immediate Benefits (Phase 1)

1. ✅ **Cleaner dashboard code** - 58 lines → 20 lines
2. ✅ **Reusable data layer** - Other pages can use same DTOs
3. ✅ **Type safety** - Explicit DTO types prevent errors
4. ✅ **Easier testing** - Mock DTOs instead of database
5. ✅ **Follows Next.js best practices** - Official pattern

### Long-term Benefits (Phase 2+)

1. ✅ **Service evolution** - Change services without breaking UI
2. ✅ **LLM integration** - Add AI features incrementally
3. ✅ **Performance** - Optimize data fetching centrally
4. ✅ **Security** - Filter sensitive data at DTO layer
5. ✅ **Maintainability** - Clear separation of concerns

---

## 📚 References

- [Next.js Data Access Layer Pattern](https://nextjs.org/docs/app/building-your-application/data-fetching/patterns#data-access-layer)
- [Next.js Server-Only Directive](https://nextjs.org/docs/app/building-your-application/rendering/composition-patterns#keeping-server-only-code-out-of-the-client-environment)
- [DTO Pattern (Martin Fowler)](https://martinfowler.com/eaaCatalog/dataTransferObject.html)
- [OpenRouter API Documentation](https://openrouter.ai/docs)
- [Wikidata Notability Policy](https://www.wikidata.org/wiki/Wikidata:Notability)
- [Google Custom Search JSON API](https://developers.google.com/custom-search/v1/overview)

---

## 🤝 Questions?

If anything is unclear:
1. Check type definitions in `lib/types/`
2. Review existing service implementations
3. Refer to dashboard integration (working example)
4. Ask for clarification

**Remember:** We're not rewriting, we're **refactoring** working code into a better structure. 🎯

