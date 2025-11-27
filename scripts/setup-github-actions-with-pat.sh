#!/bin/bash

# Quick setup script using GitHub Personal Access Token
# Usage: GITHUB_TOKEN=your_pat ./scripts/setup-github-actions-with-pat.sh

set -e

echo "🚀 GitHub Actions Setup with Personal Access Token"
echo "=================================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# Check if PAT is provided
if [ -z "$GITHUB_TOKEN" ]; then
    echo -e "${YELLOW}⚠️  GITHUB_TOKEN environment variable not set${NC}"
    echo ""
    echo "Usage:"
    echo "  GITHUB_TOKEN=your_github_pat ./scripts/setup-github-actions-with-pat.sh"
    echo ""
    echo "Or set it first:"
    echo "  export GITHUB_TOKEN=your_github_pat"
    echo "  ./scripts/setup-github-actions-with-pat.sh"
    echo ""
    read -sp "Enter your GitHub Personal Access Token (hidden): " GITHUB_TOKEN
    echo ""
    
    if [ -z "$GITHUB_TOKEN" ]; then
        echo -e "${RED}❌ GitHub token is required${NC}"
        exit 1
    fi
fi

# Export for GitHub CLI
export GH_TOKEN="$GITHUB_TOKEN"

# Verify token works
echo "🔐 Verifying GitHub token..."
GITHUB_USER=$(gh api user -q .login 2>/dev/null || echo "")

if [ -z "$GITHUB_USER" ]; then
    echo -e "${RED}❌ Invalid GitHub token or insufficient permissions${NC}"
    echo ""
    echo "Your PAT needs these scopes:"
    echo "  - repo (for private repositories)"
    echo "  - workflow (to manage secrets)"
    echo ""
    echo "Check your token at: https://github.com/settings/tokens"
    exit 1
fi

echo -e "${GREEN}✅ Authenticated as: $GITHUB_USER${NC}"
echo ""

# Get repository info
echo "📦 Getting repository information..."
REPO_OWNER=$(git remote get-url origin 2>/dev/null | sed -E 's/.*github.com[:/]([^/]+)\/([^/]+)(\.git)?$/\1/' || echo "")
REPO_NAME=$(git remote get-url origin 2>/dev/null | sed -E 's/.*github.com[:/]([^/]+)\/([^/]+)(\.git)?$/\2/' | sed 's/\.git$//' || echo "")

if [ -z "$REPO_OWNER" ] || [ -z "$REPO_NAME" ]; then
    echo -e "${YELLOW}⚠️  Could not detect repository${NC}"
    read -p "Enter repository owner: " REPO_OWNER
    read -p "Enter repository name: " REPO_NAME
fi

echo -e "${GREEN}✅ Repository: $REPO_OWNER/$REPO_NAME${NC}"
echo ""

# Get Vercel credentials
echo "🔑 Getting Vercel credentials..."
if ! command -v vercel &> /dev/null; then
    echo -e "${YELLOW}⚠️  Vercel CLI not found. Installing...${NC}"
    npm install -g vercel
fi

if ! vercel whoami &> /dev/null; then
    echo -e "${YELLOW}⚠️  Not logged into Vercel${NC}"
    vercel login
fi

if [ ! -d ".vercel" ] || [ ! -f ".vercel/project.json" ]; then
    echo "   Linking Vercel project..."
    vercel link --yes || {
        echo -e "${RED}❌ Failed to link Vercel project${NC}"
        exit 1
    }
fi

if [ -f ".vercel/project.json" ]; then
    ORG_ID=$(jq -r '.orgId' .vercel/project.json 2>/dev/null || cat .vercel/project.json | grep -o '"orgId":"[^"]*"' | cut -d'"' -f4)
    PROJECT_ID=$(jq -r '.projectId' .vercel/project.json 2>/dev/null || cat .vercel/project.json | grep -o '"projectId":"[^"]*"' | cut -d'"' -f4)
    
    if [ ! -z "$ORG_ID" ] && [ ! -z "$PROJECT_ID" ] && [ "$ORG_ID" != "null" ] && [ "$PROJECT_ID" != "null" ]; then
        echo -e "${GREEN}✅ Vercel credentials retrieved${NC}"
        echo "   Organization ID: $ORG_ID"
        echo "   Project ID: $PROJECT_ID"
    else
        echo -e "${RED}❌ Failed to get Vercel credentials${NC}"
        exit 1
    fi
fi
echo ""

# Get Vercel token
echo "🔐 Vercel Token Setup"
echo "---------------------"
read -sp "Enter your Vercel token (create at https://vercel.com/account/tokens): " VERCEL_TOKEN
echo ""

if [ -z "$VERCEL_TOKEN" ]; then
    echo -e "${RED}❌ Vercel token is required${NC}"
    exit 1
fi

# Generate AUTH_SECRET
if command -v openssl &> /dev/null; then
    AUTH_SECRET=$(openssl rand -base64 32)
    echo -e "${GREEN}✅ Generated AUTH_SECRET${NC}"
else
    AUTH_SECRET=""
    echo -e "${YELLOW}⚠️  openssl not found. AUTH_SECRET will need to be set manually${NC}"
fi
echo ""

# Set secrets
echo "🔐 Setting GitHub Secrets..."
echo "----------------------------"

set_secret() {
    local SECRET_NAME=$1
    local SECRET_VALUE=$2
    
    if echo "$SECRET_VALUE" | gh secret set "$SECRET_NAME" --repo "$REPO_OWNER/$REPO_NAME" 2>/dev/null; then
        echo -e "${GREEN}✅ Set secret: $SECRET_NAME${NC}"
    else
        echo -e "${RED}❌ Failed to set secret: $SECRET_NAME${NC}"
        return 1
    fi
}

set_secret "VERCEL_TOKEN" "$VERCEL_TOKEN"
set_secret "VERCEL_ORG_ID" "$ORG_ID"
set_secret "VERCEL_PROJECT_ID" "$PROJECT_ID"

if [ ! -z "$AUTH_SECRET" ]; then
    set_secret "AUTH_SECRET" "$AUTH_SECRET"
fi

echo ""
echo "✅ Setup Complete!"
echo ""
echo "Secrets configured in: https://github.com/$REPO_OWNER/$REPO_NAME/settings/secrets/actions"
echo ""
echo "Next: Add remaining secrets (DATABASE_URL, etc.) or run the full setup script"
echo ""

