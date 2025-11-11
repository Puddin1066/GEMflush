'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error to console for debugging
    console.error('Dashboard error:', error);
  }, [error]);

  // Check if it's a configuration error
  const isDatabaseError = 
    error.message?.includes('DATABASE_URL') ||
    error.message?.includes('POSTGRES_URL') ||
    (error.message?.includes('environment variable') && error.message?.includes('DATABASE'));
  
  const isAuthError =
    error.message?.includes('AUTH_SECRET') ||
    (error.message?.includes('environment variable') && error.message?.includes('AUTH'));
  
  const isConfigError = isDatabaseError || isAuthError;

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="max-w-2xl w-full">
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <CardTitle>Application Error</CardTitle>
          </div>
          <CardDescription>
            {isConfigError
              ? 'Configuration error detected'
              : 'An unexpected error occurred'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isConfigError ? (
            <>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <h3 className="font-semibold text-amber-900 mb-2">
                  ⚠️ Environment Variables Required
                </h3>
                <p className="text-sm text-amber-800 mb-4">
                  The application requires environment variables to function. Please configure them
                  in your Vercel project settings.
                </p>
                <div className="space-y-3 text-sm text-amber-800">
                  {isDatabaseError && (
                    <div>
                      <p><strong>Database Connection:</strong></p>
                      <code className="block bg-amber-100 p-2 rounded mt-1">
                        DATABASE_URL=postgresql://user:password@host:port/database
                      </code>
                    </div>
                  )}
                  {isAuthError && (
                    <div>
                      <p><strong>Authentication Secret:</strong></p>
                      <code className="block bg-amber-100 p-2 rounded mt-1">
                        AUTH_SECRET=your-random-secret-key
                      </code>
                      <p className="text-xs mt-1">
                        Generate with: <code>openssl rand -base64 32</code>
                      </p>
                    </div>
                  )}
                  <div className="mt-3 pt-3 border-t border-amber-200">
                    <p className="font-semibold mb-2">How to fix:</p>
                    <ol className="list-decimal list-inside space-y-1 ml-2">
                      <li>Go to your Vercel project settings</li>
                      <li>Navigate to Environment Variables</li>
                      <li>Add the required variables listed above</li>
                      <li>Select all environments (Production, Preview, Development)</li>
                      <li>Redeploy the application</li>
                    </ol>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => window.open('https://vercel.com/johns-projects-ebcf5697/saas-starter/settings/environment-variables', '_blank')}
                  variant="default"
                >
                  Open Vercel Settings
                </Button>
                <Button onClick={reset} variant="outline">
                  Try Again
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h3 className="font-semibold text-red-900 mb-2">Error Details</h3>
                <p className="text-sm text-red-800 font-mono break-all">
                  {error.message || 'Unknown error occurred'}
                </p>
                {error.digest && (
                  <p className="text-xs text-red-600 mt-2">
                    Error ID: {error.digest}
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                <Button onClick={reset} variant="default">
                  Try Again
                </Button>
                <Button
                  onClick={() => window.location.href = '/dashboard'}
                  variant="outline"
                >
                  Go to Dashboard
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

