/**
 * Fingerprint Test Helpers
 * 
 * DRY: Reusable utilities for fingerprint/ranking UX flow tests
 * SOLID: Single Responsibility - each helper has one clear purpose
 */

import type { Page } from '@playwright/test';

export interface FingerprintDTO {
  visibilityScore: number;
  trend: 'up' | 'down' | 'neutral';
  summary?: {
    mentionRate?: number;
    sentimentScore?: number;
    accuracyScore?: number;
    averageRank?: number;
  };
  results?: Array<{
    model: string;
    promptType: string;
    mentioned: boolean;
    sentiment: string;
    confidence: number;
  }>;
  createdAt?: string;
}

export interface FingerprintHistoryPoint {
  id: number;
  date: string;
  visibilityScore: number;
  mentionRate: number | null;
  sentimentScore: number | null;
  accuracyScore: number | null;
  avgRankPosition: number | null;
}

export interface TrendVerification {
  isValid: boolean;
  issues: string[];
}

export interface VisibilityScoreVerification {
  isValid: boolean;
  issues: string[];
}

/**
 * Trigger fingerprint generation via API
 * 
 * DRY: Reusable function for triggering fingerprint generation with proper timeout handling
 * SOLID: Single Responsibility - handles fingerprint API calls with timeout
 * 
 * Returns: Fingerprint result or null if frequency limit hit
 */
export async function triggerFingerprintGeneration(
  page: Page,
  baseURL: string,
  businessId: number
): Promise<{ fingerprintId?: number; status: string; message?: string } | null> {
  try {
    const response = await page.request.post(
      `${baseURL}/api/fingerprint`,
      {
        data: {
          businessId,
        },
        timeout: 120000, // 2 minutes - fingerprint generation can take time (9 LLM queries)
      }
    );

    if (!response.ok()) {
      const errorBody = await response.json().catch(() => ({ error: 'Unknown error' }));
      const errorMessage = errorBody?.error || errorBody?.message || 'Unknown error';
      
      // Check if it's a frequency limit (acceptable)
      if (errorMessage.includes('frequency') || errorMessage.includes('limit')) {
        console.log(`[FINGERPRINT HELPER] ⚠️  Fingerprint frequency limit: ${errorMessage}`);
        return null; // Return null to indicate frequency limit
      }
      
      throw new Error(`Failed to trigger fingerprint (${response.status()}): ${errorMessage}`);
    }

    const result = await response.json();
    console.log(`[FINGERPRINT HELPER] ✓ Fingerprint triggered: ID ${result.fingerprintId}`);
    return result;
  } catch (error: any) {
    // Handle timeout specifically
    if (error.message?.includes('Timeout') || error.message?.includes('timeout')) {
      console.log(`[FINGERPRINT HELPER] ⚠️  Fingerprint API timeout - may still be processing`);
      // Return null to allow test to continue with existing fingerprint
      return null;
    }
    throw error;
  }
}

/**
 * Fetch fingerprint DTO from API
 * 
 * Returns: Fingerprint DTO with visibility score and trend
 */
export async function fetchFingerprintDTO(
  page: Page,
  baseURL: string,
  businessId: number
): Promise<FingerprintDTO> {
  const response = await page.request.get(
    `${baseURL}/api/fingerprint/business/${businessId}`,
    { timeout: 30000 }
  );

  if (!response.ok()) {
    const errorBody = await response.json().catch(() => ({ error: 'Unknown error' }));
    const errorMessage = errorBody?.error || 'Unknown error';
    
    console.error(`[FINGERPRINT HELPER] ❌ Fingerprint fetch failed:`, {
      status: response.status(),
      error: errorMessage,
      businessId,
    });
    
    throw new Error(`Failed to fetch fingerprint (${response.status()}): ${errorMessage}`);
  }

  const fingerprintDTO = await response.json();
  console.log('[FINGERPRINT HELPER] ✓ Fingerprint DTO fetched');
  return fingerprintDTO;
}

/**
 * Fetch fingerprint history from API
 * 
 * Returns: Array of fingerprint history points
 */
export async function fetchFingerprintHistory(
  page: Page,
  baseURL: string,
  businessId: number
): Promise<FingerprintHistoryPoint[]> {
  const response = await page.request.get(
    `${baseURL}/api/business/${businessId}/fingerprint/history`,
    { timeout: 30000 }
  );

  if (!response.ok()) {
    const errorBody = await response.json().catch(() => ({ error: 'Unknown error' }));
    const errorMessage = errorBody?.error || 'Unknown error';
    
    console.error(`[FINGERPRINT HELPER] ❌ Fingerprint history fetch failed:`, {
      status: response.status(),
      error: errorMessage,
      businessId,
    });
    
    throw new Error(`Failed to fetch fingerprint history (${response.status()}): ${errorMessage}`);
  }

  const historyData = await response.json();
  const history = historyData.history || [];
  console.log(`[FINGERPRINT HELPER] ✓ Fingerprint history fetched: ${history.length} points`);
  return history;
}

/**
 * Verify visibility score calculation
 * 
 * Returns: Visibility score verification result
 */
export function verifyVisibilityScoreCalculation(
  fingerprint: FingerprintDTO
): VisibilityScoreVerification {
  const issues: string[] = [];
  
  // Check visibility score is valid number
  if (typeof fingerprint.visibilityScore !== 'number') {
    issues.push('Visibility score is not a number');
  } else {
    // Check visibility score is in valid range
    if (fingerprint.visibilityScore < 0 || fingerprint.visibilityScore > 100) {
      issues.push(`Visibility score out of range: ${fingerprint.visibilityScore} (expected: 0-100)`);
    }
  }
  
  // Check trend is valid
  if (!['up', 'down', 'neutral'].includes(fingerprint.trend)) {
    issues.push(`Invalid trend value: ${fingerprint.trend}`);
  }
  
  // Check summary data if available
  if (fingerprint.summary) {
    if (fingerprint.summary.mentionRate !== undefined) {
      if (typeof fingerprint.summary.mentionRate !== 'number') {
        issues.push('Mention rate is not a number');
      } else if (fingerprint.summary.mentionRate < 0 || fingerprint.summary.mentionRate > 100) {
        issues.push(`Mention rate out of range: ${fingerprint.summary.mentionRate} (expected: 0-100)`);
      }
    }
    
    if (fingerprint.summary.sentimentScore !== undefined) {
      if (typeof fingerprint.summary.sentimentScore !== 'number') {
        issues.push('Sentiment score is not a number');
      } else if (fingerprint.summary.sentimentScore < 0 || fingerprint.summary.sentimentScore > 100) {
        issues.push(`Sentiment score out of range: ${fingerprint.summary.sentimentScore} (expected: 0-100)`);
      }
    }
    
    if (fingerprint.summary.averageRank !== undefined && fingerprint.summary.averageRank !== null) {
      if (typeof fingerprint.summary.averageRank !== 'number') {
        issues.push('Average rank is not a number');
      } else if (fingerprint.summary.averageRank < 1) {
        issues.push(`Average rank out of range: ${fingerprint.summary.averageRank} (expected: >= 1)`);
      }
    }
    // Note: null is valid for averageRank (business may not have ranking data yet)
  }
  
  return {
    isValid: issues.length === 0,
    issues,
  };
}

/**
 * Verify trend calculation
 * 
 * Checks if trend is calculated from historical fingerprints (not hardcoded)
 * 
 * Returns: Trend verification result
 */
export function verifyTrendCalculation(
  history: FingerprintHistoryPoint[],
  dashboardDTO?: any
): TrendVerification {
  const issues: string[] = [];
  
  // Check if trendValue is hardcoded to 0
  if (dashboardDTO?.trendValue === 0 && history.length > 0) {
    issues.push('trendValue is hardcoded to 0 - should calculate from historical fingerprints');
  }
  
  // Check if trend can be calculated from history
  if (history.length >= 2) {
    const sortedHistory = [...history].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    
    const firstScore = sortedHistory[0].visibilityScore;
    const lastScore = sortedHistory[sortedHistory.length - 1].visibilityScore;
    const calculatedTrend = lastScore - firstScore;
    
    // If trendValue exists, it should match calculated trend
    if (dashboardDTO?.trendValue !== undefined && dashboardDTO.trendValue !== calculatedTrend) {
      issues.push(
        `trendValue mismatch: calculated ${calculatedTrend}, DTO has ${dashboardDTO.trendValue}`
      );
    }
    
    // Verify trend direction matches calculated trend
    if (dashboardDTO?.trend) {
      const expectedTrend = calculatedTrend > 0 ? 'up' : calculatedTrend < 0 ? 'down' : 'neutral';
      if (dashboardDTO.trend !== expectedTrend) {
        issues.push(
          `Trend direction mismatch: calculated ${expectedTrend}, DTO has ${dashboardDTO.trend}`
        );
      }
    }
  } else if (history.length === 1 && dashboardDTO?.trendValue !== 0) {
    // Single fingerprint should have trendValue of 0 (no change)
    issues.push('Single fingerprint should have trendValue of 0');
  }
  
  return {
    isValid: issues.length === 0,
    issues,
  };
}

/**
 * Calculate trend from history
 * 
 * Returns: Calculated trend value and direction
 */
export function calculateTrendFromHistory(
  history: FingerprintHistoryPoint[]
): { trendValue: number; trend: 'up' | 'down' | 'neutral' } {
  if (history.length === 0) {
    return { trendValue: 0, trend: 'neutral' };
  }
  
  if (history.length === 1) {
    return { trendValue: 0, trend: 'neutral' };
  }
  
  const sortedHistory = [...history].sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  
  const firstScore = sortedHistory[0].visibilityScore;
  const lastScore = sortedHistory[sortedHistory.length - 1].visibilityScore;
  const trendValue = lastScore - firstScore;
  
  const trend: 'up' | 'down' | 'neutral' = 
    trendValue > 0 ? 'up' : trendValue < 0 ? 'down' : 'neutral';
  
  return { trendValue, trend };
}

