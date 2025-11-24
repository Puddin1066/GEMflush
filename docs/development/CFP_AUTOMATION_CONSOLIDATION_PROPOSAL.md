# CFP Automation Consolidation Proposal

**Date:** 2025-01-XX  
**Problem:** CFP orchestration logic is duplicated across 3+ services, violating DRY and SOLID principles  
**Solution:** Consolidate into a single `cfp-automation-service.ts` that handles all CFP automation

---

## Problem Analysis

### Current Duplication

The CFP (Crawl → Fingerprint → Publish) flow is orchestrated in **3 different places**:

1. **`business-execution.ts` → `executeParallelProcessing()`**
   ```typescript
   // Lines 323-609
   - Crawl + Fingerprint (parallel)
   - Auto-publish if enabled
   - Works with businessId (database records)
   ```

2. **`scheduler-service-execution.ts` → `processBusinessAutomation()`**
   ```typescript
   // Lines 58-138
   - Crawl + Fingerprint (parallel)
   - Auto-publish if enabled
   - Works with businessId (database records)
   - Schedules next processing
   ```

3. **`cfp-orchestrator.ts` → `executeCFPFlow()`**
   ```typescript
   // Lines 94-448
   - Crawl → Fingerprint (sequential)
   - Entity creation → Publish
   - Works with URL (no database records)
   - Returns JSON entity
   ```

### DRY Violations

- **Same orchestration pattern** repeated 3 times
- **Same error handling** logic duplicated
- **Same progress tracking** implemented differently
- **Same publish decision logic** scattered

### SOLID Violations

- **Single Responsibility Principle:** Multiple services orchestrating CFP
- **Don't Repeat Yourself:** Same logic in 3 places
- **Open/Closed Principle:** Changes to CFP flow require updates in 3 places

---

## Proposed Solution: Single CFP Automation Service

### Architecture

```
lib/services/
├── automation-service.ts           # Configuration (keep)
├── cfp-automation-service.ts       # NEW: Single CFP orchestration service
├── business-execution.ts           # REFACTORED: Only execution functions (no orchestration)
├── scheduler-service-execution.ts  # REFACTORED: Only scheduling/batching (calls CFP service)
└── [DEPRECATED]
    ├── business-processing.ts      # Delete
    └── cfp-orchestrator.ts         # Refactor into cfp-automation-service or delete
```

### Single Service: `cfp-automation-service.ts`

```typescript
/**
 * CFP Automation Service
 * 
 * PRIMARY VALUE: Automated sequential CFP (Crawl → Fingerprint → Publish) execution
 * 
 * This is the SINGLE source of truth for CFP automation orchestration.
 * All other services delegate to this service.
 */

import 'server-only';
import { getBusinessById, getTeamForBusiness, updateBusiness } from '@/lib/db/queries';
import { executeCrawlJob, executeFingerprint } from './business-execution';
import { handleAutoPublish } from './scheduler-service-decision';
import { getAutomationConfig, shouldAutoCrawl, calculateNextCrawlDate } from './automation-service';
import { Business, Team } from '@/lib/db/schema';
import { loggers } from '@/lib/utils/logger';

const log = loggers.processing;

export interface CFPExecutionOptions {
  /** Whether to auto-publish after crawl completes (default: based on team config) */
  autoPublish?: boolean;
  /** Whether to update next scheduled processing date (default: false for on-demand) */
  scheduleNext?: boolean;
  /** Whether to update business status during processing (default: true) */
  updateStatus?: boolean;
}

export interface CFPExecutionResult {
  success: boolean;
  businessId: number;
  crawlSuccess: boolean;
  fingerprintSuccess: boolean;
  publishSuccess: boolean;
  error?: string;
  duration: number;
}

/**
 * Execute complete CFP automation for a business
 * 
 * This is the PRIMARY CFP automation flow:
 * 1. Crawl + Fingerprint (parallel)
 * 2. Auto-publish (if enabled)
 * 3. Schedule next processing (if scheduled)
 * 
 * @param businessId - Business ID to process
 * @param options - Execution options
 */
export async function executeCFPAutomation(
  businessId: number,
  options: CFPExecutionOptions = {}
): Promise<CFPExecutionResult> {
  const startTime = Date.now();
  const operationId = log.start('CFP Automation', { businessId });

  try {
    // Get business and team
    const business = await getBusinessById(businessId);
    if (!business) {
      throw new Error(`Business not found: ${businessId}`);
    }

    const team = await getTeamForBusiness(businessId);
    if (!team) {
      throw new Error(`Team not found for business: ${businessId}`);
    }

    // Determine auto-publish (use option or team config)
    const config = getAutomationConfig(team);
    const shouldPublish = options.autoPublish ?? config.autoPublish;

    // Update status to 'crawling' if enabled
    if (options.updateStatus !== false) {
      if (business.status === 'pending' || business.status === 'error') {
        await updateBusiness(businessId, { status: 'crawling' });
      }
    }

    log.info('Starting CFP automation', {
      operationId,
      businessId,
      businessName: business.name,
      planName: team.planName,
      autoPublish: shouldPublish,
      scheduleNext: options.scheduleNext,
    });

    // STEP 1: Execute Crawl + Fingerprint in parallel
    const [crawlResult, fingerprintResult] = await Promise.allSettled([
      executeCrawlJob(null, businessId, business),
      executeFingerprint(business, false), // Status updated later
    ]);

    const crawlSuccess = crawlResult.status === 'fulfilled' && crawlResult.value.success;
    const fingerprintSuccess = fingerprintResult.status === 'fulfilled' && fingerprintResult.value.success;

    log.info('CFP automation step 1 completed', {
      operationId,
      businessId,
      crawlSuccess,
      fingerprintSuccess,
    });

    // STEP 2: Update final status
    if (options.updateStatus !== false) {
      if (crawlSuccess && fingerprintSuccess) {
        await updateBusiness(businessId, { status: 'crawled' });
      } else if (!crawlSuccess && !fingerprintSuccess) {
        await updateBusiness(businessId, { status: 'error' });
      }
      // Partial success: keep 'crawling' status for retry
    }

    // STEP 3: Auto-publish if enabled and crawl succeeded
    let publishSuccess = false;
    if (crawlSuccess && shouldPublish) {
      try {
        await handleAutoPublish(businessId);
        publishSuccess = true;
        log.info('Auto-publish completed', { operationId, businessId });
      } catch (error) {
        log.error('Auto-publish failed', error, { operationId, businessId });
        // Don't fail entire CFP if publish fails
      }
    }

    // STEP 4: Schedule next processing if enabled
    if (options.scheduleNext && crawlSuccess) {
      const nextDate = calculateNextCrawlDate(config.crawlFrequency);
      await updateBusiness(businessId, {
        nextCrawlAt: nextDate,
      });
      log.info('Next processing scheduled', {
        operationId,
        businessId,
        nextCrawlAt: nextDate.toISOString(),
        frequency: config.crawlFrequency,
      });
    }

    const duration = Date.now() - startTime;
    const success = crawlSuccess && fingerprintSuccess;

    log.complete(operationId, 'CFP Automation', {
      businessId,
      success,
      crawlSuccess,
      fingerprintSuccess,
      publishSuccess,
      duration,
    });

    return {
      success,
      businessId,
      crawlSuccess,
      fingerprintSuccess,
      publishSuccess,
      duration,
    };

  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);

    log.error('CFP automation failed', error, { operationId, businessId, duration });
    log.complete(operationId, 'CFP Automation', { success: false, error: errorMessage, duration });

    return {
      success: false,
      businessId,
      crawlSuccess: false,
      fingerprintSuccess: false,
      publishSuccess: false,
      error: errorMessage,
      duration,
    };
  }
}

/**
 * Check if business should run CFP automation
 * 
 * @param business - Business to check
 * @param team - Team for automation config
 */
export function shouldRunCFPAutomation(business: Business, team: Team | null): boolean {
  if (!team) return false;
  
  const config = getAutomationConfig(team);
  if (config.crawlFrequency === 'manual') return false;
  
  return shouldAutoCrawl(business, team);
}
```

---

## Refactoring Plan

### Phase 1: Create New CFP Automation Service

1. ✅ Create `lib/services/cfp-automation-service.ts`
2. ✅ Implement `executeCFPAutomation()` - single source of truth
3. ✅ Move orchestration logic from `business-execution.ts`
4. ✅ Move orchestration logic from `scheduler-service-execution.ts`

### Phase 2: Refactor Existing Services

#### `business-execution.ts` - Keep Only Execution Functions

**Remove:**
- ❌ `executeParallelProcessing()` - move to CFP service
- ❌ `autoStartProcessing()` - replace with CFP service call

**Keep:**
- ✅ `executeCrawlJob()` - pure execution
- ✅ `executeFingerprint()` - pure execution

**New structure:**
```typescript
// business-execution.ts (execution only, no orchestration)
export async function executeCrawlJob(...) { /* execution only */ }
export async function executeFingerprint(...) { /* execution only */ }

// Simple wrapper for backward compatibility
export async function autoStartProcessing(businessId: number) {
  const { executeCFPAutomation } = await import('./cfp-automation-service');
  const result = await executeCFPAutomation(businessId, {
    updateStatus: true,
    scheduleNext: false, // On-demand doesn't schedule
  });
  return { success: result.success, businessId, error: result.error };
}
```

#### `scheduler-service-execution.ts` - Keep Only Scheduling

**Refactor `processBusinessAutomation()`:**
```typescript
export async function processBusinessAutomation(
  business: Business,
  team: Team
): Promise<'success' | 'skipped' | 'failed'> {
  // Check if should run
  const { shouldRunCFPAutomation } = await import('./cfp-automation-service');
  if (!shouldRunCFPAutomation(business, team)) {
    return 'skipped';
  }

  // Execute CFP automation
  const { executeCFPAutomation } = await import('./cfp-automation-service');
  const result = await executeCFPAutomation(business.id, {
    autoPublish: undefined, // Use team config
    scheduleNext: true, // Scheduled runs schedule next
    updateStatus: true,
  });

  return result.success ? 'success' : 'failed';
}
```

#### `cfp-orchestrator.ts` - Decision Point

**Option A: Keep for External API Only**
- Keep `cfp-orchestrator.ts` for `/api/cfp` endpoint
- It works with URLs (not businessId), creates entities directly
- Different use case: external API vs internal automation

**Option B: Consolidate Everything**
- Refactor `cfp-orchestrator` to use `cfp-automation-service` internally
- Still maintain URL → Entity flow for external API
- Call CFP automation service for business records

**Recommendation:** **Option B** - Single source of truth, but maintain convenience functions for external API.

### Phase 3: Delete Deprecated Services

1. ❌ Delete `business-processing.ts` (deprecated compatibility layer)
2. ⚠️ Consider deleting `cfp-orchestrator.ts` if consolidated (or keep for external API)

---

## Benefits

### ✅ DRY Compliance
- **Single CFP orchestration logic** - no duplication
- **One place to fix bugs** - easier maintenance
- **Consistent behavior** - all execution paths use same logic

### ✅ SOLID Compliance
- **Single Responsibility:** 
  - `cfp-automation-service.ts` = CFP orchestration only
  - `business-execution.ts` = Execution functions only
  - `scheduler-service-execution.ts` = Scheduling/batching only
  
- **Open/Closed:** Extend CFP flow in one place, affects all contexts
- **Dependency Inversion:** Services depend on CFP service abstraction

### ✅ Maintainability
- **One source of truth** for CFP automation
- **Easier testing** - test orchestration once
- **Easier debugging** - single code path to trace

### ✅ Flexibility
- **Same logic** used by:
  - On-demand processing
  - Scheduled automation
  - Manual triggers
  - External API (with adapter)

---

## Migration Strategy

### Step 1: Create New Service (Non-Breaking)
1. Create `cfp-automation-service.ts`
2. Implement `executeCFPAutomation()`
3. Test in isolation

### Step 2: Update Existing Services (Gradual)
1. Update `autoStartProcessing()` to call new service
2. Update `processBusinessAutomation()` to call new service
3. Keep old implementations for backward compatibility (with deprecation warnings)

### Step 3: Remove Duplication (After Testing)
1. Remove `executeParallelProcessing()` from `business-execution.ts`
2. Remove orchestration logic from `scheduler-service-execution.ts`
3. Delete `business-processing.ts`

### Step 4: Clean Up
1. Update all imports
2. Update tests
3. Update documentation

---

## Example Usage After Refactoring

### On-Demand Processing (Business Creation)
```typescript
// app/api/business/route.ts
import { executeCFPAutomation } from '@/lib/services/cfp-automation-service';

// After creating business
await executeCFPAutomation(business.id, {
  updateStatus: true,
  scheduleNext: false, // On-demand doesn't schedule
});
```

### Scheduled Automation
```typescript
// scheduler-service-execution.ts
import { executeCFPAutomation, shouldRunCFPAutomation } from './cfp-automation-service';

// Process business
if (shouldRunCFPAutomation(business, team)) {
  await executeCFPAutomation(business.id, {
    scheduleNext: true, // Scheduled runs schedule next
    updateStatus: true,
  });
}
```

### Manual Trigger
```typescript
// app/api/business/[id]/process/route.ts
import { executeCFPAutomation } from '@/lib/services/cfp-automation-service';

await executeCFPAutomation(businessId, {
  updateStatus: true,
  scheduleNext: false,
});
```

---

## Summary

**Problem:** CFP orchestration duplicated across 3 services (DRY/SOLID violations)

**Solution:** Single `cfp-automation-service.ts` that handles all CFP automation

**Benefits:**
- ✅ Single source of truth
- ✅ DRY compliant
- ✅ SOLID compliant
- ✅ Easier maintenance
- ✅ Consistent behavior

**Next Steps:**
1. Create `cfp-automation-service.ts`
2. Refactor existing services to use it
3. Delete deprecated services
4. Update tests and documentation


