# 🔐 Vercel API Secrets Setup

## ✅ Automated Setup Using Vercel API

Two scripts are available that use the **Vercel API** to automatically:
- ✅ Get your Vercel project ID
- ✅ Get your Vercel organization ID  
- ✅ Verify project exists
- ✅ Set GitHub secrets automatically

---

## 🚀 Quick Start

### **Option 1: Bash Script (Recommended)**

```bash
./scripts/setup-vercel-secrets-via-api.sh
```

**What it does:**
1. Checks GitHub CLI authentication
2. Prompts for Vercel token (or reads from `.env`)
3. Uses Vercel API to:
   - Verify token
   - Get user information
   - List your projects
   - Auto-detect project from directory name
   - Get project details
4. Sets GitHub secrets automatically

---

### **Option 2: TypeScript Script**

```bash
tsx scripts/setup-vercel-secrets-via-api.ts
```

Same functionality as bash script, but written in TypeScript for better error handling.

---

## 📋 Prerequisites

### **1. GitHub CLI**
```bash
# Install GitHub CLI
brew install gh  # macOS
# or: https://cli.github.com/

# Authenticate
gh auth login
```

### **2. Vercel Token**

Get your Vercel token:
1. Go to: https://vercel.com/account/tokens
2. Click "Create Token"
3. Name it: `github-actions-deployment`
4. Copy the token

**Add to `.env` (optional):**
```bash
VERCEL_TOKEN=vercel_xxxxxxxxxxxxx
```

Or the script will prompt you for it.

---

## 🔄 How It Works

### **Step 1: Token Verification**
```
Script → Vercel API /v2/user → Verify token
```

### **Step 2: Get Projects**
```
Script → Vercel API /v9/projects → List all projects
```

### **Step 3: Auto-Detect Project**
- Checks `.vercel/project.json` (if exists)
- Or matches project name to directory name
- Or lists projects for you to choose

### **Step 4: Verify Project**
```
Script → Vercel API /v9/projects/{id} → Get project details
```

### **Step 5: Set GitHub Secrets**
```
Script → GitHub CLI → Set secrets:
  - VERCEL_TOKEN
  - VERCEL_ORG_ID
  - VERCEL_PROJECT_ID
```

---

## 📊 Example Output

```bash
$ ./scripts/setup-vercel-secrets-via-api.sh

🔐 GitHub Secrets Setup via Vercel API
======================================

✅ GitHub CLI authenticated

📡 Fetching Vercel project information...

Getting user information...
✅ Authenticated as user

Getting projects...
Found 3 project(s):
  1. saas-starter (prj_xxxxx)
  2. my-other-project (prj_yyyyy)
  3. test-project (prj_zzzzz)

Auto-detected project: saas-starter
Verifying project via API...
✅ Project verified: saas-starter

📋 Summary:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  VERCEL_TOKEN: vercel_xxxx...
  VERCEL_ORG_ID: team_xxxxx
  VERCEL_PROJECT_ID: prj_xxxxx
  Project Name: saas-starter

Set these as GitHub secrets? (y/n) y

📤 Setting GitHub Secrets...

✅ VERCEL_TOKEN set
✅ VERCEL_ORG_ID set
✅ VERCEL_PROJECT_ID set

✅ All secrets set successfully!

📋 Next steps:
  1. Push to main branch to trigger deployment
  2. Check GitHub Actions: https://github.com/Puddin1066/GEMflush/actions
  3. Monitor deployment in Vercel dashboard
```

---

## 🔧 Troubleshooting

### **"Invalid VERCEL_TOKEN"**
- ✅ Check token is correct
- ✅ Token must start with `vercel_`
- ✅ Token must not be expired
- ✅ Get new token: https://vercel.com/account/tokens

### **"No projects found"**
- ✅ Create a project in Vercel first
- ✅ Or link existing project: `vercel link`

### **"Project not found or access denied"**
- ✅ Check project ID is correct
- ✅ Verify you have access to the project
- ✅ Check organization permissions

### **"GitHub CLI not authenticated"**
```bash
gh auth login
```

### **"Failed to set secret"**
- ✅ Check GitHub CLI has `repo` and `workflow` scopes
- ✅ Verify you have admin access to the repository
- ✅ Try manually: https://github.com/Puddin1066/GEMflush/settings/secrets/actions

---

## 🎯 Manual Alternative

If the script doesn't work, you can set secrets manually:

1. **Get Vercel Token:**
   - https://vercel.com/account/tokens

2. **Get Project/Org IDs:**
   ```bash
   vercel link
   cat .vercel/project.json
   ```

3. **Set GitHub Secrets:**
   - Go to: https://github.com/Puddin1066/GEMflush/settings/secrets/actions
   - Add each secret manually

---

## ✅ Verification

After running the script, verify secrets are set:

```bash
# List GitHub secrets (requires GitHub CLI)
gh secret list

# Or check in GitHub UI:
# https://github.com/Puddin1066/GEMflush/settings/secrets/actions
```

You should see:
- ✅ `VERCEL_TOKEN`
- ✅ `VERCEL_ORG_ID`
- ✅ `VERCEL_PROJECT_ID`

---

## 🚀 Next Steps

Once secrets are set:

1. **Push to main branch:**
   ```bash
   git push origin main
   ```

2. **Check GitHub Actions:**
   - https://github.com/Puddin1066/GEMflush/actions
   - Should see `ci-cd-production.yml` running

3. **Monitor deployment:**
   - Vercel dashboard will show deployment
   - GitHub Actions will show deployment URL

---

## 📚 Related Documentation

- `docs/deployment/GITHUB_VERCEL_AUTO_DEPLOY.md` - How auto-deploy works
- `docs/deployment/CI_CD_TRIGGERS_EXPLAINED.md` - CI/CD workflow details
- `scripts/setup-github-vercel-secrets.sh` - Alternative setup script

---

**🎉 That's it! Your GitHub Actions will now automatically deploy to Vercel on every push to `main`!**

