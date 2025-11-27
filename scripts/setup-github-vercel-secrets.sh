#!/bin/bash

# Setup GitHub Secrets for Vercel Deployment
# This script helps you add the required secrets to GitHub

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "🔐 GitHub Secrets Setup for Vercel Deployment"
echo "=============================================="
echo ""

# Check if GitHub CLI is installed
if ! command -v gh &> /dev/null; then
    echo -e "${YELLOW}⚠️  GitHub CLI not found${NC}"
    echo "Install it: https://cli.github.com/"
    echo ""
    echo "Or manually add secrets at:"
    echo "  https://github.com/Puddin1066/GEMflush/settings/secrets/actions"
    exit 1
fi

# Check if authenticated
if ! gh auth status &> /dev/null; then
    echo -e "${YELLOW}⚠️  Not authenticated with GitHub CLI${NC}"
    echo "Run: gh auth login"
    exit 1
fi

echo -e "${GREEN}✅ GitHub CLI authenticated${NC}"
echo ""

# Get Vercel credentials
echo "📋 Vercel Credentials"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check .env for Vercel token
if [ -f .env ]; then
    VERCEL_TOKEN=$(grep "^VERCEL_TOKEN=" .env | cut -d'=' -f2- | tr -d ' ' | tr -d '"' || echo "")
fi

# Check .vercel/project.json for IDs
if [ -f .vercel/project.json ]; then
    VERCEL_ORG_ID=$(cat .vercel/project.json | grep -o '"orgId":"[^"]*' | cut -d'"' -f4 || echo "")
    VERCEL_PROJECT_ID=$(cat .vercel/project.json | grep -o '"projectId":"[^"]*' | cut -d'"' -f4 || echo "")
fi

# Prompt for missing values
if [ -z "$VERCEL_TOKEN" ]; then
    echo -e "${YELLOW}VERCEL_TOKEN not found${NC}"
    echo "Get it from: https://vercel.com/account/tokens"
    read -p "Enter VERCEL_TOKEN: " VERCEL_TOKEN
fi

if [ -z "$VERCEL_ORG_ID" ]; then
    echo -e "${YELLOW}VERCEL_ORG_ID not found${NC}"
    echo "Run 'vercel link' in your project, or get from Vercel dashboard"
    read -p "Enter VERCEL_ORG_ID: " VERCEL_ORG_ID
fi

if [ -z "$VERCEL_PROJECT_ID" ]; then
    echo -e "${YELLOW}VERCEL_PROJECT_ID not found${NC}"
    echo "Run 'vercel link' in your project, or get from Vercel dashboard"
    read -p "Enter VERCEL_PROJECT_ID: " VERCEL_PROJECT_ID
fi

echo ""
echo -e "${BLUE}📤 Setting GitHub Secrets...${NC}"
echo ""

# Set secrets
echo "Setting VERCEL_TOKEN..."
gh secret set VERCEL_TOKEN --body "$VERCEL_TOKEN" 2>&1 | grep -v "Warning" || echo "✅ VERCEL_TOKEN set"

echo "Setting VERCEL_ORG_ID..."
gh secret set VERCEL_ORG_ID --body "$VERCEL_ORG_ID" 2>&1 | grep -v "Warning" || echo "✅ VERCEL_ORG_ID set"

echo "Setting VERCEL_PROJECT_ID..."
gh secret set VERCEL_PROJECT_ID --body "$VERCEL_PROJECT_ID" 2>&1 | grep -v "Warning" || echo "✅ VERCEL_PROJECT_ID set"

echo ""
echo -e "${GREEN}✅ All secrets set!${NC}"
echo ""
echo "📋 Summary:"
echo "  ✅ VERCEL_TOKEN"
echo "  ✅ VERCEL_ORG_ID"
echo "  ✅ VERCEL_PROJECT_ID"
echo ""
echo "🚀 Next steps:"
echo "  1. Push to main branch to trigger production deployment"
echo "  2. Check GitHub Actions: https://github.com/Puddin1066/GEMflush/actions"
echo "  3. Check Vercel dashboard for deployments"
echo ""

