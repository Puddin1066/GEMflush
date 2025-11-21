#!/bin/bash
# Clean Next.js build artifacts and caches
# Usage: ./scripts/clean-build.sh

set -e

echo "🧹 Cleaning Next.js build artifacts..."

# Remove build directories
rm -rf .next
echo "✅ Removed .next directory"

# Remove cache directories
rm -rf .turbo
rm -rf node_modules/.cache
echo "✅ Removed cache directories"

# Remove any temporary build files
find . -name "*.tmp.*" -type f -delete 2>/dev/null || true
echo "✅ Removed temporary files"

# Clear Next.js build cache (if exists)
rm -rf .next/cache 2>/dev/null || true

echo ""
echo "✨ Clean complete! Run 'pnpm dev' or 'pnpm build' to rebuild."
echo ""










