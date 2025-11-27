# GitHub CLI Authentication Explained

## How GitHub CLI Authenticates

When you run `gh auth login` **without** providing a token upfront, GitHub CLI still uses a token - it just obtains it through an **interactive authentication flow**.

---

## Authentication Methods

### **Method 1: Interactive OAuth Login** (Browser-Based)

When you run `gh auth login` without a token:

```bash
gh auth login
```

**What happens:**
1. GitHub CLI generates a one-time code
2. Opens your default browser to GitHub
3. You authenticate in the browser (login with GitHub account)
4. GitHub CLI receives an OAuth token
5. **Token is stored securely** in:
   - macOS/Linux: `~/.config/gh/hosts.yml` or system keychain
   - Windows: Credential Manager

**Result:** You're now authenticated, and the token is stored for future use.

---

### **Method 2: Token Input** (Manual)

You can also provide a token directly:

```bash
# Interactive token entry
gh auth login --with-token
# Then paste your token

# Or pipe it in
echo "your_token_here" | gh auth login --with-token

# Or from environment variable
GITHUB_TOKEN=your_token gh auth login --with-token
```

---

### **Method 3: Environment Variable** (No Login Needed)

If you set `GITHUB_TOKEN` or `GH_TOKEN`, GitHub CLI uses it automatically:

```bash
export GITHUB_TOKEN=your_personal_access_token
gh api user  # Works immediately, no login needed
```

---

## How Our Setup Scripts Handle This

### **Script Flow:**

1. **Check if already authenticated:**
   ```bash
   gh auth status  # Checks for stored token
   ```

2. **If not authenticated, check for environment variable:**
   ```bash
   if [ -z "$GITHUB_TOKEN" ]; then
       # No token in env, prompt for authentication
   fi
   ```

3. **Offer two options:**
   - **Option A:** Run `gh auth login` → Interactive OAuth flow
   - **Option B:** Provide PAT → Use token directly

---

## Token Storage

### **Where GitHub CLI Stores Tokens:**

- **macOS:** System Keychain (most secure)
- **Linux:** `~/.config/gh/hosts.yml` (encrypted)
- **Windows:** Windows Credential Manager

You can view stored credentials:
```bash
gh auth status  # Shows current authentication
cat ~/.config/gh/hosts.yml  # Linux (may require decryption)
```

---

## Personal Access Token vs OAuth Token

### **OAuth Token** (from `gh auth login`)
- ✅ Generated automatically during login
- ✅ Stored securely by GitHub CLI
- ✅ Automatically refreshed
- ✅ Scope-limited by GitHub CLI
- ❌ Not visible to you directly

### **Personal Access Token (PAT)**
- ✅ You create it manually at github.com/settings/tokens
- ✅ You control the scopes
- ✅ Can be used directly in scripts
- ✅ Visible to you (can copy/paste)
- ❌ You must manage it yourself

---

## Why Both Methods Work

Our setup scripts support both because:

1. **OAuth Token (via `gh auth login`):**
   - Easier for users who don't have a PAT
   - Secure automatic storage
   - Good for interactive use

2. **Personal Access Token (PAT):**
   - Better for automation/scripts
   - More control over scopes
   - Can be set as environment variable
   - Good for CI/CD environments

---

## Example: Using Your PAT

If you already have a GitHub PAT token:

### **Option 1: Set as Environment Variable**

```bash
export GITHUB_TOKEN=your_pat_token
./scripts/setup-github-actions.sh
```

The script will detect `GITHUB_TOKEN` and use it automatically.

### **Option 2: Quick PAT Setup Script**

```bash
GITHUB_TOKEN=your_pat_token ./scripts/setup-github-actions-with-pat.sh
```

This script is optimized for PAT-based setup.

### **Option 3: Interactive Prompt**

```bash
./scripts/setup-github-actions.sh
# When prompted, choose "Use Personal Access Token"
# Paste your token when asked
```

---

## Required Scopes

For the setup scripts to work, your token needs:

- **`repo`** - Access repositories (required for private repos)
- **`workflow`** - Update GitHub Actions workflows and secrets

You can check your token scopes:
```bash
gh auth status
```

Or via API:
```bash
gh api user -q .login
```

---

## Security Best Practices

1. **Never commit tokens to git**
   - Use environment variables
   - Use GitHub Secrets for CI/CD
   - Use GitHub CLI's secure storage

2. **Use least privilege**
   - Only grant necessary scopes
   - Use fine-grained tokens when possible

3. **Rotate tokens regularly**
   - Revoke old tokens periodically
   - Generate new ones for new uses

4. **Use different tokens for different purposes**
   - Development token (stored in CLI)
   - CI/CD token (in GitHub Secrets)
   - Service token (for integrations)

---

## Troubleshooting

### "Not authenticated" error

```bash
# Check current status
gh auth status

# Re-authenticate if needed
gh auth login

# Or use token directly
export GITHUB_TOKEN=your_token
```

### "Insufficient permissions" error

Your token needs these scopes:
- `repo` (for repository access)
- `workflow` (for managing secrets)

Create a new token with these scopes at:
https://github.com/settings/tokens

### Token not working in script

Make sure it's exported:
```bash
export GITHUB_TOKEN=your_token
# Not just: GITHUB_TOKEN=your_token (only sets for current command)
```

---

## Summary

**GitHub CLI DOES use tokens** - it just gets them through:
1. Interactive OAuth login (browser-based, automatic)
2. Manual token input (you provide it)
3. Environment variable (already set)

All methods result in a token being used, just obtained differently! 🔐

