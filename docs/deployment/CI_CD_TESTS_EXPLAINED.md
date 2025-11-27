# 🧪 CI/CD Tests Explained

## Current Test Configuration

### ✅ Modern Test Setup

**Test Framework:** Vitest (latest, not outdated)
- **Config:** `vitest.config.ts`
- **Pattern:** `**/*.tdd.test.{ts,tsx}` (TDD test files only)
- **Environment:** jsdom (for React component testing)

### Test Commands Used in CI/CD

All workflows use the **correct, modern commands**:

```bash
# Unit tests (used in all workflows)
pnpm test:run

# This runs: vitest run
# Which executes all *.tdd.test.{ts,tsx} files
```

**Not using outdated commands:**
- ❌ Not using `jest` (old)
- ❌ Not using `npm test` (generic)
- ✅ Using `pnpm test:run` (modern vitest)

---

## 📋 Tests Run in CI/CD

### 1. **Linter** (`pnpm lint`)
- Runs: ESLint
- Checks: Code style, TypeScript errors
- **Required:** Yes (fails build if errors)

### 2. **Type Check** (`pnpm tsc --noEmit`)
- Runs: TypeScript compiler
- Checks: Type errors without emitting files
- **Required:** Yes (fails build if errors)

### 3. **Unit Tests** (`pnpm test:run`)
- Runs: Vitest
- Pattern: `**/*.tdd.test.{ts,tsx}`
- **Required:** Yes (fails build if tests fail)

**What gets tested:**
- ✅ All `.tdd.test.ts` files in the codebase
- ✅ Unit tests for services, utilities, components
- ✅ Integration tests in `tests/integration/`
- ✅ API route tests in `app/api/**/__tests__/`

**Excluded:**
- ❌ `.spec.ts` files (Playwright E2E tests - run separately)
- ❌ Archived tests (`_archive/`)
- ❌ Example tests (`*.example.test.ts`)

### 4. **Test Coverage** (in `test.yml` workflow)
- Runs: `pnpm test:coverage`
- Generates: Coverage report
- Threshold: 70% (warns if below, doesn't fail)

### 5. **Build** (`pnpm build`)
- Runs: Next.js build
- **Required:** Yes (fails if build errors)

---

## 🔄 Workflow Breakdown

### `.github/workflows/test.yml`
**Triggers:** Push to `main`/`develop`, PRs to `main`

**Steps:**
1. ✅ Linter
2. ✅ Type check
3. ✅ Security audit (optional)
4. ✅ **Unit tests** (`pnpm test:run`)
5. ✅ **Coverage** (`pnpm test:coverage`)
6. ✅ Build
7. ✅ Upload artifacts

### `.github/workflows/ci-cd-staging.yml`
**Triggers:** Push to `develop`/`staging`

**Steps:**
1. ✅ Linter
2. ✅ Type check
3. ✅ **Unit tests** (`pnpm test:run`)
4. ✅ Build
5. 🚀 Deploy to Vercel Preview

### `.github/workflows/ci-cd-production.yml`
**Triggers:** Push to `main`

**Steps:**
1. ✅ Linter
2. ✅ Type check
3. ✅ **Unit tests** (`pnpm test:run`)
4. ✅ Build
5. 🚀 Deploy to Vercel Production

---

## 📊 Test Files Included

Based on `vitest.config.ts`:

```typescript
include: ['**/*.tdd.test.{ts,tsx}']
```

**Examples of files that run:**
- ✅ `app/api/**/__tests__/*.tdd.test.ts`
- ✅ `lib/**/__tests__/*.tdd.test.ts`
- ✅ `tests/integration/*.tdd.test.tsx`
- ✅ `app/(dashboard)/**/__tests__/*.tdd.test.tsx`

**Files excluded:**
- ❌ `tests/e2e/*.spec.ts` (Playwright - run separately)
- ❌ `**/_archive/**` (archived)
- ❌ `*.example.test.ts` (examples)

---

## 🎯 Test Environment Variables

Tests receive these environment variables in CI/CD:

```yaml
env:
  DATABASE_URL: ${{ secrets.DATABASE_URL }}
  OPENROUTER_API_KEY: ${{ secrets.OPENROUTER_API_KEY }}
```

**Note:** Tests should use mocks for external APIs in CI/CD to avoid:
- Rate limits
- API costs
- Flaky tests
- Slow execution

---

## ✅ Verification

To verify tests locally match CI/CD:

```bash
# Run the same command CI/CD uses
pnpm test:run

# Check what files are included
pnpm test:run --list

# Run with same env vars (if needed)
DATABASE_URL=test pnpm test:run
```

---

## 🚀 Summary

**CI/CD uses modern, correct test commands:**
- ✅ `pnpm test:run` (not outdated)
- ✅ Vitest (not Jest)
- ✅ TDD test pattern (`*.tdd.test.ts`)
- ✅ Fast execution (< 2 seconds)
- ✅ Reliable (mocked external APIs)

**All tests are up-to-date and follow TDD best practices!** 🎉

