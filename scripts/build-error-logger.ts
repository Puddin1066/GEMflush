/**
 * Strategic Build Error Logger
 * 
 * Identifies and logs build errors with context for debugging
 * 
 * SOLID: Single Responsibility - build error identification only
 */

import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import * as fs from 'fs/promises';
import * as path from 'path';

const execAsync = promisify(exec);

interface BuildError {
  file: string;
  line: number;
  column: number;
  message: string;
  type: 'type' | 'syntax' | 'import' | 'other';
}

/**
 * Parse Next.js build output for errors
 */
function parseBuildErrors(output: string): BuildError[] {
  const errors: BuildError[] = [];
  const lines = output.split('\n');
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Match Next.js error format: ./path/to/file.tsx:line:column
    const fileMatch = line.match(/^\.\/(.+?):(\d+):(\d+)/);
    if (fileMatch) {
      const [, file, lineNum, colNum] = fileMatch;
      const nextLine = lines[i + 1];
      
      // Determine error type
      let type: BuildError['type'] = 'other';
      if (nextLine?.includes('Type error')) type = 'type';
      else if (nextLine?.includes('Syntax error')) type = 'syntax';
      else if (nextLine?.includes('Cannot find module') || nextLine?.includes('Module not found')) type = 'import';
      
      errors.push({
        file,
        line: parseInt(lineNum, 10),
        column: parseInt(colNum, 10),
        message: nextLine || line,
        type,
      });
    }
  }
  
  return errors;
}

/**
 * Get file context around error line
 */
async function getErrorContext(filePath: string, line: number, contextLines: number = 5): Promise<string[]> {
  try {
    const fullPath = path.join(process.cwd(), filePath);
    const content = await fs.readFile(fullPath, 'utf-8');
    const lines = content.split('\n');
    
    const start = Math.max(0, line - contextLines - 1);
    const end = Math.min(lines.length, line + contextLines);
    
    return lines.slice(start, end).map((l, i) => {
      const lineNum = start + i + 1;
      const marker = lineNum === line ? '>>>' : '   ';
      return `${marker} ${lineNum}: ${l}`;
    });
  } catch (error) {
    return [`Error reading file: ${error instanceof Error ? error.message : String(error)}`];
  }
}

/**
 * Analyze build error and provide recommendations
 */
function analyzeError(error: BuildError): string[] {
  const recommendations: string[] = [];
  
  if (error.type === 'type') {
    recommendations.push('🔍 Type Error Detected');
    recommendations.push('   - Check TypeScript type definitions');
    recommendations.push('   - Verify prop types match component expectations');
    recommendations.push('   - Check for missing type assertions or casts');
  } else if (error.type === 'import') {
    recommendations.push('🔍 Import Error Detected');
    recommendations.push('   - Verify file path is correct');
    recommendations.push('   - Check if file exists');
    recommendations.push('   - Verify export/import syntax');
  } else if (error.type === 'syntax') {
    recommendations.push('🔍 Syntax Error Detected');
    recommendations.push('   - Check for missing brackets, parentheses, or quotes');
    recommendations.push('   - Verify JSX syntax is correct');
  }
  
  return recommendations;
}

/**
 * Main build error logging function
 */
async function logBuildErrors(): Promise<void> {
  console.log('\n' + '='.repeat(70));
  console.log('🔍 STRATEGIC BUILD ERROR ANALYSIS');
  console.log('='.repeat(70) + '\n');
  
  try {
    console.log('Running build to capture errors...\n');
    const { stdout, stderr } = await execAsync('pnpm build', {
      cwd: process.cwd(),
      maxBuffer: 10 * 1024 * 1024, // 10MB buffer
    });
    
    // If build succeeds, no errors
    if (!stderr || stderr.length === 0) {
      console.log('✅ Build completed successfully - no errors found!\n');
      return;
    }
    
    // Parse errors
    const errors = parseBuildErrors(stderr);
    
    if (errors.length === 0) {
      console.log('⚠️  Build failed but no parseable errors found');
      console.log('Raw error output:');
      console.log(stderr);
      return;
    }
    
    console.log(`Found ${errors.length} build error(s):\n`);
    
    for (const error of errors) {
      console.log('─'.repeat(70));
      console.log(`📁 File: ${error.file}`);
      console.log(`📍 Location: Line ${error.line}, Column ${error.column}`);
      console.log(`🔴 Error Type: ${error.type.toUpperCase()}`);
      console.log(`💬 Message: ${error.message}\n`);
      
      // Get context
      console.log('📄 Code Context:');
      const context = await getErrorContext(error.file, error.line);
      context.forEach(line => console.log(line));
      console.log('');
      
      // Recommendations
      const recommendations = analyzeError(error);
      if (recommendations.length > 0) {
        console.log('💡 Recommendations:');
        recommendations.forEach(rec => console.log(rec));
        console.log('');
      }
    }
    
    console.log('='.repeat(70));
    console.log(`\n❌ Build failed with ${errors.length} error(s)`);
    console.log('Fix the errors above and run: pnpm build\n');
    
  } catch (error: any) {
    // Build command failed - parse the error
    const errorOutput = error.stderr || error.stdout || error.message || '';
    const errors = parseBuildErrors(errorOutput);
    
    if (errors.length > 0) {
      console.log(`Found ${errors.length} build error(s):\n`);
      
      for (const error of errors) {
        console.log('─'.repeat(70));
        console.log(`📁 File: ${error.file}`);
        console.log(`📍 Location: Line ${error.line}, Column ${error.column}`);
        console.log(`🔴 Error Type: ${error.type.toUpperCase()}`);
        console.log(`💬 Message: ${error.message}\n`);
        
        // Get context
        console.log('📄 Code Context:');
        const context = await getErrorContext(error.file, error.line);
        context.forEach(line => console.log(line));
        console.log('');
        
        // Recommendations
        const recommendations = analyzeError(error);
        if (recommendations.length > 0) {
          console.log('💡 Recommendations:');
          recommendations.forEach(rec => console.log(rec));
          console.log('');
        }
      }
    } else {
      console.log('⚠️  Build failed but could not parse errors');
      console.log('Raw error output:');
      console.log(errorOutput);
    }
  }
}

// Run if called directly
if (require.main === module) {
  logBuildErrors().catch(error => {
    console.error('❌ Error running build logger:', error);
    process.exit(1);
  });
}

export { logBuildErrors, parseBuildErrors, analyzeError };


