# Services Layer

The `lib/services/` folder contains business logic services that orchestrate automation, processing, and scheduling tasks.

## Service Architecture

```
lib/services/
├── automation-service.ts    # Configuration & decision logic
├── business-processing.ts  # Execution & orchestration (MIXED CONCERNS)
├── scheduler-service.ts     # Scheduled task execution
└── monthly-processing.ts    # Monthly batch processing
```

## Service Responsibilities

### `automation-service.ts` ✅ (Well Separated)
**Purpose:** Tier-based automation configuration
- Determines what automation features are available per subscription tier
- Pure functions - no side effects
- Used by: All other services

**Functions:**
- `getAutomationConfig(team)` - Get automation config for tier
- `shouldAutoCrawl(business, team)` - Should we auto-crawl?
- `shouldAutoPublish(business, team)` - Should we auto-publish?
- `calculateNextCrawlDate(frequency)` - Calculate next crawl date
- `getEntityRichnessForTier(tier)` - Get entity richness level

### `business-processing.ts` ⚠️ (Mixed Concerns)
**Purpose:** Business processing execution and orchestration

**Current Structure (MIXED):**
1. **Decision Logic** (lines 24-77)
   - `shouldCrawl()` - Cache checking
   - `canRunFingerprint()` - Frequency enforcement

2. **Execution Logic** (lines 83-235)
   - `executeCrawlJob()` - Run crawl
   - `executeFingerprint()` - Run fingerprint

3. **Orchestration Logic** (lines 245-312)
   - `autoStartProcessing()` - Coordinate crawl + fingerprint

**Issue:** Three different concerns in one file

**Used by:**
- API routes (`/api/crawl`, `/api/business`)
- Scheduler service
- Monthly processing

### `scheduler-service.ts` ✅ (Well Separated)
**Purpose:** Scheduled automation tasks (cron jobs)
- Handles weekly crawls
- Handles auto-publish after crawl

**Functions:**
- `handleAutoPublish(businessId)` - Publish to Wikidata
- `processWeeklyCrawls()` - Process all due weekly crawls

**Used by:**
- `/api/cron/weekly-crawls` route
- Called by `business-processing` after crawl completes

### `monthly-processing.ts` ✅ (Well Separated)
**Purpose:** Monthly batch processing orchestration
- Simple wrapper that calls `autoStartProcessing` for all businesses

**Functions:**
- `runMonthlyProcessing()` - Process all businesses monthly

**Used by:**
- `/api/cron/monthly` route

## Refactoring Recommendation

### Option 1: Split `business-processing.ts` (Recommended)

Create three focused files:

```
lib/services/
├── business-decisions.ts      # Decision logic (shouldCrawl, canRunFingerprint)
├── business-execution.ts      # Execution logic (executeCrawlJob, executeFingerprint)
└── business-orchestration.ts  # Orchestration (autoStartProcessing)
```

**Benefits:**
- Clear separation of concerns
- Easier to test each concern independently
- Better follows Single Responsibility Principle

**Trade-offs:**
- More files to navigate
- Slightly more imports

### Option 2: Keep Current Structure (Acceptable)

**Pros:**
- All business processing logic in one place
- Fewer files
- Current structure works

**Cons:**
- Mixed concerns in one file
- Harder to test decision logic separately
- File is getting large (314 lines)

## Current Status

✅ **Well Separated:**
- `automation-service.ts` - Pure configuration
- `scheduler-service.ts` - Scheduled tasks only
- `monthly-processing.ts` - Simple orchestration

⚠️ **Needs Improvement:**
- `business-processing.ts` - Mixes decision, execution, and orchestration

## Usage Patterns

### From API Routes
```typescript
// app/api/crawl/route.ts
import { executeCrawlJob, shouldCrawl } from '@/lib/services/business-processing';

// Check if crawl needed
const needsCrawl = await shouldCrawl(business);

// Execute crawl
await executeCrawlJob(job.id, businessId);
```

### From Business Creation
```typescript
// app/api/business/route.ts
import { autoStartProcessing } from '@/lib/services/business-processing';

// After creating business
await autoStartProcessing(newBusiness);
```

### From Cron Jobs
```typescript
// app/api/cron/weekly-crawls/route.ts
import { processWeeklyCrawls } from '@/lib/services/scheduler-service';

// Weekly scheduled task
await processWeeklyCrawls();
```

## Dependencies

```
automation-service (no dependencies)
    ↑
    ├── business-processing
    └── scheduler-service
            ↑
            └── monthly-processing
```

**Note:** `business-processing` dynamically imports `scheduler-service` to avoid circular dependency.

