/**
 * Fingerprint API Route
 * Single Responsibility: Trigger new fingerprint analysis
 * 
 * POST /api/fingerprint - Creates new fingerprint job
 */

import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/db/queries';
import { db } from '@/lib/db/drizzle';
import { businesses, fingerprints } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { llmFingerprinter } from '@/lib/llm/fingerprinter';
import type { Business } from '@/lib/db/schema';

export async function POST(request: NextRequest) {
  try {
    // Authentication check
    const user = await getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Validate request body
    const body = await request.json();
    const { businessId } = body;

    if (!businessId || typeof businessId !== 'number') {
      return NextResponse.json(
        { error: 'Business ID required' },
        { status: 400 }
      );
    }

    // Verify business ownership
    const [business] = await db
      .select()
      .from(businesses)
      .where(
        and(
          eq(businesses.id, businessId),
          eq(businesses.teamId, user.teamId)
        )
      )
      .limit(1);

    if (!business) {
      return NextResponse.json(
        { error: 'Business not found or unauthorized' },
        { status: 404 }
      );
    }

    // Run fingerprint analysis (async, but we wait for results)
    const analysis = await llmFingerprinter.fingerprint(business as Business);

    // Save fingerprint to database
    const [savedFingerprint] = await db
      .insert(fingerprints)
      .values({
        businessId: business.id,
        visibilityScore: analysis.visibilityScore,
        mentionRate: analysis.mentionRate,
        sentimentScore: analysis.sentimentScore,
        accuracyScore: analysis.accuracyScore,
        avgRankPosition: analysis.avgRankPosition,
        llmResults: analysis.llmResults as any,
        competitiveLeaderboard: analysis.competitiveLeaderboard as any,
        createdAt: new Date(),
      })
      .returning();

    return NextResponse.json({
      success: true,
      fingerprintId: savedFingerprint.id,
      status: 'completed',
    });
  } catch (error) {
    console.error('Error creating fingerprint:', error);
    return NextResponse.json(
      { error: 'Failed to create fingerprint' },
      { status: 500 }
    );
  }
}
