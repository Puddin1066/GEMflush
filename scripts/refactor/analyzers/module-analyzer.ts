/**
 * Module Analyzer
 * 
 * Analyzes TypeScript modules to identify structure, concerns, and refactoring opportunities
 */

import { promises as fs } from 'fs';
import * as ts from 'typescript';
import path from 'path';

export interface FunctionInfo {
  name: string;
  startLine: number;
  endLine: number;
  parameters: ParameterInfo[];
  returnType: string;
  isExported: boolean;
  isAsync: boolean;
  complexity: number;
  concerns: string[];
  code: string;
}

export interface ParameterInfo {
  name: string;
  type: string;
  isOptional: boolean;
}

export interface TypeInfo {
  name: string;
  kind: 'interface' | 'type' | 'enum' | 'class';
  startLine: number;
  endLine: number;
  isExported: boolean;
  properties: PropertyInfo[];
}

export interface PropertyInfo {
  name: string;
  type: string;
  isOptional: boolean;
}

export interface ImportInfo {
  module: string;
  imports: string[];
  isTypeOnly: boolean;
  line: number;
}

export interface ExportInfo {
  name: string;
  type: 'function' | 'type' | 'const' | 'class';
  isDefault: boolean;
  line: number;
}

export interface ConcernInfo {
  name: string;
  description: string;
  functions: FunctionInfo[];
  types: TypeInfo[];
  keywords: string[];
  confidence: number;
}

export interface ModuleAnalysis {
  filePath: string;
  linesOfCode: number;
  functions: FunctionInfo[];
  types: TypeInfo[];
  imports: ImportInfo[];
  exports: ExportInfo[];
  concerns: ConcernInfo[];
  complexity: {
    cyclomatic: number;
    cognitive: number;
  };
  issues: Issue[];
}

export interface Issue {
  type: 'mixed_concerns' | 'large_function' | 'complex_function' | 'missing_types' | 'duplicate_code';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  suggestion: string;
  line: number;
  endLine?: number;
}

export class ModuleAnalyzer {
  private sourceFile: ts.SourceFile;
  private sourceText: string;

  constructor(filePath: string, sourceText: string) {
    this.sourceText = sourceText;
    this.sourceFile = ts.createSourceFile(
      filePath,
      sourceText,
      ts.ScriptTarget.Latest,
      true
    );
  }

  analyze(): ModuleAnalysis {
    const functions = this.analyzeFunctions();
    const types = this.analyzeTypes();
    const imports = this.analyzeImports();
    const exports = this.analyzeExports();
    const concerns = this.identifyConcerns(functions, types);
    const complexity = this.calculateComplexity(functions);
    const issues = this.identifyIssues(functions, types, concerns);

    return {
      filePath: this.sourceFile.fileName,
      linesOfCode: this.sourceText.split('\n').length,
      functions,
      types,
      imports,
      exports,
      concerns,
      complexity,
      issues
    };
  }

  private analyzeFunctions(): FunctionInfo[] {
    const functions: FunctionInfo[] = [];

    const visit = (node: ts.Node) => {
      if (ts.isFunctionDeclaration(node) || ts.isMethodDeclaration(node) || ts.isArrowFunction(node)) {
        const functionInfo = this.extractFunctionInfo(node);
        if (functionInfo) {
          functions.push(functionInfo);
        }
      }
      ts.forEachChild(node, visit);
    };

    visit(this.sourceFile);
    return functions;
  }

  private extractFunctionInfo(node: ts.FunctionDeclaration | ts.MethodDeclaration | ts.ArrowFunction): FunctionInfo | null {
    const sourceFile = this.sourceFile;
    const start = sourceFile.getLineAndCharacterOfPosition(node.getStart());
    const end = sourceFile.getLineAndCharacterOfPosition(node.getEnd());
    
    let name = 'anonymous';
    if (ts.isFunctionDeclaration(node) && node.name) {
      name = node.name.text;
    } else if (ts.isMethodDeclaration(node) && ts.isIdentifier(node.name)) {
      name = node.name.text;
    }

    const parameters = this.extractParameters(node);
    const returnType = this.extractReturnType(node);
    const isExported = this.isExported(node);
    const isAsync = this.isAsync(node);
    const complexity = this.calculateFunctionComplexity(node);
    const concerns = this.identifyFunctionConcerns(node, name);
    const code = this.sourceText.substring(node.getStart(), node.getEnd());

    return {
      name,
      startLine: start.line + 1,
      endLine: end.line + 1,
      parameters,
      returnType,
      isExported,
      isAsync,
      complexity,
      concerns,
      code
    };
  }

  private extractParameters(node: ts.FunctionDeclaration | ts.MethodDeclaration | ts.ArrowFunction): ParameterInfo[] {
    if (!node.parameters) return [];

    return node.parameters.map(param => ({
      name: ts.isIdentifier(param.name) ? param.name.text : 'destructured',
      type: param.type ? param.type.getText() : 'any',
      isOptional: !!param.questionToken
    }));
  }

  private extractReturnType(node: ts.FunctionDeclaration | ts.MethodDeclaration | ts.ArrowFunction): string {
    if (node.type) {
      return node.type.getText();
    }
    return 'any';
  }

  private isExported(node: ts.Node): boolean {
    return node.modifiers?.some(mod => mod.kind === ts.SyntaxKind.ExportKeyword) || false;
  }

  private isAsync(node: ts.FunctionDeclaration | ts.MethodDeclaration | ts.ArrowFunction): boolean {
    return node.modifiers?.some(mod => mod.kind === ts.SyntaxKind.AsyncKeyword) || false;
  }

  private calculateFunctionComplexity(node: ts.Node): number {
    let complexity = 1; // Base complexity

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
        case ts.SyntaxKind.CaseClause:
          complexity++;
          break;
      }
      ts.forEachChild(n, visit);
    };

    visit(node);
    return complexity;
  }

  private identifyFunctionConcerns(node: ts.Node, functionName: string): string[] {
    const concerns: string[] = [];
    const code = node.getText();

    // Identify concerns based on function name and content
    const concernPatterns = {
      'decision': ['should', 'can', 'is', 'has', 'check', 'validate', 'determine'],
      'execution': ['execute', 'run', 'process', 'perform', 'handle', 'do'],
      'orchestration': ['orchestrate', 'coordinate', 'manage', 'control', 'start', 'auto'],
      'data': ['get', 'set', 'fetch', 'save', 'load', 'store', 'retrieve'],
      'utility': ['format', 'parse', 'convert', 'transform', 'calculate', 'generate']
    };

    for (const [concern, patterns] of Object.entries(concernPatterns)) {
      if (patterns.some(pattern => functionName.toLowerCase().includes(pattern))) {
        concerns.push(concern);
      }
    }

    // Additional content-based analysis
    if (code.includes('await') && code.includes('fetch')) {
      concerns.push('api');
    }
    if (code.includes('db.') || code.includes('query')) {
      concerns.push('database');
    }
    if (code.includes('throw') || code.includes('Error')) {
      concerns.push('error-handling');
    }

    return concerns.length > 0 ? concerns : ['general'];
  }

  private analyzeTypes(): TypeInfo[] {
    const types: TypeInfo[] = [];

    const visit = (node: ts.Node) => {
      if (ts.isInterfaceDeclaration(node) || ts.isTypeAliasDeclaration(node) || 
          ts.isEnumDeclaration(node) || ts.isClassDeclaration(node)) {
        const typeInfo = this.extractTypeInfo(node);
        if (typeInfo) {
          types.push(typeInfo);
        }
      }
      ts.forEachChild(node, visit);
    };

    visit(this.sourceFile);
    return types;
  }

  private extractTypeInfo(node: ts.InterfaceDeclaration | ts.TypeAliasDeclaration | ts.EnumDeclaration | ts.ClassDeclaration): TypeInfo | null {
    const sourceFile = this.sourceFile;
    const start = sourceFile.getLineAndCharacterOfPosition(node.getStart());
    const end = sourceFile.getLineAndCharacterOfPosition(node.getEnd());
    
    const name = node.name?.text || 'anonymous';
    const isExported = this.isExported(node);
    
    let kind: 'interface' | 'type' | 'enum' | 'class';
    let properties: PropertyInfo[] = [];

    if (ts.isInterfaceDeclaration(node)) {
      kind = 'interface';
      properties = this.extractInterfaceProperties(node);
    } else if (ts.isTypeAliasDeclaration(node)) {
      kind = 'type';
    } else if (ts.isEnumDeclaration(node)) {
      kind = 'enum';
    } else {
      kind = 'class';
      properties = this.extractClassProperties(node);
    }

    return {
      name,
      kind,
      startLine: start.line + 1,
      endLine: end.line + 1,
      isExported,
      properties
    };
  }

  private extractInterfaceProperties(node: ts.InterfaceDeclaration): PropertyInfo[] {
    return node.members.map(member => {
      if (ts.isPropertySignature(member) && ts.isIdentifier(member.name)) {
        return {
          name: member.name.text,
          type: member.type?.getText() || 'any',
          isOptional: !!member.questionToken
        };
      }
      return {
        name: 'unknown',
        type: 'any',
        isOptional: false
      };
    });
  }

  private extractClassProperties(node: ts.ClassDeclaration): PropertyInfo[] {
    return node.members
      .filter(ts.isPropertyDeclaration)
      .map(member => ({
        name: ts.isIdentifier(member.name) ? member.name.text : 'unknown',
        type: member.type?.getText() || 'any',
        isOptional: !!member.questionToken
      }));
  }

  private analyzeImports(): ImportInfo[] {
    const imports: ImportInfo[] = [];

    const visit = (node: ts.Node) => {
      if (ts.isImportDeclaration(node)) {
        const importInfo = this.extractImportInfo(node);
        if (importInfo) {
          imports.push(importInfo);
        }
      }
      ts.forEachChild(node, visit);
    };

    visit(this.sourceFile);
    return imports;
  }

  private extractImportInfo(node: ts.ImportDeclaration): ImportInfo | null {
    const moduleSpecifier = node.moduleSpecifier;
    if (!ts.isStringLiteral(moduleSpecifier)) return null;

    const module = moduleSpecifier.text;
    const isTypeOnly = !!node.importClause?.isTypeOnly;
    const line = this.sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1;

    let imports: string[] = [];
    
    if (node.importClause) {
      // Default import
      if (node.importClause.name) {
        imports.push(node.importClause.name.text);
      }
      
      // Named imports
      if (node.importClause.namedBindings && ts.isNamedImports(node.importClause.namedBindings)) {
        imports.push(...node.importClause.namedBindings.elements.map(el => el.name.text));
      }
      
      // Namespace import
      if (node.importClause.namedBindings && ts.isNamespaceImport(node.importClause.namedBindings)) {
        imports.push(node.importClause.namedBindings.name.text);
      }
    }

    return {
      module,
      imports,
      isTypeOnly,
      line
    };
  }

  private analyzeExports(): ExportInfo[] {
    const exports: ExportInfo[] = [];

    const visit = (node: ts.Node) => {
      if (ts.isExportDeclaration(node) || this.isExported(node)) {
        const exportInfo = this.extractExportInfo(node);
        if (exportInfo) {
          exports.push(exportInfo);
        }
      }
      ts.forEachChild(node, visit);
    };

    visit(this.sourceFile);
    return exports;
  }

  private extractExportInfo(node: ts.Node): ExportInfo | null {
    const line = this.sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1;
    
    if (ts.isFunctionDeclaration(node) && node.name) {
      return {
        name: node.name.text,
        type: 'function',
        isDefault: false,
        line
      };
    }
    
    if (ts.isVariableStatement(node)) {
      const declaration = node.declarationList.declarations[0];
      if (ts.isIdentifier(declaration.name)) {
        return {
          name: declaration.name.text,
          type: 'const',
          isDefault: false,
          line
        };
      }
    }

    return null;
  }

  private identifyConcerns(functions: FunctionInfo[], types: TypeInfo[]): ConcernInfo[] {
    const concernMap = new Map<string, {
      functions: FunctionInfo[];
      types: TypeInfo[];
      keywords: Set<string>;
    }>();

    // Group functions by their primary concerns
    functions.forEach(func => {
      const primaryConcern = func.concerns[0] || 'general';
      
      if (!concernMap.has(primaryConcern)) {
        concernMap.set(primaryConcern, {
          functions: [],
          types: [],
          keywords: new Set()
        });
      }

      const concern = concernMap.get(primaryConcern)!;
      concern.functions.push(func);
      func.concerns.forEach(c => concern.keywords.add(c));
    });

    // Group types by naming patterns
    types.forEach(type => {
      const concernName = this.inferTypeConcern(type.name);
      
      if (!concernMap.has(concernName)) {
        concernMap.set(concernName, {
          functions: [],
          types: [],
          keywords: new Set()
        });
      }

      concernMap.get(concernName)!.types.push(type);
    });

    // Convert to ConcernInfo array
    return Array.from(concernMap.entries()).map(([name, data]) => ({
      name,
      description: this.generateConcernDescription(name, data.functions.length, data.types.length),
      functions: data.functions,
      types: data.types,
      keywords: Array.from(data.keywords),
      confidence: this.calculateConcernConfidence(data.functions, data.types)
    }));
  }

  private inferTypeConcern(typeName: string): string {
    const name = typeName.toLowerCase();
    
    if (name.includes('result') || name.includes('response')) return 'execution';
    if (name.includes('context') || name.includes('config')) return 'orchestration';
    if (name.includes('decision') || name.includes('check')) return 'decision';
    if (name.includes('data') || name.includes('entity')) return 'data';
    
    return 'general';
  }

  private generateConcernDescription(name: string, functionCount: number, typeCount: number): string {
    const descriptions = {
      'decision': 'Handles decision-making logic and validation',
      'execution': 'Executes business operations and processes',
      'orchestration': 'Coordinates and manages complex workflows',
      'data': 'Manages data access and manipulation',
      'utility': 'Provides utility functions and helpers',
      'api': 'Handles API communication and external services',
      'database': 'Manages database operations and queries',
      'error-handling': 'Handles errors and exceptions',
      'general': 'General purpose functionality'
    };

    const baseDescription = descriptions[name as keyof typeof descriptions] || descriptions.general;
    return `${baseDescription} (${functionCount} functions, ${typeCount} types)`;
  }

  private calculateConcernConfidence(functions: FunctionInfo[], types: TypeInfo[]): number {
    // Calculate confidence based on function naming consistency and grouping
    if (functions.length === 0) return 0;
    
    const totalItems = functions.length + types.length;
    const concernConsistency = functions.filter(f => 
      f.concerns.length > 0 && f.concerns[0] !== 'general'
    ).length / functions.length;
    
    return Math.min(0.9, concernConsistency * (totalItems / 10));
  }

  private calculateComplexity(functions: FunctionInfo[]): { cyclomatic: number; cognitive: number } {
    const cyclomatic = functions.reduce((sum, func) => sum + func.complexity, 0);
    const cognitive = cyclomatic * 1.2; // Simplified cognitive complexity estimation
    
    return { cyclomatic, cognitive };
  }

  private identifyIssues(functions: FunctionInfo[], types: TypeInfo[], concerns: ConcernInfo[]): Issue[] {
    const issues: Issue[] = [];

    // Check for mixed concerns
    if (concerns.length > 3) {
      issues.push({
        type: 'mixed_concerns',
        severity: 'high',
        description: `Module has ${concerns.length} different concerns, consider splitting`,
        suggestion: 'Split module by concerns into separate files',
        line: 1
      });
    }

    // Check for large functions
    functions.forEach(func => {
      const lineCount = func.endLine - func.startLine + 1;
      if (lineCount > 50) {
        issues.push({
          type: 'large_function',
          severity: 'medium',
          description: `Function '${func.name}' is ${lineCount} lines long`,
          suggestion: 'Consider breaking down into smaller functions',
          line: func.startLine,
          endLine: func.endLine
        });
      }

      if (func.complexity > 10) {
        issues.push({
          type: 'complex_function',
          severity: 'high',
          description: `Function '${func.name}' has complexity ${func.complexity}`,
          suggestion: 'Reduce complexity by extracting logic or simplifying conditions',
          line: func.startLine,
          endLine: func.endLine
        });
      }
    });

    // Check for missing types
    functions.forEach(func => {
      if (func.returnType === 'any' || func.parameters.some(p => p.type === 'any')) {
        issues.push({
          type: 'missing_types',
          severity: 'medium',
          description: `Function '${func.name}' has 'any' types`,
          suggestion: 'Add proper type annotations',
          line: func.startLine
        });
      }
    });

    return issues;
  }
}

export async function analyzeModule(filePath: string): Promise<ModuleAnalysis> {
  try {
    const sourceText = await fs.readFile(filePath, 'utf8');
    const analyzer = new ModuleAnalyzer(filePath, sourceText);
    return analyzer.analyze();
  } catch (error) {
    throw new Error(`Failed to analyze module ${filePath}: ${error}`);
  }
}
