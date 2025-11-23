/**
 * Welcome Message Component
 * Displays welcome message for new users on dashboard
 * 
 * SOLID: Single Responsibility - only displays welcome messaging
 * DRY: Reusable across dashboard and onboarding flows
 */

'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { GemIcon, GemClusterIcon } from '@/components/ui/gem-icon';
import { Sparkles, ArrowRight } from 'lucide-react';
import Link from 'next/link';

interface WelcomeMessageProps {
  userName?: string;
  businessCount?: number;
  onGetStarted?: () => void;
  className?: string;
}

export function WelcomeMessage({
  userName,
  businessCount = 0,
  onGetStarted,
  className,
}: WelcomeMessageProps) {
  const hasBusinesses = businessCount > 0;

  return (
    <Card className={`gem-card border-l-4 border-l-primary ${className}`}>
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0">
            <div className="gem-text-shimmer text-4xl">💎</div>
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-bold gem-text mb-2">
              {userName ? `Welcome back, ${userName}!` : 'Welcome to GEMflush!'}
            </h2>
            <p className="text-gray-600 mb-4">
              {hasBusinesses
                ? `You have ${businessCount} ${businessCount === 1 ? 'business' : 'businesses'} in your knowledge graph.`
                : "Let's get started by adding your first business to discover its AI visibility."}
            </p>
            {!hasBusinesses && (
              <div className="flex flex-col sm:flex-row gap-3">
                {onGetStarted ? (
                  <Button
                    onClick={onGetStarted}
                    className="gem-gradient text-white"
                    size="lg"
                  >
                    <Sparkles className="mr-2 h-4 w-4" />
                    Get Started
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                ) : (
                  <Link href="/dashboard/businesses">
                    <Button className="gem-gradient text-white" size="lg">
                      <Sparkles className="mr-2 h-4 w-4" />
                      Get Started
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                )}
                <Link href="/pricing">
                  <Button variant="outline" size="lg">
                    <GemClusterIcon size={16} className="mr-2" />
                    View Plans
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

