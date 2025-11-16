/**
 * Manage Subscription Form
 * SOLID: Single Responsibility - only handles subscription management
 * DRY: Uses existing customerPortalAction
 */

'use client';

import { Button } from '@/components/ui/button';
import { ExternalLink, CreditCard } from 'lucide-react';
import { customerPortalAction } from '@/lib/payments/actions';
import { useFormStatus } from 'react-dom';
import type { Team } from '@/lib/db/schema';

interface ManageSubscriptionFormProps {
  team: Team;
}

function SubmitButton() {
  const { pending } = useFormStatus();
  
  return (
    <Button
      type="submit"
      variant="outline"
      className="w-full"
      disabled={pending}
    >
      {pending ? (
        <>
          <div className="animate-spin mr-2 h-4 w-4 border-2 border-gray-400 border-t-transparent rounded-full" />
          Opening...
        </>
      ) : (
        <>
          <CreditCard className="mr-2 h-4 w-4" />
          Open Billing Portal
          <ExternalLink className="ml-2 h-4 w-4" />
        </>
      )}
    </Button>
  );
}

export function ManageSubscriptionForm({ team }: ManageSubscriptionFormProps) {
  if (!team.stripeCustomerId) {
    return (
      <div className="text-center py-4">
        <p className="text-sm text-gray-600 mb-4">
          No billing information found. Please contact support.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">
        Access the Stripe customer portal to manage your subscription, update payment methods, and view invoices.
      </p>
      
      <form action={customerPortalAction}>
        <SubmitButton />
      </form>
    </div>
  );
}

