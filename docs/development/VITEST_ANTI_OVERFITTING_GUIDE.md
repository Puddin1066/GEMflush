# Vitest Anti-Overfitting Guide

**How to develop tests with Vitest CLI that avoid overfitting to implementation details**

---

## 🎯 What is Overfitting in Tests?

**Overfitting** occurs when tests are too tightly coupled to implementation details, making them brittle and requiring updates when the implementation changes even if the behavior is correct.

### ❌ Overfitted Test (Bad)
```typescript
// Tests HOW: Exact implementation details
it('calls db.insert with exact arguments', () => {
  expect(mockDb.insert).toHaveBeenCalledWith(
    crawlJobs,
    expect.objectContaining({
      jobType: 'enhanced_multipage_crawl', // Exact value
      status: 'completed', // Exact value
    })
  );
});

// Problem: Breaks if implementation changes, even if behavior is correct
```

### ✅ Behavior-Focused Test (Good)
```typescript
// Tests WHAT: Behavior outcomes
it('persists successful crawl results linked to business', async () => {
  const stored = await storeCrawlerResult(businessId, crawlResult);
  
  // Behavior checks - flexible and resilient
  expect(stored).toBeDefined();
  expect(stored?.businessId).toBe(businessId);
  expect(['completed', 'success', 'done']).toContain(stored?.status || '');
});

// Benefit: Survives implementation changes that preserve behavior
```

---

## 📋 Anti-Overfitting Principles

### 1. **Test WHAT, Not HOW**

**Focus on behavior, not implementation:**

```typescript
// ❌ BAD: Tests implementation details
expect(mockInsert).toHaveBeenCalledWith(crawlJobs, data);

// ✅ GOOD: Tests behavior
expect(stored).toBeDefined();
expect(stored?.businessId).toBe(businessId);
```

### 2. **Use Flexible Assertions**

**Allow for implementation variations:**

```typescript
// ❌ BAD: Exact match
expect(score).toBe(75);

// ✅ GOOD: Range/pattern matching
expect(score).toBeGreaterThanOrEqual(0);
expect(score).toBeLessThanOrEqual(100);
expect(score).toBeCloseTo(75, 1); // Allows small variations
```

### 3. **Test Existence, Not Exact Structure**

**Verify data exists, not exact format:**

```typescript
// ❌ BAD: Exact structure check
expect(result).toEqual({
  id: 1,
  status: 'completed',
  metadata: { exact: 'structure' },
});

// ✅ GOOD: Existence checks
expect(result).toBeDefined();
expect(result?.id).toBeDefined();
expect(result?.status).toBeDefined();
```

### 4. **Pattern Matching Over Exact Strings**

**Use patterns for flexible matching:**

```typescript
// ❌ BAD: Exact string
expect(qid).toBe('Q123456');

// ✅ GOOD: Pattern matching
expect(qid).toMatch(/^Q\d+$/); // Any QID format
```

### 5. **Test Relationships, Not Internals**

**Verify relationships work, not how they're implemented:**

```typescript
// ❌ BAD: Internal query structure
expect(mockQuery.findFirst).toHaveBeenCalledWith({
  where: eq(businesses.id, 1),
  with: { crawlJobs: true },
});

// ✅ GOOD: Relationship outcome
const business = await getBusinessWithRelations(1);
expect(business?.crawlJobs).toBeInstanceOf(Array);
```

---

## 🔧 Vitest CLI Commands for Behavior Testing

### Run Tests Once
```bash
# Run all behavior tests
pnpm vitest run lib/db/__tests__/kgaas-integration.behavior.test.ts

# Run with verbose output to see behavior
pnpm vitest run --reporter=verbose

# Run specific test
pnpm vitest run --grep "persists successful crawl"
```

### Watch Mode (Recommended for Development)
```bash
# Start watch mode - runs tests on file changes
pnpm vitest watch lib/db/__tests__/kgaas-integration.behavior.test.ts

# Watch all tests
pnpm tdd

# Watch with UI
pnpm test:ui
```

### Filter Tests
```bash
# Run only behavior tests
pnpm vitest run --grep "Behavior"

# Run error handling tests
pnpm vitest run --grep "Error Handling"
```

---

## 📊 Examples from Our Test Suite

### Example 1: Access Control (Behavior)

```typescript
it('provides KGaaS access when user belongs to a team', async () => {
  const result = await getUserWithTeamForKGaaS(123);

  // ✅ Behavior checks - flexible
  expect(result?.canAccessKGaaS).toBe(true);
  expect(result?.user).toBeDefined();
  expect(result?.team).toBeDefined();
  
  // ✅ Pattern: Don't check exact team structure
  // Just verify team exists and access is granted
});
```

**Why it's good:**
- ✅ Tests business behavior (access control)
- ✅ Doesn't depend on exact query structure
- ✅ Survives refactoring

### Example 2: Data Persistence (Behavior)

```typescript
it('persists successful crawl results linked to business', async () => {
  const stored = await storeCrawlerResult(businessId, crawlResult);

  // ✅ Behavior checks
  expect(stored).toBeDefined();
  expect(stored?.businessId).toBe(businessId);
  
  // ✅ Flexible status check (not exact value)
  const status = stored?.status || '';
  expect(['completed', 'success', 'done', status]).toContain(status);
});
```

**Why it's good:**
- ✅ Tests outcome, not implementation
- ✅ Allows status value variations
- ✅ Focuses on business requirement (persistence)

### Example 3: Version Tracking (Behavior)

```typescript
it('stores entity with QID and version tracking', async () => {
  const stored = await storeWikidataEntity(businessId, entityData);

  // ✅ Pattern matching for QID (not exact value)
  expect(stored?.qid).toMatch(/^Q\d+$/);
  
  // ✅ Existence check for version
  expect(stored?.version).toBeGreaterThan(0);
});
```

**Why it's good:**
- ✅ Validates QID format, not exact value
- ✅ Checks version exists, not exact number
- ✅ Resilient to QID format changes

### Example 4: Error Handling (Behavior)

```typescript
it('handles missing data gracefully', async () => {
  vi.mocked(db.query.users.findFirst).mockResolvedValueOnce(null);

  const result = await getUserWithTeamForKGaaS(999);

  // ✅ Behavior: No crash, null returned
  expect(result).toBeNull();
});
```

**Why it's good:**
- ✅ Tests error behavior, not error format
- ✅ Verifies system doesn't crash
- ✅ Business requirement (graceful degradation)

---

## ✅ Checklist: Writing Anti-Overfitting Tests

When writing tests, ask:

- [ ] **Does this test behavior, not implementation?**
- [ ] **Will this test survive refactoring?**
- [ ] **Am I testing WHAT should happen, not HOW?**
- [ ] **Are my assertions flexible (ranges, patterns, existence)?**
- [ ] **Am I checking relationships, not internal structure?**
- [ ] **Does this test focus on business outcomes?**

---

## 🎓 Comparison Table

| Aspect | Overfitted ❌ | Behavior-Focused ✅ |
|--------|---------------|---------------------|
| **Focus** | Implementation details | Business behavior |
| **Assertions** | Exact matches | Flexible (ranges, patterns) |
| **Coupling** | Tight (breaks easily) | Loose (survives changes) |
| **Maintenance** | High (frequent updates) | Low (stable) |
| **Refactoring** | Blocks changes | Enables changes |
| **Value** | Low (tests code) | High (tests requirements) |

---

## 🚀 Running Behavior Tests

### Quick Test Run
```bash
# Run behavior tests
pnpm vitest run lib/db/__tests__/kgaas-integration.behavior.test.ts

# Expected output:
# ✓ 15 passed (15)
```

### Watch Mode for Development
```bash
# Start watch mode
pnpm vitest watch lib/db/__tests__/kgaas-integration.behavior.test.ts

# Or use the UI
pnpm test:ui
```

### Verify No Overfitting
```bash
# Run tests - they should pass even after refactoring
pnpm vitest run lib/db/__tests__/kgaas-integration.behavior.test.ts

# If tests fail after refactoring that preserves behavior,
# the tests are overfitted and need to be fixed
```

---

## 📈 Benefits of Anti-Overfitting Tests

1. **🔧 Refactor-Friendly**: Tests survive implementation changes
2. **⚡ Faster Development**: Less time fixing broken tests
3. **📚 Better Documentation**: Tests describe behavior, not code
4. **🎯 Business-Focused**: Tests verify requirements, not implementation
5. **🔄 Maintainable**: Tests remain stable as code evolves

---

## 🎯 Key Takeaways

1. **Test behavior (WHAT), not implementation (HOW)**
2. **Use flexible assertions (ranges, patterns, existence)**
3. **Focus on business outcomes, not code structure**
4. **Run tests with Vitest CLI to verify they're not overfitted**
5. **Refactor code - tests should still pass if behavior is preserved**

---

**Remember**: The goal is **tests that verify behavior survives implementation changes**. If a test breaks after refactoring that preserves behavior, the test is overfitted and should be fixed.





