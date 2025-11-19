// Business detail API route - fetch single business by ID
// SOLID: Single Responsibility - only handles fetching one business
// DRY: Avoids fetching all businesses when we only need one
// More efficient and RESTful than GET /api/business + client-side filter

import { NextRequest, NextResponse } from 'next/server';
import { getUser, getTeamForUser, getBusinessById } from '@/lib/db/queries';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let businessId: number | null = null;
  
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

    // Parse business ID from params
    const { id } = await params;
    businessId = parseInt(id);
    
    if (isNaN(businessId)) {
      return NextResponse.json(
        { error: 'Invalid business ID' },
        { status: 400 }
      );
    }

    // Fetch business by ID (efficient: single database query)
    const business = await getBusinessById(businessId);
    
    if (!business) {
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      );
    }

    // Verify ownership (business belongs to user's team)
    if (business.teamId !== team.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Return single business (SOLID: returns exactly what's requested)
    // Ensure dates are serialized properly
    const serializableBusiness = {
      ...business,
      createdAt: business.createdAt instanceof Date 
        ? business.createdAt.toISOString() 
        : business.createdAt,
      updatedAt: business.updatedAt instanceof Date 
        ? business.updatedAt.toISOString() 
        : business.updatedAt,
      lastCrawledAt: business.lastCrawledAt instanceof Date 
        ? business.lastCrawledAt.toISOString() 
        : business.lastCrawledAt,
      wikidataPublishedAt: business.wikidataPublishedAt instanceof Date 
        ? business.wikidataPublishedAt.toISOString() 
        : business.wikidataPublishedAt,
      nextCrawlAt: business.nextCrawlAt instanceof Date 
        ? business.nextCrawlAt.toISOString() 
        : business.nextCrawlAt,
      lastAutoPublishedAt: business.lastAutoPublishedAt instanceof Date 
        ? business.lastAutoPublishedAt.toISOString() 
        : business.lastAutoPublishedAt,
    };

    console.log(`[BUSINESS API] Returning business ${businessId} (${business.name})`);
    
    return NextResponse.json({
      business: serializableBusiness,
    });
  } catch (error) {
    const errorId = businessId ?? 'unknown';
    console.error(`[BUSINESS API] Error fetching business ${errorId}:`, error);
    if (error instanceof Error) {
      console.error(`[BUSINESS API] Error message:`, error.message);
      console.error(`[BUSINESS API] Error stack:`, error.stack);
    }
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}


