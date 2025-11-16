# Automation Deployment Guide

## Overview

This guide covers deploying the automated crawl and publication system to production.

## Prerequisites

- Vercel project configured
- Supabase/PostgreSQL database
- Environment variables set

## Deployment Steps

### 1. Database Migration

The automation fields have been added to the schema. Run the migration:

```bash
# Using Drizzle CLI
pnpm db:migrate

# Or manually via Supabase
# Connect to your database and run:
# lib/db/migrations/0005_add_automation_fields.sql
```

**Migration File:** `lib/db/migrations/0005_add_automation_fields.sql`

**Fields Added:**
- `automation_enabled` (boolean, default: false)
- `next_crawl_at` (timestamp, nullable)
- `last_auto_published_at` (timestamp, nullable)

**Index Created:**
- `idx_businesses_next_crawl` for efficient querying

### 2. Vercel Cron Configuration

The `vercel.json` file has been created with cron configuration:

```json
{
  "crons": [
    {
      "path": "/api/cron/weekly-crawls",
      "schedule": "0 2 * * 1"
    }
  ]
}
```

**Schedule:** Every Monday at 2:00 AM UTC

**To update schedule:**
- Edit `vercel.json`
- Or use Vercel Dashboard → Settings → Cron Jobs

### 3. Environment Variables

Ensure these environment variables are set in Vercel:

**Required:**
- `POSTGRES_URL` or `DATABASE_URL` - Database connection string
- `AUTH_SECRET` - Authentication secret

**Optional (for manual cron testing):**
- `CRON_SECRET` - Secret for manual cron endpoint calls (if not set, allows local testing)

**To set in Vercel:**
```bash
# Using Vercel CLI
vercel env add POSTGRES_URL
vercel env add AUTH_SECRET
vercel env add CRON_SECRET  # Optional
```

Or via Vercel Dashboard:
1. Go to Project Settings → Environment Variables
2. Add each variable for Production, Preview, and Development

### 4. Deploy to Vercel

```bash
# Deploy to production
vercel --prod

# Or push to main branch (if auto-deploy enabled)
git push origin main
```

### 5. Verify Cron Job

After deployment, verify the cron job is active:

**Via Vercel Dashboard:**
1. Go to Project → Settings → Cron Jobs
2. Verify `/api/cron/weekly-crawls` is listed
3. Check execution logs

**Via Vercel CLI:**
```bash
vercel cron ls
```

**Manual Test:**
```bash
# Test the endpoint manually (requires CRON_SECRET if set)
curl -H "Authorization: Bearer $CRON_SECRET" \
  https://your-app.vercel.app/api/cron/weekly-crawls
```

### 6. Monitor Automation

**Check Logs:**
```bash
# View Vercel logs
vercel logs --follow

# Filter for automation logs
vercel logs --follow | grep -E "\[AUTOMATION\]|\[SCHEDULER\]|\[CRON\]"
```

**Database Queries:**
```sql
-- Check businesses with automation enabled
SELECT id, name, automation_enabled, next_crawl_at, last_auto_published_at
FROM businesses
WHERE automation_enabled = true;

-- Check businesses due for crawl
SELECT id, name, next_crawl_at
FROM businesses
WHERE automation_enabled = true
  AND next_crawl_at <= NOW()
ORDER BY next_crawl_at;
```

## Post-Deployment Verification

### 1. Test Automation for New Business

1. Create a new business as a Pro/Agency user
2. Verify `automation_enabled` is set to `true`
3. Verify `next_crawl_at` is set (7 days from creation)
4. Wait for initial crawl to complete
5. Verify auto-publish triggers (if notability passes)

### 2. Test Weekly Cron

1. Manually trigger cron endpoint (if CRON_SECRET set)
2. Or wait for scheduled run (Monday 2 AM UTC)
3. Check logs for `[CRON] Weekly crawls processed`
4. Verify businesses with due `next_crawl_at` are processed

### 3. Verify Tier-Based Entity Richness

1. Publish a business as Pro tier → should get enhanced entity (11+ properties)
2. Publish a business as Agency tier → should get enhanced/complete entity (11-20+ properties)
3. Check published entity in Wikidata to verify property count

## Troubleshooting

### Cron Not Running

1. Check `vercel.json` is in project root
2. Verify cron path matches route: `/api/cron/weekly-crawls`
3. Check Vercel Dashboard → Cron Jobs for errors
4. Verify deployment succeeded

### Migration Failed

1. Check database connection: `POSTGRES_URL` or `DATABASE_URL`
2. Verify user has ALTER TABLE permissions
3. Run migration manually via Supabase SQL editor
4. Check for existing columns (migration uses `IF NOT EXISTS`)

### Automation Not Enabling

1. Check team `planName` is 'pro' or 'agency'
2. Verify `autoStartProcessing()` is called after business creation
3. Check logs for `[PROCESSING] Automation enabled`
4. Verify database migration was applied

### Auto-Publish Not Working

1. Check business status is 'crawled'
2. Verify notability check passes
3. Check logs for `[SCHEDULER] Auto-publish` messages
4. Verify team has `wikidataPublishing: true` in plan

## Rollback

If needed, rollback automation:

1. **Disable automation for all businesses:**
```sql
UPDATE businesses SET automation_enabled = false;
```

2. **Remove cron job:**
- Delete `vercel.json` or remove cron entry
- Redeploy

3. **Revert migration (if needed):**
```sql
ALTER TABLE businesses DROP COLUMN IF EXISTS automation_enabled;
ALTER TABLE businesses DROP COLUMN IF EXISTS next_crawl_at;
ALTER TABLE businesses DROP COLUMN IF EXISTS last_auto_published_at;
DROP INDEX IF EXISTS idx_businesses_next_crawl;
```

## Next Steps

After successful deployment:
1. Monitor first weekly cron execution
2. Verify automation is working for Pro/Agency users
3. Check entity richness matches tier expectations
4. Set up alerts for cron failures (Vercel Dashboard)

