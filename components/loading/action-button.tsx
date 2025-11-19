/**
 * Action Button Component
 * Button with loading state for async operations
 * 
 * SOLID: Single Responsibility - handles button states for actions
 * DRY: Reusable action button pattern
 */

'use client';

import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type React from 'react';

type ButtonProps = React.ComponentProps<typeof Button>;

interface ActionButtonProps extends ButtonProps {
  loading?: boolean;
  loadingText?: string;
  icon?: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}

export function ActionButton({
  loading = false,
  loadingText,
  icon: Icon,
  children,
  className,
  disabled,
  ...props
}: ActionButtonProps) {
  const displayText = loading && loadingText ? loadingText : children;
  const isDisabled = disabled || loading;

  return (
    <Button
      {...props}
      disabled={isDisabled}
      className={cn(className)}
    >
      {loading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          {displayText}
        </>
      ) : (
        <>
          {Icon && <Icon className="mr-2 h-4 w-4" />}
          {children}
        </>
      )}
    </Button>
  );
}

