#!/usr/bin/env tsx

/**
 * Automatic Module Refactoring Tool
 * 
 * Actually creates and modifies files based on analysis
 */

import { promises as fs } from 'fs';
import path from 'path';

interface RefactorResult {
  success: boolean;
  filesCreated: string[];
  filesModified: string[];
  backupCreated?: string;
  error?: string;
}

interface FunctionExtraction {
  name: string;
  startLine: number;
  endLine: number;
  concern: string;
  code: string;
  imports: string[];
  exports: string[];
}

interface ModuleStructure {
  originalFile: string;
  baseName: string;
  baseDir: string;
  functions: FunctionExtraction[];
  imports: string[];
  exports: string[];
  concerns: Array<{
    name: string;
    functions: FunctionExtraction[];
    fileName: string;
  }>;
}

class AutoRefactorer {
  async refactorModule(filePath: string, options: { dryRun?: boolean; backup?: boolean } = {}): Promise<RefactorResult> {
    const { dryRun = false, backup = true } = options;
    
    try {
      console.log(`🔧 Starting automatic refactoring of: ${filePath}`);
      
      // Step 1: Create backup
      let backupPath: string | undefined;
      if (backup && !dryRun) {
        backupPath = await this.createBackup(filePath);
        console.log(`💾 Backup created: ${backupPath}`);
      }

      // Step 2: Analyze and extract structure
      const structure = await this.analyzeModuleStructure(filePath);
      
      // Step 3: Generate refactored files
      const filesCreated: string[] = [];
      const filesModified: string[] = [];

      if (structure.concerns.length <= 1) {
        console.log(`ℹ️  Module has only ${structure.concerns.length} concern(s), no refactoring needed`);
        return {
          success: true,
          filesCreated: [],
          filesModified: [],
          backupCreated: backupPath
        };
      }

      // Create concern-specific files
      for (const concern of structure.concerns) {
        if (concern.functions.length > 0) {
          const concernFilePath = path.join(structure.baseDir, concern.fileName);
          const concernContent = this.generateConcernFile(concern, structure);
          
          if (!dryRun) {
            await fs.writeFile(concernFilePath, concernContent, 'utf8');
          }
          
          filesCreated.push(concernFilePath);
          console.log(`📄 Created: ${concern.fileName} (${concern.functions.length} functions)`);
        }
      }

      // Create compatibility layer
      const compatibilityContent = this.generateCompatibilityLayer(structure);
      if (!dryRun) {
        await fs.writeFile(structure.originalFile, compatibilityContent, 'utf8');
      }
      
      filesModified.push(structure.originalFile);
      console.log(`🔄 Updated: ${path.basename(structure.originalFile)} (compatibility layer)`);

      console.log(`✅ Refactoring completed successfully!`);
      console.log(`   Files created: ${filesCreated.length}`);
      console.log(`   Files modified: ${filesModified.length}`);

      return {
        success: true,
        filesCreated,
        filesModified,
        backupCreated: backupPath
      };

    } catch (error) {
      console.error(`❌ Refactoring failed: ${error}`);
      return {
        success: false,
        filesCreated: [],
        filesModified: [],
        error: String(error)
      };
    }
  }

  private async createBackup(filePath: string): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = `${filePath}.backup-${timestamp}`;
    await fs.copyFile(filePath, backupPath);
    return backupPath;
  }

  private async analyzeModuleStructure(filePath: string): Promise<ModuleStructure> {
    const content = await fs.readFile(filePath, 'utf8');
    const lines = content.split('\n');
    
    const baseName = path.basename(filePath, '.ts');
    const baseDir = path.dirname(filePath);
    
    // Extract functions with their full code
    const functions = this.extractFunctionsWithCode(content, lines);
    
    // Extract imports and exports
    const imports = this.extractImports(content);
    const exports = this.extractExports(content);
    
    // Group functions by concern
    const concernMap = new Map<string, FunctionExtraction[]>();
    
    functions.forEach(func => {
      if (!concernMap.has(func.concern)) {
        concernMap.set(func.concern, []);
      }
      concernMap.get(func.concern)!.push(func);
    });

    const concerns = Array.from(concernMap.entries()).map(([name, funcs]) => ({
      name,
      functions: funcs,
      fileName: `${baseName}-${name}.ts`
    }));

    return {
      originalFile: filePath,
      baseName,
      baseDir,
      functions,
      imports,
      exports,
      concerns
    };
  }

  private extractFunctionsWithCode(content: string, lines: string[]): FunctionExtraction[] {
    const functions: FunctionExtraction[] = [];
    
    // Enhanced regex to capture function declarations and arrow functions
    const functionRegex = /(?:^|\n)\s*(?:export\s+)?(?:async\s+)?function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/gm;
    
    let match;
    while ((match = functionRegex.exec(content)) !== null) {
      const functionName = match[1];
      if (!functionName) continue;
      
      // Skip invalid function names (keywords, etc.)
      if (['that', 'for', 'if', 'while', 'return', 'const', 'let', 'var'].includes(functionName)) {
        continue;
      }
      
      console.log(`🔍 Found function: ${functionName}`);
      const startPos = match.index;
      
      // Find the actual start line (including comments and decorators)
      const beforeFunction = content.substring(0, startPos);
      const startLineIndex = beforeFunction.split('\n').length - 1;
      
      // Find the function start (including JSDoc comments)
      let actualStartLine = startLineIndex;
      for (let i = startLineIndex - 1; i >= 0; i--) {
        const line = lines[i].trim();
        if (line.startsWith('/**') || line.startsWith('*') || line.startsWith('*/') || line.startsWith('//')) {
          actualStartLine = i;
        } else if (line === '') {
          continue; // Skip empty lines
        } else {
          break; // Stop at non-comment, non-empty line
        }
      }
      
      // Find function end
      const endLine = this.findFunctionEnd(lines, startLineIndex);
      
      // Extract the complete function code
      const functionLines = lines.slice(actualStartLine, endLine + 1);
      const code = functionLines.join('\n');
      
      // Determine concern
      const concern = this.determineConcern(functionName);
      
      // Extract function-specific imports (simplified)
      const imports = this.extractFunctionImports(code);
      const exports = [functionName]; // Function exports itself
      
      functions.push({
        name: functionName,
        startLine: actualStartLine + 1,
        endLine: endLine + 1,
        concern,
        code,
        imports,
        exports
      });
    }
    
    return functions;
  }

  private findFunctionEnd(lines: string[], startLine: number): number {
    let braceCount = 0;
    let inFunction = false;
    
    for (let i = startLine; i < lines.length; i++) {
      const line = lines[i];
      
      for (const char of line) {
        if (char === '{') {
          braceCount++;
          inFunction = true;
        } else if (char === '}') {
          braceCount--;
          if (inFunction && braceCount === 0) {
            return i;
          }
        }
      }
    }
    
    return startLine + 20; // Fallback
  }

  private determineConcern(functionName: string): string {
    const name = functionName.toLowerCase();
    
    if (name.includes('should') || name.includes('can') || name.includes('is') || name.includes('check') || name.includes('handle')) {
      return 'decision';
    }
    if (name.includes('execute') || name.includes('run') || name.includes('process')) {
      return 'execution';
    }
    if (name.includes('auto') || name.includes('orchestrate') || name.includes('coordinate') || name.includes('manage')) {
      return 'orchestration';
    }
    if (name.includes('get') || name.includes('fetch') || name.includes('save') || name.includes('update') || name.includes('create')) {
      return 'data';
    }
    
    return 'general';
  }

  private extractImports(content: string): string[] {
    const imports: string[] = [];
    const importRegex = /^import\s+.*?from\s+['"][^'"]+['"];?\s*$/gm;
    
    let match;
    while ((match = importRegex.exec(content)) !== null) {
      imports.push(match[0].trim());
    }
    
    return imports;
  }

  private extractExports(content: string): string[] {
    const exports: string[] = [];
    const exportRegex = /^export\s+(?:default\s+)?(?:function|const|class|interface|type)\s+(\w+)/gm;
    
    let match;
    while ((match = exportRegex.exec(content)) !== null) {
      exports.push(match[1]);
    }
    
    return exports;
  }

  private extractFunctionImports(code: string): string[] {
    // Simplified: extract imports that might be needed for this function
    const imports: string[] = [];
    
    // Look for common patterns that indicate external dependencies
    if (code.includes('db.') || code.includes('drizzle')) {
      imports.push("import { db } from '@/lib/db/drizzle';");
    }
    if (code.includes('log.') || code.includes('loggers')) {
      imports.push("import { loggers } from '@/lib/utils/logger';");
    }
    if (code.includes('getBusinessById') || code.includes('updateBusiness')) {
      imports.push("import { getBusinessById, updateBusiness, getTeamForBusiness } from '@/lib/db/queries';");
    }
    
    return imports;
  }

  private generateConcernFile(concern: { name: string; functions: FunctionExtraction[]; fileName: string }, structure: ModuleStructure): string {
    const concernName = concern.name.charAt(0).toUpperCase() + concern.name.slice(1);
    const moduleName = structure.baseName.charAt(0).toUpperCase() + structure.baseName.slice(1);
    
    // Collect all unique imports needed for this concern
    const allImports = new Set<string>();
    
    // Add common imports
    structure.imports.forEach(imp => {
      // Only include imports that are likely needed
      if (imp.includes('@/lib/') || imp.includes('./') || imp.includes('../')) {
        allImports.add(imp);
      }
    });
    
    // Add function-specific imports
    concern.functions.forEach(func => {
      func.imports.forEach(imp => allImports.add(imp));
    });
    
    const importsSection = Array.from(allImports).join('\n');
    
    // Generate function code (ensure all functions are exported)
    const functionsSection = concern.functions
      .map(func => {
        // Ensure function is exported
        if (!func.code.trim().startsWith('export')) {
          return func.code.replace(/^(\s*)(async\s+)?function\s+/, '$1export $2function ');
        }
        return func.code;
      })
      .join('\n\n');
    
    // Generate exports
    const exportsList = concern.functions.map(func => func.name).join(', ');
    
    const description = this.getConcernDescription(concern.name);
    
    return `/**
 * ${moduleName} ${concernName}
 * 
 * ${description}
 * 
 * @module ${structure.baseName}/${concern.name}
 */

${importsSection}

${functionsSection}

// Export all functions from this module
export { ${exportsList} };
`;
  }

  private generateCompatibilityLayer(structure: ModuleStructure): string {
    const moduleName = structure.baseName.charAt(0).toUpperCase() + structure.baseName.slice(1);
    
    // Generate re-exports for each concern
    const reExports = structure.concerns
      .filter(concern => concern.functions.length > 0)
      .map(concern => {
        const functionNames = concern.functions.map(func => func.name).join(', ');
        return `export { ${functionNames} } from './${structure.baseName}-${concern.name}';`;
      })
      .join('\n');
    
    // Generate deprecation notes
    const deprecationNotes = structure.concerns
      .filter(concern => concern.functions.length > 0)
      .map(concern => ` * - ${structure.baseName}-${concern.name}.ts for ${concern.name} logic`)
      .join('\n');
    
    return `/**
 * ${moduleName} Compatibility Layer
 * 
 * This file provides backward compatibility for existing imports
 * while the codebase migrates to the new modular structure.
 * 
 * @deprecated Use specific modules instead:
${deprecationNotes}
 */

${reExports}

// Legacy type exports for backward compatibility
export type * from './${structure.baseName}-types';
`;
  }

  private getConcernDescription(concernName: string): string {
    const descriptions: Record<string, string> = {
      'decision': 'Handles decision-making logic and validation rules',
      'execution': 'Executes business operations and processes',
      'orchestration': 'Coordinates and manages complex workflows',
      'data': 'Manages data access and manipulation operations',
      'general': 'Provides utility functions and helper methods'
    };
    
    return descriptions[concernName] || `Handles ${concernName} related functionality`;
  }
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const filePath = args[1];
  
  if (!command || !filePath) {
    console.log(`
🔧 Automatic Module Refactoring Tool

Usage:
  npm run refactor:auto apply <file-path> [--dry-run] [--no-backup]

Examples:
  npm run refactor:auto apply lib/services/scheduler-service.ts
  npm run refactor:auto apply lib/services/scheduler-service.ts --dry-run
  npm run refactor:auto apply lib/services/scheduler-service.ts --no-backup

Options:
  --dry-run     Show what would be done without making changes
  --no-backup   Skip creating backup file
    `);
    process.exit(1);
  }

  const dryRun = args.includes('--dry-run');
  const backup = !args.includes('--no-backup');

  const refactorer = new AutoRefactorer();

  try {
    switch (command) {
      case 'apply':
        const result = await refactorer.refactorModule(filePath, { dryRun, backup });
        
        if (result.success) {
          console.log(`\n🎉 Refactoring ${dryRun ? 'simulation' : 'completed'} successfully!`);
          if (result.filesCreated.length > 0) {
            console.log(`📁 Files created: ${result.filesCreated.length}`);
            result.filesCreated.forEach(file => console.log(`   - ${path.basename(file)}`));
          }
          if (result.filesModified.length > 0) {
            console.log(`🔄 Files modified: ${result.filesModified.length}`);
            result.filesModified.forEach(file => console.log(`   - ${path.basename(file)}`));
          }
          if (result.backupCreated) {
            console.log(`💾 Backup: ${path.basename(result.backupCreated)}`);
          }
        } else {
          console.error(`❌ Refactoring failed: ${result.error}`);
          process.exit(1);
        }
        break;

      default:
        console.error(`❌ Unknown command: ${command}`);
        process.exit(1);
    }
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

export { AutoRefactorer };
