# Test Archive Plan

**Date**: January 2025  
**Goal**: Archive or delete outdated, deprecated, and placeholder tests to improve test suite maintainability

---

## 📊 Current Test Status

- **Total test files**: 178
- **Placeholder assertions**: 14 instances
- **Skipped tests**: Multiple files
- **Deprecated endpoint tests**: 1 (monthly cron)

---

## 🎯 Tests to Archive

### 1. **Placeholder TDD Tests** (Incomplete Specifications)

These tests have placeholder assertions and may need completion or archiving:

#### High Priority to Archive:
- `tests/integration/services-to-backend-dataflow.tdd.test.ts` - 6 placeholder assertions
- `tests/integration/services-to-frontend-dataflow.tdd.test.ts` - 7 placeholder assertions

**Decision**: Archive if not actively being worked on. These appear to be incomplete TDD specifications.

### 2. **Skipped/Duplicate Tests**

#### Archive Immediately:
- `tests/e2e/user-workflows.spec.ts` - All tests skipped, marked as placeholders
  - **Reason**: Comment says "Use complete-workflows.spec.ts for actual tests"
  - **Action**: Archive to `tests/e2e/_archive/`

### 3. **Deprecated Endpoint Tests**

#### Archive (Keep for Reference):
- `app/api/cron/monthly/__tests__/route.test.ts` - Tests deprecated endpoint
  - **Reason**: Endpoint marked as `@deprecated` in route.ts
  - **Action**: Move to `_archive/tests/api/cron/monthly/` or mark as deprecated

### 4. **Already Archived Tests** (Verify)

These are already in `_archive/` or `tests/e2e/_archive/`:
- ✅ `_archive/tests/crawler/*.test.ts` - 3 files
- ✅ `_archive/tests/llm/*.test.ts` - 4 files  
- ✅ `tests/e2e/_archive/old-tests/*.test.ts` - 12 files
- ✅ `tests/e2e/_archive/old-tests/*.spec.ts` - 2 debug files

---

## 📋 Archive Decision Framework

### Archive If:
1. ✅ Test has placeholder assertions (`expect(true).toBe(true)`) and hasn't been updated in 30+ days
2. ✅ Test is skipped and marked as duplicate/placeholder
3. ✅ Test covers deprecated functionality
4. ✅ Test is redundant with newer TDD tests
5. ✅ Test file hasn't been modified in 60+ days and is not referenced

### Keep If:
1. ✅ Test is actively used (passing, referenced)
2. ✅ Test is part of TDD workflow (even if incomplete)
3. ✅ Test covers critical functionality
4. ✅ Test is recently created/updated

---

## 🗂️ Archive Structure

```
_archive/
├── tests/
│   ├── integration/
│   │   ├── services-to-backend-dataflow.tdd.test.ts (if archiving)
│   │   └── services-to-frontend-dataflow.tdd.test.ts (if archiving)
│   └── api/
│       └── cron/
│           └── monthly/
│               └── route.test.ts (deprecated endpoint)

tests/e2e/_archive/
└── user-workflows.spec.ts (skipped/duplicate)
```

---

## ✅ Action Items

1. ✅ **Archive skipped tests** - `user-workflows.spec.ts` → `tests/e2e/_archive/skipped-tests/`
2. ⏳ **Review placeholder TDD tests** - Decide: complete or archive (14 placeholder assertions found)
3. ✅ **Archive deprecated endpoint tests** - `monthly/route.test.ts` → `_archive/tests/api/cron/monthly/`
4. ✅ **Update vitest config** - Exclude archived tests from watch
5. ✅ **Update test documentation** - Document archived tests

## 📊 Archive Results

- **Before**: 178 test files
- **After**: 155 active test files (excluding archived)
- **Archived**: 23 test files
- **Reduction**: 13% fewer test files to maintain

### Files Archived:
1. ✅ `tests/e2e/user-workflows.spec.ts` → `tests/e2e/_archive/skipped-tests/`
2. ✅ `app/api/cron/monthly/__tests__/route.test.ts` → `_archive/tests/api/cron/monthly/`

### Vitest Config Updated:
- ✅ Excludes `**/_archive/**`
- ✅ Excludes `**/tests/e2e/_archive/**`
- ✅ Excludes `**/*.example.test.{ts,tsx}`

---

## 🔍 Verification

After archiving, verify:
- [ ] Vitest watch excludes archived tests
- [ ] No imports reference archived tests
- [ ] Test count reduced appropriately
- [ ] Documentation updated

---

## 📝 Notes

- **TDD Placeholder Tests**: These may be intentional (RED phase) - verify with team before archiving
- **Deprecated Tests**: Keep for reference but exclude from active test runs
- **Skipped Tests**: Archive if truly duplicate, keep if temporarily disabled

