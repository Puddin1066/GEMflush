import { Button } from '@/components/ui/button';
import { ArrowRight, Sparkles, CheckCircle, TrendingUp, Brain, Zap, Clock } from 'lucide-react';
import { GemIcon, GemClusterIcon, WikidataRubyIcon } from '@/components/ui/gem-icon';
import Link from 'next/link';

export default function HomePage() {
  return (
    <main>
      {/* Hero Section */}
      <section className="relative py-20 lg:py-32 overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-violet-50 via-purple-50 to-white -z-10" />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="lg:grid lg:grid-cols-12 lg:gap-12 items-center">
            <div className="lg:col-span-7">
              <div className="flex items-center gap-2 mb-6">
                <div className="gem-badge flex items-center gap-1.5">
                  <Sparkles className="h-3 w-3" />
                  <span>AI-Powered Knowledge Graphs</span>
                </div>
              </div>
              
              <h1 className="text-5xl lg:text-7xl font-bold text-gray-900 tracking-tight">
                Get Found by AI.
                <span className="block gem-text-shimmer mt-2">Not Just Google.</span>
              </h1>
              
              <p className="mt-6 text-xl lg:text-2xl text-gray-600 max-w-2xl">
                GEMflush gets your business into <span className="font-semibold text-gray-900">ChatGPT, Claude, and Perplexity</span> through automated Wikidata publishing.
              </p>
              
              <div className="mt-10 flex flex-col sm:flex-row gap-4">
                <Link href="/sign-up">
                  <Button 
                    size="lg" 
                    className="gem-gradient text-white text-lg px-8 py-6 h-auto shadow-lg hover:opacity-90 transition-opacity"
                  >
                    <Sparkles className="mr-2 h-5 w-5" />
                    Check Your AI Visibility (Free)
                  </Button>
                </Link>
                <Link href="/pricing">
                  <Button 
                    size="lg" 
                    variant="outline"
                    className="text-lg px-8 py-6 h-auto gem-border"
                  >
                    View Plans
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
              </div>
              
              <div className="mt-8 flex items-center gap-6 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-primary" />
                  <span>No credit card required</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-primary" />
                  <span>Free forever plan</span>
                </div>
              </div>
            </div>
            
            <div className="mt-12 lg:mt-0 lg:col-span-5">
              <div className="gem-card p-8 space-y-6">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-600">AI Visibility Score</span>
                  <TrendingUp className="h-5 w-5 text-green-500" />
                </div>
                <div className="text-center">
                  <div className="text-6xl font-bold gem-text">78</div>
                  <div className="text-sm text-gray-600 mt-2">Out of 100</div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">ChatGPT</span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full" style={{width: '85%'}} />
                      </div>
                      <span className="font-medium">85</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Claude</span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full" style={{width: '72%'}} />
                      </div>
                      <span className="font-medium">72</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Perplexity</span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full" style={{width: '81%'}} />
                      </div>
                      <span className="font-medium">81</span>
                    </div>
                  </div>
                </div>
                <div className="pt-4 border-t border-gray-200 text-center">
                  <span className="text-xs text-gray-500">Live example from a GEMflush customer</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Problem Agitation Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
              The AI Search Revolution Is Here
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              72% of users now ask AI for business recommendations. If you're not in Wikidata, you're invisible to LLMs.
            </p>
          </div>
          
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
                <h3 className="font-bold text-lg text-red-900 mb-2">❌ Without GEMflush</h3>
                <p className="text-red-800">Your competitors get mentioned, you don't. AI systems have incomplete or outdated information about your business.</p>
              </div>
              
              <div className="p-6 gem-card border-2 border-primary">
                <h3 className="font-bold text-lg text-gray-900 mb-2">✅ With GEMflush</h3>
                <p className="text-gray-700">You're published to Wikidata, the knowledge base behind ChatGPT, Claude, and more. Your business gets recommended automatically.</p>
              </div>
            </div>
            
            <div className="gem-card p-8">
              <p className="text-gray-700 italic mb-4">"Show me the best coffee shops in San Francisco"</p>
              <div className="space-y-4">
                <div className="p-4 bg-white rounded border-l-4 border-primary">
                  <div className="flex items-center gap-2 mb-2">
                    <WikidataRubyIcon size={20} />
                    <span className="font-semibold">Blue Bottle Coffee</span>
                    <span className="gem-badge text-xs">Published</span>
                  </div>
                  <p className="text-sm text-gray-600">Mentioned by ChatGPT, Claude, Perplexity</p>
                </div>
                <div className="p-4 bg-gray-50 rounded opacity-50">
                  <div className="font-semibold text-gray-400 mb-2">Your Coffee Shop</div>
                  <p className="text-sm text-gray-400">Not mentioned - No Wikidata entity</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
              Get AI Visibility in 4 Simple Steps
            </h2>
            <p className="text-xl text-gray-600">
              From zero to hero in the AI knowledge graph
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 rounded-full gem-gradient flex items-center justify-center text-white font-bold text-2xl">1</div>
              <div className="flex justify-center">
                <Zap className="h-12 w-12 text-primary" />
              </div>
              <h3 className="font-bold text-xl">We Crawl</h3>
              <p className="text-gray-600">We automatically extract data from your website</p>
            </div>
            
            <div className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 rounded-full gem-gradient flex items-center justify-center text-white font-bold text-2xl">2</div>
              <div className="flex justify-center">
                <WikidataRubyIcon size={48} />
              </div>
              <h3 className="font-bold text-xl">We Publish</h3>
              <p className="text-gray-600">We create your Wikidata entity with a unique QID</p>
            </div>
            
            <div className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 rounded-full gem-gradient flex items-center justify-center text-white font-bold text-2xl">3</div>
              <div className="flex justify-center">
                <Brain className="h-12 w-12 text-primary" />
              </div>
              <h3 className="font-bold text-xl">We Test</h3>
              <p className="text-gray-600">We fingerprint your visibility across 5 major LLMs</p>
            </div>
            
            <div className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 rounded-full gem-gradient flex items-center justify-center text-white font-bold text-2xl">4</div>
              <div className="flex justify-center">
                <TrendingUp className="h-12 w-12 text-primary" />
              </div>
              <h3 className="font-bold text-xl">You Track</h3>
              <p className="text-gray-600">Watch your AI visibility improve over time</p>
            </div>
          </div>
          
          <div className="mt-16 text-center">
            <Link href="/sign-up">
              <Button size="lg" className="gem-gradient text-white px-8 py-6 h-auto text-lg">
                <Clock className="mr-2 h-5 w-5" />
                Start Your Free Fingerprint (2 Minutes)
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Social Proof Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
              Real Results from Real Businesses
            </h2>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="gem-card p-8 space-y-4">
              <div className="text-4xl font-bold gem-text">340%</div>
              <p className="text-gray-600">"Increased ChatGPT mentions by 340% after publishing to Wikidata"</p>
              <div className="pt-4 border-t border-gray-200">
                <p className="font-semibold">Sample Café</p>
                <p className="text-sm text-gray-500">San Francisco, CA</p>
              </div>
            </div>
            
            <div className="gem-card p-8 space-y-4">
              <div className="text-4xl font-bold gem-text">#1</div>
              <p className="text-gray-600">"Now we're the top recommendation by Claude for auto repair in our area"</p>
              <div className="pt-4 border-t border-gray-200">
                <p className="font-semibold">Elite Auto Shop</p>
                <p className="text-sm text-gray-500">Austin, TX</p>
              </div>
            </div>
            
            <div className="gem-card p-8 space-y-4">
              <div className="text-4xl font-bold gem-text">2 weeks</div>
              <p className="text-gray-600">"Went from invisible to mentioned in Perplexity searches in just two weeks"</p>
              <div className="pt-4 border-t border-gray-200">
                <p className="font-semibold">Green Leaf Wellness</p>
                <p className="text-sm text-gray-500">Portland, OR</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-20 bg-gradient-to-br from-violet-50 to-purple-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <GemClusterIcon size={64} className="mx-auto mb-8" />
          <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
            Start Getting Found by AI Today
          </h2>
          <p className="text-xl text-gray-600 mb-10">
            Join 500+ businesses already improving their AI visibility with GEMflush
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link href="/sign-up">
              <Button size="lg" className="gem-gradient text-white px-8 py-6 h-auto text-lg">
                <Sparkles className="mr-2 h-5 w-5" />
                Get Your Free LLM Fingerprint
              </Button>
            </Link>
            <Link href="/pricing">
              <Button size="lg" variant="outline" className="px-8 py-6 h-auto text-lg">
                View Pricing
              </Button>
            </Link>
          </div>
          
          <p className="mt-8 text-sm text-gray-500">
            ✓ No credit card required  •  ✓ Free forever plan  •  ✓ Cancel anytime
          </p>
        </div>
      </section>
    </main>
  );
}
