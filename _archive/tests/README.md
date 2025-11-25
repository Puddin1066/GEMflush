# Archived Non-TDD Tests

**Date**: January 2025  
**Purpose**: Archive non-TDD tests to minimize context bandwidth and focus on TDD-driven development

---

## 📊 Archive Summary

- **Total files archived**: 151 test files
- **Archive location**: `_archive/tests/`
- **Reason**: Non-TDD tests (tests without `.tdd.test.` suffix) have been archived to reduce context size and focus on TDD methodology

---

## 🎯 What Was Archived

All test files matching `*.test.ts` or `*.test.tsx` that do NOT have the `.tdd.test.` suffix pattern were moved to this archive, preserving their original directory structure:

- `app/**/*.test.ts` → `_archive/tests/app/**/*.test.ts`
- `components/**/*.test.tsx` → `_archive/tests/components/**/*.test.tsx`
- `lib/**/*.test.ts` → `_archive/tests/lib/**/*.test.ts`
- `tests/integration/**/*.test.ts` → `_archive/tests/tests/integration/**/*.test.ts`

---

## ✅ What Remains Active

Only TDD tests remain active (files with `.tdd.test.` suffix):
- `**/*.tdd.test.{ts,tsx}`

These are the tests that follow the Test-Driven Development methodology where tests are written first as specifications.

---

## 🔧 Vitest Configuration

The `vitest.config.ts` has been updated to:
- **Include**: Only `**/*.tdd.test.{ts,tsx}` files
- **Exclude**: `**/_archive/**` (archived tests are automatically excluded)

---

## 📝 Notes

- Archived tests are preserved for reference but are not run in the test suite
- E2E tests (`.spec.ts` files) remain in `tests/e2e/` and are excluded from Vitest runs
- To restore a test, move it back from `_archive/tests/` to its original location
- If you need to run archived tests, temporarily move them out of `_archive/` or update vitest config

---

## 🚀 Restoring Tests

If you need to restore specific tests:

```bash
# Example: Restore a specific test file
mv _archive/tests/lib/services/__tests__/business-execution.test.ts \
   lib/services/__tests__/business-execution.test.ts
```

Note: Restored tests will need to be renamed to `.tdd.test.ts` to be included in the test suite, or the vitest config will need to be updated.


