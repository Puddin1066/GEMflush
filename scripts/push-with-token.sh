#!/bin/bash

# Direct Push Script - Bypasses Git credential issues
# Uses token directly in Git operations

set -e

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "🚀 Direct Push Script"
echo "===================="
echo ""

# Get token
if [ -f .env ]; then
    TOKEN=$(grep "^GITHUB_TOKEN=" .env 2>/dev/null | cut -d'=' -f2- | tr -d ' ' | tr -d '"' || echo "")
fi

if [ ! -z "$GITHUB_TOKEN" ]; then
    TOKEN="$GITHUB_TOKEN"
fi

if [ -z "$TOKEN" ]; then
    echo -e "${RED}❌ No token found${NC}"
    exit 1
fi

# Check if we have commits to push
AHEAD=$(git rev-list --count origin/main..HEAD 2>/dev/null || echo "0")
if [ "$AHEAD" = "0" ]; then
    echo -e "${YELLOW}No commits to push${NC}"
    exit 0
fi

echo "📦 Commits to push: $AHEAD"
echo ""

# Get repo info
REPO_URL=$(git remote get-url origin 2>/dev/null || echo "")
if [[ "$REPO_URL" == *"github.com"* ]]; then
    # Extract owner/repo from URL
    OWNER_REPO=$(echo "$REPO_URL" | sed -E 's/.*github.com[:/]([^/]+\/[^/]+)(\.git)?$/\1/')
else
    echo -e "${RED}❌ Could not determine repository${NC}"
    exit 1
fi

echo "📋 Repository: $OWNER_REPO"
echo ""

# Method 1: Use credential helper with token
echo "1️⃣  Trying credential helper method..."
git config credential.helper '!f() { echo "username=Puddin1066"; echo "password='$TOKEN'"; }; f'

# Set remote with clean URL
git remote set-url origin "https://github.com/$OWNER_REPO.git"

# Try push
if git push origin main 2>&1; then
    echo -e "${GREEN}✅ Push successful!${NC}"
    exit 0
fi

# Method 2: Use token in URL (encoded)
echo ""
echo "2️⃣  Trying token-in-URL method..."
ENCODED_TOKEN=$(printf '%s' "$TOKEN" | jq -sRr @uri)
git remote set-url origin "https://${TOKEN}@github.com/$OWNER_REPO.git"

if git push origin main 2>&1; then
    echo -e "${GREEN}✅ Push successful!${NC}"
    exit 0
fi

# Method 3: Use GIT_ASKPASS
echo ""
echo "3️⃣  Trying GIT_ASKPASS method..."
cat > /tmp/git-askpass.sh << 'EOF'
#!/bin/bash
case "$1" in
    Username*) echo "Puddin1066" ;;
    Password*) cat /tmp/git-token.txt ;;
esac
EOF
chmod +x /tmp/git-askpass.sh
echo "$TOKEN" > /tmp/git-token.txt

export GIT_ASKPASS=/tmp/git-askpass.sh
export GIT_TERMINAL_PROMPT=0

if git push origin main 2>&1; then
    echo -e "${GREEN}✅ Push successful!${NC}"
    rm -f /tmp/git-askpass.sh /tmp/git-token.txt
    exit 0
fi

# If all methods fail
echo ""
echo -e "${RED}❌ All push methods failed${NC}"
echo ""
echo "The token may not have the required permissions."
echo "Please check:"
echo "  1. Token has 'repo' scope at: https://github.com/settings/tokens"
echo "  2. Token is not expired"
echo "  3. You have write access to $OWNER_REPO"
echo ""
echo "Alternative: Use GitHub Desktop or SSH keys"

