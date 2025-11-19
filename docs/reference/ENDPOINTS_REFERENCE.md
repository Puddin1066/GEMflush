# GEMflush Endpoints Reference

**Last Updated:** December 2024  
**Purpose:** Comprehensive reference for all external and internal endpoints with responsibilities and relationships

---

## Table of Contents

1. [External API Endpoints](#external-api-endpoints)
2. [Internal API Routes](#internal-api-routes)
3. [Endpoint Relationships](#endpoint-relationships)
4. [CFP Pipeline Endpoint Flow](#cfp-pipeline-endpoint-flow)
5. [Authentication & Authorization](#authentication--authorization)
6. [Rate Limits & Quotas](#rate-limits--quotas)

---

## External API Endpoints

External third-party services integrated into the platform.

### Crawl & Data Extraction

| Provider | Endpoint | Purpose | Location | Authentication | Rate Limits |
|----------|----------|---------|----------|----------------|-------------|
| **Firecrawl API** | `https://api.firecrawl.dev/v1/scrape` | Primary web crawling service. Extracts HTML and markdown from business websites. Handles JavaScript-rendered sites and anti-bot protection. | `lib/crawler/index.ts` | Bearer Token (`FIRECRAWL_API_KEY`) | 10 req/min (free tier). Client-side rate limiting: 7s between requests. |
| **Playwright (Local)** | *Local browser instance* | Fallback crawler for dev environments. Headless Chromium browser for JS-heavy sites. | `lib/crawler/index.ts` | N/A (local) | No limits (local only) |
| **Static Fetch** | *Target website URL* | Last-resort fallback for simple static sites. Direct HTTP fetch. | `lib/crawler/index.ts` | N/A | Browser/network limits |

**Usage Context:**
- Called during CFP **Crawl (C)** phase
- Primary: Firecrawl API (production)
- Fallbacks: Playwright (dev), Static fetch (last resort)
- Enhanced with OpenRouter LLM call for data extraction

---

### LLM & AI Intelligence

| Provider | Endpoint | Purpose | Location | Authentication | Rate Limits |
|----------|----------|---------|----------|----------------|-------------|
| **OpenRouter API** | `https://openrouter.ai/api/v1/chat/completions` | Multi-LLM gateway for fingerprinting and data enhancement. Queries 3 models (GPT-4, Claude, Gemini) with 3 prompt types each (9 queries total in parallel). | `lib/llm/openrouter.ts`<br/>`lib/llm/fingerprinter.ts` | Bearer Token (`OPENROUTER_API_KEY`) | Model-specific. Cost-optimized routing. File-based caching for dev. |
| **OpenRouter API (Crawl Enhancement)** | `https://openrouter.ai/api/v1/chat/completions` | Single LLM call to enhance crawled data. Extracts business details, industry classification, services. | `lib/crawler/index.ts` | Bearer Token (`OPENROUTER_API_KEY`) | Same as above. |

**Usage Context:**
- **Fingerprinting (F):** 9 parallel queries (~3-5s) via `llmFingerprinter.fingerprint()`
- **Crawl Enhancement:** 1 LLM call (~1-2s) via `webCrawler.enhanceWithLLM()`
- **Notability Assessment:** Used in `notability-checker.ts` for reference quality assessment

---

### Knowledge Graph & Publishing

| Provider | Endpoint | Purpose | Location | Authentication | Rate Limits |
|----------|----------|---------|----------|----------------|-------------|
| **Wikidata Action API (Test)** | `https://test.wikidata.org/w/api.php` | Publishes business entities to Wikidata test environment. Creates/updates entities with QIDs, PIDs, and references. | `lib/wikidata/publisher.ts` | OAuth Bot Password (`WIKIDATA_BOT_USERNAME` + `WIKIDATA_BOT_PASSWORD`) | Wikidata bot policies. CSRF token required. |
| **Wikidata Action API (Production)** | `https://www.wikidata.org/w/api.php` | Production Wikidata publishing. **Currently disabled** - bot account is banned. | `lib/wikidata/publisher.ts` | OAuth Bot Password | Same as above. Currently blocked. |
| **Wikidata SPARQL Endpoint** | `https://query.wikidata.org/sparql` | Resolves human-readable names to Wikidata QIDs. Maps locations, industries, categories to graph IDs. | `lib/wikidata/sparql.ts` | None (public endpoint) | No authentication. 4-tier hybrid cache reduces queries by ~95%. |
| **Wikidata Entity Pages** | `https://test.wikidata.org/wiki/{QID}`<br/>`https://www.wikidata.org/wiki/{QID}` | View published entities. Used for user-facing links. | `lib/data/wikidata-dto.ts` | N/A (read-only) | N/A |

**Usage Context:**
- **Publishing (P):** `wbeditentity` action to create/update entities
- **QID Resolution:** SPARQL queries for location/industry mapping
- **Entity Building:** Maps business data to Wikidata properties (PIDs)

---

### Verification & Fact-Checking

| Provider | Endpoint | Purpose | Location | Authentication | Rate Limits |
|----------|----------|---------|----------|----------------|-------------|
| **Google Custom Search API** | `https://www.googleapis.com/customsearch/v1` | Validates business notability before Wikidata publishing. Finds independent third-party sources and reference URLs. | `lib/wikidata/notability-checker.ts` | API Key (`GOOGLE_CUSTOM_SEARCH_API_KEY` + `GOOGLE_CUSTOM_SEARCH_ENGINE_ID`) | 100 queries/day (free tier). Daily quota tracking. Mock mode for testing. |

**Usage Context:**
- Called during **Publish (P)** phase before entity creation
- Validates notability requirements per Wikidata guidelines
- Finds reference URLs (P854) for entity claims

---

### Payments & Subscriptions

| Provider | Endpoint | Purpose | Location | Authentication | Rate Limits |
|----------|----------|---------|----------|----------------|-------------|
| **Stripe Checkout API** | `https://api.stripe.com/v1/checkout/sessions` | Creates hosted checkout sessions for subscription upgrades. | `lib/payments/stripe.ts` | Secret Key (`STRIPE_SECRET_KEY`) | Stripe API limits. Idempotency keys supported. |
| **Stripe Customer Portal API** | `https://api.stripe.com/v1/billing_portal/sessions` | Creates customer portal sessions for subscription management. | `lib/payments/stripe.ts` | Secret Key | Same as above. |
| **Stripe Webhooks** | *User-configured endpoint* | Receives subscription lifecycle events (created, updated, deleted). | `app/api/stripe/webhook/route.ts` | Webhook Secret (`STRIPE_WEBHOOK_SECRET`) | Event-driven. Signature verification required. |
| **Stripe Subscriptions API** | `https://api.stripe.com/v1/subscriptions` | Retrieves and updates subscription data. | `lib/payments/stripe.ts` | Secret Key | Same as above. |

**Usage Context:**
- **Checkout:** User upgrades to Pro/Agency tiers
- **Webhooks:** Async subscription updates (race condition handling)
- **Portal:** User manages subscriptions

---

### Email Delivery

| Provider | Endpoint | Purpose | Location | Authentication | Rate Limits |
|----------|----------|---------|----------|----------------|-------------|
| **Resend API** | `https://api.resend.com/emails` | Sends transactional emails (welcome, password reset, subscription updates, visibility reports). | `lib/email/resend.ts`<br/>`lib/email/send.ts` | API Key (`RESEND_API_KEY`) | 3,000 emails/month (free tier). 100 emails/day. |

**Usage Context:**
- Welcome emails on signup
- Password reset emails
- Subscription change notifications
- Visibility report emails

---

## Internal API Routes

Next.js API routes exposed by the platform. All routes require authentication unless noted.

### Business Management

| Route | Method | Purpose | Authentication | Relationships | Response |
|-------|--------|---------|----------------|--------------|----------|
| `/api/business` | `GET` | Lists all businesses for current team. Includes max businesses limit based on tier. | Required (session cookie) | → `lib/db/queries.getBusinessesByTeam()`<br/>→ `lib/gemflush/permissions.getMaxBusinesses()` | `{ businesses: Business[], maxBusinesses: number }` |
| `/api/business` | `POST` | Creates new business entity. Triggers auto-processing (crawl + fingerprint) for Pro tier. Supports URL-only creation. | Required | → `lib/db/queries.createBusiness()`<br/>→ `lib/services/business-processing.autoStartProcessing()`<br/>→ `lib/crawler/webCrawler.crawl()` | `{ business: Business, message: string }` (201)<br/>`{ needsLocation: true, ... }` (422 if location needed) |
| `/api/business/[id]` | `GET` | Fetches single business by ID with full details. Verifies ownership. | Required | → `lib/db/queries.getBusinessById()` | `Business` object with serialized dates |
| `/api/business/[id]` | `PUT` | Updates business metadata (name, category, location, etc.). Verifies ownership. | Required | → `lib/db/queries.updateBusiness()` | `{ business: Business }` |
| `/api/business/[id]` | `DELETE` | Soft-deletes business. Verifies ownership. | Required | → `lib/db/queries.updateBusiness()` | `{ success: true }` |

**Key Features:**
- Idempotency: Duplicate URL detection for same team
- Auto-processing: Crawl + fingerprint start automatically (Pro tier)
- URL-only creation: Business can be created with just URL, location updated after crawl

---

### CFP Pipeline: Crawl

| Route | Method | Purpose | Authentication | Relationships | Response |
|-------|--------|---------|----------------|--------------|----------|
| `/api/crawl` | `POST` | Triggers web crawl for a business. Checks cache before crawling (24-hour TTL). Creates crawl job and executes in background. | Required | → `lib/services/business-processing.shouldCrawl()`<br/>→ `lib/services/business-processing.executeCrawlJob()`<br/>→ `lib/crawler/webCrawler.crawl()`<br/>→ **External:** Firecrawl API | `{ jobId: number, message: string }` (queued)<br/>`{ message: "Crawl skipped - cached result valid" }` (cached) |
| `/api/job/[jobId]` | `GET` | Polls crawl job status. Returns progress, result, error messages. | Required | → `lib/db/queries.getCrawlJob()` | `{ id, businessId, status, progress, result, errorMessage, createdAt, completedAt }` |

**Key Features:**
- Cache checking: Skips crawl if recent (24h) or URL unchanged
- Background processing: Non-blocking execution
- Retry logic: 3 attempts with exponential backoff
- Idempotency: Prevents duplicate crawls within 5 minutes

---

### CFP Pipeline: Fingerprint

| Route | Method | Purpose | Authentication | Relationships | Response |
|-------|--------|---------|----------------|--------------|----------|
| `/api/fingerprint` | `POST` | Triggers LLM fingerprinting analysis. Checks frequency limits (monthly/weekly based on tier). Runs 9 parallel LLM queries. | Required | → `lib/services/business-processing.canRunFingerprint()`<br/>→ `lib/llm/fingerprinter.fingerprint()`<br/>→ **External:** OpenRouter API (9 queries)<br/>→ `lib/db/queries.insert(llmFingerprints)` | `{ fingerprintId: number, visibilityScore: number, ... }`<br/>`{ status: "skipped", message: "frequency limit" }` (if too soon) |
| `/api/fingerprint/[id]` | `GET` | Fetches specific fingerprint by ID. Verifies ownership via business. | Required | → `lib/db/queries.getFingerprintById()`<br/>→ Ownership verification | `FingerprintAnalysis` object |
| `/api/fingerprint/business/[businessId]` | `GET` | Fetches latest fingerprint for a business. Includes competitive benchmark data. | Required | → `lib/db/queries.getLatestFingerprint()`<br/>→ Ownership verification | `FingerprintAnalysis` with competitive leaderboard |

**Key Features:**
- Frequency enforcement: Free (monthly), Pro/Agency (weekly)
- Parallel execution: 9 queries in ~3-5s (vs ~45s sequential)
- Competitive benchmarking: Category-based leaderboards
- Recent check: Prevents duplicates within 10 minutes

---

### CFP Pipeline: Publish

| Route | Method | Purpose | Authentication | Relationships | Response |
|-------|--------|---------|----------------|--------------|----------|
| `/api/wikidata/publish` | `POST` | Publishes business entity to Wikidata. Builds entity, validates notability, resolves QIDs, publishes via Action API. Supports create/update. | Required (Pro/Agency tier) | → `lib/gemflush/permissions.canPublishToWikidata()`<br/>→ `lib/data/wikidata-dto.getWikidataPublishDTO()`<br/>→ `lib/wikidata/entity-builder.buildEntity()`<br/>→ `lib/wikidata/sparql.resolveQID()`<br/>→ **External:** Google Custom Search API (notability)<br/>→ **External:** Wikidata SPARQL (QID resolution)<br/>→ **External:** Wikidata Action API (publish)<br/>→ `lib/wikidata/publisher.publishEntity()` | `{ success: true, qid: string, entityId: number, publishedTo: string, entityUrl: string, notability: {...}, updated: boolean }`<br/>`{ error: "notability standards", ... }` (400) |
| `/api/wikidata/entity/[businessId]` | `GET` | Fetches Wikidata entity JSON for preview. Lazy-loaded (only builds when requested). Includes notability assessment. | Required | → `lib/data/wikidata-dto.getWikidataPublishDTO()`<br/>→ `lib/wikidata/entity-builder.buildEntity()`<br/>→ **External:** Wikidata SPARQL (QID resolution) | `{ canPublish: boolean, fullEntity: WikidataEntity, notability: {...}, recommendation: string }` |

**Key Features:**
- Notability validation: Google Search + LLM assessment before publishing
- QID resolution: SPARQL queries with 4-tier cache
- Create/Update: Detects existing QID and updates instead of creating duplicate
- Tier-based richness: Basic/Enhanced/Complete entity properties
- Test-only: Currently publishes to test.wikidata.org (production blocked)

---

### Dashboard & Analytics

| Route | Method | Purpose | Authentication | Relationships | Response |
|-------|--------|---------|----------------|--------------|----------|
| `/api/dashboard` | `GET` | Returns dashboard statistics for current team. Includes business count, fingerprint stats, published entities, recent activity. | Required | → `lib/data/dashboard-dto.getDashboardDTO()`<br/>→ `lib/db/queries.getBusinessesByTeam()`<br/>→ `lib/db/queries.getLatestFingerprints()` | `{ totalBusinesses, publishedBusinesses, totalFingerprints, avgVisibilityScore, recentActivity, ... }` |

---

### User & Team Management

| Route | Method | Purpose | Authentication | Relationships | Response |
|-------|--------|---------|----------------|--------------|----------|
| `/api/user` | `GET` | Returns authenticated user's data. Uses session cookie for auth. | Required (session cookie) | → `lib/db/queries.getUser()`<br/>→ `lib/auth/session.verifyToken()` | `User` object or `null` |
| `/api/team` | `GET` | Returns authenticated user's team data. Includes subscription tier and limits. | Required (session cookie) | → `lib/db/queries.getTeamForUser()` | `Team` object with subscription details |
| `/api/team` | `PUT` | Updates team settings (name, subscription tier, etc.). | Required | → `lib/db/queries.updateTeam()` | `{ team: Team }` |

---

### Payments & Subscriptions

| Route | Method | Purpose | Authentication | Relationships | Response |
|-------|--------|---------|----------------|--------------|----------|
| `/api/stripe/checkout` | `POST` | Creates Stripe Checkout session for subscription upgrade. Redirects to Stripe hosted checkout page. | Required | → `lib/payments/stripe.createCheckoutSession()`<br/>→ **External:** Stripe Checkout API | Redirects to Stripe checkout URL |
| `/api/stripe/checkout` | `GET` | Handles successful checkout redirect from Stripe. Updates team subscription in database. | Required (session_id query param) | → **External:** Stripe Checkout API (retrieve session)<br/>→ `lib/db/queries.updateTeam()` | Redirects to `/dashboard` |
| `/api/stripe/webhook` | `POST` | Receives Stripe webhook events (subscription created/updated/deleted). Handles async subscription lifecycle changes. | Webhook Secret (`STRIPE_WEBHOOK_SECRET`) | → **External:** Stripe Webhooks<br/>→ `lib/payments/stripe.handleSubscriptionChange()`<br/>→ `lib/db/queries.updateTeam()` | `{ received: true }` |

**Key Features:**
- Race condition handling: Webhook may arrive before redirect
- Product name normalization: Stripe product names → plan IDs (pro, agency, free)
- Idempotency: Handles duplicate webhook events safely

---

### Automation & Scheduling

| Route | Method | Purpose | Authentication | Relationships | Response |
|-------|--------|---------|----------------|--------------|----------|
| `/api/cron/weekly-crawls` | `GET` | Processes scheduled weekly crawls for all businesses with automation enabled. Called by Vercel Cron. | Vercel Cron header or `CRON_SECRET` | → `lib/services/scheduler-service.processWeeklyCrawls()`<br/>→ `lib/services/business-processing.executeCrawlJob()` | `{ success: true, scheduled: number, skipped: number, errors: number }` |
| `/api/cron/monthly` | `GET` | Processes monthly batch updates for all businesses. Runs crawl + fingerprint + publish for due businesses. Called by Vercel Cron. | Vercel Cron header or `CRON_SECRET` | → `lib/services/monthly-processing.runMonthlyProcessing()`<br/>→ `lib/services/business-processing.autoStartProcessing()` | `{ success: true, message: string, timestamp: string }` |

**Key Features:**
- Vercel Cron: Protected with `x-vercel-cron` header
- Manual testing: Supports `CRON_SECRET` for local testing
- Batch processing: Handles multiple businesses concurrently

---

### Testing & Development

| Route | Method | Purpose | Authentication | Relationships | Response |
|-------|--------|---------|----------------|--------------|----------|
| `/api/test/team/customer-id` | `POST` | Testing endpoint for Stripe customer ID lookup. Used for development/debugging. | Required | → `lib/db/queries.getTeamByStripeCustomerId()` | `{ customerId: string }` or error |

---

## Endpoint Relationships

### CFP Pipeline Flow

```
User creates business (POST /api/business)
    ↓
Auto-start processing (lib/services/business-processing.autoStartProcessing)
    ├── [C] Crawl (POST /api/crawl → Firecrawl API)
    │       ↓
    │   Extract data → OpenRouter API (1 LLM call)
    │       ↓
    │   Update business.status = 'crawled'
    │
    └── [F] Fingerprint (POST /api/fingerprint → OpenRouter API)
            ↓
        9 parallel LLM queries (3 models × 3 prompts)
            ↓
        Calculate visibility score
            ↓
        Store fingerprint → business.status = 'fingerprinted'
            ↓
[P] Publish (POST /api/wikidata/publish)
    ├── Build entity (lib/wikidata/entity-builder)
    ├── Resolve QIDs (Wikidata SPARQL)
    ├── Check notability (Google Custom Search API)
    ├── Validate entity (lib/validation/wikidata)
    └── Publish (Wikidata Action API)
        ↓
    Update business.status = 'published', store QID
```

### Data Flow Relationships

| Source Endpoint | Target Service/Library | External API | Result Stored In |
|-----------------|----------------------|--------------|------------------|
| `POST /api/crawl` | `lib/crawler/webCrawler.crawl()` | Firecrawl API → OpenRouter API | `business.crawlData`, `business.status` |
| `POST /api/fingerprint` | `lib/llm/fingerprinter.fingerprint()` | OpenRouter API (9 queries) | `llm_fingerprints` table |
| `POST /api/wikidata/publish` | `lib/wikidata/publisher.publishEntity()` | Wikidata Action API | `wikidata_entities` table, `business.wikidataQID` |
| `GET /api/wikidata/entity/[businessId]` | `lib/wikidata/sparql.resolveQID()` | Wikidata SPARQL | 4-tier cache (memory/DB/local/network) |
| `POST /api/wikidata/publish` | `lib/wikidata/notability-checker.checkNotability()` | Google Custom Search API | Entity references (P854) |

---

## CFP Pipeline Endpoint Flow

### Complete User Journey

1. **Business Creation**
   ```
   POST /api/business
   → Creates business
   → Triggers autoStartProcessing() (Pro tier)
   → Returns 201 with business ID
   ```

2. **Auto-Processing (Parallel)**
   ```
   [C] Crawl:
   → POST /api/crawl (auto-triggered)
   → Firecrawl API: Scrape website
   → OpenRouter API: Enhance extraction (1 LLM call)
   → Store crawlData, update status = 'crawled'
   
   [F] Fingerprint:
   → POST /api/fingerprint (auto-triggered)
   → OpenRouter API: 9 parallel queries
   → Calculate visibility score
   → Store fingerprint, update status = 'fingerprinted'
   ```

3. **Entity Preview (Lazy)**
   ```
   GET /api/wikidata/entity/[businessId]
   → Build entity (lib/wikidata/entity-builder)
   → Resolve QIDs (Wikidata SPARQL)
   → Check notability (Google Custom Search API)
   → Return entity JSON + notability assessment
   ```

4. **Publishing (Pro Tier)**
   ```
   POST /api/wikidata/publish
   → Verify notability (if not already checked)
   → Build entity (if not already built)
   → Publish to Wikidata Action API
   → Store QID, update status = 'published'
   ```

### Manual Triggers

| User Action | Endpoint | Purpose | When Used |
|-------------|----------|---------|-----------|
| **Re-crawl** | `POST /api/crawl` | Force new crawl (ignores cache) | User clicks "Re-crawl Website" |
| **Re-fingerprint** | `POST /api/fingerprint` | Run new fingerprint analysis | User clicks "Run Fingerprint" |
| **Update Entity** | `POST /api/wikidata/publish` | Update existing Wikidata entity | User clicks "Update Entity" |

---

## Authentication & Authorization

### Internal Routes

| Authentication Method | Routes | Implementation |
|----------------------|--------|----------------|
| **Session Cookie** | All `/api/*` routes except webhooks | `lib/db/queries.getUser()` → `lib/auth/session.verifyToken()` |
| **Webhook Secret** | `/api/stripe/webhook` | `STRIPE_WEBHOOK_SECRET` signature verification |
| **Cron Secret** | `/api/cron/*` | `CRON_SECRET` or Vercel Cron header (`x-vercel-cron`) |

### Authorization Checks

| Route | Authorization | Implementation |
|-------|--------------|----------------|
| Business routes | Team ownership | `business.teamId === team.id` |
| Publish routes | Pro/Agency tier | `lib/gemflush/permissions.canPublishToWikidata(team)` |
| Business limit | Tier-based limits | `lib/gemflush/permissions.canAddBusiness(count, team)` |
| Fingerprint frequency | Tier-based limits | `lib/services/business-processing.canRunFingerprint()` |

---

## Rate Limits & Quotas

### External APIs

| API | Rate Limit | Quota Management | Implementation |
|-----|-----------|------------------|----------------|
| **Firecrawl** | 10 req/min | Client-side: 7s delay between requests | `lib/crawler/index.ts` |
| **OpenRouter** | Model-specific | File-based cache (dev), cost optimization | `lib/llm/openrouter.ts` |
| **Wikidata Action API** | Bot policies | CSRF token caching (30min TTL) | `lib/wikidata/publisher.ts` |
| **Wikidata SPARQL** | Public (no auth) | 4-tier cache reduces queries by 95% | `lib/wikidata/sparql.ts` |
| **Google Custom Search** | 100 queries/day | Daily quota tracking, mock mode for tests | `lib/wikidata/notability-checker.ts` |
| **Stripe** | API limits | Idempotency keys, webhook deduplication | `lib/payments/stripe.ts` |
| **Resend** | 100 emails/day, 3k/month | Event-driven, no proactive limiting | `lib/email/resend.ts` |

### Internal Rate Limiting

| Feature | Limit | Implementation |
|---------|-------|----------------|
| **Crawl cache** | 24-hour TTL | `lib/services/business-processing.shouldCrawl()` |
| **Fingerprint frequency** | Free: monthly, Pro/Agency: weekly | `lib/services/business-processing.canRunFingerprint()` |
| **Idempotency** | 5-10 minute window | `lib/utils/idempotency.ts` |

---

## Error Handling Patterns

### Standard Error Responses

| Status Code | Meaning | Example Routes |
|-------------|---------|----------------|
| `400` | Validation error or bad request | All POST routes with Zod validation |
| `401` | Unauthorized (no session) | All protected routes |
| `403` | Forbidden (no permission) | Publish routes (Free tier), Business ownership |
| `404` | Resource not found | `/api/business/[id]`, `/api/fingerprint/[id]` |
| `422` | Business logic error | `/api/business` (needs location), `/api/wikidata/publish` (notability) |
| `500` | Internal server error | All routes (unhandled exceptions) |

### Idempotency & Retry Logic

| Route | Idempotency | Retry Logic |
|-------|-------------|-------------|
| `POST /api/business` | Duplicate URL detection, idempotency keys | N/A |
| `POST /api/crawl` | 5-minute recent crawl check, cache | 3 attempts with exponential backoff |
| `POST /api/fingerprint` | 10-minute recent fingerprint check | N/A (fail gracefully) |
| `POST /api/wikidata/publish` | Create/update detection (existing QID) | N/A (fail gracefully) |

---

## Future Adaptations

### Potential Endpoint Additions

| Endpoint | Purpose | Priority |
|----------|---------|----------|
| `GET /api/business/[id]/history` | Business status change history | Medium |
| `POST /api/fingerprint/batch` | Batch fingerprinting for multiple businesses | Low |
| `GET /api/analytics/visibility-trends` | Historical visibility score trends | Medium |
| `POST /api/wikidata/entity/[businessId]/enrich` | Progressive entity enrichment | High |
| `GET /api/competitors/[businessId]` | Competitive analysis endpoint | Medium |

### Migration Considerations

- **External API Changes:** All external endpoints abstracted behind service classes (`lib/crawler`, `lib/llm`, `lib/wikidata`)
- **Internal Route Changes:** Standard Next.js App Router patterns, easy to extend
- **Authentication:** Centralized in `lib/auth/session`, supports multiple auth methods
- **Rate Limiting:** Centralized in service classes, easy to adjust per API

---

## Quick Reference

### CFP Endpoints

| Phase | Endpoint | External API | Result |
|-------|----------|--------------|--------|
| **Crawl (C)** | `POST /api/crawl` | Firecrawl API → OpenRouter API | `crawlData` stored |
| **Fingerprint (F)** | `POST /api/fingerprint` | OpenRouter API (9 queries) | `FingerprintAnalysis` stored |
| **Publish (P)** | `POST /api/wikidata/publish` | Wikidata SPARQL → Google Search → Wikidata Action API | QID assigned |

### Key External APIs

| API | Purpose | Calls Per Business | Cached? |
|-----|---------|-------------------|---------|
| Firecrawl | Web crawling | 1 (with 24h cache) | Yes (24h TTL) |
| OpenRouter | Fingerprinting | 9 parallel | Yes (file-based dev) |
| OpenRouter | Crawl enhancement | 1 | No |
| Wikidata SPARQL | QID resolution | ~5-10 (with cache) | Yes (4-tier) |
| Google Search | Notability check | 1 per publish | No (100/day quota) |
| Wikidata Action | Publishing | 1 per publish | No (CSRF cached) |

---

**Document Version:** 1.0.0  
**Maintained By:** Development Team  
**Last Review:** December 2024

