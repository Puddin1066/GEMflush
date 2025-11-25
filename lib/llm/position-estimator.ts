/**
 * Position Estimation Utilities
 * DRY: Centralized logic for estimating competitor positions in LLM responses
 */

/**
 * Estimate competitor position in response (simplified heuristic)
 * DRY: Extracted from business-fingerprinter.ts
 */
export function estimateCompetitorPosition(response: string, competitorName: string): number | null {
  // Return null for empty competitor name (empty string matches everything)
  if (!competitorName || competitorName.trim().length === 0) {
    return null;
  }
  
  const lines = response.split('\n');
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.toLowerCase().includes(competitorName.toLowerCase())) {
      // Look for numbered list pattern
      const numberMatch = line.match(/^\s*(\d+)[\.\)]/);
      if (numberMatch) {
        const position = parseInt(numberMatch[1], 10);
        if (position >= 1 && position <= 10) {
          return position;
        }
      }
    }
  }
  
  return null;
}

