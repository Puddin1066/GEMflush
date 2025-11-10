// Wikidata publishing API route

import { NextRequest, NextResponse } from 'next/server';
import { getUser, getTeamForUser } from '@/lib/db/queries';
import {
  getBusinessById,
  updateBusiness,
  createWikidataEntity,
} from '@/lib/db/queries';
import { canPublishToWikidata } from '@/lib/gemflush/permissions';
import { entityBuilder } from '@/lib/wikidata/entity-builder';
import { wikidataPublisher } from '@/lib/wikidata/publisher';
// Business status constants removed - using string literals
import { z } from 'zod';

const publishRequestSchema = z.object({
  businessId: z.number().int().positive(),
  publishToProduction: z.boolean().optional().default(false),
});

export async function POST(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const team = await getTeamForUser();
    if (!team) {
      return NextResponse.json(
        { error: 'No team found' },
        { status: 404 }
      );
    }

    // Check permissions
    if (!canPublishToWikidata(team)) {
      return NextResponse.json(
        { error: 'Upgrade to Pro plan to publish to Wikidata' },
        { status: 403 }
      );
    }

    // Validate request
    const body = await request.json();
    const { businessId, publishToProduction } = publishRequestSchema.parse(body);

    // Get business and verify ownership
    const business = await getBusinessById(businessId);
    if (!business) {
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      );
    }

    if (business.teamId !== team.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Check if business has been crawled
    if (business.status !== 'crawled' && business.status !== 'published') {
      return NextResponse.json(
        { error: 'Business must be crawled before publishing' },
        { status: 400 }
      );
    }

    // Build Wikidata entity
    const crawledData = business.crawlData as any;
    const entity = entityBuilder.buildEntity(business, crawledData);

    // Validate notability
    const notabilityCheck = entityBuilder.validateNotability(entity);
    if (!notabilityCheck.isNotable) {
      return NextResponse.json(
        {
          error: 'Entity does not meet notability standards',
          reasons: notabilityCheck.reasons,
        },
        { status: 400 }
      );
    }

    // Update business status
    await updateBusiness(businessId, {
      status: 'generating',
    });

    // Publish to Wikidata
    const publishResult = await wikidataPublisher.publishEntity(
      entity,
      publishToProduction
    );

    if (!publishResult.success) {
      await updateBusiness(businessId, {
        status: 'error',
      });

      return NextResponse.json(
        { error: publishResult.error || 'Publication failed' },
        { status: 500 }
      );
    }

    // Store Wikidata entity in database
    const wikidataEntity = await createWikidataEntity({
      businessId,
      qid: publishResult.qid,
      entityData: entity,
      publishedTo: publishToProduction ? 'wikidata' : 'test.wikidata',
      version: 1,
      enrichmentLevel: 1,
    });

    // Update business with QID
    await updateBusiness(businessId, {
      status: 'published',
      wikidataQID: publishResult.qid,
      wikidataPublishedAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      qid: publishResult.qid,
      entityId: wikidataEntity.id,
      publishedTo: publishToProduction ? 'wikidata.org' : 'test.wikidata.org',
      entityUrl: publishToProduction
        ? `https://www.wikidata.org/wiki/${publishResult.qid}`
        : `https://test.wikidata.org/wiki/${publishResult.qid}`,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error publishing to Wikidata:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

