/**
 * Scheduler-service Compatibility Layer
 * 
 * This file provides backward compatibility for existing imports
 * while the codebase migrates to the new modular structure.
 * 
 * @deprecated Use specific modules instead:
 * - scheduler-service-decision.ts for decision logic
 * - scheduler-service-execution.ts for execution logic
 */

export { handleAutoPublish } from './scheduler-service-decision';
export { processScheduledAutomation, processBusinessAutomation, processWeeklyCrawls } from './scheduler-service-execution';

// Legacy type exports for backward compatibility
export type * from './scheduler-service-types';
