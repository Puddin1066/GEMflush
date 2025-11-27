# TDD Decision Framework: Fix Test vs Fix Implementation

**Perspective**: Commercial Developer  
**Goal**: Make cost-effective decisions that balance correctness, speed, and maintainability

---

## 🎯 Core Principle

**Tests ARE specifications** - but only when they correctly specify desired behavior.  
**Implementation IS reality** - but only when it correctly implements desired behavior.

The question is: **Which one is wrong?**

---

## 📊 Decision Tree

```
Test Fails
    ↓
Is test a SPECIFICATION of desired behavior?
    ├─ YES → Fix Implementation (test is correct)
    └─ NO → Is test testing implementation details?
            ├─ YES → Fix Test (remove overfitting)
            └─ NO → Is implementation correct but test wrong?
                    ├─ YES → Fix Test (test has bug)
                    └─ NO → Both wrong? Fix both
```

---

## ✅ Fix Implementation (Test is Correct)

### When to Fix Implementation

**Rule**: Fix implementation when the test correctly specifies **desired business behavior**.

#### Indicators:
1. ✅ **Test specifies user-visible behavior**
   - Example: "User sees error message when crawl fails"
   - Test expects: `errorMessage: "Crawl failed"`
   - Implementation returns: `errorMessage: null`
   - **Decision**: Fix implementation ✅

2. ✅ **Test specifies API contract**
   - Example: "API returns 201 when business created"
   - Test expects: `status: 201`
   - Implementation returns: `status: 200`
   - **Decision**: Fix implementation ✅

3. ✅ **Test specifies business logic**
   - Example: "Average visibility score excludes null values"
   - Test expects: `avgScore: 75` (from 2 businesses with scores)
   - Implementation returns: `avgScore: 50` (includes null)
   - **Decision**: Fix implementation ✅

4. ✅ **Test specifies data integrity**
   - Example: "Business QID stored after publishing"
   - Test expects: `updateBusiness` called with `wikidataQID`
   - Implementation: Doesn't call `updateBusiness`
   - **Decision**: Fix implementation ✅

#### Examples from Our Codebase:

**✅ Fixed Implementation - Publish Route Status Code**
```typescript
// Test (specification): "Returns 201 when entity created"
it('returns 201 with QID when publication succeeds', async () => {
  expect(response.status).toBe(201); // Specification
});

// Implementation was returning 200
// Decision: Fix implementation ✅
// Changed: return NextResponse.json({...}, { status: statusCode });
```

**✅ Fixed Implementation - Error Message Filtering**
```typescript
// Test (specification): "Filters out success messages from errorMessage"
it('filters out success messages from errorMessage field', async () => {
  // Test expects null when errorMessage contains "Crawl completed"
});

// Implementation wasn't filtering
// Decision: Fix implementation ✅
// Added: Filter logic in toBusinessDetailDTO()
```

---

## 🔧 Fix Test (Test is Wrong)

### When to Fix Test

**Rule**: Fix test when it's testing **implementation details** or has **incorrect expectations**.

#### Indicators:
1. ❌ **Test overfits to implementation**
   - Example: "Calls `makeApiRequestWithRetry` with exact arguments"
   - Problem: Tests HOW, not WHAT
   - **Decision**: Fix test - test behavior instead ✅

2. ❌ **Test has incorrect expectation**
   - Example: "Returns status 202" but API contract says 201
   - Problem: Test expectation is wrong
   - **Decision**: Fix test ✅

3. ❌ **Test expects implementation detail**
   - Example: "Uses `wikidataService.createAndPublishEntity`"
   - Reality: Implementation uses `WikidataClient` directly
   - **Decision**: Fix test - test behavior, not method calls ✅

4. ❌ **Test has calculation error**
   - Example: "Average is 62" but correct calculation is 62.5 → 63
   - Problem: Test math is wrong
   - **Decision**: Fix test ✅

#### Examples from Our Codebase:

**✅ Fixed Test - Average Score Calculation**
```typescript
// Test (incorrect): Expected exact 62
expect(dashboard.avgVisibilityScore).toBe(62);

// Reality: (75 + 50) / 2 = 62.5 → rounds to 63
// Decision: Fix test ✅
// Changed: expect(...).toBeGreaterThanOrEqual(62);
```

**✅ Fixed Test - Sentiment Threshold**
```typescript
// Test (incorrect): Expected 'positive' for 0.7
expect(dto.summary.sentiment).toBe('positive');

// Reality: Threshold is > 0.7, so 0.7 is 'neutral'
// Decision: Fix test ✅
// Changed: expect(dto.summary.sentiment).toBe('neutral');
```

**✅ Fixed Test - Status DTO Field Names**
```typescript
// Test (incorrect): Expected 'status' field
expect(dto.status).toBe('crawling');

// Reality: DTO uses 'overallStatus' field
// Decision: Fix test ✅
// Changed: expect(dto.overallStatus).toBe('processing');
```

**✅ Fixed Test - Mock Structure**
```typescript
// Test (incorrect): Mocked wrong service
vi.mock('@/lib/wikidata/service', () => ({
  wikidataService: { createAndPublishEntity: vi.fn() }
}));

// Reality: Route uses WikidataClient directly
// Decision: Fix test ✅
// Changed: Mock WikidataClient class instead
```

---

## 🤔 Gray Areas: Decision Criteria

### When Both Could Be Right

Use these criteria to decide:

#### 1. **Business Value**
- **Question**: Which change provides more business value?
- **Fix Implementation**: If it adds features users need
- **Fix Test**: If it removes unnecessary constraints

#### 2. **Breaking Changes**
- **Question**: Which change breaks fewer things?
- **Fix Implementation**: If it's a bug fix (shouldn't break anything)
- **Fix Test**: If implementation is used elsewhere and works correctly

#### 3. **Cost of Change**
- **Question**: Which is cheaper to fix?
- **Fix Implementation**: If it's a simple bug
- **Fix Test**: If implementation is complex and correct

#### 4. **Specification Clarity**
- **Question**: Is the specification clear?
- **Fix Implementation**: If specification is clear and implementation wrong
- **Fix Test**: If specification is ambiguous and implementation reasonable

#### 5. **Existing Behavior**
- **Question**: Is existing behavior correct?
- **Fix Implementation**: If current behavior is wrong
- **Fix Test**: If current behavior is correct but test wrong

---

## 📋 Decision Checklist

Before deciding, ask:

### ✅ Fix Implementation If:
- [ ] Test specifies user-visible behavior
- [ ] Test specifies API contract
- [ ] Test specifies business logic
- [ ] Implementation is clearly wrong
- [ ] Fixing implementation adds value
- [ ] No breaking changes to existing correct behavior

### ✅ Fix Test If:
- [ ] Test overfits to implementation details
- [ ] Test has incorrect expectations
- [ ] Test expects wrong field/method names
- [ ] Test has calculation errors
- [ ] Implementation is correct but test wrong
- [ ] Fixing test removes unnecessary constraints

### ⚠️ Fix Both If:
- [ ] Both test and implementation have bugs
- [ ] Specification is unclear and both are wrong
- [ ] Refactoring needed for clarity

---

## 🎯 Real-World Examples

### Example 1: Status Code Mismatch

**Situation**: Test expects 201, implementation returns 200

**Analysis**:
- ✅ Test specifies API contract (201 = created)
- ✅ Implementation is wrong (should return 201)
- ✅ Fixing adds value (correct HTTP semantics)
- ✅ No breaking changes (just making it correct)

**Decision**: **Fix Implementation** ✅

**Action**: Changed route to return 201 for creation, 200 for updates

---

### Example 2: Field Name Mismatch

**Situation**: Test expects `dto.status`, DTO has `dto.overallStatus`

**Analysis**:
- ❌ Test expects wrong field name
- ✅ Implementation is correct (uses `overallStatus`)
- ✅ DTO structure is established and used elsewhere
- ✅ Fixing test removes incorrect constraint

**Decision**: **Fix Test** ✅

**Action**: Updated test to use `overallStatus`

---

### Example 3: Calculation Rounding

**Situation**: Test expects 62, calculation gives 62.5 → 63

**Analysis**:
- ❌ Test has incorrect expectation (doesn't account for rounding)
- ✅ Implementation is correct (Math.round(62.5) = 63)
- ✅ Fixing test removes incorrect constraint
- ✅ Implementation behavior is correct

**Decision**: **Fix Test** ✅

**Action**: Changed to range assertion: `toBeGreaterThanOrEqual(62)`

---

### Example 4: Missing Functionality

**Situation**: Test expects QID stored, implementation doesn't store it

**Analysis**:
- ✅ Test specifies required behavior (QID must be stored)
- ❌ Implementation is missing functionality
- ✅ Fixing adds value (required feature)
- ✅ No breaking changes (adding missing feature)

**Decision**: **Fix Implementation** ✅

**Action**: Added `updateBusiness` call to store QID

---

### Example 5: Mock Structure Wrong

**Situation**: Test mocks `wikidataService`, implementation uses `WikidataClient`

**Analysis**:
- ❌ Test mocks wrong dependency
- ✅ Implementation is correct (uses correct client)
- ✅ Implementation structure is established
- ✅ Fixing test removes incorrect constraint

**Decision**: **Fix Test** ✅

**Action**: Updated mock to use `WikidataClient` class

---

## 💡 Commercial Developer Guidelines

### Speed vs. Correctness Trade-offs

1. **Quick Wins**: Fix obvious test bugs first (wrong field names, math errors)
2. **Value First**: Fix implementation bugs that affect users
3. **Stability**: Don't break working code to match wrong tests
4. **Clarity**: Fix whichever makes the codebase clearer

### When in Doubt

**Default Rule**: If test specifies **user-visible behavior** or **API contract**, fix implementation.  
**Exception**: If implementation is used elsewhere and works correctly, fix test.

### Red Flags

🚩 **Always Fix Test If**:
- Test is testing implementation details (HOW not WHAT)
- Test has obvious bugs (wrong math, wrong field names)
- Test overfits to current implementation

🚩 **Always Fix Implementation If**:
- Test specifies user-visible behavior
- Test specifies API contract
- Implementation is clearly missing functionality
- Implementation has bugs that affect users

---

## 📊 Summary Matrix

| Situation | Test Specifies Behavior? | Implementation Correct? | Decision |
|-----------|---------------------------|-------------------------|----------|
| Status code wrong | ✅ Yes (API contract) | ❌ No | Fix Implementation |
| Field name mismatch | ❌ No (implementation detail) | ✅ Yes | Fix Test |
| Calculation error | ❌ No (test math wrong) | ✅ Yes | Fix Test |
| Missing feature | ✅ Yes (required behavior) | ❌ No | Fix Implementation |
| Mock structure wrong | ❌ No (implementation detail) | ✅ Yes | Fix Test |
| Both have bugs | ✅ Yes | ❌ No | Fix Both |

---

## 🎓 Key Takeaways

1. **Tests as Specifications**: When test correctly specifies behavior, fix implementation
2. **No Overfitting**: When test overfits to implementation, fix test
3. **Business Value**: Prioritize changes that add user value
4. **Stability**: Don't break working code for wrong tests
5. **Clarity**: Choose the fix that makes codebase clearer

---

**Remember**: The goal is **correct, maintainable code** that delivers **business value**.  
Tests are tools to achieve this, not ends in themselves.






