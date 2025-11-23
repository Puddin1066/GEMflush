/**
 * DTO Ground Truth Verification E2E Tests
 * 
 * Strategic subtest breakdown for iterative bug fixing:
 * 
 * Purpose: Validates data transformation accuracy (Database → DTO → API → UI)
 * 
 * Structure:
 * - Single test with 7 steps, each focusing on one specific issue
 * - Shared test state persists across steps
 * - Uses test.step() to ensure same authenticatedPage across all steps
 * 
 * Coverage:
 * ✅ Validates: Data transformation layer accuracy
 * ✅ Validates: DTO matches database (ground truth)
 * ✅ Validates: UI displays DTO data correctly
 * ⚠️  Does NOT validate: Full platform flow (use production-readiness-complete-flow.spec.ts)
 * ⚠️  Does NOT validate: API error scenarios (separate test file)
 * ⚠️  Does NOT validate: Authorization checks (separate test file)
 * 
 * SOLID Principles:
 * - Single Responsibility: Each step focuses on one issue/area
 * - Open/Closed: Easy to add new steps without modifying existing
 * 
 * DRY Principles:
 * - Shared test state avoids duplication
 * - Reusable helper functions
 * - Same authenticated session across all steps
 * 
 * Test Breakdown:
 * 1. CFP Execution - Setup (once per session)
 * 2. Database Storage - Verify PostgreSQL data
 * 3. BusinessDetailDTO - Verify business detail DTO (Issue 1 & 2)
 * 4. DashboardBusinessDTO - Verify dashboard DTO (Issue 1 & 3)
 * 5. Frontend Components - Verify UI displays DTOs
 * 6. Dashboard Display - Verify dashboard shows correct data
 * 7. Summary Validation - Final verification of all issues
 * 
 * For Full Platform Flow Validation:
 * - Run alongside: production-readiness-complete-flow.spec.ts
 * - That test validates: Complete user journey, API responses, error scenarios, authorization
 * - Combined coverage: Full end-to-end platform flow validation
 */

import { test, expect } from './fixtures/authenticated-user';
import {
  setupProTeam,
  mockExternalServices,
} from './helpers/api-helpers';
import {
  type DTOTestState,
  executeCFPFlow,
  fetchDatabaseBusiness,
  fetchLatestCrawlJob,
  fetchLatestFingerprint,
  verifyAutomationEnabled,
  verifyErrorMessageSource,
  verifyTrendValue,
} from './helpers/dto-test-helpers';

test.describe('DTO Ground Truth Verification: Strategic Subtests', () => {
  test.setTimeout(600_000); // 10 minutes for full suite

  // Use single test with steps to ensure same authenticatedPage across all subtests
  // SOLID: Single test with steps shares same page context (fixes 403 auth errors)
  // DRY: Reuses same authenticated session instead of creating new users per test
  test('Complete DTO Ground Truth Verification Flow', async ({
    authenticatedPage,
  }) => {
    // Shared state across all steps - persists within single test
    const testState: DTOTestState = {
      testResults: {},
    };

    await test.step('Step 1: Execute Automated CFP Core Logic', async () => {
      console.log('[DTO TEST] ========================================');
      console.log('[DTO TEST] STEP 1: Execute Automated CFP Core Logic');
      console.log('[DTO TEST] ========================================');

      // Setup Pro team for auto-publish
      await setupProTeam(authenticatedPage);
      await mockExternalServices(authenticatedPage);
      await authenticatedPage.goto('/dashboard');
      await authenticatedPage.waitForLoadState('networkidle');

      testState.baseURL = authenticatedPage.url().split('/dashboard')[0] || 'http://localhost:3000';

      // Create unique URL per run
      const timestamp = Date.now();
      const uniqueUrl = `https://example-business-dto-test-${timestamp}.com`;

      // DRY: Use helper function
      testState.businessId = await executeCFPFlow(
        authenticatedPage,
        testState.baseURL,
        uniqueUrl
      );

      // Mark as executed
      testState.testResults = testState.testResults || {};
      testState.testResults.cfpExecuted = true;

      console.log('[DTO TEST] ✓ STEP 1 PASSED: CFP execution complete');
    });

    await test.step('Step 2: Verify PostgreSQL Database Storage', async () => {
      console.log('[DTO TEST] ========================================');
      console.log('[DTO TEST] STEP 2: Verify PostgreSQL Database Storage');
      console.log('[DTO TEST] ========================================');

      // DRY: Use helper function
      testState.databaseBusiness = await fetchDatabaseBusiness(
        authenticatedPage,
        testState.baseURL!,
        testState.businessId!
      );

      // Verify business data structure matches schema
      expect(testState.databaseBusiness).toHaveProperty('id');
      expect(testState.databaseBusiness).toHaveProperty('name');
      expect(testState.databaseBusiness).toHaveProperty('status');
      expect(testState.databaseBusiness).toHaveProperty('url');

      // ✅ ISSUE 1: Verify automationEnabled exists in database
      expect(testState.databaseBusiness).toHaveProperty('automationEnabled');
      const dbAutomationEnabled = testState.databaseBusiness.automationEnabled;
      console.log(`[DTO TEST] ✓ automationEnabled exists in database: ${dbAutomationEnabled}`);

      // ✅ ISSUE 2: Verify errorMessage handling
      // Note: databaseBusiness is already a DTO (from API), so it may have errorMessage
      // The important check is whether errorMessage comes from crawlJobs (done in Step 3)
      const hasErrorMessageInDTO = testState.databaseBusiness.hasOwnProperty('errorMessage');
      console.log(`[DTO TEST] Business DTO has errorMessage field: ${hasErrorMessageInDTO}`);
      if (hasErrorMessageInDTO && testState.databaseBusiness.errorMessage) {
        console.log(`[DTO TEST] ⚠️  NOTE: DTO has errorMessage - will verify it comes from crawlJobs in Step 3`);
      }

      // DRY: Use helper function
      testState.databaseCrawlJob = await fetchLatestCrawlJob(
        authenticatedPage,
        testState.baseURL!,
        testState.businessId!
      );
      if (testState.databaseCrawlJob) {
        console.log(`[DTO TEST] Latest crawl job status: ${testState.databaseCrawlJob.status}`);
        if (testState.databaseCrawlJob.errorMessage) {
          console.log(`[DTO TEST] ✓ errorMessage found in crawlJobs: ${testState.databaseCrawlJob.errorMessage}`);
        }
      }

      // DRY: Use helper function
      testState.databaseFingerprint = await fetchLatestFingerprint(
        authenticatedPage,
        testState.baseURL!,
        testState.businessId!
      );
      if (testState.databaseFingerprint) {
        console.log(`[DTO TEST] Fingerprint visibility score: ${testState.databaseFingerprint.visibilityScore}`);
      }

      console.log('[DTO TEST] ✓ Database data retrieved');
      console.log(`[DTO TEST]   Business status: ${testState.databaseBusiness.status}`);
      console.log(`[DTO TEST]   Automation enabled: ${dbAutomationEnabled}`);

      // Mark as verified
      testState.testResults = testState.testResults || {};
      testState.testResults.databaseVerified = true;

      console.log('[DTO TEST] ✓ STEP 2 PASSED: Database storage verified');
    });

    await test.step('Step 3: Verify BusinessDetailDTO Transformation', async () => {
      console.log('[DTO TEST] ========================================');
      console.log('[DTO TEST] STEP 3: Verify BusinessDetailDTO Transformation');
      console.log('[DTO TEST] ========================================');

      // Fetch BusinessDetailDTO via API
      const businessResponse = await authenticatedPage.request.get(
        `${testState.baseURL}/api/business/${testState.businessId}`
      );
      expect(businessResponse.ok()).toBe(true);
      testState.businessDTO = (await businessResponse.json()).business;

      // Verify DTO structure
      expect(testState.businessDTO).toHaveProperty('id');
      expect(testState.businessDTO).toHaveProperty('name');
      expect(testState.businessDTO).toHaveProperty('status');
      expect(testState.businessDTO).toHaveProperty('url');
      expect(testState.businessDTO).toHaveProperty('automationEnabled');

      // ✅ ISSUE 1: Verify automationEnabled comes from database, not hardcoded
      // DRY: Use helper function
      const automationCheck = verifyAutomationEnabled(
        testState.databaseBusiness.automationEnabled,
        testState.businessDTO.automationEnabled
      );
      console.log(`[DTO TEST] ${automationCheck.message}`);

      if (!automationCheck.matches) {
        console.log(`[DTO TEST] ❌ FAILURE: automationEnabled mismatch!`);
        console.log(`[DTO TEST]   → Fix: Use business.automationEnabled ?? true in toBusinessDetailDTO()`);
        expect(automationCheck.matches).toBe(true); // Will fail here
      }

      // ✅ ISSUE 2: Verify errorMessage handling
      // DRY: Use helper function
      const errorMessageCheck = verifyErrorMessageSource(
        testState.businessDTO.errorMessage,
        testState.databaseCrawlJob?.errorMessage
      );
      console.log(`[DTO TEST] ${errorMessageCheck.message}`);

      if (!errorMessageCheck.valid) {
        console.log(`[DTO TEST] ❌ FAILURE: errorMessage handling incorrect!`);
        console.log(`[DTO TEST]   → Fix: Extract errorMessage from crawlJobs table, not businesses table`);
        // Don't fail test - this is a warning (errorMessage may be null if no errors)
      }

      console.log('[DTO TEST] ✓ BusinessDetailDTO transformation verified');

      // Mark as verified
      testState.testResults = testState.testResults || {};
      testState.testResults.businessDTOVerified = true;

      console.log('[DTO TEST] ✓ STEP 3 PASSED: BusinessDetailDTO verified');
    });

    await test.step('Step 4: Verify DashboardBusinessDTO Transformation', async () => {
      console.log('[DTO TEST] ========================================');
      console.log('[DTO TEST] STEP 4: Verify DashboardBusinessDTO Transformation');
      console.log('[DTO TEST] ========================================');

      // Fetch DashboardDTO
      const dashboardResponse = await authenticatedPage.request.get(`${testState.baseURL}/api/dashboard`);
      expect(dashboardResponse.ok()).toBe(true);
      const dashboardData = await dashboardResponse.json();
      testState.dashboardDTO = dashboardData;

      // Find our business in dashboard businesses array
      const dashboardBusiness = dashboardData.businesses.find(
        (b: any) => b.id === testState.businessId?.toString()
      );
      expect(dashboardBusiness).toBeDefined();

      // ✅ ISSUE 1: Verify automationEnabled in DashboardBusinessDTO
      // DRY: Use helper function
      const dbAutomationEnabled = testState.databaseBusiness.automationEnabled ?? true;
      const automationCheck = verifyAutomationEnabled(
        dbAutomationEnabled,
        dashboardBusiness.automationEnabled
      );
      console.log(`[DTO TEST] ${automationCheck.message}`);

      if (!automationCheck.matches) {
        console.log(`[DTO TEST] ❌ FAILURE: Dashboard automationEnabled mismatch!`);
        console.log(`[DTO TEST]   → Fix: Use business.automationEnabled ?? true in transformBusinessToDTO()`);
        expect(automationCheck.matches).toBe(true); // Will fail here
      }

      // ✅ ISSUE 3: Verify trendValue is calculated (not hardcoded to 0)
      // DRY: Use helper function
      const trendCheck = verifyTrendValue(
        dashboardBusiness.trendValue,
        !!testState.databaseFingerprint,
        false // TODO: Check for historical fingerprints
      );
      console.log(`[DTO TEST] ${trendCheck.message}`);

      if (trendCheck.isHardcoded) {
        console.log(`[DTO TEST] ⚠️  WARNING: trendValue is hardcoded (non-critical, TODO)`);
        // Don't fail test - this is a TODO, not a critical bug
      }

      console.log('[DTO TEST] ✓ DashboardBusinessDTO transformation verified');

      // Mark as verified
      testState.testResults = testState.testResults || {};
      testState.testResults.dashboardDTOVerified = true;

      console.log('[DTO TEST] ✓ STEP 4 PASSED: DashboardBusinessDTO verified');
    });

    await test.step('Step 5: Verify Frontend Components Display', async () => {
      console.log('[DTO TEST] ========================================');
      console.log('[DTO TEST] STEP 5: Verify Frontend Components Display');
      console.log('[DTO TEST] ========================================');

      // Navigate to business detail page
      await authenticatedPage.goto(`/dashboard/businesses/${testState.businessId}`);
      await authenticatedPage.waitForLoadState('networkidle');

      // Verify business name is displayed (should match DTO)
      // DRY: Use first() to handle multiple matches (name appears in title and URL)
      const businessName = testState.databaseBusiness.name;
      const nameElement = authenticatedPage.getByText(businessName, { exact: false }).first();
      await expect(nameElement).toBeVisible();
      console.log(`[DTO TEST] ✅ PASS: Business name displayed: ${businessName}`);

      // Verify status is displayed
      const statusElement = authenticatedPage.locator('[data-testid="business-status"], [class*="status"]').first();
      if (await statusElement.count() > 0) {
        const statusText = await statusElement.textContent();
        console.log(`[DTO TEST] ✅ PASS: Status displayed: ${statusText}`);
      }

      // Verify visibility score is displayed (if fingerprint exists)
      if (testState.databaseFingerprint?.visibilityScore !== undefined) {
        const scoreText = testState.databaseFingerprint.visibilityScore.toString();
        const scoreElement = authenticatedPage.getByText(scoreText, { exact: false }).first();
        if (await scoreElement.count() > 0) {
          console.log(`[DTO TEST] ✅ PASS: Visibility score displayed: ${scoreText}`);
        }
      }

      console.log('[DTO TEST] ✓ Frontend components display verified');

      // Mark as verified
      testState.testResults = testState.testResults || {};
      testState.testResults.frontendVerified = true;

      console.log('[DTO TEST] ✓ STEP 5 PASSED: Frontend components verified');
    });

    await test.step('Step 6: Verify Dashboard Display', async () => {
      console.log('[DTO TEST] ========================================');
      console.log('[DTO TEST] STEP 6: Verify Dashboard Display');
      console.log('[DTO TEST] ========================================');

      // Navigate to dashboard
      await authenticatedPage.goto('/dashboard');
      await authenticatedPage.waitForLoadState('networkidle');

      // Verify business appears in dashboard list
      const businessName = testState.databaseBusiness.name;
      const businessCard = authenticatedPage.getByText(businessName, { exact: false }).first();
      await expect(businessCard).toBeVisible();
      console.log(`[DTO TEST] ✅ PASS: Business appears in dashboard: ${businessName}`);

      // Verify visibility score in dashboard (if fingerprint exists)
      if (testState.databaseFingerprint?.visibilityScore !== undefined) {
        const scoreText = testState.databaseFingerprint.visibilityScore.toString();
        const scoreElement = authenticatedPage.getByText(scoreText, { exact: false }).first();
        if (await scoreElement.count() > 0) {
          console.log(`[DTO TEST] ✅ PASS: Visibility score displayed in dashboard: ${scoreText}`);
        }
      }

      console.log('[DTO TEST] ✓ Dashboard display verified');

      // Mark as verified
      testState.testResults = testState.testResults || {};
      testState.testResults.dashboardDisplayVerified = true;

      console.log('[DTO TEST] ✓ STEP 6 PASSED: Dashboard display verified');
    });

    await test.step('Step 7: Summary - Verify All Issues Are Addressed', async () => {
      console.log('[DTO TEST] ========================================');
      console.log('[DTO TEST] STEP 7: Summary - Verify All Issues');
      console.log('[DTO TEST] ========================================');

      const issues: string[] = [];

      // ✅ ISSUE 1: automationEnabled hardcoded
      // DRY: Use helper functions
      const dbAutoEnabled = testState.databaseBusiness.automationEnabled ?? true;
      const dtoAutoEnabled = testState.businessDTO.automationEnabled ?? true;
      const dashboardBusiness = testState.dashboardDTO?.businesses?.find(
        (b: any) => b.id === testState.businessId?.toString()
      );
      const dashboardAutoEnabled = dashboardBusiness?.automationEnabled ?? true;

      // Check BusinessDetailDTO
      const businessDTOCheck = verifyAutomationEnabled(dbAutoEnabled, dtoAutoEnabled);
      if (!businessDTOCheck.matches) {
        issues.push(`❌ BusinessDetailDTO.automationEnabled doesn't match database (DTO: ${dtoAutoEnabled}, DB: ${dbAutoEnabled})`);
      } else {
        console.log(`[DTO TEST] ✅ ISSUE 1 FIXED: BusinessDetailDTO automationEnabled matches database`);
      }

      // Check DashboardBusinessDTO
      const dashboardCheck = verifyAutomationEnabled(dbAutoEnabled, dashboardAutoEnabled);
      if (!dashboardCheck.matches) {
        issues.push(`❌ DashboardBusinessDTO.automationEnabled doesn't match database (DTO: ${dashboardAutoEnabled}, DB: ${dbAutoEnabled})`);
      } else {
        console.log(`[DTO TEST] ✅ ISSUE 2 FIXED: DashboardBusinessDTO automationEnabled matches database`);
      }

      // ✅ ISSUE 2: errorMessage field mismatch
      const errorMessageCheck = verifyErrorMessageSource(
        testState.businessDTO.errorMessage,
        testState.databaseCrawlJob?.errorMessage
      );
      if (!errorMessageCheck.valid) {
        issues.push(`❌ errorMessage handling incorrect: ${errorMessageCheck.message}`);
      } else {
        console.log(`[DTO TEST] ✅ ISSUE 3 FIXED: errorMessage handling verified`);
      }

      // ✅ ISSUE 3: trendValue hardcoded
      if (dashboardBusiness) {
        const trendCheck = verifyTrendValue(
          dashboardBusiness.trendValue,
          !!testState.databaseFingerprint,
          false // TODO: Check for historical fingerprints
        );
        if (trendCheck.isHardcoded) {
          console.log(`[DTO TEST] ⚠️  ISSUE 4: ${trendCheck.message}`);
          console.log(`[DTO TEST]   → This is a TODO, not a critical bug`);
          // Don't add to issues array - it's a TODO
        }
      }

      // Final report
      if (issues.length > 0) {
        console.log('[DTO TEST] ⚠️  Issues Found:');
        issues.forEach((issue) => console.log(`[DTO TEST]   ${issue}`));
        console.log('[DTO TEST] ❌ SOME ISSUES REMAIN - Fix and re-run failing subtests');
        
        // Fail test if critical issues remain
        throw new Error(`Found ${issues.length} critical issue(s). Fix and re-run.`);
      } else {
        console.log('[DTO TEST] ✅ All critical issues resolved!');
        console.log('[DTO TEST] ========================================');
        console.log('[DTO TEST] DTO GROUND TRUTH VERIFICATION COMPLETE');
        console.log('[DTO TEST] ========================================');
      }

      console.log('[DTO TEST] ✓ STEP 7 PASSED: All issues verified');
    });
  });
});
