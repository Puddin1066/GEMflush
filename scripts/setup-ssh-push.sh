#!/bin/bash

# Setup SSH for GitHub Push
# This script configures SSH keys for reliable GitHub pushing

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "🔑 SSH Key Setup for GitHub Push"
echo "=================================="
echo ""

# Check if SSH key exists
SSH_KEY="$HOME/.ssh/id_ed25519_github"
if [ -f "${SSH_KEY}.pub" ]; then
    echo -e "${GREEN}✅ SSH key already exists${NC}"
    echo ""
    echo "Your public key:"
    cat "${SSH_KEY}.pub"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    read -p "Have you added this key to GitHub? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo ""
        echo "Add it at: https://github.com/settings/keys"
        echo "Then run this script again."
        exit 0
    fi
else
    echo "Generating SSH key..."
    ssh-keygen -t ed25519 -C "Puddin1066@github" -f "$SSH_KEY" -N ""
    echo -e "${GREEN}✅ SSH key generated${NC}"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "📋 Your public key:"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    cat "${SSH_KEY}.pub"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "Add this key to GitHub:"
    echo "  1. Go to: https://github.com/settings/keys"
    echo "  2. Click 'New SSH key'"
    echo "  3. Paste the key above"
    echo "  4. Title: 'MacBook - GEMflush CI/CD'"
    echo "  5. Click 'Add SSH key'"
    echo ""
    read -p "Press Enter after adding the key to GitHub..."
fi

# Configure SSH for GitHub
echo ""
echo "Configuring SSH for GitHub..."
mkdir -p ~/.ssh
chmod 700 ~/.ssh

# Add to SSH config if not already there
if ! grep -q "Host github.com" ~/.ssh/config 2>/dev/null; then
    cat >> ~/.ssh/config << EOF

Host github.com
    HostName github.com
    User git
    IdentityFile ${SSH_KEY}
    IdentitiesOnly yes
EOF
    echo -e "${GREEN}✅ SSH config updated${NC}"
else
    echo -e "${BLUE}ℹ️  SSH config already has github.com entry${NC}"
fi

chmod 600 ~/.ssh/config

# Test SSH connection
echo ""
echo "Testing SSH connection..."
if ssh -T git@github.com 2>&1 | grep -q "successfully authenticated"; then
    echo -e "${GREEN}✅ SSH connection successful!${NC}"
elif ssh -T git@github.com 2>&1 | grep -q "Hi Puddin1066"; then
    echo -e "${GREEN}✅ SSH connection successful!${NC}"
else
    echo -e "${YELLOW}⚠️  SSH connection test inconclusive${NC}"
    echo "This is normal - GitHub doesn't provide shell access"
fi

# Update Git remote
echo ""
echo "Updating Git remote to use SSH..."
git remote set-url origin git@github.com:Puddin1066/GEMflush.git
echo -e "${GREEN}✅ Remote updated to SSH${NC}"

# Try push
echo ""
echo "Attempting push via SSH..."
if git push origin main 2>&1; then
    echo ""
    echo -e "${GREEN}🎉 SUCCESS! Push completed via SSH!${NC}"
else
    echo ""
    echo -e "${YELLOW}⚠️  Push failed, but SSH is configured${NC}"
    echo "Check the error message above"
fi

