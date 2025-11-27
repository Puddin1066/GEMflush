# Stripe Webhook Configuration Status

## ✅ Current Configuration

**Webhook ID:** `we_1SSQEXKVjsXNguSDaiFph7WD`  
**URL:** `https://saas-starter-psi-six.vercel.app/api/stripe/webhook`  
**Status:** ✅ Enabled  
**Mode:** Test (correct for development)  
**Events:**
- ✅ `customer.subscription.updated`
- ✅ `customer.subscription.deleted`

## 📋 Environment Variables

### Local `.env` File:
```bash
STRIPE_SECRET_KEY=sk_test_YOUR_STRIPE_SECRET_KEY_HERE
STRIPE_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET_HERE
```

### Vercel Environment Variables:
- ✅ `STRIPE_SECRET_KEY` - Set for Production, Preview, Development
- ✅ `STRIPE_WEBHOOK_SECRET` - Set for Production, Preview, Development

## 🔍 Verification

### Webhook Details:
- **Created:** 2025-11-11T22:40:17Z
- **Description:** "SaaS Starter - Subscription webhooks"
- **API Version:** null (uses default)

### Required Configuration:
- ✅ URL matches Vercel deployment
- ✅ Correct events enabled
- ✅ Webhook is enabled
- ✅ Test mode (correct for development)

## 🔐 Webhook Secret

**Important:** The webhook signing secret (`whsec_...`) cannot be retrieved via API for security reasons.

**To verify the secret matches:**
1. Go to: https://dashboard.stripe.com/test/webhooks/we_1SSQEXKVjsXNguSDaiFph7WD
2. Click on "Reveal" next to "Signing secret"
3. Verify it matches: `whsec_YOUR_WEBHOOK_SECRET_HERE`

**If the secret doesn't match:**
1. Click "Reveal" to see the actual secret
2. Update `STRIPE_WEBHOOK_SECRET` in Vercel:
   ```bash
   echo "whsec_<actual_secret>" | vercel env add STRIPE_WEBHOOK_SECRET production
   ```
3. Redeploy your application

## 🧪 Testing the Webhook

### Test Webhook from Stripe Dashboard:
1. Go to: https://dashboard.stripe.com/test/webhooks/we_1SSQEXKVjsXNguSDaiFph7WD
2. Click "Send test webhook"
3. Select event type: `customer.subscription.updated`
4. Send test webhook
5. Check Vercel logs to verify it was received

### Test via API:
```bash
# List recent webhook events
curl -X GET "https://api.stripe.com/v1/events?type=customer.subscription.updated" \
  -u "sk_test_YOUR_STRIPE_SECRET_KEY_HERE:"
```

## 🔄 Updating the Webhook (If Needed)

### Update Webhook URL:
```bash
curl -X POST "https://api.stripe.com/v1/webhook_endpoints/we_1SSQEXKVjsXNguSDaiFph7WD" \
  -u "sk_test_YOUR_STRIPE_SECRET_KEY_HERE:" \
  -d "url=https://saas-starter-psi-six.vercel.app/api/stripe/webhook" \
  -d "enabled_events[]=customer.subscription.updated" \
  -d "enabled_events[]=customer.subscription.deleted"
```

### Update Webhook Events:
```bash
curl -X POST "https://api.stripe.com/v1/webhook_endpoints/we_1SSQEXKVjsXNguSDaiFph7WD" \
  -u "sk_test_YOUR_STRIPE_SECRET_KEY_HERE:" \
  -d "enabled_events[]=customer.subscription.updated" \
  -d "enabled_events[]=customer.subscription.deleted"
```

### Create New Webhook (if needed):
```bash
curl -X POST "https://api.stripe.com/v1/webhook_endpoints" \
  -u "sk_test_YOUR_STRIPE_SECRET_KEY_HERE:" \
  -d "url=https://saas-starter-psi-six.vercel.app/api/stripe/webhook" \
  -d "enabled_events[]=customer.subscription.updated" \
  -d "enabled_events[]=customer.subscription.deleted" \
  -d "description=SaaS Starter - Subscription webhooks"
```

## 📊 Webhook Event Handling

### Events Processed:
1. **customer.subscription.updated**
   - Handled in: `app/api/stripe/webhook/route.ts`
   - Updates subscription status in database
   - Updates team subscription details

2. **customer.subscription.deleted**
   - Handled in: `app/api/stripe/webhook/route.ts`
   - Marks subscription as cancelled
   - Updates team subscription status

### Webhook Handler Code:
```typescript
// app/api/stripe/webhook/route.ts
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(request: NextRequest) {
  const payload = await request.text();
  const signature = request.headers.get('stripe-signature') as string;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  } catch (err) {
    return NextResponse.json(
      { error: 'Webhook signature verification failed.' },
      { status: 400 }
    );
  }

  switch (event.type) {
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted':
      const subscription = event.data.object as Stripe.Subscription;
      await handleSubscriptionChange(subscription);
      break;
  }

  return NextResponse.json({ received: true });
}
```

## ✅ Status Summary

- ✅ Webhook endpoint configured correctly
- ✅ URL points to Vercel deployment
- ✅ Correct events enabled
- ✅ Webhook is enabled and active
- ✅ Environment variables set in Vercel
- ⚠️ Verify webhook secret matches (check Stripe dashboard)

## 🚀 Next Steps

1. **Verify Webhook Secret:**
   - Check Stripe dashboard to confirm secret matches
   - Update Vercel env var if different

2. **Test Webhook:**
   - Send test webhook from Stripe dashboard
   - Check Vercel logs for successful processing

3. **Monitor Webhook Events:**
   - Check Stripe dashboard for recent events
   - Verify events are being processed successfully

4. **Test Subscription Flow:**
   - Create a test subscription
   - Verify webhook is triggered
   - Check database is updated correctly

## 🔗 Useful Links

- **Stripe Dashboard:** https://dashboard.stripe.com/test/webhooks
- **Webhook Details:** https://dashboard.stripe.com/test/webhooks/we_1SSQEXKVjsXNguSDaiFph7WD
- **Webhook Events:** https://dashboard.stripe.com/test/events
- **Vercel Logs:** https://vercel.com/johns-projects-ebcf5697/saas-starter/logs

## 📝 Notes

- Webhook is in **test mode** (correct for development)
- When moving to production, create a new webhook in **live mode**
- Webhook secret is different for test vs live mode
- Always verify webhook signature in production

