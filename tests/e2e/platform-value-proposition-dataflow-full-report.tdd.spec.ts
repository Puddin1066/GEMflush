/**
 * TDD E2E Test: Complete Platform Value Proposition & Dataflow (FULL REPORT MODE)
 * 
 * This variant runs ALL steps and reports ALL failures at once.
 * Use this for GREEN phase to identify all bugs that need fixing.
 * 
 * Usage: pnpm test:e2e:tdd:full tests/e2e/platform-value-proposition-dataflow-full-report.tdd.spec.ts
 */

import { test, expect } from './fixtures/authenticated-user';
import {
  setupProTeam,
  mockExternalServices,
} from './helpers/api-helpers';
import {
  executeCFPFlow,
  fetchDatabaseBusiness,
  fetchLatestFingerprint,
  waitForBusinessStatus,
} from './helpers/dto-test-helpers';
import type { Page } from '@playwright/test';

// Shared test state across all steps
type PlatformValueTestState = {
  businessId?: number;
  baseURL?: string;
  databaseBusiness?: any;
  databaseFingerprint?: any;
  fingerprintHistory?: any[];
  publishData?: any;
  competitiveLeaderboard?: any;
  testResults?: {
    signupComplete?: boolean;
    businessCreated?: boolean;
    cfpExecuted?: boolean;
    publishedToWikidata?: boolean;
    componentsDisplayData?: boolean;
    monthlyAutomationScheduled?: boolean;
    dataflowVerified?: boolean;
  };
  errors?: Array<{
    step: number;
    stepName: string;
    error: string;
    details?: any;
  }>;
};

test.describe('🔴 RED: Complete Platform Value Proposition & Dataflow (FULL REPORT)', () => {
  test.setTimeout(600_000); // 10 minutes for complete flow

  // FULL REPORT MODE: Continue through all steps, collect all failures
  test.describe.configure({ 
    retries: 0,
  });

  test('Complete Platform Value Delivery: Automated CFP → Frontend Display (All Bugs Report)', async ({
    authenticatedPage,
  }) => {
    const testState: PlatformValueTestState = {
      testResults: {},
      errors: [],
    };

    // ========================================================================
    // COMPREHENSIVE ERROR CAPTURE: All errors for debugging
    // ========================================================================
    const allErrors = {
      consoleErrors: [] as Array<{ type: string; text: string; location?: string; timestamp: number }>,
      consoleWarnings: [] as Array<{ text: string; location?: string; timestamp: number }>,
      pageErrors: [] as Array<{ message: string; stack?: string; timestamp: number }>,
      networkErrors: [] as Array<{ method: string; url: string; error: string; timestamp: number }>,
      responseErrors: [] as Array<{ url: string; status: number; statusText: string; timestamp: number }>,
    };

    // Capture ALL console messages
    authenticatedPage.on('console', (msg) => {
      const type = msg.type();
      const text = msg.text();
      const location = msg.location();
      const timestamp = Date.now();
      
      if (type === 'error') {
        allErrors.consoleErrors.push({ type, text, location: location?.url, timestamp });
        console.log(`[BROWSER ERROR] ${text}`);
        if (location?.url) {
          console.log(`[BROWSER ERROR]   Location: ${location.url}:${location.lineNumber}:${location.columnNumber}`);
        }
      } else if (type === 'warning') {
        allErrors.consoleWarnings.push({ text, location: location?.url, timestamp });
        console.log(`[BROWSER WARNING] ${text}`);
      } else if (type === 'log' && (text.includes('error') || text.includes('Error') || text.includes('failed'))) {
        // Capture error-like log messages
        console.log(`[BROWSER LOG] ${text}`);
      }
    });

    // Capture ALL JavaScript exceptions
    authenticatedPage.on('pageerror', (error) => {
      allErrors.pageErrors.push({
        message: error.message,
        stack: error.stack,
        timestamp: Date.now(),
      });
      console.log(`[PAGE ERROR] ${error.message}`);
      if (error.stack) {
        console.log(`[PAGE ERROR STACK] ${error.stack.split('\n').slice(0, 5).join('\n')}`);
      }
    });

    // Capture ALL network failures
    authenticatedPage.on('requestfailed', (request) => {
      const failure = request.failure();
      allErrors.networkErrors.push({
        method: request.method(),
        url: request.url(),
        error: failure?.errorText || 'Unknown error',
        timestamp: Date.now(),
      });
      console.log(`[NETWORK FAILED] ${request.method()} ${request.url()}`);
      console.log(`[NETWORK FAILED]   Error: ${failure?.errorText || 'Unknown'}`);
    });

    // Capture ALL failed HTTP responses (4xx, 5xx)
    authenticatedPage.on('response', (response) => {
      if (!response.ok() && response.status() >= 400) {
        allErrors.responseErrors.push({
          url: response.url(),
          status: response.status(),
          statusText: response.statusText(),
          timestamp: Date.now(),
        });
        console.log(`[HTTP ERROR] ${response.status()} ${response.statusText()} - ${response.url()}`);
      }
    });

    // Track which step we're on for clear bug identification
    let currentStep = 0;
    const stepNames = [
      'Setup Pro User & External Services',
      'Create Business with URL-Only',
      'Automated CFP Execution',
      'Verify Monthly Automation Scheduled',
      'Verify Complete Dataflow',
      'Verify Frontend Components Display',
      'Verify Data Persistence',
      'Verify Complete Value Proposition',
    ];

    // Helper: Record error without stopping test
    const recordError = (step: number, stepName: string, error: Error | string, details?: any) => {
      testState.errors = testState.errors || [];
      
      // Include ALL errors captured up to this point
      const errorDetails = {
        ...details,
        browserConsoleErrors: allErrors.consoleErrors.slice(-10), // Last 10 errors
        browserPageErrors: allErrors.pageErrors.slice(-10), // Last 10 page errors
        networkErrors: allErrors.networkErrors.slice(-10), // Last 10 network errors
        responseErrors: allErrors.responseErrors.slice(-10), // Last 10 HTTP errors
      };
      
      testState.errors.push({
        step,
        stepName,
        error: error instanceof Error ? error.message : String(error),
        details: errorDetails,
      });
      console.log(`\n[PLATFORM TEST] ❌ STEP ${step} FAILED: ${stepName}`);
      console.log(`[PLATFORM TEST] Error: ${error instanceof Error ? error.message : String(error)}`);
      
      // Show recent errors captured
      const recentErrors = 
        allErrors.consoleErrors.length +
        allErrors.pageErrors.length +
        allErrors.networkErrors.length +
        allErrors.responseErrors.length;
      
      if (recentErrors > 0) {
        console.log(`[PLATFORM TEST] Errors captured so far: ${recentErrors} (see full report at end)`);
      }
    };

    // Helper: Run step with error collection
    const runStep = async (stepNumber: number, stepName: string, stepFn: () => Promise<void>) => {
      currentStep = stepNumber;
      const stepStartTime = Date.now();
      try {
        await test.step(`Step ${stepNumber}: ${stepName}`, async () => {
          console.log('\n[PLATFORM TEST] ========================================');
          console.log(`[PLATFORM TEST] STEP ${stepNumber}: ${stepName}`);
          console.log(`[PLATFORM TEST] Starting at ${new Date().toISOString()}`);
          console.log('[PLATFORM TEST] ========================================');
          await stepFn();
          const stepDuration = ((Date.now() - stepStartTime) / 1000).toFixed(1);
          console.log(`[PLATFORM TEST] ✓ STEP ${stepNumber} PASSED: ${stepName} (${stepDuration}s)`);
        });
      } catch (error) {
        const stepDuration = ((Date.now() - stepStartTime) / 1000).toFixed(1);
        console.log(`[PLATFORM TEST] ❌ STEP ${stepNumber} FAILED after ${stepDuration}s`);
        recordError(stepNumber, stepName, error as Error);
        // Continue to next step instead of throwing
      }
    };

    // ========================================================================
    // PHASE 1: SETUP - Pro User Onboarding
    // ========================================================================
    await runStep(1, stepNames[0], async () => {
      // Setup Pro tier team (enables automation)
      await setupProTeam(authenticatedPage);
      await mockExternalServices(authenticatedPage);
      await authenticatedPage.goto('/dashboard');
      await authenticatedPage.waitForLoadState('networkidle');

      testState.baseURL = authenticatedPage.url().split('/dashboard')[0] || 'http://localhost:3000';

      // Verify Pro tier features are enabled
      const teamResponse = await authenticatedPage.request.get(`${testState.baseURL}/api/team`);
      if (!teamResponse.ok()) {
        throw new Error(`Team API failed: ${teamResponse.status()}`);
      }
      const teamData = await teamResponse.json();
      if (teamData.planName !== 'pro') {
        throw new Error(`Expected Pro tier, got: ${teamData.planName}`);
      }
      if (teamData.subscriptionStatus !== 'active') {
        throw new Error(`Expected active subscription, got: ${teamData.subscriptionStatus}`);
      }

      testState.testResults!.signupComplete = true;
    });

    // ========================================================================
    // PHASE 2: BUSINESS CREATION - Frictionless Onboarding
    // ========================================================================
    await runStep(2, stepNames[1], async () => {
      // Create unique business URL per test run
      const timestamp = Date.now();
      const uniqueUrl = `https://example-business-platform-test-${timestamp}.com`;

      // SPECIFICATION: User can create business with URL-only (no manual data entry)
      const createResponse = await authenticatedPage.request.post(`${testState.baseURL}/api/business`, {
        data: {
          url: uniqueUrl,
        },
      });

      if (!createResponse.ok() && createResponse.status() !== 422) {
        throw new Error(`Business creation failed: ${createResponse.status()}`);
      }
      const createResult = await createResponse.json();
      testState.businessId = createResult?.business?.id;

      if (!testState.businessId) {
        throw new Error('Business ID not returned from creation API');
      }

      testState.testResults!.businessCreated = true;
      console.log(`[PLATFORM TEST] ✓ Business created: ID ${testState.businessId}`);
    });

    // ========================================================================
    // PHASE 3: AUTOMATED CFP EXECUTION - No User Interaction
    // ========================================================================
    await runStep(3, stepNames[2], async () => {
      // SPECIFICATION: CFP executes automatically (no manual trigger needed)
      // Playwright best practice: Set explicit timeout for API requests
      const processResponse = await authenticatedPage.request.post(
        `${testState.baseURL}/api/business/${testState.businessId}/process`,
        { timeout: 30000 } // 30 seconds for route to return (should be immediate, but allow for DB queries)
      );
      if (!processResponse.ok()) {
        const errorText = await processResponse.text().catch(() => 'Unknown error');
        throw new Error(`Process API failed: ${processResponse.status()} - ${errorText}`);
      }

      // Wait for CFP to complete (automated)
      try {
        await waitForBusinessStatus(
          authenticatedPage,
          testState.baseURL!,
          testState.businessId!,
          'published',
          300_000 // 5 minutes for complete CFP
        );
      } catch (error) {
        throw new Error(`CFP did not complete: ${error instanceof Error ? error.message : String(error)}`);
      }

      // Verify business is published
      testState.databaseBusiness = await fetchDatabaseBusiness(
        authenticatedPage,
        testState.baseURL!,
        testState.businessId!
      );

      if (testState.databaseBusiness.status !== 'published') {
        throw new Error(`Expected status 'published', got: ${testState.databaseBusiness.status}`);
      }
      if (!testState.databaseBusiness.wikidataQID) {
        throw new Error('Wikidata QID not assigned after publishing');
      }
      if (testState.databaseBusiness.automationEnabled !== true) {
        throw new Error(`Expected automationEnabled=true, got: ${testState.databaseBusiness.automationEnabled}`);
      }

      // Verify fingerprint was generated
      testState.databaseFingerprint = await fetchLatestFingerprint(
        authenticatedPage,
        testState.baseURL!,
        testState.businessId!
      );
      if (!testState.databaseFingerprint) {
        throw new Error('Fingerprint not generated');
      }
      if (!testState.databaseFingerprint.visibilityScore || testState.databaseFingerprint.visibilityScore <= 0) {
        throw new Error(`Invalid visibility score: ${testState.databaseFingerprint.visibilityScore}`);
      }

      testState.testResults!.cfpExecuted = true;
      testState.testResults!.publishedToWikidata = true;
      console.log(`[PLATFORM TEST] ✓ CFP complete: Status=${testState.databaseBusiness.status}, QID=${testState.databaseBusiness.wikidataQID}`);
    });

    // ========================================================================
    // PHASE 4: MONTHLY AUTOMATION SCHEDULING
    // ========================================================================
    await runStep(4, stepNames[3], async () => {
      // SPECIFICATION: Monthly automation is scheduled after CFP completion
      if (!testState.databaseBusiness?.nextCrawlAt) {
        throw new Error('nextCrawlAt not set on business');
      }

      const nextCrawlDate = new Date(testState.databaseBusiness.nextCrawlAt);
      const now = new Date();
      const daysUntilNext = Math.ceil((nextCrawlDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      // Verify next crawl is scheduled for ~30 days from now
      if (daysUntilNext < 25 || daysUntilNext > 35) {
        throw new Error(`Next crawl scheduled for ${daysUntilNext} days (expected 25-35 days)`);
      }

      testState.testResults!.monthlyAutomationScheduled = true;
      console.log(`[PLATFORM TEST] ✓ Next crawl scheduled: ${daysUntilNext} days from now`);
    });

    // ========================================================================
    // PHASE 5: DATAFLOW VERIFICATION - Database → DTO → API
    // ========================================================================
    await runStep(5, stepNames[4], async () => {
      // 5.1: Verify Fingerprint History API returns DTO
      // Playwright best practice: Set explicit timeout for API requests
      const historyResponse = await authenticatedPage.request.get(
        `${testState.baseURL}/api/business/${testState.businessId}/fingerprint/history`,
        { timeout: 30000 } // 30 seconds for database queries
      );
      if (!historyResponse.ok()) {
        throw new Error(`Fingerprint history API failed: ${historyResponse.status()}`);
      }
      const historyData = await historyResponse.json();
      testState.fingerprintHistory = historyData.history;

      // SPECIFICATION: API returns DTO format (not raw database format)
      if (!Array.isArray(historyData.history)) {
        throw new Error('Fingerprint history is not an array');
      }
      if (historyData.history.length > 0) {
        const firstItem = historyData.history[0];
        if (!firstItem.hasOwnProperty('visibilityScore')) {
          throw new Error('Fingerprint history DTO missing visibilityScore');
        }
        if (!firstItem.hasOwnProperty('date')) {
          throw new Error('Fingerprint history DTO missing date');
        }
        if (!firstItem.hasOwnProperty('mentionRate')) {
          throw new Error('Fingerprint history DTO missing mentionRate');
        }
      }

      // 5.2: Verify Wikidata Publish Data API returns DTO
      const publishResponse = await authenticatedPage.request.get(
        `${testState.baseURL}/api/wikidata/publish-data/${testState.businessId}`
      );
      if (!publishResponse.ok()) {
        throw new Error(`Wikidata publish data API failed: ${publishResponse.status()}`);
      }
      testState.publishData = await publishResponse.json();

      // SPECIFICATION: API returns DTO with notability check
      if (!testState.publishData.hasOwnProperty('businessId')) {
        throw new Error('Publish DTO missing businessId');
      }
      if (!testState.publishData.hasOwnProperty('entity')) {
        throw new Error('Publish DTO missing entity');
      }
      if (!testState.publishData.hasOwnProperty('notability')) {
        throw new Error('Publish DTO missing notability');
      }
      if (!testState.publishData.hasOwnProperty('canPublish')) {
        throw new Error('Publish DTO missing canPublish');
      }

      // 5.3: Verify Fingerprint API returns Competitive Leaderboard DTO
      const fingerprintResponse = await authenticatedPage.request.get(
        `${testState.baseURL}/api/fingerprint/business/${testState.businessId}`
      );
      if (!fingerprintResponse.ok()) {
        throw new Error(`Fingerprint API failed: ${fingerprintResponse.status()}`);
      }
      const fingerprintData = await fingerprintResponse.json();

      if (fingerprintData.competitiveLeaderboard) {
        testState.competitiveLeaderboard = fingerprintData.competitiveLeaderboard;
        // SPECIFICATION: Leaderboard DTO has correct structure
        if (!testState.competitiveLeaderboard.hasOwnProperty('targetBusiness')) {
          throw new Error('Leaderboard DTO missing targetBusiness');
        }
        if (!testState.competitiveLeaderboard.hasOwnProperty('competitors')) {
          throw new Error('Leaderboard DTO missing competitors');
        }
        if (!testState.competitiveLeaderboard.targetBusiness.hasOwnProperty('marketPosition')) {
          throw new Error('Leaderboard DTO targetBusiness missing marketPosition');
        }
      }

      testState.testResults!.dataflowVerified = true;
    });

    // ========================================================================
    // PHASE 6: FRONTEND DISPLAY - Component → Hook → SWR → API → DTO
    // ========================================================================
    await runStep(6, stepNames[5], async () => {
      // Navigate to business detail page
      await authenticatedPage.goto(`/dashboard/businesses/${testState.businessId}`);
      await authenticatedPage.waitForLoadState('networkidle');
      await authenticatedPage.waitForTimeout(2000); // Allow hooks to fetch data

      let componentsFound = 0;
      const requiredComponents = 3;

      // Component 1: Publishing Status Card
      // Playwright best practice: Use getByTestId for test IDs, fallback to text content
      const publishingCard = authenticatedPage.getByTestId('publishing-status-card').or(
        authenticatedPage.getByRole('heading', { name: /wikidata publishing/i })
      );
      
      await expect(publishingCard.first()).toBeVisible({ timeout: 15000 });
      componentsFound++;
      console.log('[PLATFORM TEST] ✓ Publishing Status Card visible');

      // Component 2: Visibility Metrics Card
      const visibilitySelectors = [
        '[data-testid="visibility-metrics-card"]',
        '[data-testid="llm-visibility"]',
        'text=LLM Visibility Metrics',
        'text=Visibility Score',
      ];
      
      let visibilityCard = null;
      for (const selector of visibilitySelectors) {
        const element = authenticatedPage.locator(selector).first();
        if (await element.count() > 0) {
          visibilityCard = element;
          break;
        }
      }
      
      if (visibilityCard) {
        await expect(visibilityCard).toBeVisible({ timeout: 10000 });
        componentsFound++;
        console.log('[PLATFORM TEST] ✓ Visibility Metrics Card visible');
      } else {
        throw new Error('Visibility Metrics Card not found');
      }

      // Component 3: Competitive Analysis Card
      const competitiveSelectors = [
        '[data-testid="competitive-analysis-card"]',
        '[data-testid="competitive-analysis"]',
        'text=Competitive Analysis',
        'text=Market Position',
      ];
      
      let competitiveCard = null;
      for (const selector of competitiveSelectors) {
        const element = authenticatedPage.locator(selector).first();
        if (await element.count() > 0) {
          competitiveCard = element;
          break;
        }
      }
      
      if (competitiveCard) {
        await expect(competitiveCard).toBeVisible({ timeout: 10000 });
        componentsFound++;
        console.log('[PLATFORM TEST] ✓ Competitive Analysis Card visible');
      } else {
        throw new Error('Competitive Analysis Card not found');
      }

      if (componentsFound < requiredComponents) {
        throw new Error(`Only ${componentsFound}/${requiredComponents} high-value components found`);
      }

      testState.testResults!.componentsDisplayData = true;
    });

    // ========================================================================
    // PHASE 7: DATA PERSISTENCE - Verify Data Survives Page Refresh
    // ========================================================================
    await runStep(7, stepNames[6], async () => {
      // Refresh page
      await authenticatedPage.reload();
      await authenticatedPage.waitForLoadState('networkidle');
      
      // Wait for React to hydrate and render (Playwright best practice: wait for specific content)
      // Wait for a known card heading to ensure page is fully loaded (avoid getByText strict mode violations)
      await Promise.race([
        authenticatedPage.getByRole('heading', { name: /wikidata publishing/i }).waitFor({ timeout: 15000 }),
        authenticatedPage.getByRole('heading', { name: /llm visibility/i }).waitFor({ timeout: 15000 }),
        authenticatedPage.getByRole('heading', { name: /competitive analysis/i }).waitFor({ timeout: 15000 }),
        authenticatedPage.locator('[data-slot="card-title"]').first().waitFor({ timeout: 15000 }),
      ]);
      
      await authenticatedPage.waitForTimeout(1000); // Allow hooks to fetch data

      // SPECIFICATION: Data persists after refresh (SWR cache + database)
      // Playwright best practice: Use specific role/selector to avoid strict mode violations
      const businessName = testState.databaseBusiness.name;
      // Target the card title specifically (most prominent display of business name)
      const nameElement = authenticatedPage.locator('[data-slot="card-title"]').filter({ hasText: businessName }).first();
      await expect(nameElement).toBeVisible({ timeout: 10000 });

      // Verify QID persists
      if (testState.databaseBusiness.wikidataQID) {
        const qidElement = authenticatedPage.getByText(testState.databaseBusiness.wikidataQID, { exact: false });
        if (await qidElement.count() === 0) {
          throw new Error(`QID ${testState.databaseBusiness.wikidataQID} not visible after refresh`);
        }
      }

      // Verify visibility score persists
      if (testState.databaseFingerprint?.visibilityScore) {
        const scoreText = testState.databaseFingerprint.visibilityScore.toString();
        const scoreElement = authenticatedPage.getByText(scoreText, { exact: false }).first();
        if (await scoreElement.count() === 0) {
          throw new Error(`Visibility score ${scoreText} not visible after refresh`);
        }
      }
    });

    // ========================================================================
    // PHASE 8: VALUE PROPOSITION VERIFICATION
    // ========================================================================
    await runStep(8, stepNames[7], async () => {
      // SPECIFICATION: All value proposition elements are present
      const valueChecks = {
        businessCreated: testState.testResults!.businessCreated,
        cfpExecuted: testState.testResults!.cfpExecuted,
        publishedToWikidata: testState.testResults!.publishedToWikidata,
        componentsDisplayData: testState.testResults!.componentsDisplayData,
        monthlyAutomationScheduled: testState.testResults!.monthlyAutomationScheduled,
        dataflowVerified: testState.testResults!.dataflowVerified,
      };

      const failedChecks = Object.entries(valueChecks)
        .filter(([_, value]) => !value)
        .map(([key, _]) => key);

      if (failedChecks.length > 0) {
        throw new Error(`Value proposition checks failed: ${failedChecks.join(', ')}`);
      }
    });

    // ========================================================================
    // FINAL REPORT: All Bugs Identified
    // ========================================================================
    console.log('\n\n[PLATFORM TEST] ========================================');
    console.log('[PLATFORM TEST] 📊 FULL REPORT: All Bugs Identified');
    console.log('[PLATFORM TEST] ========================================');
    
    // ========================================================================
    // COMPREHENSIVE ERROR REPORT: All errors encountered
    // ========================================================================
    const totalErrors = 
      allErrors.consoleErrors.length +
      allErrors.pageErrors.length +
      allErrors.networkErrors.length +
      allErrors.responseErrors.length;
    
    if (totalErrors > 0) {
      console.log(`\n[PLATFORM TEST] ========================================`);
      console.log(`[PLATFORM TEST] 🔍 ALL ERRORS ENCOUNTERED (${totalErrors} total)`);
      console.log(`[PLATFORM TEST] ========================================`);
      
      if (allErrors.consoleErrors.length > 0) {
        console.log(`\n[PLATFORM TEST] Browser Console Errors (${allErrors.consoleErrors.length}):`);
        allErrors.consoleErrors.forEach((err, idx) => {
          console.log(`[PLATFORM TEST]   ${idx + 1}. ${err.text.substring(0, 200)}`);
          if (err.location) {
            console.log(`[PLATFORM TEST]      Location: ${err.location}`);
          }
        });
      }
      
      if (allErrors.pageErrors.length > 0) {
        console.log(`\n[PLATFORM TEST] JavaScript Page Errors (${allErrors.pageErrors.length}):`);
        allErrors.pageErrors.forEach((err, idx) => {
          console.log(`[PLATFORM TEST]   ${idx + 1}. ${err.message}`);
          if (err.stack) {
            const stackLines = err.stack.split('\n').slice(0, 3);
            stackLines.forEach(line => {
              console.log(`[PLATFORM TEST]      ${line.trim()}`);
            });
          }
        });
      }
      
      if (allErrors.networkErrors.length > 0) {
        console.log(`\n[PLATFORM TEST] Network Failures (${allErrors.networkErrors.length}):`);
        allErrors.networkErrors.forEach((err, idx) => {
          console.log(`[PLATFORM TEST]   ${idx + 1}. ${err.method} ${err.url}`);
          console.log(`[PLATFORM TEST]      Error: ${err.error}`);
        });
      }
      
      if (allErrors.responseErrors.length > 0) {
        console.log(`\n[PLATFORM TEST] HTTP Response Errors (${allErrors.responseErrors.length}):`);
        allErrors.responseErrors.forEach((err, idx) => {
          console.log(`[PLATFORM TEST]   ${idx + 1}. ${err.status} ${err.statusText} - ${err.url}`);
        });
      }
      
      if (allErrors.consoleWarnings.length > 0) {
        console.log(`\n[PLATFORM TEST] Browser Console Warnings (${allErrors.consoleWarnings.length}):`);
        allErrors.consoleWarnings.slice(0, 20).forEach((warn, idx) => {
          console.log(`[PLATFORM TEST]   ${idx + 1}. ${warn.text.substring(0, 150)}`);
        });
        if (allErrors.consoleWarnings.length > 20) {
          console.log(`[PLATFORM TEST]   ... and ${allErrors.consoleWarnings.length - 20} more warnings`);
        }
      }
      
      console.log(`\n[PLATFORM TEST] ========================================`);
    } else {
      console.log(`\n[PLATFORM TEST] ✓ No browser errors captured`);
    }
    
    if (testState.errors && testState.errors.length > 0) {
      console.log(`\n[PLATFORM TEST] ❌ TOTAL FAILURES: ${testState.errors.length} out of ${stepNames.length} steps\n`);
      
      testState.errors.forEach((error, index) => {
        console.log(`[PLATFORM TEST] ${index + 1}. STEP ${error.step}: ${error.stepName}`);
        console.log(`[PLATFORM TEST]    Error: ${error.error}`);
        if (error.details) {
          console.log(`[PLATFORM TEST]    Details: ${JSON.stringify(error.details, null, 2)}`);
        }
        console.log('');
      });

      console.log('[PLATFORM TEST] ========================================');
      console.log('[PLATFORM TEST] 🔧 GREEN PHASE ACTION PLAN:');
      console.log('[PLATFORM TEST] ========================================');
      console.log('[PLATFORM TEST] Fix the following issues in order:');
      testState.errors.forEach((error, index) => {
        console.log(`[PLATFORM TEST] ${index + 1}. Fix Step ${error.step}: ${error.stepName}`);
        console.log(`[PLATFORM TEST]    → ${error.error}`);
      });
      console.log('\n[PLATFORM TEST] After fixing, run:');
      console.log('[PLATFORM TEST]   pnpm test:e2e:tdd:full tests/e2e/platform-value-proposition-dataflow-full-report.tdd.spec.ts');
      console.log('\n[PLATFORM TEST] 📊 HTML Report available at: http://localhost:9323');
      console.log('[PLATFORM TEST] ========================================\n');

      // Fail the test so Playwright reports it
      throw new Error(`Test completed with ${testState.errors.length} failures. See report above.`);
    } else {
      console.log('\n[PLATFORM TEST] ✅ ALL STEPS PASSED!');
      console.log('[PLATFORM TEST] Platform value proposition is fully delivered.');
      console.log('[PLATFORM TEST] ========================================\n');
    }
  });
});

