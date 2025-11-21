/**
 * Scheduler Service Compatibility Layer
 * 
 * This file provides backward compatibility for existing imports
 * while the codebase migrates to the new modular structure.
 * 
 * @deprecated Use specific modules instead:
 * - scheduler/scheduler-orchestration.ts for publish workflow logic
 * - scheduler/scheduler-execution.ts for batch processing and execution logic
 */

// Re-export orchestration functions
export { handleAutoPublish } from './scheduler/scheduler-orchestration';

// Re-export execution functions
export { 
  processScheduledAutomation,
  processBusinessAutomation
} from './scheduler/scheduler-execution';

/**
 * @deprecated Use processScheduledAutomation() instead
 * Legacy function for backward compatibility
 * Process weekly crawls for all businesses with automation enabled
 */
export async function processWeeklyCrawls(): Promise<void> {
  const { processScheduledAutomation } = await import('./scheduler/scheduler-execution');
  const { loggers } = await import('@/lib/utils/logger');
  
  const log = loggers.scheduler;
  log.warn('processWeeklyCrawls() is deprecated, use processScheduledAutomation() instead');
  
  await processScheduledAutomation();
}