/**
 * DTO Transformation Logger
 * 
 * Pragmatic logging strategy for bug identification and fix during DTO transformations.
 * 
 * Purpose:
 * - Track data flow from database → DTO transformation → API response
 * - Identify mismatches between stored data and DTO representations
 * - Log field-by-field transformations for debugging
 * - Help identify hardcoded values vs database values
 * 
 * Usage:
 * ```typescript
 * import { dtoLogger } from '@/lib/utils/dto-logger';
 * 
 * dtoLogger.logTransformation('BusinessDetailDTO', business, dto, {
 *   businessId: business.id,
 *   issues: ['automationEnabled', 'errorMessage'],
 * });
 * ```
 */

import { createLogger } from './logger';

const logger = createLogger('DTO');

export interface DTOTransformationContext {
  businessId?: number;
  fingerprintId?: number;
  crawlJobId?: number;
  issues?: string[]; // Fields to watch for mismatches
  warnings?: string[]; // Known issues or TODOs
}

export interface FieldComparison {
  field: string;
  source: unknown;
  transformed: unknown;
  sourceType: string;
  transformedType: string;
  matches: boolean;
  warning?: string;
}

class DTOLogger {
  /**
   * Log DTO transformation with field-by-field comparison
   * 
   * @param dtoName - Name of DTO (e.g., 'BusinessDetailDTO')
   * @param source - Source data from database
   * @param transformed - Transformed DTO
   * @param context - Context for logging
   */
  logTransformation(
    dtoName: string,
    source: any,
    transformed: any,
    context: DTOTransformationContext = {}
  ): void {
    const operationId = logger.start(`Transforming ${dtoName}`, {
      businessId: context.businessId,
      fingerprintId: context.fingerprintId,
    });

    // Track fields that may have issues
    const issuesToWatch = context.issues || [];
    const comparisons: FieldComparison[] = [];

    // Compare source and transformed for watched fields
    for (const field of issuesToWatch) {
      const sourceValue = source?.[field];
      const transformedValue = transformed?.[field];
      const sourceType = this.getType(sourceValue);
      const transformedType = this.getType(transformedValue);

      // Check if values match (considering null/undefined)
      const matches = this.valuesMatch(sourceValue, transformedValue);

      comparisons.push({
        field,
        source: sourceValue,
        transformed: transformedValue,
        sourceType,
        transformedType,
        matches,
      });

      // Log mismatch for watched fields
      if (!matches) {
        logger.warn(`⚠️  Field mismatch: ${field}`, {
          businessId: context.businessId,
          sourceValue,
          transformedValue,
          sourceType,
          transformedType,
          field,
        });
      }
    }

    // Log hardcoded values detection
    this.detectHardcodedValues(dtoName, source, transformed, context);

    // Log warnings if any
    if (context.warnings && context.warnings.length > 0) {
      context.warnings.forEach((warning) => {
        logger.warn(`⚠️  ${warning}`, {
          businessId: context.businessId,
          dtoName,
        });
      });
    }

    // Log summary
    const mismatchCount = comparisons.filter((c) => !c.matches).length;
    if (mismatchCount > 0) {
      logger.warn(`⚠️  ${mismatchCount} field mismatch(es) detected in ${dtoName}`, {
        businessId: context.businessId,
        mismatches: comparisons.filter((c) => !c.matches).map((c) => c.field),
      });
    } else {
      logger.debug(`✓ All watched fields match in ${dtoName}`, {
        businessId: context.businessId,
        fields: issuesToWatch,
      });
    }

    logger.complete(operationId, `Transforming ${dtoName}`, {
      businessId: context.businessId,
      comparisons: comparisons.length,
      mismatches: mismatchCount,
    });
  }

  /**
   * Detect hardcoded values vs database values
   * 
   * Common hardcoded values to detect:
   - `automationEnabled: true` (should use `business.automationEnabled`)
   - `trendValue: 0` (should calculate from historical data)
   - `errorMessage: null` (should come from crawlJobs)
   */
  private detectHardcodedValues(
    dtoName: string,
    source: any,
    transformed: any,
    context: DTOTransformationContext
  ): void {
    // Check for hardcoded automationEnabled
    if (transformed?.automationEnabled === true && source?.automationEnabled === undefined) {
      logger.warn(`⚠️  Hardcoded automationEnabled detected in ${dtoName}`, {
        businessId: context.businessId,
        field: 'automationEnabled',
        transformedValue: transformed.automationEnabled,
        sourceValue: source?.automationEnabled,
        suggestion: 'Use business.automationEnabled ?? true instead of hardcoding',
      });
    }

    // Check for hardcoded trendValue
    if (transformed?.trendValue === 0 && source) {
      logger.warn(`⚠️  Hardcoded trendValue detected in ${dtoName}`, {
        businessId: context.businessId,
        field: 'trendValue',
        transformedValue: transformed.trendValue,
        suggestion: 'Calculate from historical fingerprints instead of hardcoding to 0',
      });
    }

    // Check for errorMessage in wrong place
    if (transformed?.errorMessage !== undefined && source?.errorMessage === undefined) {
      logger.warn(`⚠️  errorMessage may be in wrong location in ${dtoName}`, {
        businessId: context.businessId,
        field: 'errorMessage',
        transformedValue: transformed.errorMessage,
        sourceValue: source?.errorMessage,
        suggestion: 'errorMessage should come from crawlJobs table, not businesses table',
      });
    }
  }

  /**
   * Compare two values considering null/undefined
   */
  private valuesMatch(source: unknown, transformed: unknown): boolean {
    // Both null or undefined
    if ((source === null || source === undefined) && (transformed === null || transformed === undefined)) {
      return true;
    }

    // One is null/undefined, other is not
    if ((source === null || source === undefined) !== (transformed === null || transformed === undefined)) {
      return false;
    }

    // Same primitive value
    if (source === transformed) {
      return true;
    }

    // Type mismatch
    if (typeof source !== typeof transformed) {
      return false;
    }

    // Date comparison
    if (source instanceof Date && transformed instanceof Date) {
      return source.getTime() === transformed.getTime();
    }

    // For complex objects, just check if both exist (deep comparison not needed)
    return true;
  }

  /**
   * Get type string for a value
   */
  private getType(value: unknown): string {
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';
    if (value instanceof Date) return 'Date';
    if (Array.isArray(value)) return 'Array';
    return typeof value;
  }

  /**
   * Log field extraction for debugging
   * 
   * Use this when extracting fields from related tables (e.g., errorMessage from crawlJobs)
   */
  logFieldExtraction(
    field: string,
    source: unknown,
    extractedFrom: string,
    context: DTOTransformationContext = {}
  ): void {
    logger.debug(`Extracting ${field} from ${extractedFrom}`, {
      businessId: context.businessId,
      field,
      extractedFrom,
      value: source,
      sourceType: this.getType(source),
    });
  }

  /**
   * Log DTO-to-DTO comparison (e.g., BusinessDetailDTO vs DashboardBusinessDTO)
   * 
   * Useful for verifying consistency across different DTOs
   */
  logDTOComparison(
    dto1Name: string,
    dto1: any,
    dto2Name: string,
    dto2: any,
    commonFields: string[],
    context: DTOTransformationContext = {}
  ): void {
    const mismatches: string[] = [];

    for (const field of commonFields) {
      const value1 = dto1?.[field];
      const value2 = dto2?.[field];

      if (!this.valuesMatch(value1, value2)) {
        mismatches.push(field);
        logger.warn(`⚠️  Field mismatch between ${dto1Name} and ${dto2Name}: ${field}`, {
          businessId: context.businessId,
          field,
          [`${dto1Name}.${field}`]: value1,
          [`${dto2Name}.${field}`]: value2,
        });
      }
    }

    if (mismatches.length === 0) {
      logger.debug(`✓ All common fields match between ${dto1Name} and ${dto2Name}`, {
        businessId: context.businessId,
        fields: commonFields,
      });
    } else {
      logger.warn(`⚠️  ${mismatches.length} field mismatch(es) between ${dto1Name} and ${dto2Name}`, {
        businessId: context.businessId,
        mismatches,
      });
    }
  }
}

export const dtoLogger = new DTOLogger();

