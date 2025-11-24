/**
 * Wikidata Utility Functions
 * 
 * SOLID: Single Responsibility - utility functions only
 * DRY: Centralized utilities to avoid duplication
 */

/**
 * Check if QID is a mock/test QID
 * P1 Fix: Centralized mock QID detection
 * DRY: Reusable utility for mock QID detection
 * 
 * Mock QID range: Q999000000 - Q999999999 (clearly fake, won't match real entities)
 * 
 * @param qid - QID to check (e.g., "Q123456" or "Q999123456")
 * @returns true if QID is in mock range
 */
export function isMockQID(qid: string | null | undefined): boolean {
  if (!qid || !qid.startsWith('Q')) {
    return false;
  }
  
  // Extract numeric part
  const numericPart = qid.substring(1);
  const num = parseInt(numericPart, 10);
  
  // Mock QID range: Q999000000 - Q999999999
  return num >= 999000000 && num <= 999999999;
}

/**
 * Generate mock QID for testing
 * P1 Fix: Uses clearly fake range that won't match real entities
 * SOLID: Single Responsibility - mock QID generation only
 * 
 * @param production - If true, throws error (mocks not allowed in production)
 * @returns Mock QID in range Q999000000 - Q999999999
 */
export function generateMockQID(production: boolean = false): string {
  if (production) {
    throw new Error('Mock QIDs cannot be used in production');
  }
  
  // Use clearly fake range: Q999000000 - Q999999999
  const randomNum = Math.floor(Math.random() * 1000000) + 999000000;
  return `Q${randomNum}`;
}

/**
 * Normalize business name for Wikidata labels
 * DRY: Centralized name normalization (reused across entity builder and notability checker)
 * SOLID: Single Responsibility - name cleaning only
 * 
 * Removes patterns like:
 * - "Business Name 1763324055284" (timestamp suffix)
 * - "Business Name 123" (trailing numbers)
 * 
 * @param name - Raw business name (may include test timestamps)
 * @returns Cleaned name suitable for Wikidata labels
 */
export function normalizeBusinessName(name: string): string {
  // Remove trailing timestamps (13+ digit numbers) or shorter number sequences
  // Pattern: space followed by digits at the end
  return name.replace(/\s+\d{6,}$/, '').trim();
}


