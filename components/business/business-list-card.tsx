/**
 * Business List Card Component
 * Displays business in list view with key information
 * 
 * SOLID: Single Responsibility - displays business list item
 * DRY: Reusable business card pattern
 */

'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/loading/status-badge';
import { BusinessProcessingStatus } from '@/components/business/business-processing-status';
import { WikidataRubyIcon, GemIcon } from '@/components/ui/gem-icon';
import { Globe, MapPin, ExternalLink, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';

interface BusinessListCardProps {
  business: {
    id: number | string;
    name: string;
    url?: string;
    status: string;
    location?: string | {
      city: string;
      state: string;
      country: string;
    } | null;
    wikidataQID?: string | null;
    wikidataQid?: string | null; // DTO format
    createdAt?: Date | string;
    automationEnabled?: boolean;
  };
  className?: string;
}

export function BusinessListCard({ business, className }: BusinessListCardProps) {
  return (
    <Link href={`/dashboard/businesses/${business.id}`}>
      <Card className={`gem-card hover:shadow-lg transition-shadow cursor-pointer ${className}`}>
        <CardContent className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-start gap-3 mb-3">
                <div className="gem-text-shimmer text-2xl flex-shrink-0">💎</div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-lg text-gray-900 truncate mb-1">
                    {business.name}
                  </h3>
                  {business.location && (
                    <p className="text-sm text-gray-600 flex items-center gap-1 mb-2">
                      <MapPin className="h-3 w-3" />
                      {typeof business.location === 'string' 
                        ? business.location 
                        : `${business.location.city}, ${business.location.state}`}
                    </p>
                  )}
                  {business.url && (
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Globe className="h-3 w-3" />
                      <span className="truncate">
                        {business.url.replace(/^https?:\/\//, '')}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 mt-4 flex-wrap">
                {/* Show processing status if business is processing */}
                {(business.status === 'pending' || 
                  business.status === 'crawling' || 
                  business.status === 'generating') ? (
                  <BusinessProcessingStatus
                    status={business.status as any}
                    automationEnabled={business.automationEnabled}
                    size="sm"
                  />
                ) : (
                  <StatusBadge status={business.status as any} />
                )}
                {(business.wikidataQID || business.wikidataQid) && (
                  <Badge variant="outline" className="flex items-center gap-1">
                    <WikidataRubyIcon size={12} />
                    {business.wikidataQID || business.wikidataQid}
                  </Badge>
                )}
              </div>
            </div>
            <ArrowRight className="h-5 w-5 text-gray-400 flex-shrink-0" />
          </div>
          {business.createdAt && (
            <div className="mt-4 pt-4 border-t text-xs text-gray-500">
              Added {formatDistanceToNow(new Date(business.createdAt), { addSuffix: true })}
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}

