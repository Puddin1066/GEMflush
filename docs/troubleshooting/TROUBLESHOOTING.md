# 🔧 Troubleshooting Guide

## Common Errors and Solutions

### ❌ Error: 500 Server Components Error

**Symptom:**
```
Uncaught Error: An error occurred in the Server Components render.
Status: 500
```

**Cause:**
Missing environment variables in Vercel, specifically:
- `DATABASE_URL` or `POSTGRES_URL` (database connection)
- `AUTH_SECRET` (authentication)

**Solution:**

1. **Set Environment Variables in Vercel:**
   - Go to: https://vercel.com/johns-projects-ebcf5697/saas-starter/settings/environment-variables
   - Add the following variables:

   #### Required Variables:
   
   ```bash
   # Database Connection (use one)
   DATABASE_URL=postgresql://user:password@host:port/database
   # OR
   POSTGRES_URL=postgresql://user:password@host:port/database
   
   # Authentication Secret
   AUTH_SECRET=your-random-secret-key-here
   ```
   
   #### Generate AUTH_SECRET:
   ```bash
   openssl rand -base64 32
   ```

2. **Select Environments:**
   - Check: Production, Preview, Development
   - Click "Save"

3. **Redeploy:**
   ```bash
   vercel --prod
   ```

4. **Verify:**
   - Check that the error page shows helpful instructions
   - If still seeing 500, check Vercel logs for specific error

---

### ❌ Error: Database Connection Failed

**Symptom:**
```
Error: DATABASE_URL or POSTGRES_URL environment variable is not set
```

**Solution:**

1. **Check Vercel Environment Variables:**
   - Ensure `DATABASE_URL` is set in Vercel
   - Verify the connection string is correct
   - Check that it's enabled for Production environment

2. **Test Database Connection:**
   ```bash
   # Test locally
   psql $DATABASE_URL
   
   # Or test connection
   node -e "const { db } = require('./lib/db/drizzle'); console.log('Connected!')"
   ```

3. **Verify Database is Running:**
   - Check your PostgreSQL provider (Vercel Postgres, Supabase, etc.)
   - Ensure database is accessible from Vercel's IP ranges
   - Check firewall rules if applicable

---

### ❌ Error: Authentication Failed

**Symptom:**
```
Error: AUTH_SECRET environment variable is not set
```

**Solution:**

1. **Generate AUTH_SECRET:**
   ```bash
   openssl rand -base64 32
   ```

2. **Set in Vercel:**
   - Go to Environment Variables
   - Add `AUTH_SECRET` with the generated value
   - Enable for all environments
   - Redeploy

3. **Verify:**
   - Check that sessions are being created
   - Test sign in/sign up flows

---

### ❌ Error: Build Failed

**Symptom:**
```
Error: Command "pnpm run vercel-build" exited with 1
```

**Possible Causes:**

1. **TypeScript Errors:**
   - Check build logs in Vercel dashboard
   - Fix any type errors locally first
   - Run `pnpm build` locally to test

2. **Missing Dependencies:**
   - Check `package.json` for all dependencies
   - Run `pnpm install` locally
   - Verify all imports are correct

3. **Environment Variables in Build:**
   - Some env vars are needed at build time
   - Check if any code runs during build that needs env vars
   - Move runtime-only code out of build-time execution

---

### ❌ Error: API Routes Returning 500

**Symptom:**
```
POST /api/fingerprint returned 500
GET /api/fingerprint/[id] returned 500
```

**Possible Causes:**

1. **Missing API Keys:**
   - `OPENROUTER_API_KEY` (for LLM fingerprinting)
   - `GOOGLE_SEARCH_API_KEY` (for notability checking)
   - `GOOGLE_SEARCH_ENGINE_ID` (for Google Custom Search)

2. **Database Connection:**
   - API routes need database access
   - Verify `DATABASE_URL` is set
   - Check database is accessible

3. **Authentication:**
   - API routes check authentication
   - Verify `AUTH_SECRET` is set
   - Check session cookies are working

**Solution:**

1. **Set All Required Environment Variables:**
   ```bash
   DATABASE_URL=...
   AUTH_SECRET=...
   OPENROUTER_API_KEY=sk-or-...
   GOOGLE_SEARCH_API_KEY=...
   GOOGLE_SEARCH_ENGINE_ID=...
   ```

2. **Check API Route Logs:**
   - Go to Vercel dashboard
   - Check function logs for specific errors
   - Look for stack traces

3. **Test Locally:**
   ```bash
   # Set env vars locally
   export DATABASE_URL=...
   export AUTH_SECRET=...
   
   # Test API route
   curl -X POST http://localhost:3000/api/fingerprint \
     -H "Content-Type: application/json" \
     -d '{"businessId": 1}'
   ```

---

## 🔍 Debugging Steps

### 1. Check Vercel Logs

```bash
# View runtime logs
vercel logs <deployment-url>

# View build logs
vercel inspect <deployment-url> --logs
```

### 2. Check Environment Variables

```bash
# List all env vars in Vercel
vercel env ls

# Pull env vars locally (for testing)
vercel env pull .env.local
```

### 3. Test Locally

```bash
# Set up local environment
cp .env.example .env.local
# Add your environment variables

# Run locally
pnpm dev

# Test the application
open http://localhost:3000
```

### 4. Check Database Connection

```bash
# Test database connection
psql $DATABASE_URL -c "SELECT 1"

# Or using Node.js
node -e "
  const { db } = require('./lib/db/drizzle');
  db.select().from(require('./lib/db/schema').users).limit(1)
    .then(() => console.log('✅ Database connected'))
    .catch(err => console.error('❌ Database error:', err))
"
```

---

## 📋 Environment Variables Checklist

### Required (Application Won't Work Without These)

- [ ] `DATABASE_URL` or `POSTGRES_URL` - Database connection string
- [ ] `AUTH_SECRET` - Authentication secret (generate with `openssl rand -base64 32`)

### Required for KGaaS Features

- [ ] `OPENROUTER_API_KEY` - For LLM fingerprinting
- [ ] `GOOGLE_SEARCH_API_KEY` - For notability checking
- [ ] `GOOGLE_SEARCH_ENGINE_ID` - For Google Custom Search

### Optional (For Payment Processing)

- [ ] `STRIPE_SECRET_KEY` - Stripe secret key
- [ ] `STRIPE_PUBLISHABLE_KEY` - Stripe publishable key
- [ ] `STRIPE_WEBHOOK_SECRET` - Stripe webhook secret

### Optional (For Wikidata Publishing)

- [ ] `WIKIDATA_USERNAME` - Wikidata username
- [ ] `WIKIDATA_PASSWORD` - Wikidata password

---

## 🚀 Quick Fix Checklist

If you're seeing a 500 error:

1. ✅ Check Vercel Environment Variables page
2. ✅ Verify `DATABASE_URL` is set
3. ✅ Verify `AUTH_SECRET` is set
4. ✅ Check that variables are enabled for Production
5. ✅ Redeploy after adding variables
6. ✅ Check Vercel logs for specific error
7. ✅ Verify database is accessible
8. ✅ Test authentication flow

---

## 📞 Getting Help

### Vercel Resources
- **Dashboard**: https://vercel.com/johns-projects-ebcf5697/saas-starter
- **Logs**: Available in deployment details
- **Environment Variables**: Settings → Environment Variables

### Documentation
- `DEPLOYMENT.md` - Deployment guide
- `IMPLEMENTATION_COMPLETE.md` - Implementation details
- `VERCEL_ENV_SETUP.md` - Environment variable setup

### Common Issues
- **500 Error**: Usually missing environment variables
- **Build Failed**: Check TypeScript errors and dependencies
- **API Errors**: Check API keys and database connection
- **Authentication Issues**: Verify AUTH_SECRET is set

---

## ✅ Verification

After fixing environment variables:

1. **Redeploy:**
   ```bash
   vercel --prod
   ```

2. **Check Error Page:**
   - If env vars are missing, you should see a helpful error page
   - Error page should link to Vercel settings
   - Error page should show which variables are missing

3. **Test Application:**
   - Sign up / Sign in should work
   - Dashboard should load
   - Businesses page should load
   - API routes should respond

4. **Check Logs:**
   - No 500 errors in Vercel logs
   - Database queries succeed
   - Authentication works
   - API routes return 200

---

**Last Updated**: November 11, 2025  
**Status**: ✅ Error handling implemented and tested

