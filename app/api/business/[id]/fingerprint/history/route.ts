/**
 * API Route: GET /api/business/[id]/fingerprint/history
 * Returns historical fingerprint data for a business
 */

import { NextRequest, NextResponse } from 'next/server';
import { getUser, getTeamForUser } from '@/lib/db/queries';
import { db } from '@/lib/db/drizzle';
import { businesses, llmFingerprints } from '@/lib/db/schema';
import { eq, and, desc } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const businessId = parseInt(id);

    if (isNaN(businessId)) {
      return NextResponse.json(
        { error: 'Invalid business ID' },
        { status: 400 }
      );
    }

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

    // Verify business belongs to team
    const [business] = await db
      .select()
      .from(businesses)
      .where(
        and(
          eq(businesses.id, businessId),
          eq(businesses.teamId, team.id)
        )
      )
      .limit(1);

    if (!business) {
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      );
    }

    // Get all historical fingerprints, ordered by date (newest first)
    const fingerprints = await db
      .select({
        id: llmFingerprints.id,
        visibilityScore: llmFingerprints.visibilityScore,
        mentionRate: llmFingerprints.mentionRate,
        sentimentScore: llmFingerprints.sentimentScore,
        accuracyScore: llmFingerprints.accuracyScore,
        avgRankPosition: llmFingerprints.avgRankPosition,
        createdAt: llmFingerprints.createdAt,
      })
      .from(llmFingerprints)
      .where(eq(llmFingerprints.businessId, businessId))
      .orderBy(desc(llmFingerprints.createdAt));

    // Transform to chart-friendly format
    const history = fingerprints.map((fp) => ({
      id: fp.id,
      date: fp.createdAt instanceof Date 
        ? fp.createdAt.toISOString() 
        : new Date(fp.createdAt as string).toISOString(),
      visibilityScore: fp.visibilityScore,
      mentionRate: fp.mentionRate ? Math.round(fp.mentionRate) : null,
      sentimentScore: fp.sentimentScore ? Math.round(fp.sentimentScore * 100) : null,
      accuracyScore: fp.accuracyScore ? Math.round(fp.accuracyScore * 100) : null,
      avgRankPosition: fp.avgRankPosition ? Math.round(fp.avgRankPosition * 10) / 10 : null,
    }));

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


