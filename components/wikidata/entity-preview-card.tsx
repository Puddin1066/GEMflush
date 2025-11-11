/**
 * Wikidata Entity Preview Card Component
 * Single Responsibility: Display entity preview with publishing CTA
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { WikidataRubyIcon } from '@/components/ui/gem-icon';
import { ExternalLink, Rocket, Eye, CheckCircle } from 'lucide-react';
import type { WikidataEntityDetailDTO } from '@/lib/data/types';

interface EntityPreviewCardProps {
  entity: WikidataEntityDetailDTO;
  notabilityScore?: number;
  isNotable?: boolean;
  onPublish: () => void;
  onPreview: () => void;
  publishing?: boolean;
}

export function EntityPreviewCard({
  entity,
  notabilityScore,
  isNotable = true,
  onPublish,
  onPreview,
  publishing = false,
}: EntityPreviewCardProps) {
  const isPublished = entity.qid !== null;

  return (
    <Card className="gem-card">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <WikidataRubyIcon size={24} />
            <div>
              <CardTitle>
                {isPublished ? entity.qid : 'Draft Entity'}
              </CardTitle>
              <CardDescription>{entity.label}</CardDescription>
            </div>
          </div>
          {notabilityScore !== undefined && (
            <Badge variant={isNotable ? 'success' : 'warning'}>
              {isNotable ? '✓ Notable' : '⚠ Low Confidence'} ({Math.round(notabilityScore * 100)}%)
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Description */}
        <p className="text-sm text-gray-700">{entity.description}</p>

        {/* Stats */}
        <div className="flex gap-4 text-sm">
          <div className="flex items-center gap-1">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <span className="font-medium">{entity.stats.totalClaims}</span>
            <span className="text-gray-600">properties</span>
          </div>
          <div className="flex items-center gap-1">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <span className="font-medium">{entity.stats.claimsWithReferences}</span>
            <span className="text-gray-600">references</span>
          </div>
          <div className="flex items-center gap-1">
            <div className={`h-2 w-2 rounded-full ${
              entity.stats.referenceQuality === 'high' ? 'bg-green-500' :
              entity.stats.referenceQuality === 'medium' ? 'bg-amber-500' :
              'bg-red-500'
            }`} />
            <span className="text-gray-600 capitalize">{entity.stats.referenceQuality} quality</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          {!isPublished ? (
            <Button
              onClick={onPublish}
              className="gem-gradient text-white flex-1"
              disabled={!isNotable || publishing}
            >
              {publishing ? (
                <>
                  <div className="animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                  Publishing...
                </>
              ) : (
                <>
                  <Rocket className="mr-2 h-4 w-4" />
                  Publish to Wikidata
                </>
              )}
            </Button>
          ) : (
            <Button
              onClick={() => window.open(entity.wikidataUrl || '', '_blank')}
              className="gem-gradient text-white flex-1"
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              View on Wikidata
            </Button>
          )}
          <Button onClick={onPreview} variant="outline">
            <Eye className="mr-2 h-4 w-4" />
            Preview JSON
          </Button>
        </div>

        {/* Notability Warning */}
        {!isNotable && (
          <div className="text-sm text-amber-700 bg-amber-50 p-3 rounded-lg border border-amber-200">
            <strong>⚠ Notability Check:</strong> This entity may not meet Wikidata's notability requirements. 
            Consider adding more references or improving data quality before publishing.
          </div>
        )}

        {/* Last Updated */}
        {entity.lastUpdated && (
          <p className="text-xs text-gray-500">
            Last updated: {entity.lastUpdated}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

