# TDD Quick Start - Commands Only

## 🚀 Start TDD (Do This First)

```bash
pnpm tdd
```

**Keep this terminal open** - It watches for changes and runs tests automatically.

---

## 📝 TDD Cycle

1. **Write test** → Save → Test fails (RED) ✅
2. **Write code** → Save → Test passes (GREEN) ✅  
3. **Refactor** → Save → Test still passes ✅

---

## 🎯 Essential Commands

```bash
# Start TDD session
pnpm tdd

# Run once (verification)
pnpm test:run

# With coverage
pnpm test:coverage

# Visual UI
pnpm test:ui

# Specific file
pnpm test lib/path/to/test.test.ts

# Filter by name
pnpm test --grep "test-name"
```

---

## ⌨️ Watch Mode Shortcuts

Press in watch mode:
- `a` = Run all
- `f` = Run failed only
- `q` = Quit
- `r` = Rerun

---

**That's it!** Start with `pnpm tdd` and begin writing tests.
