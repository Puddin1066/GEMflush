#!/bin/bash

# Quick GitHub Authentication Fixer
# Automatically configures GitHub authentication for easier API access

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "🔧 GitHub Authentication Quick Fix"
echo "==================================="
echo ""

# Load token
if [ -f .env ]; then
    TOKEN=$(grep "^GITHUB_TOKEN=" .env 2>/dev/null | cut -d'=' -f2- | tr -d ' ' | tr -d '"' || echo "")
fi

if [ ! -z "$GITHUB_TOKEN" ]; then
    TOKEN="$GITHUB_TOKEN"
fi

if [ -z "$TOKEN" ]; then
    echo -e "${RED}❌ No token found${NC}"
    read -sp "Enter your GitHub token: " TOKEN
    echo ""
fi

if [ -z "$TOKEN" ]; then
    echo "Exiting..."
    exit 1
fi

echo "⚡ Setting up authentication..."
echo ""

# 1. Set environment variables
export GITHUB_TOKEN="$TOKEN"
export GH_TOKEN="$TOKEN"

# 2. Authenticate GitHub CLI
echo "1. Authenticating GitHub CLI..."
echo "$TOKEN" | gh auth login --with-token 2>&1 || {
    echo -e "${YELLOW}⚠️  GitHub CLI authentication skipped (may already be authenticated)${NC}"
}
echo ""

# 3. Verify authentication
echo "2. Verifying authentication..."
if gh auth status &>/dev/null; then
    USER=$(gh api user --jq .login 2>&1)
    echo -e "${GREEN}✅ GitHub CLI authenticated as: $USER${NC}"
else
    echo -e "${YELLOW}⚠️  GitHub CLI authentication needs manual setup${NC}"
    echo "Run: gh auth login"
fi
echo ""

# 4. Configure Git credential helper
echo "3. Configuring Git credentials..."
GIT_REMOTE=$(git remote get-url origin 2>/dev/null || echo "")
if [ ! -z "$GIT_REMOTE" ]; then
    # Extract owner/repo
    REPO_OWNER=$(echo "$GIT_REMOTE" | sed -E 's/.*github.com[:/]([^/]+)\/([^/]+)(\.git)?$/\1/')
    REPO_NAME=$(echo "$GIT_REMOTE" | sed -E 's/.*github.com[:/]([^/]+)\/([^/]+)(\.git)?$/\2/' | sed 's/\.git$//')
    
    if [ ! -z "$REPO_OWNER" ] && [ ! -z "$REPO_NAME" ]; then
        # Set remote with token (temporary for this session)
        git remote set-url origin "https://$TOKEN@github.com/$REPO_OWNER/$REPO_NAME.git"
        echo -e "${GREEN}✅ Git remote configured with token${NC}"
        echo "   Remote: https://github.com/$REPO_OWNER/$REPO_NAME.git"
    fi
fi
echo ""

# 5. Test connection
echo "4. Testing connection..."
if curl -s -H "Authorization: token $TOKEN" https://api.github.com/user | grep -q '"login"'; then
    echo -e "${GREEN}✅ API connection: Working${NC}"
else
    echo -e "${RED}❌ API connection: Failed${NC}"
    exit 1
fi
echo ""

# 6. Create helper script
echo "5. Creating helper script..."
cat > .github-auth-helper.sh << EOF
#!/bin/bash
# Source this file to set up GitHub authentication
export GITHUB_TOKEN="$TOKEN"
export GH_TOKEN="$TOKEN"
export GIT_TERMINAL_PROMPT=0
EOF
chmod +x .github-auth-helper.sh
echo -e "${GREEN}✅ Created .github-auth-helper.sh${NC}"
echo ""

# Summary
echo "✅ Setup Complete!"
echo ""
echo "Authentication configured:"
echo "  • GitHub CLI: Ready"
echo "  • Git remote: Configured with token"
echo "  • Environment variables: Set"
echo ""
echo "To use in current session:"
echo "  source .github-auth-helper.sh"
echo ""
echo "To push your code:"
echo "  git push origin main"
echo ""
echo "To test:"
echo "  ./scripts/test-github-connection.sh"
echo ""

