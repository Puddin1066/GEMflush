# Debug Environment Configuration for TDD Development

**Date:** January 2025  
**Purpose:** Single `.env` file configuration for TDD development and debugging  
**Approach:** One `.env` file - use flags to control test behavior

---

## 🎯 Core Principle

**You only need ONE `.env` file.** Multiple `.env` files (`.env.local`, `.env.test`, etc.) are optional organizational tools. A single `.env` with debug flags works perfectly.

---

## ✅ Required Debug Environment Variables

Add these to your **existing `.env` file**:

```bash
# ============================================
# TDD DEVELOPMENT & DEBUG CONFIGURATION
# ============================================

# Environment Mode
# Options: development | test | production
NODE_ENV=development

# ============================================
# DEBUG FLAGS - Control API Usage in Tests
# ============================================

# Enable debug mode for ALL APIs (use real APIs when debugging)
# Set to 'true' to use real APIs, 'false' or unset to use mocks
DEBUG_APIS=false

# Individual API Debug Flags (override DEBUG_APIS)
DEBUG_OPENROUTER=false    # Use real OpenRouter API (when debugging)
DEBUG_FIRECRAWL=false     # Use real Firecrawl API (when debugging)

# NOTE: DEBUG_WIKIDATA is NOT used in codebase
# Use WIKIDATA_PUBLISH_MODE instead (see below)

# ============================================
# API MOCKING CONTROL
# ============================================

# Mock paid/external APIs (recommended for normal testing)
USE_MOCK_FIRECRAWL=true           # Mock Firecrawl (true = mock, false = real)
USE_MOCK_GOOGLE_SEARCH=true       # Mock Google Search (true = mock, false = real)

# Wikidata Publishing Mode (THIS is what controls Wikidata, not DEBUG_WIKIDATA)
# Options: mock | test | real
# - mock: Return mock QID instantly (fast, no API calls) - DEFAULT for testing
# - test: Use test.wikidata.org (real API, test environment) - USE THIS for debugging
# - real: Use production wikidata.org (real API, production) - Currently blocked
WIKIDATA_PUBLISH_MODE=mock

# Wikidata Test Environment URL (when WIKIDATA_PUBLISH_MODE=test)
WIKIDATA_API_URL=https://test.wikidata.org/w/api.php

# ============================================
# TEST DATABASE (Optional - for test isolation)
# ============================================

# Use separate test database (optional)
# If not set, uses DATABASE_URL for all tests
# TEST_POSTGRES_URL=postgresql://user:pass@host:port/test_db

# ============================================
# PLAYWRIGHT E2E TEST CONFIGURATION
# ============================================

# Skip starting Next.js server (if already running)
# SKIP_WEBSERVER=false

# Playwright test indicator (automatically set by Playwright)
# PLAYWRIGHT_TEST=true  # Don't set manually, Playwright sets this

# ============================================
# API KEYS FOR DEBUG MODE
# ============================================

# These are already in your .env, but here's what they're for:

# OPENROUTER_API_KEY - Only used when DEBUG_OPENROUTER=true
# (Current: Already set in your .env)

# FIRECRAWL_API_KEY - Only used when USE_MOCK_FIRECRAWL=false
# (Current: Commented out in your .env - that's fine for mocking)

# STRIPE_SECRET_KEY - Use test mode key (sk_test_...) for all development
# (Current: Already set correctly in your .env)
```

---

## 📋 Quick Reference: What Each Flag Does

| Flag | Default | When `true`/`set` | Purpose |
|------|---------|-------------------|---------|
| `DEBUG_APIS` | `false` | Uses real APIs | Debug all APIs at once |
| `DEBUG_OPENROUTER` | `false` | Uses real OpenRouter | Debug LLM API responses |
| `DEBUG_FIRECRAWL` | `false` | Uses real Firecrawl | Debug crawling |
| `USE_MOCK_FIRECRAWL` | `true` | Mocks Firecrawl | Avoid API costs in tests |
| `USE_MOCK_GOOGLE_SEARCH` | `true` | Mocks Google Search | Avoid API costs |
| `WIKIDATA_PUBLISH_MODE` | `mock` | Controls Wikidata mode | `mock`/`test`/`real` |
| | | **Note:** `DEBUG_WIKIDATA` doesn't exist - use `WIKIDATA_PUBLISH_MODE` instead | |
| `NODE_ENV` | `development` | Sets environment | `development`/`test`/`production` |

---

## 🎯 Usage Scenarios

### Normal TDD Development (Default)

```bash
# In your .env file - this is the default
DEBUG_APIS=false
USE_MOCK_FIRECRAWL=true
USE_MOCK_GOOGLE_SEARCH=true
WIKIDATA_PUBLISH_MODE=mock
NODE_ENV=development
```

**Result:**
- ✅ Real database
- ✅ Real internal APIs
- ✅ Mocked paid APIs (OpenRouter, Firecrawl)
- ✅ Fast tests

### Debug Mode - Use Real APIs

```bash
# Enable debug mode to use real APIs
DEBUG_APIS=true
# Or set individual flags:
DEBUG_OPENROUTER=true
DEBUG_FIRECRAWL=true
```

**Result:**
- ✅ Real database
- ✅ Real OpenRouter API (if key set)
- ✅ Real Firecrawl API (if key set)
- ⚠️ Slower tests, API costs

### Integration Testing with Test APIs

```bash
# Use test APIs (free, real APIs in test environment)
WIKIDATA_PUBLISH_MODE=test
USE_MOCK_FIRECRAWL=false  # If you want real crawling
```

**Result:**
- ✅ Real database
- ✅ Real test.wikidata.org (free test environment)
- ✅ Real crawling (if Firecrawl key set)

---

## 🔧 How It Works (Why One .env is Fine)

### The Flow:

1. **Your `.env` file** loads once when the app starts
2. **Environment variables** are read by:
   - Next.js (for app runtime)
   - Vitest (for unit/integration tests)
   - Playwright config (for E2E tests - it reads `.env`)
3. **Debug flags** control behavior dynamically
4. **No need for multiple files** - just set/unset flags

### Example:

```typescript
// In your test code
if (process.env.DEBUG_APIS === 'true') {
  // Use real API
  const result = await realOpenRouterAPI.call();
} else {
  // Use mock
  const result = mockOpenRouterResponse;
}
```

The same `.env` file works for all test types - you just control behavior with flags!

---

## 📝 Recommended .env Configuration

Here's what to add to your **existing `.env` file**:

```bash
# Add these sections to your existing .env

# ============================================
# TDD DEVELOPMENT & DEBUG FLAGS
# ============================================
NODE_ENV=development

# Debug API usage (set to 'true' when debugging, 'false' for normal testing)
DEBUG_APIS=false

# Individual API debug flags (optional - only if you need granular control)
DEBUG_OPENROUTER=false
DEBUG_FIRECRAWL=false
DEBUG_WIKIDATA=false

# API Mocking Control
USE_MOCK_FIRECRAWL=true
USE_MOCK_GOOGLE_SEARCH=true
WIKIDATA_PUBLISH_MODE=mock
WIKIDATA_API_URL=https://test.wikidata.org/w/api.php

# Optional: Separate test database (only if you want isolation)
# TEST_POSTGRES_URL=postgresql://...
```

---

## ✅ Your Current .env Status

Looking at your current `.env`, you already have most of what you need. You just need to add the debug flags section above.

**Already correctly configured:**
- ✅ `DATABASE_URL` - Database connection
- ✅ `STRIPE_SECRET_KEY` - Stripe test mode key
- ✅ `AUTH_SECRET` - Authentication secret
- ✅ `OPENROUTER_API_KEY` - LLM API key (used when debug mode enabled)
- ✅ `WIKIDATA_BOT_USERNAME` / `PASSWORD` - Wikidata credentials

**Needs to be added:**
- ⚠️ Debug flags section (shown above)
- ⚠️ Clean up duplicate/commented configs at bottom

---

## 🚀 Quick Setup

**Just copy and paste this into your `.env` file** (add to existing, don't replace):

```bash
# ============================================
# TDD DEVELOPMENT & DEBUG CONFIGURATION
# ============================================
NODE_ENV=development
DEBUG_APIS=false
USE_MOCK_FIRECRAWL=true
USE_MOCK_GOOGLE_SEARCH=true
WIKIDATA_PUBLISH_MODE=mock
WIKIDATA_API_URL=https://test.wikidata.org/w/api.php
```

That's it! One `.env` file, debug flags control everything.

---

## 💡 Why One .env Works

**Multiple `.env` files are optional** because:

1. **Next.js/Vitest/Playwright** all read from `.env`
2. **Flags control behavior** - don't need separate files
3. **Simpler** - one file to manage
4. **Same variables** - different contexts just check different flags

**Multiple files** (`.env.local`, `.env.test`) are useful if:
- Different teams need different configs
- You want strict separation of concerns
- You're using tools that auto-load different files

**For your TDD development, one `.env` with flags is perfect.**

---

## 📚 Related Documentation

- **API_CLI_TESTING_STRATEGY.md** - Complete API testing strategy
- **TDD_IMPLEMENTATION_PLAN.md** - TDD development plan

---

**Summary:** One `.env` file is fine. Just add the debug flags above and you're good to go!

