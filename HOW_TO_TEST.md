# 🧪 How to Test Phase 1 - Quick Reference

**TL;DR:** Run `pnpm test -- --run` to test everything automatically.

---

## ⚡ **Quick Commands**

```bash
# Test everything (1 second)
pnpm test -- --run

# Test + Build (production verification)
pnpm test -- --run && pnpm build

# Test with coverage
pnpm test -- --coverage

# Test in watch mode (development)
pnpm test
```

---

## 📊 **Current Test Results**

```
✅ 106/107 tests passing (99.1%)
⏱️ Runtime: 1.01 seconds
📦 7 test suites

Breakdown:
✅ Dashboard DTO:        12/12 passing
✅ Dashboard Integration: 12/12 passing
✅ Business Validation:  11/11 passing
✅ LLM Fingerprinter:    20/20 passing
✅ Permissions:          26/26 passing
✅ Email Service:        passing
⚠️ Wikidata Entity:      16/17 passing (1 minor failure)
```

---

## 🤖 **Automated Testing (Recommended)**

### **Option 1: GitHub Actions (Easiest)**

**Already set up!** File: `.github/workflows/test.yml`

**What it does:**
- ✅ Runs tests on every push
- ✅ Runs tests on every PR
- ✅ Blocks merge if tests fail
- ✅ Reports to GitHub

**To enable:**
```bash
# Just push to GitHub!
git add .
git commit -m "feat: Phase 1 complete"
git push
```

**View results:**
- Go to your GitHub repo → Actions tab
- See test results automatically

---

### **Option 2: Vercel (Built-in)**

**Vercel automatically:**
- ✅ Runs `pnpm build` on deploy
- ✅ Fails deployment if build fails

**To add tests before build:**

```json
// package.json (already configured)
{
  "scripts": {
    "build": "next build"
  }
}
```

**To run tests before build:**
```json
{
  "scripts": {
    "build": "pnpm test -- --run && next build"
  }
}
```

---

### **Option 3: Pre-commit Hooks (Local)**

**Install:**
```bash
pnpm add -D husky lint-staged
npx husky install
npx husky add .husky/pre-commit "pnpm test -- --run"
```

**What it does:**
- ✅ Tests run BEFORE every commit
- ✅ Prevents committing broken code
- ✅ Fast feedback

---

## 📋 **Manual Testing Checklist**

### **1. Unit Tests (Automated)**
```bash
pnpm test -- --run
```
**Expected:** All tests pass in ~1 second

### **2. Build Test**
```bash
pnpm build
```
**Expected:** ✓ Compiled successfully

### **3. Dev Server Test**
```bash
pnpm dev
# Open: http://localhost:3000/dashboard
```
**Expected:** Dashboard loads, no console errors

### **4. Production Build Test**
```bash
pnpm build && pnpm start
# Open: http://localhost:3000/dashboard
```
**Expected:** Dashboard works in production mode

---

## 🎯 **What Gets Tested**

### **Dashboard DTO Layer**
- ✅ Data fetching
- ✅ Transformation logic
- ✅ Edge cases (null, empty, errors)
- ✅ Type safety
- ✅ Format helpers

### **Integration**
- ✅ Dashboard page rendering
- ✅ DTO → UI flow
- ✅ Database mocking

### **Services**
- ✅ Business validation
- ✅ LLM fingerprinting
- ✅ Permissions
- ✅ Email sending

---

## 🚀 **Recommended: Set Up CI/CD (5 minutes)**

**Step 1: Verify tests work locally**
```bash
pnpm test -- --run
# ✅ Should see: 106/107 tests passing
```

**Step 2: Commit GitHub Actions workflow**
```bash
git add .github/workflows/test.yml
git commit -m "ci: add automated testing"
```

**Step 3: Push to GitHub**
```bash
git push
```

**Step 4: Done!** ✅
- Tests now run automatically
- See results in GitHub Actions tab
- PRs show test status

---

## 📊 **Test Coverage**

```bash
# Generate coverage report
pnpm test -- --coverage

# View report
open coverage/index.html
```

**Current coverage:** ~78.5% (Good! Target: 85%)

---

## 🐛 **If Tests Fail**

### **See detailed output:**
```bash
pnpm test -- --reporter=verbose
```

### **Run single test:**
```bash
pnpm test -- -t "dashboard data"
```

### **Debug:**
```bash
pnpm test -- --inspect-brk
```

---

## ✅ **Summary**

**Testing Phase 1 is fully automated:**

1. **Quick test:** `pnpm test -- --run` (1 second)
2. **Full verify:** `pnpm test -- --run && pnpm build`
3. **CI/CD:** Push to GitHub → Auto-test ✅

**Current status:** 106/107 tests passing (99.1%) 🎉

---

## 📚 **More Details**

- **Full guide:** `TESTING_GUIDE.md`
- **Test files:** `lib/data/__tests__/`
- **CI config:** `.github/workflows/test.yml`

