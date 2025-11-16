# Wikidata Edit Counting for Entity Publications

## 🎯 Short Answer: **ONE edit per entity publication**

When you publish a complete entity using `wbeditentity` in a single API call, it counts as **ONE edit** towards rate limits, regardless of:

- Number of statements (claims) included
- Number of properties (PIDs) used
- Number of qualifiers per claim
- Number of references per claim
- Number of labels/descriptions in different languages

---

## 📊 How Wikidata Counts Edits

### Single `wbeditentity` Call = 1 Edit

**What we're doing:**
```typescript
// Single API call with complete entity structure
await fetch(baseUrl, {
  method: 'POST',
  body: new URLSearchParams({
    action: 'wbeditentity',
    new: 'item',
    data: JSON.stringify(entity), // Entire entity with all claims, qualifiers, references
    // ...
  }),
});
```

**This counts as: 1 edit** ✅

### What Gets Included in ONE Edit

Based on our entity builder, a typical rich entity includes:

**Labels:**
- English label
- Potentially other languages

**Descriptions:**
- English description
- Potentially other languages

**Claims (Statements):**
- P31: instance of (business)
- P856: official website
- P625: coordinate location
- P1448: official name
- P1329: phone number
- P6375: street address
- P968: email address
- P571: inception (founded date)
- P2002: Twitter username
- P2013: Facebook ID
- P2003: Instagram username
- P4264: LinkedIn company ID
- P1128: employee count
- P249: stock ticker symbol
- Plus LLM-suggested additional properties

**Each claim can include:**
- Qualifiers (e.g., point in time, source)
- References (e.g., official website URL, retrieved date)

**All of this = 1 edit!** ✅

---

## 🔢 Typical Rich Entity Breakdown

### Example: A Complete Business Entity

**Labels:** 1-3 languages = 0 additional edits (included in entity creation)
**Descriptions:** 1-3 languages = 0 additional edits (included in entity creation)
**Claims:** ~10-15 properties = 0 additional edits (all in one call)
- Each with qualifiers = 0 additional edits
- Each with references = 0 additional edits

**Total: 1 edit** ✅

---

## 📈 Rate Limit Implications

### Without Bot Flag
- **test.wikidata.org:** ~50-100 edits/minute
- **wikidata.org:** ~50 edits/minute
- **Capacity:** 50-100 entities/minute (each entity = 1 edit)

### With Bot Flag
- **test.wikidata.org:** 500+ edits/minute
- **wikidata.org:** 500+ edits/minute (with approval)
- **Capacity:** 500+ entities/minute (each entity = 1 edit)

---

## ⚠️ Important Distinction

### Single API Call vs Multiple API Calls

**Single `wbeditentity` call (what we do):**
- Creates entire entity with all statements, qualifiers, references
- **Counts as: 1 edit**
- Efficient and recommended

**Multiple API calls (NOT what we do):**
- Call 1: Create entity with P31
- Call 2: Add P856
- Call 3: Add P625
- ... etc
- **Counts as: N edits** (one per call)
- Inefficient and wasteful

**Conclusion:** Our approach is optimal! ✅

---

## 🎯 Practical Examples

### Example 1: Minimal Entity
- 3 statements (P31, P856, P1448)
- 1 reference each
- **Counts as: 1 edit**

### Example 2: Rich Entity
- 15 statements (multiple properties)
- 3 qualifiers per statement
- 2 references per statement
- Multiple languages
- **Counts as: 1 edit** (same as minimal!)

### Example 3: Very Rich Entity
- 50 statements
- 10 qualifiers per statement
- 5 references per statement
- 10 languages
- **Counts as: 1 edit** (still one edit!)

---

## 📚 References

- [Wikidata API: wbeditentity](https://www.wikidata.org/w/api.php?action=help&modules=wbeditentity)
- [MediaWiki Action API: Edit counting](https://www.mediawiki.org/wiki/API:Etiquette#Edit_rate_limits)
- [Wikidata: Bots and edit limits](https://www.wikidata.org/wiki/Wikidata:Bots)

---

## ✅ Summary

**One rich entity publication = ONE edit** towards rate limits, regardless of:
- Number of statements
- Number of properties
- Number of qualifiers
- Number of references
- Complexity of data

This is a major advantage - you can publish very rich, well-documented entities efficiently!

**Rate limit capacity:**
- Without bot flag: 50-100 entities/minute
- With bot flag: 500+ entities/minute
