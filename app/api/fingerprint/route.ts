/**
 * Fingerprint API Route
 * Single Responsibility: Trigger new fingerprint analysis
 * 
 * POST /api/fingerprint - Creates new fingerprint job
 */

import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/db/queries';
import { db } from '@/lib/db/drizzle';
import { businesses, llmFingerprints } from '@/lib/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { businessFingerprinter } from '@/lib/llm';
import type { Business } from '@/lib/db/schema';
import {
  getIdempotencyKey,
  getCachedResponse,
  cacheResponse,
  generateIdempotencyKey,
} from '@/lib/utils/idempotency';

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
      .where(eq(businesses.id, businessId))
      .limit(1);

    if (!business) {
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      );
    }

    // Check if user has access to this team's business
    const userTeams = await db.query.teamMembers.findMany({
      where: (teamMembers, { eq }) => eq(teamMembers.userId, user.id),
    });

    const hasAccess = userTeams.some(tm => tm.teamId === business.teamId);

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Not authorized to access this business' },
        { status: 403 }
      );
    }

    // Idempotency check
    const idempotencyKey = getIdempotencyKey(request) || 
      generateIdempotencyKey(user.id, 'create-fingerprint', {
        businessId,
      });

    // Check cached response
    const cachedResponse = getCachedResponse(idempotencyKey);
    if (cachedResponse) {
      return NextResponse.json(cachedResponse);
    }

    // Check if fingerprint can run (frequency enforcement - DRY: reuse frequency logic)
    const { canRunFingerprint } = await import('@/lib/services/business-decisions');
    const { getTeamForUser } = await import('@/lib/db/queries');
    const team = await getTeamForUser();
    
    if (team) {
      const canFingerprint = await canRunFingerprint(business as Business, team);
      if (!canFingerprint) {
        // Get latest fingerprint for response
        const [latestFingerprint] = await db
          .select()
          .from(llmFingerprints)
          .where(eq(llmFingerprints.businessId, businessId))
          .orderBy(desc(llmFingerprints.createdAt))
          .limit(1);
        
        const response = {
          success: true,
          fingerprintId: latestFingerprint?.id || null,
          status: 'skipped',
          message: 'Fingerprint skipped - frequency limit (check plan frequency)',
          duplicate: true,
        };
        cacheResponse(idempotencyKey, response);
        return NextResponse.json(response);
      }
    }
    
    // Check for recent fingerprint (within last 10 minutes) to prevent duplicate analysis
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    const [recentFingerprint] = await db
      .select()
      .from(llmFingerprints)
      .where(eq(llmFingerprints.businessId, businessId))
      .orderBy(desc(llmFingerprints.createdAt))
      .limit(1);

    if (recentFingerprint && recentFingerprint.createdAt && new Date(recentFingerprint.createdAt) > tenMinutesAgo) {
      const response = {
        success: true,
        fingerprintId: recentFingerprint.id,
        status: 'completed',
        duplicate: true,
        message: 'Recent fingerprint already exists',
      };
      cacheResponse(idempotencyKey, response);
      return NextResponse.json(response);
    }

    // Run fingerprint analysis (async, but we wait for results)
    const analysis = await businessFingerprinter.fingerprint(business as Business);

    // Save fingerprint to database
    const [savedFingerprint] = await db
      .insert(llmFingerprints)
      .values({
        businessId: business.id,
        visibilityScore: Math.round(analysis.visibilityScore),
        mentionRate: analysis.mentionRate,
        sentimentScore: analysis.sentimentScore,
        accuracyScore: analysis.accuracyScore,
        avgRankPosition: analysis.avgRankPosition,
        llmResults: analysis.llmResults as any,
        competitiveLeaderboard: analysis.competitiveLeaderboard as any,
        createdAt: new Date(),
      })
      .returning();

    // Update business status to 'crawled' after fingerprint completes
    // Note: 'crawled' indicates both crawl and fingerprint are complete
    // CFP is only fully complete when published to Wikidata (status: 'published')
    await db
      .update(businesses)
      .set({ status: 'crawled' })
      .where(eq(businesses.id, business.id));

    const response = {
      success: true,
      fingerprintId: savedFingerprint.id,
      status: 'completed',
    };

    // Cache response for idempotency
    cacheResponse(idempotencyKey, response);

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error creating fingerprint:', error);
    return NextResponse.json(
      { error: 'Failed to create fingerprint' },
      { status: 500 }
    );
  }
}
