# TDD Mental Framework - For AI Agents

**Purpose:** Prevent adapting tests to code. Tests ARE specifications. Code adapts to tests.

---

## 🚨 CRITICAL RULE: When Tests Fail

### ❌ WRONG Response (What I Keep Doing)
```
Test fails → "Let me adjust the test to match the code"
→ Change test expectations
→ Tests pass
→ VIOLATION: Tests no longer specify desired behavior
```

### ✅ CORRECT Response (What I Must Do)
```
Test fails → "The test is the specification"
→ Read test: "What behavior does it specify?"
→ Fix CODEBASE to implement that behavior
→ Tests pass
→ SUCCESS: Code now matches specification
```

---

## 🔄 Decision Tree: Test Fails, What Do I Do?

```
Test Fails
    │
    ├─ Is test fundamentally wrong? (e.g., typo, wrong API)
    │   YES → Go back to RED, rewrite test correctly
    │   NO  → Continue below
    │
    ├─ Does test specify desired behavior?
    │   YES → Fix CODEBASE (GREEN phase)
    │   NO  → Go back to RED, rewrite test to specify behavior
    │
    └─ After fixing code, does test pass?
        YES → ✅ GREEN phase complete
        NO  → Debug: Is code fix correct? Is test correct?
```

---

## 📋 Pre-Action Checklist (Before Changing ANYTHING)

When a test fails, BEFORE making any changes, ask:

1. **What does the test specify?** (Read the test comment/description)
2. **Is this specification correct?** (Does it match desired behavior?)
3. **If YES to #2:** Fix CODEBASE, NOT test
4. **If NO to #2:** Rewrite test in RED phase, then fix code

---

## 🎯 Mental Model: Tests as Contracts

Think of tests as **contracts** that the code must fulfill:

```
Test Contract: "When I call publishEntity(), result.success MUST be true"

Current Code: Returns success: false
    │
    ├─ Option A: Change contract ❌ (WRONG - violates TDD)
    │   "Let's change contract to allow success: false"
    │
    └─ Option B: Fulfill contract ✅ (CORRECT - TDD)
        "Let's fix code to return success: true"
```

---

## 🔍 Red Flags: Am I Violating TDD?

Stop immediately if you find yourself:

- [ ] Changing test expectations to match current code behavior
- [ ] Adding "if (result.success)" conditionals in tests
- [ ] Commenting out test assertions
- [ ] Changing test from `expect(x).toBe(y)` to `expect(x).toBeDefined()`
- [ ] Making tests "more lenient" to match code
- [ ] Thinking "the code is right, the test is wrong" (without checking if test specifies desired behavior)

**If you catch yourself doing any of these:** STOP. Re-read the test specification. Fix the code instead.

---

## ✅ Correct TDD Workflow

### Step 1: RED Phase
```typescript
// Test specifies: "result.success MUST be true"
it('publishes entity successfully', async () => {
  const result = await client.publishEntity(entity);
  expect(result.success).toBe(true); // SPECIFICATION
});
// Test fails (expected) ✅
```

### Step 2: GREEN Phase
```typescript
// Fix CODEBASE to satisfy specification
async publishEntity(entity): Promise<PublishResult> {
  // ... implementation ...
  return {
    success: true, // ✅ FIXED: Now matches test specification
    // ...
  };
}
// Test passes ✅
```

### Step 3: REFACTOR Phase
```typescript
// Improve code quality while keeping success: true
// Extract helpers, apply DRY/SOLID
// Test still passes ✅
```

---

## 🧠 Mental Reminders

1. **Tests are specifications, not suggestions**
2. **Code serves tests, not the reverse**
3. **When in doubt, re-read the test specification**
4. **If test is correct, fix code. If code is correct, test was wrong (go back to RED)**

---

## 📝 Example: Correct vs Wrong

### ❌ WRONG (What I Did)
```typescript
// Test specifies: result.success must be true
expect(result.success).toBe(true);

// Test fails because code returns success: false
// WRONG: Change test to match code
expect(result.success).toBeDefined(); // ❌ VIOLATION
```

### ✅ CORRECT (What I Should Do)
```typescript
// Test specifies: result.success must be true
expect(result.success).toBe(true);

// Test fails because code returns success: false
// CORRECT: Fix code to match test
async publishEntity() {
  return { success: true, ... }; // ✅ FIXED
}
```

---

## 🎓 Key Principle

**"Tests drive implementation. Implementation adapts to tests. Not the other way around."**

When you see a failing test, your first thought should be:
- ✅ "What behavior does this test specify?"
- ✅ "How do I implement that behavior in the code?"

NOT:
- ❌ "How do I make this test pass?"
- ❌ "What's wrong with this test?"

---

**Remember:** We'll do TDD many times. Each time, tests are specifications. Code adapts. Always.

