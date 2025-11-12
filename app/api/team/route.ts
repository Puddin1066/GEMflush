import { NextResponse } from 'next/server';
import { getTeamForUser } from '@/lib/db/queries';

/**
 * GET /api/team
 * Returns the authenticated user's team data
 * Authentication is handled by getTeamForUser() which checks session cookie
 */
export async function GET() {
  try {
    const team = await getTeamForUser();
    return NextResponse.json(team);
  } catch (error) {
    console.error('Error fetching team:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
