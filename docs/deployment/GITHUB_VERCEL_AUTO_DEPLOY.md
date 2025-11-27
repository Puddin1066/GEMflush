# 🚀 GitHub Actions → Vercel Auto-Deploy

## ✅ Current Configuration

GitHub Actions is **already configured** to automatically deploy to Vercel!

### **Workflows:**

1. **`.github/workflows/ci-cd-production.yml`**
   - **Triggers:** Push to `main` branch
   - **Actions:**
     - ✅ Run tests
     - ✅ Build application
     - 🚀 **Deploy to Vercel Production**

2. **`.github/workflows/ci-cd-staging.yml`**
   - **Triggers:** Push to `develop` or `staging` branches
   - **Actions:**
     - ✅ Run tests
     - ✅ Build application
     - 🚀 **Deploy to Vercel Preview (Staging)**

3. **`.github/workflows/test.yml`**
   - **Triggers:** Push to `main`/`develop`, PRs
   - **Actions:**
     - ✅ Run tests
     - ✅ Build (verification only)
     - ❌ No deployment (test-only workflow)

---

## 🔄 How It Works

### **Push to `main` branch:**
```
1. Push to GitHub
   ↓
2. ci-cd-production.yml triggers
   ↓
3. Run tests (lint, type check, unit tests)
   ↓
4. Build Next.js app
   ↓
5. Deploy to Vercel Production
   ↓
6. ✅ Live on production URL
```

### **Push to `develop` branch:**
```
1. Push to GitHub
   ↓
2. ci-cd-staging.yml triggers
   ↓
3. Run tests
   ↓
4. Build Next.js app
   ↓
5. Deploy to Vercel Preview
   ↓
6. ✅ Live on preview URL
```

---

## 🔐 Required GitHub Secrets

For Vercel deployment to work, you need these secrets in GitHub:

### **Required Secrets:**
- `VERCEL_TOKEN` - Your Vercel API token
- `VERCEL_ORG_ID` - Your Vercel organization ID
- `VERCEL_PROJECT_ID` - Your Vercel project ID

### **Optional Secrets (for custom domains):**
- `VERCEL_PRODUCTION_URL` - Production domain (e.g., `gemflush.com`)
- `VERCEL_STAGING_URL` - Staging domain (e.g., `staging.gemflush.com`)

### **How to Get These:**

1. **VERCEL_TOKEN:**
   - Go to: https://vercel.com/account/tokens
   - Click "Create Token"
   - Copy the token

2. **VERCEL_ORG_ID & VERCEL_PROJECT_ID:**
   - Run: `vercel link` in your project
   - Check `.vercel/project.json`:
     ```json
     {
       "orgId": "your-org-id",
       "projectId": "your-project-id"
     }
     ```

3. **Add to GitHub:**
   - Go to: `https://github.com/Puddin1066/GEMflush/settings/secrets/actions`
   - Click "New repository secret"
   - Add each secret

---

## 🎯 Deployment Flow

### **Production Deployment (main branch):**

```yaml
# .github/workflows/ci-cd-production.yml
on:
  push:
    branches: [main]

jobs:
  test:
    - Run linter
    - Run type check
    - Run unit tests
    - Build application
  
  deploy:
    needs: test
    - Install Vercel CLI
    - Pull Vercel environment
    - Build application
    - Deploy to Vercel Production
```

### **Staging Deployment (develop branch):**

```yaml
# .github/workflows/ci-cd-staging.yml
on:
  push:
    branches: [develop, staging]

jobs:
  test:
    - Run linter
    - Run type check
    - Run unit tests
    - Build application
  
  deploy:
    needs: test
    - Install Vercel CLI
    - Pull Vercel environment
    - Build application
    - Deploy to Vercel Preview
```

---

## ✅ Verification

### **Check if workflows are running:**
1. Go to: https://github.com/Puddin1066/GEMflush/actions
2. You should see workflows running on each push

### **Check deployment status:**
1. Go to: https://vercel.com/dashboard
2. Check your project's deployments
3. You should see deployments from GitHub Actions

### **Test the deployment:**
```bash
# Push to main branch
git checkout main
git push origin main

# Check GitHub Actions
# Should see: ci-cd-production.yml running
# Should see: Deployment to Vercel Production
```

---

## 🔧 Troubleshooting

### **Deployment not triggering:**
- ✅ Check if secrets are set in GitHub
- ✅ Check if workflow file is in `.github/workflows/`
- ✅ Check if branch name matches (`main` for production)

### **Deployment failing:**
- ✅ Check Vercel token is valid
- ✅ Check VERCEL_ORG_ID and VERCEL_PROJECT_ID are correct
- ✅ Check Vercel project exists and is linked

### **Tests failing:**
- ✅ Check DATABASE_URL secret is set (for tests)
- ✅ Check OPENROUTER_API_KEY secret is set (for tests)
- ✅ Tests must pass before deployment

---

## 📋 Quick Setup Checklist

- [ ] Vercel project created
- [ ] Vercel project linked (`vercel link`)
- [ ] GitHub secrets added:
  - [ ] `VERCEL_TOKEN`
  - [ ] `VERCEL_ORG_ID`
  - [ ] `VERCEL_PROJECT_ID`
- [ ] Push to `main` branch
- [ ] Check GitHub Actions tab
- [ ] Verify deployment in Vercel dashboard

---

## 🎉 Summary

**GitHub Actions is already configured to deploy to Vercel!**

- ✅ Push to `main` → Deploys to Vercel Production
- ✅ Push to `develop` → Deploys to Vercel Preview
- ✅ Tests run before deployment
- ✅ Build happens automatically

**Just add the GitHub secrets and push!** 🚀

