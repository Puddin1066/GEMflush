# Stripe Pricing Setup Guide

## Problem: "Price Unavailable" on Pricing Page

If you see "Price Unavailable" on the submit buttons, it means Stripe products and prices haven't been created yet.

## Quick Setup

### Option 1: Automated Setup via Stripe API (Recommended)

Run the setup script using the Stripe API:

```bash
pnpm setup:stripe
```

**Requirements:**
- `STRIPE_SECRET_KEY` must be set in your `.env` file
- Works with both test (`sk_test_...`) and live (`sk_live_...`) keys

### Option 1b: Automated Setup via Stripe CLI

If you prefer using the Stripe CLI:

```bash
pnpm setup:stripe --cli
```

**Requirements:**
- Stripe CLI installed: https://stripe.com/docs/stripe-cli
- Run `stripe login` first to authenticate
- Automatically uses your default Stripe account

This will:
- Create "Pro" product with $49/month price
- Create "Agency" product with $149/month price
- Print the price IDs to add to your `.env` file

### Option 2: Manual Setup via Stripe Dashboard

1. **Go to Stripe Dashboard** → Products
2. **Create Pro Product:**
   - Name: `Pro` (must contain "pro" - case insensitive)
   - Description: `Wikidata Publisher + Premium Features`
   - Price: $49.00/month
   - Trial period: 14 days (optional)

3. **Create Agency Product:**
   - Name: `Agency` (must contain "agency" - case insensitive)
   - Description: `For marketing agencies and consultants`
   - Price: $149.00/month
   - Trial period: 14 days (optional)

### Option 3: Manual Setup via Stripe CLI

```bash
# Create Pro product
stripe products create \
  --name="Pro" \
  --description="Wikidata Publisher + Premium Features"

# Create Pro price (replace prod_xxx with product ID from above)
stripe prices create \
  --product=prod_xxx \
  --unit-amount=4900 \
  --currency=usd \
  --recurring[interval]=month \
  --recurring[trial_period_days]=14

# Create Agency product
stripe products create \
  --name="Agency" \
  --description="For marketing agencies and consultants"

# Create Agency price (replace prod_xxx with product ID from above)
stripe prices create \
  --product=prod_xxx \
  --unit-amount=14900 \
  --currency=usd \
  --recurring[interval]=month \
  --recurring[trial_period_days]=14
```

## How It Works

The pricing page (`app/(dashboard)/pricing/page.tsx`) automatically:

1. Fetches all active Stripe products and prices
2. Searches for products with "pro" or "agency" in the name (case-insensitive)
3. Matches prices to those products
4. Enables buttons when prices are found

**Important:** Product names must contain:
- `"pro"` (for Pro plan) - e.g., "Pro", "PRO Plan", "GEMflush Pro"
- `"agency"` (for Agency plan) - e.g., "Agency", "Agency Plan", "GEMflush Agency"

## Environment Variables (Optional)

While not required (products are found by name), you can optionally set:

```env
STRIPE_PRO_PRICE_ID=price_xxxxx
STRIPE_AGENCY_PRICE_ID=price_xxxxx
```

These are used in:
- `lib/gemflush/plans.ts` - Plan configuration
- Direct price ID references (if needed)

## Verification

After setup, verify it works:

1. Visit `/pricing` page
2. Check that buttons show "Get Started" or "Upgrade to Pro" (not "Price Unavailable")
3. Check browser console for any errors
4. Check server logs for Stripe API errors

## Troubleshooting

### Still seeing "Price Unavailable"?

1. **Check Stripe API Key:**
   ```bash
   echo $STRIPE_SECRET_KEY
   ```
   Make sure it's set and valid.

2. **Check Product Names:**
   - Products must have "pro" or "agency" in the name
   - Names are case-insensitive
   - Check in Stripe Dashboard → Products

3. **Check Products are Active:**
   - Products must be marked as "Active" in Stripe
   - Prices must be active and recurring

4. **Check Server Logs:**
   ```bash
   # Look for errors when loading /pricing
   pnpm dev
   ```

5. **Test Stripe Connection:**
   ```bash
   # In Node.js REPL or script
   const { stripe } = require('./lib/payments/stripe');
   const products = await stripe.products.list({ limit: 10 });
   console.log(products.data.map(p => p.name));
   ```

### Products exist but not found?

- Ensure product names contain "pro" or "agency" (case-insensitive)
- Check that products are active
- Verify Stripe API key has read permissions

### Need to update prices?

1. Create new price in Stripe Dashboard
2. Set old price to inactive (optional)
3. The pricing page will automatically use the new active price

## Testing

For local development, use Stripe test mode:

1. Get test API key from Stripe Dashboard → Developers → API keys
2. Set `STRIPE_SECRET_KEY=sk_test_...` in `.env`
3. Run setup script (it will create test products)
4. Use test card numbers from Stripe docs

## Production Checklist

- [ ] Products created in Stripe (Production mode)
- [ ] Prices configured correctly
- [ ] Trial periods set (if desired)
- [ ] Webhook endpoint configured (`/api/stripe/webhook`)
- [ ] Environment variables set in production
- [ ] Test checkout flow end-to-end
- [ ] Verify subscription updates work

