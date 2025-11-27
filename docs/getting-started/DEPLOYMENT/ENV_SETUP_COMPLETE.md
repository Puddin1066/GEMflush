# Environment Variables Setup - Status

## ✅ Successfully Set

The following environment variables have been set in Vercel for Production, Preview, and Development:

- ✅ `DATABASE_URL` - Set (using POSTGRES_URL value)
- ✅ `POSTGRES_URL` - Already set
- ✅ `AUTH_SECRET` - Set
- ✅ `STRIPE_SECRET_KEY` - Set
- ✅ `STRIPE_WEBHOOK_SECRET` - Set
- ✅ `NEXT_PUBLIC_APP_URL` - Set (using BASE_URL value)

## ⚠️ Still Need to Set

### NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY

This is the only required variable still missing. To set it:

1. **Get the value from Stripe Dashboard:**
   - Go to: https://dashboard.stripe.com/apikeys
   - Copy the "Publishable key" (starts with `pk_test_` or `pk_live_`)

2. **Set in Vercel:**
   ```bash
   # Set for all environments
   vercel env add NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY production
   # Paste: pk_test_... or pk_live_...
   
   vercel env add NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY preview
   # Paste: pk_test_... or pk_live_...
   
   vercel env add NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY development
   # Paste: pk_test_... or pk_live_...
   ```

   Or use the interactive script:
   ```bash
   pnpm tsx scripts/set-vercel-env-quick.ts
   ```

## Verification

After setting `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, verify all variables are set:

```bash
pnpm tsx scripts/check-and-set-env.ts
```

Should show: ✅ All required environment variables are set!

## Next Steps

1. Set `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (see above)
2. Redeploy: `vercel --prod`
3. Test health check: `curl https://your-app.vercel.app/api/health`
4. Test environment validation: Check deployment logs for validation errors

## Optional Variables (Set When Needed)

- `SENTRY_DSN` - For error tracking (get from https://sentry.io)
- `WIKIDATA_PUBLISH_MODE=production` - For production Wikidata publishing
- `WIKIDATA_BOT_USERNAME` - Wikidata bot username
- `WIKIDATA_BOT_PASSWORD` - Wikidata bot password


