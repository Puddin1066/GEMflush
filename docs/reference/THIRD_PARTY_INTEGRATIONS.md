# Third-Party Integrations Strategy

## Overview

GEMflush leverages a strategic suite of third-party services to deliver an enterprise-grade KGaaS (Knowledge Graph as a Service) platform. By offloading infrastructure complexity to specialized providers, the platform achieves high scalability, reduced maintenance overhead, and faster time-to-market.

---

## 1. Infrastructure & Operations

### Vercel (Platform as a Service)
*   **Role:** Hosting, Compute (Serverless Functions), and CI/CD.
*   **Key Feature:** **Zero-Config Serverless API Routes**. Each endpoint in `app/api/*` is automatically deployed as an independent lambda function.
*   **Purpose for Development:**
    *   **Scalability:** Automatically handles spikes in crawling or API requests without manual provisioning.
    *   **Edge Networking:** Delivers low-latency content globally.
    *   **Cron Jobs:** Powers the `/api/cron/*` endpoints for weekly visibility reports without needing a separate scheduler server.

### PostgreSQL (Neon / Supabase)
*   **Role:** Primary Relational Database.
*   **Key Feature:** **Serverless Postgres** with connection pooling.
*   **Purpose for Development:**
    *   **Data Integrity:** Strongly typed schemas (via Drizzle ORM) ensure valid business and graph data.
    *   **Performance:** Handles complex joins for dashboards (e.g., "Show me all businesses with visibility score > 80").
    *   **State Management:** Acts as the "Source of Truth" for async jobs (`crawl_jobs` table) and user subscriptions.

### Resend
*   **Role:** Transactional Email Service.
*   **Key Feature:** Developer-friendly API for React-based email templates.
*   **Purpose for Development:**
    *   **User Engagement:** Delivers "Magic Links" for passwordless auth.
    *   **Reporting:** Sends weekly "Visibility Reports" to Pro users, driving retention.
    *   **Notifications:** Alerts users when long-running tasks (like Wikidata publishing) complete.

---

## 2. Commercial Enablers

### Stripe
*   **Role:** Payments & Subscription Management.
*   **Key Feature:** **Checkout Sessions** & **Webhooks**.
*   **Purpose for Development:**
    *   **Monetization:** Handles the logic for upgrading from "Free Tier" (Mock) to "Pro Tier" (Real Publishing).
    *   **Access Control:** Webhooks automatically update the `teams.plan` field in the database, gating features like Wikidata Publishing.
    *   **Compliance:** Offloads PCI compliance and tax handling.

---

## 3. Intelligence & Knowledge Graph

### OpenRouter
*   **Role:** LLM Gateway (AI Intelligence).
*   **Key Feature:** **Unified API** for accessing multiple models (GPT-4, Claude 3.5 Sonnet, Gemini Pro).
*   **Purpose for Development:**
    *   **Fingerprinting:** Queries diverse models to calculate an unbiased "Visibility Score."
    *   **Cost Optimization:** Allows dynamic switching to cheaper models (e.g., Haiku) for simpler tasks like extracting business categories, while reserving GPT-4 for complex analysis.
    *   **Resilience:** If one provider (e.g., OpenAI) goes down, the system can fallback to another (e.g., Anthropic) without code changes.

### Wikidata Action API
*   **Role:** The Knowledge Graph (Write Access).
*   **Key Feature:** **OAuth-authenticated editing** (`wbeditentity`).
*   **Purpose for Development:**
    *   **Core Value Prop:** This is the "Service" in KGaaS. It enables the programmatic injection of verified business data into the public graph.
    *   **Sandboxing:** The platform supports toggling between `test.wikidata.org` (for development) and `www.wikidata.org` (for production), ensuring safe testing.

### Google Custom Search API
*   **Role:** Verification & Fact-Checking.
*   **Key Feature:** Programmatic web search.
*   **Purpose for Development:**
    *   **Notability Checks:** Before publishing, the system searches for independent sources (news, directories) to ensure the business meets Wikidata's notability guidelines.
    *   **Reference Discovery:** Automatically finds URLs to use as citations, improving the quality and acceptance rate of generated graph entities.

---

## Integration Map

| Provider | Service Layer | API Endpoint | Role |
| :--- | :--- | :--- | :--- |
| **Vercel** | *Infrastructure* | *All* | Hosting & Compute |
| **Postgres** | `lib/db` | *All* | Persistence |
| **Stripe** | `lib/payments` | `/api/stripe/*` | Revenue |
| **OpenRouter** | `lib/llm` | `/api/fingerprint` | AI Analysis |
| **Wikidata** | `lib/wikidata` | `/api/wikidata/publish` | Graph Publishing |
| **Google** | `lib/wikidata` | *(Internal Utility)* | Verification |
| **Resend** | `lib/email` | *(Event-driven)* | Communication |

## Future Utility & Development

1.  **Job Queues (Redis/BullMQ):** As crawling volume increases, Vercel's function timeouts (60s) will become a limit. Moving the `Crawl → Fingerprint` pipeline to a dedicated Redis queue (hosted on Upstash) is the next logical infrastructure step.
2.  **Graph Expansion:** The generic "Action API" support can be extended to other Wikibase instances (e.g., specialized industry graphs), allowing the platform to serve niche markets beyond general Wikidata.
3.  **Advanced LLM Routing:** The OpenRouter integration allows for "Model Cascading"—trying a cheap model first, and only escalating to GPT-4 if confidence is low, optimizing unit economics.

