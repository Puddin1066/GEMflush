# TDD and Breaking Tests: What to Do When Tests Fail

**Purpose**: Practical guide for handling test failures during TDD-led development  
**Date**: January 2025  
**Status**: 🔴 **ESSENTIAL REFERENCE** - Read this when tests break

---

## 🎯 The Core Principle

**Breaking tests during TDD is EXPECTED and CORRECT!**

```
🔴 RED Phase = Tests MUST break (this is the specification)
🟢 GREEN Phase = Fix tests by implementing code (not by changing tests)
🔵 REFACTOR Phase = Tests stay green while improving code
```

**You do NOT stop TDD when tests break. Breaking tests IS the TDD process.**

---

## ✅ Expected Test Failures (Don't Fix These!)

### Scenario 1: RED Phase - Writing New Tests

**What happens:**
```typescript
// Step 1: Write test for function that doesn't exist
it('processes business data', () => {
  const result = processBusiness({ name: 'Test' }); // Function doesn't exist!
  expect(result.status).toBe('processed');
});
```

**Watch mode shows:**
```
❌ FAIL  processBusiness > processes business data
ReferenceError: processBusiness is not defined
```

**What to do:**
- ✅ **This is CORRECT!** Test should fail
- ✅ **Continue TDD** - Write implementation next (GREEN phase)
- ❌ **Don't stop** - This is expected behavior
- ❌ **Don't fix the test** - Fix the code instead

**Action:** Write the implementation to make it pass.

---

### Scenario 2: RED Phase - Changing Behavior

**What happens:**
```typescript
// Step 1: Write test for new behavior
it('handles errors gracefully', () => {
  expect(() => processBusiness(null)).toThrow('Invalid input');
});
```

**Watch mode shows:**
```
❌ FAIL  processBusiness > handles errors gracefully
Error: processBusiness did not throw
```

**What to do:**
- ✅ **This is CORRECT!** Test specifies new behavior
- ✅ **Continue TDD** - Implement error handling (GREEN phase)
- ❌ **Don't stop** - This is the RED phase working correctly

**Action:** Implement error handling to make it pass.

---

## 🚨 Unexpected Test Failures (Fix These!)

### Scenario 3: Regression - Other Tests Break

**What happens:**
```typescript
// You're working on processBusiness
// But other unrelated tests start failing
```

**Watch mode shows:**
```
❌ FAIL  processBusiness > processes business data
❌ FAIL  otherFeature > existing test (this wasn't supposed to break!)
```

**What to do:**
- ⚠️ **This is a REGRESSION** - You broke existing functionality
- ⚠️ **Stop and assess** - Did your change break something?
- ✅ **Fix the regression** - Either:
  1. Revert your change if it was wrong
  2. Fix the implementation to not break existing tests
  3. Update the broken test if behavior change was intentional

**Action:** Fix the regression before continuing.

---

### Scenario 4: Test Infrastructure Issues

**What happens:**
```typescript
// Tests fail due to setup/mock issues, not your code
```

**Watch mode shows:**
```
❌ FAIL  Multiple tests
Error: Cannot find module '@/lib/test-helpers'
```

**What to do:**
- ⚠️ **This is an INFRASTRUCTURE issue** - Not your TDD code
- ⚠️ **Fix the infrastructure** - Missing mocks, setup files, etc.
- ✅ **Then continue TDD** - Once infrastructure is fixed

**Action:** Fix test infrastructure, then continue TDD.

---

## 🎯 Practical Decision Tree

### When Tests Break During TDD

```
Is this the test I just wrote? (RED phase)
├─ YES → ✅ EXPECTED! Continue to GREEN phase
│         Don't stop, don't fix the test
│         Write implementation instead
│
└─ NO → Is this a test I didn't touch?
        ├─ YES → ⚠️ REGRESSION! Stop and fix
        │         Your change broke existing functionality
        │         Fix implementation or revert change
        │
        └─ NO → Is this a test infrastructure issue?
                ├─ YES → ⚠️ FIX INFRASTRUCTURE
                │         Missing mocks, setup, etc.
                │         Fix then continue TDD
                │
                └─ NO → ⚠️ INVESTIGATE
                          Something unexpected happened
                          Check error message, fix issue
```

---

## 💡 Practical Workflow: Handling Breaking Tests

### Workflow 1: Expected Failure (RED Phase)

```bash
# Terminal: Watch mode running
$ pnpm test:watch

# You write a new test
it('validates input', () => {
  expect(validateBusiness(null)).toThrow();
});

# Save → Watch shows:
❌ FAIL  validates input
Error: validateBusiness did not throw

# ✅ THIS IS CORRECT! Continue TDD:
# 1. Don't stop watch mode
# 2. Don't fix the test
# 3. Write implementation to make it pass
```

**Action:** Write implementation → Save → Test passes → Continue

---

### Workflow 2: Regression (Unexpected Failure)

```bash
# Terminal: Watch mode running
$ pnpm test:watch

# You modify processBusiness
export function processBusiness(input) {
  // Your change
  return { status: 'processed' };
}

# Save → Watch shows:
❌ FAIL  processBusiness > processes business data
❌ FAIL  otherFeature > existing functionality (REGRESSION!)

# ⚠️ REGRESSION DETECTED! Stop and assess:
# 1. Did your change break existing functionality?
# 2. Check what otherFeature test expects
# 3. Fix your implementation to not break it
```

**Action:** 
1. **Stop** - Assess the regression
2. **Fix** - Either revert or fix implementation
3. **Verify** - All tests pass
4. **Continue** - Resume TDD

---

### Workflow 3: Multiple Failures (Focus Strategy)

```bash
# Terminal: Watch mode shows multiple failures
❌ FAIL  test1
❌ FAIL  test2
❌ FAIL  test3

# Strategy: Focus on one at a time
# Press 'f' in watch mode → Only failed tests run
# Or filter: Press 'p' → Type test name pattern
```

**Action:**
1. **Use watch mode filter** - Press `f` to run only failed tests
2. **Focus on one** - Fix one test at a time
3. **Verify** - Check it passes before moving to next
4. **Continue** - Work through failures systematically

---

## 🛠️ Watch Mode Commands for Breaking Tests

### When Tests Break

| Situation | Action | Watch Command |
|-----------|--------|---------------|
| Expected failure (RED) | Continue TDD | Just keep coding |
| Regression detected | Focus on failures | Press `f` (failed tests only) |
| Too many failures | Filter to one file | Press `p` then type filename |
| Need to see details | Verbose output | Check terminal for full error |
| Want to rerun | Manual rerun | Press `r` |

### Using Failed Test Filter

```bash
# Watch mode shows failures
❌ FAIL  test1
❌ FAIL  test2

# Press 'f' in watch mode
# Only failed tests re-run (faster feedback)

# Fix one test
# Save → Only that test runs
# Verify it passes
# Move to next failure
```

---

## 📋 Decision Checklist

When tests break during TDD, ask:

- [ ] **Is this the test I just wrote?**
  - ✅ YES → Expected failure, continue to GREEN phase
  - ❌ NO → Continue checklist

- [ ] **Did I modify code that this test depends on?**
  - ✅ YES → Likely regression, fix implementation
  - ❌ NO → Continue checklist

- [ ] **Is this a test infrastructure issue?**
  - ✅ YES → Fix infrastructure (mocks, setup)
  - ❌ NO → Continue checklist

- [ ] **Is the error message clear?**
  - ✅ YES → Fix based on error
  - ❌ NO → Investigate further

- [ ] **Are multiple unrelated tests failing?**
  - ✅ YES → Check for infrastructure issue
  - ❌ NO → Focus on specific failure

---

## 🎯 Key Principles

### 1. RED Phase Failures Are Good

**Breaking tests in RED phase = Specification working correctly**

```typescript
// Test fails → This is the specification
it('does something', () => {
  expect(myFunction()).toBe('expected'); // Fails - function doesn't exist
});

// ✅ This is CORRECT! Don't stop, don't fix the test
// ✅ Write implementation to make it pass
```

### 2. Regressions Need Immediate Attention

**Breaking existing tests = Bug introduced**

```typescript
// You change processBusiness
// Existing test for otherFeature breaks
// ⚠️ This is a REGRESSION - fix it!
```

### 3. One Failure at a Time

**Focus strategy:**
- Use watch mode filter (`f` for failed, `p` for pattern)
- Fix one test → Verify it passes → Move to next
- Don't try to fix everything at once

### 4. Don't Change Tests to Make Them Pass

**Wrong approach:**
```typescript
// ❌ DON'T DO THIS
it('processes business', () => {
  // Change test to match broken implementation
  expect(result.status).toBe('error'); // Wrong!
});
```

**Correct approach:**
```typescript
// ✅ DO THIS
// Keep test as specification
it('processes business', () => {
  expect(result.status).toBe('processed'); // Keep this
});

// Fix the IMPLEMENTATION to make test pass
export function processBusiness(input) {
  // Fix implementation, not test
  return { status: 'processed' };
}
```

---

## 🚨 Red Flags: When to Stop TDD

### Stop and Fix When:

1. **Multiple unrelated tests break** → Regression detected
2. **Test infrastructure fails** → Setup/mock issues
3. **Tests become flaky** → Isolation problems
4. **Error messages unclear** → Need investigation

### Don't Stop When:

1. **Test you just wrote fails** → This is RED phase (expected!)
2. **One test fails during implementation** → Normal TDD cycle
3. **Tests fail due to missing implementation** → Write implementation (GREEN phase)

---

## 💡 Pro Tips

### Tip 1: Use Watch Mode Failed Test Filter

```bash
# When multiple tests fail
# Press 'f' in watch mode
# Only failed tests run (faster feedback loop)
```

### Tip 2: Focus on One File at a Time

```bash
# Start watch for specific file
pnpm test:watch lib/services/__tests__/my-feature.tdd.test.ts

# Only this file's tests run
# Easier to focus, less noise
```

### Tip 3: Check Test Summary

```bash
# Always check the summary line
Test Files  1 failed | 2 passed (3)
Tests       2 failed | 5 passed (7)

# If "failed" count increases unexpectedly → Regression!
# If "failed" count decreases → Making progress!
```

### Tip 4: Don't Panic About Red

**Red in watch mode is normal during TDD:**
- 🔴 RED phase = Tests fail (expected!)
- 🟢 GREEN phase = Tests pass (goal!)
- 🔵 REFACTOR = Tests stay green

**Red is only a problem if:**
- It's a regression (broke existing tests)
- It's infrastructure (setup issues)
- It persists after GREEN phase

---

## 📚 Example: Complete TDD Session with Breaking Tests

### Step 1: Write Test (RED) - Expected Failure

```typescript
// lib/services/__tests__/my-feature.tdd.test.ts
it('validates input', () => {
  expect(() => processBusiness(null)).toThrow('Invalid input');
});
```

**Save → Watch shows:**
```
❌ FAIL  validates input
Error: processBusiness did not throw
```

**✅ This is CORRECT! Continue TDD.**

### Step 2: Write Implementation (GREEN)

```typescript
// lib/services/my-feature.ts
export function processBusiness(input: any) {
  if (!input) {
    throw new Error('Invalid input');
  }
  return { status: 'processed' };
}
```

**Save → Watch shows:**
```
✓ validates input

Test Files  1 passed (1)
Tests       1 passed (1)
```

**✅ Test passes! Continue TDD.**

### Step 3: Add Another Test (RED Again)

```typescript
it('processes valid input', () => {
  const result = processBusiness({ name: 'Test' });
  expect(result.status).toBe('processed');
});
```

**Save → Watch shows:**
```
✓ validates input
✓ processes valid input

Test Files  1 passed (1)
Tests       2 passed (2)
```

**✅ Both tests pass! Continue TDD.**

### Step 4: Regression Detected (Stop and Fix)

```typescript
// You modify processBusiness
export function processBusiness(input: any) {
  // Your change
  if (!input) {
    return { status: 'error' }; // Changed behavior!
  }
  return { status: 'processed' };
}
```

**Save → Watch shows:**
```
❌ FAIL  validates input (REGRESSION!)
Error: processBusiness did not throw

Test Files  1 failed (1)
Tests       1 failed | 1 passed (2)
```

**⚠️ REGRESSION! Stop and fix:**
- Your change broke existing test
- Fix implementation to maintain behavior
- Or update test if behavior change was intentional

---

## ✅ Summary

### When Tests Break During TDD:

1. **Expected failure (RED phase)** → ✅ Continue TDD, write implementation
2. **Regression (broke existing)** → ⚠️ Stop, fix implementation
3. **Infrastructure issue** → ⚠️ Fix setup, then continue
4. **Multiple failures** → Use watch mode filter, focus on one

### Key Principle:

**Breaking tests IS the TDD process. You don't stop TDD when tests break - you fix them by writing code (GREEN phase).**

**Only stop when:**
- You broke existing tests (regression)
- Test infrastructure is broken
- You need to investigate unclear errors

---

## 📚 Related Documentation

- [VITEST_WATCH_TDD_WORKFLOW.md](./VITEST_WATCH_TDD_WORKFLOW.md) - Watch mode workflow
- [TRUE_TDD_PROCESS.md](./TRUE_TDD_PROCESS.md) - TDD methodology
- [TDD_STRATEGY.md](./TDD_STRATEGY.md) - Comprehensive TDD guide

---

**Remember**: Red in watch mode during RED phase is GOOD. Red from regressions is BAD. Know the difference!

