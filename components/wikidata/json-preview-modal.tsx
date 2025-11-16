/**
 * JSON Preview Modal Component
 * Single Responsibility: Display formatted JSON preview of Wikidata entity
 * SOLID: Single Responsibility - only handles JSON display
 */

"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Copy, Check } from 'lucide-react';
import { useState } from 'react';
import type { WikidataEntityDetailDTO } from '@/lib/data/types';

interface JsonPreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entity: WikidataEntityDetailDTO;
}

export function JsonPreviewModal({ open, onOpenChange, entity }: JsonPreviewModalProps) {
  const [copied, setCopied] = useState(false);

  // Convert entity DTO to full JSON structure for display
  const jsonData = {
    qid: entity.qid,
    labels: {
      en: {
        language: 'en',
        value: entity.label,
      },
    },
    descriptions: {
      en: {
        language: 'en',
        value: entity.description,
      },
    },
    claims: entity.claims.map(claim => ({
      pid: claim.pid,
      propertyLabel: claim.propertyLabel,
      propertyDescription: claim.propertyDescription,
      value: claim.value,
      valueType: claim.valueType,
      references: claim.references,
      rank: claim.rank,
      hasQualifiers: claim.hasQualifiers,
    })),
    stats: entity.stats,
    metadata: {
      wikidataUrl: entity.wikidataUrl,
      lastUpdated: entity.lastUpdated,
      canEdit: entity.canEdit,
      editUrl: entity.editUrl,
    },
  };

  const jsonString = JSON.stringify(jsonData, null, 2);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(jsonString);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle>Wikidata Entity JSON</DialogTitle>
              <DialogDescription>
                Complete entity structure for {entity.label}
                {entity.qid && ` (${entity.qid})`}
              </DialogDescription>
            </div>
            <Button
              onClick={handleCopy}
              variant="outline"
              size="sm"
              className="gap-2"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Copy JSON
                </>
              )}
            </Button>
          </div>
        </DialogHeader>
        <div className="flex-1 overflow-auto bg-gray-900 rounded-lg p-4 border border-gray-700">
          <pre className="text-sm font-mono text-gray-100 whitespace-pre-wrap break-words leading-relaxed">
            <code>{jsonString}</code>
          </pre>
        </div>
        <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t">
          <div>
            <span className="font-medium">{entity.stats.totalClaims}</span> properties
            {' • '}
            <span className="font-medium">{entity.stats.claimsWithReferences}</span> with references
            {' • '}
            <span className="capitalize">{entity.stats.referenceQuality}</span> quality
          </div>
          {entity.qid && (
            <a
              href={entity.wikidataUrl || '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              View on Wikidata →
            </a>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

