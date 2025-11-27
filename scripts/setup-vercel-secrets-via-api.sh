#!/bin/bash

# Setup GitHub Secrets for Vercel Deployment using Vercel API
# This script uses Vercel API to automatically get project/org info

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "🔐 GitHub Secrets Setup via Vercel API"
echo "======================================"
echo ""

# Check if GitHub CLI is installed
if ! command -v gh &> /dev/null; then
    echo -e "${RED}❌ GitHub CLI not found${NC}"
    echo "Install it: https://cli.github.com/"
    exit 1
fi

# Check if authenticated with GitHub
if ! gh auth status &> /dev/null; then
    echo -e "${YELLOW}⚠️  Not authenticated with GitHub CLI${NC}"
    echo "Run: gh auth login"
    exit 1
fi

echo -e "${GREEN}✅ GitHub CLI authenticated${NC}"
echo ""

# Get Vercel token
VERCEL_TOKEN=""
if [ -f .env ]; then
    VERCEL_TOKEN=$(grep "^VERCEL_TOKEN=" .env | cut -d'=' -f2- | tr -d ' ' | tr -d '"' || echo "")
fi

if [ -z "$VERCEL_TOKEN" ]; then
    echo -e "${YELLOW}VERCEL_TOKEN not found in .env${NC}"
    echo "Get it from: https://vercel.com/account/tokens"
    echo ""
    read -p "Enter VERCEL_TOKEN: " VERCEL_TOKEN
    echo ""
fi

if [ -z "$VERCEL_TOKEN" ]; then
    echo -e "${RED}❌ VERCEL_TOKEN is required${NC}"
    exit 1
fi

echo -e "${BLUE}📡 Fetching Vercel project information...${NC}"
echo ""

# Verify token and get user info (per Vercel API docs)
echo "Verifying Vercel token..."
USER_RESPONSE=$(curl -s -X GET \
  "https://api.vercel.com/v2/user" \
  -H "Authorization: Bearer $VERCEL_TOKEN")

if echo "$USER_RESPONSE" | grep -q "error\|unauthorized\|Invalid"; then
    echo -e "${RED}❌ Invalid VERCEL_TOKEN${NC}"
    echo "Get a new token from: https://vercel.com/account/tokens"
    echo "Response: $USER_RESPONSE"
    exit 1
fi

USER_NAME=$(echo "$USER_RESPONSE" | grep -o '"username":"[^"]*' | head -1 | cut -d'"' -f4 || echo "")
USER_EMAIL=$(echo "$USER_RESPONSE" | grep -o '"email":"[^"]*' | head -1 | cut -d'"' -f4 || echo "")
echo -e "${GREEN}✅ Authenticated as: ${USER_NAME:-$USER_EMAIL}${NC}"
echo ""

# Get projects using Vercel API v9 (per official docs)
echo "Fetching projects from Vercel API..."
PROJECTS_RESPONSE=$(curl -s -X GET \
  "https://api.vercel.com/v9/projects?limit=100" \
  -H "Authorization: Bearer $VERCEL_TOKEN" \
  -H "Content-Type: application/json")

# Check if we have a project.json file
VERCEL_ORG_ID=""
VERCEL_PROJECT_ID=""
PROJECT_NAME=""

if [ -f .vercel/project.json ]; then
    echo -e "${GREEN}✅ Found .vercel/project.json (from 'vercel link')${NC}"
    VERCEL_ORG_ID=$(cat .vercel/project.json | grep -o '"orgId":"[^"]*' | cut -d'"' -f4 || echo "")
    VERCEL_PROJECT_ID=$(cat .vercel/project.json | grep -o '"projectId":"[^"]*' | cut -d'"' -f4 || echo "")
    PROJECT_NAME=$(cat .vercel/project.json | grep -o '"projectName":"[^"]*' | cut -d'"' -f4 || echo "")
    
    echo "  Org ID: $VERCEL_ORG_ID"
    echo "  Project ID: $VERCEL_PROJECT_ID"
    echo "  Project Name: $PROJECT_NAME"
    echo ""
    echo "Note: These values come from running 'vercel link' (per Vercel docs)"
    echo ""
fi

# If not found, try to get from API
if [ -z "$VERCEL_PROJECT_ID" ]; then
    echo -e "${YELLOW}⚠️  Project not linked locally${NC}"
    echo "Attempting to find project via API..."
    echo ""
    
    # List projects and let user choose
    PROJECT_COUNT=$(echo "$PROJECTS_RESPONSE" | grep -o '"name":"[^"]*' | wc -l | tr -d ' ')
    
    if [ "$PROJECT_COUNT" -eq 0 ]; then
        echo -e "${RED}❌ No projects found${NC}"
        echo "Create a project in Vercel first: https://vercel.com/new"
        exit 1
    fi
    
    echo "Found projects:"
    echo "$PROJECTS_RESPONSE" | grep -o '"name":"[^"]*' | head -5 | nl -w2 -s'. '
    echo ""
    
    # Try to auto-detect based on current directory name
    CURRENT_DIR=$(basename "$PWD")
    DETECTED_PROJECT=$(echo "$PROJECTS_RESPONSE" | grep -i "\"name\":\"$CURRENT_DIR" | head -1 || echo "")
    
    if [ -n "$DETECTED_PROJECT" ]; then
        echo -e "${BLUE}Auto-detected project: $CURRENT_DIR${NC}"
        VERCEL_PROJECT_ID=$(echo "$PROJECTS_RESPONSE" | grep -B5 -i "\"name\":\"$CURRENT_DIR" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4 || echo "")
        VERCEL_ORG_ID=$(echo "$PROJECTS_RESPONSE" | grep -B5 -i "\"name\":\"$CURRENT_DIR" | grep -o '"accountId":"[^"]*' | head -1 | cut -d'"' -f4 || echo "")
    else
        read -p "Enter project name (or press Enter to use first project): " SELECTED_PROJECT
        
        if [ -z "$SELECTED_PROJECT" ]; then
            # Use first project
            VERCEL_PROJECT_ID=$(echo "$PROJECTS_RESPONSE" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4 || echo "")
            VERCEL_ORG_ID=$(echo "$PROJECTS_RESPONSE" | grep -o '"accountId":"[^"]*' | head -1 | cut -d'"' -f4 || echo "")
        else
            VERCEL_PROJECT_ID=$(echo "$PROJECTS_RESPONSE" | grep -B5 -i "\"name\":\"$SELECTED_PROJECT" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4 || echo "")
            VERCEL_ORG_ID=$(echo "$PROJECTS_RESPONSE" | grep -B5 -i "\"name\":\"$SELECTED_PROJECT" | grep -o '"accountId":"[^"]*' | head -1 | cut -d'"' -f4 || echo "")
        fi
    fi
fi

# Verify project exists via Vercel API v9 (per official docs)
if [ -n "$VERCEL_PROJECT_ID" ]; then
    echo "Verifying project via Vercel API..."
    PROJECT_VERIFY=$(curl -s -X GET \
      "https://api.vercel.com/v9/projects/$VERCEL_PROJECT_ID" \
      -H "Authorization: Bearer $VERCEL_TOKEN" \
      -H "Content-Type: application/json")
    
    if echo "$PROJECT_VERIFY" | grep -q '"error"\|"not found"\|"Forbidden"'; then
        echo -e "${RED}❌ Project not found or access denied${NC}"
        echo "Response: $PROJECT_VERIFY"
        exit 1
    fi
    
    # Get org ID from project (accountId in Vercel API)
    if [ -z "$VERCEL_ORG_ID" ]; then
        VERCEL_ORG_ID=$(echo "$PROJECT_VERIFY" | grep -o '"accountId":"[^"]*' | head -1 | cut -d'"' -f4 || echo "")
    fi
    
    PROJECT_NAME=$(echo "$PROJECT_VERIFY" | grep -o '"name":"[^"]*' | head -1 | cut -d'"' -f4 || echo "")
    echo -e "${GREEN}✅ Project verified: $PROJECT_NAME${NC}"
    echo "  Project ID: $VERCEL_PROJECT_ID"
    echo "  Org ID: $VERCEL_ORG_ID"
    echo ""
fi

# Summary
echo -e "${BLUE}📋 Summary:${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  VERCEL_TOKEN: ${VERCEL_TOKEN:0:10}..."
echo "  VERCEL_ORG_ID: $VERCEL_ORG_ID"
echo "  VERCEL_PROJECT_ID: $VERCEL_PROJECT_ID"
echo "  Project Name: $PROJECT_NAME"
echo ""

# Confirm
read -p "Set these as GitHub secrets? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Cancelled."
    exit 0
fi

echo ""
echo -e "${BLUE}📤 Setting GitHub Secrets...${NC}"
echo ""

# Set secrets
echo "Setting VERCEL_TOKEN..."
gh secret set VERCEL_TOKEN --body "$VERCEL_TOKEN" 2>&1 | grep -v "Warning" || echo -e "${GREEN}✅ VERCEL_TOKEN set${NC}"

echo "Setting VERCEL_ORG_ID..."
gh secret set VERCEL_ORG_ID --body "$VERCEL_ORG_ID" 2>&1 | grep -v "Warning" || echo -e "${GREEN}✅ VERCEL_ORG_ID set${NC}"

echo "Setting VERCEL_PROJECT_ID..."
gh secret set VERCEL_PROJECT_ID --body "$VERCEL_PROJECT_ID" 2>&1 | grep -v "Warning" || echo -e "${GREEN}✅ VERCEL_PROJECT_ID set${NC}"

echo ""
echo -e "${GREEN}✅ All secrets set successfully!${NC}"
echo ""
echo "📋 Summary (per Vercel API documentation):"
echo "  ✅ VERCEL_TOKEN - Authentication token"
echo "  ✅ VERCEL_ORG_ID - Organization/Team ID"
echo "  ✅ VERCEL_PROJECT_ID - Project ID"
echo ""
echo "🚀 Next steps:"
echo "  1. Push to main branch to trigger production deployment"
echo "  2. Check GitHub Actions: https://github.com/Puddin1066/GEMflush/actions"
echo "  3. Monitor deployment in Vercel dashboard"
echo ""
echo "📚 Reference:"
echo "  - Vercel API Docs: https://vercel.com/docs/rest-api"
echo "  - GitHub Actions Guide: https://vercel.com/guides/how-can-i-use-github-actions-with-vercel"
echo ""

