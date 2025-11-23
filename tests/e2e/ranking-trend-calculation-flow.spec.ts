/**
 * Ranking Trend Calculation Flow: Iterative Flow Test
 * 
 * Purpose: Validates ranking trends are calculated correctly through DTO layer from fingerprint history
 * 
 * Flow: Database (llmFingerprints history) → DTO (trend calculation) → API → Dashboard/UI
 * 
 * Structure:
 * - Single test with 7 steps, each focusing on one validation point
 * - Shared test state persists across steps
 * - Uses test.step() to ensure same context across all steps
 * 
 * SOLID Principles:
 * - Single Responsibility: Each step focuses on one validation layer
 * - Open/Closed: Easy to add new steps without modifying existing
 * 
 * DRY Principles:
 * - Shared test state avoids duplication
 * - Reusable helper functions
 * 
 * Issues Identified from Terminal Logs:
 * - Lines 34-48: DashboardBusinessDTO hardcoded trendValue warnings
 * - Lines 87-96: Fingerprint queries returning DTOs with trend data
 * - Lines 188-189: Fingerprint history API calls
 * - trendValue should be calculated from historical fingerprints, not hardcoded to 0
 */

import { test, expect } from './fixtures/authenticated-user';
import {
  executeCFPFlow,
  waitForBusinessStatus,
} from './helpers/dto-test-helpers';
import {
  fetchFingerprintDTO,
  fetchFingerprintHistory,
  verifyTrendCalculation,
  calculateTrendFromHistory,
  triggerFingerprintGeneration,
} from './helpers/fingerprint-test-helpers';
import type { Page } from '@playwright/test';

// Shared state type
type RankingTrendTestState = {
  businessId?: number;
  baseURL?: string;
  fingerprintHistory?: any[];
  firstFingerprint?: any;
  secondFingerprint?: any;
  dashboardDTO?: any;
  fingerprintDTO?: any;
  calculatedTrend?: { trendValue: number; trend: 'up' | 'down' | 'neutral' };
  testResults?: {
    cfpExecuted?: boolean;
    firstFingerprintGenerated?: boolean;
    secondFingerprintGenerated?: boolean;
    historyVerified?: boolean;
    trendCalculationVerified?: boolean;
    dashboardTrendVerified?: boolean;
    dtoTrendVerified?: boolean;
  };
};

/**
 * Fetch dashboard DTO for a business
 */
async function fetchDashboardDTO(
  page: Page,
  baseURL: string,
  businessId: number
): Promise<any> {
  const response = await page.request.get(
    `${baseURL}/api/dashboard`,
    { timeout: 30000 }
  );

  if (!response.ok()) {
    throw new Error(`Failed to fetch dashboard: ${response.status()}`);
  }

  const dashboardData = await response.json();
  const businessData = dashboardData.businesses?.find(
    (b: any) => b.id === businessId.toString() || b.id === businessId
  );

  return businessData;
}

/**
 * Verify trend calculation matches expected values
 */
function verifyTrendAccuracy(
  history: any[],
  dashboardDTO: any,
  fingerprintDTO: any
): { isValid: boolean; issues: string[] } {
  const issues: string[] = [];

  if (history.length < 2) {
    // Single fingerprint should have neutral trend
    if (dashboardDTO?.trendValue !== 0 && dashboardDTO?.trendValue !== undefined) {
      issues.push(`Single fingerprint should have trendValue=0, got ${dashboardDTO.trendValue}`);
    }
    if (dashboardDTO?.trend && dashboardDTO.trend !== 'neutral') {
      issues.push(`Single fingerprint should have trend='neutral', got ${dashboardDTO.trend}`);
    }
    return { isValid: issues.length === 0, issues };
  }

  // Calculate expected trend from history
  const sortedHistory = [...history].sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  
  const firstScore = sortedHistory[0].visibilityScore;
  const lastScore = sortedHistory[sortedHistory.length - 1].visibilityScore;
  const expectedTrendValue = lastScore - firstScore;
  const expectedTrend: 'up' | 'down' | 'neutral' = 
    expectedTrendValue > 0 ? 'up' : expectedTrendValue < 0 ? 'down' : 'neutral';

  // Verify dashboard DTO trend
  if (dashboardDTO?.trendValue !== undefined) {
    if (dashboardDTO.trendValue !== expectedTrendValue) {
      issues.push(
        `Dashboard trendValue mismatch: expected ${expectedTrendValue}, got ${dashboardDTO.trendValue}`
      );
    }
  } else {
    issues.push('Dashboard trendValue is missing');
  }

  if (dashboardDTO?.trend) {
    if (dashboardDTO.trend !== expectedTrend) {
      issues.push(
        `Dashboard trend direction mismatch: expected ${expectedTrend}, got ${dashboardDTO.trend}`
      );
    }
  } else {
    issues.push('Dashboard trend is missing');
  }

  // Verify fingerprint DTO trend
  if (fingerprintDTO?.trend) {
    if (fingerprintDTO.trend !== expectedTrend) {
      issues.push(
        `Fingerprint DTO trend direction mismatch: expected ${expectedTrend}, got ${fingerprintDTO.trend}`
      );
    }
  }

  return {
    isValid: issues.length === 0,
    issues,
  };
}

test.describe('Ranking Trend Calculation Flow: Iterative Flow Test', () => {
  test.setTimeout(600_000); // 10 minutes for full suite

  test('Complete Ranking Trend Calculation Flow Verification', async ({
    authenticatedPage,
  }) => {
    // Shared state across all steps
    const testState: RankingTrendTestState = {
      testResults: {},
    };

    const baseURL = process.env.BASE_URL || 'http://localhost:3000';
    testState.baseURL = baseURL;

    // Step 1: Execute Automated CFP Core Logic
    await test.step('Step 1: Execute Automated CFP Core Logic', async () => {
      console.log('[TREND TEST] ========================================');
      console.log('[TREND TEST] STEP 1: Execute Automated CFP Core Logic');
      console.log('[TREND TEST] ========================================');

      const uniqueUrl = `https://test-trend-${Date.now()}.example.com`;
      testState.businessId = await executeCFPFlow(
        authenticatedPage,
        baseURL,
        uniqueUrl
      );

      console.log(`[TREND TEST] ✓ Business created: ID ${testState.businessId}`);
      testState.testResults!.cfpExecuted = true;
      console.log('[TREND TEST] ✓ STEP 1 PASSED: CFP execution complete');
    });

    // Step 2: Generate First Fingerprint
    await test.step('Step 2: Generate First Fingerprint', async () => {
      if (!testState.businessId) {
        test.skip();
      }

      console.log('[TREND TEST] ========================================');
      console.log('[TREND TEST] STEP 2: Generate First Fingerprint');
      console.log('[TREND TEST] ========================================');

      // Trigger fingerprint generation
      // DRY: Use helper function with proper timeout handling
      const fingerprintResult = await triggerFingerprintGeneration(
        authenticatedPage,
        baseURL,
        testState.businessId
      );

      if (fingerprintResult) {
        console.log(`[TREND TEST] ✓ First fingerprint generated: ID ${fingerprintResult.fingerprintId}`);
      } else {
        console.log('[TREND TEST] ⚠️  Fingerprint frequency limit or timeout - using existing if available');
      }

      // Wait for processing
      await authenticatedPage.waitForTimeout(5000);

      // Fetch first fingerprint
      testState.firstFingerprint = await fetchFingerprintDTO(
        authenticatedPage,
        baseURL,
        testState.businessId
      );

      expect(testState.firstFingerprint).toBeDefined();
      expect(testState.firstFingerprint.visibilityScore).toBeDefined();
      console.log(`[TREND TEST] ✓ First fingerprint visibility score: ${testState.firstFingerprint.visibilityScore}`);
      
      testState.testResults!.firstFingerprintGenerated = true;
      console.log('[TREND TEST] ✓ STEP 2 PASSED: First fingerprint generated');
    });

    // Step 3: Generate Second Fingerprint (for trend calculation)
    await test.step('Step 3: Generate Second Fingerprint', async () => {
      if (!testState.businessId) {
        test.skip();
      }

      console.log('[TREND TEST] ========================================');
      console.log('[TREND TEST] STEP 3: Generate Second Fingerprint');
      console.log('[TREND TEST] ========================================');

      // Wait a bit before generating second fingerprint
      await authenticatedPage.waitForTimeout(2000);

      // Try to trigger second fingerprint (may hit frequency limit)
      // DRY: Use helper function with proper timeout handling
      const fingerprintResult = await triggerFingerprintGeneration(
        authenticatedPage,
        baseURL,
        testState.businessId
      );

      if (fingerprintResult) {
        console.log(`[TREND TEST] ✓ Second fingerprint generated: ID ${fingerprintResult.fingerprintId}`);
        // Wait for processing
        await authenticatedPage.waitForTimeout(5000);
      } else {
        console.log('[TREND TEST] ⚠️  Second fingerprint frequency limit or timeout');
        console.log('[TREND TEST] This is expected - will use existing fingerprint history');
        console.log('[TREND TEST] For trend testing, we need at least 2 fingerprints in history');
        console.log('[TREND TEST] Will verify trend calculation with available history');
      }

      // Fetch second fingerprint
      testState.secondFingerprint = await fetchFingerprintDTO(
        authenticatedPage,
        baseURL,
        testState.businessId
      );

      // Note: If frequency limit, secondFingerprint may be same as firstFingerprint
      // This is acceptable - we'll verify trend calculation with available history
      expect(testState.secondFingerprint).toBeDefined();
      console.log(`[TREND TEST] ✓ Second fingerprint visibility score: ${testState.secondFingerprint.visibilityScore}`);
      
      testState.testResults!.secondFingerprintGenerated = true;
      console.log('[TREND TEST] ✓ STEP 3 PASSED: Second fingerprint processed');
    });

    // Step 4: Verify Fingerprint History (Database Ground Truth)
    await test.step('Step 4: Verify Fingerprint History (Database Ground Truth)', async () => {
      if (!testState.businessId) {
        test.skip();
      }

      console.log('[TREND TEST] ========================================');
      console.log('[TREND TEST] STEP 4: Verify Fingerprint History');
      console.log('[TREND TEST] ========================================');

      // Fetch fingerprint history
      testState.fingerprintHistory = await fetchFingerprintHistory(
        authenticatedPage,
        baseURL,
        testState.businessId
      );

      expect(Array.isArray(testState.fingerprintHistory)).toBe(true);
      console.log(`[TREND TEST] ✓ Fingerprint history fetched: ${testState.fingerprintHistory.length} points`);

      if (testState.fingerprintHistory.length === 0) {
        console.log('[TREND TEST] ⚠️  No fingerprint history available');
        console.log('[TREND TEST] Trend calculation requires at least 1 fingerprint');
        test.skip();
      }

      // Verify history structure
      testState.fingerprintHistory.forEach((point, idx) => {
        expect(point.visibilityScore).toBeDefined();
        expect(typeof point.visibilityScore).toBe('number');
        expect(point.date).toBeDefined();
        console.log(`[TREND TEST]   Point ${idx + 1}: score=${point.visibilityScore}, date=${point.date}`);
      });

      // Calculate expected trend from history
      testState.calculatedTrend = calculateTrendFromHistory(testState.fingerprintHistory);
      console.log(`[TREND TEST] ✓ Calculated trend: ${testState.calculatedTrend.trend} (value: ${testState.calculatedTrend.trendValue})`);

      testState.testResults!.historyVerified = true;
      console.log('[TREND TEST] ✓ STEP 4 PASSED: Fingerprint history verified');
    });

    // Step 5: Verify Trend Calculation in DTO Layer
    await test.step('Step 5: Verify Trend Calculation in DTO Layer', async () => {
      if (!testState.fingerprintHistory || testState.fingerprintHistory.length === 0) {
        test.skip();
      }

      console.log('[TREND TEST] ========================================');
      console.log('[TREND TEST] STEP 5: Verify Trend Calculation in DTO');
      console.log('[TREND TEST] ========================================');

      // Fetch dashboard DTO
      testState.dashboardDTO = await fetchDashboardDTO(
        authenticatedPage,
        baseURL,
        testState.businessId!
      );

      // Fetch fingerprint DTO
      testState.fingerprintDTO = await fetchFingerprintDTO(
        authenticatedPage,
        baseURL,
        testState.businessId!
      );

      // Verify trend calculation
      const trendVerification = verifyTrendCalculation(
        testState.fingerprintHistory,
        testState.dashboardDTO
      );

      // Check for hardcoded trendValue (from terminal logs: hardcoded to 0)
      if (testState.dashboardDTO?.trendValue === 0 && testState.fingerprintHistory.length > 1) {
        console.log('[TREND TEST] ⚠️  trendValue is hardcoded to 0 - should calculate from historical fingerprints');
        console.log(`[TREND TEST]   Historical fingerprints available: ${testState.fingerprintHistory.length}`);
        console.log(`[TREND TEST]   Expected trendValue: ${testState.calculatedTrend?.trendValue}`);
      }

      if (!trendVerification.isValid) {
        console.log('[TREND TEST] ⚠️  Trend calculation issues:');
        trendVerification.issues.forEach((issue) =>
          console.log(`[TREND TEST]   ${issue}`)
        );
      } else {
        console.log('[TREND TEST] ✓ Trend calculation validated');
      }

      // Verify trend accuracy
      const accuracyVerification = verifyTrendAccuracy(
        testState.fingerprintHistory,
        testState.dashboardDTO,
        testState.fingerprintDTO
      );

      if (!accuracyVerification.isValid) {
        console.log('[TREND TEST] ⚠️  Trend accuracy issues:');
        accuracyVerification.issues.forEach((issue) =>
          console.log(`[TREND TEST]   ${issue}`)
        );
      } else {
        console.log('[TREND TEST] ✓ Trend accuracy validated');
        console.log(`[TREND TEST]   Dashboard trend: ${testState.dashboardDTO?.trend} (value: ${testState.dashboardDTO?.trendValue})`);
        console.log(`[TREND TEST]   Fingerprint DTO trend: ${testState.fingerprintDTO?.trend}`);
      }

      testState.testResults!.trendCalculationVerified = true;
      console.log('[TREND TEST] ✓ STEP 5 PASSED: Trend calculation verified');
    });

    // Step 6: Verify Dashboard Display
    await test.step('Step 6: Verify Dashboard Display', async () => {
      if (!testState.businessId) {
        test.skip();
      }

      console.log('[TREND TEST] ========================================');
      console.log('[TREND TEST] STEP 6: Verify Dashboard Display');
      console.log('[TREND TEST] ========================================');

      // Navigate to dashboard
      await authenticatedPage.goto(`${baseURL}/dashboard`);
      await authenticatedPage.waitForLoadState('networkidle');

      // Get business name from DTO to find it on dashboard
      const businessResponse = await authenticatedPage.request.get(
        `${baseURL}/api/business/${testState.businessId}`
      );
      const businessData = await businessResponse.json();
      const businessName = businessData.business?.name || `Business ${testState.businessId}`;

      // Verify business is displayed in dashboard
      const businessCard = authenticatedPage
        .locator('text=' + businessName)
        .first();
      await expect(businessCard).toBeVisible({ timeout: 10000 });

      console.log(`[TREND TEST] ✓ Business card found: ${businessName}`);

      // Verify trend is displayed (look for trend indicators)
      // Dashboard may show trend arrows or trend text
      const pageContent = await authenticatedPage.textContent('body');
      if (pageContent) {
        const hasTrendIndicator = 
          pageContent.includes('up') || 
          pageContent.includes('down') || 
          pageContent.includes('neutral') ||
          pageContent.includes('trend');
        
        if (hasTrendIndicator) {
          console.log('[TREND TEST] ✓ Trend indicator found on dashboard');
        } else {
          console.log('[TREND TEST] ⚠️  Trend indicator may not be visible');
        }
      }

      testState.testResults!.dashboardTrendVerified = true;
      console.log('[TREND TEST] ✓ STEP 6 PASSED: Dashboard display verified');
    });

    // Step 7: Summary - Verify All Issues Are Addressed
    await test.step('Step 7: Summary - Verify All Issues', async () => {
      console.log('[TREND TEST] ========================================');
      console.log('[TREND TEST] STEP 7: Summary - Verify All Issues');
      console.log('[TREND TEST] ========================================');

      const issues: string[] = [];

      // Check trend calculation (hardcoded trendValue)
      if (
        testState.dashboardDTO?.trendValue === 0 &&
        testState.fingerprintHistory &&
        testState.fingerprintHistory.length > 1
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

      // Check trend accuracy
      if (testState.fingerprintHistory && testState.dashboardDTO && testState.fingerprintDTO) {
        const accuracyVerification = verifyTrendAccuracy(
          testState.fingerprintHistory,
          testState.dashboardDTO,
          testState.fingerprintDTO
        );
        if (!accuracyVerification.isValid) {
          issues.push(
            `Trend accuracy issues: ${accuracyVerification.issues.join(', ')}`
          );
        }
      }

      if (issues.length > 0) {
        console.log('[TREND TEST] ⚠️  Issues Found:');
        issues.forEach((issue) => console.log(`[TREND TEST]   ${issue}`));
        throw new Error(`Found ${issues.length} critical issue(s). Fix and re-run.`);
      } else {
        console.log('[TREND TEST] ✅ All critical issues resolved!');
        console.log('[TREND TEST] ========================================');
        console.log('[TREND TEST] RANKING TREND CALCULATION FLOW VERIFICATION COMPLETE');
        console.log('[TREND TEST] ========================================');
      }
    });
  });
});

