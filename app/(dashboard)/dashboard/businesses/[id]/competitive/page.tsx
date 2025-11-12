/**
 * Competitive Intelligence Page
 * Shows full competitive leaderboard and strategic insights
 */

import { redirect } from 'next/navigation';
import { getUser, getTeamForUser } from '@/lib/db/queries';
import { db } from '@/lib/db/drizzle';
import { businesses, llmFingerprints } from '@/lib/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { CompetitiveLeaderboard } from '@/components/competitive/competitive-leaderboard';
import { toCompetitiveLeaderboardDTO } from '@/lib/data/fingerprint-dto';
import { Button } from '@/components/ui/button';
import { ArrowLeft, RefreshCcw } from 'lucide-react';
import Link from 'next/link';

interface CompetitivePageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function CompetitivePage({ params }: CompetitivePageProps) {
  const { id } = await params;
  // Authentication
  const user = await getUser();
  if (!user) {
    redirect('/sign-in');
  }

  const team = await getTeamForUser();
  if (!team) {
    redirect('/sign-in');
  }

  const businessId = parseInt(id);
  if (isNaN(businessId)) {
    redirect('/dashboard');
  }

  // Get business
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
    redirect('/dashboard');
  }

  // Get latest fingerprint with competitive data
  const [latestFingerprint] = await db
    .select()
    .from(llmFingerprints)
    .where(eq(llmFingerprints.businessId, businessId))
    .orderBy(desc(llmFingerprints.createdAt))
    .limit(1);

  // Transform competitive leaderboard data using DTO (adds insights, validates structure)
  const rawLeaderboard = latestFingerprint?.competitiveLeaderboard as any;
  const leaderboardDTO = rawLeaderboard 
    ? toCompetitiveLeaderboardDTO(rawLeaderboard, business.name)
    : null;

  return (
    <div className="flex-1 p-4 lg:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <Link href={`/dashboard/businesses/${businessId}`}>
              <Button variant="ghost" size="sm" className="mb-2">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Business
              </Button>
            </Link>
            <h1 className="text-3xl font-bold text-gray-900">
              Competitive Intelligence
            </h1>
            <p className="text-gray-600 mt-1">
              {business.name}
            </p>
          </div>

          <Link href={`/dashboard/businesses/${businessId}/fingerprint`}>
            <Button className="gem-gradient text-white">
              <RefreshCcw className="mr-2 h-4 w-4" />
              Run New Analysis
            </Button>
          </Link>
        </div>

        {/* Content */}
        {leaderboardDTO ? (
          <CompetitiveLeaderboard
            data={leaderboardDTO}
            businessId={businessId}
          />
        ) : (
          <div className="text-center py-12">
            <div className="gem-text-shimmer text-6xl mb-4">🏆</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              No Competitive Data Yet
            </h2>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              Run an LLM fingerprint analysis to discover your competitive position
              and see how you rank against other businesses in your market.
            </p>
            <Link href={`/dashboard/businesses/${businessId}/fingerprint`}>
              <Button className="gem-gradient text-white">
                <RefreshCcw className="mr-2 h-4 w-4" />
                Analyze Now
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

