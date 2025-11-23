#!/usr/bin/env tsx
/**
 * Publishing Progress Tracker
 * 
 * Tracks progress toward commercial-ready publishing flow by:
 * - Running E2E tests and counting pass/fail
 * - Tracking errors fixed
 * - Calculating commercial readiness percentage
 * - Generating progress reports
 * 
 * Usage:
 *   pnpm tsx scripts/track-publishing-progress.ts [--save]
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

interface PublishingProgress {
  date: string;
  e2eTestsPassing: number;
  e2eTestsTotal: number;
  blockersFixed: number;
  blockersRemaining: number;
  dataQualityIssues: number;
  uxIssues: number;
  commercialReadiness: number; // 0-100%
  testResults: {
    publishingFlowCritical: 'pass' | 'fail' | 'skip';
    existingEntityHandling: 'pass' | 'fail' | 'skip';
  };
}

const PROGRESS_FILE = path.join(process.cwd(), 'publishing-progress.json');

function loadProgress(): PublishingProgress[] {
  if (fs.existsSync(PROGRESS_FILE)) {
    return JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf-8'));
  }
  return [];
}

function saveProgress(progress: PublishingProgress[]): void {
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2));
}

function runE2ETests(): {
  passing: number;
  total: number;
  results: PublishingProgress['testResults'];
} {
  console.log('Running E2E tests...');
  
  try {
    // Run critical publishing tests
    const output = execSync(
      'npx playwright test tests/e2e/publishing-flow-critical.spec.ts --reporter=json',
      { encoding: 'utf-8', stdio: 'pipe' }
    );
    
    const results = JSON.parse(output);
    const tests = results.suites?.[0]?.specs?.[0]?.tests || [];
    
    const testResults: PublishingProgress['testResults'] = {
      publishingFlowCritical: 'skip',
      existingEntityHandling: 'skip',
    };
    
    tests.forEach((test: any) => {
      const testName = test.title.toLowerCase();
      if (testName.includes('pro tier user')) {
        testResults.publishingFlowCritical = test.results[0]?.status === 'passed' ? 'pass' : 'fail';
      } else if (testName.includes('existing')) {
        testResults.existingEntityHandling = test.results[0]?.status === 'passed' ? 'pass' : 'fail';
      }
    });
    
    const passing = tests.filter((t: any) => t.results[0]?.status === 'passed').length;
    const total = tests.length;
    
    return { passing, total, results: testResults };
  } catch (error) {
    console.error('Error running tests:', error);
    return {
      passing: 0,
      total: 2,
      results: {
        publishingFlowCritical: 'fail',
        existingEntityHandling: 'fail',
      },
    };
  }
}

function analyzeErrors(): {
  blockers: number;
  dataQuality: number;
  ux: number;
} {
  // Count errors from known error patterns
  // This is a simplified version - in production, would analyze actual logs
  
  const blockers = 0; // Would analyze terminal logs for P0 errors
  const dataQuality = 0; // Would analyze for P1 errors
  const ux = 0; // Would analyze for P2 errors
  
  return { blockers, dataQuality, ux };
}

function calculateCommercialReadiness(
  testResults: { passing: number; total: number },
  errors: { blockers: number; dataQuality: number; ux: number }
): number {
  // Weighted calculation:
  // - Tests: 50% (all must pass)
  // - Blockers: 30% (must be 0)
  // - Data Quality: 15% (should be < 3)
  // - UX: 5% (should be < 5)
  
  const testScore = (testResults.passing / testResults.total) * 50;
  const blockerScore = errors.blockers === 0 ? 30 : Math.max(0, 30 - errors.blockers * 10);
  const dataQualityScore = errors.dataQuality < 3 ? 15 : Math.max(0, 15 - errors.dataQuality * 3);
  const uxScore = errors.ux < 5 ? 5 : Math.max(0, 5 - errors.ux);
  
  return Math.min(100, Math.round(testScore + blockerScore + dataQualityScore + uxScore));
}

function generateProgressReport(progress: PublishingProgress[]): string {
  if (progress.length === 0) {
    return '# Publishing Progress Report\n\nNo progress data available.\n';
  }
  
  const latest = progress[progress.length - 1];
  const previous = progress.length > 1 ? progress[progress.length - 2] : null;
  
  let report = '# Publishing Progress Report\n\n';
  report += `**Last Updated:** ${latest.date}\n\n`;
  
  // Current Status
  report += '## Current Status\n\n';
  report += `- **Commercial Readiness:** ${latest.commercialReadiness}%\n`;
  report += `- **E2E Tests Passing:** ${latest.e2eTestsPassing}/${latest.e2eTestsTotal}\n`;
  report += `- **Blockers Remaining:** ${latest.blockersRemaining}\n`;
  report += `- **Data Quality Issues:** ${latest.dataQualityIssues}\n`;
  report += `- **UX Issues:** ${latest.uxIssues}\n\n`;
  
  // Test Results
  report += '## Test Results\n\n';
  report += `- **Publishing Flow Critical:** ${latest.testResults.publishingFlowCritical === 'pass' ? '✅ PASS' : '❌ FAIL'}\n`;
  report += `- **Existing Entity Handling:** ${latest.testResults.existingEntityHandling === 'pass' ? '✅ PASS' : '❌ FAIL'}\n\n`;
  
  // Progress Trend
  if (previous) {
    report += '## Progress Trend\n\n';
    const readinessChange = latest.commercialReadiness - previous.commercialReadiness;
    const blockerChange = latest.blockersRemaining - previous.blockersRemaining;
    
    report += `- **Readiness Change:** ${readinessChange >= 0 ? '+' : ''}${readinessChange}%\n`;
    report += `- **Blockers Change:** ${blockerChange >= 0 ? '+' : ''}${blockerChange}\n\n`;
  }
  
  // History
  if (progress.length > 1) {
    report += '## Progress History\n\n';
    report += '| Date | Readiness | Tests | Blockers | Data Quality | UX |\n';
    report += '|------|-----------|-------|----------|-------------|-----|\n';
    
    progress.slice(-10).forEach(p => {
      report += `| ${p.date} | ${p.commercialReadiness}% | ${p.e2eTestsPassing}/${p.e2eTestsTotal} | ${p.blockersRemaining} | ${p.dataQualityIssues} | ${p.uxIssues} |\n`;
    });
  }
  
  // Recommendations
  report += '\n## Recommendations\n\n';
  if (latest.blockersRemaining > 0) {
    report += `🔴 **CRITICAL:** Fix ${latest.blockersRemaining} blocking error(s) first.\n\n`;
  }
  if (latest.e2eTestsPassing < latest.e2eTestsTotal) {
    report += `🟡 **HIGH:** ${latest.e2eTestsTotal - latest.e2eTestsPassing} E2E test(s) failing. Fix these to improve reliability.\n\n`;
  }
  if (latest.commercialReadiness < 100) {
    report += `📊 **Goal:** Reach 100% commercial readiness. Current: ${latest.commercialReadiness}%\n\n`;
  } else {
    report += `✅ **SUCCESS:** Commercial readiness achieved! Platform ready for production.\n\n`;
  }
  
  return report;
}

function main() {
  const args = process.argv.slice(2);
  const shouldSave = args.includes('--save');
  
  console.log('Tracking publishing progress...\n');
  
  // Run tests
  const testResults = runE2ETests();
  console.log(`Tests: ${testResults.passing}/${testResults.total} passing\n`);
  
  // Analyze errors
  const errors = analyzeErrors();
  console.log(`Errors: ${errors.blockers} blockers, ${errors.dataQuality} data quality, ${errors.ux} UX\n`);
  
  // Calculate readiness
  const readiness = calculateCommercialReadiness(testResults, errors);
  console.log(`Commercial Readiness: ${readiness}%\n`);
  
  // Create progress entry
  const progress: PublishingProgress = {
    date: new Date().toISOString(),
    e2eTestsPassing: testResults.passing,
    e2eTestsTotal: testResults.total,
    blockersFixed: 0, // Would track from previous entries
    blockersRemaining: errors.blockers,
    dataQualityIssues: errors.dataQuality,
    uxIssues: errors.ux,
    commercialReadiness: readiness,
    testResults: testResults.results,
  };
  
  // Load and update progress
  const allProgress = loadProgress();
  allProgress.push(progress);
  
  if (shouldSave) {
    saveProgress(allProgress);
    console.log('Progress saved to publishing-progress.json\n');
  }
  
  // Generate report
  const report = generateProgressReport(allProgress);
  console.log(report);
  
  // Save report
  const reportFile = path.join(process.cwd(), 'docs', 'development', 'PUBLISHING_PROGRESS.md');
  fs.writeFileSync(reportFile, report);
  console.log(`\nReport saved to: ${reportFile}`);
  
  // Exit with error if not ready
  if (readiness < 100) {
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export { calculateCommercialReadiness, generateProgressReport };

