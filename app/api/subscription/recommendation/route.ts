/**
 * Subscription Recommendation API Route
 * 
 * GET /api/subscription/recommendation?feature=wikidata
 * 
 * Get recommended upgrade plan for a specific feature.
 * Requires authentication.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getUser, getTeamForUser } from '@/lib/db/queries';
import { getUpgradeConfig, getRecommendedPlan } from '@/lib/subscription/upgrade-config';
import { upgradeFeatureQuerySchema } from '@/lib/validation/subscription';
import { loggers } from '@/lib/utils/logger';
import { z } from 'zod';

const logger = loggers.api;

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const user = await getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user's team
    const team = await getTeamForUser();
    if (!team) {
      return NextResponse.json(
        { error: 'No team found' },
        { status: 404 }
      );
    }

    // Get and validate feature query parameter
    const { searchParams } = new URL(request.url);
    const featureParam = searchParams.get('feature');

    if (!featureParam) {
      return NextResponse.json(
        { error: 'Feature parameter is required' },
        { status: 400 }
      );
    }

    try {
      const validated = upgradeFeatureQuerySchema.parse({ feature: featureParam });

      // Get current plan (default to 'free' if not set)
      const currentPlan = (team.planName?.toLowerCase() || 'free') as 'free' | 'pro' | 'agency';

      // Get upgrade config for feature
      const config = getUpgradeConfig(validated.feature);

      // Get recommended plan
      const recommendedPlan = getRecommendedPlan(currentPlan, validated.feature);

      // Check if upgrade is needed
      const needsUpgrade = currentPlan !== 'agency' && 
        (config.targetPlan === 'agency' || (config.targetPlan === 'pro' && currentPlan === 'free'));

      return NextResponse.json({
        feature: validated.feature,
        currentPlan,
        recommendedPlan,
        needsUpgrade,
        config: {
          title: config.title,
          description: config.description,
          benefits: config.benefits,
          targetPlan: config.targetPlan,
          price: config.price,
          ctaText: config.ctaText,
        },
      });
    } catch (validationError) {
      if (validationError instanceof z.ZodError) {
        logger.error('Subscription recommendation validation error', validationError, {
          feature: featureParam,
        });
        return NextResponse.json(
          {
            error: 'Validation error',
            details: validationError.errors.map(e => ({
              path: e.path.join('.'),
              message: e.message,
            })),
          },
          { status: 400 }
        );
      }
      throw validationError;
    }
  } catch (error) {
    logger.error('Failed to get subscription recommendation', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}


