# 🔐 Vercel API Setup - Official Documentation

Based on [Vercel's official documentation](https://vercel.com/guides/how-can-i-use-github-actions-with-vercel) and [Vercel API docs](https://vercel.com/docs/rest-api).

---

## 📋 Required Secrets (Per Vercel Docs)

According to Vercel's official GitHub Actions guide, you need three secrets:

1. **`VERCEL_TOKEN`** - Vercel authentication token
2. **`VERCEL_ORG_ID`** - Organization/Team ID
3. **`VERCEL_PROJECT_ID`** - Project ID

---

## 🔑 Getting the Secrets

### **1. VERCEL_TOKEN**

**Official Method (per Vercel docs):**
1. Go to: https://vercel.com/account/tokens
2. Click "Create Token"
3. Name it: `github-actions-deployment`
4. Copy the token (starts with `vercel_...`)

**Important:** Per Vercel docs, use a **different token** from your local development token for security.

---

### **2. VERCEL_ORG_ID & VERCEL_PROJECT_ID**

**Official Method (per Vercel docs):**

```bash
# 1. Install Vercel CLI
npm install -g vercel

# 2. Login to Vercel
vercel login

# 3. Link your project (creates .vercel/project.json)
vercel link

# 4. Check the generated file
cat .vercel/project.json
```

**Output:**
```json
{
  "orgId": "team_xxxxx",
  "projectId": "prj_xxxxx"
}
```

**Alternative: Using Vercel API**

Our script uses the Vercel API to automatically fetch these:

```bash
# Uses Vercel API v9 to get projects
GET https://api.vercel.com/v9/projects
Authorization: Bearer $VERCEL_TOKEN
```

---

## 🚀 Automated Setup Script

We've created a script that follows Vercel's official API documentation:

```bash
./scripts/setup-vercel-secrets-via-api.sh
```

**What it does (per Vercel API docs):**
1. ✅ Verifies token via `/v2/user` endpoint
2. ✅ Fetches projects via `/v9/projects` endpoint
3. ✅ Verifies project via `/v9/projects/{id}` endpoint
4. ✅ Sets GitHub secrets automatically

---

## 📚 Official Vercel Workflow Example

Per [Vercel's GitHub Actions guide](https://vercel.com/guides/how-can-i-use-github-actions-with-vercel):

### **Production Deployment:**

```yaml
name: Vercel Production Deployment
env:
  VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
  VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}
on:
  push:
    branches:
      - main
jobs:
  Deploy-Production:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Install Vercel CLI
        run: npm install --global vercel@latest
      - name: Pull Vercel Environment Information
        run: vercel pull --yes --environment=production --token=${{ secrets.VERCEL_TOKEN }}
      - name: Build Project Artifacts
        run: vercel build --prod --token=${{ secrets.VERCEL_TOKEN }}
      - name: Deploy Project Artifacts to Vercel
        run: vercel deploy --prebuilt --prod --token=${{ secrets.VERCEL_TOKEN }}
```

### **Preview Deployment:**

```yaml
name: Vercel Preview Deployment
env:
  VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
  VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}
on:
  push:
    branches-ignore:
      - main
jobs:
  Deploy-Preview:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Install Vercel CLI
        run: npm install --global vercel@latest
      - name: Pull Vercel Environment Information
        run: vercel pull --yes --environment=preview --token=${{ secrets.VERCEL_TOKEN }}
      - name: Build Project Artifacts
        run: vercel build --token=${{ secrets.VERCEL_TOKEN }}
      - name: Deploy Project Artifacts to Vercel
        run: vercel deploy --prebuilt --token=${{ secrets.VERCEL_TOKEN }}
```

---

## 🔧 Our Implementation

Our workflows (`.github/workflows/ci-cd-production.yml` and `.github/workflows/ci-cd-staging.yml`) follow Vercel's official pattern but use the `amondnet/vercel-action@v25` action for better integration.

**Key differences:**
- ✅ Uses `vercel-action` for better error handling
- ✅ Pulls environment variables automatically
- ✅ Handles prebuilt deployments
- ✅ Follows same API endpoints as official docs

---

## 📖 Vercel API Endpoints Used

Per [Vercel API documentation](https://vercel.com/docs/rest-api):

### **1. Verify Token:**
```
GET https://api.vercel.com/v2/user
Authorization: Bearer $VERCEL_TOKEN
```

### **2. List Projects:**
```
GET https://api.vercel.com/v9/projects?limit=100
Authorization: Bearer $VERCEL_TOKEN
```

### **3. Get Project Details:**
```
GET https://api.vercel.com/v9/projects/{projectId}
Authorization: Bearer $VERCEL_TOKEN
```

---

## ✅ Verification Checklist

After running the setup script:

- [ ] `VERCEL_TOKEN` set in GitHub secrets
- [ ] `VERCEL_ORG_ID` set in GitHub secrets
- [ ] `VERCEL_PROJECT_ID` set in GitHub secrets
- [ ] Token verified via Vercel API
- [ ] Project verified via Vercel API

**Verify in GitHub:**
```bash
gh secret list
```

Or check: https://github.com/Puddin1066/GEMflush/settings/secrets/actions

---

## 🔗 Official References

- **GitHub Actions Guide:** https://vercel.com/guides/how-can-i-use-github-actions-with-vercel
- **Vercel API Docs:** https://vercel.com/docs/rest-api
- **Creating Access Token:** https://vercel.com/account/tokens
- **Vercel CLI Docs:** https://vercel.com/docs/cli

---

## 🎯 Quick Start

```bash
# 1. Get Vercel token
# Go to: https://vercel.com/account/tokens

# 2. Run automated setup
./scripts/setup-vercel-secrets-via-api.sh

# 3. Push to main
git push origin main

# 4. Check deployment
# GitHub Actions: https://github.com/Puddin1066/GEMflush/actions
# Vercel Dashboard: https://vercel.com/dashboard
```

---

**All methods follow Vercel's official documentation and API patterns!** ✅

