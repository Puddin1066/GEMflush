// Wikidata publishing API route

import { NextRequest, NextResponse } from 'next/server';
import { getUser, getTeamForUser } from '@/lib/db/queries';
import {
  getBusinessById,
  updateBusiness,
  createWikidataEntity,
} from '@/lib/db/queries';
import { canPublishToWikidata } from '@/lib/gemflush/permissions';
import { getWikidataPublishDTO } from '@/lib/data/wikidata-dto';
import { wikidataPublisher } from '@/lib/wikidata/publisher';
import { wikidataPublishRequestSchema } from '@/lib/validation/business';
import { z } from 'zod';

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
    const { businessId, publishToProduction: requestedProduction } = wikidataPublishRequestSchema.parse(body);
    
    // IMPORTANT: Force test.wikidata.org only - bot account is banned from wikidata.org
    // Never allow production publishing, even if requested
    const publishToProduction = false;
    if (requestedProduction) {
      console.warn('[BLOCKED] Production publishing requested but blocked - bot account is banned from wikidata.org');
      console.warn('[BLOCKED] Publishing to test.wikidata.org instead');
    }

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

    // Get DTO with notability check (includes Google Search + LLM assessment)
    const publishData = await getWikidataPublishDTO(businessId);
    
    // Check if can publish (notability + confidence threshold)
    // Note: In e2e tests, Google Search API is mocked, but notability logic still runs
    if (!publishData.canPublish) {
      return NextResponse.json(
        {
          error: 'Business does not meet notability standards',
          notability: publishData.notability,
          recommendation: publishData.recommendation,
        },
        { status: 400 }
      );
    }
    
    // Use full entity for publishing
    const entity = publishData.fullEntity;

    // Log the entity JSON that will be published to Wikidata
    console.log('[PUBLISH] Entity JSON to be published to Wikidata:');
    console.log(JSON.stringify(entity, null, 2));
    console.log('[PUBLISH] Entity summary:');
    console.log(`  - Labels: ${Object.keys(entity.labels || {}).length} languages`);
    console.log(`  - Descriptions: ${Object.keys(entity.descriptions || {}).length} languages`);
    console.log(`  - Claims: ${Object.keys(entity.claims || {}).length} properties`);
    const totalClaims = Object.values(entity.claims || {}).reduce((sum, arr) => sum + (Array.isArray(arr) ? arr.length : 0), 0);
    console.log(`  - Total statements: ${totalClaims}`);

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

      // Include entity JSON in error response for debugging
      return NextResponse.json(
        { 
          error: publishResult.error || 'Publication failed',
          entity: entity, // Include entity JSON for debugging
        },
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

    // Update business with QID and published status
    // FIX: This was unreachable due to early return - moved before return statement
    await updateBusiness(businessId, {
      status: 'published',
      wikidataQID: publishResult.qid,
      wikidataPublishedAt: new Date(),
    });

    // Return success response with entity details
    return NextResponse.json({
      success: true,
      qid: publishResult.qid,
      entityId: wikidataEntity.id,
      publishedTo: publishToProduction ? 'wikidata.org' : 'test.wikidata.org',
      entityUrl: publishToProduction
        ? `https://www.wikidata.org/wiki/${publishResult.qid}`
        : `https://test.wikidata.org/wiki/${publishResult.qid}`,
      notability: publishData.notability,
      entity: entity, // Include entity JSON for debugging
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

