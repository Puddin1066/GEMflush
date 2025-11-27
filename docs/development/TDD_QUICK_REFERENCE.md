# TDD Implementation Quick Reference

**Last Updated:** January 2025  
**Purpose:** Quick lookup for TDD implementation tasks

---

## 🎯 Priority Order (Start Here)

### P0 - Fix Blockers First
1. **P0.1** - Build error fix (verification test)
2. **P0.2** - Database connection tests (RED → GREEN)

### P1 - Critical Features
3. **P1.4c** - Fingerprint display (RED → GREEN)
4. **P1.4a** - Data consistency (RED → GREEN)
5. **P1.4b** - Business names (RED → GREEN)
6. **P1.4d** - Loading states (RED → GREEN)
7. **P1.3a** - Wikidata tests (RED → GREEN)
8. **P1.3b** - Payments tests (RED → GREEN)
9. **P1.3c** - LLM tests (RED → GREEN)
10. **P1.3d** - Crawler tests (RED → GREEN)

---

## 📝 TDD Cycle Checklist

For each feature:

### ✅ RED Phase
- [ ] Write specification header (user story format)
- [ ] Write failing tests (Given-When-Then)
- [ ] Use AAA pattern (Arrange-Act-Assert)
- [ ] Use dynamic imports
- [ ] Use test factories
- [ ] Verify tests fail (expected)
- [ ] Commit: "RED: Add tests for [feature]"

### ✅ GREEN Phase
- [ ] Write minimal implementation
- [ ] Make all tests pass
- [ ] No extra features
- [ ] Commit: "GREEN: Implement [feature]"

### ✅ REFACTOR Phase
- [ ] Extract helpers
- [ ] Improve code quality
- [ ] Add documentation
- [ ] Tests still pass
- [ ] Commit: "REFACTOR: Improve [feature]"

---

## 📚 Test File Locations

| Priority | Test File | Tests |
|----------|-----------|-------|
| P0.2 | `tests/integration/__tests__/database-connection.tdd.test.ts` | 5 |
| P1.4c | `app/(dashboard)/dashboard/__tests__/fingerprint-display.tdd.test.tsx` | 5 |
| P1.4a | `app/(dashboard)/dashboard/__tests__/data-consistency.tdd.test.tsx` | 3 |
| P1.4b | `app/(dashboard)/dashboard/__tests__/business-name-display.tdd.test.tsx` | 4 |
| P1.3a | `lib/wikidata/__tests__/*.tdd.test.ts` | ~40 |
| P1.3b | `lib/payments/__tests__/*.tdd.test.ts` | ~14 |
| P1.3c | `lib/llm/__tests__/*.tdd.test.ts` | ~35 |
| P1.3d | `lib/crawler/__tests__/*.tdd.test.ts` | ~20 |

**Total:** ~150+ tests across ~25 files

---

## 🚀 Quick Start Commands

```bash
# Run specific test file
pnpm test tests/integration/__tests__/database-connection.tdd.test.ts

# Run tests in watch mode
pnpm test:watch

# Check test coverage
pnpm test:coverage

# Run E2E tests
pnpm test:e2e
```

---

## 📖 Full Details

See **[TDD_IMPLEMENTATION_PLAN.md](./TDD_IMPLEMENTATION_PLAN.md)** for:
- Complete test specifications
- Detailed implementation steps
- Timeline and schedule
- Success criteria

---

**Next:** Start with P0.1 → P0.2 → P1.4c



