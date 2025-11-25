/**
 * Dashboard Page - Server Component
 * Main dashboard showing business overview and stats
 * 
 * SPECIFICATION: Server Component that fetches data directly via getDashboardDTO()
 * Following TDD: Test specifies Server Component behavior
 */

import { getDashboardDTO } from '@/lib/data/dashboard-dto';
import { getUser, getTeamForUser } from '@/lib/db/queries';
import { DashboardClient } from './dashboard-client';

export default async function DashboardPage() {
  // Fetch data server-side (TEST DRIVES IMPLEMENTATION)
  const user = await getUser();
  if (!user) {
    // Redirect handled by middleware, but handle gracefully
    return null;
  }

  const team = await getTeamForUser();
  if (!team) {
    return null;
  }

  // Fetch dashboard data directly (behavior: Server Component fetches DTO)
  const dashboardData = await getDashboardDTO(team.id);

  // Pass data to Client Component for interactive features
  return (
    <DashboardClient
      dashboardData={dashboardData}
      user={user}
      team={team}
    />
  );
}
