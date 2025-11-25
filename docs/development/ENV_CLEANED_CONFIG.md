# Cleaned .env Configuration for TDD Development

**Date:** January 2025  
**Purpose:** Cleaned, optimized .env configuration removing duplicates and conflicts

---

## 🚨 Critical Issues in Current .env

### Duplicate Variables (Last Value Wins):

1. **`NODE_ENV`** - Set twice:
   - Top: `NODE_ENV=development`
   - Bottom: `NODE_ENV=test` ← **This wins** (currently active)

2. **`OPENROUTER_API_KEY`** - Set twice:
   - Top: Has real API key
   - Bottom: Empty string ← **This wins** (currently active)

3. **`WIKIDATA_PUBLISH_MODE`** - Set twice:
   - Top: `mock`
   - Bottom: `test` ← **This wins** (currently active)

### Missing Variables:
- ❌ `DEBUG_APIS` - Not present
- ❌ `DEBUG_OPENROUTER` - Not present
- ❌ `DEBUG_FIRECRAWL` - Not present

---

## ✅ Cleaned .env Configuration

Copy this entire section and replace your current `.env` file:

```bash
# ============================================
# GEMflush SaaS Starter - Environment Configuration
# Optimized for TDD Development
# ============================================

# ============================================
# CORE DATABASE CONFIGURATION
# ============================================
DATABASE_URL=postgresql://postgres.anzrhtachjvsrtulfntg:jayr%40und4SUPA@aws-1-us-east-1.pooler.supabase.com:6543/postgres
POSTGRES_URL=postgresql://postgres.anzrhtachjvsrtulfntg:jayr%40und4SUPA@aws-1-us-east-1.pooler.supabase.com:6543/postgres

# ============================================
# AUTHENTICATION
# ============================================
AUTH_SECRET=0c79312a65a2adf67aa329ef8f5dba07aa6c5a668b06ce8806ba1ea4d09799fd

# ============================================
# BASE URL
# ============================================
BASE_URL=http://localhost:3000

# ============================================
# STRIPE CONFIGURATION (Test Mode)
# ============================================
STRIPE_SECRET_KEY=sk_test_51RAANsKVjsXNguSD8N3pxbUlRutlu5pVidpwzqPkXxCC5ruY2zh8ShHkUcQl1SwWMXIGgwSICQ0KfK2peyCMGnOd00V9HZDKCS
STRIPE_WEBHOOK_SECRET=whsec_691dd5d1dc1e2cacd237f2bca2f319d3713afb210062661713465c0a49e4901e
STRIPE_PRO_PRICE_ID=price_1SR398KVjsXNguSDhkKCPXTm
STRIPE_AGENCY_PRICE_ID=price_1SSn6rKVjsXNguSDCKy7hB6m

# ============================================
# EMAIL SERVICE (Resend)
# ============================================
RESEND_API_KEY=re_Rdbn5HKC_4LtE1NLyhoeuXcTDCkmiSH3R
EMAIL_FROM=GEMflush <noreply@gemflush.com>
SUPPORT_EMAIL=support@gemflush.com

# ============================================
# EXTERNAL API CREDENTIALS
# ============================================
# OpenRouter API (LLM calls) - Keep set for debug mode
OPENROUTER_API_KEY=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

# Google Search API
GOOGLE_SEARCH_API_KEY=AIzaSyBsEXNDk6n05faaJXbA6dq4oIMQ8Mzt190
GOOGLE_SEARCH_ENGINE_ID=a2b7c42f111c24594

# Wikidata Bot Credentials (for test.wikidata.org)
WIKIDATA_BOT_USERNAME=Puddin1066@kgaasbot
WIKIDATA_BOT_PASSWORD=0g435bt282nfk3fhq7rql3qvt0astl3h

# Firecrawl API (optional - comment out if mocking)
# FIRECRAWL_API_KEY=fc-065db20c372c4fb6913c34ba71257809

# ============================================
# TDD DEVELOPMENT & DEBUG CONFIGURATION
# ============================================
# Environment Mode: development | test | production
# Use 'development' for TDD - tests can override as needed
NODE_ENV=development

# Debug API Usage - Master flag for all APIs
# Set to 'true' to use real APIs for debugging
# Set to 'false' for normal testing (uses mocks)
DEBUG_APIS=false

# Individual API Debug Flags (granular control)
# Set to 'true' to use real API for that specific service
DEBUG_OPENROUTER=false
DEBUG_FIRECRAWL=false

# API Mocking Control (for normal testing)
# true = mock API (fast, no costs), false = use real API
USE_MOCK_FIRECRAWL=true
USE_MOCK_GOOGLE_SEARCH=true

# Wikidata Publishing Mode
# Options: mock | test | real
#   mock = Fast, returns fake QID (no API calls) - DEFAULT for TDD
#   test = Real API to test.wikidata.org - Use for debugging Wikidata publishing
#   real = Production wikidata.org (currently blocked by code, don't use)
WIKIDATA_PUBLISH_MODE=mock

# Wikidata Test Environment URL (used when WIKIDATA_PUBLISH_MODE=test)
WIKIDATA_API_URL=https://test.wikidata.org/w/api.php

# Wikidata Production Flag (keep false - production publishing is blocked)
WIKIDATA_ENABLE_PRODUCTION=false
```

---

## 📊 Changes Made

### Fixed:
- ✅ Removed duplicate `NODE_ENV` - now single `development`
- ✅ Removed duplicate `OPENROUTER_API_KEY` - now has real key
- ✅ Removed duplicate `WIKIDATA_PUBLISH_MODE` - now single `mock`
- ✅ Added missing `DEBUG_APIS` flag
- ✅ Added missing `DEBUG_OPENROUTER` flag
- ✅ Added missing `DEBUG_FIRECRAWL` flag
- ✅ Removed all commented-out duplicate lines
- ✅ Organized into logical sections

### Current Active Values (Before Clean):
- `NODE_ENV=test` ❌ (should be `development`)
- `OPENROUTER_API_KEY=` (empty) ❌ (should have key)
- `WIKIDATA_PUBLISH_MODE=test` ❌ (should be `mock` for TDD)

### After Clean:
- `NODE_ENV=development` ✅
- `OPENROUTER_API_KEY=sk-or-v1-...` ✅
- `WIKIDATA_PUBLISH_MODE=mock` ✅
- All debug flags present ✅

---

## ✅ Verification Checklist

After updating your `.env` file:

- [ ] No duplicate variables
- [ ] `NODE_ENV=development`
- [ ] `OPENROUTER_API_KEY` has actual key (not empty)
- [ ] `WIKIDATA_PUBLISH_MODE=mock`
- [ ] `DEBUG_APIS` present
- [ ] `DEBUG_OPENROUTER` present
- [ ] `DEBUG_FIRECRAWL` present
- [ ] All API credentials present
- [ ] Organized sections

---

## 🎯 TDD Configuration Summary

### For Normal TDD (Fast Testing):
```bash
NODE_ENV=development
DEBUG_APIS=false
WIKIDATA_PUBLISH_MODE=mock
USE_MOCK_FIRECRAWL=true
USE_MOCK_GOOGLE_SEARCH=true
```

### For Debugging Wikidata:
```bash
WIKIDATA_PUBLISH_MODE=test
```

### For Debugging LLM:
```bash
DEBUG_OPENROUTER=true
```

### For Debugging All APIs:
```bash
DEBUG_APIS=true
```

---

**Copy the cleaned configuration above and paste it into your `.env` file to fix all issues!**


