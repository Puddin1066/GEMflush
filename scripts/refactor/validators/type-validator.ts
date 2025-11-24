/**
 * Type Validator
 * 
 * Validates TypeScript types and compilation after refactoring
 */

import { promises as fs } from 'fs';
import * as ts from 'typescript';
import path from 'path';
import { glob } from 'glob';

export interface ValidationResult {
  success: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  metrics: ValidationMetrics;
}

export interface ValidationError {
  file: string;
  line: number;
  column: number;
  message: string;
  code: number;
  severity: 'error' | 'warning';
}

export interface ValidationWarning {
  file: string;
  line: number;
  column: number;
  message: string;
  code: number;
}

export interface ValidationMetrics {
  filesChecked: number;
  errorsFound: number;
  warningsFound: number;
  typeErrors: number;
  compilationTime: number;
}

export class TypeValidator {
  private workspaceRoot: string;
  private compilerOptions: ts.CompilerOptions;

  constructor(workspaceRoot: string = process.cwd()) {
    this.workspaceRoot = workspaceRoot;
    this.compilerOptions = this.loadCompilerOptions();
  }

  private loadCompilerOptions(): ts.CompilerOptions {
    // Try to load from tsconfig.json
    const tsconfigPath = path.join(this.workspaceRoot, 'tsconfig.json');
    
    try {
      const configFile = ts.readConfigFile(tsconfigPath, ts.sys.readFile);
      if (configFile.error) {
        console.warn('Error reading tsconfig.json, using default options');
        return this.getDefaultCompilerOptions();
      }

      const parsedConfig = ts.parseJsonConfigFileContent(
        configFile.config,
        ts.sys,
        this.workspaceRoot
      );

      return parsedConfig.options;
    } catch {
      console.warn('tsconfig.json not found, using default options');
      return this.getDefaultCompilerOptions();
    }
  }

  private getDefaultCompilerOptions(): ts.CompilerOptions {
    return {
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.ESNext,
      lib: ['ES2020', 'DOM', 'DOM.Iterable'],
      allowJs: true,
      skipLibCheck: true,
      esModuleInterop: true,
      allowSyntheticDefaultImports: true,
      strict: true,
      forceConsistentCasingInFileNames: true,
      moduleResolution: ts.ModuleResolutionKind.NodeJs,
      resolveJsonModule: true,
      isolatedModules: true,
      noEmit: true,
      jsx: ts.JsxEmit.Preserve,
      incremental: true,
      baseUrl: '.',
      paths: {
        '@/*': ['./lib/*', './app/*', './components/*']
      }
    };
  }

  async validateFiles(filePaths: string[]): Promise<ValidationResult> {
    const startTime = Date.now();
    
    try {
      // Create TypeScript program
      const program = ts.createProgram(filePaths, this.compilerOptions);
      
      // Get all diagnostics
      const diagnostics = [
        ...program.getConfigFileParsingDiagnostics(),
        ...program.getOptionsDiagnostics(),
        ...program.getGlobalDiagnostics(),
        ...program.getSemanticDiagnostics()
      ];

      const errors: ValidationError[] = [];
      const warnings: ValidationWarning[] = [];
      let typeErrors = 0;

      // Process diagnostics
      for (const diagnostic of diagnostics) {
        const severity = diagnostic.category === ts.DiagnosticCategory.Error ? 'error' : 'warning';
        const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');
        
        let file = 'unknown';
        let line = 0;
        let column = 0;

        if (diagnostic.file && diagnostic.start !== undefined) {
          file = diagnostic.file.fileName;
          const position = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start);
          line = position.line + 1;
          column = position.character + 1;
        }

        const validationItem = {
          file,
          line,
          column,
          message,
          code: diagnostic.code
        };

        if (severity === 'error') {
          errors.push({ ...validationItem, severity });
          if (this.isTypeError(diagnostic)) {
            typeErrors++;
          }
        } else {
          warnings.push(validationItem);
        }
      }

      const compilationTime = Date.now() - startTime;

      return {
        success: errors.length === 0,
        errors,
        warnings,
        metrics: {
          filesChecked: filePaths.length,
          errorsFound: errors.length,
          warningsFound: warnings.length,
          typeErrors,
          compilationTime
        }
      };
    } catch (error) {
      return {
        success: false,
        errors: [{
          file: 'validation',
          line: 0,
          column: 0,
          message: `Validation failed: ${error}`,
          code: 0,
          severity: 'error'
        }],
        warnings: [],
        metrics: {
          filesChecked: 0,
          errorsFound: 1,
          warningsFound: 0,
          typeErrors: 0,
          compilationTime: Date.now() - startTime
        }
      };
    }
  }

  private isTypeError(diagnostic: ts.Diagnostic): boolean {
    // Common TypeScript error codes that indicate type issues
    const typeErrorCodes = [
      2304, // Cannot find name
      2322, // Type is not assignable to type
      2339, // Property does not exist on type
      2345, // Argument of type is not assignable to parameter of type
      2349, // This expression is not callable
      2551, // Property does not exist on type. Did you mean?
      2552, // Cannot find name. Did you mean?
      2571, // Object is of type 'unknown'
      2740, // Type is missing the following properties from type
      2741, // Property is missing in type but required in type
    ];

    return typeErrorCodes.includes(diagnostic.code);
  }

  async validateWorkspace(): Promise<ValidationResult> {
    // Find all TypeScript files in the workspace
    const patterns = [
      'app/**/*.{ts,tsx}',
      'lib/**/*.{ts,tsx}',
      'components/**/*.{ts,tsx}',
      'scripts/**/*.{ts,tsx}'
    ];

    const files: string[] = [];
    
    for (const pattern of patterns) {
      const matches = await glob(pattern, {
        cwd: this.workspaceRoot,
        absolute: true,
        ignore: ['**/node_modules/**', '**/.next/**', '**/dist/**', '**/*.test.{ts,tsx}']
      });
      files.push(...matches);
    }

    return this.validateFiles([...new Set(files)]);
  }

  async validateSingleFile(filePath: string): Promise<ValidationResult> {
    return this.validateFiles([filePath]);
  }

  async checkImports(filePath: string): Promise<Array<{ import: string; error: string }>> {
    const importErrors: Array<{ import: string; error: string }> = [];
    
    try {
      const sourceText = await fs.readFile(filePath, 'utf8');
      const sourceFile = ts.createSourceFile(
        filePath,
        sourceText,
        ts.ScriptTarget.Latest,
        true
      );

      // Extract import declarations
      const imports = this.getImportDeclarations(sourceFile);

      for (const importDecl of imports) {
        const moduleSpecifier = importDecl.moduleSpecifier;
        if (ts.isStringLiteral(moduleSpecifier)) {
          const modulePath = moduleSpecifier.text;
          
          try {
            await this.resolveModule(modulePath, filePath);
          } catch (error) {
            importErrors.push({
              import: modulePath,
              error: String(error)
            });
          }
        }
      }
    } catch (error) {
      importErrors.push({
        import: filePath,
        error: `Failed to check imports: ${error}`
      });
    }

    return importErrors;
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

  private async resolveModule(modulePath: string, fromFile: string): Promise<string> {
    // Handle relative imports
    if (modulePath.startsWith('.')) {
      const fromDir = path.dirname(fromFile);
      const resolved = path.resolve(fromDir, modulePath);
      
      // Try different extensions
      const extensions = ['.ts', '.tsx', '.js', '.jsx', '.d.ts'];
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
      
      throw new Error(`Cannot resolve module '${modulePath}'`);
    }

    // Handle alias imports (@/)
    if (modulePath.startsWith('@/')) {
      const aliasPath = modulePath.replace('@/', '');
      const resolved = path.join(this.workspaceRoot, aliasPath);
      
      const extensions = ['.ts', '.tsx', '.js', '.jsx', '.d.ts'];
      for (const ext of extensions) {
        const withExt = resolved + ext;
        try {
          await fs.access(withExt);
          return withExt;
        } catch {}
      }
      
      throw new Error(`Cannot resolve alias module '${modulePath}'`);
    }

    // External modules - assume they exist
    return modulePath;
  }

  async generateTypeReport(validationResult: ValidationResult): Promise<string> {
    const { errors, warnings, metrics } = validationResult;
    
    let report = `# Type Validation Report\n\n`;
    report += `**Generated:** ${new Date().toISOString()}\n\n`;
    
    // Summary
    report += `## Summary\n\n`;
    report += `- Files Checked: ${metrics.filesChecked}\n`;
    report += `- Compilation Time: ${metrics.compilationTime}ms\n`;
    report += `- Status: ${validationResult.success ? '✅ PASSED' : '❌ FAILED'}\n\n`;
    
    // Metrics
    report += `## Metrics\n\n`;
    report += `- Errors: ${metrics.errorsFound}\n`;
    report += `- Warnings: ${metrics.warningsFound}\n`;
    report += `- Type Errors: ${metrics.typeErrors}\n\n`;
    
    // Errors
    if (errors.length > 0) {
      report += `## Errors (${errors.length})\n\n`;
      
      const errorsByFile = this.groupByFile(errors);
      for (const [file, fileErrors] of Object.entries(errorsByFile)) {
        report += `### ${file}\n\n`;
        fileErrors.forEach(error => {
          report += `- **Line ${error.line}:${error.column}** - ${error.message} (TS${error.code})\n`;
        });
        report += '\n';
      }
    }
    
    // Warnings
    if (warnings.length > 0) {
      report += `## Warnings (${warnings.length})\n\n`;
      
      const warningsByFile = this.groupByFile(warnings);
      for (const [file, fileWarnings] of Object.entries(warningsByFile)) {
        report += `### ${file}\n\n`;
        fileWarnings.forEach(warning => {
          report += `- **Line ${warning.line}:${warning.column}** - ${warning.message} (TS${warning.code})\n`;
        });
        report += '\n';
      }
    }
    
    return report;
  }

  private groupByFile<T extends { file: string }>(items: T[]): Record<string, T[]> {
    return items.reduce((groups, item) => {
      const file = path.relative(this.workspaceRoot, item.file);
      if (!groups[file]) {
        groups[file] = [];
      }
      groups[file].push(item);
      return groups;
    }, {} as Record<string, T[]>);
  }
}

export async function validateChanges(filePaths: string[]): Promise<ValidationResult> {
  const validator = new TypeValidator();
  return validator.validateFiles(filePaths);
}

export async function validateWorkspace(): Promise<ValidationResult> {
  const validator = new TypeValidator();
  return validator.validateWorkspace();
}

