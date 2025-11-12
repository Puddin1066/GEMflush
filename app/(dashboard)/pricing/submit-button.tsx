'use client';

import { Button } from '@/components/ui/button';
import { ArrowRight, Loader2 } from 'lucide-react';
import { useFormStatus } from 'react-dom';

interface SubmitButtonProps {
  className?: string;
  variant?: 'default' | 'outline' | 'ghost' | 'link';
  disabled?: boolean;
  children?: React.ReactNode;
}

export function SubmitButton({ 
  className, 
  variant = 'outline',
  disabled = false,
  children
}: SubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      disabled={pending || disabled}
      variant={variant}
      className={className || "w-full rounded-full"}
    >
      {pending ? (
        <>
          <Loader2 className="animate-spin mr-2 h-4 w-4" />
          Loading...
        </>
      ) : (
        children || (
          <>
            Get Started
            <ArrowRight className="ml-2 h-4 w-4" />
          </>
        )
      )}
    </Button>
  );
}
