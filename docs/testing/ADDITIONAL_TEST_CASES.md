# Additional Pragmatic Test Cases

**Date:** November 10, 2025  
**Focus:** Visibility Fingerprint & Wikidata Publication Flows

---

## 🎯 Test Strategy

**Principles:**
- Test user-facing workflows (not implementation details)
- Cover critical business logic paths
- Test error handling that users encounter
- Avoid overfitting (flexible assertions)

---

## 📊 **Visibility Fingerprint Flows**

### 1. **Complete Fingerprint Workflow** ⭐ HIGH PRIORITY
**User Journey:** Create business → Crawl → Fingerprint → View results

**Test Steps:**
1. Create business via UI
2. Trigger crawl (mock or real)
3. Wait for crawl completion
4. Trigger fingerprint analysis
5. Verify loading state shows
6. Wait for completion
7. Verify results display:
   - Visibility score is shown
   - Per-model breakdown visible
   - Competitive leaderboard link present
   - Trend indicators (if previous fingerprint exists)

**Why:** This is the core value proposition - users need to see their visibility score

**File:** `tests/e2e/fingerprint-workflows.spec.ts` (new)

---

### 2. **Fingerprint Results Display** ⭐ HIGH PRIORITY
**User Journey:** View detailed fingerprint analysis

**Test Steps:**
1. Navigate to business with existing fingerprint
2. Click "View Full Analysis" or navigate to `/dashboard/businesses/[id]/fingerprint`
3. Verify:
   - Visibility score card displays
   - Per-model breakdown shows all models tested
   - Sentiment indicators visible
   - Average rank position shown
   - Competitive leaderboard link works

**Why:** Users need to understand their visibility breakdown

**File:** `tests/e2e/fingerprint-workflows.spec.ts`

---

### 3. **Fingerprint Trend Comparison** ⭐ MEDIUM PRIORITY
**User Journey:** Compare current vs previous fingerprint

**Test Steps:**
1. Create business and run first fingerprint
2. Run second fingerprint
3. Verify trend indicators:
   - Score change (up/down arrow or percentage)
   - Mention rate change
   - Sentiment trend

**Why:** Trend tracking is valuable for users to see improvement

**File:** `tests/e2e/fingerprint-workflows.spec.ts`

---

### 4. **Fingerprint Error Handling** ⭐ MEDIUM PRIORITY
**User Journey:** Handle fingerprint failures gracefully

**Test Steps:**
1. Mock fingerprint API to return error
2. Trigger fingerprint
3. Verify:
   - Error message displayed to user
   - Button re-enabled (not stuck in loading)
   - User can retry

**Why:** Users need clear feedback when things fail

**File:** `tests/e2e/fingerprint-workflows.spec.ts`

---

### 5. **Competitive Leaderboard Display** ⭐ MEDIUM PRIORITY
**User Journey:** View competitive analysis

**Test Steps:**
1. Navigate to business with fingerprint containing competitive data
2. Click "View Competitive Leaderboard"
3. Verify:
   - Leaderboard page loads
   - Business rank displayed
   - Competitors listed
   - Market position indicator shown

**Why:** Competitive intelligence is a key feature

**File:** `tests/e2e/competitive-workflows.spec.ts` (new)

---

## 🔗 **Wikidata Publication Flows**

### 6. **Complete Publish Workflow** ⭐ HIGH PRIORITY
**User Journey:** Crawl → Publish → Verify QID

**Test Steps:**
1. Create business
2. Trigger crawl (mock successful crawl)
3. Wait for crawl completion
4. Click "Publish to Wikidata"
5. Verify:
   - Loading state shows
   - Success message with QID
   - Business status updates to "published"
   - QID displayed in UI
   - Link to Wikidata entity works

**Why:** This is the premium feature - must work end-to-end

**File:** `tests/e2e/wikidata-workflows.spec.ts` (new)

---

### 7. **Permission Gating (Free Tier)** ⭐ HIGH PRIORITY
**User Journey:** Free user tries to publish

**Test Steps:**
1. Create business as free tier user
2. Complete crawl
3. Attempt to publish
4. Verify:
   - Error message: "Upgrade to Pro plan to publish"
   - Upgrade CTA displayed
   - No publication occurs

**Why:** Critical for monetization - must prevent free users from publishing

**File:** `tests/e2e/wikidata-workflows.spec.ts`

---

### 8. **Pre-Publish Validation** ⭐ HIGH PRIORITY
**User Journey:** Try to publish before crawling

**Test Steps:**
1. Create business (not crawled)
2. Attempt to publish
3. Verify:
   - Error: "Business must be crawled before publishing"
   - Publish button disabled or shows error

**Why:** Prevents invalid states and user confusion

**File:** `tests/e2e/wikidata-workflows.spec.ts`

---

### 9. **Notability Check Failure** ⭐ MEDIUM PRIORITY
**User Journey:** Business fails notability check

**Test Steps:**
1. Create business with minimal data
2. Complete crawl
3. Mock notability check to return `canPublish: false`
4. Attempt to publish
5. Verify:
   - Error message explains notability failure
   - Recommendation shown (e.g., "Add more business details")
   - User can see what's missing

**Why:** Users need to understand why they can't publish

**File:** `tests/e2e/wikidata-workflows.spec.ts`

---

### 10. **Publish Error Recovery** ⭐ MEDIUM PRIORITY
**User Journey:** Handle publish API failures

**Test Steps:**
1. Complete crawl
2. Mock publish API to return error
3. Attempt to publish
4. Verify:
   - Error message displayed
   - Business status doesn't change to "published"
   - User can retry

**Why:** Network/API errors happen - must handle gracefully

**File:** `tests/e2e/wikidata-workflows.spec.ts`

---

### 11. **Entity Preview Before Publishing** ⭐ LOW PRIORITY
**User Journey:** Preview entity before publishing

**Test Steps:**
1. Complete crawl
2. Click "Preview JSON" or entity preview
3. Verify:
   - Entity data displayed
   - Properties shown
   - QIDs resolved (if applicable)

**Why:** Users may want to review before publishing (if feature exists)

**File:** `tests/e2e/wikidata-workflows.spec.ts`

---

## 🔄 **Integrated Data Flows**

### 12. **Complete Workflow: Add → Crawl → Fingerprint → Publish** ⭐ HIGH PRIORITY
**User Journey:** Full user onboarding flow

**Test Steps:**
1. Sign up (new user)
2. Add first business
3. Trigger crawl
4. Wait for crawl completion
5. Trigger fingerprint
6. Wait for fingerprint completion
7. View results
8. (If Pro tier) Publish to Wikidata
9. Verify all data persists and displays correctly

**Why:** This is the complete user journey - must work seamlessly

**File:** `tests/e2e/complete-workflows.spec.ts` (extend existing)

---

### 13. **Fingerprint After Publish** ⭐ MEDIUM PRIORITY
**User Journey:** Measure impact of publishing

**Test Steps:**
1. Publish business to Wikidata
2. Run fingerprint after publish
3. Verify:
   - Fingerprint completes successfully
   - Results may show improved visibility (if logic exists)
   - QID is referenced in fingerprint data

**Why:** Users want to measure impact of publishing

**File:** `tests/e2e/fingerprint-workflows.spec.ts`

---

### 14. **Data Persistence Across Sessions** ⭐ MEDIUM PRIORITY
**User Journey:** Verify data persists after page refresh

**Test Steps:**
1. Create business, crawl, fingerprint
2. Refresh page
3. Verify:
   - Business data still displays
   - Fingerprint results still visible
   - QID persists (if published)

**Why:** Critical for user trust - data must persist

**File:** `tests/e2e/complete-workflows.spec.ts`

---

## 🎨 **UI/UX Flows**

### 15. **Loading States Throughout Workflow** ⭐ MEDIUM PRIORITY
**User Journey:** Verify all loading states work

**Test Steps:**
1. Test loading states for:
   - Business creation
   - Crawl initiation
   - Fingerprint analysis
   - Wikidata publishing
2. Verify:
   - Buttons show loading text
   - Buttons are disabled during loading
   - Loading skeletons/spinners visible

**Why:** Good UX requires clear loading feedback

**File:** `tests/e2e/complete-workflows.spec.ts` (extend)

---

### 16. **Empty States** ⭐ LOW PRIORITY
**User Journey:** Handle empty states gracefully

**Test Steps:**
1. Navigate to business with no fingerprint
2. Verify:
   - Empty state message shown
   - CTA to run fingerprint visible
   - No errors displayed

**Why:** First-time users need guidance

**File:** `tests/e2e/fingerprint-workflows.spec.ts`

---

## 📋 **Implementation Priority**

### **Phase 1: Critical Paths** (Do First)
1. ✅ Complete Fingerprint Workflow (#1)
2. ✅ Fingerprint Results Display (#2)
3. ✅ Complete Publish Workflow (#6)
4. ✅ Permission Gating (#7)
5. ✅ Pre-Publish Validation (#8)
6. ✅ Complete Workflow: Add → Crawl → Fingerprint → Publish (#12)

### **Phase 2: Error Handling** (Do Second)
7. ✅ Fingerprint Error Handling (#4)
8. ✅ Notability Check Failure (#9)
9. ✅ Publish Error Recovery (#10)

### **Phase 3: Enhanced Features** (Do Third)
10. ✅ Fingerprint Trend Comparison (#3)
11. ✅ Competitive Leaderboard Display (#5)
12. ✅ Fingerprint After Publish (#13)
13. ✅ Data Persistence (#14)
14. ✅ Loading States (#15)

### **Phase 4: Nice to Have** (Do Last)
15. ✅ Entity Preview (#11)
16. ✅ Empty States (#16)

---

## 🛠️ **Test File Structure**

```
tests/e2e/
├── fingerprint-workflows.spec.ts    (NEW - #1-5, #13)
├── wikidata-workflows.spec.ts       (NEW - #6-11)
├── competitive-workflows.spec.ts    (NEW - #5)
└── complete-workflows.spec.ts       (EXTEND - #12, #14-16)
```

---

## 📝 **Notes**

- **Mock vs Real:** Use mocks for external APIs (OpenRouter, Wikidata) to keep tests fast and reliable
- **Flexible Assertions:** Don't overfit - test behavior, not exact text/values
- **DRY Principle:** Reuse page objects and helpers from existing tests
- **SOLID Principles:** Each test should have single responsibility

---

## ✅ **Next Steps**

1. Create `fingerprint-workflows.spec.ts` with tests #1-4
2. Create `wikidata-workflows.spec.ts` with tests #6-10
3. Extend `complete-workflows.spec.ts` with test #12
4. Run tests and fix any bugs found
5. Iterate on remaining tests

**Ready to implement!** 🚀

