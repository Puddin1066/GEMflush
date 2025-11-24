#!/usr/bin/env tsx

/**
 * Module Refactoring Tool
 * 
 * Systematically analyzes and refactors modules in the GEMflush platform
 * following DRY and SOLID principles.
 * 
 * Usage:
 *   npm run refactor:analyze <module-path>
 *   npm run refactor:apply <module-path> [--strategy=<strategy>]
 *   npm run refactor:validate <module-path>
 */

import { promises as fs } from 'fs';
import path from 'path';
import { analyzeModule } from './analyzers/module-analyzer';
import { analyzeDependencies } from './analyzers/dependency-analyzer';
import { analyzePatterns } from './analyzers/pattern-analyzer';
import { generateRefactoredFiles } from './generators/file-generator';
import { updateImports } from './generators/import-updater';
import { validateChanges } from './validators/type-validator';
import { createBackup, restoreBackup } from './utils/backup-utils';
import { logger } from './utils/logger';

interface RefactoringOptions {
  strategy?: 'concern-separation' | 'type-consolidation' | 'utility-extraction' | 'auto';
  dryRun?: boolean;
  backup?: boolean;
  validate?: boolean;
  force?: boolean;
}

interface RefactoringResult {
  success: boolean;
  changes: string[];
  issues: string[];
  metrics: {
    linesReduced: number;
    filesCreated: number;
    filesModified: number;
    duplicatesRemoved: number;
  };
}

class ModuleRefactorer {
  private options: RefactoringOptions;
  private workspaceRoot: string;

  constructor(options: RefactoringOptions = {}) {
    this.options = {
      strategy: 'auto',
      dryRun: false,
      backup: true,
      validate: true,
      ...options
    };
    this.workspaceRoot = process.cwd();
  }

  async refactorModule(modulePath: string): Promise<RefactoringResult> {
    logger.info(`Starting refactoring of module: ${modulePath}`);
    
    try {
      // Phase 1: Analysis
      const analysis = await this.analyzeModule(modulePath);
      
      // Phase 2: Planning
      const plan = await this.createRefactoringPlan(analysis);
      
      // Phase 3: Backup (if enabled)
      let backupId: string | undefined;
      if (this.options.backup) {
        backupId = await createBackup([modulePath]);
        logger.info(`Created backup: ${backupId}`);
      }

      // Phase 4: Execution
      const result = await this.executeRefactoringPlan(plan);
      
      // Phase 5: Validation
      if (this.options.validate) {
        const validation = await this.validateRefactoring(plan.affectedFiles);
        if (!validation.success) {
          if (backupId) {
            await restoreBackup(backupId);
            logger.warn('Validation failed, restored from backup');
          }
          return {
            success: false,
            changes: [],
            issues: validation.issues,
            metrics: { linesReduced: 0, filesCreated: 0, filesModified: 0, duplicatesRemoved: 0 }
          };
        }
      }

      logger.info('Refactoring completed successfully');
      return result;

    } catch (error) {
      logger.error(`Refactoring failed: ${error}`);
      throw error;
    }
  }

  private async analyzeModule(modulePath: string) {
    logger.info('Analyzing module structure...');
    
    const [moduleAnalysis, dependencyAnalysis, patternAnalysis] = await Promise.all([
      analyzeModule(modulePath),
      analyzeDependencies(modulePath),
      analyzePatterns(modulePath)
    ]);

    return {
      module: moduleAnalysis,
      dependencies: dependencyAnalysis,
      patterns: patternAnalysis,
      recommendations: this.generateRecommendations(moduleAnalysis, dependencyAnalysis, patternAnalysis)
    };
  }

  private generateRecommendations(moduleAnalysis: any, dependencyAnalysis: any, patternAnalysis: any) {
    const recommendations = [];

    // Check for mixed concerns
    if (moduleAnalysis.concerns && moduleAnalysis.concerns.length > 1) {
      recommendations.push({
        type: 'concern-separation',
        priority: 'high',
        description: 'Module has mixed concerns and should be split',
        strategy: 'concern-separation',
        affectedFunctions: moduleAnalysis.concerns.flatMap((c: any) => c.functions)
      });
    }

    // Check for duplicate types
    if (patternAnalysis.duplicateTypes && patternAnalysis.duplicateTypes.length > 0) {
      recommendations.push({
        type: 'type-consolidation',
        priority: 'medium',
        description: 'Duplicate type definitions found',
        strategy: 'type-consolidation',
        duplicates: patternAnalysis.duplicateTypes
      });
    }

    // Check for utility functions
    if (patternAnalysis.utilityFunctions && patternAnalysis.utilityFunctions.length > 3) {
      recommendations.push({
        type: 'utility-extraction',
        priority: 'low',
        description: 'Multiple utility functions could be extracted',
        strategy: 'utility-extraction',
        functions: patternAnalysis.utilityFunctions
      });
    }

    return recommendations;
  }

  private async createRefactoringPlan(analysis: any) {
    const strategy = this.options.strategy === 'auto' 
      ? this.selectBestStrategy(analysis.recommendations)
      : this.options.strategy;

    logger.info(`Using refactoring strategy: ${strategy}`);

    switch (strategy) {
      case 'concern-separation':
        return this.createConcernSeparationPlan(analysis);
      case 'type-consolidation':
        return this.createTypeConsolidationPlan(analysis);
      case 'utility-extraction':
        return this.createUtilityExtractionPlan(analysis);
      default:
        return this.createConcernSeparationPlan(analysis);
    }
  }

  private selectBestStrategy(recommendations: any[]): string {
    if (recommendations.length === 0) return 'concern-separation';
    
    // Sort by priority and return the highest priority recommendation
    const sorted = recommendations.sort((a, b) => {
      const priorities = { high: 3, medium: 2, low: 1 };
      return priorities[b.priority as keyof typeof priorities] - priorities[a.priority as keyof typeof priorities];
    });

    return sorted[0].strategy;
  }

  private async createConcernSeparationPlan(analysis: any) {
    const modulePath = analysis.module.filePath;
    const concerns = analysis.module.concerns || [];
    
    const newFiles = concerns.map((concern: any) => ({
      path: this.generateConcernFilePath(modulePath, concern.name),
      content: this.generateConcernFileContent(concern),
      type: 'concern-module'
    }));

    // Create compatibility layer
    newFiles.push({
      path: modulePath,
      content: this.generateCompatibilityLayer(concerns, modulePath),
      type: 'compatibility-layer'
    });

    return {
      strategy: 'concern-separation',
      affectedFiles: [modulePath],
      newFiles,
      steps: [
        { type: 'create-files', files: newFiles },
        { type: 'update-imports', files: this.findFilesUsingModule(modulePath) }
      ]
    };
  }

  private async createTypeConsolidationPlan(analysis: any) {
    // Implementation for type consolidation strategy
    return {
      strategy: 'type-consolidation',
      affectedFiles: [],
      newFiles: [],
      steps: []
    };
  }

  private async createUtilityExtractionPlan(analysis: any) {
    // Implementation for utility extraction strategy
    return {
      strategy: 'utility-extraction',
      affectedFiles: [],
      newFiles: [],
      steps: []
    };
  }

  private generateConcernFilePath(originalPath: string, concernName: string): string {
    const dir = path.dirname(originalPath);
    const baseName = path.basename(originalPath, '.ts');
    return path.join(dir, `${baseName}-${concernName}.ts`);
  }

  private generateConcernFileContent(concern: any): string {
    return `/**
 * ${concern.name.charAt(0).toUpperCase() + concern.name.slice(1)} Module
 * 
 * ${concern.description || `Handles ${concern.name} related functionality`}
 */

${concern.imports || ''}

${concern.types || ''}

${concern.functions.map((fn: any) => fn.code).join('\n\n')}

${concern.exports || ''}
`;
  }

  private generateCompatibilityLayer(concerns: any[], originalPath: string): string {
    const baseName = path.basename(originalPath, '.ts');
    
    const reExports = concerns.map(concern => {
      const concernFileName = `${baseName}-${concern.name}`;
      const exports = concern.functions.map((fn: any) => fn.name).join(', ');
      return `export { ${exports} } from './${concernFileName}';`;
    }).join('\n');

    return `/**
 * ${baseName.charAt(0).toUpperCase() + baseName.slice(1)} Compatibility Layer
 * 
 * This file provides backward compatibility for existing imports
 * while the codebase migrates to the new modular structure.
 * 
 * @deprecated Use specific modules instead:
${concerns.map(c => ` * - ${baseName}-${c.name}.ts for ${c.name} logic`).join('\n')}
 */

${reExports}

// Legacy type exports for backward compatibility
export type * from './types/${baseName}-types';
`;
  }

  private async findFilesUsingModule(modulePath: string): Promise<string[]> {
    // Implementation to find files that import this module
    // This would scan the codebase for import statements
    return [];
  }

  private async executeRefactoringPlan(plan: any): Promise<RefactoringResult> {
    const changes: string[] = [];
    let filesCreated = 0;
    let filesModified = 0;

    for (const step of plan.steps) {
      switch (step.type) {
        case 'create-files':
          for (const file of step.files) {
            if (!this.options.dryRun) {
              await this.ensureDirectoryExists(path.dirname(file.path));
              await fs.writeFile(file.path, file.content, 'utf8');
            }
            changes.push(`Created: ${file.path}`);
            filesCreated++;
          }
          break;

        case 'update-imports':
          for (const filePath of step.files) {
            if (!this.options.dryRun) {
              await updateImports(filePath, plan.importMappings || {});
            }
            changes.push(`Updated imports: ${filePath}`);
            filesModified++;
          }
          break;
      }
    }

    return {
      success: true,
      changes,
      issues: [],
      metrics: {
        linesReduced: 0, // Calculate based on analysis
        filesCreated,
        filesModified,
        duplicatesRemoved: 0 // Calculate based on duplicates found
      }
    };
  }

  private async ensureDirectoryExists(dirPath: string): Promise<void> {
    try {
      await fs.access(dirPath);
    } catch {
      await fs.mkdir(dirPath, { recursive: true });
    }
  }

  private async validateRefactoring(affectedFiles: string[]) {
    logger.info('Validating refactoring changes...');
    
    try {
      const validation = await validateChanges(affectedFiles);
      return validation;
    } catch (error) {
      return {
        success: false,
        issues: [`Validation error: ${error}`]
      };
    }
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const modulePath = args[1];

  if (!command || !modulePath) {
    console.log(`
Usage:
  npm run refactor:analyze <module-path>
  npm run refactor:apply <module-path> [--strategy=<strategy>] [--dry-run]
  npm run refactor:validate <module-path>

Examples:
  npm run refactor:analyze lib/services/business-processing.ts
  npm run refactor:apply lib/services/business-processing.ts --strategy=concern-separation
  npm run refactor:validate lib/services/business-*
    `);
    process.exit(1);
  }

  const options: RefactoringOptions = {};
  
  // Parse command line options
  for (const arg of args.slice(2)) {
    if (arg.startsWith('--strategy=')) {
      options.strategy = arg.split('=')[1] as any;
    } else if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg === '--no-backup') {
      options.backup = false;
    } else if (arg === '--no-validate') {
      options.validate = false;
    } else if (arg === '--force') {
      options.force = true;
    }
  }

  const refactorer = new ModuleRefactorer(options);

  try {
    switch (command) {
      case 'analyze':
        const analysis = await refactorer['analyzeModule'](modulePath);
        console.log(JSON.stringify(analysis, null, 2));
        break;

      case 'apply':
        const result = await refactorer.refactorModule(modulePath);
        console.log('Refactoring Result:', result);
        break;

      case 'validate':
        const validation = await refactorer['validateRefactoring']([modulePath]);
        console.log('Validation Result:', validation);
        break;

      default:
        console.error(`Unknown command: ${command}`);
        process.exit(1);
    }
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

export { ModuleRefactorer, RefactoringOptions, RefactoringResult };

