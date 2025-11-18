/**
 * Back Button Component
 * Consistent back navigation button
 * 
 * SOLID: Single Responsibility - handles back navigation
 * DRY: Reusable back button pattern
 */

'use client';

import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface BackButtonProps {
  href?: string;
  label?: string;
  onClick?: () => void;
  className?: string;
}

export function BackButton({
  href,
  label = 'Back',
  onClick,
  className,
}: BackButtonProps) {
  const router = useRouter();

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else if (href) {
      router.push(href);
    } else {
      router.back();
    }
  };

  if (href && !onClick) {
    return (
      <Link href={href}>
        <Button variant="ghost" size="sm" className={className}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          {label}
        </Button>
      </Link>
    );
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleClick}
      className={className}
    >
      <ArrowLeft className="mr-2 h-4 w-4" />
      {label}
    </Button>
  );
}

