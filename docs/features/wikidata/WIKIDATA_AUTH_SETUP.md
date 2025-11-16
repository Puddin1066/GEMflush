# Wikidata Authentication Setup Guide

## ✅ Real Publication to test.wikidata.org Enabled

The publisher now makes **real API calls** to `test.wikidata.org` when `publishToProduction: false`.

Production (`wikidata.org`) remains mocked until test entities are verified.

---

## 🔐 Authentication Methods

### Option 1: Bot Password (Recommended for test.wikidata.org)

**Important Distinction:**
- **Bot Password**: Authentication mechanism (required) - allows API access
- **Bot Flag**: User right that provides higher rate limits and marks edits as "bot edits" (optional but recommended)

**Steps:**
1. Create a bot account on test.wikidata.org:
   - Go to https://test.wikidata.org
   - Create account (e.g., `GEMflushBot`)
   - **Request bot flag** (optional but recommended):
     - Go to https://test.wikidata.org/wiki/Wikidata:Requests_for_permissions/Bot
     - Create a request explaining your bot's purpose
     - For test.wikidata.org, approval is typically quick
     - Bot flag allows higher rate limits and marks edits as automated

2. Create a bot password:
   - Go to https://test.wikidata.org/wiki/Special:BotPasswords
   - Create new bot password
   - Grant permissions: `editpage`, `createeditmovepage`
   - Copy the password (format: `username@botname:randompassword`)

3. Set environment variables:
   ```bash
   WIKIDATA_BOT_USERNAME=GEMflushBot@GEMflushBot
   WIKIDATA_BOT_PASSWORD=your_bot_password_here
   WIKIDATA_USE_BOT_FLAG=true  # Only if your account has the bot flag
   ```

4. Add to `.env` file:
   ```
   WIKIDATA_BOT_USERNAME=GEMflushBot@GEMflushBot
   WIKIDATA_BOT_PASSWORD=your_actual_password
   # Optional: Set to 'true' only if your account has been granted the bot flag
   # Without bot flag: Lower rate limits (~50-100 edits/minute), edits appear in recent changes
   # With bot flag: Higher rate limits (500+ edits/minute), edits marked as automated
   WIKIDATA_USE_BOT_FLAG=false  # Change to 'true' after bot flag is granted
   ```

**Rate Limits Without Bot Flag:**
- test.wikidata.org: ~50-100 edits/minute (more lenient)
- wikidata.org: ~50 edits/minute (stricter enforcement)
- Edits appear in recent changes (may be reverted if not following guidelines)

**Rate Limits With Bot Flag:**
- test.wikidata.org: 500+ edits/minute (depends on approval)
- wikidata.org: 500+ edits/minute (must be approved by community)
- Edits marked as automated (less likely to be reverted)
- Required for high-volume publication workflows

### Option 2: Session Cookies (Manual)

**Steps:**
1. Log into test.wikidata.org in your browser
2. Extract session cookies (use browser dev tools)
3. Set cookies in requests (requires manual setup)

**Note:** Bot password is easier and more secure.

---

## 🧪 Testing Real Publication

1. **Set up authentication** (see above)

2. **Publish a business entity:**
   - Set `publishToProduction: false` in the publish request
   - The system will make a real API call to test.wikidata.org

3. **Verify the entity:**
   - Check the returned QID
   - Visit: `https://test.wikidata.org/wiki/Q{returned_qid}`
   - Verify all properties, labels, descriptions, and claims are correct

4. **Once verified, enable production:**
   - Update `publishEntity()` to use real API for production
   - Set production credentials

---

## 📋 Current Status

- ✅ **test.wikidata.org**: Real API calls enabled
- 🚧 **wikidata.org**: Mocked (until test entities verified)

## 🔍 Debugging

**Check logs for:**
- `[REAL] Publishing entity to test.wikidata.org` - Real API call
- `[REAL] CSRF token obtained successfully` - Auth working
- `[REAL] Entity published successfully` - Publication succeeded
- Error messages - Authentication or API issues

**Common errors:**
- `Failed to obtain CSRF token` - Check credentials
- `badtoken` - Invalid or expired token
- `assertuserfailed` - Authentication failed

---

## 📚 Resources

- Test Wikidata: https://test.wikidata.org
- Bot Passwords: https://test.wikidata.org/wiki/Special:BotPasswords
- API Documentation: https://www.wikidata.org/wiki/Wikidata:API
- Action API: https://www.wikidata.org/w/api.php

