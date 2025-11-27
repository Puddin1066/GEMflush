/**
 * Visibility Report Email API Route
 * 
 * POST /api/email/visibility-report
 * 
 * Send visibility report email to user after fingerprint analysis completes.
 * Requires authentication.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getUser, getTeamForUser } from '@/lib/db/queries';
import { getBusinessById } from '@/lib/db/queries';
import { visibilityReportEmailSchema } from '@/lib/validation/email';
import { sendVisibilityReportEmail } from '@/lib/email/send';
import { getLatestFingerprint } from '@/lib/db/queries';
import { loggers } from '@/lib/utils/logger';
import { z } from 'zod';

const logger = loggers.api;

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const user = await getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Validate request body
    const body = await request.json();
    const validated = visibilityReportEmailSchema.parse(body);

    // Get business and verify ownership
    const business = await getBusinessById(validated.businessId);
    if (!business) {
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      );
    }

    // Verify user has access to this business
    const team = await getTeamForUser();
    if (!team || business.teamId !== team.id) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    // Get latest fingerprint data
    const fingerprint = await getLatestFingerprint(validated.businessId);
    if (!fingerprint) {
      return NextResponse.json(
        { error: 'No fingerprint data available for this business' },
        { status: 404 }
      );
    }

    // Determine target email
    const targetEmail = validated.email || user.email;

    // Generate insights from fingerprint data
    const insights: string[] = [];
    if (fingerprint.visibilityScore !== null) {
      insights.push(`Visibility Score: ${fingerprint.visibilityScore}/100`);
    }
    if (fingerprint.competitiveLeaderboard) {
      const leaderboard = fingerprint.competitiveLeaderboard as any;
      if (leaderboard.insights?.recommendation) {
        insights.push(leaderboard.insights.recommendation);
      }
    }

    // Send visibility report email
    try {
      await sendVisibilityReportEmail(
        targetEmail,
        business.name,
        fingerprint.visibilityScore || 0,
        insights.length > 0 ? insights : ['Your visibility analysis is complete. View details in your dashboard.']
      );

      logger.info('Visibility report email sent', {
        userId: user.id,
        businessId: validated.businessId,
        email: targetEmail,
      });

      return NextResponse.json(
        { message: 'Visibility report email sent successfully' },
        { status: 200 }
      );
    } catch (emailError) {
      logger.error('Failed to send visibility report email', emailError, {
        userId: user.id,
        businessId: validated.businessId,
        email: targetEmail,
      });
      return NextResponse.json(
        { error: 'Failed to send email' },
        { status: 500 }
      );
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.error('Visibility report email validation error', error, {
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

    logger.error('Visibility report email request failed', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

