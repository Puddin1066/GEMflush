# Vitest Watch Mode: Pragmatic TDD Workflow

**Purpose**: Practical guide for using Vitest watch mode during true TDD-led development  
**Date**: January 2025  
**Status**: 🔴 **ESSENTIAL REFERENCE** - Use this during every TDD session

**Important**: This guide shows how to use watch mode (a tool) during TDD (a methodology). Watch mode itself doesn't define RED/GREEN/REFACTOR - those are TDD concepts. See [VITEST_WATCH_VS_TDD.md](./VITEST_WATCH_VS_TDD.md) for clarification.

---

## 🎯 Quick Start: The TDD Watch Workflow

### Step 1: Start Watch Mode (Do This First!)

```bash
# Start Vitest in watch mode - keep this terminal open
pnpm test:watch

# Or watch a specific file/pattern
pnpm test:watch lib/services/__tests__/business-execution.tdd.test.ts
```

**What you'll see:**
```
$ pnpm test:watch

  DEV  v1.x.x

  ✓ lib/services/__tests__/business-execution.tdd.test.ts (0) 0ms

  Test Files  0 passed (0)
  Tests       0 passed (0)

  Waiting for file changes...
```

**Keep this terminal visible** - it's your feedback loop!

---

## 🔴 RED Phase: Writing Failing Tests

### The Workflow

1. **Write your test FIRST** (before any implementation)
2. **Save the file** → Vitest automatically detects and runs
3. **Watch the terminal** → Test should FAIL (this is correct!)

### Example: RED Phase

```typescript
// lib/services/__tests__/my-feature.tdd.test.ts
import { describe, it, expect } from 'vitest';

describe('MyFeature', () => {
  it('processes business data correctly', () => {
    // Arrange
    const input = { name: 'Test Business' };
    
    // Act - calling function that DOESN'T EXIST YET
    const result = processBusiness(input);
    
    // Assert
    expect(result.status).toBe('processed');
  });
});
```

**Save the file** → Watch terminal shows:

```
❌ FAIL  lib/services/__tests__/my-feature.tdd.test.ts > processes business data correctly

ReferenceError: processBusiness is not defined
  ❯ lib/services/__tests__/my-feature.tdd.test.ts:8:15

Test Files  1 failed (1)
Tests       1 failed (1)
```

**✅ This is CORRECT!** The test fails because the function doesn't exist yet.

---

## 🟢 GREEN Phase: Making Tests Pass

### The Workflow

1. **Write minimal implementation** (just enough to pass)
2. **Save the file** → Vitest automatically re-runs
3. **Watch the terminal** → Test should PASS

### Example: GREEN Phase

```typescript
// lib/services/my-feature.ts
export function processBusiness(input: { name: string }) {
  // Minimal implementation - just enough to pass
  return { status: 'processed' };
}
```

**Save the file** → Watch terminal shows:

```
✓ lib/services/__tests__/my-feature.tdd.test.ts (1) 12ms
  ✓ processes business data correctly

Test Files  1 passed (1)
Tests       1 passed (1)
```

**✅ Test passes!** Now you can refactor.

---

## 🔵 REFACTOR Phase: Improving Code

### The Workflow

1. **Improve the implementation** (better structure, naming, efficiency)
2. **Save the file** → Vitest automatically re-runs
3. **Watch the terminal** → Tests should STILL PASS

### Example: REFACTOR Phase

```typescript
// lib/services/my-feature.ts
export function processBusiness(input: { name: string }) {
  // Refactored - better structure, but still satisfies test
  const validationResult = validateBusiness(input);
  if (!validationResult.valid) {
    throw new Error(validationResult.error);
  }
  
  return {
    status: 'processed',
    processedAt: new Date(),
    businessName: input.name,
  };
}
```

**Save the file** → Watch terminal shows:

```
✓ lib/services/__tests__/my-feature.tdd.test.ts (1) 15ms
  ✓ processes business data correctly

Test Files  1 passed (1)
Tests       1 passed (1)
```

**✅ Tests still pass!** Refactoring successful.

---

## 🛠️ Watch Mode Interactive Commands

While watch mode is running, you can use these commands:

| Key | Action | When to Use |
|-----|--------|-------------|
| `a` | Run all tests | After making changes to multiple files |
| `f` | Run only failed tests | Focus on fixing failures |
| `p` | Filter by filename pattern | Test specific files (e.g., `business-execution`) |
| `t` | Filter by test name pattern | Test specific tests (e.g., `processes business`) |
| `q` | Quit watch mode | Done with TDD session |
| `r` | Rerun tests | Manual rerun |
| `u` | Update snapshots | When snapshot tests change |
| `w` | Toggle watch mode | Pause/resume watching |

### Practical Usage

**Focus on one file:**
```
# Press 'p' then type: business-execution
# Only tests matching "business-execution" will run
```

**Focus on failed tests:**
```
# After seeing failures, press 'f'
# Only failed tests re-run (faster feedback)
```

---

## 📊 Reading the Watch Output

### ✅ Passing Tests

```
✓ lib/services/__tests__/my-feature.tdd.test.ts (3) 45ms
  ✓ processes business data correctly
  ✓ handles errors gracefully
  ✓ validates input

Test Files  1 passed (1)
Tests       3 passed (3)
```

**What this means:**
- ✅ All tests passing
- ✅ Ready to continue TDD cycle
- ✅ Safe to refactor

### ❌ Failing Tests

```
❌ FAIL  lib/services/__tests__/my-feature.tdd.test.ts > processes business data correctly

AssertionError: expected "error" to be "processed"
  Expected: "processed"
  Received: "error"

  ❯ lib/services/__tests__/my-feature.tdd.test.ts:12:15

Test Files  1 failed (1)
Tests       1 failed | 2 passed (3)
```

**What this means:**
- ❌ Test is failing (expected in RED phase)
- ❌ Need to fix implementation (GREEN phase)
- ⚠️ Check the error message for what's wrong

### 🔄 File Change Detection

```
Re-running tests... [lib/services/my-feature.ts]

✓ lib/services/__tests__/my-feature.tdd.test.ts (1) 12ms

Test Files  1 passed (1)
Tests       1 passed (1)
```

**What this means:**
- 🔄 Vitest detected your file save
- 🔄 Automatically re-ran affected tests
- ✅ No manual command needed!

---

## 🎯 Complete TDD Session Example

### Terminal Setup

```bash
# Terminal 1: Start watch mode (keep this open)
$ pnpm test:watch lib/services/__tests__/my-feature.tdd.test.ts

  DEV  v1.x.x
  Waiting for file changes...
```

### Step 1: Write Failing Test (RED)

```typescript
// lib/services/__tests__/my-feature.tdd.test.ts
describe('processBusiness', () => {
  it('returns processed status', () => {
    const result = processBusiness({ name: 'Test' });
    expect(result.status).toBe('processed');
  });
});
```

**Save** → Terminal shows:
```
❌ FAIL  processBusiness > returns processed status
ReferenceError: processBusiness is not defined
```

**✅ RED phase complete!**

### Step 2: Write Minimal Code (GREEN)

```typescript
// lib/services/my-feature.ts
export function processBusiness(input: { name: string }) {
  return { status: 'processed' };
}
```

**Save** → Terminal shows:
```
✓ processBusiness > returns processed status

Test Files  1 passed (1)
Tests       1 passed (1)
```

**✅ GREEN phase complete!**

### Step 3: Refactor (REFACTOR)

```typescript
// lib/services/my-feature.ts
export function processBusiness(input: { name: string }) {
  // Improved implementation
  const validated = validateInput(input);
  return {
    status: 'processed',
    businessName: validated.name,
    processedAt: new Date(),
  };
}
```

**Save** → Terminal shows:
```
✓ processBusiness > returns processed status

Test Files  1 passed (1)
Tests       1 passed (1)
```

**✅ REFACTOR phase complete!**

### Step 4: Add Next Test (Repeat)

```typescript
// Add another test
it('handles invalid input', () => {
  expect(() => processBusiness({ name: '' })).toThrow();
});
```

**Save** → Terminal shows:
```
❌ FAIL  processBusiness > handles invalid input
Error: processBusiness did not throw

Test Files  1 failed (1)
Tests       1 failed | 1 passed (2)
```

**Back to RED phase** → Continue cycle!

---

## 💡 Pro Tips for TDD with Watch Mode

### 1. Keep Watch Mode Running

**Don't stop and restart** - keep it running throughout your TDD session:
```bash
# Start once at beginning of session
pnpm test:watch

# Keep terminal visible
# Make changes, save files
# Watch mode automatically re-runs
```

### 2. Use File Filtering

**Focus on one file at a time:**
```bash
# Start watch for specific file
pnpm test:watch lib/services/__tests__/business-execution.tdd.test.ts

# Or use pattern
pnpm test:watch --grep "business-execution"
```

### 3. Watch for Color Changes

**Visual feedback:**
- 🟢 **Green** = Tests passing (good!)
- 🔴 **Red** = Tests failing (expected in RED phase, fix in GREEN phase)
- 🟡 **Yellow** = Warnings (check but not blocking)

### 4. Use Failed Test Filter

**After seeing failures:**
1. Press `f` in watch mode
2. Only failed tests re-run
3. Faster feedback loop

### 5. Check Summary Line

**Always check the bottom summary:**
```
Test Files  1 failed | 2 passed (3)
Tests       2 failed | 5 passed (7)
```

**This tells you:**
- How many files have failures
- How many tests are failing
- Overall status at a glance

### 6. Don't Wait for Full Test Suite

**Watch mode is smart:**
- Only runs tests affected by your changes
- Fast feedback (usually < 1 second)
- No need to wait for entire suite

---

## 🚨 Common Issues & Solutions

### Issue: Tests Not Running Automatically

**Problem:** Save file but tests don't run

**Solutions:**
1. Check watch mode is still running (look for "Waiting for file changes...")
2. Check file matches test pattern (`*.tdd.test.ts`)
3. Press `r` to manually rerun
4. Restart watch mode if needed

### Issue: Too Many Tests Running

**Problem:** Every save triggers full test suite

**Solutions:**
1. Use file filtering: `pnpm test:watch lib/services/__tests__/specific-file.tdd.test.ts`
2. Use pattern filtering: `pnpm test:watch --grep "pattern"`
3. Press `p` in watch mode to filter by filename

### Issue: Can't See Test Output

**Problem:** Terminal output is cluttered

**Solutions:**
1. Clear terminal: `Cmd+K` (Mac) or `Ctrl+L` (Linux)
2. Use verbose reporter: `pnpm test:watch --reporter=verbose`
3. Use UI mode: `pnpm test:ui` (opens browser)

### Issue: Tests Running Too Slowly

**Problem:** Watch mode is slow

**Solutions:**
1. Use file filtering to run fewer tests
2. Check for slow tests (look at duration in output)
3. Use `f` to run only failed tests
4. Consider splitting large test files

---

## 📋 TDD Watch Mode Checklist

Before starting TDD:

- [ ] Start watch mode: `pnpm test:watch [file-pattern]`
- [ ] Keep terminal visible
- [ ] Verify "Waiting for file changes..." message

During RED phase:

- [ ] Write test FIRST
- [ ] Save file
- [ ] Verify test FAILS in terminal (expected!)
- [ ] Check error message is clear

During GREEN phase:

- [ ] Write minimal implementation
- [ ] Save file
- [ ] Verify test PASSES in terminal
- [ ] Check summary shows all passing

During REFACTOR phase:

- [ ] Improve code structure
- [ ] Save file
- [ ] Verify tests STILL PASS
- [ ] Check no regressions

---

## 🎓 Key Takeaways

1. **Start watch mode FIRST** - Before writing any code
2. **Keep terminal visible** - It's your feedback loop
3. **Watch for color changes** - Green = good, Red = fix needed
4. **Use interactive commands** - `f` for failed tests, `p` for filtering
5. **Trust the cycle** - RED → GREEN → REFACTOR → Repeat
6. **Don't wait** - Watch mode is fast, use it continuously

---

## 📚 Related Documentation

- [VITEST_WATCH_VS_TDD.md](./VITEST_WATCH_VS_TDD.md) - **READ THIS FIRST** - Understanding the distinction between watch mode (tool) and TDD (methodology)
- [TDD_BREAKING_TESTS_HANDLING.md](./TDD_BREAKING_TESTS_HANDLING.md) - What to do when tests break
- [TRUE_TDD_PROCESS.md](./TRUE_TDD_PROCESS.md) - TDD methodology (RED/GREEN/REFACTOR)
- [TDD_STRATEGY.md](./TDD_STRATEGY.md) - Comprehensive TDD guide
- [TDD_QUICK_START.md](./TDD_QUICK_START.md) - Quick reference
- [VITEST_WATCH_ALERTS.md](./VITEST_WATCH_ALERTS.md) - Watch mode alerts

---

**Remember**: 
- **Watch mode** = Tool for automatic test running (convenience)
- **TDD RED/GREEN/REFACTOR** = Methodology phases (test-first approach)
- Watch mode shows you test results automatically, but RED/GREEN applies to TDD methodology, not watch mode itself

**When tests break**: Don't panic! Read [TDD_BREAKING_TESTS_HANDLING.md](./TDD_BREAKING_TESTS_HANDLING.md) to know if it's expected (RED phase) or a regression (needs fixing).

