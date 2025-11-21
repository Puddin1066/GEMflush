"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Info, Globe, Eye, Upload } from 'lucide-react';

export function CFPProcessExplanation() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Info className="h-4 w-4" />
          How CFP Works
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>The CFP Process: Crawl → Fingerprint → Publish</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Overview */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              CFP transforms your business URL into a published Wikidata entity with comprehensive visibility metrics. 
              The process is <strong>sequential</strong> - each step requires the previous step to complete.
            </p>
          </div>

          {/* Step 1: Crawl */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold">
                  1
                </div>
                <Globe className="h-5 w-5" />
                Crawl (C)
              </CardTitle>
              <CardDescription>Extract structured data from your website</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-sm">
                <p className="font-medium mb-2">What happens:</p>
                <ul className="list-disc list-inside space-y-1 text-gray-600 ml-2">
                  <li>Fetches HTML from your business URL</li>
                  <li>Extracts structured data (JSON-LD, meta tags, OpenGraph)</li>
                  <li>Makes 1 LLM API call to enhance extraction (~1-2s)</li>
                  <li>Validates and stores <code className="bg-gray-100 px-1 rounded">crawlData</code> in database</li>
                </ul>
              </div>
              <div className="mt-3 p-3 bg-gray-50 rounded">
                <p className="text-xs font-medium mb-1">Output:</p>
                <p className="text-xs text-gray-600">
                  <code className="bg-gray-100 px-1 rounded">crawlData</code> containing description, services, 
                  industry, certifications, awards, contact info, and more
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Step 2: Fingerprint */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-green-100 text-green-700 font-bold">
                  2
                </div>
                <Eye className="h-5 w-5" />
                Fingerprint (F)
              </CardTitle>
              <CardDescription>Measure visibility across multiple LLMs</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-sm">
                <p className="font-medium mb-2">What happens:</p>
                <ul className="list-disc list-inside space-y-1 text-gray-600 ml-2">
                  <li>Generates 3 customer-query-style prompts (factual, opinion, recommendation)</li>
                  <li>Queries 3 LLM models (GPT-4 Turbo, Claude 3 Opus, Gemini Pro) with each prompt</li>
                  <li>Executes 9 queries total in parallel (~3-5s)</li>
                  <li>Analyzes each response for mentions, sentiment, ranking, and competitors</li>
                </ul>
              </div>
              <div className="mt-3 p-3 bg-gray-50 rounded">
                <p className="text-xs font-medium mb-1">Output:</p>
                <p className="text-xs text-gray-600">
                  <code className="bg-gray-100 px-1 rounded">FingerprintAnalysis</code> with visibility score (0-100), 
                  mention rate, sentiment, accuracy, ranking position, and competitive leaderboard
                </p>
              </div>
              <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded">
                <p className="text-xs font-medium text-amber-900 mb-1">⚠️ Requires crawlData</p>
                <p className="text-xs text-amber-800">
                  Since input is only a URL, fingerprinting needs <code className="bg-amber-100 px-1 rounded">crawlData</code> 
                  to provide business context (description, services, industry) to LLMs for effective prompts.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Step 3: Publish */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-purple-100 text-purple-700 font-bold">
                  3
                </div>
                <Upload className="h-5 w-5" />
                Publish (P)
              </CardTitle>
              <CardDescription>Build and publish Wikidata entity</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-sm">
                <p className="font-medium mb-2">What happens:</p>
                <ul className="list-disc list-inside space-y-1 text-gray-600 ml-2">
                  <li>Builds Wikidata entity using tiered-entity-builder</li>
                  <li>Validates entity against Wikidata notability requirements</li>
                  <li>Publishes to test.wikidata.org (or production if approved)</li>
                  <li>Stores <code className="bg-gray-100 px-1 rounded">wikidataQID</code> and publication date</li>
                </ul>
              </div>
              <div className="mt-3 p-3 bg-gray-50 rounded">
                <p className="text-xs font-medium mb-1">Output:</p>
                <p className="text-xs text-gray-600">
                  Published Wikidata entity with QID (e.g., <code className="bg-gray-100 px-1 rounded">Q123456</code>)
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Why Sequential */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-semibold mb-2">Why Sequential?</h3>
            <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside">
              <li><strong>Crawl → Fingerprint:</strong> Fingerprinting requires <code className="bg-gray-100 px-1 rounded">crawlData</code> to generate effective prompts</li>
              <li><strong>Fingerprint → Publish:</strong> Publishing can use fingerprint data for richer entity building</li>
              <li>Each step builds on the previous, ensuring data quality and accuracy</li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}


