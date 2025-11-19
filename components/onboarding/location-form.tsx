/**
 * Location Form Component
 * Collects business location when crawler cannot extract it
 * 
 * SOLID: Single Responsibility - only handles location collection
 * DRY: Reusable for location collection flow
 */

'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MapPin, Loader2 } from 'lucide-react';

interface LocationFormProps {
  onSubmit: (location: { city: string; state: string; country: string; address?: string }) => Promise<void>;
  loading?: boolean;
  error?: string | null;
  crawledData?: {
    name?: string;
    category?: string;
    url?: string;
  };
  className?: string;
}

const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
];

export function LocationForm({
  onSubmit,
  loading = false,
  error,
  crawledData,
  className,
}: LocationFormProps) {
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [country, setCountry] = useState('US');
  const [address, setAddress] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (!city.trim()) {
      setLocalError('Please enter a city');
      return;
    }

    if (!state.trim()) {
      setLocalError('Please enter a state');
      return;
    }

    if (!country.trim()) {
      setLocalError('Please enter a country');
      return;
    }

    try {
      await onSubmit({
        city: city.trim(),
        state: state.trim().toUpperCase(),
        country: country.trim().toUpperCase(),
        address: address.trim() || undefined,
      });
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Failed to submit location');
    }
  };

  const displayError = error || localError;

  return (
    <Card className={`gem-card ${className}`}>
      <CardHeader>
        <div className="flex items-center gap-3">
          <MapPin className="h-8 w-8 text-blue-500" />
          <div>
            <CardTitle className="text-2xl">Location Required</CardTitle>
            <CardDescription>
              We couldn't automatically detect your business location. Please provide it below.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {crawledData && (
          <div className="mb-4 p-3 bg-gray-50 rounded-lg text-sm">
            <p className="font-semibold text-gray-900">Business Details:</p>
            {crawledData.name && <p>Name: {crawledData.name}</p>}
            {crawledData.category && <p>Category: {crawledData.category}</p>}
            {crawledData.url && <p>URL: {crawledData.url}</p>}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="city" className="text-base">
                City <span className="text-red-500">*</span>
              </Label>
              <Input
                id="city"
                type="text"
                placeholder="San Francisco"
                value={city}
                onChange={(e) => {
                  setCity(e.target.value);
                  setLocalError(null);
                }}
                disabled={loading}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="state" className="text-base">
                State/Province <span className="text-red-500">*</span>
              </Label>
              <Input
                id="state"
                type="text"
                placeholder="CA"
                value={state}
                onChange={(e) => {
                  setState(e.target.value);
                  setLocalError(null);
                }}
                disabled={loading}
                required
                maxLength={2}
                pattern="[A-Z]{2}"
                title="Enter 2-letter state abbreviation (e.g., CA, NY, TX)"
              />
              {country === 'US' && (
                <p className="text-xs text-gray-500">
                  Enter 2-letter state code (e.g., CA, NY, TX)
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="country" className="text-base">
              Country <span className="text-red-500">*</span>
            </Label>
            <Input
              id="country"
              type="text"
              placeholder="US"
              value={country}
              onChange={(e) => {
                setCountry(e.target.value);
                setLocalError(null);
              }}
              disabled={loading}
              required
              maxLength={2}
              pattern="[A-Z]{2}"
              title="Enter 2-letter country code (e.g., US, CA, GB)"
            />
            <p className="text-xs text-gray-500">
              Enter 2-letter country code (e.g., US, CA, GB) - ISO 3166-1 alpha-2
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address" className="text-base">
              Street Address (Optional)
            </Label>
            <Input
              id="address"
              type="text"
              placeholder="123 Main Street"
              value={address}
              onChange={(e) => {
                setAddress(e.target.value);
                setLocalError(null);
              }}
              disabled={loading}
            />
            <p className="text-xs text-gray-500">
              Full street address (optional but recommended for better visibility)
            </p>
          </div>

          {displayError && (
            <p className="text-sm text-red-600 flex items-center gap-2">
              <span className="text-red-500">⚠</span>
              {displayError}
            </p>
          )}

          <Button
            type="submit"
            disabled={loading || !city.trim() || !state.trim() || !country.trim()}
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
                <MapPin className="mr-2 h-4 w-4" />
                Continue with Location
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

