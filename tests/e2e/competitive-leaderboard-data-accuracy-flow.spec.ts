/**
 * Competitive Leaderboard Data Accuracy Flow: Iterative Flow Test
 * 
 * Purpose: Validates and fixes inaccurate competitive leaderboard data
 * 
 * Focus Areas:
 * 1. Competitor name accuracy (not LLM response text, not parsing errors)
 * 2. Competitor deduplication (same business with different name variations)
 * 3. Market share calculation accuracy
 * 4. Ranking position accuracy
 * 5. Mention count accuracy
 * 6. False positive filtering
 * 
 * Structure:
 * - Single test with 8 steps, each focusing on one data accuracy issue
 * - Shared test state persists across steps
 * - Uses test.step() to ensure same context across all steps
 * 
 * SOLID Principles:
 * - Single Responsibility: Each step focuses on one data accuracy issue
 * - Open/Closed: Easy to add new accuracy checks without modifying existing
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
type DataAccuracyTestState = {
  businessId?: number;
  baseURL?: string;
  fingerprintDTO?: any;
  leaderboardDTO?: any;
  rawLLMResults?: any[];
  testResults?: {
    cfpExecuted?: boolean;
    fingerprintGenerated?: boolean;
    competitorNamesValidated?: boolean;
    deduplicationValidated?: boolean;
    marketShareValidated?: boolean;
    rankingValidated?: boolean;
    mentionCountValidated?: boolean;
    falsePositivesFiltered?: boolean;
  };
};

/**
 * Validate competitor names are actual business names (not LLM response text)
 */
function validateCompetitorNames(
  competitors: Array<{ name: string }>
): { isValid: boolean; issues: string[]; invalidNames: string[] } {
  const issues: string[] = [];
  const invalidNames: string[] = [];

  // Patterns that indicate invalid competitor names (LLM response text, not business names)
  const invalidPatterns = [
    /^(here are|i'd recommend|i recommend|to give you|that's a|i need|quality recommendations)/i,
    /^(each of these|these businesses|professional standards|local community)/i,
    /^(demonstrated|serves the|effectively|strong community presence)/i,
    /^(with strong|community presence|demonstrated professional)/i,
    /^(quality recommendations for)/i,
    /^(some top|top recommendations|recommendations for)/i,
    /^(a great|great question|little more|more information)/i,
    /^(what you're|you're looking|looking for)/i,
    /^[a-z]/i, // Starts with lowercase (likely sentence fragment)
    /^(the|a|an)\s+[a-z]/i, // Starts with article + lowercase
    /^(and|or|but|if|when|where|why|how)\s+/i, // Starts with conjunction
    /^(is|are|was|were|be|been|being)\s+/i, // Starts with verb
    /^(can|could|should|would|will|may|might)\s+/i, // Starts with modal
    /^(this|that|these|those)\s+/i, // Starts with demonstrative
    /^(it|they|we|you|he|she)\s+/i, // Starts with pronoun
    /^[^A-Z]/, // Doesn't start with capital letter
    /^.{1,3}$/, // Too short (1-3 characters)
    /^(quality|professional|local|community|excellence|choice|group|services|solutions)$/i, // Generic words
  ];

  competitors.forEach((comp, idx) => {
    const name = comp.name.trim();
    
    // Check for invalid patterns
    const matchesInvalidPattern = invalidPatterns.some(pattern => pattern.test(name));
    
    if (matchesInvalidPattern) {
      invalidNames.push(name);
      issues.push(`Competitor[${idx}] has invalid name: "${name}" (appears to be LLM response text, not a business name)`);
    }
    
    // Check for very long names (likely sentence fragments)
    if (name.length > 100) {
      invalidNames.push(name);
      issues.push(`Competitor[${idx}] has suspiciously long name: "${name.substring(0, 50)}..." (likely sentence fragment)`);
    }
    
    // Check for names that are just common phrases
    const commonPhrases = [
      'quality professional services',
      'professional services providers',
      'strong community presence',
      'demonstrated professional standards',
      'serves the local community',
    ];
    
    if (commonPhrases.some(phrase => name.toLowerCase().includes(phrase))) {
      invalidNames.push(name);
      issues.push(`Competitor[${idx}] name contains common phrase: "${name}" (likely not a business name)`);
    }
  });

  return {
    isValid: issues.length === 0,
    issues,
    invalidNames,
  };
}

/**
 * Validate competitor deduplication
 */
function validateDeduplication(
  competitors: Array<{ name: string }>
): { isValid: boolean; issues: string[]; duplicates: Array<{ names: string[]; reason: string }> } {
  const issues: string[] = [];
  const duplicates: Array<{ names: string[]; reason: string }> = [];

  // Normalize names for comparison (same logic as DTO)
  const normalizeName = (name: string): string => {
    return name
      .toLowerCase()
      .replace(/^(the|a|an)\s+/i, '')
      .replace(/\s+(llc|inc|corp|ltd|co|limited|company|corporation)\.?$/i, '')
      .replace(/\s+/g, ' ')
      .trim();
  };

  // Group competitors by normalized name
  const normalizedMap = new Map<string, string[]>();
  
  competitors.forEach(comp => {
    const normalized = normalizeName(comp.name);
    if (!normalizedMap.has(normalized)) {
      normalizedMap.set(normalized, []);
    }
    normalizedMap.get(normalized)!.push(comp.name);
  });

  // Find duplicates
  normalizedMap.forEach((names, normalized) => {
    if (names.length > 1) {
      duplicates.push({
        names,
        reason: `Same normalized name: "${normalized}"`,
      });
      issues.push(`Duplicate competitors found: ${names.join(', ')} (normalized: "${normalized}")`);
    }
  });

  return {
    isValid: issues.length === 0,
    issues,
    duplicates,
  };
}

/**
 * Validate market share calculations
 */
function validateMarketShare(
  leaderboardDTO: any
): { isValid: boolean; issues: string[] } {
  const issues: string[] = [];

  if (!leaderboardDTO) {
    issues.push('Leaderboard DTO is missing');
    return { isValid: false, issues };
  }

  // Calculate total mentions
  const targetMentions = leaderboardDTO.targetBusiness?.mentionCount || 0;
  const competitorMentions = leaderboardDTO.competitors?.reduce(
    (sum: number, c: any) => sum + (c.mentionCount || 0),
    0
  ) || 0;
  const totalMentions = targetMentions + competitorMentions;

  // Calculate expected market shares
  const expectedTargetShare = totalMentions > 0 ? (targetMentions / totalMentions) * 100 : 0;
  const calculatedCompetitorShares = leaderboardDTO.competitors?.reduce(
    (sum: number, c: any) => sum + (c.marketShare || 0),
    0
  ) || 0;

  // Verify target business market share (if displayed)
  // Note: Target business market share might not be in DTO, so we calculate it
  const totalShare = calculatedCompetitorShares + expectedTargetShare;

  // Allow 2% tolerance for rounding
  if (Math.abs(totalShare - 100) > 2) {
    issues.push(
      `Market share calculation error: total share is ${totalShare.toFixed(2)}% (expected ~100%). ` +
      `Target: ${expectedTargetShare.toFixed(2)}%, Competitors: ${calculatedCompetitorShares.toFixed(2)}%`
    );
  }

  // Verify each competitor's market share is correct
  leaderboardDTO.competitors?.forEach((comp: any, idx: number) => {
    const expectedShare = totalMentions > 0 ? (comp.mentionCount / totalMentions) * 100 : 0;
    const actualShare = comp.marketShare || 0;
    
    if (Math.abs(actualShare - expectedShare) > 1) { // 1% tolerance
      issues.push(
        `Competitor[${idx}] "${comp.name}" market share error: ` +
        `expected ${expectedShare.toFixed(2)}%, got ${actualShare.toFixed(2)}%`
      );
    }
  });

  return {
    isValid: issues.length === 0,
    issues,
  };
}

/**
 * Validate ranking positions are reasonable
 */
function validateRankings(
  leaderboardDTO: any
): { isValid: boolean; issues: string[] } {
  const issues: string[] = [];

  if (!leaderboardDTO) {
    issues.push('Leaderboard DTO is missing');
    return { isValid: false, issues };
  }

  // Verify rankings are sequential (1, 2, 3, ...)
  const ranks = leaderboardDTO.competitors?.map((c: any) => c.rank).sort((a: number, b: number) => a - b) || [];
  
  for (let i = 0; i < ranks.length; i++) {
    if (ranks[i] !== i + 1) {
      issues.push(`Ranking sequence error: expected rank ${i + 1}, found ${ranks[i]}`);
      break;
    }
  }

  // Verify average positions are reasonable (1-10 for recommendation lists)
  leaderboardDTO.competitors?.forEach((comp: any, idx: number) => {
    if (comp.avgPosition !== undefined && comp.avgPosition !== null) {
      if (comp.avgPosition < 1 || comp.avgPosition > 10) {
        issues.push(
          `Competitor[${idx}] "${comp.name}" has invalid avgPosition: ${comp.avgPosition} (expected 1-10)`
        );
      }
    }
  });

  // Verify target business rank is reasonable (if present)
  if (leaderboardDTO.targetBusiness?.rank !== null && leaderboardDTO.targetBusiness?.rank !== undefined) {
    const targetRank = leaderboardDTO.targetBusiness.rank;
    if (targetRank < 1 || targetRank > 10) {
      issues.push(
        `Target business has invalid rank: ${targetRank} (expected 1-10 or null)`
      );
    }
  }

  return {
    isValid: issues.length === 0,
    issues,
  };
}

/**
 * Validate mention counts are consistent
 */
function validateMentionCounts(
  leaderboardDTO: any
): { isValid: boolean; issues: string[] } {
  const issues: string[] = [];

  if (!leaderboardDTO) {
    issues.push('Leaderboard DTO is missing');
    return { isValid: false, issues };
  }

  const totalQueries = leaderboardDTO.totalQueries || 0;
  const targetMentions = leaderboardDTO.targetBusiness?.mentionCount || 0;
  const competitorMentions = leaderboardDTO.competitors?.reduce(
    (sum: number, c: any) => sum + (c.mentionCount || 0),
    0
  ) || 0;

  // Verify mention counts don't exceed total queries (each query can mention multiple businesses)
  // This is a sanity check - mention counts can exceed total queries if multiple businesses are mentioned per query
  // But we should verify the math makes sense

  // Verify target mention rate calculation
  const expectedMentionRate = totalQueries > 0 ? (targetMentions / totalQueries) * 100 : 0;
  const actualMentionRate = leaderboardDTO.targetBusiness?.mentionRate || 0;

  if (Math.abs(actualMentionRate - expectedMentionRate) > 1) { // 1% tolerance
    issues.push(
      `Target mention rate calculation error: expected ${expectedMentionRate.toFixed(2)}%, ` +
      `got ${actualMentionRate.toFixed(2)}%`
    );
  }

  // Verify competitor mention counts are non-negative
  leaderboardDTO.competitors?.forEach((comp: any, idx: number) => {
    if (comp.mentionCount < 0) {
      issues.push(`Competitor[${idx}] "${comp.name}" has negative mention count: ${comp.mentionCount}`);
    }
  });

  return {
    isValid: issues.length === 0,
    issues,
  };
}

test.describe('Competitive Leaderboard Data Accuracy Flow: Iterative Flow Test', () => {
  test.setTimeout(600_000); // 10 minutes for full suite

  test('Complete Competitive Leaderboard Data Accuracy Verification', async ({
    authenticatedPage,
  }) => {
    // Shared state across all steps
    const testState: DataAccuracyTestState = {
      testResults: {},
    };

    const baseURL = process.env.BASE_URL || 'http://localhost:3000';
    testState.baseURL = baseURL;

    // Step 1: Execute Automated CFP Core Logic
    await test.step('Step 1: Execute Automated CFP Core Logic', async () => {
      console.log('[ACCURACY TEST] ========================================');
      console.log('[ACCURACY TEST] STEP 1: Execute Automated CFP Core Logic');
      console.log('[ACCURACY TEST] ========================================');

      const uniqueUrl = `https://test-accuracy-${Date.now()}.example.com`;
      testState.businessId = await executeCFPFlow(
        authenticatedPage,
        baseURL,
        uniqueUrl
      );

      console.log(`[ACCURACY TEST] ✓ Business created: ID ${testState.businessId}`);
      testState.testResults!.cfpExecuted = true;
      console.log('[ACCURACY TEST] ✓ STEP 1 PASSED: CFP execution complete');
    });

    // Step 2: Generate Fingerprint with Competitive Data
    await test.step('Step 2: Generate Fingerprint with Competitive Data', async () => {
      if (!testState.businessId) {
        test.skip();
      }

      console.log('[ACCURACY TEST] ========================================');
      console.log('[ACCURACY TEST] STEP 2: Generate Fingerprint');
      console.log('[ACCURACY TEST] ========================================');

      // Trigger fingerprint generation
      const fingerprintResult = await triggerFingerprintGeneration(
        authenticatedPage,
        baseURL,
        testState.businessId
      );

      if (fingerprintResult) {
        console.log(`[ACCURACY TEST] ✓ Fingerprint generated: ID ${fingerprintResult.fingerprintId}`);
      } else {
        console.log('[ACCURACY TEST] ⚠️  Fingerprint frequency limit or timeout - using existing if available');
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
        console.log('[ACCURACY TEST] ⚠️  No competitive leaderboard in fingerprint DTO yet');
        console.log('[ACCURACY TEST] This is expected if competitive data is not yet available');
        test.skip();
      } else {
        console.log('[ACCURACY TEST] ✓ Competitive leaderboard found in fingerprint DTO');
        console.log(`[ACCURACY TEST]   Competitors: ${testState.leaderboardDTO.competitors.length}`);
        console.log(`[ACCURACY TEST]   Total queries: ${testState.leaderboardDTO.totalQueries}`);
      }

      testState.testResults!.fingerprintGenerated = true;
      console.log('[ACCURACY TEST] ✓ STEP 2 PASSED: Fingerprint generated');
    });

    // Step 3: Validate Competitor Names (Not LLM Response Text)
    await test.step('Step 3: Validate Competitor Names', async () => {
      if (!testState.leaderboardDTO) {
        test.skip();
      }

      console.log('[ACCURACY TEST] ========================================');
      console.log('[ACCURACY TEST] STEP 3: Validate Competitor Names');
      console.log('[ACCURACY TEST] ========================================');

      const nameValidation = validateCompetitorNames(testState.leaderboardDTO.competitors);

      if (!nameValidation.isValid) {
        console.log('[ACCURACY TEST] ❌ Competitor name validation FAILED');
        console.log(`[ACCURACY TEST]   Found ${nameValidation.invalidNames.length} invalid competitor names:`);
        nameValidation.invalidNames.forEach((name, idx) => {
          console.log(`[ACCURACY TEST]     ${idx + 1}. "${name}"`);
        });
        console.log('[ACCURACY TEST]   Issues:');
        nameValidation.issues.forEach((issue) =>
          console.log(`[ACCURACY TEST]     ${issue}`)
        );
        
        // This is a critical issue - invalid names should be filtered out
        throw new Error(
          `Found ${nameValidation.invalidNames.length} invalid competitor names. ` +
          `These appear to be LLM response text, not business names. ` +
          `Fix competitor name extraction in ResponseAnalyzer.analyzeCompetitors().`
        );
      } else {
        console.log('[ACCURACY TEST] ✓ All competitor names are valid business names');
        testState.leaderboardDTO.competitors.forEach((comp: any, idx: number) => {
          console.log(`[ACCURACY TEST]   ${idx + 1}. "${comp.name}"`);
        });
      }

      testState.testResults!.competitorNamesValidated = true;
      console.log('[ACCURACY TEST] ✓ STEP 3 PASSED: Competitor names validated');
    });

    // Step 4: Validate Competitor Deduplication
    await test.step('Step 4: Validate Competitor Deduplication', async () => {
      if (!testState.leaderboardDTO) {
        test.skip();
      }

      console.log('[ACCURACY TEST] ========================================');
      console.log('[ACCURACY TEST] STEP 4: Validate Competitor Deduplication');
      console.log('[ACCURACY TEST] ========================================');

      const deduplicationValidation = validateDeduplication(testState.leaderboardDTO.competitors);

      if (!deduplicationValidation.isValid) {
        console.log('[ACCURACY TEST] ❌ Competitor deduplication validation FAILED');
        console.log(`[ACCURACY TEST]   Found ${deduplicationValidation.duplicates.length} duplicate groups:`);
        deduplicationValidation.duplicates.forEach((dup, idx) => {
          console.log(`[ACCURACY TEST]     ${idx + 1}. ${dup.names.join(', ')} (${dup.reason})`);
        });
        console.log('[ACCURACY TEST]   Issues:');
        deduplicationValidation.issues.forEach((issue) =>
          console.log(`[ACCURACY TEST]     ${issue}`)
        );
        
        // This is a critical issue - duplicates should be merged
        throw new Error(
          `Found ${deduplicationValidation.duplicates.length} duplicate competitor groups. ` +
          `Competitor deduplication in toCompetitiveLeaderboardDTO() is not working correctly.`
        );
      } else {
        console.log('[ACCURACY TEST] ✓ No duplicate competitors found');
      }

      testState.testResults!.deduplicationValidated = true;
      console.log('[ACCURACY TEST] ✓ STEP 4 PASSED: Competitor deduplication validated');
    });

    // Step 5: Validate Market Share Calculations
    await test.step('Step 5: Validate Market Share Calculations', async () => {
      if (!testState.leaderboardDTO) {
        test.skip();
      }

      console.log('[ACCURACY TEST] ========================================');
      console.log('[ACCURACY TEST] STEP 5: Validate Market Share Calculations');
      console.log('[ACCURACY TEST] ========================================');

      const marketShareValidation = validateMarketShare(testState.leaderboardDTO);

      if (!marketShareValidation.isValid) {
        console.log('[ACCURACY TEST] ❌ Market share calculation validation FAILED');
        console.log('[ACCURACY TEST]   Issues:');
        marketShareValidation.issues.forEach((issue) =>
          console.log(`[ACCURACY TEST]     ${issue}`)
        );
        
        // This is a critical issue - market shares should sum to ~100%
        throw new Error(
          `Market share calculation errors found. ` +
          `Fix market share calculation in toCompetitiveLeaderboardDTO().`
        );
      } else {
        console.log('[ACCURACY TEST] ✓ Market share calculations are accurate');
        const totalShare = testState.leaderboardDTO.competitors.reduce(
          (sum: number, c: any) => sum + c.marketShare,
          0
        );
        const targetMentions = testState.leaderboardDTO.targetBusiness.mentionCount;
        const competitorMentions = testState.leaderboardDTO.competitors.reduce(
          (sum: number, c: any) => sum + c.mentionCount,
          0
        );
        const totalMentions = targetMentions + competitorMentions;
        const targetShare = totalMentions > 0 ? (targetMentions / totalMentions) * 100 : 0;
        console.log(`[ACCURACY TEST]   Total market share: ${(totalShare + targetShare).toFixed(2)}%`);
      }

      testState.testResults!.marketShareValidated = true;
      console.log('[ACCURACY TEST] ✓ STEP 5 PASSED: Market share calculations validated');
    });

    // Step 6: Validate Ranking Positions
    await test.step('Step 6: Validate Ranking Positions', async () => {
      if (!testState.leaderboardDTO) {
        test.skip();
      }

      console.log('[ACCURACY TEST] ========================================');
      console.log('[ACCURACY TEST] STEP 6: Validate Ranking Positions');
      console.log('[ACCURACY TEST] ========================================');

      const rankingValidation = validateRankings(testState.leaderboardDTO);

      if (!rankingValidation.isValid) {
        console.log('[ACCURACY TEST] ❌ Ranking validation FAILED');
        console.log('[ACCURACY TEST]   Issues:');
        rankingValidation.issues.forEach((issue) =>
          console.log(`[ACCURACY TEST]     ${issue}`)
        );
        
        // This is a critical issue - rankings should be sequential
        throw new Error(
          `Ranking position errors found. ` +
          `Fix ranking calculation in toCompetitiveLeaderboardDTO().`
        );
      } else {
        console.log('[ACCURACY TEST] ✓ Ranking positions are valid');
        console.log(`[ACCURACY TEST]   Rankings: ${testState.leaderboardDTO.competitors.map((c: any) => c.rank).join(', ')}`);
      }

      testState.testResults!.rankingValidated = true;
      console.log('[ACCURACY TEST] ✓ STEP 6 PASSED: Ranking positions validated');
    });

    // Step 7: Validate Mention Counts
    await test.step('Step 7: Validate Mention Counts', async () => {
      if (!testState.leaderboardDTO) {
        test.skip();
      }

      console.log('[ACCURACY TEST] ========================================');
      console.log('[ACCURACY TEST] STEP 7: Validate Mention Counts');
      console.log('[ACCURACY TEST] ========================================');

      const mentionCountValidation = validateMentionCounts(testState.leaderboardDTO);

      if (!mentionCountValidation.isValid) {
        console.log('[ACCURACY TEST] ❌ Mention count validation FAILED');
        console.log('[ACCURACY TEST]   Issues:');
        mentionCountValidation.issues.forEach((issue) =>
          console.log(`[ACCURACY TEST]     ${issue}`)
        );
        
        // This is a critical issue - mention counts should be accurate
        throw new Error(
          `Mention count calculation errors found. ` +
          `Fix mention count calculation in generateCompetitiveLeaderboard().`
        );
      } else {
        console.log('[ACCURACY TEST] ✓ Mention counts are accurate');
        console.log(`[ACCURACY TEST]   Target mentions: ${testState.leaderboardDTO.targetBusiness.mentionCount}`);
        console.log(`[ACCURACY TEST]   Total queries: ${testState.leaderboardDTO.totalQueries}`);
      }

      testState.testResults!.mentionCountValidated = true;
      console.log('[ACCURACY TEST] ✓ STEP 7 PASSED: Mention counts validated');
    });

    // Step 8: Summary - Verify All Data Accuracy Issues Are Addressed
    await test.step('Step 8: Summary - Verify All Data Accuracy Issues', async () => {
      console.log('[ACCURACY TEST] ========================================');
      console.log('[ACCURACY TEST] STEP 8: Summary - Verify All Data Accuracy Issues');
      console.log('[ACCURACY TEST] ========================================');

      const allIssues: string[] = [];

      // Re-run all validations
      if (testState.leaderboardDTO) {
        const nameValidation = validateCompetitorNames(testState.leaderboardDTO.competitors);
        if (!nameValidation.isValid) {
          allIssues.push(`Competitor names: ${nameValidation.issues.length} issues`);
        }

        const deduplicationValidation = validateDeduplication(testState.leaderboardDTO.competitors);
        if (!deduplicationValidation.isValid) {
          allIssues.push(`Deduplication: ${deduplicationValidation.issues.length} issues`);
        }

        const marketShareValidation = validateMarketShare(testState.leaderboardDTO);
        if (!marketShareValidation.isValid) {
          allIssues.push(`Market share: ${marketShareValidation.issues.length} issues`);
        }

        const rankingValidation = validateRankings(testState.leaderboardDTO);
        if (!rankingValidation.isValid) {
          allIssues.push(`Rankings: ${rankingValidation.issues.length} issues`);
        }

        const mentionCountValidation = validateMentionCounts(testState.leaderboardDTO);
        if (!mentionCountValidation.isValid) {
          allIssues.push(`Mention counts: ${mentionCountValidation.issues.length} issues`);
        }
      }

      if (allIssues.length > 0) {
        console.log('[ACCURACY TEST] ❌ Data Accuracy Issues Found:');
        allIssues.forEach((issue) => console.log(`[ACCURACY TEST]   ${issue}`));
        throw new Error(
          `Found ${allIssues.length} data accuracy issue(s). ` +
          `Fix competitor extraction, deduplication, and calculation logic.`
        );
      } else {
        console.log('[ACCURACY TEST] ✅ All data accuracy issues resolved!');
        console.log('[ACCURACY TEST] ========================================');
        console.log('[ACCURACY TEST] COMPETITIVE LEADERBOARD DATA ACCURACY VERIFICATION COMPLETE');
        console.log('[ACCURACY TEST] ========================================');
      }
    });
  });
});

