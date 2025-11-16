# Wikidata Publication Issues Analysis

## 🔍 Issues Identified

### 1. **Database Cache Save Errors** (Still occurring)
**Location:** Terminal logs lines 388, 398, 425

**Error:**
```
Database cache save error: [Error [PostgresError]: there is no unique or exclusion constraint matching the ON CONFLICT specification]
```

**Cause:** 
- Schema fix was applied but server hasn't been restarted
- Drizzle schema changes require server restart to take effect

**Fix:** Restart dev server to pick up schema changes

---

### 2. **Mock QID Generator Creates Confusion** ⚠️

**Location:** `lib/wikidata/publisher.ts` line 77-79

**Problem:**
- Mock QID generator creates random QIDs like `Q1019664`
- `Q1019664` happens to be a **real Wikidata entity** (Jenison, Michigan) - see https://www.wikidata.org/wiki/Q1019664
- This creates confusion: looks like it published successfully, but it's actually a mock
- User sees link to real entity that has nothing to do with their business

**Current Code:**
```typescript
private generateMockQID(production: boolean): string {
  const randomNum = Math.floor(Math.random() * 1000000) + 1000000;
  return `Q${randomNum}`;
}
```

**Issues:**
- Random QIDs can match real entities (Q1019664 = Jenison, Michigan)
- No clear indication it's a mock/test QID
- Confusing UX - user thinks it published but it didn't

**Fix Required:**
1. Use clearly fake QIDs (e.g., Q999999999 or Q_TEST_* prefix)
2. Add visual indicator in UI that it's a test/mock publication
3. Optionally: Use a specific range that's known to be unused

---

### 3. **Test vs Production URL Logic** ✅ (Working Correctly)

**Location:** `app/api/wikidata/publish/route.ts` lines 131-134

**Status:** Code is correct, but confusing because mock QIDs match real entities

**Current Behavior:**
- `publishToProduction: false` → `https://test.wikidata.org/wiki/Q1019664`
- `publishToProduction: true` → `https://www.wikidata.org/wiki/Q1019664`

**Why it's confusing:**
- Both URLs point to real entities when using mock QIDs
- User can't tell if it's a mock or real publication
- QID Q1019664 exists on both test.wikidata.org and wikidata.org

---

## ✅ Solutions

### Solution 1: Fix Mock QID Generator (DRY & SOLID)

**SOLID Principles:**
- Single Responsibility: Generate clearly fake QIDs
- Open/Closed: Easy to switch to real QIDs later

**DRY Principles:**
- Centralized mock QID generation
- Consistent fake QID format

**Implementation:**
```typescript
private generateMockQID(production: boolean): string {
  // Use clearly fake QIDs that won't match real entities
  // Test range: Q999000000 - Q999999999 (unlikely to be real)
  // Or use descriptive prefix: Q_TEST_MOCK_*
  
  if (production) {
    // For production mocks, use high range
    const randomNum = Math.floor(Math.random() * 999999) + 999000000;
    return `Q${randomNum}`;
  } else {
    // For test mocks, use clearly fake prefix
    const timestamp = Date.now();
    return `Q_TEST_MOCK_${timestamp}`;
  }
}
```

**Better Alternative:**
```typescript
private generateMockQID(production: boolean): string {
  // Use Q999999999 as base - clearly fake and unlikely to exist
  const mockBase = 999999999;
  const randomOffset = Math.floor(Math.random() * 1000);
  return `Q${mockBase - randomOffset}`; // Q999999000 - Q999999999
}
```

### Solution 2: Add Visual Indicators

- Show "TEST MODE" badge in UI for test publications
- Show "MOCK" badge when using mock publisher
- Differentiate test vs production URLs visually

---

## 📊 Summary

**Total Issues:** 2

1. ✅ **Database cache errors** - Fixed in schema, need server restart
2. ⚠️ **Mock QID confusion** - Needs fix (use clearly fake QIDs)

**Priority:**
- **HIGH** - Mock QID generator should use fake QIDs
- **MEDIUM** - Add visual indicators for test/mock mode
