#!/bin/bash
# Set Vercel Environment Variables
# 
# This script sets all required environment variables in Vercel.
# Run this after deploying to Vercel for the first time.
#
# Usage:
#   chmod +x scripts/set-vercel-env.sh
#   ./scripts/set-vercel-env.sh
#
# Or run individual commands:
#   vercel env add VARIABLE_NAME production

set -e

echo "🚀 Setting Vercel Environment Variables"
echo "========================================"
echo ""
echo "This script will prompt you for each required environment variable."
echo "Make sure you have:"
echo "  1. Vercel CLI installed: npm i -g vercel"
echo "  2. Logged in: vercel login"
echo "  3. Linked to project: vercel link"
echo ""
read -p "Press Enter to continue or Ctrl+C to cancel..."

# Required variables (will prompt for values)
REQUIRED_VARS=(
  "DATABASE_URL:PostgreSQL connection string (postgresql://...)"
  "AUTH_SECRET:Authentication secret (generate with: openssl rand -base64 32)"
  "STRIPE_SECRET_KEY:Stripe secret key (sk_test_... or sk_live_...)"
  "STRIPE_WEBHOOK_SECRET:Stripe webhook secret (whsec_...)"
  "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY:Stripe publishable key (pk_test_... or pk_live_...)"
  "NEXT_PUBLIC_APP_URL:Application URL (https://your-app.vercel.app)"
)

# Optional variables (can skip)
OPTIONAL_VARS=(
  "SENTRY_DSN:Sentry DSN for error tracking (optional)"
  "WIKIDATA_PUBLISH_MODE:Wikidata publish mode (mock|test|production, default: test)"
  "WIKIDATA_BOT_USERNAME:Wikidata bot username (optional, required for production)"
  "WIKIDATA_BOT_PASSWORD:Wikidata bot password (optional, required for production)"
  "OPENROUTER_API_KEY:OpenRouter API key for LLM features (optional)"
  "GOOGLE_SEARCH_API_KEY:Google Custom Search API key (optional)"
  "GOOGLE_SEARCH_ENGINE_ID:Google Custom Search Engine ID (optional)"
  "RESEND_API_KEY:Resend API key for emails (optional)"
  "EMAIL_FROM:Email from address (optional)"
  "SUPPORT_EMAIL:Support email address (optional)"
)

echo ""
echo "📋 Required Variables"
echo "===================="
echo ""

for var_info in "${REQUIRED_VARS[@]}"; do
  IFS=':' read -r var_name var_description <<< "$var_info"
  echo "Setting: $var_name"
  echo "Description: $var_description"
  echo ""
  
  # Check if already set
  if vercel env ls | grep -q "^$var_name"; then
    echo "⚠️  $var_name is already set. Skip? (y/n)"
    read -r skip
    if [[ "$skip" == "y" ]]; then
      echo "Skipping $var_name"
      echo ""
      continue
    fi
  fi
  
  # Add to all environments
  echo "Adding to Production, Preview, and Development..."
  vercel env add "$var_name" production
  vercel env add "$var_name" preview
  vercel env add "$var_name" development
  echo "✅ $var_name set"
  echo ""
done

echo ""
echo "📋 Optional Variables"
echo "===================="
echo ""
echo "These are optional but recommended. Press Enter to skip any variable."
echo ""

for var_info in "${OPTIONAL_VARS[@]}"; do
  IFS=':' read -r var_name var_description <<< "$var_info"
  echo "Set $var_name? ($var_description)"
  echo "Press Enter to skip, or type 'y' to set:"
  read -r set_var
  
  if [[ "$set_var" == "y" ]]; then
    vercel env add "$var_name" production
    vercel env add "$var_name" preview
    vercel env add "$var_name" development
    echo "✅ $var_name set"
  else
    echo "Skipped $var_name"
  fi
  echo ""
done

echo ""
echo "✅ Environment Variables Setup Complete!"
echo ""
echo "Next steps:"
echo "  1. Verify variables: vercel env ls"
echo "  2. Redeploy: vercel --prod"
echo "  3. Test health check: curl https://your-app.vercel.app/api/health"
echo ""


