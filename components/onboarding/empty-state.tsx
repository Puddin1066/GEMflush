/**
 * Empty State Component
 * Displays helpful empty states with clear CTAs
 * 
 * SOLID: Single Responsibility - only displays empty states
 * DRY: Reusable across different contexts (businesses, fingerprints, etc.)
 */

'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { GemIcon } from '@/components/ui/gem-icon';
import { LucideIcon } from 'lucide-react';
import Link from 'next/link';

interface EmptyStateProps {
  icon?: LucideIcon | React.ComponentType<{ className?: string; size?: number }>;
  title: string;
  description: string;
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
    variant?: 'default' | 'outline';
  };
  secondaryAction?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
  className?: string;
}

export function EmptyState({
  icon: Icon = GemIcon,
  title,
  description,
  action,
  secondaryAction,
  className,
}: EmptyStateProps) {
  const ActionButton = action && (
    action.href ? (
      <Link href={action.href}>
        <Button
          className={action.variant === 'outline' ? '' : 'gem-gradient text-white'}
          variant={action.variant}
          size="lg"
        >
          {action.label}
        </Button>
      </Link>
    ) : (
      <Button
        onClick={action.onClick}
        className={action.variant === 'outline' ? '' : 'gem-gradient text-white'}
        variant={action.variant}
        size="lg"
      >
        {action.label}
      </Button>
    )
  );

  const SecondaryButton = secondaryAction && (
    secondaryAction.href ? (
      <Link href={secondaryAction.href}>
        <Button variant="outline" size="lg">
          {secondaryAction.label}
        </Button>
      </Link>
    ) : (
      <Button onClick={secondaryAction.onClick} variant="outline" size="lg">
        {secondaryAction.label}
      </Button>
    )
  );

  return (
    <Card className={`gem-card ${className}`}>
      <CardContent className="p-12">
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="p-4 bg-primary/10 rounded-full">
              <Icon className="h-12 w-12 text-primary" size={48} />
            </div>
          </div>
          <h3 className="text-xl font-semibold text-gray-900">{title}</h3>
          <p className="text-gray-600 max-w-md mx-auto">{description}</p>
          {(ActionButton || SecondaryButton) && (
            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
              {ActionButton}
              {SecondaryButton}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

