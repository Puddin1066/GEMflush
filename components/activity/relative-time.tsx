/**
 * Relative Time Component
 * SOLID: Single Responsibility - only handles relative time display
 * DRY: Reusable component for time formatting
 * Fixes hydration mismatch by rendering client-side only
 */

'use client';

import { useEffect, useState } from 'react';

interface RelativeTimeProps {
  date: Date | string;
  className?: string;
}

export function RelativeTime({ date, className }: RelativeTimeProps) {
  const [relativeTime, setRelativeTime] = useState<string>('');

  useEffect(() => {
    // Calculate relative time on client only (prevents hydration mismatch)
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - dateObj.getTime()) / 1000);

    let timeString: string;
    if (diffInSeconds < 60) {
      timeString = 'just now';
    } else if (diffInSeconds < 3600) {
      timeString = `${Math.floor(diffInSeconds / 60)} minutes ago`;
    } else if (diffInSeconds < 86400) {
      timeString = `${Math.floor(diffInSeconds / 3600)} hours ago`;
    } else if (diffInSeconds < 604800) {
      timeString = `${Math.floor(diffInSeconds / 86400)} days ago`;
    } else {
      timeString = dateObj.toLocaleDateString();
    }

    setRelativeTime(timeString);
  }, [date]);

  // Show fallback during SSR to prevent hydration mismatch and layout shift
  // Use suppressHydrationWarning since we intentionally render differently on client
  return (
    <span className={className} suppressHydrationWarning>
      {relativeTime || 'recently'}
    </span>
  );
}

