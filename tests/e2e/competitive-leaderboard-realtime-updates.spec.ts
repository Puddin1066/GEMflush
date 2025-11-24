/**
 * Competitive Leaderboard Real-time Updates E2E Test
 * 
 * Purpose: Verifies competitive leaderboard page updates automatically when CFP completes
 * 
 * Critical for Production: This test ensures the value proposition is delivered correctly
 * - Users can see competitive data without manual refresh
 * - UI reflects actual CFP flow state
 * - Percentage scores update correctly
 * 
 * Flow:
 * 1. Start CFP for business
 * 2. Visit competitive page (before CFP completes)
 * 3. Verify: Shows loading/processing state
 * 4. Wait for CFP to complete
 * 5. Verify: Leaderboard appears automatically (within polling interval)
 * 6. Verify: All percentage scores display correctly
 */

import { test, expect } from './fixtures/authenticated-user';
import {
  createBusiness,
  waitForBusinessStatus,
  triggerCFPProcessing,
} from './helpers/business-helpers';
import type { Page } from '@playwright/test';

test.describe('Competitive Leaderboard Real-time Updates', () => {
  test.setTimeout(300_000); // 5 minutes for CFP + polling

  test('competitive leaderboard updates automatically when CFP completes', async ({
    authenticatedPage,
  }) => {
    const baseURL = authenticatedPage.url().split('/dashboard')[0];
    
    // Step 1: Create business and start CFP
    await test.step('Step 1: Create business and start CFP', async () => {
      console.log('[REALTIME TEST] ========================================');
      console.log('[REALTIME TEST] STEP 1: Create business and start CFP');
      console.log('[REALTIME TEST] ========================================');

      const business = await createBusiness(authenticatedPage, {
        name: `Realtime Test ${Date.now()}`,
        url: 'https://example.com',
      });

      expect(business.id).toBeDefined();
      console.log(`[REALTIME TEST] ✓ Business created: ${business.id}`);

      // Trigger CFP processing
      await triggerCFPProcessing(authenticatedPage, business.id);
      console.log(`[REALTIME TEST] ✓ CFP processing started for business ${business.id}`);

      // Store business ID for later steps
      (authenticatedPage as any).__testBusinessId = business.id;
    });

    const businessId = (authenticatedPage as any).__testBusinessId;
    if (!businessId) {
      test.skip();
      return;
    }

    // Step 2: Visit competitive page before CFP completes
    await test.step('Step 2: Visit competitive page (before CFP completes)', async () => {
      console.log('[REALTIME TEST] ========================================');
      console.log('[REALTIME TEST] STEP 2: Visit competitive page');
      console.log('[REALTIME TEST] ========================================');

      await authenticatedPage.goto(
        `${baseURL}/dashboard/businesses/${businessId}/competitive`
      );
      await authenticatedPage.waitForLoadState('networkidle');

      // Should show loading or "No Competitive Data Yet" with processing message
      const loadingIndicator = authenticatedPage.locator('text=/Generating competitive analysis|Loading competitive data/i');
      const noDataMessage = authenticatedPage.locator('text=No Competitive Data Yet');
      
      const hasLoading = await loadingIndicator.isVisible().catch(() => false);
      const hasNoData = await noDataMessage.isVisible().catch(() => false);

      expect(hasLoading || hasNoData).toBe(true);
      console.log('[REALTIME TEST] ✓ Page loaded, showing loading/no data state');
      
      // Verify processing message if shown
      if (hasNoData) {
        const processingMessage = authenticatedPage.locator('text=/being generated|will update automatically/i');
        const hasProcessingMessage = await processingMessage.isVisible().catch(() => false);
        if (hasProcessingMessage) {
          console.log('[REALTIME TEST] ✓ Processing message displayed');
        }
      }
    });

    // Step 3: Wait for CFP to complete
    await test.step('Step 3: Wait for CFP to complete', async () => {
      console.log('[REALTIME TEST] ========================================');
      console.log('[REALTIME TEST] STEP 3: Wait for CFP to complete');
      console.log('[REALTIME TEST] ========================================');

      // Wait for business status to reach 'crawled' or 'published'
      const finalStatus = await waitForBusinessStatus(
        authenticatedPage,
        businessId,
        ['crawled', 'published'],
        120_000 // 2 minutes timeout
      );

      expect(['crawled', 'published']).toContain(finalStatus);
      console.log(`[REALTIME TEST] ✓ CFP completed, business status: ${finalStatus}`);
    });

    // Step 4: Verify leaderboard appears automatically (polling should update within 5-10 seconds)
    await test.step('Step 4: Verify leaderboard appears automatically', async () => {
      console.log('[REALTIME TEST] ========================================');
      console.log('[REALTIME TEST] STEP 4: Verify automatic update');
      console.log('[REALTIME TEST] ========================================');

      // Wait for leaderboard to appear (polling happens every 5 seconds)
      // Give it up to 15 seconds (3 polling cycles)
      const leaderboardTitle = authenticatedPage.locator('text=Competitive Leaderboard');
      
      let leaderboardVisible = false;
      const startTime = Date.now();
      const timeout = 15_000; // 15 seconds

      while (Date.now() - startTime < timeout) {
        leaderboardVisible = await leaderboardTitle.isVisible().catch(() => false);
        if (leaderboardVisible) {
          break;
        }
        await authenticatedPage.waitForTimeout(1000); // Check every second
      }

      expect(leaderboardVisible).toBe(true);
      console.log('[REALTIME TEST] ✓ Leaderboard appeared automatically (no manual refresh needed)');
    });

    // Step 5: Verify percentage scores display correctly
    await test.step('Step 5: Verify percentage scores display correctly', async () => {
      console.log('[REALTIME TEST] ========================================');
      console.log('[REALTIME TEST] STEP 5: Verify percentage scores');
      console.log('[REALTIME TEST] ========================================');

      // Check for market share percentages
      const marketShareElements = authenticatedPage.locator('text=/\\d+%/i');
      const marketShareCount = await marketShareElements.count();
      
      expect(marketShareCount).toBeGreaterThan(0);
      console.log(`[REALTIME TEST] ✓ Found ${marketShareCount} market share percentage(s)`);

      // Verify percentages are valid (0-100%)
      for (let i = 0; i < Math.min(marketShareCount, 5); i++) {
        const text = await marketShareElements.nth(i).textContent();
        const percentage = text ? parseFloat(text.replace('%', '')) : null;
        
        if (percentage !== null) {
          expect(percentage).toBeGreaterThanOrEqual(0);
          expect(percentage).toBeLessThanOrEqual(100);
          console.log(`[REALTIME TEST] ✓ Percentage ${i + 1}: ${percentage}% (valid)`);
        }
      }
    });

    // Step 6: Verify competitor rankings display
    await test.step('Step 6: Verify competitor rankings display', async () => {
      console.log('[REALTIME TEST] ========================================');
      console.log('[REALTIME TEST] STEP 6: Verify competitor rankings');
      console.log('[REALTIME TEST] ========================================');

      // Check for rank indicators (could be numbers, badges, etc.)
      const rankElements = authenticatedPage.locator('text=/Rank|#\\d+|\\d+\\./i');
      const rankCount = await rankElements.count();
      
      // Should have at least some ranking information
      if (rankCount > 0) {
        console.log(`[REALTIME TEST] ✓ Found ${rankCount} rank indicator(s)`);
      } else {
        // Check for competitor rows instead
        const competitorRows = authenticatedPage.locator('[data-testid="competitor-row"], .competitor-row, tr').filter({ hasText: /%/ });
        const competitorCount = await competitorRows.count();
        expect(competitorCount).toBeGreaterThan(0);
        console.log(`[REALTIME TEST] ✓ Found ${competitorCount} competitor row(s)`);
      }
    });

    console.log('[REALTIME TEST] ========================================');
    console.log('[REALTIME TEST] ✓ ALL STEPS PASSED');
    console.log('[REALTIME TEST] ========================================');
  });

  test('competitive leaderboard shows correct data when CFP already completed', async ({
    authenticatedPage,
  }) => {
    const baseURL = authenticatedPage.url().split('/dashboard')[0];
    
    // Create business and wait for CFP to complete
    const business = await createBusiness(authenticatedPage, {
      name: `Completed CFP Test ${Date.now()}`,
      url: 'https://example.com',
    });

    await triggerCFPProcessing(authenticatedPage, business.id);
    
    // Wait for completion
    await waitForBusinessStatus(
      authenticatedPage,
      business.id,
      ['crawled', 'published'],
      120_000
    );

    // Now visit competitive page
    await authenticatedPage.goto(
      `${baseURL}/dashboard/businesses/${business.id}/competitive`
    );
    await authenticatedPage.waitForLoadState('networkidle');

    // Should show leaderboard immediately (no loading state)
    const leaderboardTitle = authenticatedPage.locator('text=Competitive Leaderboard');
    const leaderboardVisible = await leaderboardTitle.isVisible({ timeout: 5000 }).catch(() => false);
    
    expect(leaderboardVisible).toBe(true);
    console.log('[REALTIME TEST] ✓ Leaderboard displayed immediately for completed CFP');
  });
});


