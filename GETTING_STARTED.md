# Getting Started with GEMflush

This guide will help you get the GEMflush platform running locally and prepare it for production deployment.

## Prerequisites

- Node.js 20+ installed
- PostgreSQL database
- pnpm package manager
- Stripe account (for payments)
- OpenRouter account (for LLM access - optional for development)

## Quick Start

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Environment Variables

Create a `.env.local` file in the root directory:

```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/gemflush

# NextAuth / Session
AUTH_SECRET=your_random_secret_here_use_openssl_rand_base64_32

# Stripe (get from Stripe dashboard)
STRIPE_SECRET_KEY=sk_test_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxx

# GEMflush Stripe Products (create these in Stripe)
STRIPE_PRO_PRICE_ID=price_xxxxx
STRIPE_AGENCY_PRICE_ID=price_xxxxx

# OpenRouter API (optional - mocked if not provided)
OPENROUTER_API_KEY=your_key_here

# Application
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Database Setup

Push the schema to your database:

```bash
pnpm db:push
```

Or run migrations:

```bash
pnpm db:migrate
```

### 4. Run Development Server

```bash
pnpm dev
```

Visit http://localhost:3000

## Development Mode Features

The application is set up with **mock APIs** for development, so you can test the entire flow without external API keys:

- ✅ Web crawler returns simulated business data
- ✅ LLM fingerprinting returns realistic mock responses
- ✅ Wikidata publishing returns mock QIDs
- ✅ All features work without API keys

## Testing the Application

### 1. Sign Up / Sign In

1. Navigate to http://localhost:3000/sign-up
2. Create an account
3. Sign in to access the dashboard

### 2. Add a Business

1. Click "Add Business" from the dashboard
2. Enter business details:
   - Name: "Test Business Inc"
   - URL: https://example.com
   - City, State, Country
3. Click "Create Business"

### 3. Crawl Website

1. On the business detail page, click "🕷️ Crawl Website"
2. Wait for the crawl to complete (simulated ~2-3 seconds)
3. Status will change to "crawled"

### 4. Publish to Wikidata (Pro Feature)

⚠️ **Note:** Free tier users will see an upgrade prompt

For testing with Pro features:
1. Upgrade to Pro plan (requires Stripe setup)
2. Click "📤 Publish to Wikidata"
3. Entity will be published to test.wikidata.org (mock QID returned)

### 5. Run Fingerprint

1. Click "🔍 Run Fingerprint"
2. Wait for analysis to complete (~5-10 seconds in mock mode)
3. View visibility score and LLM analysis

## Stripe Setup (Required for Subscriptions)

### 1. Create Stripe Products

In your Stripe dashboard:

1. Create a product called "Pro" with price $49/month
2. Create a product called "Agency" with price $149/month
3. Copy the price IDs to your `.env.local`

### 2. Configure Webhook

1. Install Stripe CLI: https://stripe.com/docs/stripe-cli
2. Listen for webhooks locally:
   ```bash
   stripe listen --forward-to localhost:3000/api/stripe/webhook
   ```
3. Copy the webhook secret to `.env.local`

## Enabling Real APIs

### OpenRouter (LLM Fingerprinting)

1. Sign up at https://openrouter.ai
2. Get your API key
3. Add to `.env.local`: `OPENROUTER_API_KEY=your_key`
4. In `lib/llm/openrouter.ts`, uncomment the production code
5. Comment out the mock response sections

### Wikidata Publishing

1. Create a Wikidata bot account: https://www.wikidata.org/wiki/Special:BotPasswords
2. Add credentials to `.env.local`
3. In `lib/wikidata/publisher.ts`, uncomment production code
4. **Start with test.wikidata.org for safety**

### Web Crawler

The crawler works out of the box but returns mock data. To crawl real websites:

1. In `lib/crawler/index.ts`, uncomment the fetch implementation
2. Add rate limiting and robots.txt compliance
3. Consider using a proxy service for production

## Production Deployment

### Vercel Deployment (Recommended)

1. Push code to GitHub
2. Import project in Vercel
3. Add environment variables in Vercel dashboard
4. Deploy!

### Database Migration

Run migrations in production:

```bash
pnpm db:migrate
```

### Environment Variables Checklist

Ensure all these are set in production:

- [x] `DATABASE_URL` - Production PostgreSQL
- [x] `AUTH_SECRET` - Strong random secret
- [x] `STRIPE_SECRET_KEY` - Production key
- [x] `STRIPE_WEBHOOK_SECRET` - Production webhook
- [x] `STRIPE_PRO_PRICE_ID` - Real price ID
- [x] `STRIPE_AGENCY_PRICE_ID` - Real price ID
- [x] `OPENROUTER_API_KEY` - Real API key
- [x] `NEXT_PUBLIC_APP_URL` - Your domain

## Monitoring & Maintenance

### Recommended Services

- **Error Tracking:** Sentry
- **Logging:** LogTail or Axiom
- **Uptime:** UptimeRobot
- **Analytics:** Vercel Analytics

### Database Backups

Set up automated backups for your PostgreSQL database:
- Daily snapshots
- Point-in-time recovery
- Test restore procedures

## Troubleshooting

### Database Connection Issues

```bash
# Test connection
psql $DATABASE_URL
```

### Stripe Webhook Issues

```bash
# Test webhook locally
stripe trigger payment_intent.succeeded
```

### Build Errors

```bash
# Clear cache and rebuild
rm -rf .next
pnpm build
```

## Architecture Overview

```
┌─────────────────────────────────────────────┐
│           User Interface (Next.js)          │
│  Dashboard │ Businesses │ Fingerprints      │
└─────────────────┬───────────────────────────┘
                  │
┌─────────────────▼───────────────────────────┐
│              API Routes                     │
│  /business │ /crawl │ /wikidata │ /llm     │
└─────────────────┬───────────────────────────┘
                  │
┌─────────────────▼───────────────────────────┐
│         Service Layer (lib/)                │
│  Crawler │ Wikidata │ LLM │ Permissions     │
└─────────────────┬───────────────────────────┘
                  │
┌─────────────────▼───────────────────────────┐
│      Database (PostgreSQL + Drizzle)        │
│  businesses │ entities │ fingerprints       │
└─────────────────────────────────────────────┘
```

## Next Steps

1. ✅ Test the application locally
2. ✅ Set up Stripe products
3. ✅ Configure real APIs (OpenRouter, Wikidata)
4. ✅ Deploy to Vercel
5. ✅ Set up monitoring
6. ✅ Test subscription flow
7. ✅ Launch! 🚀

## Support

- 📖 Main spec: `GEMFLUSH.md`
- 📝 Implementation details: `IMPLEMENTATION_SUMMARY.md`
- 🎨 Coding standards: `.cursorrule.md`

---

**Happy building! 🎉**

For questions or issues, refer to the implementation documentation.

