# TRUE TDD Process - Authoritative Guide

**Purpose**: Definitive reference for Test-Driven Development process  
**Status**: 🔴 **MANDATORY REFERENCE** - Always follow this process  
**Date**: January 2025

---

## 🎯 Core Principle

**Tests ARE specifications that drive development. Code is written to satisfy tests, not the reverse.**

---

## ✅ TRUE TDD Process (MANDATORY)

### Step 1: Write Failing Test FIRST (RED)

**Before ANY implementation code exists**, write a test that specifies the desired behavior:

```typescript
/**
 * SPECIFICATION: [What this should do]
 * 
 * As a [user/system]
 * I want [functionality]
 * So that [benefit]
 * 
 * Acceptance Criteria:
 * 1. [Criterion 1]
 * 2. [Criterion 2]
 */
describe('Feature Specification', () => {
  it('does something specific', () => {
    // Arrange: Set up test data
    const input = createTestData();
    
    // Act: Call function that DOESN'T EXIST YET
    const result = functionThatDoesNotExist(input);
    
    // Assert: Specify expected behavior
    expect(result).toBe(expectedValue);
  });
});
```

**CRITICAL**: 
- ✅ Test must be written FIRST
- ✅ Implementation does NOT exist yet
- ✅ Test WILL FAIL (this is expected and correct)
- ✅ Test defines the specification

**Run test**: `pnpm test [test-file]`

**Expected Result**: ❌ **TEST FAILS (RED)** ✅

---

### Step 2: Write Minimal Implementation (GREEN)

Write the SMALLEST amount of code needed to make the test pass:

```typescript
// Write ONLY what's needed to satisfy the test
export function functionThatDoesNotExist(input: InputType): ReturnType {
  // Minimal implementation - just enough to pass
  return expectedValue; // Or minimal logic
}
```

**CRITICAL**:
- ✅ Write MINIMAL code only
- ✅ No extra features
- ✅ No optimization yet
- ✅ Just enough to pass the test

**Run test**: `pnpm test [test-file]`

**Expected Result**: ✅ **TEST PASSES (GREEN)** ✅

---

### Step 3: Refactor (Keep Tests Green)

Now improve the code while keeping tests passing:

```typescript
// Refactored implementation
export function functionThatDoesNotExist(input: InputType): ReturnType {
  // Improved code structure
  // Better naming
  // More efficient
  // But still satisfies the test
  return improvedImplementation(input);
}
```

**CRITICAL**:
- ✅ Improve code quality
- ✅ Better structure
- ✅ Better naming
- ✅ Tests MUST still pass

**Run test**: `pnpm test [test-file]`

**Expected Result**: ✅ **TEST STILL PASSES** ✅

---

## 🔴 What TRUE TDD Is NOT

### ❌ NOT Test Coverage

**Wrong Approach**:
1. See existing code
2. Write tests that verify existing code
3. Tests pass immediately
4. No code changes

**This is test coverage, NOT TDD**

### ❌ NOT Test-After

**Wrong Approach**:
1. Write implementation
2. Write tests to verify it
3. Tests pass

**This is test-after, NOT TDD**

### ❌ NOT Writing Tests for Existing Code

**Wrong Approach**:
1. Read existing implementation
2. Write tests that match existing behavior
3. Assume existing code is correct

**This is verification, NOT TDD**

---

## ✅ What TRUE TDD IS

### ✅ Tests Drive Development

**Correct Approach**:
1. Write test FIRST (specification)
2. Test fails (RED) - expected
3. Write minimal code
4. Test passes (GREEN)
5. Refactor

### ✅ Tests ARE Specifications

Tests define WHAT should happen, not verify what already exists.

### ✅ Code Satisfies Tests

Code is written to make tests pass, not tests written to verify code.

---

## 📋 TDD Workflow Checklist

When asked to do TDD, follow this checklist:

- [ ] **Step 1: Identify missing functionality**
  - What behavior doesn't exist?
  - What should the code do?
  
- [ ] **Step 2: Write failing test FIRST**
  - Test specifies desired behavior
  - Test calls function that doesn't exist
  - Test WILL fail (this is correct)
  
- [ ] **Step 3: Run test - verify it fails (RED)**
  - Test must fail
  - If test passes, something is wrong
  
- [ ] **Step 4: Write minimal implementation**
  - Smallest code to make test pass
  - No extra features
  
- [ ] **Step 5: Run test - verify it passes (GREEN)**
  - Test must pass
  - Implementation satisfies specification
  
- [ ] **Step 6: Refactor**
  - Improve code quality
  - Tests still pass
  
- [ ] **Step 7: Repeat for next behavior**

---

## 🎯 Interpreting User Commands

### When User Says "TDD" or "TDD-led development"

**ALWAYS means**:
1. Write tests FIRST
2. Tests fail (RED)
3. Implement to satisfy tests
4. Tests pass (GREEN)
5. Refactor

**NEVER means**:
- Write tests for existing code
- Verify existing behavior
- Test coverage

### When User Says "Full Coverage"

**In TDD context means**:
1. Identify all missing functionality
2. Write failing tests for each
3. Implement to satisfy all tests
4. Achieve coverage through TDD

**NOT**:
- Write tests for existing code
- Just add test coverage

---

## 🔍 Identifying Missing Functionality

### How to Find What's Missing

1. **Read requirements/specifications**
   - What should the code do?
   - What's documented but not implemented?

2. **Analyze existing code**
   - What's incomplete?
   - What has TODOs?
   - What has errors?

3. **Check error logs/issues**
   - What's failing?
   - What's missing?

4. **Review test gaps**
   - What's not tested?
   - What should be tested?

### Example: Finding Missing Behavior

```typescript
// Existing code
export function processBusiness(business: Business) {
  // TODO: Add error handling
  return process(business);
}

// Missing: Error handling
// TDD Step 1: Write failing test for error handling
it('handles errors gracefully', () => {
  const business = createInvalidBusiness();
  const result = processBusiness(business);
  expect(result.error).toBeDefined(); // This will fail - error handling doesn't exist
});

// TDD Step 2: Implement error handling
export function processBusiness(business: Business) {
  try {
    return process(business);
  } catch (error) {
    return { error: error.message }; // Minimal implementation
  }
}
```

---

## 🚨 Red Flags - When NOT Doing TRUE TDD

### ❌ Red Flag 1: Tests Pass Immediately

**Problem**: Tests written for existing code
**Fix**: Write tests for missing behavior first

### ❌ Red Flag 2: No Code Changes Needed

**Problem**: Just verifying existing code
**Fix**: Write tests that require new implementation

### ❌ Red Flag 3: Tests Match Existing Behavior

**Problem**: Assuming existing code is correct
**Fix**: Write tests that specify correct behavior

### ❌ Red Flag 4: Implementation Exists Before Tests

**Problem**: Writing tests after code
**Fix**: Write tests first, then implement

---

## 📝 TDD Command Interpretation Guide

### "Continue TDD-led development"

**Means**:
1. Identify next missing functionality
2. Write failing test FIRST
3. Implement to satisfy test
4. Repeat

**Does NOT mean**:
- Add test coverage for existing code
- Verify existing behavior

### "TDD until full coverage"

**Means**:
1. Find all missing functionality
2. Write failing tests for each
3. Implement all to satisfy tests
4. Coverage achieved through TDD

**Does NOT mean**:
- Write tests for existing code
- Just improve coverage metrics

### "Write TDD tests"

**Means**:
1. Write tests FIRST (specifications)
2. Tests fail (RED)
3. Implement to satisfy
4. Tests pass (GREEN)

**Does NOT mean**:
- Write tests for existing code
- Verify current behavior

---

## ✅ Success Criteria

### TRUE TDD is happening when:

1. ✅ Tests are written FIRST
2. ✅ Tests fail initially (RED)
3. ✅ Code is written to satisfy tests
4. ✅ Tests pass after implementation (GREEN)
5. ✅ Code is refactored while tests stay green

### TDD is NOT happening when:

1. ❌ Tests written for existing code
2. ❌ Tests pass immediately
3. ❌ No code changes needed
4. ❌ Just verifying behavior

---

## 🎓 Key Takeaways

1. **Tests FIRST** - Always write tests before implementation
2. **Tests FAIL** - If tests don't fail first, it's not TDD
3. **Minimal Code** - Write smallest implementation to pass
4. **Refactor** - Improve code while tests stay green
5. **Specifications** - Tests define behavior, not verify it

---

## 📚 Reference

When in doubt, refer to this document. If a command says "TDD", follow this process exactly.

**Remember**: Tests drive development. Code satisfies tests. Not the reverse.

---

**Last Updated**: January 2025  
**Status**: 🔴 **MANDATORY REFERENCE** - Always follow this process


