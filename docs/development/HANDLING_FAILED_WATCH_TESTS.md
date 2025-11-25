# Handling Failed Watch Tests - Regression Prevention Guide

**Purpose**: Step-by-step guide for addressing failed watch tests without regressing the platform  
**Status**: 🔴 **MANDATORY REFERENCE** - Follow this process when tests fail  
**Date**: January 2025

---

## 🎯 What Are Watch Tests?

**Watch tests** are tests running in **watch mode** (`pnpm tdd` or `pnpm test:watch`). They:
- Automatically re-run when you save files
- Provide immediate feedback during development
- Are essential for the TDD RED → GREEN → REFACTOR cycle

**Failed watch tests** mean tests are failing that should pass. This indicates either:
1. **Implementation is wrong** (doesn't match specification)
2. **Test is wrong** (incorrect expectations or overfitting)
3. **Both need fixing** (specification unclear)

---

## ✅ Step-by-Step Process for Addressing Failures

### Step 1: Identify What's Failing

```bash
# Run specific failing tests to see detailed errors
pnpm test:run lib/llm/__tests__/prompt-generator.tdd.test.ts
pnpm test:run lib/llm/__tests__/response-analyzer.tdd.test.ts
pnpm test:run lib/wikidata/__tests__/service.tdd.test.ts

# Or run all tests to see full picture
pnpm test:run
```

**Current Failures** (as of latest run):
1. ❌ `prompt-generator.tdd.test.ts` - Business name not in recommendation prompt
2. ❌ `response-analyzer.tdd.test.ts` - Rank extraction wrong (3 failures)
3. ❌ `service.tdd.test.ts` - Mock implementation issues (2 failures)

---

### Step 2: Apply Decision Framework

**Use**: `docs/development/TDD_DECISION_FRAMEWORK.md`

For each failure, ask:

#### ✅ Fix Implementation If:
- [ ] Test specifies **user-visible behavior**
- [ ] Test specifies **API contract**
- [ ] Test specifies **business logic**
- [ ] Implementation is clearly missing functionality
- [ ] Fixing adds value to users

#### ✅ Fix Test If:
- [ ] Test overfits to implementation details
- [ ] Test has incorrect expectations
- [ ] Test expects wrong field/method names
- [ ] Test has calculation errors
- [ ] Implementation is correct but test wrong

#### ⚠️ Fix Both If:
- [ ] Both test and implementation have bugs
- [ ] Specification is unclear

---

### Step 3: Analyze Each Failure

#### Failure 1: Business Name Not in Recommendation Prompt

**Test Expectation**:
```typescript
expect(prompts.recommendation).toContain('Popular Restaurant');
```

**Actual Result**: Recommendation prompt doesn't include business name

**Decision**: 
- ✅ **Fix Implementation** - Test specifies desired behavior (prompts should include business name)
- This is a specification of user-visible behavior
- Fixing adds value (better context-aware prompts)

**Action**: Update `PromptGenerator` to include business name in recommendation prompts

---

#### Failure 2: Rank Extraction Wrong

**Test Expectation**:
```typescript
expect(result.rankPosition).toBe(1);
```

**Actual Result**: Returns 5 instead of 1

**Decision**:
- ✅ **Fix Implementation** - Test specifies business logic (should extract rank from "1. Test Business")
- Implementation is parsing incorrectly
- Fixing adds value (correct ranking detection)

**Action**: Fix rank extraction logic in `ResponseAnalyzer`

---

#### Failure 3: Competitor Mentions Not Detected

**Test Expectation**:
```typescript
expect(result.competitorMentions.length).toBeGreaterThan(0);
expect(result.competitorMentions).toContain('Competitor A');
```

**Actual Result**: Empty array

**Decision**:
- ✅ **Fix Implementation** - Test specifies business logic (should detect competitors)
- Implementation is missing competitor detection
- Fixing adds value (competitive analysis feature)

**Action**: Add competitor detection logic to `ResponseAnalyzer`

---

#### Failure 4: Confidence Score Too High When No Mention

**Test Expectation**:
```typescript
expect(result.confidence).toBeLessThan(0.5);
```

**Actual Result**: 0.64 (should be < 0.5)

**Decision**:
- ✅ **Fix Implementation** - Test specifies business logic (low confidence when no mention)
- Implementation calculates confidence incorrectly
- Fixing adds value (accurate confidence scores)

**Action**: Fix confidence calculation in `ResponseAnalyzer` for no-mention cases

---

#### Failure 5 & 6: Mock Implementation Issues

**Test Error**:
```typescript
TypeError: vi.mocked(...).mockImplementation is not a function
```

**Decision**:
- ✅ **Fix Test** - Test has incorrect mock setup
- This is a test infrastructure issue, not implementation
- Implementation is correct, test setup is wrong

**Action**: Fix mock setup in `service.tdd.test.ts` (use correct Vitest mocking API)

---

### Step 4: Prevent Regression

#### Before Making Changes

1. **Document Current Behavior**
   ```bash
   # Run all tests to establish baseline
   pnpm test:run > test-baseline.log
   ```

2. **Check What Uses the Code**
   ```bash
   # Search for usages
   grep -r "PromptGenerator" --include="*.ts" --include="*.tsx"
   grep -r "ResponseAnalyzer" --include="*.ts" --include="*.tsx"
   ```

3. **Review Related Tests**
   - Check if other tests depend on current behavior
   - Ensure changes won't break passing tests

#### During Changes

1. **Fix One Failure at a Time**
   - Don't fix all failures in one commit
   - Fix → Test → Commit → Next

2. **Run Related Tests**
   ```bash
   # After fixing prompt-generator
   pnpm test:run lib/llm/
   
   # After fixing response-analyzer
   pnpm test:run lib/llm/
   
   # After fixing wikidata service
   pnpm test:run lib/wikidata/
   ```

3. **Run Integration Tests**
   ```bash
   # Ensure no integration issues
   pnpm test:run tests/integration/
   ```

#### After Changes

1. **Full Test Suite**
   ```bash
   # Run all tests
   pnpm test:run
   ```

2. **E2E Tests** (if applicable)
   ```bash
   # Run end-to-end tests
   pnpm test:e2e
   ```

3. **Manual Verification** (if applicable)
   - Test the feature manually
   - Verify behavior matches specification

---

## 🛡️ Regression Prevention Checklist

Before committing fixes:

- [ ] **All existing tests still pass** (except the ones you're fixing)
- [ ] **No new test failures introduced**
- [ ] **Related integration tests pass**
- [ ] **Code follows DRY and SOLID principles**
- [ ] **Changes are minimal** (only what's needed to fix)
- [ ] **Documentation updated** (if behavior changed)

---

## 📊 Current Failure Analysis

### Summary of Required Fixes

| Test | Issue | Decision | Risk Level |
|------|-------|----------|------------|
| `prompt-generator.tdd.test.ts` | Business name missing | Fix Implementation | 🟢 Low |
| `response-analyzer.tdd.test.ts` | Rank extraction wrong | Fix Implementation | 🟢 Low |
| `response-analyzer.tdd.test.ts` | Competitor detection missing | Fix Implementation | 🟡 Medium |
| `response-analyzer.tdd.test.ts` | Confidence calculation wrong | Fix Implementation | 🟢 Low |
| `service.tdd.test.ts` | Mock setup incorrect | Fix Test | 🟢 Low |

**Overall Risk**: 🟢 **LOW** - These are isolated fixes that won't affect other functionality

---

## 🎯 Action Plan

### Phase 1: Fix Test Infrastructure (Low Risk)
1. Fix mock setup in `service.tdd.test.ts`
2. Verify tests run correctly
3. **Commit**: "Fix: Wikidata service test mock setup"

### Phase 2: Fix Prompt Generator (Low Risk)
1. Update `PromptGenerator` to include business name in recommendation prompts
2. Run tests: `pnpm test:run lib/llm/__tests__/prompt-generator.tdd.test.ts`
3. **Commit**: "Fix: Include business name in recommendation prompts"

### Phase 3: Fix Response Analyzer (Medium Risk)
1. Fix rank extraction logic
2. Add competitor detection
3. Fix confidence calculation for no-mention cases
4. Run tests: `pnpm test:run lib/llm/__tests__/response-analyzer.tdd.test.ts`
5. **Commit**: "Fix: Response analyzer rank extraction, competitor detection, and confidence calculation"

### Phase 4: Verification (Critical)
1. Run full test suite: `pnpm test:run`
2. Run integration tests: `pnpm test:run tests/integration/`
3. Verify no regressions
4. **Commit**: "Test: Verify all fixes pass"

---

## 🚨 Red Flags - When to Stop

**STOP and reassess if**:
- ❌ Fixing one failure breaks 5+ other tests
- ❌ Changes require major refactoring
- ❌ Implementation behavior is used elsewhere and works correctly
- ❌ Tests are testing implementation details (not behavior)

**In these cases**:
1. Re-evaluate using `TDD_DECISION_FRAMEWORK.md`
2. Consider if test should be fixed instead
3. Document the decision
4. Get review if unsure

---

## 💡 Key Principles

1. **Tests as Specifications**: When test correctly specifies behavior, fix implementation
2. **No Overfitting**: When test overfits to implementation, fix test
3. **Business Value**: Prioritize changes that add user value
4. **Stability**: Don't break working code for wrong tests
5. **Incremental**: Fix one thing at a time, verify, then move on

---

## 📚 Related Documentation

- **TDD Decision Framework**: `docs/development/TDD_DECISION_FRAMEWORK.md`
- **TDD Process**: `docs/development/TRUE_TDD_PROCESS.md`
- **Vitest Watch Mode**: `docs/development/VITEST_WATCH_ALERTS.md`

---

## ✅ Success Criteria

You've successfully addressed failed watch tests when:

1. ✅ All tests pass
2. ✅ No regressions introduced
3. ✅ Code follows DRY and SOLID principles
4. ✅ Changes are minimal and focused
5. ✅ Behavior matches specifications

---

**Remember**: The goal is **correct, maintainable code** that delivers **business value**.  
Tests are tools to achieve this, not ends in themselves.

**Last Updated**: January 2025  
**Status**: 🔴 **MANDATORY REFERENCE** - Follow this process when tests fail


