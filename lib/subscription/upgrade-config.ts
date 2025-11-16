/**
 * Upgrade Configuration
 * DRY: Centralized upgrade messaging and feature definitions
 * SOLID: Single Responsibility - only handles upgrade config
 */

import type { LucideIcon } from 'lucide-react';
import { Building2, Database, Zap } from 'lucide-react';
import { WikidataRubyIcon } from '@/components/ui/gem-icon';

export type UpgradeFeature = 'wikidata' | 'businesses' | 'api' | 'enrichment' | 'history';

export interface FeatureConfig {
  title: string;
  description: string;
  benefits: string[];
  icon: LucideIcon | React.ComponentType<{ size?: number; className?: string }>;
  targetPlan: 'pro' | 'agency';
  price: number;
  ctaText: string;
}

/**
 * Feature upgrade configurations
 * DRY: Single source of truth for upgrade messaging
 */
export const UPGRADE_CONFIGS: Record<UpgradeFeature, FeatureConfig> = {
  wikidata: {
    title: 'Unlock Wikidata Publishing',
    description: 'Publish your business to Wikidata and improve your AI visibility across ChatGPT, Claude, and Perplexity.',
    benefits: [
      'Get recommended by AI systems',
      'Improve visibility by 2-4x',
      'Control your business information',
      'Track visibility improvements over time',
    ],
    icon: WikidataRubyIcon,
    targetPlan: 'pro',
    price: 49,
    ctaText: 'Upgrade to Pro',
  },
  businesses: {
    title: 'Add More Businesses',
    description: 'Upgrade to manage multiple businesses and compare their performance.',
    benefits: [
      'Manage up to 5 businesses (Pro) or 25 (Agency)',
      'Compare performance across clients',
      'Unified dashboard for all businesses',
    ],
    icon: Building2,
    targetPlan: 'pro',
    price: 49,
    ctaText: 'Upgrade to Pro',
  },
  api: {
    title: 'Unlock API Access',
    description: 'Integrate GEMflush data into your own applications and workflows.',
    benefits: [
      'RESTful API access',
      'Webhook support',
      'Custom integrations',
      'Higher rate limits',
    ],
    icon: Database,
    targetPlan: 'agency',
    price: 149,
    ctaText: 'Upgrade to Agency',
  },
  enrichment: {
    title: 'Enable Progressive Enrichment',
    description: 'Automatically enhance your Wikidata entities over time with verified data.',
    benefits: [
      'Automatic entity updates',
      'Enhanced property suggestions',
      'Data quality improvements',
    ],
    icon: Zap,
    targetPlan: 'agency',
    price: 149,
    ctaText: 'Upgrade to Agency',
  },
  history: {
    title: 'Access Historical Data',
    description: 'View trends and track your visibility improvements over time.',
    benefits: [
      'Historical fingerprint data',
      'Trend analysis',
      'Performance comparisons',
    ],
    icon: Building2,
    targetPlan: 'pro',
    price: 49,
    ctaText: 'Upgrade to Pro',
  },
};

/**
 * Get upgrade config for a feature
 * DRY: Centralized accessor
 */
export function getUpgradeConfig(feature: UpgradeFeature): FeatureConfig {
  return UPGRADE_CONFIGS[feature];
}

/**
 * Get recommended upgrade plan based on current plan and feature
 * SOLID: Single Responsibility - only determines upgrade path
 */
export function getRecommendedPlan(
  currentPlan: 'free' | 'pro' | 'agency',
  feature: UpgradeFeature
): 'pro' | 'agency' {
  const config = UPGRADE_CONFIGS[feature];
  
  // If already on agency, no upgrade needed
  if (currentPlan === 'agency') {
    return 'agency';
  }
  
  // If feature requires agency, recommend agency
  if (config.targetPlan === 'agency') {
    return 'agency';
  }
  
  // Otherwise recommend pro
  return 'pro';
}

