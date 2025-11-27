# GitHub Actions Workflows

This directory contains CI/CD workflows for automated testing and deployment.

## 📋 Available Workflows

### **1. Test & Build** (`test.yml`)
- **Triggers:** Push to `main`/`develop`, PRs to `main`
- **Purpose:** Quality assurance checks
- **Actions:**
  - Linting
  - Type checking
  - Unit tests
  - Build verification
- **Does NOT deploy** - Pure quality checks

---

### **2. CI/CD - Staging** (`ci-cd-staging.yml`) ⭐
- **Triggers:** Push to `develop` or `staging` branches
- **Purpose:** Test + Deploy to Vercel Preview/Staging
- **Actions:**
  1. Run all tests (lint, type check, unit tests)
  2. Build application
  3. **Deploy to Vercel Preview** (staging environment)
  4. Provide preview URL
- **Use this for:** Testing features before production

---

### **3. CI/CD - Production** (`ci-cd-production.yml`) ⭐
- **Triggers:** Push to `main` branch, manual dispatch
- **Purpose:** Test + Deploy to Vercel Production
- **Actions:**
  1. Run all tests (lint, type check, unit tests)
  2. Build application
  3. **Deploy to Vercel Production**
  4. Provide production URL
- **Use this for:** Production deployments

---

### **4. Deploy Staging** (`deploy-staging.yml`)
- **Triggers:** After `test.yml` completes successfully on `develop`/`staging`
- **Purpose:** Alternative staging deployment (workflow chaining)
- **Note:** Use `ci-cd-staging.yml` instead for simpler setup

---

### **5. Deploy Production** (`deploy-production.yml`)
- **Triggers:** After `test.yml` completes successfully on `main`
- **Purpose:** Alternative production deployment (workflow chaining)
- **Note:** Use `ci-cd-production.yml` instead for simpler setup

---

## 🚀 Quick Start

### **For Staging Deployments:**
```bash
git checkout develop
git add .
git commit -m "feat: new feature"
git push origin develop
```
→ Automatically runs tests and deploys to Vercel Preview

### **For Production Deployments:**
```bash
git checkout main
git merge develop
git push origin main
```
→ Automatically runs tests and deploys to Vercel Production

---

## 📝 Required GitHub Secrets

See `docs/deployment/GITHUB_STAGING_DEPLOYMENT.md` for complete setup instructions.

**Minimum required:**
- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`
- `DATABASE_URL`
- `AUTH_SECRET`

---

## 🔍 Viewing Workflow Runs

1. Go to GitHub repository
2. Click **Actions** tab
3. Select workflow to view
4. Click on a run to see details

---

## 📚 Documentation

- **Complete Setup Guide:** `docs/deployment/GITHUB_STAGING_DEPLOYMENT.md`
- **Deployment Options:** `docs/getting-started/DEPLOYMENT/DEPLOYMENT_OPTIONS.md`
- **CI/CD Explained:** `docs/development/CI_CD_WORKFLOW_EXPLAINED.md`

---

## 🎯 Recommended Workflow

**Daily Development:**
1. Work on feature branch
2. Create PR to `develop`
3. Tests run automatically
4. Merge to `develop` → Auto-deploy to staging
5. Test staging deployment
6. Merge `develop` to `main` → Auto-deploy to production

