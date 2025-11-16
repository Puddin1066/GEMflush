# Pragmatic KGAAS E2E Tests - Commercial Platform Critical Paths

## Overview

This document defines **pragmatic E2E tests** focused on critical user journeys that generate value and revenue for a KGAAS (Knowledge Graph as a Service) commercial platform. These tests prioritize:

1. **Revenue-generating flows** (subscription upgrades, Pro tier usage)
2. **Core value delivery** (publishing to Wikidata, visibility tracking)
3. **Pro user behavior** (real-world usage patterns)
4. **Business-critical paths** (what must work for platform success)

## Test Philosophy: Pragmatic over Exhaustive

- ✅ Test **happy paths** that generate revenue
- ✅ Test **critical failure modes** that block users
- ✅ Test **Pro tier features** (where money is made)
- ❌ Skip edge cases that rarely occur
- ❌ Skip exhaustive validation (covered in unit tests)
- ❌ Skip aesthetic/visual tests (low business impact)

## Critical Test Categories

### 1. Pro User Core Value Journey ⭐⭐⭐ (CRITICAL)

**Business Impact**: This is the primary value proposition - Pro users must be able to publish entities to Wikidata successfully.

**Test**: `pro-user-core-journey.spec.ts`

**Journey**:
```
1. Pro user signs up (or upgrades from Free)
2. Creates a business
3. Crawls business website
4. Runs visibility fingerprint
5. Publishes entity to Wikidata
6. Verifies QID is assigned
7. Views published entity
```

**Why Critical**:
- This is what Pro users pay for
- Any failure here = immediate churn risk
- Core revenue-generating flow

**Test Coverage**:
- ✅ Pro user can complete full journey end-to-end
- ✅ QID is assigned and displayed
- ✅ Published entity is accessible
- ✅ Business status updates correctly

---

### 2. Subscription Upgrade Flow ⭐⭐⭐ (CRITICAL)

**Business Impact**: Free → Pro upgrade is the primary conversion funnel. This must work flawlessly.

**Test**: `subscription-upgrade-journey.spec.ts`

**Journey**:
```
1. Free user creates business
2. Attempts to publish (sees upgrade prompt)
3. Navigates to pricing page
4. Upgrades to Pro tier
5. Returns to business page
6. Successfully publishes (now unlocked)
```

**Why Critical**:
- Direct revenue impact
- Conversion funnel optimization
- User experience at critical decision point

**Test Coverage**:
- ✅ Upgrade prompt displays correctly
- ✅ Upgrade flow completes successfully
- ✅ Pro features unlock immediately after upgrade
- ✅ Publishing works after upgrade

---

### 3. Business Management (Pro Tier) ⭐⭐ (HIGH PRIORITY)

**Business Impact**: Pro users can manage multiple businesses. This is a key differentiator from Free tier.

**Test**: `pro-business-management.spec.ts`

**Journey**:
```
1. Pro user creates multiple businesses (up to limit)
2. Views businesses list
3. Navigates between businesses
4. Updates business information
5. Views visibility scores for each business
```

**Why Critical**:
- Pro tier value proposition (multiple businesses)
- User retention (users need to manage their portfolio)
- Core platform functionality

**Test Coverage**:
- ✅ Pro user can create multiple businesses
- ✅ Business limit is enforced (5 for Pro)
- ✅ Businesses list displays correctly
- ✅ Navigation between businesses works
- ✅ Business data persists correctly

---

### 4. Visibility Tracking & Analytics ⭐⭐ (HIGH PRIORITY)

**Business Impact**: Visibility scores and analytics are core value propositions. Users need to see their LLM visibility.

**Test**: `visibility-tracking.spec.ts`

**Journey**:
```
1. Pro user creates business
2. Crawls business website
3. Runs visibility fingerprint
4. Views visibility score
5. Views detailed analytics
6. Verifies data accuracy
```

**Why Critical**:
- Core platform value (LLM visibility tracking)
- User retention (users check analytics regularly)
- Differentiation from competitors

**Test Coverage**:
- ✅ Visibility score displays correctly
- ✅ Fingerprint results are accurate
- ✅ Analytics data loads properly
- ✅ Data persists across page refreshes

---

### 5. Wikidata Publishing Success Flow ⭐⭐⭐ (CRITICAL)

**Business Impact**: Successful publishing is the core value proposition. This must work reliably.

**Test**: `wikidata-publishing-success.spec.ts`

**Journey**:
```
1. Pro user has crawled business
2. Business passes notability check
3. User clicks publish button
4. Publishing completes successfully
5. QID is assigned and displayed
6. User can view published entity on Wikidata
```

**Why Critical**:
- Core platform value (publishing to Wikidata)
- User satisfaction (this is what they pay for)
- Platform reputation (failed publishes = bad reviews)

**Test Coverage**:
- ✅ Publishing completes successfully
- ✅ QID is assigned correctly
- ✅ Business status updates to 'published'
- ✅ Published entity is accessible
- ✅ Error handling works (if publishing fails)

---

### 6. Subscription Management ⭐ (MEDIUM PRIORITY)

**Business Impact**: Users need to manage their subscriptions. This affects retention and upsells.

**Test**: `subscription-management.spec.ts`

**Journey**:
```
1. Pro user views subscription status
2. Accesses billing/settings page
3. Views current plan details
4. Can manage subscription (if applicable)
```

**Why Critical**:
- User retention (easy subscription management)
- Upsell opportunities (show Agency tier)
- Billing transparency

**Test Coverage**:
- ✅ Subscription status displays correctly
- ✅ Billing page is accessible
- ✅ Current plan is shown accurately
- ✅ Upgrade options are visible

---

### 7. Data Persistence & Reliability ⭐⭐ (HIGH PRIORITY)

**Business Impact**: Users expect their data to persist. Data loss = immediate churn.

**Test**: `data-persistence.spec.ts`

**Journey**:
```
1. Pro user creates business
2. Crawls and fingerprints business
3. Publishes to Wikidata
4. Logs out and logs back in
5. Verifies all data is still present
6. Verifies QID is still assigned
```

**Why Critical**:
- Data integrity is non-negotiable
- User trust (data loss = platform failure)
- Compliance and reliability

**Test Coverage**:
- ✅ Business data persists after logout/login
- ✅ Visibility scores persist
- ✅ Published QIDs persist
- ✅ Business status persists
- ✅ No data loss during sessions

---

### 8. Error Recovery & User Communication ⭐ (MEDIUM PRIORITY)

**Business Impact**: Users need clear feedback when things go wrong. Poor error handling = frustration = churn.

**Test**: `error-recovery.spec.ts`

**Journey**:
```
1. Pro user attempts invalid action (e.g., publish non-crawled business)
2. Sees clear error message
3. Understands what went wrong
4. Can take corrective action
5. Eventually succeeds
```

**Why Critical**:
- User experience (clear error messages)
- Support burden reduction (self-service error resolution)
- User retention (users don't get stuck)

**Test Coverage**:
- ✅ Error messages are clear and actionable
- ✅ Users can recover from errors
- ✅ Validation errors prevent invalid actions
- ✅ Network errors are handled gracefully

---

## Test Implementation Strategy

### Priority Order

1. **Phase 1 (Week 1)**: Critical revenue paths
   - Pro User Core Journey
   - Subscription Upgrade Flow
   - Wikidata Publishing Success Flow

2. **Phase 2 (Week 2)**: High-priority features
   - Business Management (Pro Tier)
   - Visibility Tracking & Analytics
   - Data Persistence & Reliability

3. **Phase 3 (Week 3)**: Medium-priority features
   - Subscription Management
   - Error Recovery & User Communication

### Test Structure

**DRY Principles**:
- Reuse page objects (`BusinessPage`, `PricingPage`)
- Reuse fixtures (`authenticated-user.ts`, `team-fixtures.ts`)
- Centralize common assertions
- Share test data setup

**SOLID Principles**:
- Single Responsibility: Each test file focuses on one journey
- Open/Closed: Tests extensible via fixtures
- Dependency Inversion: Tests depend on abstractions (page objects)

**Don't Overfit**:
- Test behavior, not implementation
- Use flexible assertions (`.or()` for multiple valid states)
- Focus on user journeys, not edge cases
- Avoid testing implementation details

### Test Naming Convention

```
{user-type}-{journey}-{outcome}.spec.ts

Examples:
- pro-user-core-journey.spec.ts
- subscription-upgrade-journey.spec.ts
- pro-business-management.spec.ts
- visibility-tracking.spec.ts
- wikidata-publishing-success.spec.ts
```

### Test Assertions

**Pragmatic Assertions**:
- ✅ Verify critical success indicators (QID assigned, status updated)
- ✅ Verify user can complete journey (no blocking errors)
- ✅ Verify data persists (logout/login)
- ❌ Skip exhaustive UI validation (covered in unit tests)
- ❌ Skip aesthetic checks (low business impact)

---

## Success Metrics

### Test Coverage Goals

- **Critical Paths**: 100% coverage (must work for revenue)
- **High-Priority Features**: 80% coverage (core functionality)
- **Medium-Priority Features**: 60% coverage (nice-to-have)

### Test Execution Goals

- **Test Runtime**: < 10 minutes for full suite
- **Test Reliability**: > 95% pass rate (flaky tests are worse than no tests)
- **Test Maintenance**: < 2 hours/week (tests should be stable)

### Business Impact Goals

- **Revenue Protection**: Tests catch 90% of revenue-blocking bugs
- **User Experience**: Tests catch 80% of UX-breaking changes
- **Platform Reliability**: Tests catch 70% of data integrity issues

---

## Comparison: Pragmatic vs Exhaustive

### Pragmatic Tests (This Proposal) ✅

- Focus on revenue-generating flows
- Test Pro user journeys (where money is made)
- Test critical failure modes
- Test core value propositions
- ~10-15 test files
- ~30-50 test cases
- ~10 minutes execution time

### Exhaustive Tests (Avoid) ❌

- Test every edge case
- Test every UI element
- Test every error scenario
- Test every user tier equally
- ~50+ test files
- ~200+ test cases
- ~60+ minutes execution time

---

## Implementation Roadmap

### Week 1: Critical Revenue Paths

1. **Pro User Core Journey** (`pro-user-core-journey.spec.ts`)
   - Full journey: Sign up → Create → Crawl → Fingerprint → Publish
   - Verify QID assignment
   - Verify published entity

2. **Subscription Upgrade Flow** (`subscription-upgrade-journey.spec.ts`)
   - Free → Pro upgrade
   - Verify features unlock
   - Verify publishing works after upgrade

3. **Wikidata Publishing Success** (`wikidata-publishing-success.spec.ts`)
   - Successful publish flow
   - QID assignment
   - Published entity verification

### Week 2: High-Priority Features

4. **Business Management (Pro Tier)** (`pro-business-management.spec.ts`)
   - Multiple businesses
   - Business limit enforcement
   - Navigation between businesses

5. **Visibility Tracking** (`visibility-tracking.spec.ts`)
   - Visibility scores
   - Fingerprint results
   - Analytics data

6. **Data Persistence** (`data-persistence.spec.ts`)
   - Data persists after logout/login
   - QIDs persist
   - Business status persists

### Week 3: Medium-Priority Features

7. **Subscription Management** (`subscription-management.spec.ts`)
   - Subscription status
   - Billing page
   - Upgrade options

8. **Error Recovery** (`error-recovery.spec.ts`)
   - Error messages
   - Recovery flows
   - Validation errors

---

## Running Pragmatic Tests

```bash
# Run all pragmatic tests (by pattern)
pnpm test:e2e pro-user-core-journey pro-business-management subscription-to-publishing-journey

# Run critical revenue paths only
pnpm test:e2e pro-user-core-journey subscription-to-publishing-journey

# Run high-priority features
pnpm test:e2e pro-business-management

# Run with UI (debugging)
pnpm test:e2e pro-user-core-journey --headed
```

## Test Files Created

### ✅ Implemented

1. **`pro-user-core-journey.spec.ts`** - Critical revenue path
   - Pro user completes full journey: Create → Crawl → Fingerprint → Publish
   - Verifies QID assignment (core value delivery)
   - Verifies visibility score display

2. **`pro-business-management.spec.ts`** - Pro tier value proposition
   - Multiple business management
   - Business limit enforcement (5 for Pro)
   - Navigation between businesses
   - Businesses list display

3. **`subscription-to-publishing-journey.spec.ts`** - Revenue conversion
   - Free → Pro upgrade flow
   - Publishing unlocks after upgrade
   - Complete conversion journey

### ⏳ To Implement (Phase 2)

4. **`wikidata-publishing-success.spec.ts`** - Core value delivery
   - Successful publish flow
   - QID assignment verification
   - Published entity verification

5. **`visibility-tracking.spec.ts`** - Core value proposition
   - Visibility score display
   - Fingerprint results
   - Analytics data

6. **`data-persistence.spec.ts`** - Data integrity
   - Data persists after logout/login
   - QIDs persist
   - Business status persists

---

## Maintenance Guidelines

### When to Add Tests

- ✅ New revenue-generating feature
- ✅ Critical user journey change
- ✅ Pro tier feature addition
- ✅ Core platform functionality change

### When to Skip Tests

- ❌ UI aesthetic changes (low business impact)
- ❌ Edge cases (rarely occur)
- ❌ Implementation details (covered in unit tests)
- ❌ Non-critical features (Free tier only)

### When to Remove Tests

- ❌ Feature is deprecated
- ✅ Test is consistently flaky (replace with better test)
- ❌ Test no longer reflects user behavior
- ❌ Test covers removed functionality

---

## Conclusion

Pragmatic E2E tests focus on **what matters for business success**:

1. **Revenue-generating flows** (subscription upgrades, Pro tier usage)
2. **Core value delivery** (publishing to Wikidata, visibility tracking)
3. **Pro user behavior** (real-world usage patterns)
4. **Business-critical paths** (what must work for platform success)

By focusing on pragmatic tests, we:
- ✅ Protect revenue-generating flows
- ✅ Ensure core value propositions work
- ✅ Maintain test suite reliability
- ✅ Reduce test maintenance burden
- ✅ Catch critical bugs before production

**Remember**: It's better to have 10 reliable tests that catch 90% of critical bugs than 100 flaky tests that catch 100% of bugs but take 2 hours to run and break constantly.

