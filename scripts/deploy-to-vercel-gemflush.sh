#!/bin/bash

# Deploy to Vercel and configure gemflush.com domain
# This script uses Vercel API to deploy and configure custom domain

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "🚀 Deploy to Vercel - gemflush.com"
echo "=================================="
echo ""

# Check for Vercel token
if [ -z "$VERCEL_TOKEN" ]; then
    if [ -f .env ]; then
        export VERCEL_TOKEN=$(grep "^VERCEL_TOKEN=" .env | cut -d'=' -f2- | tr -d ' ' | tr -d '"')
    fi
    
    if [ -z "$VERCEL_TOKEN" ]; then
        echo -e "${RED}❌ VERCEL_TOKEN not found${NC}"
        echo ""
        echo "Get your token from: https://vercel.com/account/tokens"
        echo "Then add to .env:"
        echo "  VERCEL_TOKEN=your_token_here"
        exit 1
    fi
fi

# Check for project/org IDs
if [ -z "$VERCEL_ORG_ID" ] || [ -z "$VERCEL_PROJECT_ID" ]; then
    if [ -f .env ]; then
        export VERCEL_ORG_ID=$(grep "^VERCEL_ORG_ID=" .env | cut -d'=' -f2- | tr -d ' ' | tr -d '"')
        export VERCEL_PROJECT_ID=$(grep "^VERCEL_PROJECT_ID=" .env | cut -d'=' -f2- | tr -d ' ' | tr -d '"')
    fi
fi

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "Installing Vercel CLI..."
    npm install -g vercel@latest
fi

echo -e "${BLUE}📋 Current Vercel Configuration:${NC}"
echo "  Token: ${VERCEL_TOKEN:0:10}..."
if [ -n "$VERCEL_ORG_ID" ]; then
    echo "  Org ID: $VERCEL_ORG_ID"
fi
if [ -n "$VERCEL_PROJECT_ID" ]; then
    echo "  Project ID: $VERCEL_PROJECT_ID"
fi
echo ""

# Link project if needed
if [ -z "$VERCEL_PROJECT_ID" ]; then
    echo -e "${YELLOW}⚠️  Project not linked. Linking now...${NC}"
    vercel link --yes --token="$VERCEL_TOKEN"
    
    # Extract project ID from .vercel/project.json
    if [ -f .vercel/project.json ]; then
        export VERCEL_PROJECT_ID=$(cat .vercel/project.json | grep -o '"projectId":"[^"]*' | cut -d'"' -f4)
        export VERCEL_ORG_ID=$(cat .vercel/project.json | grep -o '"orgId":"[^"]*' | cut -d'"' -f4)
        echo -e "${GREEN}✅ Project linked${NC}"
        echo "  Project ID: $VERCEL_PROJECT_ID"
        echo "  Org ID: $VERCEL_ORG_ID"
        echo ""
        echo "Add these to your .env file:"
        echo "  VERCEL_PROJECT_ID=$VERCEL_PROJECT_ID"
        echo "  VERCEL_ORG_ID=$VERCEL_ORG_ID"
    fi
fi

# Deploy to production
echo -e "${BLUE}🚀 Deploying to Vercel Production...${NC}"
vercel deploy --prod --yes --token="$VERCEL_TOKEN"

# Get deployment URL
DEPLOYMENT_URL=$(vercel ls --token="$VERCEL_TOKEN" | grep -m1 "Production" | awk '{print $2}' || echo "")

if [ -n "$DEPLOYMENT_URL" ]; then
    echo ""
    echo -e "${GREEN}✅ Deployment successful!${NC}"
    echo "  URL: https://$DEPLOYMENT_URL"
fi

# Configure custom domain
echo ""
echo -e "${BLUE}🌐 Configuring gemflush.com domain...${NC}"

if [ -z "$VERCEL_PROJECT_ID" ] || [ -z "$VERCEL_ORG_ID" ]; then
    echo -e "${YELLOW}⚠️  Cannot configure domain without project/org IDs${NC}"
    echo "Please set VERCEL_PROJECT_ID and VERCEL_ORG_ID in .env"
    exit 0
fi

# Add domain via API
DOMAIN="gemflush.com"
echo "Adding domain: $DOMAIN"

RESPONSE=$(curl -s -X POST \
  "https://api.vercel.com/v10/projects/$VERCEL_PROJECT_ID/domains" \
  -H "Authorization: Bearer $VERCEL_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"$DOMAIN\"}" 2>&1)

if echo "$RESPONSE" | grep -q "already exists\|already configured"; then
    echo -e "${YELLOW}⚠️  Domain already configured${NC}"
elif echo "$RESPONSE" | grep -q "error\|Error"; then
    echo -e "${RED}❌ Error configuring domain:${NC}"
    echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"
    echo ""
    echo "You may need to:"
    echo "  1. Add DNS records (see Vercel dashboard)"
    echo "  2. Verify domain ownership"
    echo "  3. Configure domain in Vercel dashboard: https://vercel.com/dashboard"
else
    echo -e "${GREEN}✅ Domain added!${NC}"
    echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"
fi

echo ""
echo -e "${GREEN}🎉 Deployment complete!${NC}"
echo ""
echo "Next steps:"
echo "  1. Configure DNS records (if not already done)"
echo "  2. Verify domain in Vercel dashboard"
echo "  3. Check deployment: https://vercel.com/dashboard"
echo ""
echo "Domain configuration:"
echo "  https://vercel.com/dashboard/$VERCEL_ORG_ID/$VERCEL_PROJECT_ID/settings/domains"

