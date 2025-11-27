#!/bin/bash
# Set Missing Environment Variables in Vercel
# 
# This script sets missing required environment variables using values from .env.vercel
# Run: vercel env pull .env.vercel first to get current values

set -e

echo "🚀 Setting Missing Environment Variables in Vercel"
echo "==================================================="
echo ""

# Check if .env.vercel exists
if [ ! -f .env.vercel ]; then
  echo "❌ .env.vercel not found. Pulling environment variables first..."
  vercel env pull .env.vercel
fi

# Extract values from .env.vercel (remove quotes and newlines)
POSTGRES_URL_VALUE=$(grep "^POSTGRES_URL=" .env.vercel | sed 's/^POSTGRES_URL="\(.*\)\\n"$/\1/' | sed 's/\\n$//')
AUTH_SECRET_VALUE=$(grep "^AUTH_SECRET=" .env.vercel | sed 's/^AUTH_SECRET="\(.*\)\\n"$/\1/' | sed 's/\\n$//')
STRIPE_SECRET_KEY_VALUE=$(grep "^STRIPE_SECRET_KEY=" .env.vercel | sed 's/^STRIPE_SECRET_KEY="\(.*\)\\n"$/\1/' | sed 's/\\n$//')
STRIPE_WEBHOOK_SECRET_VALUE=$(grep "^STRIPE_WEBHOOK_SECRET=" .env.vercel | sed 's/^STRIPE_WEBHOOK_SECRET="\(.*\)\\n"$/\1/' | sed 's/\\n$//')
BASE_URL_VALUE=$(grep "^BASE_URL=" .env.vercel | sed 's/^BASE_URL="\(.*\)\\n"$/\1/' | sed 's/\\n$//')

# Set DATABASE_URL (use POSTGRES_URL value)
if [ -n "$POSTGRES_URL_VALUE" ]; then
  echo "Setting DATABASE_URL for all environments..."
  echo "$POSTGRES_URL_VALUE" | vercel env add DATABASE_URL production
  echo "$POSTGRES_URL_VALUE" | vercel env add DATABASE_URL preview
  echo "$POSTGRES_URL_VALUE" | vercel env add DATABASE_URL development
  echo "✅ DATABASE_URL set"
  echo ""
fi

# Set AUTH_SECRET (if not already set for all environments)
if [ -n "$AUTH_SECRET_VALUE" ]; then
  echo "Setting AUTH_SECRET for all environments..."
  echo "$AUTH_SECRET_VALUE" | vercel env add AUTH_SECRET production
  echo "$AUTH_SECRET_VALUE" | vercel env add AUTH_SECRET preview
  echo "$AUTH_SECRET_VALUE" | vercel env add AUTH_SECRET development
  echo "✅ AUTH_SECRET set"
  echo ""
fi

# Set STRIPE_SECRET_KEY (if not already set for all environments)
if [ -n "$STRIPE_SECRET_KEY_VALUE" ]; then
  echo "Setting STRIPE_SECRET_KEY for all environments..."
  echo "$STRIPE_SECRET_KEY_VALUE" | vercel env add STRIPE_SECRET_KEY production
  echo "$STRIPE_SECRET_KEY_VALUE" | vercel env add STRIPE_SECRET_KEY preview
  echo "$STRIPE_SECRET_KEY_VALUE" | vercel env add STRIPE_SECRET_KEY development
  echo "✅ STRIPE_SECRET_KEY set"
  echo ""
fi

# Set STRIPE_WEBHOOK_SECRET (if not already set for all environments)
if [ -n "$STRIPE_WEBHOOK_SECRET_VALUE" ]; then
  echo "Setting STRIPE_WEBHOOK_SECRET for all environments..."
  echo "$STRIPE_WEBHOOK_SECRET_VALUE" | vercel env add STRIPE_WEBHOOK_SECRET production
  echo "$STRIPE_WEBHOOK_SECRET_VALUE" | vercel env add STRIPE_WEBHOOK_SECRET preview
  echo "$STRIPE_WEBHOOK_SECRET_VALUE" | vercel env add STRIPE_WEBHOOK_SECRET development
  echo "✅ STRIPE_WEBHOOK_SECRET set"
  echo ""
fi

# Set NEXT_PUBLIC_APP_URL (use BASE_URL value)
if [ -n "$BASE_URL_VALUE" ]; then
  echo "Setting NEXT_PUBLIC_APP_URL for all environments..."
  echo "$BASE_URL_VALUE" | vercel env add NEXT_PUBLIC_APP_URL production
  echo "$BASE_URL_VALUE" | vercel env add NEXT_PUBLIC_APP_URL preview
  echo "$BASE_URL_VALUE" | vercel env add NEXT_PUBLIC_APP_URL development
  echo "✅ NEXT_PUBLIC_APP_URL set"
  echo ""
fi

# Note about NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
echo "⚠️  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY not found in .env.vercel"
echo "   You'll need to set this manually:"
echo "   vercel env add NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY production"
echo "   (Get the value from your Stripe dashboard)"
echo ""

echo "✅ Environment Variables Setup Complete!"
echo ""
echo "Next steps:"
echo "  1. Set NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY manually (see above)"
echo "  2. Verify: pnpm tsx scripts/check-and-set-env.ts"
echo "  3. Redeploy: vercel --prod"
echo ""


