# Services Purpose Clarification Table

**Issue:** `automation-service.ts` and `cfp-automation-service.ts` have confusing names that don't clearly indicate their distinct purposes.

---

## Services Comparison

| Aspect | `automation-service.ts` | `cfp-automation-service.ts` |
|--------|------------------------|----------------------------|
| **Primary Purpose** | **Configuration/Policy** | **Execution/Orchestration** |
| **What it does** | Defines "what should happen" | Actually "does the work" |
| **Type** | Pure functions (no side effects) | Orchestration (has side effects) |
| **Role** | Decision maker | Executor |
| **Analogy** | "Rules/Policy" | "Worker" |

---

## Detailed Purpose Breakdown

### `automation-service.ts` - Configuration/Policy Service

**Purpose:** Tier-based automation configuration and decision logic

**What it provides:**
- Configuration based on subscription tier (free/pro/agency)
- Decision functions: "Should we do X?"
- Helper functions: Calculate dates, get richness levels

**Functions:**

| Function | Purpose | Returns | Side Effects |
|----------|---------|---------|--------------|
| `getAutomationConfig(team)` | Get tier-based config | `AutomationConfig` | ❌ None |
| `shouldAutoCrawl(business, team)` | Decision: Should crawl? | `boolean` | ❌ None |
| `shouldAutoPublish(business, team)` | Decision: Should publish? | `boolean` | ❌ None |
| `calculateNextCrawlDate(frequency)` | Helper: Calculate date | `Date` | ❌ None |
| `getEntityRichnessForTier(tier)` | Helper: Get richness | `'basic'\|'enhanced'\|'complete'` | ❌ None |

**Characteristics:**
- ✅ Pure functions (no side effects)
- ✅ No database calls
- ✅ No API calls
- ✅ Just configuration and decisions

**Example Usage:**
```typescript
// Check configuration
const config = getAutomationConfig(team);
// config = { crawlFrequency: 'monthly', autoPublish: true, ... }

// Make decision
if (shouldAutoCrawl(business, team)) {
  // Proceed with crawl
}
```

---

### `cfp-automation-service.ts` - Execution/Orchestration Service

**Purpose:** Execute the complete CFP (Crawl → Fingerprint → Publish) flow

**What it provides:**
- Orchestration: Coordinates crawl, fingerprint, and publish
- Execution: Actually runs the CFP workflow
- State management: Updates business status, schedules next run

**Functions:**

| Function | Purpose | Returns | Side Effects |
|----------|---------|---------|--------------|
| `executeCFPAutomation(businessId, options)` | **Execute CFP flow** | `CFPExecutionResult` | ✅ Yes - Runs crawl/fingerprint/publish, updates DB |
| `shouldRunCFPAutomation(business, team)` | Decision wrapper | `boolean` | ❌ None (delegates to automation-service) |

**Characteristics:**
- ✅ Executes operations (has side effects)
- ✅ Calls other services (business-execution, scheduler-service-decision)
- ✅ Updates database (business status, next crawl date)
- ✅ Orchestrates complete workflow

**Example Usage:**
```typescript
// Execute CFP automation
const result = await executeCFPAutomation(businessId, {
  scheduleNext: true,
});

// result = { success: true, crawlSuccess: true, fingerprintSuccess: true, ... }
```

---

## Relationship

```
automation-service.ts (Configuration)
    ↓ provides config/decisions
cfp-automation-service.ts (Execution)
    ↓ uses decisions
    ↓ executes workflow
    ↓ orchestrates operations
```

**Flow:**
1. `cfp-automation-service` calls `automation-service.getAutomationConfig()` to get config
2. `cfp-automation-service` calls `automation-service.shouldAutoCrawl()` to check if should proceed
3. `cfp-automation-service` executes the workflow using `business-execution` services
4. `cfp-automation-service` updates database, schedules next run

---

## Overlap Analysis

### Overlapping Function: `shouldRunCFPAutomation()`

**Current Implementation:**
```typescript
// In cfp-automation-service.ts
export function shouldRunCFPAutomation(business: Business, team: Team | null): boolean {
  if (!team) return false;
  const config = getAutomationConfig(team);
  if (config.crawlFrequency === 'manual') return false;
  return shouldAutoCrawl(business, team); // <-- Just calls automation-service function
}
```

**Analysis:**
- ⚠️ **Thin wrapper** - Mostly just calls `shouldAutoCrawl()` from `automation-service`
- ⚠️ **Minor duplication** - Checks team null and manual frequency (already checked in `shouldAutoCrawl`)
- ✅ **Convenience function** - Provides CFP-specific naming

**Recommendation:** Keep it for now as a convenience wrapper, but it's essentially redundant. Could be removed if we enhance `shouldAutoCrawl()` to handle team null check.

---

## Clearer Names (Future Consideration)

If we were to rename for clarity:

| Current Name | Suggested Name | Reason |
|--------------|----------------|--------|
| `automation-service.ts` | `automation-config-service.ts` | Makes it clear it's configuration only |
| `cfp-automation-service.ts` | `cfp-execution-service.ts` | Makes it clear it's execution/orchestration |

**But:** Current names are acceptable once you understand the distinction.

---

## Summary Table

| Service | Purpose | Functions | Side Effects | Dependencies |
|---------|---------|-----------|--------------|--------------|
| **automation-service.ts** | **Configuration/Policy** | Config, decisions, helpers | ❌ None (pure) | None |
| **cfp-automation-service.ts** | **Execution/Orchestration** | Execute CFP workflow | ✅ Yes (executes) | automation-service, business-execution |

**Key Distinction:**
- `automation-service` = **"What should happen?"** (configuration/policy)
- `cfp-automation-service` = **"Actually doing it"** (execution/orchestration)

**No significant overlap** - they serve different purposes. The naming is just confusing at first glance.


