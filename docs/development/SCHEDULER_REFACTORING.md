# Scheduler Service Refactoring

## Overview

This document describes the consolidation of `scheduler-service.ts` and `monthly-processing.ts` into a unified, frequency-aware automation system.

## Problem Statement

The codebase had two overlapping services handling scheduled automation:

1. **`scheduler-service.ts`** - `processWeeklyCrawls()`: Only handled crawls (incomplete CFP pipeline)
2. **`monthly-processing.ts`** - `runMonthlyProcessing()`: Full CFP pipeline but not scheduled

### Issues Identified

- **Shared Responsibility**: Both queried for businesses due for processing
- **Incomplete Implementation**: Weekly crawls only did crawl, missing fingerprint and publish
- **Configuration Mismatch**: Automation config says monthly, but only weekly endpoint was scheduled
- **Code Duplication**: Similar query logic and processing patterns

## Solution

### Unified `processScheduledAutomation()` Function

Created a single frequency-aware function that:

1. **Respects Automation Config**: Works with weekly/monthly/daily frequencies
2. **Full CFP Pipeline**: Runs crawl + fingerprint (parallel) → publish (after crawl)
3. **Batch Processing**: Processes businesses in configurable batches (default: 10)
4. **Missed Schedule Recovery**: Optionally catches businesses that missed their schedule (30+ days overdue)
5. **Comprehensive Error Handling**: Tracks success/skipped/failed counts

### Key Changes

#### `lib/services/scheduler-service.ts`

- **Added**: `processScheduledAutomation()` - Unified frequency-aware processing
- **Added**: `processBusinessAutomation()` - Processes single business with full CFP
- **Deprecated**: `processWeeklyCrawls()` - Kept for backward compatibility, calls unified function
- **Kept**: `handleAutoPublish()` - Reusable publish logic (no changes)

#### `app/api/cron/weekly-crawls/route.ts`

- **Updated**: Now calls `processScheduledAutomation()` instead of `processWeeklyCrawls()`
- **Behavior**: Handles all frequencies (weekly/monthly/daily) based on automation config

#### `app/api/cron/monthly/route.ts`

- **Updated**: Now calls `processScheduledAutomation()` for backward compatibility
- **Status**: Deprecated but kept for existing cron configurations

#### `lib/services/monthly-processing.ts`

- **Status**: Deprecated - functionality moved to scheduler-service
- **Action**: Will be removed in future version after migration period

## Architecture

### Processing Flow

```
processScheduledAutomation()
  ↓
Query businesses (automationEnabled = true, nextCrawlAt <= now)
  ↓
Batch processing (10 businesses concurrently)
  ↓
For each business:
  1. Check automation config (shouldAutoCrawl)
  2. Run crawl + fingerprint in parallel
  3. Run publish (if crawl succeeded and autoPublish enabled)
  4. Schedule next processing (based on crawlFrequency)
```

### Frequency Awareness

The system automatically handles different frequencies based on tier:

- **Free Tier**: `manual` - No automation
- **Pro Tier**: `monthly` - Automated monthly
- **Agency Tier**: `monthly` - Automated monthly with enrichment

The unified function respects `crawlFrequency` from `automation-service.ts` and schedules accordingly.

## Migration Guide

### For Code Using `monthly-processing.ts`

**Before:**
```typescript
import { runMonthlyProcessing } from '@/lib/services/monthly-processing';
await runMonthlyProcessing();
```

**After:**
```typescript
import { processScheduledAutomation } from '@/lib/services/scheduler-service';
await processScheduledAutomation({
  batchSize: 10,
  catchMissed: true,
});
```

### For Code Using `processWeeklyCrawls()`

**Before:**
```typescript
import { processWeeklyCrawls } from '@/lib/services/scheduler-service';
await processWeeklyCrawls();
```

**After:**
```typescript
import { processScheduledAutomation } from '@/lib/services/scheduler-service';
await processScheduledAutomation();
```

Note: `processWeeklyCrawls()` still works but is deprecated and calls `processScheduledAutomation()` internally.

## Benefits

1. **Single Source of Truth**: One function handles all scheduled automation
2. **Frequency Awareness**: Automatically respects tier-based automation config
3. **Complete CFP Pipeline**: Always runs full crawl → fingerprint → publish
4. **Better Error Handling**: Comprehensive tracking of success/failed/skipped
5. **Optimized Queries**: Single JOIN query eliminates N+1 problem
6. **Batch Processing**: Configurable concurrency limits

## Testing

- Updated `app/api/cron/monthly/__tests__/route.test.ts` to use unified function
- Existing tests for `processWeeklyCrawls()` continue to work (backward compatibility)

## Future Work

1. Remove `monthly-processing.ts` after migration period
2. Remove deprecated `processWeeklyCrawls()` function
3. Consider removing `/api/cron/monthly` endpoint if not needed
4. Add support for `daily` frequency if needed

## Related Files

- `lib/services/scheduler-service.ts` - Main unified service
- `lib/services/monthly-processing.ts` - Deprecated (to be removed)
- `lib/services/automation-service.ts` - Automation configuration
- `app/api/cron/weekly-crawls/route.ts` - Unified cron endpoint
- `app/api/cron/monthly/route.ts` - Deprecated endpoint (backward compatibility)


