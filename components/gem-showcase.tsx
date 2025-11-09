/**
 * GEMflush Design System Showcase
 * 
 * This component demonstrates all gem-inspired styling options.
 * Use as reference or temporarily add to a page to preview styles.
 */

import React from 'react';
import {
  GemIcon,
  GemClusterIcon,
  GemShardIcon,
  HexGemIcon,
  WikidataRubyIcon,
  GemflushLogo,
  GemBadge,
  GemCard,
} from '@/components/ui/gem-icon';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function GemShowcase() {
  return (
    <div className="space-y-12 p-8 max-w-7xl mx-auto">
      {/* Hero Section */}
      <section className="text-center space-y-4 py-12">
        <GemflushLogo size={64} showText={false} className="mx-auto mb-4" />
        <h1 className="text-6xl font-bold gem-text-shimmer">
          GEMflush
        </h1>
        <p className="text-xl text-muted-foreground">
          Knowledge Graph as a Service
        </p>
      </section>

      {/* Gem Icons */}
      <section className="space-y-6">
        <h2 className="text-3xl font-bold">Gem Icons</h2>
        
        <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
          <div className="flex flex-col items-center gap-2">
            <GemIcon size={48} />
            <span className="text-sm text-muted-foreground">Default</span>
          </div>
          
          <div className="flex flex-col items-center gap-2">
            <GemIcon size={48} variant="faceted" />
            <span className="text-sm text-muted-foreground">Faceted</span>
          </div>
          
          <div className="flex flex-col items-center gap-2">
            <GemIcon size={48} variant="outline" />
            <span className="text-sm text-muted-foreground">Outline</span>
          </div>
          
          <div className="flex flex-col items-center gap-2">
            <GemIcon size={48} variant="sparkle" />
            <span className="text-sm text-muted-foreground">Sparkle</span>
          </div>
          
          <div className="flex flex-col items-center gap-2">
            <GemClusterIcon size={48} />
            <span className="text-sm text-muted-foreground">Cluster</span>
          </div>
          
          <div className="flex flex-col items-center gap-2">
            <GemShardIcon size={48} />
            <span className="text-sm text-muted-foreground">Shard</span>
          </div>
          
          <div className="flex flex-col items-center gap-2">
            <HexGemIcon size={48} />
            <span className="text-sm text-muted-foreground">Hexagonal</span>
          </div>
          
          <div className="flex flex-col items-center gap-2">
            <WikidataRubyIcon size={48} />
            <span className="text-sm text-muted-foreground">Ruby</span>
          </div>
          
          <div className="flex flex-col items-center gap-2">
            <GemIcon size={48} className="gem-glow-strong" />
            <span className="text-sm text-muted-foreground">Strong Glow</span>
          </div>
          
          <div className="flex flex-col items-center gap-2">
            <GemflushLogo size={32} />
            <span className="text-sm text-muted-foreground">Full Logo</span>
          </div>
        </div>
      </section>

      {/* Gem Gradients */}
      <section className="space-y-6">
        <h2 className="text-3xl font-bold">Gem Gradients</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="gem-gradient p-8 rounded-lg text-white text-center">
            <h3 className="font-bold text-lg mb-2">gem-gradient</h3>
            <p className="text-sm opacity-90">Primary violet gem gradient</p>
          </div>
          
          <div className="gem-gradient-shine p-8 rounded-lg text-white text-center">
            <h3 className="font-bold text-lg mb-2">gem-gradient-shine</h3>
            <p className="text-sm opacity-90">With light reflection</p>
          </div>
          
          <div className="gem-faceted p-8 rounded-lg text-white text-center">
            <h3 className="font-bold text-lg mb-2">gem-faceted</h3>
            <p className="text-sm opacity-90">Multi-faceted diamond</p>
          </div>
          
          <div className="gem-ruby p-8 rounded-lg text-white text-center">
            <h3 className="font-bold text-lg mb-2">gem-ruby</h3>
            <p className="text-sm opacity-90">Wikidata red accent</p>
          </div>
          
          <div className="gem-sparkle gem-gradient p-8 rounded-lg text-white text-center relative">
            <h3 className="font-bold text-lg mb-2 relative z-10">gem-sparkle</h3>
            <p className="text-sm opacity-90 relative z-10">Animated light sweep</p>
          </div>
          
          <div className="gem-border p-8 rounded-lg text-center">
            <h3 className="font-bold text-lg mb-2">gem-border</h3>
            <p className="text-sm text-muted-foreground">Faceted border gradient</p>
          </div>
        </div>
      </section>

      {/* Gem Text Effects */}
      <section className="space-y-6">
        <h2 className="text-3xl font-bold">Gem Text Effects</h2>
        
        <div className="space-y-4">
          <div>
            <h3 className="text-5xl font-bold gem-text">
              Premium Features
            </h3>
            <p className="text-sm text-muted-foreground mt-2">Using: gem-text</p>
          </div>
          
          <div>
            <h3 className="text-5xl font-bold gem-text-shimmer">
              Knowledge Graphs Simplified
            </h3>
            <p className="text-sm text-muted-foreground mt-2">Using: gem-text-shimmer (animated)</p>
          </div>
        </div>
      </section>

      {/* Gem Badges */}
      <section className="space-y-6">
        <h2 className="text-3xl font-bold">Gem Badges</h2>
        
        <div className="flex flex-wrap gap-4">
          <GemBadge>Premium</GemBadge>
          <GemBadge>Pro Tier</GemBadge>
          <GemBadge variant="ruby">Published</GemBadge>
          <GemBadge variant="ruby">Verified</GemBadge>
          <GemBadge variant="outline">Featured</GemBadge>
          <GemBadge variant="outline">Enterprise</GemBadge>
        </div>
      </section>

      {/* Gem Cards */}
      <section className="space-y-6">
        <h2 className="text-3xl font-bold">Gem Cards</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <GemCard>
            <div className="flex items-start gap-4">
              <GemIcon size={32} variant="faceted" />
              <div>
                <h3 className="font-bold text-lg mb-2">Standard Gem Card</h3>
                <p className="text-sm text-muted-foreground">
                  Subtle gradient background with gem-inspired styling
                </p>
              </div>
            </div>
          </GemCard>
          
          <GemCard sparkle={true}>
            <div className="flex items-start gap-4 relative z-10">
              <GemClusterIcon size={32} />
              <div>
                <h3 className="font-bold text-lg mb-2">Sparkle Gem Card</h3>
                <p className="text-sm text-muted-foreground">
                  Animated light sweep effect for premium features
                </p>
              </div>
            </div>
          </GemCard>
        </div>
      </section>

      {/* Business Card Examples */}
      <section className="space-y-6">
        <h2 className="text-3xl font-bold">Real-World Examples</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Example 1: Published Business */}
          <Card className="gem-card border-l-4 border-l-wikidata-accent">
            <CardHeader>
              <div className="flex items-start justify-between">
                <HexGemIcon size={32} />
                <GemBadge variant="ruby">Published</GemBadge>
              </div>
              <CardTitle className="mt-4">Acme Corporation</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Technology company with verified knowledge graph data
              </p>
              <div className="flex items-center gap-2 mt-4">
                <WikidataRubyIcon size={16} />
                <span className="text-xs wikidata-accent font-medium">Q12345</span>
              </div>
            </CardContent>
          </Card>

          {/* Example 2: Premium Feature */}
          <Card className="gem-card">
            <CardHeader>
              <div className="flex items-start justify-between">
                <GemClusterIcon size={32} />
                <GemBadge>Premium</GemBadge>
              </div>
              <CardTitle className="mt-4">AI-Powered Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Advanced entity fingerprinting and relationship detection
              </p>
              <button className="gem-gradient mt-4 px-4 py-2 rounded-md text-sm font-medium text-white w-full">
                Unlock Now
              </button>
            </CardContent>
          </Card>

          {/* Example 3: Processing */}
          <Card className="border-primary/20">
            <CardHeader>
              <div className="flex items-start justify-between">
                <GemShardIcon size={32} className="animate-pulse icon-gem" />
                <span className="text-xs text-muted-foreground">Processing...</span>
              </div>
              <CardTitle className="mt-4">TechStart Inc.</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Knowledge graph generation in progress
              </p>
              <div className="flex items-center gap-2 mt-4">
                <div className="w-2 h-2 rounded-full bg-knowledge-graph animate-pulse" />
                <span className="text-xs knowledge-graph-accent">Generating...</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* CTAs */}
      <section className="space-y-6">
        <h2 className="text-3xl font-bold">Call-to-Action Examples</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <button className="gem-gradient-shine p-6 rounded-lg text-white text-left">
            <div className="flex items-center gap-4 relative z-10">
              <GemIcon size={32} variant="sparkle" className="text-white" />
              <div>
                <h3 className="font-bold text-lg">Upgrade to Premium</h3>
                <p className="text-sm opacity-90">Unlock unlimited knowledge graphs</p>
              </div>
            </div>
          </button>
          
          <button className="gem-faceted p-6 rounded-lg text-white text-left">
            <div className="flex items-center gap-4 relative z-10">
              <WikidataRubyIcon size={32} className="text-white" />
              <div>
                <h3 className="font-bold text-lg">Publish to Wikidata</h3>
                <p className="text-sm opacity-90">Share your knowledge with the world</p>
              </div>
            </div>
          </button>
        </div>
      </section>

      {/* Status Indicators */}
      <section className="space-y-6">
        <h2 className="text-3xl font-bold">Status Indicators</h2>
        
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
            <div className="w-3 h-3 rounded-full bg-wikidata-accent" />
            <span>Published to Wikidata</span>
          </div>
          
          <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
            <div className="w-3 h-3 rounded-full bg-knowledge-graph animate-pulse" />
            <span>Processing knowledge graph</span>
          </div>
          
          <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
            <GemShardIcon size={20} className="animate-spin" />
            <span>Analyzing entity relationships</span>
          </div>
          
          <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
            <GemIcon size={20} className="gem-glow" />
            <span>Premium feature active</span>
          </div>
        </div>
      </section>

      {/* Color Combinations */}
      <section className="space-y-6">
        <h2 className="text-3xl font-bold">Strategic Color Combinations</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="gem-card border-l-4 border-l-wikidata-accent p-6">
            <div className="flex items-center gap-3 mb-3">
              <GemIcon size={24} variant="faceted" className="text-primary" />
              <WikidataRubyIcon size={20} />
            </div>
            <h3 className="font-bold text-lg mb-2">Gemflush + Wikidata Authority</h3>
            <p className="text-sm text-muted-foreground">
              Violet innovation combined with red credibility
            </p>
          </div>
          
          <div className="gem-card p-6">
            <div className="flex items-center gap-3 mb-3">
              <HexGemIcon size={24} />
              <GemClusterIcon size={24} />
            </div>
            <h3 className="font-bold text-lg mb-2">Knowledge Graph Visualization</h3>
            <p className="text-sm text-muted-foreground">
              Multiple gem styles for different entity types
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

