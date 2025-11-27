/**
 * API Route: GET /api/business/[id]/fingerprint/history
 * Returns historical fingerprint data for a business
 * 
 * SOLID: Uses lib/db/queries and verifyBusinessOwnership for proper integration
 * DRY: Reuses existing query functions and DTO transformations
 */

import { NextRequest, NextResponse } from 'next/server';
import { getUser, getTeamForUser, getFingerprintHistory } from '@/lib/db/queries';
import { verifyBusinessOwnership } from '@/lib/auth/middleware';
import { toFingerprintHistoryDTOs } from '@/lib/data/fingerprint-dto';
import { idParamSchema } from '@/lib/validation/common';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Validate params using schema
    const paramResult = idParamSchema.safeParse(await params);
    if (!paramResult.success) {
      return NextResponse.json(
        { 
          error: 'Invalid business ID', 
          details: paramResult.error.errors 
        },
        { status: 400 }
      );
    }
    const businessId = paramResult.data.id;

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
    const { authorized, business } = await verifyBusinessOwnership(
      businessId,
      team.id
    );
    
    if (!authorized || !business) {
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      );
    }

    // ✅ Use query function instead of direct query
    const fingerprints = await getFingerprintHistory(businessId, 100);

    // ✅ Use DTO layer for transformation
    const history = toFingerprintHistoryDTOs(fingerprints);

    return NextResponse.json({
      businessId,
      businessName: business.name,
      history,
      total: history.length,
    });
  } catch (error) {
    console.error('Error fetching fingerprint history:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}


