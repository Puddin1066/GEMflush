// Business management API routes

import { NextRequest, NextResponse } from 'next/server';
import { getUser, getTeamForUser } from '@/lib/db/queries';
import {
  getBusinessesByTeam,
  createBusiness,
  getBusinessCountByTeam,
} from '@/lib/db/queries';
import { canAddBusiness, getMaxBusinesses } from '@/lib/gemflush/permissions';
import { createBusinessSchema } from '@/lib/validation/business';
import { z } from 'zod';

export async function GET(request: NextRequest) {
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

    const businesses = await getBusinessesByTeam(team.id);

    return NextResponse.json({
      businesses,
      maxBusinesses: getMaxBusinesses(team),
    });
  } catch (error) {
    console.error('Error fetching businesses:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

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

    // Check if user can add more businesses
    const currentCount = await getBusinessCountByTeam(team.id);
    const canAdd = canAddBusiness(currentCount, team);

    if (!canAdd) {
      return NextResponse.json(
        { 
          error: 'Business limit reached',
          maxBusinesses: getMaxBusinesses(team),
          currentCount,
        },
        { status: 403 }
      );
    }

    // Validate request body
    const body = await request.json();
    const validatedData = createBusinessSchema.parse(body);

    // Create business
    const business = await createBusiness({
      teamId: team.id,
      name: validatedData.name,
      url: validatedData.url,
      category: validatedData.category,
      location: validatedData.location,
      status: 'pending',
    });

    // Verify business was created with ID (SOLID: proper validation)
    if (!business || !business.id) {
      console.error('Business created but ID missing:', business);
      return NextResponse.json(
        { error: 'Business created but ID not returned' },
        { status: 500 }
      );
    }

    // Return business with ID (DRY: consistent response format)
    return NextResponse.json(
      { 
        business: {
          id: business.id,
          name: business.name,
          url: business.url,
          category: business.category,
          status: business.status,
          teamId: business.teamId,
        },
        message: 'Business created successfully',
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Validation error:', error.errors);
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

    console.error('Error creating business:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

