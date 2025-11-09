// Businesses management page

import { getUser, getTeamForUser, getBusinessesByTeam } from '@/lib/db/queries';
import { getMaxBusinesses } from '@/lib/gemflush/permissions';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default async function BusinessesPage() {
  const user = await getUser();
  if (!user) {
    redirect('/sign-in');
  }

  const team = await getTeamForUser();
  if (!team) {
    redirect('/sign-in');
  }

  const businesses = await getBusinessesByTeam(team.id);
  const maxBusinesses = getMaxBusinesses(team);
  const canAddMore = businesses.length < maxBusinesses;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Businesses</h1>
          <p className="text-muted-foreground">
            Manage your businesses and track their LLM visibility
          </p>
        </div>
        {canAddMore ? (
          <Link href="/dashboard/businesses/new">
            <Button>Add Business</Button>
          </Link>
        ) : (
          <Button disabled>
            Limit Reached ({businesses.length}/{maxBusinesses})
          </Button>
        )}
      </div>

      {businesses.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No businesses yet</CardTitle>
            <CardDescription>
              Get started by adding your first business to track its visibility across AI systems
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/dashboard/businesses/new">
              <Button>Add Your First Business</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {businesses.map((business) => (
            <Link key={business.id} href={`/dashboard/businesses/${business.id}`}>
              <Card className="hover:border-primary transition-colors cursor-pointer">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="truncate">{business.name}</span>
                    <StatusBadge status={business.status} />
                  </CardTitle>
                  <CardDescription className="truncate">
                    {business.location?.city}, {business.location?.state}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Category:</span>{' '}
                      {business.category || 'Not set'}
                    </div>
                    {business.wikidataQID && (
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">Wikidata:</span>
                        <span className="font-mono text-xs">{business.wikidataQID}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {!canAddMore && (
        <Card className="border-yellow-500 bg-yellow-50">
          <CardHeader>
            <CardTitle>Business Limit Reached</CardTitle>
            <CardDescription className="text-yellow-800">
              You've reached your plan's limit of {maxBusinesses} business{maxBusinesses > 1 ? 'es' : ''}.
              Upgrade to add more businesses.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/pricing">
              <Button variant="default">Upgrade Plan</Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles = {
    pending: 'bg-gray-100 text-gray-800',
    crawling: 'bg-blue-100 text-blue-800',
    crawled: 'bg-green-100 text-green-800',
    generating: 'bg-purple-100 text-purple-800',
    published: 'bg-emerald-100 text-emerald-800',
    error: 'bg-red-100 text-red-800',
  };

  return (
    <span className={`px-2 py-1 rounded text-xs font-medium ${styles[status as keyof typeof styles] || styles.pending}`}>
      {status}
    </span>
  );
}

