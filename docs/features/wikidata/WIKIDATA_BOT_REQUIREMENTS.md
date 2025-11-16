# Wikidata Bot Flag Requirements and Rate Limits

## 🔑 Key Distinctions

### Bot Password vs Bot Flag

**Bot Password** (Required):
- Authentication mechanism for API access
- Created at Special:BotPasswords
- Format: `username@botname:password`
- Allows authenticated API requests
- **This is what you need to publish at all**

**Bot Flag** (Optional but Recommended):
- User right granted by community approval
- Requests processed at Wikidata:Requests_for_permissions/Bot
- Provides higher rate limits and marks edits as automated
- **Not strictly required, but strongly recommended for production**

---

## 📊 Rate Limits Comparison

### Without Bot Flag

**test.wikidata.org:**
- ~50-100 edits/minute (more lenient enforcement)
- Edits appear in Recent Changes
- Suitable for testing and low-volume publication
- **No approval required** - you can start publishing immediately

**wikidata.org (Production):**
- ~50 edits/minute (strictly enforced)
- Edits appear in Recent Changes (higher scrutiny)
- May face rate limiting (429 errors) at lower thresholds
- Risk of edits being reverted if they don't follow guidelines
- **Can publish without bot flag, but not recommended for automated tools**

### With Bot Flag

**test.wikidata.org:**
- 500+ edits/minute (depends on approval terms)
- Edits marked as automated (hidden from default Recent Changes)
- Lower risk of accidental reverts
- **Approval typically quick and easy**

**wikidata.org (Production):**
- 500+ edits/minute (must be approved by community)
- Edits marked as automated (less likely to be reverted)
- Required for high-volume publication workflows
- **Approval required - must demonstrate bot is well-behaved**

---

## ✅ Is Bot Flag Required?

### Short Answer: **No, but highly recommended**

### For test.wikidata.org:
- ✅ **Not required** - You can publish without bot flag
- ✅ Start with bot password only for testing
- ✅ Request bot flag later for higher rate limits
- ✅ Approval is typically quick and straightforward

### For wikidata.org (Production):
- ⚠️ **Not strictly required**, but:
  - Strongly recommended for automated tools
  - Required for high-volume publication (50+ entities/day)
  - Required to use `bot: '1'` parameter in API
  - Lower risk of rate limiting and edit reverts

---

## 🚀 Getting Started (Quick Path)

### Option 1: Start Without Bot Flag (Fastest)

1. Create account on test.wikidata.org
2. Create bot password at Special:BotPasswords
3. Set environment variables:
   ```
   WIKIDATA_BOT_USERNAME=YourBot@YourBot
   WIKIDATA_BOT_PASSWORD=your_password
   WIKIDATA_USE_BOT_FLAG=false  # No bot flag yet
   ```
4. **Start publishing immediately** - lower rate limits are fine for testing

### Option 2: Request Bot Flag First (Recommended for Production)

1. Create account on test.wikidata.org
2. **Request bot flag** at Wikidata:Requests_for_permissions/Bot
   - Explain your bot's purpose (automated business entity creation)
   - Specify rate limits you need
   - For test.wikidata.org, approval is quick
3. Create bot password at Special:BotPasswords
4. Set environment variables:
   ```
   WIKIDATA_BOT_USERNAME=YourBot@YourBot
   WIKIDATA_BOT_PASSWORD=your_password
   WIKIDATA_USE_BOT_FLAG=true  # Bot flag granted
   ```

---

## 📋 Bot Flag Approval Process

### For test.wikidata.org:

1. Go to https://test.wikidata.org/wiki/Wikidata:Requests_for_permissions/Bot
2. Create a new request:
   - Bot name: `GEMflushBot` (or your bot name)
   - Purpose: Automated business entity creation from web data
   - Rate limit needed: Typically 50-100 edits/minute is sufficient for testing
   - Test run: May not be required for test.wikidata.org
3. Wait for bureaucrat approval (usually within hours/days)
4. Once approved, set `WIKIDATA_USE_BOT_FLAG=true`

### For wikidata.org (Production):

1. Go to https://www.wikidata.org/wiki/Wikidata:Requests_for_permissions/Bot
2. Create a request with:
   - Detailed bot description
   - Proposed rate limits
   - **Test run of 50-250 edits** showing bot is well-behaved
   - Demonstration that edits follow Wikidata guidelines
3. Community review (may take days/weeks)
4. Once approved, set `WIKIDATA_USE_BOT_FLAG=true`

---

## ⚙️ Implementation Details

The publisher now handles both flagged and non-flagged accounts:

```typescript
// If WIKIDATA_USE_BOT_FLAG=true and account has bot flag
bot: '1'  // Edits marked as automated, higher rate limits

// If WIKIDATA_USE_BOT_FLAG=false or not set
// No bot parameter - normal user edits, lower rate limits
```

**Important:** Setting `bot: '1'` without the bot flag will **fail** with an error. Always check if your account has the flag before enabling `WIKIDATA_USE_BOT_FLAG=true`.

---

## 🎯 Recommendations by Use Case

### Testing & Development (test.wikidata.org)
- ✅ **Start without bot flag** - Fastest path
- ✅ Lower rate limits (50-100/min) are sufficient
- ✅ Request bot flag later if needed

### Low-Volume Production (< 50 entities/day)
- ⚠️ Can work without bot flag, but risky
- ✅ **Request bot flag** for safety
- ✅ Reduces risk of rate limiting and reverts

### High-Volume Production (50+ entities/day)
- ❌ **Bot flag required**
- ✅ Must be approved by community
- ✅ Demonstrates bot is well-behaved

---

## 📚 References

- [Wikidata:Data access](https://www.wikidata.org/wiki/Wikidata:Data_access) - API access methods
- [Wikidata:Bots](https://www.wikidata.org/wiki/Wikidata:Bots) - Bot guidelines
- [Wikidata:Requests_for_permissions/Bot](https://www.wikidata.org/wiki/Wikidata:Requests_for_permissions/Bot) - Bot flag requests
- [API:Etiquette](https://www.mediawiki.org/wiki/API:Etiquette) - API best practices
- [Bot passwords](https://www.mediawiki.org/wiki/Manual:Bot_passwords) - Bot password documentation

---

## 🔍 Troubleshooting

**Error: "You need the 'bot' user right to use the 'bot' parameter"**
- Your account doesn't have the bot flag
- Set `WIKIDATA_USE_BOT_FLAG=false` or remove the env var
- Or request bot flag approval first

**Error: 429 Too Many Requests**
- You're hitting rate limits
- Wait and retry (check Retry-After header)
- Consider requesting bot flag for higher limits
- Implement exponential backoff in your code

**Edits being reverted**
- Bot flag helps (edits marked as automated)
- Ensure edits follow Wikidata guidelines
- Include proper references and follow notability guidelines
