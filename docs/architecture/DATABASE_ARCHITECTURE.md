# Database Architecture: How Vercel Frontend Connects to Supabase Database

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    USER'S BROWSER (Frontend)                    │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Next.js Client Components (React)                        │  │
│  │  • Dashboard UI                                           │  │
│  │  • Forms, Buttons, Interactive Elements                   │  │
│  │  • Makes HTTP requests to API routes                      │  │
│  └──────────────┬───────────────────────────────────────────┘  │
│                 │ fetch('/api/business')                        │
│                 │ fetch('/api/fingerprint')                     │
│                 │ POST /api/crawl                               │
└─────────────────┼───────────────────────────────────────────────┘
                  │
                  │ HTTPS Requests
                  │
┌─────────────────▼───────────────────────────────────────────────┐
│              VERCEL (Hosts Your Next.js App)                    │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Next.js Server-Side Code (Runs on Vercel)               │  │
│  │                                                            │  │
│  │  ┌────────────────────────────────────────────────────┐  │  │
│  │  │  API Routes (/app/api/*)                           │  │  │
│  │  │  • /api/business → getBusinessesByTeam()           │  │  │
│  │  │  • /api/fingerprint → getFingerprint()             │  │  │
│  │  │  • /api/crawl → crawlBusiness()                    │  │  │
│  │  └──────────────┬─────────────────────────────────────┘  │  │
│  │                 │                                         │  │
│  │  ┌──────────────▼─────────────────────────────────────┐  │  │
│  │  │  Database Layer (lib/db/drizzle.ts)                │  │  │
│  │  │  • Uses POSTGRES_URL from Vercel env vars          │  │  │
│  │  │  • Creates connection to Supabase                  │  │  │
│  │  │  • Executes SQL queries via Drizzle ORM            │  │  │
│  │  └──────────────┬─────────────────────────────────────┘  │  │
│  └─────────────────┼─────────────────────────────────────────┘  │
│                    │                                             │
│                    │ PostgreSQL Connection                       │
│                    │ (Uses POSTGRES_URL env variable)            │
└────────────────────┼─────────────────────────────────────────────┘
                     │
                     │ Secure Connection (SSL)
                     │
┌────────────────────▼─────────────────────────────────────────────┐
│              SUPABASE (Hosts Your PostgreSQL Database)           │
│                                                                   │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  PostgreSQL Database                                      │  │
│  │  • users table                                            │  │
│  │  • businesses table                                       │  │
│  │  • teams table                                            │  │
│  │  • fingerprints table                                     │  │
│  │  • wikidata_entities table                                │  │
│  │  • ... (all your tables)                                  │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                   │
│  Connection String:                                               │
│  postgresql://postgres.anzrhtachjvsrtulfntg:jayr%40und4SUPA@     │
│  aws-1-us-east-1.pooler.supabase.com:6543/postgres               │
└───────────────────────────────────────────────────────────────────┘
```

## 🔑 Key Points

### 1. **Database Location: Supabase**
- ✅ Your database is hosted on **Supabase** (not Vercel)
- ✅ Supabase provides a managed PostgreSQL database
- ✅ Connection string: `postgresql://postgres.anzrhtachjvsrtulfntg:...@aws-1-us-east-1.pooler.supabase.com:6543/postgres`
- ✅ The `pooler.supabase.com` indicates it's using Supabase's connection pooler

### 2. **How Vercel Accesses the Database**

#### Step 1: Environment Variable in Vercel
- `POSTGRES_URL` is set in Vercel's environment variables
- This variable is **encrypted** and **secure**
- Only server-side code can access it (never exposed to browser)

#### Step 2: Server-Side Code Reads the Variable
```typescript
// lib/db/drizzle.ts
const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
export const client = postgres(databaseUrl);
export const db = drizzle(client, { schema });
```

#### Step 3: API Routes Use the Database
```typescript
// app/api/business/route.ts
import { getBusinessesByTeam } from '@/lib/db/queries';

export async function GET(request: NextRequest) {
  const businesses = await getBusinessesByTeam(team.id);
  return NextResponse.json({ businesses });
}
```

#### Step 4: Frontend Calls API Routes
```typescript
// Frontend component
const response = await fetch('/api/business');
const data = await response.json();
```

### 3. **Security: Database Never Exposed to Browser**

✅ **Safe (Server-Side Only):**
- `POSTGRES_URL` environment variable (only on Vercel server)
- Database connection in `lib/db/drizzle.ts`
- API routes in `app/api/*`
- Server Components that query database directly

❌ **Never Exposed:**
- Database connection string is NEVER sent to browser
- Frontend components NEVER directly access database
- All database access goes through API routes or Server Components

### 4. **Data Flow Example: Loading Businesses**

```
1. User visits /dashboard
   ↓
2. Browser renders React component
   ↓
3. Component calls: fetch('/api/business')
   ↓
4. Request goes to Vercel server
   ↓
5. API route handler runs: GET /api/business
   ↓
6. API route calls: getBusinessesByTeam(teamId)
   ↓
7. Database query uses: db.select().from(businesses)...
   ↓
8. Connection uses: POSTGRES_URL from Vercel env
   ↓
9. Query executes on Supabase PostgreSQL
   ↓
10. Results returned to API route
   ↓
11. API route returns JSON: { businesses: [...] }
   ↓
12. Browser receives JSON and renders UI
```

## 📋 Environment Variables Setup

### In Your Local `.env` File:
```bash
POSTGRES_URL=postgresql://postgres.anzrhtachjvsrtulfntg:jayr%40und4SUPA@aws-1-us-east-1.pooler.supabase.com:6543/postgres
```

### In Vercel (Set via CLI or Dashboard):
```bash
# Set for all environments
vercel env add POSTGRES_URL production
vercel env add POSTGRES_URL preview
vercel env add POSTGRES_URL development
```

## 🔍 Verification

### Check if Database is Accessible from Vercel:

1. **Check Environment Variables:**
   ```bash
   vercel env ls
   # Should show POSTGRES_URL for all environments
   ```

2. **Test Database Connection:**
   - Visit your Vercel app: https://saas-starter-psi-six.vercel.app
   - Try logging in (uses database)
   - Try creating a business (writes to database)

3. **Check Vercel Logs:**
   - Go to Vercel Dashboard → Your Project → Logs
   - Look for database connection errors
   - Should see successful queries if working

## 🚨 Common Issues

### Issue 1: "Database connection failed"
**Cause:** `POSTGRES_URL` not set in Vercel
**Solution:** Set it via `vercel env add POSTGRES_URL production`

### Issue 2: "Connection timeout"
**Cause:** Supabase firewall blocking Vercel IPs
**Solution:** 
- Go to Supabase Dashboard → Settings → Database
- Enable "Allow connections from anywhere" (or add Vercel IP ranges)

### Issue 3: "Authentication failed"
**Cause:** Wrong password in connection string
**Solution:** Verify connection string in Supabase Dashboard

## 📊 Current Status

✅ **Database Hosted On:** Supabase  
✅ **Connection String:** Set in Vercel environment variables  
✅ **Migrations Applied:** Yes (via `pnpm drizzle-kit push`)  
✅ **Test Data Seeded:** Yes (test@test.com / admin123)  
✅ **Accessible from Vercel:** Yes (via API routes)  

## 🔐 Security Best Practices

1. ✅ **Never commit `.env` to git** (already in `.gitignore`)
2. ✅ **Use environment variables in Vercel** (encrypted at rest)
3. ✅ **Database credentials never exposed to browser**
4. ✅ **All database access through API routes** (server-side only)
5. ✅ **Use connection pooling** (Supabase pooler handles this)
6. ✅ **Enable SSL connections** (Supabase enforces SSL)

## 📚 Related Files

- **Database Connection:** `lib/db/drizzle.ts`
- **Database Schema:** `lib/db/schema.ts`
- **Database Queries:** `lib/db/queries.ts`
- **API Routes:** `app/api/*/route.ts`
- **Environment Setup:** `VERCEL_ENV_SETUP.md`

## 🎯 Summary

**Question:** Where is the database made accessible to the frontend hosted by Vercel?

**Answer:** 
- The database is **NOT directly accessible** to the frontend
- The frontend (browser) makes HTTP requests to **API routes** hosted on Vercel
- The API routes (server-side code on Vercel) use the `POSTGRES_URL` environment variable to connect to Supabase
- All database operations happen **server-side only** for security
- The browser only receives JSON responses from API routes, never direct database access

This is a **standard and secure architecture** for web applications! 🎉

