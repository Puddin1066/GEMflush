# Production Setup Guide

## Quick Start

### 1. Environment Variables

Set these in your deployment platform (Vercel, etc.):

```bash
# Required
DATABASE_URL=postgresql://...
AUTH_SECRET=<generate with: openssl rand -base64 32>
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
NEXT_PUBLIC_APP_URL=https://yourdomain.com

# Optional (for production features)
SENTRY_DSN=https://...@sentry.io/...
WIKIDATA_PUBLISH_MODE=production
WIKIDATA_BOT_USERNAME=YourBot@GEMflush
WIKIDATA_BOT_PASSWORD=xxxxx
```

### 2. Validate Environment Variables

The app will automatically validate all required environment variables at startup. If any are missing or invalid, the app will fail to start with a clear error message.

### 3. Production Wikidata Setup

1. Create a bot account: https://www.wikidata.org/wiki/Special:BotPasswords
2. Set `WIKIDATA_PUBLISH_MODE=production`
3. Set `WIKIDATA_BOT_USERNAME` and `WIKIDATA_BOT_PASSWORD`
4. Test with one entity before full deployment

### 4. Error Tracking (Sentry)

1. Create account at https://sentry.io
2. Create a new project (Next.js)
3. Copy the DSN
4. Set `SENTRY_DSN` environment variable
5. Install Sentry: `pnpm add @sentry/nextjs`
6. Run: `npx @sentry/wizard@latest -i nextjs`

### 5. Health Check

The app includes a health check endpoint at `/api/health` that:
- Checks database connectivity
- Returns 200 if healthy, 503 if unhealthy
- Can be used with uptime monitoring services

### 6. Rate Limiting

Basic in-memory rate limiting is enabled by default:
- General API: 100 requests/hour
- Authentication: 10 requests/hour
- Business creation: 5 requests/hour
- CFP processing: 3 requests/hour

For multi-instance deployments, upgrade to Redis-based rate limiting.

## Pre-Launch Checklist

- [ ] All environment variables set
- [ ] Environment validation passes
- [ ] Production Wikidata credentials configured (if using)
- [ ] Sentry DSN configured (optional but recommended)
- [ ] Health check endpoint responding
- [ ] E2E test passes: `pnpm test:e2e tests/e2e/production-readiness-complete-flow.spec.ts`
- [ ] Test production Wikidata publishing (one entity)

## Post-Launch

Monitor:
- Health check endpoint
- Sentry error dashboard
- Database performance
- API response times

Add when needed:
- Redis for rate limiting (if scaling)
- Database indexes (if queries slow)
- Caching (if traffic increases)
- Load testing (if scaling)


