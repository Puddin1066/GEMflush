# Subscription Upgrade & Wikidata Publishing UX Proposal

## Overview

Create a progressive upgrade flow that guides users from Free → Pro → Agency, with Wikidata publishing as the key value driver. The UX should feel natural, contextual, and value-focused rather than pushy.

## User Journey Map

```
Free User Journey:
1. Sign up → Create business → Run fingerprint
2. See competitive analysis (limited)
3. Try to publish to Wikidata → Blocked with upgrade CTA
4. See value proposition → Upgrade to Pro
5. Publish to Wikidata → Track results → See improvement

Pro User Journey:
1. Already published → See results improving
2. Hit business limit (5) → Upgrade to Agency CTA
3. Need API access → Upgrade to Agency CTA
```

## Implementation Components

### 1. Subscription Status Component

**Location**: Dashboard sidebar or header
**Purpose**: Show current plan, usage, and quick upgrade option

```tsx
// components/subscription/subscription-status.tsx
'use client';

import { useTeam } from '@/hooks/use-team';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sparkles, Check } from 'lucide-react';
import Link from 'next/link';

export function SubscriptionStatus() {
  const { team, isLoading } = useTeam();
  
  if (isLoading) return <div className="h-20" />;
  
  const planTier = team?.planName || 'free';
  const isPro = planTier === 'pro' || planTier === 'agency';
  
  return (
    <div className="p-4 border-t border-gray-200">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-700">Current Plan</span>
        <Badge variant={planTier === 'free' ? 'outline' : 'default'}>
          {planTier === 'free' ? 'Free' : planTier === 'pro' ? 'Pro' : 'Agency'}
        </Badge>
      </div>
      
      {planTier === 'free' && (
        <div className="mt-3 space-y-2">
          <div className="text-xs text-gray-600">
            <Check className="inline h-3 w-3 mr-1" />
            {team?.businesses?.length || 0}/1 businesses
          </div>
          <Link href="/pricing">
            <Button size="sm" className="w-full gem-gradient text-white text-xs">
              <Sparkles className="mr-1 h-3 w-3" />
              Upgrade to Pro
            </Button>
          </Link>
        </div>
      )}
      
      {isPro && (
        <Link href="/dashboard/settings/billing">
          <Button size="sm" variant="ghost" className="w-full text-xs">
            Manage Subscription
          </Button>
        </Link>
      )}
    </div>
  );
}
```

### 2. Upgrade Modal Component

**Location**: Triggered when free users try to access Pro features
**Purpose**: Contextual upgrade prompt with clear value proposition

```tsx
// components/subscription/upgrade-modal.tsx
'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { WikidataRubyIcon, Sparkles, Check } from 'lucide-react';
import { checkoutAction } from '@/lib/payments/actions';
import { useState } from 'react';

interface UpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  feature: 'wikidata' | 'businesses' | 'api' | 'enrichment';
  currentPlan: 'free' | 'pro';
}

const FEATURE_MESSAGES = {
  wikidata: {
    title: 'Unlock Wikidata Publishing',
    description: 'Publish your business to Wikidata and improve your AI visibility across ChatGPT, Claude, and Perplexity.',
    benefits: [
      'Get recommended by AI systems',
      'Improve visibility by 2-4x',
      'Control your business information',
      'Track visibility improvements',
    ],
  },
  businesses: {
    title: 'Add More Businesses',
    description: 'Upgrade to Pro to manage up to 5 businesses, or Agency for up to 25.',
    benefits: [
      'Manage multiple businesses',
      'Compare performance across clients',
      'Unified dashboard',
    ],
  },
  // ... other features
};

export function UpgradeModal({ open, onOpenChange, feature, currentPlan }: UpgradeModalProps) {
  const [loading, setLoading] = useState(false);
  const message = FEATURE_MESSAGES[feature];
  
  const handleUpgrade = async () => {
    setLoading(true);
    const formData = new FormData();
    formData.set('priceId', process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID || '');
    await checkoutAction(formData);
    setLoading(false);
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <WikidataRubyIcon size={24} />
            <DialogTitle>{message.title}</DialogTitle>
          </div>
          <DialogDescription>{message.description}</DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <ul className="space-y-2">
            {message.benefits.map((benefit, i) => (
              <li key={i} className="flex items-start gap-2">
                <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <span className="text-sm text-gray-700">{benefit}</span>
              </li>
            ))}
          </ul>
          
          <div className="pt-4 border-t">
            <div className="flex items-baseline gap-2 mb-4">
              <span className="text-3xl font-bold">$49</span>
              <span className="text-gray-600">/month</span>
            </div>
            
            <form action={handleUpgrade}>
              <Button 
                type="submit" 
                className="w-full gem-gradient text-white"
                disabled={loading}
              >
                <Sparkles className="mr-2 h-4 w-4" />
                {loading ? 'Processing...' : 'Upgrade to Pro'}
              </Button>
            </form>
            
            <p className="text-xs text-gray-500 text-center mt-2">
              14-day free trial • Cancel anytime
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

### 3. Feature Gate Component

**Location**: Wrap Pro features throughout the app
**Purpose**: Show upgrade prompt when free users try to access Pro features

```tsx
// components/subscription/feature-gate.tsx
'use client';

import { useTeam } from '@/hooks/use-team';
import { UpgradeModal } from './upgrade-modal';
import { useState } from 'react';

interface FeatureGateProps {
  feature: 'wikidata' | 'businesses' | 'api' | 'enrichment';
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function FeatureGate({ feature, children, fallback }: FeatureGateProps) {
  const { team } = useTeam();
  const [showUpgrade, setShowUpgrade] = useState(false);
  
  const planTier = team?.planName || 'free';
  const hasAccess = 
    feature === 'wikidata' && (planTier === 'pro' || planTier === 'agency') ||
    feature === 'businesses' && planTier !== 'free' ||
    feature === 'api' && planTier === 'agency';
  
  if (hasAccess) {
    return <>{children}</>;
  }
  
  if (fallback) {
    return <>{fallback}</>;
  }
  
  return (
    <>
      <div 
        className="relative cursor-pointer"
        onClick={() => setShowUpgrade(true)}
      >
        <div className="opacity-50 pointer-events-none">
          {children}
        </div>
        <div className="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm rounded-lg">
          <div className="text-center p-4">
            <Sparkles className="h-8 w-8 mx-auto mb-2 text-primary" />
            <p className="font-medium text-gray-900 mb-1">Upgrade Required</p>
            <p className="text-sm text-gray-600">Unlock this feature with Pro</p>
          </div>
        </div>
      </div>
      
      <UpgradeModal
        open={showUpgrade}
        onOpenChange={setShowUpgrade}
        feature={feature}
        currentPlan={planTier as 'free' | 'pro'}
      />
    </>
  );
}
```

### 4. Enhanced Pricing Page with Current Plan

**Location**: `/pricing` page
**Purpose**: Show current subscription status and highlight upgrade path

```tsx
// app/(dashboard)/pricing/page.tsx (enhancements)

export default async function PricingPage() {
  const user = await getUser();
  const team = await getTeamForUser();
  const [prices, products] = await Promise.all([
    getStripePrices(),
    getStripeProducts(),
  ]);
  
  const currentPlan = team?.planName || 'free';
  const isPro = currentPlan === 'pro' || currentPlan === 'agency';
  
  return (
    <main className="py-12">
      {/* Current Plan Banner */}
      {isPro && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-8">
          <div className="gem-card p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Current Plan</p>
              <p className="text-lg font-semibold">
                {currentPlan === 'pro' ? 'Pro Plan' : 'Agency Plan'}
              </p>
            </div>
            <Link href="/dashboard/settings/billing">
              <Button variant="outline">Manage Subscription</Button>
            </Link>
          </div>
        </section>
      )}
      
      {/* Existing pricing cards with "Current Plan" badges */}
      {/* ... */}
    </main>
  );
}
```

### 5. Progressive Onboarding for Wikidata Publishing

**Location**: Business detail page
**Purpose**: Guide users through the Wikidata publishing process

```tsx
// components/wikidata/publishing-onboarding.tsx
'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { WikidataRubyIcon, Sparkles, Check, ArrowRight } from 'lucide-react';
import { FeatureGate } from '@/components/subscription/feature-gate';
import { useTeam } from '@/hooks/use-team';

const STEPS = [
  {
    id: 1,
    title: 'Crawl Your Website',
    description: 'Extract business information from your website',
    completed: false, // Check if crawl data exists
  },
  {
    id: 2,
    title: 'Run Fingerprint Analysis',
    description: 'See your current AI visibility score',
    completed: false, // Check if fingerprint exists
  },
  {
    id: 3,
    title: 'Publish to Wikidata',
    description: 'Make your business discoverable by AI systems',
    completed: false, // Check if published
    requiresPro: true,
  },
  {
    id: 4,
    title: 'Track Improvements',
    description: 'Monitor visibility improvements over time',
    completed: false,
  },
];

export function PublishingOnboarding({ businessId }: { businessId: number }) {
  const { team } = useTeam();
  const planTier = team?.planName || 'free';
  const isPro = planTier === 'pro' || planTier === 'agency';
  
  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <WikidataRubyIcon size={20} />
          Wikidata Publishing Journey
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {STEPS.map((step, index) => (
            <div key={step.id} className="flex items-start gap-4">
              <div className={`
                flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center
                ${step.completed 
                  ? 'bg-green-100 text-green-600' 
                  : step.requiresPro && !isPro
                  ? 'bg-gray-100 text-gray-400'
                  : 'bg-primary/10 text-primary'
                }
              `}>
                {step.completed ? (
                  <Check className="h-5 w-5" />
                ) : (
                  <span className="font-semibold">{step.id}</span>
                )}
              </div>
              
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-gray-900">{step.title}</h4>
                    <p className="text-sm text-gray-600">{step.description}</p>
                  </div>
                  
                  {!step.completed && (
                    <FeatureGate feature="wikidata">
                      <Button size="sm" variant="outline">
                        {step.id === 3 ? 'Upgrade to Publish' : 'Start'}
                        <ArrowRight className="ml-1 h-3 w-3" />
                      </Button>
                    </FeatureGate>
                  )}
                </div>
                
                {index < STEPS.length - 1 && (
                  <div className={`
                    ml-4 mt-2 h-8 w-0.5
                    ${step.completed ? 'bg-green-200' : 'bg-gray-200'}
                  `} />
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
```

### 6. Contextual Upgrade CTAs

**Location**: Throughout the app where Pro features are visible but locked

```tsx
// components/subscription/upgrade-cta.tsx
'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { WikidataRubyIcon, Sparkles, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import { useTeam } from '@/hooks/use-team';

interface UpgradeCTAProps {
  variant?: 'inline' | 'card' | 'banner';
  feature?: 'wikidata' | 'businesses' | 'api';
}

export function UpgradeCTA({ variant = 'card', feature = 'wikidata' }: UpgradeCTAProps) {
  const { team } = useTeam();
  const planTier = team?.planName || 'free';
  
  if (planTier !== 'free') return null;
  
  const messages = {
    wikidata: {
      title: 'Unlock Wikidata Publishing',
      description: 'Publish your business to Wikidata and improve AI visibility by 2-4x',
      icon: WikidataRubyIcon,
    },
    businesses: {
      title: 'Add More Businesses',
      description: 'Upgrade to Pro to manage up to 5 businesses',
      icon: TrendingUp,
    },
  };
  
  const message = messages[feature];
  const Icon = message.icon;
  
  if (variant === 'inline') {
    return (
      <div className="flex items-center gap-3 p-3 bg-primary/5 rounded-lg border border-primary/20">
        <Icon className="h-5 w-5 text-primary" />
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-900">{message.title}</p>
          <p className="text-xs text-gray-600">{message.description}</p>
        </div>
        <Link href="/pricing">
          <Button size="sm" className="gem-gradient text-white">
            Upgrade
          </Button>
        </Link>
      </div>
    );
  }
  
  return (
    <Card className="gem-card">
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-primary/10 rounded-lg">
            <Icon className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 mb-1">{message.title}</h3>
            <p className="text-sm text-gray-600 mb-4">{message.description}</p>
            <Link href="/pricing">
              <Button className="gem-gradient text-white">
                <Sparkles className="mr-2 h-4 w-4" />
                Upgrade to Pro
              </Button>
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
```

## Implementation Plan

### Phase 1: Foundation (Week 1)
1. ✅ Create `SubscriptionStatus` component
2. ✅ Create `UpgradeModal` component
3. ✅ Create `FeatureGate` component
4. ✅ Add subscription status to dashboard sidebar

### Phase 2: Integration (Week 2)
1. ✅ Wrap Wikidata publishing with `FeatureGate`
2. ✅ Add `UpgradeCTA` to business detail pages
3. ✅ Enhance pricing page with current plan status
4. ✅ Add upgrade prompts to dashboard

### Phase 3: Onboarding (Week 3)
1. ✅ Create `PublishingOnboarding` component
2. ✅ Add progressive journey to business pages
3. ✅ Add contextual help tooltips
4. ✅ Create upgrade success flow

### Phase 4: Optimization (Week 4)
1. ✅ A/B test upgrade messaging
2. ✅ Add analytics tracking
3. ✅ Optimize conversion funnel
4. ✅ Add email sequences for free users

## Key UX Principles

1. **Value-First**: Always explain WHY to upgrade, not just WHAT
2. **Contextual**: Show upgrade prompts when users try to use locked features
3. **Progressive**: Guide users through the journey step-by-step
4. **Non-Intrusive**: Don't block core functionality, just enhance it
5. **Clear Benefits**: Use specific numbers and outcomes (2-4x visibility, etc.)

## Success Metrics

- **Upgrade Conversion Rate**: Target 15-20% of free users
- **Time to Upgrade**: Average days from signup to upgrade
- **Feature Adoption**: % of Pro users who publish to Wikidata
- **Retention**: Pro user retention vs free user retention

## Next Steps

1. Review and approve proposal
2. Create component files
3. Implement feature gating
4. Add analytics tracking
5. Test upgrade flow end-to-end




