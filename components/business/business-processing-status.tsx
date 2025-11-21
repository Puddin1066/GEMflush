/**
 * Business Processing Status Component
 * Displays processing status with appropriate icon and message
 * 
 * SOLID: Single Responsibility - only displays processing status
 * DRY: Reusable status display across business cards
 */

'use client';

import { Loader2, Globe, Sparkles, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

export type BusinessStatus = 
  | 'pending'
  | 'crawling'
  | 'crawled'
  | 'generating'
  | 'published'
  | 'error';

export interface BusinessProcessingStatusProps {
  /**
   * Current business status
   */
  status: BusinessStatus;
  
  /**
   * Whether automation is enabled (affects messaging)
   */
  automationEnabled?: boolean;
  
  /**
   * Optional custom message override
   */
  message?: string;
  
  /**
   * Additional CSS classes
   */
  className?: string;
  
  /**
   * Size variant
   */
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Get status configuration
 */
function getStatusConfig(status: BusinessStatus, automationEnabled?: boolean) {
  const configs: Record<BusinessStatus, {
    icon: typeof Loader2;
    message: string;
    color: string;
  }> = {
    pending: {
      icon: Loader2,
      message: automationEnabled 
        ? 'Starting automatic processing...'
        : 'Pending',
      color: 'text-blue-600',
    },
    crawling: {
      icon: Globe,
      message: 'Crawling website...',
      color: 'text-blue-600',
    },
    crawled: {
      icon: CheckCircle2,
      message: 'Crawl completed',
      color: 'text-green-600',
    },
    generating: {
      icon: Sparkles,
      message: 'Publishing to Wikidata...',
      color: 'text-purple-600',
    },
    published: {
      icon: CheckCircle2,
      message: 'Published',
      color: 'text-green-600',
    },
    error: {
      icon: Loader2,
      message: 'Error occurred',
      color: 'text-red-600',
    },
  };

  return configs[status];
}

/**
 * Business Processing Status Component
 * 
 * @example
 * ```tsx
 * <BusinessProcessingStatus 
 *   status="crawling" 
 *   automationEnabled={true}
 *   size="sm"
 * />
 * ```
 */
export function BusinessProcessingStatus({
  status,
  automationEnabled = false,
  message,
  className,
  size = 'sm',
}: BusinessProcessingStatusProps) {
  const config = getStatusConfig(status, automationEnabled);
  const Icon = config.icon;
  const isProcessing = status === 'pending' || status === 'crawling' || status === 'generating';
  const displayMessage = message || config.message;

  const sizeClasses = {
    sm: {
      container: 'text-xs',
      icon: 'h-3 w-3',
      gap: 'gap-1',
    },
    md: {
      container: 'text-sm',
      icon: 'h-4 w-4',
      gap: 'gap-1.5',
    },
    lg: {
      container: 'text-base',
      icon: 'h-5 w-5',
      gap: 'gap-2',
    },
  };

  const sizeConfig = sizeClasses[size];

  return (
    <div
      className={cn(
        'flex items-center',
        sizeConfig.container,
        sizeConfig.gap,
        config.color,
        className
      )}
    >
      {isProcessing ? (
        <Icon className={cn(sizeConfig.icon, 'animate-spin')} />
      ) : (
        <Icon className={sizeConfig.icon} />
      )}
      <span>{displayMessage}</span>
    </div>
  );
}

