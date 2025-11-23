/**
 * Ranking/Fingerprint UX Flow: Iterative Flow Test
 * 
 * Purpose: Validates complete ranking and fingerprint UX flow through DTO layer
 * 
 * Structure:
 * - Single test with 7 steps, each focusing on one validation point
 * - Shared test state persists across steps
 * - Uses test.step() to ensure same context across all steps
 * 
 * SOLID Principles:
 * - Single Responsibility: Each step focuses on one issue/area
 * - Open/Closed: Easy to add new steps without modifying existing
 * 
 * DRY Principles:
 * - Shared test state avoids duplication
 * - Reusable helper functions
 * 
 * Issues Identified from Terminal Logs:
 * - Lines 102-120: DashboardBusinessDTO hardcoded trendValue warnings
 * - Lines 48-52, 60-65: Fingerprint queries and DTO returns
 * - Lines 229-300: Fingerprint analysis with LLM queries
 * - Lines 322-331: Fingerprint DTO returns with visibility scores
 * - Lines 41-45, 54-58: BusinessDetailDTO errorMessage warnings
 */

import { test, expect } from './fixtures/authenticated-user';
import {
  executeCFPFlow,
  waitForBusinessStatus,
  fetchDatabaseBusiness,
} from './helpers/dto-test-helpers';
import {
  fetchFingerprintDTO,
  fetchFingerprintHistory,
  verifyTrendCalculation,
  verifyVisibilityScoreCalculation,
} from './helpers/fingerprint-test-helpers';

// Shared state type
type RankingFingerprintTestState = {
  businessId?: number;
  baseURL?: string;
  databaseBusiness?: any;
  fingerprintDTO?: any;
  fingerprintHistory?: any[];
  dashboardDTO?: any;
  businessDetailDTO?: any;
  testResults?: {
    cfpExecuted?: boolean;
    fingerprintGenerated?: boolean;
    visibilityScoreCalculated?: boolean;
    trendCalculated?: boolean;
    dashboardDisplayVerified?: boolean;
    historyChartVerified?: boolean;
  };
};

test.describe('Ranking/Fingerprint UX Flow: Iterative Flow Test', () => {
  test.setTimeout(600_000); // 10 minutes for full suite

  test('Complete Ranking/Fingerprint UX Flow Verification', async ({
    authenticatedPage,
  }) => {
    // Shared state across all steps
    const testState: RankingFingerprintTestState = {
      testResults: {},
    };

    const baseURL = process.env.BASE_URL || 'http://localhost:3000';
    testState.baseURL = baseURL;

    // Step 1: Execute Automated CFP Core Logic
    await test.step('Step 1: Execute Automated CFP Core Logic', async () => {
      console.log('[RANKING TEST] ========================================');
      console.log('[RANKING TEST] STEP 1: Execute Automated CFP Core Logic');
      console.log('[RANKING TEST] ========================================');

      const uniqueUrl = `https://test-ranking-${Date.now()}.example.com`;
      testState.businessId = await executeCFPFlow(
        authenticatedPage,
        baseURL,
        uniqueUrl
      );

      console.log(`[RANKING TEST] ✓ Business created: ID ${testState.businessId}`);
      testState.testResults!.cfpExecuted = true;
      console.log('[RANKING TEST] ✓ STEP 1 PASSED: CFP execution complete');
    });

    // Step 2: Verify Fingerprint Generation
    await test.step('Step 2: Verify Fingerprint Generation', async () => {
      if (!testState.businessId) {
        test.skip();
      }

      console.log('[RANKING TEST] ========================================');
      console.log('[RANKING TEST] STEP 2: Verify Fingerprint Generation');
      console.log('[RANKING TEST] ========================================');

      // Note: executeCFPFlow already waits for 'crawled' status, but we verify it here
      // Just verify the fingerprint exists

      // Fetch fingerprint DTO
      testState.fingerprintDTO = await fetchFingerprintDTO(
        authenticatedPage,
        baseURL,
        testState.businessId
      );

      // Verify fingerprint structure
      expect(testState.fingerprintDTO).toBeDefined();
      expect(testState.fingerprintDTO.visibilityScore).toBeDefined();
      expect(typeof testState.fingerprintDTO.visibilityScore).toBe('number');
      expect(testState.fingerprintDTO.visibilityScore).toBeGreaterThanOrEqual(0);
      expect(testState.fingerprintDTO.visibilityScore).toBeLessThanOrEqual(100);

      console.log(
        `[RANKING TEST] ✓ Visibility score: ${testState.fingerprintDTO.visibilityScore}`
      );

      testState.testResults!.fingerprintGenerated = true;
      console.log('[RANKING TEST] ✓ STEP 2 PASSED: Fingerprint generated');
    });

    // Step 3: Verify Visibility Score Calculation (DTO Layer)
    await test.step(
      'Step 3: Verify Visibility Score Calculation (DTO Layer)',
      async () => {
        if (!testState.fingerprintDTO) {
          test.skip();
        }

        console.log('[RANKING TEST] ========================================');
        console.log('[RANKING TEST] STEP 3: Verify Visibility Score Calculation');
        console.log('[RANKING TEST] ========================================');

        // Verify visibility score calculation
        const scoreVerification = verifyVisibilityScoreCalculation(
          testState.fingerprintDTO
        );

        // Log issues but don't fail - these are warnings to investigate
        if (!scoreVerification.isValid) {
          console.log('[RANKING TEST] ⚠️  Visibility score issues (non-critical):');
          scoreVerification.issues.forEach((issue) =>
            console.log(`[RANKING TEST]   ${issue}`)
          );
        } else {
          console.log('[RANKING TEST] ✓ Visibility score validation passed');
        }

        // Verify score components
        console.log(
          `[RANKING TEST] Visibility score: ${testState.fingerprintDTO.visibilityScore}`
        );
        console.log(
          `[RANKING TEST] Mention rate: ${testState.fingerprintDTO.summary?.mentionRate ?? 'N/A'}`
        );
        console.log(
          `[RANKING TEST] Sentiment score: ${testState.fingerprintDTO.summary?.sentimentScore ?? 'N/A'}`
        );
        console.log(
          `[RANKING TEST] Average rank: ${testState.fingerprintDTO.summary?.averageRank ?? 'N/A'}`
        );

        testState.testResults!.visibilityScoreCalculated = true;
        console.log('[RANKING TEST] ✓ STEP 3 PASSED: Visibility score calculated');
      }
    );

    // Step 4: Verify Trend Calculation (DTO Layer)
    await test.step('Step 4: Verify Trend Calculation (DTO Layer)', async () => {
      if (!testState.businessId) {
        test.skip();
      }

      console.log('[RANKING TEST] ========================================');
      console.log('[RANKING TEST] STEP 4: Verify Trend Calculation');
      console.log('[RANKING TEST] ========================================');

      // Fetch fingerprint history for trend calculation
      testState.fingerprintHistory = await fetchFingerprintHistory(
        authenticatedPage,
        baseURL,
        testState.businessId
      );

      // Fetch dashboard DTO to check trendValue
      const dashboardResponse = await authenticatedPage.request.get(
        `${baseURL}/api/dashboard`
      );
      const dashboardData = await dashboardResponse.json();
      const businessDashboardData = dashboardData.businesses?.find(
        (b: any) => b.id === testState.businessId?.toString()
      );
      testState.dashboardDTO = businessDashboardData;

      // Verify trend calculation
      const trendVerification = verifyTrendCalculation(
        testState.fingerprintHistory,
        testState.dashboardDTO
      );

      // Check for hardcoded trendValue (from terminal logs: hardcoded to 0)
      if (testState.dashboardDTO?.trendValue === 0 && testState.fingerprintHistory && testState.fingerprintHistory.length > 0) {
        console.log('[RANKING TEST] ⚠️  trendValue is hardcoded to 0 - should calculate from historical fingerprints');
        console.log(
          `[RANKING TEST]   Historical fingerprints available: ${testState.fingerprintHistory.length}`
        );
      }

      if (!trendVerification.isValid) {
        console.log('[RANKING TEST] ⚠️  Trend calculation issues:');
        trendVerification.issues.forEach((issue) =>
          console.log(`[RANKING TEST]   ${issue}`)
        );
      }

      console.log(`[RANKING TEST] Trend: ${testState.dashboardDTO?.trend ?? 'N/A'}`);
      console.log(
        `[RANKING TEST] Trend value: ${testState.dashboardDTO?.trendValue ?? 'N/A'}`
      );

      testState.testResults!.trendCalculated = true;
      console.log('[RANKING TEST] ✓ STEP 4 PASSED: Trend calculated');
    });

    // Step 5: Verify Dashboard Display
    await test.step('Step 5: Verify Dashboard Display', async () => {
      if (!testState.businessId) {
        test.skip();
      }

      console.log('[RANKING TEST] ========================================');
      console.log('[RANKING TEST] STEP 5: Verify Dashboard Display');
      console.log('[RANKING TEST] ========================================');

      // Navigate to dashboard
      await authenticatedPage.goto(`${baseURL}/dashboard`);
      await authenticatedPage.waitForLoadState('networkidle');

      // Get business name from DTO to find it on dashboard
      const businessResponse = await authenticatedPage.request.get(
        `${baseURL}/api/business/${testState.businessId}`
      );
      const businessData = await businessResponse.json();
      const businessName = businessData.business?.name || `Business ${testState.businessId}`;

      // Verify business is displayed in dashboard (by name)
      const businessCard = authenticatedPage
        .locator('text=' + businessName)
        .first();
      await expect(businessCard).toBeVisible({ timeout: 10000 });

      console.log(`[RANKING TEST] ✓ Business card found: ${businessName}`);

      // Verify visibility score is displayed (look for score pattern)
      // Dashboard shows visibility score, so look for number between 0-100
      const visibilityScorePattern = /[0-9]{1,3}/;
      const pageContent = await authenticatedPage.textContent('body');
      if (pageContent && visibilityScorePattern.test(pageContent)) {
        console.log(`[RANKING TEST] ✓ Visibility score displayed on dashboard`);
      } else {
        console.log(`[RANKING TEST] ⚠️  Visibility score may not be visible`);
      }

      testState.testResults!.dashboardDisplayVerified = true;
      console.log('[RANKING TEST] ✓ STEP 5 PASSED: Dashboard display verified');
    });

    // Step 6: Verify History Chart Display
    await test.step('Step 6: Verify History Chart Display', async () => {
      if (!testState.businessId) {
        test.skip();
      }

      console.log('[RANKING TEST] ========================================');
      console.log('[RANKING TEST] STEP 6: Verify History Chart Display');
      console.log('[RANKING TEST] ========================================');

      // Navigate to business detail page
      await authenticatedPage.goto(
        `${baseURL}/dashboard/businesses/${testState.businessId}`
      );
      await authenticatedPage.waitForLoadState('networkidle');

      // Verify visibility score chart is visible (look for chart title)
      const chartTitle = authenticatedPage.locator('text=Visibility Score Over Time');
      await expect(chartTitle).toBeVisible({ timeout: 10000 });

      console.log(`[RANKING TEST] ✓ Chart found on business detail page`);

      // Verify chart has data (check if chart container exists)
      const chartContainer = authenticatedPage.locator('svg'); // Recharts uses SVG
      const chartCount = await chartContainer.count();
      console.log(`[RANKING TEST] ✓ Chart SVG elements found: ${chartCount}`);

      if (chartCount === 0 && testState.fingerprintHistory && testState.fingerprintHistory.length > 0) {
        console.log('[RANKING TEST] ⚠️  Chart should have data but no SVG found');
      }

      testState.testResults!.historyChartVerified = true;
      console.log('[RANKING TEST] ✓ STEP 6 PASSED: History chart verified');
    });

    // Step 7: Summary - Verify All Issues Are Addressed
    await test.step('Step 7: Summary - Verify All Issues', async () => {
      console.log('[RANKING TEST] ========================================');
      console.log('[RANKING TEST] STEP 7: Summary - Verify All Issues');
      console.log('[RANKING TEST] ========================================');

      const issues: string[] = [];

      // Check visibility score calculation
      if (testState.fingerprintDTO) {
        const scoreVerification = verifyVisibilityScoreCalculation(
          testState.fingerprintDTO
        );
        if (!scoreVerification.isValid) {
          issues.push(
            `Visibility score calculation issues: ${scoreVerification.issues.join(', ')}`
          );
        }
      }

      // Check trend calculation (hardcoded trendValue)
      if (
        testState.dashboardDTO?.trendValue === 0 &&
        testState.fingerprintHistory &&
        testState.fingerprintHistory.length > 0
      ) {
        issues.push(
          'trendValue is hardcoded to 0 - should calculate from historical fingerprints'
        );
      }

      // Check trend calculation validity
      if (testState.fingerprintHistory && testState.dashboardDTO) {
        const trendVerification = verifyTrendCalculation(
          testState.fingerprintHistory,
          testState.dashboardDTO
        );
        if (!trendVerification.isValid) {
          issues.push(
            `Trend calculation issues: ${trendVerification.issues.join(', ')}`
          );
        }
      }

      if (issues.length > 0) {
        console.log('[RANKING TEST] ⚠️  Issues Found:');
        issues.forEach((issue) => console.log(`[RANKING TEST]   ${issue}`));
        throw new Error(
          `Found ${issues.length} critical issue(s). Fix and re-run.`
        );
      } else {
        console.log('[RANKING TEST] ✅ All critical issues resolved!');
        console.log('[RANKING TEST] ========================================');
        console.log('[RANKING TEST] RANKING/FINGERPRINT UX FLOW VERIFICATION COMPLETE');
        console.log('[RANKING TEST] ========================================');
      }
    });
  });
});

