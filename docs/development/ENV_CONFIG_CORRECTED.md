# Corrected Environment Configuration

**Date:** January 2025  
**Issue:** `DEBUG_WIKIDATA` flag doesn't exist in codebase  
**Solution:** Use `WIKIDATA_PUBLISH_MODE` instead

---

## ✅ Corrected Debug Environment Variables

**Remove `DEBUG_WIKIDATA` - it doesn't exist in the codebase!**

Use `WIKIDATA_PUBLISH_MODE` instead:

```bash
# ============================================
# CORRECTED TDD DEBUG CONFIGURATION
# ============================================

NODE_ENV=development
DEBUG_APIS=false

# Individual API Debug Flags (these DO exist)
DEBUG_OPENROUTER=false
DEBUG_FIRECRAWL=false

# API Mocking Control
USE_MOCK_FIRECRAWL=true
USE_MOCK_GOOGLE_SEARCH=true

# Wikidata Publishing Mode - THIS is the real control
# Options: mock | test | real
#   mock = Fast, returns fake QID (no API calls) - DEFAULT for testing
#   test = Real API to test.wikidata.org - USE THIS for debugging
#   real = Production wikidata.org (currently blocked)
WIKIDATA_PUBLISH_MODE=mock

WIKIDATA_API_URL=https://test.wikidata.org/w/api.php
```

---

## 🎯 How Wikidata Debugging Actually Works

### Normal Testing (Fast, No API Calls)
```bash
WIKIDATA_PUBLISH_MODE=mock
```
**Result:** Returns fake QID instantly, no API calls

### Debugging Wikidata Publishing
```bash
WIKIDATA_PUBLISH_MODE=test
```
**Result:** Uses real test.wikidata.org API (safe, free test environment)

### Production (Currently Blocked)
```bash
WIKIDATA_PUBLISH_MODE=real
```
**Result:** Would use production wikidata.org, but code blocks this

---

## 📝 Summary

- ❌ **`DEBUG_WIKIDATA` doesn't exist** - ignore it
- ✅ **Use `WIKIDATA_PUBLISH_MODE`** to control Wikidata behavior
- ✅ **Set to `test`** when you want to debug Wikidata publishing
- ✅ **Set to `mock`** for normal fast testing

---

**The code checks:**
```typescript
// lib/wikidata/client.ts
if (process.env.WIKIDATA_PUBLISH_MODE === 'mock') {
  return mockResult; // Fast, no API
}
// Otherwise uses real API (test.wikidata.org or production)
```

