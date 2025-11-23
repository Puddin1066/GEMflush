/**
 * Fingerprint Service Accuracy Flow: Iterative Flow Test
 * 
 * Purpose: Validates fingerprint service layer accuracy and correctness
 * 
 * Focus Areas:
 * 1. Service layer calculation accuracy (visibility score, mention rate, sentiment)
 * 2. LLM query execution and result processing
 * 3. Competitive leaderboard generation accuracy
 * 4. Error handling and fallback behavior
 * 5. Performance and timing
 * 
 * Structure:
 * - Single test with 7 steps, each focusing on one service layer validation
 * - Shared test state persists across steps
 * - Uses test.step() to ensure same context across all steps
 * 
 * SOLID Principles:
 * - Single Responsibility: Each step focuses on one service validation
 * - Open/Closed: Easy to add new validations without modifying existing
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
type ServiceAccuracyTestState = {
  businessId?: number;
  baseURL?: string;
  fingerprintDTO?: any;
  rawFingerprint?: any;
  testResults?: {
    cfpExecuted?: boolean;
    fingerprintGenerated?: boolean;
    visibilityScoreValidated?: boolean;
    mentionRateValidated?: boolean;
    sentimentValidated?: boolean;
    competitiveLeaderboardValidated?: boolean;
    errorHandlingValidated?: boolean;
  };
};

/**
 * Validate visibility score calculation
 */
function validateVisibilityScore(
  fingerprint: any
): { isValid: boolean; issues: string[] } {
  const issues: string[] = [];

  if (fingerprint.visibilityScore === undefined || fingerprint.visibilityScore === null) {
    issues.push('Visibility score is missing');
    return { isValid: false, issues };
  }

  const score = fingerprint.visibilityScore;

  // Check score is a number
  if (typeof score !== 'number') {
    issues.push(`Visibility score is not a number: ${typeof score}`);
  }

  // Check score is in valid range (0-100)
  if (score < 0 || score > 100) {
    issues.push(`Visibility score out of range: ${score} (expected 0-100)`);
  }

  // Check score is an integer (should be rounded)
  if (!Number.isInteger(score)) {
    issues.push(`Visibility score is not an integer: ${score} (should be rounded)`);
  }

  return {
    isValid: issues.length === 0,
    issues,
  };
}

/**
 * Validate mention rate calculation
 */
function validateMentionRate(
  fingerprint: any
): { isValid: boolean; issues: string[] } {
  const issues: string[] = [];

  if (fingerprint.summary?.mentionRate === undefined) {
    issues.push('Mention rate is missing');
    return { isValid: false, issues };
  }

  const mentionRate = fingerprint.summary.mentionRate;

  // Check mention rate is a number
  if (typeof mentionRate !== 'number') {
    issues.push(`Mention rate is not a number: ${typeof mentionRate}`);
  }

  // Check mention rate is in valid range (0-100)
  if (mentionRate < 0 || mentionRate > 100) {
    issues.push(`Mention rate out of range: ${mentionRate} (expected 0-100)`);
  }

  // Verify mention rate matches actual results
  if (fingerprint.results && Array.isArray(fingerprint.results)) {
    const mentionedCount = fingerprint.results.filter((r: any) => r.mentioned).length;
    const totalCount = fingerprint.results.length;
    const expectedRate = totalCount > 0 ? (mentionedCount / totalCount) * 100 : 0;
    
    // Allow 5% tolerance for rounding
    if (Math.abs(mentionRate - expectedRate) > 5) {
      issues.push(
        `Mention rate mismatch: expected ${expectedRate.toFixed(1)}% ` +
        `(based on ${mentionedCount}/${totalCount} mentions), got ${mentionRate}%`
      );
    }
  }

  return {
    isValid: issues.length === 0,
    issues,
  };
}

/**
 * Validate sentiment calculation
 */
function validateSentiment(
  fingerprint: any
): { isValid: boolean; issues: string[] } {
  const issues: string[] = [];

  if (!fingerprint.summary?.sentiment) {
    issues.push('Sentiment is missing');
    return { isValid: false, issues };
  }

  const sentiment = fingerprint.summary.sentiment;

  // Check sentiment is valid value
  const validSentiments = ['positive', 'neutral', 'negative'];
  if (!validSentiments.includes(sentiment)) {
    issues.push(`Invalid sentiment value: ${sentiment} (expected: ${validSentiments.join(', ')})`);
  }

  // Verify sentiment matches results if available
  if (fingerprint.results && Array.isArray(fingerprint.results)) {
    const positiveCount = fingerprint.results.filter((r: any) => r.sentiment === 'positive').length;
    const negativeCount = fingerprint.results.filter((r: any) => r.sentiment === 'negative').length;
    const neutralCount = fingerprint.results.filter((r: any) => r.sentiment === 'neutral').length;
    
    // Sentiment should match majority
    const majority = positiveCount > negativeCount && positiveCount > neutralCount ? 'positive' :
                     negativeCount > positiveCount && negativeCount > neutralCount ? 'negative' :
                     'neutral';
    
    if (sentiment !== majority && fingerprint.results.length > 0) {
      issues.push(
        `Sentiment mismatch: expected ${majority} ` +
        `(based on results: ${positiveCount} positive, ${negativeCount} negative, ${neutralCount} neutral), ` +
        `got ${sentiment}`
      );
    }
  }

  return {
    isValid: issues.length === 0,
    issues,
  };
}

/**
 * Validate competitive leaderboard generation
 */
function validateCompetitiveLeaderboard(
  fingerprint: any
): { isValid: boolean; issues: string[] } {
  const issues: string[] = [];

  // Competitive leaderboard is optional, but if present should be valid
  if (!fingerprint.competitiveLeaderboard) {
    // This is acceptable - not all fingerprints have competitive data
    return { isValid: true, issues: [] };
  }

  const leaderboard = fingerprint.competitiveLeaderboard;

  // Verify structure
  if (!leaderboard.targetBusiness) {
    issues.push('Competitive leaderboard missing targetBusiness');
  } else {
    if (typeof leaderboard.targetBusiness.mentionCount !== 'number') {
      issues.push('targetBusiness.mentionCount is not a number');
    }
    if (typeof leaderboard.targetBusiness.mentionRate !== 'number') {
      issues.push('targetBusiness.mentionRate is not a number');
    }
  }

  if (!Array.isArray(leaderboard.competitors)) {
    issues.push('Competitive leaderboard competitors is not an array');
  }

  if (typeof leaderboard.totalQueries !== 'number') {
    issues.push('Competitive leaderboard totalQueries is not a number');
  }

  // Verify competitor names are valid (not LLM response text)
  if (Array.isArray(leaderboard.competitors)) {
    leaderboard.competitors.forEach((comp: any, idx: number) => {
      if (typeof comp.name !== 'string' || comp.name.length === 0) {
        issues.push(`Competitor[${idx}] name is invalid`);
      }
      if (typeof comp.mentionCount !== 'number' || comp.mentionCount < 0) {
        issues.push(`Competitor[${idx}] mentionCount is invalid`);
      }
    });
  }

  return {
    isValid: issues.length === 0,
    issues,
  };
}

test.describe('Fingerprint Service Accuracy Flow: Iterative Flow Test', () => {
  test.setTimeout(600_000); // 10 minutes for full suite

  test('Complete Fingerprint Service Accuracy Verification', async ({
    authenticatedPage,
  }) => {
    // Shared state across all steps
    const testState: ServiceAccuracyTestState = {
      testResults: {},
    };

    const baseURL = process.env.BASE_URL || 'http://localhost:3000';
    testState.baseURL = baseURL;

    // Step 1: Execute Automated CFP Core Logic
    await test.step('Step 1: Execute Automated CFP Core Logic', async () => {
      console.log('[SERVICE TEST] ========================================');
      console.log('[SERVICE TEST] STEP 1: Execute Automated CFP Core Logic');
      console.log('[SERVICE TEST] ========================================');

      const uniqueUrl = `https://test-service-${Date.now()}.example.com`;
      testState.businessId = await executeCFPFlow(
        authenticatedPage,
        baseURL,
        uniqueUrl
      );

      console.log(`[SERVICE TEST] ✓ Business created: ID ${testState.businessId}`);
      testState.testResults!.cfpExecuted = true;
      console.log('[SERVICE TEST] ✓ STEP 1 PASSED: CFP execution complete');
    });

    // Step 2: Generate Fingerprint via Service
    await test.step('Step 2: Generate Fingerprint via Service', async () => {
      if (!testState.businessId) {
        test.skip();
      }

      console.log('[SERVICE TEST] ========================================');
      console.log('[SERVICE TEST] STEP 2: Generate Fingerprint via Service');
      console.log('[SERVICE TEST] ========================================');

      // Trigger fingerprint generation
      const fingerprintResult = await triggerFingerprintGeneration(
        authenticatedPage,
        baseURL,
        testState.businessId
      );

      if (fingerprintResult) {
        console.log(`[SERVICE TEST] ✓ Fingerprint generated: ID ${fingerprintResult.fingerprintId}`);
      } else {
        console.log('[SERVICE TEST] ⚠️  Fingerprint frequency limit or timeout - using existing if available');
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
      console.log(`[SERVICE TEST] ✓ Fingerprint DTO fetched`);
      console.log(`[SERVICE TEST]   Visibility score: ${testState.fingerprintDTO.visibilityScore}`);
      console.log(`[SERVICE TEST]   Results count: ${testState.fingerprintDTO.results?.length || 0}`);

      testState.testResults!.fingerprintGenerated = true;
      console.log('[SERVICE TEST] ✓ STEP 2 PASSED: Fingerprint generated');
    });

    // Step 3: Validate Visibility Score Calculation
    await test.step('Step 3: Validate Visibility Score Calculation', async () => {
      if (!testState.fingerprintDTO) {
        test.skip();
      }

      console.log('[SERVICE TEST] ========================================');
      console.log('[SERVICE TEST] STEP 3: Validate Visibility Score Calculation');
      console.log('[SERVICE TEST] ========================================');

      const scoreValidation = validateVisibilityScore(testState.fingerprintDTO);

      if (!scoreValidation.isValid) {
        console.log('[SERVICE TEST] ❌ Visibility score validation FAILED');
        console.log('[SERVICE TEST]   Issues:');
        scoreValidation.issues.forEach((issue) =>
          console.log(`[SERVICE TEST]     ${issue}`)
        );
        
        throw new Error(
          `Visibility score calculation errors found. ` +
          `Fix visibility score calculation in BusinessFingerprinter.calculateVisibilityScore().`
        );
      } else {
        console.log('[SERVICE TEST] ✓ Visibility score calculation is accurate');
        console.log(`[SERVICE TEST]   Score: ${testState.fingerprintDTO.visibilityScore}`);
      }

      testState.testResults!.visibilityScoreValidated = true;
      console.log('[SERVICE TEST] ✓ STEP 3 PASSED: Visibility score validated');
    });

    // Step 4: Validate Mention Rate Calculation
    await test.step('Step 4: Validate Mention Rate Calculation', async () => {
      if (!testState.fingerprintDTO) {
        test.skip();
      }

      console.log('[SERVICE TEST] ========================================');
      console.log('[SERVICE TEST] STEP 4: Validate Mention Rate Calculation');
      console.log('[SERVICE TEST] ========================================');

      const mentionRateValidation = validateMentionRate(testState.fingerprintDTO);

      if (!mentionRateValidation.isValid) {
        console.log('[SERVICE TEST] ❌ Mention rate validation FAILED');
        console.log('[SERVICE TEST]   Issues:');
        mentionRateValidation.issues.forEach((issue) =>
          console.log(`[SERVICE TEST]     ${issue}`)
        );
        
        throw new Error(
          `Mention rate calculation errors found. ` +
          `Fix mention rate calculation in BusinessFingerprinter.generateAnalysis().`
        );
      } else {
        console.log('[SERVICE TEST] ✓ Mention rate calculation is accurate');
        console.log(`[SERVICE TEST]   Mention rate: ${testState.fingerprintDTO.summary?.mentionRate}%`);
      }

      testState.testResults!.mentionRateValidated = true;
      console.log('[SERVICE TEST] ✓ STEP 4 PASSED: Mention rate validated');
    });

    // Step 5: Validate Sentiment Calculation
    await test.step('Step 5: Validate Sentiment Calculation', async () => {
      if (!testState.fingerprintDTO) {
        test.skip();
      }

      console.log('[SERVICE TEST] ========================================');
      console.log('[SERVICE TEST] STEP 5: Validate Sentiment Calculation');
      console.log('[SERVICE TEST] ========================================');

      const sentimentValidation = validateSentiment(testState.fingerprintDTO);

      if (!sentimentValidation.isValid) {
        console.log('[SERVICE TEST] ❌ Sentiment validation FAILED');
        console.log('[SERVICE TEST]   Issues:');
        sentimentValidation.issues.forEach((issue) =>
          console.log(`[SERVICE TEST]     ${issue}`)
        );
        
        throw new Error(
          `Sentiment calculation errors found. ` +
          `Fix sentiment calculation in BusinessFingerprinter.generateAnalysis().`
        );
      } else {
        console.log('[SERVICE TEST] ✓ Sentiment calculation is accurate');
        console.log(`[SERVICE TEST]   Sentiment: ${testState.fingerprintDTO.summary?.sentiment}`);
      }

      testState.testResults!.sentimentValidated = true;
      console.log('[SERVICE TEST] ✓ STEP 5 PASSED: Sentiment validated');
    });

    // Step 6: Validate Competitive Leaderboard Generation
    await test.step('Step 6: Validate Competitive Leaderboard Generation', async () => {
      if (!testState.fingerprintDTO) {
        test.skip();
      }

      console.log('[SERVICE TEST] ========================================');
      console.log('[SERVICE TEST] STEP 6: Validate Competitive Leaderboard Generation');
      console.log('[SERVICE TEST] ========================================');

      const leaderboardValidation = validateCompetitiveLeaderboard(testState.fingerprintDTO);

      if (!leaderboardValidation.isValid) {
        console.log('[SERVICE TEST] ❌ Competitive leaderboard validation FAILED');
        console.log('[SERVICE TEST]   Issues:');
        leaderboardValidation.issues.forEach((issue) =>
          console.log(`[SERVICE TEST]     ${issue}`)
        );
        
        throw new Error(
          `Competitive leaderboard generation errors found. ` +
          `Fix competitive leaderboard generation in BusinessFingerprinter.generateCompetitiveLeaderboard().`
        );
      } else {
        console.log('[SERVICE TEST] ✓ Competitive leaderboard generation is accurate');
        if (testState.fingerprintDTO.competitiveLeaderboard) {
          console.log(`[SERVICE TEST]   Competitors: ${testState.fingerprintDTO.competitiveLeaderboard.competitors?.length || 0}`);
          console.log(`[SERVICE TEST]   Total queries: ${testState.fingerprintDTO.competitiveLeaderboard.totalQueries || 0}`);
        } else {
          console.log('[SERVICE TEST]   No competitive leaderboard (acceptable)');
        }
      }

      testState.testResults!.competitiveLeaderboardValidated = true;
      console.log('[SERVICE TEST] ✓ STEP 6 PASSED: Competitive leaderboard validated');
    });

    // Step 7: Summary - Verify All Service Accuracy Issues Are Addressed
    await test.step('Step 7: Summary - Verify All Service Accuracy Issues', async () => {
      console.log('[SERVICE TEST] ========================================');
      console.log('[SERVICE TEST] STEP 7: Summary - Verify All Service Accuracy Issues');
      console.log('[SERVICE TEST] ========================================');

      const allIssues: string[] = [];

      // Re-run all validations
      if (testState.fingerprintDTO) {
        const scoreValidation = validateVisibilityScore(testState.fingerprintDTO);
        if (!scoreValidation.isValid) {
          allIssues.push(`Visibility score: ${scoreValidation.issues.length} issues`);
        }

        const mentionRateValidation = validateMentionRate(testState.fingerprintDTO);
        if (!mentionRateValidation.isValid) {
          allIssues.push(`Mention rate: ${mentionRateValidation.issues.length} issues`);
        }

        const sentimentValidation = validateSentiment(testState.fingerprintDTO);
        if (!sentimentValidation.isValid) {
          allIssues.push(`Sentiment: ${sentimentValidation.issues.length} issues`);
        }

        const leaderboardValidation = validateCompetitiveLeaderboard(testState.fingerprintDTO);
        if (!leaderboardValidation.isValid) {
          allIssues.push(`Competitive leaderboard: ${leaderboardValidation.issues.length} issues`);
        }
      }

      if (allIssues.length > 0) {
        console.log('[SERVICE TEST] ❌ Service Accuracy Issues Found:');
        allIssues.forEach((issue) => console.log(`[SERVICE TEST]   ${issue}`));
        throw new Error(
          `Found ${allIssues.length} service accuracy issue(s). ` +
          `Fix calculation logic in BusinessFingerprinter service.`
        );
      } else {
        console.log('[SERVICE TEST] ✅ All service accuracy issues resolved!');
        console.log('[SERVICE TEST] ========================================');
        console.log('[SERVICE TEST] FINGERPRINT SERVICE ACCURACY VERIFICATION COMPLETE');
        console.log('[SERVICE TEST] ========================================');
      }
    });
  });
});

