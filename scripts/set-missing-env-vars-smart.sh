#!/bin/bash
# Set Missing Environment Variables in Vercel (Smart Version)
# 
# Checks which variables are missing and only sets those

set -e

echo "🚀 Setting Missing Environment Variables in Vercel"
echo "==================================================="
echo ""

# Pull current env vars
if [ ! -f .env.vercel ]; then
  echo "Pulling environment variables..."
  vercel env pull .env.vercel
fi

# Function to check if variable exists for all environments
var_exists() {
  local var_name=$1
  local count=$(vercel env ls 2>/dev/null | grep "^${var_name}" | grep -E "(Production|Preview|Development)" | wc -l | tr -d ' ')
  [ "$count" -ge 3 ]
}

# Function to set variable for all environments
set_var() {
  local var_name=$1
  local value=$2
  
  if var_exists "$var_name"; then
    echo "  ⏭️  $var_name already set for all environments"
    return 0
  fi
  
  echo "  Setting $var_name..."
  echo "$value" | vercel env add "$var_name" production 2>/dev/null || echo "    (production may already exist)"
  echo "$value" | vercel env add "$var_name" preview 2>/dev/null || echo "    (preview may already exist)"
  echo "$value" | vercel env add "$var_name" development 2>/dev/null || echo "    (development may already exist)"
  echo "  ✅ $var_name set"
}

# Extract values
POSTGRES_URL_VALUE=$(grep "^POSTGRES_URL=" .env.vercel | sed 's/^POSTGRES_URL="\(.*\)\\n"$/\1/' | sed 's/\\n$//' | tr -d '"')
AUTH_SECRET_VALUE=$(grep "^AUTH_SECRET=" .env.vercel | sed 's/^AUTH_SECRET="\(.*\)\\n"$/\1/' | sed 's/\\n$//' | tr -d '"')
STRIPE_SECRET_KEY_VALUE=$(grep "^STRIPE_SECRET_KEY=" .env.vercel | sed 's/^STRIPE_SECRET_KEY="\(.*\)\\n"$/\1/' | sed 's/\\n$//' | tr -d '"')
STRIPE_WEBHOOK_SECRET_VALUE=$(grep "^STRIPE_WEBHOOK_SECRET=" .env.vercel | sed 's/^STRIPE_WEBHOOK_SECRET="\(.*\)\\n"$/\1/' | sed 's/\\n$//' | tr -d '"')
BASE_URL_VALUE=$(grep "^BASE_URL=" .env.vercel | sed 's/^BASE_URL="\(.*\)\\n"$/\1/' | sed 's/\\n$//' | tr -d '"')

echo "📋 Setting Required Variables"
echo ""

# Set DATABASE_URL (use POSTGRES_URL value if DATABASE_URL doesn't exist)
if [ -n "$POSTGRES_URL_VALUE" ]; then
  if ! var_exists "DATABASE_URL"; then
    set_var "DATABASE_URL" "$POSTGRES_URL_VALUE"
  else
    echo "  ✅ DATABASE_URL already set"
  fi
fi

# Set AUTH_SECRET
if [ -n "$AUTH_SECRET_VALUE" ]; then
  if ! var_exists "AUTH_SECRET"; then
    set_var "AUTH_SECRET" "$AUTH_SECRET_VALUE"
  else
    echo "  ✅ AUTH_SECRET already set"
  fi
fi

# Set STRIPE_SECRET_KEY
if [ -n "$STRIPE_SECRET_KEY_VALUE" ]; then
  if ! var_exists "STRIPE_SECRET_KEY"; then
    set_var "STRIPE_SECRET_KEY" "$STRIPE_SECRET_KEY_VALUE"
  else
    echo "  ✅ STRIPE_SECRET_KEY already set"
  fi
fi

# Set STRIPE_WEBHOOK_SECRET
if [ -n "$STRIPE_WEBHOOK_SECRET_VALUE" ]; then
  if ! var_exists "STRIPE_WEBHOOK_SECRET"; then
    set_var "STRIPE_WEBHOOK_SECRET" "$STRIPE_WEBHOOK_SECRET_VALUE"
  else
    echo "  ✅ STRIPE_WEBHOOK_SECRET already set"
  fi
fi

# Set NEXT_PUBLIC_APP_URL (use BASE_URL value)
if [ -n "$BASE_URL_VALUE" ]; then
  if ! var_exists "NEXT_PUBLIC_APP_URL"; then
    set_var "NEXT_PUBLIC_APP_URL" "$BASE_URL_VALUE"
  else
    echo "  ✅ NEXT_PUBLIC_APP_URL already set"
  fi
fi

echo ""
echo "⚠️  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY needs to be set manually"
echo "   Get it from: https://dashboard.stripe.com/apikeys"
echo "   Then run: vercel env add NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY production"
echo ""

echo "✅ Done! Run 'pnpm tsx scripts/check-and-set-env.ts' to verify"
echo ""


