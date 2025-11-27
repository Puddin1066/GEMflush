#!/bin/bash

# Connection Verification Script
# Verifies all connections needed for CI/CD setup

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "🔍 Connection Verification"
echo "=========================="
echo ""

# Load .env file if it exists (handle special characters carefully)
if [ -f .env ]; then
    # Source .env file line by line, skipping comments and empty lines
    set -a
    while IFS= read -r line || [ -n "$line" ]; do
        # Skip comments and empty lines
        [[ "$line" =~ ^[[:space:]]*# ]] && continue
        [[ -z "${line// }" ]] && continue
        # Export variable (handle values with spaces/special chars)
        if [[ "$line" =~ ^[[:space:]]*([^=]+)=(.*)$ ]]; then
            var_name="${BASH_REMATCH[1]}"
            var_value="${BASH_REMATCH[2]}"
            # Remove leading/trailing whitespace
            var_name="${var_name// }"
            var_value="${var_value# }"
            var_value="${var_value% }"
            export "$var_name=$var_value" 2>/dev/null || true
        fi
    done < .env
    set +a
fi

# 1. Repository Information
echo "📦 Repository Information"
echo "-------------------------"
REPO_URL=$(git remote get-url origin 2>/dev/null || echo "")
if [ ! -z "$REPO_URL" ]; then
    REPO_FULL=$(echo "$REPO_URL" | sed -E 's/.*github.com[:/]([^/]+\/[^/]+)(\.git)?$/\1/')
    REPO_OWNER=$(echo "$REPO_FULL" | cut -d'/' -f1)
    REPO_NAME=$(echo "$REPO_FULL" | cut -d'/' -f2)
    echo -e "${GREEN}✓${NC} Repository: $REPO_FULL"
    echo "   Owner: $REPO_OWNER"
    echo "   Name: $REPO_NAME"
else
    echo -e "${RED}✗${NC} No git remote found"
fi
echo ""

# 2. Vercel Configuration
echo "🔧 Vercel Configuration"
echo "----------------------"
if [ -f .vercel/project.json ]; then
    if command -v jq &> /dev/null; then
        ORG_ID=$(jq -r '.orgId' .vercel/project.json 2>/dev/null)
        PROJECT_ID=$(jq -r '.projectId' .vercel/project.json 2>/dev/null)
    else
        ORG_ID=$(grep -o '"orgId":"[^"]*"' .vercel/project.json | cut -d'"' -f4)
        PROJECT_ID=$(grep -o '"projectId":"[^"]*"' .vercel/project.json | cut -d'"' -f4)
    fi
    
    if [ ! -z "$ORG_ID" ] && [ "$ORG_ID" != "null" ]; then
        echo -e "${GREEN}✓${NC} Vercel Project Linked"
        echo "   Organization ID: $ORG_ID"
        echo "   Project ID: $PROJECT_ID"
    else
        echo -e "${RED}✗${NC} Invalid Vercel configuration"
    fi
else
    echo -e "${YELLOW}⚠${NC}  Vercel project not linked"
    echo "   Run: vercel link"
fi
echo ""

# 3. GitHub Token Verification
echo "🔐 GitHub Authentication"
echo "-----------------------"
if [ ! -z "$GITHUB_TOKEN" ]; then
    echo -e "${GREEN}✓${NC} GITHUB_TOKEN found in environment"
    
    # Test token with curl (more reliable than gh CLI)
    GITHUB_USER=$(curl -s -H "Authorization: token $GITHUB_TOKEN" https://api.github.com/user 2>/dev/null | grep -o '"login":"[^"]*"' | head -1 | cut -d'"' -f4 || echo "")
    
    if [ ! -z "$GITHUB_USER" ]; then
        echo -e "${GREEN}✓${NC} Token is valid"
        echo "   Authenticated as: $GITHUB_USER"
    else
        echo -e "${YELLOW}⚠${NC}  Could not verify token (may still work)"
        echo "   Note: GitHub CLI has known issues, but secrets can still be set"
    fi
else
    echo -e "${YELLOW}⚠${NC}  GITHUB_TOKEN not found"
    echo "   Set it in .env file or export it"
fi
echo ""

# 4. Required Environment Variables
echo "📝 Required Environment Variables"
echo "---------------------------------"
REQUIRED_VARS=("DATABASE_URL" "AUTH_SECRET" "STRIPE_SECRET_KEY" "RESEND_API_KEY")
MISSING=0

for VAR in "${REQUIRED_VARS[@]}"; do
    if [ ! -z "${!VAR}" ]; then
        echo -e "${GREEN}✓${NC} $VAR: Set"
    else
        echo -e "${RED}✗${NC} $VAR: Missing"
        MISSING=$((MISSING + 1))
    fi
done

if [ $MISSING -eq 0 ]; then
    echo -e "${GREEN}✓${NC} All required variables present"
else
    echo -e "${YELLOW}⚠${NC}  $MISSING required variable(s) missing"
fi
echo ""

# 5. Optional Environment Variables
echo "📝 Optional Environment Variables"
echo "---------------------------------"
OPTIONAL_VARS=("OPENROUTER_API_KEY" "GOOGLE_SEARCH_API_KEY" "STRIPE_WEBHOOK_SECRET")
for VAR in "${OPTIONAL_VARS[@]}"; do
    if [ ! -z "${!VAR}" ]; then
        echo -e "${BLUE}○${NC} $VAR: Set (optional)"
    else
        echo -e "${BLUE}○${NC} $VAR: Not set (optional)"
    fi
done
echo ""

# 6. GitHub CLI Status
echo "🛠️  Tools Status"
echo "---------------"
if command -v gh &> /dev/null; then
    GH_VERSION=$(gh --version 2>/dev/null | head -1 || echo "unknown")
    echo -e "${GREEN}✓${NC} GitHub CLI installed: $GH_VERSION"
    
    # Note about known issues
    if echo "$GH_VERSION" | grep -q "2\.[0-8]\."; then
        echo -e "${YELLOW}⚠${NC}  Note: GitHub CLI may show errors but commands still work"
        echo "   Secrets can be set successfully despite error messages"
    fi
else
    echo -e "${RED}✗${NC} GitHub CLI not installed"
fi

if command -v vercel &> /dev/null; then
    VERCEL_VERSION=$(vercel --version 2>/dev/null || echo "unknown")
    echo -e "${GREEN}✓${NC} Vercel CLI installed: $VERCEL_VERSION"
else
    echo -e "${RED}✗${NC} Vercel CLI not installed"
fi

if command -v jq &> /dev/null; then
    echo -e "${GREEN}✓${NC} jq installed"
else
    echo -e "${YELLOW}⚠${NC}  jq not installed (recommended for JSON parsing)"
fi
echo ""

# 7. Summary
echo "📊 Summary"
echo "=========="
if [ -f .vercel/project.json ] && [ ! -z "$GITHUB_TOKEN" ] && [ $MISSING -eq 0 ]; then
    echo -e "${GREEN}✅ All systems ready for CI/CD setup!${NC}"
    echo ""
    echo "Next steps:"
    echo "  1. Run: ./scripts/setup-github-actions.sh"
    echo "  2. Or: GITHUB_TOKEN=\$GITHUB_TOKEN ./scripts/setup-github-actions-with-pat.sh"
else
    echo -e "${YELLOW}⚠${NC}  Some items need attention before setup"
    echo ""
    if [ ! -f .vercel/project.json ]; then
        echo "  - Link Vercel project: vercel link"
    fi
    if [ -z "$GITHUB_TOKEN" ]; then
        echo "  - Set GITHUB_TOKEN in .env file"
    fi
    if [ $MISSING -gt 0 ]; then
        echo "  - Add missing environment variables to .env"
    fi
fi
echo ""

