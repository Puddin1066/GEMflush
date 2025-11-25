# Payments Module (`lib/payments/`)

**Purpose**: Stripe integration for subscription management and payments  
**Status**: 🟢 Active  
**TDD Philosophy**: Tests ARE specifications - write tests first, then implement to satisfy them

---

## 📚 Overview

The `payments/` module provides complete Stripe integration for subscription management, checkout sessions, webhook handling, and subscription upgrades/downgrades. It implements the `IPaymentService` contract for type-safe payment operations.

### Architecture Principles

1. **Stripe Integration**: Full Stripe API integration with latest version
2. **Type Safety**: Full TypeScript coverage with contracts
3. **Webhook Security**: Secure webhook signature verification
4. **Subscription Management**: Complete subscription lifecycle management
5. **Error Handling**: Graceful error handling and user feedback

---

## 🏗️ Module Structure

```
lib/payments/
├── stripe.ts              # Main Stripe client and service implementation
├── actions.ts             # Server actions for payment operations
├── types.ts               # Payment-related types and DTOs
├── gemflush-products.ts   # Product and price definitions
├── setup-products.ts      # Product setup utilities
└── __tests__/            # TDD test specifications
```

---

## 🔑 Core Components

### 1. Stripe Client (`stripe.ts`)

**Purpose**: Main Stripe service implementation

**Key Functions:**

```typescript
// Checkout session creation
export async function createCheckoutSession({
  team,
  priceId
}: CreateCheckoutSessionInput): Promise<{ url: string }>

// Subscription management
export async function updateTeamSubscription({
  teamId,
  subscriptionId,
  priceId
}: UpdateTeamSubscriptionInput): Promise<Team>

// Webhook handling
export async function handleStripeWebhook(
  req: Request
): Promise<{ received: boolean }>

// Customer portal
export async function createCustomerPortalSession(
  teamId: number
): Promise<{ url: string }>
```

**Usage:**

```typescript
import { createCheckoutSession } from '@/lib/payments/stripe';

// Create checkout session
const { url } = await createCheckoutSession({
  team: currentTeam,
  priceId: 'price_1234567890',
});

// Redirect to Stripe checkout
redirect(url);
```

---

### 2. Payment Actions (`actions.ts`)

**Purpose**: Server actions for payment operations

**Key Actions:**

```typescript
// Create checkout session action
export async function createCheckoutSessionAction(
  prevState: ActionState,
  formData: FormData
): Promise<ActionState>

// Handle subscription update action
export async function updateSubscriptionAction(
  prevState: ActionState,
  formData: FormData
): Promise<ActionState>
```

**Usage:**

```typescript
'use client';

import { createCheckoutSessionAction } from '@/lib/payments/actions';
import { useFormState } from 'react-dom';

function UpgradeButton() {
  const [state, formAction] = useFormState(createCheckoutSessionAction, null);
  
  return (
    <form action={formAction}>
      <input type="hidden" name="priceId" value="price_123" />
      <button type="submit">Upgrade to Pro</button>
    </form>
  );
}
```

---

### 3. Product Definitions (`gemflush-products.ts`)

**Purpose**: Product and price definitions for the platform

**Key Types:**

```typescript
export interface GemflushProduct {
  id: string;
  name: string;
  description: string;
  prices: {
    monthly: string;  // Stripe price ID
    yearly: string;   // Stripe price ID
  };
}

export const GEMFLUSH_PRODUCTS: Record<string, GemflushProduct> = {
  free: { /* ... */ },
  pro: { /* ... */ },
  enterprise: { /* ... */ },
};
```

---

### 4. Payment Types (`types.ts`)

**Purpose**: TypeScript types for payment operations

**Key Types:**

```typescript
export interface CreateCheckoutSessionInput {
  team: Team;
  priceId: string;
}

export interface UpdateTeamSubscriptionInput {
  teamId: number;
  subscriptionId: string;
  priceId: string;
}

export interface StripePriceDTO {
  id: string;
  amount: number;
  currency: string;
  interval: 'month' | 'year';
}
```

---

## 🔄 Payment Flow

### Checkout Flow

```
1. User clicks "Upgrade" button
   ↓
2. Create checkout session (createCheckoutSession)
   ↓
3. Redirect to Stripe Checkout
   ↓
4. User completes payment
   ↓
5. Stripe webhook (handleStripeWebhook)
   ↓
6. Update team subscription (updateTeamSubscription)
   ↓
7. Redirect to success page
```

### Webhook Flow

```
1. Stripe sends webhook event
   ↓
2. Verify webhook signature (handleStripeWebhook)
   ↓
3. Process event type:
   - checkout.session.completed
   - customer.subscription.updated
   - customer.subscription.deleted
   ↓
4. Update database (updateTeamSubscription)
   ↓
5. Return 200 OK
```

---

## 🧪 TDD Development

### Writing Tests First (Specification)

```typescript
/**
 * SPECIFICATION: Checkout Session Creation
 * 
 * As a user
 * I want to create a checkout session
 * So that I can upgrade my subscription
 * 
 * Acceptance Criteria:
 * - Checkout session is created with correct price
 * - Checkout session includes team metadata
 * - Checkout session returns redirect URL
 */
describe('Checkout Session - Specification', () => {
  it('creates checkout session with team and price', async () => {
    // SPECIFICATION: Given a team and price ID
    const team = createTestTeam({ id: 1, name: 'Test Team' });
    const priceId = 'price_1234567890';
    
    // SPECIFICATION: When checkout session is created
    const result = await createCheckoutSession({ team, priceId });
    
    // SPECIFICATION: Then session should have redirect URL
    expect(result.url).toBeDefined();
    expect(result.url).toContain('checkout.stripe.com');
  });
});
```

### Running Tests

```bash
# Watch mode (recommended for TDD)
pnpm tdd

# Run specific test file
pnpm test lib/payments/__tests__/stripe.test.ts

# With coverage
pnpm test:coverage lib/payments/
```

---

## ⚙️ Configuration

### Environment Variables

**Required:**
- `STRIPE_SECRET_KEY`: Stripe secret key (get from Stripe Dashboard)
- `STRIPE_WEBHOOK_SECRET`: Webhook signing secret (for webhook verification)
- `BASE_URL`: Base URL for redirects (e.g., `https://yourdomain.com`)

**Optional:**
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`: Stripe publishable key (for client-side)

### Stripe Setup

1. **Create Stripe Account**: https://stripe.com
2. **Get API Keys**: Dashboard → Developers → API keys
3. **Create Products**: Dashboard → Products
4. **Set Up Webhooks**: Dashboard → Developers → Webhooks
5. **Configure Environment Variables**: Add keys to `.env.local`

---

## 🔒 Security Considerations

### Webhook Security

Webhooks must verify Stripe signatures:

```typescript
import { stripe } from '@/lib/payments/stripe';

const signature = headers.get('stripe-signature');
const event = stripe.webhooks.constructEvent(
  body,
  signature!,
  process.env.STRIPE_WEBHOOK_SECRET!
);
```

### API Key Security

- **Never expose secret keys** in client-side code
- **Use environment variables** for all keys
- **Rotate keys** periodically in production
- **Use test keys** in development

---

## 📋 Usage Examples

### Create Checkout Session

```typescript
// app/api/checkout/route.ts
import { createCheckoutSession } from '@/lib/payments/stripe';
import { getTeamForUser } from '@/lib/db/queries';
import { getSession } from '@/lib/auth/session';

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const team = await getTeamForUser(session.user.id);
  const { priceId } = await request.json();
  
  const { url } = await createCheckoutSession({ team, priceId });
  return Response.json({ url });
}
```

### Handle Webhook

```typescript
// app/api/webhooks/stripe/route.ts
import { handleStripeWebhook } from '@/lib/payments/stripe';

export async function POST(request: Request) {
  try {
    const body = await request.text();
    const result = await handleStripeWebhook(
      new Request(request.url, {
        method: 'POST',
        headers: request.headers,
        body,
      })
    );
    return Response.json(result);
  } catch (error) {
    return Response.json(
      { error: 'Webhook handling failed' },
      { status: 400 }
    );
  }
}
```

### Customer Portal

```typescript
// app/api/customer-portal/route.ts
import { createCustomerPortalSession } from '@/lib/payments/stripe';
import { getSession } from '@/lib/auth/session';

export async function POST() {
  const session = await getSession();
  if (!session) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const { url } = await createCustomerPortalSession(session.user.teamId);
  return Response.json({ url });
}
```

---

## 🔗 Related Documentation

- **Main Library README**: `lib/README.md`
- **Stripe Documentation**: https://stripe.com/docs
- **Subscription Module**: `lib/subscription/`
- **TDD Strategy**: `docs/development/TDD_STRATEGY.md`

---

## 🎓 Key Principles

1. **Stripe Integration**: Full Stripe API integration
2. **Type Safety**: Full TypeScript coverage with contracts
3. **Webhook Security**: Secure webhook signature verification
4. **Subscription Management**: Complete subscription lifecycle
5. **Error Handling**: Graceful error handling
6. **TDD Development**: Write tests first as specifications
7. **SOLID Principles**: Single responsibility, clear separation

---

## ⚠️ Important Notes

### Test Mode

- Use Stripe test keys in development
- Test webhooks with Stripe CLI: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`

### Webhook Events

Handle these webhook events:
- `checkout.session.completed` - Payment successful
- `customer.subscription.updated` - Subscription changed
- `customer.subscription.deleted` - Subscription cancelled

### Error Handling

Always handle Stripe errors gracefully:

```typescript
try {
  const session = await createCheckoutSession({ team, priceId });
} catch (error) {
  if (error instanceof Stripe.errors.StripeError) {
    // Handle Stripe-specific errors
  }
}
```

---

**Remember**: Payment processing is critical infrastructure. Always write tests first, verify webhook signatures, and handle errors gracefully.



