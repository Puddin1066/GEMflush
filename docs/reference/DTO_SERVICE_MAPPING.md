# 🗺️ DTO Service Mapping Guide

**Purpose:** Maps services in `lib/` to their corresponding DTOs in `lib/data/types.ts`  
**Date:** November 10, 2025

---

## 📊 **Service → DTO Mapping**

### **✅ Services WITH DTOs (UI-facing)**

| Service Directory | Domain Types | DTO Types | Why DTO Needed |
|-------------------|-------------|-----------|----------------|
| **`lib/llm/fingerprinter.ts`** | `FingerprintAnalysis`, `LLMResult` | `FingerprintDetailDTO`, `FingerprintResultDTO` | Raw LLM responses too verbose for UI, need filtering |
| **`lib/wikidata/entity-builder.ts`** | `WikidataEntityData`, `WikidataClaim` | `WikidataPublishDTO`, `WikidataStatusDTO` | Complex entity structure simplified for UI display |
| **`lib/crawler/index.ts`** | `CrawledData`, `CrawlResult` | `CrawlResultDTO` | Technical crawl data needs user-friendly formatting |
| **`lib/db/queries.ts`** | `Business`, `Fingerprint` (schema types) | `DashboardDTO`, `DashboardBusinessDTO`, `BusinessDetailDTO` | Database records transformed for UI consumption |

### **❌ Services WITHOUT DTOs (internal/no UI)**

| Service Directory | Why No DTO Needed |
|-------------------|-------------------|
| **`lib/auth/`** | Internal auth logic, no direct UI display |
| **`lib/email/`** | Sends emails, no UI rendering of data |
| **`lib/payments/`** | Stripe API handles, minimal UI needs |
| **`lib/validation/`** | Input validation only, no data display |
| **`lib/gemflush/`** | Configuration/permissions, no dynamic data |

---

## 🔍 **Detailed Service Analysis**

### **1. LLM Fingerprinting Service**

**Service:** `lib/llm/fingerprinter.ts`

**Domain Output:**
```typescript
interface FingerprintAnalysis {
  visibilityScore: number;
  llmResults: LLMResult[];        // 5 models × 3 prompts = 15 results!
  competitiveBenchmark?: any;
}

interface LLMResult {
  model: string;                   // Full ID: "openai/gpt-4-turbo"
  promptType: string;
  mentioned: boolean;
  sentiment: string;
  accuracy: number;
  rankPosition: number | null;
  rawResponse: string;             // ❌ 1000+ chars, too verbose for UI
  tokensUsed: number;
}
```

**Issues for UI:**
- ❌ `rawResponse` is 1000+ characters (too much data)
- ❌ 15 LLM results overwhelming for dashboard
- ❌ Technical field names (`tokensUsed`, `promptType`)

**DTO Solution:**
```typescript
interface FingerprintDetailDTO {
  visibilityScore: number;
  trend: 'up' | 'down' | 'neutral';  // ✅ Computed field
  summary: {
    mentionRate: number;            // ✅ Percentage, easier to understand
    sentiment: 'positive' | 'neutral' | 'negative';
    topModels: string[];            // ✅ Just top 3
    averageRank: number | null;
  };
  results: FingerprintResultDTO[];  // ✅ Filtered list
  createdAt: string;                // ✅ Formatted date
}

interface FingerprintResultDTO {
  model: string;                    // ✅ Display name only
  mentioned: boolean;
  sentiment: 'positive' | 'neutral' | 'negative';
  confidence: number;               // ✅ 0-100, not 0-1
  rankPosition: number | null;
  // ❌ NO rawResponse (hidden from UI)
  // ❌ NO tokensUsed (technical detail)
}
```

**Benefits:**
- ✅ Reduced payload (no 1000-char raw responses)
- ✅ User-friendly field names
- ✅ Computed summaries (mentionRate, topModels)
- ✅ Formatted dates

---

### **2. Wikidata Service**

**Service:** `lib/wikidata/entity-builder.ts`

**Domain Output:**
```typescript
interface WikidataEntityData {
  labels: Record<string, { language: string; value: string }>;
  descriptions: Record<string, { language: string; value: string }>;
  claims: Record<string, WikidataClaim[]>;  // ❌ Complex nested structure
}

interface WikidataClaim {
  id?: string;
  type: string;
  mainsnak: {
    snaktype: string;
    property: string;
    datavalue?: {
      value: any;
      type: string;
    };
  };
  qualifiers?: Record<string, any[]>;
  references?: any[];
}
```

**Issues for UI:**
- ❌ Complex nested structure (`claims.P31.mainsnak.datavalue`)
- ❌ Technical property IDs (`P31`, `P452`)
- ❌ No notability assessment
- ❌ No user-friendly status

**DTO Solution:**
```typescript
interface WikidataPublishDTO {
  businessId: number;
  businessName: string;
  entity: {
    label: string;                  // ✅ Simplified: just the string
    description: string;            // ✅ Simplified: just the string
    claimCount: number;             // ✅ Count instead of full claims
  };
  notability: {
    isNotable: boolean;             // ✅ Clear boolean
    confidence: number;
    reasons: string[];              // ✅ Human-readable reasons
    seriousReferenceCount: number;
    topReferences: Array<{
      title: string;
      url: string;
      source: string;
      trustScore: number;           // ✅ 0-100 scale
    }>;
  };
  canPublish: boolean;              // ✅ Clear recommendation
  recommendation: string;           // ✅ "Ready to publish" or "Do not publish"
}

interface WikidataStatusDTO {
  qid: string | null;
  status: 'published' | 'pending' | 'not-started';  // ✅ Simple states
  url: string | null;               // ✅ Direct link for users
  lastChecked: string | null;       // ✅ "2 hours ago"
  claimCount: number;
  notabilityScore: number | null;   // ✅ 0-100 scale
}
```

**Benefits:**
- ✅ Simple flat structure (no nested objects)
- ✅ Human-readable fields
- ✅ Notability integrated
- ✅ Clear actionable status

---

### **3. Crawler Service**

**Service:** `lib/crawler/index.ts`

**Domain Output:**
```typescript
interface CrawlResult {
  success: boolean;
  data?: CrawledData;
  error?: string;
  url: string;
  crawledAt: Date;
}

interface CrawledData {
  name?: string;
  description?: string;
  phone?: string;
  email?: string;
  socialLinks?: { facebook?, instagram?, linkedin?, twitter? };
  structuredData?: Record<string, unknown>;  // ❌ Technical, varies
  metaTags?: Record<string, string>;         // ❌ Technical
  founded?: string;
  categories?: string[];
  services?: string[];
  imageUrl?: string;
  hours?: Record<string, string>;            // ❌ Complex format
}
```

**Issues for UI:**
- ❌ `structuredData` and `metaTags` too technical
- ❌ `hours` format varies (needs parsing)
- ❌ No formatted status
- ❌ Date object (needs formatting)

**DTO Solution:**
```typescript
interface CrawlResultDTO {
  success: boolean;
  status: 'completed' | 'failed' | 'processing';  // ✅ Clear states
  lastCrawled: string | null;                     // ✅ "Yesterday"
  data: {
    phone: string | null;
    email: string | null;
    socialLinks: {
      facebook?: string;
      instagram?: string;
      linkedin?: string;
      twitter?: string;
    };
    description: string | null;
    founded: string | null;
    categories: string[];          // ✅ Just the list
  } | null;
  errorMessage: string | null;    // ✅ User-friendly error
  // ❌ NO structuredData (too technical)
  // ❌ NO metaTags (too technical)
  // ❌ NO hours (complex parsing not worth it for now)
}
```

**Benefits:**
- ✅ Only user-relevant fields
- ✅ Formatted dates
- ✅ Simple status states
- ✅ Technical details hidden

---

## 🎯 **Usage Examples**

### **Dashboard (Current - Using DTO)**

```typescript
// app/(dashboard)/dashboard/page.tsx

import { getDashboardDTO } from '@/lib/data/dashboard-dto';
import type { DashboardDTO } from '@/lib/data/types';

const stats: DashboardDTO = await getDashboardDTO(team.id);

// ✅ Clean, type-safe rendering
{stats.businesses.map(business => (
  <BusinessCard
    name={business.name}
    score={business.visibilityScore}
    trend={business.trend}
  />
))}
```

### **Wikidata Publish (Future - With DTO)**

```typescript
// app/api/wikidata/publish/route.ts

import { getWikidataPublishDTO } from '@/lib/data/wikidata-dto';

const publishData = await getWikidataPublishDTO(businessId);

// ✅ Simple validation
if (!publishData.canPublish) {
  return Response.json({
    error: publishData.recommendation,  // Human-readable
    notability: publishData.notability, // Clear reasons
  }, { status: 400 });
}

// ✅ Safe to publish
const result = await wikidataPublisher.publishEntity(publishData.entity);
```

### **Fingerprint Display (Future - With DTO)**

```typescript
// app/(dashboard)/dashboard/businesses/[id]/fingerprint/page.tsx

import { getFingerprintDetailDTO } from '@/lib/data/fingerprint-dto';

const fingerprint = await getFingerprintDetailDTO(businessId);

// ✅ Clean rendering
<Card>
  <h3>Visibility Score: {fingerprint.visibilityScore}</h3>
  <p>Mentioned in {fingerprint.summary.mentionRate}% of models</p>
  <p>Overall sentiment: {fingerprint.summary.sentiment}</p>
  <p>Top performers: {fingerprint.summary.topModels.join(', ')}</p>
  
  {/* Detailed results (filtered, no rawResponse) */}
  {fingerprint.results.map(result => (
    <ResultCard {...result} />
  ))}
</Card>
```

---

## 📋 **Implementation Checklist**

### **Phase 1: Dashboard DTO** ✅ COMPLETE
- [x] Create `DashboardDTO` and `DashboardBusinessDTO`
- [x] Implement `getDashboardDTO()`
- [x] Refactor dashboard page
- [x] Write tests (12 passing)

### **Phase 2: Service DTOs** (To be implemented)
- [ ] **Wikidata DTO**
  - [ ] Create `lib/data/wikidata-dto.ts`
  - [ ] Implement `getWikidataPublishDTO()`
  - [ ] Implement `getWikidataStatusDTO()`
  - [ ] Write tests

- [ ] **Fingerprint DTO**
  - [ ] Create `lib/data/fingerprint-dto.ts`
  - [ ] Implement `getFingerprintDetailDTO()`
  - [ ] Write tests

- [ ] **Crawler DTO**
  - [ ] Create `lib/data/crawler-dto.ts`
  - [ ] Implement `getCrawlResultDTO()`
  - [ ] Write tests

---

## 🔍 **Decision Matrix: When to Create a DTO**

| Question | Yes = DTO Needed | No = No DTO Needed |
|----------|------------------|-------------------|
| Does UI display this data? | ✅ | ❌ |
| Is data structure complex? | ✅ | ❌ |
| Are there sensitive fields? | ✅ | ❌ |
| Does data need formatting? | ✅ | ❌ |
| Multiple pages use this data? | ✅ | ❌ |

**Examples:**
- **LLM Fingerprinting:** Yes to all 5 → ✅ DTO needed
- **Wikidata Entity:** Yes to all 5 → ✅ DTO needed
- **Crawler Results:** Yes to 4/5 → ✅ DTO needed
- **Email Templates:** No to all → ❌ No DTO
- **Auth Session:** No to 4/5 → ❌ No DTO

---

## 📚 **Summary**

### **Services WITH DTOs:**
1. ✅ **Dashboard** (`lib/db/queries.ts` → `DashboardDTO`)
2. ⏳ **Wikidata** (`lib/wikidata/` → `WikidataPublishDTO`, `WikidataStatusDTO`)
3. ⏳ **LLM Fingerprinting** (`lib/llm/fingerprinter.ts` → `FingerprintDetailDTO`)
4. ⏳ **Crawler** (`lib/crawler/index.ts` → `CrawlResultDTO`)

### **Services WITHOUT DTOs:**
- ❌ `lib/auth/` (internal)
- ❌ `lib/email/` (no UI display)
- ❌ `lib/payments/` (minimal UI)
- ❌ `lib/validation/` (input only)
- ❌ `lib/gemflush/` (config only)

### **Key Principle:**
**If users see it in the UI, it needs a DTO.**

---

**Next:** Implement Phase 2 DTOs (wikidata-dto.ts, fingerprint-dto.ts, crawler-dto.ts)

