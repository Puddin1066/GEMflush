# TDD Watch Mode - Handling Broken Tests

**Purpose**: Guide for fixing broken tests in watch mode during TDD  
**Status**: 🟢 Active Reference  
**When to Use**: Tests break during TDD workflow (RED → GREEN → REFACTOR)

---

## 🎯 Quick Decision Tree

When tests break in watch mode, follow this decision tree:

```
Tests Break
    ↓
Is this expected? (RED phase - test written first)
    ├─ YES → ✅ This is correct! Continue to GREEN phase
    └─ NO → Continue below
        ↓
What phase are you in?
    ├─ GREEN phase → Fix implementation to pass test
    ├─ REFACTOR phase → Tests should stay green! Fix refactoring
    └─ After TDD → Investigate what broke
```

---

## 🔴 Scenario 1: Expected Failure (RED Phase)

**This is CORRECT behavior!**

### What You See:
```
❌ FAIL  lib/services/__tests__/my-feature.test.ts > creates business
ReferenceError: functionThatDoesNotExist is not defined
```

### What to Do:
✅ **Nothing! This is expected.**

You just wrote a test for functionality that doesn't exist yet. This is the RED phase of TDD.

**Next Step**: Proceed to GREEN phase - write minimal implementation.

---

## 🟢 Scenario 2: Test Fails After Implementation (GREEN Phase)

**Your implementation doesn't satisfy the test.**

### What You See:
```
❌ FAIL  lib/services/__tests__/my-feature.test.ts > creates business
AssertionError: expected undefined to be "Test Business"
  Expected: "Test Business"
  Received: undefined
```

### What to Do:

#### Step 1: Read the Error Message
- What was expected?
- What was received?
- Which assertion failed?

#### Step 2: Check Your Implementation
```typescript
// Test expects:
expect(business.name).toBe('Test Business');

// Your implementation might be:
export function createBusiness(data) {
  return { id: 1 }; // ❌ Missing name!
}

// Fix:
export function createBusiness(data) {
  return { id: 1, name: data.name }; // ✅
}
```

#### Step 3: Fix Implementation
- Add missing return value
- Fix logic error
- Return correct data structure

#### Step 4: Watch Mode Re-runs Automatically
- Save the file
- Watch mode detects change
- Tests re-run
- Should pass now ✅

---

## 🔵 Scenario 3: Tests Break During Refactoring

**Tests should stay green during refactoring!**

### What You See:
```
❌ FAIL  lib/services/__tests__/my-feature.test.ts > creates business
TypeError: Cannot read property 'name' of undefined
```

### What to Do:

#### Step 1: Stop and Assess
**CRITICAL**: During refactoring, tests MUST stay green. If they break, you've introduced a bug.

#### Step 2: Identify What Broke
```typescript
// Before refactoring (tests passing):
export function createBusiness(data) {
  return { id: 1, name: data.name };
}

// After refactoring (tests broken):
export function createBusiness(data) {
  const business = buildBusinessObject(data); // ❌ What does this return?
  return business;
}
```

#### Step 3: Fix the Refactoring
- Check what your refactored code returns
- Ensure it matches the original behavior
- Verify all return values

#### Step 4: Use Git to Compare
```bash
# See what changed
git diff lib/services/my-feature.ts

# If needed, revert and refactor more carefully
git checkout lib/services/my-feature.ts
```

#### Step 5: Refactor Incrementally
- Make small changes
- Save frequently
- Watch tests stay green
- If they break, undo that change

---

## 🟡 Scenario 4: Other Tests Break After Your Changes

**Your changes affected other functionality.**

### What You See:
```
❌ FAIL  lib/services/__tests__/other-feature.test.ts > processes business
TypeError: executeBusinessFlow is not a function
```

### What to Do:

#### Step 1: Identify the Breaking Change
- What file did you modify?
- What function/export changed?
- Which tests are failing?

#### Step 2: Check Your Changes
```typescript
// Did you rename a function?
export function executeBusinessFlow() { } // Old name
export function processBusinessFlow() { } // New name ❌

// Did you change function signature?
export function createBusiness(data: BusinessData) { } // Old
export function createBusiness(data: Partial<BusinessData>) { } // New ❌

// Did you remove an export?
// export function helperFunction() { } // Removed ❌
```

#### Step 3: Fix the Breaking Change

**Option A: Revert the Change**
```bash
# If change wasn't necessary
git checkout lib/services/my-feature.ts
```

**Option B: Update All Callers**
```typescript
// Update all places that use the changed function
// lib/services/other-feature.ts
import { processBusinessFlow } from './my-feature'; // Updated import
```

**Option C: Keep Backward Compatibility**
```typescript
// Keep old function for compatibility
export function executeBusinessFlow() {
  return processBusinessFlow(); // New implementation
}
```

#### Step 4: Run All Tests
```bash
# In watch mode, press 'a' to run all tests
# Or run full suite
pnpm test:run
```

---

## 🔧 Watch Mode Commands for Troubleshooting

### When Tests Break, Use These Commands:

#### 1. Run Only Failed Tests
Press `f` in watch mode to re-run only failed tests:
```
Press 'f' → Only failed tests run (faster feedback)
```

#### 2. Filter by File Pattern
Press `p` to filter by filename:
```
Press 'p' → Enter pattern: "business-execution"
→ Only tests matching pattern run
```

#### 3. Filter by Test Name
Press `t` to filter by test name:
```
Press 't' → Enter pattern: "creates business"
→ Only tests matching pattern run
```

#### 4. Rerun All Tests
Press `r` to rerun all tests:
```
Press 'r' → All tests run again
```

---

## 📋 Step-by-Step Troubleshooting Process

### When Tests Break:

1. **Read the Error Message**
   ```
   ❌ What test failed?
   ❌ What was expected?
   ❌ What was received?
   ❌ What's the error type? (AssertionError, TypeError, ReferenceError)
   ```

2. **Identify the Phase**
   - RED phase? → Expected, continue
   - GREEN phase? → Fix implementation
   - REFACTOR phase? → Fix refactoring
   - After TDD? → Investigate

3. **Check the Code**
   - Open the failing test file
   - Open the implementation file
   - Compare expected vs actual

4. **Make Minimal Fix**
   - Fix only what's needed
   - Don't add extra features
   - Keep changes small

5. **Watch Tests Re-run**
   - Save the file
   - Watch mode auto-runs
   - Check if tests pass

6. **If Still Failing**
   - Read error again
   - Check for other issues
   - Use debugger if needed

---

## 🐛 Common Issues and Fixes

### Issue 1: Function Not Defined

**Error:**
```
ReferenceError: functionThatDoesNotExist is not defined
```

**Fix:**
```typescript
// Export the function
export function functionThatDoesNotExist() { }

// Or import it
import { functionThatDoesNotExist } from './other-file';
```

---

### Issue 2: Wrong Return Type

**Error:**
```
AssertionError: expected undefined to be "Test Business"
```

**Fix:**
```typescript
// Make sure function returns the expected value
export function createBusiness(data) {
  return { name: data.name }; // ✅ Return the value
}
```

---

### Issue 3: Mock Not Set Up

**Error:**
```
TypeError: Cannot read property 'mockResolvedValue' of undefined
```

**Fix:**
```typescript
// Set up the mock properly
vi.mock('@/lib/db/queries', () => ({
  createBusiness: vi.fn(), // ✅ Mock must be defined
}));
```

---

### Issue 4: Async Not Handled

**Error:**
```
AssertionError: expected Promise to be "result"
```

**Fix:**
```typescript
// Await async functions
it('creates business', async () => {
  const result = await createBusiness(data); // ✅ Add await
  expect(result.name).toBe('Test Business');
});
```

---

### Issue 5: Type Mismatch

**Error:**
```
TypeError: Cannot read property 'name' of undefined
```

**Fix:**
```typescript
// Check if value exists before accessing
if (business) {
  expect(business.name).toBe('Test Business');
}

// Or ensure function returns object
export function getBusiness() {
  return { name: 'Test' }; // ✅ Return object, not undefined
}
```

---

## 🎯 Best Practices

### 1. Make Small Changes
- Change one thing at a time
- Save frequently
- Watch tests after each change

### 2. Keep Tests Green During Refactoring
- If tests break, you've introduced a bug
- Fix immediately
- Don't continue refactoring with broken tests

### 3. Read Error Messages Carefully
- Error messages tell you exactly what's wrong
- Expected vs Received shows the difference
- Stack traces show where it failed

### 4. Use Watch Mode Effectively
- Keep watch mode running
- Watch the terminal
- Use `f` to focus on failed tests

### 5. Test in Isolation
- One failing test at a time
- Fix that test
- Then move to next

---

## 🚨 Red Flags

### ❌ Red Flag 1: Multiple Tests Failing
**Problem**: Your change broke many things  
**Fix**: Revert change, make smaller change

### ❌ Red Flag 2: Tests Breaking During Refactoring
**Problem**: Refactoring introduced bugs  
**Fix**: Fix refactoring, ensure tests stay green

### ❌ Red Flag 3: Same Test Failing Repeatedly
**Problem**: Not understanding the error  
**Fix**: Read error carefully, use debugger

### ❌ Red Flag 4: Ignoring Broken Tests
**Problem**: Continuing with broken tests  
**Fix**: Always fix broken tests before continuing

---

## 💡 Pro Tips

### 1. Use Debugger
```typescript
// Add debugger statement
it('creates business', () => {
  debugger; // Pause here
  const result = createBusiness(data);
  expect(result.name).toBe('Test Business');
});

// Run with Node debugger
pnpm test --inspect
```

### 2. Add Console Logs
```typescript
it('creates business', () => {
  const result = createBusiness(data);
  console.log('Result:', result); // See what you got
  expect(result.name).toBe('Test Business');
});
```

### 3. Compare Expected vs Actual
```typescript
it('creates business', () => {
  const result = createBusiness(data);
  const expected = { name: 'Test Business' };
  console.log('Expected:', expected);
  console.log('Actual:', result);
  expect(result).toEqual(expected);
});
```

### 4. Use Test.only for Focus
```typescript
// Run only this test
it.only('creates business', () => {
  // Focus on this one test
});
```

---

## 📚 Related Documentation

- **TDD Process**: `docs/development/TRUE_TDD_PROCESS.md`
- **TDD Getting Started**: `docs/development/TDD_GETTING_STARTED.md`
- **Watch Mode Guide**: `docs/development/VITEST_WATCH_ALERTS.md`
- **TDD Commands**: `docs/development/TDD_COMMANDS_REFERENCE.md`

---

## ✅ Quick Reference

### When Tests Break:

1. **RED Phase** → ✅ Expected, continue to GREEN
2. **GREEN Phase** → Fix implementation
3. **REFACTOR Phase** → Fix refactoring (tests should stay green!)
4. **After TDD** → Investigate what broke

### Watch Mode Commands:
- `f` - Run only failed tests
- `p` - Filter by filename
- `t` - Filter by test name
- `r` - Rerun all tests
- `a` - Run all tests

### Always:
- Read error messages carefully
- Make small changes
- Keep tests green during refactoring
- Fix broken tests immediately

---

**Remember**: Broken tests in watch mode are your safety net. They tell you immediately when something is wrong. Use them to guide your development!

