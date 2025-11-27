#!/bin/bash

# GitHub API Connection Troubleshooter
# This script helps diagnose and fix GitHub API connection issues

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "🔍 GitHub API Connection Troubleshooter"
echo "========================================"
echo ""

# Load token from .env if it exists
if [ -f .env ]; then
    # Try to load token from .env
    TOKEN=$(grep "^GITHUB_TOKEN=" .env 2>/dev/null | cut -d'=' -f2- | tr -d ' ' | tr -d '"' || echo "")
fi

# Allow override via environment variable
if [ ! -z "$GITHUB_TOKEN" ]; then
    TOKEN="$GITHUB_TOKEN"
fi

# Check if token is provided
if [ -z "$TOKEN" ]; then
    echo -e "${RED}❌ No GitHub token found${NC}"
    echo ""
    echo "Provide token via:"
    echo "  1. .env file: GITHUB_TOKEN=your_token"
    echo "  2. Environment: export GITHUB_TOKEN=your_token"
    echo "  3. Interactive: Enter when prompted"
    echo ""
    read -sp "Enter your GitHub token (or press Enter to exit): " TOKEN
    echo ""
    
    if [ -z "$TOKEN" ]; then
        echo "Exiting..."
        exit 1
    fi
fi

echo -e "${BLUE}Testing GitHub API connection...${NC}"
echo ""

# Test 1: Basic API connection
echo "1️⃣  Testing basic API connection..."
RESPONSE=$(curl -s -w "\n%{http_code}" -H "Authorization: token $TOKEN" https://api.github.com/user 2>&1)
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "200" ]; then
    USER=$(echo "$BODY" | grep -o '"login":"[^"]*"' | head -1 | cut -d'"' -f4)
    echo -e "${GREEN}✅ Connected! Authenticated as: $USER${NC}"
else
    echo -e "${RED}❌ Connection failed (HTTP $HTTP_CODE)${NC}"
    echo "Response: $BODY" | head -5
    echo ""
    echo "Common issues:"
    echo "  - Invalid token"
    echo "  - Token expired"
    echo "  - Token format incorrect"
    exit 1
fi
echo ""

# Test 2: Check token scopes
echo "2️⃣  Checking token scopes..."
SCOPES_HEADER=$(curl -s -I -H "Authorization: token $TOKEN" https://api.github.com/user | grep -i "x-oauth-scopes" || echo "")
if [ ! -z "$SCOPES_HEADER" ]; then
    SCOPES=$(echo "$SCOPES_HEADER" | cut -d: -f2 | tr ',' '\n' | xargs)
    echo -e "${BLUE}Token scopes: $SCOPES${NC}"
    
    # Check for required scopes
    HAS_REPO=false
    HAS_WORKFLOW=false
    
    echo "$SCOPES" | grep -q "repo" && HAS_REPO=true
    echo "$SCOPES" | grep -q "workflow" && HAS_WORKFLOW=true
    
    if [ "$HAS_REPO" = true ]; then
        echo -e "${GREEN}✅ repo scope: Present${NC}"
    else
        echo -e "${RED}❌ repo scope: MISSING (required)${NC}"
    fi
    
    if [ "$HAS_WORKFLOW" = true ]; then
        echo -e "${GREEN}✅ workflow scope: Present${NC}"
    else
        echo -e "${YELLOW}⚠️  workflow scope: Missing (optional but recommended)${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  Could not determine scopes${NC}"
fi
echo ""

# Test 3: Repository access
echo "3️⃣  Testing repository access..."
REPO_OWNER=$(git remote get-url origin 2>/dev/null | sed -E 's/.*github.com[:/]([^/]+)\/([^/]+)(\.git)?$/\1/' || echo "")
REPO_NAME=$(git remote get-url origin 2>/dev/null | sed -E 's/.*github.com[:/]([^/]+)\/([^/]+)(\.git)?$/\2/' | sed 's/\.git$//' || echo "")

if [ ! -z "$REPO_OWNER" ] && [ ! -z "$REPO_NAME" ]; then
    REPO_TEST=$(curl -s -w "\n%{http_code}" -H "Authorization: token $TOKEN" \
        "https://api.github.com/repos/$REPO_OWNER/$REPO_NAME" 2>&1)
    REPO_HTTP=$(echo "$REPO_TEST" | tail -n1)
    
    if [ "$REPO_HTTP" = "200" ]; then
        echo -e "${GREEN}✅ Repository access: OK ($REPO_OWNER/$REPO_NAME)${NC}"
    else
        echo -e "${RED}❌ Repository access: FAILED (HTTP $REPO_HTTP)${NC}"
        echo "You may not have access to $REPO_OWNER/$REPO_NAME"
    fi
else
    echo -e "${YELLOW}⚠️  Could not determine repository from git remote${NC}"
fi
echo ""

# Test 4: GitHub CLI
echo "4️⃣  Testing GitHub CLI..."
if command -v gh &> /dev/null; then
    export GITHUB_TOKEN="$TOKEN"
    export GH_TOKEN="$TOKEN"
    
    # Test gh command
    GH_TEST=$(gh api user --jq .login 2>&1)
    if [ $? -eq 0 ] && [ ! -z "$GH_TEST" ]; then
        echo -e "${GREEN}✅ GitHub CLI: Working (authenticated as: $GH_TEST)${NC}"
        echo ""
        echo "To use GitHub CLI with this token:"
        echo "  export GITHUB_TOKEN=$TOKEN"
        echo "  export GH_TOKEN=$TOKEN"
    else
        echo -e "${YELLOW}⚠️  GitHub CLI: Authentication issue${NC}"
        echo "Error: $GH_TEST"
        echo ""
        echo "Try authenticating manually:"
        echo "  echo \"$TOKEN\" | gh auth login --with-token"
    fi
else
    echo -e "${YELLOW}⚠️  GitHub CLI: Not installed${NC}"
fi
echo ""

# Test 5: Git push capability
echo "5️⃣  Testing Git push capability..."
GIT_REMOTE=$(git remote get-url origin 2>/dev/null || echo "")
if [ ! -z "$GIT_REMOTE" ]; then
    echo -e "${BLUE}Remote: $GIT_REMOTE${NC}"
    
    # Test if we can read from repo
    GIT_TEST=$(git ls-remote --heads origin 2>&1)
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Git remote access: OK${NC}"
    else
        echo -e "${RED}❌ Git remote access: FAILED${NC}"
        echo "Error: $GIT_TEST"
        echo ""
        echo "To fix, try:"
        echo "  git remote set-url origin https://$TOKEN@github.com/OWNER/REPO.git"
    fi
else
    echo -e "${YELLOW}⚠️  No git remote configured${NC}"
fi
echo ""

# Summary and recommendations
echo "📊 Summary"
echo "=========="
echo ""
echo -e "${GREEN}Token is valid and authenticated!${NC}"
echo ""
echo "✅ Next steps:"
echo ""
echo "1. Export token for current session:"
echo "   export GITHUB_TOKEN=$TOKEN"
echo "   export GH_TOKEN=$TOKEN"
echo ""
echo "2. Test GitHub CLI:"
echo "   gh auth status"
echo "   gh api user"
echo ""
echo "3. Push your code:"
echo "   git push origin main"
echo ""
echo "4. Or authenticate GitHub CLI:"
echo "   echo \"$TOKEN\" | gh auth login --with-token"
echo ""

