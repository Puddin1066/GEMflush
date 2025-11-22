# Archived Services

This directory contains services that have been archived as part of the services refactoring effort.

## Archived Files

### `business-processing.ts` (Archived: 2025-11-22)
- **Reason**: Deprecated compatibility layer
- **Replacement**: `lib/services/business-execution.ts`
- **Migration**: All imports updated to use `business-execution.ts` directly
- **Lines**: 102 lines of compatibility code

**Original Purpose**: Provided backward compatibility during the transition from monolithic business processing to modular execution services.

**Functions Archived**:
- `shouldCrawl()` - Simple decision logic (replaced by enhanced logic in business-execution)
- `canRunFingerprint()` - Simple decision logic (replaced by enhanced logic in business-execution)
- `executeCrawlJob()` - Delegated to business-execution
- `executeFingerprint()` - Delegated to business-execution
- `autoStartProcessing()` - Delegated to business-execution
- `executeCrawlJobLegacy()` - Legacy wrapper function
- `executeFingerprintLegacy()` - Legacy wrapper function

### `scheduler-service.ts` (Archived: 2025-11-22)
- **Reason**: Deprecated compatibility layer
- **Replacement**: Direct imports from `scheduler-service-decision.ts` and `scheduler-service-execution.ts`
- **Migration**: All imports updated to use specific modules
- **Lines**: 17 lines of compatibility code

**Original Purpose**: Provided backward compatibility during the transition from monolithic scheduler service to modular decision/execution services.

**Functions Archived**:
- `handleAutoPublish` - Re-exported from scheduler-service-decision
- `processScheduledAutomation` - Re-exported from scheduler-service-execution
- `processBusinessAutomation` - Re-exported from scheduler-service-execution
- `processWeeklyCrawls` - Re-exported from scheduler-service-execution

## Migration Summary

### API Routes Updated
1. `app/api/business/[id]/process/route.ts`
   - Changed: `@/lib/services/business-processing` → `@/lib/services/business-execution`

2. `app/api/business/[id]/reset-fingerprint/route.ts`
   - Changed: `@/lib/services/business-processing` → `@/lib/services/business-execution`

3. `app/api/cron/weekly-crawls/route.ts`
   - Changed: `@/lib/services/scheduler-service` → `@/lib/services/scheduler-service-execution`

4. `app/api/cron/monthly/route.ts`
   - Changed: `@/lib/services/scheduler-service` → `@/lib/services/scheduler-service-execution`

## Current Active Services

The following services remain active and should be used going forward:

### Core Services
- `automation-service.ts` - Tier-based automation configuration
- `business-execution.ts` - Main business processing execution engine
- `scheduler-service-decision.ts` - Scheduling decision logic
- `scheduler-service-execution.ts` - Scheduling execution logic
- `cfp-orchestrator.ts` - CFP (Crawl, Fingerprint, Publish) orchestration

### Service Architecture
```
lib/services/
├── automation-service.ts          # Configuration & tier logic
├── business-execution.ts          # Main execution engine
├── scheduler-service-decision.ts  # Scheduling decisions
├── scheduler-service-execution.ts # Scheduling execution
└── cfp-orchestrator.ts           # CFP orchestration
```

## Benefits of Archival

1. **Reduced Complexity**: Removed 119 lines of compatibility code
2. **Better Performance**: Eliminated lazy loading overhead from compatibility layers
3. **Clearer Architecture**: Direct imports make dependencies explicit
4. **Easier Maintenance**: No more dual code paths to maintain
5. **SOLID Compliance**: Each service now has a single, clear responsibility

## Rollback Instructions

If rollback is needed, these files can be restored from the archive:

```bash
# Restore archived files
cp _archive/services/business-processing.ts lib/services/
cp _archive/services/scheduler-service.ts lib/services/

# Revert API route imports (example)
# Change business-execution back to business-processing
# Change scheduler-service-execution back to scheduler-service
```

However, rollback is not recommended as the new architecture provides better separation of concerns and performance.
