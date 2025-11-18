/**
 * Wikidata Entity Preview Card Component
 * Single Responsibility: Display entity preview with publishing CTA
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { WikidataRubyIcon } from '@/components/ui/gem-icon';
import { ExternalLink, Rocket, Eye, CheckCircle, Sparkles } from 'lucide-react';
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
        {/* Description - Ensure always has substantial content (SOLID: informative display) */}
        {entity.description && entity.description.length > 0 ? (
          <p className="text-sm text-gray-700">{entity.description}</p>
        ) : (
          <p className="text-sm text-gray-500 italic">
            Entity description will be generated from business data. This entity will be discoverable by major LLM systems including ChatGPT, Claude, Perplexity, and Google Gemini.
          </p>
        )}

        {/* Stats - Enhanced visibility and value proposition */}
        <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
          <div className="flex gap-4 text-sm flex-wrap">
            <div className="flex items-center gap-1.5">
              <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
              <span className="font-semibold text-gray-900">{entity.stats.totalClaims}</span>
              <span className="text-gray-600">properties</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle className="h-4 w-4 text-blue-600 flex-shrink-0" />
              <span className="font-semibold text-gray-900">{entity.stats.claimsWithReferences}</span>
              <span className="text-gray-600">with references</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className={`h-2.5 w-2.5 rounded-full flex-shrink-0 ${
                entity.stats.referenceQuality === 'high' ? 'bg-green-500' :
                entity.stats.referenceQuality === 'medium' ? 'bg-amber-500' :
                'bg-red-500'
              }`} />
              <span className="text-gray-600 capitalize font-medium">{entity.stats.referenceQuality} quality</span>
            </div>
          </div>
          {isPublished && entity.stats.totalClaims > 0 && (
            <p className="text-xs text-gray-500 mt-2">
              ✓ Published to Wikidata • {entity.stats.totalClaims} {entity.stats.totalClaims === 1 ? 'property' : 'properties'} 
              {entity.stats.claimsWithReferences > 0 && ` • ${entity.stats.claimsWithReferences} with references`}
            </p>
          )}
        </div>

        {/* LLM Visibility Section */}
        <div className="border-t border-gray-200 pt-4 mt-4">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold text-gray-900">LLM Visibility</span>
          </div>
          <p className="text-xs text-gray-600 mb-3">
            This entity is now discoverable by:
          </p>
          <div className="flex gap-2 flex-wrap">
            <Badge variant="secondary" className="text-xs">ChatGPT</Badge>
            <Badge variant="secondary" className="text-xs">Claude</Badge>
            <Badge variant="secondary" className="text-xs">Perplexity</Badge>
            <Badge variant="secondary" className="text-xs">Google Gemini</Badge>
          </div>
          {isPublished && (
            <div className="mt-3 p-2 bg-green-50 rounded border border-green-200">
              <p className="text-xs text-green-800 font-medium flex items-center gap-1.5">
                <CheckCircle className="h-3.5 w-3.5" />
                <span>Published to Wikidata Knowledge Graph</span>
              </p>
              <p className="text-xs text-green-700 mt-1 ml-5">
                QID: <span className="font-mono font-semibold">{entity.qid}</span> • 
                <a 
                  href={entity.wikidataUrl || '#'} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="ml-1 underline hover:text-green-900"
                >
                  View on Wikidata
                </a>
              </p>
            </div>
          )}
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

