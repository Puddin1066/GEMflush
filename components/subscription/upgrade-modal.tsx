/**
 * Upgrade Modal Component
 * SOLID: Open/Closed - extensible via feature config
 * DRY: Uses centralized upgrade config
 */

'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Check, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getUpgradeConfig, type UpgradeFeature } from '@/lib/subscription/upgrade-config';
import { useTeam } from '@/lib/hooks/use-team';

interface UpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  feature: UpgradeFeature;
}

export function UpgradeModal({ open, onOpenChange, feature }: UpgradeModalProps) {
  const router = useRouter();
  const { planTier } = useTeam();
  const [loading, setLoading] = useState(false);
  const config = getUpgradeConfig(feature);
  const Icon = config.icon;

  const handleUpgrade = () => {
    setLoading(true);
    // Navigate to pricing page with feature highlight
    router.push(`/pricing?feature=${feature}`);
    onOpenChange(false);
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <Icon size={24} className="text-primary" />
            <DialogTitle>{config.title}</DialogTitle>
          </div>
          <DialogDescription>{config.description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <ul className="space-y-2">
            {config.benefits.map((benefit, i) => (
              <li key={i} className="flex items-start gap-2">
                <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <span className="text-sm text-gray-700">{benefit}</span>
              </li>
            ))}
          </ul>

          <div className="pt-4 border-t">
            <div className="flex items-baseline gap-2 mb-4">
              <span className="text-3xl font-bold gem-text">${config.price}</span>
              <span className="text-gray-600">/month</span>
            </div>

            <Button
              onClick={handleUpgrade}
              className="w-full gem-gradient text-white"
              disabled={loading}
            >
              <Sparkles className="mr-2 h-4 w-4" />
              {loading ? 'Processing...' : config.ctaText}
            </Button>

            <p className="text-xs text-gray-500 text-center mt-2">
              14-day free trial • Cancel anytime
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}




