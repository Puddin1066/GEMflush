# Next MVP Development Step

**Date:** November 10, 2025  
**Status:** ✅ Build Fixed - Ready for Integration Testing  
**Priority:** 🔴 CRITICAL - End-to-End Workflow Validation

---

## ✅ What's Just Been Completed

1. **Build System Fixed**
   - ✅ Increased Node heap size to 4GB (`NODE_OPTIONS=--max-old-space-size=4096`)
   - ✅ Fixed TypeScript errors in test fixtures
   - ✅ Build now succeeds: `pnpm build` ✅

2. **Foundation Status**
   - ✅ All `lib/` modules tested and debugged (386 tests passing)
   - ✅ Dashboard using real database data
   - ✅ Business CRUD pages implemented
   - ✅ API routes functional with mocks

---

## 🎯 RECOMMENDED NEXT STEP: End-to-End Workflow Testing

**Why This Step:**
- You've completed all backend services and testing
- UI is connected to database
- **Critical gap:** No one has tested the complete user journey yet
- Need to validate integration points work together
- Find bugs before connecting real APIs

**Time Estimate:** 2-4 hours

---

## 📋 Step-by-Step Action Plan

### Phase 1: Manual End-to-End Testing (2-3 hours)

#### Test Scenario 1: New User Journey

1. **Start Development Server**
   ```bash
   pnpm dev
   # Visit http://localhost:3000
   ```

2. **Sign Up Flow**
   - [ ] Create new account
   - [ ] Verify redirect to dashboard
   - [ ] Check empty state displays correctly
   - [ ] Verify "Add Business" CTA works

3. **Add Business Flow**
   - [ ] Click "Add Business"
   - [ ] Fill form with test data:
     - Name: "Test Coffee Shop"
     - URL: https://example.com
     - Category: Restaurant
     - Location: Seattle, WA
   - [ ] Submit form
   - [ ] Verify redirect to business detail page
   - [ ] Check database: `SELECT * FROM businesses;`

4. **Crawl Website (Mock)**
   - [ ] Click "Crawl Website" button
   - [ ] Verify job status shows "Processing"
   - [ ] Wait for completion (mock delay)
   - [ ] Verify crawl data displays
   - [ ] Check `businesses.crawlData` JSONB field populated

5. **Run LLM Fingerprint (Mock)**
   - [ ] Click "Run Fingerprint" button
   - [ ] Verify job status updates
   - [ ] Wait for completion
   - [ ] Verify visibility score displays (0-100)
   - [ ] Check per-model breakdown shown
   - [ ] Verify `llm_fingerprints` table has new row

6. **View Results**
   - [ ] Verify dashboard shows updated stats
   - [ ] Check business card shows visibility score
   - [ ] Verify "Upgrade to Pro" CTA appears (if free user)

#### Test Scenario 2: Pro User Workflow

1. **Upgrade to Pro (Manual DB Update)**
   ```sql
   UPDATE teams SET plan_name = 'pro' WHERE id = <your_team_id>;
   ```

2. **Wikidata Publishing (Mock)**
   - [ ] Visit business detail page
   - [ ] Verify "Publish to Wikidata" button is enabled
   - [ ] Click button
   - [ ] Verify job processes
   - [ ] Check mock QID assigned (e.g., Q99999999)
   - [ ] Verify badge shows "Published"
   - [ ] Check `wikidata_entities` table has new row

3. **Multiple Businesses (Pro: 5 limit)**
   - [ ] Add 2nd business
   - [ ] Add 3rd business
   - [ ] Verify all appear in dashboard
   - [ ] Check stats update correctly
   - [ ] Try adding 6th business (should be blocked)

---

### Phase 2: Bug Fixes & Polish (1-2 hours)

**Based on Testing, Fix:**

1. **Loading States**
   - Add spinners to async actions
   - Disable buttons during processing
   - Show progress indicators

2. **Error Handling**
   - Add try/catch blocks
   - Display user-friendly error messages
   - Handle edge cases (invalid URLs, API failures)

3. **Form Validation**
   - Client-side validation
   - Clear error messages
   - Required field indicators

4. **Empty States**
   - Helpful messages
   - Clear CTAs
   - No blank screens

---

## 🚀 After This Step: Connect Real APIs

Once end-to-end workflow is validated:

### Next Priority: Real API Integration

1. **OpenRouter Setup** (Day 5)
   - Get API key ($20 credit)
   - Replace mocks in `lib/llm/openrouter.ts`
   - Test with 2-3 models (GPT-4, Claude, Gemini)
   - Monitor costs

2. **Real Web Crawler** (Day 3-4)
   - Remove mocks in `/api/crawl/route.ts`
   - Test on 10-20 diverse websites
   - Handle edge cases (404, blocked sites)

3. **Wikidata Publishing** (Day 3-4)
   - Create test.wikidata.org bot account
   - Connect to test API
   - Test entity publishing
   - Verify QID assignment

---

## 📊 Success Criteria

### This Step is Complete When:

- ✅ Can complete full user journey without crashes
- ✅ All database operations work correctly
- ✅ UI updates reflect backend state changes
- ✅ No critical bugs blocking core workflows
- ✅ Error messages are helpful
- ✅ Loading states show progress

### Ready for Next Step When:

- ✅ End-to-end workflow validated
- ✅ Top 3 bugs fixed
- ✅ Ready to connect real APIs

---

## 🛠️ Quick Commands

```bash
# Start dev server
pnpm dev

# Check database
psql $DATABASE_URL
SELECT * FROM businesses;
SELECT * FROM llm_fingerprints;
SELECT * FROM wikidata_entities;

# Run tests (verify nothing broke)
pnpm test:run lib

# Build (verify still works)
pnpm build
```

---

## 💡 Key Principles

1. **Test Like a User**
   - Follow the happy path first
   - Then intentionally break things
   - Document all bugs found

2. **Fix Blockers First**
   - P0: Prevents core functionality
   - P1: Causes data loss
   - P2: UX issues (defer if not blocking)

3. **Keep Moving Forward**
   - Don't perfect everything
   - Get it working, then polish
   - Ship fast, iterate faster

---

## 🎯 Why This Step Matters

**You've built:**
- ✅ Complete backend services
- ✅ Comprehensive test coverage
- ✅ Database integration
- ✅ UI components

**What's missing:**
- ❌ Validation that it all works together
- ❌ Real user experience testing
- ❌ Integration bug discovery

**This step bridges the gap** between "code works" and "product works."

---

## 📝 Bug Tracking Template

Create `TESTING_LOG.md`:

```markdown
## Bug #1: [Title]
- **Severity:** Critical / High / Medium / Low
- **Steps to Reproduce:**
  1. 
  2. 
  3. 
- **Expected:** 
- **Actual:** 
- **Fix:** 
- **Status:** Open / Fixed
```

---

## 🎉 What Success Looks Like

By end of this step, you should be able to:

1. ✅ Sign up → Add business → See it in dashboard
2. ✅ Click "Crawl" → See mock data appear
3. ✅ Click "Fingerprint" → See visibility score
4. ✅ (As Pro) Click "Publish" → See QID assigned
5. ✅ All actions persist to database
6. ✅ No crashes or critical errors

**Then you're ready to connect real APIs!** 🚀

---

**Next Document:** After completing this step, proceed to `REAL_API_INTEGRATION.md`

