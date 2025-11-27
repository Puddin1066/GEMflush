/**
 * Resend Welcome Email API Route
 * 
 * POST /api/auth/resend-welcome
 * 
 * Resend welcome email to authenticated user or specified email.
 * Requires authentication unless email is explicitly provided.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getUser, getUserByEmail } from '@/lib/db/queries';
import { resendWelcomeEmailSchema } from '@/lib/validation/email';
import { sendWelcomeEmail } from '@/lib/email/send';
import { loggers } from '@/lib/utils/logger';
import { z } from 'zod';

const logger = loggers.api;

export async function POST(request: NextRequest) {
  try {
    // Validate request body
    const body = await request.json();
    const validated = resendWelcomeEmailSchema.parse(body);

    let targetUser;

    if (validated.email) {
      // If email provided, find user by email (admin use case)
      targetUser = await getUserByEmail(validated.email);
      if (!targetUser) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        );
      }
    } else {
      // Otherwise, use authenticated user
      targetUser = await getUser();
      if (!targetUser) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }
    }

    // Send welcome email
    try {
      await sendWelcomeEmail(targetUser.email, targetUser.name || undefined);
      logger.info('Welcome email resent', {
        userId: targetUser.id,
        email: targetUser.email,
      });

      return NextResponse.json(
        { message: 'Welcome email sent successfully' },
        { status: 200 }
      );
    } catch (emailError) {
      logger.error('Failed to send welcome email', emailError, {
        userId: targetUser.id,
        email: targetUser.email,
      });
      return NextResponse.json(
        { error: 'Failed to send email' },
        { status: 500 }
      );
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.error('Resend welcome email validation error', error, {
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

    logger.error('Resend welcome email request failed', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}


