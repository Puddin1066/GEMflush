/**
 * Wikidata Publish Data API Route
 * Returns Wikidata publish data with notability check for a business
 * 
 * SOLID: Uses lib/data/wikidata-dto and verifyBusinessOwnership for proper integration
 * DRY: Reuses existing DTO functions and authorization helpers
 */

import { NextRequest, NextResponse } from 'next/server';
import { getUser, getTeamForUser } from '@/lib/db/queries';
import { verifyBusinessOwnership } from '@/lib/auth/middleware';
import { getWikidataPublishDTO } from '@/lib/data/wikidata-dto';
import { businessIdParamSchema } from '@/lib/validation/common';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ businessId: string }> }
) {
  try {
    // Validate params using schema
    const paramResult = businessIdParamSchema.safeParse(await params);
    if (!paramResult.success) {
      return NextResponse.json(
        { 
          error: 'Invalid business ID', 
          details: paramResult.error.errors 
        },
        { status: 400 }
      );
    }
    const businessId = paramResult.data.businessId;

    // Authentication
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
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // ✅ Use centralized ownership verification
    const { authorized } = await verifyBusinessOwnership(
      businessId,
      team.id
    );
    
    if (!authorized) {
      return NextResponse.json(
        { error: 'Not found' },
        { status: 404 }
      );
    }

    // ✅ Use DTO function for publish data
    const publishData = await getWikidataPublishDTO(businessId);

    return NextResponse.json(publishData);
  } catch (error) {
    console.error('Error fetching Wikidata publish data:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}


