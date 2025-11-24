# TDD Commands Quick Reference

**Essential Vitest CLI commands for TDD workflow**

---

## 🚀 Start TDD Session

```bash
# Start watch mode (RECOMMENDED - use this for TDD)
pnpm tdd

# Alternative
pnpm test:watch
```

**Keep this running** - It watches for changes and auto-runs tests.

---

## 📝 Basic TDD Commands

### Watch Mode (Development)

```bash
pnpm tdd                    # Start watch mode
pnpm test:watch            # Same as above
```

### Single Run (Verification)

```bash
pnpm test:run              # Run all tests once
pnpm tdd:run              # Same as above
```

### Coverage

```bash
pnpm test:coverage        # Run with coverage
pnpm tdd:coverage         # Same as above
```

### Visual UI

```bash
pnpm test:ui              # Browser-based test runner
```

---

## 🎯 Filtering Tests

### By File Pattern

```bash
# Run specific file
pnpm test lib/services/__tests__/my-feature.test.ts

# Run directory
pnpm test lib/services/__tests__/
```

### By Test Name

```bash
# Match test description
pnpm test --grep "creates crawl job"

# Exclude pattern
pnpm test --grep "business" --exclude "integration"
```

### By File Path

```bash
# Run tests in specific path
pnpm test lib/services/
pnpm test app/api/
```

---

## ⌨️ Watch Mode Interactive Commands

When `pnpm tdd` is running, press:

| Key | Action |
|-----|--------|
| `a` | Run all tests |
| `f` | Run only failed tests |
| `p` | Filter by filename pattern |
| `t` | Filter by test name pattern |
| `q` | Quit watch mode |
| `r` | Rerun tests |
| `u` | Update snapshots |

---

## 🔧 Advanced Options

### Verbose Output

```bash
pnpm test --reporter=verbose
pnpm test --no-silent
```

### Stop on First Failure

```bash
pnpm test --bail
```

### Debug Mode

```bash
pnpm test --inspect        # Node.js debugger
pnpm test --inspect-brk    # Chrome DevTools
```

### Timeout Control

```bash
pnpm test --testTimeout=10000    # 10 second timeout
pnpm test --hookTimeout=5000     # 5 second hook timeout
```

### Parallel Execution

```bash
pnpm test --threads              # Parallel (default)
pnpm test --no-threads           # Sequential
```

---

## 📊 Common Workflows

### Starting New Feature

```bash
# 1. Start watch mode
pnpm tdd

# 2. Create test file
touch lib/services/__tests__/new-feature.test.ts

# 3. Write test (RED) → Save → Test fails ✅
# 4. Write code (GREEN) → Save → Test passes ✅
# 5. Refactor → Save → Test still passes ✅
```

### Running Specific Test

```bash
# Watch specific file
pnpm test:watch lib/services/__tests__/my-feature.test.ts

# Run once
pnpm test:run lib/services/__tests__/my-feature.test.ts
```

### Before Commit

```bash
# Run full suite
pnpm test:run

# Check coverage
pnpm test:coverage
```

### Debugging Failing Test

```bash
# Run with verbose output
pnpm test --grep "failing-test" --reporter=verbose

# Or use UI
pnpm test:ui
```

---

## 🎓 TDD Cycle Commands

### RED Phase (Write Failing Test)

```bash
# Start watch mode
pnpm tdd

# Create/write test file
# Save → Test fails (expected) ✅
```

### GREEN Phase (Make Test Pass)

```bash
# Write implementation
# Save → Test passes ✅
```

### REFACTOR Phase (Improve Code)

```bash
# Refactor implementation
# Save → Test still passes ✅
```

---

## 📋 Package.json Scripts

All available test commands:

```bash
pnpm tdd                    # Watch mode (TDD)
pnpm tdd:run               # Single run
pnpm tdd:coverage          # With coverage

pnpm test                   # Watch mode
pnpm test:run              # Single run
pnpm test:watch            # Watch mode
pnpm test:coverage         # Coverage
pnpm test:ui               # Visual UI

# Domain-specific
pnpm test:unit             # Unit tests only
pnpm test:integration      # Integration tests only
pnpm test:e2e             # E2E tests (Playwright)
```

---

## 🚨 Troubleshooting

### Tests Not Running on Save

```bash
# Ensure you're in watch mode
pnpm tdd  # Not pnpm test:run
```

### Need to See Console Output

```bash
pnpm test:watch --reporter=verbose
```

### Tests Running Too Slowly

```bash
# Filter to specific test
pnpm test:watch --grep "specific-test"
```

### Need to Reset Watch Mode

```bash
# Press 'r' in watch mode to rerun
# Or quit (q) and restart
pnpm tdd
```

---

## 📚 Full Documentation

- **Getting Started**: `docs/development/TDD_GETTING_STARTED.md`
- **Strategy Guide**: `docs/development/TDD_STRATEGY.md`
- **Specification Guide**: `docs/development/TDD_SPECIFICATION_GUIDE.md`
- **Examples**: `docs/development/TDD_SPECIFICATION_EXAMPLE.md`

---

**Pro Tip**: Keep `pnpm tdd` running in a terminal while you develop. It's your TDD feedback loop!

