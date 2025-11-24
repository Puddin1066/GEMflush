/**
 * Import Updater
 * 
 * Updates import statements across the codebase after refactoring
 */

import { promises as fs } from 'fs';
import path from 'path';
import * as ts from 'typescript';
import { glob } from 'glob';

export interface ImportMapping {
  oldModule: string;
  newModules: Array<{
    module: string;
    symbols: string[];
  }>;
}

export interface ImportUpdateResult {
  filesUpdated: number;
  importsUpdated: number;
  errors: Array<{
    file: string;
    error: string;
  }>;
}

export class ImportUpdater {
  private workspaceRoot: string;

  constructor(workspaceRoot: string = process.cwd()) {
    this.workspaceRoot = workspaceRoot;
  }

  async updateImports(mappings: ImportMapping[]): Promise<ImportUpdateResult> {
    const result: ImportUpdateResult = {
      filesUpdated: 0,
      importsUpdated: 0,
      errors: []
    };

    // Find all TypeScript files in the workspace
    const files = await this.findTypeScriptFiles();

    for (const filePath of files) {
      try {
        const updated = await this.updateFileImports(filePath, mappings);
        if (updated.importsUpdated > 0) {
          result.filesUpdated++;
          result.importsUpdated += updated.importsUpdated;
        }
      } catch (error) {
        result.errors.push({
          file: filePath,
          error: String(error)
        });
      }
    }

    return result;
  }

  private async findTypeScriptFiles(): Promise<string[]> {
    const patterns = [
      'app/**/*.{ts,tsx}',
      'lib/**/*.{ts,tsx}',
      'components/**/*.{ts,tsx}',
      'scripts/**/*.{ts,tsx}',
      'tests/**/*.{ts,tsx}'
    ];

    const files: string[] = [];
    
    for (const pattern of patterns) {
      const matches = await glob(pattern, {
        cwd: this.workspaceRoot,
        absolute: true,
        ignore: ['**/node_modules/**', '**/.next/**', '**/dist/**']
      });
      files.push(...matches);
    }

    return [...new Set(files)]; // Remove duplicates
  }

  private async updateFileImports(filePath: string, mappings: ImportMapping[]): Promise<{ importsUpdated: number }> {
    const sourceText = await fs.readFile(filePath, 'utf8');
    const sourceFile = ts.createSourceFile(
      filePath,
      sourceText,
      ts.ScriptTarget.Latest,
      true
    );

    let importsUpdated = 0;
    let updatedContent = sourceText;

    // Process imports in reverse order to maintain correct positions
    const imports = this.getImportDeclarations(sourceFile).reverse();

    for (const importDecl of imports) {
      const moduleSpecifier = importDecl.moduleSpecifier;
      if (!ts.isStringLiteral(moduleSpecifier)) continue;

      const modulePath = moduleSpecifier.text;
      const mapping = this.findMapping(modulePath, mappings);
      
      if (mapping) {
        const newImports = this.generateNewImports(importDecl, mapping);
        const oldImportText = importDecl.getFullText();
        
        updatedContent = updatedContent.replace(oldImportText, newImports);
        importsUpdated++;
      }
    }

    if (importsUpdated > 0) {
      await fs.writeFile(filePath, updatedContent);
    }

    return { importsUpdated };
  }

  private getImportDeclarations(sourceFile: ts.SourceFile): ts.ImportDeclaration[] {
    const imports: ts.ImportDeclaration[] = [];

    const visit = (node: ts.Node) => {
      if (ts.isImportDeclaration(node)) {
        imports.push(node);
      }
      ts.forEachChild(node, visit);
    };

    visit(sourceFile);
    return imports;
  }

  private findMapping(modulePath: string, mappings: ImportMapping[]): ImportMapping | null {
    return mappings.find(mapping => {
      // Handle relative paths
      if (modulePath.startsWith('.')) {
        return mapping.oldModule.endsWith(modulePath.replace(/^\.\//, ''));
      }
      
      // Handle absolute paths and aliases
      return mapping.oldModule === modulePath;
    }) || null;
  }

  private generateNewImports(importDecl: ts.ImportDeclaration, mapping: ImportMapping): string {
    const importClause = importDecl.importClause;
    if (!importClause) return '';

    const leadingTrivia = importDecl.getFullText().substring(0, importDecl.getLeadingTriviaWidth());
    const newImports: string[] = [];

    // Extract imported symbols
    const importedSymbols = this.extractImportedSymbols(importClause);

    // Generate new import statements
    for (const newModule of mapping.newModules) {
      const relevantSymbols = importedSymbols.filter(symbol => 
        newModule.symbols.includes(symbol.name)
      );

      if (relevantSymbols.length > 0) {
        const importStatement = this.createImportStatement(newModule.module, relevantSymbols);
        newImports.push(leadingTrivia + importStatement);
      }
    }

    return newImports.join('\n');
  }

  private extractImportedSymbols(importClause: ts.ImportClause): Array<{ name: string; alias?: string; isType: boolean }> {
    const symbols: Array<{ name: string; alias?: string; isType: boolean }> = [];

    // Default import
    if (importClause.name) {
      symbols.push({
        name: importClause.name.text,
        isType: !!importClause.isTypeOnly
      });
    }

    // Named imports
    if (importClause.namedBindings && ts.isNamedImports(importClause.namedBindings)) {
      for (const element of importClause.namedBindings.elements) {
        symbols.push({
          name: element.name.text,
          alias: element.propertyName?.text,
          isType: !!importClause.isTypeOnly || !!element.isTypeOnly
        });
      }
    }

    // Namespace import
    if (importClause.namedBindings && ts.isNamespaceImport(importClause.namedBindings)) {
      symbols.push({
        name: importClause.namedBindings.name.text,
        isType: !!importClause.isTypeOnly
      });
    }

    return symbols;
  }

  private createImportStatement(
    modulePath: string, 
    symbols: Array<{ name: string; alias?: string; isType: boolean }>
  ): string {
    const typeSymbols = symbols.filter(s => s.isType);
    const valueSymbols = symbols.filter(s => !s.isType);

    const imports: string[] = [];

    // Create type-only import if needed
    if (typeSymbols.length > 0) {
      const typeImportList = typeSymbols
        .map(s => s.alias ? `${s.alias} as ${s.name}` : s.name)
        .join(', ');
      imports.push(`import type { ${typeImportList} } from '${modulePath}';`);
    }

    // Create value import if needed
    if (valueSymbols.length > 0) {
      const valueImportList = valueSymbols
        .map(s => s.alias ? `${s.alias} as ${s.name}` : s.name)
        .join(', ');
      imports.push(`import { ${valueImportList} } from '${modulePath}';`);
    }

    return imports.join('\n');
  }

  async updateSingleFile(filePath: string, mappings: ImportMapping[]): Promise<ImportUpdateResult> {
    const result: ImportUpdateResult = {
      filesUpdated: 0,
      importsUpdated: 0,
      errors: []
    };

    try {
      const updated = await this.updateFileImports(filePath, mappings);
      if (updated.importsUpdated > 0) {
        result.filesUpdated = 1;
        result.importsUpdated = updated.importsUpdated;
      }
    } catch (error) {
      result.errors.push({
        file: filePath,
        error: String(error)
      });
    }

    return result;
  }

  async generateImportMappings(
    originalModule: string,
    newModules: Array<{ path: string; exports: string[] }>
  ): Promise<ImportMapping> {
    return {
      oldModule: originalModule,
      newModules: newModules.map(module => ({
        module: module.path,
        symbols: module.exports
      }))
    };
  }

  async validateImports(filePath: string): Promise<Array<{ line: number; error: string }>> {
    const errors: Array<{ line: number; error: string }> = [];
    
    try {
      const sourceText = await fs.readFile(filePath, 'utf8');
      const sourceFile = ts.createSourceFile(
        filePath,
        sourceText,
        ts.ScriptTarget.Latest,
        true
      );

      // Create a program for type checking
      const program = ts.createProgram([filePath], {
        target: ts.ScriptTarget.Latest,
        module: ts.ModuleKind.ESNext,
        strict: true,
        noEmit: true
      }, {
        getSourceFile: (fileName) => fileName === filePath ? sourceFile : undefined,
        writeFile: () => {},
        getCurrentDirectory: () => this.workspaceRoot,
        getDirectories: () => [],
        fileExists: () => true,
        readFile: () => sourceText,
        getCanonicalFileName: (fileName) => fileName,
        useCaseSensitiveFileNames: () => true,
        getNewLine: () => '\n'
      });

      const diagnostics = ts.getPreEmitDiagnostics(program);
      
      for (const diagnostic of diagnostics) {
        if (diagnostic.file === sourceFile && diagnostic.start !== undefined) {
          const { line } = sourceFile.getLineAndCharacterOfPosition(diagnostic.start);
          errors.push({
            line: line + 1,
            error: ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n')
          });
        }
      }
    } catch (error) {
      errors.push({
        line: 0,
        error: `Failed to validate imports: ${error}`
      });
    }

    return errors;
  }
}

export async function updateImports(filePath: string, mappings: Record<string, string>): Promise<void> {
  const updater = new ImportUpdater();
  
  // Convert simple mappings to ImportMapping format
  const importMappings: ImportMapping[] = Object.entries(mappings).map(([oldModule, newModule]) => ({
    oldModule,
    newModules: [{ module: newModule, symbols: ['*'] }]
  }));

  await updater.updateSingleFile(filePath, importMappings);
}

