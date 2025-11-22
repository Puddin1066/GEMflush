/**
 * Gem Overview Card Component
 * Single Responsibility: Display business summary and quick stats
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Globe, MapPin, Sparkles, ExternalLink } from 'lucide-react';
import { WikidataRubyIcon } from '@/components/ui/gem-icon';

interface GemOverviewCardProps {
  business: {
    name: string;
    url: string;
    category?: string | null;
    location?: {
      city: string;
      state: string;
      country: string;
    } | null;
    wikidataQID?: string | null;
    status: string;
    createdAt: Date | string;
  };
  onCrawl?: () => void;
  crawling?: boolean;
  showAutoProgress?: boolean;
  isPro?: boolean;
}

export function GemOverviewCard({ 
  business, 
  onCrawl, 
  crawling = false,
  showAutoProgress = false,
  isPro = false,
}: GemOverviewCardProps) {
  const statusConfig = {
    pending: { label: 'Pending', color: 'bg-gray-100 text-gray-700' },
    crawling: { label: 'Crawling', color: 'bg-blue-100 text-blue-700' },
    crawled: { label: 'Crawled', color: 'bg-green-100 text-green-700' },
    generating: { label: 'Generating', color: 'bg-purple-100 text-purple-700' },
    published: { label: 'Published', color: 'bg-emerald-100 text-emerald-700' },
    error: { label: 'Error', color: 'bg-red-100 text-red-700' },
  };

  const status = statusConfig[business.status as keyof typeof statusConfig] || statusConfig.pending;

  return (
    <Card className="gem-card">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="gem-text-shimmer text-4xl">💎</div>
            <div>
              <CardTitle className="text-2xl">{business.name}</CardTitle>
              <CardDescription className="flex items-center gap-2 mt-1">
                {business.location && (
                  <>
                    <MapPin className="h-3 w-3" />
                    {business.location.city}, {business.location.state}
                  </>
                )}
              </CardDescription>
            </div>
          </div>
          <Badge className={status.color}>{status.label}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Quick Info Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Website */}
          <div className="flex items-start gap-2">
            <Globe className="h-4 w-4 text-gray-500 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-500">Website</p>
              <a
                href={business.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:underline truncate block"
              >
                {business.url.replace(/^https?:\/\//, '')}
                <ExternalLink className="inline h-3 w-3 ml-1" />
              </a>
            </div>
          </div>

          {/* Category */}
          {business.category && (
            <div className="flex items-start gap-2">
              <Sparkles className="h-4 w-4 text-gray-500 mt-0.5" />
              <div>
                <p className="text-xs text-gray-500">Category</p>
                <p className="text-sm font-medium">{business.category}</p>
              </div>
            </div>
          )}

          {/* Wikidata QID */}
          {business.wikidataQID && (
            <div className="flex items-start gap-2 md:col-span-2">
              <WikidataRubyIcon size={16} className="mt-0.5" />
              <div>
                <p className="text-xs text-gray-500">Wikidata Entity</p>
                <a
                  href={`https://test.wikidata.org/wiki/${business.wikidataQID}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-mono text-blue-600 hover:underline"
                >
                  {business.wikidataQID}
                  <ExternalLink className="inline h-3 w-3 ml-1" />
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Manual Actions - Only show if automation is disabled */}
        {business.status === 'pending' && !showAutoProgress && onCrawl && (
          <div className="pt-4 border-t">
            <p className="text-sm text-gray-600 mb-3">
              🚀 Start by crawling the website to extract business data.
            </p>
            <Button
              onClick={onCrawl}
              disabled={crawling}
              className="w-full gem-gradient text-white"
            >
              {crawling ? (
                <>
                  <div className="animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                  Crawling Website...
                </>
              ) : (
                <>
                  <Globe className="mr-2 h-4 w-4" />
                  Crawl Website
                </>
              )}
            </Button>
          </div>
        )}
        
        {/* Completed status - Different messages for Free vs Pro */}
        {(business.status === 'published' || business.status === 'crawled') && (
          <div className="pt-4 border-t">
            <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 p-3 rounded-lg">
              <div className="h-4 w-4 bg-green-500 rounded-full flex items-center justify-center">
                <div className="h-2 w-2 bg-white rounded-full" />
              </div>
              <span className="font-medium">
                {business.status === 'published' 
                  ? '✅ Full AI analysis complete - published to Wikidata!' 
                  : isPro 
                    ? '✅ AI analysis complete - ready for publishing'
                    : '✅ AI analysis complete - upgrade to publish to Wikidata'}
              </span>
            </div>
          </div>
        )}
        
        {/* Automated processing status - Show for all users with automation */}
        {showAutoProgress && (business.status === 'pending' || business.status === 'crawling' || business.status === 'crawled' || business.status === 'generating') && (
          <div className="pt-4 border-t">
            <div className="flex items-center gap-2 text-sm text-blue-600 bg-blue-50 p-3 rounded-lg">
              <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full" />
              <span className="font-medium">
                {business.status === 'pending' && '🤖 Starting automated AI analysis...'}
                {business.status === 'crawling' && '🌐 Extracting business data from website...'}
                {business.status === 'crawled' && '🧠 Analyzing AI visibility across platforms...'}
                {business.status === 'generating' && '📊 Generating competitive insights...'}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              ✨ GEMflush is working automatically - no manual steps required
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

