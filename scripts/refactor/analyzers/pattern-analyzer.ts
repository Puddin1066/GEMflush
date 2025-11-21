/**
 * Pattern Analyzer
 * 
 * Identifies anti-patterns, code smells, and refactoring opportunities
 * in TypeScript modules
 */

import * as ts from 'typescript';
import { promises as fs } from 'fs';

export interface AntiPattern {
  type: 'god_object' | 'feature_envy' | 'data_clumps' | 'long_parameter_list' | 'duplicate_code';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  location: {
    startLine: number;
    endLine: number;
    file: string;
  };
  suggestion: string;
  confidence: number;
}

export interface CodeSmell {
  type: 'large_class' | 'long_method' | 'dead_code' | 'magic_numbers' | 'inconsistent_naming';
  severity: 'low' | 'medium' | 'high';
  description: string;
  location: {
    startLine: number;
    endLine: number;
    file: string;
  };
  suggestion: string;
}

export interface RefactoringOpportunity {
  type: 'extract_method' | 'extract_class' | 'move_method' | 'consolidate_types' | 'extract_interface';
  priority: 'low' | 'medium' | 'high';
  description: string;
  estimatedEffort: 'small' | 'medium' | 'large';
  benefits: string[];
  location: {
    startLine: number;
    endLine: number;
    file: string;
  };
}

export interface DuplicateCode {
  similarity: number;
  locations: Array<{
    file: string;
    startLine: number;
    endLine: number;
    code: string;
  }>;
  suggestion: string;
}

export interface PatternAnalysis {
  filePath: string;
  antiPatterns: AntiPattern[];
  codeSmells: CodeSmell[];
  refactoringOpportunities: RefactoringOpportunity[];
  duplicateCode: DuplicateCode[];
  duplicateTypes: Array<{
    name: string;
    locations: Array<{
      file: string;
      line: number;
    }>;
  }>;
  utilityFunctions: Array<{
    name: string;
    location: {
      startLine: number;
      endLine: number;
    };
    complexity: number;
  }>;
  metrics: {
    codeQualityScore: number;
    maintainabilityIndex: number;
    technicalDebtRatio: number;
  };
}

export class PatternAnalyzer {
  private sourceFile: ts.SourceFile;
  private sourceText: string;
  private lines: string[];

  constructor(filePath: string, sourceText: string) {
    this.sourceText = sourceText;
    this.lines = sourceText.split('\n');
    this.sourceFile = ts.createSourceFile(
      filePath,
      sourceText,
      ts.ScriptTarget.Latest,
      true
    );
  }

  analyze(): PatternAnalysis {
    const antiPatterns = this.identifyAntiPatterns();
    const codeSmells = this.identifyCodeSmells();
    const refactoringOpportunities = this.identifyRefactoringOpportunities();
    const duplicateCode = this.findDuplicateCode();
    const duplicateTypes = this.findDuplicateTypes();
    const utilityFunctions = this.identifyUtilityFunctions();
    const metrics = this.calculateMetrics(antiPatterns, codeSmells);

    return {
      filePath: this.sourceFile.fileName,
      antiPatterns,
      codeSmells,
      refactoringOpportunities,
      duplicateCode,
      duplicateTypes,
      utilityFunctions,
      metrics
    };
  }

  private identifyAntiPatterns(): AntiPattern[] {
    const antiPatterns: AntiPattern[] = [];

    // Check for God Object pattern
    const godObjectPattern = this.checkGodObject();
    if (godObjectPattern) {
      antiPatterns.push(godObjectPattern);
    }

    // Check for Feature Envy
    antiPatterns.push(...this.checkFeatureEnvy());

    // Check for Data Clumps
    antiPatterns.push(...this.checkDataClumps());

    // Check for Long Parameter Lists
    antiPatterns.push(...this.checkLongParameterLists());

    // Check for Duplicate Code
    antiPatterns.push(...this.checkDuplicateCode());

    return antiPatterns;
  }

  private checkGodObject(): AntiPattern | null {
    const functions = this.getFunctions();
    const types = this.getTypes();
    const totalLines = this.lines.length;

    // God object indicators
    const tooManyFunctions = functions.length > 15;
    const tooManyTypes = types.length > 10;
    const tooManyLines = totalLines > 500;
    const mixedConcerns = this.hasMixedConcerns(functions);

    if ((tooManyFunctions && tooManyTypes) || (tooManyLines && mixedConcerns)) {
      return {
        type: 'god_object',
        severity: 'high',
        description: `Module has ${functions.length} functions, ${types.length} types, and ${totalLines} lines with mixed concerns`,
        location: {
          startLine: 1,
          endLine: totalLines,
          file: this.sourceFile.fileName
        },
        suggestion: 'Split module by concerns into smaller, focused modules',
        confidence: 0.8
      };
    }

    return null;
  }

  private checkFeatureEnvy(): AntiPattern[] {
    const antiPatterns: AntiPattern[] = [];
    const functions = this.getFunctions();

    functions.forEach(func => {
      const externalCalls = this.countExternalCalls(func.node);
      const internalCalls = this.countInternalCalls(func.node);

      if (externalCalls > internalCalls * 2 && externalCalls > 5) {
        const start = this.sourceFile.getLineAndCharacterOfPosition(func.node.getStart());
        const end = this.sourceFile.getLineAndCharacterOfPosition(func.node.getEnd());

        antiPatterns.push({
          type: 'feature_envy',
          severity: 'medium',
          description: `Function '${func.name}' makes ${externalCalls} external calls vs ${internalCalls} internal calls`,
          location: {
            startLine: start.line + 1,
            endLine: end.line + 1,
            file: this.sourceFile.fileName
          },
          suggestion: 'Consider moving this function closer to the data it operates on',
          confidence: 0.7
        });
      }
    });

    return antiPatterns;
  }

  private checkDataClumps(): AntiPattern[] {
    const antiPatterns: AntiPattern[] = [];
    const functions = this.getFunctions();
    const parameterGroups = new Map<string, Array<{ func: any; params: string[] }>>();

    // Group functions by similar parameter patterns
    functions.forEach(func => {
      if (func.parameters.length >= 3) {
        const paramTypes = func.parameters.map((p: any) => p.type?.getText() || 'any').sort().join(',');
        if (!parameterGroups.has(paramTypes)) {
          parameterGroups.set(paramTypes, []);
        }
        parameterGroups.get(paramTypes)!.push({
          func,
          params: func.parameters.map((p: any) => p.name?.getText() || 'unknown')
        });
      }
    });

    // Identify data clumps
    parameterGroups.forEach((group, paramTypes) => {
      if (group.length >= 2) {
        const start = this.sourceFile.getLineAndCharacterOfPosition(group[0].func.node.getStart());
        const end = this.sourceFile.getLineAndCharacterOfPosition(group[group.length - 1].func.node.getEnd());

        antiPatterns.push({
          type: 'data_clumps',
          severity: 'medium',
          description: `${group.length} functions share similar parameter patterns: ${paramTypes}`,
          location: {
            startLine: start.line + 1,
            endLine: end.line + 1,
            file: this.sourceFile.fileName
          },
          suggestion: 'Consider creating a parameter object or interface for these related parameters',
          confidence: 0.6
        });
      }
    });

    return antiPatterns;
  }

  private checkLongParameterLists(): AntiPattern[] {
    const antiPatterns: AntiPattern[] = [];
    const functions = this.getFunctions();

    functions.forEach(func => {
      if (func.parameters.length > 5) {
        const start = this.sourceFile.getLineAndCharacterOfPosition(func.node.getStart());
        const end = this.sourceFile.getLineAndCharacterOfPosition(func.node.getEnd());

        antiPatterns.push({
          type: 'long_parameter_list',
          severity: func.parameters.length > 8 ? 'high' : 'medium',
          description: `Function '${func.name}' has ${func.parameters.length} parameters`,
          location: {
            startLine: start.line + 1,
            endLine: end.line + 1,
            file: this.sourceFile.fileName
          },
          suggestion: 'Consider using a parameter object or breaking down the function',
          confidence: 0.9
        });
      }
    });

    return antiPatterns;
  }

  private checkDuplicateCode(): AntiPattern[] {
    const antiPatterns: AntiPattern[] = [];
    const duplicates = this.findDuplicateCode();

    duplicates.forEach(duplicate => {
      if (duplicate.similarity > 0.8 && duplicate.locations.length > 1) {
        antiPatterns.push({
          type: 'duplicate_code',
          severity: duplicate.similarity > 0.95 ? 'high' : 'medium',
          description: `${duplicate.locations.length} code blocks with ${Math.round(duplicate.similarity * 100)}% similarity`,
          location: {
            startLine: duplicate.locations[0].startLine,
            endLine: duplicate.locations[0].endLine,
            file: duplicate.locations[0].file
          },
          suggestion: duplicate.suggestion,
          confidence: duplicate.similarity
        });
      }
    });

    return antiPatterns;
  }

  private identifyCodeSmells(): CodeSmell[] {
    const codeSmells: CodeSmell[] = [];

    // Check for large classes/modules
    codeSmells.push(...this.checkLargeModule());

    // Check for long methods
    codeSmells.push(...this.checkLongMethods());

    // Check for dead code
    codeSmells.push(...this.checkDeadCode());

    // Check for magic numbers
    codeSmells.push(...this.checkMagicNumbers());

    // Check for inconsistent naming
    codeSmells.push(...this.checkInconsistentNaming());

    return codeSmells;
  }

  private checkLargeModule(): CodeSmell[] {
    const totalLines = this.lines.length;
    
    if (totalLines > 300) {
      return [{
        type: 'large_class',
        severity: totalLines > 500 ? 'high' : 'medium',
        description: `Module has ${totalLines} lines of code`,
        location: {
          startLine: 1,
          endLine: totalLines,
          file: this.sourceFile.fileName
        },
        suggestion: 'Consider splitting this module into smaller, more focused modules'
      }];
    }

    return [];
  }

  private checkLongMethods(): CodeSmell[] {
    const codeSmells: CodeSmell[] = [];
    const functions = this.getFunctions();

    functions.forEach(func => {
      const start = this.sourceFile.getLineAndCharacterOfPosition(func.node.getStart());
      const end = this.sourceFile.getLineAndCharacterOfPosition(func.node.getEnd());
      const lineCount = end.line - start.line + 1;

      if (lineCount > 50) {
        codeSmells.push({
          type: 'long_method',
          severity: lineCount > 100 ? 'high' : 'medium',
          description: `Function '${func.name}' has ${lineCount} lines`,
          location: {
            startLine: start.line + 1,
            endLine: end.line + 1,
            file: this.sourceFile.fileName
          },
          suggestion: 'Consider breaking this function into smaller, more focused functions'
        });
      }
    });

    return codeSmells;
  }

  private checkDeadCode(): CodeSmell[] {
    const codeSmells: CodeSmell[] = [];
    // Implementation for dead code detection would go here
    // This is complex and would require analyzing the entire codebase
    return codeSmells;
  }

  private checkMagicNumbers(): CodeSmell[] {
    const codeSmells: CodeSmell[] = [];
    const magicNumberRegex = /\b(?!0|1|2|10|100|1000)\d+\b/g;

    this.lines.forEach((line, index) => {
      const matches = line.match(magicNumberRegex);
      if (matches && matches.length > 0) {
        codeSmells.push({
          type: 'magic_numbers',
          severity: 'low',
          description: `Line contains magic numbers: ${matches.join(', ')}`,
          location: {
            startLine: index + 1,
            endLine: index + 1,
            file: this.sourceFile.fileName
          },
          suggestion: 'Consider extracting magic numbers into named constants'
        });
      }
    });

    return codeSmells;
  }

  private checkInconsistentNaming(): CodeSmell[] {
    const codeSmells: CodeSmell[] = [];
    const functions = this.getFunctions();
    
    // Check for inconsistent function naming patterns
    const namingPatterns = {
      camelCase: /^[a-z][a-zA-Z0-9]*$/,
      snake_case: /^[a-z][a-z0-9_]*$/,
      PascalCase: /^[A-Z][a-zA-Z0-9]*$/
    };

    const patternCounts = { camelCase: 0, snake_case: 0, PascalCase: 0 };

    functions.forEach(func => {
      for (const [pattern, regex] of Object.entries(namingPatterns)) {
        if (regex.test(func.name)) {
          patternCounts[pattern as keyof typeof patternCounts]++;
          break;
        }
      }
    });

    const dominantPattern = Object.entries(patternCounts)
      .reduce((a, b) => patternCounts[a[0] as keyof typeof patternCounts] > patternCounts[b[0] as keyof typeof patternCounts] ? a : b)[0];

    functions.forEach(func => {
      const followsDominantPattern = namingPatterns[dominantPattern as keyof typeof namingPatterns].test(func.name);
      
      if (!followsDominantPattern) {
        const start = this.sourceFile.getLineAndCharacterOfPosition(func.node.getStart());
        
        codeSmells.push({
          type: 'inconsistent_naming',
          severity: 'low',
          description: `Function '${func.name}' doesn't follow the dominant ${dominantPattern} naming pattern`,
          location: {
            startLine: start.line + 1,
            endLine: start.line + 1,
            file: this.sourceFile.fileName
          },
          suggestion: `Rename to follow ${dominantPattern} convention`
        });
      }
    });

    return codeSmells;
  }

  private identifyRefactoringOpportunities(): RefactoringOpportunity[] {
    const opportunities: RefactoringOpportunity[] = [];

    // Extract method opportunities
    opportunities.push(...this.identifyExtractMethodOpportunities());

    // Extract class opportunities
    opportunities.push(...this.identifyExtractClassOpportunities());

    // Move method opportunities
    opportunities.push(...this.identifyMoveMethodOpportunities());

    // Type consolidation opportunities
    opportunities.push(...this.identifyTypeConsolidationOpportunities());

    return opportunities;
  }

  private identifyExtractMethodOpportunities(): RefactoringOpportunity[] {
    const opportunities: RefactoringOpportunity[] = [];
    const functions = this.getFunctions();

    functions.forEach(func => {
      const start = this.sourceFile.getLineAndCharacterOfPosition(func.node.getStart());
      const end = this.sourceFile.getLineAndCharacterOfPosition(func.node.getEnd());
      const lineCount = end.line - start.line + 1;

      if (lineCount > 30) {
        opportunities.push({
          type: 'extract_method',
          priority: lineCount > 50 ? 'high' : 'medium',
          description: `Function '${func.name}' (${lineCount} lines) could be broken down into smaller methods`,
          estimatedEffort: lineCount > 100 ? 'large' : 'medium',
          benefits: [
            'Improved readability',
            'Better testability',
            'Reduced complexity',
            'Enhanced reusability'
          ],
          location: {
            startLine: start.line + 1,
            endLine: end.line + 1,
            file: this.sourceFile.fileName
          }
        });
      }
    });

    return opportunities;
  }

  private identifyExtractClassOpportunities(): RefactoringOpportunity[] {
    const opportunities: RefactoringOpportunity[] = [];
    const functions = this.getFunctions();
    const types = this.getTypes();

    if (functions.length > 10 && types.length > 5) {
      opportunities.push({
        type: 'extract_class',
        priority: 'medium',
        description: `Module with ${functions.length} functions and ${types.length} types could be split into classes`,
        estimatedEffort: 'large',
        benefits: [
          'Better organization',
          'Clearer responsibilities',
          'Improved maintainability'
        ],
        location: {
          startLine: 1,
          endLine: this.lines.length,
          file: this.sourceFile.fileName
        }
      });
    }

    return opportunities;
  }

  private identifyMoveMethodOpportunities(): RefactoringOpportunity[] {
    // Implementation would analyze method usage patterns
    return [];
  }

  private identifyTypeConsolidationOpportunities(): RefactoringOpportunity[] {
    const opportunities: RefactoringOpportunity[] = [];
    const duplicateTypes = this.findDuplicateTypes();

    if (duplicateTypes.length > 0) {
      opportunities.push({
        type: 'consolidate_types',
        priority: 'medium',
        description: `${duplicateTypes.length} duplicate type definitions found`,
        estimatedEffort: 'medium',
        benefits: [
          'Reduced duplication',
          'Consistent type definitions',
          'Easier maintenance'
        ],
        location: {
          startLine: 1,
          endLine: this.lines.length,
          file: this.sourceFile.fileName
        }
      });
    }

    return opportunities;
  }

  private findDuplicateCode(): DuplicateCode[] {
    // Simplified duplicate code detection
    // In a real implementation, this would use more sophisticated algorithms
    const duplicates: DuplicateCode[] = [];
    const codeBlocks = new Map<string, Array<{ startLine: number; endLine: number; code: string }>>();

    // Group similar code blocks
    for (let i = 0; i < this.lines.length - 5; i++) {
      const block = this.lines.slice(i, i + 5).join('\n').trim();
      if (block.length > 50) { // Only consider substantial blocks
        const normalized = this.normalizeCode(block);
        if (!codeBlocks.has(normalized)) {
          codeBlocks.set(normalized, []);
        }
        codeBlocks.get(normalized)!.push({
          startLine: i + 1,
          endLine: i + 5,
          code: block
        });
      }
    }

    // Find duplicates
    codeBlocks.forEach((blocks, normalizedCode) => {
      if (blocks.length > 1) {
        duplicates.push({
          similarity: 0.9, // Simplified similarity calculation
          locations: blocks.map(block => ({
            file: this.sourceFile.fileName,
            startLine: block.startLine,
            endLine: block.endLine,
            code: block.code
          })),
          suggestion: 'Extract common code into a shared function or utility'
        });
      }
    });

    return duplicates;
  }

  private normalizeCode(code: string): string {
    // Normalize code for comparison by removing whitespace and comments
    return code
      .replace(/\/\/.*$/gm, '') // Remove single-line comments
      .replace(/\/\*[\s\S]*?\*\//g, '') // Remove multi-line comments
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }

  private findDuplicateTypes(): Array<{ name: string; locations: Array<{ file: string; line: number }> }> {
    const types = this.getTypes();
    const typeMap = new Map<string, Array<{ file: string; line: number }>>();

    types.forEach(type => {
      const start = this.sourceFile.getLineAndCharacterOfPosition(type.getStart());
      
      if (!typeMap.has(type.name?.getText() || 'unknown')) {
        typeMap.set(type.name?.getText() || 'unknown', []);
      }
      
      typeMap.get(type.name?.getText() || 'unknown')!.push({
        file: this.sourceFile.fileName,
        line: start.line + 1
      });
    });

    return Array.from(typeMap.entries())
      .filter(([_, locations]) => locations.length > 1)
      .map(([name, locations]) => ({ name, locations }));
  }

  private identifyUtilityFunctions(): Array<{ name: string; location: { startLine: number; endLine: number }; complexity: number }> {
    const functions = this.getFunctions();
    const utilities: Array<{ name: string; location: { startLine: number; endLine: number }; complexity: number }> = [];

    functions.forEach(func => {
      // Identify utility functions by naming patterns
      const isUtility = /^(format|parse|convert|transform|calculate|generate|validate|sanitize|normalize)/.test(func.name) ||
                       func.name.includes('Util') || func.name.includes('Helper');

      if (isUtility) {
        const start = this.sourceFile.getLineAndCharacterOfPosition(func.node.getStart());
        const end = this.sourceFile.getLineAndCharacterOfPosition(func.node.getEnd());
        
        utilities.push({
          name: func.name,
          location: {
            startLine: start.line + 1,
            endLine: end.line + 1
          },
          complexity: this.calculateComplexity(func.node)
        });
      }
    });

    return utilities;
  }

  private calculateMetrics(antiPatterns: AntiPattern[], codeSmells: CodeSmell[]) {
    const totalIssues = antiPatterns.length + codeSmells.length;
    const criticalIssues = antiPatterns.filter(p => p.severity === 'critical').length;
    const highIssues = antiPatterns.filter(p => p.severity === 'high').length + 
                      codeSmells.filter(s => s.severity === 'high').length;

    // Simplified quality scoring
    const codeQualityScore = Math.max(0, 100 - (criticalIssues * 20 + highIssues * 10 + totalIssues * 2));
    const maintainabilityIndex = Math.max(0, 100 - (totalIssues * 5));
    const technicalDebtRatio = Math.min(100, (criticalIssues * 15 + highIssues * 10 + totalIssues * 3));

    return {
      codeQualityScore,
      maintainabilityIndex,
      technicalDebtRatio
    };
  }

  // Helper methods
  private getFunctions(): Array<{ name: string; node: ts.Node; parameters: ts.NodeArray<ts.ParameterDeclaration> }> {
    const functions: Array<{ name: string; node: ts.Node; parameters: ts.NodeArray<ts.ParameterDeclaration> }> = [];

    const visit = (node: ts.Node) => {
      if (ts.isFunctionDeclaration(node) && node.name) {
        functions.push({
          name: node.name.text,
          node,
          parameters: node.parameters
        });
      }
      ts.forEachChild(node, visit);
    };

    visit(this.sourceFile);
    return functions;
  }

  private getTypes(): ts.Node[] {
    const types: ts.Node[] = [];

    const visit = (node: ts.Node) => {
      if (ts.isInterfaceDeclaration(node) || ts.isTypeAliasDeclaration(node) || 
          ts.isEnumDeclaration(node) || ts.isClassDeclaration(node)) {
        types.push(node);
      }
      ts.forEachChild(node, visit);
    };

    visit(this.sourceFile);
    return types;
  }

  private hasMixedConcerns(functions: Array<{ name: string; node: ts.Node }>): boolean {
    const concerns = new Set<string>();
    
    functions.forEach(func => {
      const name = func.name.toLowerCase();
      if (name.includes('get') || name.includes('fetch')) concerns.add('data');
      if (name.includes('save') || name.includes('update')) concerns.add('persistence');
      if (name.includes('validate') || name.includes('check')) concerns.add('validation');
      if (name.includes('format') || name.includes('transform')) concerns.add('formatting');
      if (name.includes('execute') || name.includes('run')) concerns.add('execution');
    });

    return concerns.size > 2;
  }

  private countExternalCalls(node: ts.Node): number {
    let count = 0;
    
    const visit = (n: ts.Node) => {
      if (ts.isCallExpression(n)) {
        // Simplified external call detection
        const text = n.expression.getText();
        if (text.includes('.') && !text.startsWith('this.')) {
          count++;
        }
      }
      ts.forEachChild(n, visit);
    };

    visit(node);
    return count;
  }

  private countInternalCalls(node: ts.Node): number {
    let count = 0;
    
    const visit = (n: ts.Node) => {
      if (ts.isCallExpression(n)) {
        const text = n.expression.getText();
        if (!text.includes('.') || text.startsWith('this.')) {
          count++;
        }
      }
      ts.forEachChild(n, visit);
    };

    visit(node);
    return count;
  }

  private calculateComplexity(node: ts.Node): number {
    let complexity = 1;

    const visit = (n: ts.Node) => {
      switch (n.kind) {
        case ts.SyntaxKind.IfStatement:
        case ts.SyntaxKind.WhileStatement:
        case ts.SyntaxKind.ForStatement:
        case ts.SyntaxKind.ForInStatement:
        case ts.SyntaxKind.ForOfStatement:
        case ts.SyntaxKind.DoStatement:
        case ts.SyntaxKind.SwitchStatement:
        case ts.SyntaxKind.CatchClause:
        case ts.SyntaxKind.ConditionalExpression:
          complexity++;
          break;
      }
      ts.forEachChild(n, visit);
    };

    visit(node);
    return complexity;
  }
}

export async function analyzePatterns(filePath: string): Promise<PatternAnalysis> {
  try {
    const sourceText = await fs.readFile(filePath, 'utf8');
    const analyzer = new PatternAnalyzer(filePath, sourceText);
    return analyzer.analyze();
  } catch (error) {
    throw new Error(`Failed to analyze patterns for ${filePath}: ${error}`);
  }
}
