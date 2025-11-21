/**
 * Feature Gate Component
 * SOLID: Single Responsibility - only handles feature gating
 * DRY: Reusable across all Pro features
 */

'use client';

import { useTeam } from '@/lib/hooks/use-team';
import { UpgradeModal } from './upgrade-modal';
import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import type { UpgradeFeature } from '@/lib/subscription/upgrade-config';

interface FeatureGateProps {
  feature: UpgradeFeature;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  showUpgradeOnClick?: boolean;
}

/**
 * Maps features to permission checks
 * DRY: Centralized feature-to-permission mapping
 */
function hasFeatureAccess(feature: UpgradeFeature, teamData: ReturnType<typeof useTeam>): boolean {
  switch (feature) {
    case 'wikidata':
      return teamData.canPublish;
    case 'businesses':
      return teamData.isPro;
    case 'api':
      return teamData.canAccessApi;
    case 'enrichment':
      return teamData.canUseEnrichment;
    case 'history':
      return teamData.canAccessHistory;
    default:
      return false;
  }
}

export function FeatureGate({
  feature,
  children,
  fallback,
  showUpgradeOnClick = true,
}: FeatureGateProps) {
  const teamData = useTeam();
  const [showUpgrade, setShowUpgrade] = useState(false);

  const hasAccess = hasFeatureAccess(feature, teamData);

  // If user has access, render children
  if (hasAccess) {
    return <>{children}</>;
  }

  // If custom fallback provided, use it
  if (fallback) {
    return <>{fallback}</>;
  }

  // Default: Show locked state with upgrade prompt
  return (
    <>
      <div
        className="relative cursor-pointer group"
        onClick={() => showUpgradeOnClick && setShowUpgrade(true)}
      >
        <div className="opacity-50 pointer-events-none">{children}</div>
        <div className="absolute inset-0 flex items-center justify-center bg-white/90 backdrop-blur-sm rounded-lg border-2 border-dashed border-primary/30 group-hover:border-primary/50 transition-colors">
          <div className="text-center p-4">
            <Sparkles className="h-8 w-8 mx-auto mb-2 text-primary" />
            <p className="font-medium text-gray-900 mb-1">Upgrade Required</p>
            <p className="text-sm text-gray-600">Click to unlock this feature</p>
          </div>
        </div>
      </div>

      <UpgradeModal
        open={showUpgrade}
        onOpenChange={setShowUpgrade}
        feature={feature}
      />
    </>
  );
}










