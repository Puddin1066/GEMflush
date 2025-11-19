# GEMflush 💎 - Knowledge Graph as a Service

**GEMflush** (Generative Engine Marketing) is a production-ready SaaS platform that helps businesses establish their presence in AI-powered knowledge graphs and optimize visibility across Large Language Models (LLMs).

## 🎯 What is GEMflush?

GEMflush addresses the critical gap in modern digital marketing: **visibility in generative AI systems**. As users increasingly rely on ChatGPT, Claude, Perplexity, and other LLMs for recommendations, traditional SEO alone is insufficient. Businesses need:

- **Structured data presence** in knowledge bases like Wikidata
- **Visibility tracking** across multiple LLMs  
- **Competitive intelligence** about their AI-generated reputation

GEMflush automates both the technical complexity of Wikidata entity creation and the labor-intensive process of testing LLM responses.

## ✨ Core Features

- **💎 Gem-Inspired Design System** - Violet/purple brand identity with modern UI components
- **🕷️ Intelligent Web Crawling** - Automated data extraction from business websites (Firecrawl API)
- **🤖 AI Entity Fingerprinting** - Multi-LLM visibility analysis via OpenRouter API
- **📊 Wikidata Publishing** - Automated entity creation and publication to Wikidata (Wikidata Action API)
- **🔍 Notability Verification** - Automated compliance checking via Google Custom Search API
- **💳 Subscription Management** - Stripe integration for tiered access control
- **📧 Email Notifications** - Resend integration for transactional emails
- **📈 Competitive Benchmarking** - Category-based visibility comparisons

## 🏗️ Technical Stack

- **Framework**: [Next.js 14+](https://nextjs.org/) (App Router)
- **Database**: [PostgreSQL](https://www.postgresql.org/) via Neon/Supabase
- **ORM**: [Drizzle ORM](https://orm.drizzle.team/)
- **Payments**: [Stripe](https://stripe.com/)
- **Email**: [Resend](https://resend.com/)
- **Hosting**: [Vercel](https://vercel.com/) (Serverless Functions)
- **UI Library**: [shadcn/ui](https://ui.shadcn.com/)

## 🔌 Core API Integrations

GEMflush integrates with several third-party APIs to deliver its core functionality:

### 1. **Firecrawl API** (Web Crawling - C in CFP)
- **Purpose**: Extracts structured business data from websites
- **Endpoint**: `https://api.firecrawl.dev/v1/scrape`
- **Usage**: 
  - Primary method for crawling business websites
  - Extracts HTML and markdown content
  - Handles JavaScript-rendered sites and anti-bot protection
- **Fallbacks**: Playwright (dev) and static fetch (last resort)
- **Location**: `lib/crawler/index.ts`
- **Rate Limits**: 10 req/min (free tier), client-side rate limiting enforced

### 2. **OpenRouter API** (LLM Fingerprinting - F in CFP)
- **Purpose**: Multi-LLM visibility analysis and competitive benchmarking
- **Endpoint**: `https://openrouter.ai/api/v1/chat/completions`
- **Models Used**:
  - `openai/gpt-4-turbo` (OpenAI ChatGPT)
  - `anthropic/claude-3-opus` (Anthropic Claude)
  - `google/gemini-pro` (Google Gemini)
- **Usage**:
  - Queries 3 LLMs with 3 prompt types each (9 total queries in parallel)
  - Calculates visibility scores (0-100)
  - Generates competitive leaderboards
  - Estimates ~3-5s for full fingerprint analysis
- **Location**: `lib/llm/fingerprinter.ts`, `lib/llm/openrouter.ts`
- **Cost Optimization**: Model routing allows switching to cheaper models for simpler tasks

### 3. **Wikidata Action API** (Entity Publishing - P in CFP)
- **Purpose**: Publishes verified business entities to Wikidata knowledge graph
- **Endpoint**: 
  - Test: `https://test.wikidata.org/w/api.php`
  - Production: `https://www.wikidata.org/w/api.php`
- **Method**: OAuth-authenticated `wbeditentity` action
- **Usage**:
  - Creates new Wikidata entities with QIDs
  - Attaches claims (PIDs) with proper data types
  - Includes references (P854) for notability
  - Supports tiered entity richness (basic/enhanced/complete)
- **Location**: `lib/wikidata/publisher.ts`, `lib/wikidata/entity-builder.ts`
- **Auth**: Bot password authentication with CSRF token handling

### 4. **Wikidata SPARQL Endpoint** (QID Resolution)
- **Purpose**: Resolves human-readable names to Wikidata QIDs
- **Endpoint**: `https://query.wikidata.org/sparql`
- **Usage**:
  - Maps location names to QIDs (e.g., "San Francisco" → Q62)
  - Resolves industry categories to QIDs (e.g., "Software Company" → Q7397)
  - 4-tier hybrid cache: Memory → DB → Local Map → Live SPARQL
  - Reduces API calls by ~95% via caching
- **Location**: `lib/wikidata/sparql.ts`

### 5. **Google Custom Search API** (Notability Verification)
- **Purpose**: Validates business notability before Wikidata publishing
- **Endpoint**: `https://www.googleapis.com/customsearch/v1`
- **Usage**:
  - Searches for independent third-party sources
  - Verifies notability requirements for Wikidata
  - Finds reference URLs for entity claims
  - Includes mock mode for testing/development
- **Location**: `lib/wikidata/notability-checker.ts`
- **Rate Limits**: Daily quotas managed to control costs

### 6. **Stripe API** (Payments & Subscriptions)
- **Purpose**: Subscription management and payment processing
- **Endpoints**:
  - Checkout: `/api/stripe/checkout`
  - Webhooks: `/api/stripe/webhook`
- **Usage**:
  - Creates checkout sessions for upgrades
  - Handles subscription lifecycle events
  - Manages tier-based access control (Free/Pro/Agency)
- **Location**: `lib/payments/stripe.ts`

### 7. **Resend API** (Email Delivery)
- **Purpose**: Transactional email notifications
- **Endpoint**: `https://api.resend.com/emails`
- **Usage**:
  - Welcome emails for new users
  - Password reset emails
  - Subscription update notifications
  - Visibility report emails
- **Location**: `lib/email/resend.ts`, `lib/email/send.ts`
- **Templates**: React-based email templates in `lib/email/templates/`

## 🔄 CFP Core Logic: Crawl → Fingerprint → Publish

The platform's core workflow is the **CFP pipeline**: Crawl → Fingerprint → Publish.

### Architecture Overview

```
User Input (URL)
    ↓
[C] CRAWL (Firecrawl API)
    ├── Extract HTML/Markdown
    ├── Parse JSON-LD structured data
    ├── Extract metadata (title, description, social links)
    └── LLM-enhanced extraction (OpenRouter) → Structured Business Data
    ↓
[F] FINGERPRINT (OpenRouter API)
    ├── Query 3 LLMs (GPT-4, Claude, Gemini)
    ├── 3 prompt types per model (9 queries total)
    ├── Calculate visibility score (0-100)
    ├── Generate competitive benchmark
    └── Store fingerprint analysis → Visibility Metrics
    ↓
[P] PUBLISH (Wikidata Action API)
    ├── Build Wikidata entity (Entity Builder)
    ├── Resolve QIDs via SPARQL (location, industry)
    ├── Verify notability (Google Search API)
    ├── Validate entity schema
    └── Publish to Wikidata → QID assigned
```

### Detailed CFP Workflow

#### **Phase 1: Crawl (C)**
**Service**: `lib/crawler/index.ts`  
**API**: Firecrawl API  
**Duration**: ~2-5 seconds

1. **URL Input**: User provides business website URL
2. **Firecrawl Request**: 
   - Primary: Firecrawl API scrapes website (handles JS, anti-bot)
   - Fallback: Playwright for dev environments
   - Last Resort: Static fetch for simple sites
3. **Content Extraction**:
   - HTML parsing via Cheerio
   - JSON-LD structured data extraction
   - Meta tags extraction (OG, Twitter cards)
   - Social links extraction
4. **LLM Enhancement** (OpenRouter):
   - Single LLM call to extract business details
   - Industry classification
   - Service offerings identification
   - Location data refinement
5. **Output**: `CrawledData` object with structured business information

**Optimizations**:
- 24-hour cache TTL (prevents redundant crawls)
- Client-side rate limiting (7s between requests)
- Parallel execution with fingerprinting

#### **Phase 2: Fingerprint (F)**
**Service**: `lib/llm/fingerprinter.ts`  
**API**: OpenRouter API  
**Duration**: ~3-5 seconds

1. **Business Data**: Uses `business.name`, `business.url`, `business.category`, `business.location`
2. **Prompt Generation**: 
   - Factual: "What do you know about [Business Name] in [Location]?"
   - Recommendation: "Recommend a [category] in [Location]"
   - Competitive: "Compare [Business Name] to competitors in [Location]"
3. **Parallel Query Execution**:
   - 9 queries total (3 models × 3 prompts)
   - Executed in parallel via `Promise.all()`
   - Each model queries simultaneously
4. **Response Analysis**:
   - Parse LLM responses for business mentions
   - Calculate mention rate (% of queries that mention business)
   - Extract sentiment (positive/neutral/negative)
   - Identify competitive mentions
5. **Score Calculation**:
   - Visibility Score (0-100): Weighted combination of mention rate, sentiment, accuracy
   - Competitive Rank: Position in competitive leaderboard
   - Mention Count: Total mentions across all queries
6. **Output**: `FingerprintAnalysis` with visibility metrics

**Optimizations**:
- Frequency enforcement (Free: monthly, Pro/Agency: weekly)
- Parallel execution reduces total time from ~45s (sequential) to ~5s
- Independent of crawl (can run immediately on business creation)

#### **Phase 3: Publish (P)**
**Service**: `lib/wikidata/publisher.ts`, `lib/wikidata/entity-builder.ts`  
**API**: Wikidata Action API  
**Duration**: ~10-30 seconds

1. **Entity Building**:
   - Combine `business` data + `crawlData` (optional)
   - Map to Wikidata properties (PIDs):
     - `P31` (instance of): Business (Q4830453)
     - `P856` (official website): Business URL
     - `P625` (coordinate location): Latitude/longitude
     - `P159` (headquarters location): City QID
     - `P452` (industry): Industry QID
   - Attach references (P854) for notability
2. **QID Resolution** (SPARQL):
   - Resolve location names → QIDs (e.g., "San Francisco" → Q62)
   - Resolve industry categories → QIDs (e.g., "Restaurant" → Q11707)
   - Use 4-tier cache to minimize queries
3. **Notability Verification** (Google Search API):
   - Search for independent third-party sources
   - Verify business meets Wikidata notability guidelines
   - Find reference URLs for entity claims
4. **Entity Validation**:
   - Validate PIDs conform to Wikidata constraints
   - Ensure all required properties are present
   - Check reference quality
5. **Publishing**:
   - OAuth authentication with Wikidata
   - CSRF token acquisition
   - `wbeditentity` action to create entity
   - Receive QID (e.g., Q12345678)
6. **Post-Publishing**:
   - Store QID in database
   - Update business status to "published"
   - Trigger post-publish fingerprint to measure impact

**Optimizations**:
- Lazy entity building (only when needed)
- SPARQL caching reduces resolution time by 95%
- Tier-based entity richness (Free: N/A, Pro: Enhanced, Agency: Complete)

### Automation & Orchestration

**Service**: `lib/services/business-processing.ts`

The platform orchestrates the CFP workflow with intelligent automation:

1. **Auto-Start Processing** (Pro Tier):
   - On business creation, automatically starts Crawl + Fingerprint in parallel
   - After crawl completes, automatically triggers Publish (if notability passes)
   - Sequential: Crawl → Fingerprint → Publish

2. **Smart Caching**:
   - Crawl cache: 24-hour TTL (skip if recent crawl exists)
   - Fingerprint frequency: Respects plan limits (monthly/weekly)
   - SPARQL cache: 4-tier hybrid cache for QID resolution

3. **Background Processing**:
   - Crawl and fingerprint run asynchronously
   - Status updates (`pending` → `crawling` → `crawled` → `generating` → `published`)
   - UI remains responsive during processing

4. **Error Handling**:
   - Retry logic with exponential backoff (crawl: 3 attempts)
   - Graceful degradation (fingerprint failure doesn't block publish)
   - Detailed error logging and user notifications

## 📊 User Tiers & Features

### Free Tier: LLM Fingerprinter
- ✅ LLM Visibility Fingerprinting (1 business)
- ✅ Visibility scores and competitive benchmarking
- ✅ Monthly fingerprint frequency
- ❌ No Wikidata publishing

### Pro Tier ($49/month): Full CFP Pipeline
- ✅ All Free tier features
- ✅ Wikidata entity publishing
- ✅ Weekly automated crawl + fingerprint + publish
- ✅ Enhanced entity richness (11+ properties)
- ✅ 5 businesses max

### Agency Tier ($299/month): Scalable CFP
- ✅ All Pro tier features
- ✅ Unlimited businesses
- ✅ Complete entity richness (15-20+ properties)
- ✅ Progressive enrichment (entities improve over time)
- ✅ White-label potential

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and pnpm
- PostgreSQL database (Neon/Supabase recommended)
- Stripe account for payments
- API keys:
  - `FIRECRAWL_API_KEY` - Firecrawl API key
  - `OPENROUTER_API_KEY` - OpenRouter API key
  - `WIKIDATA_BOT_USERNAME` & `WIKIDATA_BOT_PASSWORD` - Wikidata bot credentials
  - `GOOGLE_CUSTOM_SEARCH_API_KEY` & `GOOGLE_CUSTOM_SEARCH_ENGINE_ID` - Google Search API
  - `RESEND_API_KEY` - Resend API key
  - `STRIPE_SECRET_KEY` & `STRIPE_WEBHOOK_SECRET` - Stripe keys

### Installation

```bash
# Clone the repository
git clone https://github.com/your-org/gemflush
cd gemflush

# Install dependencies
pnpm install

# Setup environment
pnpm db:setup

# Run migrations
pnpm db:migrate

# Seed database
pnpm db:seed

# Start development server
pnpm dev
```

### Default Test Account

- Email: `test@test.com`
- Password: `admin123`

### Environment Variables

Create a `.env.local` file with the following variables:

```env
# Database
POSTGRES_URL=postgresql://...

# Authentication
AUTH_SECRET=...

# APIs
FIRECRAWL_API_KEY=fc-...
OPENROUTER_API_KEY=sk-or-v1-...
WIKIDATA_BOT_USERNAME=...
WIKIDATA_BOT_PASSWORD=...
GOOGLE_CUSTOM_SEARCH_API_KEY=...
GOOGLE_CUSTOM_SEARCH_ENGINE_ID=...
RESEND_API_KEY=re_...

# Stripe
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...

# App
BASE_URL=http://localhost:3000
NODE_ENV=development
```

## 📚 Documentation

Our documentation is organized in the [`docs/`](./docs/) directory:

- **[Getting Started](docs/getting-started/START_HERE.md)** ⭐ - New to the project? Start here
- **[Product Documentation](docs/product/)** - Product specs, UX strategy, commercial analysis
- **[Architecture](docs/architecture/)** - System design, API endpoints, services
- **[Development Guides](docs/development/)** - Development roadmap, CFP optimization, strategies
- **[Feature Documentation](docs/features/)** - Deep dives (Wikidata, LLM, Crawler, Gem)
- **[Testing](docs/testing/)** - Testing guides and status
- **[Reference](docs/reference/)** - API integrations, KGaaS evaluation, technical reference
- **[Troubleshooting](docs/troubleshooting/)** - Common issues and solutions

See [docs/README.md](docs/README.md) for the complete documentation index.

## 🧪 Testing

### Run Tests

```bash
# Unit tests
pnpm test

# E2E tests (Playwright)
pnpm test:e2e

# All tests
pnpm test:all
```

### Test Payments

Use Stripe test cards:
- Card: `4242 4242 4242 4242`
- Expiration: Any future date
- CVC: Any 3-digit number

### Local Webhook Testing

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

## 🚢 Deployment

### Deploy to Vercel

1. Push code to GitHub repository
2. Connect repository to [Vercel](https://vercel.com/)
3. Add environment variables in Vercel dashboard
4. Deploy automatically on push

### Production Checklist

- [ ] Set `BASE_URL` to production domain
- [ ] Use production Stripe keys
- [ ] Configure production webhook in Stripe Dashboard
- [ ] Set production database URL
- [ ] Generate `AUTH_SECRET` with `openssl rand -base64 32`
- [ ] Update Wikidata credentials for production (test.wikidata.org → wikidata.org)
- [ ] Verify API rate limits are appropriate for production

## 🏗️ Project Structure

```
gemflush/
├── app/                    # Next.js App Router
│   ├── (dashboard)/       # Protected dashboard routes
│   ├── (login)/           # Authentication routes
│   └── api/               # API routes (CFP endpoints)
├── components/            # React components (Gem design system)
├── lib/                   # Core business logic
│   ├── crawler/          # Web crawling (C in CFP)
│   ├── llm/              # LLM fingerprinting (F in CFP)
│   ├── wikidata/         # Wikidata publishing (P in CFP)
│   ├── services/         # Business processing orchestration
│   ├── db/               # Database schema & queries
│   ├── payments/         # Stripe integration
│   └── email/            # Resend integration
├── tests/                # Test suites
│   ├── e2e/             # End-to-end tests
│   └── integration/     # Integration tests
└── docs/                # Documentation
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

See [LICENSE](LICENSE) file for details.

## 🔗 Links

- **Documentation**: [docs/README.md](docs/README.md)
- **Product Spec**: [docs/product/GEMFLUSH.md](docs/product/GEMFLUSH.md)
- **Architecture**: [docs/architecture/README.md](docs/architecture/README.md)
- **API Reference**: [docs/architecture/ENDPOINTS_AND_SERVICES.md](docs/architecture/ENDPOINTS_AND_SERVICES.md)
- **CFP Optimization**: [docs/development/FEATURES/CRAWL_OPTIMIZATION_PLAN.md](docs/development/FEATURES/CRAWL_OPTIMIZATION_PLAN.md)

---

**Built with 💎 by the GEMflush team**
