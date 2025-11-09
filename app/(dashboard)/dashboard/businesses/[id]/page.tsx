// Business detail page

'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface Business {
  id: number;
  name: string;
  url: string;
  category: string;
  status: string;
  wikidataQID?: string;
  location?: {
    city: string;
    state: string;
    country: string;
  };
  createdAt: string;
}

interface Fingerprint {
  id: number;
  visibilityScore: number;
  mentionRate: number;
  sentimentScore: number;
  createdAt: string;
}

export default function BusinessDetailPage() {
  const params = useParams();
  const router = useRouter();
  const businessId = parseInt(params.id as string);
  
  const [business, setBusiness] = useState<Business | null>(null);
  const [latestFingerprint, setLatestFingerprint] = useState<Fingerprint | null>(null);
  const [loading, setLoading] = useState(true);
  const [crawling, setCrawling] = useState(false);
  const [fingerprinting, setFingerprinting] = useState(false);
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    loadBusiness();
  }, [businessId]);

  const loadBusiness = async () => {
    try {
      // For now, we'll need to implement a GET endpoint for single business
      // This is a simplified version
      const response = await fetch('/api/business');
      const data = await response.json();
      const businessData = data.businesses.find((b: Business) => b.id === businessId);
      
      if (businessData) {
        setBusiness(businessData);
      }
    } catch (error) {
      console.error('Error loading business:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCrawl = async () => {
    setCrawling(true);
    try {
      const response = await fetch('/api/crawl', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId }),
      });

      if (!response.ok) {
        throw new Error('Crawl failed');
      }

      // Poll for job completion
      setTimeout(() => {
        loadBusiness();
        setCrawling(false);
      }, 3000);
    } catch (error) {
      console.error('Crawl error:', error);
      setCrawling(false);
    }
  };

  const handleFingerprint = async () => {
    setFingerprinting(true);
    try {
      const response = await fetch('/api/fingerprint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId }),
      });

      if (!response.ok) {
        throw new Error('Fingerprint failed');
      }

      // Poll for job completion
      setTimeout(() => {
        loadBusiness();
        setFingerprinting(false);
      }, 5000);
    } catch (error) {
      console.error('Fingerprint error:', error);
      setFingerprinting(false);
    }
  };

  const handlePublish = async () => {
    setPublishing(true);
    try {
      const response = await fetch('/api/wikidata/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          businessId,
          publishToProduction: false, // Test Wikidata for now
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Publish failed');
      }

      alert(`Published successfully! QID: ${result.qid}`);
      loadBusiness();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Publish failed');
    } finally {
      setPublishing(false);
    }
  };

  if (loading) {
    return <div className="p-8">Loading...</div>;
  }

  if (!business) {
    return <div className="p-8">Business not found</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <h1 className="text-3xl font-bold tracking-tight">{business.name}</h1>
            <StatusBadge status={business.status} />
          </div>
          <p className="text-muted-foreground">
            {business.location?.city}, {business.location?.state}
          </p>
        </div>
        <Link href="/dashboard/businesses">
          <Button variant="outline">Back to Businesses</Button>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Website</CardTitle>
          </CardHeader>
          <CardContent>
            <a 
              href={business.url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline truncate block"
            >
              {business.url}
            </a>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Category</CardTitle>
          </CardHeader>
          <CardContent>
            {business.category || 'Not set'}
          </CardContent>
        </Card>

        {business.wikidataQID && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Wikidata QID</CardTitle>
            </CardHeader>
            <CardContent>
              <a
                href={`https://test.wikidata.org/wiki/${business.wikidataQID}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline font-mono"
              >
                {business.wikidataQID}
              </a>
            </CardContent>
          </Card>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Actions</CardTitle>
          <CardDescription>
            Manage your business data and visibility
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={handleCrawl}
              disabled={crawling}
              variant="outline"
            >
              {crawling ? 'Crawling...' : '🕷️ Crawl Website'}
            </Button>

            <Button
              onClick={handleFingerprint}
              disabled={fingerprinting}
              variant="outline"
            >
              {fingerprinting ? 'Running...' : '🔍 Run Fingerprint'}
            </Button>

            {business.status === 'crawled' || business.status === 'published' ? (
              <Button
                onClick={handlePublish}
                disabled={publishing || business.status === 'published'}
              >
                {publishing ? 'Publishing...' : '📤 Publish to Wikidata'}
              </Button>
            ) : null}
          </div>

          <p className="text-sm text-muted-foreground">
            {business.status === 'pending' && 'Start by crawling the website to extract business data.'}
            {business.status === 'crawled' && 'Website crawled! You can now publish to Wikidata or run a fingerprint.'}
            {business.status === 'published' && 'Published to Wikidata! Run fingerprints to track visibility.'}
          </p>
        </CardContent>
      </Card>

      {latestFingerprint && (
        <Card>
          <CardHeader>
            <CardTitle>Latest Visibility Score</CardTitle>
            <CardDescription>
              LLM fingerprint from {new Date(latestFingerprint.createdAt).toLocaleDateString()}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="text-4xl font-bold">{latestFingerprint.visibilityScore}/100</div>
                <div className="text-sm text-muted-foreground">Overall Visibility Score</div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="font-medium">Mention Rate</div>
                  <div>{Math.round(latestFingerprint.mentionRate * 100)}%</div>
                </div>
                <div>
                  <div className="font-medium">Sentiment Score</div>
                  <div>{Math.round(latestFingerprint.sentimentScore * 100)}%</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles = {
    pending: 'bg-gray-100 text-gray-800',
    crawling: 'bg-blue-100 text-blue-800',
    crawled: 'bg-green-100 text-green-800',
    generating: 'bg-purple-100 text-purple-800',
    published: 'bg-emerald-100 text-emerald-800',
    error: 'bg-red-100 text-red-800',
  };

  return (
    <span className={`px-2 py-1 rounded text-xs font-medium ${styles[status as keyof typeof styles] || styles.pending}`}>
      {status}
    </span>
  );
}

