# Vercel Environment Variables for Browser Flow Testing & Debugging

## 🎯 Purpose

This document lists all environment variables needed in Vercel to enable **iterative browser flow testing and debugging** of your SaaS application.

## 📊 Priority Levels

- **🔴 CRITICAL** - Required for basic functionality (app won't work without these)
- **🟡 IMPORTANT** - Required for specific features to work
- **🟢 OPTIONAL** - Nice to have, but features will work with mocks/fallbacks

---

## 🔴 CRITICAL: Core Functionality

### 1. `POSTGRES_URL` ✅ (Already Set)
**Purpose:** Database connection  
**Used By:** All database operations, user auth, business management  
**Status:** ✅ Set in Vercel  
**Impact:** Without this, the app cannot connect to the database

```bash
POSTGRES_URL=postgresql://postgres.anzrhtachjvsrtulfntg:jayr%40und4SUPA@aws-1-us-east-1.pooler.supabase.com:6543/postgres
```

### 2. `AUTH_SECRET` ✅ (Already Set)
**Purpose:** JWT token signing for sessions  
**Used By:** Authentication middleware, login/signup flows  
**Status:** ✅ Set in Vercel  
**Impact:** Without this, users cannot log in or maintain sessions

```bash
AUTH_SECRET=0c79312a65a2adf67aa329ef8f5dba07aa6c5a668b06ce8806ba1ea4d09799fd
```

### 3. `BASE_URL` ❌ (NOT Set - **REQUIRED**)
**Purpose:** Base URL for redirects, email links, webhooks  
**Used By:** 
- Stripe checkout success/cancel URLs
- Stripe billing portal return URL
- Email templates (welcome, invitations)
- Webhook callbacks

**Impact:** 
- ❌ Payment flows will fail (redirects won't work)
- ❌ Email links will be broken
- ❌ Stripe webhooks may fail

**Set this:**
```bash
BASE_URL=https://saas-starter-psi-six.vercel.app
```

---

## 🟡 IMPORTANT: Payment & Subscription Flows

### 4. `STRIPE_SECRET_KEY` ❌ (NOT Set - **REQUIRED for Payments**)
**Purpose:** Stripe API authentication  
**Used By:**
- `/api/stripe/checkout` - Creating checkout sessions
- `/app/(dashboard)/pricing/page.tsx` - Fetching products/prices
- `lib/payments/stripe.ts` - All Stripe operations
- Customer portal sessions

**Impact:**
- ❌ Pricing page won't load (calls `getStripePrices()` and `getStripeProducts()`)
- ❌ Checkout flows will fail
- ❌ Subscription management won't work

**Set this:**
```bash
STRIPE_SECRET_KEY=sk_test_51RAANsKVjsXNguSD8N3pxbUlRutlu5pVidpwzqPkXxCC5ruY2zh8ShHkUcQl1SwWMXIGgwSICQ0KfK2peyCMGnOd00V9HZDKCS
```

### 5. `STRIPE_WEBHOOK_SECRET` ❌ (NOT Set - **REQUIRED for Webhooks**)
**Purpose:** Verify Stripe webhook signatures  
**Used By:**
- `/api/stripe/webhook/route.ts` - Webhook event handling
- Subscription status updates
- Payment event processing

**Impact:**
- ❌ Webhook events will be rejected (signature verification fails)
- ❌ Subscription status won't update automatically
- ❌ Payment events won't be processed

**Set this:**
```bash
STRIPE_WEBHOOK_SECRET=whsec_691dd5d1dc1e2cacd237f2bca2f319d3713afb210062661713465c0a49e4901e
```

**⚠️ Important:** After setting this, update your Stripe webhook endpoint URL:
- Go to: https://dashboard.stripe.com/webhooks
- Update endpoint to: `https://saas-starter-psi-six.vercel.app/api/stripe/webhook`

---

## 🟡 IMPORTANT: Advanced Features

### 6. `OPENROUTER_API_KEY` ❌ (NOT Set - **REQUIRED for LLM Fingerprinting**)
**Purpose:** Access to LLM APIs for fingerprinting  
**Used By:**
- `/api/fingerprint/route.ts` - LLM fingerprint analysis
- `lib/llm/fingerprinter.ts` - Testing business visibility in AI systems
- Business detail page - Fingerprint analysis feature

**Impact:**
- ❌ Fingerprint analysis won't work (will fail or return errors)
- ❌ "Analyze Visibility" button won't function
- ⚠️ May fall back to mocks if implemented

**Set this:**
```bash
OPENROUTER_API_KEY=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
```

### 7. `GOOGLE_SEARCH_API_KEY` ❌ (NOT Set - **REQUIRED for Notability Checking**)
**Purpose:** Google Custom Search API access  
**Used By:**
- `lib/wikidata/notability-checker.ts` - Checking business notability
- Wikidata publishing flows
- Business validation

**Impact:**
- ❌ Notability checking will fail
- ❌ Wikidata publishing may be blocked
- ⚠️ May fall back to mocks if implemented

**Set this:**
```bash
GOOGLE_SEARCH_API_KEY=AIzaSyBsEXNDk6n05faaJXbA6dq4oIMQ8Mzt190
```

### 8. `GOOGLE_SEARCH_ENGINE_ID` ❌ (NOT Set - **REQUIRED for Notability Checking**)
**Purpose:** Google Custom Search Engine ID  
**Used By:**
- `lib/wikidata/notability-checker.ts` - Custom search queries

**Impact:**
- ❌ Notability checking will fail
- ❌ Search queries won't work

**Set this:**
```bash
GOOGLE_SEARCH_ENGINE_ID=a2b7c42f111c24594
```

---

## 🟢 OPTIONAL: Email Features

### 9. `RESEND_API_KEY` ❌ (NOT Set - **OPTIONAL for Email**)
**Purpose:** Resend email service API key  
**Used By:**
- `lib/email/resend.ts` - Sending emails
- Welcome emails
- Team invitation emails
- Password reset emails (if implemented)

**Impact:**
- ⚠️ Email sending will fail
- ⚠️ Team invitations won't send emails
- ✅ App will still work, but emails won't be sent

**Set this:**
```bash
RESEND_API_KEY=re_Rdbn5HKC_4LtE1NLyhoeuXcTDCkmiSH3R
```

### 10. `EMAIL_FROM` ❌ (NOT Set - **OPTIONAL for Email**)
**Purpose:** Email sender address  
**Used By:**
- `lib/email/resend.ts` - Email sender
- All outgoing emails

**Impact:**
- ⚠️ Emails will use default sender
- ✅ App will still work

**Set this:**
```bash
EMAIL_FROM=GEMflush <noreply@gemflush.com>
```

### 11. `SUPPORT_EMAIL` ❌ (NOT Set - **OPTIONAL for Email**)
**Purpose:** Support email address  
**Used By:**
- Email templates
- Support contact forms (if implemented)

**Impact:**
- ⚠️ Support emails won't work
- ✅ App will still work

**Set this:**
```bash
SUPPORT_EMAIL=support@gemflush.com
```

---

## 🟢 OPTIONAL: Hardcoded Price IDs (If Used)

### 12. `STRIPE_PRO_PRICE_ID` ❌ (NOT Set - **OPTIONAL**)
**Purpose:** Hardcoded Pro plan price ID  
**Used By:**
- `lib/payments/gemflush-products.ts` - If hardcoded prices are used
- `lib/gemflush/plans.ts` - Plan configuration

**Impact:**
- ✅ Not required if pricing page fetches prices from Stripe dynamically
- ⚠️ May be needed if hardcoded price IDs are used somewhere

**Set this (if needed):**
```bash
STRIPE_PRO_PRICE_ID=price_xxxxx
```

### 13. `STRIPE_AGENCY_PRICE_ID` ❌ (NOT Set - **OPTIONAL**)
**Purpose:** Hardcoded Agency plan price ID  
**Used By:**
- `lib/payments/gemflush-products.ts` - If hardcoded prices are used
- `lib/gemflush/plans.ts` - Plan configuration

**Impact:**
- ✅ Not required if pricing page fetches prices from Stripe dynamically
- ⚠️ May be needed if hardcoded price IDs are used somewhere

**Set this (if needed):**
```bash
STRIPE_AGENCY_PRICE_ID=price_xxxxx
```

---

## 📋 Quick Setup Checklist

### ✅ Already Set (2/13)
- [x] `POSTGRES_URL`
- [x] `AUTH_SECRET`

### ❌ Required for Browser Testing (6/13)
- [ ] `BASE_URL` - **CRITICAL for redirects**
- [ ] `STRIPE_SECRET_KEY` - **REQUIRED for payments**
- [ ] `STRIPE_WEBHOOK_SECRET` - **REQUIRED for webhooks**
- [ ] `OPENROUTER_API_KEY` - **REQUIRED for fingerprinting**
- [ ] `GOOGLE_SEARCH_API_KEY` - **REQUIRED for notability**
- [ ] `GOOGLE_SEARCH_ENGINE_ID` - **REQUIRED for notability**

### ⚠️ Optional but Recommended (5/13)
- [ ] `RESEND_API_KEY` - For email features
- [ ] `EMAIL_FROM` - For email sender
- [ ] `SUPPORT_EMAIL` - For support emails
- [ ] `STRIPE_PRO_PRICE_ID` - If using hardcoded prices
- [ ] `STRIPE_AGENCY_PRICE_ID` - If using hardcoded prices

---

## 🚀 Quick Setup Commands

### Set All Required Variables via CLI:

```bash
# Critical for redirects and emails
echo "https://saas-starter-psi-six.vercel.app" | vercel env add BASE_URL production
echo "https://saas-starter-psi-six.vercel.app" | vercel env add BASE_URL preview
echo "https://saas-starter-psi-six.vercel.app" | vercel env add BASE_URL development

# Stripe (Required for payments)
echo "sk_test_51RAANsKVjsXNguSD8N3pxbUlRutlu5pVidpwzqPkXxCC5ruY2zh8ShHkUcQl1SwWMXIGgwSICQ0KfK2peyCMGnOd00V9HZDKCS" | vercel env add STRIPE_SECRET_KEY production
echo "whsec_691dd5d1dc1e2cacd237f2bca2f319d3713afb210062661713465c0a49e4901e" | vercel env add STRIPE_WEBHOOK_SECRET production

# LLM Fingerprinting
echo "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" | vercel env add OPENROUTER_API_KEY production

# Google Search (Notability)
echo "AIzaSyBsEXNDk6n05faaJXbA6dq4oIMQ8Mzt190" | vercel env add GOOGLE_SEARCH_API_KEY production
echo "a2b7c42f111c24594" | vercel env add GOOGLE_SEARCH_ENGINE_ID production

# Email (Optional)
echo "re_Rdbn5HKC_4LtE1NLyhoeuXcTDCkmiSH3R" | vercel env add RESEND_API_KEY production
echo "GEMflush <noreply@gemflush.com>" | vercel env add EMAIL_FROM production
echo "support@gemflush.com" | vercel env add SUPPORT_EMAIL production
```

### Repeat for Preview and Development:
```bash
# Add `preview` or `development` instead of `production` for each command above
```

---

## 🧪 Testing Flows by Feature

### ✅ Basic Auth Flow (Works Now)
**Required:** `POSTGRES_URL`, `AUTH_SECRET`  
**Status:** ✅ Ready to test
- Sign up
- Sign in
- Sign out
- Session management

### ❌ Payment Flow (Needs Setup)
**Required:** `BASE_URL`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`  
**Status:** ❌ Will fail without these
- View pricing page
- Create checkout session
- Complete payment
- Subscription management
- Billing portal

### ❌ Fingerprint Analysis (Needs Setup)
**Required:** `OPENROUTER_API_KEY`  
**Status:** ❌ Will fail without this
- Run fingerprint analysis
- View visibility scores
- Competitive benchmarking

### ❌ Wikidata Publishing (Needs Setup)
**Required:** `GOOGLE_SEARCH_API_KEY`, `GOOGLE_SEARCH_ENGINE_ID`  
**Status:** ❌ Will fail without these
- Check notability
- Publish to Wikidata
- Entity validation

### ⚠️ Email Features (Optional)
**Required:** `RESEND_API_KEY`, `EMAIL_FROM`, `SUPPORT_EMAIL`  
**Status:** ⚠️ Will fail silently without these
- Welcome emails
- Team invitations
- Password reset (if implemented)

---

## 🔍 How to Verify Variables Are Set

```bash
# List all environment variables
vercel env ls

# Check specific variable
vercel env ls | grep STRIPE_SECRET_KEY

# Verify in browser (after deployment)
# Visit: https://saas-starter-psi-six.vercel.app/pricing
# If pricing page loads, STRIPE_SECRET_KEY is working
```

---

## 🐛 Debugging Tips

### 1. Check Vercel Logs
```bash
# View deployment logs
vercel logs

# Or in dashboard:
# Vercel Dashboard → Your Project → Deployments → Click deployment → Logs
```

### 2. Test API Routes Directly
```bash
# Test authentication
curl https://saas-starter-psi-six.vercel.app/api/business

# Test Stripe (if set)
curl https://saas-starter-psi-six.vercel.app/api/stripe/checkout
```

### 3. Check Browser Console
- Open browser DevTools
- Check Console for errors
- Check Network tab for failed requests
- Look for 500 errors (missing env vars)

### 4. Common Error Messages

**"AUTH_SECRET environment variable is not set"**
→ Set `AUTH_SECRET` in Vercel

**"DATABASE_URL or POSTGRES_URL environment variable is not set"**
→ Set `POSTGRES_URL` in Vercel

**"Stripe API error"**
→ Set `STRIPE_SECRET_KEY` in Vercel

**"Redirect URL mismatch"**
→ Set `BASE_URL` in Vercel and ensure it matches your Vercel domain

**"Webhook signature verification failed"**
→ Set `STRIPE_WEBHOOK_SECRET` in Vercel and update Stripe webhook URL

---

## 📊 Summary

### Minimum for Basic Testing (2 variables) ✅
- `POSTGRES_URL` ✅
- `AUTH_SECRET` ✅

### Minimum for Full Browser Testing (8 variables)
- `POSTGRES_URL` ✅
- `AUTH_SECRET` ✅
- `BASE_URL` ❌
- `STRIPE_SECRET_KEY` ❌
- `STRIPE_WEBHOOK_SECRET` ❌
- `OPENROUTER_API_KEY` ❌
- `GOOGLE_SEARCH_API_KEY` ❌
- `GOOGLE_SEARCH_ENGINE_ID` ❌

### Recommended for Complete Testing (13 variables)
- All above +
- `RESEND_API_KEY` ❌
- `EMAIL_FROM` ❌
- `SUPPORT_EMAIL` ❌
- `STRIPE_PRO_PRICE_ID` ❌ (if needed)
- `STRIPE_AGENCY_PRICE_ID` ❌ (if needed)

---

## 🎯 Next Steps

1. **Set `BASE_URL`** - Critical for redirects
2. **Set Stripe variables** - Required for payment flows
3. **Set LLM/Search variables** - Required for advanced features
4. **Set email variables** - Optional but recommended
5. **Redeploy** - `vercel --prod`
6. **Test each flow** - Sign up, payments, fingerprinting, etc.

---

## 📚 Related Documentation

- `VERCEL_ENV_SETUP.md` - Original environment setup guide
- `DATABASE_ARCHITECTURE.md` - How database connects to Vercel
- `TROUBLESHOOTING.md` - Common issues and solutions

