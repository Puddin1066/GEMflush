# TDD Implementation Plan - Complete Priority Roadmap

**Date:** January 2025  
**Purpose:** Comprehensive TDD plan for all development priorities  
**Methodology:** TRUE TDD (RED → GREEN → REFACTOR)  
**Status:** 🟢 Active Planning Document

---

## 🎯 Overview

This document provides a complete TDD implementation plan for all priorities identified in `DEVELOPMENT_PRIORITIES.md`. Each priority includes:

1. **RED Phase**: Failing test specifications (written FIRST)
2. **GREEN Phase**: Minimal implementation approach
3. **REFACTOR Phase**: Code improvement strategy
4. **Test Files**: Specific test file locations and structure

---

## 🔴 P0 - BLOCKERS

### P0.1: Fix Build Error in `login.tsx`

**Status:** 🔴 BLOCKING  
**TDD Approach:** This is a bug fix, not new feature - different approach needed

#### Strategy: Verification Tests (Not TDD)

Since this is a build error fix, we need **verification tests** rather than TDD:

**Test File:** `app/(login)/__tests__/login-build-verification.test.ts`

```typescript
/**
 * Build Verification Test: Login Component
 * 
 * PURPOSE: Verify login component builds and renders correctly
 * 
 * This is NOT a TDD test (implementation already exists)
 * This is a verification test to ensure build errors are resolved
 */

import { describe, it, expect } from 'vitest';

describe('Login Component Build Verification', () => {
  /**
   * VERIFICATION: Component can be imported without build errors
   * 
   * Given: Login component file exists
   * When: Component is imported
   * Then: No TypeScript/SWC build errors occur
   */
  it('can be imported without build errors', async () => {
    // Act: Dynamic import (tests build process)
    await expect(
      import('../login')
    ).resolves.toBeDefined();
  });

  /**
   * VERIFICATION: Component exports default export
   * 
   * Given: Login component exists
   * When: Component is imported
   * Then: Default export is available
   */
  it('exports default component', async () => {
    const module = await import('../login');
    expect(module.default).toBeDefined();
  });
});
```

#### Implementation Steps

1. **Run verification test** (will fail initially)
2. **Fix build error** using recommended approach:
   - Option A: Recreate component (15 min)
   - Option B: Downgrade Next.js (30 min)
   - Option C: Simplify component (10 min)
3. **Verify build succeeds**: `pnpm build`
4. **Run verification test** (should pass)

**Success Criteria:**
- ✅ `pnpm build` succeeds with 0 errors
- ✅ Verification test passes
- ✅ Component can be imported

---

### P0.2: Fix Database Connection in Test Environment

**Status:** 🔴 BLOCKING E2E TESTS  
**TDD Approach:** Integration test specifications

#### RED Phase Tests

**Test File:** `tests/integration/__tests__/database-connection.tdd.test.ts`

```typescript
/**
 * TDD Test: Database Connection - Tests Drive Implementation
 * 
 * SPECIFICATION: Database Connection in Test Environment
 * 
 * As a test suite
 * I want to connect to the database reliably
 * So that integration tests can validate system behavior
 * 
 * Acceptance Criteria:
 * 1. Database connection succeeds with valid DATABASE_URL
 * 2. Connection uses proper connection pooling
 * 3. Connection handles environment variable fallback
 * 4. Connection errors provide clear error messages
 * 5. Connection works in E2E test environment
 * 
 * TDD Cycle: RED → GREEN → REFACTOR
 * Tests written FIRST to drive implementation
 */

import { describe, it, expect, beforeAll } from 'vitest';

describe('🔴 RED: Database Connection Specification', () => {
  /**
   * SPECIFICATION 1: Successful Database Connection
   * 
   * Given: Valid DATABASE_URL environment variable
   * When: Database connection is attempted
   * Then: Connection succeeds without errors
   */
  it('connects to database with valid DATABASE_URL', async () => {
    // Arrange: Ensure DATABASE_URL is set
    const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
    expect(databaseUrl).toBeDefined();
    
    // Act: Attempt connection (TEST DRIVES IMPLEMENTATION)
    const { db } = await import('@/lib/db/drizzle');
    const result = await db.execute('SELECT 1 as test');
    
    // Assert: Connection successful (behavior: database is accessible)
    expect(result).toBeDefined();
    expect(result.rows[0]?.test).toBe(1);
  });

  /**
   * SPECIFICATION 2: Connection Pooling Configuration
   * 
   * Given: Database connection configuration
   * When: Multiple connections are requested
   * Then: Connection pooler handles requests efficiently
   */
  it('uses connection pooler for multiple requests', async () => {
    // Arrange: Get database client
    const { db } = await import('@/lib/db/drizzle');
    
    // Act: Make multiple concurrent queries
    const promises = Array(5).fill(null).map(() => 
      db.execute('SELECT 1 as test')
    );
    const results = await Promise.all(promises);
    
    // Assert: All queries succeed (behavior: pooling works)
    expect(results).toHaveLength(5);
    results.forEach(result => {
      expect(result.rows[0]?.test).toBe(1);
    });
  });

  /**
   * SPECIFICATION 3: Environment Variable Fallback
   * 
   * Given: POSTGRES_URL is set but DATABASE_URL is not
   * When: Database connection is attempted
   * Then: POSTGRES_URL is used as fallback
   */
  it('falls back to POSTGRES_URL when DATABASE_URL not set', async () => {
    // Arrange: Set POSTGRES_URL only
    const originalDbUrl = process.env.DATABASE_URL;
    delete process.env.DATABASE_URL;
    const postgresUrl = process.env.POSTGRES_URL;
    expect(postgresUrl).toBeDefined();
    
    // Act: Attempt connection (TEST DRIVES IMPLEMENTATION)
    // Note: May need to clear module cache to re-test
    const { db } = await import('@/lib/db/drizzle');
    const result = await db.execute('SELECT 1 as test');
    
    // Assert: Connection succeeds (behavior: fallback works)
    expect(result).toBeDefined();
    
    // Cleanup: Restore original
    if (originalDbUrl) process.env.DATABASE_URL = originalDbUrl;
  });

  /**
   * SPECIFICATION 4: Clear Error Messages
   * 
   * Given: Invalid DATABASE_URL
   * When: Database connection is attempted
   * Then: Error message clearly indicates connection failure
   */
  it('provides clear error message for invalid connection string', async () => {
    // Arrange: Invalid connection string
    const originalUrl = process.env.DATABASE_URL;
    process.env.DATABASE_URL = 'postgresql://invalid:password@localhost:5432/invalid';
    
    // Act & Assert: Should throw with clear error (TEST DRIVES IMPLEMENTATION)
    await expect(
      async () => {
        // Clear module cache to re-import with new env
        delete require.cache[require.resolve('@/lib/db/drizzle')];
        const { db } = await import('@/lib/db/drizzle');
        await db.execute('SELECT 1');
      }
    ).rejects.toThrow(/connection|database|postgres/i);
    
    // Cleanup: Restore original
    if (originalUrl) process.env.DATABASE_URL = originalUrl;
  });

  /**
   * SPECIFICATION 5: E2E Test Environment Compatibility
   * 
   * Given: E2E test environment with environment variables
   * When: Database connection is attempted from E2E test
   * Then: Connection succeeds using passed environment variables
   */
  it('works in E2E test environment with passed environment variables', async () => {
    // Arrange: Simulate E2E environment (variables passed via Playwright config)
    const databaseUrl = process.env.DATABASE_URL;
    expect(databaseUrl).toBeDefined();
    
    // Act: Attempt connection (TEST DRIVES IMPLEMENTATION)
    const { db } = await import('@/lib/db/drizzle');
    const result = await db.execute('SELECT 1 as test');
    
    // Assert: Connection works (behavior: E2E compatibility)
    expect(result).toBeDefined();
    expect(result.rows[0]?.test).toBe(1);
  });
});
```

#### GREEN Phase Implementation

**File:** `lib/db/drizzle.ts` (may need updates)

**Implementation Steps:**
1. Verify DATABASE_URL/POSTGRES_URL handling
2. Add connection pooler configuration
3. Add error handling with clear messages
4. Ensure E2E environment variable passing works

**Success Criteria:**
- ✅ All 5 tests pass
- ✅ Database connection works reliably
- ✅ E2E tests can connect

---

## 🟠 P1 - CRITICAL

### P1.4c: Fix Missing Fingerprint Data Display

**Status:** ✅ COMPLETE - RED → GREEN  
**Files:** Dashboard, Business detail pages  
**Completion Date:** January 2025

#### RED Phase Tests

**Test File:** `app/(dashboard)/dashboard/__tests__/fingerprint-display.tdd.test.tsx`

```typescript
/**
 * TDD Test: Fingerprint Data Display - Tests Drive Implementation
 * 
 * SPECIFICATION: Display Fingerprint Data in Dashboard
 * 
 * As a user
 * I want to see fingerprint data (visibility score, last fingerprint date)
 * So that I can understand my business's AI visibility
 * 
 * Acceptance Criteria:
 * 1. Visibility score is displayed when fingerprint exists
 * 2. Last fingerprint date is displayed in readable format
 * 3. "Never" is shown when no fingerprint exists
 * 4. Data is loaded from database correctly
 * 5. Loading state is shown while fetching
 * 
 * TDD Cycle: RED → GREEN → REFACTOR
 * Tests written FIRST to drive implementation
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BusinessTestFactory } from '@/lib/test-helpers/tdd-helpers';

// Mock database queries
vi.mock('@/lib/db/queries', () => ({
  getLatestFingerprint: vi.fn(),
  getBusinessesByTeam: vi.fn(),
}));

describe('🔴 RED: Fingerprint Data Display Specification', () => {
  /**
   * SPECIFICATION 1: Display Visibility Score
   * 
   * Given: Business has fingerprint with visibility score
   * When: Dashboard renders business card
   * Then: Visibility score is displayed
   */
  it('displays visibility score when fingerprint exists', async () => {
    // Arrange: Mock fingerprint data
    const fingerprint = {
      id: 1,
      businessId: 123,
      visibilityScore: 75,
      createdAt: new Date('2025-01-15'),
    };
    
    const { getLatestFingerprint } = await import('@/lib/db/queries');
    vi.mocked(getLatestFingerprint).mockResolvedValue(fingerprint);
    
    // Act: Render dashboard (TEST DRIVES IMPLEMENTATION)
    const Dashboard = await import('../page');
    render(<Dashboard.default />);
    
    // Assert: Visibility score displayed (behavior: user sees score)
    await waitFor(() => {
      expect(screen.getByText(/75|75%/i)).toBeInTheDocument();
    });
  });

  /**
   * SPECIFICATION 2: Display Last Fingerprint Date
   * 
   * Given: Business has fingerprint with date
   * When: Dashboard renders business card
   * Then: Last fingerprint date is displayed in readable format
   */
  it('displays last fingerprint date in readable format', async () => {
    // Arrange: Mock fingerprint with date
    const fingerprintDate = new Date('2025-01-15T10:30:00Z');
    const fingerprint = {
      id: 1,
      businessId: 123,
      visibilityScore: 75,
      createdAt: fingerprintDate,
    };
    
    const { getLatestFingerprint } = await import('@/lib/db/queries');
    vi.mocked(getLatestFingerprint).mockResolvedValue(fingerprint);
    
    // Act: Render dashboard (TEST DRIVES IMPLEMENTATION)
    const Dashboard = await import('../page');
    render(<Dashboard.default />);
    
    // Assert: Date displayed in readable format (behavior: user sees date)
    await waitFor(() => {
      const dateText = screen.getByText(/Jan|January|2025/i);
      expect(dateText).toBeInTheDocument();
    });
  });

  /**
   * SPECIFICATION 3: Show "Never" When No Fingerprint
   * 
   * Given: Business has no fingerprint
   * When: Dashboard renders business card
   * Then: "Never" is shown for last fingerprint date
   */
  it('shows "Never" when no fingerprint exists', async () => {
    // Arrange: No fingerprint
    const { getLatestFingerprint } = await import('@/lib/db/queries');
    vi.mocked(getLatestFingerprint).mockResolvedValue(null);
    
    // Act: Render dashboard (TEST DRIVES IMPLEMENTATION)
    const Dashboard = await import('../page');
    render(<Dashboard.default />);
    
    // Assert: "Never" displayed (behavior: user sees no fingerprint indicator)
    await waitFor(() => {
      expect(screen.getByText(/never/i)).toBeInTheDocument();
    });
  });

  /**
   * SPECIFICATION 4: Load Data from Database
   * 
   * Given: Dashboard page loads
   * When: Component mounts
   * Then: getLatestFingerprint is called with correct business ID
   */
  it('loads fingerprint data from database on mount', async () => {
    // Arrange: Mock query function
    const { getLatestFingerprint } = await import('@/lib/db/queries');
    vi.mocked(getLatestFingerprint).mockResolvedValue(null);
    
    // Act: Render dashboard (TEST DRIVES IMPLEMENTATION)
    const Dashboard = await import('../page');
    render(<Dashboard.default />);
    
    // Assert: Query called with business ID (behavior: data is fetched)
    await waitFor(() => {
      expect(getLatestFingerprint).toHaveBeenCalled();
    });
  });

  /**
   * SPECIFICATION 5: Show Loading State
   * 
   * Given: Fingerprint data is being fetched
   * When: Dashboard renders
   * Then: Loading indicator is shown
   */
  it('shows loading state while fetching fingerprint data', async () => {
    // Arrange: Slow query
    const { getLatestFingerprint } = await import('@/lib/db/queries');
    vi.mocked(getLatestFingerprint).mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve(null), 100))
    );
    
    // Act: Render dashboard (TEST DRIVES IMPLEMENTATION)
    const Dashboard = await import('../page');
    render(<Dashboard.default />);
    
    // Assert: Loading indicator shown (behavior: user sees loading state)
    expect(screen.getByText(/loading|fetching/i)).toBeInTheDocument();
  });
});
```

#### GREEN Phase Implementation

**Files to Update:**
- `app/(dashboard)/dashboard/page.tsx` - Dashboard overview
- `app/(dashboard)/dashboard/businesses/[id]/page.tsx` - Business detail

**Implementation Steps:**
1. Update dashboard to fetch fingerprint data
2. Display visibility score from fingerprint
3. Format and display last fingerprint date
4. Show "Never" when no fingerprint exists
5. Add loading states

**Success Criteria:**
- ✅ All 5 tests pass
- ✅ Visibility scores display correctly
- ✅ Dates show in readable format
- ✅ "Never" shown when appropriate

---

### P1.4a: Fix Dashboard Data Consistency

**Status:** ✅ COMPLETE - RED → GREEN  
**Issue:** Sidebar shows "0/5 businesses" while main content shows "2 businesses"  
**Completion Date:** January 2025

#### RED Phase Tests

**Test File:** `app/(dashboard)/dashboard/__tests__/data-consistency.tdd.test.tsx`

```typescript
/**
 * TDD Test: Dashboard Data Consistency - Tests Drive Implementation
 * 
 * SPECIFICATION: Consistent Business Count Across Dashboard
 * 
 * As a user
 * I want consistent business count displayed in sidebar and main content
 * So that I can trust the information shown
 * 
 * Acceptance Criteria:
 * 1. Sidebar business count matches main content count
 * 2. Both use same data source
 * 3. Both update simultaneously when data changes
 * 4. No discrepancies between components
 * 
 * TDD Cycle: RED → GREEN → REFACTOR
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

// Mock database queries
vi.mock('@/lib/db/queries', () => ({
  getBusinessesByTeam: vi.fn(),
  getBusinessCountByTeam: vi.fn(),
}));

describe('🔴 RED: Dashboard Data Consistency Specification', () => {
  /**
   * SPECIFICATION 1: Consistent Business Count
   * 
   * Given: Team has 2 businesses
   * When: Dashboard renders
   * Then: Sidebar and main content show same count (2)
   */
  it('displays consistent business count in sidebar and main content', async () => {
    // Arrange: Mock 2 businesses
    const businesses = [
      BusinessTestFactory.create({ id: 1, name: 'Business 1' }),
      BusinessTestFactory.create({ id: 2, name: 'Business 2' }),
    ];
    
    const { getBusinessesByTeam, getBusinessCountByTeam } = await import('@/lib/db/queries');
    vi.mocked(getBusinessesByTeam).mockResolvedValue(businesses);
    vi.mocked(getBusinessCountByTeam).mockResolvedValue(2);
    
    // Act: Render dashboard (TEST DRIVES IMPLEMENTATION)
    const Dashboard = await import('../page');
    render(<Dashboard.default />);
    
    // Assert: Both show count of 2 (behavior: consistent display)
    await waitFor(() => {
      const sidebarCount = screen.getByText(/2.*business/i);
      const mainCount = screen.getByText(/2.*business/i);
      expect(sidebarCount).toBeInTheDocument();
      expect(mainCount).toBeInTheDocument();
    });
  });

  /**
   * SPECIFICATION 2: Same Data Source
   * 
   * Given: Dashboard components exist
   * When: Business count is displayed
   * Then: Both sidebar and main content use same query function
   */
  it('uses same data source for sidebar and main content', async () => {
    // Arrange: Mock queries
    const { getBusinessesByTeam } = await import('@/lib/db/queries');
    vi.mocked(getBusinessesByTeam).mockResolvedValue([]);
    
    // Act: Render dashboard (TEST DRIVES IMPLEMENTATION)
    const Dashboard = await import('../page');
    render(<Dashboard.default />);
    
    // Assert: Same query called (behavior: single source of truth)
    await waitFor(() => {
      expect(getBusinessesByTeam).toHaveBeenCalled();
      // Verify called once (shared query)
      expect(getBusinessesByTeam).toHaveBeenCalledTimes(1);
    });
  });

  /**
   * SPECIFICATION 3: Simultaneous Updates
   * 
   * Given: Business count changes
   * When: Data is refetched
   * Then: Both sidebar and main content update together
   */
  it('updates sidebar and main content simultaneously when data changes', async () => {
    // Arrange: Initial 0 businesses, then 2
    const { getBusinessesByTeam } = await import('@/lib/db/queries');
    vi.mocked(getBusinessesByTeam)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        BusinessTestFactory.create({ id: 1 }),
        BusinessTestFactory.create({ id: 2 }),
      ]);
    
    // Act: Render and refetch (TEST DRIVES IMPLEMENTATION)
    const Dashboard = await import('../page');
    const { rerender } = render(<Dashboard.default />);
    
    // Refetch (simulate data change)
    rerender(<Dashboard.default />);
    
    // Assert: Both update (behavior: synchronized updates)
    await waitFor(() => {
      const counts = screen.getAllByText(/2.*business/i);
      expect(counts.length).toBeGreaterThanOrEqual(2);
    });
  });
});
```

#### GREEN Phase Implementation

**File:** `app/(dashboard)/dashboard/page.tsx`

**Implementation Steps:**
1. Use single `getBusinessesByTeam` query
2. Calculate count from businesses array (not separate query)
3. Pass same data to sidebar and main content
4. Remove duplicate queries

**Success Criteria:**
- ✅ All tests pass
- ✅ Sidebar and main content show same count
- ✅ Single data source used

---

### P1.3a: TDD Tests for Wikidata Module

**Status:** 🟠 CRITICAL - 1.61% Coverage  
**Business Value:** Core revenue feature

#### RED Phase Test Plan

**Test Files to Create:**

1. **`lib/wikidata/__tests__/service.tdd.test.ts`** - Main orchestrator
2. **`lib/wikidata/__tests__/entity-builder.tdd.test.ts`** - Entity creation
3. **`lib/wikidata/__tests__/client.tdd.test.ts`** - API client
4. **`lib/wikidata/__tests__/sparql.tdd.test.ts`** - QID lookups
5. **`lib/wikidata/__tests__/notability-checker.tdd.test.ts`** - Notability

**Example: Service Test**

```typescript
/**
 * TDD Test: Wikidata Service - Tests Drive Implementation
 * 
 * SPECIFICATION: Wikidata Entity Publishing Service
 * 
 * As a Pro tier user
 * I want to publish my business to Wikidata
 * So that my business appears in knowledge graphs
 * 
 * Acceptance Criteria:
 * 1. Validates business data before publishing
 * 2. Checks notability requirements
 * 3. Builds entity with required properties
 * 4. Publishes to test.wikidata.org (MVP) or production
 * 5. Stores QID after successful publication
 * 6. Handles errors gracefully
 * 
 * TDD Cycle: RED → GREEN → REFACTOR
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BusinessTestFactory } from '@/lib/test-helpers/tdd-helpers';

// Mock dependencies
vi.mock('@/lib/wikidata/entity-builder');
vi.mock('@/lib/wikidata/client');
vi.mock('@/lib/wikidata/notability-checker');

describe('🔴 RED: Wikidata Service Specification', () => {
  /**
   * SPECIFICATION 1: Validates Business Data
   * 
   * Given: Business with incomplete data
   * When: Publish is attempted
   * Then: Error is thrown before publishing
   */
  it('validates business data before publishing', async () => {
    // Arrange: Incomplete business data
    const business = BusinessTestFactory.create({
      name: 'Test Business',
      // Missing required fields
      location: null,
    });
    
    // Act: Attempt publish (TEST DRIVES IMPLEMENTATION)
    const { publishToWikidata } = await import('../service');
    
    // Assert: Validation error (behavior: prevents invalid publishes)
    await expect(
      publishToWikidata(business.id)
    ).rejects.toThrow(/validation|required|missing/i);
  });

  /**
   * SPECIFICATION 2: Checks Notability
   * 
   * Given: Business that doesn't meet notability requirements
   * When: Publish is attempted
   * Then: Notability check fails and error is thrown
   */
  it('checks notability requirements before publishing', async () => {
    // Arrange: Business that fails notability
    const business = BusinessTestFactory.create({
      name: 'New Business',
      createdAt: new Date(), // Too new
    });
    
    const { checkNotability } = await import('../notability-checker');
    vi.mocked(checkNotability).mockResolvedValue({
      isNotable: false,
      reason: 'Insufficient history',
    });
    
    // Act: Attempt publish (TEST DRIVES IMPLEMENTATION)
    const { publishToWikidata } = await import('../service');
    
    // Assert: Notability check prevents publishing (behavior: quality control)
    await expect(
      publishToWikidata(business.id)
    ).rejects.toThrow(/notability|not eligible/i);
  });

  /**
   * SPECIFICATION 3: Stores QID After Publication
   * 
   * Given: Successful publication
   * When: Entity is published
   * Then: QID is stored in database
   */
  it('stores QID in database after successful publication', async () => {
    // Arrange: Business ready to publish
    const business = BusinessTestFactory.create({
      name: 'Test Business',
      location: { city: 'Seattle', state: 'WA' },
    });
    
    const mockQid = 'Q12345';
    const { publishEntity } = await import('../client');
    vi.mocked(publishEntity).mockResolvedValue({ qid: mockQid });
    
    // Act: Publish (TEST DRIVES IMPLEMENTATION)
    const { publishToWikidata } = await import('../service');
    await publishToWikidata(business.id);
    
    // Assert: QID stored (behavior: business linked to Wikidata)
    const { getBusinessById } = await import('@/lib/db/queries');
    const updated = await getBusinessById(business.id);
    expect(updated?.wikidataQID).toBe(mockQid);
  });

  // Additional tests for error handling, retries, etc.
});
```

**Test Coverage Targets:**
- ✅ Service orchestrator: 10+ tests
- ✅ Entity builder: 8+ tests
- ✅ Client: 6+ tests
- ✅ SPARQL: 5+ tests
- ✅ Notability checker: 5+ tests

**Estimated Time:** 2-3 days  
**Test Files:** 5 files, ~40 tests total

---

### P1.3b: TDD Tests for Payments Module

**Status:** 🟠 CRITICAL - 0% Coverage  
**Business Value:** Revenue collection

#### RED Phase Test Plan

**Test Files:**
1. **`lib/payments/__tests__/stripe.tdd.test.ts`** - Stripe client
2. **`lib/payments/__tests__/actions.tdd.test.ts`** - Payment actions

**Example: Stripe Client Test**

```typescript
/**
 * TDD Test: Stripe Payment Client - Tests Drive Implementation
 * 
 * SPECIFICATION: Stripe Payment Processing
 * 
 * As a payment system
 * I want to process Stripe payments securely
 * So that users can upgrade their subscriptions
 * 
 * Acceptance Criteria:
 * 1. Creates checkout session correctly
 * 2. Handles webhook events
 * 3. Updates subscription status
 * 4. Handles payment failures
 * 5. Validates payment amounts
 * 
 * TDD Cycle: RED → GREEN → REFACTOR
 */

import { describe, it, expect, vi } from 'vitest';

vi.mock('stripe', () => ({
  default: vi.fn().mockImplementation(() => ({
    checkout: {
      sessions: {
        create: vi.fn(),
      },
    },
    webhooks: {
      constructEvent: vi.fn(),
    },
  })),
}));

describe('🔴 RED: Stripe Payment Client Specification', () => {
  /**
   * SPECIFICATION 1: Create Checkout Session
   * 
   * Given: User wants to upgrade to Pro plan
   * When: Checkout session is created
   * Then: Session has correct price ID and customer
   */
  it('creates checkout session with correct price ID and customer', async () => {
    // Arrange: User and plan
    const userId = 123;
    const priceId = 'price_pro_monthly';
    
    // Act: Create checkout (TEST DRIVES IMPLEMENTATION)
    const { createCheckoutSession } = await import('../stripe');
    const session = await createCheckoutSession(userId, priceId);
    
    // Assert: Session created correctly (behavior: user can pay)
    expect(session.url).toBeDefined();
    expect(session.customer).toBeDefined();
  });

  // Additional tests for webhooks, subscription updates, etc.
});
```

**Test Coverage Targets:**
- ✅ Stripe client: 8+ tests
- ✅ Payment actions: 6+ tests

**Estimated Time:** 1-2 days  
**Test Files:** 2 files, ~14 tests total

---

## 📋 Implementation Schedule

### Week 1: Blockers & Critical Fixes

**Day 1:**
- ✅ P0.1: Fix build error (verification test)
- ✅ P0.2: Database connection tests (RED → GREEN)
- ✅ P1.4c: Fingerprint display tests (RED)

**Day 2:**
- ✅ P1.4c: Fingerprint display (GREEN → REFACTOR)
- ✅ P1.4a: Data consistency tests (RED → GREEN)

**Day 3-4:**
- ✅ P1.3a: Wikidata tests (RED phase, start GREEN)

**Day 5:**
- ✅ P1.3b: Payments tests (RED → GREEN)

### Week 2: Complete Critical Tests

**Day 6-8:**
- ✅ P1.3a: Wikidata tests (GREEN → REFACTOR)
- ✅ P1.3c: LLM module tests (RED → GREEN)
- ✅ P1.3d: Crawler tests (RED → GREEN)

**Day 9-10:**
- ✅ P1.5: Real API integration tests
- ✅ P1.6: E2E workflow tests

---

## 🎯 Success Metrics

### Test Coverage Targets

| Module | Current | Target | Tests Needed | Status |
|--------|---------|--------|--------------|--------|
| Wikidata | 1.61% | 90%+ | ~40 tests | 🔴 Pending |
| Payments | 0% | 85%+ | ~14 tests | 🔴 Pending |
| LLM | 6.86% | 90%+ | 124 tests | ✅ COMPLETE |
| Crawler | 4.46% | 85%+ | 21 tests | ✅ COMPLETE |

### Quality Metrics

- ✅ All RED tests written first
- ✅ All tests pass (GREEN)
- ✅ Code refactored (REFACTOR)
- ✅ No regressions
- ✅ Clear test specifications

---

## 📝 Next Steps

1. **Start with P0 blockers** - Unblock development
2. **Write RED tests for P1.4** - Fix critical UX bugs
3. **Systematically add test coverage** - Build confidence
4. **Follow TDD cycle** - RED → GREEN → REFACTOR

---

## 🟡 P2 - HIGH PRIORITY

### P2.8: UI Polish & Professional Finish

**Status:** 🟡 50% COMPLETE  
**Needs:** Toast notifications, error boundaries, loading states

#### RED Phase Tests

**Test File:** `components/ui/__tests__/toast-notifications.tdd.test.tsx`

```typescript
/**
 * TDD Test: Toast Notifications - Tests Drive Implementation
 * 
 * SPECIFICATION: User Feedback Notifications
 * 
 * As a user
 * I want to receive clear feedback when actions succeed or fail
 * So that I know the result of my actions
 * 
 * Acceptance Criteria:
 * 1. Success toast shows on successful actions
 * 2. Error toast shows on failures
 * 3. Toasts auto-dismiss after appropriate time
 * 4. Multiple toasts stack correctly
 * 5. Toasts are accessible (keyboard, screen readers)
 * 
 * TDD Cycle: RED → GREEN → REFACTOR
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

describe('🔴 RED: Toast Notifications Specification', () => {
  /**
   * SPECIFICATION 1: Success Toast Display
   * 
   * Given: Successful action (e.g., business created)
   * When: Action completes
   * Then: Success toast is displayed
   */
  it('displays success toast on successful action', async () => {
    // Arrange: Action that succeeds
    const onSuccess = vi.fn(() => {
      // Trigger toast
      showToast({ type: 'success', message: 'Business created!' });
    });
    
    // Act: Execute action (TEST DRIVES IMPLEMENTATION)
    const { showToast } = await import('../toast');
    onSuccess();
    
    // Assert: Toast displayed (behavior: user sees success feedback)
    await waitFor(() => {
      expect(screen.getByText(/business created/i)).toBeInTheDocument();
      expect(screen.getByRole('alert')).toHaveAttribute('aria-live', 'polite');
    });
  });

  /**
   * SPECIFICATION 2: Error Toast Display
   * 
   * Given: Failed action
   * When: Action fails
   * Then: Error toast is displayed with error message
   */
  it('displays error toast on failed action', async () => {
    // Arrange: Action that fails
    const error = new Error('Failed to create business');
    
    // Act: Trigger error toast (TEST DRIVES IMPLEMENTATION)
    const { showToast } = await import('../toast');
    showToast({ type: 'error', message: error.message });
    
    // Assert: Error toast displayed (behavior: user sees error feedback)
    await waitFor(() => {
      expect(screen.getByText(/failed to create/i)).toBeInTheDocument();
      expect(screen.getByRole('alert')).toHaveAttribute('aria-live', 'assertive');
    });
  });

  /**
   * SPECIFICATION 3: Auto-Dismiss
   * 
   * Given: Toast is displayed
   * When: Auto-dismiss time elapses
   * Then: Toast is removed automatically
   */
  it('auto-dismisses toast after appropriate time', async () => {
    // Arrange: Success toast
    vi.useFakeTimers();
    const { showToast } = await import('../toast');
    showToast({ type: 'success', message: 'Test', duration: 3000 });
    
    // Act: Wait for dismiss time (TEST DRIVES IMPLEMENTATION)
    vi.advanceTimersByTime(3000);
    
    // Assert: Toast removed (behavior: UI cleans up automatically)
    await waitFor(() => {
      expect(screen.queryByText(/test/i)).not.toBeInTheDocument();
    });
    
    vi.useRealTimers();
  });
});
```

**Test Files:**
1. `components/ui/__tests__/toast-notifications.tdd.test.tsx`
2. `components/error/__tests__/error-boundary.tdd.test.tsx`
3. `components/loading/__tests__/loading-states.tdd.test.tsx`

**Estimated Time:** 1-2 days  
**Test Coverage:** ~20 tests

---

### P2.10: Production Environment Setup

**Status:** 🟡 CONFIGURATION NEEDED  
**TDD Approach:** Infrastructure tests

#### RED Phase Tests

**Test File:** `tests/integration/__tests__/production-environment.tdd.test.ts`

```typescript
/**
 * TDD Test: Production Environment - Tests Drive Implementation
 * 
 * SPECIFICATION: Production Environment Configuration
 * 
 * As a deployment system
 * I want production environment to be correctly configured
 * So that the application runs reliably in production
 * 
 * Acceptance Criteria:
 * 1. All required environment variables are set
 * 2. Database connection works in production
 * 3. API keys are valid and accessible
 * 4. SSL certificates are configured
 * 5. Error tracking is configured
 * 
 * TDD Cycle: RED → GREEN → REFACTOR
 */

import { describe, it, expect } from 'vitest';

describe('🔴 RED: Production Environment Specification', () => {
  /**
   * SPECIFICATION 1: Required Environment Variables
   * 
   * Given: Production environment
   * When: Application starts
   * Then: All required environment variables are set
   */
  it('has all required environment variables set', () => {
    // Arrange: Production environment
    const requiredVars = [
      'DATABASE_URL',
      'AUTH_SECRET',
      'STRIPE_SECRET_KEY',
      'OPENROUTER_API_KEY',
      'WIKIDATA_BOT_PASSWORD',
    ];
    
    // Act: Check environment (TEST DRIVES IMPLEMENTATION)
    const missingVars = requiredVars.filter(
      varName => !process.env[varName]
    );
    
    // Assert: All variables set (behavior: app can start)
    expect(missingVars).toHaveLength(0);
  });

  /**
   * SPECIFICATION 2: Database Connection
   * 
   * Given: Production DATABASE_URL
   * When: Database connection is attempted
   * Then: Connection succeeds
   */
  it('connects to production database successfully', async () => {
    // Arrange: Production database URL
    const dbUrl = process.env.DATABASE_URL;
    expect(dbUrl).toBeDefined();
    expect(dbUrl).toContain('postgresql://');
    
    // Act: Test connection (TEST DRIVES IMPLEMENTATION)
    const { db } = await import('@/lib/db/drizzle');
    const result = await db.execute('SELECT 1 as test');
    
    // Assert: Connection works (behavior: app can access data)
    expect(result.rows[0]?.test).toBe(1);
  });
});
```

**Estimated Time:** 1 day  
**Test Coverage:** ~8 tests

---

## 📊 Complete Test Inventory

### P0 - Blockers

| Priority | Test File | Tests | Status |
|----------|-----------|-------|--------|
| P0.1 | `app/(login)/__tests__/login-build-verification.test.ts` | 2 | Verification |
| P0.2 | `tests/integration/__tests__/database-connection.tdd.test.ts` | 5 | RED Phase |

### P1 - Critical

| Priority | Test File | Tests | Status |
|----------|-----------|-------|--------|
| P1.4c | `app/(dashboard)/dashboard/__tests__/fingerprint-display.tdd.test.tsx` | 4 | ✅ COMPLETE |
| P1.4a | `app/(dashboard)/dashboard/__tests__/data-consistency.tdd.test.tsx` | 2 | ✅ COMPLETE |
| P1.4b | `app/(dashboard)/dashboard/__tests__/business-name-display.tdd.test.tsx` | 4 | ✅ COMPLETE |
| P1.4d | `components/loading/__tests__/loading-states.tdd.test.tsx` | 6 | ✅ COMPLETE |
| P1.3a | `lib/wikidata/__tests__/*.tdd.test.ts` | 50 | ✅ COMPLETE |
| P1.3b | `lib/payments/__tests__/*.tdd.test.ts` | 10 | ✅ COMPLETE |
| P1.3c | `lib/llm/__tests__/*.tdd.test.ts` | 124 | ✅ COMPLETE |
| P1.3d | `lib/crawler/__tests__/*.tdd.test.ts` | 21 | ✅ COMPLETE |
| P1.5a | `lib/llm/__tests__/openrouter-integration.tdd.test.ts` | 8 | ✅ COMPLETE |
| P1.5b | `lib/wikidata/__tests__/publishing-integration.tdd.test.ts` | 10 | ✅ COMPLETE |
| P1.6 | `tests/e2e/critical-workflows.tdd.spec.ts` | 15 | Needs Creation |

### P2 - High Priority

| Priority | Test File | Tests | Status |
|----------|-----------|-------|--------|
| P2.8 | `components/ui/__tests__/toast-notifications.tdd.test.tsx` | 6 | RED Phase |
| P2.8 | `components/error/__tests__/error-boundary.tdd.test.tsx` | 5 | Needs Creation |
| P2.10 | `tests/integration/__tests__/production-environment.tdd.test.ts` | 8 | RED Phase |

**Total Test Files:** ~25 files  
**Total Tests:** ~200+ tests  
**Estimated Time:** 3-4 weeks

---

## 🔄 TDD Workflow for Each Priority

### Standard TDD Cycle

For each priority item:

1. **RED Phase (Day 1)**
   - Write specification header
   - Write failing tests
   - Run tests (expect failure)
   - Commit: "RED: Add tests for [feature]"

2. **GREEN Phase (Day 2)**
   - Write minimal implementation
   - Make all tests pass
   - Run tests (expect success)
   - Commit: "GREEN: Implement [feature]"

3. **REFACTOR Phase (Day 2-3)**
   - Improve code quality
   - Extract helpers
   - Add documentation
   - Run tests (must still pass)
   - Commit: "REFACTOR: Improve [feature]"

### Example Timeline

**P1.4c: Fix Fingerprint Display**

- **Day 1 Morning (2 hours):**
  - Write RED tests (5 tests)
  - Verify tests fail
  - Commit RED phase

- **Day 1 Afternoon (3 hours):**
  - Implement GREEN phase
  - All tests pass
  - Commit GREEN phase

- **Day 2 Morning (2 hours):**
  - REFACTOR: Extract helpers
  - Add error handling
  - Tests still pass
  - Commit REFACTOR phase

**Total:** 1.5 days per feature

---

## 📋 Test Creation Checklist

For each RED phase test:

- [ ] **Specification header** written (user story format)
- [ ] **Given-When-Then** comments in each test
- [ ] **Test name** describes behavior (not implementation)
- [ ] **AAA pattern** used (Arrange-Act-Assert)
- [ ] **Dynamic imports** for code under test
- [ ] **Test factories** used (not manual objects)
- [ ] **External dependencies** mocked (not internal)
- [ ] **Test will fail** when first written (expected)
- [ ] **Clear failure message** guides implementation

---

## 🎯 Implementation Order

### Week 1: Unblock & Critical UX

1. **P0.1** - Fix build (verification, not TDD)
2. **P0.2** - Database connection (RED → GREEN)
3. **P1.4c** - Fingerprint display (RED → GREEN → REFACTOR)
4. **P1.4a** - Data consistency (RED → GREEN)

### Week 2: Core Test Coverage

5. **P1.4b** - Business name display (RED → GREEN)
6. **P1.4d** - Loading states (RED → GREEN)
7. **P1.3a** - Wikidata tests (RED phase, all files)

### Week 3: Complete Critical Tests

8. **P1.3a** - Wikidata tests (GREEN → REFACTOR)
9. **P1.3b** - Payments tests (RED → GREEN → REFACTOR)
10. **P1.3c** - LLM tests (RED → GREEN → REFACTOR) ✅ COMPLETE

### Week 4: Integration & Polish

11. **P1.3d** - Crawler tests (RED → GREEN → REFACTOR) ✅ COMPLETE
13. **P1.5** - Real API integration tests ✅ COMPLETE
14. **P1.6** - E2E workflow tests
15. **P2.8** - UI polish tests

---

## 💡 Key Principles

1. **Tests ARE specifications** - Write them first
2. **One behavior per test** - Single responsibility
3. **Test behavior, not implementation** - Focus on WHAT, not HOW
4. **Use test factories** - Reusable test data
5. **Mock external dependencies** - Not internal functions
6. **Dynamic imports** - Allow test-first development
7. **Clear test names** - Describe behavior in plain language

---

## 📚 Related Documentation

- **TDD_SPECIFICATION_GUIDE.md** - How to write test specifications
- **TDD_RED_PHASE_TEST_STRUCTURE.md** - RED phase test structure
- **TDD_DATABASE_INTEGRATION_GUIDE.md** - Database integration TDD
- **DEVELOPMENT_PRIORITIES.md** - Priority framework
- **TRUE_TDD_PROCESS.md** - TDD cycle reference

---

---

## 🔴 Additional Critical Priority Details

### P1.4b: Fix Business Name Display

**Status:** ✅ COMPLETE - RED → GREEN  
**Issue:** All businesses display as "Business" instead of actual names  
**Completion Date:** January 2025

#### RED Phase Tests

**Test File:** `app/(dashboard)/dashboard/__tests__/business-name-display.tdd.test.tsx`

```typescript
/**
 * TDD Test: Business Name Display - Tests Drive Implementation
 * 
 * SPECIFICATION: Display Actual Business Names
 * 
 * As a user
 * I want to see actual business names instead of generic "Business"
 * So that I can identify my businesses easily
 * 
 * Acceptance Criteria:
 * 1. Business cards show actual business name
 * 2. Dashboard list shows business names
 * 3. Business detail page shows business name in header
 * 4. Name is loaded from database correctly
 * 
 * TDD Cycle: RED → GREEN → REFACTOR
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

vi.mock('@/lib/db/queries', () => ({
  getBusinessesByTeam: vi.fn(),
  getBusinessById: vi.fn(),
}));

describe('🔴 RED: Business Name Display Specification', () => {
  /**
   * SPECIFICATION 1: Display Actual Name in Cards
   * 
   * Given: Business with name "Blue Bottle Coffee"
   * When: Business card renders
   * Then: "Blue Bottle Coffee" is displayed, not "Business"
   */
  it('displays actual business name in business cards', async () => {
    // Arrange: Business with actual name
    const business = {
      id: 1,
      name: 'Blue Bottle Coffee',
      status: 'pending',
    };
    
    const { getBusinessesByTeam } = await import('@/lib/db/queries');
    vi.mocked(getBusinessesByTeam).mockResolvedValue([business]);
    
    // Act: Render dashboard (TEST DRIVES IMPLEMENTATION)
    const Dashboard = await import('../page');
    render(<Dashboard.default />);
    
    // Assert: Actual name displayed (behavior: user sees real name)
    await waitFor(() => {
      expect(screen.getByText('Blue Bottle Coffee')).toBeInTheDocument();
      expect(screen.queryByText('Business')).not.toBeInTheDocument();
    });
  });

  /**
   * SPECIFICATION 2: Display Name in List View
   * 
   * Given: Multiple businesses with different names
   * When: Business list renders
   * Then: Each business shows its actual name
   */
  it('displays actual names for all businesses in list view', async () => {
    // Arrange: Multiple businesses
    const businesses = [
      { id: 1, name: 'Blue Bottle Coffee' },
      { id: 2, name: 'Prince Street Pizza' },
      { id: 3, name: 'Joe\'s Coffee Shop' },
    ];
    
    const { getBusinessesByTeam } = await import('@/lib/db/queries');
    vi.mocked(getBusinessesByTeam).mockResolvedValue(businesses);
    
    // Act: Render list (TEST DRIVES IMPLEMENTATION)
    const BusinessList = await import('../businesses/page');
    render(<BusinessList.default />);
    
    // Assert: All names displayed (behavior: user can identify businesses)
    await waitFor(() => {
      expect(screen.getByText('Blue Bottle Coffee')).toBeInTheDocument();
      expect(screen.getByText('Prince Street Pizza')).toBeInTheDocument();
      expect(screen.getByText('Joe\'s Coffee Shop')).toBeInTheDocument();
    });
  });
});
```

**Estimated Time:** 1-2 hours  
**Test Coverage:** 4 tests

---

### P1.3c: TDD Tests for LLM Module

**Status:** ✅ COMPLETE - RED → GREEN → REFACTOR  
**Business Value:** Core value proposition  
**Completion Date:** January 2025

#### RED Phase Test Plan

**Test Files:**

1. **`lib/llm/__tests__/openrouter-client.tdd.test.ts`** - API client
2. **`lib/llm/__tests__/parallel-processor.tdd.test.ts`** - Parallel processing
3. **`lib/llm/__tests__/prompt-generator.tdd.test.ts`** - Prompt generation
4. **`lib/llm/__tests__/response-analyzer.tdd.test.ts`** - Response analysis
5. **`lib/llm/__tests__/business-fingerprinter.tdd.test.ts`** - Main orchestrator

**Example: Business Fingerprinter Test**

```typescript
/**
 * TDD Test: Business Fingerprinter - Tests Drive Implementation
 * 
 * SPECIFICATION: LLM Visibility Fingerprinting Service
 * 
 * As a user
 * I want to test my business's visibility across multiple LLMs
 * So that I can understand my AI presence
 * 
 * Acceptance Criteria:
 * 1. Tests business across multiple LLM models
 * 2. Calculates visibility score accurately
 * 3. Handles API failures gracefully
 * 4. Stores results in database
 * 5. Returns structured fingerprint data
 * 
 * TDD Cycle: RED → GREEN → REFACTOR
 */

import { describe, it, expect, vi } from 'vitest';
import { BusinessTestFactory } from '@/lib/test-helpers/tdd-helpers';

vi.mock('@/lib/llm/openrouter-client');
vi.mock('@/lib/llm/parallel-processor');
vi.mock('@/lib/db/queries');

describe('🔴 RED: Business Fingerprinter Specification', () => {
  /**
   * SPECIFICATION 1: Tests Across Multiple Models
   * 
   * Given: Business with crawl data
   * When: Fingerprint is generated
   * Then: Business is tested across 3+ LLM models
   */
  it('tests business across multiple LLM models', async () => {
    // Arrange: Business with data
    const business = BusinessTestFactory.create({
      name: 'Test Business',
      crawlData: { url: 'https://example.com', content: '...' },
    });
    
    // Act: Generate fingerprint (TEST DRIVES IMPLEMENTATION)
    const { fingerprintBusiness } = await import('../business-fingerprinter');
    await fingerprintBusiness(business.id);
    
    // Assert: Multiple models tested (behavior: comprehensive testing)
    const { queryMultipleModels } = await import('../parallel-processor');
    expect(queryMultipleModels).toHaveBeenCalledWith(
      expect.objectContaining({
        models: expect.arrayContaining(['gpt-4', 'claude-3', 'gemini-pro']),
      })
    );
  });

  /**
   * SPECIFICATION 2: Calculates Visibility Score
   * 
   * Given: LLM responses indicating high visibility
   * When: Fingerprint is generated
   * Then: Visibility score is calculated correctly (0-100)
   */
  it('calculates visibility score from LLM responses', async () => {
    // Arrange: High visibility responses
    const mockResponses = {
      'gpt-4': { mentions: 5, accuracy: 0.9 },
      'claude-3': { mentions: 4, accuracy: 0.85 },
      'gemini-pro': { mentions: 3, accuracy: 0.8 },
    };
    
    const { processResponses } = await import('../parallel-processor');
    vi.mocked(processResponses).mockResolvedValue(mockResponses);
    
    // Act: Generate fingerprint (TEST DRIVES IMPLEMENTATION)
    const { fingerprintBusiness } = await import('../business-fingerprinter');
    const result = await fingerprintBusiness(123);
    
    // Assert: Score calculated (behavior: user sees meaningful score)
    expect(result.visibilityScore).toBeGreaterThanOrEqual(0);
    expect(result.visibilityScore).toBeLessThanOrEqual(100);
    expect(result.visibilityScore).toBeGreaterThan(50); // High visibility
  });
});
```

**Test Coverage Targets:**
- ✅ Business fingerprinter: 10 tests
- ✅ OpenRouter client: 8 tests
- ✅ Parallel processor: 7 tests
- ✅ Prompt generator: 5 tests
- ✅ Response analyzer: 5 tests

**Estimated Time:** 2-3 days  
**Test Files:** 5 files, ~35 tests total

**✅ COMPLETED:**
- RED Phase: All test specifications written
- GREEN Phase: All tests passing (124 tests total)
- REFACTOR Phase: Code refactored for maintainability
  - Extracted query creation logic
  - Extracted constants (temperatures, multipliers)
  - Simplified cache handling
  - Improved code organization

---

### P1.3d: TDD Tests for Crawler Module

**Status:** ✅ COMPLETE - RED → GREEN → REFACTOR  
**Business Value:** Data collection foundation  
**Completion Date:** January 2025

#### RED Phase Test Plan

**Test Files:**

1. **`lib/crawler/__tests__/index.tdd.test.ts`** - Main crawler
2. **`lib/crawler/__tests__/firecrawl-client.tdd.test.ts`** - Firecrawl integration

**Example: Main Crawler Test**

```typescript
/**
 * TDD Test: Web Crawler - Tests Drive Implementation
 * 
 * SPECIFICATION: Web Content Crawling Service
 * 
 * As a system
 * I want to crawl business websites and extract structured data
 * So that businesses can be analyzed and published
 * 
 * Acceptance Criteria:
 * 1. Crawls website and extracts content
 * 2. Extracts structured data (address, phone, hours)
 * 3. Handles errors gracefully (404, timeouts)
 * 4. Stores crawl results in database
 * 5. Returns structured crawl data
 * 
 * TDD Cycle: RED → GREEN → REFACTOR
 */

import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/crawler/firecrawl-client');
vi.mock('@/lib/db/queries');

describe('🔴 RED: Web Crawler Specification', () => {
  /**
   * SPECIFICATION 1: Extracts Structured Data
   * 
   * Given: Valid business website URL
   * When: Website is crawled
   * Then: Structured data is extracted (address, phone, hours)
   */
  it('extracts structured data from crawled website', async () => {
    // Arrange: Valid URL
    const url = 'https://example.com';
    const mockCrawlResult = {
      content: '<html>...</html>',
      structured: {
        address: '123 Main St, Seattle, WA 98101',
        phone: '(206) 555-1234',
        hours: 'Mon-Fri 9am-5pm',
      },
    };
    
    const { crawlUrl } = await import('../firecrawl-client');
    vi.mocked(crawlUrl).mockResolvedValue(mockCrawlResult);
    
    // Act: Crawl website (TEST DRIVES IMPLEMENTATION)
    const { crawlBusiness } = await import('../index');
    const result = await crawlBusiness(url);
    
    // Assert: Structured data extracted (behavior: usable business data)
    expect(result.structured).toMatchObject({
      address: expect.any(String),
      phone: expect.any(String),
    });
  });

  /**
   * SPECIFICATION 2: Handles 404 Errors
   * 
   * Given: Invalid or non-existent URL
   * When: Crawl is attempted
   * Then: Error is caught and returned gracefully
   */
  it('handles 404 errors gracefully', async () => {
    // Arrange: Invalid URL
    const url = 'https://example.com/404-page';
    const { crawlUrl } = await import('../firecrawl-client');
    vi.mocked(crawlUrl).mockRejectedValue(new Error('404 Not Found'));
    
    // Act: Crawl website (TEST DRIVES IMPLEMENTATION)
    const { crawlBusiness } = await import('../index');
    
    // Assert: Error handled (behavior: doesn't crash, returns error)
    await expect(crawlBusiness(url)).rejects.toThrow(/404|not found/i);
  });
});
```

**Test Coverage Targets:**
- ✅ Main crawler: 12 tests
- ✅ Firecrawl client: 9 tests

**Estimated Time:** 1-2 days  
**Test Files:** 2 files, 21 tests total

**✅ COMPLETED:**
- RED Phase: All test specifications written (21 tests)
- GREEN Phase: All tests passing
- REFACTOR Phase: Code refactored for maintainability
  - Extracted constants (cache TTL, page limits, protocols)
  - Extracted URL validation logic
  - Simplified aggregation with helper methods
  - Extracted error handling and mock fallback logic
  - Improved code organization and readability

---

### P1.6: End-to-End Workflow Testing

**Status:** 🟠 INFRASTRUCTURE BLOCKED  
**Business Value:** Production confidence

#### RED Phase Test Plan

**Test File:** `tests/e2e/critical-workflows.tdd.spec.ts`

```typescript
/**
 * TDD E2E Test: Critical User Workflows - Tests Drive Implementation
 * 
 * SPECIFICATION: Complete User Journey Validation
 * 
 * As a system
 * I want end-to-end workflows to work correctly
 * So that users can complete their goals successfully
 * 
 * Acceptance Criteria:
 * 1. User can sign up and sign in
 * 2. User can add a business
 * 3. User can crawl business website
 * 4. User can run fingerprint analysis
 * 5. Pro user can publish to Wikidata
 * 
 * TDD Cycle: RED → GREEN → REFACTOR
 */

import { test, expect } from '@playwright/test';
import { createTestUserAndSignIn } from './helpers/test-setup';

test.describe('🔴 RED: Critical User Workflows Specification', () => {
  /**
   * SPECIFICATION 1: Complete Business Onboarding
   * 
   * Given: New user account
   * When: User adds first business
   * Then: Business is created, displayed, and ready for processing
   */
  test('user can add and view business', async ({ page }) => {
    // Arrange: Authenticated user
    await createTestUserAndSignIn(page);
    
    // Act: Add business (TEST DRIVES IMPLEMENTATION)
    await page.goto('/dashboard/businesses/new');
    await page.fill('input[name="name"]', 'Test Business');
    await page.fill('input[name="url"]', 'https://example.com');
    await page.click('button[type="submit"]');
    
    // Assert: Business appears in dashboard (behavior: user sees their business)
    await expect(page.locator('text=Test Business')).toBeVisible();
  });

  /**
   * SPECIFICATION 2: Complete CFP Workflow
   * 
   * Given: Business added to dashboard
   * When: User runs crawl → fingerprint → publish (if Pro)
   * Then: All steps complete successfully
   */
  test('user can complete CFP workflow', async ({ page }) => {
    // Arrange: Authenticated user with business
    await createTestUserAndSignIn(page);
    // ... add business setup ...
    
    // Act: Run crawl (TEST DRIVES IMPLEMENTATION)
    await page.click('button:has-text("Crawl Website")');
    await expect(page.locator('text=Crawl completed')).toBeVisible({ timeout: 30000 });
    
    // Act: Run fingerprint
    await page.click('button:has-text("Run Fingerprint")');
    await expect(page.locator('text=Visibility Score')).toBeVisible({ timeout: 60000 });
    
    // Assert: Workflow completed (behavior: user sees results)
    await expect(page.locator('text=75')).toBeVisible(); // Example score
  });
});
```

**Test Coverage Targets:**
- ✅ Sign up/sign in: 3 tests
- ✅ Business CRUD: 5 tests
- ✅ CFP workflow: 4 tests
- ✅ Pro features: 3 tests

**Estimated Time:** 2-3 days  
**Test Files:** 1 file, ~15 tests total

---

## 📊 Complete Implementation Timeline

### Week 1: Unblock & Fix Critical UX

| Day | Tasks | Tests | Status |
|-----|-------|-------|--------|
| **1** | P0.1 Build fix, P0.2 DB connection | 7 tests | 🔴 RED |
| **2** | P1.4c Fingerprint display | 4 tests | ✅ COMPLETE |
| **3** | P1.4a Data consistency, P1.4b Business names | 6 tests | ✅ COMPLETE |
| **4** | P1.4d Loading states | 6 tests | ✅ COMPLETE |
| **5** | Review & integration testing | - | ✅ REFACTOR |

### Week 2: Core Test Coverage

| Day | Tasks | Tests | Status |
|-----|-------|-------|--------|
| **6-7** | P1.3a Wikidata tests (RED → GREEN) | 40 tests | 🔴 RED → 🟢 GREEN |
| **8** | P1.3b Payments tests | 14 tests | 🔴 RED → 🟢 GREEN |
| **9-10** | P1.3c LLM tests | 35 tests | 🔴 RED → 🟢 GREEN |

### Week 3: Complete Tests & Integration

| Day | Tasks | Tests | Status |
|-----|-------|-------|--------|
| **11** | P1.3d Crawler tests | 20 tests | 🔴 RED → 🟢 GREEN |
| **12-13** | P1.5 Real API integration | 18 tests | ✅ COMPLETE |
| **14** | P1.6 E2E workflows | 15 tests | 🔴 RED → 🟢 GREEN |

### Week 4: Polish & Production

| Day | Tasks | Tests | Status |
|-----|-------|-------|--------|
| **15-16** | P2.8 UI polish | 20 tests | 🔴 RED → 🟢 GREEN |
| **17** | P2.10 Production setup | 8 tests | 🔴 RED → 🟢 GREEN |
| **18** | Final integration & launch prep | - | ✅ Complete |

---

## ✅ Definition of Done

For each priority item:

### RED Phase Complete When:
- [ ] All test files created
- [ ] Specification headers written
- [ ] All tests written following AAA pattern
- [ ] Tests fail for expected reasons
- [ ] Test coverage documented

### GREEN Phase Complete When:
- [ ] Minimal implementation written
- [ ] All tests pass
- [ ] No TypeScript errors
- [ ] No linter errors

### REFACTOR Phase Complete When:
- [ ] Code is clean and maintainable
- [ ] Helpers extracted where appropriate
- [ ] Documentation added
- [ ] Tests still pass
- [ ] Code reviewed (if applicable)

---

## 🔧 API & CLI Usage in Tests

### Strategy: Use Real APIs When Appropriate

**Key Principle:** Use real APIs for integration testing and debugging. Mock only when necessary for speed, cost, or determinism.

**Decision Matrix:**

| Test Type | Database | Stripe | Wikidata | OpenRouter | Firecrawl |
|-----------|----------|--------|----------|------------|-----------|
| **Unit Tests** | Mock | Mock | Mock | Mock | Mock |
| **Integration Tests** | ✅ **Real** | Test Mode | test.wikidata.org | Mock | Mock |
| **E2E Tests** | ✅ **Real** | Test Mode | test.wikidata.org | Mock | Mock |
| **Debug Tests** | ✅ **Real** | Test Mode | test.wikidata.org | ✅ **Real** | ✅ **Real** |

### CLI Tools Available

**PostgreSQL/Supabase:**
- `psql $DATABASE_URL` - Direct database access
- `supabase db connect` - Supabase CLI connection
- `pnpm db:studio` - Drizzle Studio GUI
- `pnpm db:push` - Push schema changes

**Stripe:**
- `stripe listen` - Forward webhooks to localhost
- `stripe trigger` - Trigger test events
- `stripe customers list` - List test customers

**Wikidata:**
- `curl` - Test Action API endpoints
- `test.wikidata.org` - Test environment

**For complete API/CLI strategy:** See **[API_CLI_TESTING_STRATEGY.md](./API_CLI_TESTING_STRATEGY.md)**  
**For CLI commands reference:** See **[CLI_COMMANDS_REFERENCE.md](./CLI_COMMANDS_REFERENCE.md)**

---

## 📚 Related Documentation

- **TDD_SPECIFICATION_GUIDE.md** - How to write test specifications
- **TDD_RED_PHASE_TEST_STRUCTURE.md** - RED phase test structure
- **TDD_DATABASE_INTEGRATION_GUIDE.md** - Database integration TDD
- **API_CLI_TESTING_STRATEGY.md** - API and CLI usage strategy
- **CLI_COMMANDS_REFERENCE.md** - Quick CLI commands reference
- **DEVELOPMENT_PRIORITIES.md** - Priority framework
- **TRUE_TDD_PROCESS.md** - TDD cycle reference

---

**Remember:** Tests ARE specifications. Write them FIRST, then implement to satisfy them. Use real APIs for integration testing, mock only when necessary.

**Next Action:** Start with P0.1 (fix build) → P0.2 (database connection tests) → P1.4 (UX fixes)

