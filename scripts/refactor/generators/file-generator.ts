/**
 * File Generator
 * 
 * Generates refactored files based on analysis and templates
 */

import { promises as fs } from 'fs';
import path from 'path';

export interface FileSpec {
  path: string;
  content: string;
  type: 'concern-module' | 'type-definitions' | 'utility-module' | 'compatibility-layer';
}

export interface GenerationContext {
  moduleName: string;
  concerns: Array<{
    name: string;
    functions: any[];
    types: any[];
  }>;
  originalPath: string;
  targetDirectory: string;
}

export class FileGenerator {
  private templates: Map<string, string> = new Map();

  constructor() {
    this.loadTemplates();
  }

  private loadTemplates(): void {
    // Service module template
    this.templates.set('concern-module', `/**
 * {{MODULE_NAME}} {{CONCERN_NAME}} Module
 * 
 * {{DESCRIPTION}}
 * 
 * @module {{MODULE_PATH}}
 */

{{IMPORTS}}

{{TYPE_DEFINITIONS}}

{{FUNCTION_IMPLEMENTATIONS}}

{{EXPORTS}}
`);

    // Type definitions template
    this.templates.set('type-definitions', `/**
 * {{MODULE_NAME}} Type Definitions
 * 
 * Shared type definitions for {{MODULE_NAME}} modules
 * 
 * @module {{MODULE_PATH}}
 */

{{TYPE_DEFINITIONS}}

{{EXPORTS}}
`);

    // Utility module template
    this.templates.set('utility-module', `/**
 * {{MODULE_NAME}} Utilities
 * 
 * Utility functions for {{MODULE_NAME}}
 * 
 * @module {{MODULE_PATH}}
 */

{{IMPORTS}}

{{UTILITY_FUNCTIONS}}

{{EXPORTS}}
`);

    // Compatibility layer template
    this.templates.set('compatibility-layer', `/**
 * {{MODULE_NAME}} Compatibility Layer
 * 
 * This file provides backward compatibility for existing imports
 * while the codebase migrates to the new modular structure.
 * 
 * @deprecated Use specific modules instead:
{{DEPRECATION_NOTES}}
 */

{{RE_EXPORTS}}

{{LEGACY_FUNCTIONS}}
`);
  }

  async generateRefactoredFiles(context: GenerationContext): Promise<FileSpec[]> {
    const files: FileSpec[] = [];

    // Generate concern-specific modules
    for (const concern of context.concerns) {
      const concernFile = await this.generateConcernModule(context, concern);
      files.push(concernFile);
    }

    // Generate shared types module
    const typesFile = await this.generateTypesModule(context);
    files.push(typesFile);

    // Generate compatibility layer
    const compatibilityFile = await this.generateCompatibilityLayer(context);
    files.push(compatibilityFile);

    return files;
  }

  private async generateConcernModule(context: GenerationContext, concern: any): Promise<FileSpec> {
    const template = this.templates.get('concern-module')!;
    const concernName = concern.name;
    const fileName = `${context.moduleName}-${concernName}.ts`;
    const filePath = path.join(context.targetDirectory, fileName);

    // Generate imports
    const imports = this.generateImports(concern);
    
    // Generate type definitions (if any)
    const typeDefinitions = concern.types.length > 0 
      ? concern.types.map((type: any) => type.code).join('\n\n')
      : '';

    // Generate function implementations
    const functionImplementations = concern.functions
      .map((func: any) => func.code)
      .join('\n\n');

    // Generate exports
    const exports = this.generateExports(concern);

    const content = template
      .replace(/\{\{MODULE_NAME\}\}/g, this.capitalize(context.moduleName))
      .replace(/\{\{CONCERN_NAME\}\}/g, this.capitalize(concernName))
      .replace(/\{\{DESCRIPTION\}\}/g, this.generateConcernDescription(concernName))
      .replace(/\{\{MODULE_PATH\}\}/g, filePath)
      .replace(/\{\{IMPORTS\}\}/g, imports)
      .replace(/\{\{TYPE_DEFINITIONS\}\}/g, typeDefinitions)
      .replace(/\{\{FUNCTION_IMPLEMENTATIONS\}\}/g, functionImplementations)
      .replace(/\{\{EXPORTS\}\}/g, exports);

    return {
      path: filePath,
      content: this.cleanupContent(content),
      type: 'concern-module'
    };
  }

  private async generateTypesModule(context: GenerationContext): Promise<FileSpec> {
    const template = this.templates.get('type-definitions')!;
    const fileName = `${context.moduleName}-types.ts`;
    const filePath = path.join(context.targetDirectory, 'types', fileName);

    // Collect all types from all concerns
    const allTypes = context.concerns.flatMap(concern => concern.types);
    
    const typeDefinitions = allTypes
      .map((type: any) => type.code)
      .join('\n\n');

    const exports = allTypes
      .map((type: any) => `export type { ${type.name} };`)
      .join('\n');

    const content = template
      .replace(/\{\{MODULE_NAME\}\}/g, this.capitalize(context.moduleName))
      .replace(/\{\{MODULE_PATH\}\}/g, filePath)
      .replace(/\{\{TYPE_DEFINITIONS\}\}/g, typeDefinitions)
      .replace(/\{\{EXPORTS\}\}/g, exports);

    return {
      path: filePath,
      content: this.cleanupContent(content),
      type: 'type-definitions'
    };
  }

  private async generateCompatibilityLayer(context: GenerationContext): Promise<FileSpec> {
    const template = this.templates.get('compatibility-layer')!;
    const filePath = context.originalPath;

    // Generate re-exports
    const reExports = context.concerns.map(concern => {
      const concernFileName = `${context.moduleName}-${concern.name}`;
      const functionNames = concern.functions.map((func: any) => func.name).join(', ');
      return `export { ${functionNames} } from './${concernFileName}';`;
    }).join('\n');

    // Generate deprecation notes
    const deprecationNotes = context.concerns.map(concern => 
      ` * - ${context.moduleName}-${concern.name}.ts for ${concern.name} logic`
    ).join('\n');

    // Generate legacy function wrappers (if needed)
    const legacyFunctions = this.generateLegacyWrappers(context);

    const content = template
      .replace(/\{\{MODULE_NAME\}\}/g, this.capitalize(context.moduleName))
      .replace(/\{\{DEPRECATION_NOTES\}\}/g, deprecationNotes)
      .replace(/\{\{RE_EXPORTS\}\}/g, reExports)
      .replace(/\{\{LEGACY_FUNCTIONS\}\}/g, legacyFunctions);

    return {
      path: filePath,
      content: this.cleanupContent(content),
      type: 'compatibility-layer'
    };
  }

  private generateImports(concern: any): string {
    const imports = new Set<string>();

    // Add common imports
    imports.add("import { logger } from '../utils/logger';");
    
    // Add database imports if needed
    if (concern.functions.some((func: any) => func.code.includes('db.'))) {
      imports.add("import { db } from '@/lib/db';");
    }

    // Add type imports
    if (concern.types.length > 0) {
      imports.add("import type * from './types';");
    }

    return Array.from(imports).join('\n');
  }

  private generateExports(concern: any): string {
    const functionExports = concern.functions
      .map((func: any) => func.name)
      .join(', ');

    const typeExports = concern.types
      .map((type: any) => type.name)
      .join(', ');

    let exports = '';
    
    if (functionExports) {
      exports += `export { ${functionExports} };\n`;
    }
    
    if (typeExports) {
      exports += `export type { ${typeExports} };\n`;
    }

    return exports;
  }

  private generateConcernDescription(concernName: string): string {
    const descriptions: Record<string, string> = {
      'decision': 'Handles decision-making logic and validation rules',
      'execution': 'Executes business operations and processes',
      'orchestration': 'Coordinates and manages complex workflows',
      'data': 'Manages data access and manipulation operations',
      'utility': 'Provides utility functions and helper methods',
      'api': 'Handles API communication and external service integration',
      'database': 'Manages database operations and queries',
      'validation': 'Provides validation logic and error checking',
      'formatting': 'Handles data formatting and transformation'
    };

    return descriptions[concernName] || `Handles ${concernName} related functionality`;
  }

  private generateLegacyWrappers(context: GenerationContext): string {
    // Generate legacy wrapper functions for backward compatibility
    const wrappers: string[] = [];

    context.concerns.forEach(concern => {
      concern.functions.forEach((func: any) => {
        if (func.isLegacy) {
          wrappers.push(`
/**
 * @deprecated Use ${func.name} from ${context.moduleName}-${concern.name} instead
 */
export async function ${func.name}Legacy(...args: any[]): Promise<any> {
  const { ${func.name} } = await import('./${context.moduleName}-${concern.name}');
  return ${func.name}(...args);
}`);
        }
      });
    });

    return wrappers.join('\n');
  }

  private capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  private cleanupContent(content: string): string {
    // Remove empty lines and normalize spacing
    return content
      .split('\n')
      .map(line => line.trimEnd())
      .filter((line, index, array) => {
        // Remove multiple consecutive empty lines
        if (line === '' && array[index - 1] === '') {
          return false;
        }
        return true;
      })
      .join('\n')
      .trim() + '\n';
  }
}

export async function generateRefactoredFiles(context: GenerationContext): Promise<FileSpec[]> {
  const generator = new FileGenerator();
  return generator.generateRefactoredFiles(context);
}

