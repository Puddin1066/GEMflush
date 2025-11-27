#!/bin/bash

# Check GitHub Token Permissions
# Diagnoses exactly what permissions your token has

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "🔍 GitHub Token Permission Checker"
echo "===================================="
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
    exit 1
fi

# Detect token type
TOKEN_PREFIX=$(echo "$TOKEN" | cut -c1-10)
if [[ "$TOKEN" == github_pat_* ]]; then
    TOKEN_TYPE="Fine-Grained"
elif [[ "$TOKEN" == ghp_* ]]; then
    TOKEN_TYPE="Classic"
else
    TOKEN_TYPE="Unknown"
fi

echo "Token Type: $TOKEN_TYPE"
echo ""

# Test 1: Basic authentication
echo "1️⃣  Testing authentication..."
USER_INFO=$(curl -s -H "Authorization: token $TOKEN" https://api.github.com/user)
USER_LOGIN=$(echo "$USER_INFO" | grep -o '"login":"[^"]*"' | head -1 | cut -d'"' -f4 || echo "")

if [ ! -z "$USER_LOGIN" ]; then
    echo -e "${GREEN}✅ Authenticated as: $USER_LOGIN${NC}"
else
    echo -e "${RED}❌ Authentication failed${NC}"
    exit 1
fi
echo ""

# Test 2: Check scopes (Classic token)
if [ "$TOKEN_TYPE" = "Classic" ]; then
    echo "2️⃣  Checking Classic Token Scopes..."
    SCOPES=$(curl -s -I -H "Authorization: token $TOKEN" https://api.github.com/user | grep -i "x-oauth-scopes:" | cut -d: -f2 | xargs || echo "")
    
    if [ ! -z "$SCOPES" ]; then
        echo "Scopes: $SCOPES"
        
        if echo "$SCOPES" | grep -q "repo"; then
            echo -e "${GREEN}✅ repo scope: Present${NC}"
        else
            echo -e "${RED}❌ repo scope: MISSING (required for push)${NC}"
        fi
        
        if echo "$SCOPES" | grep -q "workflow"; then
            echo -e "${GREEN}✅ workflow scope: Present${NC}"
        else
            echo -e "${YELLOW}⚠️  workflow scope: Missing (optional)${NC}"
        fi
    else
        echo -e "${YELLOW}⚠️  Could not read scopes${NC}"
    fi
fi

# Test 3: Check permissions (Fine-grained token)
if [ "$TOKEN_TYPE" = "Fine-Grained" ]; then
    echo "2️⃣  Checking Fine-Grained Token Permissions..."
    PERMS=$(curl -s -H "Authorization: token $TOKEN" https://api.github.com/user | jq -r '.permissions' 2>/dev/null || echo "")
    
    if [ ! -z "$PERMS" ] && [ "$PERMS" != "null" ]; then
        echo "Permissions:"
        echo "$PERMS" | jq '.' 2>/dev/null || echo "$PERMS"
        
        # Check for Contents write
        CONTENTS_WRITE=$(echo "$PERMS" | jq -r '.contents' 2>/dev/null || echo "")
        if [ "$CONTENTS_WRITE" = "write" ]; then
            echo -e "${GREEN}✅ Contents: Write (can push)${NC}"
        else
            echo -e "${RED}❌ Contents: $CONTENTS_WRITE (needs 'write' for push)${NC}"
        fi
        
        # Check for Workflows write
        WORKFLOWS_WRITE=$(echo "$PERMS" | jq -r '.workflows' 2>/dev/null || echo "")
        if [ "$WORKFLOWS_WRITE" = "write" ]; then
            echo -e "${GREEN}✅ Workflows: Write${NC}"
        else
            echo -e "${YELLOW}⚠️  Workflows: $WORKFLOWS_WRITE${NC}"
        fi
    else
        echo -e "${YELLOW}⚠️  Could not read permissions${NC}"
    fi
fi
echo ""

# Test 4: Test write access
echo "3️⃣  Testing write access..."
REPO_TEST=$(curl -s -X GET -H "Authorization: token $TOKEN" \
    "https://api.github.com/repos/Puddin1066/GEMflush" 2>&1)

if echo "$REPO_TEST" | grep -q '"permissions"'; then
    PUSH_PERM=$(echo "$REPO_TEST" | jq -r '.permissions.push' 2>/dev/null || echo "")
    if [ "$PUSH_PERM" = "true" ]; then
        echo -e "${GREEN}✅ Repository push permission: Granted${NC}"
    else
        echo -e "${RED}❌ Repository push permission: Denied${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  Could not check repository permissions${NC}"
fi
echo ""

# Test 5: Try Git operations
echo "4️⃣  Testing Git push capability..."
GIT_TEST=$(git ls-remote "https://${TOKEN}@github.com/Puddin1066/GEMflush.git" HEAD 2>&1)
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Git read access: OK${NC}"
else
    echo -e "${RED}❌ Git read access: Failed${NC}"
    echo "Error: $GIT_TEST"
fi
echo ""

# Summary
echo "📊 Summary"
echo "=========="
echo ""
echo "Token Type: $TOKEN_TYPE"
echo "User: $USER_LOGIN"
echo ""

if [ "$TOKEN_TYPE" = "Classic" ]; then
    if echo "$SCOPES" | grep -q "repo"; then
        echo -e "${GREEN}✅ Token has correct permissions for push${NC}"
        echo ""
        echo "If push still fails, try:"
        echo "  1. Clear Git credential cache"
        echo "  2. Use: git remote set-url origin https://\${TOKEN}@github.com/OWNER/REPO.git"
        echo "  3. Or use SSH keys instead"
    else
        echo -e "${RED}❌ Token missing 'repo' scope${NC}"
        echo ""
        echo "Fix: Create new token at https://github.com/settings/tokens/new"
        echo "     Select: 'Generate new token (classic)'"
        echo "     Check: 'repo' scope"
    fi
elif [ "$TOKEN_TYPE" = "Fine-Grained" ]; then
    if [ "$CONTENTS_WRITE" = "write" ]; then
        echo -e "${GREEN}✅ Token has Contents write permission${NC}"
        echo ""
        echo "If push still fails, the token may need to be recreated with:"
        echo "  - Contents → Write"
        echo "  - Workflows → Write"
        echo "  - Secrets → Write"
    else
        echo -e "${RED}❌ Token missing Contents write permission${NC}"
        echo ""
        echo "Fix: Fine-grained tokens cannot be updated. Create a NEW token:"
        echo "  1. Go to: https://github.com/settings/tokens/new"
        echo "  2. Select: 'Generate new token (fine-grained)'"
        echo "  3. Set: Contents → Write"
        echo "  4. Set: Workflows → Write"
        echo "  5. Set: Secrets → Write"
    fi
fi
echo ""

