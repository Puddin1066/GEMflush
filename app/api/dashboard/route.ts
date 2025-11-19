/**
 * Dashboard API Route
 * Returns dashboard statistics for the current team
 * 
 * SOLID: Single Responsibility - only handles dashboard data
 * DRY: Reuses existing DTO layer
 */

import { NextResponse } from 'next/server';
import { getUser, getTeamForUser } from '@/lib/db/queries';
import { getDashboardDTO } from '@/lib/data/dashboard-dto';

export async function GET() {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const team = await getTeamForUser();
    if (!team) {
      return NextResponse.json({ error: 'No team found' }, { status: 404 });
    }

    const stats = await getDashboardDTO(team.id);
    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error fetching dashboard:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

