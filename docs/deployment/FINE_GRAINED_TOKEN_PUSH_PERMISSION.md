# Fine-Grained Token: Exact Permission for Push Access

Based on [GitHub's official documentation](https://docs.github.com/en/rest/authentication/permissions-required-for-fine-grained-personal-access-tokens), here is the exact permission you need.

---

## 🎯 Exact Permission Name

### **Repository Permissions → Contents → Write**

**Full Path:**
- **Category:** Repository permissions
- **Permission:** `Contents`
- **Access Level:** **Write**

**What it does:**
- Read and write repository contents
- Push commits to the repository
- Create, update, and delete files
- Access repository code

---

## 📋 Complete Permission List for CI/CD

For your CI/CD setup with fine-grained tokens, you need:

### **Repository Permissions:**

1. **`Contents`** → **Write** ⭐
   - **Required for:** Pushing code, committing changes
   - **What it enables:** All Git push operations

2. **`Workflows`** → **Write** ⭐
   - **Required for:** Managing GitHub Actions workflows
   - **What it enables:** Create/update workflow files

3. **`Secrets`** → **Write** ⭐
   - **Required for:** Managing repository secrets
   - **What it enables:** Set/update GitHub Secrets

4. **`Metadata`** → **Read** (Auto-selected)
   - **Required for:** Basic repository access
   - **What it enables:** Read repository information

---

## 🔍 How to Set This Up

### **Step 1: Create Fine-Grained Token**

1. Go to: https://github.com/settings/tokens/new
2. Click: **"Generate new token (fine-grained)"**
3. Name: "GEMflush CI/CD"
4. Expiration: Choose (90 days recommended)

### **Step 2: Select Repository**

- Choose: **"Only select repositories"**
- Select: **"GEMflush"** (or your repository)

### **Step 3: Set Repository Permissions**

Under **"Repository permissions"**, set:

| Permission | Access Level | Why |
|------------|--------------|-----|
| **Contents** | **Write** | ✅ Push code |
| **Workflows** | **Write** | ✅ Manage Actions |
| **Secrets** | **Write** | ✅ Manage secrets |
| **Metadata** | **Read** | ✅ Basic access (auto) |

### **Step 4: Generate Token**

- Click "Generate token"
- Copy token (starts with `github_pat_`)

---

## 📊 Permission Comparison

### **Classic Token vs Fine-Grained Token**

| Action | Classic Token | Fine-Grained Token |
|--------|---------------|---------------------|
| **Push code** | `repo` scope | `Contents` → **Write** |
| **Manage workflows** | `workflow` scope | `Workflows` → **Write** |
| **Manage secrets** | `repo` scope (includes) | `Secrets` → **Write** |
| **Token format** | `ghp_xxxxx` | `github_pat_xxxxx` |

---

## ✅ Verification

### **Check Fine-Grained Token Permissions:**

```bash
curl -s -H "Authorization: token YOUR_TOKEN" \
  https://api.github.com/user | jq -r '.permissions'
```

**Should show:**
```json
{
  "contents": "write",
  "workflows": "write",
  "secrets": "write",
  "metadata": "read"
}
```

---

## 🎯 Summary

**For fine-grained tokens, the exact permission is:**

- **Category:** Repository permissions
- **Permission Name:** `Contents`
- **Access Level:** **Write**

**Full description:** "Read and write access to repository contents"

**Reference:** [Repository permissions for Contents](https://docs.github.com/en/rest/authentication/permissions-required-for-fine-grained-personal-access-tokens#repository-permissions-for-contents)

---

## 💡 Recommendation

**For CI/CD, use Classic Token instead:**

- ✅ Simpler: One checkbox (`repo`) vs multiple permissions
- ✅ More compatible: Works with all tools
- ✅ Less configuration: No need to select individual permissions

**Classic token permission:** Just check `repo` - that's it!

**Fine-grained token permissions:** Need to set Contents → Write, Workflows → Write, Secrets → Write

---

**Your current token is likely a fine-grained token missing the `Contents` → Write permission.**

