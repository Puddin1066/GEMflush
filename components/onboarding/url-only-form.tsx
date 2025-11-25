/**
 * URL-Only Form Component
 * Frictionless onboarding form - only requires URL
 * System automatically extracts business data
 * 
 * SOLID: Single Responsibility - handles URL-only business creation
 * DRY: Reusable for frictionless onboarding flow
 */

'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Globe, Sparkles, Loader2 } from 'lucide-react';
import { GemIcon } from '@/components/ui/gem-icon';
import { formatAndValidateUrl } from '@/lib/utils/format';

interface UrlOnlyFormProps {
  onSubmit: (url: string) => Promise<void>;
  loading?: boolean;
  error?: string | null;
  className?: string;
}

export function UrlOnlyForm({
  onSubmit,
  loading = false,
  error,
  className,
}: UrlOnlyFormProps) {
  const [url, setUrl] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (!url.trim()) {
      setLocalError('Please enter a website URL');
      return;
    }

    // DRY: Use centralized URL formatting and validation utility
    const { formatted: formattedUrl, isValid } = formatAndValidateUrl(url);

    if (!isValid) {
      setLocalError('Please enter a valid website URL');
      return;
    }

    try {
      await onSubmit(formattedUrl);
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Failed to create business');
    }
  };

  const displayError = error || localError;

  return (
    <Card className={`gem-card ${className}`}>
      <CardHeader>
        <div className="flex items-center gap-3">
          <GemIcon size={32} variant="faceted" />
          <div>
            <CardTitle className="text-2xl">Add Your Business</CardTitle>
            <CardDescription>
              Enter your website URL and we'll automatically extract the details
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="url" className="text-base">
              Website URL
            </Label>
            <div className="relative">
              <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                id="url"
                type="url"
                placeholder="https://example.com"
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  setLocalError(null);
                }}
                disabled={loading}
                className="pl-10"
                required
              />
            </div>
            {displayError && (
              <p className="text-sm text-red-600 flex items-center gap-2">
                <span className="text-red-500">⚠</span>
                {displayError}
              </p>
            )}
            <p className="text-xs text-gray-500">
              We'll automatically extract your business name, location, and category from your website
            </p>
          </div>

          <Button
            type="submit"
            disabled={loading || !url.trim()}
            className="w-full gem-gradient text-white"
            size="lg"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating Business...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Create Business
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

