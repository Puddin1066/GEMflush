// LLM fingerprinting API route

import { NextRequest, NextResponse } from 'next/server';
import { getUser, getTeamForUser } from '@/lib/db/queries';
import {
  getBusinessById,
  createFingerprint,
  createCrawlJob,
  updateCrawlJob,
} from '@/lib/db/queries';
import { llmFingerprinter } from '@/lib/llm/fingerprinter';
// Job type/status constants removed - using string literals
import { z } from 'zod';

const fingerprintRequestSchema = z.object({
  businessId: z.number().int().positive(),
});

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

    // Validate request
    const body = await request.json();
    const { businessId } = fingerprintRequestSchema.parse(body);

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

    // Create fingerprint job
    const job = await createCrawlJob({
      businessId,
      jobType: 'fingerprint',
      status: 'queued',
      progress: 0,
    });

    // Execute fingerprint in background
    executeFingerprintJob(job.id, businessId).catch(error => {
      console.error('Background fingerprint error:', error);
    });

    return NextResponse.json({
      jobId: job.id,
      message: 'Fingerprint job started',
      status: 'queued',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error starting fingerprint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Background fingerprint execution
async function executeFingerprintJob(jobId: number, businessId: number) {
  try {
    // Update job status
    await updateCrawlJob(jobId, {
      status: 'processing',
      progress: 10,
    });

    // Get business details
    const business = await getBusinessById(businessId);
    if (!business) {
      throw new Error('Business not found');
    }

    // Execute fingerprint analysis
    const analysis = await llmFingerprinter.fingerprint(business);

    // Update progress
    await updateCrawlJob(jobId, {
      progress: 80,
    });

    // Save fingerprint results
    const fingerprint = await createFingerprint({
      businessId,
      visibilityScore: analysis.visibilityScore,
      llmResults: analysis.llmResults,
      competitiveBenchmark: analysis.competitiveBenchmark,
    });

    // Update job as completed
    await updateCrawlJob(jobId, {
      status: 'completed',
      progress: 100,
      result: {
        fingerprintId: fingerprint.id,
        visibilityScore: analysis.visibilityScore,
      },
      completedAt: new Date(),
    });

    console.log(`Fingerprint completed for business ${businessId}: Score ${analysis.visibilityScore}`);
  } catch (error) {
    console.error('Fingerprint job execution error:', error);

    // Update job as failed
    await updateCrawlJob(jobId, {
      status: 'failed',
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      completedAt: new Date(),
    });
  }
}

