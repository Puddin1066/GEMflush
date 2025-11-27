/**
 * Password Reset Request API Route
 * 
 * POST /api/auth/password-reset
 * 
 * Request a password reset email to be sent to the user.
 * This endpoint does not require authentication.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getUserByEmail } from '@/lib/db/queries';
import { passwordResetRequestSchema } from '@/lib/validation/email';
import { generateSecureToken, storeResetToken } from '@/lib/email/examples';
import { sendPasswordResetEmail } from '@/lib/email/send';
import { loggers } from '@/lib/utils/logger';
import { z } from 'zod';

const logger = loggers.api;

export async function POST(request: NextRequest) {
  try {
    // Validate request body
    const body = await request.json();
    const validated = passwordResetRequestSchema.parse(body);

    // Find user by email
    const user = await getUserByEmail(validated.email);

    // Security: Always return success even if user doesn't exist
    // This prevents email enumeration attacks
    if (!user) {
      logger.info('Password reset requested for non-existent email', {
        email: validated.email,
      });
      return NextResponse.json(
        { message: 'If an account exists with this email, a password reset link has been sent.' },
        { status: 200 }
      );
    }

    // Generate secure reset token
    const resetToken = generateSecureToken();

    // Store token in database with 1 hour expiry
    await storeResetToken(user.email, resetToken, '1 hour');

    // Send password reset email
    try {
      await sendPasswordResetEmail(user.email, resetToken, user.name || undefined);
      logger.info('Password reset email sent', {
        userId: user.id,
        email: user.email,
      });
    } catch (emailError) {
      logger.error('Failed to send password reset email', emailError, {
        userId: user.id,
        email: user.email,
      });
      // Don't fail the request if email fails - token is still stored
    }

    return NextResponse.json(
      { message: 'If an account exists with this email, a password reset link has been sent.' },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.error('Password reset validation error', error, {
        errors: error.errors.map(e => ({
          path: e.path.join('.'),
          message: e.message,
        })),
      });
      return NextResponse.json(
        {
          error: 'Validation error',
          details: error.errors.map(e => ({
            path: e.path.join('.'),
            message: e.message,
          })),
        },
        { status: 400 }
      );
    }

    logger.error('Password reset request failed', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}


