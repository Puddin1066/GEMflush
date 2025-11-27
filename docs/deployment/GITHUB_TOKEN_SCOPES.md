# GitHub Token Scopes Required for CI/CD Setup

Based on [GitHub's official API documentation](https://docs.github.com/en/rest/quickstart), this guide specifies the exact token types and scopes needed for your CI/CD pipeline.

---

## 🔐 Token Types

### **Personal Access Token (Classic)** - Recommended for CI/CD

GitHub offers two types of personal access tokens:

1. **Classic Token** - Original token type with granular scope control
2. **Fine-Grained Token** - Newer token type (limited availability)

**For CI/CD, use a Classic Personal Access Token** because:
- ✅ Full scope control for repositories
- ✅ Compatible with all GitHub Actions features
- ✅ Works with GitHub CLI (`gh`)
- ✅ Works with Git push operations
- ✅ Established, stable API

---

## 📋 Required Scopes for CI/CD Setup

Based on GitHub's documentation, your Personal Access Token needs these scopes:

### **1. `repo` Scope** (Required) ⭐

**What it does:**
- Full control of private repositories
- Push, pull, clone repositories
- Access repository contents
- Manage repository settings

**Required for:**
- ✅ Pushing commits to your repository
- ✅ GitHub Actions workflows
- ✅ Managing repository secrets
- ✅ Reading/writing repository content

**How to check:** Your token must have `repo` scope checked when creating it.

**Reference:** [GitHub API - Repository permissions](https://docs.github.com/en/rest/overview/permissions-required-for-fine-grained-personal-access-tokens)

---

### **2. `workflow` Scope** (Required) ⭐

**What it does:**
- Update GitHub Action workflows
- Create and modify workflow files
- Trigger workflow runs

**Required for:**
- ✅ Setting up GitHub Actions workflows
- ✅ Managing CI/CD pipelines
- ✅ Triggering deployments
- ✅ Managing workflow files in `.github/workflows/`

**How to check:** Your token must have `workflow` scope checked when creating it.

**Reference:** Based on [GitHub Actions Importer documentation](https://docs.github.com/en/enterprise-cloud@latest/actions/tutorials/migrate-to-github-actions/automated-migrations/azure-devops-migration) which requires `workflow` scope for migration and setup.

---

### **3. Optional but Recommended Scopes**

#### **`read:org` Scope** (If using organization repositories)
- Read organization membership
- Access organization repositories
- Useful if your repo is in an organization

#### **`admin:repo_hook` Scope** (For webhooks)
- Create and manage repository webhooks
- Required if you need webhook management
- Not required for basic CI/CD setup

---

## 🎯 Creating a Token with Correct Scopes

### **Step-by-Step: Create Classic Personal Access Token**

1. **Go to GitHub Token Settings:**
   - Visit: https://github.com/settings/tokens
   - Or: GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)

2. **Click "Generate new token" → "Generate new token (classic)"**

3. **Configure Token:**
   ```
   Note: GitHub Actions CI/CD Setup
   Expiration: 90 days (or No expiration if preferred)
   ```

4. **Select Required Scopes:**
   - ✅ **`repo`** (Full control of private repositories)
     - ✅ repo:status
     - ✅ repo_deployment
     - ✅ public_repo (if repository is public)
     - ✅ repo:invite
     - ✅ security_events
   
   - ✅ **`workflow`** (Update GitHub Action workflows)
   
   - Optional: **`read:org`** (if using organization)

5. **Generate Token:**
   - Click "Generate token"
   - **IMPORTANT:** Copy the token immediately (you won't see it again!)
   - Token format: `ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

6. **Save Token:**
   - Add to your `.env` file: `GITHUB_TOKEN=ghp_xxxxxxxxxxxx`
   - Or use it immediately with GitHub CLI

---

## 🔍 Verifying Token Scopes

### **Using GitHub CLI:**

```bash
# Authenticate with your token
export GITHUB_TOKEN=your_token_here
gh auth login --with-token <<< "$GITHUB_TOKEN"

# Check token permissions
gh auth status

# Test repository access
gh api user
gh api repos/OWNER/REPO
```

### **Using GitHub API Directly:**

```bash
# Test token (returns token scopes)
curl -H "Authorization: token YOUR_TOKEN" \
     https://api.github.com/user

# Check if token has repo access
curl -H "Authorization: token YOUR_TOKEN" \
     https://api.github.com/user/repos

# Check if token has workflow access
curl -H "Authorization: token YOUR_TOKEN" \
     -H "Accept: application/vnd.github.v3+json" \
     https://api.github.com/repos/OWNER/REPO/actions/workflows
```

---

## 📝 Token Scope Reference Table

| Scope | Required | Purpose | Used For |
|-------|----------|---------|----------|
| `repo` | ✅ **Yes** | Full repository access | Push code, manage secrets, read/write |
| `workflow` | ✅ **Yes** | GitHub Actions workflows | Setup CI/CD, manage workflows |
| `read:org` | ⚠️ Optional | Organization access | If repo is in an organization |
| `admin:repo_hook` | ⚠️ Optional | Webhook management | Webhook setup (not needed for basic CI/CD) |

---

## 🚀 Using Your Token

### **Method 1: Environment Variable**

```bash
# Set in your shell
export GITHUB_TOKEN=ghp_xxxxxxxxxxxx

# Or add to .env file
echo "GITHUB_TOKEN=ghp_xxxxxxxxxxxx" >> .env
```

### **Method 2: GitHub CLI Authentication**

```bash
# Authenticate GitHub CLI
echo "ghp_xxxxxxxxxxxx" | gh auth login --with-token

# Verify
gh auth status
```

### **Method 3: Git Operations**

```bash
# Use token in Git remote URL (temporary)
git remote set-url origin https://ghp_xxxxxxxxxxxx@github.com/OWNER/REPO.git

# Or configure Git credential helper
git config --global credential.helper store
echo "https://ghp_xxxxxxxxxxxx@github.com" >> ~/.git-credentials
```

---

## ⚠️ Security Best Practices

### **Token Security:**

1. **Never commit tokens to Git:**
   - ✅ Use `.env` file (already in `.gitignore`)
   - ✅ Use GitHub Secrets for workflows
   - ❌ Never hardcode in source code

2. **Token Expiration:**
   - Set expiration (90 days recommended)
   - Rotate tokens regularly
   - Revoke unused tokens

3. **Least Privilege:**
   - Only grant necessary scopes
   - Don't grant admin access unless needed
   - Use fine-grained tokens when available

4. **Token Storage:**
   - Store in secure password manager
   - Use GitHub Secrets for CI/CD
   - Never share tokens publicly

---

## 🔧 Troubleshooting

### **Error: "Permission denied (publickey)"**

**Cause:** Token doesn't have `repo` scope or wrong authentication method.

**Fix:**
```bash
# Verify token has repo scope
curl -H "Authorization: token YOUR_TOKEN" https://api.github.com/user

# Check scopes in response headers
curl -I -H "Authorization: token YOUR_TOKEN" https://api.github.com/user
# Look for: X-OAuth-Scopes: repo, workflow
```

---

### **Error: "Resource not accessible by integration"**

**Cause:** Token doesn't have `workflow` scope.

**Fix:**
1. Create new token with `workflow` scope
2. Update `.env` file
3. Re-authenticate GitHub CLI

---

### **Error: "Bad credentials"**

**Cause:** Token expired or invalid.

**Fix:**
1. Check token expiration date
2. Create new token if expired
3. Update your `.env` file

---

## 📚 Official GitHub Documentation References

- [Creating a Personal Access Token](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token)
- [Token Scopes](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/scopes-for-oauth-apps)
- [GitHub REST API Quickstart](https://docs.github.com/en/rest/quickstart)
- [Authenticating with GitHub Actions](https://docs.github.com/en/actions/security-guides/automatic-token-authentication)
- [GitHub Actions Importer - Token Requirements](https://docs.github.com/en/enterprise-cloud@latest/actions/tutorials/migrate-to-github-actions/automated-migrations/azure-devops-migration)

---

## ✅ Quick Checklist

Before using your token for CI/CD:

- [ ] Token type: **Classic Personal Access Token**
- [ ] Scope: **`repo`** (full control) ✅
- [ ] Scope: **`workflow`** (GitHub Actions) ✅
- [ ] Token saved securely (`.env` file, not committed)
- [ ] Token tested: `gh auth status` works
- [ ] Token can push: `git push` works

---

## 🎯 Summary

For your CI/CD setup, you need:

1. **Classic Personal Access Token** (not fine-grained)
2. **Required Scopes:**
   - ✅ `repo` - Full repository control
   - ✅ `workflow` - GitHub Actions management
3. **Token Format:** `ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
4. **Storage:** In `.env` file (not committed to Git)

**Create your token at:** https://github.com/settings/tokens/new

---

**Your current token might be missing the `workflow` scope.** Check by running:

```bash
gh auth status
```

If workflow scope is missing, create a new token with both `repo` and `workflow` scopes.

