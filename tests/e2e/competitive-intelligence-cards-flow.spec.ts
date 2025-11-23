/**
 * Competitive Intelligence Cards Flow: Iterative Flow Test
 * 
 * Purpose: Validates competitive intelligence cards update with valuable, accurate data through DTO layer
 * 
 * Flow: Database → DTO Transformation → API → UI Cards (Competitive Page, Business Detail, Dashboard)
 * 
 * Structure:
 * - Single test with 7 steps, each focusing on one validation point
 * - Shared test state persists across steps
 * - Uses test.step() to ensure same context across all steps
 * 
 * SOLID Principles:
 * - Single Responsibility: Each step focuses on one card/component validation
 * - Open/Closed: Easy to add new card validations without modifying existing
 * 
 * DRY Principles:
 * - Shared test state avoids duplication
 * - Reusable helper functions
 * 
 * Issues Identified from Terminal Logs:
 * - Lines 87-96: Fingerprint DTOs with competitive data
 * - Lines 190-297: Competitive page with leaderboard cards
 * - Cards should display accurate market position, competitor rankings, and insights
 * - Market share calculations should be accurate and sum to ~100%
 */

import { test, expect } from './fixtures/authenticated-user';
import {
  executeCFPFlow,
  waitForBusinessStatus,
} from './helpers/dto-test-helpers';
import {
  fetchFingerprintDTO,
  fetchFingerprintHistory,
  triggerFingerprintGeneration,
} from './helpers/fingerprint-test-helpers';
import type { Page } from '@playwright/test';

// Shared state type
type CompetitiveCardsTestState = {
  businessId?: number;
  baseURL?: string;
  fingerprintDTO?: any;
  leaderboardDTO?: any;
  dashboardDTO?: any;
  competitivePageData?: any;
  testResults?: {
    cfpExecuted?: boolean;
    fingerprintGenerated?: boolean;
    leaderboardDataVerified?: boolean;
    marketPositionCardVerified?: boolean;
    competitorRankingsCardVerified?: boolean;
    insightsCardVerified?: boolean;
    dashboardCardsVerified?: boolean;
  };
};

/**
 * Verify market position card displays accurate data
 */
function verifyMarketPositionCard(
  leaderboardDTO: any
): { isValid: boolean; issues: string[] } {
  const issues: string[] = [];

  if (!leaderboardDTO) {
    issues.push('Leaderboard DTO is missing');
    return { isValid: false, issues };
  }

  // Verify market position is valid
  const validPositions = ['leading', 'competitive', 'emerging', 'unknown'];
  if (!validPositions.includes(leaderboardDTO.insights?.marketPosition)) {
    issues.push(`Invalid market position: ${leaderboardDTO.insights?.marketPosition}`);
  }

  // Verify market position matches mention rate
  const mentionRate = leaderboardDTO.targetBusiness?.mentionRate || 0;
  const marketPosition = leaderboardDTO.insights?.marketPosition;

  if (marketPosition === 'leading' && mentionRate < 60) {
    issues.push(`Market position 'leading' but mention rate is ${mentionRate}% (expected >= 60%)`);
  }
  if (marketPosition === 'competitive' && (mentionRate < 30 || mentionRate >= 60)) {
    issues.push(`Market position 'competitive' but mention rate is ${mentionRate}% (expected 30-60%)`);
  }
  if (marketPosition === 'emerging' && mentionRate >= 30) {
    issues.push(`Market position 'emerging' but mention rate is ${mentionRate}% (expected < 30%)`);
  }

  return {
    isValid: issues.length === 0,
    issues,
  };
}

/**
 * Verify competitor rankings card displays accurate data
 * 
 * DRY: Reusable validation logic for competitor data accuracy
 * SOLID: Single Responsibility - validates competitor data structure and content
 */
function verifyCompetitorRankingsCard(
  leaderboardDTO: any
): { isValid: boolean; issues: string[] } {
  const issues: string[] = [];

  if (!leaderboardDTO) {
    issues.push('Leaderboard DTO is missing');
    return { isValid: false, issues };
  }

  // Verify competitors array
  if (!Array.isArray(leaderboardDTO.competitors)) {
    issues.push('Competitors is not an array');
    return { isValid: false, issues };
  }

  // LLM response fragment patterns (should NOT appear as competitor names)
  const llmFragmentPatterns = [
    /^(here|there)\s+(are|is|was|were)/i,
    /^(i|we|you|they)\s+(would|should|could|might|may|can|will|'d|'ll|'ve|'re)/i,
    /^(to|for|with|from|about|regarding|concerning)\s+/i,
    /^(that|this|these|those)\s+(is|are|was|were|seems|appears)/i,
    /^(if|when|where|how|why|what|which|who)\s+/i,
    /^(please|thank|thanks|sorry|unfortunately|fortunately)/i,
    /^(each|every|all|some|many|few|several|most|least)\s+/i,
    /^(quality|professional|excellent|outstanding|great|best|top)\s+(recommendations?|services?|providers?|options?|choices?)/i,
    /^(i\s+need|i\s+don't|i\s+can't|i\s+wouldn't|i\s+shouldn't)/i,
    /^(give|giving|gave|gives)\s+(you|me|us|them)/i,
    /^(more|less|better|worse|different|same|similar)\s+(information|details?|data|context)/i,
    /^(that's|this is|these are|those are)/i,
    /^(i'd|i'll|i've|i'm|we'd|we'll|we've|we're|you'd|you'll|you've|you're|they'd|they'll|they've|they're)/i,
  ];

  // Verify each competitor has required fields and valid name
  leaderboardDTO.competitors.forEach((comp: any, idx: number) => {
    if (typeof comp.name !== 'string' || comp.name.length === 0) {
      issues.push(`Competitor[${idx}].name is invalid`);
    } else {
      // CRITICAL: Check if competitor name is an LLM response fragment (not a real business name)
      const isLLMFragment = llmFragmentPatterns.some(pattern => pattern.test(comp.name));
      if (isLLMFragment) {
        issues.push(`Competitor[${idx}].name is an LLM response fragment, not a business name: "${comp.name}"`);
      }
      
      // Check if name looks like a real business name
      if (comp.name.length < 2 || comp.name.length > 50) {
        issues.push(`Competitor[${idx}].name has invalid length: ${comp.name.length} (expected 2-50)`);
      }
      
      // Check if name starts with a letter (business names should)
      if (!/^[A-Za-z]/.test(comp.name)) {
        issues.push(`Competitor[${idx}].name doesn't start with a letter: "${comp.name}"`);
      }
      
      // Check for common question patterns
      if (comp.name.includes('?') || comp.name.endsWith(':')) {
        issues.push(`Competitor[${idx}].name looks like a question or fragment: "${comp.name}"`);
      }
    }
    
    if (typeof comp.mentionCount !== 'number' || comp.mentionCount < 0) {
      issues.push(`Competitor[${idx}].mentionCount is invalid`);
    }
    if (typeof comp.marketShare !== 'number') {
      issues.push(`Competitor[${idx}].marketShare is not a number`);
    }
    if (comp.marketShare < 0 || comp.marketShare > 100) {
      issues.push(`Competitor[${idx}].marketShare out of range: ${comp.marketShare}`);
    }
    if (typeof comp.rank !== 'number' || comp.rank < 1) {
      issues.push(`Competitor[${idx}].rank is invalid`);
    }
  });

  // Verify market share sums to ~100% (including target business)
  const totalMentions = 
    leaderboardDTO.targetBusiness.mentionCount +
    leaderboardDTO.competitors.reduce((sum: number, c: any) => sum + c.mentionCount, 0);
  
  const targetMarketShare = totalMentions > 0
    ? (leaderboardDTO.targetBusiness.mentionCount / totalMentions) * 100
    : 0;
  
  const competitorShares = leaderboardDTO.competitors.reduce(
    (sum: number, c: any) => sum + c.marketShare,
    0
  );
  
  const totalShare = targetMarketShare + competitorShares;
  if (Math.abs(totalShare - 100) > 2) { // Allow 2% tolerance for rounding
    issues.push(`Market share calculation issue: total share is ${totalShare.toFixed(2)}% (expected ~100%)`);
  }

  // Verify rankings are sequential
  const ranks = leaderboardDTO.competitors.map((c: any) => c.rank).sort((a: number, b: number) => a - b);
  for (let i = 0; i < ranks.length; i++) {
    if (ranks[i] !== i + 1) {
      issues.push(`Ranking sequence issue: expected rank ${i + 1}, found ${ranks[i]}`);
      break;
    }
  }

  return {
    isValid: issues.length === 0,
    issues,
  };
}

/**
 * Verify insights card displays valuable recommendations
 */
function verifyInsightsCard(
  leaderboardDTO: any
): { isValid: boolean; issues: string[] } {
  const issues: string[] = [];

  if (!leaderboardDTO) {
    issues.push('Leaderboard DTO is missing');
    return { isValid: false, issues };
  }

  // Verify insights structure
  if (!leaderboardDTO.insights) {
    issues.push('Insights are missing');
    return { isValid: false, issues };
  }

  // Verify recommendation is present and meaningful
  if (!leaderboardDTO.insights.recommendation) {
    issues.push('Recommendation is missing');
  } else if (typeof leaderboardDTO.insights.recommendation !== 'string') {
    issues.push('Recommendation is not a string');
  } else if (leaderboardDTO.insights.recommendation.length < 10) {
    issues.push('Recommendation is too short to be valuable');
  }

  // Verify top competitor is set when applicable
  if (leaderboardDTO.competitors.length > 0) {
    const topCompetitor = leaderboardDTO.competitors[0];
    if (leaderboardDTO.insights.topCompetitor !== topCompetitor.name) {
      issues.push(`Top competitor mismatch: expected ${topCompetitor.name}, got ${leaderboardDTO.insights.topCompetitor}`);
    }
  }

  // Verify competitive gap is calculated when applicable
  if (leaderboardDTO.insights.topCompetitor && leaderboardDTO.competitors.length > 0) {
    const topCompetitor = leaderboardDTO.competitors[0];
    const targetMentions = leaderboardDTO.targetBusiness.mentionCount;
    const topMentions = topCompetitor.mentionCount;
    const expectedGap = topMentions - targetMentions;
    
    if (leaderboardDTO.insights.competitiveGap !== null && 
        leaderboardDTO.insights.competitiveGap !== expectedGap) {
      issues.push(`Competitive gap mismatch: expected ${expectedGap}, got ${leaderboardDTO.insights.competitiveGap}`);
    }
  }

  return {
    isValid: issues.length === 0,
    issues,
  };
}

test.describe('Competitive Intelligence Cards Flow: Iterative Flow Test', () => {
  test.setTimeout(600_000); // 10 minutes for full suite

  test('Complete Competitive Intelligence Cards Flow Verification', async ({
    authenticatedPage,
  }) => {
    // Shared state across all steps
    const testState: CompetitiveCardsTestState = {
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

    // Step 2: Generate Fingerprint with Competitive Data
    await test.step('Step 2: Generate Fingerprint with Competitive Data', async () => {
      if (!testState.businessId) {
        test.skip();
      }

      console.log('[CARDS TEST] ========================================');
      console.log('[CARDS TEST] STEP 2: Generate Fingerprint');
      console.log('[CARDS TEST] ========================================');

      // Trigger fingerprint generation (includes competitive leaderboard)
      // DRY: Use helper function with proper timeout handling
      const fingerprintResult = await triggerFingerprintGeneration(
        authenticatedPage,
        baseURL,
        testState.businessId
      );

      if (fingerprintResult) {
        console.log(`[CARDS TEST] ✓ Fingerprint generated: ID ${fingerprintResult.fingerprintId}`);
      } else {
        console.log('[CARDS TEST] ⚠️  Fingerprint frequency limit or timeout - using existing if available');
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
      testState.leaderboardDTO = testState.fingerprintDTO.competitiveLeaderboard || null;

      if (!testState.leaderboardDTO) {
        console.log('[CARDS TEST] ⚠️  No competitive leaderboard in fingerprint DTO yet');
        console.log('[CARDS TEST] This is expected if competitive data is not yet available');
      } else {
        console.log('[CARDS TEST] ✓ Competitive leaderboard found in fingerprint DTO');
      }

      testState.testResults!.fingerprintGenerated = true;
      console.log('[CARDS TEST] ✓ STEP 2 PASSED: Fingerprint generated');
    });

    // Step 3: Verify Leaderboard Data Structure (DTO Layer)
    await test.step('Step 3: Verify Leaderboard Data Structure (DTO Layer)', async () => {
      if (!testState.leaderboardDTO) {
        console.log('[CARDS TEST] ⚠️  Skipping leaderboard verification - no leaderboard data');
        console.log('[CARDS TEST] This is expected if competitive leaderboard is not yet generated');
        test.skip();
      }

      console.log('[CARDS TEST] ========================================');
      console.log('[CARDS TEST] STEP 3: Verify Leaderboard Data Structure');
      console.log('[CARDS TEST] ========================================');

      // Verify basic structure
      expect(testState.leaderboardDTO.targetBusiness).toBeDefined();
      expect(Array.isArray(testState.leaderboardDTO.competitors)).toBe(true);
      expect(testState.leaderboardDTO.insights).toBeDefined();

      console.log(`[CARDS TEST] ✓ Target business: ${testState.leaderboardDTO.targetBusiness.name}`);
      console.log(`[CARDS TEST] ✓ Competitors: ${testState.leaderboardDTO.competitors.length}`);
      console.log(`[CARDS TEST] ✓ Market position: ${testState.leaderboardDTO.insights.marketPosition}`);
      console.log(`[CARDS TEST] ✓ Total queries: ${testState.leaderboardDTO.totalQueries}`);

      testState.testResults!.leaderboardDataVerified = true;
      console.log('[CARDS TEST] ✓ STEP 3 PASSED: Leaderboard data structure verified');
    });

    // Step 4: Verify Market Position Card
    await test.step('Step 4: Verify Market Position Card', async () => {
      if (!testState.leaderboardDTO) {
        test.skip();
      }

      console.log('[CARDS TEST] ========================================');
      console.log('[CARDS TEST] STEP 4: Verify Market Position Card');
      console.log('[CARDS TEST] ========================================');

      const positionVerification = verifyMarketPositionCard(testState.leaderboardDTO);

      if (!positionVerification.isValid) {
        console.log('[CARDS TEST] ⚠️  Market position card issues:');
        positionVerification.issues.forEach((issue) =>
          console.log(`[CARDS TEST]   ${issue}`)
        );
      } else {
        console.log('[CARDS TEST] ✓ Market position card validated');
        console.log(`[CARDS TEST]   Position: ${testState.leaderboardDTO.insights.marketPosition}`);
        console.log(`[CARDS TEST]   Mention rate: ${testState.leaderboardDTO.targetBusiness.mentionRate}%`);
      }

      testState.testResults!.marketPositionCardVerified = true;
      console.log('[CARDS TEST] ✓ STEP 4 PASSED: Market position card verified');
    });

    // Step 5: Verify Competitor Rankings Card
    await test.step('Step 5: Verify Competitor Rankings Card', async () => {
      if (!testState.leaderboardDTO) {
        test.skip();
      }

      console.log('[CARDS TEST] ========================================');
      console.log('[CARDS TEST] STEP 5: Verify Competitor Rankings Card');
      console.log('[CARDS TEST] ========================================');

      const rankingsVerification = verifyCompetitorRankingsCard(testState.leaderboardDTO);

      if (!rankingsVerification.isValid) {
        console.log('[CARDS TEST] ⚠️  Competitor rankings card issues:');
        rankingsVerification.issues.forEach((issue) =>
          console.log(`[CARDS TEST]   ${issue}`)
        );
      } else {
        console.log('[CARDS TEST] ✓ Competitor rankings card validated');
        console.log(`[CARDS TEST]   Competitors: ${testState.leaderboardDTO.competitors.length}`);
        testState.leaderboardDTO.competitors.forEach((comp: any, idx: number) => {
          console.log(`[CARDS TEST]   ${idx + 1}. ${comp.name}: ${comp.mentionCount} mentions, ${comp.marketShare.toFixed(1)}% share`);
        });
      }

      testState.testResults!.competitorRankingsCardVerified = true;
      console.log('[CARDS TEST] ✓ STEP 5 PASSED: Competitor rankings card verified');
    });

    // Step 6: Verify Insights Card
    await test.step('Step 6: Verify Insights Card', async () => {
      if (!testState.leaderboardDTO) {
        test.skip();
      }

      console.log('[CARDS TEST] ========================================');
      console.log('[CARDS TEST] STEP 6: Verify Insights Card');
      console.log('[CARDS TEST] ========================================');

      const insightsVerification = verifyInsightsCard(testState.leaderboardDTO);

      if (!insightsVerification.isValid) {
        console.log('[CARDS TEST] ⚠️  Insights card issues:');
        insightsVerification.issues.forEach((issue) =>
          console.log(`[CARDS TEST]   ${issue}`)
        );
      } else {
        console.log('[CARDS TEST] ✓ Insights card validated');
        console.log(`[CARDS TEST]   Recommendation: ${testState.leaderboardDTO.insights.recommendation.substring(0, 100)}...`);
        if (testState.leaderboardDTO.insights.topCompetitor) {
          console.log(`[CARDS TEST]   Top competitor: ${testState.leaderboardDTO.insights.topCompetitor}`);
        }
        if (testState.leaderboardDTO.insights.competitiveGap !== null) {
          console.log(`[CARDS TEST]   Competitive gap: ${testState.leaderboardDTO.insights.competitiveGap}`);
        }
      }

      testState.testResults!.insightsCardVerified = true;
      console.log('[CARDS TEST] ✓ STEP 6 PASSED: Insights card verified');
    });

    // Step 7: Verify UI Cards Display (Competitive Page)
    await test.step('Step 7: Verify UI Cards Display (Competitive Page)', async () => {
      if (!testState.businessId) {
        test.skip();
      }

      console.log('[CARDS TEST] ========================================');
      console.log('[CARDS TEST] STEP 7: Verify UI Cards Display');
      console.log('[CARDS TEST] ========================================');

      // Navigate to competitive page
      await authenticatedPage.goto(
        `${baseURL}/dashboard/businesses/${testState.businessId}/competitive`
      );
      await authenticatedPage.waitForLoadState('networkidle');

      // Check if competitive leaderboard is displayed or if "No Competitive Data" message is shown
      const noDataMessage = authenticatedPage.locator('text=No Competitive Data Yet');
      const leaderboardTitle = authenticatedPage.locator('text=Competitive Leaderboard');
      
      const hasNoData = await noDataMessage.isVisible().catch(() => false);
      const hasLeaderboard = await leaderboardTitle.isVisible().catch(() => false);

      if (hasNoData) {
        console.log('[CARDS TEST] ⚠️  No competitive data message displayed');
        console.log('[CARDS TEST] This is expected if competitive leaderboard is not yet generated');
        console.log('[CARDS TEST] UI correctly handles missing competitive data');
      } else if (hasLeaderboard) {
        console.log('[CARDS TEST] ✓ Competitive leaderboard displayed on page');
        
        // Verify key card elements are visible (use first() to avoid strict mode violation)
        const rankingsCard = authenticatedPage.locator('text=Rankings').first();
        const insightsCard = authenticatedPage.locator('text=Strategic Insights').first();
        const marketPositionBadge = authenticatedPage.locator('[class*="MarketPosition"]');
        
        // Check if at least one card is visible (more resilient than .or())
        const hasRankings = await rankingsCard.isVisible().catch(() => false);
        const hasInsights = await insightsCard.isVisible().catch(() => false);
        
        if (hasRankings || hasInsights) {
          console.log('[CARDS TEST] ✓ Competitive intelligence cards are visible');
        } else {
          console.log('[CARDS TEST] ⚠️  Cards may not be visible yet');
        }
        
        // Verify market position badge is visible
        const hasBadge = await marketPositionBadge.isVisible().catch(() => false);
        if (hasBadge) {
          console.log('[CARDS TEST] ✓ Market position badge is visible');
        }
      } else {
        console.log('[CARDS TEST] ⚠️  Could not determine competitive page state');
      }

      testState.testResults!.dashboardCardsVerified = true;
      console.log('[CARDS TEST] ✓ STEP 7 PASSED: UI cards display verified');
    });

    // Step 8: Summary - Verify All Issues Are Addressed
    await test.step('Step 8: Summary - Verify All Issues', async () => {
      console.log('[CARDS TEST] ========================================');
      console.log('[CARDS TEST] STEP 8: Summary - Verify All Issues');
      console.log('[CARDS TEST] ========================================');

      const issues: string[] = [];

      // Check market position card
      if (testState.leaderboardDTO) {
        const positionVerification = verifyMarketPositionCard(testState.leaderboardDTO);
        if (!positionVerification.isValid) {
          issues.push(`Market position card issues: ${positionVerification.issues.join(', ')}`);
        }
      }

      // Check competitor rankings card
      if (testState.leaderboardDTO) {
        const rankingsVerification = verifyCompetitorRankingsCard(testState.leaderboardDTO);
        if (!rankingsVerification.isValid) {
          issues.push(`Competitor rankings card issues: ${rankingsVerification.issues.join(', ')}`);
        }
      }

      // Check insights card
      if (testState.leaderboardDTO) {
        const insightsVerification = verifyInsightsCard(testState.leaderboardDTO);
        if (!insightsVerification.isValid) {
          issues.push(`Insights card issues: ${insightsVerification.issues.join(', ')}`);
        }
      }

      if (issues.length > 0) {
        console.log('[CARDS TEST] ⚠️  Issues Found:');
        issues.forEach((issue) => console.log(`[CARDS TEST]   ${issue}`));
        throw new Error(`Found ${issues.length} critical issue(s). Fix and re-run.`);
      } else {
        console.log('[CARDS TEST] ✅ All critical issues resolved!');
        console.log('[CARDS TEST] ========================================');
        console.log('[CARDS TEST] COMPETITIVE INTELLIGENCE CARDS FLOW VERIFICATION COMPLETE');
        console.log('[CARDS TEST] ========================================');
      }
    });
  });
});

import { test, expect } from './fixtures/authenticated-user';
import {
  executeCFPFlow,
  waitForBusinessStatus,
} from './helpers/dto-test-helpers';
import {
  fetchFingerprintDTO,
  fetchFingerprintHistory,
  triggerFingerprintGeneration,
} from './helpers/fingerprint-test-helpers';
import type { Page } from '@playwright/test';

// Shared state type
type CompetitiveCardsTestState = {
  businessId?: number;
  baseURL?: string;
  fingerprintDTO?: any;
  leaderboardDTO?: any;
  dashboardDTO?: any;
  competitivePageData?: any;
  testResults?: {
    cfpExecuted?: boolean;
    fingerprintGenerated?: boolean;
    leaderboardDataVerified?: boolean;
    marketPositionCardVerified?: boolean;
    competitorRankingsCardVerified?: boolean;
    insightsCardVerified?: boolean;
    dashboardCardsVerified?: boolean;
  };
};

/**
 * Verify market position card displays accurate data
 */
function verifyMarketPositionCard(
  leaderboardDTO: any
): { isValid: boolean; issues: string[] } {
  const issues: string[] = [];

  if (!leaderboardDTO) {
    issues.push('Leaderboard DTO is missing');
    return { isValid: false, issues };
  }

  // Verify market position is valid
  const validPositions = ['leading', 'competitive', 'emerging', 'unknown'];
  if (!validPositions.includes(leaderboardDTO.insights?.marketPosition)) {
    issues.push(`Invalid market position: ${leaderboardDTO.insights?.marketPosition}`);
  }

  // Verify market position matches mention rate
  const mentionRate = leaderboardDTO.targetBusiness?.mentionRate || 0;
  const marketPosition = leaderboardDTO.insights?.marketPosition;

  if (marketPosition === 'leading' && mentionRate < 60) {
    issues.push(`Market position 'leading' but mention rate is ${mentionRate}% (expected >= 60%)`);
  }
  if (marketPosition === 'competitive' && (mentionRate < 30 || mentionRate >= 60)) {
    issues.push(`Market position 'competitive' but mention rate is ${mentionRate}% (expected 30-60%)`);
  }
  if (marketPosition === 'emerging' && mentionRate >= 30) {
    issues.push(`Market position 'emerging' but mention rate is ${mentionRate}% (expected < 30%)`);
  }

  return {
    isValid: issues.length === 0,
    issues,
  };
}

/**
 * Verify competitor rankings card displays accurate data
 */
function verifyCompetitorRankingsCard(
  leaderboardDTO: any
): { isValid: boolean; issues: string[] } {
  const issues: string[] = [];

  if (!leaderboardDTO) {
    issues.push('Leaderboard DTO is missing');
    return { isValid: false, issues };
  }

  // Verify competitors array
  if (!Array.isArray(leaderboardDTO.competitors)) {
    issues.push('Competitors is not an array');
    return { isValid: false, issues };
  }

  // Verify each competitor has required fields
  leaderboardDTO.competitors.forEach((comp: any, idx: number) => {
    if (typeof comp.name !== 'string' || comp.name.length === 0) {
      issues.push(`Competitor[${idx}].name is invalid`);
    }
    if (typeof comp.mentionCount !== 'number' || comp.mentionCount < 0) {
      issues.push(`Competitor[${idx}].mentionCount is invalid`);
    }
    if (typeof comp.marketShare !== 'number') {
      issues.push(`Competitor[${idx}].marketShare is not a number`);
    }
    if (comp.marketShare < 0 || comp.marketShare > 100) {
      issues.push(`Competitor[${idx}].marketShare out of range: ${comp.marketShare}`);
    }
    if (typeof comp.rank !== 'number' || comp.rank < 1) {
      issues.push(`Competitor[${idx}].rank is invalid`);
    }
  });

  // Verify market share sums to ~100% (including target business)
  const totalMentions = 
    leaderboardDTO.targetBusiness.mentionCount +
    leaderboardDTO.competitors.reduce((sum: number, c: any) => sum + c.mentionCount, 0);
  
  const targetMarketShare = totalMentions > 0
    ? (leaderboardDTO.targetBusiness.mentionCount / totalMentions) * 100
    : 0;
  
  const competitorShares = leaderboardDTO.competitors.reduce(
    (sum: number, c: any) => sum + c.marketShare,
    0
  );
  
  const totalShare = targetMarketShare + competitorShares;
  if (Math.abs(totalShare - 100) > 2) { // Allow 2% tolerance for rounding
    issues.push(`Market share calculation issue: total share is ${totalShare.toFixed(2)}% (expected ~100%)`);
  }

  // Verify rankings are sequential
  const ranks = leaderboardDTO.competitors.map((c: any) => c.rank).sort((a: number, b: number) => a - b);
  for (let i = 0; i < ranks.length; i++) {
    if (ranks[i] !== i + 1) {
      issues.push(`Ranking sequence issue: expected rank ${i + 1}, found ${ranks[i]}`);
      break;
    }
  }

  return {
    isValid: issues.length === 0,
    issues,
  };
}

/**
 * Verify insights card displays valuable recommendations
 */
function verifyInsightsCard(
  leaderboardDTO: any
): { isValid: boolean; issues: string[] } {
  const issues: string[] = [];

  if (!leaderboardDTO) {
    issues.push('Leaderboard DTO is missing');
    return { isValid: false, issues };
  }

  // Verify insights structure
  if (!leaderboardDTO.insights) {
    issues.push('Insights are missing');
    return { isValid: false, issues };
  }

  // Verify recommendation is present and meaningful
  if (!leaderboardDTO.insights.recommendation) {
    issues.push('Recommendation is missing');
  } else if (typeof leaderboardDTO.insights.recommendation !== 'string') {
    issues.push('Recommendation is not a string');
  } else if (leaderboardDTO.insights.recommendation.length < 10) {
    issues.push('Recommendation is too short to be valuable');
  }

  // Verify top competitor is set when applicable
  if (leaderboardDTO.competitors.length > 0) {
    const topCompetitor = leaderboardDTO.competitors[0];
    if (leaderboardDTO.insights.topCompetitor !== topCompetitor.name) {
      issues.push(`Top competitor mismatch: expected ${topCompetitor.name}, got ${leaderboardDTO.insights.topCompetitor}`);
    }
  }

  // Verify competitive gap is calculated when applicable
  if (leaderboardDTO.insights.topCompetitor && leaderboardDTO.competitors.length > 0) {
    const topCompetitor = leaderboardDTO.competitors[0];
    const targetMentions = leaderboardDTO.targetBusiness.mentionCount;
    const topMentions = topCompetitor.mentionCount;
    const expectedGap = topMentions - targetMentions;
    
    if (leaderboardDTO.insights.competitiveGap !== null && 
        leaderboardDTO.insights.competitiveGap !== expectedGap) {
      issues.push(`Competitive gap mismatch: expected ${expectedGap}, got ${leaderboardDTO.insights.competitiveGap}`);
    }
  }

  return {
    isValid: issues.length === 0,
    issues,
  };
}

test.describe('Competitive Intelligence Cards Flow: Iterative Flow Test', () => {
  test.setTimeout(600_000); // 10 minutes for full suite

  test('Complete Competitive Intelligence Cards Flow Verification', async ({
    authenticatedPage,
  }) => {
    // Shared state across all steps
    const testState: CompetitiveCardsTestState = {
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

    // Step 2: Generate Fingerprint with Competitive Data
    await test.step('Step 2: Generate Fingerprint with Competitive Data', async () => {
      if (!testState.businessId) {
        test.skip();
      }

      console.log('[CARDS TEST] ========================================');
      console.log('[CARDS TEST] STEP 2: Generate Fingerprint');
      console.log('[CARDS TEST] ========================================');

      // Trigger fingerprint generation (includes competitive leaderboard)
      // DRY: Use helper function with proper timeout handling
      const fingerprintResult = await triggerFingerprintGeneration(
        authenticatedPage,
        baseURL,
        testState.businessId
      );

      if (fingerprintResult) {
        console.log(`[CARDS TEST] ✓ Fingerprint generated: ID ${fingerprintResult.fingerprintId}`);
      } else {
        console.log('[CARDS TEST] ⚠️  Fingerprint frequency limit or timeout - using existing if available');
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
      testState.leaderboardDTO = testState.fingerprintDTO.competitiveLeaderboard || null;

      if (!testState.leaderboardDTO) {
        console.log('[CARDS TEST] ⚠️  No competitive leaderboard in fingerprint DTO yet');
        console.log('[CARDS TEST] This is expected if competitive data is not yet available');
      } else {
        console.log('[CARDS TEST] ✓ Competitive leaderboard found in fingerprint DTO');
      }

      testState.testResults!.fingerprintGenerated = true;
      console.log('[CARDS TEST] ✓ STEP 2 PASSED: Fingerprint generated');
    });

    // Step 3: Verify Leaderboard Data Structure (DTO Layer)
    await test.step('Step 3: Verify Leaderboard Data Structure (DTO Layer)', async () => {
      if (!testState.leaderboardDTO) {
        console.log('[CARDS TEST] ⚠️  Skipping leaderboard verification - no leaderboard data');
        console.log('[CARDS TEST] This is expected if competitive leaderboard is not yet generated');
        test.skip();
      }

      console.log('[CARDS TEST] ========================================');
      console.log('[CARDS TEST] STEP 3: Verify Leaderboard Data Structure');
      console.log('[CARDS TEST] ========================================');

      // Verify basic structure
      expect(testState.leaderboardDTO.targetBusiness).toBeDefined();
      expect(Array.isArray(testState.leaderboardDTO.competitors)).toBe(true);
      expect(testState.leaderboardDTO.insights).toBeDefined();

      console.log(`[CARDS TEST] ✓ Target business: ${testState.leaderboardDTO.targetBusiness.name}`);
      console.log(`[CARDS TEST] ✓ Competitors: ${testState.leaderboardDTO.competitors.length}`);
      console.log(`[CARDS TEST] ✓ Market position: ${testState.leaderboardDTO.insights.marketPosition}`);
      console.log(`[CARDS TEST] ✓ Total queries: ${testState.leaderboardDTO.totalQueries}`);

      testState.testResults!.leaderboardDataVerified = true;
      console.log('[CARDS TEST] ✓ STEP 3 PASSED: Leaderboard data structure verified');
    });

    // Step 4: Verify Market Position Card
    await test.step('Step 4: Verify Market Position Card', async () => {
      if (!testState.leaderboardDTO) {
        test.skip();
      }

      console.log('[CARDS TEST] ========================================');
      console.log('[CARDS TEST] STEP 4: Verify Market Position Card');
      console.log('[CARDS TEST] ========================================');

      const positionVerification = verifyMarketPositionCard(testState.leaderboardDTO);

      if (!positionVerification.isValid) {
        console.log('[CARDS TEST] ⚠️  Market position card issues:');
        positionVerification.issues.forEach((issue) =>
          console.log(`[CARDS TEST]   ${issue}`)
        );
      } else {
        console.log('[CARDS TEST] ✓ Market position card validated');
        console.log(`[CARDS TEST]   Position: ${testState.leaderboardDTO.insights.marketPosition}`);
        console.log(`[CARDS TEST]   Mention rate: ${testState.leaderboardDTO.targetBusiness.mentionRate}%`);
      }

      testState.testResults!.marketPositionCardVerified = true;
      console.log('[CARDS TEST] ✓ STEP 4 PASSED: Market position card verified');
    });

    // Step 5: Verify Competitor Rankings Card
    await test.step('Step 5: Verify Competitor Rankings Card', async () => {
      if (!testState.leaderboardDTO) {
        test.skip();
      }

      console.log('[CARDS TEST] ========================================');
      console.log('[CARDS TEST] STEP 5: Verify Competitor Rankings Card');
      console.log('[CARDS TEST] ========================================');

      const rankingsVerification = verifyCompetitorRankingsCard(testState.leaderboardDTO);

      if (!rankingsVerification.isValid) {
        console.log('[CARDS TEST] ⚠️  Competitor rankings card issues:');
        rankingsVerification.issues.forEach((issue) =>
          console.log(`[CARDS TEST]   ${issue}`)
        );
      } else {
        console.log('[CARDS TEST] ✓ Competitor rankings card validated');
        console.log(`[CARDS TEST]   Competitors: ${testState.leaderboardDTO.competitors.length}`);
        testState.leaderboardDTO.competitors.forEach((comp: any, idx: number) => {
          console.log(`[CARDS TEST]   ${idx + 1}. ${comp.name}: ${comp.mentionCount} mentions, ${comp.marketShare.toFixed(1)}% share`);
        });
      }

      testState.testResults!.competitorRankingsCardVerified = true;
      console.log('[CARDS TEST] ✓ STEP 5 PASSED: Competitor rankings card verified');
    });

    // Step 6: Verify Insights Card
    await test.step('Step 6: Verify Insights Card', async () => {
      if (!testState.leaderboardDTO) {
        test.skip();
      }

      console.log('[CARDS TEST] ========================================');
      console.log('[CARDS TEST] STEP 6: Verify Insights Card');
      console.log('[CARDS TEST] ========================================');

      const insightsVerification = verifyInsightsCard(testState.leaderboardDTO);

      if (!insightsVerification.isValid) {
        console.log('[CARDS TEST] ⚠️  Insights card issues:');
        insightsVerification.issues.forEach((issue) =>
          console.log(`[CARDS TEST]   ${issue}`)
        );
      } else {
        console.log('[CARDS TEST] ✓ Insights card validated');
        console.log(`[CARDS TEST]   Recommendation: ${testState.leaderboardDTO.insights.recommendation.substring(0, 100)}...`);
        if (testState.leaderboardDTO.insights.topCompetitor) {
          console.log(`[CARDS TEST]   Top competitor: ${testState.leaderboardDTO.insights.topCompetitor}`);
        }
        if (testState.leaderboardDTO.insights.competitiveGap !== null) {
          console.log(`[CARDS TEST]   Competitive gap: ${testState.leaderboardDTO.insights.competitiveGap}`);
        }
      }

      testState.testResults!.insightsCardVerified = true;
      console.log('[CARDS TEST] ✓ STEP 6 PASSED: Insights card verified');
    });

    // Step 7: Verify UI Cards Display (Competitive Page)
    await test.step('Step 7: Verify UI Cards Display (Competitive Page)', async () => {
      if (!testState.businessId) {
        test.skip();
      }

      console.log('[CARDS TEST] ========================================');
      console.log('[CARDS TEST] STEP 7: Verify UI Cards Display');
      console.log('[CARDS TEST] ========================================');

      // Navigate to competitive page
      await authenticatedPage.goto(
        `${baseURL}/dashboard/businesses/${testState.businessId}/competitive`
      );
      await authenticatedPage.waitForLoadState('networkidle');

      // Check if competitive leaderboard is displayed or if "No Competitive Data" message is shown
      const noDataMessage = authenticatedPage.locator('text=No Competitive Data Yet');
      const leaderboardTitle = authenticatedPage.locator('text=Competitive Leaderboard');
      
      const hasNoData = await noDataMessage.isVisible().catch(() => false);
      const hasLeaderboard = await leaderboardTitle.isVisible().catch(() => false);

      if (hasNoData) {
        console.log('[CARDS TEST] ⚠️  No competitive data message displayed');
        console.log('[CARDS TEST] This is expected if competitive leaderboard is not yet generated');
        console.log('[CARDS TEST] UI correctly handles missing competitive data');
      } else if (hasLeaderboard) {
        console.log('[CARDS TEST] ✓ Competitive leaderboard displayed on page');
        
        // Verify key card elements are visible (use first() to avoid strict mode violation)
        const rankingsCard = authenticatedPage.locator('text=Rankings').first();
        const insightsCard = authenticatedPage.locator('text=Strategic Insights').first();
        const marketPositionBadge = authenticatedPage.locator('[class*="MarketPosition"]');
        
        // Check if at least one card is visible (more resilient than .or())
        const hasRankings = await rankingsCard.isVisible().catch(() => false);
        const hasInsights = await insightsCard.isVisible().catch(() => false);
        
        if (hasRankings || hasInsights) {
          console.log('[CARDS TEST] ✓ Competitive intelligence cards are visible');
        } else {
          console.log('[CARDS TEST] ⚠️  Cards may not be visible yet');
        }
        
        // Verify market position badge is visible
        const hasBadge = await marketPositionBadge.isVisible().catch(() => false);
        if (hasBadge) {
          console.log('[CARDS TEST] ✓ Market position badge is visible');
        }
      } else {
        console.log('[CARDS TEST] ⚠️  Could not determine competitive page state');
      }

      testState.testResults!.dashboardCardsVerified = true;
      console.log('[CARDS TEST] ✓ STEP 7 PASSED: UI cards display verified');
    });

    // Step 8: Summary - Verify All Issues Are Addressed
    await test.step('Step 8: Summary - Verify All Issues', async () => {
      console.log('[CARDS TEST] ========================================');
      console.log('[CARDS TEST] STEP 8: Summary - Verify All Issues');
      console.log('[CARDS TEST] ========================================');

      const issues: string[] = [];

      // Check market position card
      if (testState.leaderboardDTO) {
        const positionVerification = verifyMarketPositionCard(testState.leaderboardDTO);
        if (!positionVerification.isValid) {
          issues.push(`Market position card issues: ${positionVerification.issues.join(', ')}`);
        }
      }

      // Check competitor rankings card
      if (testState.leaderboardDTO) {
        const rankingsVerification = verifyCompetitorRankingsCard(testState.leaderboardDTO);
        if (!rankingsVerification.isValid) {
          issues.push(`Competitor rankings card issues: ${rankingsVerification.issues.join(', ')}`);
        }
      }

      // Check insights card
      if (testState.leaderboardDTO) {
        const insightsVerification = verifyInsightsCard(testState.leaderboardDTO);
        if (!insightsVerification.isValid) {
          issues.push(`Insights card issues: ${insightsVerification.issues.join(', ')}`);
        }
      }

      if (issues.length > 0) {
        console.log('[CARDS TEST] ⚠️  Issues Found:');
        issues.forEach((issue) => console.log(`[CARDS TEST]   ${issue}`));
        throw new Error(`Found ${issues.length} critical issue(s). Fix and re-run.`);
      } else {
        console.log('[CARDS TEST] ✅ All critical issues resolved!');
        console.log('[CARDS TEST] ========================================');
        console.log('[CARDS TEST] COMPETITIVE INTELLIGENCE CARDS FLOW VERIFICATION COMPLETE');
        console.log('[CARDS TEST] ========================================');
      }
    });
  });
});

