#!/usr/bin/env tsx
/**
 * Terminal Log Analyzer
 * 
 * Analyzes terminal logs from development/testing to automatically identify:
 * - Errors and their categories (A/B/C)
 * - Priority levels (P0/P1/P2/P3)
 * - Suggested fixes
 * - Test cases to validate fixes
 * 
 * Usage:
 *   pnpm tsx scripts/analyze-terminal-logs.ts <log-file> [--output report.json]
 */

import * as fs from 'fs';
import * as path from 'path';

interface DetectedError {
  category: 'A' | 'B' | 'C';
  priority: 'P0' | 'P1' | 'P2' | 'P3';
  pattern: string;
  location: string;
  message: string;
  suggestedFix: string;
  testCase: string;
  lineNumber: number;
}

interface LogAnalysis {
  errors: DetectedError[];
  warnings: string[];
  recommendations: string[];
  testCases: string[];
  summary: {
    totalErrors: number;
    blockers: number;
    highPriority: number;
    mediumPriority: number;
    lowPriority: number;
  };
}

// Error patterns for publishing flow
const ERROR_PATTERNS: Array<{
  pattern: RegExp;
  category: 'A' | 'B' | 'C';
  priority: 'P0' | 'P1' | 'P2' | 'P3';
  location: string;
  suggestedFix: string;
  testCase: string;
}> = [
  // Category A: Publishing Blockers
  {
    pattern: /Login failed|authentication failed|invalid credentials|Wikidata.*login/i,
    category: 'A',
    priority: 'P0',
    location: 'lib/wikidata/client.ts',
    suggestedFix: 'Validate Wikidata credentials in environment variables. Add retry logic with exponential backoff.',
    testCase: "test('should handle Wikidata authentication failure gracefully', async () => { /* ... */ });",
  },
  {
    pattern: /ON CONFLICT|unique constraint|exclusion constraint|qid_cache/i,
    category: 'A',
    priority: 'P0',
    location: 'lib/wikidata/sparql.ts',
    suggestedFix: 'Verify database migration for qid_cache unique constraint. Restart server after migration.',
    testCase: "test('should handle QID cache conflicts', async () => { /* ... */ });",
  },
  {
    pattern: /already has label|duplicate entity|conflict.*label|Item.*already/i,
    category: 'A',
    priority: 'P0',
    location: 'lib/wikidata/client.ts',
    suggestedFix: 'Check for existing Wikidata entity before creating. Use updateEntity() instead of createEntity() for existing entities.',
    testCase: "test('should handle existing entity gracefully', async () => { /* ... */ });",
  },
  {
    pattern: /Publication failed|publish.*failed|wikidata.*error/i,
    category: 'A',
    priority: 'P0',
    location: 'lib/wikidata/service.ts',
    suggestedFix: 'Check Wikidata API response for specific error. Add detailed error logging. Implement retry logic.',
    testCase: "test('should retry failed publishes', async () => { /* ... */ });",
  },
  
  // Category B: Data Quality Issues
  {
    pattern: /Unexpected token|not valid JSON|JSON parse error|SyntaxError.*JSON/i,
    category: 'B',
    priority: 'P1',
    location: 'lib/wikidata/entity-builder.ts',
    suggestedFix: 'Add robust JSON parsing with fallback. Extract JSON from LLM response text. Handle non-JSON responses gracefully.',
    testCase: "test('should parse LLM responses correctly', async () => { /* ... */ });",
  },
  {
    pattern: /only \d+ properties|target is \d+\+|property count.*low|missing.*properties/i,
    category: 'B',
    priority: 'P1',
    location: 'lib/wikidata/property-manager.ts',
    suggestedFix: 'Improve property extraction logic. Lower quality threshold. Add fallback properties. Enhance crawl data processing.',
    testCase: "test('should extract 10+ properties from crawl data', async () => { /* ... */ });",
  },
  {
    pattern: /missing property|P\d+ not found|P625|P6375|coordinates|address/i,
    category: 'B',
    priority: 'P1',
    location: 'lib/wikidata/entity-builder.ts',
    suggestedFix: 'Improve location data extraction from crawl data. Add geocoding fallback. Validate location data before entity building.',
    testCase: "test('should extract location properties (P625, P6375)', async () => { /* ... */ });",
  },
  
  // Category C: UX and Polish
  {
    pattern: /wrong.*message|incorrect.*status|UI.*error|upgrade.*publish/i,
    category: 'C',
    priority: 'P2',
    location: 'components/business/*.tsx',
    suggestedFix: 'Check isPro and canPublish flags before showing messages. Update UI components to reflect actual status.',
    testCase: "test('should show correct status for Pro tier users', async () => { /* ... */ });",
  },
  {
    pattern: /invalid.*competitor|extraction.*error|competitor.*name/i,
    category: 'C',
    priority: 'P2',
    location: 'lib/llm/response-analyzer.ts',
    suggestedFix: 'Improve competitor name extraction. Add validation to filter out non-business names. Use stricter regex patterns.',
    testCase: "test('should extract valid competitor names', async () => { /* ... */ });",
  },
];

function analyzeLogs(logContent: string): LogAnalysis {
  const lines = logContent.split('\n');
  const errors: DetectedError[] = [];
  const warnings: string[] = [];
  const recommendations: string[] = [];
  const testCases: string[] = [];

  lines.forEach((line, index) => {
    // Check for error patterns
    for (const errorPattern of ERROR_PATTERNS) {
      if (errorPattern.pattern.test(line)) {
        errors.push({
          category: errorPattern.category,
          priority: errorPattern.priority,
          pattern: errorPattern.pattern.source,
          location: errorPattern.location,
          message: line.trim(),
          suggestedFix: errorPattern.suggestedFix,
          testCase: errorPattern.testCase,
          lineNumber: index + 1,
        });
        
        // Add test case if not already present
        if (!testCases.includes(errorPattern.testCase)) {
          testCases.push(errorPattern.testCase);
        }
      }
    }
    
    // Check for warnings (lines with ⚠️ or WARN)
    if (/⚠️|WARN|warning/i.test(line) && !/test|spec/i.test(line)) {
      warnings.push(line.trim());
    }
  });

  // Generate recommendations
  const blockers = errors.filter(e => e.priority === 'P0');
  if (blockers.length > 0) {
    recommendations.push(`🔴 CRITICAL: ${blockers.length} blocking errors found. Fix these first before proceeding.`);
  }
  
  const highPriority = errors.filter(e => e.priority === 'P1');
  if (highPriority.length > 0) {
    recommendations.push(`🟡 HIGH: ${highPriority.length} high-priority data quality issues. Fix after blockers.`);
  }

  // Summary
  const summary = {
    totalErrors: errors.length,
    blockers: blockers.length,
    highPriority: highPriority.length,
    mediumPriority: errors.filter(e => e.priority === 'P2').length,
    lowPriority: errors.filter(e => e.priority === 'P3').length,
  };

  return {
    errors,
    warnings: [...new Set(warnings)], // Deduplicate
    recommendations,
    testCases: [...new Set(testCases)], // Deduplicate
    summary,
  };
}

function generateReport(analysis: LogAnalysis): string {
  let report = '# Terminal Log Analysis Report\n\n';
  report += `**Generated:** ${new Date().toISOString()}\n\n`;
  
  // Summary
  report += '## Summary\n\n';
  report += `- **Total Errors:** ${analysis.summary.totalErrors}\n`;
  report += `- **Blockers (P0):** ${analysis.summary.blockers}\n`;
  report += `- **High Priority (P1):** ${analysis.summary.highPriority}\n`;
  report += `- **Medium Priority (P2):** ${analysis.summary.mediumPriority}\n`;
  report += `- **Low Priority (P3):** ${analysis.summary.lowPriority}\n\n`;
  
  // Recommendations
  if (analysis.recommendations.length > 0) {
    report += '## Recommendations\n\n';
    analysis.recommendations.forEach(rec => {
      report += `- ${rec}\n`;
    });
    report += '\n';
  }
  
  // Errors by priority
  const errorsByPriority = {
    P0: analysis.errors.filter(e => e.priority === 'P0'),
    P1: analysis.errors.filter(e => e.priority === 'P1'),
    P2: analysis.errors.filter(e => e.priority === 'P2'),
    P3: analysis.errors.filter(e => e.priority === 'P3'),
  };
  
  ['P0', 'P1', 'P2', 'P3'].forEach(priority => {
    const errors = errorsByPriority[priority as keyof typeof errorsByPriority];
    if (errors.length === 0) return;
    
    report += `## ${priority} Errors (${errors.length})\n\n`;
    errors.forEach((error, index) => {
      report += `### ${index + 1}. ${error.category} - ${error.location}\n\n`;
      report += `**Line:** ${error.lineNumber}\n\n`;
      report += `**Message:**\n\`\`\`\n${error.message}\n\`\`\`\n\n`;
      report += `**Suggested Fix:**\n${error.suggestedFix}\n\n`;
      report += `**Test Case:**\n\`\`\`typescript\n${error.testCase}\n\`\`\`\n\n`;
    });
  });
  
  // Test cases
  if (analysis.testCases.length > 0) {
    report += '## Generated Test Cases\n\n';
    analysis.testCases.forEach((testCase, index) => {
      report += `${index + 1}. \`\`\`typescript\n${testCase}\n\`\`\`\n\n`;
    });
  }
  
  return report;
}

// Main execution
function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.error('Usage: pnpm tsx scripts/analyze-terminal-logs.ts <log-file> [--output report.md]');
    process.exit(1);
  }
  
  const logFile = args[0];
  const outputFlagIndex = args.indexOf('--output');
  const outputFile = outputFlagIndex !== -1 ? args[outputFlagIndex + 1] : null;
  
  if (!fs.existsSync(logFile)) {
    console.error(`Error: Log file not found: ${logFile}`);
    process.exit(1);
  }
  
  console.log(`Analyzing log file: ${logFile}...`);
  const logContent = fs.readFileSync(logFile, 'utf-8');
  const analysis = analyzeLogs(logContent);
  const report = generateReport(analysis);
  
  if (outputFile) {
    fs.writeFileSync(outputFile, report);
    console.log(`Report written to: ${outputFile}`);
  } else {
    console.log(report);
  }
  
  // Exit with error code if blockers found
  if (analysis.summary.blockers > 0) {
    console.error(`\n❌ ${analysis.summary.blockers} blocking errors found!`);
    process.exit(1);
  }
  
  console.log(`\n✅ Analysis complete. ${analysis.summary.totalErrors} errors found.`);
}

if (require.main === module) {
  main();
}

export { analyzeLogs, generateReport };

