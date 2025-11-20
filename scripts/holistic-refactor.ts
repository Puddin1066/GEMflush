#!/usr/bin/env tsx
/**
 * Holistic Refactoring Script
 * 
 * Automated, agent-guided refactoring tool for the GEMflush codebase.
 * Systematically cleans, simplifies, and improves the backend while preserving
 * functional behavior and avoiding accidental deletion of still-needed logic.
 * 
 * Based on:
 * - Holistic_Refactoring_Script.md
 * - docs/reference/CONTRACTS_SCHEMAS_VALIDATION.md
 * - docs/development/LIB_CLEANUP_ANALYSIS.md
 * - docs/reference/ENDPOINTS_REFERENCE.md
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

// ============================================================================
// Types & Interfaces
// ============================================================================

interface FileAnalysis {
  path: string;
  relativePath: string;
  exports: string[];
  imports: ImportInfo[];
  functions: FunctionInfo[];
  isUsed: boolean;
  usageCount: number;
  issues: string[];
  action: Action;
  reason: string;
}

interface ImportInfo {
  from: string;
  imports: string[];
  isInternal: boolean;
  isExternal: boolean;
}

interface FunctionInfo {
  name: string;
  line: number;
  isExported: boolean;
  isUsed: boolean;
  usageCount: number;
}

type Action = 'keep' | 'refactor' | 'deprecate' | 'archive' | 'remove';

interface RefactoringReport {
  timestamp: string;
  filesAnalyzed: number;
  filesToKeep: number;
  filesToRefactor: number;
  filesToDeprecate: number;
  filesToArchive: number;
  filesToRemove: number;
  changes: FileAnalysis[];
  summary: {
    redundantCode: string[];
    unusedCode: string[];
    contractViolations: string[];
    validationGaps: string[];
  };
}

// ============================================================================
// Core CFP Workflow Dependencies (from LIB_CLEANUP_ANALYSIS.md)
// ============================================================================

const CRITICAL_CFP_FILES = new Set([
  // Crawl (C)
  'lib/crawler/index.ts',
  'lib/llm/openrouter.ts',
  'lib/validation/crawl.ts',
  'lib/services/business-processing.ts',
  
  // Fingerprint (F)
  'lib/llm/fingerprinter.ts',
  'lib/types/gemflush.ts',
  
  // Publish (P)
  'lib/wikidata/entity-builder.ts',
  'lib/wikidata/publisher.ts',
  'lib/wikidata/sparql.ts',
  'lib/wikidata/notability-checker.ts',
  'lib/validation/wikidata.ts',
  'lib/services/scheduler-service.ts',
  'lib/data/wikidata-dto.ts',
  
  // Core Infrastructure
  'lib/db/schema.ts',
  'lib/db/queries.ts',
  'lib/db/drizzle.ts',
  'lib/types/service-contracts.ts',
  'lib/types/wikidata-contract.ts',
  'lib/validation/business.ts',
  'lib/services/automation-service.ts',
]);

const QUESTIONABLE_FILES = new Set([
  'lib/wikidata/tiered-entity-builder.ts',
  'lib/wikidata/manual-publish-storage.ts',
  'lib/services/monthly-processing.ts',
  'lib/utils.ts', // Duplicate of lib/utils/cn.ts
]);

const REDUNDANT_FILES = new Set([
  'lib/utils.ts', // Duplicate of lib/utils/cn.ts
]);

// ============================================================================
// Service Contracts (from CONTRACTS_SCHEMAS_VALIDATION.md)
// ============================================================================

const SERVICE_CONTRACTS = {
  'IWebCrawler': 'lib/crawler/index.ts',
  'ILLMFingerprinter': 'lib/llm/fingerprinter.ts',
  'IWikidataEntityBuilder': 'lib/wikidata/entity-builder.ts',
  'IWikidataPublisher': 'lib/wikidata/publisher.ts',
  'IOpenRouterClient': 'lib/llm/openrouter.ts',
  'IPaymentService': 'lib/payments/stripe.ts',
};

// ============================================================================
// Directory Traversal
// ============================================================================

function getAllTypeScriptFiles(dir: string, fileList: string[] = []): string[] {
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    // Skip node_modules, .next, coverage, test-results, etc.
    if (file.startsWith('.') || 
        file === 'node_modules' || 
        file === '.next' || 
        file === 'coverage' ||
        file === 'test-results' ||
        file === 'playwright-report' ||
        file === 'archive') {
      continue;
    }
    
    if (stat.isDirectory()) {
      getAllTypeScriptFiles(filePath, fileList);
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      // Skip test files for now (focus on source code)
      if (!file.includes('.test.') && !file.includes('.spec.')) {
        fileList.push(filePath);
      }
    }
  }
  
  return fileList;
}

// ============================================================================
// Code Analysis
// ============================================================================

function analyzeFile(filePath: string): FileAnalysis {
  const relativePath = path.relative(ROOT_DIR, filePath);
  const content = fs.readFileSync(filePath, 'utf-8');
  
  const exports = extractExports(content);
  const imports = extractImports(content);
  const functions = extractFunctions(content);
  
  const issues: string[] = [];
  let action: Action = 'keep';
  let reason = 'Active code';
  
  // Check if file is redundant
  if (REDUNDANT_FILES.has(relativePath)) {
    action = 'remove';
    reason = 'Redundant file (duplicate)';
    issues.push('Duplicate of another file');
  }
  
  // Check if file is questionable
  if (QUESTIONABLE_FILES.has(relativePath)) {
    action = 'deprecate';
    reason = 'Questionable usage - needs review';
    issues.push('Usage unclear - may be redundant');
  }
  
  // Check if file is critical CFP
  if (CRITICAL_CFP_FILES.has(relativePath)) {
    action = 'keep';
    reason = 'Critical CFP workflow dependency';
  }
  
  // Check for contract violations
  const contractViolations = checkContractCompliance(relativePath, content);
  if (contractViolations.length > 0) {
    issues.push(...contractViolations);
    if (action === 'keep') {
      action = 'refactor';
      reason = 'Contract compliance issues detected';
    }
  }
  
  // Check for validation gaps
  const validationGaps = checkValidationCoverage(relativePath, content);
  if (validationGaps.length > 0) {
    issues.push(...validationGaps);
  }
  
  // Check for unused exports
  const unusedExports = checkUnusedExports(relativePath, exports);
  if (unusedExports.length > 0 && action === 'keep') {
    issues.push(`Unused exports: ${unusedExports.join(', ')}`);
  }
  
  return {
    path: filePath,
    relativePath,
    exports,
    imports,
    functions,
    isUsed: exports.length > 0 || imports.length > 0,
    usageCount: 0, // Will be calculated later
    issues,
    action,
    reason,
  };
}

function extractExports(content: string): string[] {
  const exports: string[] = [];
  
  // Named exports: export function, export const, export class, export type, export interface
  const namedExportRegex = /export\s+(?:async\s+)?(?:function|const|class|type|interface|enum)\s+(\w+)/g;
  let match;
  while ((match = namedExportRegex.exec(content)) !== null) {
    exports.push(match[1]);
  }
  
  // Default exports
  if (content.includes('export default')) {
    exports.push('default');
  }
  
  // Export from statements
  const exportFromRegex = /export\s+\{[^}]+\}\s+from\s+['"]([^'"]+)['"]/g;
  while ((match = exportFromRegex.exec(content)) !== null) {
    // This is a re-export, we'll track the source
    exports.push(`* from ${match[1]}`);
  }
  
  return exports;
}

function extractImports(content: string): ImportInfo[] {
  const imports: ImportInfo[] = [];
  
  // Import statements
  const importRegex = /import\s+(?:(?:\*\s+as\s+\w+)|(?:\{[^}]+\})|(?:\w+))\s+from\s+['"]([^'"]+)['"]/g;
  let match;
  while ((match = importRegex.exec(content)) !== null) {
    const importPath = match[1];
    const isInternal = importPath.startsWith('@/') || importPath.startsWith('./') || importPath.startsWith('../');
    const isExternal = !isInternal;
    
    // Extract imported names
    const importNames: string[] = [];
    const namedImports = content.substring(Math.max(0, match.index - 50), match.index + match[0].length);
    const namedMatch = namedImports.match(/\{([^}]+)\}/);
    if (namedMatch) {
      importNames.push(...namedMatch[1].split(',').map(s => s.trim().split(' as ')[0].trim()));
    } else if (namedImports.includes('import *')) {
      importNames.push('*');
    } else {
      const defaultMatch = namedImports.match(/import\s+(\w+)/);
      if (defaultMatch) {
        importNames.push(defaultMatch[1]);
      }
    }
    
    imports.push({
      from: importPath,
      imports: importNames,
      isInternal,
      isExternal,
    });
  }
  
  return imports;
}

function extractFunctions(content: string): FunctionInfo[] {
  const functions: FunctionInfo[] = [];
  const lines = content.split('\n');
  
  lines.forEach((line, index) => {
    // Function declarations
    const funcMatch = line.match(/(?:export\s+)?(?:async\s+)?function\s+(\w+)/);
    if (funcMatch) {
      functions.push({
        name: funcMatch[1],
        line: index + 1,
        isExported: line.includes('export'),
        isUsed: false, // Will be calculated later
        usageCount: 0,
      });
    }
    
    // Arrow functions (const/export const)
    const arrowMatch = line.match(/(?:export\s+)?const\s+(\w+)\s*[:=]\s*(?:async\s+)?\(/);
    if (arrowMatch) {
      functions.push({
        name: arrowMatch[1],
        line: index + 1,
        isExported: line.includes('export'),
        isUsed: false,
        usageCount: 0,
      });
    }
    
    // Class methods
    const methodMatch = line.match(/(\w+)\s*\([^)]*\)\s*(?::\s*[^{]+)?\{/);
    if (methodMatch && line.includes('class')) {
      // This is a class method, we'll track it differently
    }
  });
  
  return functions;
}

// ============================================================================
// Contract & Validation Checks
// ============================================================================

function checkContractCompliance(filePath: string, content: string): string[] {
  const issues: string[] = [];
  const relativePath = path.relative(ROOT_DIR, filePath);
  
  // Check if file should implement a service contract
  for (const [contract, expectedPath] of Object.entries(SERVICE_CONTRACTS)) {
    if (relativePath === expectedPath) {
      // Check if contract is implemented
      if (!content.includes(`implements ${contract}`) && !content.includes(`: ${contract}`)) {
        issues.push(`Should implement ${contract} contract`);
      }
    }
  }
  
  // Check for any types
  if (content.includes(': any') || content.includes('as any')) {
    issues.push('Contains `any` types - should use proper types');
  }
  
  return issues;
}

function checkValidationCoverage(filePath: string, content: string): string[] {
  const issues: string[] = [];
  const relativePath = path.relative(ROOT_DIR, filePath);
  
  // API routes should use validation
  if (relativePath.startsWith('app/api/') && relativePath.endsWith('/route.ts')) {
    if (!content.includes('Schema') && !content.includes('validation') && !content.includes('parse(')) {
      issues.push('API route may be missing input validation');
    }
  }
  
  // Service functions that accept external data should validate
  if (relativePath.startsWith('lib/services/') || relativePath.startsWith('lib/wikidata/')) {
    if (content.includes('async function') || content.includes('export function')) {
      // Check if function accepts unknown/any parameters without validation
      const hasUnknownParams = content.match(/\([^)]*:\s*(?:unknown|any)/);
      if (hasUnknownParams && !content.includes('validate') && !content.includes('Schema')) {
        issues.push('Function accepts unvalidated unknown/any parameters');
      }
    }
  }
  
  return issues;
}

function checkUnusedExports(filePath: string, exports: string[]): string[] {
  // This is a simplified check - in a real implementation, we'd need to
  // search the entire codebase for usages
  // For now, we'll flag exports that seem unused based on naming patterns
  const unused: string[] = [];
  
  // This would require a full codebase scan - placeholder for now
  return unused;
}

// ============================================================================
// Refactoring Decisions
// ============================================================================

function determineRefactoringAction(analysis: FileAnalysis, allFiles: FileAnalysis[]): Action {
  // If already determined, keep it
  if (analysis.action !== 'keep') {
    return analysis.action;
  }
  
  // Check if file has issues that require refactoring
  if (analysis.issues.some(issue => 
    issue.includes('contract') || 
    issue.includes('validation') ||
    issue.includes('any types')
  )) {
    return 'refactor';
  }
  
  // Check if file is never imported
  const isImported = allFiles.some(file => 
    file.imports.some(imp => 
      imp.from.includes(analysis.relativePath.replace(/\.ts$/, ''))
    )
  );
  
  if (!isImported && analysis.exports.length === 0) {
    return 'deprecate';
  }
  
  return 'keep';
}

// ============================================================================
// Report Generation
// ============================================================================

function generateReport(analyses: FileAnalysis[]): RefactoringReport {
  const summary = {
    redundantCode: [] as string[],
    unusedCode: [] as string[],
    contractViolations: [] as string[],
    validationGaps: [] as string[],
  };
  
  analyses.forEach(analysis => {
    if (analysis.action === 'remove') {
      summary.redundantCode.push(analysis.relativePath);
    }
    if (analysis.action === 'deprecate' && analysis.usageCount === 0) {
      summary.unusedCode.push(analysis.relativePath);
    }
    analysis.issues.forEach(issue => {
      if (issue.includes('contract')) {
        summary.contractViolations.push(`${analysis.relativePath}: ${issue}`);
      }
      if (issue.includes('validation')) {
        summary.validationGaps.push(`${analysis.relativePath}: ${issue}`);
      }
    });
  });
  
  return {
    timestamp: new Date().toISOString(),
    filesAnalyzed: analyses.length,
    filesToKeep: analyses.filter(a => a.action === 'keep').length,
    filesToRefactor: analyses.filter(a => a.action === 'refactor').length,
    filesToDeprecate: analyses.filter(a => a.action === 'deprecate').length,
    filesToArchive: analyses.filter(a => a.action === 'archive').length,
    filesToRemove: analyses.filter(a => a.action === 'remove').length,
    changes: analyses,
    summary,
  };
}

// ============================================================================
// Main Execution
// ============================================================================

function main() {
  console.log('🔍 Starting holistic refactoring analysis...\n');
  
  // Get all TypeScript files in lib/ directory
  const libDir = path.join(ROOT_DIR, 'lib');
  const appApiDir = path.join(ROOT_DIR, 'app', 'api');
  
  console.log('📁 Scanning directories...');
  const libFiles = getAllTypeScriptFiles(libDir);
  const apiFiles = getAllTypeScriptFiles(appApiDir);
  const allFiles = [...libFiles, ...apiFiles];
  
  console.log(`   Found ${allFiles.length} TypeScript files\n`);
  
  // Analyze each file
  console.log('🔬 Analyzing files...');
  const analyses = allFiles.map(file => {
    process.stdout.write(`   ${path.relative(ROOT_DIR, file)}\r`);
    return analyzeFile(file);
  });
  console.log(`   Analyzed ${analyses.length} files\n`);
  
  // Determine final actions
  console.log('🎯 Determining refactoring actions...');
  const finalAnalyses = analyses.map(analysis => ({
    ...analysis,
    action: determineRefactoringAction(analysis, analyses),
  }));
  
  // Generate report
  const report = generateReport(finalAnalyses);
  
  // Print summary
  console.log('\n📊 REFACTORING SUMMARY\n');
  console.log(`Files Analyzed: ${report.filesAnalyzed}`);
  console.log(`  ✅ Keep: ${report.filesToKeep}`);
  console.log(`  🔧 Refactor: ${report.filesToRefactor}`);
  console.log(`  ⚠️  Deprecate: ${report.filesToDeprecate}`);
  console.log(`  📦 Archive: ${report.filesToArchive}`);
  console.log(`  🗑️  Remove: ${report.filesToRemove}`);
  
  // Print issues
  if (report.summary.redundantCode.length > 0) {
    console.log('\n🔴 Redundant Code:');
    report.summary.redundantCode.forEach(file => console.log(`   - ${file}`));
  }
  
  if (report.summary.unusedCode.length > 0) {
    console.log('\n🟡 Unused Code:');
    report.summary.unusedCode.forEach(file => console.log(`   - ${file}`));
  }
  
  if (report.summary.contractViolations.length > 0) {
    console.log('\n🟠 Contract Violations:');
    report.summary.contractViolations.slice(0, 10).forEach(issue => console.log(`   - ${issue}`));
    if (report.summary.contractViolations.length > 10) {
      console.log(`   ... and ${report.summary.contractViolations.length - 10} more`);
    }
  }
  
  if (report.summary.validationGaps.length > 0) {
    console.log('\n🟠 Validation Gaps:');
    report.summary.validationGaps.slice(0, 10).forEach(issue => console.log(`   - ${issue}`));
    if (report.summary.validationGaps.length > 10) {
      console.log(`   ... and ${report.summary.validationGaps.length - 10} more`);
    }
  }
  
  // Save detailed report
  const reportPath = path.join(ROOT_DIR, 'refactoring-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n💾 Detailed report saved to: ${reportPath}`);
  
  // Generate action plan
  generateActionPlan(report);
  
  console.log('\n✅ Analysis complete!\n');
}

function generateActionPlan(report: RefactoringReport) {
  const planPath = path.join(ROOT_DIR, 'REFACTORING_ACTION_PLAN.md');
  
  let plan = `# Refactoring Action Plan\n\n`;
  plan += `Generated: ${report.timestamp}\n\n`;
  plan += `## Summary\n\n`;
  plan += `- Files to Keep: ${report.filesToKeep}\n`;
  plan += `- Files to Refactor: ${report.filesToRefactor}\n`;
  plan += `- Files to Deprecate: ${report.filesToDeprecate}\n`;
  plan += `- Files to Archive: ${report.filesToArchive}\n`;
  plan += `- Files to Remove: ${report.filesToRemove}\n\n`;
  
  // Files to remove
  const toRemove = report.changes.filter(c => c.action === 'remove');
  if (toRemove.length > 0) {
    plan += `## 🗑️ Files to Remove\n\n`;
    toRemove.forEach(file => {
      plan += `### ${file.relativePath}\n`;
      plan += `- **Reason:** ${file.reason}\n`;
      plan += `- **Issues:** ${file.issues.join(', ')}\n\n`;
    });
  }
  
  // Files to deprecate
  const toDeprecate = report.changes.filter(c => c.action === 'deprecate');
  if (toDeprecate.length > 0) {
    plan += `## ⚠️ Files to Deprecate\n\n`;
    toDeprecate.forEach(file => {
      plan += `### ${file.relativePath}\n`;
      plan += `- **Reason:** ${file.reason}\n`;
      plan += `- **Issues:** ${file.issues.join(', ')}\n`;
      plan += `- **Action:** Add \`@deprecated\` JSDoc comments\n\n`;
    });
  }
  
  // Files to refactor
  const toRefactor = report.changes.filter(c => c.action === 'refactor');
  if (toRefactor.length > 0) {
    plan += `## 🔧 Files to Refactor\n\n`;
    toRefactor.forEach(file => {
      plan += `### ${file.relativePath}\n`;
      plan += `- **Reason:** ${file.reason}\n`;
      plan += `- **Issues:** ${file.issues.join(', ')}\n\n`;
    });
  }
  
  fs.writeFileSync(planPath, plan);
  console.log(`📋 Action plan saved to: ${planPath}`);
}

// Run if executed directly
// tsx will execute this when the file is run directly
main();

