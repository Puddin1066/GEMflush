# Getting Started with TDD and Vitest CLI

**Practical guide to commence TDD development using Vitest CLI**

---

## 🚀 Quick Start: Your First TDD Session

### Step 1: Start Vitest in Watch Mode

```bash
# Start Vitest watch mode (recommended for TDD)
pnpm test:watch

# Or use the TDD alias
pnpm tdd
```

**What happens:**
- Vitest starts in watch mode
- Watches for file changes
- Automatically re-runs tests when you save
- Perfect for the TDD cycle (RED → GREEN → REFACTOR)

---

## 📝 TDD Workflow with Vitest CLI

### The TDD Cycle with Vitest

```
┌─────────────────────────────────────────┐
│ 1. Write Test (RED) → Save → Test Fails │
│ 2. Write Code (GREEN) → Save → Test Pass │
│ 3. Refactor → Save → Test Still Passes   │
└─────────────────────────────────────────┘
```

### Example Session

```bash
# Terminal 1: Start Vitest watch mode
$ pnpm tdd

# Vitest starts watching...
# Now in another terminal or editor:

# Step 1: Create test file (RED)
# File: lib/services/__tests__/my-feature.test.ts
describe('MyFeature', () => {
  it('does something', () => {
    expect(myFunction()).toBe('expected');
  });
});

# Save file → Vitest detects change → Runs test → FAILS (RED) ✅

# Step 2: Create implementation (GREEN)
# File: lib/services/my-feature.ts
export function myFunction() {
  return 'expected';
}

# Save file → Vitest detects change → Runs test → PASSES (GREEN) ✅

# Step 3: Refactor
# Improve code while keeping test passing
# Save → Test still passes ✅
```

---

## 🛠️ Essential Vitest CLI Commands

### Watch Mode (TDD Recommended)

```bash
# Watch all tests
pnpm test:watch
# or
pnpm tdd

# Watch specific file pattern
pnpm test:watch --grep "business-execution"

# Watch with UI (visual test runner)
pnpm test:ui
```

**Watch Mode Features:**
- Auto-reruns on file save
- Shows only changed tests
- Fast feedback loop
- Press `a` to run all tests
- Press `f` to run only failed tests
- Press `q` to quit

### Single Run (CI/Verification)

```bash
# Run all tests once
pnpm test:run
# or
pnpm tdd:run

# Run specific file
pnpm test:run lib/services/__tests__/my-feature.test.ts

# Run with pattern matching
pnpm test:run --grep "crawl"
```

### Coverage Mode

```bash
# Run with coverage report
pnpm test:coverage
# or
pnpm tdd:coverage

# Coverage for specific file
pnpm test:coverage lib/services/__tests__/my-feature.test.ts
```

### Filtering Tests

```bash
# Run tests matching pattern
pnpm test --grep "business execution"

# Run tests in specific directory
pnpm test lib/services/__tests__/

# Run tests matching file pattern
pnpm test --testNamePattern "creates crawl job"
```

---

## 🎯 Starting a New Feature with TDD

### Step-by-Step: Create a New Feature

#### 1. Start Vitest Watch Mode

```bash
# Terminal 1: Start watch mode
pnpm tdd
```

#### 2. Create Test File (Specification)

```bash
# Create test file first
touch lib/services/__tests__/new-feature.test.ts
```

#### 3. Write Specification (Test First)

```typescript
// lib/services/__tests__/new-feature.test.ts
import { describe, it, expect } from 'vitest';

/**
 * SPECIFICATION: New Feature
 * 
 * As a user
 * I want to do something
 * So that I can achieve a goal
 */
describe('NewFeature', () => {
  it('does something specific', () => {
    // Arrange
    const input = 'test';
    
    // Act
    const result = newFeature(input);
    
    // Assert
    expect(result).toBe('expected');
  });
});
```

**Save file** → Vitest detects change → Test runs → **FAILS (RED)** ✅

#### 4. Create Implementation File

```bash
# Create implementation file
touch lib/services/new-feature.ts
```

#### 5. Write Minimal Implementation (GREEN)

```typescript
// lib/services/new-feature.ts
export function newFeature(input: string): string {
  return 'expected'; // Minimal implementation
}
```

**Save file** → Vitest detects change → Test runs → **PASSES (GREEN)** ✅

#### 6. Refactor (Keep Tests Green)

```typescript
// lib/services/new-feature.ts (Refactored)
export function newFeature(input: string): string {
  // Improved implementation
  return processInput(input);
}
```

**Save file** → Test still passes ✅

---

## 🔧 Advanced Vitest CLI Options

### Watch Mode Options

```bash
# Watch with specific pattern
pnpm test:watch --grep "business"

# Watch with coverage
pnpm test:watch --coverage

# Watch with verbose output
pnpm test:watch --reporter=verbose

# Watch specific files
pnpm test:watch lib/services/__tests__/my-feature.test.ts
```

### Test Filtering

```bash
# Run tests matching description
pnpm test --grep "creates crawl job"

# Run tests in specific directory
pnpm test lib/services/__tests__/

# Exclude tests
pnpm test --grep "business" --exclude "integration"

# Run only changed tests (git)
pnpm test --changed
```

### Output Options

```bash
# Verbose output
pnpm test --reporter=verbose

# JSON output
pnpm test --reporter=json

# Dot matrix (minimal)
pnpm test --reporter=dot

# Custom reporter
pnpm test --reporter=default --reporter=json
```

### Performance Options

```bash
# Run tests in parallel (default)
pnpm test --threads

# Run tests sequentially
pnpm test --no-threads

# Set timeout
pnpm test --testTimeout=10000

# Set hook timeout
pnpm test --hookTimeout=10000
```

---

## 📊 Using Vitest UI (Visual Test Runner)

### Start UI Mode

```bash
# Start Vitest UI
pnpm test:ui

# Opens browser at http://localhost:51204
```

**UI Features:**
- Visual test results
- Filter tests
- See coverage
- Debug tests
- Watch mode in browser

### UI Keyboard Shortcuts

- `r` - Rerun tests
- `f` - Run failed tests
- `a` - Run all tests
- `u` - Update snapshots
- `q` - Quit

---

## 🎯 Practical TDD Session Example

### Scenario: Fix Crawl Job Creation Bug

#### Terminal Setup

```bash
# Terminal 1: Start Vitest watch
$ pnpm tdd

# Output:
#  DEV  v4.0.8
#  
#  ✓ lib/services/__tests__/business-execution.test.ts (5) 1234ms
#  
#  Test Files  1 passed (1)
#       Tests  5 passed (5)
#    Start at  10:30:00
#    Duration  1.23s
```

#### Step 1: Write Failing Test (RED)

```typescript
// lib/services/__tests__/business-execution.test.ts
describe('Crawl Job Creation', () => {
  it('creates crawl job before processing', async () => {
    const business = BusinessTestFactory.create();
    await executeCrawlJob(null, business.id);
    
    expect(mockQueries.createCrawlJob).toHaveBeenCalled();
  });
});
```

**Save** → Vitest output:
```
✗ lib/services/__tests__/business-execution.test.ts (1)
  ✗ Crawl Job Creation > creates crawl job before processing
    Error: createCrawlJob is not a function
```

**Status**: RED ✅ (Expected - test defines specification)

#### Step 2: Write Implementation (GREEN)

```typescript
// lib/services/business-execution.ts
export async function executeCrawlJob(jobId, businessId) {
  if (!jobId) {
    await createCrawlJob({ businessId, status: 'pending' });
  }
  // ... rest of implementation
}
```

**Save** → Vitest output:
```
✓ lib/services/__tests__/business-execution.test.ts (1)
  ✓ Crawl Job Creation > creates crawl job before processing
```

**Status**: GREEN ✅ (Specification satisfied)

#### Step 3: Refactor

```typescript
// Refactored implementation
export async function executeCrawlJob(jobId, businessId) {
  const actualJobId = await ensureCrawlJobExists(jobId, businessId);
  // ... improved implementation
}
```

**Save** → Test still passes ✅

---

## 🔍 Debugging with Vitest CLI

### Debug Mode

```bash
# Run with Node.js debugger
pnpm test --inspect

# Run with Chrome DevTools
pnpm test --inspect-brk
```

### Verbose Logging

```bash
# Show console.log output
pnpm test --reporter=verbose

# Show all test output
pnpm test --no-silent
```

### Break on Failure

```bash
# Stop on first failure
pnpm test --bail

# Useful for TDD: see first failing test
```

---

## 📋 TDD Workflow Checklist

### Starting a New Feature

- [ ] Start Vitest watch mode (`pnpm tdd`)
- [ ] Create test file first
- [ ] Write specification (test) that defines behavior
- [ ] Verify test fails (RED)
- [ ] Create implementation file
- [ ] Write minimal code to pass test
- [ ] Verify test passes (GREEN)
- [ ] Refactor implementation
- [ ] Verify test still passes
- [ ] Add next test specification
- [ ] Repeat cycle

### Daily TDD Workflow

```bash
# Morning: Start watch mode
pnpm tdd

# Work on feature:
# 1. Write test (RED)
# 2. Write code (GREEN)
# 3. Refactor
# Repeat...

# Before commit: Run full suite
pnpm test:run

# Check coverage
pnpm test:coverage
```

---

## 🎓 Vitest CLI Cheat Sheet

### Most Common Commands

```bash
# TDD Development
pnpm tdd                    # Watch mode (recommended)
pnpm test:watch             # Same as above

# Verification
pnpm test:run                # Run once
pnpm tdd:run                # Same as above

# Coverage
pnpm test:coverage          # With coverage report
pnpm tdd:coverage           # Same as above

# UI
pnpm test:ui                # Visual test runner

# Filtering
pnpm test --grep "pattern"  # Filter by pattern
pnpm test lib/path/         # Filter by path
```

### Watch Mode Shortcuts (Interactive)

When in watch mode, press:
- `a` - Run all tests
- `f` - Run only failed tests
- `p` - Filter by filename pattern
- `t` - Filter by test name pattern
- `q` - Quit watch mode
- `u` - Update snapshots
- `r` - Rerun tests

---

## 🚨 Common Issues & Solutions

### Issue: Tests not running on save

**Solution**: Ensure you're in watch mode
```bash
pnpm tdd  # Not pnpm test:run
```

### Issue: Tests running too slowly

**Solution**: Use filtering
```bash
pnpm test:watch --grep "specific-test"
```

### Issue: Need to see console output

**Solution**: Use verbose reporter
```bash
pnpm test:watch --reporter=verbose
```

### Issue: Tests passing but code not working

**Solution**: Check test isolation
```bash
# Ensure tests don't share state
# Use beforeEach to reset mocks
```

---

## 📚 Next Steps

1. **Start TDD Session**: `pnpm tdd`
2. **Read TDD Strategy**: `docs/development/TDD_STRATEGY.md`
3. **See Examples**: `docs/development/TDD_SPECIFICATION_EXAMPLE.md`
4. **Use Helpers**: `lib/test-helpers/tdd-helpers.ts`

---

**Remember**: TDD is a cycle. Start with `pnpm tdd` and let Vitest watch mode guide your development!

