# Setting Environment Variables in Vercel

## Quick Setup

### Option 1: Interactive Script (Recommended)

```bash
# Run the interactive setup script
pnpm tsx scripts/set-vercel-env-quick.ts
```

This script will:
- Prompt you for each required variable
- Set variables for Production, Preview, and Development
- Skip variables that are already set
- Guide you through optional variables

### Option 2: Manual CLI Commands

```bash
# Make sure you're logged in and linked
vercel login
vercel link

# Set required variables (will prompt for values)
vercel env add DATABASE_URL production
vercel env add DATABASE_URL preview
vercel env add DATABASE_URL development

vercel env add AUTH_SECRET production
vercel env add AUTH_SECRET preview
vercel env add AUTH_SECRET development

vercel env add STRIPE_SECRET_KEY production
vercel env add STRIPE_SECRET_KEY preview
vercel env add STRIPE_SECRET_KEY development

vercel env add STRIPE_WEBHOOK_SECRET production
vercel env add STRIPE_WEBHOOK_SECRET preview
vercel env add STRIPE_WEBHOOK_SECRET development

vercel env add NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY production
vercel env add NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY preview
vercel env add NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY development

vercel env add NEXT_PUBLIC_APP_URL production
vercel env add NEXT_PUBLIC_APP_URL preview
vercel env add NEXT_PUBLIC_APP_URL development
```

### Option 3: Vercel Dashboard

1. Go to: https://vercel.com/dashboard
2. Select your project
3. Click **Settings** → **Environment Variables**
4. Click **Add New**
5. Enter variable name and value
6. Select environments (Production, Preview, Development)
7. Click **Save**

## Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:port/db` |
| `AUTH_SECRET` | Authentication secret (32+ chars) | Generate with: `openssl rand -base64 32` |
| `STRIPE_SECRET_KEY` | Stripe secret key | `sk_test_...` or `sk_live_...` |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook secret | `whsec_...` |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key | `pk_test_...` or `pk_live_...` |
| `NEXT_PUBLIC_APP_URL` | Your app URL | `https://your-app.vercel.app` |

## Optional Variables

| Variable | Description | When to Set |
|----------|-------------|-------------|
| `SENTRY_DSN` | Sentry error tracking DSN | When using Sentry |
| `WIKIDATA_PUBLISH_MODE` | `mock`, `test`, or `production` | When publishing to Wikidata |
| `WIKIDATA_BOT_USERNAME` | Wikidata bot username | Required if `WIKIDATA_PUBLISH_MODE=production` |
| `WIKIDATA_BOT_PASSWORD` | Wikidata bot password | Required if `WIKIDATA_PUBLISH_MODE=production` |
| `OPENROUTER_API_KEY` | OpenRouter API key | When using real LLM features |
| `GOOGLE_SEARCH_API_KEY` | Google Custom Search API key | When using notability checking |
| `GOOGLE_SEARCH_ENGINE_ID` | Google Custom Search Engine ID | When using notability checking |
| `RESEND_API_KEY` | Resend API key | When sending emails |
| `EMAIL_FROM` | Email from address | When sending emails |
| `SUPPORT_EMAIL` | Support email address | When sending emails |

## Verification

### Check Variables Are Set

```bash
# List all environment variables
vercel env ls

# Check specific variable
vercel env ls | grep DATABASE_URL
```

### Test Environment Validation

After setting variables, the app will automatically validate them at startup. Check deployment logs:

```bash
# View latest deployment logs
vercel logs --follow
```

If validation fails, you'll see a clear error message listing missing or invalid variables.

### Test Health Check

```bash
# After deployment, test health check
curl https://your-app.vercel.app/api/health
```

Should return:
```json
{
  "status": "healthy",
  "timestamp": "2025-01-XX...",
  "checks": {
    "database": {
      "status": "healthy",
      "latency": 45
    }
  }
}
```

## Troubleshooting

### "Environment variable validation failed"

- Check that all required variables are set
- Verify variable names match exactly (case-sensitive)
- Ensure variables are set for the correct environment (Production/Preview/Development)

### "Can't connect to database"

- Verify `DATABASE_URL` is correct
- Check database allows connections from Vercel IPs
- Test connection locally: `psql $DATABASE_URL`

### Variables Not Appearing

- Redeploy after setting variables: `vercel --prod`
- Variables are environment-specific (Production vs Preview)
- Check you're viewing the correct environment in Vercel dashboard

## Security Notes

- Never commit `.env` files to git
- Use different keys for staging vs production
- Rotate secrets regularly (every 90 days)
- Review Vercel access logs periodically


