# CI/CD Quick Reference: What Happens on Each Push

## 🚀 Quick Answer

**Yes, every `git push` will trigger CI/CD**, but:

- ✅ **GitHub Actions runs** on every push (tests + deploy if on `develop` or `main`)
- ⚠️ **Vercel may also auto-deploy** (depends on your Vercel settings)

---

## 📋 Current Workflow Triggers

### **What Runs on Each Push:**

| What You Do | GitHub Actions | Vercel Deployment |
|------------|---------------|-------------------|
| `git push origin develop` | ✅ Tests + Deploy to Staging | ⚠️ Maybe (if auto-deploy enabled) |
| `git push origin main` | ✅ Tests + Deploy to Production | ⚠️ Maybe (if auto-deploy enabled) |
| `git push origin feature-branch` | ✅ Tests only (no deploy) | ⚠️ Maybe (if auto-deploy enabled) |
| Create PR | ✅ Tests only (no deploy) | ❌ No |

---

## ⚡ What Happens: Step by Step

### **Scenario 1: Push to `develop` branch**

```bash
git commit -m "feat: new feature"
git push origin develop
```

**Immediately triggers:**

1. ✅ **GitHub Actions: CI/CD - Staging**
   - Runs lint check
   - Runs type check
   - Runs unit tests
   - Builds application
   - **Deploys to Vercel Preview** (if tests pass)

2. ⚠️ **Vercel Auto-Deploy** (if enabled in Vercel settings)
   - Also sees the push
   - Also deploys (creates duplicate deployment)

---

### **Scenario 2: Push to `main` branch**

```bash
git checkout main
git merge develop
git push origin main
```

**Immediately triggers:**

1. ✅ **GitHub Actions: CI/CD - Production**
   - Runs lint check
   - Runs type check
   - Runs unit tests
   - Builds application
   - **Deploys to Vercel Production** (if tests pass)

2. ⚠️ **Vercel Auto-Deploy** (if enabled)
   - Also deploys to production

---

## ✅ Recommended: Avoid Double Deployments

### **Option 1: Disable Vercel Auto-Deploy** (Recommended)

**In Vercel Dashboard:**
1. Go to: Project Settings → Git
2. Unlink GitHub or disable "Automatically deploy every push"

**Result:**
- ✅ Only GitHub Actions deploys
- ✅ Tests run before deployment
- ✅ No duplicate deployments

---

### **Option 2: Keep Vercel Auto-Deploy**

**Result:**
- ⚠️ Both GitHub Actions AND Vercel deploy
- ⚠️ Two deployments per push
- ⚠️ Vercel deployment doesn't wait for tests

**Use this if:**
- You want fastest possible deployments
- You don't mind duplicate deployments
- You trust Vercel's build process

---

## 🎯 Summary

### **What You Asked:**

> "Will it push to github and vercel every git commit and push?"

**Answer:**

1. **GitHub:** ✅ Yes, every push goes to GitHub
2. **GitHub Actions:** ✅ Yes, runs on every push (tests + deploy if on `develop`/`main`)
3. **Vercel:** ⚠️ Maybe - depends on your Vercel auto-deploy settings

### **Current Setup Provides:**

- ✅ **Automated testing** on every push
- ✅ **Automatic deployment** if tests pass
- ✅ **Staging environment** (`develop` branch)
- ✅ **Production environment** (`main` branch)
- ✅ **Safety:** Broken code won't deploy (tests must pass)

---

## 📚 Full Documentation

For detailed explanations, see:
- `docs/deployment/CI_CD_TRIGGERS_EXPLAINED.md` - Complete guide
- `docs/deployment/GITHUB_STAGING_DEPLOYMENT.md` - Setup instructions

