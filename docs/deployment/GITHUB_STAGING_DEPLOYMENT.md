# 🚀 GitHub Actions Staging Deployment Guide

This guide explains how to use GitHub Actions as a staging path for deployments to Vercel.

---

## 📋 Overview

Your project now uses **GitHub Actions** as a CI/CD pipeline that:
1. ✅ Runs tests and quality checks
2. ✅ Builds your application
3. ✅ Automatically deploys to Vercel staging/preview environments
4. ✅ Provides deployment URLs and status updates

---

## 🔄 Deployment Flow

### **Staging Environment** (develop/staging branches)

```
Developer pushes to `develop` or `staging` branch
         ↓
GitHub Actions runs:
  ├─ Lint check
  ├─ Type check  
  ├─ Unit tests
  ├─ Build application
         ↓
✅ If all checks pass:
  ├─ Deploy to Vercel Preview/Staging
  └─ Get preview URL
```

### **Production Environment** (main branch)

```
Developer pushes to `main` branch
         ↓
GitHub Actions runs:
  ├─ Lint check
  ├─ Type check
  ├─ Unit tests
  ├─ Build application
         ↓
✅ If all checks pass:
  ├─ Deploy to Vercel Production
  └─ Get production URL
```

---

## 🛠️ Setup Instructions

### **Step 1: Verify GitHub Token Scopes**

**IMPORTANT:** Your GitHub Personal Access Token must have the correct scopes.

**Required Scopes:**
- ✅ **`repo`** - Full control of private repositories (for pushing code and managing secrets)
- ✅ **`workflow`** - Update GitHub Action workflows (for CI/CD setup)

**Check Your Token:**
```bash
gh auth status
```

**If your token is missing scopes:**
1. Create new token: https://github.com/settings/tokens/new
2. Select: **Classic Personal Access Token**
3. Check: **`repo`** and **`workflow`** scopes
4. Update `.env`: `GITHUB_TOKEN=your_new_token`
5. Re-authenticate: `gh auth login --with-token <<< "$GITHUB_TOKEN"`

📚 **See:** `docs/deployment/GITHUB_TOKEN_SCOPES.md` for complete token setup guide.

---

### **Step 2: Get Vercel Credentials**

You need three pieces of information from Vercel:

1. **Vercel Token**
   - Go to: https://vercel.com/account/tokens
   - Click "Create Token"
   - Name it: `github-actions-deployment`
   - Copy the token (starts with `vercel_...`)

2. **Vercel Organization ID**
   - Go to: https://vercel.com/account
   - Click on your organization
   - Check the URL: `https://vercel.com/[ORG_ID]/...`
   - Or run locally: `vercel whoami` then check `.vercel/project.json`

3. **Vercel Project ID**
   - Go to your project in Vercel dashboard
   - Go to Settings → General
   - Find "Project ID" (or check `.vercel/project.json` locally)

**Quick method to get all three:**

The automated setup script (Option A above) handles this automatically. For manual setup:

```bash
# Install Vercel CLI if needed
npm install -g vercel

# Login to Vercel
vercel login

# Link your project (if not already linked)
vercel link

# Check the generated config file
cat .vercel/project.json
```

You'll see:
```json
{
  "orgId": "team_xxxxx",
  "projectId": "prj_xxxxx"
}
```

For the token, create it at: https://vercel.com/account/tokens

**Note:** The automated script uses GitHub CLI (`gh`) and Vercel CLI to automatically retrieve these values and set them as secrets.

---

### **Step 2: Add GitHub Secrets**

**Option A: Automated Setup (Recommended)** ⭐

Use the automated setup script that uses GitHub CLI and Vercel CLI to gather credentials automatically:

**Authentication Options:**

1. **Using Your GitHub PAT Token** (if you have one):
   ```bash
   export GITHUB_TOKEN=your_pat_token
   ./scripts/setup-github-actions.sh
   ```
   The script will automatically detect and use your `GITHUB_TOKEN`.

2. **Interactive OAuth Login** (if you don't have a PAT):
   ```bash
   ./scripts/setup-github-actions.sh
   # Choose "GitHub CLI login" when prompted
   # This opens a browser for OAuth authentication
   ```

3. **Quick PAT Setup** (optimized for PAT users):
   ```bash
   GITHUB_TOKEN=your_pat_token ./scripts/setup-github-actions-with-pat.sh
   ```

**Note:** GitHub CLI uses tokens under the hood - either obtained via interactive OAuth login or provided directly. See `docs/deployment/GITHUB_CLI_AUTHENTICATION.md` for details.

```bash
# Bash version (recommended)
./scripts/setup-github-actions.sh

# Or TypeScript version
tsx scripts/setup-github-actions.ts
```

**What it does:**
- ✅ Automatically detects repository information
- ✅ Checks GitHub CLI authentication
- ✅ Retrieves Vercel credentials via Vercel CLI
- ✅ Checks existing secrets
- ✅ Sets secrets via GitHub CLI API
- ✅ Imports secrets from `.env.local` files
- ✅ Prompts for missing required secrets

**Option B: Manual Setup**

Go to your GitHub repository → **Settings** → **Secrets and variables** → **Actions**

Click **"New repository secret"** and add each of these:

#### **Required Secrets:**

1. **`VERCEL_TOKEN`**
   - Value: Your Vercel token (from Step 1)
   - Example: `vercel_xxxxx...`

2. **`VERCEL_ORG_ID`**
   - Value: Your Vercel organization ID
   - Example: `team_xxxxx`

3. **`VERCEL_PROJECT_ID`**
   - Value: Your Vercel project ID
   - Example: `prj_xxxxx`

4. **`DATABASE_URL`**
   - Value: Your PostgreSQL connection string
   - Example: `postgresql://user:pass@host:port/db`

5. **`AUTH_SECRET`**
   - Value: Your authentication secret (32+ characters)
   - Generate with: `openssl rand -base64 32`

#### **Optional but Recommended:**

6. **`NEXT_PUBLIC_APP_URL`**
   - Value: Your production/staging URL
   - Example: `https://your-app.vercel.app`

7. **`STRIPE_SECRET_KEY`**
   - Value: Your Stripe secret key
   - Example: `sk_test_...` or `sk_live_...`

8. **`STRIPE_WEBHOOK_SECRET`**
   - Value: Your Stripe webhook secret
   - Example: `whsec_...`

9. **`RESEND_API_KEY`**
   - Value: Your Resend API key
   - Example: `re_...`

10. **`OPENROUTER_API_KEY`**
    - Value: Your OpenRouter API key (if using)
    - Example: `sk-or-v1-...`

---

### **Step 3: Configure Branch Protection (Optional but Recommended)**

To ensure quality deployments, protect your branches:

1. Go to: **Settings** → **Branches**
2. Add branch protection rule for `main`:
   - ✅ Require status checks to pass before merging
   - ✅ Require branches to be up to date before merging
   - ✅ Select: "Test & Build" (from test.yml workflow)
   - ✅ Select: "CI/CD - Production" (from ci-cd-production.yml)

3. Add branch protection rule for `develop`:
   - ✅ Require status checks to pass before merging
   - ✅ Select: "CI/CD - Staging"

---

## 🚦 Workflow Files

Your project now has these GitHub Actions workflows:

### **1. `.github/workflows/test.yml`**
- Runs on: `main`, `develop` branches, PRs
- Purpose: Quality checks (lint, type check, tests)
- Does NOT deploy

### **2. `.github/workflows/ci-cd-staging.yml`** ⭐
- Runs on: `develop`, `staging` branches
- Purpose: Test + Deploy to Vercel Preview/Staging
- **This is your staging deployment workflow**

### **3. `.github/workflows/ci-cd-production.yml`** ⭐
- Runs on: `main` branch
- Purpose: Test + Deploy to Vercel Production
- **This is your production deployment workflow**

### **4. `.github/workflows/deploy-staging.yml`**
- Alternative workflow that triggers after test.yml completes
- Can be used if you prefer workflow chaining

### **5. `.github/workflows/deploy-production.yml`**
- Alternative workflow that triggers after test.yml completes
- Can be used if you prefer workflow chaining

---

## 📝 Usage Examples

### **Deploy to Staging**

```bash
# Make sure you're on develop branch
git checkout develop

# Make your changes and commit
git add .
git commit -m "feat: new feature for testing"

# Push to trigger staging deployment
git push origin develop
```

**What happens:**
1. GitHub Actions runs tests
2. If tests pass → Deploys to Vercel Preview
3. You get a preview URL in the Actions summary
4. Check the URL to test your changes

---

### **Deploy to Production**

```bash
# Make sure you're on main branch
git checkout main

# Merge from develop (if needed)
git merge develop

# Push to trigger production deployment
git push origin main
```

**What happens:**
1. GitHub Actions runs tests
2. If tests pass → Deploys to Vercel Production
3. Your production site is updated

---

### **Manual Production Deployment**

You can also trigger production deployment manually:

1. Go to: **Actions** tab in GitHub
2. Select: **"CI/CD - Production"** workflow
3. Click: **"Run workflow"**
4. Optionally check: **"Skip tests"** (not recommended)
5. Click: **"Run workflow"**

---

## 🔍 Monitoring Deployments

### **View Workflow Runs**

1. Go to: **Actions** tab in GitHub
2. Click on any workflow run
3. See real-time progress
4. Check logs for any errors

### **View Deployment Status**

Each workflow run shows:
- ✅ Test results
- ✅ Build status
- ✅ Deployment URL
- ✅ Commit information

---

## 🐛 Troubleshooting

### **Issue: "Vercel token is invalid"**

**Solution:**
- Check that `VERCEL_TOKEN` secret is set correctly
- Generate a new token at: https://vercel.com/account/tokens
- Make sure token hasn't expired

---

### **Issue: "Organization ID not found"**

**Solution:**
- Check that `VERCEL_ORG_ID` matches your Vercel org
- Run `vercel link` locally to verify
- Check `.vercel/project.json` file

---

### **Issue: "Project ID not found"**

**Solution:**
- Check that `VERCEL_PROJECT_ID` matches your Vercel project
- Run `vercel link` locally to verify
- Check `.vercel/project.json` file

---

### **Issue: "Tests failing but deployment succeeds"**

**Solution:**
- Check workflow conditions in workflow files
- Ensure test job is marked as required
- Review branch protection rules

---

### **Issue: "Build fails in GitHub but works locally"**

**Possible causes:**
- Missing environment variables in GitHub Secrets
- Different Node.js version
- Different package versions

**Solution:**
- Compare local `.env` with GitHub Secrets
- Ensure all required secrets are set
- Check Node.js version in workflow (should be 20)

---

## 🎯 Best Practices

### **1. Always Test in Staging First**
```bash
# Develop on feature branch
git checkout -b feature/new-feature

# Merge to develop for staging deployment
git checkout develop
git merge feature/new-feature
git push origin develop  # Deploys to staging
```

### **2. Use Pull Requests**
- Create PRs from feature branches
- Review code before merging
- Tests run automatically on PR

### **3. Monitor Deployments**
- Check GitHub Actions tab regularly
- Review deployment logs
- Test staging deployments before production

### **4. Keep Secrets Updated**
- Rotate tokens periodically
- Update environment variables when needed
- Document any new required secrets

---

## 📊 Workflow Status Badge

Add a status badge to your README:

```markdown
![CI/CD Staging](https://github.com/YOUR_USERNAME/YOUR_REPO/workflows/CI/CD%20-%20Staging/badge.svg)
![CI/CD Production](https://github.com/YOUR_USERNAME/YOUR_REPO/workflows/CI/CD%20-%20Production/badge.svg)
```

---

## 🔗 Additional Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Vercel GitHub Integration](https://vercel.com/docs/integrations/git)
- [Vercel CLI Documentation](https://vercel.com/docs/cli)

---

## ✅ Quick Checklist

Before your first deployment:

- [ ] Vercel token created and added to GitHub Secrets
- [ ] Vercel Organization ID added to GitHub Secrets
- [ ] Vercel Project ID added to GitHub Secrets
- [ ] All required environment variables added to GitHub Secrets
- [ ] Workflow files exist in `.github/workflows/`
- [ ] Test push to `develop` branch to verify staging deployment
- [ ] Branch protection rules configured (optional)

---

**Ready to deploy?** Push to `develop` branch and watch the magic happen! 🚀

