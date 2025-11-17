# Wikidata Bot Password Format Guide

## Exact Format Requirements

Based on the official Wikidata/MediaWiki documentation and your bot password creation message:

### Bot Name Format
- **Case-sensitive**: Bot names are case-sensitive and must match exactly as created
- **No spaces**: Spaces are replaced with underscores (`_`)
- **Allowed characters**: Letters, numbers, underscores
- **Normalization**: Wikidata may normalize bot names (e.g., convert to lowercase)

### Your Bot Password Details

From your Wikidata message:
```
The bot password for bot name "Puddin1066@kgaasbot" of user "Puddin1066" was created.
The new password to log in with Puddin1066@Puddin1066@kgaasbot is 0g435bt282nfk3fhq7rql3qvt0astl3h.
```

**Key Points:**
- **Bot name**: `kgaasbot` (lowercase, no underscore)
- **Username**: `Puddin1066` (case-sensitive)
- **Password**: `0g435bt282nfk3fhq7rql3qvt0astl3h` (32 characters, random)

### .env Configuration

```bash
WIKIDATA_BOT_USERNAME=Puddin1066@kgaasbot
WIKIDATA_BOT_PASSWORD=0g435bt282nfk3fhq7rql3qvt0astl3h
```

**Important:**
- Use the exact bot name as shown in the Wikidata message: `kgaasbot` (lowercase, no underscore)
- Do NOT use `KGaaS_Bot` (with capitals and underscore) - that's not what was created
- The password is just the random string (32 characters in your case)

---

## Login API Formats

Wikidata supports two login formats for bot passwords:

### NEW FORMAT (Recommended)
```http
POST https://test.wikidata.org/w/api.php
Content-Type: application/x-www-form-urlencoded

action=login
&lgname=Puddin1066@Puddin1066@kgaasbot
&lgpassword=0g435bt282nfk3fhq7rql3qvt0astl3h
&lgtoken=<login_token>
&format=json
```

**Format:**
- `lgname`: `{username}@{username}@{botname}` (username repeated twice, then botname)
- `lgpassword`: Just the random password string (no prefix)

### OLD FORMAT (Legacy Compatibility)
```http
POST https://test.wikidata.org/w/api.php
Content-Type: application/x-www-form-urlencoded

action=login
&lgname=Puddin1066
&lgpassword=Puddin1066@kgaasbot@0g435bt282nfk3fhq7rql3qvt0astl3h
&lgtoken=<login_token>
&format=json
```

**Format:**
- `lgname`: Just the username
- `lgpassword`: `{username}@{botname}@{password}` (full format with @ separators)

---

## Code Implementation

The code in `lib/wikidata/publisher.ts` automatically:

1. **Extracts components** from `WIKIDATA_BOT_USERNAME`:
   - Username: `Puddin1066` (part before `@`)
   - Bot name: `kgaasbot` (part after `@`, converted to lowercase)

2. **Tries NEW FORMAT first**:
   - `lgname`: `Puddin1066@Puddin1066@kgaasbot`
   - `lgpassword`: `0g435bt282nfk3fhq7rql3qvt0astl3h` (from `.env`)

3. **Falls back to OLD FORMAT** if NEW FORMAT fails:
   - `lgname`: `Puddin1066`
   - `lgpassword`: `Puddin1066@kgaasbot@0g435bt282nfk3fhq7rql3qvt0astl3h`

---

## Common Issues

### Issue 1: Wrong Bot Name Case
**Wrong:**
```bash
WIKIDATA_BOT_USERNAME=Puddin1066@KGaaS_Bot  # ❌ Wrong case/format
```

**Correct:**
```bash
WIKIDATA_BOT_USERNAME=Puddin1066@kgaasbot  # ✅ Matches Wikidata message
```

### Issue 2: Including Full Password Format
**Wrong:**
```bash
WIKIDATA_BOT_PASSWORD=Puddin1066@kgaasbot@0g435bt282nfk3fhq7rql3qvt0astl3h  # ❌ Full format
```

**Correct:**
```bash
WIKIDATA_BOT_PASSWORD=0g435bt282nfk3fhq7rql3qvt0astl3h  # ✅ Just the random part
```

### Issue 3: Extra Spaces or Characters
**Wrong:**
```bash
WIKIDATA_BOT_USERNAME="Puddin1066@kgaasbot "  # ❌ Extra space
WIKIDATA_BOT_PASSWORD=" 0g435bt282nfk3fhq7rql3qvt0astl3h"  # ❌ Leading space
```

**Correct:**
```bash
WIKIDATA_BOT_USERNAME=Puddin1066@kgaasbot  # ✅ No quotes, no spaces
WIKIDATA_BOT_PASSWORD=0g435bt282nfk3fhq7rql3qvt0astl3h  # ✅ No quotes, no spaces
```

---

## Verification

To verify your bot password format:

1. **Check Special:BotPasswords**: https://test.wikidata.org/wiki/Special:BotPasswords
   - Look for the bot name exactly as shown (case-sensitive)
   - If you see `kgaasbot` (lowercase), use that
   - If you see `KGaaS_Bot` (with capitals/underscore), use that exact format

2. **Test with the script**:
   ```bash
   pnpm tsx scripts/test-wikidata-action-api.ts
   ```
   - This will show exactly what format is being used
   - Check the logs for `lgname` and `lgpassword` values

3. **Check the Wikidata message**:
   - The message shows: "The new password to log in with **Puddin1066@Puddin1066@kgaasbot**"
   - This confirms: bot name is `kgaasbot` (lowercase, no underscore)

---

## References

- [MediaWiki Bot Passwords Manual](https://www.mediawiki.org/wiki/Manual:Bot_passwords)
- [Wikidata Special:BotPasswords](https://test.wikidata.org/wiki/Special:BotPasswords)

