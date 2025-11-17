# Official MediaWiki/Wikidata Bot Password Format Specification

## Official Documentation Sources

1. **MediaWiki Manual: Bot Passwords**: https://www.mediawiki.org/wiki/Manual:Bot_passwords
2. **MediaWiki API: Login**: https://www.mediawiki.org/wiki/API:Login
3. **Wikidata Special:BotPasswords**: https://test.wikidata.org/wiki/Special:BotPasswords

---

## Bot Password Format (From Official Docs)

### When Creating a Bot Password

When you create a bot password at Special:BotPasswords, you provide:
- **Bot Name**: A label/name for the bot password (e.g., "MyBot", "KGaaS_Bot", "kgaasbot")
- **Permissions**: What the bot can do

### What You Receive

After creation, Wikidata shows you:
```
The new password to log in with YourUsername@YourUsername@BotName is YourRandomPassword.
```

**Example from your case:**
```
The new password to log in with Puddin1066@Puddin1066@kgaasbot is 0g435bt282nfk3fhq7rql3qvt0astl3h.
```

**Also shows OLD FORMAT (for compatibility):**
```
(For old bots which require the login name to be the same as the eventual username, 
you can also use Puddin1066 as username and Puddin1066@kgaasbot@0g435bt282nfk3fhq7rql3qvt0astl3h as password.)
```

---

## Action API Login Format

### Official MediaWiki API:Login Specification

**Endpoint:** `POST https://test.wikidata.org/w/api.php`

**Parameters:**
- `action=login` (required)
- `lgname` (required) - Login name
- `lgpassword` (required) - Login password
- `lgtoken` (required) - Login token from `action=query&meta=tokens&type=login`
- `format=json` (optional, but recommended)

### NEW FORMAT (Current/Recommended)

Based on your Wikidata message and MediaWiki documentation:

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
- `lgname`: `{username}@{username}@{botname}` 
  - Username repeated twice, then bot name
  - Example: `Puddin1066@Puddin1066@kgaasbot`
- `lgpassword`: Just the random password string
  - Example: `0g435bt282nfk3fhq7rql3qvt0astl3h`

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
  - Example: `Puddin1066`
- `lgpassword`: `{username}@{botname}@{password}` (full format)
  - Example: `Puddin1066@kgaasbot@0g435bt282nfk3fhq7rql3qvt0astl3h`

---

## Bot Name Case Sensitivity

**CRITICAL:** Bot names are case-sensitive and must match exactly as created.

### Your Situation

You have TWO bot passwords on Special:BotPasswords:
1. `KGaaS_Bot` (with capitals and underscore)
2. `Puddin1066@kgaasbot` (with username prefix, lowercase)

**The Wikidata message you received shows:**
- Bot name: `kgaasbot` (lowercase, no underscore)
- Login format: `Puddin1066@Puddin1066@kgaasbot`

**This suggests:**
- The bot password was created with name `kgaasbot` (lowercase)
- NOT `KGaaS_Bot` (with capitals/underscore)

### Resolution

**Use the bot name EXACTLY as shown in the Wikidata creation message:**
- If message says `kgaasbot` → use `kgaasbot` in `.env`
- If message says `KGaaS_Bot` → use `KGaaS_Bot` in `.env`

**Your `.env` should match the bot name from the creation message:**
```bash
# Based on your message showing "kgaasbot":
WIKIDATA_BOT_USERNAME=Puddin1066@kgaasbot
WIKIDATA_BOT_PASSWORD=0g435bt282nfk3fhq7rql3qvt0astl3h
```

---

## .env Configuration

### Format

```bash
WIKIDATA_BOT_USERNAME=Username@BotName
WIKIDATA_BOT_PASSWORD=RandomPasswordString
```

### Your Current Configuration

Based on your Wikidata message:
```bash
WIKIDATA_BOT_USERNAME=Puddin1066@kgaasbot
WIKIDATA_BOT_PASSWORD=0g435bt282nfk3fhq7rql3qvt0astl3h
```

**Important:**
- Bot name must match exactly: `kgaasbot` (lowercase, as shown in message)
- Password is just the random string (32 characters)
- No quotes, no spaces, no extra characters

---

## Code Implementation

The code automatically constructs both formats:

1. **NEW FORMAT:**
   - Extracts: `username=Puddin1066`, `botName=kgaasbot`
   - Constructs: `lgname="Puddin1066@Puddin1066@kgaasbot"`
   - Uses: `lgpassword="0g435bt282nfk3fhq7rql3qvt0astl3h"` (as-is from .env)

2. **OLD FORMAT (fallback):**
   - Uses: `lgname="Puddin1066"`
   - Constructs: `lgpassword="Puddin1066@kgaasbot@0g435bt282nfk3fhq7rql3qvt0astl3h"`

---

## Verification Checklist

- [ ] Bot name in `.env` matches exactly what's shown in Wikidata creation message
- [ ] Password in `.env` is just the random string (no prefix)
- [ ] No extra spaces or quotes in `.env` values
- [ ] Bot password exists on Special:BotPasswords page
- [ ] Using test.wikidata.org endpoint (not production)

---

## References

- [MediaWiki Manual: Bot Passwords](https://www.mediawiki.org/wiki/Manual:Bot_passwords)
- [MediaWiki API: Login](https://www.mediawiki.org/wiki/API:Login)
- [Wikidata Special:BotPasswords](https://test.wikidata.org/wiki/Special:BotPasswords)

