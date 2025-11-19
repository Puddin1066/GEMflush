/**
 * Pricing Page
 * Displays pricing tiers and subscription options
 * 
 * Enhanced with new TierBadge component while maintaining structure
 */

import { checkoutAction } from '@/lib/payments/actions';
import { Check, X, Sparkles, Users } from 'lucide-react';
import { getStripePrices, getStripeProducts } from '@/lib/payments/stripe';
import { SubmitButton } from './submit-button';
import { GemIcon, WikidataRubyIcon } from '@/components/ui/gem-icon';
import { TierBadge } from '@/components/subscription/tier-badge';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { getUser, getTeamForUser } from '@/lib/db/queries';
import { redirect } from 'next/navigation';

// Prices are fresh for one hour max
export const revalidate = 3600;

export default async function PricingPage() {
  const user = await getUser();
  const team = await getTeamForUser();
  
  const [prices, products] = await Promise.all([
    getStripePrices(),
    getStripeProducts(),
  ]);

  // Match products by name to GEMflush plans
  const proProduct = products.find((product) => product.name?.toLowerCase() === 'pro') ||
    products.find((product) => product.name?.toLowerCase() === 'pro plan') ||
    products.find((product) => {
      const name = product.name?.toLowerCase() || '';
      return name.includes('pro') && !name.includes('myproduct');
    });
  
  const agencyProduct = products.find((product) => product.name?.toLowerCase() === 'agency') ||
    products.find((product) => product.name?.toLowerCase() === 'agency plan') ||
    products.find((product) => product.name?.toLowerCase().includes('agency'));

  const proPrice = proProduct ? prices.find((price) => price.productId === proProduct.id) : null;
  const agencyPrice = agencyProduct ? prices.find((price) => price.productId === agencyProduct.id) : null;

  const currentPlan = team?.planName || 'free';
  const isPro = currentPlan === 'pro' || currentPlan === 'agency';
  const hasPrices = proPrice || agencyPrice;
  const missingPrices = !hasPrices && process.env.NODE_ENV === 'development';

  return (
    <main className="py-12">
      {/* Current Plan Banner - Enhanced with TierBadge */}
      {isPro && user && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-8">
          <div className="gem-card p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Current Plan</p>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-lg font-semibold">
                  {currentPlan === 'pro' ? 'Pro Plan' : 'Agency Plan'}
                </p>
                <TierBadge tier={currentPlan as 'pro' | 'agency'} />
              </div>
            </div>
            <Link href="/dashboard/settings/billing">
              <Button variant="outline">Manage Subscription</Button>
            </Link>
          </div>
        </section>
      )}

      {/* Header */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-16 text-center">
        <h1 className="text-5xl font-bold text-gray-900 mb-4">
          Plans That Scale With <span className="gem-text-shimmer">Your Ambition</span>
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          Start free, upgrade when you're ready. All plans include AI fingerprinting.
        </p>
        
        {/* Setup Notice (Development Only) */}
        {missingPrices && (
          <div className="mt-8 max-w-2xl mx-auto">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-left">
              <h3 className="font-semibold text-amber-900 mb-2">⚠️ Stripe Products Not Found</h3>
              <p className="text-sm text-amber-800 mb-3">
                To enable pricing, create Stripe products named "Pro" and "Agency" with active prices.
              </p>
              <div className="text-sm text-amber-700 space-y-1">
                <p><strong>Quick setup:</strong></p>
                <code className="block bg-amber-100 p-2 rounded mt-2 font-mono text-xs">
                  pnpm setup:stripe
                </code>
                <p className="mt-2">
                  Or see <code className="bg-amber-100 px-1 rounded">STRIPE_PRICING_SETUP.md</code> for manual setup.
                </p>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Pricing Cards - Enhanced with TierBadge */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-3 gap-8">
          {/* Free Tier */}
          <div className={`border-2 rounded-lg p-8 bg-white hover:shadow-lg transition-shadow ${
            currentPlan === 'free' ? 'border-primary' : 'border-gray-200'
          }`}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <GemIcon size={24} variant="outline" />
                <h2 className="text-2xl font-bold text-gray-900">Free</h2>
              </div>
              {currentPlan === 'free' && (
                <TierBadge tier="free" />
              )}
            </div>
            <div className="mb-6">
              <span className="text-xs uppercase font-semibold text-gray-500 tracking-wide">Perfect for Testing</span>
            </div>
            <div className="mb-8">
              <div className="flex items-baseline gap-2">
                <span className="text-5xl font-bold text-gray-900">$0</span>
                <span className="text-gray-600">/month</span>
              </div>
              <p className="text-sm text-gray-500 mt-2">No credit card required</p>
            </div>

            <ul className="space-y-3 mb-8">
              <li className="flex items-start gap-3">
                <Check className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700">1 business</span>
              </li>
              <li className="flex items-start gap-3">
                <Check className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700">Monthly LLM fingerprints</span>
              </li>
              <li className="flex items-start gap-3">
                <Check className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700">Competitive benchmarking</span>
              </li>
              <li className="flex items-start gap-3">
                <Check className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700">Basic sentiment analysis</span>
              </li>
              <li className="flex items-start gap-3">
                <X className="h-5 w-5 text-gray-300 flex-shrink-0 mt-0.5" />
                <span className="text-gray-400">Wikidata publishing</span>
              </li>
            </ul>

            <Link href="/sign-up">
              <Button className="w-full" variant="outline">
                Start Free
              </Button>
            </Link>
          </div>

          {/* Pro Tier - Most Popular */}
          <div className={`border-2 rounded-lg p-8 bg-white relative hover:shadow-xl transition-shadow gem-card ${
            currentPlan === 'pro' ? 'border-primary ring-2 ring-primary/20' : 'border-primary'
          }`}>
            <div className="absolute -top-4 left-1/2 -translate-x-1/2">
              <div className="gem-badge flex items-center gap-1.5">
                <Sparkles className="h-3 w-3" />
                <span>MOST POPULAR</span>
              </div>
            </div>

            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <WikidataRubyIcon size={24} />
                <h2 className="text-2xl font-bold text-gray-900">Pro</h2>
              </div>
              {currentPlan === 'pro' && (
                <TierBadge tier="pro" />
              )}
            </div>
            <div className="mb-6">
              <span className="text-xs uppercase font-semibold text-primary tracking-wide">For Serious Businesses</span>
            </div>
            <div className="mb-8">
              <div className="flex items-baseline gap-2">
                <span className="text-5xl font-bold gem-text">$49</span>
                <span className="text-gray-600">/month</span>
              </div>
              <p className="text-sm text-gray-500 mt-2">Billed monthly or annually</p>
            </div>

            <ul className="space-y-3 mb-8">
              <li className="flex items-start gap-3">
                <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <span className="text-gray-900 font-medium">Everything in Free, PLUS:</span>
              </li>
              <li className="flex items-start gap-3">
                <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <span className="text-gray-700"><strong>Wikidata entity publishing</strong></span>
              </li>
              <li className="flex items-start gap-3">
                <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <span className="text-gray-700">Up to 5 businesses</span>
              </li>
              <li className="flex items-start gap-3">
                <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <span className="text-gray-700">Weekly fingerprints</span>
              </li>
              <li className="flex items-start gap-3">
                <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <span className="text-gray-700">Historical trend tracking</span>
              </li>
              <li className="flex items-start gap-3">
                <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <span className="text-gray-700">Progressive enrichment</span>
              </li>
            </ul>

            {currentPlan === 'pro' ? (
              <Button className="w-full" variant="outline" disabled>
                Current Plan
              </Button>
            ) : (
              <form action={checkoutAction}>
                <input type="hidden" name="priceId" value={proPrice?.id || ''} />
                <SubmitButton 
                  className="w-full gem-gradient text-white hover:opacity-90"
                  disabled={!proPrice?.id}
                >
                  {proPrice?.id ? (currentPlan === 'free' ? 'Upgrade to Pro' : 'Switch to Pro') : 'Price Unavailable'}
                </SubmitButton>
              </form>
            )}
          </div>

          {/* Agency Tier */}
          <div className={`border-2 rounded-lg p-8 bg-white hover:shadow-lg transition-shadow ${
            currentPlan === 'agency' ? 'border-primary ring-2 ring-primary/20' : 'border-gray-200'
          }`}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Users className="h-6 w-6 text-primary" />
                <h2 className="text-2xl font-bold text-gray-900">Agency</h2>
              </div>
              {currentPlan === 'agency' && (
                <TierBadge tier="agency" />
              )}
            </div>
            <div className="mb-6">
              <span className="text-xs uppercase font-semibold text-gray-500 tracking-wide">For Marketing Agencies</span>
            </div>
            <div className="mb-8">
              <div className="flex items-baseline gap-2">
                <span className="text-5xl font-bold text-gray-900">$149</span>
                <span className="text-gray-600">/month</span>
              </div>
              <p className="text-sm text-gray-500 mt-2">Multi-client dashboard</p>
            </div>

            <ul className="space-y-3 mb-8">
              <li className="flex items-start gap-3">
                <Check className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                <span className="text-gray-900 font-medium">Everything in Pro, PLUS:</span>
              </li>
              <li className="flex items-start gap-3">
                <Check className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700">Up to 25 businesses</span>
              </li>
              <li className="flex items-start gap-3">
                <Check className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700">Multi-client dashboard</span>
              </li>
              <li className="flex items-start gap-3">
                <Check className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700">API access</span>
              </li>
              <li className="flex items-start gap-3">
                <Check className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700">Priority support</span>
              </li>
              <li className="flex items-start gap-3">
                <Check className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700">White-label reports</span>
              </li>
            </ul>

            {currentPlan === 'agency' ? (
              <Button className="w-full" variant="outline" disabled>
                Current Plan
              </Button>
            ) : (
              <form action={checkoutAction}>
                <input type="hidden" name="priceId" value={agencyPrice?.id || ''} />
                <SubmitButton 
                  className="w-full" 
                  variant="outline"
                  disabled={!agencyPrice?.id}
                >
                  {agencyPrice?.id ? (currentPlan === 'free' ? 'Upgrade to Agency' : 'Upgrade to Agency') : 'Price Unavailable'}
                </SubmitButton>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 mt-24">
        <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">
          Frequently Asked Questions
        </h2>
        
        <div className="space-y-8">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              What is Wikidata and why does it matter?
            </h3>
            <p className="text-gray-600">
              Wikidata is the knowledge base that powers AI systems like ChatGPT, Claude, and Perplexity. When your business is published to Wikidata with verified information, these AI systems can accurately recommend you to users asking for business suggestions.
            </p>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              How do LLM fingerprints work?
            </h3>
            <p className="text-gray-600">
              We test your business visibility by asking 5 major AI systems (ChatGPT, Claude, Perplexity, Gemini, and Meta AI) questions about businesses in your category and location. We then measure how often you're mentioned, the sentiment of those mentions, and how you compare to competitors.
            </p>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Can I upgrade or downgrade anytime?
            </h3>
            <p className="text-gray-600">
              Yes! You can upgrade, downgrade, or cancel your subscription at any time. Changes take effect at the start of your next billing cycle, and you'll never lose access to your data.
            </p>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Do you offer refunds?
            </h3>
            <p className="text-gray-600">
              We offer a 30-day money-back guarantee for all paid plans. If you're not satisfied within the first 30 days, we'll provide a full refund, no questions asked.
            </p>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              How long does it take to see results?
            </h3>
            <p className="text-gray-600">
              Most businesses see improved AI visibility within 2-4 weeks of publishing to Wikidata. The free tier lets you track your baseline, while Pro tier members can actively improve their visibility through Wikidata publishing and entity enrichment.
            </p>
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 mt-24 mb-12 text-center">
        <div className="gem-card p-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Ready to get started?
          </h2>
          <p className="text-lg text-gray-600 mb-8">
            Join 500+ businesses improving their AI visibility
          </p>
          <Link href="/sign-up">
            <Button size="lg" className="gem-gradient text-white px-8 py-4 text-lg">
              <Sparkles className="mr-2 h-5 w-5" />
              Start Free Today
            </Button>
          </Link>
        </div>
      </section>
    </main>
  );
}
