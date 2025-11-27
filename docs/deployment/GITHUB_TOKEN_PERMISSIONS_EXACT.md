# Exact GitHub Token Permissions for Push Access

Based on [GitHub's official documentation](https://docs.github.com/en/rest/authentication/permissions-required-for-fine-grained-personal-access-tokens), here are the exact permission names for pushing code.

---

## 🔑 Two Token Types - Different Permission Names

### **Option 1: Classic Personal Access Token** (Recommended for CI/CD)

**Permission Name:** `repo`

**Full Description:** "Full control of private repositories"

**Where to Find:**
- Go to: https://github.com/settings/tokens/new
- Select: **"Generate new token (classic)"**
- Look for checkbox: **`repo`** - Full control of private repositories

**What it includes:**
- ✅ Push, pull, clone repositories
- ✅ Access repository contents
- ✅ Manage repository settings
- ✅ All repository operations

**Reference:** [GitHub OAuth App Scopes](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/scopes-for-oauth-apps#available-scopes)

---

### **Option 2: Fine-Grained Personal Access Token**

**Permission Category:** Repository permissions

**Specific Permission:** `Contents` with **Write** access

**Full Path:** Repository permissions → Contents → **Write**

**What it does:**
- Read and write repository contents
- Push commits
- Create/update/delete files

**Additional Required Permissions for CI/CD:**
- **`Workflows`** → **Write** (for GitHub Actions)
- **`Secrets`** → **Write** (for managing secrets)
- **`Metadata`** → **Read** (always included)

**Reference:** [Fine-Grained PAT Permissions](https://docs.github.com/en/rest/authentication/permissions-required-for-fine-grained-personal-access-tokens#repository-permissions-for-contents)

---

## 📋 Exact Permission Names

### **For Classic Tokens (What You Need):**

| Permission | Name | Required For |
|------------|------|--------------|
| Repository access | `repo` | ✅ Push code, manage repos |
| GitHub Actions | `workflow` | ✅ Manage workflows |

**Check these boxes:**
- ✅ `repo` - Full control of private repositories
- ✅ `workflow` - Update GitHub Action workflows

---

### **For Fine-Grained Tokens:**

| Permission Category | Permission | Access Level | Required For |
|---------------------|------------|--------------|--------------|
| Repository permissions | `Contents` | **Write** | ✅ Push code |
| Repository permissions | `Workflows` | **Write** | ✅ Manage Actions |
| Repository permissions | `Secrets` | **Write** | ✅ Manage secrets |
| Repository permissions | `Metadata` | **Read** | ✅ Basic access (auto) |

**Select these:**
- Repository permissions → Contents → **Write**
- Repository permissions → Workflows → **Write**
- Repository permissions → Secrets → **Write**

---

## 🎯 Which Token Type Should You Use?

### **Use Classic Token** (Recommended) ⭐

**Why:**
- ✅ Simpler - one checkbox (`repo`) covers everything
- ✅ More compatible with existing tools
- ✅ Better for CI/CD automation
- ✅ Works with all Git operations

**Permission to select:** `repo` checkbox

---

### **Use Fine-Grained Token** (If Required)

**Why:**
- ✅ More granular control
- ✅ Better security (least privilege)
- ⚠️ More complex setup
- ⚠️ May not work with all tools

**Permissions to select:**
- Contents → **Write**
- Workflows → **Write**
- Secrets → **Write**

---

## 📝 Step-by-Step: Classic Token (Easiest)

1. Go to: https://github.com/settings/tokens/new
2. Click: **"Generate new token (classic)"**
3. Note: "GEMflush CI/CD"
4. Expiration: Choose (90 days recommended)
5. **Select scopes:**
   - ✅ **`repo`** - Full control of private repositories
   - ✅ **`workflow`** - Update GitHub Action workflows
6. Click: **"Generate token"**
7. Copy token (starts with `ghp_`)

**That's it!** The `repo` scope gives you full push access.

---

## 📝 Step-by-Step: Fine-Grained Token

1. Go to: https://github.com/settings/tokens/new
2. Click: **"Generate new token (fine-grained)"**
3. Name: "GEMflush CI/CD"
4. Expiration: Choose
5. Repository access: Select "Only select repositories" → Choose "GEMflush"
6. **Repository permissions:**
   - Contents → **Read and write**
   - Workflows → **Read and write**
   - Secrets → **Read and write**
   - Metadata → **Read** (auto-selected)
7. Click: **"Generate token"**
8. Copy token (starts with `github_pat_`)

---

## 🔍 How to Check Your Token's Permissions

### **Check Classic Token:**

```bash
curl -s -I -H "Authorization: token YOUR_TOKEN" \
  https://api.github.com/user | grep -i "x-oauth-scopes"
```

**Should show:** `repo, workflow`

### **Check Fine-Grained Token:**

```bash
curl -s -H "Authorization: token YOUR_TOKEN" \
  https://api.github.com/user | jq -r '.permissions'
```

**Should show:** `contents: write, workflows: write, secrets: write`

---

## ✅ Summary

**For pushing code to GitHub:**

- **Classic Token:** Select `repo` scope
- **Fine-Grained Token:** Select Contents → **Write** permission

**The exact permission name is:**
- Classic: **`repo`**
- Fine-Grained: **`Contents`** with **Write** access

**Reference Documentation:**
- [Classic Token Scopes](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/scopes-for-oauth-apps)
- [Fine-Grained PAT Permissions](https://docs.github.com/en/rest/authentication/permissions-required-for-fine-grained-personal-access-tokens)

---

**Recommendation:** Use **Classic Token** with `repo` scope - it's simpler and works better for CI/CD! 🚀

