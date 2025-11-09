/**
 * GEMflush Brand - Gem-Inspired Icon Components
 * 
 * These components provide gem/crystal-shaped icons for the Gemflush brand identity.
 * Use throughout the app for logos, status indicators, and decorative elements.
 */

import React from 'react';
import { cn } from '@/lib/utils';

interface GemIconProps {
  className?: string;
  size?: number;
  variant?: 'default' | 'faceted' | 'ruby' | 'sparkle' | 'outline';
}

/**
 * Main Gem Icon - Diamond/crystal shape
 * Perfect for: Logo, primary brand mark, premium features
 */
export function GemIcon({ 
  className, 
  size = 24, 
  variant = 'default' 
}: GemIconProps) {
  const baseClass = variant === 'outline' ? 'icon-gem' : 'gem-glow';
  
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn(baseClass, className)}
    >
      {/* Diamond/Gem shape */}
      <path
        d="M12 2L4 8L12 22L20 8L12 2Z"
        fill="currentColor"
        fillOpacity={variant === 'outline' ? 0 : 1}
        stroke="currentColor"
        strokeWidth={variant === 'outline' ? 2 : 0}
        strokeLinejoin="round"
      />
      {/* Internal facets for depth */}
      {variant === 'faceted' && (
        <>
          <path
            d="M12 2L8 8L12 14"
            stroke="white"
            strokeWidth="1"
            strokeOpacity="0.3"
            fill="none"
          />
          <path
            d="M12 2L16 8L12 14"
            stroke="white"
            strokeWidth="1"
            strokeOpacity="0.3"
            fill="none"
          />
          <path
            d="M4 8H20L12 14L4 8Z"
            stroke="white"
            strokeWidth="1"
            strokeOpacity="0.2"
            fill="none"
          />
        </>
      )}
      {/* Sparkle effect */}
      {variant === 'sparkle' && (
        <>
          <circle cx="8" cy="5" r="1" fill="white" opacity="0.8" />
          <circle cx="16" cy="10" r="1" fill="white" opacity="0.6" />
        </>
      )}
    </svg>
  );
}

/**
 * Gem Cluster Icon - Multiple gems
 * Perfect for: Knowledge graph collections, entity groups, premium tiers
 */
export function GemClusterIcon({ className, size = 24 }: GemIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('gem-glow', className)}
    >
      {/* Large center gem */}
      <path
        d="M12 4L7 8L12 16L17 8L12 4Z"
        fill="currentColor"
        opacity="1"
      />
      {/* Small left gem */}
      <path
        d="M6 10L3 13L6 18L9 13L6 10Z"
        fill="currentColor"
        opacity="0.7"
      />
      {/* Small right gem */}
      <path
        d="M18 10L15 13L18 18L21 13L18 10Z"
        fill="currentColor"
        opacity="0.7"
      />
    </svg>
  );
}

/**
 * Gem Shard Icon - Crystal shard/fragment
 * Perfect for: Loading states, in-progress items, partial data
 */
export function GemShardIcon({ className, size = 24 }: GemIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('icon-gem', className)}
    >
      <path
        d="M8 2L6 6L8 14L14 16L16 8L14 4L8 2Z"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      {/* Internal facet line */}
      <path
        d="M8 2L10 10L14 4"
        stroke="white"
        strokeWidth="1"
        strokeOpacity="0.3"
      />
    </svg>
  );
}

/**
 * Hexagonal Gem Icon - Geometric crystal
 * Perfect for: Data nodes, entity icons, structured data
 */
export function HexGemIcon({ className, size = 24 }: GemIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('gem-glow', className)}
    >
      {/* Hexagon */}
      <path
        d="M12 2L20 7V17L12 22L4 17V7L12 2Z"
        fill="currentColor"
        opacity="0.9"
      />
      {/* Inner hexagon for depth */}
      <path
        d="M12 6L16 8.5V15.5L12 18L8 15.5V8.5L12 6Z"
        fill="white"
        opacity="0.15"
      />
      {/* Center point */}
      <circle cx="12" cy="12" r="2" fill="white" opacity="0.3" />
    </svg>
  );
}

/**
 * Wikidata Ruby Icon - Red gem for Wikidata features
 * Perfect for: Wikidata published status, entity links
 */
export function WikidataRubyIcon({ className, size = 24 }: GemIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('wikidata-accent', className)}
      style={{ filter: 'drop-shadow(0 2px 6px rgba(153, 0, 0, 0.4))' }}
    >
      <path
        d="M12 2L4 8L12 20L20 8L12 2Z"
        fill="currentColor"
      />
      {/* Highlight */}
      <path
        d="M12 2L8 8L12 12"
        fill="white"
        opacity="0.3"
      />
    </svg>
  );
}

/**
 * Gem Logo Component - Full Gemflush logo with text
 * Perfect for: Nav bar, headers, marketing pages
 */
export function GemflushLogo({ 
  className, 
  showText = true,
  size = 32 
}: GemIconProps & { showText?: boolean }) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <GemIcon 
        size={size} 
        variant="faceted"
        className="gem-glow"
      />
      {showText && (
        <span className="text-xl font-bold gem-text-shimmer">
          GEMflush
        </span>
      )}
    </div>
  );
}

/**
 * Gem Badge Component - Status indicator with gem styling
 * Perfect for: Premium features, published status, quality indicators
 */
export function GemBadge({ 
  children, 
  variant = 'default',
  className 
}: { 
  children: React.ReactNode;
  variant?: 'default' | 'ruby' | 'outline';
  className?: string;
}) {
  const variantClasses = {
    default: 'gem-badge',
    ruby: 'gem-badge gem-ruby',
    outline: 'border-2 gem-border bg-transparent text-primary',
  };
  
  return (
    <div className={cn(variantClasses[variant], className)}>
      {children}
    </div>
  );
}

/**
 * Gem Card Component - Premium card with gem styling
 * Perfect for: Featured content, premium tiers, highlighted entities
 */
export function GemCard({ 
  children, 
  className,
  sparkle = false 
}: { 
  children: React.ReactNode;
  className?: string;
  sparkle?: boolean;
}) {
  return (
    <div className={cn(
      'gem-card rounded-lg p-6',
      sparkle && 'gem-sparkle',
      className
    )}>
      {children}
    </div>
  );
}

