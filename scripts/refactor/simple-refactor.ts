#!/usr/bin/env tsx

/**
 * Simple Module Refactoring Tool
 * 
 * A simplified version that focuses on practical refactoring without complex TypeScript analysis
 */

import { promises as fs } from 'fs';
import path from 'path';

interface SimpleAnalysis {
  filePath: string;
  linesOfCode: number;
  functions: Array<{
    name: string;
    startLine: number;
    endLine: number;
    concern: string;
  }>;
  concerns: Array<{
    name: string;
    functions: string[];
    description: string;
  }>;
  recommendations: string[];
}

class SimpleRefactorer {
  async analyzeModule(filePath: string): Promise<SimpleAnalysis> {
    const content = await fs.readFile(filePath, 'utf8');
    const lines = content.split('\n');
    
    console.log(`📁 Analyzing: ${filePath}`);
    console.log(`📊 Lines of code: ${lines.length}`);
    
    const functions = this.extractFunctions(content, lines);
    const concerns = this.identifyConcerns(functions);
    const recommendations = this.generateRecommendations(functions, concerns, lines.length);
    
    return {
      filePath,
      linesOfCode: lines.length,
      functions,
      concerns,
      recommendations
    };
  }

  private extractFunctions(content: string, lines: string[]): Array<{ name: string; startLine: number; endLine: number; concern: string }> {
    const functions: Array<{ name: string; startLine: number; endLine: number; concern: string }> = [];
    
    // Simple regex-based function extraction
    const functionRegex = /(?:export\s+)?(?:async\s+)?function\s+(\w+)|(?:export\s+)?const\s+(\w+)\s*=\s*(?:async\s+)?\(/g;
    
    let match;
    while ((match = functionRegex.exec(content)) !== null) {
      const functionName = match[1] || match[2];
      const startPos = match.index;
      
      // Find line number
      const beforeFunction = content.substring(0, startPos);
      const startLine = beforeFunction.split('\n').length;
      
      // Estimate end line (simplified)
      const endLine = this.findFunctionEnd(lines, startLine - 1);
      
      // Determine concern based on function name
      const concern = this.determineConcern(functionName);
      
      functions.push({
        name: functionName,
        startLine,
        endLine,
        concern
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
            return i + 1;
          }
        }
      }
    }
    
    return startLine + 10; // Fallback
  }

  private determineConcern(functionName: string): string {
    const name = functionName.toLowerCase();
    
    if (name.includes('should') || name.includes('can') || name.includes('is') || name.includes('check')) {
      return 'decision';
    }
    if (name.includes('execute') || name.includes('run') || name.includes('process')) {
      return 'execution';
    }
    if (name.includes('auto') || name.includes('orchestrate') || name.includes('coordinate')) {
      return 'orchestration';
    }
    if (name.includes('get') || name.includes('fetch') || name.includes('save') || name.includes('update')) {
      return 'data';
    }
    
    return 'general';
  }

  private identifyConcerns(functions: Array<{ name: string; concern: string }>): Array<{ name: string; functions: string[]; description: string }> {
    const concernMap = new Map<string, string[]>();
    
    functions.forEach(func => {
      if (!concernMap.has(func.concern)) {
        concernMap.set(func.concern, []);
      }
      concernMap.get(func.concern)!.push(func.name);
    });
    
    const descriptions = {
      decision: 'Handles decision-making logic and validation',
      execution: 'Executes business operations and processes',
      orchestration: 'Coordinates and manages complex workflows',
      data: 'Manages data access and manipulation',
      general: 'General purpose functionality'
    };
    
    return Array.from(concernMap.entries()).map(([name, funcs]) => ({
      name,
      functions: funcs,
      description: descriptions[name as keyof typeof descriptions] || 'General functionality'
    }));
  }

  private generateRecommendations(
    functions: Array<{ name: string; startLine: number; endLine: number; concern: string }>,
    concerns: Array<{ name: string; functions: string[] }>,
    totalLines: number
  ): string[] {
    const recommendations: string[] = [];
    
    // Check for mixed concerns
    if (concerns.length > 2) {
      recommendations.push(`🔄 Split module: Found ${concerns.length} different concerns - consider splitting into separate files`);
    }
    
    // Check for large functions
    const largeFunctions = functions.filter(f => (f.endLine - f.startLine) > 30);
    if (largeFunctions.length > 0) {
      recommendations.push(`📏 Large functions: ${largeFunctions.length} functions are over 30 lines - consider breaking them down`);
    }
    
    // Check for large file
    if (totalLines > 200) {
      recommendations.push(`📄 Large file: ${totalLines} lines - consider splitting into smaller modules`);
    }
    
    // Specific recommendations for each concern
    concerns.forEach(concern => {
      if (concern.functions.length > 5) {
        recommendations.push(`📦 Extract ${concern.name}: ${concern.functions.length} ${concern.name} functions could be moved to a dedicated module`);
      }
    });
    
    return recommendations;
  }

  async generateRefactoredStructure(analysis: SimpleAnalysis): Promise<void> {
    const baseName = path.basename(analysis.filePath, '.ts');
    const baseDir = path.dirname(analysis.filePath);
    
    console.log('\n🏗️  Suggested Refactored Structure:');
    console.log('=====================================');
    
    // Show proposed file structure
    analysis.concerns.forEach(concern => {
      if (concern.functions.length > 0) {
        const fileName = `${baseName}-${concern.name}.ts`;
        const filePath = path.join(baseDir, fileName);
        
        console.log(`\n📁 ${fileName}`);
        console.log(`   ${concern.description}`);
        console.log(`   Functions: ${concern.functions.join(', ')}`);
        
        // Show what the file would look like
        console.log(`   \n   Example structure:`);
        console.log(`   /**`);
        console.log(`    * ${baseName.charAt(0).toUpperCase() + baseName.slice(1)} ${concern.name.charAt(0).toUpperCase() + concern.name.slice(1)}`);
        console.log(`    * ${concern.description}`);
        console.log(`    */`);
        console.log(`   `);
        concern.functions.forEach(func => {
          console.log(`   export function ${func}() { /* implementation */ }`);
        });
      }
    });
    
    // Show compatibility layer
    console.log(`\n📁 ${baseName}.ts (Compatibility Layer)`);
    console.log(`   Provides backward compatibility for existing imports`);
    console.log(`   \n   Example structure:`);
    console.log(`   /**`);
    console.log(`    * @deprecated Use specific modules instead`);
    console.log(`    */`);
    
    analysis.concerns.forEach(concern => {
      if (concern.functions.length > 0) {
        const fileName = `${baseName}-${concern.name}`;
        console.log(`   export { ${concern.functions.join(', ')} } from './${fileName}';`);
      }
    });
  }
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const modulePath = args[1];

  if (!command || !modulePath) {
    console.log(`
🔧 Simple Module Refactoring Tool

Usage:
  npm run refactor:simple analyze <module-path>
  npm run refactor:simple suggest <module-path>

Examples:
  npm run refactor:simple analyze lib/services/business-processing.ts
  npm run refactor:simple suggest lib/services/business-processing.ts
    `);
    process.exit(1);
  }

  const refactorer = new SimpleRefactorer();

  try {
    switch (command) {
      case 'analyze':
        const analysis = await refactorer.analyzeModule(modulePath);
        
        console.log('\n📊 Analysis Results:');
        console.log('===================');
        console.log(`File: ${analysis.filePath}`);
        console.log(`Lines: ${analysis.linesOfCode}`);
        console.log(`Functions: ${analysis.functions.length}`);
        console.log(`Concerns: ${analysis.concerns.length}`);
        
        console.log('\n🔍 Functions by Concern:');
        analysis.concerns.forEach(concern => {
          console.log(`\n${concern.name.toUpperCase()} (${concern.functions.length} functions):`);
          console.log(`  ${concern.description}`);
          concern.functions.forEach(func => console.log(`  - ${func}`));
        });
        
        console.log('\n💡 Recommendations:');
        analysis.recommendations.forEach(rec => console.log(`  ${rec}`));
        break;

      case 'suggest':
        const suggestionAnalysis = await refactorer.analyzeModule(modulePath);
        await refactorer.generateRefactoredStructure(suggestionAnalysis);
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

export { SimpleRefactorer };

