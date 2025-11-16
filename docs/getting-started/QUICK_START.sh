#!/bin/bash
# GEMflush Quick Start Script
# Run this to get started immediately

echo "🚀 GEMflush Quick Start"
echo "======================="
echo ""

# Check if .env.local exists
if [ ! -f .env.local ]; then
    echo "⚠️  .env.local not found. Please create it first!"
    echo ""
    echo "Required variables:"
    echo "  DATABASE_URL=postgresql://..."
    echo "  AUTH_SECRET=<random string>"
    echo "  STRIPE_SECRET_KEY=sk_test_..."
    echo "  STRIPE_PRO_PRICE_ID=price_..."
    echo "  STRIPE_AGENCY_PRICE_ID=price_..."
    echo ""
    echo "Optional (for real APIs):"
    echo "  OPENROUTER_API_KEY=sk-or-v1-..."
    echo ""
    exit 1
fi

echo "✅ Found .env.local"
echo ""

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    pnpm install
    echo ""
fi

# Setup database
echo "🗄️  Setting up database..."
pnpm db:push
echo ""

# Success message
echo "✅ Setup complete!"
echo ""
echo "🎯 Next steps:"
echo "  1. Start dev server:  pnpm dev"
echo "  2. Visit:             http://localhost:3000"
echo "  3. Sign up for account"
echo "  4. Add a business"
echo "  5. Test features!"
echo ""
echo "📚 Documentation:"
echo "  - README_GEMFLUSH.md - Project overview"
echo "  - GETTING_STARTED.md - Detailed guide"
echo "  - DEPLOYMENT_CHECKLIST.md - Launch checklist"
echo ""
echo "Happy building! 🎉"

