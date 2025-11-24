/**
 * Upgrade CTA Component
 * DRY: Reusable upgrade prompts throughout the app
 * SOLID: Single Responsibility - only displays upgrade CTAs
 */

'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sparkles } from 'lucide-react';
import Link from 'next/link';
import { useTeam } from '@/lib/hooks/use-team';
import { getUpgradeConfig, type UpgradeFeature } from '@/lib/subscription/upgrade-config';

interface UpgradeCTAProps {
  variant?: 'inline' | 'card' | 'banner';
  feature: UpgradeFeature;
  className?: string;
}

export function UpgradeCTA({ variant = 'card', feature, className }: UpgradeCTAProps) {
  const { planTier } = useTeam();
  const config = getUpgradeConfig(feature);
  const Icon = config.icon;

  // Don't show if user already has access
  const hasAccess =
    (feature === 'wikidata' && (planTier === 'pro' || planTier === 'agency')) ||
    (feature === 'businesses' && planTier !== 'free') ||
    (feature === 'api' && planTier === 'agency') ||
    (feature === 'enrichment' && planTier === 'agency') ||
    (feature === 'history' && (planTier === 'pro' || planTier === 'agency'));

  if (hasAccess) return null;

  if (variant === 'inline') {
    return (
      <div className={`flex items-center gap-3 p-3 bg-primary/5 rounded-lg border border-primary/20 ${className}`}>
        <Icon className="h-5 w-5 text-primary flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">{config.title}</p>
          <p className="text-xs text-gray-600 truncate">{config.description}</p>
        </div>
        <Link href={`/pricing?feature=${feature}`}>
          <Button size="sm" className="gem-gradient text-white whitespace-nowrap">
            Upgrade
          </Button>
        </Link>
      </div>
    );
  }

  if (variant === 'banner') {
    return (
      <div className={`gem-card p-4 flex items-center justify-between gap-4 ${className}`}>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Icon className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 text-sm">{config.title}</h3>
            <p className="text-xs text-gray-600">{config.description}</p>
          </div>
        </div>
        <Link href={`/pricing?feature=${feature}`}>
          <Button size="sm" className="gem-gradient text-white">
            <Sparkles className="mr-1 h-3 w-3" />
            {config.ctaText}
          </Button>
        </Link>
      </div>
    );
  }

  // Default: card variant
  return (
    <Card className={`gem-card ${className}`}>
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-primary/10 rounded-lg flex-shrink-0">
            <Icon className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 mb-1">{config.title}</h3>
            <p className="text-sm text-gray-600 mb-4">{config.description}</p>
            <Link href={`/pricing?feature=${feature}`}>
              <Button className="gem-gradient text-white">
                <Sparkles className="mr-2 h-4 w-4" />
                {config.ctaText}
              </Button>
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}













