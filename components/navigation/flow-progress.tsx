/**
 * Flow Progress Component
 * Shows progress through multi-step flows (Create → Crawl → Fingerprint → Publish)
 * 
 * SOLID: Single Responsibility - displays flow progress
 * DRY: Reusable progress indicator
 */

'use client';

import { CheckCircle2, Circle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

export type FlowStep = 'create' | 'crawl' | 'fingerprint' | 'publish';

interface FlowProgressProps {
  currentStep: FlowStep;
  completedSteps?: FlowStep[];
  className?: string;
}

const steps: { key: FlowStep; label: string }[] = [
  { key: 'create', label: 'Create Business' },
  { key: 'crawl', label: 'Crawl Website' },
  { key: 'fingerprint', label: 'Analyze Visibility' },
  { key: 'publish', label: 'Publish to Wikidata' },
];

export function FlowProgress({
  currentStep,
  completedSteps = [],
  className,
}: FlowProgressProps) {
  const currentIndex = steps.findIndex((s) => s.key === currentStep);

  return (
    <div className={cn('flex items-center justify-between', className)}>
      {steps.map((step, index) => {
        const isCompleted = completedSteps.includes(step.key) || index < currentIndex;
        const isCurrent = step.key === currentStep && !isCompleted;
        const isPending = index > currentIndex && !isCompleted;

        return (
          <div key={step.key} className="flex items-center flex-1">
            <div className="flex flex-col items-center flex-1">
              <div className="flex items-center w-full">
                <div className="flex flex-col items-center">
                  {isCompleted ? (
                    <CheckCircle2 className="h-6 w-6 text-green-600" />
                  ) : isCurrent ? (
                    <Loader2 className="h-6 w-6 text-primary animate-spin" />
                  ) : (
                    <Circle className="h-6 w-6 text-gray-300" />
                  )}
                  <span
                    className={cn(
                      'mt-2 text-xs font-medium text-center max-w-[80px]',
                      isCompleted && 'text-green-600',
                      isCurrent && 'text-primary',
                      isPending && 'text-gray-400'
                    )}
                  >
                    {step.label}
                  </span>
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={cn(
                      'h-0.5 flex-1 mx-2 -mt-3',
                      isCompleted ? 'bg-green-600' : 'bg-gray-200'
                    )}
                  />
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

