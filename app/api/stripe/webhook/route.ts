import Stripe from 'stripe';
import { handleSubscriptionChange, stripe } from '@/lib/payments/stripe';
import { NextRequest, NextResponse } from 'next/server';

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(request: NextRequest) {
  const payload = await request.text();
  const signature = request.headers.get('stripe-signature') as string;

  let event: Stripe.Event;

  // Allow bypassing signature verification in test/development mode for e2e tests
  // In production, signature verification is always required
  const isTestOrDev = process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'development';
  const bypassSignature = isTestOrDev && signature === 'test-signature';

  if (bypassSignature) {
    // Parse event directly without signature verification (test mode only)
    event = JSON.parse(payload) as Stripe.Event;
    console.log('[TEST] Bypassing webhook signature verification for test mode');
  } else {
    // Real signature verification (production behavior)
    try {
      event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    } catch (err) {
      console.error('Webhook signature verification failed.', err);
      return NextResponse.json(
        { error: 'Webhook signature verification failed.' },
        { status: 400 }
      );
    }
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      // Handle checkout completion (RACE CONDITION: webhook may arrive before redirect)
      // SOLID: Single Responsibility - handle checkout completion
      // DRY: Reuse checkout handling logic
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.mode === 'subscription' && session.subscription) {
        // Retrieve subscription to update team
        try {
          const subscription = await stripe.subscriptions.retrieve(
            typeof session.subscription === 'string' 
              ? session.subscription 
              : session.subscription.id,
            { expand: ['items.data.price.product'] }
          );
          await handleSubscriptionChange(subscription);
        } catch (error) {
          console.error('Error handling checkout.session.completed:', error);
          // Don't fail webhook - redirect might still work
        }
      }
      break;
    }
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription;
      await handleSubscriptionChange(subscription);
      break;
    }
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  return NextResponse.json({ received: true });
}
