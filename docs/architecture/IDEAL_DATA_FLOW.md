# GEMflush Platform: IDEAL Data Flow Specification

**Version:** 1.0.0  
**Last Updated:** January 2025  
**Purpose:** Comprehensive specification of the ideal data flow architecture for iterative testing and improvement

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Platform Overview](#platform-overview)
3. [Core Data Flow: CFP Pipeline](#core-data-flow-cfp-pipeline)
4. [Data Layer Architecture](#data-layer-architecture)
5. [API Layer Architecture](#api-layer-architecture)
6. [Frontend/UX Layer Architecture](#frontendux-layer-architecture)
7. [Testing Strategy by Sub-Unit](#testing-strategy-by-sub-unit)
8. [Iterative Improvement Process](#iterative-improvement-process)
9. [Data Flow Diagrams](#data-flow-diagrams)

---

## Executive Summary

GEMflush is a **Knowledge Graph as a Service (KGaaS)** platform that enables businesses to:
1. **Crawl** their website data
2. **Fingerprint** their LLM visibility across multiple AI models
3. **Publish** structured data to Wikidata to influence AI perception

The platform follows a **layered architecture** with clear separation of concerns:
- **Database Layer**: PostgreSQL with Drizzle ORM (ground truth)
- **DTO Layer**: Data transformation for UI consumption
- **API Layer**: RESTful endpoints with authentication
- **Frontend Layer**: Next.js React components with hooks

This document specifies the **ideal data flow** to enable:
- **Unit testing** of individual components
- **Integration testing** of service interactions
- **E2E testing** of complete user journeys
- **Iterative improvement** through test-driven development

---

## Platform Overview

### Core Value Proposition

**"Help businesses test their AI visibility for free, upgrade to publish to Wikidata."**

### Key Features

1. **Web Crawling**: Automated extraction of business data from websites
2. **LLM Fingerprinting**: Measure visibility across GPT-4, Claude, Gemini
3. **Competitive Intelligence**: Benchmark against competitors
4. **Wikidata Publishing**: Automated entity creation and publication
5. **Automation**: Scheduled crawling and publishing for Pro users

### Technology Stack

- **Frontend**: Next.js 14 (App Router), React, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes (Serverless)
- **Database**: PostgreSQL with Drizzle ORM
- **External APIs**: Firecrawl, OpenRouter, Wikidata Action API
- **Authentication**: NextAuth.js
- **Payments**: Stripe

---

## Core Data Flow: CFP Pipeline

The **CFP (Crawl → Fingerprint → Publish)** pipeline is the heart of GEMflush. It transforms a business URL into a published Wikidata entity.

### High-Level Flow

```
User Input (URL)
    ↓
[C] CRAWL
    ├── Firecrawl API → HTML/Markdown
    ├── Parse JSON-LD structured data
    ├── Extract metadata (title, description, social links)
    └── LLM-enhanced extraction → Structured Business Data
    ↓
[F] FINGERPRINT
    ├── Query 3 LLMs (GPT-4, Claude, Gemini)
    ├── 3 prompt types per model (9 queries total)
    ├── Calculate visibility score (0-100)
    ├── Generate competitive benchmark
    └── Store fingerprint analysis → Visibility Metrics
    ↓
[P] PUBLISH
    ├── Build Wikidata entity (Entity Builder)
    ├── Resolve QIDs via SPARQL (location, industry)
    ├── Verify notability (Google Search API)
    ├── Validate entity schema
    └── Publish to Wikidata → QID assigned
```

### Detailed CFP Sub-Units

#### 1. Crawl Phase (`lib/crawler/`)

**Input**: Business URL (string)  
**Output**: `CrawledData` object

**Data Flow**:
```
URL → Firecrawl API → HTML/Markdown
    ↓
Cheerio Parser → Extract JSON-LD, meta tags, social links
    ↓
LLM Enhancement (OpenRouter) → Structured extraction
    ↓
CrawledData {
  name: string
  description: string
  phone: string | null
  email: string | null
  socialLinks: { facebook?, instagram?, linkedin?, twitter? }
  location: { city, state, country, coordinates? }
  categories: string[]
  founded: string | null
}
```

**Database Storage**:
- `businesses.crawlData` (JSONB) - Raw crawl results
- `businesses.lastCrawledAt` (timestamp)
- `businesses.status` → 'crawled'
- `crawlJobs` table - Job tracking with status/progress

**Testable Sub-Units**:
1. URL validation and normalization
2. Firecrawl API integration (with fallbacks)
3. HTML parsing (Cheerio)
4. JSON-LD extraction
5. LLM enhancement prompt/response
6. Data validation and sanitization
7. Database persistence

#### 2. Fingerprint Phase (`lib/llm/`)

**Input**: Business data (from crawl or database)  
**Output**: `FingerprintAnalysis` object

**Data Flow**:
```
Business Data → LLM Fingerprinter
    ↓
Generate 9 prompts (3 models × 3 prompt types)
    ├── Factual: "What is [business]?"
    ├── Opinion: "What do people say about [business]?"
    └── Recommendation: "Recommend [category] businesses in [location]"
    ↓
OpenRouter API → Parallel LLM queries
    ├── GPT-4 responses
    ├── Claude responses
    └── Gemini responses
    ↓
Response Analyzer → Extract insights
    ├── Mention detection
    ├── Sentiment analysis
    ├── Rank position extraction
    └── Competitive analysis
    ↓
FingerprintAnalysis {
  visibilityScore: number (0-100)
  mentionRate: number (0-100)
  sentimentScore: number (-100 to 100)
  accuracyScore: number (0-100)
  avgRankPosition: number | null
  llmResults: LLMResult[] (15 results)
  competitiveLeaderboard: CompetitiveLeaderboard | null
}
```

**Database Storage**:
- `llmFingerprints` table - Complete analysis results
- `llmFingerprints.llmResults` (JSONB) - Raw LLM responses
- `llmFingerprints.competitiveLeaderboard` (JSONB) - Competitive data

**Testable Sub-Units**:
1. Prompt generation (factual, opinion, recommendation)
2. OpenRouter API integration
3. Response parsing and validation
4. Mention detection (regex + LLM)
5. Sentiment analysis
6. Rank position extraction
7. Competitive leaderboard calculation
8. Visibility score calculation
9. Database persistence

#### 3. Publish Phase (`lib/wikidata/`)

**Input**: Business data + Fingerprint analysis  
**Output**: Wikidata QID (string)

**Data Flow**:
```
Business Data + Fingerprint → Entity Builder
    ↓
Build Wikidata Entity
    ├── Label (business name)
    ├── Description
    ├── Claims (properties):
    │   ├── P31: instance of (Q4830453 = business)
    │   ├── P17: country (QID from SPARQL)
    │   ├── P131: located in (QID from SPARQL)
    │   ├── P159: headquarters location
    │   ├── P856: official website
    │   └── ... (20+ properties)
    └── References (URLs from crawl)
    ↓
SPARQL Service → Resolve QIDs
    ├── Location QIDs (city, state, country)
    ├── Industry QIDs (category → QID)
    └── QID Cache (persistent cache)
    ↓
Notability Verification
    ├── Google Search API → Reference count
    ├── Check notability criteria
    └── Generate notability report
    ↓
Wikidata Action API → Publish
    ├── Create entity
    ├── Add claims
    ├── Add references
    └── Return QID
    ↓
WikidataEntity {
  qid: string (e.g., "Q123456")
  entityData: JSONB (full entity structure)
  publishedAt: timestamp
}
```

**Database Storage**:
- `wikidataEntities` table - Published entities
- `businesses.wikidataQID` - Reference to QID
- `businesses.wikidataPublishedAt` - Timestamp
- `qidCache` table - Persistent QID lookups

**Testable Sub-Units**:
1. Entity builder (label, description, claims)
2. SPARQL query generation
3. QID resolution (with caching)
4. Notability verification
5. Entity validation
6. Wikidata Action API integration
7. Reference management
8. Database persistence

---

## Data Layer Architecture

### Database Schema (Ground Truth)

**Location**: `lib/db/schema.ts`

The database is the **single source of truth** for all business data. All DTOs derive from database records.

#### Core Tables

1. **`businesses`** - Core business entities
   - `id`, `teamId`, `name`, `url`, `category`
   - `location` (JSONB): `{ city, state, country, coordinates? }`
   - `crawlData` (JSONB): Raw crawl results
   - `wikidataQID`, `wikidataPublishedAt`
   - `status`: 'pending' | 'crawling' | 'crawled' | 'generating' | 'published' | 'error'
   - `automationEnabled`, `nextCrawlAt`, `lastAutoPublishedAt`

2. **`llmFingerprints`** - LLM visibility analysis
   - `id`, `businessId`, `visibilityScore`, `mentionRate`
   - `sentimentScore`, `accuracyScore`, `avgRankPosition`
   - `llmResults` (JSONB): Array of 15 LLM responses
   - `competitiveLeaderboard` (JSONB): Competitive analysis
   - `createdAt`

3. **`wikidataEntities`** - Published Wikidata entities
   - `id`, `businessId`, `qid` (unique)
   - `entityData` (JSONB): Full entity structure
   - `publishedAt`, `lastEnrichedAt`

4. **`crawlJobs`** - Crawl job tracking
   - `id`, `businessId`, `jobType`, `status`
   - `progress`, `result` (JSONB), `errorMessage`
   - `firecrawlJobId`, `pagesDiscovered`, `pagesProcessed`

5. **`qidCache`** - Persistent Wikidata QID cache
   - `entityType`, `searchKey`, `qid` (unique composite)
   - `source`, `queryCount`, `lastQueriedAt`

### DTO Layer (Data Transformation)

**Location**: `lib/data/`

DTOs transform database records into UI-friendly formats. They:
- **Filter** technical fields
- **Format** dates/timestamps
- **Calculate** derived fields (trends, percentages)
- **Simplify** complex nested structures

#### DTO Types

1. **`DashboardDTO`** (`lib/data/dashboard-dto.ts`)
   - Transforms: `Business[]` + `LLMFingerprint[]` → Dashboard overview
   - Used by: Dashboard page
   - Fields: `totalBusinesses`, `wikidataEntities`, `avgVisibilityScore`, `businesses[]`

2. **`BusinessDetailDTO`** (`lib/data/business-dto.ts`)
   - Transforms: `Business` + related data → Full business details
   - Used by: Business detail page
   - Fields: Complete business info with crawl, fingerprint, Wikidata data

3. **`FingerprintDetailDTO`** (`lib/data/fingerprint-dto.ts`)
   - Transforms: `FingerprintAnalysis` → UI-friendly fingerprint
   - Used by: Fingerprint detail page
   - Fields: `visibilityScore`, `trend`, `summary`, `results[]`, `competitiveLeaderboard`

4. **`WikidataPublishDTO`** (`lib/data/wikidata-dto.ts`)
   - Transforms: `WikidataEntity` + notability → Publish preview
   - Used by: Publish confirmation page
   - Fields: `entity`, `notability`, `canPublish`, `recommendation`

5. **`CrawlResultDTO`** (`lib/data/crawl-dto.ts`)
   - Transforms: `CrawlJob` + `crawlData` → Crawl status
   - Used by: Business detail page
   - Fields: `success`, `status`, `lastCrawled`, `data`, `errorMessage`

#### DTO Transformation Pattern

```typescript
// Example: DashboardBusinessDTO transformation
function transformBusinessToDTO(
  business: Business,           // Database record
  fingerprint: LLMFingerprint,  // Related data
  fingerprintHistory: LLMFingerprint[]  // For trend calculation
): DashboardBusinessDTO {
  return {
    id: business.id.toString(),           // Convert number → string
    name: business.name,
    location: formatLocation(business.location),  // JSONB → "City, State"
    visibilityScore: fingerprint?.visibilityScore ?? null,
    trend: calculateTrend(fingerprintHistory),     // Computed field
    trendValue: calculateTrendValue(fingerprintHistory),
    wikidataQid: business.wikidataQID,
    lastFingerprint: formatTimestamp(fingerprint?.createdAt),  // Date → "2 days ago"
    status: business.status,
    automationEnabled: business.automationEnabled ?? false,
  };
}
```

**Key Principles**:
- DTOs are **read-only** (no mutations)
- DTOs are **UI-optimized** (formatted, simplified)
- DTOs **isolate** UI from database changes
- DTOs **compute** derived fields (trends, percentages)

---

## API Layer Architecture

**Location**: `app/api/`

The API layer provides RESTful endpoints that:
1. Authenticate requests
2. Validate input
3. Call service layer
4. Transform to DTOs
5. Return JSON responses

### Core API Endpoints

#### Business Management

**`GET /api/business`**
- Fetches all businesses for user's team
- Returns: `BusinessDetailDTO[]`
- Flow: `getUser()` → `getTeamForUser()` → `getBusinessesByTeam()` → `getBusinessDetailDTO()`

**`POST /api/business`**
- Creates new business from URL
- Flow: Validate URL → `createBusiness()` → `executeCrawlJob()` → Return business

**`GET /api/business/[id]`**
- Fetches single business by ID
- Returns: `BusinessDetailDTO`
- Flow: Validate ID → `getBusinessById()` → `getBusinessDetailDTO()`

#### CFP Pipeline

**`POST /api/crawl`**
- Triggers crawl job for business
- Flow: Validate business → `createCrawlJob()` → `executeCrawlJob()` → Update `businesses.status`

**`POST /api/fingerprint`**
- Triggers fingerprint analysis
- Flow: Validate business → `businessFingerprinter.analyze()` → Store in `llmFingerprints`

**`POST /api/wikidata/publish`**
- Publishes business to Wikidata
- Flow: Validate business → `wikidataService.publish()` → Store in `wikidataEntities`

**`POST /api/cfp`** (Orchestrator)
- Executes complete CFP flow
- Flow: `executeCFPFlow()` → Crawl → Fingerprint → Publish → Return result

#### Dashboard & Status

**`GET /api/dashboard`**
- Returns dashboard overview
- Returns: `DashboardDTO`
- Flow: `getDashboardDTO(teamId)` → Aggregate stats + business list

**`GET /api/business/[id]/status`**
- Returns business processing status
- Returns: `StatusDTO`
- Flow: `getBusinessById()` → Check `status`, `crawlJobs`, `llmFingerprints`

### API Request/Response Flow

```
Client Request
    ↓
Middleware (authentication, CORS)
    ↓
API Route Handler
    ├── Validate input (Zod schemas)
    ├── Authenticate user (getUser())
    ├── Authorize (check team membership)
    ├── Call service layer
    │   ├── Database queries (lib/db/queries.ts)
    │   ├── Business logic (lib/services/)
    │   └── External APIs (Firecrawl, OpenRouter, Wikidata)
    ├── Transform to DTO (lib/data/)
    └── Return JSON response
    ↓
Client Response (DTO)
```

### Idempotency & Caching

- **Idempotency keys**: Prevent duplicate operations
- **Response caching**: Cache GET requests (24h TTL)
- **Crawl caching**: Prevent redundant crawls (24h TTL)

---

## Frontend/UX Layer Architecture

**Location**: `app/(dashboard)/`, `components/`

The frontend layer consumes DTOs from APIs and renders UI components.

### Component Hierarchy

```
Dashboard Layout
    ├── Dashboard Page
    │   ├── useDashboard() hook → GET /api/dashboard
    │   ├── DashboardDTO → Business cards
    │   └── Stats overview
    ├── Businesses Page
    │   ├── useBusinesses() hook → GET /api/business
    │   └── Business list with filters
    └── Business Detail Page
        ├── useBusinessDetail() hook → GET /api/business/[id]
        ├── BusinessDetailDTO → Cards:
        │   ├── GemOverviewCard (crawl status)
        │   ├── VisibilityIntelCard (fingerprint)
        │   ├── CompetitiveEdgeCard (leaderboard)
        │   └── WikidataEntityCard (publish status)
        └── Action buttons (Crawl, Fingerprint, Publish)
```

### Data Fetching Pattern

**React Hooks** (`hooks/`):
```typescript
// Example: useBusinessDetail hook
function useBusinessDetail(businessId: number) {
  const [business, setBusiness] = useState<BusinessDetailDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/business/${businessId}`)
      .then(res => res.json())
      .then(data => {
        setBusiness(data);  // DTO from API
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [businessId]);

  return { business, loading, error, refresh };
}
```

**Component Usage**:
```typescript
// Business detail page
const { business, fingerprint, entity, loading, error } = useBusinessDetail(businessId);

// Render cards with DTO data
<GemOverviewCard business={business} />
<VisibilityIntelCard fingerprint={fingerprint} />
<CompetitiveEdgeCard leaderboard={fingerprint?.competitiveLeaderboard} />
```

### UX Flow States

1. **Loading State**: Skeleton components
2. **Error State**: ErrorCard with retry
3. **Empty State**: Welcome message + CTA
4. **Success State**: Data cards with actions
5. **Processing State**: Progress indicators (crawling, fingerprinting, publishing)

### Automation Flow (Pro Users)

For Pro users with `automationEnabled`:
- **Automatic crawling**: Scheduled via cron jobs
- **Automatic fingerprinting**: After crawl completes
- **Automatic publishing**: After fingerprint completes
- **Progress tracking**: Real-time status updates via polling

---

## Testing Strategy by Sub-Unit

### 1. Database Layer Testing

**Unit Tests**: `lib/db/__tests__/`

**Testable Units**:
- Schema definitions (type inference)
- Query functions (`lib/db/queries.ts`)
- Relations (foreign keys, joins)
- Migrations (up/down)

**Test Examples**:
```typescript
describe('getBusinessesByTeam', () => {
  it('should return businesses for team', async () => {
    const businesses = await getBusinessesByTeam(teamId);
    expect(businesses).toHaveLength(3);
    expect(businesses[0].teamId).toBe(teamId);
  });
});
```

### 2. DTO Layer Testing

**Unit Tests**: `lib/data/__tests__/`

**Testable Units**:
- DTO transformation functions
- Format helpers (dates, locations)
- Trend calculations
- Data validation

**Test Examples**:
```typescript
describe('transformBusinessToDTO', () => {
  it('should format location correctly', () => {
    const business = { location: { city: 'SF', state: 'CA' } };
    const dto = transformBusinessToDTO(business, null, []);
    expect(dto.location).toBe('SF, CA');
  });

  it('should calculate trend from history', () => {
    const history = [
      { visibilityScore: 50, createdAt: new Date('2024-01-01') },
      { visibilityScore: 75, createdAt: new Date('2024-01-15') },
    ];
    const dto = transformBusinessToDTO(business, history[1], history);
    expect(dto.trend).toBe('up');
    expect(dto.trendValue).toBe(25);
  });
});
```

### 3. Service Layer Testing

**Unit Tests**: `lib/services/__tests__/`, `lib/crawler/__tests__/`, `lib/llm/__tests__/`, `lib/wikidata/__tests__/`

**Testable Units**:
- Crawler: URL parsing, HTML extraction, LLM enhancement
- Fingerprinter: Prompt generation, response parsing, score calculation
- Wikidata: Entity building, SPARQL queries, publishing

**Test Examples**:
```typescript
describe('webCrawler.crawl', () => {
  it('should extract JSON-LD from HTML', async () => {
    const html = '<script type="application/ld+json">{"@type":"LocalBusiness"}</script>';
    const result = await webCrawler.crawl('https://example.com');
    expect(result.name).toBeDefined();
  });
});

describe('businessFingerprinter.analyze', () => {
  it('should calculate visibility score', async () => {
    const analysis = await businessFingerprinter.analyze(business);
    expect(analysis.visibilityScore).toBeGreaterThanOrEqual(0);
    expect(analysis.visibilityScore).toBeLessThanOrEqual(100);
  });
});
```

### 4. API Layer Testing

**Integration Tests**: `app/api/__tests__/`

**Testable Units**:
- Request validation
- Authentication/authorization
- Service integration
- Response formatting

**Test Examples**:
```typescript
describe('POST /api/crawl', () => {
  it('should require authentication', async () => {
    const res = await POST('/api/crawl', { businessId: 1 });
    expect(res.status).toBe(401);
  });

  it('should create crawl job', async () => {
    const res = await authenticatedPOST('/api/crawl', { businessId: 1 });
    expect(res.status).toBe(200);
    expect(res.json().jobId).toBeDefined();
  });
});
```

### 5. Frontend Component Testing

**Component Tests**: `components/__tests__/`

**Testable Units**:
- Component rendering
- Hook data fetching
- User interactions
- Error handling

**Test Examples**:
```typescript
describe('GemOverviewCard', () => {
  it('should display business name', () => {
    const business = { name: 'Test Business' };
    render(<GemOverviewCard business={business} />);
    expect(screen.getByText('Test Business')).toBeInTheDocument();
  });

  it('should show crawl button when not automated', () => {
    const business = { automationEnabled: false };
    render(<GemOverviewCard business={business} onCrawl={jest.fn()} />);
    expect(screen.getByText('Crawl Website')).toBeInTheDocument();
  });
});
```

### 6. End-to-End Testing

**E2E Tests**: `tests/e2e/`

**Testable Flows**:
- Complete CFP pipeline
- User registration → Business creation → Crawl → Fingerprint → Publish
- Dashboard data accuracy
- DTO transformation verification

**Test Examples**:
```typescript
describe('CFP End-to-End Flow', () => {
  it('should complete crawl → fingerprint → publish', async () => {
    // 1. Create business
    const business = await createBusiness('https://example.com');
    
    // 2. Trigger crawl
    await triggerCrawl(business.id);
    await waitForStatus(business.id, 'crawled');
    
    // 3. Trigger fingerprint
    await triggerFingerprint(business.id);
    await waitForFingerprint(business.id);
    
    // 4. Verify fingerprint data
    const fingerprint = await getFingerprint(business.id);
    expect(fingerprint.visibilityScore).toBeGreaterThan(0);
    
    // 5. Trigger publish
    await triggerPublish(business.id);
    await waitForStatus(business.id, 'published');
    
    // 6. Verify Wikidata QID
    const businessUpdated = await getBusiness(business.id);
    expect(businessUpdated.wikidataQID).toMatch(/^Q\d+$/);
  });
});
```

---

## Iterative Improvement Process

### Test-Driven Development Cycle

1. **Identify Bottleneck**: Run E2E test → Identify failing/underperforming sub-unit
2. **Write Unit Test**: Create test for specific sub-unit
3. **Implement Fix**: Improve sub-unit to pass test
4. **Verify Integration**: Run integration test
5. **Verify E2E**: Run full E2E test
6. **Iterate**: Repeat until E2E passes

### Example: Improving Crawl Accuracy

**Problem**: E2E test fails - "Crawl extracted incorrect business name"

**Process**:
1. **Isolate**: Write unit test for JSON-LD extraction
   ```typescript
   it('should extract business name from JSON-LD', () => {
     const jsonld = { "@type": "LocalBusiness", "name": "Test Business" };
     const result = extractJSONLD(jsonld);
     expect(result.name).toBe('Test Business');
   });
   ```

2. **Fix**: Improve extraction logic
   ```typescript
   function extractJSONLD(data: any): CrawledData {
     // Improved: Handle nested @graph arrays
     const business = Array.isArray(data['@graph']) 
       ? data['@graph'].find(item => item['@type'] === 'LocalBusiness')
       : data;
     return { name: business.name, ... };
   }
   ```

3. **Verify**: Run unit test → Pass
4. **Integrate**: Run integration test → Pass
5. **E2E**: Run E2E test → Pass

### Sub-Unit Improvement Checklist

For each sub-unit, ensure:
- [ ] **Unit test coverage** (80%+)
- [ ] **Integration test** (with dependencies)
- [ ] **Error handling** (graceful failures)
- [ ] **Logging** (debugging support)
- [ ] **Documentation** (code comments)
- [ ] **Performance** (acceptable latency)
- [ ] **Data validation** (input/output)

---

## Data Flow Diagrams

### Complete User Journey

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER ACTION                              │
│              "Add Business: https://example.com"                 │
└────────────────────────────┬────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│                    FRONTEND (React Component)                    │
│  useCreateBusiness() hook → POST /api/business                  │
└────────────────────────────┬────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│                      API LAYER (Route Handler)                  │
│  POST /api/business                                             │
│    ├── Validate URL                                             │
│    ├── Authenticate user                                        │
│    ├── Create business record (status: 'pending')               │
│    └── Trigger crawl job                                        │
└────────────────────────────┬────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│                    DATABASE (PostgreSQL)                         │
│  INSERT INTO businesses (name, url, status, teamId)             │
│  INSERT INTO crawl_jobs (businessId, status: 'processing')       │
└────────────────────────────┬────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│                   SERVICE LAYER (Crawler)                       │
│  executeCrawlJob()                                               │
│    ├── Firecrawl API → HTML/Markdown                            │
│    ├── Parse JSON-LD, meta tags                                 │
│    ├── LLM enhancement (OpenRouter)                              │
│    └── UPDATE businesses (crawlData, status: 'crawled')         │
└────────────────────────────┬────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│                    DATABASE (PostgreSQL)                         │
│  UPDATE businesses SET crawlData = {...}, status = 'crawled'    │
│  UPDATE crawl_jobs SET status = 'completed'                     │
└────────────────────────────┬────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│                  DTO LAYER (Transformation)                     │
│  getBusinessDetailDTO()                                         │
│    ├── Fetch business + crawl job                                │
│    ├── Transform crawlData → CrawlResultDTO                     │
│    └── Format timestamps, locations                              │
└────────────────────────────┬────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│                    API RESPONSE (JSON)                           │
│  BusinessDetailDTO {                                             │
│    id: "1",                                                      │
│    name: "Example Business",                                     │
│    crawlInfo: { lastCrawled: "2 minutes ago", ... }            │
│  }                                                               │
└────────────────────────────┬────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│                    FRONTEND (React Component)                   │
│  GemOverviewCard displays:                                       │
│    - Business name                                               │
│    - Crawl status: "Crawled 2 minutes ago"                      │
│    - Action button: "Analyze Visibility"                         │
└─────────────────────────────────────────────────────────────────┘
```

### CFP Pipeline Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    CRAWL PHASE                                   │
│                                                                   │
│  Input: URL                                                      │
│    ↓                                                              │
│  Firecrawl API → HTML                                            │
│    ↓                                                              │
│  Cheerio Parser → JSON-LD, meta tags                            │
│    ↓                                                              │
│  LLM Enhancement → Structured data                              │
│    ↓                                                              │
│  Output: CrawledData (JSONB in businesses.crawlData)            │
└────────────────────────────┬────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│                  FINGERPRINT PHASE                               │
│                                                                   │
│  Input: Business data (from crawl)                               │
│    ↓                                                              │
│  Generate 9 prompts (3 models × 3 types)                        │
│    ↓                                                              │
│  OpenRouter API → 15 LLM responses                              │
│    ↓                                                              │
│  Response Analyzer → Extract insights                            │
│    ├── Mention detection                                         │
│    ├── Sentiment analysis                                        │
│    ├── Rank position                                             │
│    └── Competitive analysis                                      │
│    ↓                                                              │
│  Output: FingerprintAnalysis (in llmFingerprints table)          │
└────────────────────────────┬────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│                    PUBLISH PHASE                                 │
│                                                                   │
│  Input: Business data + Fingerprint                              │
│    ↓                                                              │
│  Entity Builder → Wikidata entity structure                      │
│    ├── Label, description                                        │
│    ├── Claims (20+ properties)                                    │
│    └── References (URLs)                                          │
│    ↓                                                              │
│  SPARQL Service → Resolve QIDs (location, industry)             │
│    ↓                                                              │
│  Notability Verification → Google Search API                     │
│    ↓                                                              │
│  Wikidata Action API → Publish entity                            │
│    ↓                                                              │
│  Output: QID (stored in businesses.wikidataQID)                 │
└─────────────────────────────────────────────────────────────────┘
```

### DTO Transformation Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    DATABASE (Ground Truth)                       │
│                                                                   │
│  businesses table:                                               │
│    { id: 1, name: "Test", location: {city: "SF", state: "CA"} } │
│                                                                   │
│  llmFingerprints table:                                          │
│    { visibilityScore: 75, createdAt: "2024-01-15T10:00:00Z" }    │
└────────────────────────────┬────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│                    DTO TRANSFORMATION                            │
│                                                                   │
│  transformBusinessToDTO()                                        │
│    ├── Convert id: number → string                                │
│    ├── Format location: JSONB → "SF, CA"                        │
│    ├── Format timestamp: Date → "2 days ago"                    │
│    ├── Calculate trend: history → 'up' | 'down' | 'neutral'      │
│    └── Filter fields: Only UI-relevant data                      │
└────────────────────────────┬────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│                    DTO (UI-Optimized)                            │
│                                                                   │
│  DashboardBusinessDTO:                                           │
│    {                                                              │
│      id: "1",                                                     │
│      name: "Test",                                                │
│      location: "SF, CA",                                          │
│      visibilityScore: 75,                                         │
│      trend: "up",                                                 │
│      lastFingerprint: "2 days ago"                                │
│    }                                                              │
└────────────────────────────┬────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│                    FRONTEND (React Component)                    │
│                                                                   │
│  <BusinessCard business={dto} />                                  │
│    Displays: "Test - SF, CA - Score: 75 ↑"                      │
└─────────────────────────────────────────────────────────────────┘
```

---

## Conclusion

This document specifies the **ideal data flow** for the GEMflush platform. By breaking down the system into **testable sub-units**, we enable:

1. **Unit Testing**: Individual components can be tested in isolation
2. **Integration Testing**: Service interactions can be verified
3. **E2E Testing**: Complete user journeys can be validated
4. **Iterative Improvement**: Bottlenecks can be identified and fixed systematically

### Key Principles

- **Database is Ground Truth**: All data originates from PostgreSQL
- **DTOs Transform for UI**: DTOs format data for frontend consumption
- **APIs Orchestrate**: API routes coordinate services and return DTOs
- **Frontend Consumes DTOs**: React components display DTO data
- **Test Everything**: Each sub-unit should have unit, integration, and E2E tests

### Next Steps

1. **Run E2E Tests**: Identify current bottlenecks
2. **Improve Sub-Units**: Fix failing/underperforming components
3. **Add Test Coverage**: Ensure 80%+ coverage for all sub-units
4. **Document Changes**: Update this document as architecture evolves
5. **Iterate**: Repeat until platform meets commercial quality standards

---

**Document Status**: Living document - update as architecture evolves  
**Maintainer**: Development team  
**Review Frequency**: Monthly or after major architecture changes

