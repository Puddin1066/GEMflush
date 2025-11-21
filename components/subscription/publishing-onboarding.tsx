/**
 * Publishing Onboarding Component
 * Progressive UX: Guides users through Wikidata publishing journey
 * SOLID: Single Responsibility - only handles onboarding display
 */

'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check, ArrowRight, Lock } from 'lucide-react';
import { WikidataRubyIcon } from '@/components/ui/gem-icon';
import { FeatureGate } from './feature-gate';
import { useTeam } from '@/lib/hooks/use-team';
import Link from 'next/link';

interface PublishingOnboardingProps {
  businessId: number;
  hasCrawlData: boolean;
  hasFingerprint: boolean;
  isPublished: boolean;
}

interface OnboardingStep {
  id: number;
  title: string;
  description: string;
  completed: boolean;
  requiresPro: boolean;
  actionUrl?: string;
  actionText?: string;
}

export function PublishingOnboarding({
  businessId,
  hasCrawlData,
  hasFingerprint,
  isPublished,
}: PublishingOnboardingProps) {
  const { planTier, isPro } = useTeam();

  // PRO TIER: Show automated processing status instead of manual steps
  if (isPro) {
    const automatedSteps = [
      { title: 'Website Analysis', completed: hasCrawlData, description: 'AI extracts business data automatically' },
      { title: 'Visibility Assessment', completed: hasFingerprint, description: 'LLM fingerprinting runs automatically' },
      { title: 'Knowledge Graph Publishing', completed: isPublished, description: 'Wikidata publication happens automatically' },
      { title: 'Competitive Intelligence', completed: isPublished && hasFingerprint, description: 'Ongoing monitoring and insights' }
    ];
    
    const progress = (automatedSteps.filter(s => s.completed).length / automatedSteps.length) * 100;
    
    return (
      <Card className="mb-6 bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
        <CardHeader>
          <div className="flex items-center gap-3">
            <WikidataRubyIcon size={32} />
            <div>
              <CardTitle className="text-xl">🤖 Automated AI Visibility Processing</CardTitle>
              <CardDescription className="text-blue-700">
                GEMflush automatically handles your AI visibility - no manual work required
              </CardDescription>
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="font-medium text-blue-800">Automated Progress</span>
              <span className="text-blue-600">{Math.round(progress)}% Complete</span>
            </div>
            <div className="w-full bg-blue-100 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {automatedSteps.map((step, index) => (
              <div key={index} className="flex items-center gap-3 p-3 rounded-lg bg-white/60">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                  step.completed ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-500'
                }`}>
                  {step.completed ? <Check className="h-4 w-4" /> : <div className="w-2 h-2 bg-current rounded-full animate-pulse" />}
                </div>
                <div className="flex-1">
                  <div className="font-medium text-sm">{step.title}</div>
                  <div className="text-xs text-gray-600">{step.description}</div>
                </div>
                {step.completed && <div className="text-xs text-green-600 font-medium">✓ Done</div>}
              </div>
            ))}
          </div>
          <div className="mt-4 p-3 bg-blue-100 rounded-lg">
            <div className="text-sm text-blue-800">
              <strong>🎯 Value Delivered:</strong> GEMflush automatically optimizes your AI visibility across ChatGPT, Claude, and Perplexity without any manual intervention.
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // FREE TIER: Show manual onboarding steps
  const steps: OnboardingStep[] = [
    {
      id: 1,
      title: 'Crawl Your Website',
      description: 'Extract business information from your website',
      completed: hasCrawlData,
      requiresPro: false,
      actionUrl: `/dashboard/businesses/${businessId}`,
      actionText: 'Crawl Website',
    },
    {
      id: 2,
      title: 'Run Fingerprint Analysis',
      description: 'See your current AI visibility score',
      completed: hasFingerprint,
      requiresPro: false,
      actionUrl: `/dashboard/businesses/${businessId}/fingerprint`,
      actionText: 'Run Analysis',
    },
    {
      id: 3,
      title: 'Publish to Wikidata',
      description: 'Make your business discoverable by AI systems (ChatGPT, Claude, Perplexity)',
      completed: isPublished,
      requiresPro: true,
      actionUrl: `/dashboard/businesses/${businessId}`,
      actionText: 'Publish Now',
    },
    {
      id: 4,
      title: 'Track Improvements',
      description: 'Monitor visibility improvements over time',
      completed: isPublished && hasFingerprint,
      requiresPro: false,
      actionUrl: `/dashboard/businesses/${businessId}/fingerprint`,
      actionText: 'View Results',
    },
  ];

  const currentStep = steps.find((step) => !step.completed) || steps[steps.length - 1];
  const progress = (steps.filter((s) => s.completed).length / steps.length) * 100;

  return (
    <Card className="mb-6">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <WikidataRubyIcon size={20} />
            Get Your Business Into AI Systems
          </CardTitle>
          <div className="text-sm text-gray-600">
            {Math.round(progress)}% Complete
          </div>
        </div>
        <CardDescription className="mt-2">
          Follow these steps to make your business discoverable by ChatGPT, Claude, and Perplexity
        </CardDescription>
        <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {steps.map((step, index) => {
            const isActive = step.id === currentStep.id;
            const isLocked = step.requiresPro && !isPro && !step.completed;

            return (
              <div key={step.id} className="flex items-start gap-4">
                <div
                  className={`
                    flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm
                    ${
                      step.completed
                        ? 'bg-green-100 text-green-600'
                        : isLocked
                        ? 'bg-gray-100 text-gray-400'
                        : isActive
                        ? 'bg-primary text-white ring-2 ring-primary ring-offset-2'
                        : 'bg-gray-100 text-gray-400'
                    }
                  `}
                >
                  {step.completed ? (
                    <Check className="h-5 w-5" />
                  ) : isLocked ? (
                    <Lock className="h-4 w-4" />
                  ) : (
                    step.id
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h4
                        className={`font-medium ${
                          step.completed
                            ? 'text-gray-900'
                            : isActive
                            ? 'text-primary'
                            : 'text-gray-500'
                        }`}
                      >
                        {step.title}
                      </h4>
                      <p className="text-sm text-gray-600 truncate">{step.description}</p>
                    </div>

                    {!step.completed && step.actionUrl && (
                      <FeatureGate
                        feature="wikidata"
                        showUpgradeOnClick={isLocked}
                        fallback={
                          isLocked ? (
                            <Button size="sm" variant="outline" disabled>
                              <Lock className="mr-1 h-3 w-3" />
                              Upgrade
                            </Button>
                          ) : (
                            <Link href={step.actionUrl}>
                              <Button size="sm" variant={isActive ? 'default' : 'outline'}>
                                {step.actionText || 'Start'}
                                <ArrowRight className="ml-1 h-3 w-3" />
                              </Button>
                            </Link>
                          )
                        }
                      >
                        <Link href={step.actionUrl}>
                          <Button size="sm" variant={isActive ? 'default' : 'outline'}>
                            {step.actionText || 'Start'}
                            <ArrowRight className="ml-1 h-3 w-3" />
                          </Button>
                        </Link>
                      </FeatureGate>
                    )}
                  </div>

                  {index < steps.length - 1 && (
                    <div
                      className={`
                        ml-4 mt-2 h-8 w-0.5 transition-colors
                        ${step.completed ? 'bg-green-200' : 'bg-gray-200'}
                      `}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}



