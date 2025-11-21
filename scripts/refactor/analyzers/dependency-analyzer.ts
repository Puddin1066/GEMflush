/**
 * Dependency Analyzer
 * 
 * Analyzes module dependencies to identify circular dependencies,
 * unused imports, and dependency patterns
 */

import { promises as fs } from 'fs';
import path from 'path';
import * as ts from 'typescript';

export interface DependencyInfo {
  module: string;
  importedSymbols: string[];
  isTypeOnly: boolean;
  isExternal: boolean;
  line: number;
}

export interface CircularDependency {
  cycle: string[];
  severity: 'low' | 'medium' | 'high';
}

export interface UnusedImport {
  module: string;
  symbols: string[];
  line: number;
}

export interface MissingImport {
  symbol: string;
  suggestedModule: string;
  line: number;
}

export interface DependencyAnalysis {
  filePath: string;
  dependencies: DependencyInfo[];
  circularDependencies: CircularDependency[];
  unusedImports: UnusedImport[];
  missingImports: MissingImport[];
  dependencyGraph: Map<string, string[]>;
  metrics: {
    totalDependencies: number;
    externalDependencies: number;
    internalDependencies: number;
    typeOnlyDependencies: number;
  };
}

export class DependencyAnalyzer {
  private sourceFile: ts.SourceFile;
  private sourceText: string;
  private program: ts.Program;
  private typeChecker: ts.TypeChecker;
  private workspaceRoot: string;

  constructor(filePath: string, sourceText: string, workspaceRoot: string = process.cwd()) {
    this.sourceText = sourceText;
    this.workspaceRoot = workspaceRoot;
    
    this.sourceFile = ts.createSourceFile(
      filePath,
      sourceText,
      ts.ScriptTarget.Latest,
      true
    );

    // Create program for type checking
    const compilerOptions: ts.CompilerOptions = {
      target: ts.ScriptTarget.Latest,
      module: ts.ModuleKind.ESNext,
      strict: true,
      esModuleInterop: true,
      skipLibCheck: true,
      forceConsistentCasingInFileNames: true,
      moduleResolution: ts.ModuleResolutionKind.NodeJs
    };

    this.program = ts.createProgram([filePath], compilerOptions, {
      getSourceFile: (fileName) => fileName === filePath ? this.sourceFile : undefined,
      writeFile: () => {},
      getCurrentDirectory: () => workspaceRoot,
      getDirectories: () => [],
      fileExists: (fileName) => fileName === filePath,
      readFile: (fileName) => fileName === filePath ? sourceText : undefined,
      getCanonicalFileName: (fileName) => fileName,
      useCaseSensitiveFileNames: () => true,
      getNewLine: () => '\n',
      getDefaultLibFileName: () => 'lib.d.ts'
    });

    this.typeChecker = this.program.getTypeChecker();
  }

  async analyze(): Promise<DependencyAnalysis> {
    const dependencies = await this.analyzeDependencies();
    const circularDependencies = await this.findCircularDependencies();
    const unusedImports = this.findUnusedImports();
    const missingImports = this.findMissingImports();
    const dependencyGraph = await this.buildDependencyGraph();
    const metrics = this.calculateMetrics(dependencies);

    return {
      filePath: this.sourceFile.fileName,
      dependencies,
      circularDependencies,
      unusedImports,
      missingImports,
      dependencyGraph,
      metrics
    };
  }

  private async analyzeDependencies(): Promise<DependencyInfo[]> {
    const dependencies: DependencyInfo[] = [];

    const visit = (node: ts.Node) => {
      if (ts.isImportDeclaration(node)) {
        const dependency = this.extractDependencyInfo(node);
        if (dependency) {
          dependencies.push(dependency);
        }
      }
      ts.forEachChild(node, visit);
    };

    visit(this.sourceFile);
    return dependencies;
  }

  private extractDependencyInfo(node: ts.ImportDeclaration): DependencyInfo | null {
    const moduleSpecifier = node.moduleSpecifier;
    if (!ts.isStringLiteral(moduleSpecifier)) return null;

    const module = moduleSpecifier.text;
    const isTypeOnly = !!node.importClause?.isTypeOnly;
    const isExternal = this.isExternalModule(module);
    const line = this.sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1;

    let importedSymbols: string[] = [];

    if (node.importClause) {
      // Default import
      if (node.importClause.name) {
        importedSymbols.push(node.importClause.name.text);
      }

      // Named imports
      if (node.importClause.namedBindings && ts.isNamedImports(node.importClause.namedBindings)) {
        importedSymbols.push(...node.importClause.namedBindings.elements.map(el => el.name.text));
      }

      // Namespace import
      if (node.importClause.namedBindings && ts.isNamespaceImport(node.importClause.namedBindings)) {
        importedSymbols.push(node.importClause.namedBindings.name.text);
      }
    }

    return {
      module,
      importedSymbols,
      isTypeOnly,
      isExternal,
      line
    };
  }

  private isExternalModule(module: string): boolean {
    // External modules don't start with '.', '/', or '@/' (our alias)
    return !module.startsWith('.') && !module.startsWith('/') && !module.startsWith('@/');
  }

  private async findCircularDependencies(): Promise<CircularDependency[]> {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const cycles: CircularDependency[] = [];

    const dfs = async (filePath: string, path: string[]): Promise<void> => {
      if (recursionStack.has(filePath)) {
        // Found a cycle
        const cycleStart = path.indexOf(filePath);
        const cycle = path.slice(cycleStart).concat([filePath]);
        const severity = this.calculateCycleSeverity(cycle);
        
        cycles.push({
          cycle,
          severity
        });
        return;
      }

      if (visited.has(filePath)) {
        return;
      }

      visited.add(filePath);
      recursionStack.add(filePath);

      try {
        const dependencies = await this.getFileDependencies(filePath);
        for (const dep of dependencies) {
          if (!this.isExternalModule(dep)) {
            const resolvedPath = await this.resolveModulePath(dep, filePath);
            if (resolvedPath) {
              await dfs(resolvedPath, [...path, filePath]);
            }
          }
        }
      } catch (error) {
        // File might not exist or be readable
      }

      recursionStack.delete(filePath);
    };

    await dfs(this.sourceFile.fileName, []);
    return cycles;
  }

  private calculateCycleSeverity(cycle: string[]): 'low' | 'medium' | 'high' {
    if (cycle.length <= 2) return 'low';
    if (cycle.length <= 4) return 'medium';
    return 'high';
  }

  private async getFileDependencies(filePath: string): Promise<string[]> {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      const sourceFile = ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true);
      const dependencies: string[] = [];

      const visit = (node: ts.Node) => {
        if (ts.isImportDeclaration(node)) {
          const moduleSpecifier = node.moduleSpecifier;
          if (ts.isStringLiteral(moduleSpecifier)) {
            dependencies.push(moduleSpecifier.text);
          }
        }
        ts.forEachChild(node, visit);
      };

      visit(sourceFile);
      return dependencies;
    } catch {
      return [];
    }
  }

  private async resolveModulePath(module: string, fromFile: string): Promise<string | null> {
    const fromDir = path.dirname(fromFile);
    
    // Handle relative imports
    if (module.startsWith('.')) {
      const resolved = path.resolve(fromDir, module);
      
      // Try different extensions
      const extensions = ['.ts', '.tsx', '.js', '.jsx'];
      for (const ext of extensions) {
        const withExt = resolved + ext;
        try {
          await fs.access(withExt);
          return withExt;
        } catch {}
      }
      
      // Try index files
      for (const ext of extensions) {
        const indexFile = path.join(resolved, `index${ext}`);
        try {
          await fs.access(indexFile);
          return indexFile;
        } catch {}
      }
    }

    // Handle alias imports (@/)
    if (module.startsWith('@/')) {
      const aliasPath = module.replace('@/', '');
      return this.resolveModulePath(`./${aliasPath}`, this.workspaceRoot);
    }

    return null;
  }

  private findUnusedImports(): UnusedImport[] {
    const unusedImports: UnusedImport[] = [];
    const usedSymbols = new Set<string>();

    // Find all used symbols
    const visit = (node: ts.Node) => {
      if (ts.isIdentifier(node)) {
        usedSymbols.add(node.text);
      }
      ts.forEachChild(node, visit);
    };

    visit(this.sourceFile);

    // Check imports against used symbols
    const visitImports = (node: ts.Node) => {
      if (ts.isImportDeclaration(node)) {
        const moduleSpecifier = node.moduleSpecifier;
        if (ts.isStringLiteral(moduleSpecifier)) {
          const module = moduleSpecifier.text;
          const line = this.sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1;
          const unusedSymbols: string[] = [];

          if (node.importClause) {
            // Check default import
            if (node.importClause.name && !usedSymbols.has(node.importClause.name.text)) {
              unusedSymbols.push(node.importClause.name.text);
            }

            // Check named imports
            if (node.importClause.namedBindings && ts.isNamedImports(node.importClause.namedBindings)) {
              for (const element of node.importClause.namedBindings.elements) {
                if (!usedSymbols.has(element.name.text)) {
                  unusedSymbols.push(element.name.text);
                }
              }
            }
          }

          if (unusedSymbols.length > 0) {
            unusedImports.push({
              module,
              symbols: unusedSymbols,
              line
            });
          }
        }
      }
      ts.forEachChild(node, visit);
    };

    visitImports(this.sourceFile);
    return unusedImports;
  }

  private findMissingImports(): MissingImport[] {
    const missingImports: MissingImport[] = [];
    const importedSymbols = new Set<string>();
    const definedSymbols = new Set<string>();

    // Collect imported symbols
    const visitImports = (node: ts.Node) => {
      if (ts.isImportDeclaration(node)) {
        if (node.importClause) {
          if (node.importClause.name) {
            importedSymbols.add(node.importClause.name.text);
          }
          if (node.importClause.namedBindings && ts.isNamedImports(node.importClause.namedBindings)) {
            for (const element of node.importClause.namedBindings.elements) {
              importedSymbols.add(element.name.text);
            }
          }
        }
      }
      ts.forEachChild(node, visitImports);
    };

    // Collect defined symbols
    const visitDefinitions = (node: ts.Node) => {
      if (ts.isFunctionDeclaration(node) && node.name) {
        definedSymbols.add(node.name.text);
      }
      if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)) {
        definedSymbols.add(node.name.text);
      }
      if (ts.isInterfaceDeclaration(node)) {
        definedSymbols.add(node.name.text);
      }
      if (ts.isTypeAliasDeclaration(node)) {
        definedSymbols.add(node.name.text);
      }
      ts.forEachChild(node, visitDefinitions);
    };

    visitImports(this.sourceFile);
    visitDefinitions(this.sourceFile);

    // Find used but not imported/defined symbols
    const visitUsage = (node: ts.Node) => {
      if (ts.isIdentifier(node)) {
        const symbol = node.text;
        if (!importedSymbols.has(symbol) && !definedSymbols.has(symbol) && !this.isBuiltInSymbol(symbol)) {
          const line = this.sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1;
          const suggestedModule = this.suggestModuleForSymbol(symbol);
          
          if (suggestedModule) {
            missingImports.push({
              symbol,
              suggestedModule,
              line
            });
          }
        }
      }
      ts.forEachChild(node, visitUsage);
    };

    visitUsage(this.sourceFile);
    return missingImports;
  }

  private isBuiltInSymbol(symbol: string): boolean {
    const builtIns = [
      'console', 'process', 'Buffer', 'global', 'window', 'document',
      'Array', 'Object', 'String', 'Number', 'Boolean', 'Date', 'RegExp',
      'Promise', 'Error', 'TypeError', 'ReferenceError', 'SyntaxError',
      'undefined', 'null', 'true', 'false', 'Infinity', 'NaN'
    ];
    return builtIns.includes(symbol);
  }

  private suggestModuleForSymbol(symbol: string): string | null {
    // Common symbol to module mappings
    const symbolMappings: Record<string, string> = {
      'fs': 'fs',
      'path': 'path',
      'crypto': 'crypto',
      'util': 'util',
      'events': 'events',
      'stream': 'stream',
      'http': 'http',
      'https': 'https',
      'url': 'url',
      'querystring': 'querystring',
      'React': 'react',
      'useState': 'react',
      'useEffect': 'react',
      'useCallback': 'react',
      'useMemo': 'react',
      'NextRequest': 'next/server',
      'NextResponse': 'next/server'
    };

    return symbolMappings[symbol] || null;
  }

  private async buildDependencyGraph(): Promise<Map<string, string[]>> {
    const graph = new Map<string, string[]>();
    const dependencies = await this.analyzeDependencies();

    for (const dep of dependencies) {
      if (!this.isExternalModule(dep.module)) {
        const resolvedPath = await this.resolveModulePath(dep.module, this.sourceFile.fileName);
        if (resolvedPath) {
          if (!graph.has(this.sourceFile.fileName)) {
            graph.set(this.sourceFile.fileName, []);
          }
          graph.get(this.sourceFile.fileName)!.push(resolvedPath);
        }
      }
    }

    return graph;
  }

  private calculateMetrics(dependencies: DependencyInfo[]) {
    const totalDependencies = dependencies.length;
    const externalDependencies = dependencies.filter(d => d.isExternal).length;
    const internalDependencies = totalDependencies - externalDependencies;
    const typeOnlyDependencies = dependencies.filter(d => d.isTypeOnly).length;

    return {
      totalDependencies,
      externalDependencies,
      internalDependencies,
      typeOnlyDependencies
    };
  }
}

export async function analyzeDependencies(filePath: string): Promise<DependencyAnalysis> {
  try {
    const sourceText = await fs.readFile(filePath, 'utf8');
    const workspaceRoot = process.cwd();
    const analyzer = new DependencyAnalyzer(filePath, sourceText, workspaceRoot);
    return analyzer.analyze();
  } catch (error) {
    throw new Error(`Failed to analyze dependencies for ${filePath}: ${error}`);
  }
}
