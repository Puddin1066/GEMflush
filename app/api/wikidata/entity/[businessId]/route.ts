// Wikidata entity API route
// Returns entity data for a business (for preview/publishing)

import { NextRequest, NextResponse } from 'next/server';
import { getUser, getTeamForUser, getBusinessById, getWikidataEntity } from '@/lib/db/queries';
import { getWikidataPublishDTO, toWikidataEntityDetailDTO } from '@/lib/data/wikidata-dto';

/**
 * GET /api/wikidata/entity/[businessId]
 * Returns entity data for a business
 * 
 * SOLID: Single Responsibility - only handles entity data retrieval
 * DRY: Reuses existing queries and DTOs
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ businessId: string }> }
) {
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

    const { businessId } = await params;
    const businessIdNum = parseInt(businessId);
    
    if (isNaN(businessIdNum)) {
      return NextResponse.json(
        { error: 'Invalid business ID' },
        { status: 400 }
      );
    }

    // Get business and verify ownership (SOLID: single responsibility)
    const business = await getBusinessById(businessIdNum);
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

    // Check permissions (SOLID: single responsibility - check permissions)
    // DRY: Reuse permission check from permissions module
    const { canPublishToWikidata } = await import('@/lib/gemflush/permissions');
    if (!canPublishToWikidata(team)) {
      return NextResponse.json(
        { error: 'Upgrade to Pro plan to access Wikidata entity data' },
        { status: 403 }
      );
    }

    // Check if entity exists in database (already published)
    const existingEntity = await getWikidataEntity(businessIdNum);
    
    if (existingEntity && existingEntity.entityData) {
      // Return entity from database (already published) (DRY: reuse DTO conversion)
      const entityDTO = toWikidataEntityDetailDTO(
        existingEntity.entityData as any,
        business.wikidataQID || null
      );
      
      // DRY: Include notability and canPublish for published entities
      // SOLID: Single Responsibility - entity endpoint should include publish readiness
      // OPTIMIZATION: For published entities, use stored entityData instead of recalculating
      // For published entities, canPublish is true by definition, but we still need notability
      // Only recalculate notability if not stored (pragmatic: balance performance vs accuracy)
      let notabilityData;
      let canPublishValue = true; // Published entities can always be republished
      
      try {
        // Try to get notability from publishDTO (may be cached)
        const publishData = await getWikidataPublishDTO(businessIdNum);
        notabilityData = publishData.notability;
        canPublishValue = publishData.canPublish;
      } catch (error) {
        // If notability check fails, use defaults for published entities
        // SOLID: Graceful degradation - published entities should still be viewable
        console.warn(`[ENTITY] Could not recalculate notability for published entity ${businessIdNum}:`, error);
        notabilityData = {
          isNotable: true, // Assume notable if already published
          confidence: 0.8,
          reasons: ['Entity already published to Wikidata'],
          seriousReferenceCount: 1,
          topReferences: [],
        };
      }
      
      return NextResponse.json({
        ...entityDTO,
        notability: notabilityData,
        canPublish: canPublishValue,
      });
    }

    // Entity doesn't exist yet - build it from business data (lazy loading)
    // OPTIMIZED: Entity assembly is truly lazy - only builds when requested
    // Can work without crawlData (just less rich) - crawlData is optional
    // DRY: reuse getWikidataPublishDTO
    // SOLID: Lazy loading - only process when needed (saves LLM costs)
    
    // Note: Entity can be built even without crawlData (buildEntity accepts optional crawlData)
    // But for better quality, prefer crawled status
    if (business.status === 'pending' && !business.crawlData) {
      // Can still build entity but warn user it's basic
      // This allows entity preview even before crawl completes
      console.log(`[ENTITY] Building entity for uncrawled business ${businessIdNum} (basic entity)`);
    }
    
    try {
      const publishData = await getWikidataPublishDTO(businessIdNum);
      
      // Convert to EntityDetailDTO (DRY: reuse DTO conversion)
      const entityDTO = toWikidataEntityDetailDTO(publishData.fullEntity, business.wikidataQID || null);
      
      // DRY: Include notability and canPublish from publishData (already calculated)
      // SOLID: Single Responsibility - entity endpoint should include publish readiness
      // Pragmatic: More efficient than separate API call, UI needs this info
      return NextResponse.json({
        ...entityDTO,
        notability: publishData.notability,
        canPublish: publishData.canPublish,
      });
    } catch (error) {
      console.error('Error building entity:', error);
      // If entity building fails, return error (entity may not be ready)
      // Pragmatic: Don't fail silently - return error so UI can handle it
      return NextResponse.json(
        { error: 'Entity not available. Entity building may be in progress.' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error fetching entity:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

