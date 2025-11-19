# API Endpoints, Services, and Integrations

## Executive Summary

This document details the technical architecture of GEMflush, specifically focusing on its API endpoints, core service logic, and external integrations. The platform is built as a **Next.js Serverless Monolith**, leveraging Vercel's infrastructure to deliver a production-ready Knowledge Graph as a Service (KGaaS) platform.

The architecture follows **SOLID** principles, with a strong emphasis on **Single Responsibility** (specialized services) and **DRY** (centralized logic in `lib/`).

---

## 1. API Endpoints (`app/api/`)

The application exposes a RESTful API layer that handles client requests and orchestrates backend services.

### Core Business Domain
| Endpoint | Method | Role | Key Services Invoked |
|----------|--------|------|----------------------|
| `/api/business` | `GET`, `POST` | **Business CRUD**: List businesses, create new business entities. | `BusinessProcessing`, `Crawler` |
| `/api/business/[id]` | `GET`, `PUT`, `DELETE` | **Entity Management**: Retrieve details, update metadata, soft-delete. | `db/queries` |

### Intelligence & Processing
| Endpoint | Method | Role | Key Services Invoked |
|----------|--------|------|----------------------|
| `/api/crawl` | `POST` | **Ingestion**: Triggers the web crawler for a specific business. | `WebCrawler`, `AutomationService` |
| `/api/fingerprint` | `POST` | **Analysis**: Runs LLM fingerprinting to calculate visibility scores. | `LLMFingerprinter`, `OpenRouter` |
| `/api/wikidata/publish` | `POST` | **Action**: Publishes the verified business entity to Wikidata. | `WikidataPublisher`, `EntityBuilder` |
| `/api/job/[jobId]` | `GET` | **Status**: Polls the status of long-running background jobs (crawls). | `db/queries` |

### Platform Infrastructure
| Endpoint | Method | Role | Key Services Invoked |
|----------|--------|------|----------------------|
| `/api/stripe/checkout` | `POST` | **Billing**: Creates Stripe Checkout sessions for upgrades. | `StripeService` |
| `/api/stripe/webhook` | `POST` | **Sync**: Handles async payment events (success/fail). | `StripeService`, `Permissions` |
| `/api/cron/*` | `GET` | **Scheduling**: Weekly/Monthly maintenance tasks (Vercel Cron). | `SchedulerService` |
| `/api/team` | `GET`, `PUT` | **Access**: Manages team settings and member roles. | `db/queries` |

---

## 2. Core Services (`lib/`)

The logic layer is organized into specialized modules to ensure maintainability and testability.

### Orchestration Layer
*   **Business Processing Service** (`lib/services/business-processing.ts`):
    *   **Role:** The "Conductor" of the platform.
    *   **Logic:** Manages the `Crawl → Fingerprint → Publish` pipeline.
    *   **Automation:** Handles the "auto-start" logic for Pro tier users, ensuring sequential execution of tasks.
    *   **Optimization:** Implements intelligent caching (skips crawl if recent) and parallel processing where safe.

### Domain Services
*   **Web Crawler** (`lib/crawler/index.ts`):
    *   **Role:** Data Ingestion.
    *   **Tech:** `Cheerio` for HTML parsing.
    *   **Logic:** Extracts JSON-LD structured data, metadata, and social links. Includes "smart retry" logic for flaky sites.
*   **LLM Fingerprinter** (`lib/llm/fingerprinter.ts`):
    *   **Role:** AI Visibility Analysis.
    *   **Tech:** `OpenRouter` API.
    *   **Logic:** Queries multiple models (GPT-4, Claude, etc.) to assess how well they know a business. Calculates a "Gem Quality" score.
*   **Notability Checker** (`lib/wikidata/notability-checker.ts`):
    *   **Role:** Verification & Compliance.
    *   **Tech:** `Google Custom Search API`.
    *   **Logic:** Verifies if a business meets Wikidata's "Notability" guidelines.
    *   **Feature:** Includes specific logic for "Local Businesses" (accepting directories/reviews as valid sources) and a robust Mock/Test mode for cost savings.

### Wikidata Services (`lib/wikidata/`)
*   **Entity Builder** (`entity-builder.ts`): Converts internal business data into Wikidata-compatible JSON (Claims/Statements).
*   **Publisher** (`publisher.ts`): Handles the OAuth handshake and writes to the Wikidata API (Test/Prod).
*   **SPARQL Service** (`sparql.ts`): Resolves human-readable names (e.g., "Software Industry") to Graph IDs ("Q12345") using a 4-tier hybrid cache.

---

## 3. Integrations & External Systems

The platform relies on a suite of best-in-class external providers to deliver "Enterprise-grade" capabilities without managing infrastructure.

### A. Intelligence & Data
*   **OpenRouter (LLM Gateway):**
    *   **Usage:** Unified interface to access GPT-4, Claude 3.5, and Llama 3.
    *   **Benefit:** Prevents vendor lock-in; allows easy swapping of models for cost/performance.
*   **Wikidata (The Knowledge Graph):**
    *   **Usage:** The destination for all published data.
    *   **Interaction:** Read via SPARQL (public endpoint), Write via MediaWiki API (OAuth authenticated).
*   **Google Custom Search:**
    *   **Usage:** "Fact-checking" and notability verification.
    *   **Implementation:** Rate-limited client with daily quotas to manage costs.

### B. Infrastructure & Operations
*   **PostgreSQL (Neon/Supabase):**
    *   **Usage:** Primary persistent storage.
    *   **Access:** Typed access via `Drizzle ORM`.
*   **Stripe:**
    *   **Usage:** Subscription management and payment processing.
    *   **Flow:** Hosted Checkout page -> Webhook -> Database update.
*   **Resend:**
    *   **Usage:** Transactional emails (Welcome, Magic Links, Reports).

### C. Integration Matrix

| Component | External Service | Integration Type | Sync/Async |
|-----------|------------------|------------------|------------|
| **Fingerprinter** | OpenRouter | REST API | Async (await) |
| **Publisher** | Wikidata | REST/OAuth | Sync |
| **Resolver** | Wikidata (SPARQL) | HTTP/GET | Sync (Cached) |
| **Crawler** | Target Website | HTTP/GET | Async |
| **Billing** | Stripe | SDK/Webhooks | Async |
| **Verification** | Google Search | REST API | Sync |

---

## 4. Commercial Readiness

The platform demonstrates "Production Readiness" through:

1.  **Resilience:**
    *   **Idempotency:** API routes (`POST /business`) implement idempotency keys to prevent duplicate operations.
    *   **Retries:** The Crawler service includes exponential backoff for failed requests.
    *   **Fallbacks:** The Notability Checker degrades gracefully if API limits are hit.

2.  **Optimization:**
    *   **Caching:** The SPARQL service uses a multi-level cache (Memory -> DB -> Network) to reduce latency by ~95%.
    *   **Background Processing:** Heavy tasks (crawling) are designed to run asynchronously, updating status flags (`pending` -> `processing` -> `completed`) to keep the UI responsive.

3.  **Security:**
    *   **Auth:** All sensitive routes are protected by session verification.
    *   **Validation:** `Zod` schemas validate all incoming data (API) and outgoing data (Wikidata).

