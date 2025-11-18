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
    const businessId = parseInt(id);
    
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
    return NextResponse.json({
      business,
    });
  } catch (error) {
    console.error('Error fetching business:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}


