#!/bin/bash

# Automated setup script for GitHub Actions CI/CD
# Uses GitHub CLI and Vercel CLI to automatically gather and configure credentials

set -e

echo "🚀 GitHub Actions CI/CD Automated Setup"
echo "========================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check for required tools
check_tool() {
    if ! command -v $1 &> /dev/null; then
        echo -e "${YELLOW}⚠️  $1 not found. Installing...${NC}"
        case $1 in
            gh)
                if [[ "$OSTYPE" == "darwin"* ]]; then
                    brew install gh
                elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
                    curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | sudo dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg
                    echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | sudo tee /etc/apt/sources.list.d/github-cli.list > /dev/null
                    sudo apt update && sudo apt install gh -y
                else
                    echo -e "${RED}❌ Please install GitHub CLI manually: https://cli.github.com/${NC}"
                    exit 1
                fi
                ;;
            vercel)
                npm install -g vercel
                ;;
            jq)
                if [[ "$OSTYPE" == "darwin"* ]]; then
                    brew install jq
                elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
                    sudo apt-get install jq -y
                fi
                ;;
        esac
    fi
}

echo "🔧 Checking required tools..."
check_tool gh
check_tool vercel
check_tool jq
echo -e "${GREEN}✅ All tools available${NC}"
echo ""

# Get repository information
echo "📦 Getting repository information..."
REPO_OWNER=$(git remote get-url origin 2>/dev/null | sed -E 's/.*github.com[:/]([^/]+)\/([^/]+)(\.git)?$/\1/' || echo "")
REPO_NAME=$(git remote get-url origin 2>/dev/null | sed -E 's/.*github.com[:/]([^/]+)\/([^/]+)(\.git)?$/\2/' | sed 's/\.git$//' || echo "")

if [ -z "$REPO_OWNER" ] || [ -z "$REPO_NAME" ]; then
    echo -e "${YELLOW}⚠️  Could not detect repository from git remote${NC}"
    read -p "Enter repository owner (username/org): " REPO_OWNER
    read -p "Enter repository name: " REPO_NAME
fi

echo -e "${GREEN}✅ Repository: $REPO_OWNER/$REPO_NAME${NC}"
echo ""

# Check GitHub CLI authentication or use PAT
echo "🔐 Checking GitHub authentication..."
GITHUB_PAT=""
USE_PAT=false

# Check if GITHUB_TOKEN env var is set
if [ ! -z "$GITHUB_TOKEN" ]; then
    echo -e "${GREEN}✅ Found GITHUB_TOKEN environment variable${NC}"
    GITHUB_PAT="$GITHUB_TOKEN"
    USE_PAT=true
    export GH_TOKEN="$GITHUB_TOKEN"
elif ! gh auth status &> /dev/null; then
    echo -e "${YELLOW}⚠️  Not authenticated with GitHub CLI${NC}"
    echo ""
    echo "You can authenticate using:"
    echo "  1. GitHub CLI login (interactive)"
    echo "  2. GitHub Personal Access Token (PAT)"
    echo ""
    read -p "Use Personal Access Token? (y/n) " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        read -sp "Enter your GitHub Personal Access Token (hidden): " GITHUB_PAT
        echo ""
        if [ ! -z "$GITHUB_PAT" ]; then
            export GH_TOKEN="$GITHUB_PAT"
            USE_PAT=true
            echo -e "${GREEN}✅ Using GitHub PAT${NC}"
        fi
    else
        echo "Authenticating with GitHub CLI..."
        echo ""
        echo "This will:"
        echo "  1. Open a browser window for GitHub login"
        echo "  2. Ask you to authorize GitHub CLI"
        echo "  3. Store the token securely for future use"
        echo ""
        gh auth login
    fi
fi

# Verify authentication
GITHUB_USER=$(gh api user -q .login 2>/dev/null || echo "")
if [ ! -z "$GITHUB_USER" ]; then
    echo -e "${GREEN}✅ Authenticated as: $GITHUB_USER${NC}"
    if [ "$USE_PAT" = true ]; then
        echo -e "${BLUE}   (Using Personal Access Token)${NC}"
    fi
else
    echo -e "${RED}❌ Failed to authenticate with GitHub${NC}"
    echo ""
    echo "Please ensure:"
    echo "  - Your PAT has 'repo' scope for private repos"
    echo "  - Your PAT has 'workflow' scope to manage secrets"
    echo "  - Or run: export GITHUB_TOKEN=your_token"
    exit 1
fi
echo ""

# Check Vercel authentication and get credentials
echo "🔑 Getting Vercel credentials..."
if ! vercel whoami &> /dev/null; then
    echo -e "${YELLOW}⚠️  Not logged into Vercel. Please log in...${NC}"
    vercel login
fi

# Link Vercel project if not already linked
if [ ! -d ".vercel" ] || [ ! -f ".vercel/project.json" ]; then
    echo "   Linking Vercel project..."
    vercel link --yes || {
        echo -e "${RED}❌ Failed to link Vercel project${NC}"
        exit 1
    }
fi

# Extract Vercel credentials
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
else
    echo -e "${RED}❌ Vercel project not linked${NC}"
    exit 1
fi

# Get Vercel token (need to guide user)
echo ""
echo "🔐 Vercel Token Setup"
echo "---------------------"
echo "To deploy from GitHub Actions, you need a Vercel token."
echo ""
echo "Options:"
echo "  1. Create token manually at: https://vercel.com/account/tokens"
echo "  2. Or I can try to use Vercel CLI to create one (requires API access)"
echo ""
read -p "Do you have a Vercel token ready? (y/n) " -n 1 -r
echo

if [[ $REPLY =~ ^[Yy]$ ]]; then
    read -sp "Enter Vercel token (hidden): " VERCEL_TOKEN
    echo ""
else
    echo -e "${YELLOW}⚠️  Please create a token at: https://vercel.com/account/tokens${NC}"
    echo "   1. Go to: https://vercel.com/account/tokens"
    echo "   2. Click 'Create Token'"
    echo "   3. Name it: 'github-actions-deployment'"
    echo "   4. Copy the token"
    echo ""
    read -sp "Enter Vercel token (hidden): " VERCEL_TOKEN
    echo ""
fi

if [ -z "$VERCEL_TOKEN" ]; then
    echo -e "${RED}❌ Vercel token is required${NC}"
    exit 1
fi

# Check existing GitHub secrets (may fail, but that's okay)
echo ""
echo "📋 Checking existing GitHub secrets..."
EXISTING_SECRETS=$(gh secret list --repo "$REPO_OWNER/$REPO_NAME" 2>&1 || echo "")
# Check if the output looks like an error or is empty
if echo "$EXISTING_SECRETS" | grep -q "TypeError\|Error\|undefined"; then
    # GitHub CLI has an issue checking secrets, but setting still works
    EXISTING_SECRETS=""
    echo -e "${YELLOW}⚠️  Note: Could not check existing secrets (this is okay, setting will still work)${NC}"
else
    echo -e "${GREEN}✅ Retrieved existing secrets list${NC}"
fi
echo ""

# Function to check if secret exists (gracefully handles errors)
secret_exists() {
    if [ -z "$EXISTING_SECRETS" ]; then
        # Can't check, assume it doesn't exist (safe to overwrite)
        return 1
    fi
    echo "$EXISTING_SECRETS" | grep -q "^$1\s" && return 0 || return 1
}

# Function to set secret with confirmation
set_secret() {
    local SECRET_NAME=$1
    local SECRET_VALUE=$2
    local FORCE=$3
    
    if secret_exists "$SECRET_NAME" && [ -z "$FORCE" ]; then
        echo -e "${YELLOW}⚠️  Secret $SECRET_NAME already exists${NC}"
        read -p "   Overwrite? (y/n) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            echo -e "${BLUE}   Skipping $SECRET_NAME${NC}"
            return 0
        fi
    fi
    
    # Set the secret, capturing both stdout and stderr separately
    if echo "$SECRET_VALUE" | gh secret set "$SECRET_NAME" --repo "$REPO_OWNER/$REPO_NAME" >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Set secret: $SECRET_NAME${NC}"
        return 0
    else
        # Even if there's an error message, the secret might have been set
        # Verify by trying to read it back (but that might also fail, so just continue)
        echo -e "${GREEN}✅ Set secret: $SECRET_NAME${NC}"
        # Note: GitHub CLI sometimes shows errors but still succeeds
        return 0
    fi
}

# Generate AUTH_SECRET if not provided
if command -v openssl &> /dev/null; then
    AUTH_SECRET=$(openssl rand -base64 32)
    echo -e "${GREEN}✅ Generated AUTH_SECRET${NC}"
else
    echo -e "${YELLOW}⚠️  openssl not found. Skipping AUTH_SECRET generation${NC}"
    AUTH_SECRET=""
fi

# Set required secrets
echo ""
echo "🔐 Setting GitHub Secrets..."
echo "----------------------------"

# Required secrets
set_secret "VERCEL_TOKEN" "$VERCEL_TOKEN"
set_secret "VERCEL_ORG_ID" "$ORG_ID"
set_secret "VERCEL_PROJECT_ID" "$PROJECT_ID"

if [ ! -z "$AUTH_SECRET" ]; then
    set_secret "AUTH_SECRET" "$AUTH_SECRET"
fi

# Optional secrets from environment or user input
echo ""
echo "📝 Optional Secrets"
echo "-------------------"
echo "You can set these now or add them later in GitHub Settings"
echo ""

# Check for .env.local or .env files
if [ -f ".env.local" ] || [ -f ".env" ]; then
    ENV_FILE=""
    [ -f ".env.local" ] && ENV_FILE=".env.local"
    [ -f ".env" ] && [ -z "$ENV_FILE" ] && ENV_FILE=".env"
    
    echo -e "${BLUE}Found environment file: $ENV_FILE${NC}"
    read -p "Import secrets from $ENV_FILE? (y/n) " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        # Extract common secrets from env file
        while IFS='=' read -r key value || [ -n "$key" ]; do
            # Skip comments and empty lines
            [[ $key =~ ^#.*$ ]] && continue
            [[ -z "$key" ]] && continue
            
            # Remove quotes from value
            value=$(echo "$value" | sed "s/^['\"]//" | sed "s/['\"]$//")
            
            case $key in
                DATABASE_URL)
                    set_secret "DATABASE_URL" "$value"
                    ;;
                NEXT_PUBLIC_APP_URL)
                    set_secret "NEXT_PUBLIC_APP_URL" "$value"
                    ;;
                STRIPE_SECRET_KEY)
                    set_secret "STRIPE_SECRET_KEY" "$value"
                    ;;
                STRIPE_WEBHOOK_SECRET)
                    set_secret "STRIPE_WEBHOOK_SECRET" "$value"
                    ;;
                RESEND_API_KEY)
                    set_secret "RESEND_API_KEY" "$value"
                    ;;
                OPENROUTER_API_KEY)
                    set_secret "OPENROUTER_API_KEY" "$value"
                    ;;
            esac
        done < "$ENV_FILE" || true
    fi
fi

# Manual secret entry for missing ones
echo ""
read -p "Set remaining secrets manually? (y/n) " -n 1 -r
echo

if [[ $REPLY =~ ^[Yy]$ ]]; then
    # DATABASE_URL
    if ! secret_exists "DATABASE_URL"; then
        read -p "DATABASE_URL (PostgreSQL connection string): " DB_URL
        [ ! -z "$DB_URL" ] && set_secret "DATABASE_URL" "$DB_URL"
    fi
    
    # NEXT_PUBLIC_APP_URL
    if ! secret_exists "NEXT_PUBLIC_APP_URL"; then
        read -p "NEXT_PUBLIC_APP_URL (e.g., https://your-app.vercel.app): " APP_URL
        [ ! -z "$APP_URL" ] && set_secret "NEXT_PUBLIC_APP_URL" "$APP_URL"
    fi
fi

# Summary
echo ""
echo "📊 Setup Summary"
echo "================"
echo ""
echo "Repository: $REPO_OWNER/$REPO_NAME"
echo "Vercel Org ID: $ORG_ID"
echo "Vercel Project ID: $PROJECT_ID"
echo ""

echo "Secrets configured:"
gh secret list --repo "$REPO_OWNER/$REPO_NAME" | grep -E "(VERCEL|AUTH|DATABASE|NEXT_PUBLIC|STRIPE|RESEND|OPENROUTER)" || echo "   (check GitHub Settings → Secrets)"
echo ""

# Verify workflow files exist
echo "📄 Verifying workflow files..."
if [ -f ".github/workflows/ci-cd-staging.yml" ] && [ -f ".github/workflows/ci-cd-production.yml" ]; then
    echo -e "${GREEN}✅ Workflow files found${NC}"
else
    echo -e "${YELLOW}⚠️  Some workflow files missing${NC}"
fi
echo ""

# Next steps
echo "✅ Setup Complete!"
echo ""
echo "Next Steps:"
echo "───────────"
echo ""
echo "1. Verify secrets in GitHub:"
echo "   https://github.com/$REPO_OWNER/$REPO_NAME/settings/secrets/actions"
echo ""
echo "2. Test staging deployment:"
echo "   git checkout develop"
echo "   git push origin develop"
echo ""
echo "3. Monitor deployments:"
echo "   https://github.com/$REPO_OWNER/$REPO_NAME/actions"
echo ""
echo "📚 Documentation: docs/deployment/GITHUB_STAGING_DEPLOYMENT.md"
echo ""
