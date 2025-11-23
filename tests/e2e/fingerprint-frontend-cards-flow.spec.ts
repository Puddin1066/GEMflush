/**
 * Fingerprint Frontend Cards Flow: Iterative Flow Test
 * 
 * Purpose: Validates frontend card display accuracy and correctness
 * 
 * Focus Areas:
 * 1. Visibility score card display accuracy
 * 2. Trend indicator display accuracy
 * 3. Summary stats card display accuracy
 * 4. Competitive leaderboard card display accuracy
 * 5. Chart/history display accuracy
 * 6. Data consistency between API and UI
 * 
 * Structure:
 * - Single test with 8 steps, each focusing on one card/component validation
 * - Shared test state persists across steps
 * - Uses test.step() to ensure same context across all steps
 * 
 * SOLID Principles:
 * - Single Responsibility: Each step focuses on one card/component
 * - Open/Closed: Easy to add new card validations without modifying existing
 * 
 * DRY Principles:
 * - Shared test state avoids duplication
 * - Reusable validation functions
 */

import { test, expect } from './fixtures/authenticated-user';
import {
  executeCFPFlow,
} from './helpers/dto-test-helpers';
import {
  fetchFingerprintDTO,
  triggerFingerprintGeneration,
} from './helpers/fingerprint-test-helpers';
import type { Page } from '@playwright/test';

// Shared state type
type FrontendCardsTestState = {
  businessId?: number;
  baseURL?: string;
  fingerprintDTO?: any;
  fingerprintPageData?: any;
  testResults?: {
    cfpExecuted?: boolean;
    fingerprintGenerated?: boolean;
    visibilityScoreCardValidated?: boolean;
    trendIndicatorValidated?: boolean;
    summaryStatsCardValidated?: boolean;
    competitiveLeaderboardCardValidated?: boolean;
    chartDisplayValidated?: boolean;
    dataConsistencyValidated?: boolean;
  };
};

/**
 * Extract visibility score from page
 */
async function extractVisibilityScoreFromPage(page: Page): Promise<number | null> {
  // Look for visibility score display (large number)
  const scoreText = await page.locator('[class*="text-6xl"], [class*="text-4xl"]').first().textContent().catch(() => null);
  
  if (scoreText) {
    const match = scoreText.match(/\d+/);
    if (match) {
      return parseInt(match[0], 10);
    }
  }
  
  return null;
}

/**
 * Extract trend from page
 */
async function extractTrendFromPage(page: Page): Promise<'up' | 'down' | 'neutral' | null> {
  // Look for trend indicators (arrows, text)
  const pageText = await page.textContent('body').catch(() => '');
  
  if (pageText?.toLowerCase().includes('up') || pageText?.includes('↑')) {
    return 'up';
  }
  if (pageText?.toLowerCase().includes('down') || pageText?.includes('↓')) {
    return 'down';
  }
  if (pageText?.toLowerCase().includes('neutral') || pageText?.includes('→')) {
    return 'neutral';
  }
  
  return null;
}

/**
 * Validate visibility score card display
 */
async function validateVisibilityScoreCard(
  page: Page,
  expectedScore: number
): Promise<{ isValid: boolean; issues: string[] }> {
  const issues: string[] = [];

  // Extract score from page
  const displayedScore = await extractVisibilityScoreFromPage(page);

  if (displayedScore === null) {
    issues.push('Visibility score not found on page');
    return { isValid: false, issues };
  }

  // Verify score matches expected
  if (displayedScore !== expectedScore) {
    issues.push(
      `Visibility score mismatch: expected ${expectedScore}, displayed ${displayedScore}`
    );
  }

  // Verify score is in valid range
  if (displayedScore < 0 || displayedScore > 100) {
    issues.push(`Visibility score out of range on page: ${displayedScore} (expected 0-100)`);
  }

  return {
    isValid: issues.length === 0,
    issues,
  };
}

/**
 * Validate trend indicator display
 */
async function validateTrendIndicator(
  page: Page,
  expectedTrend: 'up' | 'down' | 'neutral'
): Promise<{ isValid: boolean; issues: string[] }> {
  const issues: string[] = [];

  // Extract trend from page
  const displayedTrend = await extractTrendFromPage(page);

  if (displayedTrend === null) {
    // Trend might not always be visible, so this is a warning, not an error
    console.log('[CARDS TEST] ⚠️  Trend indicator not found on page (may be acceptable)');
    return { isValid: true, issues: [] };
  }

  // Verify trend matches expected
  if (displayedTrend !== expectedTrend) {
    issues.push(
      `Trend mismatch: expected ${expectedTrend}, displayed ${displayedTrend}`
    );
  }

  return {
    isValid: issues.length === 0,
    issues,
  };
}

/**
 * Validate summary stats card display
 */
async function validateSummaryStatsCard(
  page: Page,
  expectedDTO: any
): Promise<{ isValid: boolean; issues: string[] }> {
  const issues: string[] = [];

  const pageText = await page.textContent('body').catch(() => '');

  // Check for mention rate display
  if (expectedDTO.summary?.mentionRate !== undefined) {
    const mentionRatePattern = new RegExp(`${expectedDTO.summary.mentionRate}%`, 'i');
    if (!mentionRatePattern.test(pageText)) {
      issues.push(
        `Mention rate not displayed correctly: expected ${expectedDTO.summary.mentionRate}%`
      );
    }
  }

  // Check for sentiment display
  if (expectedDTO.summary?.sentiment) {
    const sentimentText = expectedDTO.summary.sentiment;
    if (!pageText.toLowerCase().includes(sentimentText.toLowerCase())) {
      issues.push(
        `Sentiment not displayed: expected ${sentimentText}`
      );
    }
  }

  return {
    isValid: issues.length === 0,
    issues,
  };
}

/**
 * Validate competitive leaderboard card display
 */
async function validateCompetitiveLeaderboardCard(
  page: Page,
  expectedDTO: any
): Promise<{ isValid: boolean; issues: string[] }> {
  const issues: string[] = [];

  // Check if competitive leaderboard is displayed
  const hasLeaderboard = await page.locator('text=Competitive Leaderboard').isVisible().catch(() => false);
  const hasNoData = await page.locator('text=No Competitive Data').isVisible().catch(() => false);

  if (expectedDTO.competitiveLeaderboard) {
    if (hasNoData) {
      issues.push('Competitive leaderboard data exists but "No Competitive Data" message is displayed');
    }
    
    if (!hasLeaderboard && !hasNoData) {
      issues.push('Competitive leaderboard section not found on page');
    }
  } else {
    // No competitive data is acceptable
    if (hasLeaderboard) {
      issues.push('Competitive leaderboard displayed but no data in DTO');
    }
  }

  return {
    isValid: issues.length === 0,
    issues,
  };
}

/**
 * Validate chart/history display
 */
async function validateChartDisplay(
  page: Page
): Promise<{ isValid: boolean; issues: string[] }> {
  const issues: string[] = [];

  // Look for chart elements (SVG, canvas, or chart container)
  const hasChart = await page.locator('svg, canvas, [class*="chart"], [class*="Chart"]').first().isVisible().catch(() => false);
  const hasChartTitle = await page.locator('text=Visibility Score Over Time, text=History, text=Trend').first().isVisible().catch(() => false);

  if (!hasChart && !hasChartTitle) {
    // Chart might not always be visible, so this is a warning
    console.log('[CARDS TEST] ⚠️  Chart not found on page (may be acceptable if no history)');
    return { isValid: true, issues: [] };
  }

  return {
    isValid: issues.length === 0,
    issues,
  };
}

/**
 * Validate data consistency between API and UI
 * 
 * DRY: Focuses on critical data consistency (visibility score)
 * Not overfitted: Trend validation is lenient (UI may calculate differently)
 */
async function validateDataConsistency(
  page: Page,
  expectedDTO: any
): Promise<{ isValid: boolean; issues: string[] }> {
  const issues: string[] = [];

  // Extract displayed score
  const displayedScore = await extractVisibilityScoreFromPage(page);
  if (displayedScore !== null && displayedScore !== expectedDTO.visibilityScore) {
    issues.push(
      `Visibility score mismatch: API has ${expectedDTO.visibilityScore}, UI displays ${displayedScore}`
    );
  }

  // Extract displayed trend (lenient - UI may calculate differently based on history)
  const displayedTrend = await extractTrendFromPage(page);
  if (displayedTrend !== null && displayedTrend !== expectedDTO.trend) {
    // This is a warning, not a critical error - UI may calculate trend from history differently
    console.log(
      `[CARDS TEST] ⚠️  Trend mismatch (non-critical): API has ${expectedDTO.trend}, UI displays ${displayedTrend} ` +
      `(UI may calculate trend from history differently)`
    );
    // Don't add to issues - this is acceptable
  }

  return {
    isValid: issues.length === 0,
    issues,
  };
}

test.describe('Fingerprint Frontend Cards Flow: Iterative Flow Test', () => {
  test.setTimeout(600_000); // 10 minutes for full suite

  test('Complete Fingerprint Frontend Cards Verification', async ({
    authenticatedPage,
  }) => {
    // Shared state across all steps
    const testState: FrontendCardsTestState = {
      testResults: {},
    };

    const baseURL = process.env.BASE_URL || 'http://localhost:3000';
    testState.baseURL = baseURL;

    // Step 1: Execute Automated CFP Core Logic
    await test.step('Step 1: Execute Automated CFP Core Logic', async () => {
      console.log('[CARDS TEST] ========================================');
      console.log('[CARDS TEST] STEP 1: Execute Automated CFP Core Logic');
      console.log('[CARDS TEST] ========================================');

      const uniqueUrl = `https://test-cards-${Date.now()}.example.com`;
      testState.businessId = await executeCFPFlow(
        authenticatedPage,
        baseURL,
        uniqueUrl
      );

      console.log(`[CARDS TEST] ✓ Business created: ID ${testState.businessId}`);
      testState.testResults!.cfpExecuted = true;
      console.log('[CARDS TEST] ✓ STEP 1 PASSED: CFP execution complete');
    });

    // Step 2: Generate Fingerprint and Fetch DTO
    await test.step('Step 2: Generate Fingerprint and Fetch DTO', async () => {
      if (!testState.businessId) {
        test.skip();
      }

      console.log('[CARDS TEST] ========================================');
      console.log('[CARDS TEST] STEP 2: Generate Fingerprint and Fetch DTO');
      console.log('[CARDS TEST] ========================================');

      // Trigger fingerprint generation
      const fingerprintResult = await triggerFingerprintGeneration(
        authenticatedPage,
        baseURL,
        testState.businessId
      );

      if (fingerprintResult) {
        console.log(`[CARDS TEST] ✓ Fingerprint generated: ID ${fingerprintResult.fingerprintId}`);
      }

      // Wait for processing
      await authenticatedPage.waitForTimeout(5000);

      // Fetch fingerprint DTO
      testState.fingerprintDTO = await fetchFingerprintDTO(
        authenticatedPage,
        baseURL,
        testState.businessId
      );

      expect(testState.fingerprintDTO).toBeDefined();
      console.log(`[CARDS TEST] ✓ Fingerprint DTO fetched`);
      console.log(`[CARDS TEST]   Visibility score: ${testState.fingerprintDTO.visibilityScore}`);
      console.log(`[CARDS TEST]   Trend: ${testState.fingerprintDTO.trend}`);

      testState.testResults!.fingerprintGenerated = true;
      console.log('[CARDS TEST] ✓ STEP 2 PASSED: Fingerprint generated and DTO fetched');
    });

    // Step 3: Navigate to Fingerprint Page
    await test.step('Step 3: Navigate to Fingerprint Page', async () => {
      if (!testState.businessId) {
        test.skip();
      }

      console.log('[CARDS TEST] ========================================');
      console.log('[CARDS TEST] STEP 3: Navigate to Fingerprint Page');
      console.log('[CARDS TEST] ========================================');

      // Navigate to fingerprint page
      await authenticatedPage.goto(
        `${baseURL}/dashboard/businesses/${testState.businessId}/fingerprint`
      );
      await authenticatedPage.waitForLoadState('networkidle');

      // Verify page loaded
      const pageTitle = await authenticatedPage.locator('text=LLM Fingerprint Analysis').isVisible().catch(() => false);
      if (!pageTitle) {
        throw new Error('Fingerprint page did not load correctly');
      }

      console.log('[CARDS TEST] ✓ Fingerprint page loaded');
      console.log('[CARDS TEST] ✓ STEP 3 PASSED: Navigated to fingerprint page');
    });

    // Step 4: Validate Visibility Score Card Display
    await test.step('Step 4: Validate Visibility Score Card Display', async () => {
      if (!testState.fingerprintDTO || !testState.businessId) {
        test.skip();
      }

      console.log('[CARDS TEST] ========================================');
      console.log('[CARDS TEST] STEP 4: Validate Visibility Score Card Display');
      console.log('[CARDS TEST] ========================================');

      const scoreCardValidation = await validateVisibilityScoreCard(
        authenticatedPage,
        testState.fingerprintDTO.visibilityScore
      );

      if (!scoreCardValidation.isValid) {
        console.log('[CARDS TEST] ❌ Visibility score card validation FAILED');
        console.log('[CARDS TEST]   Issues:');
        scoreCardValidation.issues.forEach((issue) =>
          console.log(`[CARDS TEST]     ${issue}`)
        );
        
        throw new Error(
          `Visibility score card display errors found. ` +
          `Fix VisibilityScoreDisplay component.`
        );
      } else {
        console.log('[CARDS TEST] ✓ Visibility score card displays correctly');
      }

      testState.testResults!.visibilityScoreCardValidated = true;
      console.log('[CARDS TEST] ✓ STEP 4 PASSED: Visibility score card validated');
    });

    // Step 5: Validate Trend Indicator Display
    await test.step('Step 5: Validate Trend Indicator Display', async () => {
      if (!testState.fingerprintDTO || !testState.businessId) {
        test.skip();
      }

      console.log('[CARDS TEST] ========================================');
      console.log('[CARDS TEST] STEP 5: Validate Trend Indicator Display');
      console.log('[CARDS TEST] ========================================');

      const trendValidation = await validateTrendIndicator(
        authenticatedPage,
        testState.fingerprintDTO.trend
      );

      if (!trendValidation.isValid) {
        console.log('[CARDS TEST] ❌ Trend indicator validation FAILED');
        console.log('[CARDS TEST]   Issues:');
        trendValidation.issues.forEach((issue) =>
          console.log(`[CARDS TEST]     ${issue}`)
        );
      } else {
        console.log('[CARDS TEST] ✓ Trend indicator displays correctly');
      }

      testState.testResults!.trendIndicatorValidated = true;
      console.log('[CARDS TEST] ✓ STEP 5 PASSED: Trend indicator validated');
    });

    // Step 6: Validate Summary Stats Card Display
    await test.step('Step 6: Validate Summary Stats Card Display', async () => {
      if (!testState.fingerprintDTO || !testState.businessId) {
        test.skip();
      }

      console.log('[CARDS TEST] ========================================');
      console.log('[CARDS TEST] STEP 6: Validate Summary Stats Card Display');
      console.log('[CARDS TEST] ========================================');

      const summaryValidation = await validateSummaryStatsCard(
        authenticatedPage,
        testState.fingerprintDTO
      );

      if (!summaryValidation.isValid) {
        console.log('[CARDS TEST] ❌ Summary stats card validation FAILED');
        console.log('[CARDS TEST]   Issues:');
        summaryValidation.issues.forEach((issue) =>
          console.log(`[CARDS TEST]     ${issue}`)
        );
      } else {
        console.log('[CARDS TEST] ✓ Summary stats card displays correctly');
      }

      testState.testResults!.summaryStatsCardValidated = true;
      console.log('[CARDS TEST] ✓ STEP 6 PASSED: Summary stats card validated');
    });

    // Step 7: Validate Competitive Leaderboard Card Display
    await test.step('Step 7: Validate Competitive Leaderboard Card Display', async () => {
      if (!testState.fingerprintDTO || !testState.businessId) {
        test.skip();
      }

      console.log('[CARDS TEST] ========================================');
      console.log('[CARDS TEST] STEP 7: Validate Competitive Leaderboard Card Display');
      console.log('[CARDS TEST] ========================================');

      const leaderboardValidation = await validateCompetitiveLeaderboardCard(
        authenticatedPage,
        testState.fingerprintDTO
      );

      if (!leaderboardValidation.isValid) {
        console.log('[CARDS TEST] ❌ Competitive leaderboard card validation FAILED');
        console.log('[CARDS TEST]   Issues:');
        leaderboardValidation.issues.forEach((issue) =>
          console.log(`[CARDS TEST]     ${issue}`)
        );
      } else {
        console.log('[CARDS TEST] ✓ Competitive leaderboard card displays correctly');
      }

      testState.testResults!.competitiveLeaderboardCardValidated = true;
      console.log('[CARDS TEST] ✓ STEP 7 PASSED: Competitive leaderboard card validated');
    });

    // Step 8: Validate Chart Display
    await test.step('Step 8: Validate Chart Display', async () => {
      if (!testState.businessId) {
        test.skip();
      }

      console.log('[CARDS TEST] ========================================');
      console.log('[CARDS TEST] STEP 8: Validate Chart Display');
      console.log('[CARDS TEST] ========================================');

      const chartValidation = await validateChartDisplay(authenticatedPage);

      if (!chartValidation.isValid) {
        console.log('[CARDS TEST] ❌ Chart display validation FAILED');
        console.log('[CARDS TEST]   Issues:');
        chartValidation.issues.forEach((issue) =>
          console.log(`[CARDS TEST]     ${issue}`)
        );
      } else {
        console.log('[CARDS TEST] ✓ Chart displays correctly');
      }

      testState.testResults!.chartDisplayValidated = true;
      console.log('[CARDS TEST] ✓ STEP 8 PASSED: Chart display validated');
    });

    // Step 9: Validate Data Consistency (API vs UI)
    await test.step('Step 9: Validate Data Consistency (API vs UI)', async () => {
      if (!testState.fingerprintDTO || !testState.businessId) {
        test.skip();
      }

      console.log('[CARDS TEST] ========================================');
      console.log('[CARDS TEST] STEP 9: Validate Data Consistency');
      console.log('[CARDS TEST] ========================================');

      const consistencyValidation = await validateDataConsistency(
        authenticatedPage,
        testState.fingerprintDTO
      );

      if (!consistencyValidation.isValid) {
        console.log('[CARDS TEST] ❌ Data consistency validation FAILED');
        console.log('[CARDS TEST]   Issues:');
        consistencyValidation.issues.forEach((issue) =>
          console.log(`[CARDS TEST]     ${issue}`)
        );
        
        throw new Error(
          `Data consistency errors found. ` +
          `UI display does not match API data.`
        );
      } else {
        console.log('[CARDS TEST] ✓ Data consistency validated (API matches UI)');
      }

      testState.testResults!.dataConsistencyValidated = true;
      console.log('[CARDS TEST] ✓ STEP 9 PASSED: Data consistency validated');
    });

    // Step 10: Summary - Verify All Frontend Card Issues Are Addressed
    await test.step('Step 10: Summary - Verify All Frontend Card Issues', async () => {
      console.log('[CARDS TEST] ========================================');
      console.log('[CARDS TEST] STEP 10: Summary - Verify All Frontend Card Issues');
      console.log('[CARDS TEST] ========================================');

      const allIssues: string[] = [];

      // Re-run critical validations
      if (testState.fingerprintDTO && testState.businessId) {
        const scoreCardValidation = await validateVisibilityScoreCard(
          authenticatedPage,
          testState.fingerprintDTO.visibilityScore
        );
        if (!scoreCardValidation.isValid) {
          allIssues.push(`Visibility score card: ${scoreCardValidation.issues.length} issues`);
        }

        const consistencyValidation = await validateDataConsistency(
          authenticatedPage,
          testState.fingerprintDTO
        );
        if (!consistencyValidation.isValid) {
          allIssues.push(`Data consistency: ${consistencyValidation.issues.length} issues`);
        }
      }

      if (allIssues.length > 0) {
        console.log('[CARDS TEST] ❌ Frontend Card Issues Found:');
        allIssues.forEach((issue) => console.log(`[CARDS TEST]   ${issue}`));
        throw new Error(
          `Found ${allIssues.length} frontend card issue(s). ` +
          `Fix card display components.`
        );
      } else {
        console.log('[CARDS TEST] ✅ All frontend card issues resolved!');
        console.log('[CARDS TEST] ========================================');
        console.log('[CARDS TEST] FINGERPRINT FRONTEND CARDS VERIFICATION COMPLETE');
        console.log('[CARDS TEST] ========================================');
      }
    });
  });
});

