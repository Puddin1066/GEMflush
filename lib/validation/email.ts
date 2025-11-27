/**
 * Email validation schemas
 * DRY: Centralized validation for email-related API endpoints
 */

import { z } from 'zod';

/**
 * Password reset request schema
 */
export const passwordResetRequestSchema = z.object({
  email: z.string().email('Invalid email address'),
});

/**
 * Resend welcome email schema
 */
export const resendWelcomeEmailSchema = z.object({
  email: z.string().email('Invalid email address').optional(),
  // If email not provided, uses authenticated user's email
});

/**
 * Visibility report email schema
 */
export const visibilityReportEmailSchema = z.object({
  businessId: z.number().int().positive('Business ID must be a positive integer'),
  email: z.string().email('Invalid email address').optional(),
  // If email not provided, uses authenticated user's email
});


