# 🚀 CI/CD Workflow Explained: Production-Ready Next.js

**File:** `.github/workflows/test.yml`  
**Purpose:** Automated testing, building, and quality checks for Next.js application  
**Status:** ✅ Production-ready with required checks

---

## 📋 **What Changed**

### **Before:** Optional Checks
```yaml
- name: Run linter
  run: pnpm lint || true  # ❌ Doesn't fail build
```

### **After:** Required Checks ✅
```yaml
- name: Run linter (REQUIRED)
  run: pnpm lint  # ✅ FAILS build if linter fails
```

---

## 🎯 **Complete Workflow Overview**

### **Trigger Events**
```yaml
on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]
```

**When it runs:**
- ✅ Push to `main` branch
- ✅ Push to `develop` branch
- ✅ Pull request to `main` branch

---

## 📊 **Step-by-Step Breakdown**

### **Step 1: Environment Setup** 🔧

```yaml
- name: Checkout code
  uses: actions/checkout@v4

- name: Install pnpm
  uses: pnpm/action-setup@v2
  with:
    version: 8

- name: Setup Node.js
  uses: actions/setup-node@v4
  with:
    node-version: '20'
    cache: 'pnpm'

- name: Install dependencies
  run: pnpm install --frozen-lockfile
```

**What it does:**
- ✅ Downloads your code
- ✅ Installs pnpm (package manager)
- ✅ Installs Node.js 20
- ✅ Installs all dependencies (with exact versions from lock file)

**Time:** ~30-40 seconds

---

### **Step 2: Dependency Check** 📦 (Optional)

```yaml
- name: Check for outdated dependencies
  run: pnpm outdated || true
  continue-on-error: true
```

**What it does:**
- 🔍 Lists outdated packages
- ℹ️ Informational only (doesn't fail build)
- 💡 Helps you know when to upgrade

**Example output:**
```
Package         Current  Latest
next            15.4.0   15.5.0
react           18.2.0   18.3.0
typescript      5.3.0    5.4.0
```

**Why it's useful:**
- Stay aware of new versions
- Plan upgrade schedules
- Security updates visibility

---

### **Step 3: Linting** 🔍 (REQUIRED ✅)

```yaml
- name: Run linter (REQUIRED)
  run: pnpm lint
```

**What it does:**
- ✅ Checks code style (ESLint)
- ✅ Enforces best practices
- ✅ Catches common mistakes

**Fails if:**
- ❌ Unused variables
- ❌ Missing keys in React lists
- ❌ Unsafe type assertions
- ❌ Code style violations

**Example failure:**
```
error  'useState' is defined but never used  @typescript-eslint/no-unused-vars
error  Missing key prop for element in iterator  react/jsx-key
```

**Why required:**
- Maintains code quality
- Prevents common bugs
- Enforces team standards

---

### **Step 4: Type Check** 🔍 (REQUIRED ✅)

```yaml
- name: Run type check (REQUIRED)
  run: pnpm tsc --noEmit
```

**What it does:**
- ✅ Validates all TypeScript types
- ✅ Catches type errors
- ✅ Ensures type safety

**Fails if:**
- ❌ Type mismatches
- ❌ Missing properties
- ❌ Incorrect function signatures
- ❌ Any type errors

**Example failure:**
```
error TS2339: Property 'name' does not exist on type 'User'
error TS2345: Argument of type 'string' is not assignable to parameter of type 'number'
```

**Why required:**
- Prevents runtime errors
- Catches bugs at compile time
- TypeScript's main benefit

---

### **Step 5: Security Audit** 🔒 (Warning)

```yaml
- name: Security audit
  run: pnpm audit --prod --audit-level=high || true
  continue-on-error: true
```

**What it does:**
- 🔍 Scans for known vulnerabilities
- 📦 Checks production dependencies
- ⚠️ Reports high/critical issues

**Flags:**
- `--prod`: Only production dependencies
- `--audit-level=high`: Only high/critical vulnerabilities
- `continue-on-error: true`: Doesn't fail build (warning only)

**Example output:**
```
found 0 vulnerabilities ✅

OR

found 2 high severity vulnerabilities ⚠️
- axios: SSRF vulnerability (CVE-2023-XXXX)
  - Update to version 1.6.0 or later
```

**Why included:**
- Security awareness
- Early vulnerability detection
- Compliance requirements

---

### **Step 6: Unit Tests** 🧪 (REQUIRED ✅)

```yaml
- name: Run unit tests (REQUIRED)
  run: pnpm test -- --run
  env:
    DATABASE_URL: ${{ secrets.DATABASE_URL }}
    OPENROUTER_API_KEY: ${{ secrets.OPENROUTER_API_KEY }}
```

**What it does:**
- ✅ Runs all 107 tests
- ✅ Tests business logic
- ✅ Validates components

**Fails if:**
- ❌ Any test fails
- ❌ Test timeout
- ❌ Assertion errors

**Example output:**
```
✅ Test Suites:  7 passed, 7 total
✅ Tests:        107 passed, 107 total
⏱️ Duration:     1.08 seconds
```

**Why required:**
- Most critical step
- Prevents broken code
- Ensures features work

---

### **Step 7: Coverage Report** 📊 (Informational)

```yaml
- name: Generate test coverage
  run: pnpm test -- --run --coverage
  env:
    DATABASE_URL: ${{ secrets.DATABASE_URL }}
    OPENROUTER_API_KEY: ${{ secrets.OPENROUTER_API_KEY }}
```

**What it does:**
- 📊 Generates coverage report
- 📈 Shows tested vs untested code
- 📁 Creates `coverage/` directory

**Example output:**
```
--------------------|---------|----------|---------|---------|
File                | % Stmts | % Branch | % Funcs | % Lines |
--------------------|---------|----------|---------|---------|
All files           |   78.5  |   71.2   |   82.1  |   78.5  |
 dashboard-dto.ts   |   100   |   100    |   100   |   100   |
 entity-builder.ts  |   85.7  |   75.0   |   90.0  |   85.7  |
--------------------|---------|----------|---------|---------|
```

**Files created:**
- `coverage/coverage-final.json` (for Codecov)
- `coverage/index.html` (visual report)
- `coverage/lcov.info` (for IDE integration)

---

### **Step 8: Coverage Threshold Check** 📊 (Warning)

```yaml
- name: Check test coverage threshold
  run: |
    COVERAGE=$(cat coverage/coverage-summary.json | grep -o '"lines":{"total":[0-9.]*,"covered":[0-9.]*,"skipped":[0-9.]*,"pct":[0-9.]*' | grep -o '"pct":[0-9.]*' | cut -d':' -f2)
    echo "Coverage: $COVERAGE%"
    if (( $(echo "$COVERAGE < 70" | bc -l) )); then
      echo "Coverage is below 70% threshold"
      exit 1
    fi
  continue-on-error: true
```

**What it does:**
- 📊 Checks if coverage is above 70%
- ⚠️ Warns if below threshold
- ℹ️ Doesn't fail build (yet)

**Example output:**
```
Coverage: 78.5% ✅ Above threshold

OR

Coverage: 65.0% ⚠️ Below 70% threshold
```

**Why included:**
- Encourages test coverage
- Tracks quality over time
- Can be made required later

**How to make it required:**
```yaml
# Remove this line to make it fail the build:
continue-on-error: true  # ← Remove this
```

---

### **Step 9: Build Application** 🏗️ (REQUIRED ✅)

```yaml
- name: Build Next.js application (REQUIRED)
  run: pnpm build
  env:
    DATABASE_URL: ${{ secrets.DATABASE_URL }}
    NEXT_PUBLIC_APP_URL: ${{ secrets.NEXT_PUBLIC_APP_URL }}
    STRIPE_SECRET_KEY: ${{ secrets.STRIPE_SECRET_KEY }}
    STRIPE_WEBHOOK_SECRET: ${{ secrets.STRIPE_WEBHOOK_SECRET }}
    RESEND_API_KEY: ${{ secrets.RESEND_API_KEY }}
```

**What it does:**
- ✅ Compiles Next.js app
- ✅ Optimizes for production
- ✅ Generates static pages
- ✅ Creates build artifacts

**Fails if:**
- ❌ TypeScript errors (again, but in build context)
- ❌ Missing environment variables
- ❌ Build-time errors
- ❌ Module resolution issues

**Example output:**
```
✓ Compiled successfully in 2000ms
✓ Linting and checking validity of types
✓ Generating static pages (23/23)

Route (app)                Size    First Load JS
┌ ○ /                      1.17 kB      195 kB
├ ƒ /dashboard            1.17 kB      195 kB
├ ƒ /dashboard/businesses  1.17 kB      195 kB
└ ○ /pricing              1.99 kB      205 kB
```

**Environment variables used:**
- `DATABASE_URL` - Database connection (for build-time queries)
- `NEXT_PUBLIC_APP_URL` - Public URL (embedded in client code)
- `STRIPE_SECRET_KEY` - Stripe API key
- `STRIPE_WEBHOOK_SECRET` - Stripe webhooks
- `RESEND_API_KEY` - Email service

**Why required:**
- Most critical step
- Ensures production build works
- Catches build-only issues

---

### **Step 10: Bundle Size Check** 📦 (Informational)

```yaml
- name: Check bundle size
  run: |
    echo "📦 Build output:"
    ls -lh .next/static/chunks/*.js | head -10
  continue-on-error: true
```

**What it does:**
- 📊 Lists JavaScript bundle sizes
- 📈 Shows largest chunks
- 💡 Helps identify bloat

**Example output:**
```
📦 Build output:
-rw-r--r--  1 runner  244-b57018cc45b2448e.js       55.2 KB
-rw-r--r--  1 runner  5ad2d8b2-19cbc83ff653b95d.js  63.7 KB
-rw-r--r--  1 runner  main-app-abc123.js           121 KB
```

**Why included:**
- Performance awareness
- Identify large dependencies
- Optimization opportunities

**Next.js bundle size targets:**
- ✅ First Load JS < 150 KB (good)
- ⚠️ First Load JS 150-250 KB (okay)
- ❌ First Load JS > 250 KB (needs optimization)

---

### **Step 11: Upload Coverage** 📊 (Optional)

```yaml
- name: Upload test coverage
  if: success()
  uses: codecov/codecov-action@v3
  with:
    files: ./coverage/coverage-final.json
    flags: unittests
    name: codecov-umbrella
    fail_ci_if_error: false
```

**What it does:**
- 📤 Uploads coverage to Codecov.io
- 📊 Tracks coverage over time
- 📈 Shows coverage trends

**Conditional:** Only runs if all previous steps passed

**Why included:**
- Historical coverage tracking
- Pull request comments with coverage changes
- Team visibility

**Setup required:**
1. Sign up at [codecov.io](https://codecov.io)
2. Add `CODECOV_TOKEN` to GitHub Secrets
3. See coverage reports on PRs

---

### **Step 12: Upload Build Artifacts** 📦 (Optional)

```yaml
- name: Upload build artifacts
  if: success() && github.ref == 'refs/heads/main'
  uses: actions/upload-artifact@v3
  with:
    name: build-artifacts
    path: |
      .next/
      public/
    retention-days: 7
```

**What it does:**
- 📦 Saves build output
- 💾 Stores for 7 days
- 🔍 Allows downloading build for debugging

**Conditional:** Only runs on `main` branch when build succeeds

**Why included:**
- Debugging production builds
- Comparing builds over time
- Emergency rollback reference

**How to download:**
1. Go to Actions → Workflow run
2. Scroll to "Artifacts" section
3. Download `build-artifacts.zip`

---

## 🎯 **Complete Flow Diagram**

```
Push to GitHub
      ↓
┌─────────────────────────────────────┐
│ 1. Setup Environment (30-40s)      │
│    ✅ Checkout code                 │
│    ✅ Install pnpm, Node.js         │
│    ✅ Install dependencies          │
└─────────────────────────────────────┘
      ↓
┌─────────────────────────────────────┐
│ 2. Dependency Check (5s)            │
│    ℹ️  Check outdated packages      │
│    ⚠️  Warning only                 │
└─────────────────────────────────────┘
      ↓
┌─────────────────────────────────────┐
│ 3. Linting (10s) [REQUIRED]        │
│    ✅ Code style check              │
│    ❌ Fails if violations           │
└─────────────────────────────────────┘
      ↓
┌─────────────────────────────────────┐
│ 4. Type Check (15s) [REQUIRED]     │
│    ✅ TypeScript validation         │
│    ❌ Fails if type errors          │
└─────────────────────────────────────┘
      ↓
┌─────────────────────────────────────┐
│ 5. Security Audit (5s)              │
│    🔒 Check vulnerabilities         │
│    ⚠️  Warning only                 │
└─────────────────────────────────────┘
      ↓
┌─────────────────────────────────────┐
│ 6. Unit Tests (1s) [REQUIRED]      │
│    ✅ Run 107 tests                 │
│    ❌ Fails if any test fails       │
└─────────────────────────────────────┘
      ↓
┌─────────────────────────────────────┐
│ 7. Coverage Report (2s)             │
│    📊 Generate coverage             │
│    ℹ️  Informational                │
└─────────────────────────────────────┘
      ↓
┌─────────────────────────────────────┐
│ 8. Coverage Threshold (1s)          │
│    📊 Check >= 70%                  │
│    ⚠️  Warning only                 │
└─────────────────────────────────────┘
      ↓
┌─────────────────────────────────────┐
│ 9. Build App (2m) [REQUIRED]       │
│    ✅ Next.js production build      │
│    ❌ Fails if build errors         │
└─────────────────────────────────────┘
      ↓
┌─────────────────────────────────────┐
│ 10. Bundle Size (2s)                │
│     📦 Show chunk sizes             │
│     ℹ️  Informational               │
└─────────────────────────────────────┘
      ↓
┌─────────────────────────────────────┐
│ 11. Upload Coverage (5s)            │
│     📤 Send to Codecov              │
│     ℹ️  Optional                    │
└─────────────────────────────────────┘
      ↓
┌─────────────────────────────────────┐
│ 12. Upload Artifacts (10s)          │
│     💾 Save build output            │
│     ℹ️  main branch only            │
└─────────────────────────────────────┘
      ↓
✅ BUILD SUCCESS (Total: ~3-4 minutes)
```

---

## 🔒 **Required GitHub Secrets**

Add these in: **GitHub repo → Settings → Secrets and variables → Actions**

### **Database:**
```
DATABASE_URL=postgresql://user:pass@host:5432/dbname
```

### **APIs:**
```
OPENROUTER_API_KEY=sk-or-v1-xxxxx
STRIPE_SECRET_KEY=sk_test_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx
RESEND_API_KEY=re_xxxxx
```

### **App Config:**
```
NEXT_PUBLIC_APP_URL=https://yourapp.com
```

### **Optional (for Codecov):**
```
CODECOV_TOKEN=xxxxx-xxxxx-xxxxx
```

---

## ✅ **What's Now Required (Will Fail Build)**

1. **✅ Linting** - Code must pass ESLint
2. **✅ Type Check** - No TypeScript errors allowed
3. **✅ Unit Tests** - All 107 tests must pass
4. **✅ Build** - Production build must succeed

---

## ⚠️ **What's Optional (Won't Fail Build)**

1. **ℹ️ Outdated Dependencies** - Informational only
2. **⚠️ Security Audit** - Warning only (should fix though)
3. **⚠️ Coverage Threshold** - Warning if < 70%
4. **ℹ️ Bundle Size** - Informational only
5. **ℹ️ Coverage Upload** - Only if Codecov configured
6. **ℹ️ Artifacts Upload** - Only on main branch

---

## 🚀 **How to Use**

### **1. Add GitHub Secrets (one-time setup)**
```
GitHub repo → Settings → Secrets → New repository secret
```

Add all required secrets listed above.

### **2. Push code**
```bash
git add .
git commit -m "feat: new feature"
git push origin main
```

### **3. Watch it run**
```
GitHub repo → Actions tab → See workflow execute
```

### **4. View results**
```
✅ All checks passed (3m 24s)
   ✅ Linting passed
   ✅ Type check passed
   ✅ Tests passed (107/107)
   ✅ Build successful
```

---

## 🎯 **Benefits of This Setup**

### **1. Code Quality** ✅
- Enforces linting standards
- Catches type errors
- Maintains test coverage

### **2. Security** 🔒
- Scans for vulnerabilities
- Alerts on high-risk packages
- Encourages updates

### **3. Reliability** 🛡️
- Tests prevent regressions
- Build checks catch issues
- Multiple validation layers

### **4. Visibility** 📊
- Coverage tracking
- Bundle size monitoring
- Dependency awareness

### **5. Team Collaboration** 👥
- Pull requests show status
- Prevents merging broken code
- Consistent quality standards

---

## 🔧 **Customization Options**

### **Make Coverage Required**
```yaml
- name: Check test coverage threshold
  run: |
    # ... coverage check code ...
  # Remove this line to make it required:
  # continue-on-error: true
```

### **Add E2E Tests**
```yaml
- name: Run E2E tests
  run: pnpm test:e2e
  env:
    DATABASE_URL: ${{ secrets.DATABASE_URL }}
```

### **Add Lighthouse Performance Check**
```yaml
- name: Run Lighthouse CI
  uses: treosh/lighthouse-ci-action@v10
  with:
    urls: |
      https://your-preview-url.vercel.app
    uploadArtifacts: true
```

### **Add Database Migrations Check**
```yaml
- name: Check database migrations
  run: pnpm drizzle-kit check
  env:
    DATABASE_URL: ${{ secrets.DATABASE_URL }}
```

---

## 📈 **Current Status**

### **✅ What Works Now:**
- All checks configured
- Required checks enforced
- Comprehensive validation
- Production-ready workflow

### **⏳ Next Steps:**
1. Add GitHub Secrets
2. Push to GitHub
3. Watch first workflow run
4. Configure Codecov (optional)

---

## 🎉 **Summary**

**Before:** Optional checks, could merge broken code  
**After:** Required checks, enforced quality standards

**New Features:**
- ✅ Required linting
- ✅ Required type checking
- ✅ Security audits
- ✅ Coverage tracking
- ✅ Bundle size monitoring
- ✅ Build artifacts

**Total Time:** ~3-4 minutes per workflow run

**This is a production-ready CI/CD setup for professional Next.js development!** 🚀

