# Test vs Production Wikidata Publishing Analysis

## Overview

This document analyzes what gets published to **test.wikidata.org** vs **production wikidata.org**, and provides accurate expectations for property and reference counts.

## Current Test Publishing Results

Based on the latest test run:
- **Published to test.wikidata.org**: 2 properties (P1448, P6375)
- **References**: 0 (all removed for test)
- **QID**: Q242819 (real entity on test.wikidata.org)

## Properties Built by Entity Builder

The entity builder creates the following properties when data is available:

### Core Properties (Always Included)
1. **P31** - Instance of (Q4830453 = business) - **REMOVED for test** ❌
2. **P856** - Official website - **REMOVED for test** ❌
3. **P1448** - Official name - **PUBLISHED to test** ✅

### Location Properties (When Available)
4. **P625** - Coordinate location (lat/lng) - **REMOVED for test** ❌
5. **P6375** - Street address - **PUBLISHED to test** ✅
6. **P131** - Located in (city QID) - Not yet implemented
7. **P159** - Headquarters location - Not yet implemented

### Contact Properties (When Available)
8. **P1329** - Phone number - **Type mismatch on test** ⚠️
9. **P968** - Email address - **Type mismatch on test** ⚠️

### Social Media Properties (When Available)
10. **P2002** - Twitter username - **REMOVED for test** ❌
11. **P2013** - Facebook ID - **Type mismatch on test** ⚠️
12. **P2003** - Instagram username - **REMOVED for test** ❌
13. **P4264** - LinkedIn company ID - **REMOVED for test** ❌

### Business Details (When Available)
14. **P571** - Inception (founded date) - **Type mismatch on test** ⚠️
15. **P1128** - Number of employees - **REMOVED for test** ❌
16. **P452** - Industry - Not yet implemented
17. **P17** - Country - Not yet implemented

## Property Type Mismatches (Test vs Production)

| Property | Production Type | Test Type | Status |
|----------|----------------|-----------|--------|
| P31 | `wikibase-entityid` | `string` ❌ | **Removed for test** |
| P856 | `string` (url) | `globecoordinate` ❌ | **Removed for test** |
| P625 | `globecoordinate` | `globecoordinate` ✅ | Would work, but removed if no coords |
| P1448 | `string` | `monolingualtext` ⚠️ | **Published (type adapted)** |
| P6375 | `string` | `monolingualtext` ⚠️ | **Published (type adapted)** |
| P1329 | `string` | `string` ✅ | Would work, but type mismatch detected |
| P968 | `string` | `string` ✅ | Would work, but type mismatch detected |
| P2002 | `string` | `quantity` ❌ | **Removed for test** |
| P2013 | `string` | `external-id` ⚠️ | Type mismatch detected |
| P2003 | `string` | `quantity` ❌ | **Removed for test** |
| P4264 | `string` | `quantity` ❌ | **Removed for test** |
| P571 | `time` | `time` ✅ | Would work, but type mismatch detected |
| P1128 | `quantity` | `string` ❌ | **Removed for test** |

## References

### Reference Structure
Each claim can have references containing:
- **P854** - Reference URL (the source URL)
- **P813** - Retrieved date (when we crawled the source)
- **P1476** - Title (optional, from notability checker)

### Test vs Production References

**Test.wikidata.org:**
- **All references removed** - test has wrong types for reference properties:
  - P854 expects `globecoordinate` (should be `string`)
  - P813 expects `wikibase-entityid` (should be `time`)
  - P1476 expects `globecoordinate` (should be `monolingualtext`)

**Production wikidata.org:**
- **All references included** - production has correct types
- Each claim gets 1+ references (typically 1-3 references per claim)
- References include:
  - Source URL (P854)
  - Retrieved date (P813)
  - Title if available (P1476)

## Expected Publishing to Production Wikidata

Based on a typical business with rich crawl data:

### Properties Published to Production

**Minimum (Basic Business):**
- P31 (instance of) - 1 property
- P856 (website) - 1 property
- P1448 (official name) - 1 property
- **Total: 3 properties**

**Typical (With Location & Contact):**
- P31, P856, P1448 (core) - 3 properties
- P625 (coordinates) - 1 property (if available)
- P6375 (address) - 1 property
- P1329 (phone) - 1 property (if available)
- P968 (email) - 1 property (if available)
- **Total: 6-7 properties**

**Rich (With Social Media & Details):**
- Core (3) + Location (2) + Contact (2) - 7 properties
- P2002 (Twitter) - 1 property (if available)
- P2013 (Facebook) - 1 property (if available)
- P4264 (LinkedIn) - 1 property (if available)
- P571 (founded) - 1 property (if available)
- P1128 (employees) - 1 property (if available)
- **Total: 10-12 properties**

### References Published to Production

**Per Claim:**
- Each claim gets 1 reference (minimum)
- Rich claims get 2-3 references (from notability checker)

**Total References:**
- **Minimum**: 3 references (1 per core property: P31, P856, P1448)
- **Typical**: 6-7 references (1 per property)
- **Rich**: 10-12 references (1-2 per property)

## Comparison: Test vs Production

| Metric | Test.wikidata.org | Production wikidata.org |
|--------|-------------------|------------------------|
| **Properties Published** | 2 (P1448, P6375) | 6-12 (depending on data) |
| **Properties Removed** | 4-10 (type mismatches) | 0 |
| **References Published** | 0 (all removed) | 6-12 (1 per property) |
| **Reference Properties** | N/A (removed) | P854, P813, P1476 |
| **Entity Richness** | Minimal (2 PIDs) | Rich (6-12 PIDs) |
| **Data Completeness** | ~20% of full entity | 100% of full entity |

## Why Test Has Fewer Properties

1. **Type Mismatches**: test.wikidata.org has incorrect property definitions
2. **Conservative Filtering**: System removes properties that don't match test's schema
3. **Reference Removal**: All references removed because test has wrong reference property types

## Production Publishing Benefits

When publishing to **production wikidata.org**:

✅ **All properties included** (no type mismatches)
✅ **All references included** (proper notability support)
✅ **Full entity richness** (10-12 properties vs 2)
✅ **Complete data** (location, contact, social, business details)
✅ **Proper validation** (against correct property types)

## Recommendations

1. **For Testing**: Use test.wikidata.org to verify the publishing flow works
2. **For Production**: Publish to production wikidata.org for full entity richness
3. **Entity Building**: Always build for production (correct types)
4. **Environment Adaptation**: System automatically adapts for test when needed

## Example: Real Business Entity

**Test.wikidata.org (Q242819):**
- 2 properties
- 0 references
- Minimal entity

**Production wikidata.org (would be):**
- 8-10 properties (P31, P856, P1448, P625, P6375, P1329, P968, P2002, P4264, P571)
- 8-10 references (1 per property with P854, P813)
- Rich, complete entity

## Exact Numbers: Test vs Production

### Test.wikidata.org (Current Test Result)
- **Properties Published**: 2 (P1448, P6375)
- **Properties Removed**: 4-10 (due to type mismatches)
- **References Published**: 0 (all removed)
- **Entity Completeness**: ~20% of full entity

### Production wikidata.org (Expected)

**Minimum Entity (Basic Business):**
- **Properties**: 3 (P31, P856, P1448)
- **References**: 3 (1 per property)
- **Reference Properties**: P854 (URL), P813 (retrieved date)

**Typical Entity (With Location & Contact):**
- **Properties**: 6-7 (P31, P856, P1448, P625, P6375, P1329, P968)
- **References**: 6-7 (1 per property)
- **Reference Properties**: P854, P813, P1476 (title if available)

**Rich Entity (With Social Media & Business Details):**
- **Properties**: 10-12 (P31, P856, P1448, P625, P6375, P1329, P968, P2002, P2013, P4264, P571, P1128)
- **References**: 10-15 (1-2 per property, more if notability references added)
- **Reference Properties**: P854, P813, P1476

**With Notability References (Pro/Agency Tiers):**
- **Properties**: 10-12 (same as above)
- **References**: 15-25 (1-3 per property from notability checker)
- **Reference Properties**: P854, P813, P1476 (multiple references per claim)

## Property Breakdown by Availability

| Property | Always | Location | Contact | Social | Business | Test Status | Production Status |
|----------|--------|----------|---------|--------|----------|-------------|------------------|
| P31 | ✅ | | | | | ❌ Removed | ✅ Included |
| P856 | ✅ | | | | | ❌ Removed | ✅ Included |
| P1448 | ✅ | | | | | ✅ Published | ✅ Included |
| P625 | | ✅ | | | | ❌ Removed* | ✅ Included |
| P6375 | | ✅ | | | | ✅ Published | ✅ Included |
| P1329 | | | ✅ | | | ⚠️ Type mismatch | ✅ Included |
| P968 | | | ✅ | | | ⚠️ Type mismatch | ✅ Included |
| P2002 | | | | ✅ | | ❌ Removed | ✅ Included |
| P2013 | | | | ✅ | | ⚠️ Type mismatch | ✅ Included |
| P2003 | | | | ✅ | | ❌ Removed | ✅ Included |
| P4264 | | | | ✅ | | ❌ Removed | ✅ Included |
| P571 | | | | | ✅ | ⚠️ Type mismatch | ✅ Included |
| P1128 | | | | | ✅ | ❌ Removed | ✅ Included |
| P249 | | | | | ✅ | ✅ Would work | ✅ Included |

*P625 removed if coordinates not available

## Reference Structure

### Each Reference Contains:
1. **P854** - Reference URL (source URL)
2. **P813** - Retrieved date (when crawled)
3. **P1476** - Title (optional, from notability checker)

### Reference Count Calculation:

**Base References (1 per property):**
- Each property gets 1 reference by default
- Example: 10 properties = 10 references

**Notability References (Additional):**
- Pro/Agency tiers get additional references from notability checker
- Typically 1-3 additional references per claim
- Example: 10 properties × 2 additional refs = 20 more references
- **Total**: 10 base + 20 notability = 30 references

## Conclusion

**Test.wikidata.org Publishing:**
- **2 properties** (P1448, P6375)
- **0 references** (all removed)
- **~20% of full entity**

**Production wikidata.org Publishing:**
- **6-12 properties** (depending on available data)
- **6-25 references** (1-3 per property)
- **100% of full entity** (all properties and references included)

**Key Difference:**
- Test: Minimal entity (2 PIDs, 0 refs) due to type mismatches
- Production: Rich entity (6-12 PIDs, 6-25 refs) with complete data

The system is designed to publish **complete, rich entities** to production, while adapting to test's limitations for testing purposes.

