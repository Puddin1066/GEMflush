# End-to-End Workflow Testing Guide

**Date:** November 10, 2025  
**Status:** Ready for Testing  
**Build Status:** ✅ Passing

---

## 🎯 Testing Objectives

Validate the complete user journey from sign-up to business management, ensuring all integration points work correctly.

---

## 📋 Pre-Testing Checklist

### Environment Setup
- [ ] Database is running and accessible
- [ ] `.env.local` has `DATABASE_URL` configured
- [ ] Run `pnpm db:push` to ensure schema is up to date
- [ ] Dev server can start: `pnpm dev`

### Verify Build
```bash
pnpm build  # Should complete successfully
```

---

## 🧪 Testing Options

### Option A: Automated E2E Tests (Recommended First)

**Playwright tests are already set up!** Run automated tests to quickly validate core workflows:

```bash
# Run all E2E tests
pnpm test:e2e

# Run in UI mode (interactive)
pnpm test:e2e:ui

# Run in headed mode (see browser)
pnpm test:e2e:headed

# Run specific test file
pnpm test:e2e complete-workflows
```

**What's Already Tested:**
- ✅ User onboarding flow (sign-up → dashboard)
- ✅ Business creation workflow
- ✅ Crawl workflow (button click → loading state)
- ✅ Fingerprint workflow (button click → loading state)
- ✅ Dashboard data flow
- ✅ Error handling (network errors, validation, 401/404)
- ✅ Loading states

**Test Files:**
- `tests/e2e/complete-workflows.spec.ts` - Complete user workflows
- `tests/e2e/user-workflows.spec.ts` - Additional workflow tests
- `tests/e2e/pages/business-page.ts` - Page object helpers

**Note:** Tests use authenticated user fixtures and API route mocking for fast execution.

---

### Option B: Manual Testing (Recommended After Automated)

Manual testing helps catch UX issues and validate real user experience.

## 🧪 Manual Test Scenarios

### Scenario 1: New User Onboarding (30 minutes)

#### Step 1: Sign Up
1. Navigate to `http://localhost:3000/sign-up`
2. Create account with:
   - Email: `test-${Date.now()}@example.com`
   - Password: `testpassword123`
3. **Expected:** Redirect to `/dashboard`
4. **Verify:** Empty state displays with "Add Business" CTA

#### Step 2: Add First Business
1. Click "Add Business" button
2. Fill form:
   ```
   Name: Test Coffee Shop
   URL: https://example.com
   Category: Restaurant
   City: Seattle
   State: WA
   Country: US
   ```
3. Click "Create Business"
4. **Expected:** 
   - Redirect to `/dashboard/businesses/[id]`
   - Business detail page loads
   - Business appears in dashboard list
5. **Verify Database:**
   ```sql
   SELECT * FROM businesses ORDER BY id DESC LIMIT 1;
   -- Should show new business with status='pending'
   ```

#### Step 3: Crawl Website (Mock)
1. On business detail page, click "Crawl Website" button
2. **Expected:**
   - Button shows loading state
   - Job status updates to "Processing"
   - After 2-5 seconds, status changes to "Complete"
   - Crawl data displays (address, phone, description, etc.)
3. **Verify Database:**
   ```sql
   SELECT crawl_data, status FROM businesses WHERE id = <business_id>;
   -- crawl_data should be populated JSONB
   -- status should be 'crawled'
   ```
4. **Verify Job Table:**
   ```sql
   SELECT * FROM crawl_jobs WHERE business_id = <business_id> ORDER BY id DESC LIMIT 1;
   -- status should be 'completed'
   -- result should contain crawled data
   ```

#### Step 4: Run LLM Fingerprint (Mock)
1. On business detail page, click "Run Fingerprint" button
2. **Expected:**
   - Button shows loading state
   - Job status updates to "Processing"
   - After 3-10 seconds, status changes to "Complete"
   - Visibility score displays (0-100)
   - Per-model breakdown shown
3. **Verify Database:**
   ```sql
   SELECT * FROM llm_fingerprints WHERE business_id = <business_id> ORDER BY id DESC LIMIT 1;
   -- Should have visibility_score, model_results, etc.
   ```
4. **Verify Dashboard:**
   - Return to dashboard
   - Business card should show visibility score
   - Stats should update (avg visibility score)

#### Step 5: View Upgrade CTA
1. As free user, verify "Upgrade to Pro" banner appears
2. Click "Upgrade to Pro"
3. **Expected:** Redirect to `/pricing`
4. **Verify:** Plans display correctly

---

### Scenario 2: Pro User Workflow (20 minutes)

#### Step 1: Upgrade to Pro (Manual DB Update)
```sql
-- Get your team ID first
SELECT id, name FROM teams WHERE id IN (
  SELECT team_id FROM team_members WHERE user_id = (
    SELECT id FROM users WHERE email = '<your_test_email>'
  )
);

-- Update team to Pro
UPDATE teams SET plan_name = 'pro' WHERE id = <your_team_id>;
```

#### Step 2: Wikidata Publishing (Mock)
1. Visit business detail page
2. **Expected:** "Publish to Wikidata" button is enabled (not grayed out)
3. Click "Publish to Wikidata"
4. **Expected:**
   - Job status updates
   - After processing, mock QID assigned (e.g., Q99999999)
   - Badge shows "Published"
   - Wikidata link displayed
5. **Verify Database:**
   ```sql
   SELECT * FROM wikidata_entities WHERE business_id = <business_id>;
   -- Should have qid, entity_data, published_at
   ```
6. **Verify Business:**
   ```sql
   SELECT wikidata_qid FROM businesses WHERE id = <business_id>;
   -- Should show the QID
   ```

#### Step 3: Multiple Businesses (Pro: 5 limit)
1. Add 2nd business
2. Add 3rd business
3. **Expected:** All appear in dashboard
4. **Verify:** Stats update correctly
5. Try adding 6th business
6. **Expected:** Should be blocked with "Business limit reached" message

---

## 🐛 Common Issues & Fixes

### Issue: "Unauthorized" errors
**Cause:** Session not being set correctly  
**Fix:** 
- Clear browser cookies
- Sign out and sign in again
- Check `AUTH_SECRET` in `.env.local`

### Issue: Database connection errors
**Cause:** `DATABASE_URL` not set or incorrect  
**Fix:**
```bash
# Verify connection
psql $DATABASE_URL -c "SELECT 1;"
```

### Issue: Jobs stuck in "Processing"
**Cause:** Background job execution failed  
**Fix:**
- Check server logs for errors
- Manually update job status in database if needed
- Verify crawler/fingerprinter services are working

### Issue: Mock data not appearing
**Cause:** Services returning errors instead of mocks  
**Fix:**
- Check `lib/crawler/index.ts` - should return mock when API key missing
- Check `lib/llm/fingerprinter.ts` - should use mock responses
- Check server console for error messages

---

## 📊 Success Criteria

### Must Pass (P0)
- [ ] Can sign up and sign in
- [ ] Can add a business
- [ ] Business appears in dashboard
- [ ] Can crawl website (mock data appears)
- [ ] Can run fingerprint (mock score appears)
- [ ] Database records all actions correctly

### Should Pass (P1)
- [ ] Pro user can publish to Wikidata
- [ ] Permission gating works (free vs pro)
- [ ] Business limit enforced correctly
- [ ] Error messages are helpful
- [ ] Loading states show progress

### Nice to Have (P2)
- [ ] Toast notifications work
- [ ] Mobile responsive
- [ ] Empty states are helpful
- [ ] Form validation is clear

---

## 🔍 Database Verification Queries

### Check All Data Created
```sql
-- Users
SELECT id, email, created_at FROM users ORDER BY id DESC LIMIT 5;

-- Teams
SELECT id, name, plan_name FROM teams ORDER BY id DESC LIMIT 5;

-- Businesses
SELECT id, name, status, wikidata_qid FROM businesses ORDER BY id DESC LIMIT 5;

-- Crawl Jobs
SELECT id, business_id, status, job_type FROM crawl_jobs ORDER BY id DESC LIMIT 5;

-- Fingerprints
SELECT id, business_id, visibility_score FROM llm_fingerprints ORDER BY id DESC LIMIT 5;

-- Wikidata Entities
SELECT id, business_id, qid FROM wikidata_entities ORDER BY id DESC LIMIT 5;
```

### Check Integration Points
```sql
-- Business with all related data
SELECT 
  b.id,
  b.name,
  b.status,
  b.wikidata_qid,
  COUNT(DISTINCT cj.id) as crawl_jobs,
  COUNT(DISTINCT lf.id) as fingerprints,
  COUNT(DISTINCT we.id) as wikidata_entities
FROM businesses b
LEFT JOIN crawl_jobs cj ON cj.business_id = b.id
LEFT JOIN llm_fingerprints lf ON lf.business_id = b.id
LEFT JOIN wikidata_entities we ON we.business_id = b.id
GROUP BY b.id
ORDER BY b.id DESC
LIMIT 5;
```

---

## 📝 Bug Report Template

```markdown
## Bug #[number]: [Title]

**Severity:** Critical / High / Medium / Low  
**Component:** [API Route / Page / Component]

**Steps to Reproduce:**
1. 
2. 
3. 

**Expected Behavior:**
- 

**Actual Behavior:**
- 

**Environment:**
- Browser: 
- URL: 
- User Type: Free / Pro

**Database State:**
```sql
-- Relevant queries
```

**Fix:**
- [ ] Identified root cause
- [ ] Fix implemented
- [ ] Tested and verified
```

---

## 🚀 Next Steps After Testing

Once all tests pass:

1. **Fix Critical Bugs** (P0 issues)
2. **Connect Real APIs** (OpenRouter, real crawler)
3. **Test Stripe Flow** (upgrade workflow)
4. **UI Polish** (loading states, error handling)
5. **Deploy to Production**

---

## 💡 Testing Tips

1. **Use Browser DevTools**
   - Network tab: Check API calls
   - Console: Check for errors
   - Application tab: Check cookies/session

2. **Check Server Logs**
   - Watch terminal running `pnpm dev`
   - Look for error messages
   - Check database query logs

3. **Test Edge Cases**
   - Invalid URLs
   - Missing required fields
   - Network failures (disable network)
   - Concurrent requests

4. **Document Everything**
   - Take screenshots of issues
   - Copy error messages
   - Note browser/OS versions

---

**Ready to start testing!** 🧪

