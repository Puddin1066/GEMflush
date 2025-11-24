# Services Reference Table

**Last Updated:** 2025-01-XX  
**Location:** `lib/services/`  
**Architecture:** Consolidated CFP automation following DRY and SOLID principles

---

## Service Overview

This table documents all services in the `lib/services/` directory, their purpose, exported functions, and usage patterns.

---

## Active Services

| Service File | Purpose | Status | Side Effects | Dependencies |
|--------------|---------|--------|--------------|--------------|
| `cfp-automation-service.ts` | **PRIMARY VALUE** - CFP execution/orchestration (does the work) | ✅ **ACTIVE** | ✅ Yes - executes operations | business-execution, scheduler-service-decision, automation-service |
| `automation-service.ts` | **Configuration/Policy** - Defines what should happen (pure functions) | ✅ **ACTIVE** | ❌ No - pure functions | None |
| `business-execution.ts` | Individual operation execution (crawl, fingerprint) | ✅ **ACTIVE** | ✅ Yes - executes operations | crawler, llm services |
| `scheduler-service-execution.ts` | Scheduled automation execution (batch processing, cron jobs) | ✅ **ACTIVE** | ✅ Yes - orchestrates batches | cfp-automation-service, automation-service |
| `scheduler-service-decision.ts` | Auto-publish decision and execution | ✅ **ACTIVE** | ✅ Yes - publishes to Wikidata | business-execution, automation-service |
| `cfp-orchestrator.ts` | External API CFP flow (URL → Entity, different use case) | ✅ **ACTIVE** | ✅ Yes - creates entities | crawler, llm, wikidata services |

---

## Detailed Service Documentation

### 1. `cfp-automation-service.ts` - PRIMARY CFP EXECUTION SERVICE

**Purpose:** **EXECUTION/ORCHESTRATION** - Actually executes the CFP (Crawl → Fingerprint → Publish) workflow

**Key Responsibility:** 
- **Executes** complete CFP flow: Crawl + Fingerprint (parallel) → Auto-publish → Schedule next
- Orchestrates workflow by calling execution services
- Updates database status and schedules
- Eliminates duplication across multiple services

**Distinction from automation-service.ts:**
- `automation-service.ts` = **Configuration/Policy** ("What should happen?")
- `cfp-automation-service.ts` = **Execution/Orchestration** ("Actually doing it")

**Exported Functions:**

| Function | Signature | Purpose | Returns |
|----------|-----------|---------|---------|
| `executeCFPAutomation()` | `(businessId: number, options?: CFPExecutionOptions) => Promise<CFPExecutionResult>` | **Primary CFP automation flow** - orchestrates crawl, fingerprint, publish, and scheduling | `CFPExecutionResult` with success status, crawl/fingerprint/publish results |
| `shouldRunCFPAutomation()` | `(business: Business, team: Team \| null) => boolean` | Checks if business should run CFP automation based on team config | `boolean` |

**Exported Types:**

| Type | Description |
|------|-------------|
| `CFPExecutionOptions` | Options for CFP execution: `autoPublish?`, `scheduleNext?`, `updateStatus?` |
| `CFPExecutionResult` | Result of CFP execution with success status, crawl/fingerprint/publish results, duration |

**Usage Pattern:**
```typescript
import { executeCFPAutomation } from '@/lib/services/cfp-automation-service';

// On-demand processing
await executeCFPAutomation(businessId, {
  updateStatus: true,
  scheduleNext: false,
});

// Scheduled automation
await executeCFPAutomation(businessId, {
  scheduleNext: true, // Schedule next run
});
```

**Used By:**
- `business-execution.ts` - `autoStartProcessing()` delegates here
- `scheduler-service-execution.ts` - `processBusinessAutomation()` delegates here
- API routes (via business-execution wrappers)

**SOLID Compliance:**
- ✅ Single Responsibility: CFP orchestration only
- ✅ DRY: No duplication - single implementation

---

### 2. `business-execution.ts` - EXECUTION FUNCTIONS

**Purpose:** Pure execution functions for crawl and fingerprint operations

**Key Responsibility:**
- Execute individual crawl jobs
- Execute fingerprint analysis
- Provides backward-compatible wrappers that delegate to CFP automation service

**Exported Functions:**

| Function | Signature | Purpose | Returns |
|----------|-----------|---------|---------|
| `executeCrawlJob()` | `(jobId: number \| null, businessId: number, business?: Business) => Promise<ExecutionResult>` | Execute crawl job with error handling and retry logic | `ExecutionResult` with success status, error, duration |
| `executeFingerprint()` | `(business: Business, updateStatus?: boolean) => Promise<ExecutionResult>` | Execute fingerprint analysis for a business | `ExecutionResult` with success status, error, duration |
| `executeParallelProcessing()` | `(businessId: number) => Promise<ParallelExecutionResult>` | **@deprecated** - Delegates to `executeCFPAutomation()` | `ParallelExecutionResult` (for backward compatibility) |
| `autoStartProcessing()` | `(businessId: number) => Promise<ExecutionResult>` | Auto-start CFP for new businesses - **delegates to `executeCFPAutomation()`** | `ExecutionResult` with success status |

**Exported Types:**

| Type | Description |
|------|-------------|
| `ExecutionResult` | Result of individual operation: `success`, `businessId`, `error?`, `duration?` |
| `ParallelExecutionResult` | Result of parallel processing: `crawlResult`, `fingerprintResult`, `overallSuccess`, `totalDuration` |

**Usage Pattern:**
```typescript
import { executeCrawlJob, executeFingerprint } from '@/lib/services/business-execution';

// Execute crawl
await executeCrawlJob(jobId, businessId, business);

// Execute fingerprint
await executeFingerprint(business, true);
```

**Used By:**
- `cfp-automation-service.ts` - Uses execution functions
- `scheduler-service-decision.ts` - Uses execution functions
- API routes directly

**SOLID Compliance:**
- ✅ Single Responsibility: Execution only, no orchestration
- ✅ DRY: Execution functions reused by CFP automation service

---

### 3. `scheduler-service-execution.ts` - SCHEDULED AUTOMATION EXECUTION

**Purpose:** Handles scheduled automation processing (cron jobs, batch processing)

**Key Responsibility:**
- Finds businesses due for scheduled automation
- Processes businesses in batches
- Coordinates batch execution using CFP automation service

**Exported Functions:**

| Function | Signature | Purpose | Returns |
|----------|-----------|---------|---------|
| `processScheduledAutomation()` | `(options?: { batchSize?: number, catchMissed?: boolean }) => Promise<void>` | **TODO** - Process all businesses due for scheduled automation | `void` (TODO: should return results) |
| `processBusinessAutomation()` | `(business: Business, team: Team) => Promise<'success' \| 'skipped' \| 'failed'>` | Process single business for scheduled automation - **delegates to `executeCFPAutomation()`** | `'success' \| 'skipped' \| 'failed'` |

**Usage Pattern:**
```typescript
import { processBusinessAutomation, processScheduledAutomation } from '@/lib/services/scheduler-service-execution';

// Process single business
await processBusinessAutomation(business, team);

// Process batch (when implemented)
await processScheduledAutomation({ batchSize: 10, catchMissed: true });
```

**Used By:**
- `/api/cron/weekly-crawls` - Cron job endpoint
- `/api/cron/monthly` - Cron job endpoint

**SOLID Compliance:**
- ✅ Single Responsibility: Scheduling/batching only
- ✅ DRY: Delegates CFP execution to cfp-automation-service

---

### 4. `scheduler-service-decision.ts` - AUTO-PUBLISH DECISION LOGIC

**Purpose:** Handles auto-publish decision and execution after crawl completes

**Key Responsibility:**
- Checks if business should be auto-published
- Executes auto-publish to Wikidata
- Stores entities for manual publish fallback

**Exported Functions:**

| Function | Signature | Purpose | Returns |
|----------|-----------|---------|---------|
| `handleAutoPublish()` | `(businessId: number) => Promise<void>` | Handle auto-publish after crawl completes - checks notability, publishes to Wikidata | `void` |

**Usage Pattern:**
```typescript
import { handleAutoPublish } from '@/lib/services/scheduler-service-decision';

// After crawl completes
await handleAutoPublish(businessId);
```

**Used By:**
- `cfp-automation-service.ts` - Called after crawl succeeds
- `business-execution.ts` - Called after crawl completes (via CFP automation)

**SOLID Compliance:**
- ✅ Single Responsibility: Auto-publish decision and execution only
- ✅ DRY: Reused by CFP automation service

---

### 5. `automation-service.ts` - AUTOMATION CONFIGURATION/POLICY

**Purpose:** **CONFIGURATION/POLICY** - Tier-based automation configuration and decision logic (pure functions)

**Key Responsibility:**
- **Defines** automation config based on subscription tier
- **Decides** what should happen (shouldAutoCrawl, shouldAutoPublish)
- Pure functions with no side effects
- Does NOT execute anything - only provides configuration and decisions

**Distinction from cfp-automation-service.ts:**
- `automation-service.ts` = **Configuration/Policy** ("What should happen?") - Pure functions
- `cfp-automation-service.ts` = **Execution/Orchestration** ("Actually doing it") - Executes workflow

**Think of it as:**
- `automation-service.ts` = Rules/Policy maker
- `cfp-automation-service.ts` = Worker that follows the rules

**Exported Functions:**

| Function | Signature | Purpose | Returns |
|----------|-----------|---------|---------|
| `getAutomationConfig()` | `(team: Team \| null) => AutomationConfig` | Get automation configuration for team based on subscription tier | `AutomationConfig` with frequencies, autoPublish, entityRichness |
| `shouldAutoCrawl()` | `(business: Business, team: Team \| null) => boolean` | Check if business should be auto-crawled | `boolean` |
| `shouldAutoPublish()` | `(business: Business, team: Team \| null) => boolean` | Check if business should be auto-published | `boolean` |
| `calculateNextCrawlDate()` | `(frequency: 'monthly' \| 'weekly' \| 'daily') => Date` | Calculate next crawl date based on frequency | `Date` |
| `getEntityRichnessForTier()` | `(tier: string) => 'basic' \| 'enhanced' \| 'complete'` | Get entity richness level for subscription tier | `'basic' \| 'enhanced' \| 'complete'` |

**Exported Types:**

| Type | Description |
|------|-------------|
| `AutomationConfig` | Configuration: `crawlFrequency`, `fingerprintFrequency`, `autoPublish`, `entityRichness`, `progressiveEnrichment` |

**Usage Pattern:**
```typescript
import { getAutomationConfig, shouldAutoCrawl, calculateNextCrawlDate } from '@/lib/services/automation-service';

// Get config
const config = getAutomationConfig(team);

// Check if should crawl
if (shouldAutoCrawl(business, team)) {
  // ...
}

// Calculate next date
const nextDate = calculateNextCrawlDate('monthly');
```

**Used By:**
- All other services use this for configuration
- No dependencies (pure functions)

**SOLID Compliance:**
- ✅ Single Responsibility: Configuration only
- ✅ DRY: Centralized tier-based logic
- ✅ Pure functions: No side effects

---

### 6. `cfp-orchestrator.ts` - EXTERNAL API CFP ORCHESTRATOR

**Purpose:** Standalone CFP flow for external API usage (URL → Entity)

**Key Responsibility:**
- Provides CFP flow for external API (`/api/cfp`)
- Works with URLs (not businessId)
- Creates entities directly (not tied to business records)
- Different use case: External API vs internal automation

**Exported Functions:**

| Function | Signature | Purpose | Returns |
|----------|-----------|---------|---------|
| `executeCFPFlow()` | `(url: string, options?: CFPInput['options'], progressCallback?: CFPProgressCallback) => Promise<CFPResult>` | Execute complete CFP flow from URL to JSON entity | `CFPResult` with entity, publish result, processing data |
| `createEntityFromUrl()` | `(url: string, options?) => Promise<WikidataEntity \| null>` | Create entity from URL (no publishing) | `WikidataEntity \| null` |
| `crawlFingerprintAndPublish()` | `(url: string, options?, progressCallback?) => Promise<CFPResult>` | Full CFP flow with publishing | `CFPResult` |

**Exported Types:**

| Type | Description |
|------|-------------|
| `CFPInput` | Input: `url`, `options?: { publishTarget, includeFingerprint, shouldPublish, timeout, allowMockData }` |
| `CFPResult` | Result: `success`, `url`, `entity`, `publishResult?`, `crawlData?`, `fingerprintAnalysis?`, `processingTime`, `error?` |
| `CFPProgress` | Progress: `stage`, `progress`, `message`, `timestamp` |
| `CFPProgressCallback` | Callback type for progress updates |

**Usage Pattern:**
```typescript
import { executeCFPFlow } from '@/lib/services/cfp-orchestrator';

// External API usage
const result = await executeCFPFlow('https://example.com', {
  shouldPublish: false,
  includeFingerprint: true,
});
```

**Used By:**
- `/api/cfp` - External API endpoint

**Note:** This service is separate from internal CFP automation because it:
- Works with URLs (not businessId)
- Creates entities directly (not tied to database records)
- Different input/output format
- Designed for external API usage

**SOLID Compliance:**
- ✅ Single Responsibility: External API CFP orchestration
- ✅ Separate from internal automation (different use case)

---

## Service Dependency Graph

```
automation-service.ts (no dependencies - pure functions)
    ↑
    ├── cfp-automation-service.ts
    │       ↑
    │       ├── business-execution.ts (uses executeCrawlJob, executeFingerprint)
    │       └── scheduler-service-decision.ts (uses handleAutoPublish)
    │
    ├── scheduler-service-execution.ts
    │       └── cfp-automation-service.ts (delegates to executeCFPAutomation)
    │
    └── scheduler-service-decision.ts
            └── business-execution.ts (uses executeCrawlJob, executeFingerprint)

business-execution.ts
    ↑
    └── cfp-automation-service.ts (uses execution functions)

cfp-orchestrator.ts (standalone - uses @crawler, @llm, @wikidata directly)
    ↑
    └── /api/cfp route
```

---

## Service Responsibilities Summary

| Service | Responsibility | Purpose | Side Effects | Dependencies | Key Functions |
|---------|---------------|---------|--------------|--------------|---------------|
| **cfp-automation-service.ts** | **PRIMARY** - CFP execution/orchestration | **EXECUTION** - Actually does the work | ✅ Yes | business-execution, scheduler-service-decision, automation-service | `executeCFPAutomation()`, `shouldRunCFPAutomation()` |
| **automation-service.ts** | Configuration/Policy | **CONFIGURATION** - Defines what should happen | ❌ No (pure) | None | `getAutomationConfig()`, `shouldAutoCrawl()`, `shouldAutoPublish()`, `calculateNextCrawlDate()` |
| **business-execution.ts** | Individual operation execution | **EXECUTION** - Executes crawl/fingerprint | ✅ Yes | crawler, llm services | `executeCrawlJob()`, `executeFingerprint()`, `autoStartProcessing()` |
| **scheduler-service-execution.ts** | Scheduled automation (batch processing) | **ORCHESTRATION** - Batches and schedules | ✅ Yes | cfp-automation-service, automation-service | `processBusinessAutomation()`, `processScheduledAutomation()` |
| **scheduler-service-decision.ts** | Auto-publish decision and execution | **EXECUTION** - Publishes to Wikidata | ✅ Yes | business-execution, automation-service | `handleAutoPublish()` |
| **cfp-orchestrator.ts** | External API CFP flow | **EXECUTION** - URL → Entity for API | ✅ Yes | crawler, llm, wikidata | `executeCFPFlow()`, `createEntityFromUrl()`, `crawlFingerprintAndPublish()` |

### Key Distinction: Configuration vs Execution

**`automation-service.ts`** (Configuration/Policy):
- **Purpose:** "What should happen?"
- **Type:** Pure functions (no side effects)
- **Role:** Decision maker, rule provider
- **Functions:** Config, decisions, helpers

**`cfp-automation-service.ts`** (Execution/Orchestration):
- **Purpose:** "Actually doing it"
- **Type:** Orchestration (has side effects)
- **Role:** Executor, workflow orchestrator
- **Functions:** Executes CFP workflow, orchestrates operations

**They complement each other:**
- `automation-service` provides the **rules/config**
- `cfp-automation-service` uses those rules to **execute the workflow**

---

## Migration Status

### ✅ Completed
- ✅ Created `cfp-automation-service.ts` - single source of truth
- ✅ Refactored `business-execution.ts` - removed orchestration duplication
- ✅ Refactored `scheduler-service-execution.ts` - delegates to CFP service
- ✅ Deleted `business-processing.ts` - deprecated compatibility layer

### Architecture Benefits
- ✅ **DRY Compliant:** No duplication - CFP orchestration in one place
- ✅ **SOLID Compliant:** Each service has single responsibility
- ✅ **Maintainable:** Fix bugs in one place, affects all execution contexts
- ✅ **Consistent:** All execution paths use same CFP logic

---

## Usage Examples

### On-Demand Processing (Business Creation)
```typescript
import { executeCFPAutomation } from '@/lib/services/cfp-automation-service';

await executeCFPAutomation(businessId, {
  updateStatus: true,
  scheduleNext: false,
});
```

### Scheduled Automation (Cron Jobs)
```typescript
import { processBusinessAutomation } from '@/lib/services/scheduler-service-execution';

// Process single business
await processBusinessAutomation(business, team);

// Process batch (when implemented)
await processScheduledAutomation({ batchSize: 10 });
```

### External API (CFP Orchestrator)
```typescript
import { executeCFPFlow } from '@/lib/services/cfp-orchestrator';

const result = await executeCFPFlow('https://example.com', {
  shouldPublish: false,
  includeFingerprint: true,
});
```

---

## Summary

**Total Services:** 6 active services

**Primary Service:** `cfp-automation-service.ts` - Single source of truth for CFP automation

**Architecture:** 
- Consolidated CFP orchestration eliminates duplication
- Clear separation of concerns (SOLID)
- Reusable execution functions
- Pure configuration functions

**All services follow DRY and SOLID principles.**

